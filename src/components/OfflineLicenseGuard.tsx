"use client";
import React, { useState, useEffect } from 'react';
import { offlineSyncService, OfflineGuardResult } from '@/lib/offlineSyncService';
import { authClient } from '@/lib/auth-client';
import { Lock, ShieldAlert, Key, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { detectCountryFromClient, autoDetectCountryAsync, getCountryPricing, ALL_COUNTRY_NAMES, CountryPricingTier } from '@/lib/countryCurrencyPricing';

interface OfflineLicenseGuardProps {
  guardResult: OfflineGuardResult;
  onActivated: () => void;
}

export default function OfflineLicenseGuard({ guardResult, onActivated }: OfflineLicenseGuardProps) {
  const [email, setEmail] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Online Renewal States
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'YEARLY' | 'LIFETIME'>('YEARLY');
  const [selectedCountry, setSelectedCountry] = useState('India');
  const [renewalLoading, setRenewalLoading] = useState(false);
  const [rechecking, setRechecking] = useState(false);

  const isExpired = guardResult.reason === 'EXPIRED';
  const isClockRollback = guardResult.reason === 'CLOCK_ROLLBACK';
  const isNoLicense = guardResult.reason === 'NO_LICENSE' || guardResult.reason === 'INVALID_TOKEN';

  useEffect(() => {
    try {
      const detected = detectCountryFromClient();
      if (detected) setSelectedCountry(detected);
      autoDetectCountryAsync().then((c) => {
        if (c) setSelectedCountry(c);
      });
    } catch (_) {}
  }, []);

  const pricingTier: CountryPricingTier = getCountryPricing(selectedCountry);

  const loadRazorpay = () => new Promise<boolean>((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const handleRenewPayment = async () => {
    if (!navigator.onLine) {
      setError('Active internet connection is required to complete renewal payment. Please connect your PC to Wi-Fi or Mobile Hotspot.');
      return;
    }

    setRenewalLoading(true);
    setError('');
    setSuccess('');

    try {
      const okRzp = await loadRazorpay();
      if (!okRzp) {
        throw new Error('Could not load payment gateway. Please check your internet connection and try again.');
      }

      const cloudBase = (typeof window !== 'undefined' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'))
        ? 'https://www.ledgerxerp.com'
        : '';

      const payerEmail = guardResult.payload?.email || email || '';
      const payerKey = guardResult.payload?.licenseKey || licenseKey || '';
      const machineId = await offlineSyncService.getMachineId();

      // 1. Create payment order in customer's local currency
      const orderRes = await fetch(`${cloudBase}/api/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          country: selectedCountry,
          currency: pricingTier.currencyCode,
          email: payerEmail,
          name: payerEmail.split('@')[0] || 'Subscriber',
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to create renewal order');
      }

      // 2. Open Razorpay Dialog
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency || pricingTier.currencyCode,
        name: 'LedgerX ERP',
        description: selectedPlan === 'LIFETIME'
          ? `Lifetime Access — One-Time (${selectedCountry})`
          : `${selectedPlan} Plan Renewal (${selectedCountry})`,
        order_id: orderData.id,
        prefill: {
          name: payerEmail.split('@')[0] || 'Subscriber',
          email: payerEmail,
        },
        theme: {
          color: selectedPlan === 'LIFETIME' ? '#7c3aed' : '#1c5282',
        },
        modal: {
          ondismiss: function () {
            setRenewalLoading(false);
          },
        },
        handler: async function (response: any) {
          try {
            setRenewalLoading(true);
            const verifyRes = await fetch(`${cloudBase}/api/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                userId: guardResult.payload?.userId,
                email: payerEmail,
                licenseKey: payerKey,
                machineId,
                deviceName: guardResult.payload?.deviceName || 'Windows PC',
                plan: selectedPlan,
                country: selectedCountry,
                currency: orderData.currency || pricingTier.currencyCode,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && (verifyData.success || verifyData.offlineToken)) {
              if (verifyData.offlineToken) {
                await offlineSyncService.saveOfflineToken(verifyData.offlineToken);
              }
              if (verifyData.token && verifyData.user) {
                authClient.setSession(verifyData.token, verifyData.user, verifyData.offlineToken);
              }
              setSuccess('🎉 Payment Successful! Your LedgerX license has been renewed and extended.');
              setShowRenewalModal(false);
              setTimeout(() => {
                onActivated();
              }, 800);
            } else {
              setError(verifyData.error || 'Payment verification failed. Please contact support.');
            }
          } catch (err: any) {
            setError(err?.message || 'Payment verification failed');
          } finally {
            setRenewalLoading(false);
          }
        },
      };

      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.open();

    } catch (err: any) {
      setError(err?.message || 'Something went wrong while initiating renewal payment.');
      setRenewalLoading(false);
    }
  };

  const handleRecheckLicense = async () => {
    if (!navigator.onLine) {
      setError('Active internet connection is required to check your license status with the cloud server.');
      return;
    }
    setRechecking(true);
    setError('');
    setSuccess('');

    try {
      const cloudBase = (typeof window !== 'undefined' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'))
        ? 'https://www.ledgerxerp.com'
        : '';
      const machineId = await offlineSyncService.getMachineId();
      const payerEmail = guardResult.payload?.email || email || '';
      const payerKey = guardResult.payload?.licenseKey || licenseKey || '';

      const res = await fetch(`${cloudBase}/api/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payerEmail,
          licenseKey: payerKey,
          machineId,
          deviceName: guardResult.payload?.deviceName || 'Windows PC',
        }),
      });

      const data = await res.json();
      if (res.ok && (data.token || data.offlineToken)) {
        const offToken = data.offlineToken || data.token;
        if (offToken) {
          await offlineSyncService.saveOfflineToken(offToken);
        }
        if (data.user) {
          authClient.setSession(data.token, data.user, offToken);
        }
        setSuccess('✅ Active license subscription verified! Offline mode unlocked.');
        setTimeout(() => {
          onActivated();
        }, 700);
        return;
      }

      setError(data.error || 'Your subscription is still expired on the cloud server. Please click "Renew Subscription Online" below to complete renewal.');
    } catch (err: any) {
      setError('Could not connect to license server. Please verify your internet connection.');
    } finally {
      setRechecking(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setError('');
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navigator.onLine) {
      setError('Internet connection is required once to activate your License Key. Please turn on Wi-Fi or Mobile Hotspot and try again.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const machineId = await offlineSyncService.getMachineId();
      const payload = {
        email: email.trim().toLowerCase(),
        licenseKey: licenseKey.trim().toUpperCase(),
        machineId,
        deviceName: 'Windows Desktop PC',
      };

      let res: Response;
      try {
        const targetUrl = (typeof window !== 'undefined' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'))
          ? 'https://www.ledgerxerp.com/api/license/activate'
          : '/api/license/activate';
        res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (cloudErr) {
        res = await fetch('/api/license/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Activation failed');
      }

      if (data.token || data.offlineToken) {
        const offToken = data.offlineToken || data.token;
        await offlineSyncService.saveOfflineToken(offToken);
        if (data.user) {
          authClient.setSession(data.token, data.user, offToken);
        }
        if (data.companies && Array.isArray(data.companies) && data.companies.length > 0) {
          try {
            const uId = data.user?.id || 1;
            localStorage.setItem(`tally_u${uId}_companies`, JSON.stringify(data.companies));
            localStorage.setItem('tally_u1_companies', JSON.stringify(data.companies));
          } catch (e) {}
        }
        setSuccess('License activated successfully! Offline mode permanently unlocked.');
        setTimeout(() => {
          onActivated();
        }, 500);
      } else {
        throw new Error('Server did not return a valid offline license token.');
      }
    } catch (err: any) {
      setError(err.message || 'Activation failed. Please check credentials or contact support.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0f172a',
      backgroundImage: 'radial-gradient(ellipse at top, #1e3a8a 0%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      zIndex: 99999,
      fontFamily: 'Segoe UI, -apple-system, sans-serif',
      color: '#ffffff',
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        color: '#1e293b',
        maxWidth: (isExpired && showRenewalModal) ? 740 : 540,
        width: '100%',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        border: '1px solid #cbd5e1',
        transition: 'max-width 0.25s ease',
      }}>
        {/* Header */}
        <div style={{
          background: isExpired ? '#dc2626' : isClockRollback ? '#d97706' : 'linear-gradient(135deg, #1e3a8a, #0284c7)',
          padding: '24px 28px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: 12,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {isExpired ? <ShieldAlert size={32} /> : isClockRollback ? <ShieldAlert size={32} /> : <Lock size={32} />}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
              {isExpired ? 'License Subscription Expired' : isClockRollback ? 'System Clock Error' : 'Desktop License Activation'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
              {isExpired
                ? 'Your offline license validity has expired.'
                : isClockRollback
                ? 'System date rollback was detected.'
                : 'Activate once with your License Key to work 100% offline.'}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px 28px' }}>
          {/* Network indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 8,
            background: isOnline ? '#f0fdf4' : '#fef2f2',
            border: isOnline ? '1px solid #bbf7d0' : '1px solid #fecaca',
            color: isOnline ? '#166534' : '#991b1b',
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 18,
          }}>
            {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
            <span>
              {isOnline
                ? 'Internet Connected — Ready to activate your PC'
                : 'No Internet Connection — Connect Wi-Fi/Hotspot once to complete 1-time activation'}
            </span>
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fee2e2',
              padding: '12px 14px',
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 16,
              fontWeight: 500,
              lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background: '#f0fdf4',
              color: '#16a34a',
              border: '1px solid #bbf7d0',
              padding: '12px 14px',
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 16,
              fontWeight: 600,
            }}>
              {success}
            </div>
          )}

          {isExpired ? (
            showRenewalModal ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                      🚀 Choose Your Renewal Plan
                    </h3>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
                      Select a plan below to immediately renew and continue working offline.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRenewalModal(false)}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    ✕ Back
                  </button>
                </div>

                {/* Country / Currency Selector */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '8px 12px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🌍 Select Country:</span>
                    <select
                      value={selectedCountry}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedCountry(val);
                        try {
                          localStorage.setItem('ledgerx_detected_country', val);
                        } catch (_) {}
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1px solid #94a3b8',
                        fontSize: 12,
                        fontWeight: 600,
                        background: '#ffffff',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      {ALL_COUNTRY_NAMES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0284c7' }}>
                    Currency: {pricingTier.currencyCode} ({pricingTier.currencySymbol})
                  </div>
                </div>

                {/* 3 Plan Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                  gap: 12,
                  marginBottom: 16,
                }}>
                  {/* Monthly */}
                  <div
                    onClick={() => setSelectedPlan('MONTHLY')}
                    style={{
                      border: selectedPlan === 'MONTHLY' ? '2.5px solid #1c5282' : '1px solid #cbd5e1',
                      background: selectedPlan === 'MONTHLY' ? '#f0f7ff' : '#ffffff',
                      boxShadow: selectedPlan === 'MONTHLY' ? '0 6px 16px rgba(28,82,130,0.18)' : 'none',
                      borderRadius: 10,
                      padding: '14px 12px',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Monthly Plan</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#1c5282', margin: '4px 0 2px' }}>
                      {pricingTier.monthly.display}<span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>/mo</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.3 }}>
                      Flexible monthly billing. Renews offline access for 30 days.
                    </div>
                  </div>

                  {/* Yearly */}
                  <div
                    onClick={() => setSelectedPlan('YEARLY')}
                    style={{
                      border: selectedPlan === 'YEARLY' ? '2.5px solid #1c5282' : '1px solid #cbd5e1',
                      background: selectedPlan === 'YEARLY' ? '#f0f7ff' : '#ffffff',
                      boxShadow: selectedPlan === 'YEARLY' ? '0 6px 16px rgba(28,82,130,0.18)' : 'none',
                      borderRadius: 10,
                      padding: '14px 12px',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: -10,
                      right: 10,
                      background: '#f59e0b',
                      color: '#ffffff',
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 10,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}>
                      Best Value
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Yearly Plan</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#1c5282', margin: '4px 0 2px' }}>
                      {pricingTier.yearly.display}<span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>/yr</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.3 }}>
                      Save big with full 365 days of uninterrupted offline access.
                    </div>
                  </div>

                  {/* Lifetime */}
                  <div
                    onClick={() => setSelectedPlan('LIFETIME')}
                    style={{
                      border: selectedPlan === 'LIFETIME' ? '2.5px solid #7c3aed' : '1px solid #cbd5e1',
                      background: selectedPlan === 'LIFETIME' ? '#f5f3ff' : '#ffffff',
                      boxShadow: selectedPlan === 'LIFETIME' ? '0 6px 16px rgba(124,58,237,0.18)' : 'none',
                      borderRadius: 10,
                      padding: '14px 12px',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: -10,
                      right: 10,
                      background: '#7c3aed',
                      color: '#ffffff',
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 10,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}>
                      💎 Lifetime
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#5b21b6' }}>Lifetime Plan</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#7c3aed', margin: '4px 0 2px' }}>
                      {pricingTier.lifetime.display}<span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}> one-time</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.3 }}>
                      Pay once, use forever offline. Zero renewal fees ever.
                    </div>
                  </div>
                </div>

                {/* Lifetime Features Callout */}
                {selectedPlan === 'LIFETIME' && (
                  <div style={{
                    background: '#f5f3ff',
                    border: '1px solid #ddd6fe',
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 14,
                    fontSize: 12,
                    color: '#5b21b6',
                    lineHeight: 1.5,
                  }}>
                    <div>✓ <strong>Lifetime Offline Software Access</strong> (Pay once, use forever)</div>
                    <div>✓ <strong>1-Year Free Cloud Auto-Sync</strong> included</div>
                    <div>✓ All data stored safely on this computer</div>
                    <div>✓ All future software updates included</div>
                  </div>
                )}

                {/* Account Summary Bar */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: 12,
                  color: '#334155',
                }}>
                  <div><strong>Registered Account:</strong> {guardResult.payload?.email || email || 'N/A'}</div>
                  <div style={{ marginTop: 3 }}>
                    <strong>Selected Plan:</strong> <span style={{ color: selectedPlan === 'LIFETIME' ? '#7c3aed' : '#0284c7', fontWeight: 800 }}>{selectedPlan}</span> ({pricingTier[selectedPlan.toLowerCase() as 'monthly' | 'yearly' | 'lifetime'].display})
                  </div>
                </div>

                {/* Pay Button */}
                <button
                  type="button"
                  onClick={handleRenewPayment}
                  disabled={renewalLoading}
                  style={{
                    width: '100%',
                    background: selectedPlan === 'LIFETIME'
                      ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                      : 'linear-gradient(135deg, #1c5282, #0284c7)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px 18px',
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: renewalLoading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    marginBottom: 10,
                  }}
                >
                  <span>{renewalLoading ? 'Processing Renewal...' : `💳 Pay & Renew Now (${pricingTier[selectedPlan.toLowerCase() as 'monthly' | 'yearly' | 'lifetime'].display})`}</span>
                </button>

                <div style={{ textAlign: 'center', fontSize: 11, color: '#64748b' }}>
                  🔒 100% Secure SSL Payment via Razorpay. Offline license is updated instantly upon payment.
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 12,
                  color: '#065f46',
                  fontWeight: 600,
                  lineHeight: 1.4,
                  marginBottom: 16,
                }}>
                  🛡️ <strong>Your Data is 100% Safe:</strong> All your companies, ledgers, and transactions on this computer are completely preserved. Once renewed, you will resume right where you left off!
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: '#475569', marginBottom: 16 }}>
                  {guardResult.message || 'Your desktop offline license has expired. Please reconnect to the internet and renew your subscription.'}
                </div>
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20, fontSize: 13 }}>
                  <div><strong>Registered Account:</strong> {guardResult.payload?.email || 'N/A'}</div>
                  <div style={{ marginTop: 4 }}><strong>License Key:</strong> <code style={{ color: '#0284c7' }}>{guardResult.payload?.licenseKey || 'N/A'}</code></div>
                  <div style={{ marginTop: 4, color: '#dc2626' }}><strong>Expired On:</strong> {guardResult.expiryDate ? guardResult.expiryDate.toLocaleDateString('en-GB') : 'Expired'}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRenewalModal(true)}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #1c5282, #0284c7)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '13px 16px',
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                    boxSizing: 'border-box',
                    boxShadow: '0 4px 12px rgba(2,132,199,0.25)',
                  }}
                >
                  💳 Renew Subscription Online
                </button>
                <button
                  type="button"
                  onClick={handleRecheckLicense}
                  disabled={rechecking}
                  style={{
                    width: '100%',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    padding: '12px 16px',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: rechecking ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <RefreshCw size={18} className={rechecking ? 'animate-spin' : ''} />
                  <span>{rechecking ? 'Checking Cloud License...' : '🔄 I Have Renewed — Re-Check License'}</span>
                </button>
              </div>
            )
          ) : isClockRollback ? (
            <div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#475569' }}>
                The application detected that the system date on this computer was modified backwards.
                For financial audit integrity and offline security, please correct your computer&apos;s date &amp; time.
              </p>
              <button
                onClick={() => window.location.reload()}
                style={{
                  width: '100%',
                  marginTop: 16,
                  background: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Re-check System Time
              </button>
            </div>
          ) : (
            /* Activation Form */
            <form onSubmit={handleActivate}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>
                Enter your registered Organization Email and License Key <b>once</b> to bind this PC. After this one-time activation, you can work 100% offline without internet until your subscription expires.
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
                  Registered Email Address <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
                  Software License Key <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LX-XXXX-XXXX-XXXX"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                }}
              >
                {loading ? <RefreshCw size={18} className="animate-spin" /> : <Key size={18} />}
                <span>{loading ? 'Binding Machine & Activating...' : 'Activate Desktop License'}</span>
              </button>

              <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 12 }}>
                🔒 Single-Device Hardware Binding &bull; Tamper-Proof Cryptographic Vault
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{
          background: '#f8fafc',
          padding: '14px 28px',
          borderTop: '1px solid #e2e8f0',
          fontSize: 12,
          color: '#64748b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>LedgerX Desktop Enterprise</span>
          <span>Single-Device Hardware Lock v2.4</span>
        </div>
      </div>
    </div>
  );
}
