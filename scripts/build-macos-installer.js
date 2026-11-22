/**
 * Automated macOS DMG Installer Builder for LedgerX
 * Prepares LedgerX.app bundle and compiles LedgerX-Setup.dmg
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function buildMacOSInstaller() {
  console.log('=== Step 1: Preparing LedgerX macOS Application Bundle ===');
  const projectRoot = path.resolve(__dirname, '..');
  const distDir = path.join(projectRoot, 'dist', 'mac');
  const appBundleDir = path.join(distDir, 'LedgerX.app');
  const contentsDir = path.join(appBundleDir, 'Contents');
  const macOSDir = path.join(contentsDir, 'MacOS');
  const resourcesDir = path.join(contentsDir, 'Resources');
  const appDir = path.join(resourcesDir, 'app');

  // Ensure directories exist
  fs.mkdirSync(macOSDir, { recursive: true });
  fs.mkdirSync(appDir, { recursive: true });

  // 1. Write Info.plist
  console.log('=== Step 2: Generating Contents/Info.plist ===');
  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>LedgerX</string>
  <key>CFBundleDisplayName</key>
  <string>LedgerX Accounting &amp; POS</string>
  <key>CFBundleIdentifier</key>
  <string>com.accountspro.ledgerx</string>
  <key>CFBundleVersion</key>
  <string>2.4.0</string>
  <key>CFBundleShortVersionString</key>
  <string>2.4.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleSignature</key>
  <string>LDGX</string>
  <key>CFBundleExecutable</key>
  <string>LedgerX</string>
  <key>CFBundleIconFile</key>
  <string>app.icns</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>NSSupportsAutomaticGraphicsSwitching</key>
  <true/>
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
  </dict>
</dict>
</plist>`;
  fs.writeFileSync(path.join(contentsDir, 'Info.plist'), infoPlist, 'utf-8');

  // 2. Write PkgInfo
  fs.writeFileSync(path.join(contentsDir, 'PkgInfo'), 'APPL????', 'utf-8');

  // 3. Write native launch script / binary
  console.log('=== Step 3: Preparing macOS Launch Script ===');
  const launcherScript = `#!/bin/bash
DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
APP_DIR="$DIR/../Resources/app"

# Check if electron is available globally or bundled
if command -v electron &> /dev/null; then
  exec electron "$APP_DIR" "$@"
elif [ -f "$DIR/Electron" ]; then
  exec "$DIR/Electron" "$APP_DIR" "$@"
elif command -v npx &> /dev/null; then
  exec npx --yes electron "$APP_DIR" "$@"
else
  # Direct WebApp fallback in full-screen WebKit app mode
  open -a "Safari" "https://www.ledgerxerp.com?desktop=1"
fi
`;
  const launcherPath = path.join(macOSDir, 'LedgerX');
  fs.writeFileSync(launcherPath, launcherScript, { encoding: 'utf-8', mode: 0o755 });

  // 4. Copy electron runtime files into Contents/Resources/app
  console.log('=== Step 4: Copying Electron Source Files ===');
  const electronFiles = ['main.js', 'preload.js', 'hardwareFingerprint.js', 'timeGuard.js', 'package.json'];
  for (const f of electronFiles) {
    const src = path.join(projectRoot, 'electron', f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(appDir, f));
    }
  }

  // 5. Build DMG if running on macOS (hdiutil is available)
  const outputDmgDir = path.join(projectRoot, 'public', 'downloads');
  fs.mkdirSync(outputDmgDir, { recursive: true });
  const outputDmgPath = path.join(outputDmgDir, 'LedgerX-Setup.dmg');

  if (process.platform === 'darwin') {
    console.log('=== Step 5: Packaging with Apple hdiutil on macOS ===');
    try {
      // Create /Applications symlink inside dist folder
      const appSymlink = path.join(distDir, 'Applications');
      if (!fs.existsSync(appSymlink)) {
        try { execSync(`ln -s /Applications "${appSymlink}"`); } catch (_) {}
      }

      // Remove existing DMG if any
      if (fs.existsSync(outputDmgPath)) fs.unlinkSync(outputDmgPath);

      // Create pristine UDZO compressed DMG
      execSync(`hdiutil create -volname "LedgerX" -srcfolder "${distDir}" -ov -format UDZO "${outputDmgPath}"`, { stdio: 'inherit' });
      console.log('macOS DMG generated successfully at:', outputDmgPath);
    } catch (err) {
      console.error('Failed to create DMG via hdiutil:', err);
    }
  } else {
    console.log('=== Step 5: Running on Windows/Non-Darwin Platform ===');
    console.log('LedgerX.app bundle staged in dist/mac.');
    console.log('Full UDZO DMG compilation will execute via GitHub Actions macOS-latest runner.');
  }
}

buildMacOSInstaller().catch(console.error);
