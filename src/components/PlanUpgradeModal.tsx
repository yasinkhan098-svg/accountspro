"use client";
import React, { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';

interface Props {
  currentUser: any;
  onUpgradeSuccess: (newUser: any) => void;
  onClose: () => void;
}

const UPGRADE_CSS = `
  .upgrade-overlay {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center;
    padding: 20px; z-index: 50000; overflow-y: auto;
    backdrop-filter: blur(4px);
  }
  .upgrade-box {
    background: #fff; border-radius: 16px; padding: 40px 36px;
    max-width: 820px; width: 100%; box-shadow: 0 30px 60px -12px rgba(0,0,0,0.4);
    animation: upgradeSlideIn 0.3s ease;
  }
  @keyframes upgradeSlideIn {
    from { opacity: 0; transform: translateY(-20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .upgrade-head { text-align: center; margin-bottom: 28px; }
  .upgrade-head h2 { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 8px; }
  .upgrade-head p  { font-size: 14px; color: #64748b; margin: 0; }
  .upgrade-current {
    display: inline-flex; align-items: center; gap: 8px;
    background: #f0f7ff; border: 1px solid #bfdbfe; border-radius: 20px;
    padding: 5px 16px; font-size: 13px; font-weight: 700; color: #1c5282; margin-top: 12px;
  }

  .upgrade-plan-grid { display: flex; gap: 14px; margin-bottom: 28px; }
  .upgrade-plan-card {
    flex: 1; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px 16px;
    cursor: pointer; transition: all 0.2s; position: relative; background: #f8fafc;
  }
  .upgrade-plan-card:hover:not(.disabled-card) { border-color: #94a3b8; transform: translateY(-2px); }
  .upgrade-plan-card.selected { border-color: #1c5282; background: #f0f7ff; box-shadow: 0 8px 20px -5px rgba(28,82,130,0.2); }
  .upgrade-plan-card.selected.lifetime-pick { border-color: #7c3aed; background: #f5f3ff; box-shadow: 0 8px 20px -5px rgba(124,58,237,0.2); }
  .upgrade-plan-card.disabled-card { opacity: 0.45; cursor: not-allowed; }
  .upgrade-plan-card h3 { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 6px; }
  .upgrade-plan-card .uprice { font-size: 24px; font-weight: 800; color: #1c5282; margin-bottom: 8px; }
  .upgrade-plan-card.lifetime-pick .uprice { color: #7c3aed; }
  .upgrade-plan-card .uprice span { font-size: 13px; font-weight: 500; color: #94a3b8; }
  .upgrade-plan-card p { font-size: 12px; color: #475569; margin: 0; line-height: 1.5; }
  .upgrade-plan-card .ubadge {
    position: absolute; top: -10px; right: 10px;
    color: #fff; font-size: 10px; font-weight: 800; padding: 3px 9px;
    border-radius: 12px; text-transform: uppercase; letter-spacing: 0.4px;
  }
  .ubadge-current { background: #10b981; }
  .ubadge-best    { background: #f59e0b; }
  .ubadge-life    { background: #7c3aed; }

  .upgrade-lf-features {
    background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px;
    padding: 10px 14px; margin-top: 10px;
  }
  .upgrade-lf-features div { font-size: 12px; color: #5b21b6; margin: 3px 0; }

  .upgrade-error { background: #fef2f2; color: #dc2626; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; font-weight: 500; }

  .upgrade-footer { display: flex; gap: 12px; justify-content: flex-end; }
  .upgrade-btn-cancel {
    background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;
    padding: 12px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px;
  }
  .upgrade-btn-pay {
    background: #1c5282; color: white; border: none;
    padding: 12px 28px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; flex: 1;
    transition: background 0.2s; min-height: 46px; display: flex; align-items: center; justify-content: center;
  }
  .upgrade-btn-pay.lf-btn { background: #7c3aed; }
  .upgrade-btn-pay:hover { background: #154066; }
  .upgrade-btn-pay.lf-btn:hover { background: #6d28d9; }
  .upgrade-btn-pay:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

  .upgrade-note {
    text-align: center; font-size: 12px; color: #94a3b8; margin-top: 16px;
  }

  @media (max-width: 650px) {
    .upgrade-plan-grid { flex-direction: column; }
    .upgrade-footer { flex-direction: column-reverse; }
    .upgrade-box { padding: 28px 18px; }
  }
`;

const PLAN_RANK: Record<string, number> = { TRIAL: 0, MONTHLY: 1, YEARLY: 2, LIFETIME: 3 };

export default function PlanUpgradeModal({ currentUser, onUpgradeSuccess, onClose }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const currentRank = PLAN_RANK[currentUser?.plan || 'TRIAL'] ?? 0;

  useEffect(() => {
    // Default selection: next plan up
    if (currentRank < 1) setSelectedPlan('MONTHLY');
    else if (currentRank < 2) setSelectedPlan('YEARLY');
    else setSelectedPlan('LIFETIME');
  }, [currentRank]);

  useEffect(() => {
    const styleId = 'plan-upgrade-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = UPGRADE_CSS;
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

  const handlePay = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    setError('');
    try {
      const resRazorpay = await loadRazorpay();
      if (!resRazorpay) throw new Error('Razorpay SDK load failed. Check internet.');

      // 1. Create order
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan })
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Order creation failed');

      // 2. Open Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'LedgerX ERP',
        description: selectedPlan === 'LIFETIME' ? 'Lifetime Access — One Time' : `Upgrade to ${selectedPlan} Plan`,
        order_id: orderData.id,
        handler: async (response: any) => {
          try {
            // 3. Verify & upgrade
            const token = authClient.getToken();
            const verifyRes = await fetch('/api/payment/upgrade-plan', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_signature:  response.razorpay_signature,
                plan: selectedPlan
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              // Update sessionStorage
              const userStr = sessionStorage.getItem('tally_auth_user');
              if (userStr) {
                const userObj = JSON.parse(userStr);
                userObj.plan = selectedPlan;
                userObj.subscriptionExpiry = verifyData.user.subscriptionExpiry;
                sessionStorage.setItem('tally_auth_user', JSON.stringify(userObj));
              }
              alert(selectedPlan === 'LIFETIME'
                ? '🎉 Congratulations! You now have Lifetime Access. You will never need to renew again!'
                : `✅ Plan upgraded to ${selectedPlan} successfully!`);
              onUpgradeSuccess(verifyData.user);
            } else {
              setError(verifyData.error || 'Payment verification failed');
            }
          } catch {
            setError('Payment verification failed. Contact support.');
          }
        },
        prefill: { name: currentUser.name, email: currentUser.email },
        theme: { color: selectedPlan === 'LIFETIME' ? '#7c3aed' : '#1c5282' }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      key: 'MONTHLY',
      label: 'Monthly',
      price: '₹299',
      suffix: '/mo',
      desc: 'Flexible monthly billing.',
      badge: null,
      badgeCls: '',
    },
    {
      key: 'YEARLY',
      label: 'Yearly',
      price: '₹1,999',
      suffix: '/yr',
      desc: 'Save ₹1,589/yr vs monthly.',
      badge: 'Best Value',
      badgeCls: 'ubadge-best',
    },
    {
      key: 'LIFETIME',
      label: 'Lifetime',
      price: '₹11,999',
      suffix: ' one-time',
      desc: 'Pay once, use forever. No renewals.',
      badge: 'Lifetime',
      badgeCls: 'ubadge-life',
    },
  ];

  const currentPlanLabel =
    currentUser?.plan === 'TRIAL' ? '3-Day Trial'
    : currentUser?.plan === 'MONTHLY' ? 'Monthly'
    : currentUser?.plan === 'YEARLY' ? 'Yearly'
    : currentUser?.plan === 'LIFETIME' ? 'Lifetime'
    : currentUser?.plan;

  return (
    <div className="upgrade-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="upgrade-box">
        <div className="upgrade-head">
          <h2>🚀 Upgrade Your Plan</h2>
          <p>Switch to a better plan anytime — no re-registration needed.</p>
          <div className="upgrade-current">📋 Current Plan: {currentPlanLabel}</div>
        </div>

        {error && <div className="upgrade-error">⚠️ {error}</div>}

        <div className="upgrade-plan-grid">
          {plans.map((p) => {
            const rank = PLAN_RANK[p.key];
            const isCurrent = currentUser?.plan === p.key;
            const isDisabled = rank <= currentRank && !isCurrent;
            const isSelected = selectedPlan === p.key;
            const isLifetime = p.key === 'LIFETIME';

            return (
              <div
                key={p.key}
                className={[
                  'upgrade-plan-card',
                  isSelected ? 'selected' : '',
                  isSelected && isLifetime ? 'lifetime-pick' : '',
                  isDisabled ? 'disabled-card' : '',
                ].join(' ')}
                onClick={() => { if (!isDisabled) setSelectedPlan(p.key); }}
              >
                {isCurrent && <div className="ubadge ubadge-current">Current</div>}
                {!isCurrent && p.badge && (
                  <div className={`ubadge ${p.badgeCls}`}>{p.badge}</div>
                )}
                <h3>{p.label}</h3>
                <div className={`uprice ${isLifetime ? 'lifetime-pick' : ''}`}>
                  {p.price}<span>{p.suffix}</span>
                </div>
                <p>{p.desc}</p>
                {isSelected && isLifetime && (
                  <div className="upgrade-lf-features">
                    <div>✓ Never pay again</div>
                    <div>✓ All future updates free</div>
                    <div>✓ Priority support forever</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="upgrade-footer">
          <button className="upgrade-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className={`upgrade-btn-pay ${selectedPlan === 'LIFETIME' ? 'lf-btn' : ''}`}
            onClick={handlePay}
            disabled={loading || !selectedPlan || currentUser?.plan === selectedPlan}
          >
            {loading ? 'Processing...' : selectedPlan === 'LIFETIME'
              ? '💎 Get Lifetime Access — ₹11,999'
              : `Upgrade to ${selectedPlan} Plan`}
          </button>
        </div>

        <div className="upgrade-note">
          🔒 Secure payment via Razorpay. Upgrade takes effect immediately after payment.
        </div>
      </div>
    </div>
  );
}
