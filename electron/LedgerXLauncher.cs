using System;
using System.IO;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Windows.Forms;
using Microsoft.Win32;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Reflection;
using System.Runtime.InteropServices;

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
        [STAThread]
        public static void Main(string[] args)
        {
            try
            {
                // AppData for config/profile (safe, always writable)
                string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string appDir = Path.Combine(localApp, "LedgerX");
                string configFile = Path.Combine(appDir, "config.json");
                string profileDir = Path.Combine(appDir, "Profile");

                if (!Directory.Exists(appDir)) Directory.CreateDirectory(appDir);
                if (!Directory.Exists(profileDir)) Directory.CreateDirectory(profileDir);

                // Data folder: next to .exe (installation directory) — Tally-style
                string exeDir = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);
                if (string.IsNullOrEmpty(exeDir)) exeDir = AppDomain.CurrentDomain.BaseDirectory;
                string dataDir = Path.Combine(exeDir, "data");
                try
                {
                    if (!Directory.Exists(dataDir)) Directory.CreateDirectory(dataDir);
                }
                catch
                {
                    // Fallback to AppData if exe dir is not writable (e.g. Program Files without admin)
                    dataDir = Path.Combine(appDir, "data");
                    if (!Directory.Exists(dataDir)) Directory.CreateDirectory(dataDir);
                }

                // Start local HTTP Bridge for Tally-style company data folders
                StartHttpBridge(dataDir);

                // Ensure Windows Firewall inbound rule for port 45454
                ThreadPool.QueueUserWorkItem((st) => EnsureFirewallRule());

                // Allow passing server URL via command-line argument e.g. LedgerX.exe https://mysite.vercel.app
                if (args != null && args.Length > 0 && args[0].Trim().StartsWith("http"))
                {
                    try { File.WriteAllText(configFile, args[0].Trim()); } catch { }
                }

                // Default target URL
                string targetUrl = "https://ledgerx-tawny.vercel.app";

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

                // If target URL is localhost but local dev server is not running, fallback to live cloud server
                if (targetUrl.Contains("localhost") && !IsServerAlive("localhost", 3000))
                {
                    targetUrl = "https://ledgerx-tawny.vercel.app";
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

                // Save machine ID to local data folder
                try
                {
                    File.WriteAllText(Path.Combine(dataDir, "machine_id.txt"), hwid);
                }
                catch { }

                // Append desktop flag and hardware fingerprint to launch URL
                string sep = targetUrl.Contains("?") ? "&" : "?";
                string launchUrl = targetUrl + sep + "desktop=1&hwid=" + hwid;

                // Find modern browser executable (Edge or Chrome)
                string browserPath = FindBrowserExecutable();

                if (!string.IsNullOrEmpty(browserPath))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = browserPath;
                    psi.Arguments = string.Format("--app=\"{0}\" --user-data-dir=\"{1}\" --start-maximized --allow-running-insecure-content --unsafely-treat-insecure-origin-as-secure=http://127.0.0.1:45454", launchUrl, profileDir);
                    psi.WindowStyle = ProcessWindowStyle.Maximized;
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                }
                else
                {
                    // Fallback to system default browser
                    ProcessStartInfo psi = new ProcessStartInfo(launchUrl);
                    psi.UseShellExecute = true;
                    psi.WindowStyle = ProcessWindowStyle.Maximized;
                    Process.Start(psi);
                }
            }
            catch (Exception ex)
            {
                try
                {
                    string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                    string logFile = Path.Combine(localApp, "LedgerX", "launcher_error.log");
                    File.AppendAllText(logFile, DateTime.Now.ToString("s") + " - " + ex.ToString() + Environment.NewLine);
                }
                catch { }

                MessageBox.Show("Unable to launch LedgerX Desktop:\n\n" + ex.Message, "LedgerX Desktop Launcher", MessageBoxButtons.OK, MessageBoxIcon.Error);
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

        private static void StartHttpBridge(string dataDir)
        {
            try
            {
                Thread t = new Thread(new ParameterizedThreadStart(RunListener));
                t.IsBackground = true;
                t.Start(dataDir);
            }
            catch { }
        }

        private static readonly object _fileLock = new object();

        private static void RunListener(object objDataDir)
        {
            string dataDir = (string)objDataDir;
            int backendPort = 45453;
            int frontPort = 45454;

            try
            {
                // 1. Start internal HttpListener on 127.0.0.1:45453
                HttpListener listener = new HttpListener();
                listener.Prefixes.Add("http://127.0.0.1:" + backendPort + "/");
                listener.Start();

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

                // 2. Start TCP proxy on 0.0.0.0:45454 (accessible locally & over LAN without admin rights)
                TcpListener proxy = new TcpListener(IPAddress.Any, frontPort);
                proxy.Start();

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
            catch
            {
                // Fallback: If 45453 is already taken, try direct HttpListener on 45454
                try
                {
                    HttpListener fallbackListener = new HttpListener();
                    fallbackListener.Prefixes.Add("http://127.0.0.1:45454/");
                    fallbackListener.Start();
                    while (true)
                    {
                        HttpListenerContext ctx = fallbackListener.GetContext();
                        ThreadPool.QueueUserWorkItem((state) => HandleRequest(ctx, dataDir));
                    }
                }
                catch { }
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

        private static void EnsureFirewallRule()
        {
            try
            {
                Process p = new Process();
                p.StartInfo.FileName = "netsh";
                p.StartInfo.Arguments = "advfirewall firewall show rule name=\"LedgerX LAN MultiUser\"";
                p.StartInfo.CreateNoWindow = true;
                p.StartInfo.UseShellExecute = false;
                p.StartInfo.RedirectStandardOutput = true;
                p.Start();
                string outText = p.StandardOutput.ReadToEnd();
                p.WaitForExit();

                if (string.IsNullOrEmpty(outText) || !outText.Contains("LedgerX LAN MultiUser"))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = "powershell.exe";
                    psi.Arguments = "-NoProfile -WindowStyle Hidden -Command \"Start-Process netsh -ArgumentList 'advfirewall firewall add rule name=\\\"LedgerX LAN MultiUser\\\" dir=in action=allow protocol=TCP localport=45454' -Verb RunAs\"";
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                }
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
                    string usersFile = Path.Combine(dataDir, "users.json");
                    if (File.Exists(usersFile))
                    {
                        string uJson = File.ReadAllText(usersFile);
                        WriteJsonResponse(res, "{\"success\":true,\"users\":" + uJson + "}");
                    }
                    else
                    {
                        WriteJsonResponse(res, "{\"success\":true,\"users\":[]}");
                    }
                    return;
                }

                if (path == "/api/lan/users" && req.HttpMethod == "POST")
                {
                    using (StreamReader reader = new StreamReader(req.InputStream, req.ContentEncoding))
                    {
                        string body = reader.ReadToEnd();
                        string usersFile = Path.Combine(dataDir, "users.json");
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
                        File.WriteAllText(usersFile, toWrite);
                        WriteJsonResponse(res, "{\"success\":true}");
                        return;
                    }
                }

                if (path == "/downloads/ledgerx-client.exe")
                {
                    string exeDir = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);
                    if (string.IsNullOrEmpty(exeDir)) exeDir = AppDomain.CurrentDomain.BaseDirectory;
                    string clientExe = Path.Combine(exeDir, "LedgerX-Client.exe");
                    if (!File.Exists(clientExe))
                    {
                        clientExe = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "public", "downloads", "LedgerX-Client.exe");
                    }
                    if (File.Exists(clientExe))
                    {
                        byte[] bytes = File.ReadAllBytes(clientExe);
                        res.ContentType = "application/octet-stream";
                        res.Headers.Add("Content-Disposition", "attachment; filename=\"LedgerX-Client.exe\"");
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
                        if (File.Exists(targetFile)) File.Delete(targetFile);
                        File.Move(tempFile, targetFile);
                    }
                    WriteJsonResponse(res, "{\"success\":true,\"code\":\"" + code + "\",\"file\":\"" + file + "\"}");
                    return;
                }

                if (path == "/api/companies")
                {
                    StringBuilder sb = new StringBuilder();
                    sb.Append("{\"companies\":[");
                    bool first = true;
                    if (Directory.Exists(dataDir))
                    {
                        foreach (string dir in Directory.GetDirectories(dataDir))
                        {
                            string folderName = Path.GetFileName(dir).ToUpper();
                            string cJson = Path.Combine(dir, "company.json");
                            if (File.Exists(cJson))
                            {
                                try
                                {
                                    string json = File.ReadAllText(cJson);
                                    if (!first) sb.Append(",");
                                    sb.Append("{\"companyCode\":\"" + folderName + "\",\"company\":" + json + "}");
                                    first = false;
                                }
                                catch { }
                            }
                        }
                    }
                    sb.Append("]}");
                    WriteJsonResponse(res, sb.ToString());
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

                    string jsonOut = string.Format(
                        "{{\"success\":true,\"companyCode\":\"{0}\",\"company\":{1},\"ledgers\":{2},\"vouchers\":{3},\"stockItems\":{4},\"stockGroups\":{5},\"units\":{6},\"groups\":{7},\"voucherTypes\":{8},\"purchaseOrders\":{9},\"boms\":{10},\"manufacturingJournals\":{11}}}",
                        code, cJson, lJson, vJson, sJson, sgJson, uJson, gJson, vtJson, poJson, bomJson, mjJson
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
                            ExtractAndWrite(body, "company", Path.Combine(cDir, "company.json"), "{}");
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
                        }

                        WriteJsonResponse(res, "{\"success\":true,\"companyCode\":\"" + code + "\"}");
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
                res.ContentLength64 = buf.Length;
                res.OutputStream.Write(buf, 0, buf.Length);
                res.OutputStream.Close();
            }
            catch { }
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
}
