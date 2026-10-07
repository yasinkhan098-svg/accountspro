const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Step 1: Locating C# Compiler (csc.exe) ===');
const cscPaths = [
  'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
  'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe',
];
let cscPath = cscPaths.find(p => fs.existsSync(p));
if (!cscPath) {
  throw new Error('csc.exe not found in Microsoft.NET Framework');
}
console.log('Using compiler:', cscPath);

const electronDir = path.join(__dirname, '../electron');
const downloadsDir = path.join(__dirname, '../public/downloads');
const icoPath = path.join(electronDir, 'app.ico');
const launcherCsPath = path.join(electronDir, 'LedgerXLauncher.cs');
const installerCsPath = path.join(electronDir, 'Installer.cs');
const launcherExePath = path.join(downloadsDir, 'LedgerX.exe');
const setupExePath = path.join(downloadsDir, 'LedgerX-Setup.exe');

if (!fs.existsSync(icoPath)) {
  throw new Error('Icon file electron/app.ico does not exist. Run scripts/generate-icons.py first!');
}

console.log('\n=== Step 2: Compiling LedgerX.exe with embedded Win32 Icon ===');
const launcherCmd = `"${cscPath}" /target:winexe /optimize+ /win32icon:"${icoPath}" /out:"${launcherExePath}" "${launcherCsPath}"`;
console.log('Executing:', launcherCmd);
execSync(launcherCmd, { stdio: 'inherit' });

const exeBuffer = fs.readFileSync(launcherExePath);
const launcherBase64 = exeBuffer.toString('base64');
console.log('Compiled LedgerX.exe size:', exeBuffer.length, 'bytes');

const icoBuffer = fs.readFileSync(icoPath);
const icoBase64 = icoBuffer.toString('base64');
console.log('Icon size:', icoBuffer.length, 'bytes');

