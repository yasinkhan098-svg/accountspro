using System;
using System.IO;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Windows.Forms;
using System.Drawing;
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

                // Default target URL
                string targetUrl = "https://www.ledgerxerp.com";

                if (File.Exists(configFile))
                {
                    try
                    {
                        string[] lines = File.ReadAllLines(configFile);
                        if (lines.Length > 0 && lines[0].Trim().StartsWith("http"))
                        {
                            targetUrl = lines[0].Trim();
                        }
                    }
                    catch { }
                }

                if (targetUrl.Contains("localhost") && !IsServerAlive("localhost", 3000))
                {
                    targetUrl = "https://www.ledgerxerp.com";
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
                string exeDir = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);
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
                Log("Application.Run exited!");
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
                    psi.Arguments = string.Format("--app=\"{0}\" --user-data-dir=\"{1}\" --start-maximized --no-default-browser-check --no-first-run", launchUrl, profileDir);
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
            catch { }
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
                                    string txt = File.ReadAllText(cJsonFile);
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

                    string cJson = File.Exists(Path.Combine(cDir, "company.json")) ? File.ReadAllText(Path.Combine(cDir, "company.json")) : "{}";
                    string lJson = File.Exists(Path.Combine(cDir, "ledgers.json")) ? File.ReadAllText(Path.Combine(cDir, "ledgers.json")) : "[]";
                    string vJson = File.Exists(Path.Combine(cDir, "vouchers.json")) ? File.ReadAllText(Path.Combine(cDir, "vouchers.json")) : "[]";
                    string sJson = File.Exists(Path.Combine(cDir, "stock_items.json")) ? File.ReadAllText(Path.Combine(cDir, "stock_items.json")) : "[]";
                    string sgJson = File.Exists(Path.Combine(cDir, "stock_groups.json")) ? File.ReadAllText(Path.Combine(cDir, "stock_groups.json")) : "[]";
                    string uJson = File.Exists(Path.Combine(cDir, "units.json")) ? File.ReadAllText(Path.Combine(cDir, "units.json")) : "[]";
                    string gJson = File.Exists(Path.Combine(cDir, "groups.json")) ? File.ReadAllText(Path.Combine(cDir, "groups.json")) : "[]";
                    string vtJson = File.Exists(Path.Combine(cDir, "voucher_types.json")) ? File.ReadAllText(Path.Combine(cDir, "voucher_types.json")) : "[]";
                    string poJson = File.Exists(Path.Combine(cDir, "purchase_orders.json")) ? File.ReadAllText(Path.Combine(cDir, "purchase_orders.json")) : "[]";
                    string bomJson = File.Exists(Path.Combine(cDir, "boms.json")) ? File.ReadAllText(Path.Combine(cDir, "boms.json")) : "[]";
                    string mjJson = File.Exists(Path.Combine(cDir, "manufacturing_journals.json")) ? File.ReadAllText(Path.Combine(cDir, "manufacturing_journals.json")) : "[]";
                    string usrJson = File.Exists(Path.Combine(cDir, "users.json")) ? File.ReadAllText(Path.Combine(cDir, "users.json")) : "[]";
                    string posListJson = File.Exists(Path.Combine(cDir, "pos_purchase_list.json")) ? File.ReadAllText(Path.Combine(cDir, "pos_purchase_list.json")) : "[]";

                    string jsonOut = string.Format(
                        "{{\"success\":true,\"companyCode\":\"{0}\",\"company\":{1},\"ledgers\":{2},\"vouchers\":{3},\"stockItems\":{4},\"stockGroups\":{5},\"units\":{6},\"groups\":{7},\"voucherTypes\":{8},\"purchaseOrders\":{9},\"boms\":{10},\"manufacturingJournals\":{11},\"users\":{12},\"posPurchaseList\":{13}}}",
                        code, cJson, lJson, vJson, sJson, sgJson, uJson, gJson, vtJson, poJson, bomJson, mjJson, usrJson, posListJson
                    );
                    WriteJsonResponse(res, jsonOut);
                    return;
                }

                if (path == "/api/company" && req.HttpMethod == "POST")
                {
                    using (StreamReader reader = new StreamReader(req.InputStream, req.ContentEncoding))
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
                                    File.WriteAllText(Path.Combine(cDir, "company.json"), jsComp.Serialize(coObj));
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
                    using (StreamReader reader = new StreamReader(req.InputStream, req.ContentEncoding))
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
                res.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate");
                res.Headers.Add("Pragma", "no-cache");
                res.Headers.Add("Expires", "0");
                res.ContentLength64 = buf.Length;
                res.OutputStream.Write(buf, 0, buf.Length);
                res.OutputStream.Close();
            }
            catch { }
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
                                string txt = File.ReadAllText(cFile);
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
                using (StreamReader reader = new StreamReader(req.InputStream, req.ContentEncoding))
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
                                            File.WriteAllText(targetFile, extracted);
                                            return;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if (!File.Exists(targetFile)) File.WriteAllText(targetFile, defVal);
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
            ExitThread();
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
}
