import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureLicenseTables, generateLicenseKey } from '@/lib/ensureLicenseTables';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await ensureLicenseTables();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.id === -1) {
      // Admin account
      return NextResponse.json({
        licenseKey: 'LX-ADMIN-MASTER-2027',
        plan: 'ADMIN_LIFETIME',
        subscriptionExpiry: user.subscriptionExpiry,
        devices: [],
        downloadUrl: 'https://github.com/yasinkhan098-svg/accountspro/releases/latest/download/LedgerX-Setup.exe',
      });
    }

    // Fetch latest user details with licenseKey
    const dbUser: any = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let licenseKey = dbUser.licenseKey;
    if (!licenseKey) {
      licenseKey = generateLicenseKey(user.id);
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "licenseKey" = ? WHERE "id" = ?`,
        licenseKey,
        user.id
      );
    }

    // Fetch activated devices
    let devices: any[] = [];
    try {
      devices = await prisma.$queryRawUnsafe(
        `SELECT "id", "machineId", "deviceName", "activatedAt", "lastSyncAt", "isActive" FROM "DeviceActivation" WHERE "userId" = ? ORDER BY "activatedAt" DESC`,
        user.id
      );
    } catch (e) {
      devices = [];
    }

    return NextResponse.json({
      licenseKey,
      plan: dbUser.plan || 'TRIAL',
      subscriptionExpiry: dbUser.subscriptionExpiry,
      paymentStatus: dbUser.paymentStatus,
      devices,
      downloadUrl: 'https://github.com/yasinkhan098-svg/accountspro/releases/latest/download/LedgerX-Setup.exe',
    });
  } catch (error: any) {
    console.error('Error fetching license key:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
