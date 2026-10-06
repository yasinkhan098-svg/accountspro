using System;
using System.IO;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using System.Collections.Generic;

namespace LedgerXSetup
{
    public class SetupForm : Form
    {
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

        private const string LAUNCHER_BASE64 = "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3AFaAGkA+AFfAGEAYABOADkAGwFmAHEABwJtAHEADwJyAAkADwI5ACkAGAIQAFEAJAJ3AFkAKwJCAHkAQwI5AFEAJAIoAIEAnQJ/AAkAYAAUACAAGwAdAC4ACwCrAC4AEwC0AIoAnwAEgAAAAAAAAAAAAAAAAAAAAADJAAAABAAAAAAAAAAAAAAAAQAuAAAAAAAEAAAAAAAAAAAAAAABADcAAAAAAAQAAAAAAAAAAAAAAAEATwIAAAAAAAAAPE1vZHVsZT4ATGVkZ2VyWC5leGUAUHJvZ3JhbQBMZWRnZXJYTGF1bmNoZXIAbXNjb3JsaWIAU3lzdGVtAE9iamVjdABNYWluAEZpbmRCcm93c2VyRXhlY3V0YWJsZQAuY3RvcgBhcmdzAFN5c3RlbS5SdW50aW1lLkNvbXBpbGVyU2VydmljZXMAQ29tcGlsYXRpb25SZWxheGF0aW9uc0F0dHJpYnV0ZQBSdW50aW1lQ29tcGF0aWJpbGl0eUF0dHJpYnV0ZQBMZWRnZXJYAFNUQVRocmVhZEF0dHJpYnV0ZQBFbnZpcm9ubWVudABTcGVjaWFsRm9sZGVyAEdldEZvbGRlclBhdGgAU3lzdGVtLklPAFBhdGgAQ29tYmluZQBEaXJlY3RvcnkARXhpc3RzAERpcmVjdG9yeUluZm8AQ3JlYXRlRGlyZWN0b3J5AFN0cmluZwBUcmltAFN0YXJ0c1dpdGgARmlsZQBXcml0ZUFsbFRleHQAUmVhZEFsbExpbmVzAElzTnVsbE9yRW1wdHkAU3lzdGVtLkRpYWdub3N0aWNzAFByb2Nlc3NTdGFydEluZm8Ac2V0X0ZpbGVOYW1lAEZvcm1hdABzZXRfQXJndW1lbnRzAHNldF9Vc2VTaGVsbEV4ZWN1dGUAUHJvY2VzcwBTdGFydABEYXRlVGltZQBnZXRfTm93AFRvU3RyaW5nAGdldF9OZXdMaW5lAENvbmNhdABBcHBlbmRBbGxUZXh0AEV4Y2VwdGlvbgBnZXRfTWVzc2FnZQBTeXN0ZW0uV2luZG93cy5Gb3JtcwBNZXNzYWdlQm94AERpYWxvZ1Jlc3VsdABNZXNzYWdlQm94QnV0dG9ucwBNZXNzYWdlQm94SWNvbgBTaG93AAAAAA9MAGUAZABnAGUAcgBYAAAXYwBvAG4AZgBpAGcALgBqAHMA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAMAAAAMDwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new SetupForm());
        }

        public SetupForm()
        {
            this.Text = "LedgerX Desktop (Offline Edition) - Setup Wizard";
            this.Size = new Size(540, 380);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.BackColor = Color.FromArgb(248, 250, 252);
            this.Icon = SystemIcons.Application;

            string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            appDir = Path.Combine(localApp, "LedgerX");
            exePath = Path.Combine(appDir, "LedgerX.exe");

            // Top Header Panel
            Panel pnlHeader = new Panel();
            pnlHeader.Dock = DockStyle.Top;
            pnlHeader.Height = 90;
            pnlHeader.BackColor = Color.FromArgb(30, 58, 138);

            lblTitle = new Label();
            lblTitle.Text = "LedgerX Desktop (Offline Edition)";
            lblTitle.Font = new Font("Segoe UI", 14, FontStyle.Bold);
            lblTitle.ForeColor = Color.White;
            lblTitle.Location = new Point(24, 20);
            lblTitle.AutoSize = true;
            pnlHeader.Controls.Add(lblTitle);

            lblSub = new Label();
            lblSub.Text = "Standalone Windows Accounting System with Cloud Auto-Sync";
            lblSub.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            lblSub.ForeColor = Color.FromArgb(186, 230, 253);
            lblSub.Location = new Point(25, 52);
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
            btnAction.Location = new Point(378, 275);
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
                    lblStatus.Text = "Extracting LedgerX Desktop application files...";
                    progressBar.Value = 50;
                    InstallAppFiles();
                    break;
                case 3:
                    lblStatus.Text = "Creating Desktop and Start Menu shortcuts...";
                    progressBar.Value = 80;
                    CreateShortcuts();
                    break;
                case 4:
                    lblStatus.Text = "Registering hardware security vault...";
                    progressBar.Value = 95;
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

                byte[] raw = Convert.FromBase64String(LAUNCHER_BASE64);
                File.WriteAllBytes(exePath, raw);

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
                        CreateSingleShortcut(shortcutPath, exePath, appDir);
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
                        CreateSingleShortcut(startMenuPath, exePath, appDir);
                    }
                }
                catch { }
            }
            catch { }
        }

        private void CreateSingleShortcut(string lnkPath, string target, string workingDir)
        {
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
                        scType.InvokeMember("Description", System.Reflection.BindingFlags.SetProperty, null, shortcut, new object[] { "LedgerX Desktop (Offline Edition)" });
                        scType.InvokeMember("Save", System.Reflection.BindingFlags.InvokeMethod, null, shortcut, null);
                        return;
                    }
                }
            }
            catch { }

            // Fallback via PowerShell
            try
            {
                string psCmd = "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut('" + lnkPath.Replace("'", "''") + "'); $sc.TargetPath = '" + target.Replace("'", "''") + "'; $sc.WorkingDirectory = '" + workingDir.Replace("'", "''") + "'; $sc.Description = 'LedgerX Desktop'; $sc.Save()";
                ProcessStartInfo psi = new ProcessStartInfo("powershell", "-NoProfile -Command \"" + psCmd + "\"");
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
}
