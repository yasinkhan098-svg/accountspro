$startup = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup\LedgerX.lnk')
$target = 'C:\Users\yasin\AppData\Local\LedgerX\LedgerX.exe'

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($startup)
$Shortcut.TargetPath = $target
$Shortcut.WorkingDirectory = 'C:\Users\yasin\AppData\Local\LedgerX'
$Shortcut.Save()
Write-Output "Successfully installed LedgerX into Windows Startup!"
