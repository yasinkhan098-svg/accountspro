const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Manages monotonic time tracking to prevent users from rolling back
 * the system clock to cheat license validity.
 */
class TimeGuard {
  constructor(storageDir) {
    this.filePath = path.join(storageDir, 'guard.dat');
    this.secretKey = 'accounts_pro_time_guard_key_2027';
  }

  getLastRecordedTime() {
    try {
      if (!fs.existsSync(this.filePath)) {
        return 0;
      }
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const [timestampStr, signature] = raw.split('::');
      const expectedSig = crypto.createHmac('sha256', this.secretKey).update(timestampStr).digest('hex');
      if (signature !== expectedSig) {
        // Tampered file! Return current time or far future to trigger check
        return Date.now() + 86400000;
      }
      return parseInt(timestampStr, 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  recordTime(timeMs = Date.now()) {
    try {
      const last = this.getLastRecordedTime();
      // Only advance time forward
      const newTime = Math.max(last, timeMs);
      const str = String(newTime);
      const sig = crypto.createHmac('sha256', this.secretKey).update(str).digest('hex');
      fs.writeFileSync(this.filePath, `${str}::${sig}`, 'utf8');
      return newTime;
    } catch (e) {
      console.error('Failed to record time guard:', e);
      return timeMs;
    }
  }

  isClockRolledBack() {
    const last = this.getLastRecordedTime();
    if (last === 0) return false;
    const now = Date.now();
    // Allow 15 minutes tolerance for drift/timezone daylight savings
    const TOLERANCE_MS = 15 * 60 * 1000;
    if (now < last - TOLERANCE_MS) {
      return true; // Clock was rolled back!
    }
    return false;
  }
}

module.exports = { TimeGuard };
