import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureLicenseTables } from '@/lib/ensureLicenseTables';
import { createSignedLicenseToken } from '@/lib/licenseEngine';

export async function POST(req: Request) {
  try {
    await ensureLicenseTables();
    const body = await req.json();
    const { email, licenseKey, machineId, deviceName } = body;

    if (!email || !licenseKey || !machineId) {
      return NextResponse.json(
        { error: 'Email, License Key, and Machine ID are required for activation' },
        { status: 400 }
      );
    }

    // 1. Check user by email
    const user: any = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        companies: {
          include: {
            ledgers: true,
            stockGroups: true,
            stockItems: true,
            units: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'No account found with this email' }, { status: 404 });
    }

    // 2. Validate License Key
    if (!user.licenseKey || user.licenseKey.trim().toUpperCase() !== licenseKey.trim().toUpperCase()) {
      return NextResponse.json({ error: 'Invalid License Key for this account' }, { status: 403 });
    }

    // 3. Check Subscription Expiry
    if (user.subscriptionExpiry) {
      const expiry = new Date(user.subscriptionExpiry).getTime();
      if (Date.now() > expiry) {
        return NextResponse.json(
          { error: 'Your subscription has expired. Please renew online to activate offline desktop mode.' },
          { status: 403 }
        );
      }
    }

    // 4. Save or update Device Activation
    try {
      const existingDevice: any[] = await prisma.$queryRawUnsafe(
        `SELECT "id" FROM "DeviceActivation" WHERE "userId" = ? AND "machineId" = ? LIMIT 1`,
        user.id,
        machineId
      );

      if (existingDevice && existingDevice.length > 0) {
        await prisma.$executeRawUnsafe(
          `UPDATE "DeviceActivation" SET "deviceName" = ?, "lastSyncAt" = CURRENT_TIMESTAMP, "isActive" = 1 WHERE "id" = ?`,
          deviceName || 'Windows PC',
          existingDevice[0].id
        );
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "DeviceActivation" ("userId", "machineId", "deviceName", "activatedAt", "lastSyncAt", "isActive") VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)`,
          user.id,
          machineId,
          deviceName || 'Windows PC'
        );
      }
    } catch (e) {
      console.error('Error recording device activation:', e);
    }

    // 5. Generate Signed Offline Token
    const validUntilStr = user.subscriptionExpiry
      ? new Date(user.subscriptionExpiry).toISOString()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const offlineToken = createSignedLicenseToken({
      userId: user.id,
      email: user.email,
      licenseKey: user.licenseKey,
      machineId: machineId,
      deviceName: deviceName || 'Windows PC',
      plan: user.plan || 'PRO',
      validUntil: validUntilStr,
      features: ['ALL_MODULES', 'MFG_JOURNAL', 'PRINT_ENGINE', 'OFFLINE_MODE'],
      issuedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Desktop application activated successfully for offline use',
      token: offlineToken,
      user: {
        id: user.id,
        name: user.name,
        organizationName: user.organizationName,
        email: user.email,
        plan: user.plan,
        subscriptionExpiry: user.subscriptionExpiry,
      },
      companies: user.companies,
    });
  } catch (error: any) {
    console.error('Error in desktop activation:', error);
    return NextResponse.json({ error: error?.message || 'Activation failed' }, { status: 500 });
  }
}
