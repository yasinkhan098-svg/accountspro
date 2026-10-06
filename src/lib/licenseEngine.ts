import crypto from 'crypto';

export interface LicensePayload {
  userId: number;
  email: string;
  licenseKey: string;
  machineId: string;
  deviceName?: string;
  plan: string;
  validUntil: string; // ISO String
  features: string[];
  issuedAt: string; // ISO String
}

const SIGNING_SECRET = process.env.LICENSE_SIGNING_SECRET || 'accounts_pro_offline_master_secret_2027';

/**
 * Creates an encrypted / cryptographically signed token for offline use
 */
export function createSignedLicenseToken(payload: LicensePayload): string {
  const json = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', SIGNING_SECRET).update(json).digest('hex');
  const tokenObj = {
    p: Buffer.from(json).toString('base64'),
    s: signature,
  };
  return Buffer.from(JSON.stringify(tokenObj)).toString('base64');
}

/**
 * Validates a signed license token on the client/desktop or server
 */
export function verifyLicenseToken(token: string, currentMachineId?: string): {
  valid: boolean;
  reason?: string;
  payload?: LicensePayload;
} {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const tokenObj = JSON.parse(raw);
    if (!tokenObj.p || !tokenObj.s) {
      return { valid: false, reason: 'Invalid token structure' };
    }

    const json = Buffer.from(tokenObj.p, 'base64').toString('utf-8');
    const expectedSignature = crypto.createHmac('sha256', SIGNING_SECRET).update(json).digest('hex');

    if (tokenObj.s !== expectedSignature) {
      return { valid: false, reason: 'Cryptographic signature mismatch (tampered token)' };
    }

    const payload: LicensePayload = JSON.parse(json);

    // Machine ID check (if hardware ID provided)
    if (currentMachineId && payload.machineId && payload.machineId !== currentMachineId) {
      return { valid: false, reason: 'Machine ID mismatch (license bound to another computer)' };
    }

    // Expiry check
    if (payload.validUntil) {
      const expiry = new Date(payload.validUntil).getTime();
      const now = Date.now();
      if (now > expiry) {
        return { valid: false, reason: 'License subscription has expired', payload };
      }
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, reason: err?.message || 'Token verification failed' };
  }
}

/**
 * Anti-Clock Rollback: Checks if system date was moved backwards to cheat expiry
 */
export function checkClockRollback(currentTimeMs: number, lastRecordedTimeMs: number): boolean {
  // Allow 15 minutes of tolerance for network / timezone drift
  const TOLERANCE_MS = 15 * 60 * 1000;
  if (currentTimeMs < lastRecordedTimeMs - TOLERANCE_MS) {
    return true; // Clock was rolled back!
  }
  return false;
}
