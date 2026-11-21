using System;
using System.IO;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Windows.Forms;
using System.Drawing;
using System.Drawing.Printing;
using System.Drawing.Drawing2D;
using Microsoft.Win32;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Net.NetworkInformation;
using System.Collections;
using System.Collections.Generic;
using System.Web.Script.Serialization;
using System.Text.RegularExpressions;

[assembly: AssemblyTitle("LedgerX Desktop")]
[assembly: AssemblyDescription("LedgerX Desktop Offline Accounting Client")]
[assembly: AssemblyConfiguration("")]
[assembly: AssemblyCompany("AccountsPro Software")]
[assembly: AssemblyProduct("LedgerX Desktop")]
[assembly: AssemblyCopyright("Copyright © 2026 AccountsPro")]
[assembly: AssemblyTrademark("LedgerX")]
[assembly: AssemblyCulture("")]
[assembly: AssemblyVersion("2.4.0.0")]
[assembly: AssemblyFileVersion("2.4.0.0")]
[assembly: ComVisible(false)]

namespace LedgerXLauncher
{
    public class Program
    {
        private static Mutex _hostMutex = null;
        private static NotifyIcon _trayIcon = null;

        [STAThread]
        public static void Main(string[] args)
        {
            AppDomain.CurrentDomain.UnhandledException += (s, e) => {
                Log("FATAL UNHANDLED EXCEPTION: " + (e.ExceptionObject != null ? e.ExceptionObject.ToString() : "unknown"));
            };

            try
            {
                // AppData for config/profile (safe, always writable)
                string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string appDir = Path.Combine(localApp, "LedgerX");
                string exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
                if (string.IsNullOrEmpty(exeDir)) exeDir = AppDomain.CurrentDomain.BaseDirectory;
                string configFile = Path.Combine(appDir, "config.json");
                string profileDir = Path.Combine(appDir, "Profile");

                if (!Directory.Exists(appDir)) Directory.CreateDirectory(appDir);
                if (!Directory.Exists(profileDir)) Directory.CreateDirectory(profileDir);

                string logFile = Path.Combine(appDir, "host_service.log");
                try { File.AppendAllText(logFile, DateTime.Now.ToString("s") + " - Host starting, args: " + string.Join(" ", args) + "\n"); } catch { }

                // Allow passing server URL via command-line argument e.g. LedgerX.exe https://mysite.vercel.app
                if (args != null && args.Length > 0 && args[0].Trim().StartsWith("http"))
                {
                    try { File.WriteAllText(configFile, args[0].Trim()); } catch { }
                }

                string localWww = Path.Combine(appDir, "www");
                if (!Directory.Exists(localWww)) localWww = Path.Combine(exeDir, "www");
                bool hasLocalWww = File.Exists(Path.Combine(localWww, "index.html"));
                string targetUrl = hasLocalWww
                    ? "http://127.0.0.1:45454"
                    : "https://www.ledgerxerp.com";

                if (File.Exists(configFile))
                {
                    try
                    {
                        string[] lines = File.ReadAllLines(configFile);
                        if (lines.Length > 0 && lines[0].Trim().StartsWith("http"))
                        {
                            string cfgUrl = lines[0].Trim();
                            if (hasLocalWww)
                            {
                                if (cfgUrl.Contains("127.0.0.1") || cfgUrl.Contains("45454"))
                                {
                                    targetUrl = cfgUrl;
                                }
                                else
                                {
                                    targetUrl = "http://127.0.0.1:45454";
                                    try { File.WriteAllText(configFile, targetUrl); } catch { }
                                }
                            }
                            else
                            {
                                targetUrl = cfgUrl;
                            }
                        }
                    }
                    catch { }
                }

                if (hasLocalWww && !targetUrl.Contains("45454"))
                {
                    targetUrl = "http://127.0.0.1:45454";
                    try { File.WriteAllText(configFile, targetUrl); } catch { }
                }

                // Generate unforgeable Hardware Fingerprint based on Windows MachineGuid
                string hwid = "LX-HWID-" + Environment.MachineName.ToUpper();
                try
                {
                    using (RegistryKey key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Cryptography"))
                    {
                        if (key != null)
                        {
                            object guid = key.GetValue("MachineGuid");
                            if (guid != null)
                            {
                                using (SHA256 sha = SHA256.Create())
                                {
                                    byte[] hash = sha.ComputeHash(Encoding.UTF8.GetBytes(guid.ToString() + "||" + Environment.MachineName));
                                    StringBuilder sb = new StringBuilder();
                                    for (int i = 0; i < 8; i++)
                                    {
                                        sb.Append(hash[i].ToString("X2"));
                                    }
                                    hwid = "LX-HWID-" + sb.ToString();
                                }
                            }
                        }
                    }
                }
                catch { }

                string sep = targetUrl.Contains("?") ? "&" : "?";
                string launchUrl = targetUrl + sep + "desktop=1&hwid=" + hwid;
                string browserPath = FindBrowserExecutable();

                // Single-Instance Check: If Host Service is ALREADY running, just open browser window and exit
                bool createdNew;
                _hostMutex = new Mutex(true, "LedgerX_Accounting_Host_Singleton_Mutex", out createdNew);
                try { File.AppendAllText(logFile, DateTime.Now.ToString("s") + " - Mutex createdNew: " + createdNew + "\n"); } catch { }

                if (!createdNew)
                {
                    bool isBg = args != null && Array.Exists(args, a => a.ToLower() == "--background" || a.ToLower() == "--service");
                    if (!isBg)
                    {
                        LaunchBrowser(browserPath, launchUrl, profileDir);
                    }
                    return;
                }

                // PRIMARY INSTANCE: Start Background Host Services
                try { File.AppendAllText(logFile, DateTime.Now.ToString("s") + " - Primary instance continuing to start services...\n"); } catch { }
                if (string.IsNullOrEmpty(exeDir)) exeDir = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);
                if (string.IsNullOrEmpty(exeDir)) exeDir = AppDomain.CurrentDomain.BaseDirectory;
                string dataDir = Path.Combine(exeDir, "data");
                try
                {
                    if (!Directory.Exists(dataDir)) Directory.CreateDirectory(dataDir);
                }
                catch
                {
                    dataDir = Path.Combine(appDir, "data");
                    if (!Directory.Exists(dataDir)) Directory.CreateDirectory(dataDir);
                }

                // Save machine ID to local data folder
                try { File.WriteAllText(Path.Combine(dataDir, "machine_id.txt"), hwid); } catch { }

                // 1. Start local HTTP Bridge (Port 45453 & 45454)
                StartHttpBridge(dataDir);

                // 2. Start UDP Auto-Discovery Beacon (Port 45455)
                StartDiscoveryBeacon();

                // 3. Ensure Windows Firewall inbound rules (TCP 45454 & UDP 45455)
                ThreadPool.QueueUserWorkItem((st) => EnsureFirewallRule());

                // 4. Initialize Windows Forms Application & System Tray
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);

                // Auto-start registration with Windows Startup (HKCU\Software\Microsoft\Windows\CurrentVersion\Run)
                try
                {
                    using (RegistryKey runKey = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true))
                    {
                        if (runKey != null)
                        {
                            string myExe = Assembly.GetExecutingAssembly().Location;
                            if (File.Exists(myExe))
                            {
                                runKey.SetValue("LedgerXHostService", "\"" + myExe + "\" --service");
                            }
                        }
                    }
                }
                catch { }

                _trayIcon = new NotifyIcon();
                try
                {
                    string iconFile = Path.Combine(appDir, "app.ico");
                    if (!File.Exists(iconFile)) iconFile = Path.Combine(exeDir, "app.ico");
                    if (File.Exists(iconFile)) _trayIcon.Icon = new Icon(iconFile);
                    else _trayIcon.Icon = SystemIcons.Application;
                }
                catch { _trayIcon.Icon = SystemIcons.Application; }

                _trayIcon.Text = "LedgerX Host Service (Port 45454 Active)";
                _trayIcon.Visible = true;

                HostServiceContext hostContext = new HostServiceContext(_trayIcon);

                ContextMenu trayMenu = new ContextMenu();
                trayMenu.MenuItems.Add("Open LedgerX Desktop", (s, e) => LaunchBrowser(FindBrowserExecutable(), launchUrl, profileDir));
                trayMenu.MenuItems.Add("Open Company Data Folder", (s, e) => {
                    try { Process.Start("explorer.exe", dataDir); } catch { }
                });
                trayMenu.MenuItems.Add("-");
                trayMenu.MenuItems.Add("Exit LedgerX Host Service", (s, e) => {
                    hostContext.Terminate();
                });

                _trayIcon.ContextMenu = trayMenu;
                _trayIcon.DoubleClick += (s, e) => LaunchBrowser(FindBrowserExecutable(), launchUrl, profileDir);

                // 5. Open browser window unless launched with --background or --service
                bool startMinimized = args != null && Array.Exists(args, a => a.ToLower() == "--background" || a.ToLower() == "--service");
                if (!startMinimized)
                {
                    LaunchBrowser(browserPath, launchUrl, profileDir);
                }

                // 6. KEEP THE PROCESS AND NETWORK SERVICES ALIVE CONTINUOUSLY WITH PERSISTENT APPLICATION CONTEXT!
                Log("Entering Application.Run(hostContext) (Persistent Message Loop)...");
                Application.Run(hostContext);
                Log("Application.Run exited, entering fallback keepalive loop...");
                while (true) Thread.Sleep(10000);
            }
            catch (Exception ex)
            {
                try
                {
                    string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                    string logFile = Path.Combine(localApp, "LedgerX", "host_service.log");
                    File.AppendAllText(logFile, DateTime.Now.ToString("s") + " - EXCEPTION in Main: " + ex.ToString() + Environment.NewLine);
                }
                catch { }

                MessageBox.Show("Unable to launch LedgerX Desktop:\n\n" + ex.Message, "LedgerX Desktop Launcher", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private static void LaunchBrowser(string browserPath, string launchUrl, string profileDir)
        {
            try
            {
                if (!string.IsNullOrEmpty(browserPath))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = browserPath;
                    psi.Arguments = string.Format("--kiosk-printing --default-background-color=00000000 --app=\"{0}\" --user-data-dir=\"{1}\" --start-maximized --no-default-browser-check --no-first-run --disable-session-crashed-bubble --hide-crash-restore-bubble", launchUrl, profileDir);
                    psi.WindowStyle = ProcessWindowStyle.Maximized;
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                }
                else
                {
                    ProcessStartInfo psi = new ProcessStartInfo(launchUrl);
                    psi.UseShellExecute = true;
                    psi.WindowStyle = ProcessWindowStyle.Maximized;
                    Process.Start(psi);
                }
            }
            catch (Exception ex)
            {
                Log("LaunchBrowser error: " + ex.Message);
            }
        }

        private static bool IsServerAlive(string host, int port)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(300); // 300ms quick check
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        private static void Log(string msg)
        {
            try
            {
                string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string logFile = Path.Combine(localApp, "LedgerX", "host_service.log");
                File.AppendAllText(logFile, DateTime.Now.ToString("s") + " - " + msg + Environment.NewLine);
            }
            catch { }
        }

        private static void StartHttpBridge(string dataDir)
        {
            try
            {
                Thread t = new Thread(new ParameterizedThreadStart(RunListener));
                t.IsBackground = true;
                t.Start(dataDir);
            }
            catch (Exception ex)
            {
                Log("StartHttpBridge error: " + ex.ToString());
            }
        }

        private static readonly object _fileLock = new object();

        private static void RunListener(object objDataDir)
        {
            string dataDir = (string)objDataDir;
            int backendPort = 45453;
            int frontPort = 45454;

            try
            {
                Log("RunListener: Starting internal HttpListener on 127.0.0.1:" + backendPort);
                HttpListener listener = new HttpListener();
                listener.Prefixes.Add("http://127.0.0.1:" + backendPort + "/");
                listener.Start();
                Log("RunListener: HttpListener started successfully.");

                Thread backendThread = new Thread(() =>
                {
                    while (true)
                    {
                        try
                        {
                            HttpListenerContext ctx = listener.GetContext();
                            ThreadPool.QueueUserWorkItem((state) => HandleRequest(ctx, dataDir));
                        }
                        catch { break; }
                    }
                });
                backendThread.IsBackground = true;
                backendThread.Start();

                Log("RunListener: Starting TCP proxy on 0.0.0.0:" + frontPort);
                TcpListener proxy = new TcpListener(IPAddress.Any, frontPort);
                proxy.Start();
                Log("RunListener: TCP proxy listening successfully on port " + frontPort);

                // Also attempt to bind to default HTTP Port 80 so client PC can just type http://<IP> without typing :45454!
                try
                {
                    TcpListener proxy80 = new TcpListener(IPAddress.Any, 80);
                    proxy80.Start();
                    Log("RunListener: Default HTTP port 80 proxy active!");
                    Thread t80 = new Thread(() =>
                    {
                        while (true)
                        {
                            try
                            {
                                TcpClient c80 = proxy80.AcceptTcpClient();
                                ThreadPool.QueueUserWorkItem((st) => ForwardClient(c80, backendPort));
                            }
                            catch { break; }
                        }
                    });
                    t80.IsBackground = true;
                    t80.Start();
                }
                catch { }

                while (true)
                {
                    try
                    {
                        TcpClient client = proxy.AcceptTcpClient();
                        ThreadPool.QueueUserWorkItem((st) => ForwardClient(client, backendPort));
                    }
                    catch { break; }
                }
            }
            catch (Exception ex)
            {
                Log("RunListener EXCEPTION: " + ex.ToString());
                // Fallback: If 45453 is already taken, try direct HttpListener on 45454
                try
                {
                    HttpListener fallbackListener = new HttpListener();
                    fallbackListener.Prefixes.Add("http://127.0.0.1:45454/");
                    fallbackListener.Start();
                    Log("RunListener fallback HttpListener started on 45454.");
                    while (true)
                    {
                        HttpListenerContext ctx = fallbackListener.GetContext();
                        ThreadPool.QueueUserWorkItem((state) => HandleRequest(ctx, dataDir));
                    }
                }
                catch (Exception fex)
                {
                    Log("RunListener fallback EXCEPTION: " + fex.ToString());
                }
            }
        }

        private static void ForwardClient(TcpClient client, int targetPort)
        {
            try
            {
                TcpClient backend = new TcpClient("127.0.0.1", targetPort);
                NetworkStream clientStream = client.GetStream();
                NetworkStream backendStream = backend.GetStream();

                byte[] buffer = new byte[8192];
                int read = clientStream.Read(buffer, 0, buffer.Length);
                if (read > 0)
                {
                    string req = Encoding.UTF8.GetString(buffer, 0, read);
                    int hostIdx = req.IndexOf("Host:", StringComparison.OrdinalIgnoreCase);
                    if (hostIdx >= 0)
                    {
                        int endLine = req.IndexOf("\r\n", hostIdx);
                        if (endLine > hostIdx)
                        {
                            req = req.Substring(0, hostIdx) + "Host: 127.0.0.1:" + targetPort + req.Substring(endLine);
                        }
                    }
                    byte[] modBytes = Encoding.UTF8.GetBytes(req);
                    backendStream.Write(modBytes, 0, modBytes.Length);
                }

                Thread t1 = new Thread(() => PipeStream(clientStream, backendStream));
                Thread t2 = new Thread(() => PipeStream(backendStream, clientStream));
                t1.IsBackground = true;
                t2.IsBackground = true;
                t1.Start();
                t2.Start();
            }
            catch
            {
                try { client.Close(); } catch { }
            }
        }

        private static void PipeStream(Stream input, Stream output)
        {
            byte[] buf = new byte[8192];
            try
            {
                int read;
                while ((read = input.Read(buf, 0, buf.Length)) > 0)
                {
                    output.Write(buf, 0, read);
                    output.Flush();
                }
            }
            catch { }
            finally
            {
                try { input.Close(); } catch { }
                try { output.Close(); } catch { }
            }
        }

        private static string GetLocalIPAddress()
        {
            try
            {
                using (Socket socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0))
                {
                    socket.Connect("8.8.8.8", 65530);
                    IPEndPoint endPoint = socket.LocalEndPoint as IPEndPoint;
                    if (endPoint != null)
                    {
                        return endPoint.Address.ToString();
                    }
                }
            }
            catch { }

            try
            {
                var host = Dns.GetHostEntry(Dns.GetHostName());
                foreach (var ip in host.AddressList)
                {
                    if (ip.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(ip))
                    {
                        return ip.ToString();
                    }
                }
            }
            catch { }

            return "127.0.0.1";
        }

