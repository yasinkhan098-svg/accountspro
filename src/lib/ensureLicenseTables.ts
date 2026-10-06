import { prisma } from './prisma';
import crypto from 'crypto';

let licenseTablesEnsured = false;

export async function ensureLicenseTables() {
  if (licenseTablesEnsured) return;

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "licenseKey" TEXT;`);
  } catch (e) {
    // Column already exists - ignore
  }

  try {
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_licenseKey_key" ON "User"("licenseKey");`);
  } catch (e) {
    // Index already exists - ignore
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DeviceActivation" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "userId" INTEGER NOT NULL,
        "machineId" TEXT NOT NULL,
        "deviceName" TEXT,
        "activatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
        "lastSyncAt" DATETIME,
        "lastSeenTimeGuard" DATETIME,
        "isActive" BOOLEAN DEFAULT 1
      );
    `);
  } catch (e) {
    // Table already exists - ignore
  }

  try {
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "DeviceActivation_userId_idx" ON "DeviceActivation"("userId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "DeviceActivation_machineId_idx" ON "DeviceActivation"("machineId");`);
  } catch (e) {
    // Indexes already exist - ignore
  }

  licenseTablesEnsured = true;
}

export function generateLicenseKey(userId: number | string): string {
  const padId = String(userId).padStart(4, '0');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  const year = new Date().getFullYear();
  return `LX-${padId}-${rand}-${year}`;
}
