import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { createSignedLicenseToken } from '@/lib/licenseEngine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, email, licenseKey, machineId, deviceName, country } = body;

    let user = await getAuthenticatedUser(req);
    if (!user && email) {
      try {
        user = await prisma.user.findFirst({
          where: { email: String(email).trim().toLowerCase() }
        });
      } catch (_) { }
    }
    if (!user && licenseKey) {
      try {
        user = await prisma.user.findFirst({
          where: { licenseKey: String(licenseKey).trim().toUpperCase() }
        });
      } catch (_) { }
    }

    if (!user) return NextResponse.json({ error: 'Unauthorized: User account not found' }, { status: 401 });

    // Admin ko upgrade ki zaroorat nahi
    if (user.id === -1) return NextResponse.json({ error: 'Admin does not need plan upgrade' }, { status: 400 });

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return NextResponse.json({ error: 'Razorpay secret not configured' }, { status: 500 });

    // Signature verify karo
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Nayi expiry calculate karo
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
      expiry.setFullYear(expiry.getFullYear() + 100); // Lifetime software access
      syncExpiry.setFullYear(syncExpiry.getFullYear() + 1); // 1-Year Cloud Sync included
    } else {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // User ka plan update karo DB mein
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        plan,
        paymentStatus: 'SUCCESS',
        subscriptionExpiry: expiry,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        ...(country ? { country: String(country) } : {}),
      },
    });

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "syncExpiry" = ? WHERE "id" = ?`,
        syncExpiry.toISOString(),
        user.id
      );
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

    return NextResponse.json({
      success: true,
      message: 'Plan upgraded successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        plan: updatedUser.plan,
        subscriptionExpiry: updatedUser.subscriptionExpiry,
        organizationName: updatedUser.organizationName,
        licenseKey: updatedUser.licenseKey || licenseKey,
      },
      offlineToken,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Plan Upgrade Error:', error);
    return NextResponse.json({ error: 'Failed to upgrade plan: ' + (error?.message || 'Server error') }, { status: 500 });
  }
}
