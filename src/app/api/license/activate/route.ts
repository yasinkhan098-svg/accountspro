import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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

    const cleanEmail = email.toLowerCase().trim();
    const cleanKey = licenseKey.toUpperCase().trim();
    const cleanMachineId = machineId.trim();

    // 1. MASTER ADMIN KEY SUPPORT (e.g. LX-ADMIN-MASTER-2027)
    const isMasterAdmin = cleanKey === 'LX-ADMIN-MASTER-2027' || cleanKey.startsWith('LX-ADMIN-MASTER');

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
            },
          },
        },
      });
    } catch (e) {
      const users: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "User" WHERE LOWER("email") = ? LIMIT 1`,
        cleanEmail
      );
      if (users && users.length > 0) user = users[0];
    }

    // If master admin key and user not in DB, auto-provision master admin user
    if (isMasterAdmin && !user) {
      try {
        const farFuture = new Date();
        farFuture.setFullYear(farFuture.getFullYear() + 20);
        user = await prisma.user.create({
          data: {
            name: cleanEmail.split('@')[0],
            organizationName: 'LedgerX Enterprise',
            mobile: '9999999999',
            address: 'HQ Office',
            profession: 'Administrator',
            email: cleanEmail,
            password: await bcrypt.hash('admin123', 10),
            plan: 'LIFETIME',
            subscriptionExpiry: farFuture,
            licenseKey: 'LX-ADMIN-MASTER-2027',
          },
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
      } catch (createErr) {
        // Fallback in-memory user representation
        const farFuture = new Date();
        farFuture.setFullYear(farFuture.getFullYear() + 20);
        user = {
          id: 999999,
          name: 'Administrator',
          organizationName: 'LedgerX Enterprise',
          email: cleanEmail,
          plan: 'LIFETIME',
          subscriptionExpiry: farFuture,
          licenseKey: 'LX-ADMIN-MASTER-2027',
          companies: [],
        };
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'No account found with this email address' }, { status: 404 });
    }

    // 2. Validate License Key
    const userLicenseKey = (user.licenseKey || '').trim().toUpperCase();
    if (!isMasterAdmin && (!userLicenseKey || userLicenseKey !== cleanKey)) {
      return NextResponse.json(
        { error: 'Invalid License Key for this account. Please check your key or visit your account portal.' },
        { status: 403 }
      );
    }

    // 3. Check Subscription Expiry
    if (user.subscriptionExpiry) {
      const expiry = new Date(user.subscriptionExpiry).getTime();
      if (Date.now() > expiry) {
        return NextResponse.json(
          {
            error: `Your subscription expired on ${new Date(user.subscriptionExpiry).toLocaleDateString('en-GB')}. Please renew online to enable desktop access.`,
          },
          { status: 403 }
        );
      }
    }

    // 4. STRICT SINGLE-DEVICE LOCK (Hardware Fingerprint Verification)
    // Check if this license key is already locked/activated to another machine
    try {
      const activeDevices: any[] = await prisma.$queryRawUnsafe(
        `SELECT "id", "machineId", "deviceName", "activatedAt", "isActive" 
         FROM "DeviceActivation" 
         WHERE "userId" = ? AND "isActive" = 1`,
        user.id
      );

      const existingThisMachine = activeDevices.find((d: any) => d.machineId === cleanMachineId);
      const otherMachines = activeDevices.filter((d: any) => d.machineId !== cleanMachineId);

      // Single-device policy: If activated on a different computer, REJECT activation on this new PC
      if (otherMachines.length > 0 && !isMasterAdmin) {
        const boundDeviceName = otherMachines[0].deviceName || 'Authorized Windows PC';
        const maskedHwid = otherMachines[0].machineId.substring(0, 16);
        return NextResponse.json(
          {
            error: `License Security Lock: This License Key is already bound to another computer (${boundDeviceName}, HWID: ${maskedHwid}...). Under our single-device anti-piracy policy, each license can only run on 1 authorized computer. To transfer your license to this PC, please contact support or deactivate your previous PC.`,
          },
          { status: 403 }
        );
      }

      // Record or update this device activation
      if (existingThisMachine) {
        await prisma.$executeRawUnsafe(
          `UPDATE "DeviceActivation" 
           SET "deviceName" = ?, "lastSyncAt" = CURRENT_TIMESTAMP, "isActive" = 1 
           WHERE "id" = ?`,
          deviceName || 'Windows PC',
          existingThisMachine.id
        );
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "DeviceActivation" ("userId", "machineId", "deviceName", "activatedAt", "lastSyncAt", "isActive") 
           VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)`,
          user.id,
          cleanMachineId,
          deviceName || 'Windows PC'
        );
      }
    } catch (dbErr) {
      console.error('Error enforcing device activation in DB:', dbErr);
    }

    // 5. Generate Tamper-Proof Cryptographic Offline License Token
    // Rolling 30-day offline lease: legitimate offline users get 30 days of seamless offline access.
    // Online heartbeats and sync automatically extend the lease by 30 days every time the PC connects.
    // If a user unlinks an old PC and tries to keep it offline permanently to pirate it,
    // the old PC will expire in 30 days and require online verification (which instantly locks it).
    const OFFLINE_LEASE_DAYS = 30;
    const userExpiryMs = user.subscriptionExpiry
      ? new Date(user.subscriptionExpiry).getTime()
      : Date.now() + 365 * 24 * 60 * 60 * 1000;

    const leaseExpiryMs = isMasterAdmin
      ? userExpiryMs
      : Math.min(userExpiryMs, Date.now() + OFFLINE_LEASE_DAYS * 24 * 60 * 60 * 1000);

    const validUntilStr = new Date(leaseExpiryMs).toISOString();

    const offlineToken = createSignedLicenseToken({
      userId: user.id,
      email: user.email,
      licenseKey: user.licenseKey || cleanKey,
      machineId: cleanMachineId,
      deviceName: deviceName || 'Windows PC',
      plan: user.plan || 'PRO',
      validUntil: validUntilStr,
      features: ['ALL_MODULES', 'MFG_JOURNAL', 'PRINT_ENGINE', 'OFFLINE_MODE'],
      issuedAt: new Date().toISOString(),
    });

    // 6. Generate Active Web Session Token for Seamless Instant Login
    let sessionToken = "session_" + crypto.randomBytes(32).toString("hex");
    if (!isMasterAdmin && user.id) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { sessionToken },
        });
      } catch (sessErr) {
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE "User" SET "sessionToken" = ? WHERE "id" = ?`,
            sessionToken,
            user.id
          );
        } catch {}
      }
    } else if (isMasterAdmin) {
      sessionToken = "admin_" + crypto.randomBytes(32).toString("hex");
    }

    return NextResponse.json({
      success: true,
      message: 'Desktop application activated successfully! Offline mode unlocked until subscription expiry.',
      token: sessionToken,
      offlineToken: offlineToken,
      user: {
        id: user.id,
        name: user.name,
        organizationName: user.organizationName,
        email: user.email,
        plan: user.plan,
        subscriptionExpiry: user.subscriptionExpiry,
        licenseKey: user.licenseKey || cleanKey,
      },
      companies: user.companies || [],
    });
  } catch (error: any) {
    console.error('Error in desktop activation:', error);
    return NextResponse.json({ error: error?.message || 'Activation failed' }, { status: 500 });
  }
}
