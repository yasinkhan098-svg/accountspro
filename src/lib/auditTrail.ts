import crypto from 'crypto';
import { prisma } from './prisma';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export interface AuditActionParams {
  companyId: number;
  entityType?: string; // Default: "VOUCHER"
  entityId: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  voucherNo?: string;
  voucherType?: string;
  amount?: number;
  narration?: string;
  details?: any;
  performedBy?: string;
  ipAddress?: string;
}

/**
 * Computes deterministic SHA-256 hash for an audit log entry
 */
export function calculateAuditHash(params: {
  companyId: number;
  entityType: string;
  entityId: number;
  action: string;
  timestamp: string; // ISO string
  prevHash: string;
  detailsString: string;
}): string {
  const detailsHash = crypto.createHash('sha256').update(params.detailsString || '').digest('hex');
  const canonicalString = `${params.companyId}|${params.entityType}|${params.entityId}|${params.action}|${params.timestamp}|${params.prevHash}|${detailsHash}`;
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

let auditTableEnsured = false;
export async function ensureAuditTrailTable() {
  if (auditTableEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AuditTrail" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "companyId" INTEGER NOT NULL,
        "entityType" TEXT NOT NULL,
        "entityId" INTEGER NOT NULL,
        "action" TEXT NOT NULL,
        "voucherNo" TEXT,
        "voucherType" TEXT,
        "amount" REAL,
        "narration" TEXT,
        "details" TEXT,
        "performedBy" TEXT,
        "ipAddress" TEXT,
        "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "prevHash" TEXT NOT NULL,
        "currentHash" TEXT NOT NULL,
        FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AuditTrail_companyId_id_idx" ON "AuditTrail"("companyId", "id");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AuditTrail_companyId_entityType_entityId_idx" ON "AuditTrail"("companyId", "entityType", "entityId");`);
    auditTableEnsured = true;
  } catch (e) {
    console.error('ensureAuditTrailTable warning:', e);
  }
}

/**
 * Records a new cryptographically chained audit log entry.
 * Designed to be 100% fail-safe: any failure is caught and logged,
 * ensuring primary user accounting operations never fail.
 */
export async function logAuditAction(params: AuditActionParams) {
  try {
    await ensureAuditTrailTable();

    const {
      companyId,
      entityType = 'VOUCHER',
      entityId,
      action,
      voucherNo,
      voucherType,
      amount,
      narration,
      details,
      performedBy = 'System User',
      ipAddress
    } = params;

    if (!companyId) return null;

    // 1. Fetch previous log in chain for this company
    const lastLog = await prisma.auditTrail.findFirst({
      where: { companyId },
      orderBy: { id: 'desc' }
    });

    const prevHash = lastLog?.currentHash || GENESIS_HASH;
    const now = new Date();
    const detailsString = details
      ? (typeof details === 'string' ? details : JSON.stringify(details))
      : '';

    // 2. Calculate cryptographic current hash
    const currentHash = calculateAuditHash({
      companyId,
      entityType,
      entityId,
      action,
      timestamp: now.toISOString(),
      prevHash,
      detailsString
    });

    // 3. Persist log entry
    return await prisma.auditTrail.create({
      data: {
        companyId,
        entityType,
        entityId,
        action,
        voucherNo: voucherNo ? String(voucherNo) : null,
        voucherType: voucherType ? String(voucherType) : null,
        amount: amount !== undefined && !isNaN(amount) ? parseFloat(String(amount)) : null,
        narration: narration ? String(narration) : null,
        details: detailsString,
        performedBy: String(performedBy),
        ipAddress: ipAddress ? String(ipAddress) : null,
        timestamp: now,
        prevHash,
        currentHash
      }
    });
  } catch (error) {
    // Non-blocking fail-safe: Never disrupt normal voucher flow
    console.error('Audit Trail Logging Notice (Non-blocking):', error);
    return null;
  }
}

export interface VerificationResult {
  valid: boolean;
  totalLogs: number;
  verifiedAt: string;
  headHash?: string;
  tamperedLogId?: number;
  reason?: string;
  actionBreakdown: {
    creates: number;
    updates: number;
    deletes: number;
  };
}

/**
 * Verifies the entire cryptographic hash chain for a company.
 * Recalculates hashes from genesis to head and verifies all links.
 */
export async function verifyAuditChain(companyId: number): Promise<VerificationResult> {
  await ensureAuditTrailTable();

  const logs = await prisma.auditTrail.findMany({
    where: { companyId },
    orderBy: { id: 'asc' }
  });

  const breakdown = { creates: 0, updates: 0, deletes: 0 };
  for (const log of logs) {
    if (log.action === 'CREATE') breakdown.creates++;
    else if (log.action === 'UPDATE') breakdown.updates++;
    else if (log.action === 'DELETE') breakdown.deletes++;
  }

  if (logs.length === 0) {
    return {
      valid: true,
      totalLogs: 0,
      verifiedAt: new Date().toISOString(),
      headHash: GENESIS_HASH,
      actionBreakdown: breakdown
    };
  }

  for (let i = 0; i < logs.length; i++) {
    const current = logs[i];

    // Verify Previous Hash Link
    if (i === 0) {
      if (current.prevHash !== GENESIS_HASH) {
        return {
          valid: false,
          totalLogs: logs.length,
          verifiedAt: new Date().toISOString(),
          tamperedLogId: current.id,
          reason: `Genesis link invalid: Record #${current.id} does not start with valid genesis hash`,
          actionBreakdown: breakdown
        };
      }
    } else {
      const prev = logs[i - 1];
      if (current.prevHash !== prev.currentHash) {
        return {
          valid: false,
          totalLogs: logs.length,
          verifiedAt: new Date().toISOString(),
          tamperedLogId: current.id,
          reason: `Chain broken at Record #${current.id}: prevHash does not match previous record's hash (Record #${prev.id})`,
          actionBreakdown: breakdown
        };
      }
    }

    // Verify Content Cryptographic Integrity
    const expectedHash = calculateAuditHash({
      companyId: current.companyId,
      entityType: current.entityType,
      entityId: current.entityId,
      action: current.action,
      timestamp: current.timestamp.toISOString(),
      prevHash: current.prevHash,
      detailsString: current.details || ''
    });

    if (expectedHash !== current.currentHash) {
      return {
        valid: false,
        totalLogs: logs.length,
        verifiedAt: new Date().toISOString(),
        tamperedLogId: current.id,
        reason: `Cryptographic mismatch at Record #${current.id}: Data content was altered directly in database!`,
        actionBreakdown: breakdown
      };
    }
  }

  return {
    valid: true,
    totalLogs: logs.length,
    verifiedAt: new Date().toISOString(),
    headHash: logs[logs.length - 1].currentHash,
    actionBreakdown: breakdown
  };
}
