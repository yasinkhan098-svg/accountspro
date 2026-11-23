/**
 * Automated macOS Client-Side Applications & DMG Builder
 * Generates:
 * 1. public/downloads/LedgerX-Client-Setup.dmg (Offline LAN Client)
 * 2. public/downloads/LedgerX-Online-Client.dmg (Online Cloud Client)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function buildMacOSClients() {
  const projectRoot = path.resolve(__dirname, '..');
  const downloadsDir = path.join(projectRoot, 'public', 'downloads');
  fs.mkdirSync(downloadsDir, { recursive: true });

  console.log('=== Step 1: Building LedgerX Offline LAN Client for macOS ===');
  const lanClientDist = path.join(projectRoot, 'dist', 'mac-client');
  const lanAppDir = path.join(lanClientDist, 'LedgerX Client.app');
  const lanContents = path.join(lanAppDir, 'Contents');
  const lanMacOS = path.join(lanContents, 'MacOS');
  const lanResources = path.join(lanContents, 'Resources');
  const lanAppSource = path.join(lanResources, 'app');

  fs.mkdirSync(lanMacOS, { recursive: true });
  fs.mkdirSync(lanAppSource, { recursive: true });

  // 1A. Info.plist for LAN Client
  const lanPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>LedgerX Client</string>
  <key>CFBundleDisplayName</key>
  <string>LedgerX LAN Client</string>
  <key>CFBundleIdentifier</key>
  <string>com.accountspro.ledgerx.lanclient</string>
  <key>CFBundleVersion</key>
  <string>2.5.0</string>
  <key>CFBundleShortVersionString</key>
  <string>2.5.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleSignature</key>
  <string>LXCL</string>
  <key>CFBundleExecutable</key>
  <string>LedgerXClient</string>
  <key>CFBundleIconFile</key>
  <string>app.icns</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
  </dict>
</dict>
</plist>`;
  fs.writeFileSync(path.join(lanContents, 'Info.plist'), lanPlist, 'utf-8');
  fs.writeFileSync(path.join(lanContents, 'PkgInfo'), 'APPL????', 'utf-8');

  // 1B. Launcher script with Auto-Discovery for LAN Client
  const lanLauncherScript = `#!/bin/bash
DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
CONFIG_DIR="$HOME/.ledgerx"
CONFIG_FILE="$CONFIG_DIR/client_host.txt"
mkdir -p "$CONFIG_DIR"

ACTIVE_HOST=""

# 1. Quick check on cached host IP
if [ -f "$CONFIG_FILE" ]; then
  CACHED_IP=$(cat "$CONFIG_FILE" | tr -d '[:space:]')
  if [ -n "$CACHED_IP" ]; then
    if curl -s --connect-timeout 0.3 "http://$CACHED_IP:45454/api/lan/info" 2>/dev/null | grep -q "isHostRunning"; then
      ACTIVE_HOST="$CACHED_IP"
    fi
  fi
fi

# 2. Known direct host IPs
if [ -z "$ACTIVE_HOST" ]; then
  KNOWN_HOSTS=("192.168.240.48" "127.0.0.1" "192.168.1.205" "192.168.240.205")
  for IP in "\${KNOWN_HOSTS[@]}"; do
    if curl -s --connect-timeout 0.25 "http://$IP:45454/api/lan/info" 2>/dev/null | grep -q "isHostRunning"; then
      ACTIVE_HOST="$IP"
      echo "$ACTIVE_HOST" > "$CONFIG_FILE"
      break
    fi
  done
fi

# 3. Fast subnet probe
if [ -z "$ACTIVE_HOST" ]; then
  LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
  if [ -n "$LOCAL_IP" ]; then
    SUBNET=$(echo "$LOCAL_IP" | cut -d. -f1-3)
    COMMON_ENDS=(48 1 2 10 20 50 100 200 205)
    for END in "\${COMMON_ENDS[@]}"; do
      TARGET="$SUBNET.$END"
      if curl -s --connect-timeout 0.2 "http://$TARGET:45454/api/lan/info" 2>/dev/null | grep -q "isHostRunning"; then
        ACTIVE_HOST="$TARGET"
        echo "$ACTIVE_HOST" > "$CONFIG_FILE"
        break
      fi
    done
  fi
fi

if [ -n "$ACTIVE_HOST" ]; then
  TARGET_URL="http://$ACTIVE_HOST:45454/?lan_client=1&host=$ACTIVE_HOST"
else
  TARGET_URL="http://192.168.240.48:45454/?lan_client=1"
fi

open -a "Safari" "$TARGET_URL"
`;
  fs.writeFileSync(path.join(lanMacOS, 'LedgerXClient'), lanLauncherScript, { encoding: 'utf-8', mode: 0o755 });

  // Copy electron client runner
  const clientPackageJson = {
    name: 'ledgerx-lan-client',
    version: '2.5.0',
    main: 'client.js'
  };
  fs.writeFileSync(path.join(lanAppSource, 'package.json'), JSON.stringify(clientPackageJson, null, 2), 'utf-8');

  // Copy client main
  const clientJs = `
const { app, BrowserWindow } = require('electron');
app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    title: 'LedgerX LAN Client',
    autoHideMenuBar: true
  });
  const url = process.argv[2] || 'http://127.0.0.1:45454/?lan_client=1';
  win.loadURL(url);
});
`;
  fs.writeFileSync(path.join(lanAppSource, 'client.js'), clientJs, 'utf-8');

  // 1C. README instruction for LAN Client
  const lanReadme = `LedgerX LAN Client for macOS (Apple Silicon & Intel)
=====================================================

INSTALLATION INSTRUCTIONS:
1. Drag 'LedgerX Client.app' into your Mac's 'Applications' folder.
2. Double-click 'LedgerX Client' to launch your billing counter terminal.
3. The app automatically discovers the Host PC on your local Wi-Fi/LAN on Port 45454.
4. No IP configuration or license key required on client terminals!

Cashier roles, POS sales, barcodes, and thermal printing work live in real-time.
`;
  fs.writeFileSync(path.join(lanClientDist, 'README.txt'), lanReadme, 'utf-8');

  console.log('=== Step 2: Building LedgerX Online Cloud Client for macOS ===');
  const cloudClientDist = path.join(projectRoot, 'dist', 'mac-cloud-client');
  const cloudAppDir = path.join(cloudClientDist, 'LedgerX Cloud Client.app');
  const cloudContents = path.join(cloudAppDir, 'Contents');
  const cloudMacOS = path.join(cloudContents, 'MacOS');
  const cloudResources = path.join(cloudContents, 'Resources');
  const cloudAppSource = path.join(cloudResources, 'app');

  fs.mkdirSync(cloudMacOS, { recursive: true });
  fs.mkdirSync(cloudAppSource, { recursive: true });

  const cloudPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>LedgerX Cloud Client</string>
  <key>CFBundleDisplayName</key>
  <string>LedgerX Online Client</string>
  <key>CFBundleIdentifier</key>
  <string>com.accountspro.ledgerx.cloudclient</string>
  <key>CFBundleVersion</key>
  <string>2.5.0</string>
  <key>CFBundleShortVersionString</key>
  <string>2.5.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleSignature</key>
  <string>LXCC</string>
  <key>CFBundleExecutable</key>
  <string>LedgerXCloudClient</string>
  <key>CFBundleIconFile</key>
  <string>app.icns</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>`;
  fs.writeFileSync(path.join(cloudContents, 'Info.plist'), cloudPlist, 'utf-8');
  fs.writeFileSync(path.join(cloudContents, 'PkgInfo'), 'APPL????', 'utf-8');

  const cloudLauncherScript = `#!/bin/bash
TARGET_URL="https://www.ledgerxerp.com/?client_mode=1&online_client=1"
open -a "Safari" "$TARGET_URL"
`;
  fs.writeFileSync(path.join(cloudMacOS, 'LedgerXCloudClient'), cloudLauncherScript, { encoding: 'utf-8', mode: 0o755 });

  const cloudReadme = `LedgerX Online Cloud Client for macOS
=====================================

INSTALLATION INSTRUCTIONS:
1. Drag 'LedgerX Cloud Client.app' into your 'Applications' folder.
2. Launch to open your secure cloud accounting session instantly.
`;
  fs.writeFileSync(path.join(cloudClientDist, 'README.txt'), cloudReadme, 'utf-8');

  console.log('Staging completed for macOS client bundles.');
}

buildMacOSClients().catch(console.error);
