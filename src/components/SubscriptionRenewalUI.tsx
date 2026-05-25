"use client";
import React, { useState, useEffect } from 'react';

interface Props {
  currentUser: any;
  onRenewSuccess: () => void;
  onLogout: () => void;
}

const RENEWAL_CSS = `
  .renewal-wrapper {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: #0f172a; display: flex; justify-content: center; align-items: center;
    padding: 20px; z-index: 20000; overflow-y: auto;
  }
  .renewal-container {
    background: #fff; border-radius: 16px; padding: 48px 40px; max-width: 820px; width: 100%;
    text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
  }
  .lock-icon { font-size: 48px; margin-bottom: 12px; }
  .renewal-header h2 { font-size: 28px; color: #0f172a; margin: 0 0 10px; font-weight: 800; }
  .renewal-header p { color: #64748b; margin-bottom: 8px; font-size: 15px; }
  .current-plan-badge {
    display: inline-block; background: #fef3c7; color: #92400e;
    border: 1px solid #fcd34d; border-radius: 20px;
    padding: 4px 14px; font-size: 13px; font-weight: 700; margin-bottom: 28px;
  }

  .renewal-plan-cards { display: flex; gap: 16px; margin-bottom: 30px; }
  .renewal-plan-card {
    flex: 1; border: 2px solid #e2e8f0; border-radius: 12px; padding: 22px 18px;
    cursor: pointer; transition: all 0.2s; position: relative;
    background: #f8fafc; text-align: left;
  }
  .renewal-plan-card:hover { border-color: #94a3b8; transform: translateY(-2px); }
  .renewal-plan-card.active { border-color: #1c5282; background: #f0f7ff; box-shadow: 0 8px 25px -5px rgba(28,82,130,0.2); }
  .renewal-plan-card.lifetime-card.active { border-color: #7c3aed; background: #f5f3ff; box-shadow: 0 8px 25px -5px rgba(124,58,237,0.2); }
  .renewal-plan-card h3 { margin: 0 0 8px; font-size: 17px; color: #0f172a; font-weight: 700; }
  .renewal-plan-card .rprice { font-size: 26px; font-weight: 800; color: #1c5282; margin-bottom: 10px; }
  .renewal-plan-card.lifetime-card .rprice { color: #7c3aed; }
  .renewal-plan-card .rprice span { font-size: 13px; font-weight: 600; color: #64748b; }
  .renewal-plan-card p { font-size: 12px; color: #475569; margin: 0; line-height: 1.5; }
  .renewal-plan-card .rbadge {
    position: absolute; top: -10px; right: 10px;
    color: #fff; font-size: 11px; font-weight: 800; padding: 3px 10px;
    border-radius: 12px; letter-spacing: 0.5px; text-transform: uppercase;
  }
  .badge-best { background: #f59e0b; }
  .badge-lifetime { background: #7c3aed; }

  .renewal-actions { display: flex; gap: 15px; justify-content: flex-end; margin-top: 10px; }
  .renewal-btn-secondary {
    background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;
    padding: 13px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px;
  }
  .renewal-btn-primary {
    background: #1c5282; color: white; border: none;
    padding: 13px 28px; border-radius: 8px; font-weight: 700; cursor: pointer; flex: 1; font-size: 14px;
    transition: background 0.2s;
  }
  .renewal-btn-primary.lifetime-btn { background: #7c3aed; }
  .renewal-btn-primary:hover { background: #154066; }
  .renewal-btn-primary.lifetime-btn:hover { background: #6d28d9; }
  .renewal-btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

  .renewal-error { background: #fef2f2; color: #dc2626; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-weight: 500; font-size: 13px; }

  .lifetime-features { 
    background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 10px;
    padding: 12px 16px; margin-top: 10px; text-align: left;
  }
  .lifetime-features div { font-size: 12px; color: #5b21b6; margin: 3px 0; }

  @media (max-width: 650px) {
    .renewal-plan-cards { flex-direction: column; }
    .renewal-actions { flex-direction: column-reverse; }
    .renewal-container { padding: 30px 20px; }
  }
`;

