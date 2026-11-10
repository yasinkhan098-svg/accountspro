@echo off
NET SESSION >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Requesting Administrator privileges to enable Windows Firewall rules...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)
echo ========================================================
echo   LedgerX Accounting Host - Windows Firewall Rules
echo ========================================================
netsh advfirewall firewall delete rule name="LedgerX Accounting Host (TCP)" >nul 2>&1
netsh advfirewall firewall delete rule name="LedgerX Discovery Beacon (UDP)" >nul 2>&1
netsh advfirewall firewall add rule name="LedgerX Accounting Host (TCP)" dir=in action=allow protocol=TCP localport=45454 profile=any
netsh advfirewall firewall add rule name="LedgerX Discovery Beacon (UDP)" dir=in action=allow protocol=UDP localport=45455 profile=any
echo [SUCCESS] Windows Firewall rules enabled! Inbound Port 45454 and 45455 are allowed.
timeout /t 5
