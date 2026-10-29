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
[assembly: System.Reflection.AssemblyDescription("LedgerX Portable Multi-User Offline LAN Client")]
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

            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            string configFile = Path.Combine(exeDir, "lan_config.json");
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

            // If IP passed via args e.g. LedgerX-Client.exe 192.168.240.50
            if (args != null && args.Length > 0 && !string.IsNullOrEmpty(args[0]))
            {
                savedHostIp = args[0].Trim();
            }

            // Verify if saved host is alive
            if (!string.IsNullOrEmpty(savedHostIp) && IsHostAlive(savedHostIp, 45454))
            {
                LaunchHostPortal(savedHostIp);
                return;
            }

            // Otherwise show friendly LAN Connection Wizard
            Application.Run(new LanConnectForm(savedHostIp, configFile));
        }

        public static bool IsHostAlive(string ip, int port)
        {
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    var result = client.BeginConnect(ip, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(450);
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch { return false; }
        }

        public static void LaunchHostPortal(string hostIp)
        {
            string url = string.Format("http://{0}:45454/?lan_client=1", hostIp);

            // Find Edge or Chrome
            string browser = FindBrowser();
            string profileDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "LedgerXClientProfile");
            if (!Directory.Exists(profileDir)) Directory.CreateDirectory(profileDir);

            if (!string.IsNullOrEmpty(browser))
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = browser;
                psi.Arguments = string.Format("--app=\"{0}\" --user-data-dir=\"{1}\" --start-maximized --allow-running-insecure-content", url, profileDir);
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

            if (subnets.Count == 0) subnets.Add("192.168.240.");
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
            this.Text = "LedgerX Offline LAN Client — Connect to Host PC";
            this.Size = new Size(520, 330);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(248, 250, 252);

            Label title = new Label();
            title.Text = "🌐 Connect to Host Accounting PC (LAN)";
            title.Font = new Font("Segoe UI", 12, FontStyle.Bold);
            title.ForeColor = Color.FromArgb(15, 60, 100);
            title.Location = new Point(25, 20);
            title.Size = new Size(460, 30);
            this.Controls.Add(title);

            Label desc = new Label();
            desc.Text = "Enter the IP address of the main Host PC (e.g. 192.168.240.50) where LedgerX Desktop is running on this local network:";
            desc.Font = new Font("Segoe UI", 9);
            desc.ForeColor = Color.FromArgb(71, 85, 105);
            desc.Location = new Point(25, 55);
            desc.Size = new Size(460, 40);
            this.Controls.Add(desc);

            Label lblIp = new Label();
            lblIp.Text = "Host PC IP Address:";
            lblIp.Font = new Font("Segoe UI", 9, FontStyle.Bold);
            lblIp.ForeColor = Color.FromArgb(30, 41, 59);
            lblIp.Location = new Point(25, 105);
            lblIp.Size = new Size(180, 22);
            this.Controls.Add(lblIp);

            // Determine sensible default IP from local network interface
            string initialIp = defaultIp;
            if (string.IsNullOrEmpty(initialIp) || initialIp == "192.168.1.15")
            {
                List<string> subs = Program.GetLocalSubnets();
                if (subs.Count > 0)
                {
                    // If subnet is 192.168.240., suggest .50 (the host IP in the network)
                    initialIp = subs[0] + "50";
                }
                else
                {
                    initialIp = "192.168.240.50";
                }
            }

            txtIp = new TextBox();
            txtIp.Text = initialIp;
            txtIp.Font = new Font("Segoe UI", 11);
            txtIp.Location = new Point(25, 130);
            txtIp.Size = new Size(310, 30);
            this.Controls.Add(txtIp);

            btnScan = new Button();
            btnScan.Text = "🔍 Auto-Scan";
            btnScan.Font = new Font("Segoe UI", 9, FontStyle.Bold);
            btnScan.BackColor = Color.FromArgb(224, 231, 255);
            btnScan.ForeColor = Color.FromArgb(67, 56, 202);
            btnScan.FlatStyle = FlatStyle.Flat;
            btnScan.FlatAppearance.BorderSize = 0;
            btnScan.Location = new Point(345, 129);
            btnScan.Size = new Size(130, 30);
            btnScan.Cursor = Cursors.Hand;
            btnScan.Click += BtnScan_Click;
            this.Controls.Add(btnScan);

            lblStatus = new Label();
            lblStatus.Text = "Port: 45454 • 100% Offline LAN Traffic • Zero Internet Required";
            lblStatus.Font = new Font("Segoe UI", 8);
            lblStatus.ForeColor = Color.FromArgb(100, 116, 139);
            lblStatus.Location = new Point(25, 170);
            lblStatus.Size = new Size(460, 25);
            this.Controls.Add(lblStatus);

            btnConnect = new Button();
            btnConnect.Text = "🚀 Connect & Open LedgerX";
            btnConnect.Font = new Font("Segoe UI", 10, FontStyle.Bold);
            btnConnect.BackColor = Color.FromArgb(16, 185, 129);
            btnConnect.ForeColor = Color.White;
            btnConnect.FlatStyle = FlatStyle.Flat;
            btnConnect.FlatAppearance.BorderSize = 0;
            btnConnect.Location = new Point(25, 205);
            btnConnect.Size = new Size(450, 44);
            btnConnect.Cursor = Cursors.Hand;
            btnConnect.Click += BtnConnect_Click;
            this.Controls.Add(btnConnect);
        }

        private void BtnScan_Click(object sender, EventArgs e)
        {
            lblStatus.Text = "Scanning local network for Host PC on port 45454...";
            lblStatus.ForeColor = Color.FromArgb(37, 99, 235);
            btnScan.Enabled = false;
            btnConnect.Enabled = false;
            Application.DoEvents();

            List<string> subnets = Program.GetLocalSubnets();
            List<string> targets = new List<string>();

            // Prioritize common host IPs first (.50, .1, .2, .100, etc.)
            int[] priorityLastBytes = new int[] { 50, 1, 2, 100, 10, 20, 30, 40, 51, 52 };
            foreach (string sub in subnets)
            {
                foreach (int p in priorityLastBytes) targets.Add(sub + p);
                for (int i = 1; i <= 254; i++)
                {
                    string ip = sub + i;
                    if (!targets.Contains(ip)) targets.Add(ip);
                }
            }

            string foundHost = null;
            object lockObj = new object();
            int remaining = targets.Count;
            ManualResetEvent doneEvent = new ManualResetEvent(false);

            ThreadPool.SetMinThreads(64, 64);
            foreach (string target in targets)
            {
                string ip = target;
                ThreadPool.QueueUserWorkItem((st) =>
                {
                    try
                    {
                        if (foundHost == null && Program.IsHostAlive(ip, 45454))
                        {
                            lock (lockObj)
                            {
                                if (foundHost == null)
                                {
                                    foundHost = ip;
                                    doneEvent.Set();
                                }
                            }
                        }
                    }
                    catch { }
                    finally
                    {
                        if (Interlocked.Decrement(ref remaining) == 0)
                        {
                            doneEvent.Set();
                        }
                    }
                });
            }

            doneEvent.WaitOne(2500);

            btnScan.Enabled = true;
            btnConnect.Enabled = true;

            if (foundHost != null)
            {
                txtIp.Text = foundHost;
                lblStatus.Text = "✓ Found Host PC at: " + foundHost + " (Port 45454 Active)";
                lblStatus.ForeColor = Color.FromArgb(22, 163, 74);
            }
            else
            {
                lblStatus.Text = "Host PC not auto-detected. Enter Host IP manually (e.g. 192.168.240.50).";
                lblStatus.ForeColor = Color.FromArgb(180, 83, 9);
            }
        }

        private void BtnConnect_Click(object sender, EventArgs e)
        {
            string ip = txtIp.Text.Trim();
            if (string.IsNullOrEmpty(ip))
            {
                MessageBox.Show("Please enter Host PC IP address (e.g. 192.168.240.50).", "IP Required", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            btnConnect.Enabled = false;
            btnConnect.Text = "Connecting to " + ip + "...";
            lblStatus.Text = "Testing connection to " + ip + ":45454...";
            lblStatus.ForeColor = Color.FromArgb(37, 99, 235);
            Application.DoEvents();

            if (Program.IsHostAlive(ip, 45454) || ip == "127.0.0.1" || ip == "localhost")
            {
                try { File.WriteAllText(configFile, ip); } catch { }
                lblStatus.Text = "✓ Connected! Launching LedgerX...";
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
                    "2. Run 'Fix-Firewall-LAN.bat' as Administrator on Host PC.\n" +
                    "3. Ensure the entered IP matches the Host PC's IP (e.g. 192.168.240.50).",
                    "Host Not Reachable",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
    }
}