        private static void StartDiscoveryBeacon()
        {
            try
            {
                Thread beaconThread = new Thread(() =>
                {
                    int beaconPort = 45455;
                    Socket udp = null;
                    try
                    {
                        udp = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, ProtocolType.Udp);
                        udp.EnableBroadcast = true;
                        udp.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.Broadcast, 1);
                    }
                    catch { return; }

                    string hostName = Environment.MachineName;
                    while (true)
                    {
                        try
                        {
                            string localIp = GetLocalIPAddress();
                            string message = string.Format(
                                "{{\"service\":\"ledgerx_host\",\"version\":\"2.5\",\"hostName\":\"{0}\",\"ip\":\"{1}\",\"port\":45454}}",
                                hostName, localIp
                            );
                            byte[] data = Encoding.UTF8.GetBytes(message);

                            // 1. Broadcast to 255.255.255.255
                            IPEndPoint epGlobal = new IPEndPoint(IPAddress.Broadcast, beaconPort);
                            try { udp.SendTo(data, epGlobal); } catch { }

                            // 2. Broadcast on each physical network interface subnet (e.g. 192.168.1.255)
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
                                            if (ua.IPv4Mask != null)
                                            {
                                                byte[] ipBytes = ua.Address.GetAddressBytes();
                                                byte[] maskBytes = ua.IPv4Mask.GetAddressBytes();
                                                byte[] bcastBytes = new byte[4];
                                                for (int i = 0; i < 4; i++) bcastBytes[i] = (byte)(ipBytes[i] | ~maskBytes[i]);
                                                IPAddress bcastIp = new IPAddress(bcastBytes);
                                                udp.SendTo(data, new IPEndPoint(bcastIp, beaconPort));
                                            }
                                        }
                                    }
                                }
                            }
                            catch { }
                        }
                        catch { }
                        Thread.Sleep(1000);
                    }
                });
                beaconThread.IsBackground = true;
                beaconThread.Start();
            }
            catch { }
        }

        private static void EnsureFirewallRule()
        {
            try
            {
                // Write self-elevating Fix-Host-Firewall.bat for 1-click manual remediation
                try
                {
                    string exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
                    if (string.IsNullOrEmpty(exeDir)) exeDir = AppDomain.CurrentDomain.BaseDirectory;
                    string batPath = Path.Combine(exeDir, "Fix-Host-Firewall.bat");
                    string batContent =
                        "@echo off\r\n" +
                        "NET SESSION >nul 2>&1\r\n" +
                        "IF %ERRORLEVEL% NEQ 0 (\r\n" +
                        "    echo Requesting Administrator privileges to enable Windows Firewall rules...\r\n" +
                        "    powershell -NoProfile -ExecutionPolicy Bypass -Command \"Start-Process cmd -ArgumentList '/c \\\"\\\"%~f0\\\"\\\"' -Verb RunAs\"\r\n" +
                        "    exit /b\r\n" +
                        ")\r\n" +
                        "echo ========================================================\r\n" +
                        "echo   LedgerX Accounting Host - Windows Firewall Rules\r\n" +
                        "echo ========================================================\r\n" +
                        "netsh advfirewall firewall delete rule name=\"LedgerX Accounting Host (TCP)\" >nul 2>&1\r\n" +
                        "netsh advfirewall firewall delete rule name=\"LedgerX Discovery Beacon (UDP)\" >nul 2>&1\r\n" +
                        "netsh advfirewall firewall add rule name=\"LedgerX Accounting Host (TCP)\" dir=in action=allow protocol=TCP localport=45454 profile=any\r\n" +
                        "netsh advfirewall firewall add rule name=\"LedgerX Discovery Beacon (UDP)\" dir=in action=allow protocol=UDP localport=45455 profile=any\r\n" +
                        "echo [SUCCESS] Windows Firewall rules enabled! Inbound Port 45454 and 45455 are allowed.\r\n" +
                        "timeout /t 5\r\n";
                    File.WriteAllText(batPath, batContent);

                    try
                    {
                        string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                        if (!string.IsNullOrEmpty(desktop) && Directory.Exists(desktop))
                        {
                            File.WriteAllText(Path.Combine(desktop, "Fix-Host-Firewall.bat"), batContent);
                        }
                    }
                    catch { }
                }
                catch { }
            }
            catch { }
        }

        private static void HandleRequest(HttpListenerContext ctx, string dataDir)
        {
            try
            {
                HttpListenerRequest req = ctx.Request;
                HttpListenerResponse res = ctx.Response;

                string origin = req.Headers["Origin"];
                if (string.IsNullOrEmpty(origin)) origin = "*";
                res.Headers.Add("Access-Control-Allow-Origin", origin);
                res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
                res.Headers.Add("Access-Control-Allow-Headers", "*");
                res.Headers.Add("Access-Control-Allow-Private-Network", "true");
                res.Headers.Add("Access-Control-Max-Age", "86400");

                if (req.HttpMethod == "OPTIONS")
                {
                    res.StatusCode = 204;
                    res.Close();
                    return;
                }

                if (req.HttpMethod == "HEAD")
                {
                    res.StatusCode = 200;
                    res.Close();
                    return;
                }

                string path = req.Url.AbsolutePath.ToLower();

                if (path == "/api/ping")
                {
                    WriteJsonResponse(res, "{\"status\":\"ok\",\"version\":\"2.5\",\"dataDir\":\"" + dataDir.Replace("\\", "\\\\") + "\"}");
                    return;
                }

                if (path == "/api/lan/info")
                {
                    string lanIp = GetLocalIPAddress();
                    string hostName = Environment.MachineName;
                    string json = string.Format(
                        "{{\"isHostRunning\":true,\"hostName\":\"{0}\",\"localIps\":[\"{1}\",\"127.0.0.1\"],\"port\":45454,\"lanUrl\":\"http://{1}:45454\",\"dataDir\":\"{2}\"}}",
                        hostName, lanIp, dataDir.Replace("\\", "\\\\")
                    );
                    WriteJsonResponse(res, json);
                    return;
                }

                if (path == "/api/company/last-modified" && req.HttpMethod == "GET")
                {
                    string code = req.QueryString["code"];
                    if (string.IsNullOrEmpty(code)) code = req.QueryString["companyCode"];
                    if (string.IsNullOrEmpty(code)) code = "10000";
                    code = code.ToUpper().Trim();

                    string cDir = Path.Combine(dataDir, code);
                    long maxTicks = 0;
                    if (Directory.Exists(cDir))
                    {
                        foreach (string f in Directory.GetFiles(cDir, "*.json"))
                        {
                            try
                            {
                                long ticks = File.GetLastWriteTimeUtc(f).Ticks;
                                if (ticks > maxTicks) maxTicks = ticks;
                            }
                            catch { }
                        }
                    }
                    WriteJsonResponse(res, "{\"success\":true,\"code\":\"" + code + "\",\"lastModified\":" + maxTicks + "}");
                    return;
                }

                if (path == "/api/lan/users" && req.HttpMethod == "GET")
                {
                    string code = req.QueryString["code"];
                    if (string.IsNullOrEmpty(code)) code = req.QueryString["companyCode"];
                    if (!string.IsNullOrEmpty(code)) code = code.ToUpper().Trim();

                    string usersFile = !string.IsNullOrEmpty(code)
                        ? Path.Combine(dataDir, code, "users.json")
                        : Path.Combine(dataDir, "users.json");

                    if (File.Exists(usersFile))
                    {
                        string uJson = File.ReadAllText(usersFile);
                        WriteJsonResponse(res, "{\"success\":true,\"code\":\"" + (code ?? "") + "\",\"users\":" + uJson + "}");
                    }
                    else
                    {
                        WriteJsonResponse(res, "{\"success\":true,\"code\":\"" + (code ?? "") + "\",\"users\":[]}");
                    }
                    return;
                }

                if (path == "/api/lan/users" && req.HttpMethod == "POST")
                {
                    using (StreamReader reader = new StreamReader(req.InputStream, req.ContentEncoding))
                    {
                        string body = reader.ReadToEnd();
                        string code = req.QueryString["code"];
                        if (string.IsNullOrEmpty(code)) code = req.QueryString["companyCode"];
                        if (string.IsNullOrEmpty(code))
                        {
                            int cIdx = body.IndexOf("\"companyCode\":");
                            if (cIdx >= 0)
                            {
                                int q1 = body.IndexOf("\"", cIdx + 14);
                                int q2 = q1 >= 0 ? body.IndexOf("\"", q1 + 1) : -1;
                                if (q1 >= 0 && q2 > q1)
                                {
                                    code = body.Substring(q1 + 1, q2 - (q1 + 1)).Trim().ToUpper();
                                }
                            }
                        }

                        if (!string.IsNullOrEmpty(code)) code = code.ToUpper().Trim();

                        string targetDir = !string.IsNullOrEmpty(code)
                            ? Path.Combine(dataDir, code)
                            : dataDir;

                        if (!Directory.Exists(targetDir)) Directory.CreateDirectory(targetDir);
                        string usersFile = Path.Combine(targetDir, "users.json");

                        int idx = body.IndexOf("\"users\":");
                        string toWrite = body;
                        if (idx >= 0)
                        {
                            int start = body.IndexOf("[", idx);
                            int end = body.LastIndexOf("]");
                            if (start >= 0 && end > start)
                            {
                                toWrite = body.Substring(start, (end - start) + 1);
                            }
                        }
                        lock (_fileLock)
                        {
                            string tmp = usersFile + ".tmp." + Guid.NewGuid().ToString("N");
                            File.WriteAllText(tmp, toWrite);
                            if (File.Exists(usersFile)) File.Delete(usersFile);
                            File.Move(tmp, usersFile);
                        }
                        WriteJsonResponse(res, "{\"success\":true,\"code\":\"" + (code ?? "") + "\"}");
                        return;
                    }
                }

                if (path == "/downloads/ledgerx-client-setup.exe" || path == "/downloads/ledgerx-client.exe")
                {
                    string fileName = path.EndsWith("setup.exe") ? "LedgerX-Client-Setup.exe" : "LedgerX-Client.exe";
                    string exeDir = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);
                    if (string.IsNullOrEmpty(exeDir)) exeDir = AppDomain.CurrentDomain.BaseDirectory;
                    string clientExe = Path.Combine(exeDir, fileName);
                    if (!File.Exists(clientExe))
                    {
                        clientExe = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "public", "downloads", fileName);
                    }
                    if (!File.Exists(clientExe) && fileName == "LedgerX-Client-Setup.exe")
                    {
                        // Fallback to client portable exe if setup is not yet present
                        clientExe = Path.Combine(exeDir, "LedgerX-Client.exe");
                        if (!File.Exists(clientExe)) clientExe = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "public", "downloads", "LedgerX-Client.exe");
                    }
                    if (File.Exists(clientExe))
                    {
                        byte[] bytes = File.ReadAllBytes(clientExe);
                        res.ContentType = "application/octet-stream";
                        res.Headers.Add("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
                        res.ContentLength64 = bytes.Length;
                        res.OutputStream.Write(bytes, 0, bytes.Length);
                        res.OutputStream.Close();
                        return;
                    }
                }

                if (path == "/api/open-folder")
                {
                    string code = req.QueryString["code"];
                    string target = string.IsNullOrEmpty(code) ? dataDir : Path.Combine(dataDir, code.ToUpper().Trim());
                    if (!Directory.Exists(target)) target = dataDir;
                    try { Process.Start("explorer.exe", target); } catch { }
                    WriteJsonResponse(res, "{\"success\":true,\"opened\":\"" + target.Replace("\\", "\\\\") + "\"}");
                    return;
                }

                if (path == "/api/data-path")
                {
                    string escapedPath = dataDir.Replace("\\", "\\\\");
                    WriteJsonResponse(res, "{\"dataDir\":\"" + escapedPath + "\"}");
                    return;
                }

                if (path == "/api/next-code")
                {
                    int maxCode = 9999;
                    if (Directory.Exists(dataDir))
                    {
                        foreach (string dir in Directory.GetDirectories(dataDir))
                        {
                            string name = Path.GetFileName(dir);
                            int parsed;
                            if (int.TryParse(name, out parsed) && parsed >= 10000 && parsed <= 99999)
                            {
                                if (parsed > maxCode) maxCode = parsed;
                            }
                        }
                    }
                    int nextCode = (maxCode < 10000) ? 10000 : (maxCode + 1);
                    WriteJsonResponse(res, "{\"nextCode\":\"" + nextCode.ToString() + "\"}");
                    return;
                }

                if (path == "/api/save-file" && req.HttpMethod == "POST")
                {
                    string code = req.QueryString["code"];
                    if (string.IsNullOrEmpty(code)) code = "10000";
                    code = code.ToUpper().Trim();
                    string file = req.QueryString["file"];
                    if (string.IsNullOrEmpty(file)) file = "data.json";
                    file = Path.GetFileName(file);
                    string cDir = Path.Combine(dataDir, code);
                    if (!Directory.Exists(cDir)) Directory.CreateDirectory(cDir);
                    string targetFile = Path.Combine(cDir, file);
                    lock (_fileLock)
                    {
                        string tempFile = targetFile + ".tmp." + Guid.NewGuid().ToString("N");
                        using (FileStream fs = File.Create(tempFile))
                        {
                            req.InputStream.CopyTo(fs);
                        }
                        // Safety: never overwrite existing non-empty files with empty array []
                        FileInfo tempFi = new FileInfo(tempFile);
                        if (tempFi.Length <= 4 && File.Exists(targetFile))
                        {
                            FileInfo targetFi = new FileInfo(targetFile);
                            if (targetFi.Length > 4)
                            {
                                File.Delete(tempFile);
                                WriteJsonResponse(res, "{\"success\":true,\"code\":\"" + code + "\",\"file\":\"" + file + "\",\"protected\":true}");
                                return;
                            }
                        }
                        if (File.Exists(targetFile)) File.Delete(targetFile);
                        File.Move(tempFile, targetFile);
                    }
                    WriteJsonResponse(res, "{\"success\":true,\"code\":\"" + code + "\",\"file\":\"" + file + "\"}");
                    return;
                }

                if (path == "/api/vouchers")
                {
                    HandleArrayMasterRequest(req, res, dataDir, "vouchers.json", "vouchers");
                    return;
                }

                if (path == "/api/stock-items")
                {
                    HandleArrayMasterRequest(req, res, dataDir, "stock_items.json", "stockItems");
                    return;
                }

                if (path == "/api/ledgers")
                {
                    HandleArrayMasterRequest(req, res, dataDir, "ledgers.json", "ledgers");
                    return;
                }

                if (path == "/api/units")
                {
                    HandleArrayMasterRequest(req, res, dataDir, "units.json", "units");
                    return;
                }

                if (path == "/api/stock-groups")
                {
                    HandleArrayMasterRequest(req, res, dataDir, "stock_groups.json", "stockGroups");
                    return;
                }

                if (path == "/api/purchase-orders")
                {
                    HandleArrayMasterRequest(req, res, dataDir, "purchase_orders.json", "purchaseOrders");
                    return;
                }

                if (path == "/api/license/token" && req.HttpMethod == "GET")
                {
                    string tFile = Path.Combine(dataDir, "license.token");
                    if (File.Exists(tFile))
                    {
                        string tok = File.ReadAllText(tFile, Encoding.UTF8).Trim();
                        WriteJsonResponse(res, "{\"token\":\"" + tok.Replace("\"", "\\\"") + "\"}");
                    }
                    else
                    {
                        WriteJsonResponse(res, "{\"token\":\"\"}");
                    }
                    return;
                }

                if (path == "/api/license/token" && req.HttpMethod == "POST")
                {
                    Encoding reqEnc = (req.ContentEncoding != null && req.ContentEncoding.CodePage != Encoding.Default.CodePage) ? req.ContentEncoding : Encoding.UTF8;
                    using (StreamReader reader = new StreamReader(req.InputStream, reqEnc))
                    {
                        string body = reader.ReadToEnd();
                        string tok = "";
                        int idx = body.IndexOf("\"token\":");
                        if (idx >= 0)
                        {
                            int colon = body.IndexOf(":", idx);
                            if (colon >= 0)
                            {
                                int q1 = body.IndexOf("\"", colon + 1);
                                int q2 = q1 >= 0 ? body.IndexOf("\"", q1 + 1) : -1;
                                if (q1 >= 0 && q2 > q1) tok = body.Substring(q1 + 1, q2 - (q1 + 1)).Trim();
                            }
                        }
                        if (!string.IsNullOrEmpty(tok))
                        {
                            File.WriteAllText(Path.Combine(dataDir, "license.token"), tok, Encoding.UTF8);
                        }
                        WriteJsonResponse(res, "{\"success\":true}");
                        return;
                    }
                }

                if (path == "/api/companies" && req.HttpMethod == "POST")
                {
                    Encoding reqEnc = (req.ContentEncoding != null && req.ContentEncoding.CodePage != Encoding.Default.CodePage) ? req.ContentEncoding : Encoding.UTF8;
                    using (StreamReader reader = new StreamReader(req.InputStream, reqEnc))
                    {
                        string body = reader.ReadToEnd();
                        JavaScriptSerializer js = new JavaScriptSerializer();
                        js.MaxJsonLength = 50 * 1024 * 1024;
                        Dictionary<string, object> co = null;
                        try
                        {
                            object parsed = js.DeserializeObject(body);
                            co = parsed as Dictionary<string, object>;
                            if (co != null && co.ContainsKey("company") && co["company"] is Dictionary<string, object>)
                            {
                                co = (Dictionary<string, object>)co["company"];
                            }
                        }
                        catch { }

                        if (co == null) co = new Dictionary<string, object>();

                        // Determine 5-digit company code:
                        string code = "";
                        if (co.ContainsKey("companyCode") && co["companyCode"] != null)
                        {
                            string cStr = co["companyCode"].ToString().Trim().ToUpper();
                            if (System.Text.RegularExpressions.Regex.IsMatch(cStr, @"^\d{5}$")) code = cStr;
                        }

                        if (string.IsNullOrEmpty(code))
                        {
                            int maxCode = 9999;
                            if (Directory.Exists(dataDir))
                            {
                                foreach (string dir in Directory.GetDirectories(dataDir))
                                {
                                    string fn = Path.GetFileName(dir).ToUpper();
                                    int cVal;
                                    if (int.TryParse(fn, out cVal) && cVal >= 10000 && cVal <= 99999)
                                    {
                                        if (cVal > maxCode) maxCode = cVal;
                                    }
                                }
                            }
                            code = (maxCode < 10000 ? 10000 : maxCode + 1).ToString();
                        }

                        int parsedCodeVal = 10000;
                        int.TryParse(code, out parsedCodeVal);
                        int numericId = parsedCodeVal - 10000 + 4;
                        if (!co.ContainsKey("id") || co["id"] == null)
                        {
                            co["id"] = numericId;
                        }

                        co["companyCode"] = code;
                        co["code"] = code;

                        string cDir = Path.Combine(dataDir, code);
                        if (!Directory.Exists(cDir)) Directory.CreateDirectory(cDir);

                        // Save company.json
                        File.WriteAllText(Path.Combine(cDir, "company.json"), js.Serialize(co), Encoding.UTF8);

                        // Auto-generate standard ledgers
                        List<Dictionary<string, object>> stdLedgers = new List<Dictionary<string, object>>();
                        string[] ledgerNames = new string[] {
                            "Cash:Cash-in-hand:Dr", "Profit & Loss A/c:Primary:Cr", "Round Off:Indirect Expenses:Dr",
                            "Discount Given:Indirect Expenses:Dr", "Discount Received:Indirect Incomes:Cr",
                            "Transportation Charges:Direct Expenses:Dr", "Freight Charges:Direct Expenses:Dr",
                            "CGST Payable:Duties & Taxes:Cr", "SGST Payable:Duties & Taxes:Cr", "IGST Payable:Duties & Taxes:Cr",
                            "Sales A/c:Sales Accounts:Cr", "Purchase A/c:Purchase Accounts:Dr"
                        };
                        int lid = 1;
                        foreach (string item in ledgerNames)
                        {
                            string[] parts = item.Split(':');
                            Dictionary<string, object> ld = new Dictionary<string, object>();
                            ld["id"] = DateTime.UtcNow.Ticks + lid;
                            ld["companyId"] = co["id"];
                            ld["companyCode"] = code;
                            ld["name"] = parts[0];
                            ld["groupName"] = parts[1];
                            ld["openingBalance"] = 0;
                            ld["balanceType"] = parts[2];
                            stdLedgers.Add(ld);
                            lid++;
                        }
                        File.WriteAllText(Path.Combine(cDir, "ledgers.json"), js.Serialize(stdLedgers), Encoding.UTF8);

                        // Standard Units
                        List<Dictionary<string, object>> stdUnits = new List<Dictionary<string, object>>();
                        string[] unitNames = new string[] {
                            "Nos:Numbers:0", "Pcs:Pieces:0", "Kg:Kilogram:2", "Gms:Grams:0", "Ltr:Litre:2", "Mtr:Meter:2",
                            "Set:Set:0", "Bdl:Bundle:0", "Cft:Cubic Feet:2", "Sqft:Square Feet:2", "Box:Boxes:0",
                            "Dzn:Dozen:0", "Btl:Bottles:0", "Bag:Bags:0", "Tons:Metric Tons:2", "Kits:Kits:0",
                            "Pack:Packs:0", "Rol:Rolls:0", "Ctn:Cartons:0", "Pair:Pairs:0"
                        };
                        int uid = 1;
                        foreach (string item in unitNames)
                        {
                            string[] parts = item.Split(':');
                            Dictionary<string, object> ud = new Dictionary<string, object>();
                            ud["id"] = DateTime.UtcNow.Ticks + 400 + uid;
                            ud["companyId"] = co["id"];
                            ud["companyCode"] = code;
                            ud["name"] = parts[0];
                            ud["symbol"] = parts[0];
                            ud["formalName"] = parts[1];
                            ud["decimalPlaces"] = int.Parse(parts[2]);
                            stdUnits.Add(ud);
                            uid++;
                        }
                        File.WriteAllText(Path.Combine(cDir, "units.json"), js.Serialize(stdUnits), Encoding.UTF8);

                        // Voucher types
                        string[] vTypes = new string[] { "Sales", "Purchase", "Payment", "Receipt", "Contra", "Journal", "Credit Note", "Debit Note", "Sales Quotation" };
                        List<Dictionary<string, object>> stdVt = new List<Dictionary<string, object>>();
                        int vtid = 1;
                        foreach (string vt in vTypes)
                        {
                            Dictionary<string, object> vd = new Dictionary<string, object>();
                            vd["id"] = DateTime.UtcNow.Ticks + 100 + vtid;
                            vd["companyId"] = co["id"];
                            vd["companyCode"] = code;
                            vd["name"] = vt;
                            vd["type"] = vt;
                            vd["abbreviation"] = vt.Length >= 3 ? vt.Substring(0, 3).ToUpper() : vt.ToUpper();
                            vd["numberingMethod"] = "Automatic";
                            vd["startNumber"] = 1;
                            stdVt.Add(vd);
                            vtid++;
                        }
                        File.WriteAllText(Path.Combine(cDir, "voucher_types.json"), js.Serialize(stdVt), Encoding.UTF8);

                        File.WriteAllText(Path.Combine(cDir, "groups.json"), "[]", Encoding.UTF8);
                        File.WriteAllText(Path.Combine(cDir, "vouchers.json"), "[]", Encoding.UTF8);
                        File.WriteAllText(Path.Combine(cDir, "stock_items.json"), "[]", Encoding.UTF8);
                        File.WriteAllText(Path.Combine(cDir, "stock_groups.json"), "[]", Encoding.UTF8);
                        File.WriteAllText(Path.Combine(cDir, "purchase_orders.json"), "[]", Encoding.UTF8);
                        File.WriteAllText(Path.Combine(cDir, "boms.json"), "[]", Encoding.UTF8);
                        File.WriteAllText(Path.Combine(cDir, "manufacturing_journals.json"), "[]", Encoding.UTF8);
                        File.WriteAllText(Path.Combine(cDir, "pos_purchase_list.json"), "[]", Encoding.UTF8);

                        string coName = co.ContainsKey("name") && co["name"] != null ? co["name"].ToString() : ("Company " + code);
                        string defaultUsersJson = string.Format(@"[
  {{
    ""id"": ""usr_admin_{0}"",
    ""username"": ""admin"",
    ""fullName"": ""Administrator ({1})"",
    ""password"": """",
    ""assignedCompanyCodes"": [""{0}""],
    ""companyCode"": ""{0}"",
    ""isAdmin"": true,
    ""isActive"": true,
    ""createdAt"": ""{2}"",
    ""permissions"": {{
      ""vouchers"": {{ ""Purchase"": true, ""Sales"": true, ""Payment"": true, ""Receipt"": true, ""Contra"": true, ""Journal"": true, ""Debit Note"": true, ""Credit Note"": true, ""Sales Quotation"": true, ""POS Sale"": true, ""Purchase POS List"": true }},
      ""registers"": {{ ""Purchase Register"": true, ""Sales Register"": true, ""Day Book"": true, ""Payment Register"": true, ""Receipt Register"": true, ""Journal Register"": true, ""Contra Register"": true, ""Debit Note Register"": true, ""Credit Note Register"": true, ""Quotation Register"": true }},
      ""modules"": {{ ""BOM"": true, ""Manufacturing"": true, ""BankStatement"": true, ""PurchaseOrder"": true }},
      ""reports"": {{ ""BalanceSheet"": true, ""ProfitLoss"": true, ""TrialBalance"": true, ""StockSummary"": true, ""GSTReports"": true, ""AuditTrail"": true }},
      ""masters"": {{ ""createLedger"": true, ""alterLedger"": true, ""createStockItem"": true, ""alterStockItem"": true, ""deleteMaster"": true, ""deleteVoucher"": true }}
    }}
  }},
  {{
    ""id"": ""usr_cashier_{0}"",
    ""username"": ""cashier"",
    ""fullName"": ""Cashier ({1})"",
    ""password"": """",
    ""assignedCompanyCodes"": [""{0}""],
    ""companyCode"": ""{0}"",
    ""isAdmin"": false,
    ""isActive"": true,
    ""createdAt"": ""{2}"",
    ""permissions"": {{
      ""vouchers"": {{ ""Purchase"": false, ""Sales"": false, ""Payment"": false, ""Receipt"": false, ""Contra"": false, ""Journal"": false, ""Debit Note"": false, ""Credit Note"": false, ""Sales Quotation"": false, ""POS Sale"": true, ""Purchase POS List"": true }},
      ""registers"": {{ ""Purchase Register"": false, ""Sales Register"": false, ""Day Book"": false, ""Payment Register"": false, ""Receipt Register"": false, ""Journal Register"": false, ""Contra Register"": false, ""Debit Note Register"": false, ""Credit Note Register"": false, ""Quotation Register"": false }},
      ""modules"": {{ ""BOM"": false, ""Manufacturing"": false, ""BankStatement"": false, ""PurchaseOrder"": false }},
      ""reports"": {{ ""BalanceSheet"": false, ""ProfitLoss"": false, ""TrialBalance"": false, ""StockSummary"": false, ""GSTReports"": false, ""AuditTrail"": false }},
      ""masters"": {{ ""createLedger"": false, ""alterLedger"": false, ""createStockItem"": false, ""alterStockItem"": false, ""deleteMaster"": false, ""deleteVoucher"": false }}
    }}
  }}
]", code, coName.Replace("\"", "\\\""), DateTime.UtcNow.ToString("o"));
                        File.WriteAllText(Path.Combine(cDir, "users.json"), defaultUsersJson, Encoding.UTF8);

                        Dictionary<string, object> retObj = new Dictionary<string, object>();
                        retObj["success"] = true;
                        retObj["company"] = co;
                        retObj["companyCode"] = code;
                        retObj["ledgers"] = stdLedgers;
                        WriteJsonResponse(res, js.Serialize(retObj));
                        return;
                    }
                }

                if (path == "/api/companies" && req.HttpMethod == "PUT")
                {
                    Encoding reqEnc = (req.ContentEncoding != null && req.ContentEncoding.CodePage != Encoding.Default.CodePage) ? req.ContentEncoding : Encoding.UTF8;
                    using (StreamReader reader = new StreamReader(req.InputStream, reqEnc))
                    {
                        string body = reader.ReadToEnd();
                        JavaScriptSerializer js = new JavaScriptSerializer();
                        js.MaxJsonLength = 50 * 1024 * 1024;
                        Dictionary<string, object> co = null;
                        try
                        {
                            object parsed = js.DeserializeObject(body);
                            co = parsed as Dictionary<string, object>;
                            if (co != null && co.ContainsKey("company") && co["company"] is Dictionary<string, object>)
                            {
                                co = (Dictionary<string, object>)co["company"];
                            }
                        }
                        catch { }

                        if (co == null) co = new Dictionary<string, object>();

                        // Determine target company code
                        string code = req.QueryString["code"];
                        if (string.IsNullOrEmpty(code)) code = req.QueryString["companyCode"];
                        if (string.IsNullOrEmpty(code) && co.ContainsKey("companyCode") && co["companyCode"] != null)
                        {
                            code = co["companyCode"].ToString().Trim().ToUpper();
                        }
                        if (string.IsNullOrEmpty(code) && co.ContainsKey("code") && co["code"] != null)
                        {
                            code = co["code"].ToString().Trim().ToUpper();
                        }

                        string targetIdStr = req.QueryString["id"];
                        if (string.IsNullOrEmpty(targetIdStr) && co.ContainsKey("id") && co["id"] != null)
                        {
                            targetIdStr = co["id"].ToString().Trim();
                        }

                        string targetDir = null;
                        if (!string.IsNullOrEmpty(code) && System.Text.RegularExpressions.Regex.IsMatch(code, @"^\d{5}$"))
                        {
                            string candidate = Path.Combine(dataDir, code);
                            if (Directory.Exists(candidate)) targetDir = candidate;
                        }

                        if (string.IsNullOrEmpty(targetDir) && !string.IsNullOrEmpty(targetIdStr) && Directory.Exists(dataDir))
                        {
                            foreach (string dir in Directory.GetDirectories(dataDir))
                            {
                                string cJsonFile = Path.Combine(dir, "company.json");
                                if (File.Exists(cJsonFile))
                                {
                                    try
                                    {
                                        string txt = File.ReadAllText(cJsonFile, Encoding.UTF8);
                                        Dictionary<string, object> diskCo = js.DeserializeObject(txt) as Dictionary<string, object>;
                                        if (diskCo != null && diskCo.ContainsKey("id") && diskCo["id"] != null && diskCo["id"].ToString().Trim() == targetIdStr)
                                        {
                                            targetDir = dir;
                                            code = Path.GetFileName(dir).ToUpper();
                                            break;
                                        }
                                    }
                                    catch { }
                                }
                            }
                        }

                        if (string.IsNullOrEmpty(targetDir) && !string.IsNullOrEmpty(code))
                        {
                            targetDir = Path.Combine(dataDir, code);
                            if (!Directory.Exists(targetDir)) Directory.CreateDirectory(targetDir);
                        }

                        if (string.IsNullOrEmpty(targetDir))
                        {
                            targetDir = Path.Combine(dataDir, "10000");
                            code = "10000";
                            if (!Directory.Exists(targetDir)) Directory.CreateDirectory(targetDir);
                        }

                        string finalJsonPath = Path.Combine(targetDir, "company.json");
                        Dictionary<string, object> existingCo = new Dictionary<string, object>();
                        if (File.Exists(finalJsonPath))
                        {
                            try
                            {
                                string txt = File.ReadAllText(finalJsonPath, Encoding.UTF8);
                                Dictionary<string, object> loaded = js.DeserializeObject(txt) as Dictionary<string, object>;
                                if (loaded != null) existingCo = loaded;
                            }
                            catch { }
                        }

                        foreach (var kvp in co)
                        {
                            existingCo[kvp.Key] = kvp.Value;
                        }

                        if (string.IsNullOrEmpty(code)) code = Path.GetFileName(targetDir).ToUpper();
                        existingCo["companyCode"] = code;
                        existingCo["code"] = code;
                        if (!existingCo.ContainsKey("id") || existingCo["id"] == null)
                        {
                            int pCode;
                            if (int.TryParse(code, out pCode)) existingCo["id"] = pCode - 10000 + 4;
                        }

                        File.WriteAllText(finalJsonPath, js.Serialize(existingCo), Encoding.UTF8);

                        Dictionary<string, object> retObj = new Dictionary<string, object>();
                        retObj["success"] = true;
                        retObj["company"] = existingCo;
                        retObj["companyCode"] = code;
                        WriteJsonResponse(res, js.Serialize(retObj));
                        return;
                    }
                }

                if (path == "/api/companies" || path == "/api/company/scan")
                {
                    JavaScriptSerializer js = new JavaScriptSerializer();
                    js.MaxJsonLength = 50 * 1024 * 1024;
                    List<Dictionary<string, object>> companies = new List<Dictionary<string, object>>();
                    if (Directory.Exists(dataDir))
                    {
                        foreach (string dir in Directory.GetDirectories(dataDir))
                        {
                            string folderName = Path.GetFileName(dir).ToUpper();
                            if (folderName == "TRAINING") continue;
                            string cJsonFile = Path.Combine(dir, "company.json");
                            if (File.Exists(cJsonFile))
                            {
                                try
                                {
                                    string txt = File.ReadAllText(cJsonFile, Encoding.UTF8);
                                    object parsed = js.DeserializeObject(txt);
                                    Dictionary<string, object> co = parsed as Dictionary<string, object>;
                                    if (co != null)
                                    {
                                        while (co.ContainsKey("company") && co["company"] is Dictionary<string, object>)
                                        {
                                            Dictionary<string, object> inner = (Dictionary<string, object>)co["company"];
                                            co.Remove("company");
                                            foreach (var kvp in inner)
                                            {
                                                if (!co.ContainsKey(kvp.Key)) co[kvp.Key] = kvp.Value;
                                            }
                                        }

                                        co["companyCode"] = folderName;
                                        if (!co.ContainsKey("id") || co["id"] == null)
                                        {
                                            int parsedCode;
                                            if (int.TryParse(folderName, out parsedCode))
                                            {
                                                co["id"] = parsedCode - 10000 + 4;
                                            }
                                        }

                                        Dictionary<string, object> itemWrapper = new Dictionary<string, object>(co);
                                        itemWrapper["companyCode"] = folderName;
                                        itemWrapper["company"] = co;

                                        companies.Add(itemWrapper);
                                    }
                                }
                                catch { }
                            }
                        }
                    }
                    Dictionary<string, object> resObj = new Dictionary<string, object>();
                    resObj["companies"] = companies;
                    WriteJsonResponse(res, js.Serialize(resObj));
                    return;
                }

                if (path == "/api/company/delete" || ((path == "/api/company" || path == "/api/companies") && req.HttpMethod == "DELETE"))
                {
                    string code = req.QueryString["code"];
                    if (string.IsNullOrEmpty(code)) code = req.QueryString["companyCode"];
                    string targetId = req.QueryString["id"];

                    if (string.IsNullOrEmpty(code) && req.HasEntityBody)
                    {
                        try
                        {
                            using (StreamReader reader = new StreamReader(req.InputStream, Encoding.UTF8))
                            {
                                string body = reader.ReadToEnd();
                                JavaScriptSerializer js = new JavaScriptSerializer();
                                Dictionary<string, object> d = js.DeserializeObject(body) as Dictionary<string, object>;
                                if (d != null)
                                {
                                    if (d.ContainsKey("companyCode") && d["companyCode"] != null) code = d["companyCode"].ToString().Trim();
                                    else if (d.ContainsKey("code") && d["code"] != null) code = d["code"].ToString().Trim();
                                    else if (d.ContainsKey("id") && d["id"] != null) targetId = d["id"].ToString().Trim();
                                }
                            }
                        }
                        catch { }
                    }

                    if (string.IsNullOrEmpty(code) && !string.IsNullOrEmpty(targetId) && Directory.Exists(dataDir))
                    {
                        JavaScriptSerializer js = new JavaScriptSerializer();
                        foreach (string dir in Directory.GetDirectories(dataDir))
                        {
                            string cJsonFile = Path.Combine(dir, "company.json");
                            if (File.Exists(cJsonFile))
                            {
                                try
                                {
                                    string txt = File.ReadAllText(cJsonFile, Encoding.UTF8);
                                    Dictionary<string, object> diskCo = js.DeserializeObject(txt) as Dictionary<string, object>;
                                    if (diskCo != null && diskCo.ContainsKey("id") && diskCo["id"] != null && diskCo["id"].ToString().Trim() == targetId)
                                    {
                                        code = Path.GetFileName(dir).ToUpper();
                                        break;
                                    }
                                }
                                catch { }
                            }
                        }
                    }

                    if (!string.IsNullOrEmpty(code))
                    {
                        code = code.ToUpper().Trim();
                        string cDir = Path.Combine(dataDir, code);
                        if (Directory.Exists(cDir))
                        {
                            try { Directory.Delete(cDir, true); } catch { }
                        }
                    }
                    WriteJsonResponse(res, "{\"success\":true}");
                    return;
                }

                if (path == "/api/company" && req.HttpMethod == "GET")
                {
                    string code = req.QueryString["code"];
                    if (string.IsNullOrEmpty(code)) code = "10000";
                    code = code.ToUpper().Trim();
                    string cDir = Path.Combine(dataDir, code);
                    if (!Directory.Exists(cDir))
                    {
                        res.StatusCode = 404;
                        WriteJsonResponse(res, "{\"error\":\"Not found\"}");
                        return;
                    }

                    string cJson = File.Exists(Path.Combine(cDir, "company.json")) ? File.ReadAllText(Path.Combine(cDir, "company.json"), Encoding.UTF8) : "{}";
                    string lJson = File.Exists(Path.Combine(cDir, "ledgers.json")) ? File.ReadAllText(Path.Combine(cDir, "ledgers.json"), Encoding.UTF8) : "[]";
                    string vJson = File.Exists(Path.Combine(cDir, "vouchers.json")) ? File.ReadAllText(Path.Combine(cDir, "vouchers.json"), Encoding.UTF8) : "[]";
                    string sJson = File.Exists(Path.Combine(cDir, "stock_items.json")) ? File.ReadAllText(Path.Combine(cDir, "stock_items.json"), Encoding.UTF8) : "[]";
                    string sgJson = File.Exists(Path.Combine(cDir, "stock_groups.json")) ? File.ReadAllText(Path.Combine(cDir, "stock_groups.json"), Encoding.UTF8) : "[]";
                    string uJson = File.Exists(Path.Combine(cDir, "units.json")) ? File.ReadAllText(Path.Combine(cDir, "units.json"), Encoding.UTF8) : "[]";
                    string gJson = File.Exists(Path.Combine(cDir, "groups.json")) ? File.ReadAllText(Path.Combine(cDir, "groups.json"), Encoding.UTF8) : "[]";
                    string vtJson = File.Exists(Path.Combine(cDir, "voucher_types.json")) ? File.ReadAllText(Path.Combine(cDir, "voucher_types.json"), Encoding.UTF8) : "[]";
                    string poJson = File.Exists(Path.Combine(cDir, "purchase_orders.json")) ? File.ReadAllText(Path.Combine(cDir, "purchase_orders.json"), Encoding.UTF8) : "[]";
                    string bomJson = File.Exists(Path.Combine(cDir, "boms.json")) ? File.ReadAllText(Path.Combine(cDir, "boms.json"), Encoding.UTF8) : "[]";
                    string mjJson = File.Exists(Path.Combine(cDir, "manufacturing_journals.json")) ? File.ReadAllText(Path.Combine(cDir, "manufacturing_journals.json"), Encoding.UTF8) : "[]";
                    string usrJson = File.Exists(Path.Combine(cDir, "users.json")) ? File.ReadAllText(Path.Combine(cDir, "users.json"), Encoding.UTF8) : "[]";
                    string posListJson = File.Exists(Path.Combine(cDir, "pos_purchase_list.json")) ? File.ReadAllText(Path.Combine(cDir, "pos_purchase_list.json"), Encoding.UTF8) : "[]";

                    string jsonOut = string.Format(
                        "{{\"success\":true,\"companyCode\":\"{0}\",\"company\":{1},\"ledgers\":{2},\"vouchers\":{3},\"stockItems\":{4},\"stockGroups\":{5},\"units\":{6},\"groups\":{7},\"voucherTypes\":{8},\"purchaseOrders\":{9},\"boms\":{10},\"manufacturingJournals\":{11},\"users\":{12},\"posPurchaseList\":{13}}}",
                        code, cJson, lJson, vJson, sJson, sgJson, uJson, gJson, vtJson, poJson, bomJson, mjJson, usrJson, posListJson
                    );
                    WriteJsonResponse(res, jsonOut);
                    return;
                }

                if (path == "/api/company" && req.HttpMethod == "POST")
                {
                    Encoding reqEnc = (req.ContentEncoding != null && req.ContentEncoding.CodePage != Encoding.Default.CodePage) ? req.ContentEncoding : Encoding.UTF8;
                    using (StreamReader reader = new StreamReader(req.InputStream, reqEnc))
                    {
                        string body = reader.ReadToEnd();
                        string code = req.QueryString["companyCode"];
                        if (string.IsNullOrEmpty(code)) code = req.QueryString["code"];
                        if (string.IsNullOrEmpty(code) || !System.Text.RegularExpressions.Regex.IsMatch(code.Trim(), @"^\d{5}$"))
                        {
                            int idx = body.IndexOf("\"companyCode\":");
                            if (idx < 0) idx = body.IndexOf("\"code\":");
                            if (idx >= 0)
                            {
                                int colon = body.IndexOf(":", idx);
                                if (colon >= 0)
                                {
                                    int q1 = body.IndexOf("\"", colon + 1);
                                    int q2 = q1 >= 0 ? body.IndexOf("\"", q1 + 1) : -1;
                                    if (q1 >= 0 && q2 > q1)
                                    {
                                        string found = body.Substring(q1 + 1, q2 - (q1 + 1)).Trim().ToUpper();
                                        if (System.Text.RegularExpressions.Regex.IsMatch(found, @"^\d{5}$")) code = found;
                                    }
                                }
                            }
                        }
                        if (string.IsNullOrEmpty(code) || !System.Text.RegularExpressions.Regex.IsMatch(code, @"^\d{5}$")) code = "10000";

                        string cDir = Path.Combine(dataDir, code);
                        if (!Directory.Exists(cDir)) Directory.CreateDirectory(cDir);

                        lock (_fileLock)
                        {
                            try
                            {
                                JavaScriptSerializer jsComp = new JavaScriptSerializer();
                                object parsedComp = jsComp.DeserializeObject(body);
                                Dictionary<string, object> dComp = parsedComp as Dictionary<string, object>;
                                if (dComp != null && dComp.ContainsKey("company") && dComp["company"] is Dictionary<string, object>)
                                {
                                    Dictionary<string, object> coObj = (Dictionary<string, object>)dComp["company"];
                                    while (coObj.ContainsKey("company") && coObj["company"] is Dictionary<string, object>)
                                    {
                                        Dictionary<string, object> innerCo = (Dictionary<string, object>)coObj["company"];
                                        coObj.Remove("company");
                                        foreach (var kvp in innerCo)
                                        {
                                            if (!coObj.ContainsKey(kvp.Key)) coObj[kvp.Key] = kvp.Value;
                                        }
                                    }
                                    coObj["companyCode"] = code;
                                    File.WriteAllText(Path.Combine(cDir, "company.json"), jsComp.Serialize(coObj), Encoding.UTF8);
                                }
                                else
                                {
                                    ExtractAndWrite(body, "company", Path.Combine(cDir, "company.json"), "{}");
                                }
                            }
                            catch
                            {
                                ExtractAndWrite(body, "company", Path.Combine(cDir, "company.json"), "{}");
                            }

                            ExtractAndWrite(body, "ledgers", Path.Combine(cDir, "ledgers.json"), "[]");
                            ExtractAndWrite(body, "vouchers", Path.Combine(cDir, "vouchers.json"), "[]");
                            ExtractAndWrite(body, "stockItems", Path.Combine(cDir, "stock_items.json"), "[]");
                            ExtractAndWrite(body, "stockGroups", Path.Combine(cDir, "stock_groups.json"), "[]");
                            ExtractAndWrite(body, "units", Path.Combine(cDir, "units.json"), "[]");
                            ExtractAndWrite(body, "groups", Path.Combine(cDir, "groups.json"), "[]");
                            ExtractAndWrite(body, "voucherTypes", Path.Combine(cDir, "voucher_types.json"), "[]");
                            ExtractAndWrite(body, "purchaseOrders", Path.Combine(cDir, "purchase_orders.json"), "[]");
                            ExtractAndWrite(body, "boms", Path.Combine(cDir, "boms.json"), "[]");
                            ExtractAndWrite(body, "manufacturingJournals", Path.Combine(cDir, "manufacturing_journals.json"), "[]");
                            ExtractAndWrite(body, "users", Path.Combine(cDir, "users.json"), "[]");
                            ExtractAndWrite(body, "posPurchaseList", Path.Combine(cDir, "pos_purchase_list.json"), "[]");
                        }

                        WriteJsonResponse(res, "{\"success\":true,\"companyCode\":\"" + code + "\"}");
                        return;
                    }
                }

                if (path == "/api/pos/purchase-list" && req.HttpMethod == "GET")
                {
                    string code = req.QueryString["companyCode"];
                    if (string.IsNullOrEmpty(code)) code = req.QueryString["code"];
                    if (string.IsNullOrEmpty(code)) code = "10000";
                    code = code.ToUpper().Trim();
                    string cDir = Path.Combine(dataDir, code);
                    string targetFile = Path.Combine(cDir, "pos_purchase_list.json");
                    string json = File.Exists(targetFile) ? File.ReadAllText(targetFile) : "[]";
                    WriteJsonResponse(res, "{\"success\":true,\"companyCode\":\"" + code + "\",\"items\":" + json + "}");
                    return;
                }

                if (path == "/api/pos/purchase-list" && req.HttpMethod == "POST")
                {
                    Encoding reqEnc = (req.ContentEncoding != null && req.ContentEncoding.CodePage != Encoding.Default.CodePage) ? req.ContentEncoding : Encoding.UTF8;
                    using (StreamReader reader = new StreamReader(req.InputStream, reqEnc))
                    {
                        string body = reader.ReadToEnd();
                        string code = "10000";
                        int idx = body.IndexOf("\"companyCode\":");
                        if (idx >= 0)
                        {
                            int q1 = body.IndexOf("\"", idx + 14);
                            int q2 = q1 >= 0 ? body.IndexOf("\"", q1 + 1) : -1;
                            if (q1 >= 0 && q2 > q1)
                            {
                                code = body.Substring(q1 + 1, q2 - (q1 + 1)).Trim().ToUpper();
                            }
                        }
                        string cDir = Path.Combine(dataDir, code);
                        if (!Directory.Exists(cDir)) Directory.CreateDirectory(cDir);
                        lock (_fileLock)
                        {
                            ExtractAndWrite(body, "items", Path.Combine(cDir, "pos_purchase_list.json"), "[]");
                        }
                        WriteJsonResponse(res, "{\"success\":true,\"message\":\"POS Purchase List saved\",\"companyCode\":\"" + code + "\"}");
                        return;
                    }
                }

                if (path == "/api/pos/direct-print" && req.HttpMethod == "POST")
                {
                    Encoding reqEnc = (req.ContentEncoding != null && req.ContentEncoding.CodePage != Encoding.Default.CodePage) ? req.ContentEncoding : Encoding.UTF8;
                    using (StreamReader reader = new StreamReader(req.InputStream, reqEnc))
                    {
                        string body = reader.ReadToEnd();
                        string printError = null;
                        bool ok = DirectThermalPrinter.PrintReceipt(body, out printError);
                        if (ok)
                        {
                            WriteJsonResponse(res, "{\"success\":true,\"message\":\"Receipt printed directly to printer without browser dialog or flash\"}");
                        }
                        else
                        {
                            WriteJsonResponse(res, "{\"success\":false,\"error\":\"" + (printError ?? "Print failed").Replace("\"", "'") + "\"}");
                        }
                        return;
                    }
                }

                if (path == "/api/pos/next-bill-no" && req.HttpMethod == "GET")
                {
                    string code = req.QueryString["companyCode"];
                    if (string.IsNullOrEmpty(code)) code = req.QueryString["code"];
                    if (string.IsNullOrEmpty(code)) code = "10000";
                    code = code.ToUpper().Trim();

                    string prefix = req.QueryString["prefix"];
                    if (string.IsNullOrEmpty(prefix))
                    {
                        prefix = (code == "TRAINING") ? "TRN-" : "CASH";
                    }

                    string cDir = Path.Combine(dataDir, code);
                    if (!Directory.Exists(cDir))
                    {
                        try { Directory.CreateDirectory(cDir); } catch { }
                    }
                    string vPath = Path.Combine(cDir, "vouchers.json");

                    long maxSeq = 0;
                    lock (_fileLock)
                    {
                        if (File.Exists(vPath))
                        {
                            try
                            {
                                string text = File.ReadAllText(vPath, Encoding.UTF8);
                                if (!string.IsNullOrEmpty(text.Trim()))
                                {
                                    JavaScriptSerializer js = new JavaScriptSerializer();
                                    js.MaxJsonLength = 50 * 1024 * 1024;
                                    object parsed = js.DeserializeObject(text);
                                    IEnumerable items = null;
                                    if (parsed is object[]) items = (object[])parsed;
                                    else if (parsed is ArrayList) items = (ArrayList)parsed;

                                    if (items != null)
                                    {
                                        foreach (object obj in items)
                                        {
                                            Dictionary<string, object> v = obj as Dictionary<string, object>;
                                            if (v == null) continue;
                                            string vNo = "";
                                            if (v.ContainsKey("voucherNo") && v["voucherNo"] != null) vNo = v["voucherNo"].ToString();
                                            else if (v.ContainsKey("voucherNumber") && v["voucherNumber"] != null) vNo = v["voucherNumber"].ToString();
                                            else if (v.ContainsKey("refNo") && v["refNo"] != null) vNo = v["refNo"].ToString();

                                            long seq = ExtractTrailingNumber(vNo, prefix);
                                            if (seq > maxSeq) maxSeq = seq;
                                        }
                                    }
                                }
                            }
                            catch { }
                        }
                    }

                    long nextSeq = maxSeq + 1;
                    string nextBillNo = prefix + nextSeq.ToString("D4");
                    string resJson = "{\"success\":true,\"companyCode\":\"" + code + "\",\"prefix\":\"" + prefix + "\",\"sequence\":" + nextSeq + ",\"nextBillNo\":\"" + nextBillNo + "\"}";
                    WriteJsonResponse(res, resJson);
                    return;
                }

                if (path == "/api/pos/commit-sale" && req.HttpMethod == "POST")
                {
                    Encoding reqEnc = (req.ContentEncoding != null && req.ContentEncoding.CodePage != Encoding.Default.CodePage) ? req.ContentEncoding : Encoding.UTF8;
                    using (StreamReader reader = new StreamReader(req.InputStream, reqEnc))
                    {
                        string body = reader.ReadToEnd();
                        JavaScriptSerializer js = new JavaScriptSerializer();
                        js.MaxJsonLength = 50 * 1024 * 1024;
                        object payload = js.DeserializeObject(body);
                        Dictionary<string, object> payloadDict = payload as Dictionary<string, object>;
                        if (payloadDict == null)
                        {
                            res.StatusCode = 400;
                            WriteJsonResponse(res, "{\"success\":false,\"error\":\"Invalid JSON payload\"}");
                            return;
                        }

                        string code = "";
                        if (payloadDict.ContainsKey("companyCode") && payloadDict["companyCode"] != null)
                            code = payloadDict["companyCode"].ToString();
                        if (string.IsNullOrEmpty(code) && payloadDict.ContainsKey("code") && payloadDict["code"] != null)
                            code = payloadDict["code"].ToString();
                        if (string.IsNullOrEmpty(code)) code = "10000";
                        code = code.ToUpper().Trim();

                        Dictionary<string, object> voucher = null;
                        if (payloadDict.ContainsKey("voucher") && payloadDict["voucher"] is Dictionary<string, object>)
                        {
                            voucher = (Dictionary<string, object>)payloadDict["voucher"];
                        }
                        else
                        {
                            voucher = payloadDict;
                        }

                        string cDir = Path.Combine(dataDir, code);
                        if (!Directory.Exists(cDir))
                        {
                            try { Directory.CreateDirectory(cDir); } catch { }
                        }
                        string vPath = Path.Combine(cDir, "vouchers.json");

                        lock (_fileLock)
                        {
                            List<object> list = new List<object>();
                            HashSet<string> existingBillNos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                            HashSet<long> existingIds = new HashSet<long>();
                            long maxSeq = 0;
                            string prefix = (code == "TRAINING") ? "TRN-" : "CASH";

                            if (File.Exists(vPath))
                            {
                                try
                                {
                                    string existingText = File.ReadAllText(vPath, Encoding.UTF8);
                                    if (!string.IsNullOrEmpty(existingText.Trim()))
                                    {
                                        object parsed = js.DeserializeObject(existingText);
                                        IEnumerable items = null;
                                        if (parsed is object[]) items = (object[])parsed;
                                        else if (parsed is ArrayList) items = (ArrayList)parsed;

                                        if (items != null)
                                        {
                                            foreach (object obj in items)
                                            {
                                                Dictionary<string, object> d = obj as Dictionary<string, object>;
                                                if (d == null) continue;

                                                long dId = 0;
                                                if (d.ContainsKey("id") && d["id"] != null) long.TryParse(d["id"].ToString(), out dId);

                                                string vNo = "";
                                                if (d.ContainsKey("voucherNo") && d["voucherNo"] != null) vNo = d["voucherNo"].ToString();
                                                else if (d.ContainsKey("voucherNumber") && d["voucherNumber"] != null) vNo = d["voucherNumber"].ToString();
                                                else if (d.ContainsKey("refNo") && d["refNo"] != null) vNo = d["refNo"].ToString();

                                                if (dId > 0 && existingIds.Contains(dId))
                                                {
                                                    // Deduplicate by ID
                                                    continue;
                                                }
                                                if (dId > 0) existingIds.Add(dId);

                                                if (!string.IsNullOrEmpty(vNo))
                                                {
                                                    existingBillNos.Add(vNo);
                                                    if (vNo.StartsWith("POS-", StringComparison.OrdinalIgnoreCase))
                                                    {
                                                        existingBillNos.Add(vNo.Substring(4));
                                                    }
                                                    long seq = ExtractTrailingNumber(vNo, prefix);
                                                    if (seq > maxSeq) maxSeq = seq;
                                                }

                                                list.Add(d);
                                            }
                                        }
                                    }
                                }
                                catch { }
                            }

                            // Determine voucher ID
                            long vId = 0;
                            if (voucher.ContainsKey("id") && voucher["id"] != null)
                            {
                                long.TryParse(voucher["id"].ToString(), out vId);
                            }
                            if (vId <= 0 || existingIds.Contains(vId))
                            {
                                vId = DateTime.UtcNow.Ticks;
                                voucher["id"] = vId;
                            }

                            // Determine Bill No - Must be sequential & collision-proof
                            string reqBillNo = "";
                            if (voucher.ContainsKey("voucherNo") && voucher["voucherNo"] != null)
                            {
                                reqBillNo = voucher["voucherNo"].ToString().Trim();
                            }

                            // If requested bill number is empty OR already exists on disk, allocate the next free number
                            if (string.IsNullOrEmpty(reqBillNo) || existingBillNos.Contains(reqBillNo))
                            {
                                long nextSeq = maxSeq + 1;
                                reqBillNo = prefix + nextSeq.ToString("D4");
                                maxSeq = nextSeq;
                            }
                            else
                            {
                                long seq = ExtractTrailingNumber(reqBillNo, prefix);
                                if (seq > maxSeq) maxSeq = seq;
                            }

                            voucher["voucherNo"] = reqBillNo;
                            voucher["refNo"] = "POS-" + reqBillNo;
                            voucher["number"] = list.Count + 1;
                            voucher["isPOS"] = true;
                            voucher["companyCode"] = code;

                            list.Add(voucher);

                            // Write updated vouchers atomically (UTF8 without BOM for clean multi-platform parsing)
                            string tmp = vPath + ".tmp." + Guid.NewGuid().ToString("N");
                            File.WriteAllText(tmp, js.Serialize(list), new UTF8Encoding(false));
                            if (File.Exists(vPath)) File.Delete(vPath);
                            File.Move(tmp, vPath);

                            Dictionary<string, object> resObj = new Dictionary<string, object>();
                            resObj["success"] = true;
                            resObj["finalBillNo"] = reqBillNo;
                            resObj["companyCode"] = code;
                            resObj["voucher"] = voucher;
                            resObj["totalVouchers"] = list.Count;

                            WriteJsonResponse(res, js.Serialize(resObj));
                            return;
                        }
                    }
                }

                // Static file serving for 100% Offline LAN Multi-User Access
                string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string wwwDir = Path.Combine(localApp, "LedgerX", "www");
                if (!Directory.Exists(wwwDir))
                {
                    string exeDir = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);
                    if (string.IsNullOrEmpty(exeDir)) exeDir = AppDomain.CurrentDomain.BaseDirectory;
                    wwwDir = Path.Combine(exeDir, "www");
                }

                if (Directory.Exists(wwwDir))
                {
                    string cleanPath = path;
                    if (cleanPath == "/" || cleanPath == "" || cleanPath == "/index.html")
                    {
                        cleanPath = "/index.html";
                    }

                    string relFile = cleanPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                    string targetFile = Path.Combine(wwwDir, relFile);

                    if (!File.Exists(targetFile))
                    {
                        if (!path.StartsWith("/api/") && !path.Contains("."))
                        {
                            targetFile = Path.Combine(wwwDir, "index.html");
                        }
                    }

                    if (File.Exists(targetFile))
                    {
                        string ext = Path.GetExtension(targetFile).ToLower();
                        string mime = "application/octet-stream";
                        if (ext == ".html" || ext == ".htm") mime = "text/html; charset=utf-8";
                        else if (ext == ".js") mime = "application/javascript; charset=utf-8";
                        else if (ext == ".css") mime = "text/css; charset=utf-8";
                        else if (ext == ".json") mime = "application/json; charset=utf-8";
                        else if (ext == ".ico") mime = "image/x-icon";
                        else if (ext == ".png") mime = "image/png";
                        else if (ext == ".jpg" || ext == ".jpeg") mime = "image/jpeg";
                        else if (ext == ".svg") mime = "image/svg+xml";
                        else if (ext == ".woff" || ext == ".woff2") mime = "font/woff2";

                        byte[] fileBytes = File.ReadAllBytes(targetFile);
                        res.ContentType = mime;
                        res.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
                        res.Headers.Add("Pragma", "no-cache");
                        res.Headers.Add("Expires", "0");
                        res.ContentLength64 = fileBytes.Length;
                        res.StatusCode = 200;
                        res.OutputStream.Write(fileBytes, 0, fileBytes.Length);
                        res.OutputStream.Close();
                        return;
                    }
                }

                res.StatusCode = 404;
                WriteJsonResponse(res, "{\"error\":\"Endpoint not found\"}");
            }
            catch
            {
                try { ctx.Response.StatusCode = 500; ctx.Response.Close(); } catch { }
            }
        }

        private static void WriteJsonResponse(HttpListenerResponse res, string json)
        {
            try
            {
                byte[] buf = Encoding.UTF8.GetBytes(json);
                res.ContentType = "application/json; charset=utf-8";
                res.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
                res.Headers.Add("Pragma", "no-cache");
                res.Headers.Add("Expires", "0");
                res.ContentLength64 = buf.Length;
                res.OutputStream.Write(buf, 0, buf.Length);
                res.OutputStream.Close();
            }
            catch { }
        }

        private static long ExtractTrailingNumber(string str, string prefix)
        {
            if (string.IsNullOrEmpty(str)) return 0;
            string clean = str.Trim();
            bool isPrefixed = false;
            if (clean.StartsWith("POS-", StringComparison.OrdinalIgnoreCase))
            {
                clean = clean.Substring(4).Trim();
                isPrefixed = true;
            }
            if (!string.IsNullOrEmpty(prefix) && clean.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                clean = clean.Substring(prefix.Length).TrimStart('-', '_');
                isPrefixed = true;
            }
            else if (clean.StartsWith("CASH", StringComparison.OrdinalIgnoreCase))
            {
                clean = clean.Substring(4).TrimStart('-', '_');
                isPrefixed = true;
            }
            else if (clean.StartsWith("TRN", StringComparison.OrdinalIgnoreCase))
            {
                clean = clean.Substring(3).TrimStart('-', '_');
                isPrefixed = true;
            }

            if (!isPrefixed) return 0;

            Match m = Regex.Match(clean, @"\d+");
            if (m.Success)
            {
                long val = 0;
                if (long.TryParse(m.Value, out val)) return val;
            }
            return 0;
        }

        private static string ResolveCompanyDir(string dataDir, string code, string companyId, string body)
        {
            if (string.IsNullOrEmpty(code) && !string.IsNullOrEmpty(companyId))
            {
                code = companyId;
            }
            if (string.IsNullOrEmpty(code) && !string.IsNullOrEmpty(body))
            {
                try
                {
                    JavaScriptSerializer js = new JavaScriptSerializer();
                    object parsed = js.DeserializeObject(body);
                    Dictionary<string, object> d = parsed as Dictionary<string, object>;
                    if (d != null)
                    {
                        if (d.ContainsKey("companyCode") && d["companyCode"] != null)
                        {
                            code = d["companyCode"].ToString();
                        }
                        else if (d.ContainsKey("companyId") && d["companyId"] != null)
                        {
                            code = d["companyId"].ToString();
                        }
                    }
                }
                catch { }
            }

            if (!string.IsNullOrEmpty(code))
            {
                string trimmed = code.Trim().ToUpper();
                string direct = Path.Combine(dataDir, trimmed);
                if (Directory.Exists(direct)) return direct;

                if (Directory.Exists(dataDir))
                {
                    foreach (string dir in Directory.GetDirectories(dataDir))
                    {
                        string cFile = Path.Combine(dir, "company.json");
                        if (File.Exists(cFile))
                        {
                            try
                            {
                                string txt = File.ReadAllText(cFile, Encoding.UTF8);
                                JavaScriptSerializer js = new JavaScriptSerializer();
                                Dictionary<string, object> co = js.DeserializeObject(txt) as Dictionary<string, object>;
                                if (co != null)
                                {
                                    if (co.ContainsKey("id") && co["id"] != null && co["id"].ToString() == trimmed)
                                    {
                                        return dir;
                                    }
                                    if (co.ContainsKey("companyCode") && co["companyCode"] != null && co["companyCode"].ToString().ToUpper() == trimmed)
                                    {
                                        return dir;
                                    }
                                }
                            }
                            catch { }
                        }
                    }
                }

                if (trimmed.Length >= 4 && char.IsDigit(trimmed[0]))
                {
                    try { Directory.CreateDirectory(direct); return direct; } catch { }
                }
            }

            string defDir = Path.Combine(dataDir, "10000");
            if (!Directory.Exists(defDir))
            {
                try { Directory.CreateDirectory(defDir); } catch { }
            }
            return defDir;
        }

        private static void HandleArrayMasterRequest(HttpListenerRequest req, HttpListenerResponse res, string dataDir, string fileName, string itemKey)
        {
            string code = req.QueryString["code"];
            if (string.IsNullOrEmpty(code)) code = req.QueryString["companyCode"];
            string companyId = req.QueryString["companyId"];
            string body = null;
            if (req.HttpMethod == "POST" || req.HttpMethod == "PUT" || req.HttpMethod == "DELETE")
            {
                Encoding reqEnc = (req.ContentEncoding != null && req.ContentEncoding.CodePage != Encoding.Default.CodePage) ? req.ContentEncoding : Encoding.UTF8;
                using (StreamReader reader = new StreamReader(req.InputStream, reqEnc))
                {
                    body = reader.ReadToEnd();
                }
            }

            string cDir = ResolveCompanyDir(dataDir, code, companyId, body);
            if (!Directory.Exists(cDir))
            {
                try { Directory.CreateDirectory(cDir); } catch { }
            }
            string filePath = Path.Combine(cDir, fileName);

            JavaScriptSerializer js = new JavaScriptSerializer();
            js.MaxJsonLength = 50 * 1024 * 1024;

            lock (_fileLock)
            {
                List<object> list = new List<object>();
                if (File.Exists(filePath))
                {
                    try
                    {
                        string existing = File.ReadAllText(filePath);
                        if (!string.IsNullOrEmpty(existing.Trim()))
                        {
                            object parsed = js.DeserializeObject(existing);
                            if (parsed is object[])
                            {
                                list = new List<object>((object[])parsed);
                            }
                            else if (parsed is ArrayList)
                            {
                                list = new List<object>(((ArrayList)parsed).ToArray());
                            }
                        }
                    }
                    catch { }
                }

                if (req.HttpMethod == "GET")
                {
                    Dictionary<string, object> ret = new Dictionary<string, object>();
                    ret["success"] = true;
                    ret[itemKey] = list;
                    ret["companyCode"] = Path.GetFileName(cDir);
                    WriteJsonResponse(res, js.Serialize(ret));
                    return;
                }

                if (req.HttpMethod == "POST")
                {
                    object rawItem = js.DeserializeObject(body);
                    Dictionary<string, object> itemDict = rawItem as Dictionary<string, object>;
                    if (itemDict == null && rawItem is object[])
                    {
                        list = new List<object>((object[])rawItem);
                        string tmp = filePath + ".tmp." + Guid.NewGuid().ToString("N");
                        File.WriteAllText(tmp, js.Serialize(list));
                        if (File.Exists(filePath)) File.Delete(filePath);
                        File.Move(tmp, filePath);

                        Dictionary<string, object> bRet = new Dictionary<string, object>();
                        bRet["success"] = true;
                        bRet["count"] = list.Count;
                        bRet[itemKey] = list;
                        WriteJsonResponse(res, js.Serialize(bRet));
                        return;
                    }

                    if (itemDict != null)
                    {
                        string singleKey = itemKey.EndsWith("s") ? itemKey.Substring(0, itemKey.Length - 1) : itemKey;
                        if (itemKey == "stockItems") singleKey = "item";
                        if (itemKey == "stockGroups") singleKey = "group";

                        if (itemDict.ContainsKey(singleKey) && itemDict[singleKey] is Dictionary<string, object>)
                        {
                            itemDict = (Dictionary<string, object>)itemDict[singleKey];
                        }

                        if (!itemDict.ContainsKey("id") || itemDict["id"] == null || Convert.ToInt64(itemDict["id"]) <= 0)
                        {
                            itemDict["id"] = DateTime.UtcNow.Ticks;
                        }
                        long newId = Convert.ToInt64(itemDict["id"]);

                        int existingIdx = -1;
                        for (int i = 0; i < list.Count; i++)
                        {
                            Dictionary<string, object> d = list[i] as Dictionary<string, object>;
                            if (d != null && d.ContainsKey("id") && Convert.ToInt64(d["id"]) == newId)
                            {
                                existingIdx = i;
                                break;
                            }
                        }

                        if (existingIdx >= 0)
                        {
                            list[existingIdx] = itemDict;
                        }
                        else
                        {
                            list.Add(itemDict);
                        }

                        string tmp = filePath + ".tmp." + Guid.NewGuid().ToString("N");
                        File.WriteAllText(tmp, js.Serialize(list));
                        if (File.Exists(filePath)) File.Delete(filePath);
                        File.Move(tmp, filePath);

                        Dictionary<string, object> ret = new Dictionary<string, object>();
                        ret["success"] = true;
                        ret[singleKey] = itemDict;
                        ret[itemKey] = itemDict;
                        ret["voucher"] = itemDict;
                        ret["item"] = itemDict;
                        ret["ledger"] = itemDict;
                        WriteJsonResponse(res, js.Serialize(ret));
                        return;
                    }
                }

                if (req.HttpMethod == "PUT")
                {
                    object rawItem = js.DeserializeObject(body);
                    Dictionary<string, object> itemDict = rawItem as Dictionary<string, object>;
                    if (itemDict != null)
                    {
                        string singleKey = itemKey.EndsWith("s") ? itemKey.Substring(0, itemKey.Length - 1) : itemKey;
                        if (itemKey == "stockItems") singleKey = "item";
                        if (itemKey == "stockGroups") singleKey = "group";

                        if (itemDict.ContainsKey(singleKey) && itemDict[singleKey] is Dictionary<string, object>)
                        {
                            itemDict = (Dictionary<string, object>)itemDict[singleKey];
                        }

                        if (itemDict.ContainsKey("id") && itemDict["id"] != null)
                        {
                            long targetId = Convert.ToInt64(itemDict["id"]);
                            int foundIdx = -1;
                            for (int i = 0; i < list.Count; i++)
                            {
                                Dictionary<string, object> d = list[i] as Dictionary<string, object>;
                                if (d != null && d.ContainsKey("id") && Convert.ToInt64(d["id"]) == targetId)
                                {
                                    foundIdx = i;
                                    break;
                                }
                            }

                            if (foundIdx >= 0)
                            {
                                Dictionary<string, object> existingDict = list[foundIdx] as Dictionary<string, object>;
                                foreach (var kvp in itemDict)
                                {
                                    existingDict[kvp.Key] = kvp.Value;
                                }
                                list[foundIdx] = existingDict;
                            }
                            else
                            {
                                list.Add(itemDict);
                            }

                            string tmp = filePath + ".tmp." + Guid.NewGuid().ToString("N");
                            File.WriteAllText(tmp, js.Serialize(list));
                            if (File.Exists(filePath)) File.Delete(filePath);
                            File.Move(tmp, filePath);

                            Dictionary<string, object> ret = new Dictionary<string, object>();
                            ret["success"] = true;
                            object finalObj = (foundIdx >= 0 ? list[foundIdx] : itemDict);
                            ret[singleKey] = finalObj;
                            ret[itemKey] = finalObj;
                            ret["voucher"] = finalObj;
                            ret["item"] = finalObj;
                            ret["ledger"] = finalObj;
                            WriteJsonResponse(res, js.Serialize(ret));
                            return;
                        }
                    }
                }

                if (req.HttpMethod == "DELETE")
                {
                    long delId = 0;
                    if (!string.IsNullOrEmpty(req.QueryString["id"]))
                    {
                        long.TryParse(req.QueryString["id"], out delId);
                    }
                    if (delId == 0 && !string.IsNullOrEmpty(body))
                    {
                        try
                        {
                            object parsed = js.DeserializeObject(body);
                            Dictionary<string, object> d = parsed as Dictionary<string, object>;
                            if (d != null && d.ContainsKey("id") && d["id"] != null)
                            {
                                long.TryParse(d["id"].ToString(), out delId);
                            }
                        }
                        catch { }
                    }

                    if (delId > 0)
                    {
                        list.RemoveAll(x => {
                            Dictionary<string, object> d = x as Dictionary<string, object>;
                            return d != null && d.ContainsKey("id") && Convert.ToInt64(d["id"]) == delId;
                        });

                        string tmp = filePath + ".tmp." + Guid.NewGuid().ToString("N");
                        File.WriteAllText(tmp, js.Serialize(list));
                        if (File.Exists(filePath)) File.Delete(filePath);
                        File.Move(tmp, filePath);

                        WriteJsonResponse(res, "{\"success\":true,\"deleted\":" + delId + "}");
                        return;
                    }
                }
            }

            WriteJsonResponse(res, "{\"success\":true}");
        }

        private static void ExtractAndWrite(string json, string key, string targetFile, string defVal)
        {
            try
            {
                string pattern = "\"" + key + "\":";
                int idx = json.IndexOf(pattern);
                if (idx >= 0)
                {
                    int start = idx + pattern.Length;
                    while (start < json.Length && char.IsWhiteSpace(json[start])) start++;
                    if (start < json.Length)
                    {
                        char open = json[start];
                        char close = open == '{' ? '}' : (open == '[' ? ']' : '\0');
                        if (close != '\0')
                        {
                            int depth = 0;
                            bool inStr = false;
                            bool esc = false;
                            for (int i = start; i < json.Length; i++)
                            {
                                char c = json[i];
                                if (esc) { esc = false; continue; }
                                if (c == '\\') { esc = true; continue; }
                                if (c == '"') { inStr = !inStr; continue; }
                                if (!inStr)
                                {
                                    if (c == open) depth++;
                                    else if (c == close)
                                    {
                                        depth--;
                                        if (depth == 0)
                                        {
                                            string extracted = json.Substring(start, (i - start) + 1);
                                            // Safety: never overwrite existing files with empty array []
                                            string extTrim = extracted != null ? extracted.Trim() : "";
                                            if ((extTrim == "[]" || extTrim.Length <= 4) && File.Exists(targetFile))
                                            {
                                                FileInfo fi = new FileInfo(targetFile);
                                                if (fi.Length > 4)
                                                {
                                                    return;
                                                }
                                            }
                                            File.WriteAllText(targetFile, extracted, Encoding.UTF8);
                                            return;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if (!File.Exists(targetFile)) File.WriteAllText(targetFile, defVal, Encoding.UTF8);
            }
            catch { }
        }

        private static string FindBrowserExecutable()
        {
            string[] possiblePaths = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"BraveSoftware\Brave-Browser\Application\brave.exe"),
            };

            foreach (string p in possiblePaths)
            {
                if (File.Exists(p)) return p;
            }

            return null;
        }
    }

    public class HostServiceContext : ApplicationContext
    {
        private NotifyIcon _tray;
        public HostServiceContext(NotifyIcon tray)
        {
            _tray = tray;
            try
            {
                this.MainForm = new BackgroundHostForm();
            }
            catch { }
        }

        public void Terminate()
        {
            try
            {
                if (_tray != null)
                {
                    _tray.Visible = false;
                    _tray.Dispose();
                }
            }
            catch { }
            try
            {
                if (this.MainForm != null)
                {
                    this.MainForm.Close();
                }
            }
            catch { }
            ExitThread();
            try
            {
                Environment.Exit(0);
            }
            catch { }
        }
    }

    public class BackgroundHostForm : Form
    {
        public BackgroundHostForm()
        {
            this.ShowInTaskbar = false;
            this.WindowState = FormWindowState.Minimized;
            this.FormBorderStyle = FormBorderStyle.None;
            this.Size = new Size(0, 0);
            this.Opacity = 0;
        }

        protected override void SetVisibleCore(bool value)
        {
            base.SetVisibleCore(false);
        }
    }

    public class DirectThermalPrinter
    {
        public static bool PrintReceipt(string jsonBody, out string error)
        {
            error = null;
            try
            {
                JavaScriptSerializer js = new JavaScriptSerializer();
                Dictionary<string, object> data = js.Deserialize<Dictionary<string, object>>(jsonBody);
                if (data == null)
                {
                    error = "Invalid JSON data received";
                    return false;
                }

                PrintDocument pd = new PrintDocument();
                // StandardPrintController suppresses all Windows UI progress dialogs & animations!
                pd.PrintController = new StandardPrintController();
                pd.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);
                if (data.ContainsKey("printerName") && !string.IsNullOrEmpty(Convert.ToString(data["printerName"])))
                {
                    pd.PrinterSettings.PrinterName = Convert.ToString(data["printerName"]);
                }
                pd.PrintPage += (sender, e) =>
                {
                    Graphics g = e.Graphics;
                    g.SmoothingMode = SmoothingMode.HighQuality;
                    g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

                    float y = 15;
                    float slipWidth = 280; // Standard 78mm printable width in 100ths of inch
                    float pageWidth = e.PageBounds.Width > 0 ? e.PageBounds.Width : 280;
                    if (pageWidth < slipWidth && pageWidth > 50)
                    {
                        slipWidth = pageWidth - 10;
                    }
                    // Centered on any paper size (A4, Letter, 80mm roll, 58mm roll)
                    float left = (pageWidth > slipWidth) ? (pageWidth - slipWidth) / 2 : 10;
                    float width = slipWidth;

                    using (Font titleFont = new Font("Arial", 11, FontStyle.Bold))
                    using (Font boldFont = new Font("Courier New", 8, FontStyle.Bold))
                    using (Font regularFont = new Font("Courier New", 7.5f, FontStyle.Regular))
                    using (Font smallFont = new Font("Courier New", 6.5f, FontStyle.Regular))
                    using (Brush brush = new SolidBrush(Color.Black))
                    using (Pen pen = new Pen(Color.Black, 1))
                    {
                        StringFormat centerFmt = new StringFormat { Alignment = StringAlignment.Center };
                        StringFormat rightFmt = new StringFormat { Alignment = StringAlignment.Far };
                        StringFormat leftFmt = new StringFormat { Alignment = StringAlignment.Near };

                        // 1. Circle L Logo
                        RectangleF logoRect = new RectangleF(left + (width - 34) / 2, y, 34, 34);
                        using (Pen logoPen = new Pen(Color.Black, 2))
                        {
                            g.DrawEllipse(logoPen, logoRect);
                        }
                        using (Font logoFont = new Font("Arial", 18, FontStyle.Bold))
                        {
                            g.DrawString("L", logoFont, brush, new RectangleF(logoRect.X, logoRect.Y + 3, logoRect.Width, logoRect.Height), centerFmt);
                        }
                        y += 40;

                        // 2. Store Name
                        string storeName = data.ContainsKey("storeName") ? Convert.ToString(data["storeName"]) : "LedgerX Retail";
                        g.DrawString(storeName.ToUpper(), titleFont, brush, new RectangleF(left, y, width, 20), centerFmt);
                        y += 18;

                        // Tagline
                        if (data.ContainsKey("tagline") && !string.IsNullOrEmpty(Convert.ToString(data["tagline"])))
                        {
                            using (Font tagFont = new Font("Arial", 9, FontStyle.Bold))
                            {
                                g.DrawString(Convert.ToString(data["tagline"]), tagFont, brush, new RectangleF(left, y, width, 16), centerFmt);
                            }
                            y += 16;
                        }

                        // Address
                        if (data.ContainsKey("address"))
                        {
                            string addr = Convert.ToString(data["address"]);
                            RectangleF addrRect = new RectangleF(left, y, width, 30);
                            g.DrawString(addr, regularFont, brush, addrRect, centerFmt);
                            SizeF sz = g.MeasureString(addr, regularFont, (int)width);
                            y += sz.Height + 2;
                        }

                        // Meta IDs (Customer Care, CIN, GSTIN, FSSAI)
                        string[] metaKeys = new string[] { "carePhone", "businessId", "taxId", "foodLicense" };
                        foreach (string mk in metaKeys)
                        {
                            if (data.ContainsKey(mk) && !string.IsNullOrEmpty(Convert.ToString(data[mk])))
                            {
                                g.DrawString(Convert.ToString(data[mk]), regularFont, brush, new RectangleF(left, y, width, 14), centerFmt);
                                y += 13;
                            }
                        }

                        // Custom Fields
                        if (data.ContainsKey("customFields") && data["customFields"] is ArrayList)
                        {
                            ArrayList cfs = (ArrayList)data["customFields"];
                            foreach (object cf in cfs)
                            {
                                if (cf != null && !string.IsNullOrEmpty(cf.ToString()))
                                {
                                    g.DrawString(cf.ToString(), regularFont, brush, new RectangleF(left, y, width, 14), centerFmt);
                                    y += 13;
                                }
                            }
                        }

                        // Dashed line helper
                        Action drawDashedLine = () =>
                        {
                            y += 4;
                            using (Pen dashPen = new Pen(Color.Black, 1) { DashStyle = DashStyle.Dash })
                            {
                                g.DrawLine(dashPen, left, y, left + width, y);
                            }
                            y += 6;
                        };

                        drawDashedLine();

                        // Savings banner
                        if (data.ContainsKey("savingsText") && !string.IsNullOrEmpty(Convert.ToString(data["savingsText"])))
                        {
                            using (Font saveFont = new Font("Arial", 9.5f, FontStyle.Bold))
                            {
                                g.DrawString(Convert.ToString(data["savingsText"]), saveFont, brush, new RectangleF(left, y, width, 16), centerFmt);
                            }
                            y += 16;
                            drawDashedLine();
                        }

                        // Tax Invoice Meta
                        string invTitle = data.ContainsKey("taxInvoiceTitle") ? Convert.ToString(data["taxInvoiceTitle"]) : "TAX INVOICE";
                        using (Font invFont = new Font("Arial", 9.5f, FontStyle.Bold))
                        {
                            g.DrawString(invTitle.ToUpper(), invFont, brush, new RectangleF(left, y, width, 15), centerFmt);
                        }
                        y += 15;
                        g.DrawString("xxxxxxxxxxxxx Original for Recipient xxxxxxxxxxxxx", smallFont, brush, new RectangleF(left, y, width, 12), centerFmt);
                        y += 13;

                        if (data.ContainsKey("placeOfSupply"))
                        {
                            g.DrawString(Convert.ToString(data["placeOfSupply"]), smallFont, brush, left, y);
                            y += 11;
                        }
                        if (data.ContainsKey("customerType"))
                        {
                            g.DrawString(Convert.ToString(data["customerType"]), smallFont, brush, left, y);
                            y += 11;
                        }
                        if (data.ContainsKey("customerInfo") && !string.IsNullOrEmpty(Convert.ToString(data["customerInfo"])))
                        {
                            g.DrawString(Convert.ToString(data["customerInfo"]), smallFont, brush, left, y);
                            y += 11;
                        }

                        // Date & Bill No line
                        string dateStr = data.ContainsKey("dateStr") ? Convert.ToString(data["dateStr"]) : "";
                        string billNo = data.ContainsKey("billNo") ? Convert.ToString(data["billNo"]) : "";
                        g.DrawString("Date: " + dateStr, smallFont, brush, left, y);
                        g.DrawString("Bill No: " + billNo, smallFont, brush, new RectangleF(left, y, width, 12), rightFmt);
                        y += 11;

                        // Cashier & Pos line
                        string cashier = data.ContainsKey("cashier") ? Convert.ToString(data["cashier"]) : "";
                        string posNo = data.ContainsKey("posNo") ? Convert.ToString(data["posNo"]) : "";
                        g.DrawString("Cashier: " + cashier, smallFont, brush, left, y);
                        g.DrawString("Pos: " + posNo, smallFont, brush, new RectangleF(left, y, width, 12), rightFmt);
                        y += 12;

                        drawDashedLine();

                        // Items Table Header
                        string currSym = data.ContainsKey("currencySymbol") ? Convert.ToString(data["currencySymbol"]) : "₹";
                        float colDescW = 125;
                        float colPriceW = 55;
                        float colQtyW = 35;
                        float colValW = 65;
                        float colPriceX = left + colDescW;
                        float colQtyX = colPriceX + colPriceW;
                        float colValX = colQtyX + colQtyW;

                        g.DrawString("HSN Code & Item", boldFont, brush, new RectangleF(left, y, colDescW, 12), leftFmt);
                        g.DrawString("Price(" + currSym + ")", boldFont, brush, new RectangleF(colPriceX, y, colPriceW, 12), rightFmt);
                        g.DrawString("Qty", boldFont, brush, new RectangleF(colQtyX, y, colQtyW, 12), centerFmt);
                        g.DrawString("Value(" + currSym + ")", boldFont, brush, new RectangleF(colValX, y, colValW, 12), rightFmt);
                        y += 13;
                        drawDashedLine();

                        // Item rows
                        if (data.ContainsKey("items") && data["items"] is ArrayList)
                        {
                            ArrayList items = (ArrayList)data["items"];
                            foreach (object itObj in items)
                            {
                                if (itObj is Dictionary<string, object>)
                                {
                                    Dictionary<string, object> it = (Dictionary<string, object>)itObj;
                                    if (it.ContainsKey("rateLine"))
                                    {
                                        g.DrawString(Convert.ToString(it["rateLine"]), smallFont, brush, left, y);
                                        y += 10;
                                    }
                                    string iName = it.ContainsKey("name") ? Convert.ToString(it["name"]) : "";
                                    string price = it.ContainsKey("netPrice") ? Convert.ToString(it["netPrice"]) : "";
                                    string qty = it.ContainsKey("qty") ? Convert.ToString(it["qty"]) : "";
                                    string val = it.ContainsKey("value") ? Convert.ToString(it["value"]) : "";

                                    g.DrawString(iName, boldFont, brush, new RectangleF(left, y, colDescW, 14), leftFmt);
                                    g.DrawString(price, regularFont, brush, new RectangleF(colPriceX, y, colPriceW, 14), rightFmt);
                                    g.DrawString(qty, regularFont, brush, new RectangleF(colQtyX, y, colQtyW, 14), centerFmt);
                                    g.DrawString(val, boldFont, brush, new RectangleF(colValX, y, colValW, 14), rightFmt);
                                    y += 14;

                                    if (it.ContainsKey("mrpText") && !string.IsNullOrEmpty(Convert.ToString(it["mrpText"])))
                                    {
                                        g.DrawString(Convert.ToString(it["mrpText"]), smallFont, brush, left, y);
                                        y += 10;
                                    }
                                }
                            }
                        }

                        drawDashedLine();

                        // Totals Breakdown
                        if (data.ContainsKey("totals") && data["totals"] is Dictionary<string, object>)
                        {
                            Dictionary<string, object> tots = (Dictionary<string, object>)data["totals"];
                            Action<string, string, bool> drawTotRow = (lbl, v, isBold) =>
                            {
                                Font f = isBold ? boldFont : regularFont;
                                g.DrawString(lbl, f, brush, left, y);
                                g.DrawString(v, f, brush, new RectangleF(left, y, width, 14), rightFmt);
                                y += 14;
                            };

                            string itemsCount = tots.ContainsKey("itemsCount") ? Convert.ToString(tots["itemsCount"]) : "";
                            string totalQty = tots.ContainsKey("totalQty") ? Convert.ToString(tots["totalQty"]) : "";
                            string subtotal = tots.ContainsKey("subtotal") ? Convert.ToString(tots["subtotal"]) : "";
                            g.DrawString("Items: " + itemsCount + "   Qty: " + totalQty, regularFont, brush, left, y);
                            g.DrawString(subtotal, boldFont, brush, new RectangleF(left, y, width, 14), rightFmt);
                            y += 14;

                            if (tots.ContainsKey("grossSalesValue")) drawTotRow("Gross sales Value", Convert.ToString(tots["grossSalesValue"]), false);
                            if (tots.ContainsKey("totalDiscount")) drawTotRow("Total Discount", Convert.ToString(tots["totalDiscount"]), false);
                            if (tots.ContainsKey("netSalesValue")) drawTotRow("Net Sales Value", Convert.ToString(tots["netSalesValue"]), false);
                            if (tots.ContainsKey("grandTotal"))
                            {
                                using (Font gFont = new Font("Arial", 9.5f, FontStyle.Bold))
                                {
                                    g.DrawString("Total Amount Paid", gFont, brush, left, y);
                                    g.DrawString(Convert.ToString(tots["grandTotal"]), gFont, brush, new RectangleF(left, y, width, 16), rightFmt);
                                }
                                y += 17;
                            }
                        }

                        // Payment tender rows
                        if (data.ContainsKey("payments") && data["payments"] is ArrayList)
                        {
                            ArrayList pms = (ArrayList)data["payments"];
                            foreach (object pObj in pms)
                            {
                                if (pObj is Dictionary<string, object>)
                                {
                                    Dictionary<string, object> p = (Dictionary<string, object>)pObj;
                                    string pLbl = p.ContainsKey("label") ? Convert.ToString(p["label"]) : "TENDER";
                                    string pAmt = p.ContainsKey("amount") ? Convert.ToString(p["amount"]) : "";
                                    g.DrawString(pLbl, regularFont, brush, left, y);
                                    g.DrawString(pAmt, regularFont, brush, new RectangleF(left, y, width, 13), rightFmt);
                                    y += 13;
                                }
                            }
                        }

                        g.DrawString("(AMOUNT INCLUSIVE OF APPLICABLE TAXES)", smallFont, brush, new RectangleF(left, y, width, 11), centerFmt);
                        y += 12;

                        drawDashedLine();

                        // Tax Breakup Table
                        if (data.ContainsKey("taxBreakup") && data["taxBreakup"] is Dictionary<string, object>)
                        {
                            Dictionary<string, object> tb = (Dictionary<string, object>)data["taxBreakup"];
                            string tbTitle = tb.ContainsKey("title") ? Convert.ToString(tb["title"]) : "Tax Breakup Details";
                            g.DrawString(tbTitle, smallFont, brush, new RectangleF(left, y, width, 11), centerFmt);
                            y += 12;

                            bool isDual = tb.ContainsKey("isDual") ? Convert.ToBoolean(tb["isDual"]) : true;

                            if (isDual)
                            {
                                // 5 columns: Rate/Tax (40), Taxable (55), CGST (45), SGST (45), Total (95)
                                g.DrawString("Rate/Tax", smallFont, brush, new RectangleF(left, y, 40, 11), leftFmt);
                                g.DrawString("Taxable", smallFont, brush, new RectangleF(left + 40, y, 55, 11), rightFmt);
                                g.DrawString("CGST", smallFont, brush, new RectangleF(left + 95, y, 45, 11), rightFmt);
                                g.DrawString("SGST", smallFont, brush, new RectangleF(left + 140, y, 45, 11), rightFmt);
                                g.DrawString("Total", smallFont, brush, new RectangleF(left + 185, y, 95, 11), rightFmt);
                                y += 12;

                                if (tb.ContainsKey("rows") && tb["rows"] is ArrayList)
                                {
                                    ArrayList rws = (ArrayList)tb["rows"];
                                    foreach (object rObj in rws)
                                    {
                                        if (rObj is ArrayList)
                                        {
                                            ArrayList r = (ArrayList)rObj;
                                            if (r.Count >= 5)
                                            {
                                                g.DrawString(Convert.ToString(r[0]), smallFont, brush, new RectangleF(left, y, 40, 11), leftFmt);
                                                g.DrawString(Convert.ToString(r[1]), smallFont, brush, new RectangleF(left + 40, y, 55, 11), rightFmt);
                                                g.DrawString(Convert.ToString(r[2]), smallFont, brush, new RectangleF(left + 95, y, 45, 11), rightFmt);
                                                g.DrawString(Convert.ToString(r[3]), smallFont, brush, new RectangleF(left + 140, y, 45, 11), rightFmt);
                                                g.DrawString(Convert.ToString(r[4]), smallFont, brush, new RectangleF(left + 185, y, 95, 11), rightFmt);
                                                y += 11;
                                            }
                                        }
                                    }
                                }

                                if (tb.ContainsKey("totalRow") && tb["totalRow"] is ArrayList)
                                {
                                    ArrayList tr = (ArrayList)tb["totalRow"];
                                    if (tr.Count >= 5)
                                    {
                                        drawDashedLine();
                                        g.DrawString("Total", boldFont, brush, new RectangleF(left, y, 40, 11), leftFmt);
                                        g.DrawString(Convert.ToString(tr[1]), boldFont, brush, new RectangleF(left + 40, y, 55, 11), rightFmt);
                                        g.DrawString(Convert.ToString(tr[2]), boldFont, brush, new RectangleF(left + 95, y, 45, 11), rightFmt);
                                        g.DrawString(Convert.ToString(tr[3]), boldFont, brush, new RectangleF(left + 140, y, 45, 11), rightFmt);
                                        g.DrawString(Convert.ToString(tr[4]), boldFont, brush, new RectangleF(left + 185, y, 95, 11), rightFmt);
                                        y += 12;
                                    }
                                }
                            }
                            else
                            {
                                // 4 columns for single tax countries (Canada, UAE, UK, USA, etc.): Rate (45), Taxable (70), Tax (75), Total (90)
                                ArrayList hdrs = tb.ContainsKey("headers") && tb["headers"] is ArrayList ? (ArrayList)tb["headers"] : null;
                                string col3Title = (hdrs != null && hdrs.Count >= 3) ? Convert.ToString(hdrs[2]) : "Tax Amount";

                                g.DrawString("Rate", smallFont, brush, new RectangleF(left, y, 45, 11), leftFmt);
                                g.DrawString("Taxable", smallFont, brush, new RectangleF(left + 45, y, 70, 11), rightFmt);
                                g.DrawString(col3Title, smallFont, brush, new RectangleF(left + 115, y, 75, 11), rightFmt);
                                g.DrawString("Total", smallFont, brush, new RectangleF(left + 190, y, 90, 11), rightFmt);
                                y += 12;

                                if (tb.ContainsKey("rows") && tb["rows"] is ArrayList)
                                {
                                    ArrayList rws = (ArrayList)tb["rows"];
                                    foreach (object rObj in rws)
                                    {
                                        if (rObj is ArrayList)
                                        {
                                            ArrayList r = (ArrayList)rObj;
                                            if (r.Count >= 4)
                                            {
                                                g.DrawString(Convert.ToString(r[0]), smallFont, brush, new RectangleF(left, y, 45, 11), leftFmt);
                                                g.DrawString(Convert.ToString(r[1]), smallFont, brush, new RectangleF(left + 45, y, 70, 11), rightFmt);
                                                g.DrawString(Convert.ToString(r[2]), smallFont, brush, new RectangleF(left + 115, y, 75, 11), rightFmt);
                                                g.DrawString(Convert.ToString(r[3]), smallFont, brush, new RectangleF(left + 190, y, 90, 11), rightFmt);
                                                y += 11;
                                            }
                                        }
                                    }
                                }

                                if (tb.ContainsKey("totalRow") && tb["totalRow"] is ArrayList)
                                {
                                    ArrayList tr = (ArrayList)tb["totalRow"];
                                    if (tr.Count >= 4)
                                    {
                                        drawDashedLine();
                                        g.DrawString("Total", boldFont, brush, new RectangleF(left, y, 45, 11), leftFmt);
                                        g.DrawString(Convert.ToString(tr[1]), boldFont, brush, new RectangleF(left + 45, y, 70, 11), rightFmt);
                                        g.DrawString(Convert.ToString(tr[2]), boldFont, brush, new RectangleF(left + 115, y, 75, 11), rightFmt);
                                        g.DrawString(Convert.ToString(tr[3]), boldFont, brush, new RectangleF(left + 190, y, 90, 11), rightFmt);
                                        y += 12;
                                    }
                                }
                            }
                        }

                        drawDashedLine();

                        // Reference & loyalty numbers
                        if (data.ContainsKey("referenceLines") && data["referenceLines"] is ArrayList)
                        {
                            ArrayList rls = (ArrayList)data["referenceLines"];
                            foreach (object rl in rls)
                            {
                                if (rl != null && !string.IsNullOrEmpty(rl.ToString()))
                                {
                                    g.DrawString(rl.ToString(), smallFont, brush, left, y);
                                    y += 11;
                                }
                            }
                        }

                        // Centered UPI QR Box (Dynamic height so footer text never collides with box border)
                        if (data.ContainsKey("qrCodeBase64") && !string.IsNullOrEmpty(Convert.ToString(data["qrCodeBase64"])))
                        {
                            y += 8;
                            float boxY = y;
                            float qrBoxW = width - 10;
                            float qrBoxLeft = left + 5;

                            ArrayList qfls = (data.ContainsKey("qrFooterLines") && data["qrFooterLines"] is ArrayList)
                                ? (ArrayList)data["qrFooterLines"]
                                : new ArrayList();

                            float qrImgH = 95;
                            float qfY = boxY + 20 + qrImgH + 6;
                            float totalBoxH = (qfY - boxY) + (qfls.Count * 13) + 8; // Dynamic height guarantees generous border padding

                            // 1. Draw box border with dynamic height
                            g.DrawRectangle(pen, qrBoxLeft, boxY, qrBoxW, totalBoxH);

                            // 2. Draw Header
                            using (Font qrHeaderFont = new Font("Arial", 8, FontStyle.Bold))
                            {
                                g.DrawString("[ 📲 SCAN & PAY WITH ANY UPI APP ]", qrHeaderFont, brush, new RectangleF(left, boxY + 5, width, 12), centerFmt);
                            }

                            // 3. Draw QR Image
                            try
                            {
                                string b64 = Convert.ToString(data["qrCodeBase64"]);
                                if (b64.Contains(",")) b64 = b64.Substring(b64.IndexOf(",") + 1);
                                byte[] imgBytes = Convert.FromBase64String(b64);
                                using (MemoryStream ms = new MemoryStream(imgBytes))
                                using (Image qrImg = Image.FromStream(ms))
                                {
                                    g.DrawImage(qrImg, left + (width - qrImgH) / 2, boxY + 20, qrImgH, qrImgH);
                                }
                            }
                            catch { }

                            // 4. Draw Footer Lines safely inside box
                            float curLineY = qfY;
                            foreach (object qfl in qfls)
                            {
                                if (qfl != null && !string.IsNullOrEmpty(qfl.ToString()))
                                {
                                    g.DrawString(qfl.ToString(), smallFont, brush, new RectangleF(left, curLineY, width, 12), centerFmt);
                                    curLineY += 13;
                                }
                            }

                            y = boxY + totalBoxH + 10;
                        }

                        // Footer compliance lines
                        if (data.ContainsKey("footerLines") && data["footerLines"] is ArrayList)
                        {
                            ArrayList fls = (ArrayList)data["footerLines"];
                            foreach (object fl in fls)
                            {
                                if (fl != null && !string.IsNullOrEmpty(fl.ToString()))
                                {
                                    string fstr = fl.ToString();
                                    SizeF sz = g.MeasureString(fstr, smallFont, (int)width);
                                    RectangleF fRect = new RectangleF(left, y, width, sz.Height + 2);
                                    g.DrawString(fstr, smallFont, brush, fRect, centerFmt);
                                    y += sz.Height + 2;
                                }
                            }
                        }
                    }
                };

                pd.Print();
                return true;
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }
        }
    }
}
