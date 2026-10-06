import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyLicenseToken, createSignedLicenseToken } from '@/lib/licenseEngine';

export async function POST(req: Request) {
  try {
    const { token, machineId } = await req.json();
    if (!token || !machineId) {
      return NextResponse.json({ error: 'Token and Machine ID are required' }, { status: 400 });
    }

    const check = verifyLicenseToken(token, machineId);
    if (!check.valid || !check.payload) {
      return NextResponse.json({ valid: false, reason: check.reason }, { status: 401 });
    }

    // Check current DB status to see if extended/renewed
    const user: any = await prisma.user.findUnique({
      where: { id: check.payload.userId },
    });

    if (!user) {
      return NextResponse.json({ valid: false, reason: 'User not found' }, { status: 404 });
    }

    if (user.subscriptionExpiry && new Date(user.subscriptionExpiry).getTime() < Date.now()) {
      return NextResponse.json({
        valid: false,
        reason: 'Subscription has expired. Please renew online.',
      });
    }

    // Refresh token with latest expiry
    const validUntilStr = user.subscriptionExpiry
      ? new Date(user.subscriptionExpiry).toISOString()
      : check.payload.validUntil;

    const refreshedToken = createSignedLicenseToken({
      ...check.payload,
      plan: user.plan || check.payload.plan,
      validUntil: validUntilStr,
      issuedAt: new Date().toISOString(),
    });

    // Update lastSyncAt for this device
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "DeviceActivation" SET "lastSyncAt" = CURRENT_TIMESTAMP WHERE "userId" = ? AND "machineId" = ?`,
        user.id,
        machineId
      );
    } catch (e) {
      // Ignore
    }

    return NextResponse.json({
      valid: true,
      token: refreshedToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        subscriptionExpiry: user.subscriptionExpiry,
      },
    });
  } catch (error: any) {
    console.error('Error in license verify:', error);
    return NextResponse.json({ valid: false, reason: 'Verification failed' }, { status: 500 });
  }
}
