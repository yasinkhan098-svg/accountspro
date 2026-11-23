import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { ensureLicenseTables, generateLicenseKey } from '@/lib/ensureLicenseTables';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await ensureLicenseTables();
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      signupData,
      plan,
      country,
      currency,
    } = body;

    // 1. Mandatory input checks
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment proof tokens' }, { status: 400 });
    }

    if (!signupData || !signupData.email || !signupData.password || !signupData.name || !signupData.organizationName) {
      return NextResponse.json({ error: 'Missing registration details' }, { status: 400 });
    }

    // 2. Cryptographic Signature Verification
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error('Razorpay secret not configured in server environment');
      return NextResponse.json({ error: 'Payment gateway secret not configured' }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.warn('Tampered payment signature detected!', {
        received: razorpay_signature,
        expected: expectedSignature,
      });
      return NextResponse.json({ error: 'Invalid payment signature. Verification failed.' }, { status: 400 });
    }

    // 3. Determine subscription expiry based on paid plan
    const now = new Date();
    let expiry = new Date(now);
    let syncExpiry = new Date(now);

    if (plan === 'MONTHLY') {
      expiry.setDate(expiry.getDate() + 30);
      syncExpiry = new Date(expiry);
    } else if (plan === 'YEARLY') {
      expiry.setDate(expiry.getDate() + 365);
      syncExpiry = new Date(expiry);
    } else if (plan === 'LIFETIME') {
      expiry.setFullYear(expiry.getFullYear() + 20); // 20 years lifetime software access
      syncExpiry.setFullYear(syncExpiry.getFullYear() + 1); // 1-Year Cloud Sync included
    } else {
      return NextResponse.json({ error: 'Invalid subscription plan specified' }, { status: 400 });
    }

    const cleanEmail = signupData.email.toLowerCase().trim();
    const cleanCountry = (country || signupData.country || 'India').trim();
    const cleanCurrency = (currency || 'INR').toUpperCase().trim();
    const hashedPassword = await bcrypt.hash(signupData.password, 10);
    const lKey = generateLicenseKey(Date.now().toString().slice(-4));

    // 4. Check existing user
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });

    let finalUser: any = null;

    if (existingUser) {
      // If user was previously pending or retrying payment, upgrade them to active SUCCESS
      finalUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: signupData.name,
          organizationName: signupData.organizationName,
          mobile: signupData.mobile || existingUser.mobile,
          address: signupData.address || existingUser.address,
          profession: signupData.profession || existingUser.profession,
          password: hashedPassword,
          plan,
          paymentStatus: 'SUCCESS',
          subscriptionExpiry: expiry,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          licenseKey: existingUser.licenseKey || lKey,
        },
      });
    } else {
      // 5. ATOMIC CREATION: User is created in DB ONLY NOW after payment verification!
      try {
        finalUser = await prisma.user.create({
          data: {
            name: signupData.name,
            organizationName: signupData.organizationName,
            mobile: signupData.mobile,
            address: signupData.address,
            profession: signupData.profession,
            email: cleanEmail,
            password: hashedPassword,
            plan,
            paymentStatus: 'SUCCESS',
            subscriptionExpiry: expiry,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            licenseKey: lKey,
          },
        });
      } catch (createErr) {
        finalUser = await prisma.user.create({
          data: {
            name: signupData.name,
            organizationName: signupData.organizationName,
            mobile: signupData.mobile,
            address: signupData.address,
            profession: signupData.profession,
            email: cleanEmail,
            password: hashedPassword,
            plan,
            paymentStatus: 'SUCCESS',
            subscriptionExpiry: expiry,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
          },
        });
      }
    }

    // Update country, currency, and syncExpiry
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "country" = ?, "currency" = ?, "syncExpiry" = ? WHERE "id" = ?`,
        cleanCountry,
        cleanCurrency,
        syncExpiry.toISOString(),
        finalUser.id
      );
    } catch (_) {}

    console.log(`[PAID_REGISTRATION_SUCCESS] User ${cleanEmail} registered for ${plan} in ${cleanCountry} (${cleanCurrency})`);

    return NextResponse.json({
      success: true,
      message: 'Payment verified and account registered successfully!',
      userId: finalUser.id,
      licenseKey: finalUser.licenseKey || lKey,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Verify & Register Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error during registration' }, { status: 500 });
  }
}
