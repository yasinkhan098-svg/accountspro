"use client";
import React, { useState } from 'react';

interface Props {
  currentUser: any;
  onRenewSuccess: () => void;
  onLogout: () => void;
}

export default function SubscriptionRenewalUI({ currentUser, onRenewSuccess, onLogout }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('MONTHLY');

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

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
        description: `${selectedPlan} Subscription Renewal`,
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
              // Update local user object
              const userStr = sessionStorage.getItem('tally_auth_user');
              if (userStr) {
                const userObj = JSON.parse(userStr);
                userObj.plan = selectedPlan;
                userObj.subscriptionExpiry = verifyData.user.subscriptionExpiry;
                sessionStorage.setItem('tally_auth_user', JSON.stringify(userObj));
              }
              alert('Payment Successful! Thank you for renewing.');
              onRenewSuccess();
            } else {
              setError(verifyData.error || 'Payment verification failed');
            }
          } catch (err) {
            setError('Payment verification failed');
          }
        },
        prefill: {
          name: currentUser.name,
          email: currentUser.email
        },
        theme: {
          color: '#1c5282'
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="renewal-wrapper">
      <div className="renewal-container">
        <div className="renewal-header">
          <div className="lock-icon">🔒</div>
          <h2>Subscription Expired</h2>
          <p>Your {currentUser.plan === 'TRIAL' ? '3-Day Free Trial' : 'Subscription Plan'} has ended. Please renew to continue using LedgerX.</p>
        </div>

        {error && (
          <div className="error-alert">
            <span>{error}</span>
          </div>
        )}

        <div className="plan-cards">
          <div className={`plan-card ${selectedPlan === 'MONTHLY' ? 'active' : ''}`} onClick={() => setSelectedPlan('MONTHLY')}>
            <h3>Monthly</h3>
            <div className="price">₹299<span>/mo</span></div>
            <p>Flexible monthly billing.</p>
          </div>
          <div className={`plan-card ${selectedPlan === 'YEARLY' ? 'active' : ''}`} onClick={() => setSelectedPlan('YEARLY')}>
            <div className="badge">Best Value</div>
            <h3>Yearly</h3>
            <div className="price">₹999<span>/yr</span></div>
            <p>Save massive amounts with annual billing.</p>
          </div>
        </div>

        <div className="actions">
          <button className="btn-secondary" onClick={onLogout}>Logout</button>
          <button className="btn-primary" onClick={handlePayment} disabled={loading}>
            {loading ? 'Processing...' : 'PAY NOW & UNLOCK'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .renewal-wrapper {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: #0f172a; display: flex; justify-content: center; align-items: center;
          padding: 20px; z-index: 20000;
        }
        .renewal-container {
          background: #fff; border-radius: 12px; padding: 40px; max-width: 700px; width: 100%;
          text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }
        .lock-icon { font-size: 40px; margin-bottom: 10px; }
        .renewal-header h2 { font-size: 28px; color: #0f172a; margin-bottom: 8px; }
        .renewal-header p { color: #64748b; margin-bottom: 30px; font-size: 15px; }

        .plan-cards { display: flex; gap: 20px; margin-bottom: 30px; }
        .plan-card {
          flex: 1; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px;
          cursor: pointer; transition: all 0.2s; position: relative; background: #f8fafc; text-align: left;
        }
        .plan-card:hover { border-color: #94a3b8; transform: translateY(-2px); }
        .plan-card.active { border-color: #1c5282; background: #f0f7ff; box-shadow: 0 10px 25px -5px rgba(28,82,130,0.2); }
        .plan-card h3 { margin: 0 0 10px; font-size: 18px; color: #0f172a; }
        .plan-card .price { font-size: 28px; font-weight: 800; color: #1c5282; margin-bottom: 12px; }
        .plan-card .price span { font-size: 14px; font-weight: 600; color: #64748b; }
        .plan-card p { font-size: 13px; color: #475569; margin: 0; line-height: 1.5; }
        .plan-card .badge {
          position: absolute; top: -10px; right: 10px; background: #f59e0b;
          color: #fff; font-size: 11px; font-weight: 800; padding: 4px 8px;
          border-radius: 12px; letter-spacing: 0.5px; text-transform: uppercase;
        }

        .actions { display: flex; gap: 15px; justify-content: flex-end; }
        .btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 14px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; }
        .btn-primary { background: #1c5282; color: white; border: none; padding: 14px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; flex: 1; }
        .btn-primary:hover { background: #154066; }
        
        .error-alert { background: #fef2f2; color: #dc2626; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-weight: 500; }
        
        @media (max-width: 600px) {
          .plan-cards { flex-direction: column; }
          .actions { flex-direction: column-reverse; }
        }
      `}</style>
    </div>
  );
}
