using System;
using System.IO;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Net.NetworkInformation;
using System.Text;
using System.Collections.Generic;
using System.Threading;

[assembly: System.Reflection.AssemblyTitle("LedgerX LAN Client")]
[assembly: System.Reflection.AssemblyDescription("LedgerX Intelligent Zero-Configuration Multi-User LAN Client")]
[assembly: System.Reflection.AssemblyCompany("AccountsPro Software")]
[assembly: System.Reflection.AssemblyProduct("LedgerX LAN Client")]
[assembly: System.Reflection.AssemblyVersion("2.5.0.0")]

namespace LedgerXClient
{
    public class Program
    {
        [STAThread]
        public static void Main(string[] args)
        {
            string configFile = GetConfigFilePath();
            string savedHostIp = "";

            if (File.Exists(configFile))
            {
                try
                {
                    string txt = File.ReadAllText(configFile).Trim();
                    if (!string.IsNullOrEmpty(txt)) savedHostIp = txt;
                }
                catch { }
            }

            // Command-line override e.g. LedgerXClient.exe 192.168.240.205
            if (args != null && args.Length > 0 && !string.IsNullOrEmpty(args[0]))
            {
                savedHostIp = args[0].Trim();
            }

            // =========================================================================
            // SILENT AUTO-DISCOVERY ENGINE (Runs in 100-400ms without showing any popup/dialog)
            // =========================================================================
            string activeHost = null;

            // 0. Instant direct check on known Host IPs (e.g. 192.168.240.48 or loopback)
            string[] directHosts = new string[] { "192.168.240.48", "127.0.0.1", "192.168.1.205", "192.168.240.205" };
            foreach (string direct in directHosts)
            {
                if (IsHostAlive(direct, 45454))
                {
                    activeHost = direct;
                    SaveConfigHost(configFile, activeHost);
                    break;
                }
            }

            // 1. Quick check on cached Host IP (80ms)
            if (activeHost == null && !string.IsNullOrEmpty(savedHostIp) && IsHostAlive(savedHostIp, 45454))
            {
                activeHost = savedHostIp;
            }

            // 2. Listen for UDP broadcast beacon from Host PC (Port 45455 - 350ms)
            if (activeHost == null)
            {
                string beaconHost = ListenForHostBeacon(350);
                if (!string.IsNullOrEmpty(beaconHost) && IsHostAlive(beaconHost, 45454))
                {
                    activeHost = beaconHost;
                    SaveConfigHost(configFile, activeHost);
                }
            }

            // 3. Fast parallel scan across local subnet on port 45454 (350ms)
            if (activeHost == null)
            {
                string scannedHost = FastParallelScan();
                if (!string.IsNullOrEmpty(scannedHost) && IsHostAlive(scannedHost, 45454))
                {
                    activeHost = scannedHost;
                    SaveConfigHost(configFile, activeHost);
                }
            }

            // =========================================================================
            // INSTANT LAUNCH: Directly open Login Screen without ANY IP prompt or error
            // =========================================================================
            string targetUrl;
            if (!string.IsNullOrEmpty(activeHost))
            {
                targetUrl = string.Format("http://{0}:45454/?lan_client=1", activeHost);
            }
            else if (!string.IsNullOrEmpty(savedHostIp))
            {
                targetUrl = string.Format("http://{0}:45454/?lan_client=1", savedHostIp);
            }
            else
            {
                // Fallback to cloud portal in client mode (user logs in directly)
                targetUrl = "https://www.ledgerxerp.com/?lan_client=1";
            }

            LaunchHostPortal(targetUrl);
        }

        public static string GetConfigFilePath()
        {
            try
            {
                string exeDir = AppDomain.CurrentDomain.BaseDirectory;
                string testFile = Path.Combine(exeDir, "test_write.tmp");
                File.WriteAllText(testFile, "1");
                File.Delete(testFile);
                return Path.Combine(exeDir, "lan_config.json");
            }
            catch
            {
                string appData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "LedgerXClient");
                if (!Directory.Exists(appData)) Directory.CreateDirectory(appData);
                return Path.Combine(appData, "lan_config.json");
            }
        }

        public static void SaveConfigHost(string configFile, string hostIp)
        {
            try
            {
                File.WriteAllText(configFile, hostIp);
            }
            catch { }
        }

