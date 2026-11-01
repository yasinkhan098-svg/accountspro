using System;
using System.IO;
using System.Diagnostics;
using System.Net;
using System.Drawing;
using System.Windows.Forms;
using System.Text;
using System.Collections.Generic;

[assembly: System.Reflection.AssemblyTitle("LedgerX Online Client")]
[assembly: System.Reflection.AssemblyDescription("LedgerX Remote Multi-User Cloud & POS Client")]
[assembly: System.Reflection.AssemblyCompany("AccountsPro Software")]
[assembly: System.Reflection.AssemblyProduct("LedgerX Online Client")]
[assembly: System.Reflection.AssemblyVersion("2.5.0.0")]

namespace LedgerXOnlineClient
{
    public class Program
    {
        public const string DEFAULT_CLOUD_URL = "https://ledgerx-tawny.vercel.app/?client_mode=1&online_client=1";

        [STAThread]
        public static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            // Enable TLS 1.2 and modern security protocols for HTTPS
            try
            {
                ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072 | SecurityProtocolType.Tls;
            }
            catch { }

            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            string configFile = Path.Combine(exeDir, "online_config.json");
            string savedUrl = "";

            if (File.Exists(configFile))
            {
                try
                {
                    string txt = File.ReadAllText(configFile, Encoding.UTF8).Trim();
                    if (!string.IsNullOrEmpty(txt)) savedUrl = txt;
                }
                catch { }
            }

            // Command-line override e.g. LedgerX-Online-Client.exe https://yourdomain.com
            if (args != null && args.Length > 0 && !string.IsNullOrEmpty(args[0]))
            {
                savedUrl = args[0].Trim();
            }

            if (string.IsNullOrEmpty(savedUrl))
            {
                savedUrl = DEFAULT_CLOUD_URL;
            }

            // If Ctrl or Shift is NOT held and saved URL is alive, launch immediately
            bool forceConfig = (Control.ModifierKeys == Keys.Shift || Control.ModifierKeys == Keys.Control);

            if (!forceConfig && !string.IsNullOrEmpty(savedUrl) && IsServerAlive(savedUrl))
            {
                LaunchOnlinePortal(savedUrl);
                return;
            }

            // Show friendly Online Connection Wizard Form
            Application.Run(new OnlineConnectForm(savedUrl, configFile));
        }

