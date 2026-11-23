import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getCountryPricing, getSubunitAmount } from '@/lib/countryCurrencyPricing';

export async function POST(req: Request) {
  try {
    const { plan, country, currency } = await req.json();

    const tier = getCountryPricing(country);
    const targetCurrency = (currency || tier.currencyCode || 'INR').toUpperCase();
    const subunitAmount = getSubunitAmount(tier, plan);

    if (subunitAmount <= 0) {
      return NextResponse.json({ error: 'Invalid plan or amount' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error('Razorpay credentials missing:', { keyId: !!keyId, keySecret: !!keySecret });
      return NextResponse.json({ error: 'Razorpay credentials not configured' }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // 1. Attempt creating order in customer's local currency
    try {
      const options = {
        amount: subunitAmount,
        currency: targetCurrency,
        receipt: `rcpt_${Date.now()}`,
        notes: {
          country: tier.country,
          plan,
          currency: targetCurrency,
        },
      };

      const order = await razorpay.orders.create(options);
      return NextResponse.json(order, { status: 200 });
    } catch (orderErr: any) {
      console.warn(`Razorpay create order in ${targetCurrency} failed, checking INR fallback:`, orderErr?.message);
      // Graceful fallback to INR base currency if merchant account does not support target currency
      if (targetCurrency !== 'INR') {
        const inrTier = getCountryPricing('India');
        const inrAmount = getSubunitAmount(inrTier, plan);
        const inrOptions = {
          amount: inrAmount,
          currency: 'INR',
          receipt: `rcpt_fb_${Date.now()}`,
          notes: {
            originalCountry: tier.country,
            originalCurrency: targetCurrency,
            plan,
            isFallback: 'true',
          },
        };
        const fallbackOrder = await razorpay.orders.create(inrOptions);
        return NextResponse.json(fallbackOrder, { status: 200 });
      }
      throw orderErr;
    }
  } catch (error: any) {
    console.error('Razorpay Create Order Error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
