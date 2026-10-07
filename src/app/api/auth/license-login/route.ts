import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { ensureLicenseTables } from '@/lib/ensureLicenseTables';
import { createSignedLicenseToken } from '@/lib/licenseEngine';

export async function POST(req: Request) {
  try {
    await ensureLicenseTables();
    const { email, licenseKey } = await req.json();

    if (!email || !licenseKey) {
      return NextResponse.json({ error: 'Both Email and License Key are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanKey = licenseKey.toUpperCase().trim();
    console.log('[AUTH_LICENSE_LOGIN_REQUEST]', { email: cleanEmail, licenseKey: cleanKey });

    // 1. Admin Master Bypass
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@ledgerx.com").toLowerCase().trim();
    if (
      (cleanKey === 'LX-ADMIN-MASTER-2027' || cleanKey.startsWith('LX-ADMIN')) ||
      (cleanEmail === adminEmail || cleanEmail === "admin@demo.com" || cleanEmail === "yasin.khan098@gmail.com")
    ) {
      const adminToken = "admin_" + crypto.randomBytes(32).toString("hex");
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 100);

      const adminOfflineToken = createSignedLicenseToken({
        userId: 1,
        email: cleanEmail,
        licenseKey: "LX-ADMIN-MASTER-2027",
        machineId: 'DESKTOP-ADMIN',
        deviceName: 'Administrator PC',
        plan: "ENTERPRISE",
        validUntil: farFuture.toISOString(),
        features: ['ALL_MODULES', 'MFG_JOURNAL', 'PRINT_ENGINE', 'OFFLINE_MODE'],
        issuedAt: new Date().toISOString(),
      });

      return NextResponse.json({
        message: "Admin license verified and logged in successfully",
        token: adminToken,
        offlineToken: adminOfflineToken,
        user: {
          id: "admin",
          name: "Administrator",
          email: cleanEmail,
          organizationName: "Admin Panel",
          plan: "YEARLY",
          subscriptionExpiry: farFuture.toISOString(),
          licenseKey: "LX-ADMIN-MASTER-2027",
          isAdmin: true,
        }
      });
    }

    // 2. Normal user lookup
    let user: any = null;
    try {
      user = await prisma.user.findUnique({
        where: { email: cleanEmail },
        include: {
          companies: {
            include: {
              ledgers: true,
              stockGroups: true,
              stockItems: true,
              units: true,
            }
          }
        }
      });
    } catch (e) {
      const users: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "User" WHERE "email" = ? LIMIT 1`,
        cleanEmail
      );
      if (users && users.length > 0) user = users[0];
    }

    if (!user) {
      return NextResponse.json({ error: 'No account registered with this email address' }, { status: 404 });
    }

    // Check licenseKey
    const dbKey = (user.licenseKey || '').toUpperCase().trim();
    if (!dbKey || dbKey !== cleanKey) {
      return NextResponse.json({ error: 'Invalid License Key for this account. Please verify your license key.' }, { status: 401 });
    }

    // Check expiry
    if (user.subscriptionExpiry && new Date(user.subscriptionExpiry).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Your license subscription has expired. Please renew online to continue.' }, { status: 403 });
    }

    // Generate new session token
    const sessionToken = crypto.randomBytes(32).toString("hex");
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { sessionToken },
      });
    } catch (uErr) {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "sessionToken" = ? WHERE "id" = ?`,
        sessionToken,
        user.id
      );
    }

    // Generate signed offline token for desktop offline use
    const validUntilStr = user.subscriptionExpiry
      ? new Date(user.subscriptionExpiry).toISOString()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const offlineToken = createSignedLicenseToken({
      userId: user.id,
      email: user.email,
      licenseKey: user.licenseKey,
      machineId: 'DESKTOP-APP',
      deviceName: 'Windows Desktop',
      plan: user.plan || 'PRO',
      validUntil: validUntilStr,
      features: ['ALL_MODULES', 'MFG_JOURNAL', 'PRINT_ENGINE', 'OFFLINE_MODE'],
      issuedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      message: 'License activated and signed in successfully for offline use',
      token: sessionToken,
      offlineToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organizationName: user.organizationName,
        plan: user.plan,
        subscriptionExpiry: user.subscriptionExpiry,
        licenseKey: user.licenseKey,
      },
      companies: user.companies || [],
    });
  } catch (error: any) {
    console.error('License login error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
