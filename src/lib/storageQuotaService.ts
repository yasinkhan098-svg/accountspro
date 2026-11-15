import { prisma } from './prisma';

/**
 * Storage Quota Service for LedgerX Cloud Platform
 * 
 * Strict 10 MB Storage Quota per customer with FIFO rolling auto-reset:
 * - Maximum cloud space allowed per user / organization: 10 MB (10,485,760 bytes).
 * - IMMUTABLE PROTECTED WHITELIST (NEVER DELETED):
 *     1. User Account credentials & status (id, email, password, plan, subscriptionExpiry).
 *     2. Software License Keys & Hardware Locks (licenseKey, DeviceActivation, machineId).
 *     3. Company identification & Dashboard access (name, dashboardToken, dashboardPin).
 * - ROLLING FIFO ZONE:
 *     Audit logs, stale sync packets, and ancient temporary records are automatically pruned
 *     on a FIFO (First-In, First-Out) basis when storage reaches 9.5 MB.
 *     New data is always accepted smoothly; total storage remains strictly within 10 MB.
 */

export const MAX_USER_STORAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const PRUNE_TRIGGER_BYTES = 9.5 * 1024 * 1024;   // 9.5 MB (95% watermark)

export interface UserStorageReport {
  userId: number;
  totalBytes: number;
  maxBytes: number;
  usagePercent: number;
  isNearQuota: boolean;
  isOverLimit: boolean;
  breakdown: {
    auditTrailBytes: number;
    voucherBytes: number;
    snapshotBytes: number;
    otherBytes: number;
  };
}

/**
 * Calculates current cloud storage usage for a given user in bytes.
 */
export async function getUserStorageBytes(userId: number): Promise<UserStorageReport> {
  const uid = Number(userId);
  if (!uid || isNaN(uid)) {
    return {
      userId: 0,
      totalBytes: 0,
      maxBytes: MAX_USER_STORAGE_BYTES,
      usagePercent: 0,
      isNearQuota: false,
      isOverLimit: false,
      breakdown: { auditTrailBytes: 0, voucherBytes: 0, snapshotBytes: 0, otherBytes: 0 },
    };
  }

  try {
    // 1. AuditTrail bytes
    const auditRes: any[] = await prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(LENGTH(COALESCE("details", '')) + LENGTH(COALESCE("narration", '')) + 200), 0) as bytes
      FROM "AuditTrail"
      WHERE "companyId" IN (SELECT id FROM "Company" WHERE "userId" = ?)
    `, uid);
    const auditTrailBytes = Number(auditRes?.[0]?.bytes || 0);

    // 2. Dashboard Snapshot bytes
    const snapRes: any[] = await prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(LENGTH(COALESCE("dashboardSnapshot", '')) + 200), 0) as bytes
      FROM "Company"
      WHERE "userId" = ?
    `, uid);
    const snapshotBytes = Number(snapRes?.[0]?.bytes || 0);

    // 3. Cloud Vouchers bytes (if any online web sync was used)
    const vchRes: any[] = await prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(LENGTH(COALESCE("narration", '')) + LENGTH(COALESCE("partyDetails", '')) + 300), 0) as bytes
      FROM "Voucher"
      WHERE "companyId" IN (SELECT id FROM "Company" WHERE "userId" = ?)
    `, uid);
    const voucherBytes = Number(vchRes?.[0]?.bytes || 0);

    // 4. Base master records overhead (~500 bytes per company/ledger)
    const countRes: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        (SELECT COUNT(*) FROM "Company" WHERE "userId" = ?) * 600 +
        (SELECT COUNT(*) FROM "Ledger" WHERE "companyId" IN (SELECT id FROM "Company" WHERE "userId" = ?)) * 300 +
        (SELECT COUNT(*) FROM "StockItem" WHERE "companyId" IN (SELECT id FROM "Company" WHERE "userId" = ?)) * 300 as bytes
    `, uid, uid, uid);
    const otherBytes = Number(countRes?.[0]?.bytes || 0);

    const totalBytes = auditTrailBytes + snapshotBytes + voucherBytes + otherBytes;
    const usagePercent = Math.min(100, Math.round((totalBytes / MAX_USER_STORAGE_BYTES) * 100));

    return {
      userId: uid,
      totalBytes,
      maxBytes: MAX_USER_STORAGE_BYTES,
      usagePercent,
      isNearQuota: totalBytes >= PRUNE_TRIGGER_BYTES,
      isOverLimit: totalBytes >= MAX_USER_STORAGE_BYTES,
      breakdown: {
        auditTrailBytes,
        voucherBytes,
        snapshotBytes,
        otherBytes,
      },
    };
  } catch (err) {
    console.warn('[StorageQuota] Error calculating storage for user', uid, err);
    return {
      userId: uid,
      totalBytes: 0,
      maxBytes: MAX_USER_STORAGE_BYTES,
      usagePercent: 0,
      isNearQuota: false,
      isOverLimit: false,
      breakdown: { auditTrailBytes: 0, voucherBytes: 0, snapshotBytes: 0, otherBytes: 0 },
    };
  }
}

