@echo off
:: ========================================================
:: LedgerX Desktop - Windows Firewall 1-Click Auto Config
:: ========================================================

:: Check for Administrator elevation
NET SESSION >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [INFO] Administrator rights required to configure Windows Firewall.
    echo Requesting Windows elevation (Click 'Yes' on the prompt)...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

title LedgerX Desktop - Firewall Configuration
color 0A
echo ========================================================
echo   LedgerX Accounting Host - Windows Firewall Rules
echo ========================================================
echo.
echo Enabling Inbound Port 45454 (TCP Proxy) and 45455 (UDP Beacon)...

netsh advfirewall firewall delete rule name="LedgerX Accounting Host (TCP)" >nul 2>&1
netsh advfirewall firewall delete rule name="LedgerX Discovery Beacon (UDP)" >nul 2>&1

netsh advfirewall firewall add rule name="LedgerX Accounting Host (TCP)" dir=in action=allow protocol=TCP localport=45454 profile=any
netsh advfirewall firewall add rule name="LedgerX Discovery Beacon (UDP)" dir=in action=allow protocol=UDP localport=45455 profile=any

echo.
echo [SUCCESS] Windows Firewall successfully configured!
echo Inbound traffic on Port 45454 and 45455 is now ALLOWED on all network profiles.
echo Client computers on your local Wi-Fi / LAN can now connect to 192.168.240.48:45454!
echo.
timeout /t 5