console.log('\n=== Step 3: Generating electron/Installer.cs with Embedded Icon, Launcher & Uninstaller ===');
const installerContent = `using System;
using System.IO;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using Microsoft.Win32;

namespace LedgerXSetup
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
                string exeName = Path.GetFileName(System.Reflection.Assembly.GetExecutingAssembly().Location).ToLower();
                if (exeName.Contains("uninstall") || (args != null && args.Length > 0 && args[0].ToLower().Contains("uninstall")))
                {
                    isUninstall = true;
                }
            }
            catch { }

            if (isUninstall)
            {
                Application.Run(new UninstallForm());
            }
            else
            {
                Application.Run(new SetupForm());
            }
        }
    }

    public class SetupForm : Form
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

        private const string LAUNCHER_BASE64 = "${launcherBase64}";
        private const string ICON_BASE64 = "${icoBase64}";

        public SetupForm()
        {
            this.Text = "LedgerX Desktop (Offline Edition) - Setup Wizard";
            this.Size = new Size(540, 390);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.BackColor = Color.FromArgb(248, 250, 252);

            try
            {
                this.Icon = Icon.ExtractAssociatedIcon(System.Reflection.Assembly.GetExecutingAssembly().Location);
            }
            catch { }

            string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            appDir = Path.Combine(localApp, "LedgerX");
            exePath = Path.Combine(appDir, "LedgerX.exe");
            iconPath = Path.Combine(appDir, "app.ico");
            uninstallerPath = Path.Combine(appDir, "Uninstall.exe");

            // Top Header Panel
            Panel pnlHeader = new Panel();
            pnlHeader.Dock = DockStyle.Top;
            pnlHeader.Height = 90;
            pnlHeader.BackColor = Color.FromArgb(15, 23, 42); // Modern dark slate

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
            lblTitle.Text = "LedgerX Desktop (Offline Edition)";
            lblTitle.Font = new Font("Segoe UI", 13.5f, FontStyle.Bold);
            lblTitle.ForeColor = Color.White;
            lblTitle.Location = new Point(86, 20);
            lblTitle.AutoSize = true;
            pnlHeader.Controls.Add(lblTitle);

            lblSub = new Label();
            lblSub.Text = "Standalone Windows Accounting System with Cloud Auto-Sync";
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
            chkLaunch.Text = "Launch LedgerX Desktop now";
            chkLaunch.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            chkLaunch.ForeColor = Color.FromArgb(30, 41, 59);
            chkLaunch.Location = new Point(28, 215);
            chkLaunch.Size = new Size(320, 25);
            chkLaunch.Checked = true;
            chkLaunch.Visible = false;
            this.Controls.Add(chkLaunch);

            // Action Button (Close / Finish)
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
            timer.Interval = 500;
            timer.Tick += new EventHandler(Timer_Tick);
            timer.Start();
        }

        private void Timer_Tick(object sender, EventArgs e)
        {
            step++;
            switch (step)
            {
                case 1:
                    lblStatus.Text = "Checking system environment (Windows 64-bit)...";
                    progressBar.Value = 25;
                    break;
                case 2:
                    lblStatus.Text = "Extracting LedgerX Desktop application, icon, and uninstaller...";
                    progressBar.Value = 50;
                    InstallAppFiles();
                    break;
                case 3:
                    lblStatus.Text = "Creating Desktop and Start Menu shortcuts...";
                    progressBar.Value = 80;
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
                    lblStatus.Text = "LedgerX Desktop installed successfully!";
                    lblStatus.ForeColor = Color.FromArgb(22, 163, 74);
                    chkLaunch.Visible = true;
                    btnAction.Text = "Finish";
                    btnAction.Enabled = true;
                    btnAction.BackColor = Color.FromArgb(22, 163, 74);
                    break;
            }
        }

        private string DetectEmbeddedServerUrl()
        {
            try
            {
                string myExe = System.Reflection.Assembly.GetExecutingAssembly().Location;
                if (File.Exists(myExe))
                {
                    using (var fs = new FileStream(myExe, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                    {
                        long len = fs.Length;
                        long readLen = Math.Min(8192, len);
                        fs.Seek(len - readLen, SeekOrigin.Begin);
                        byte[] buf = new byte[readLen];
                        fs.Read(buf, 0, (int)readLen);
                        string text = System.Text.Encoding.UTF8.GetString(buf);
                        int idx = text.LastIndexOf("---LX_CONFIG_BEGIN---");
                        if (idx >= 0)
                        {
                            string sub = text.Substring(idx);
                            int sIdx = sub.IndexOf("SERVER_URL=");
                            int eIdx = sub.IndexOf("---LX_CONFIG_END---");
                            if (sIdx >= 0 && eIdx > sIdx)
                            {
                                string url = sub.Substring(sIdx + 11, eIdx - (sIdx + 11)).Trim();
                                if (url.StartsWith("http")) return url;
                            }
                        }
                    }
                }
            }
            catch { }
            return null;
        }

        private void InstallAppFiles()
        {
            try
            {
                if (!Directory.Exists(appDir)) Directory.CreateDirectory(appDir);

                try
                {
                    foreach (var proc in Process.GetProcessesByName("LedgerX"))
                    {
                        try { proc.Kill(); } catch { }
                    }
                }
                catch { }

                // Extract launcher
                byte[] rawExe = Convert.FromBase64String(LAUNCHER_BASE64);
                File.WriteAllBytes(exePath, rawExe);

                // Extract icon
                byte[] rawIco = Convert.FromBase64String(ICON_BASE64);
                File.WriteAllBytes(iconPath, rawIco);

                // Save uninstaller copy
                try
                {
                    string myLocation = System.Reflection.Assembly.GetExecutingAssembly().Location;
                    if (File.Exists(myLocation))
                    {
                        File.Copy(myLocation, uninstallerPath, true);
                    }
                }
                catch { }

                string conf = Path.Combine(appDir, "config.json");
                string detectedUrl = DetectEmbeddedServerUrl();

                if (!string.IsNullOrEmpty(detectedUrl))
                {
                    File.WriteAllText(conf, detectedUrl);
                }
                else if (!File.Exists(conf))
                {
                    File.WriteAllText(conf, "http://localhost:3000");
                }
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
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\LedgerX"))
                {
                    if (key != null)
                    {
                        key.SetValue("DisplayName", "LedgerX Desktop (Offline Edition)");
                        key.SetValue("DisplayIcon", iconPath);
                        key.SetValue("DisplayVersion", "1.0.0");
                        key.SetValue("Publisher", "AccountsPro / LedgerX");
                        key.SetValue("InstallLocation", appDir);
                        key.SetValue("UninstallString", "\\"" + uninstallerPath + "\\" /uninstall");
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
                        string shortcutPath = Path.Combine(dir, "LedgerX Desktop.lnk");
                        if (File.Exists(shortcutPath)) {
                            try { File.Delete(shortcutPath); } catch { }
                        }
                        CreateSingleShortcut(shortcutPath, exePath, iconPath, appDir, "LedgerX Desktop (Offline Edition)");
                    } catch { }
                }

                try
                {
                    string programs = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                    if (Directory.Exists(programs))
                    {
                        string startMenuPath = Path.Combine(programs, "LedgerX Desktop.lnk");
                        if (File.Exists(startMenuPath)) {
                            try { File.Delete(startMenuPath); } catch { }
                        }
                        CreateSingleShortcut(startMenuPath, exePath, iconPath, appDir, "LedgerX Desktop (Offline Edition)");

                        string startMenuUninstall = Path.Combine(programs, "Uninstall LedgerX.lnk");
                        if (File.Exists(startMenuUninstall)) {
                            try { File.Delete(startMenuUninstall); } catch { }
                        }
                        CreateSingleShortcut(startMenuUninstall, uninstallerPath, iconPath, appDir, "Uninstall LedgerX Desktop");
                    }
                }
                catch { }

                // Flush Windows icon cache immediately so shortcuts show the icon right away
                try {
                    SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero); // SHCNE_ASSOCCHANGED
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
                        System.Reflection.BindingFlags.InvokeMethod,
                        null,
                        shell,
                        new object[] { lnkPath }
                    );

                    if (shortcut != null)
                    {
                        Type scType = shortcut.GetType();
                        scType.InvokeMember("TargetPath", System.Reflection.BindingFlags.SetProperty, null, shortcut, new object[] { target });
                        scType.InvokeMember("WorkingDirectory", System.Reflection.BindingFlags.SetProperty, null, shortcut, new object[] { workingDir });
                        scType.InvokeMember("Description", System.Reflection.BindingFlags.SetProperty, null, shortcut, new object[] { description });
                        scType.InvokeMember("IconLocation", System.Reflection.BindingFlags.SetProperty, null, shortcut, new object[] { chosenIcon });
                        scType.InvokeMember("Save", System.Reflection.BindingFlags.InvokeMethod, null, shortcut, null);
                        return;
                    }
                }
            }
            catch { }

            // Fallback via PowerShell
            try
            {
                string psCmd = "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut('" + lnkPath.Replace("'", "''") + "'); $sc.TargetPath = '" + target.Replace("'", "''") + "'; $sc.WorkingDirectory = '" + workingDir.Replace("'", "''") + "'; $sc.IconLocation = '" + chosenIcon.Replace("'", "''") + "'; $sc.Description = '" + description.Replace("'", "''") + "'; $sc.Save()";
                ProcessStartInfo psi = new ProcessStartInfo("powershell", "-NoProfile -Command \\"" + psCmd + "\\"");
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                Process.Start(psi).WaitForExit(3000);
            }
            catch { }
        }

        private void BtnAction_Click(object sender, EventArgs e)
        {
            if (chkLaunch.Checked && File.Exists(exePath))
            {
                try
                {
                    Process.Start(new ProcessStartInfo(exePath) { WorkingDirectory = appDir, UseShellExecute = true });
                }
                catch { }
            }
            this.Close();
        }
    }

    public class UninstallForm : Form
    {
        private ProgressBar progressBar;
        private Label lblStatus;
        private CheckBox chkDeleteData;
        private Button btnUninstall;
        private Button btnCancel;
        private string appDir;

        public UninstallForm()
        {
            this.Text = "LedgerX Desktop - Uninstall Wizard";
            this.Size = new Size(540, 360);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.BackColor = Color.FromArgb(248, 250, 252);

            try
            {
                this.Icon = Icon.ExtractAssociatedIcon(System.Reflection.Assembly.GetExecutingAssembly().Location);
            }
            catch { }

            string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            appDir = Path.Combine(localApp, "LedgerX");

            Panel pnlHeader = new Panel();
            pnlHeader.Dock = DockStyle.Top;
            pnlHeader.Height = 85;
            pnlHeader.BackColor = Color.FromArgb(15, 23, 42);

            try
            {
                PictureBox picLogo = new PictureBox();
                picLogo.Location = new Point(20, 16);
                picLogo.Size = new Size(52, 52);
                picLogo.SizeMode = PictureBoxSizeMode.Zoom;
                if (this.Icon != null) picLogo.Image = this.Icon.ToBitmap();
                pnlHeader.Controls.Add(picLogo);
            }
            catch { }

            Label lblTitle = new Label();
            lblTitle.Text = "Uninstall LedgerX Desktop";
            lblTitle.Font = new Font("Segoe UI", 13.5f, FontStyle.Bold);
            lblTitle.ForeColor = Color.White;
            lblTitle.Location = new Point(86, 18);
            lblTitle.AutoSize = true;
            pnlHeader.Controls.Add(lblTitle);

            Label lblSub = new Label();
            lblSub.Text = "Remove LedgerX Desktop from your computer";
            lblSub.Font = new Font("Segoe UI", 9.2f, FontStyle.Regular);
            lblSub.ForeColor = Color.FromArgb(248, 113, 113);
            lblSub.Location = new Point(88, 48);
            lblSub.AutoSize = true;
            pnlHeader.Controls.Add(lblSub);

            this.Controls.Add(pnlHeader);

            lblStatus = new Label();
            lblStatus.Text = "Are you sure you want to completely uninstall LedgerX Desktop?";
            lblStatus.Font = new Font("Segoe UI", 10f, FontStyle.Regular);
            lblStatus.ForeColor = Color.FromArgb(51, 65, 85);
            lblStatus.Location = new Point(28, 110);
            lblStatus.Size = new Size(470, 36);
            this.Controls.Add(lblStatus);

            chkDeleteData = new CheckBox();
            chkDeleteData.Text = "Also delete company accounting data (data/ folder)";
            chkDeleteData.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            chkDeleteData.ForeColor = Color.FromArgb(220, 38, 38);
            chkDeleteData.Location = new Point(28, 155);
            chkDeleteData.Size = new Size(470, 28);
            chkDeleteData.Checked = false; // Default: keep accounting data safe!
            this.Controls.Add(chkDeleteData);

            Label lblDataHint = new Label();
            lblDataHint.Text = "Tip: Leave unchecked to keep your accounts, vouchers, and ledgers safe for future use.";
            lblDataHint.Font = new Font("Segoe UI", 8.5f, FontStyle.Italic);
            lblDataHint.ForeColor = Color.FromArgb(100, 116, 139);
            lblDataHint.Location = new Point(48, 188);
            lblDataHint.Size = new Size(450, 40);
            this.Controls.Add(lblDataHint);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(28, 235);
            progressBar.Size = new Size(470, 18);
            progressBar.Visible = false;
            this.Controls.Add(progressBar);

            btnUninstall = new Button();
            btnUninstall.Text = "Uninstall";
            btnUninstall.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            btnUninstall.Size = new Size(110, 36);
            btnUninstall.Location = new Point(278, 265);
            btnUninstall.BackColor = Color.FromArgb(220, 38, 38);
            btnUninstall.ForeColor = Color.White;
            btnUninstall.FlatStyle = FlatStyle.Flat;
            btnUninstall.FlatAppearance.BorderSize = 0;
            btnUninstall.Click += new EventHandler(BtnUninstall_Click);
            this.Controls.Add(btnUninstall);

            btnCancel = new Button();
            btnCancel.Text = "Cancel";
            btnCancel.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            btnCancel.Size = new Size(90, 36);
            btnCancel.Location = new Point(400, 265);
            btnCancel.BackColor = Color.FromArgb(226, 232, 240);
            btnCancel.ForeColor = Color.FromArgb(51, 65, 85);
            btnCancel.FlatStyle = FlatStyle.Flat;
            btnCancel.FlatAppearance.BorderSize = 0;
            btnCancel.Click += (s, e) => this.Close();
            this.Controls.Add(btnCancel);
        }

        private void BtnUninstall_Click(object sender, EventArgs e)
        {
            btnUninstall.Enabled = false;
            btnCancel.Enabled = false;
            chkDeleteData.Enabled = false;
            progressBar.Visible = true;
            progressBar.Value = 30;
            lblStatus.Text = "Closing active LedgerX processes...";

            try
            {
                foreach (var proc in Process.GetProcessesByName("LedgerX"))
                {
                    try { proc.Kill(); } catch { }
                }
            }
            catch { }

            progressBar.Value = 60;
            lblStatus.Text = "Removing Desktop and Start Menu shortcuts...";

            // Remove shortcuts
            try
            {
                var dirs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                try { string d1 = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory); if (!string.IsNullOrEmpty(d1)) dirs.Add(d1); } catch { }
                try { string d2 = Environment.GetFolderPath(Environment.SpecialFolder.Desktop); if (!string.IsNullOrEmpty(d2)) dirs.Add(d2); } catch { }
                try {
                    string up = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                    dirs.Add(Path.Combine(up, "Desktop"));
                    dirs.Add(Path.Combine(up, "OneDrive", "Desktop"));
                } catch { }

                foreach (string dir in dirs)
                {
                    string lnk = Path.Combine(dir, "LedgerX Desktop.lnk");
                    if (File.Exists(lnk)) { try { File.Delete(lnk); } catch { } }
                }

                string programs = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                if (Directory.Exists(programs))
                {
                    string s1 = Path.Combine(programs, "LedgerX Desktop.lnk");
                    if (File.Exists(s1)) { try { File.Delete(s1); } catch { } }
                    string s2 = Path.Combine(programs, "Uninstall LedgerX.lnk");
                    if (File.Exists(s2)) { try { File.Delete(s2); } catch { } }
                }
            }
            catch { }

            progressBar.Value = 80;
            lblStatus.Text = "Removing Windows Registry entries...";

            try
            {
                Registry.CurrentUser.DeleteSubKeyTree(@"Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\LedgerX", false);
            }
            catch { }

            // Clean files
            progressBar.Value = 95;
            lblStatus.Text = "Cleaning application files...";

            try
            {
                string exe = Path.Combine(appDir, "LedgerX.exe");
                if (File.Exists(exe)) { try { File.Delete(exe); } catch { } }
                string ico = Path.Combine(appDir, "app.ico");
                if (File.Exists(ico)) { try { File.Delete(ico); } catch { } }
                string cfg = Path.Combine(appDir, "config.json");
                if (File.Exists(cfg)) { try { File.Delete(cfg); } catch { } }
                string profile = Path.Combine(appDir, "Profile");
                if (Directory.Exists(profile)) { try { Directory.Delete(profile, true); } catch { } }

                if (chkDeleteData.Checked)
                {
                    string data = Path.Combine(appDir, "data");
                    if (Directory.Exists(data)) { try { Directory.Delete(data, true); } catch { } }
                }
            }
            catch { }

            // Notify shell
            try
            {
                SetupForm.SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero);
            }
            catch { }

            progressBar.Value = 100;
            MessageBox.Show("LedgerX Desktop has been successfully uninstalled.", "Uninstalled", MessageBoxButtons.OK, MessageBoxIcon.Information);

            // Self delete uninstaller executable via background cmd
            try
            {
                string myExe = System.Reflection.Assembly.GetExecutingAssembly().Location;
                string cmd = string.Format("/c timeout /t 2 /nobreak >nul & del /f /q \\"{0}\\"", myExe);
                if (chkDeleteData.Checked)
                {
                    cmd = string.Format("/c timeout /t 2 /nobreak >nul & del /f /q \\"{0}\\" & rmdir /s /q \\"{1}\\"", myExe, appDir);
                }
                ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", cmd);
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.CreateNoWindow = true;
                Process.Start(psi);
            }
            catch { }

            this.Close();
        }
    }
}
`;

fs.writeFileSync(installerCsPath, installerContent, 'utf-8');
console.log('Successfully written electron/Installer.cs');

console.log('\n=== Step 4: Compiling LedgerX-Setup.exe with embedded Win32 Icon ===');
const setupCmd = `"${cscPath}" /target:winexe /optimize+ /win32icon:"${icoPath}" /out:"${setupExePath}" "${installerCsPath}"`;
console.log('Executing:', setupCmd);
execSync(setupCmd, { stdio: 'inherit' });

const setupBuffer = fs.readFileSync(setupExePath);
console.log('Compiled LedgerX-Setup.exe size:', setupBuffer.length, 'bytes');

console.log('\n=== Step 5: Verification ===');
console.log('1. Launcher EXE: ', launcherExePath, `(${exeBuffer.length} bytes)`);
console.log('2. Setup EXE:    ', setupExePath, `(${setupBuffer.length} bytes)`);
console.log('3. Icon file:    ', icoPath, `(${icoBuffer.length} bytes)`);
console.log('All desktop binaries built successfully with full uninstaller support!');
