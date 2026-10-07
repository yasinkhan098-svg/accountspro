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

namespace LedgerXLauncher
{
    public class Program
    {
        [STAThread]
        public static void Main(string[] args)
        {
            try
            {
                string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string appDir = Path.Combine(localApp, "LedgerX");
                string configFile = Path.Combine(appDir, "config.json");
                string profileDir = Path.Combine(appDir, "Profile");
                string dataDir = Path.Combine(appDir, "data");

                if (!Directory.Exists(appDir)) Directory.CreateDirectory(appDir);
                if (!Directory.Exists(profileDir)) Directory.CreateDirectory(profileDir);
                if (!Directory.Exists(dataDir)) Directory.CreateDirectory(dataDir);

                // Start local HTTP Bridge for Tally-style company data folders
                StartHttpBridge(dataDir);

                // Allow passing server URL via command-line argument e.g. LedgerX.exe https://mysite.vercel.app
                if (args != null && args.Length > 0 && args[0].Trim().StartsWith("http"))
                {
                    try { File.WriteAllText(configFile, args[0].Trim()); } catch { }
                }

                // Default target URL
                string targetUrl = "http://localhost:3000";

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
                    psi.Arguments = string.Format("--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1366,768", launchUrl, profileDir);
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                }
                else
                {
                    // Fallback to system default browser
                    Process.Start(new ProcessStartInfo(launchUrl) { UseShellExecute = true });
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

        private static void RunListener(object objDataDir)
        {
            string dataDir = (string)objDataDir;
            try
            {
                HttpListener listener = new HttpListener();
                listener.Prefixes.Add("http://127.0.0.1:45454/");
                listener.Start();

                while (true)
                {
                    HttpListenerContext ctx = listener.GetContext();
                    ThreadPool.QueueUserWorkItem((state) => HandleRequest(ctx, dataDir));
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

                res.Headers.Add("Access-Control-Allow-Origin", "*");
                res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                res.Headers.Add("Access-Control-Allow-Headers", "*");

                if (req.HttpMethod == "OPTIONS")
                {
                    res.StatusCode = 204;
                    res.Close();
                    return;
                }

                string path = req.Url.AbsolutePath.ToLower();

                if (path == "/api/ping")
                {
                    WriteJsonResponse(res, "{\"status\":\"ok\",\"version\":\"2.4\"}");
                    return;
                }

                if (path == "/api/open-folder")
                {
                    try { Process.Start("explorer.exe", dataDir); } catch { }
                    WriteJsonResponse(res, "{\"success\":true}");
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
                    if (string.IsNullOrEmpty(code)) code = "10001";
                    code = code.ToUpper();
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

                    string jsonOut = string.Format(
                        "{{\"success\":true,\"companyCode\":\"{0}\",\"company\":{1},\"ledgers\":{2},\"vouchers\":{3},\"stockItems\":{4},\"stockGroups\":{5},\"units\":{6}}}",
                        code, cJson, lJson, vJson, sJson, sgJson, uJson
                    );
                    WriteJsonResponse(res, jsonOut);
                    return;
                }

                if (path == "/api/company" && req.HttpMethod == "POST")
                {
                    using (StreamReader reader = new StreamReader(req.InputStream, req.ContentEncoding))
                    {
                        string body = reader.ReadToEnd();
                        string code = "10001";
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

                        ExtractAndWrite(body, "company", Path.Combine(cDir, "company.json"), "{}");
                        ExtractAndWrite(body, "ledgers", Path.Combine(cDir, "ledgers.json"), "[]");
                        ExtractAndWrite(body, "vouchers", Path.Combine(cDir, "vouchers.json"), "[]");
                        ExtractAndWrite(body, "stockItems", Path.Combine(cDir, "stock_items.json"), "[]");
                        ExtractAndWrite(body, "stockGroups", Path.Combine(cDir, "stock_groups.json"), "[]");
                        ExtractAndWrite(body, "units", Path.Combine(cDir, "units.json"), "[]");

                        WriteJsonResponse(res, "{\"success\":true,\"companyCode\":\"" + code + "\"}");
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
