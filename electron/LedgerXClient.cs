using System;
using System.IO;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Net.NetworkInformation;
using System.Drawing;
using System.Windows.Forms;
using System.Text;
using System.Collections.Generic;
using System.Threading;

[assembly: System.Reflection.AssemblyTitle("LedgerX LAN Client")]
[assembly: System.Reflection.AssemblyDescription("LedgerX Intelligent Offline Multi-User LAN Client")]
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
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

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

            // Command-line override e.g. LedgerXClient.exe 192.168.1.205
            if (args != null && args.Length > 0 && !string.IsNullOrEmpty(args[0]))
            {
                savedHostIp = args[0].Trim();
            }

            // =========================================================================
            // TIER 1: Check Cached Host IP (Instant - 100ms)
            // =========================================================================
            if (!string.IsNullOrEmpty(savedHostIp) && IsHostAlive(savedHostIp, 45454))
            {
                LaunchHostPortal(savedHostIp);
                return;
            }

            // =========================================================================
            // TIER 2: UDP Broadcast Beacon Listener (Under 1.2 seconds)
            // Host broadcasts its IP on port 45455 every 2 seconds
            // =========================================================================
            string beaconHost = ListenForHostBeacon(1200);
            if (!string.IsNullOrEmpty(beaconHost) && IsHostAlive(beaconHost, 45454))
            {
                SaveConfigHost(configFile, beaconHost);
                LaunchHostPortal(beaconHost);
                return;
            }

            // =========================================================================
            // TIER 3: Fast Parallel Subnet TCP Scan (1.2 seconds)
            // =========================================================================
            string scannedHost = FastParallelScan();
            if (!string.IsNullOrEmpty(scannedHost) && IsHostAlive(scannedHost, 45454))
            {
                SaveConfigHost(configFile, scannedHost);
                LaunchHostPortal(scannedHost);
                return;
            }

            // =========================================================================
            // TIER 4: Fallback UI (Only if Host PC is offline or on a different network)
            // =========================================================================
            Application.Run(new LanConnectForm(savedHostIp, configFile));
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

            // Prioritize common host IP addresses (.50, .205, .15, .1, .2, .100, .10, .20, etc.)
            int[] priority = new int[] { 50, 205, 15, 1, 2, 100, 10, 20, 30, 40, 51, 52, 101, 200, 254 };
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

            done.WaitOne(1400);
            return found;
        }

        public static void LaunchHostPortal(string hostIp)
        {
            string url = string.Format("http://{0}:45454/?lan_client=1", hostIp);
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

            if (subnets.Count == 0) subnets.Add("192.168.1.");
            return subnets;
        }
    }

    public class LanConnectForm : Form
    {
        private TextBox txtIp;
        private Label lblStatus;
        private Button btnConnect;
        private Button btnScan;
        private string configFile;

        public LanConnectForm(string defaultIp, string cfgFile)
        {
            this.configFile = cfgFile;
            this.Text = "LedgerX LAN Client — Connect to Host PC";
            this.Size = new Size(530, 360);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(248, 250, 252);

            try
            {
                this.Icon = Icon.ExtractAssociatedIcon(System.Reflection.Assembly.GetExecutingAssembly().Location);
            }
            catch { }

            Label title = new Label();
            title.Text = "🌐 Connect to Host Accounting PC (LAN)";
            title.Font = new Font("Segoe UI", 12, FontStyle.Bold);
            title.ForeColor = Color.FromArgb(15, 60, 100);
            title.Location = new Point(25, 20);
            title.Size = new Size(470, 30);
            this.Controls.Add(title);

            Label desc = new Label();
            desc.Text = "Host PC could not be automatically detected. Please ensure LedgerX Desktop is running on the Host PC and both computers are on the same Wi-Fi / LAN network:";
            desc.Font = new Font("Segoe UI", 9);
            desc.ForeColor = Color.FromArgb(71, 85, 105);
            desc.Location = new Point(25, 55);
            desc.Size = new Size(470, 42);
            this.Controls.Add(desc);

            Label lblIp = new Label();
            lblIp.Text = "Host PC IP Address:";
            lblIp.Font = new Font("Segoe UI", 9, FontStyle.Bold);
            lblIp.ForeColor = Color.FromArgb(30, 41, 59);
            lblIp.Location = new Point(25, 108);
            lblIp.Size = new Size(180, 20);
            this.Controls.Add(lblIp);

            string initialIp = defaultIp;
            if (string.IsNullOrEmpty(initialIp))
            {
                List<string> subs = Program.GetLocalSubnets();
                if (subs.Count > 0) initialIp = subs[0] + "205";
                else initialIp = "192.168.1.205";
            }

            txtIp = new TextBox();
            txtIp.Text = initialIp;
            txtIp.Font = new Font("Segoe UI", 11);
            txtIp.Location = new Point(25, 132);
            txtIp.Size = new Size(320, 30);
            this.Controls.Add(txtIp);

            btnScan = new Button();
            btnScan.Text = "🔍 Auto-Scan";
            btnScan.Font = new Font("Segoe UI", 9, FontStyle.Bold);
            btnScan.BackColor = Color.FromArgb(224, 231, 255);
            btnScan.ForeColor = Color.FromArgb(67, 56, 202);
            btnScan.FlatStyle = FlatStyle.Flat;
            btnScan.FlatAppearance.BorderSize = 0;
            btnScan.Location = new Point(355, 131);
            btnScan.Size = new Size(130, 32);
            btnScan.Cursor = Cursors.Hand;
            btnScan.Click += BtnScan_Click;
            this.Controls.Add(btnScan);

            lblStatus = new Label();
            lblStatus.Text = "Port: 45454 • Zero Internet Required • 100% Offline Local Network";
            lblStatus.Font = new Font("Segoe UI", 8.5f);
            lblStatus.ForeColor = Color.FromArgb(100, 116, 139);
            lblStatus.Location = new Point(25, 175);
            lblStatus.Size = new Size(470, 24);
            this.Controls.Add(lblStatus);

            btnConnect = new Button();
            btnConnect.Text = "🚀 Connect & Open LedgerX";
            btnConnect.Font = new Font("Segoe UI", 10.5f, FontStyle.Bold);
            btnConnect.BackColor = Color.FromArgb(16, 185, 129);
            btnConnect.ForeColor = Color.White;
            btnConnect.FlatStyle = FlatStyle.Flat;
            btnConnect.FlatAppearance.BorderSize = 0;
            btnConnect.Location = new Point(25, 215);
            btnConnect.Size = new Size(460, 46);
            btnConnect.Cursor = Cursors.Hand;
            btnConnect.Click += BtnConnect_Click;
            this.Controls.Add(btnConnect);

            Label lblHelp = new Label();
            lblHelp.Text = "💡 Tip: On Host PC, ensure 'Fix-Host-Firewall.bat' has been run to unblock port 45454.";
            lblHelp.Font = new Font("Segoe UI", 8);
            lblHelp.ForeColor = Color.FromArgb(148, 163, 184);
            lblHelp.Location = new Point(25, 275);
            lblHelp.Size = new Size(460, 30);
            this.Controls.Add(lblHelp);
        }

        private void BtnScan_Click(object sender, EventArgs e)
        {
            lblStatus.Text = "Listening for Host Beacon on UDP 45455...";
            lblStatus.ForeColor = Color.FromArgb(37, 99, 235);
            btnScan.Enabled = false;
            btnConnect.Enabled = false;
            Application.DoEvents();

            // 1. Try UDP Beacon
            string beaconIp = Program.ListenForHostBeacon(1000);
            if (!string.IsNullOrEmpty(beaconIp) && Program.IsHostAlive(beaconIp, 45454))
            {
                txtIp.Text = beaconIp;
                Program.SaveConfigHost(configFile, beaconIp);
                lblStatus.Text = "✓ Auto-Detected Host PC at: " + beaconIp + " (Port 45454 Active)";
                lblStatus.ForeColor = Color.FromArgb(22, 163, 74);
                btnScan.Enabled = true;
                btnConnect.Enabled = true;
                Application.DoEvents();
                Thread.Sleep(300);
                Program.LaunchHostPortal(beaconIp);
                this.Close();
                return;
            }

            // 2. Try Parallel Subnet Scan
            lblStatus.Text = "Scanning all subnet IPs in parallel on port 45454...";
            Application.DoEvents();

            string foundIp = Program.FastParallelScan();
            btnScan.Enabled = true;
            btnConnect.Enabled = true;

            if (!string.IsNullOrEmpty(foundIp))
            {
                txtIp.Text = foundIp;
                Program.SaveConfigHost(configFile, foundIp);
                lblStatus.Text = "✓ Found Host PC at: " + foundIp + " (Port 45454 Active)";
                lblStatus.ForeColor = Color.FromArgb(22, 163, 74);
                Application.DoEvents();
                Thread.Sleep(300);
                Program.LaunchHostPortal(foundIp);
                this.Close();
            }
            else
            {
                lblStatus.Text = "Host PC not auto-detected. Enter IP manually or check Host PC.";
                lblStatus.ForeColor = Color.FromArgb(180, 83, 9);
            }
        }

        private void BtnConnect_Click(object sender, EventArgs e)
        {
            string ip = txtIp.Text.Trim();
            if (string.IsNullOrEmpty(ip))
            {
                MessageBox.Show("Please enter Host PC IP address (e.g. 192.168.1.205).", "IP Required", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            btnConnect.Enabled = false;
            btnConnect.Text = "Connecting to " + ip + "...";
            lblStatus.Text = "Testing connection to " + ip + ":45454...";
            lblStatus.ForeColor = Color.FromArgb(37, 99, 235);
            Application.DoEvents();

            if (Program.IsHostAlive(ip, 45454) || ip == "127.0.0.1" || ip == "localhost")
            {
                Program.SaveConfigHost(configFile, ip);
                lblStatus.Text = "✓ Connected! Launching LedgerX Client...";
                lblStatus.ForeColor = Color.FromArgb(22, 163, 74);
                Application.DoEvents();
                Program.LaunchHostPortal(ip);
                this.Close();
            }
            else
            {
                btnConnect.Enabled = true;
                btnConnect.Text = "🚀 Connect & Open LedgerX";
                lblStatus.Text = "Connection failed to " + ip + ":45454.";
                lblStatus.ForeColor = Color.FromArgb(220, 38, 38);

                MessageBox.Show(
                    "Unable to connect to Host PC at: " + ip + ":45454\n\n" +
                    "Please check:\n" +
                    "1. LedgerX Desktop must be running on the Host PC (" + ip + ").\n" +
                    "2. Both computers must be connected to the same Wi-Fi / Router.\n" +
                    "3. Run 'Fix-Host-Firewall.bat' as Administrator on Host PC.\n" +
                    "4. Verify the Host IP matches the Host PC's actual IP address.",
                    "Host Not Reachable",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
    }
}
