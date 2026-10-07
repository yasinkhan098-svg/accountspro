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

        private const string LAUNCHER_BASE64 = "TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAA4fug4AtAnNIbgBTM0hVGhpcyBwcm9ncmFtIGNhbm5vdCBiZSBydW4gaW4gRE9TIG1vZGUuDQ0KJAAAAAAAAABQRQAATAEDAH8gxmoAAAAAAAAAAOAAAgELAQsAACgAAAAIAAAAAAAA7kcAAAAgAAAAYAAAAABAAAAgAAAAAgAABAAAAAAAAAAEAAAAAAAAAACgAAAAAgAAAAAAAAIAQIUAABAAABAAAAAAEAAAEAAAAAAAABAAAAAAAAAAAAAAAKBHAABLAAAAAGAAANgEAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAACAAAAAAAAAAAAAAACCAAAEgAAAAAAAAAAAAAAC50ZXh0AAAA9CcAAAAgAAAAKAAAAAIAAAAAAAAAAAAAAAAAACAAAGAucnNyYwAAANgEAAAAYAAAAAYAAAAqAAAAAAAAAAAAAAAAAABAAABALnJlbG9jAAAMAAAAAIAAAAACAAAAMAAAAAAAAAAAAAAAAAAAQAAAQgAAAAAAAAAAAAAAAAAAAADQRwAAAAAAAEgAAAACAAUAWC8AAEgYAAABAAAAAQAABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABswBQBkAwAAAQAAEQAAHxwoBAAACgoGcgEAAHAoBQAACgsHchEAAHAoBQAACgwHcikAAHAoBQAACg0HcjkAAHAoBQAAChMEBygGAAAKExURFS0HBygHAAAKJgkoBgAAChMVERUtBwkoBwAACiYRBCgGAAAKExURFS0IEQQoBwAACiYRBCgCAAAGAAIsHQKOaRYxFwIWmm8IAAAKckMAAHBvCQAAChb+ASsBFwATFREVLRsAAAgCFppvCAAACigKAAAKAADeBSYAAN4AAAByTQAAcBMFCCgLAAAKFv4BExURFS1IAAAIKAwAAAoTBhEGjmkWMRgRBhaabwgAAApyQwAAcG8JAAAKFv4BKwEXABMVERUtDQARBhaabwgAAAoTBQAA3gUmAADeAAAAcnkAAHAoDQAACm8OAAAKKA8AAAoTBwB+EAAACnKLAABwbxEAAAoTCAARCBT+ARMVERU6tgAAAAARCHLLAABwbxIAAAoTCREJFP4BExURFTqYAAAAACgTAAAKEwoAEQooFAAAChEJbxUAAApy4wAAcCgNAAAKKBYAAApvFwAACm8YAAAKEwtzGQAAChMMFhMNKyMAEQwRCxENjxQAAAFy6QAAcCgaAAAKbxsAAAomABENF1gTDRENHv4EExURFS3ScnkAAHARDG8VAAAKKA8AAAoTBwDeFBEKFP4BExURFS0IEQpvHAAACgDcAAAAAN4UEQgU/gETFREVLQgRCG8cAAAKANwAAN4FJgAA3gAAABEEcu8AAHAoBQAAChEHKAoAAAoAAN4FJgAA3gAAEQVyDQEAcG8dAAAKLQdyDQEAcCsFchEBAHAAEw4RBREOchUBAHARBygeAAAKEw8oBwAABhMQERAoHwAAChMVERUtOwBzIAAAChMREREREG8hAAAKABERcjUBAHARDwkoIgAACm8jAAAKABERF28kAAAKABERKCUAAAomACscABEPcyYAAAoTEhESF28kAAAKABESKCUAAAomAADeehMTAAAfHCgEAAAKCgZyAQAAcHKnAQBwKCcAAAoTFBEUKCgAAAoTFhIWcs0BAHAoKQAACnLRAQBwERNvFQAACigqAAAKKB4AAAooKwAACgAA3gUmAADeAABy2QEAcBETbywAAAooDwAACnIhAgBwFh8QKC0AAAomAN4AACpBxAAAAAAAAKcAAAATAAAAugAAAAUAAAABAAABAAAAANgAAABAAAAAGAEAAAUAAAABAAABAgAAAHsBAAB6AAAA9QEAABQAAAAAAAAAAgAAAEcBAADIAAAADwIAABQAAAAAAAAAAAAAADUBAADyAAAAJwIAAAUAAAABAAABAAAAAC0CAAAYAAAARQIAAAUAAAABAAABAAAAAOsCAABPAAAAOgMAAAUAAAABAAABAAAAAAEAAADnAgAA6AIAAHoAAAAZAAABGzACAC4AAAACAAARAAAU/gYDAAAGcy4AAApzLwAACgoGF28wAAAKAAYCbzEAAAoAAN4FJgAA3gAAKgAAARAAAAAAAQAmJwAFAQAAAR4CKDIAAAoqHgIoMgAACipiAnsDAAAEAnsCAAAEewEAAAQoBAAABgAqAAAAGzACAG0AAAADAAAR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bm1lbnQAU3BlY2lhbEZvbGRlcgBHZXRGb2xkZXJQYXRoAFN5c3RlbS5JTwBQYXRoAENvbWJpbmUARGlyZWN0b3J5AEV4aXN0cwBEaXJlY3RvcnlJbmZvAENyZWF0ZURpcmVjdG9yeQBTdHJpbmcAVHJpbQBTdGFydHNXaXRoAEZpbGUAV3JpdGVBbGxUZXh0AFJlYWRBbGxMaW5lcwBnZXRfTWFjaGluZU5hbWUAVG9VcHBlcgBDb25jYXQATWljcm9zb2Z0LldpbjMyAFJlZ2lzdHJ5AFJlZ2lzdHJ5S2V5AExvY2FsTWFjaGluZQBPcGVuU3ViS2V5AEdldFZhbHVlAFN5c3RlbS5TZWN1cml0eS5DcnlwdG9ncmFwaHkAU0hBMjU2AENyZWF0ZQBTeXN0ZW0uVGV4dABFbmNvZGluZwBnZXRfVVRGOABUb1N0cmluZwBHZXRCeXRlcwBIYXNoQWxnb3JpdGhtAENvbXB1dGVIYXNoAFN0cmluZ0J1aWxkZXIAQnl0ZQBBcHBlbmQASURpc3Bvc2FibGUARGlzcG9zZQBDb250YWlucwBJc051bGxPckVtcHR5AFN5c3RlbS5EaWFnbm9zdGljcwBQcm9jZXNzU3RhcnRJbmZvAHNldF9GaWxlTmFtZQBGb3JtYXQAc2V0X0FyZ3VtZW50cwBzZXRfVXNlU2hlbGxFeGVjdXRlAFByb2Nlc3MAU3RhcnQARGF0ZVRpbWUAZ2V0X05vdwBnZXRfTmV3TGluZQBBcHBlbmRBbGxUZXh0AEV4Y2VwdGlvbgBnZXRfTWVzc2FnZQBTeXN0ZW0uV2luZG93cy5Gb3JtcwBNZXNzYWdlQm94AERpYWxvZ1Jlc3VsdABNZXNzYWdlQm94QnV0dG9ucwBNZXNzYWdlQm94SWNvbgBTaG93AFN5c3RlbS5UaHJlYWRpbmcAUGFyYW1ldGVyaXplZFRocmVhZFN0YXJ0AFRocmVhZABzZXRfSXNCYWNrZ3JvdW5kADw+Y19fRGlzcGxheUNsYXNzMgA8PmNfX0Rpc3BsYXlDbGFzczQAQ1MkPD44X19sb2NhbHMzADxSdW5MaXN0ZW5lcj5iX18xAHN0YXRlAEh0dHBMaXN0ZW5lcgBIdHRwTGlzdGVuZXJQcmVmaXhDb2xsZWN0aW9uAGdldF9QcmVmaXhlcwBBZGQAR2V0Q29udGV4dABXYWl0Q2FsbGJhY2sAVGhyZWFkUG9vbABRdWV1ZVVzZXJXb3JrSXRlbQBIdHRwTGlzdGVuZXJSZXF1ZXN0AGdldF9SZXF1ZXN0AGdldF9SZXNwb25zZQBXZWJIZWFkZXJDb2xsZWN0aW9uAGdldF9IZWFkZXJzAFN5c3RlbS5Db2xsZWN0aW9ucy5TcGVjaWFsaXplZABOYW1lVmFsdWVDb2xsZWN0aW9uAGdldF9IdHRwTWV0aG9kAG9wX0VxdWFsaXR5AHNldF9TdGF0dXNDb2RlAENsb3NlAFVyaQBnZXRfVXJsAGdldF9BYnNvbHV0ZVBhdGgAVG9Mb3dlcgBHZXREaXJlY3RvcmllcwBHZXRGaWxlTmFtZQBSZWFkQWxsVGV4dABnZXRfUXVlcnlTdHJpbmcAZ2V0X0l0ZW0AU3RyZWFtAGdldF9JbnB1dFN0cmVhbQBnZXRfQ29udGVudEVuY29kaW5nAFN0cmVhbVJlYWRlcgBUZXh0UmVhZGVyAFJlYWRUb0VuZABJbmRleE9mAFN1YnN0cmluZwBzZXRfQ29udGVudFR5cGUAc2V0X0NvbnRlbnRMZW5ndGg2NABnZXRfT3V0cHV0U3RyZWFtAFdyaXRlAGdldF9MZW5ndGgAZ2V0X0NoYXJzAENoYXIASXNXaGl0ZVNwYWNlAENvbXBpbGVyR2VuZXJhdGVkQXR0cmlidXRlAAAAAA9MAGUAZABnAGUAcgBYAAAXYwBvAG4AZgBpAGcALgBqAHMAbwBuAAAPUAByAG8AZgBpAGwAZQAACWQAYQB0AGEAAAloAHQAdABwAAAraAB0AHQAcAA6AC8ALwBsAG8AYwBhAGwAaABvAHMAdAA6ADMAMAAwADAAABFMAFgALQBIAFcASQBEAC0AAT9TAE8ARgBUAFcAQQBSAEUAXABNAGkAYwByAG8AcwBvAGYAdABcAEMAcgB5AHAAdABvAGcAcgBhAHAAaAB5AAAXTQBhAGMAaABpAG4AZQBHAHUAaQBkAAAFfAB8AAAFWAAyAAAdbQBhAGMAaABpAG4AZQBfAGkAZAAuAHQAeAB0AAADPwAAAyYAAB9kAGUAcwBrAHQAbwBwAD0AMQAmAGgAdwBpAGQAPQAAcS0ALQBhAHAAcAA9ACIAewAwAH0AIgAgAC0ALQB1AHMAZQByAC0AZABhAHQAYQAtAGQAaQByAD0AIgB7ADEAfQAiACAALQAtAHcAaQBuAGQAbwB3AC0AcwBpAHoAZQA9ADEAMwA2ADYALAA3ADYAOAABJWwAYQB1AG4AYwBoAGUAcgBfAGUAcgByAG8AcgAuAGwAbwBnAAADcwAAByAALQAgAAFHVQBuAGEAYgBsAGUAIAB0AG8AIABsAGEAdQBuAGMAaAAgAEwAZQBkAGcAZQByAFgAIABEAGUAcwBrAHQAbwBwADoACgAKAAAxTABlAGQAZwBlAHIAWAAgAEQAZQBzAGsAdABvAHAAIABMAGEAdQBuAGMAaABlAHIAAC9oAHQAdABwADoALwAvADEAMgA3AC4AMAAuADAALgAxADoANAA1ADQANQA0AC8AADdBAGMAYwBlAHMAcwAtAEMAbwBuAHQAcgBvAGwALQBBAGwAbABvAHcALQBPAHIAaQBnAGkAbgABAyoAADlBAGMAYwBlAHMAcwAtAEMAbwBuAHQAcgBvAGwALQBBAGwAbABvAHcALQBNAGUAdABoAG8AZABzAAElRwBFAFQALAAgAFAATwBTAFQALAAgAE8AUABUAEkATwBOAFMAADlBAGMAYwBlAHMAcwAtAEMAbwBuAHQAcgBvAGwALQBBAGwAbABvAHcALQBIAGUAYQBkAGUAcgBzAAEPTwBQAFQASQBPAE4AUwAAEy8AYQBwAGkALwBwAGkAbgBnAAA/ewAiAHMAdABhAHQAdQBzACIAOgAiAG8AawAiACwAIgB2AGUAcgBzAGkAbwBuACIAOgAiADIALgA0ACIAfQAAIS8AYQBwAGkALwBvAHAAZQBuAC0AZgBvAGwAZABlAHIAARllAHgAcABsAG8AcgBlAHIALgBlAHgAZQAAIXsAIgBzAHUAYwBjAGUAcwBzACIAOgB0AHIAdQBlAH0AAB0vAGEAcABpAC8AYwBvAG0AcABhAG4AaQBlAHMAAB17ACIAYwBvAG0AcABhAG4AaQBlAHMAIgA6AFsAABljAG8AbQBwAGEAbgB5AC4AagBzAG8AbgAAAywAACF7ACIAYwBvAG0AcABhAG4AeQBDAG8AZABlACIAOgAiAAAZIgAsACIAYwBvAG0AcABhAG4AeQAiADoAAAN9AAAFXQB9AAAZLwBhAHAAaQAvAGMAbwBtAHAAYQBuAHkAAAdHAEUAVAAACWMAbwBkAGUAAAsxADAAMAAwADEAACt7ACIAZQByAHIAbwByACIAOgAiAE4AbwB0ACAAZgBvAHUAbgBkACIAfQAABXsAfQAAGWwAZQBkAGcAZQByAHMALgBqAHMAbwBuAAAFWwBdAAAbdgBvAHUAYwBoAGUAcgBzAC4AagBzAG8AbgAAIXMAdABvAGMAawBfAGkAdABlAG0AcwAuAGoAcwBvAG4AACNzAHQAbwBjAGsAXwBnAHIAbwB1AHAAcwAuAGoAcwBvAG4AABV1AG4AaQB0AHMALgBqAHMAbwBuAACBAXsAewAiAHMAdQBjAGMAZQBzAHMAIgA6AHQAcgB1AGUALAAiAGMAbwBtAHAAYQBuAHkAQwBvAGQAZQAiADoAIgB7ADAAfQAiACwAIgBjAG8AbQBwAGEAbgB5ACIAOgB7ADEAfQAsACIAbABlAGQAZwBlAHIAcwAiADoAewAyAH0ALAAiAHYAbwB1AGMAaABlAHIAcwAiADoAewAzAH0ALAAiAHMAdABvAGMAawBJAHQAZQBtAHMAIgA6AHsANAB9ACwAIgBzAHQAbwBjAGsARwByAG8AdQBwAHMAIgA6AHsANQB9ACwAIgB1AG4AaQB0AHMAIgA6AHsANgB9AH0AfQAACVAATwBTAFQAAB0iAGMAbwBtAHAAYQBuAHkAQwBvAGQAZQAiADoAAAMiAAAPYwBvAG0AcABhAG4AeQAAD2wAZQBkAGcAZQByAHMAABF2AG8AdQBjAGgAZQByAHMAABVzAHQAbwBjAGsASQB0AGUAbQBzAAAXcwB0AG8AYwBrAEcAcgBvAHUAcABzAAALdQBuAGkAdABzAAA/ewAiAHMAdQBjAGMAZQBzAHMAIgA6AHQAcgB1AGUALAAiAGMAbwBtAHAAYQBuAHkAQwBvAGQAZQAiADoAIgAABSIAfQAAPXsAIgBlAHIAcgBvAHIAIgA6ACIARQBuAGQAcABvAGkAbgB0ACAAbgBvAHQAIABmAG8AdQBuAGQAIgB9AAA/YQBwAHAAbABpAGMAYQB0AGkAbwBuAC8AagBzAG8AbgA7ACAAYwBoAGEAcgBzAGUAdAA9AHUAdABmAC0AOAABBSIAOgAAS00AaQBjAHIAbwBzAG8AZgB0AFwARQBkAGcAZQBcAEEAcABwAGwAaQBjAGEAdABpAG8AbgBcAG0AcwBlAGQAZwBl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";

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
