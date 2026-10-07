"use client";
import React, { useState, useEffect } from 'react';
import { offlineSyncService, OfflineGuardResult } from '@/lib/offlineSyncService';
import { authClient } from '@/lib/auth-client';
import { Lock, ShieldAlert, Key, RefreshCw, Wifi, WifiOff } from 'lucide-react';

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

  const isExpired = guardResult.reason === 'EXPIRED';
  const isClockRollback = guardResult.reason === 'CLOCK_ROLLBACK';
  const isNoLicense = guardResult.reason === 'NO_LICENSE' || guardResult.reason === 'INVALID_TOKEN';

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
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          licenseKey: licenseKey.trim().toUpperCase(),
          machineId,
          deviceName: 'Windows Desktop PC',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Activation failed');
      }

      if (data.token) {
        await offlineSyncService.saveOfflineToken(data.token);
        if (data.user) {
          authClient.setSession(data.token, data.user, data.token);
        }
        setSuccess('License activated successfully! Offline mode permanently unlocked.');
        setTimeout(() => {
          onActivated();
        }, 800);
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
        maxWidth: 540,
        width: '100%',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        border: '1px solid #cbd5e1',
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
            <div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: '#475569', marginBottom: 20 }}>
                {guardResult.message || 'Your desktop offline license has expired. To resume working offline, please reconnect your computer to the internet and renew your plan.'}
              </div>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20, fontSize: 13 }}>
                <div><strong>Registered Account:</strong> {guardResult.payload?.email || 'N/A'}</div>
                <div style={{ marginTop: 4 }}><strong>License Key:</strong> <code style={{ color: '#0284c7' }}>{guardResult.payload?.licenseKey || 'N/A'}</code></div>
                <div style={{ marginTop: 4, color: '#dc2626' }}><strong>Expired On:</strong> {guardResult.expiryDate ? guardResult.expiryDate.toLocaleDateString('en-GB') : 'Expired'}</div>
              </div>
              <button
                onClick={() => window.location.reload()}
                style={{
                  width: '100%',
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <RefreshCw size={18} />
                <span>Check for Online Renewal</span>
              </button>
            </div>
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
                  placeholder="yasin.khan098@gmail.com"
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
                  placeholder="LX-ADMIN-MASTER-2027"
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
