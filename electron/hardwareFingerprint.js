const { execSync } = require('child_process');
const crypto = require('crypto');
const os = require('os');

/**
 * Generates a unique, tamper-resistant Hardware Machine ID
 * based on Motherboard UUID, CPU ID, and MAC Address
 */
function getMachineId() {
  let rawComponents = [];

  try {
    if (process.platform === 'win32') {
      // 1. Motherboard UUID
      try {
        const uuidOutput = execSync('wmic csproduct get uuid', { timeout: 3000, encoding: 'utf8' });
        const uuid = uuidOutput.replace(/UUID/i, '').trim();
        if (uuid) rawComponents.push(uuid);
      } catch (e) {
        // Fallback to powershell
        try {
          const psOutput = execSync('powershell -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"', { timeout: 3000, encoding: 'utf8' });
          if (psOutput.trim()) rawComponents.push(psOutput.trim());
        } catch (e2) {}
      }

      // 2. CPU Processor ID
      try {
        const cpuOutput = execSync('wmic cpu get processorid', { timeout: 3000, encoding: 'utf8' });
        const cpuId = cpuOutput.replace(/ProcessorId/i, '').trim();
        if (cpuId) rawComponents.push(cpuId);
      } catch (e) {}

      // 3. Disk Serial Number
      try {
        const diskOutput = execSync('wmic diskdrive get serialnumber', { timeout: 3000, encoding: 'utf8' });
        const diskId = diskOutput.replace(/SerialNumber/i, '').trim().split('\n')[0];
        if (diskId) rawComponents.push(diskId.trim());
      } catch (e) {}
    } else if (process.platform === 'darwin') {
      // macOS: Hardware UUID & Serial Number via IORegistry (Tamper-proof, survives OS reinstalls)
      try {
        const uuidOutput = execSync('ioreg -rd1 -c IOPlatformExpertDevice', { timeout: 3000, encoding: 'utf8' });
        const uuidMatch = uuidOutput.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/i);
        if (uuidMatch && uuidMatch[1]) rawComponents.push(uuidMatch[1].trim());

        const serialMatch = uuidOutput.match(/"IOPlatformSerialNumber"\s*=\s*"([^"]+)"/i);
        if (serialMatch && serialMatch[1]) rawComponents.push(serialMatch[1].trim());
      } catch (e) {
        // Fallback to system_profiler
        try {
          const spOutput = execSync('system_profiler SPHardwareDataType', { timeout: 3000, encoding: 'utf8' });
          const spMatch = spOutput.match(/Hardware UUID:\s*([^\n]+)/i);
          if (spMatch && spMatch[1]) rawComponents.push(spMatch[1].trim());
        } catch (e2) {}
      }
    } else {
      // Linux fallback
      rawComponents.push(os.hostname());
    }
  } catch (err) {
    console.error('Error reading hardware fingerprint:', err);
  }

  // Fallback: network interfaces MAC
  if (rawComponents.length === 0) {
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
      for (const iface of interfaces[name] || []) {
        if (!iface.internal && iface.mac) {
          rawComponents.push(iface.mac);
          break;
        }
      }
    }
  }

  if (rawComponents.length === 0) {
    rawComponents.push(os.userInfo().username + '@' + os.platform());
  }

  // Salt and Hash
  const hash = crypto.createHash('sha256').update(rawComponents.join('||')).digest('hex');
  // Format as readable machine token: LX-HWID-XXXX-XXXX-XXXX
  return `LX-HWID-${hash.substring(0, 16).toUpperCase()}`;
}

module.exports = { getMachineId };
