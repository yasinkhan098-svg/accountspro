using System;
using System.IO;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Windows.Forms;

namespace LedgerXLauncher
{
    public class Program
    {
        [STAThread]
        public static void Main()
        {
            try
            {
                string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string appDir = Path.Combine(localApp, "LedgerX");
                string configFile = Path.Combine(appDir, "config.json");
                string profileDir = Path.Combine(appDir, "Profile");

                if (!Directory.Exists(appDir)) Directory.CreateDirectory(appDir);
                if (!Directory.Exists(profileDir)) Directory.CreateDirectory(profileDir);

                // Target URL selection
                string localUrl = "http://localhost:3000";
                string cloudUrl = "https://accountspro-iota.vercel.app";

                if (File.Exists(configFile))
                {
                    try
                    {
                        string[] lines = File.ReadAllLines(configFile);
                        if (lines.Length > 0 && lines[0].Trim().StartsWith("http"))
                            localUrl = lines[0].Trim();
                        if (lines.Length > 1 && lines[1].Trim().StartsWith("http"))
                            cloudUrl = lines[1].Trim();
                    }
                    catch { }
                }

                // Check if local dev server or local daemon is listening on port 3000
                string targetUrl = IsLocalServerAlive("localhost", 3000) ? localUrl : cloudUrl;

                // Find modern browser executable (Edge or Chrome)
                string browserPath = FindBrowserExecutable();

                if (!string.IsNullOrEmpty(browserPath))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = browserPath;
                    psi.Arguments = string.Format("--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1366,768", targetUrl, profileDir);
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                }
                else
                {
                    // Fallback to system default browser
                    Process.Start(new ProcessStartInfo(targetUrl) { UseShellExecute = true });
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

        private static bool IsLocalServerAlive(string host, int port)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(400); // 400ms timeout
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