export default function SubscriptionRenewalUI({ currentUser, onRenewSuccess, onLogout }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('YEARLY');

  useEffect(() => {
    const styleId = 'renewal-ui-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = RENEWAL_CSS;
      document.head.appendChild(style);
    }
    return () => { document.getElementById(styleId)?.remove(); };
  }, []);

  const loadRazorpay = () => new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const handlePayment = async () => {
    setLoading(true);
    setError('');
    try {
      const resRazorpay = await loadRazorpay();
      if (!resRazorpay) throw new Error('Razorpay SDK failed to load. Are you online?');

      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan })
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'LedgerX ERP',
        description: selectedPlan === 'LIFETIME'
          ? 'Lifetime Access — One Time Payment'
          : `${selectedPlan} Subscription Renewal`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                userId: currentUser.id,
                plan: selectedPlan
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              const userStr = sessionStorage.getItem('tally_auth_user');
              if (userStr) {
                const userObj = JSON.parse(userStr);
                userObj.plan = selectedPlan;
                userObj.subscriptionExpiry = verifyData.user.subscriptionExpiry;
                sessionStorage.setItem('tally_auth_user', JSON.stringify(userObj));
              }
              alert(selectedPlan === 'LIFETIME'
                ? '🎉 Welcome to Lifetime Access! You never need to renew again.'
                : 'Payment Successful! Thank you for renewing.');
              onRenewSuccess();
            } else {
              setError(verifyData.error || 'Payment verification failed');
            }
          } catch (err) {
            setError('Payment verification failed');
          }
        },
        prefill: { name: currentUser.name, email: currentUser.email },
        theme: { color: selectedPlan === 'LIFETIME' ? '#7c3aed' : '#1c5282' }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const planLabel = currentUser.plan === 'TRIAL' ? '3-Day Free Trial'
    : currentUser.plan === 'MONTHLY' ? 'Monthly Plan'
    : currentUser.plan === 'YEARLY' ? 'Yearly Plan'
    : currentUser.plan;

  return (
    <div className="renewal-wrapper">
      <div className="renewal-container">
        <div className="lock-icon">🔒</div>
        <div className="renewal-header">
          <h2>Subscription Expired</h2>
          <p>Your plan has ended. Please renew or upgrade to continue using LedgerX.</p>
          <div className="current-plan-badge">Current Plan: {planLabel}</div>
        </div>

        {error && <div className="renewal-error">{error}</div>}

        <div className="renewal-plan-cards">
          {/* MONTHLY */}
          <div
            className={`renewal-plan-card ${selectedPlan === 'MONTHLY' ? 'active' : ''}`}
            onClick={() => setSelectedPlan('MONTHLY')}
          >
            <h3>Monthly</h3>
            <div className="rprice">₹299<span>/mo</span></div>
            <p>Flexible monthly billing. Cancel or upgrade anytime.</p>
          </div>

          {/* YEARLY */}
          <div
            className={`renewal-plan-card ${selectedPlan === 'YEARLY' ? 'active' : ''}`}
            onClick={() => setSelectedPlan('YEARLY')}
          >
            <div className="rbadge badge-best">Best Value</div>
            <h3>Yearly</h3>
            <div className="rprice">₹1,999<span>/yr</span></div>
            <p>Save ₹1,589/yr vs monthly. Full access for 12 months.</p>
          </div>

          {/* LIFETIME */}
          <div
            className={`renewal-plan-card lifetime-card ${selectedPlan === 'LIFETIME' ? 'active' : ''}`}
            onClick={() => setSelectedPlan('LIFETIME')}
          >
            <div className="rbadge badge-lifetime">Lifetime</div>
            <h3>Lifetime</h3>
            <div className="rprice">₹11,999<span> one-time</span></div>
            <p>Pay once, use forever. No renewals ever again.</p>
            {selectedPlan === 'LIFETIME' && (
              <div className="lifetime-features">
                <div>✓ Never pay again</div>
                <div>✓ All future updates included</div>
                <div>✓ Priority support</div>
              </div>
            )}
          </div>
        </div>

        <div className="renewal-actions">
          <button className="renewal-btn-secondary" onClick={onLogout}>Logout</button>
          <button
            className={`renewal-btn-primary ${selectedPlan === 'LIFETIME' ? 'lifetime-btn' : ''}`}
            onClick={handlePayment}
            disabled={loading}
          >
            {loading ? 'Processing...' : selectedPlan === 'LIFETIME' ? '💎 GET LIFETIME ACCESS' : 'PAY NOW & UNLOCK'}
          </button>
        </div>
      </div>
    </div>
  );
}
