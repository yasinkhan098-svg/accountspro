const fs = require('fs');
const path = require('path');

if (process.env.VERCEL) {
  console.log('Skipping local desktop sync on Vercel deployment.');
  process.exit(0);
}

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}

const localApp = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Local');
const wwwDir = path.join(localApp, 'LedgerX', 'www');
const projectRoot = path.resolve(__dirname, '..');

console.log('Syncing updated production build to offline desktop directory:', wwwDir);

if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir, { recursive: true });
}

// 1. Copy public folder files
const publicDir = path.join(projectRoot, 'public');
if (fs.existsSync(publicDir)) {
  console.log('Copying public assets...');
  copyFolderRecursiveSync(publicDir, wwwDir);
}

// 2. Copy .next/static to www/_next/static
const nextStaticDir = path.join(projectRoot, '.next', 'static');
const destStaticDir = path.join(wwwDir, '_next', 'static');
if (fs.existsSync(nextStaticDir)) {
  console.log('Copying .next/static to www/_next/static...');
  copyFolderRecursiveSync(nextStaticDir, destStaticDir);
}

// 3. Copy .next/server/app/index.html to www/index.html
const serverHtml = path.join(projectRoot, '.next', 'server', 'app', 'index.html');
const destHtml = path.join(wwwDir, 'index.html');
if (fs.existsSync(serverHtml)) {
  console.log('Copying newly compiled index.html to www/index.html...');
  fs.copyFileSync(serverHtml, destHtml);
}

// 4. Clean Edge/Chrome Profile Service Worker & Code Cache so old cache is purged
const profileDir = path.join(localApp, 'LedgerX', 'Profile', 'Default');
if (fs.existsSync(profileDir)) {
  const cacheDirs = ['Cache', 'Code Cache', 'Service Worker'];
  for (const d of cacheDirs) {
    const targetCache = path.join(profileDir, d);
    if (fs.existsSync(targetCache)) {
      try {
        fs.rmSync(targetCache, { recursive: true, force: true });
        console.log(`Cleared stale browser profile cache: ${d}`);
      } catch (e) {
        console.warn(`Could not clear ${d}:`, e.message);
      }
    }
  }
}

console.log('Offline Desktop update completed successfully!');
