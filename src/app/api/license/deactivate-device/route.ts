import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureLicenseTables } from '@/lib/ensureLicenseTables';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await ensureLicenseTables();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { deviceId, machineId } = body;

    if (!deviceId && !machineId) {
      return NextResponse.json({ error: 'Device ID or Machine ID is required' }, { status: 400 });
    }

    // Verify device belongs to this user
    let targetDevice: any = null;
    if (deviceId) {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "DeviceActivation" WHERE "id" = ? AND "userId" = ? LIMIT 1`,
        parseInt(String(deviceId), 10),
        user.id
      );
      if (rows && rows.length > 0) targetDevice = rows[0];
    } else if (machineId) {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "DeviceActivation" WHERE "machineId" = ? AND "userId" = ? LIMIT 1`,
        String(machineId).trim(),
        user.id
      );
      if (rows && rows.length > 0) targetDevice = rows[0];
    }

    if (!targetDevice) {
      return NextResponse.json({ error: 'Device record not found or access denied' }, { status: 404 });
    }

    if (targetDevice.isActive === 0 || targetDevice.isActive === false) {
      return NextResponse.json({
        success: true,
        message: `Device '${targetDevice.deviceName || 'Windows PC'}' is already unlinked. Your license slot is ready to be activated on your new computer.`,
      });
    }

    // Protection against rapid transfer abuse (e.g. pirating multiple offline computers)
    const isMasterAdmin = (user.licenseKey || '').startsWith('LX-ADMIN-MASTER');
    if (!isMasterAdmin) {
      try {
        const recentRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM "DeviceActivation" 
           WHERE "userId" = ? AND "isActive" = 0 AND "lastSyncAt" >= datetime('now', '-30 days')`,
          user.id
        );
        const count = Number(recentRows?.[0]?.count || 0);
        if (count >= 5) {
          return NextResponse.json({
            error: 'Device transfer limit reached: You can transfer your license up to 5 times within 30 days. For running multiple computers concurrently, please upgrade to a Multi-PC License or contact support.',
          }, { status: 429 });
        }
      } catch (countErr) {}
    }

    // Deactivate device
    await prisma.$executeRawUnsafe(
      `UPDATE "DeviceActivation" SET "isActive" = 0, "lastSyncAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
      targetDevice.id
    );

    return NextResponse.json({
      success: true,
      message: `Device '${targetDevice.deviceName || 'Windows PC'}' has been unlinked successfully. Your license slot is now free, and you can activate on your new computer.`,
      unlinkedDevice: {
        id: targetDevice.id,
        deviceName: targetDevice.deviceName,
        machineId: targetDevice.machineId,
      },
    });
  } catch (error: any) {
    console.error('Error deactivating device:', error);
    return NextResponse.json({ error: error?.message || 'Failed to unlink device' }, { status: 500 });
  }
}