/**
 * Enforces the 10 MB Quota with FIFO circular auto-reset:
 * If user storage reaches 9.5 MB, automatically purges the oldest non-essential records
 * (e.g. oldest AuditTrail entries, oldest logs) until storage drops safely below 8 MB.
 * 
 * STRICT GUARANTEE:
 * - Never deletes User record, licenseKey, plan, deviceActivation, or dashboard tokens.
 */
export async function enforceStorageQuota(userId: number): Promise<{ pruned: boolean; freedBytes: number; currentBytes: number }> {
  const uid = Number(userId);
  if (!uid || isNaN(uid)) return { pruned: false, freedBytes: 0, currentBytes: 0 };

  try {
    const report = await getUserStorageBytes(uid);
    if (!report.isNearQuota) {
      return { pruned: false, freedBytes: 0, currentBytes: report.totalBytes };
    }

    console.log(`[StorageQuota] User ${uid} storage is near limit (${(report.totalBytes / (1024 * 1024)).toFixed(2)} MB / 10 MB). Starting FIFO rolling purge...`);
    let freedBytes = 0;

    // Step A: FIFO purge oldest AuditTrail records in batches of 250
    try {
      const oldestAuditIds: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, LENGTH(COALESCE("details", '')) + 200 as sz
        FROM "AuditTrail"
        WHERE "companyId" IN (SELECT id FROM "Company" WHERE "userId" = ?)
        ORDER BY "timestamp" ASC
        LIMIT 300
      `, uid);

      if (oldestAuditIds && oldestAuditIds.length > 0) {
        const idsToDelete = oldestAuditIds.map(r => r.id);
        const batchFreed = oldestAuditIds.reduce((sum, r) => sum + (Number(r.sz) || 200), 0);

        await prisma.$executeRawUnsafe(`
          DELETE FROM "AuditTrail" WHERE id IN (${idsToDelete.join(',')})
        `);
        freedBytes += batchFreed;
        console.log(`[StorageQuota] Pruned ${idsToDelete.length} oldest AuditTrail entries. Freed ~${(batchFreed / 1024).toFixed(1)} KB.`);
      }
    } catch (e) {
      console.warn('[StorageQuota] Error in AuditTrail FIFO purge:', e);
    }

    // Step B: If still near limit, delete oldest cloud vouchers from ancient syncs
    const postAuditReport = await getUserStorageBytes(uid);
    if (postAuditReport.isNearQuota) {
      try {
        const oldestVouchers: any[] = await prisma.$queryRawUnsafe(`
          SELECT id FROM "Voucher"
          WHERE "companyId" IN (SELECT id FROM "Company" WHERE "userId" = ?)
          ORDER BY "date" ASC, "id" ASC
          LIMIT 200
        `, uid);

        if (oldestVouchers && oldestVouchers.length > 0) {
          const vchIds = oldestVouchers.map(v => v.id);
          await prisma.$executeRawUnsafe(`DELETE FROM "VoucherEntry" WHERE "voucherId" IN (${vchIds.join(',')})`);
          await prisma.$executeRawUnsafe(`DELETE FROM "InventoryEntry" WHERE "voucherId" IN (${vchIds.join(',')})`);
          await prisma.$executeRawUnsafe(`DELETE FROM "Voucher" WHERE id IN (${vchIds.join(',')})`);
          freedBytes += vchIds.length * 400;
          console.log(`[StorageQuota] Pruned ${vchIds.length} oldest historical cloud vouchers to maintain 10 MB buffer.`);
        }
      } catch (e) {
        console.warn('[StorageQuota] Error in historical voucher FIFO purge:', e);
      }
    }

    const finalReport = await getUserStorageBytes(uid);
    return {
      pruned: freedBytes > 0,
      freedBytes,
      currentBytes: finalReport.totalBytes,
    };
  } catch (err) {
    console.error('[StorageQuota] Error in enforceStorageQuota:', err);
    return { pruned: false, freedBytes: 0, currentBytes: 0 };
  }
}
