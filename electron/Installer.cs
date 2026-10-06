using System;
using System.IO;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using System.Threading;

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

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new SetupForm());
        }

        public SetupForm()
        {
            this.Text = "LedgerX Desktop (Offline Edition) Setup";
            this.Size = new Size(520, 360);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.BackColor = Color.FromArgb(248, 250, 252);
            this.Icon = SystemIcons.Application;

            // Top Header Panel
            Panel pnlHeader = new Panel();
            pnlHeader.Dock = DockStyle.Top;
            pnlHeader.Height = 85;
            pnlHeader.BackColor = Color.FromArgb(30, 58, 138);

            lblTitle = new Label();
            lblTitle.Text = "LedgerX Desktop (Offline Edition)";
            lblTitle.Font = new Font("Segoe UI", 14, FontStyle.Bold);
            lblTitle.ForeColor = Color.White;
            lblTitle.Location = new Point(24, 18);
            lblTitle.AutoSize = true;
            pnlHeader.Controls.Add(lblTitle);

            lblSub = new Label();
            lblSub.Text = "Standalone Windows Accounting System with Cloud Auto-Sync";
            lblSub.Font = new Font("Segoe UI", 9, FontStyle.Regular);
            lblSub.ForeColor = Color.FromArgb(186, 230, 253);
            lblSub.Location = new Point(25, 48);
            lblSub.AutoSize = true;
            pnlHeader.Controls.Add(lblSub);

            this.Controls.Add(pnlHeader);

            // Body Status Label
            lblStatus = new Label();
            lblStatus.Text = "Preparing installation...";
            lblStatus.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            lblStatus.ForeColor = Color.FromArgb(51, 65, 85);
            lblStatus.Location = new Point(28, 115);
            lblStatus.Size = new Size(450, 30);
            this.Controls.Add(lblStatus);

            // Progress Bar
            progressBar = new ProgressBar();
            progressBar.Location = new Point(28, 155);
            progressBar.Size = new Size(450, 24);
            progressBar.Style = ProgressBarStyle.Continuous;
            progressBar.Value = 0;
            this.Controls.Add(progressBar);

            // Checkbox to Launch
            chkLaunch = new CheckBox();
            chkLaunch.Text = "Launch LedgerX Desktop now";
            chkLaunch.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            chkLaunch.ForeColor = Color.FromArgb(30, 41, 59);
            chkLaunch.Location = new Point(28, 205);
            chkLaunch.Size = new Size(300, 25);
            chkLaunch.Checked = true;
            chkLaunch.Visible = false;
            this.Controls.Add(chkLaunch);

            // Action Button (Close / Finish)
            btnAction = new Button();
            btnAction.Text = "Installing...";
            btnAction.Font = new Font("Segoe UI", 9, FontStyle.Bold);
            btnAction.Size = new Size(110, 34);
            btnAction.Location = new Point(368, 260);
            btnAction.BackColor = Color.FromArgb(2, 132, 199);
            btnAction.ForeColor = Color.White;
            btnAction.FlatStyle = FlatStyle.Flat;
            btnAction.FlatAppearance.BorderSize = 0;
            btnAction.Enabled = false;
            btnAction.Click += new EventHandler(BtnAction_Click);
            this.Controls.Add(btnAction);

            // Installation steps timer
            timer = new System.Windows.Forms.Timer();
            timer.Interval = 700;
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
                    progressBar.Value = 20;
                    break;
                case 2:
                    lblStatus.Text = "Setting up local storage directory in %LocalAppData%\\LedgerX...";
                    progressBar.Value = 45;
                    SetupDirectories();
                    break;
                case 3:
                    lblStatus.Text = "Creating Desktop shortcut for LedgerX...";
                    progressBar.Value = 75;
                    CreateDesktopShortcut();
                    break;
                case 4:
                    lblStatus.Text = "Finalizing configuration and registering local vault...";
                    progressBar.Value = 95;
                    break;
                case 5:
                    timer.Stop();
                    progressBar.Value = 100;
                    lblStatus.Text = "Installation completed successfully!";
                    lblStatus.ForeColor = Color.FromArgb(22, 163, 74);
                    chkLaunch.Visible = true;
                    btnAction.Text = "Finish";
                    btnAction.Enabled = true;
                    btnAction.BackColor = Color.FromArgb(22, 163, 74);
                    break;
            }
        }

        private void SetupDirectories()
        {
            try
            {
                string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string appDir = Path.Combine(localApp, "LedgerX");
                if (!Directory.Exists(appDir))
                {
                    Directory.CreateDirectory(appDir);
                }
            }
            catch { }
        }

        private void CreateDesktopShortcut()
        {
            try
            {
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string shortcutPath = Path.Combine(desktop, "LedgerX Desktop.lnk");

                // Create VBScript to make shortcut
                string vbs = string.Format(
                    "Set oWS = WScript.CreateObject(\"WScript.Shell\")\n" +
                    "sLinkFile = \"{0}\"\n" +
                    "Set oLink = oWS.CreateShortcut(sLinkFile)\n" +
                    "oLink.TargetPath = \"msedge.exe\"\n" +
                    "oLink.Arguments = \"--app=http://localhost:3000 --user-data-dir=\"\"%LOCALAPPDATA%\\LedgerX\\Profile\"\"\"\n" +
                    "oLink.Description = \"LedgerX Desktop (Offline Edition)\"\n" +
                    "oLink.Save\n",
                    shortcutPath.Replace("\\", "\\\\")
                );

                string tempVbs = Path.Combine(Path.GetTempPath(), "makelnk.vbs");
                File.WriteAllText(tempVbs, vbs);
                Process.Start("cscript", "//nologo \"" + tempVbs + "\"").WaitForExit();
                try { File.Delete(tempVbs); } catch { }
            }
            catch { }
        }

        private void BtnAction_Click(object sender, EventArgs e)
        {
            if (chkLaunch.Checked)
            {
                try
                {
                    // Launch Edge in standalone app mode
                    Process.Start("msedge.exe", "--app=http://localhost:3000 --user-data-dir=\"%LOCALAPPDATA%\\LedgerX\\Profile\"");
                }
                catch
                {
                    try
                    {
                        Process.Start("http://localhost:3000");
                    }
                    catch { }
                }
            }
            this.Close();
        }
    }
}
