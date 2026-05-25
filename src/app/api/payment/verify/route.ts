import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, plan } = await req.json();

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

    // Determine expiry based on plan
    const now = new Date();
    let expiry = new Date(now);
    if (plan === 'MONTHLY') {
      expiry.setMonth(expiry.getMonth() + 1);
    } else if (plan === 'YEARLY') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    }

    // Update user in DB
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        paymentStatus: 'SUCCESS',
        subscriptionExpiry: expiry,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      },
    });

    return NextResponse.json({ message: 'Payment verified successfully', user: updatedUser }, { status: 200 });
  } catch (error: any) {
    console.error('Razorpay Verify Error:', error);
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}