        public static bool IsHostAlive(string ip, int port)
        {
            if (string.IsNullOrEmpty(ip)) return false;
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    var result = client.BeginConnect(ip, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(400);
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch { return false; }
        }

        public static string ListenForHostBeacon(int timeoutMs)
        {
            UdpClient udp = null;
            try
            {
                udp = new UdpClient();
                udp.Client.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);
                udp.Client.Bind(new IPEndPoint(IPAddress.Any, 45455));
                udp.Client.ReceiveTimeout = timeoutMs;

                IPEndPoint remoteEp = new IPEndPoint(IPAddress.Any, 0);
                byte[] data = udp.Receive(ref remoteEp);
                if (data != null && data.Length > 0)
                {
                    string json = Encoding.UTF8.GetString(data);
                    int ipIdx = json.IndexOf("\"ip\":");
                    if (ipIdx >= 0)
                    {
                        int q1 = json.IndexOf("\"", ipIdx + 5);
                        int q2 = q1 >= 0 ? json.IndexOf("\"", q1 + 1) : -1;
                        if (q1 >= 0 && q2 > q1)
                        {
                            string ip = json.Substring(q1 + 1, q2 - (q1 + 1)).Trim();
                            if (!string.IsNullOrEmpty(ip)) return ip;
                        }
                    }
                    if (remoteEp.Address != null && !IPAddress.IsLoopback(remoteEp.Address))
                    {
                        return remoteEp.Address.ToString();
                    }
                }
            }
            catch { }
            finally
            {
                try { if (udp != null) udp.Close(); } catch { }
            }
            return null;
        }

        public static string FastParallelScan()
        {
            List<string> subnets = GetLocalSubnets();
            List<string> targets = new List<string>();

            // Prioritize common host IP addresses (.48, .205, .50, .15, .1, .2, .100, .10, .20, etc.)
            int[] priority = new int[] { 48, 205, 50, 15, 1, 2, 100, 10, 20, 30, 40, 51, 52, 101, 200, 254 };
            foreach (string sub in subnets)
            {
                foreach (int p in priority)
                {
                    string ip = sub + p;
                    if (!targets.Contains(ip)) targets.Add(ip);
                }
                for (int i = 1; i <= 254; i++)
                {
                    string ip = sub + i;
                    if (!targets.Contains(ip)) targets.Add(ip);
                }
            }

            string found = null;
            object lockObj = new object();
            ManualResetEvent done = new ManualResetEvent(false);
            int remaining = targets.Count;

            ThreadPool.SetMinThreads(128, 128);
            foreach (string t in targets)
            {
                string ip = t;
                ThreadPool.QueueUserWorkItem((st) =>
                {
                    try
                    {
                        if (found == null && IsHostAlive(ip, 45454))
                        {
                            lock (lockObj)
                            {
                                if (found == null)
                                {
                                    found = ip;
                                    done.Set();
                                }
                            }
                        }
                    }
                    catch { }
                    finally
                    {
                        if (Interlocked.Decrement(ref remaining) <= 0) done.Set();
                    }
                });
            }

            done.WaitOne(1000);
            return found;
        }

        public static void LaunchHostPortal(string url)
        {
            string browser = FindBrowser();
            string profileDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "LedgerXClientProfile");
            if (!Directory.Exists(profileDir)) Directory.CreateDirectory(profileDir);

            if (!string.IsNullOrEmpty(browser))
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = browser;
                psi.Arguments = string.Format("--app=\"{0}\" --user-data-dir=\"{1}\" --start-maximized --start-fullscreen --no-default-browser-check --no-first-run", url, profileDir);
                psi.WindowStyle = ProcessWindowStyle.Maximized;
                psi.UseShellExecute = true;
                Process.Start(psi);
            }
            else
            {
                Process.Start(url);
            }
        }

        private static string FindBrowser()
        {
            string[] possiblePaths = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe"),
            };
            foreach (string p in possiblePaths) { if (File.Exists(p)) return p; }
            return null;
        }

        public static List<string> GetLocalSubnets()
        {
            List<string> subnets = new List<string>();
            try
            {
                foreach (NetworkInterface ni in NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (ni.OperationalStatus != OperationalStatus.Up || ni.NetworkInterfaceType == NetworkInterfaceType.Loopback)
                        continue;

                    foreach (UnicastIPAddressInformation ua in ni.GetIPProperties().UnicastAddresses)
                    {
                        if (ua.Address.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(ua.Address))
                        {
                            string ipStr = ua.Address.ToString();
                            int lastDot = ipStr.LastIndexOf('.');
                            if (lastDot > 0)
                            {
                                string sub = ipStr.Substring(0, lastDot + 1);
                                if (!subnets.Contains(sub)) subnets.Add(sub);
                            }
                        }
                    }
                }
            }
            catch { }

            if (!subnets.Contains("192.168.240.")) subnets.Add("192.168.240.");
            if (!subnets.Contains("192.168.1.")) subnets.Add("192.168.1.");
            if (!subnets.Contains("192.168.0.")) subnets.Add("192.168.0.");
            return subnets;
        }
    }
}
