"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import RealtimeDashboardModal from '@/components/dashboard/RealtimeDashboardModal';

export default function LiveDashboardPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [requiresPin, setRequiresPin] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [dashboardData, setDashboardData] = useState<{
    company: any;
    vouchers: any[];
    ledgers: any[];
    stockItems: any[];
    currentPeriod: any;
  } | null>(null);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [generalError, setGeneralError] = useState('');

  // Fetch Dashboard Data
  const fetchData = useCallback(async (pinToUse?: string) => {
    try {
      const storedPin = typeof window !== 'undefined' ? sessionStorage.getItem(`live_pin_${token}`) : '';
      const pinHeader = pinToUse !== undefined ? pinToUse : (storedPin || '');

      const res = await fetch(`/api/live-dashboard/data?token=${encodeURIComponent(token)}`, {
        headers: {
          'x-dashboard-pin': pinHeader
        }
      });

      const data = await res.json();

      if (!res.ok) {
        setGeneralError(data.error || "Unable to load dashboard.");
        setLoading(false);
        return;
      }

      if (data.requiresPin) {
        setRequiresPin(true);
        setCompanyName(data.companyName || 'Company');
        if (data.error) {
          setPinError(data.error);
        }
        setLoading(false);
        return;
      }

      // Success
      setRequiresPin(false);
      setPinError('');
      if (pinToUse) {
        sessionStorage.setItem(`live_pin_${token}`, pinToUse);
      }
      setDashboardData({
        company: data.company,
        vouchers: data.vouchers || [],
        ledgers: data.ledgers || [],
        stockItems: data.stockItems || [],
        currentPeriod: data.currentPeriod
      });
      setLastSynced(new Date());
      setSecondsAgo(0);
      setLoading(false);
    } catch (err: any) {
      console.error("Live dashboard fetch error:", err);
      setGeneralError("Network error. Retrying...");
      setLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 15-second background auto-sync
  useEffect(() => {
    if (requiresPin || !dashboardData) return;

    const syncInterval = setInterval(() => {
      fetchData();
    }, 15000);

    const timerInterval = setInterval(() => {
      setSecondsAgo(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(syncInterval);
      clearInterval(timerInterval);
    };
  }, [requiresPin, dashboardData, fetchData]);

  // Handle PIN input
  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setPinError('');
      if (newPin.length === 4) {
        submitPin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setPinError('');
    }
  };

  const submitPin = async (fullPin: string) => {
    setIsVerifyingPin(true);
    await fetchData(fullPin);
    setIsVerifyingPin(false);
  };

  // Keyboard support for PIN entry
  useEffect(() => {
    if (!requiresPin) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handlePinDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requiresPin, pin]);

  // Loading Screen
  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0f1d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Segoe UI', -apple-system, sans-serif",
        color: '#ffffff'
      }}>
        <div style={{
          width: 50,
          height: 50,
          borderRadius: '50%',
          border: '3px solid rgba(16, 185, 129, 0.2)',
          borderTopColor: '#10b981',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ marginTop: 18, fontWeight: 700, fontSize: 15, letterSpacing: '0.5px' }}>
          Connecting to Live Company Dashboard...
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
          Fetching real-time double-entry calculations
        </div>
      </div>
    );
  }

  // Error Screen (Invalid / Expired link)
  if (generalError && !dashboardData) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0f1d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Segoe UI', -apple-system, sans-serif",
        color: '#ffffff',
        padding: 20,
        textAlign: 'center'
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '2px solid rgba(239, 68, 68, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          marginBottom: 16
        }}>
          ⚠️
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#f87171' }}>
          Dashboard Unavailable
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8', maxWidth: 360, marginTop: 8, lineHeight: 1.5 }}>
          {generalError}
        </div>
        <button
          onClick={() => { setGeneralError(''); setLoading(true); fetchData(); }}
          style={{
            marginTop: 20,
            padding: '8px 20px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // ─── 4-Digit Passcode Lock Screen (PhonePe / ATM Aesthetic) ───
  if (requiresPin) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(145deg, #070d19 0%, #0d1527 50%, #0a0f1d 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Segoe UI', -apple-system, sans-serif",
        color: '#ffffff',
        padding: 20,
        userSelect: 'none'
      }}>
        {/* Passcode Card */}
        <div style={{
          width: '100%',
          maxWidth: 360,
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 20,
          padding: '28px 24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          textAlign: 'center'
        }}>
          {/* Lock Icon */}
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #10b981)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            margin: '0 auto 16px',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
          }}>
            🔒
          </div>

          {/* Entity Name */}
          <div style={{
            display: 'inline-block',
            padding: '2px 12px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 20,
            fontSize: 10.5,
            fontWeight: 700,
            color: '#38bdf8',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: 8
          }}>
            {companyName || 'Business Entity'}
          </div>

          <div style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.3px' }}>
            Enter 4-Digit Passcode
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            Live business dashboard is protected
          </div>

          {/* 4 PIN Dots */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 16,
            margin: '24px 0 16px'
          }}>
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pin.length > index;
              return (
                <div
                  key={index}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: isFilled ? '#10b981' : 'rgba(255, 255, 255, 0.12)',
                    border: isFilled ? '2px solid #34d399' : '2px solid rgba(255, 255, 255, 0.25)',
                    boxShadow: isFilled ? '0 0 12px #10b981' : 'none',
                    transform: isFilled ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}
                />
              );
            })}
          </div>

          {/* Error Message */}
          {pinError && (
            <div style={{
              color: '#f87171',
              fontSize: 11,
              fontWeight: 600,
              marginBottom: 12,
              animation: 'shake 0.3s ease-in-out'
            }}>
              {pinError}
            </div>
          )}
          <style>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              20%, 60% { transform: translateX(-6px); }
              40%, 80% { transform: translateX(6px); }
            }
          `}</style>

          {/* Numeric Keypad (Touch / Mobile Optimized) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginTop: 8
          }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                onClick={() => handlePinDigit(digit)}
                disabled={isVerifyingPin}
                style={{
                  height: 52,
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: 20,
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s, transform 0.1s'
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {digit}
              </button>
            ))}
            {/* Blank placeholder */}
            <div></div>
            {/* '0' Button */}
            <button
              onClick={() => handlePinDigit('0')}
              disabled={isVerifyingPin}
              style={{
                height: 52,
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: 20,
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s, transform 0.1s'
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              0
            </button>
            {/* Backspace Button */}
            <button
              onClick={handleBackspace}
              disabled={isVerifyingPin}
              style={{
                height: 52,
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#fca5a5',
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s, transform 0.1s'
              }}
              title="Backspace"
            >
              ⌫
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Live Dashboard View (Standalone Mode) ───
  if (!dashboardData) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      {/* Top Floating Live Sync Pill */}
      <div style={{
        position: 'fixed',
        top: 8,
        right: 12,
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 20,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(16, 185, 129, 0.4)',
        fontSize: 10.5,
        color: '#6ee7b7',
        fontWeight: 700,
        boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        userSelect: 'none'
      }}>
        <span style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: '#10b981',
          boxShadow: '0 0 8px #10b981'
        }} />
        <span>LIVE SYNC</span>
        <span style={{ color: '#94a3b8', fontWeight: 500 }}>
          ({secondsAgo}s ago)
        </span>
      </div>

      <RealtimeDashboardModal
        activeCompany={dashboardData.company}
        vouchers={dashboardData.vouchers}
        ledgers={dashboardData.ledgers}
        stockItems={dashboardData.stockItems}
        currentPeriod={dashboardData.currentPeriod}
        isStandalone={true}
      />
    </div>
  );
}
