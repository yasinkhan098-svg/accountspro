using System;
using System.IO;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Reflection;
using Microsoft.Win32;

[assembly: AssemblyTitle("LedgerX Client Setup")]
[assembly: AssemblyDescription("LedgerX Client (Offline LAN Edition) Setup Wizard")]
[assembly: AssemblyConfiguration("")]
[assembly: AssemblyCompany("AccountsPro Software")]
[assembly: AssemblyProduct("LedgerX Client")]
[assembly: AssemblyCopyright("Copyright © 2026 AccountsPro")]
[assembly: AssemblyTrademark("LedgerX")]
[assembly: AssemblyCulture("")]
[assembly: AssemblyVersion("2.5.0.0")]
[assembly: AssemblyFileVersion("2.5.0.0")]
[assembly: ComVisible(false)]

namespace LedgerXClientSetup
{
    public class Program
    {
        [STAThread]
        public static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool isUninstall = false;
            try
            {
                string exeName = Path.GetFileName(Assembly.GetExecutingAssembly().Location).ToLower();
                if (exeName.Contains("uninstall") || (args != null && args.Length > 0 && args[0].ToLower().Contains("uninstall")))
                {
                    isUninstall = true;
                }
            }
            catch { }

            if (isUninstall)
            {
                Application.Run(new ClientUninstallForm());
            }
            else
            {
                Application.Run(new ClientSetupForm());
            }
        }
    }

    public class ClientSetupForm : Form
    {
        [DllImport("shell32.dll")]
        public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);

        private ProgressBar progressBar;
        private Label lblStatus;
        private Label lblTitle;
        private Label lblSub;
        private Button btnAction;
        private CheckBox chkLaunch;
        private System.Windows.Forms.Timer timer;
        private int step = 0;
        private string appDir;
        private string exePath;
        private string iconPath;
        private string uninstallerPath;

        public ClientSetupForm()
        {
            this.Text = "LedgerX Client (Offline LAN Edition) - Setup Wizard";
            this.Size = new Size(540, 390);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.BackColor = Color.FromArgb(248, 250, 252);

            try
            {
                this.Icon = Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location);
            }
            catch { }

            string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            appDir = Path.Combine(localApp, "Programs", "LedgerX Client");
            exePath = Path.Combine(appDir, "LedgerXClient.exe");
            iconPath = Path.Combine(appDir, "app.ico");
            uninstallerPath = Path.Combine(appDir, "Uninstall.exe");

            // Top Header Panel
            Panel pnlHeader = new Panel();
            pnlHeader.Dock = DockStyle.Top;
            pnlHeader.Height = 90;
            pnlHeader.BackColor = Color.FromArgb(15, 23, 42);

            try
            {
                PictureBox picLogo = new PictureBox();
                picLogo.Location = new Point(20, 18);
                picLogo.Size = new Size(54, 54);
                picLogo.SizeMode = PictureBoxSizeMode.Zoom;
                if (this.Icon != null) picLogo.Image = this.Icon.ToBitmap();
                pnlHeader.Controls.Add(picLogo);
            }
            catch { }

            lblTitle = new Label();
            lblTitle.Text = "LedgerX Client (Offline LAN Edition)";
            lblTitle.Font = new Font("Segoe UI", 13.5f, FontStyle.Bold);
            lblTitle.ForeColor = Color.White;
            lblTitle.Location = new Point(86, 20);
            lblTitle.AutoSize = true;
            pnlHeader.Controls.Add(lblTitle);

            lblSub = new Label();
            lblSub.Text = "Zero-Configuration Workstation Client with Instant Auto-Discovery";
            lblSub.Font = new Font("Segoe UI", 9.2f, FontStyle.Regular);
            lblSub.ForeColor = Color.FromArgb(186, 230, 253);
            lblSub.Location = new Point(88, 50);
            lblSub.AutoSize = true;
            pnlHeader.Controls.Add(lblSub);

            this.Controls.Add(pnlHeader);

            // Body Status Label
            lblStatus = new Label();
            lblStatus.Text = "Preparing installation...";
            lblStatus.Font = new Font("Segoe UI", 10f, FontStyle.Regular);
            lblStatus.ForeColor = Color.FromArgb(51, 65, 85);
            lblStatus.Location = new Point(28, 120);
            lblStatus.Size = new Size(470, 30);
            this.Controls.Add(lblStatus);

            // Progress Bar
            progressBar = new ProgressBar();
            progressBar.Location = new Point(28, 160);
            progressBar.Size = new Size(470, 26);
            progressBar.Style = ProgressBarStyle.Continuous;
            progressBar.Value = 0;
            this.Controls.Add(progressBar);

            // Checkbox to Launch
            chkLaunch = new CheckBox();
            chkLaunch.Text = "Launch LedgerX Client now (Connects automatically)";
            chkLaunch.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            chkLaunch.ForeColor = Color.FromArgb(30, 41, 59);
            chkLaunch.Location = new Point(28, 215);
            chkLaunch.Size = new Size(420, 25);
            chkLaunch.Checked = true;
            chkLaunch.Visible = false;
            this.Controls.Add(chkLaunch);

            // Action Button
            btnAction = new Button();
            btnAction.Text = "Installing...";
            btnAction.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            btnAction.Size = new Size(120, 36);
            btnAction.Location = new Point(378, 280);
            btnAction.BackColor = Color.FromArgb(2, 132, 199);
            btnAction.ForeColor = Color.White;
            btnAction.FlatStyle = FlatStyle.Flat;
            btnAction.FlatAppearance.BorderSize = 0;
            btnAction.Enabled = false;
            btnAction.Click += new EventHandler(BtnAction_Click);
            this.Controls.Add(btnAction);

            // Installation steps timer
            timer = new System.Windows.Forms.Timer();
            timer.Interval = 350;
            timer.Tick += new EventHandler(Timer_Tick);
            timer.Start();
        }

        private void Timer_Tick(object sender, EventArgs e)
        {
            step++;
            switch (step)
            {
                case 1:
                    lblStatus.Text = "Checking local network environment...";
                    progressBar.Value = 25;
                    break;
                case 2:
                    lblStatus.Text = "Extracting LedgerX Client engine and icon...";
                    progressBar.Value = 55;
                    InstallAppFiles();
                    break;
                case 3:
                    lblStatus.Text = "Creating 'LedgerX Client' Desktop & Start Menu shortcuts...";
                    progressBar.Value = 85;
                    CreateShortcuts();
                    break;
                case 4:
                    lblStatus.Text = "Registering Windows Add/Remove Programs entry...";
                    progressBar.Value = 95;
                    RegisterWindowsUninstall();
                    break;
                case 5:
                    timer.Stop();
                    progressBar.Value = 100;
                    lblStatus.Text = "LedgerX Client installed successfully!";
                    lblStatus.ForeColor = Color.FromArgb(22, 163, 74);
                    chkLaunch.Visible = true;
                    btnAction.Text = "Finish";
                    btnAction.Enabled = true;
                    btnAction.BackColor = Color.FromArgb(22, 163, 74);
                    break;
            }
        }

        private static void ExtractResource(string resourceName, string outputPath)
        {
            Assembly asm = Assembly.GetExecutingAssembly();
            using (Stream stream = asm.GetManifestResourceStream(resourceName))
            {
                if (stream == null)
                {
                    foreach (string name in asm.GetManifestResourceNames())
                    {
                        if (name.EndsWith(resourceName, StringComparison.OrdinalIgnoreCase))
                        {
                            using (Stream fallbackStream = asm.GetManifestResourceStream(name))
                            {
                                WriteStreamToFile(fallbackStream, outputPath);
                                return;
                            }
                        }
                    }
                    throw new InvalidOperationException("Embedded resource not found: " + resourceName);
                }
                WriteStreamToFile(stream, outputPath);
            }
        }

        private static void WriteStreamToFile(Stream src, string dstPath)
        {
            using (FileStream fs = new FileStream(dstPath, FileMode.Create, FileAccess.Write))
            {
                byte[] buffer = new byte[81920];
                int bytesRead;
                while ((bytesRead = src.Read(buffer, 0, buffer.Length)) > 0)
                {
                    fs.Write(buffer, 0, bytesRead);
                }
            }
        }

        private void InstallAppFiles()
        {
            try
            {
                if (!Directory.Exists(appDir)) Directory.CreateDirectory(appDir);

                // Extract client launcher
                ExtractResource("LedgerXClient.exe", exePath);

                // Extract icon
                ExtractResource("app.ico", iconPath);

                // Copy uninstaller
                try
                {
                    string myLocation = Assembly.GetExecutingAssembly().Location;
                    if (File.Exists(myLocation)) File.Copy(myLocation, uninstallerPath, true);
                }
                catch { }
            }
            catch (Exception ex)
            {
                lblStatus.Text = "Setup Notice: " + ex.Message;
            }
        }

        private void RegisterWindowsUninstall()
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\LedgerXClient"))
                {
                    if (key != null)
                    {
                        key.SetValue("DisplayName", "LedgerX Client (Offline LAN Edition)");
                        key.SetValue("DisplayIcon", iconPath);
                        key.SetValue("DisplayVersion", "2.5.0");
                        key.SetValue("Publisher", "AccountsPro / LedgerX");
                        key.SetValue("InstallLocation", appDir);
                        key.SetValue("UninstallString", "\"" + uninstallerPath + "\" /uninstall");
                        key.SetValue("NoModify", 1, RegistryValueKind.DWord);
                        key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                    }
                }
            }
            catch { }
        }

        private void CreateShortcuts()
        {
            try
            {
                var desktopDirs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                try {
                    string d1 = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                    if (!string.IsNullOrEmpty(d1) && Directory.Exists(d1)) desktopDirs.Add(d1);
                } catch { }

                try {
                    string d2 = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                    if (!string.IsNullOrEmpty(d2) && Directory.Exists(d2)) desktopDirs.Add(d2);
                } catch { }

                try {
                    string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                    string d3 = Path.Combine(userProfile, "Desktop");
                    if (Directory.Exists(d3)) desktopDirs.Add(d3);
                    string d4 = Path.Combine(userProfile, "OneDrive", "Desktop");
                    if (Directory.Exists(d4)) desktopDirs.Add(d4);
                } catch { }

                foreach (string dir in desktopDirs)
                {
                    try {
                        string shortcutPath = Path.Combine(dir, "LedgerX Client.lnk");
                        if (File.Exists(shortcutPath)) {
                            try { File.Delete(shortcutPath); } catch { }
                        }
                        CreateSingleShortcut(shortcutPath, exePath, iconPath, appDir, "LedgerX Client (Offline LAN Edition)");
                    } catch { }
                }

                try
                {
                    string programs = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                    if (Directory.Exists(programs))
                    {
                        string startMenuPath = Path.Combine(programs, "LedgerX Client.lnk");
                        if (File.Exists(startMenuPath)) {
                            try { File.Delete(startMenuPath); } catch { }
                        }
                        CreateSingleShortcut(startMenuPath, exePath, iconPath, appDir, "LedgerX Client (Offline LAN Edition)");

                        string startMenuUninstall = Path.Combine(programs, "Uninstall LedgerX Client.lnk");
                        if (File.Exists(startMenuUninstall)) {
                            try { File.Delete(startMenuUninstall); } catch { }
                        }
                        CreateSingleShortcut(startMenuUninstall, uninstallerPath, iconPath, appDir, "Uninstall LedgerX Client");
                    }
                }
                catch { }

                try {
                    SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero);
                } catch { }
            }
            catch { }
        }

        private void CreateSingleShortcut(string lnkPath, string target, string iconFile, string workingDir, string description)
        {
            string chosenIcon = File.Exists(iconFile) ? iconFile : (target + ",0");
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    object shell = Activator.CreateInstance(shellType);
                    object shortcut = shellType.InvokeMember(
                        "CreateShortcut",
                        BindingFlags.InvokeMethod,
                        null,
                        shell,
                        new object[] { lnkPath }
                    );

                    if (shortcut != null)
                    {
                        Type scType = shortcut.GetType();
                        scType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { target });
                        scType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { workingDir });
                        scType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { description });
                        scType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { chosenIcon });
                        scType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
                        return;
                    }
                }
            }
            catch { }
        }

        private void BtnAction_Click(object sender, EventArgs e)
        {
            if (chkLaunch.Checked && File.Exists(exePath))
            {
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = exePath;
                    psi.WorkingDirectory = appDir;
                    Process.Start(psi);
                }
                catch { }
            }
            this.Close();
        }
    }

    public class ClientUninstallForm : Form
    {
        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        public static extern bool MoveFileEx(string lpExistingFileName, string lpNewFileName, int dwFlags);
        public const int MOVEFILE_DELAY_UNTIL_REBOOT = 0x4;

        private ProgressBar progressBar;
        private Label lblStatus;
        private Button btnUninstall;
        private Button btnCancel;
        private string appDir;

        public ClientUninstallForm()
        {
            this.Text = "Uninstall LedgerX Client";
            this.Size = new Size(520, 310);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.BackColor = Color.FromArgb(248, 250, 252);

            string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            appDir = Path.Combine(localApp, "Programs", "LedgerX Client");

            Panel pnlHeader = new Panel();
            pnlHeader.Dock = DockStyle.Top;
            pnlHeader.Height = 85;
            pnlHeader.BackColor = Color.FromArgb(15, 23, 42);

            Label lblTitle = new Label();
            lblTitle.Text = "Uninstall LedgerX Client";
            lblTitle.Font = new Font("Segoe UI", 13f, FontStyle.Bold);
            lblTitle.ForeColor = Color.White;
            lblTitle.Location = new Point(24, 18);
            lblTitle.AutoSize = true;
            pnlHeader.Controls.Add(lblTitle);

            Label lblSub = new Label();
            lblSub.Text = "Remove LedgerX Client workstation shortcuts and launcher from this computer?";
            lblSub.Font = new Font("Segoe UI", 9f, FontStyle.Regular);
            lblSub.ForeColor = Color.FromArgb(226, 232, 240);
            lblSub.Location = new Point(25, 48);
            lblSub.AutoSize = true;
            pnlHeader.Controls.Add(lblSub);

            this.Controls.Add(pnlHeader);

            lblStatus = new Label();
            lblStatus.Text = "Click 'Uninstall' to remove shortcuts, launcher, and registry entries.";
            lblStatus.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            lblStatus.ForeColor = Color.FromArgb(71, 85, 105);
            lblStatus.Location = new Point(28, 105);
            lblStatus.Size = new Size(460, 28);
            this.Controls.Add(lblStatus);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(28, 140);
            progressBar.Size = new Size(460, 24);
            progressBar.Style = ProgressBarStyle.Continuous;
            progressBar.Value = 0;
            this.Controls.Add(progressBar);

            btnUninstall = new Button();
            btnUninstall.Text = "Uninstall";
            btnUninstall.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            btnUninstall.Size = new Size(110, 36);
            btnUninstall.Location = new Point(250, 200);
            btnUninstall.BackColor = Color.FromArgb(220, 38, 38);
            btnUninstall.ForeColor = Color.White;
            btnUninstall.FlatStyle = FlatStyle.Flat;
            btnUninstall.FlatAppearance.BorderSize = 0;
            btnUninstall.Click += new EventHandler(BtnUninstall_Click);
            this.Controls.Add(btnUninstall);

            btnCancel = new Button();
            btnCancel.Text = "Cancel";
            btnCancel.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            btnCancel.Size = new Size(100, 36);
            btnCancel.Location = new Point(370, 200);
            btnCancel.BackColor = Color.FromArgb(226, 232, 240);
            btnCancel.ForeColor = Color.FromArgb(30, 41, 59);
            btnCancel.FlatStyle = FlatStyle.Flat;
            btnCancel.FlatAppearance.BorderSize = 0;
            btnCancel.Click += (s, e) => this.Close();
            this.Controls.Add(btnCancel);
        }

        private void BtnUninstall_Click(object sender, EventArgs e)
        {
            btnUninstall.Enabled = false;
            btnCancel.Enabled = false;
            lblStatus.Text = "Removing Desktop and Start Menu shortcuts...";
            progressBar.Value = 35;

            try
            {
                var desktopDirs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                try { string d1 = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory); if (!string.IsNullOrEmpty(d1) && Directory.Exists(d1)) desktopDirs.Add(d1); } catch { }
                try { string d2 = Environment.GetFolderPath(Environment.SpecialFolder.Desktop); if (!string.IsNullOrEmpty(d2) && Directory.Exists(d2)) desktopDirs.Add(d2); } catch { }
                try { string d3 = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Desktop"); if (Directory.Exists(d3)) desktopDirs.Add(d3); } catch { }
                try { string d4 = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "OneDrive", "Desktop"); if (Directory.Exists(d4)) desktopDirs.Add(d4); } catch { }

                foreach (string dir in desktopDirs)
                {
                    try {
                        string shortcut = Path.Combine(dir, "LedgerX Client.lnk");
                        if (File.Exists(shortcut)) File.Delete(shortcut);
                    } catch { }
                }

                string programs = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                if (Directory.Exists(programs))
                {
                    string p1 = Path.Combine(programs, "LedgerX Client.lnk");
                    if (File.Exists(p1)) { try { File.Delete(p1); } catch { } }
                    string p2 = Path.Combine(programs, "Uninstall LedgerX Client.lnk");
                    if (File.Exists(p2)) { try { File.Delete(p2); } catch { } }
                }
            }
            catch { }

            progressBar.Value = 70;
            lblStatus.Text = "Removing Registry keys...";
            try
            {
                Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\LedgerXClient", false);
            }
            catch { }

            progressBar.Value = 90;
            lblStatus.Text = "Cleaning application files...";
            try
            {
                string exe = Path.Combine(appDir, "LedgerXClient.exe");
                if (File.Exists(exe)) { try { File.Delete(exe); } catch { } }
                string ico = Path.Combine(appDir, "app.ico");
                if (File.Exists(ico)) { try { File.Delete(ico); } catch { } }
                string cfg = Path.Combine(appDir, "lan_config.json");
                if (File.Exists(cfg)) { try { File.Delete(cfg); } catch { } }
            }
            catch { }

            try
            {
                ClientSetupForm.SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero);
            }
            catch { }

            try
            {
                string myExe = Assembly.GetExecutingAssembly().Location;
                MoveFileEx(myExe, null, MOVEFILE_DELAY_UNTIL_REBOOT);
            }
            catch { }

            progressBar.Value = 100;
            MessageBox.Show("LedgerX Client has been successfully uninstalled.", "Uninstalled", MessageBoxButtons.OK, MessageBoxIcon.Information);
            this.Close();
        }
    }
}

