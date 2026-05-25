import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Admin ko upgrade ki zaroorat nahi
    if (user.id === -1) return NextResponse.json({ error: 'Admin does not need plan upgrade' }, { status: 400 });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = await req.json();

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
    if (plan === 'MONTHLY') {
      expiry.setMonth(expiry.getMonth() + 1);
    } else if (plan === 'YEARLY') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else if (plan === 'LIFETIME') {
      expiry.setFullYear(expiry.getFullYear() + 100);
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
      },
    });

    return NextResponse.json({
      message: 'Plan upgraded successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        plan: updatedUser.plan,
        subscriptionExpiry: updatedUser.subscriptionExpiry,
        organizationName: updatedUser.organizationName,
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Plan Upgrade Error:', error);
    return NextResponse.json({ error: 'Failed to upgrade plan' }, { status: 500 });
  }
}