        public static bool IsServerAlive(string urlStr)
        {
            try
            {
                if (!urlStr.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && 
                    !urlStr.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                {
                    urlStr = "https://" + urlStr;
                }

                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(urlStr);
                req.Method = "HEAD";
                req.Timeout = 3000;
                req.AllowAutoRedirect = true;
                req.UserAgent = "LedgerX-OnlineClient/2.5";

                using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                {
                    return ((int)res.StatusCode >= 200 && (int)res.StatusCode < 400);
                }
            }
            catch
            {
                // Fallback attempt with GET in case HEAD is not allowed by server
                try
                {
                    HttpWebRequest req2 = (HttpWebRequest)WebRequest.Create(urlStr);
                    req2.Method = "GET";
                    req2.Timeout = 3000;
                    req2.UserAgent = "LedgerX-OnlineClient/2.5";
                    using (HttpWebResponse res2 = (HttpWebResponse)req2.GetResponse())
                    {
                        return true;
                    }
                }
                catch { return false; }
            }
        }

        public static void LaunchOnlinePortal(string targetUrl)
        {
            if (!targetUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && 
                !targetUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                targetUrl = "https://" + targetUrl;
            }

            // Ensure client mode query parameters are included
            if (!targetUrl.Contains("online_client=1") && !targetUrl.Contains("client_mode=1"))
            {
                char sep = targetUrl.Contains("?") ? '&' : '?';
                targetUrl = string.Format("{0}{1}client_mode=1&online_client=1", targetUrl, sep);
            }

            string browser = FindBrowser();
            string profileDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "LedgerXOnlineClientProfile");
            if (!Directory.Exists(profileDir)) Directory.CreateDirectory(profileDir);

            if (!string.IsNullOrEmpty(browser))
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = browser;
                psi.Arguments = string.Format("--app=\"{0}\" --user-data-dir=\"{1}\" --start-maximized --no-default-browser-check --no-first-run", targetUrl, profileDir);
                psi.WindowStyle = ProcessWindowStyle.Maximized;
                psi.UseShellExecute = true;
                Process.Start(psi);
            }
            else
            {
                Process.Start(targetUrl);
            }
        }

        public static string FindBrowser()
        {
            string[] possiblePaths = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe"),
            };
            foreach (string p in possiblePaths) { if (File.Exists(p)) return p; }
            return null;
        }
    }

    public class OnlineConnectForm : Form
    {
        private TextBox txtUrl;
        private Label lblStatus;
        private Button btnConnect;
        private Button btnTest;
        private Button btnLanSwitch;
        private CheckBox chkAutoLaunch;
        private string configFile;

        public OnlineConnectForm(string defaultUrl, string cfgFile)
        {
            this.configFile = cfgFile;
            this.Text = "LedgerX Online Cloud Client — Connect to Cloud Server";
            this.Size = new Size(540, 370);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(248, 250, 252);

            try
            {
                this.Icon = Icon.ExtractAssociatedIcon(System.Reflection.Assembly.GetExecutingAssembly().Location);
            }
            catch { }

            // Header banner
            Panel pnlHeader = new Panel();
            pnlHeader.Dock = DockStyle.Top;
            pnlHeader.Height = 75;
            pnlHeader.BackColor = Color.FromArgb(15, 23, 42); // Dark slate

            Label lblTitle = new Label();
            lblTitle.Text = "🌐 LedgerX Online Client (Cloud Edition)";
            lblTitle.Font = new Font("Segoe UI", 12.5f, FontStyle.Bold);
            lblTitle.ForeColor = Color.White;
            lblTitle.Location = new Point(20, 14);
            lblTitle.AutoSize = true;
            pnlHeader.Controls.Add(lblTitle);

            Label lblSub = new Label();
            lblSub.Text = "Remote Role-Based POS & Accounting Access over Secure Cloud";
            lblSub.Font = new Font("Segoe UI", 9f, FontStyle.Regular);
            lblSub.ForeColor = Color.FromArgb(186, 230, 253);
            lblSub.Location = new Point(22, 42);
            lblSub.AutoSize = true;
            pnlHeader.Controls.Add(lblSub);

            this.Controls.Add(pnlHeader);

            // Cloud Server URL Label
            Label lblUrl = new Label();
            lblUrl.Text = "Cloud Server Domain / URL:";
            lblUrl.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            lblUrl.ForeColor = Color.FromArgb(30, 41, 59);
            lblUrl.Location = new Point(25, 95);
            lblUrl.Size = new Size(250, 22);
            this.Controls.Add(lblUrl);

            txtUrl = new TextBox();
            txtUrl.Text = string.IsNullOrEmpty(defaultUrl) ? Program.DEFAULT_CLOUD_URL : defaultUrl;
            txtUrl.Font = new Font("Segoe UI", 10.5f);
            txtUrl.Location = new Point(25, 120);
            txtUrl.Size = new Size(345, 28);
            this.Controls.Add(txtUrl);

            btnTest = new Button();
            btnTest.Text = "⚡ Test Ping";
            btnTest.Font = new Font("Segoe UI", 9f, FontStyle.Bold);
            btnTest.BackColor = Color.FromArgb(224, 231, 255);
            btnTest.ForeColor = Color.FromArgb(67, 56, 202);
            btnTest.FlatStyle = FlatStyle.Flat;
            btnTest.FlatAppearance.BorderSize = 0;
            btnTest.Location = new Point(380, 119);
            btnTest.Size = new Size(115, 30);
            btnTest.Cursor = Cursors.Hand;
            btnTest.Click += BtnTest_Click;
            this.Controls.Add(btnTest);

            chkAutoLaunch = new CheckBox();
            chkAutoLaunch.Text = "Remember this cloud URL & Auto-Connect next time";
            chkAutoLaunch.Font = new Font("Segoe UI", 8.8f);
            chkAutoLaunch.ForeColor = Color.FromArgb(71, 85, 105);
            chkAutoLaunch.Location = new Point(25, 155);
            chkAutoLaunch.Size = new Size(470, 24);
            chkAutoLaunch.Checked = true;
            this.Controls.Add(chkAutoLaunch);

            lblStatus = new Label();
            lblStatus.Text = "Role-based security enforced. Internet connection required.";
            lblStatus.Font = new Font("Segoe UI", 8.5f);
            lblStatus.ForeColor = Color.FromArgb(100, 116, 139);
            lblStatus.Location = new Point(25, 185);
            lblStatus.Size = new Size(470, 22);
            this.Controls.Add(lblStatus);

            // Connect button
            btnConnect = new Button();
            btnConnect.Text = "🚀 Connect & Open LedgerX Online";
            btnConnect.Font = new Font("Segoe UI", 10.5f, FontStyle.Bold);
            btnConnect.BackColor = Color.FromArgb(2, 132, 199);
            btnConnect.ForeColor = Color.White;
            btnConnect.FlatStyle = FlatStyle.Flat;
            btnConnect.FlatAppearance.BorderSize = 0;
            btnConnect.Location = new Point(25, 215);
            btnConnect.Size = new Size(470, 44);
            btnConnect.Cursor = Cursors.Hand;
            btnConnect.Click += BtnConnect_Click;
            this.Controls.Add(btnConnect);

            // Switch to Offline LAN Client button
            btnLanSwitch = new Button();
            btnLanSwitch.Text = "🏢 Switch to Offline LAN Client (Zero Internet)";
            btnLanSwitch.Font = new Font("Segoe UI", 9f);
            btnLanSwitch.BackColor = Color.FromArgb(241, 245, 249);
            btnLanSwitch.ForeColor = Color.FromArgb(71, 85, 105);
            btnLanSwitch.FlatStyle = FlatStyle.Flat;
            btnLanSwitch.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            btnLanSwitch.Location = new Point(25, 272);
            btnLanSwitch.Size = new Size(470, 32);
            btnLanSwitch.Cursor = Cursors.Hand;
            btnLanSwitch.Click += BtnLanSwitch_Click;
            this.Controls.Add(btnLanSwitch);
        }

        private void BtnTest_Click(object sender, EventArgs e)
        {
            string url = txtUrl.Text.Trim();
            if (string.IsNullOrEmpty(url))
            {
                lblStatus.Text = "Please enter a valid URL.";
                lblStatus.ForeColor = Color.FromArgb(220, 38, 38);
                return;
            }

            btnTest.Enabled = false;
            lblStatus.Text = "Testing cloud server reachability...";
            lblStatus.ForeColor = Color.FromArgb(37, 99, 235);
            Application.DoEvents();

            bool alive = Program.IsServerAlive(url);
            btnTest.Enabled = true;

            if (alive)
            {
                lblStatus.Text = "✓ Cloud Server is ONLINE & Reachable!";
                lblStatus.ForeColor = Color.FromArgb(22, 163, 74);
            }
            else
            {
                lblStatus.Text = "✗ Cloud Server unreachable. Check internet connection or URL.";
                lblStatus.ForeColor = Color.FromArgb(220, 38, 38);
            }
        }

        private void BtnConnect_Click(object sender, EventArgs e)
        {
            string url = txtUrl.Text.Trim();
            if (string.IsNullOrEmpty(url))
            {
                MessageBox.Show("Please enter the LedgerX Cloud URL.", "URL Required", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && 
                !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                url = "https://" + url;
                txtUrl.Text = url;
            }

            btnConnect.Enabled = false;
            btnConnect.Text = "Verifying Connection...";
            lblStatus.Text = "Connecting to cloud server...";
            lblStatus.ForeColor = Color.FromArgb(37, 99, 235);
            Application.DoEvents();

            if (chkAutoLaunch.Checked)
            {
                try { File.WriteAllText(configFile, url, Encoding.UTF8); } catch { }
            }

            lblStatus.Text = "✓ Connected! Launching LedgerX Online Client...";
            lblStatus.ForeColor = Color.FromArgb(22, 163, 74);
            Application.DoEvents();

            Program.LaunchOnlinePortal(url);
            this.Close();
        }

        private void BtnLanSwitch_Click(object sender, EventArgs e)
        {
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            string lanExe = Path.Combine(exeDir, "LedgerX-Client.exe");
            if (File.Exists(lanExe))
            {
                Process.Start(lanExe);
                this.Close();
            }
            else
            {
                MessageBox.Show(
                    "LedgerX-Client.exe not found in this folder.\n\n" +
                    "To use Offline LAN mode, download LedgerX-Client.exe from the Admin Role Management panel.",
                    "LAN Client Not Found",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
        }
    }
}

