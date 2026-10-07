using System;
using System.IO;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Windows.Forms;
using Microsoft.Win32;
using System.Security.Cryptography;
using System.Text;

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
