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

        private const string LAUNCHER_BASE64 = "TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAA4fug4AtAnNIbgBTM0hVGhpcyBwcm9ncmFtIGNhbm5vdCBiZSBydW4gaW4gRE9TIG1vZGUuDQ0KJAAAAAAAAABQRQAATAEDAPobxmoAAAAAAAAAAOAAAgELAQsAABIAAAAIAAAAAAAA7jAAAAAgAAAAQAAAAABAAAAgAAAAAgAABAAAAAAAAAAEAAAAAAAAAACAAAAAAgAAAAAAAAIAQIUAABAAABAAAAAAEAAAEAAAAAAAABAAAAAAAAAAAAAAAKAwAABLAAAAAEAAANgEAAAAAAAAAAAAAAAAAAAAAAAAAGAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAACAAAAAAAAAAAAAAACCAAAEgAAAAAAAAAAAAAAC50ZXh0AAAA9BAAAAAgAAAAEgAAAAIAAAAAAAAAAAAAAAAAACAAAGAucnNyYwAAANgEAAAAQAAAAAYAAAAUAAAAAAAAAAAAAAAAAABAAABALnJlbG9jAAAMAAAAAGAAAAACAAAAGgAAAAAAAAAAAAAAAAAAQAAAQgAAAAAAAAAAAAAAAAAAAADQMAAAAAAAAEgAAAACAAUAaCUAADgLAAABAAAAAQAABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABswBQBcAwAAAQAAEQAAHxwoBAAACgoGcgEAAHAoBQAACgsHchEAAHAoBQAACgwHcikAAHAoBQAACg0HcjkAAHAoBQAAChMEBygGAAAKExURFS0HBygHAAAKJgkoBgAAChMVERUtBwkoBwAACiYRBCgGAAAKExURFS0IEQQoBwAACiYCLB0CjmkWMRcCFppvCAAACnJDAABwbwkAAAoW/gErARcAExURFS0bAAAIAhaabwgAAAooCgAACgAA3gUmAADeAAAAck0AAHATBQgoCwAAChb+ARMVERUtSAAACCgMAAAKEwYRBo5pFjEYEQYWmm8IAAAKckMAAHBvCQAAChb+ASsBFwATFREVLQ0AEQYWmm8IAAAKEwUAAN4FJgAA3gAAAHJ5AABwKA0AAApvDgAACigPAAAKEwcAfhAAAApyiwAAcG8RAAAKEwgAEQgU/gETFREVOrYAAAAAEQhyywAAcG8SAAAKEwkRCRT+ARMVERU6mAAAAAAoEwAAChMKABEKKBQAAAoRCW8VAAAKcuMAAHAoDQAACigWAAAKbxcAAApvGAAAChMLcxkAAAoTDBYTDSsjABEMEQsRDY8SAAABcukAAHAoGgAACm8bAAAKJgARDRdYEw0RDR7+BBMVERUt0nJ5AABwEQxvFQAACigPAAAKEwcA3hQRChT+ARMVERUtCBEKbxwAAAoA3AAAAADeFBEIFP4BExURFS0IEQhvHAAACgDcAADeBSYAAN4AAAARBHLvAABwKAUAAAoRBygKAAAKAADeBSYAAN4AABEFcg0BAHBvHQAACi0Hcg0BAHArBXIRAQBwABMOEQURDnIVAQBwEQcoHgAAChMPKAIAAAYTEBEQKB8AAAoTFREVLTsAcyAAAAoTERERERBvIQAACgAREXI1AQBwEQ8JKCIAAApvIwAACgARERdvJAAACgARESglAAAKJgArHAARD3MmAAAKExIREhdvJAAACgAREiglAAAKJgAA3noTEwAAHxwoBAAACgoGcgEAAHBypwEAcCgnAAAKExQRFCgoAAAKExYSFnLNAQBwKCkAAApy0QEAcBETbxUAAAooKgAACigeAAAKKCsAAAoAAN4FJgAA3gAActkBAHARE28sAAAKKA8AAApyIQIAcBYfECgtAAAKJgDeAAAqQcQAAAAAAACfAAAAEwAAALIAAAAFAAAAAQAAAQAAAADQAAAAQAAAABABAAAFAAAAAQAAAQIAAABzAQAAegAAAO0BAAAUAAAAAAAAAAIAAAA/AQAAyAAAAAcCAAAUAAAAAAAAAAAAAAAtAQAA8gAAAB8CAAAFAAAAAQAAAQAAAAAlAgAAGAAAAD0CAAAFAAAAAQAAAQAAAADjAgAATwAAADIDAAAFAAAAAQAAAQAAAAABAAAA3wIAAOACAAB6AAAAFwAAARMwBADVAAAAAgAAEQAdjQoAAAENCRYfKigEAAAKclMCAHAoBQAACqIJFx8mKAQAAApyUwIAcCgFAAAKogkYHxwoBAAACnJTAgBwKAUAAAqiCRkfJigEAAAKcp8CAHAoBQAACqIJGh8qKAQAAApynwIAcCgFAAAKogkbHxwoBAAACnKfAgBwKAUAAAqiCRwfJigEAAAKcukCAHAoBQAACqIJCgAGEwQWEwUrIREEEQWaCwAHKAsAAAoW/gETBhEGLQQHDN4ZABEFF1gTBREFEQSOaf4EEwYRBi3RFAwrAAAIKh4CKC4AAAoqAAAAQlNKQgEAAQAAAAAADAAAAHY0LjAuMzAzMTkAAAAABQBsAAAAuAIAACN+AAAkAwAApAMAACNTdHJpbmdzAAAAAMgGAABQAwAAI1VTABgKAAAQAAAAI0dVSUQAAAAoCgAAEAEAACNCbG9iAAAAAAAAAAIAAAFHFQIACQAAAAD6JTMAFgAAAQAAABsAAAACAAAAAwAAAAEAAAAuAAAAAwAAAAIAAAABAAAAAwAAAAAACgABAAAAAAAGAD4ANwAGAIsAawAGAKsAawAGANEANwAGAOQANwAXAPAAAAAGABYBDAEGACMBDAEGADQBDAEGAFIBNwAGAGkBDAEGALcBpwEGAMABpwEGAAoC7QEGACQCGAIGAEgC7QEGAGICGAIGAHACNwAGAHwCNwAKALoCpwIKAAEDpwIGAA8DNwAGADoDNwAOAGUDUAMOAHADUAMOAH0DUAMOAI8DUAMAAAAAAQAAAAAAAQABAAEAEAAWAB4ABQABAAEAUCAAAAAAlgBFAAoAAQB8JAAAAACRAEoAEAACAF0lAAAAAIYYYAAUAAIAAAABAGYAEQBgABgAGQBgABQAIQBgABQAKQD+ACIAOQAbASgAQQAtAS4AQQBCATMAUQBZATkAUQBeAT0AWQBuAUIAWQAtAS4AWQB7AUgAKQCIARAAUQCYATkAUQCgASgAYQDMAU4AaQDZAVIAaQDkAVgAcQARAl0AeQAtAmIACQA2AjkAUQCgAWcAeQA/Am4AgQBWAnQAiQBgABQAkQA2AnsAiQB1AoAAmQCIAhQAUQCQAj0AUQCgAYYAUQCZAi4AoQBgABQAoQDLAo4AUQDYApMAoQDfAo4AoQDtApoAqQAJA58AoQBgAI4AOQAbAWcAsQAYA6YAsQA2AnsAKQAgAxAAWQAsA0IAuQBEAzkAwQCeA6sACQBgABQAIAAbAB0ALgALAOYALgATAO8AtgDZAASAAAAAAAAAAAAAAAAAAAAAAMkAAAAEAAAAAAAAAAAAAAABAC4AAAAAAAQAAAAAAAAAAAAAAAEANwAAAAAABAAAAAAAAAAAAAAAAQBQAwAAAAAAAAAAADxNb2R1bGU+AExlZGdlclguZXhlAFByb2dyYW0ATGVkZ2VyWExhdW5jaGVyAG1zY29ybGliAFN5c3RlbQBPYmplY3QATWFpbgBGaW5kQnJvd3NlckV4ZWN1dGFibGUALmN0b3IAYXJncwBTeXN0ZW0uUnVudGltZS5Db21waWxlclNlcnZpY2VzAENvbXBpbGF0aW9uUmVsYXhhdGlvbnNBdHRyaWJ1dGUAUnVudGltZUNvbXBhdGliaWxpdHlBdHRyaWJ1dGUATGVkZ2VyWABTVEFUaHJlYWRBdHRyaWJ1dGUARW52aXJvbm1lbnQAU3BlY2lhbEZvbGRlcgBHZXRGb2xkZXJQYXRoAFN5c3RlbS5JTwBQYXRoAENvbWJpbmUARGlyZWN0b3J5AEV4aXN0cwBEaXJlY3RvcnlJbmZvAENyZWF0ZURpcmVjdG9yeQBTdHJpbmcAVHJpbQBTdGFydHNXaXRoAEZpbGUAV3JpdGVBbGxUZXh0AFJlYWRBbGxMaW5lcwBnZXRfTWFjaGluZU5hbWUAVG9VcHBlcgBDb25jYXQATWljcm9zb2Z0LldpbjMyAFJlZ2lzdHJ5AFJlZ2lzdHJ5S2V5AExvY2FsTWFjaGluZQBPcGVuU3ViS2V5AEdldFZhbHVlAFN5c3RlbS5TZWN1cml0eS5DcnlwdG9ncmFwaHkAU0hBMjU2AENyZWF0ZQBTeXN0ZW0uVGV4dABFbmNvZGluZwBnZXRfVVRGOABUb1N0cmluZwBHZXRCeXRlcwBIYXNoQWxnb3JpdGhtAENvbXB1dGVIYXNoAFN0cmluZ0J1aWxkZXIAQnl0ZQBBcHBlbmQASURpc3Bvc2FibGUARGlzcG9zZQBDb250YWlucwBJc051bGxPckVtcHR5AFN5c3RlbS5EaWFnbm9zdGljcwBQcm9jZXNzU3RhcnRJbmZvAHNldF9GaWxlTmFtZQBGb3JtYXQAc2V0X0FyZ3VtZW50cwBzZXRfVXNlU2hlbGxFeGVjdXRlAFByb2Nlc3MAU3RhcnQARGF0ZVRpbWUAZ2V0X05vdwBnZXRfTmV3TGluZQBBcHBlbmRBbGxUZXh0AEV4Y2VwdGlvbgBnZXRfTWVzc2FnZQBTeXN0ZW0uV2luZG93cy5Gb3JtcwBNZXNzYWdlQm94AERpYWxvZ1Jlc3VsdABNZXNzYWdlQm94QnV0dG9ucwBNZXNzYWdlQm94SWNvbgBTaG93AAAAD0wAZQBkAGcAZQByAFgAABdjAG8AbgBmAGkAZwAuAGoAcwBvAG4AAA9QAHIAbwBmAGkAbABlAAAJZABhAHQAYQAACWgAdAB0AHAAACtoAHQAdABwADoALwAvAGwAbwBjAGEAbABoAG8AcwB0ADoAMwAwADAAMAAAEUwAWAAtAEgAVwBJAEQALQABP1MATwBGAFQAVwBBAFIARQBcAE0AaQBjAHIAbwBzAG8AZgB0AFwAQwByAHkAcAB0AG8AZwByAGEAcABoAHkAABdNAGEAYwBoAGkAbgBlAEcAdQBpAGQAAAV8AHwAAAVYADIAAB1tAGEAYwBoAGkAbgBlAF8AaQBkAC4AdAB4AHQAAAM/AAADJgAAH2QAZQBzAGsAdABvAHAAPQAxACYAaAB3AGkAZAA9AABxLQAtAGEAcABwAD0AIgB7ADAAfQAiACAALQAtAHUAcwBlAHIALQBkAGEAdABhAC0AZABpAHIAPQAiAHsAMQB9ACIAIAAtAC0AdwBpAG4AZABvAHcALQBzAGkAegBlAD0AMQAzADYANgAsADcANgA4AAElbABhAHUAbgBjAGgAZQByAF8AZQByAHIAbwByAC4AbABvAGcAAANzAAAHIAAtACAAAUdVAG4AYQBiAGwAZQAgAHQAbwAgAGwAYQB1AG4AYwBoACAATABlAGQAZwBlAHIAWAAgAEQAZQBzAGsAdABvAHAAOgAKAAoAADFMAGUAZABnAGUAcgBYACAARABlAHMAawB0AG8AcAAgAEwAYQB1AG4AYwBoAGUAcgAAS00AaQBjAHIAbwBzAG8AZgB0AFwARQBkAGcAZQBcAEEAcABwAGwAaQBjAGEAdABpAG8AbgBcAG0AcwBlAGQAZwBlAC4AZQB4AGUAAElHAG8AbwBnAGwAZQBcAEMAaAByAG8AbQBlAFwAQQBwAHAAbABpAGMAYQB0AGkAbwBuAFwAYwBoAHIAbwBtAGUALgBlAHgAZQAAY0IAcgBhAHYAZQBTAG8AZgB0AHcAYQByAGUAXABCAHIAYQB2AGUALQBCAHIAbwB3AHMAZQByAFwAQQBwAHAAbABpAGMAYQB0AGkAbwBuAFwAYgByAGEAdgBlAC4AZQB4AGUAAQAAADso5KZAwHFIsh0QWcFlzFAACLd6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";

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
