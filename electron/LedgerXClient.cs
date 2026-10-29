using System;
using System.IO;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Drawing;
using System.Windows.Forms;
using System.Text;

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

            // If IP passed via args e.g. LedgerX-Client.exe 192.168.1.15
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
                    bool success = result.AsyncWaitHandle.WaitOne(400);
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch { return false; }
        }

        public static void LaunchHostPortal(string hostIp)
        {
            string url = string.Format("http://{0}:45454?lan_client=1", hostIp);

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
    }

    public class LanConnectForm : Form
    {
        private TextBox txtIp;
        private Label lblStatus;
        private Button btnConnect;
        private string configFile;

        public LanConnectForm(string defaultIp, string cfgFile)
        {
            this.configFile = cfgFile;
            this.Text = "LedgerX Offline LAN Client — Connect to Host PC";
            this.Size = new Size(500, 310);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(248, 250, 252);

            Label title = new Label();
            title.Text = "🌐 Connect to Host Accounting PC (LAN)";
            title.Font = new Font("Segoe UI", 12, FontStyle.Bold);
            title.ForeColor = Color.FromArgb(15, 60, 100);
            title.Location = new Point(25, 20);
            title.Size = new Size(440, 30);
            this.Controls.Add(title);

            Label desc = new Label();
            desc.Text = "Enter the IP address of the main Host PC where LedgerX Desktop is running on this local network (Wi-Fi / Ethernet):";
            desc.Font = new Font("Segoe UI", 9);
            desc.ForeColor = Color.FromArgb(71, 85, 105);
            desc.Location = new Point(25, 55);
            desc.Size = new Size(440, 40);
            this.Controls.Add(desc);

            Label lblIp = new Label();
            lblIp.Text = "Host PC IP Address:";
            lblIp.Font = new Font("Segoe UI", 9, FontStyle.Bold);
            lblIp.ForeColor = Color.FromArgb(30, 41, 59);
            lblIp.Location = new Point(25, 105);
            lblIp.Size = new Size(150, 22);
            this.Controls.Add(lblIp);

            txtIp = new TextBox();
            txtIp.Text = string.IsNullOrEmpty(defaultIp) ? "192.168.1.15" : defaultIp;
            txtIp.Font = new Font("Segoe UI", 11);
            txtIp.Location = new Point(25, 130);
            txtIp.Size = new Size(300, 30);
            this.Controls.Add(txtIp);

            Button btnScan = new Button();
            btnScan.Text = "🔍 Auto-Scan";
            btnScan.Font = new Font("Segoe UI", 9, FontStyle.Bold);
            btnScan.BackColor = Color.FromArgb(224, 231, 255);
            btnScan.ForeColor = Color.FromArgb(67, 56, 202);
            btnScan.FlatStyle = FlatStyle.Flat;
            btnScan.FlatAppearance.BorderSize = 0;
            btnScan.Location = new Point(335, 129);
            btnScan.Size = new Size(125, 30);
            btnScan.Cursor = Cursors.Hand;
            btnScan.Click += BtnScan_Click;
            this.Controls.Add(btnScan);

            lblStatus = new Label();
            lblStatus.Text = "Port: 45454 • 100% Offline LAN Traffic • Zero Internet Required";
            lblStatus.Font = new Font("Segoe UI", 8);
            lblStatus.ForeColor = Color.FromArgb(100, 116, 139);
            lblStatus.Location = new Point(25, 170);
            lblStatus.Size = new Size(440, 20);
            this.Controls.Add(lblStatus);

            btnConnect = new Button();
            btnConnect.Text = "🚀 Connect & Open LedgerX";
            btnConnect.Font = new Font("Segoe UI", 10, FontStyle.Bold);
            btnConnect.BackColor = Color.FromArgb(16, 185, 129);
            btnConnect.ForeColor = Color.White;
            btnConnect.FlatStyle = FlatStyle.Flat;
            btnConnect.FlatAppearance.BorderSize = 0;
            btnConnect.Location = new Point(25, 205);
            btnConnect.Size = new Size(435, 42);
            btnConnect.Cursor = Cursors.Hand;
            btnConnect.Click += BtnConnect_Click;
            this.Controls.Add(btnConnect);
        }

        private void BtnScan_Click(object sender, EventArgs e)
        {
            lblStatus.Text = "Scanning local subnet for Host PC on port 45454...";
            lblStatus.ForeColor = Color.FromArgb(37, 99, 235);
            Application.DoEvents();

            // Try standard gateway subnets
            string baseSubnet = "192.168.1.";
            try
            {
                using (Socket socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0))
                {
                    socket.Connect("8.8.8.8", 65530);
                    IPEndPoint endPoint = socket.LocalEndPoint as IPEndPoint;
                    string myIp = endPoint.Address.ToString();
                    int lastDot = myIp.LastIndexOf('.');
                    if (lastDot > 0) baseSubnet = myIp.Substring(0, lastDot + 1);
                }
            }
            catch { }

            for (int i = 1; i <= 30; i++)
            {
                string target = baseSubnet + i.ToString();
                if (Program.IsHostAlive(target, 45454))
                {
                    txtIp.Text = target;
                    lblStatus.Text = "✓ Found Host PC at: " + target;
                    lblStatus.ForeColor = Color.FromArgb(22, 163, 74);
                    return;
                }
            }

            lblStatus.Text = "Scan finished. If not found, enter Host PC IP manually.";
            lblStatus.ForeColor = Color.FromArgb(180, 83, 9);
        }

        private void BtnConnect_Click(object sender, EventArgs e)
        {
            string ip = txtIp.Text.Trim();
            if (string.IsNullOrEmpty(ip))
            {
                MessageBox.Show("Please enter Host PC IP address.", "IP Required", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            btnConnect.Enabled = false;
            btnConnect.Text = "Connecting...";
            Application.DoEvents();

            if (Program.IsHostAlive(ip, 45454) || ip == "127.0.0.1" || ip == "localhost")
            {
                try { File.WriteAllText(configFile, ip); } catch { }
                Program.LaunchHostPortal(ip);
                this.Close();
            }
            else
            {
                btnConnect.Enabled = true;
                btnConnect.Text = "🚀 Connect & Open LedgerX";
                MessageBox.Show(
                    "Unable to connect to Host PC at: " + ip + ":45454\n\n" +
                    "Please ensure:\n" +
                    "1. LedgerX Desktop is running on the Host PC.\n" +
                    "2. Both computers are on the same Wi-Fi / LAN router.\n" +
                    "3. Windows Firewall on Host PC allows inbound traffic on port 45454.",
                    "Host Not Reachable",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
    }
}
