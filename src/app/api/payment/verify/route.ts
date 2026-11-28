import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { createSignedLicenseToken } from '@/lib/licenseEngine';

export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      email,
      licenseKey,
      machineId,
      deviceName,
      plan,
      country,
      currency,
    } = await req.json();

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Razorpay secret not configured' }, { status: 500 });
    }

    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Find the user by ID, email, or license key
    let targetUser: any = null;
    if (userId && typeof userId === 'number' && userId > 0) {
      try {
        targetUser = await prisma.user.findUnique({ where: { id: userId } });
      } catch (_) { }
    }
    if (!targetUser && email) {
      try {
        targetUser = await prisma.user.findFirst({
          where: { email: String(email).trim().toLowerCase() },
        });
      } catch (_) { }
    }
    if (!targetUser && licenseKey) {
      try {
        targetUser = await prisma.user.findFirst({
          where: { licenseKey: String(licenseKey).trim().toUpperCase() },
        });
      } catch (_) { }
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'User account not found for license renewal' }, { status: 404 });
    }

    // Determine expiry based on plan
    const now = new Date();
    let expiry = new Date(now);
    let syncExpiry = new Date(now);
    if (plan === 'MONTHLY') {
      expiry.setMonth(expiry.getMonth() + 1);
      syncExpiry = new Date(expiry);
    } else if (plan === 'YEARLY') {
      expiry.setFullYear(expiry.getFullYear() + 1);
      syncExpiry = new Date(expiry);
    } else if (plan === 'LIFETIME') {
      expiry.setFullYear(expiry.getFullYear() + 100); // Effectively permanent software access
      syncExpiry.setFullYear(syncExpiry.getFullYear() + 1); // 1-Year Cloud Sync included
    } else {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    // Update user in DB
    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        plan,
        paymentStatus: 'SUCCESS',
        subscriptionExpiry: expiry,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      },
    });

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "syncExpiry" = ? WHERE "id" = ?`,
        syncExpiry.toISOString(),
        targetUser.id
      );
    } catch (e) { }

    try {
      if (country) {
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET "country" = ?, "currency" = ? WHERE "id" = ?`,
          country,
          currency || 'INR',
          targetUser.id
        );
      }
    } catch (e) { }

    // Generate renewed signed offline license token
    const userExpiryMs = updatedUser.subscriptionExpiry
      ? new Date(updatedUser.subscriptionExpiry).getTime()
      : (plan === 'LIFETIME' ? Date.now() + 20 * 365 * 24 * 60 * 60 * 1000 : Date.now() + 365 * 24 * 60 * 60 * 1000);

    const validUntilStr = new Date(userExpiryMs).toISOString();

    const offlineToken = createSignedLicenseToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      licenseKey: updatedUser.licenseKey || licenseKey || 'LX-ONLINE-RENEWED',
      machineId: machineId || '',
      deviceName: deviceName || 'Windows PC',
      plan: updatedUser.plan || plan,
      validUntil: validUntilStr,
      features: ['ALL_MODULES', 'MFG_JOURNAL', 'PRINT_ENGINE', 'OFFLINE_MODE'],
      issuedAt: new Date().toISOString(),
    });

    // Generate active session token
    let sessionToken = "session_" + crypto.randomBytes(32).toString("hex");
    try {
      await prisma.user.update({
        where: { id: updatedUser.id },
        data: { sessionToken },
      });
    } catch (_) { }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully. Subscription renewed!',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        organizationName: updatedUser.organizationName,
        plan: updatedUser.plan,
        subscriptionExpiry: updatedUser.subscriptionExpiry,
        licenseKey: updatedUser.licenseKey || licenseKey,
      },
      token: sessionToken,
      offlineToken,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Razorpay Verify Error:', error);
    return NextResponse.json({ error: 'Failed to verify payment: ' + (error?.message || 'Server error') }, { status: 500 });
  }
}
