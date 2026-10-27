"use client";
import React, { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import { offlineSyncService } from '@/lib/offlineSyncService';

interface AuthUIProps {
  onLoginSuccess: () => void;
}

// CSS component ke bahar - har keystroke pe re-inject nahi hoga
const AUTH_CSS = `
  .auth-wrapper {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: #0b1320;
    display: flex; justify-content: center; align-items: center;
    padding: 20px; z-index: 10000; overflow-y: auto;
  }
  .auth-bg-layer {
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
  }
  .auth-bg-canvas {
    position: absolute;
    top: 50%;
    left: 50%;
    width: max(100vw, 100vh);
    height: max(100vw, 100vh);
    transform: translate(-50%, -50%);
  }
  .auth-bg-img {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    object-fit: fill;
    display: block;
  }
  .auth-monitor-video-frame {
    position: absolute;
    left: 10.25%;
    top: 32.55%;
    width: 15.35%;
    height: 12.0%;
    overflow: hidden;
    background: #000;
    border-radius: 6px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1);
    pointer-events: auto;
    cursor: pointer;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }
  .auth-monitor-video-frame:hover {
    transform: scale(1.03);
    box-shadow: 0 8px 28px rgba(255, 0, 0, 0.5), 0 0 0 1px rgba(255, 0, 0, 0.4);
  }
  .auth-monitor-link {
    display: block;
    width: 100%;
    height: 100%;
    position: relative;
    text-decoration: none;
    cursor: pointer;
  }
  .auth-monitor-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border: 0;
    pointer-events: none;
  }
  .auth-monitor-badge {
    position: absolute;
    bottom: 6px;
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    background: rgba(15, 23, 42, 0.92);
    color: #ffffff;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.3px;
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.25);
  }
  .auth-monitor-video-frame:hover .auth-monitor-badge {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  /* ===== RIGHT SIDE: DOWNLOAD & ACTIVATION GUIDE CARD (Yellow Box) ===== */
  .auth-guide-card {
    position: absolute;
    left: 80.85%;
    top: 29.5%;
    width: 17.85%;
    height: 11.2%;
    background: rgba(15, 23, 42, 0.94);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(241, 196, 15, 0.45);
    border-top: 3px solid #f1c40f;
    border-radius: 8px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.7), 0 0 20px rgba(241, 196, 15, 0.12);
    pointer-events: auto;
    color: #e2e8f0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 10;
    transition: box-shadow 0.25s ease, border-color 0.25s ease;
  }
  .auth-guide-card:hover {
    border-color: #f1c40f;
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.8), 0 0 26px rgba(241, 196, 15, 0.25);
  }
  .auth-guide-header {
    padding: 7px 10px;
    background: linear-gradient(180deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.75) 100%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    flex-shrink: 0;
  }
  .auth-guide-header-title {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .auth-guide-icon {
    width: 18px;
    height: 18px;
    background: #f1c40f;
    color: #0f172a;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 900;
  }
  .auth-guide-h3 {
    margin: 0;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.5px;
    color: #ffffff;
    text-transform: uppercase;
  }
  .auth-guide-badge {
    font-size: 8px;
    font-weight: 700;
    background: rgba(241, 196, 15, 0.18);
    color: #f1c40f;
    padding: 2px 5px;
    border-radius: 3px;
    border: 1px solid rgba(241, 196, 15, 0.35);
    letter-spacing: 0.3px;
  }
  .auth-guide-body {
    flex: 1;
    overflow-y: auto;
    padding: 8px 10px 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .auth-guide-body::-webkit-scrollbar {
    width: 4px;
  }
  .auth-guide-body::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.25);
  }
  .auth-guide-body::-webkit-scrollbar-thumb {
    background: #f1c40f;
    border-radius: 4px;
  }
  .auth-step-item {
    display: flex;
    gap: 7px;
    align-items: flex-start;
  }
  .auth-step-num {
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: rgba(241, 196, 15, 0.2);
    color: #f1c40f;
    border: 1px solid rgba(241, 196, 15, 0.5);
    font-size: 8px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .auth-step-content {
    flex: 1;
    font-size: 9.5px;
    line-height: 1.45;
    color: #cbd5e1;
  }
  .auth-step-content strong {
    color: #ffffff;
    font-weight: 700;
  }
  .auth-guide-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    background: linear-gradient(135deg, #f1c40f 0%, #e67e22 100%);
    color: #0f172a;
    font-weight: 800;
    font-size: 9.5px;
    padding: 5px 8px;
    border-radius: 5px;
    text-decoration: none;
    margin-top: 2px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    transition: transform 0.15s ease, filter 0.15s ease;
  }
  .auth-guide-btn:hover {
    transform: translateY(-1px);
    filter: brightness(1.1);
  }
  .auth-wrapper::before {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: none;
    z-index: 1;
    pointer-events: none;
  }
  .auth-container {
    position: relative;
    z-index: 2;
    background: #fff;
    display: flex;
    width: 100%;
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .login-mode { max-width: 900px; height: 550px; }
  .signup-mode { max-width: 1100px; min-height: 650px; }

  .auth-sidebar {
    background: #1c5282;
    width: 35%; color: white;
    padding: 40px; display: flex; flex-direction: column;
    justify-content: space-between; position: relative;
  }
  .logo-section { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .logo-box {
    background: #f1c40f; color: #1c5282; width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 8px; font-weight: 900; font-size: 24px;
  }
  .logo-section h1 { font-size: 24px; letter-spacing: -0.5px; font-weight: 700; margin: 0; }
  .sidebar-desc { font-size: 14px; opacity: 0.8; line-height: 1.6; margin-bottom: 30px; }
  .sidebar-features { display: flex; flex-direction: column; gap: 12px; }
  .feature-item { font-size: 13px; font-weight: 500; background: rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 6px; }
  .sidebar-footer { font-size: 11px; opacity: 0.6; }

  .auth-form-section { flex: 1; padding: 40px 60px; display: flex; flex-direction: column; background: #fff; overflow-y: auto; }
  .form-header { margin-bottom: 30px; }
  .form-header h2 { font-size: 28px; color: #0f172a; margin: 0 0 8px; font-weight: 700; }
  .form-header p { font-size: 14px; color: #64748b; margin: 0; }

  .error-alert {
    background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2;
    padding: 12px 16px; border-radius: 8px; margin-bottom: 24px;
    display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 500;
  }

  .premium-form { display: flex; flex-direction: column; gap: 20px; }
  .signup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .input-field { display: flex; flex-direction: column; gap: 6px; }
  .input-field.full-width { grid-column: span 2; }

  .input-field label { font-size: 11px; font-weight: 700; color: #475569; letter-spacing: 0.5px; }
  .req { color: #dc2626; margin-left: 3px; }

  .input-field input {
    background: #f8fafc; border: 1px solid #e2e8f0;
    padding: 10px 14px; border-radius: 8px; font-size: 14px;
    transition: all 0.2s; color: #1e293b; width: 100%;
    box-sizing: border-box;
  }
  .input-field input:focus {
    background: #fff; border-color: #1c5282;
    box-shadow: 0 0 0 4px rgba(28, 82, 130, 0.1); outline: none;
  }

  .btn-primary {
    background: #1c5282; color: white; border: none;
    padding: 14px; border-radius: 8px; font-size: 14px; font-weight: 700;
    cursor: pointer; transition: all 0.2s; margin-top: 10px;
    display: flex; justify-content: center; align-items: center; min-height: 46px;
    width: 100%;
  }
  .btn-primary:hover { background: #154066; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(28, 82, 130, 0.25); }
  .btn-primary:active { transform: translateY(0); }
  .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

  .form-footer { text-align: center; font-size: 13px; color: #64748b; margin-top: 20px; }
  .form-footer button {
    background: none; border: none; color: #1c5282; font-weight: 700;
    cursor: pointer; padding: 0 4px; text-decoration: underline;
  }

  .auth-loader {
    width: 20px; height: 20px; border: 2px solid #fff; border-bottom-color: transparent;
    border-radius: 50%; display: inline-block; animation: authSpin 1s linear infinite;
  }
  @keyframes authSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

  .plan-selection { display: flex; flex-direction: column; height: 100%; justify-content: center; }
  .plan-cards { display: flex; gap: 20px; }
  .plan-card {
    flex: 1; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px;
    cursor: pointer; transition: all 0.2s; position: relative; background: #f8fafc;
  }
  .plan-card:hover { border-color: #94a3b8; transform: translateY(-2px); }
  .plan-card.active {
    border-color: #1c5282; background: #f0f7ff;
    box-shadow: 0 10px 25px -5px rgba(28, 82, 130, 0.2);
  }
  .plan-card.active.lifetime {
    border-color: #7c3aed; background: #f5f3ff;
    box-shadow: 0 10px 25px -5px rgba(124, 58, 237, 0.2);
  }
  .plan-card h3 { margin: 0 0 10px; font-size: 18px; color: #0f172a; }
  .plan-card .price { font-size: 28px; font-weight: 800; color: #1c5282; margin-bottom: 12px; }
  .plan-card.lifetime .price { color: #7c3aed; }
  .plan-card .price span { font-size: 14px; font-weight: 600; color: #64748b; }
  .plan-card p { font-size: 13px; color: #475569; margin: 0; line-height: 1.5; }
  .plan-card .badge {
    position: absolute; top: -10px; right: 10px; background: #f59e0b;
    color: #fff; font-size: 11px; font-weight: 800; padding: 4px 8px;
    border-radius: 12px; letter-spacing: 0.5px; text-transform: uppercase;
  }
  .plan-card .badge.badge-lifetime {
    background: #7c3aed;
  }
  .btn-secondary {
    background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;
    padding: 14px 24px; border-radius: 8px; font-size: 14px; font-weight: 700;
    cursor: pointer; transition: all 0.2s;
  }
  .btn-secondary:hover { background: #e2e8f0; }
  .input-wrapper { position: relative; }
  .form-actions { display: flex; gap: 10px; }

  /* ===== TABLET (769px - 1024px) ===== */
  @media (min-width: 769px) and (max-width: 1024px) {
    .auth-wrapper {
      padding: 16px;
      align-items: center;
    }
    .login-mode {
      max-width: 680px;
      height: auto;
      min-height: 460px;
    }
    .signup-mode {
      max-width: 800px;
      min-height: auto;
    }
    .auth-sidebar {
      width: 38%;
      padding: 28px 24px;
    }
    .logo-section h1 { font-size: 20px; }
    .sidebar-desc { font-size: 13px; margin-bottom: 20px; }
    .feature-item { font-size: 12px; padding: 6px 10px; }
    .auth-form-section { padding: 28px 32px; }
    .form-header h2 { font-size: 22px; }
    .signup-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
    .plan-cards { flex-wrap: wrap; gap: 12px; }
    .plan-card { flex: 1 1 calc(50% - 12px); min-width: calc(50% - 12px); padding: 18px; }
    .plan-card h3 { font-size: 15px; }
    .plan-card .price { font-size: 22px; }
  }

  /* ===== MOBILE (≤768px) - All phones and small tablets ===== */
  @media (max-width: 768px) {
    .auth-bg-layer { display: none; }
    .auth-wrapper {
      padding: 0;
      align-items: flex-start;
      background-image: url('/auth-bg.png');
      background-size: cover;
      background-position: center center;
    }
    .auth-container {
      flex-direction: column;
      border-radius: 0;
      min-height: 100dvh;
      min-height: 100vh;
      box-shadow: none;
    }
    .login-mode, .signup-mode {
      max-width: 100%;
      height: auto;
      min-height: 100dvh;
      min-height: 100vh;
    }
    .auth-sidebar {
      width: 100%;
      padding: 32px 20px 20px;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      min-height: auto;
    }
    .auth-sidebar > div:first-child {
      flex: 1;
    }
    .logo-section {
      margin-bottom: 0;
    }
    .logo-section h1 { font-size: 20px; }
    .sidebar-desc { display: none; }
    .sidebar-features { display: none; }
    .sidebar-footer { display: none; }
    .auth-form-section {
      flex: 1;
      padding: 24px 20px 32px;
      border-radius: 20px 20px 0 0;
      background: white;
      box-shadow: 0 -8px 30px rgba(0,0,0,0.15);
    }
    .form-header { margin-bottom: 20px; }
    .form-header h2 { font-size: 22px; }
    .form-header p { font-size: 13px; }
    .input-field input {
      padding: 12px 14px;
      font-size: 16px; /* Prevents zoom on iOS */
      min-height: 48px;
      border-radius: 10px;
    }
    .btn-primary {
      padding: 16px;
      font-size: 15px;
      min-height: 52px;
      border-radius: 10px;
    }
    .btn-secondary {
      padding: 14px;
      font-size: 14px;
      min-height: 48px;
      border-radius: 10px;
    }
    .signup-grid {
      grid-template-columns: 1fr;
      gap: 14px;
    }
    .input-field.full-width {
      grid-column: span 1;
    }
    .plan-cards {
      flex-direction: column;
      gap: 12px;
    }
    .plan-card {
      padding: 16px;
    }
    .plan-card h3 { font-size: 16px; }
    .plan-card .price { font-size: 24px; }
    .form-actions {
      flex-direction: column;
    }
    .form-footer { font-size: 14px; margin-top: 16px; }
    .form-footer button { font-size: 14px; }
    .plan-selection { justify-content: flex-start; }
    .error-alert { font-size: 13px; padding: 10px 14px; }
  }
`;


export default function AuthUI({ onLoginSuccess }: AuthUIProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('TRIAL');

  // Signup Fields
  const [signupData, setSignupData] = useState({
    name: '',
    organizationName: '',
    mobile: '',
    address: '',
    profession: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Login Fields
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [loginMethod, setLoginMethod] = useState<'password' | 'license'>('password');
  const [isDesktopApp, setIsDesktopApp] = useState(false);
  const [licenseInput, setLicenseInput] = useState({
    email: '',
    licenseKey: ''
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDesk = Boolean(
        (window as any).desktopBridge?.isDesktopApp ||
        (navigator.userAgent && /electron/i.test(navigator.userAgent)) ||
        window.location.search.includes('desktop=1')
      );
      setIsDesktopApp(isDesk);
      if (!isDesk) {
        setLoginMethod('password');
      }
    }
  }, []);

  // CSS sirf ek baar inject hoga - har re-render pe nahi
  useEffect(() => {
    const styleId = 'auth-ui-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = AUTH_CSS;
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);

  const tryOfflineSession = () => {
    const offlineToken = offlineSyncService.getOfflineToken();
    if (offlineToken) {
      const decoded = offlineSyncService.decodeToken(offlineToken);
      if (decoded.payload && decoded.payload.licenseKey) {
        const user = authClient.getUser() || {
          id: decoded.payload.userId || 1,
          name: decoded.payload.email ? decoded.payload.email.split('@')[0] : 'Licensed User',
          email: decoded.payload.email,
          plan: decoded.payload.plan || 'PRO',
          subscriptionExpiry: decoded.payload.validUntil,
          licenseKey: decoded.payload.licenseKey,
        };
        authClient.setSession(authClient.getToken() || 'offline_license_session', user, offlineToken);
        onLoginSuccess();
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    // Only in desktop app or offline with active license, open directly!
    const isDesk = typeof window !== 'undefined' && Boolean(
      (window as any).desktopBridge?.isDesktopApp ||
      (navigator.userAgent && /electron/i.test(navigator.userAgent)) ||
      window.location.search.includes('desktop=1')
    );
    if ((!navigator.onLine || isDesk) && tryOfflineSession()) {
      // offline session restored
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const machineId = await offlineSyncService.getMachineId();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...loginData, machineId })
      });
      const data = await res.json();
      if (res.ok) {
        authClient.setSession(data.token, data.user, data.offlineToken);
        onLoginSuccess();
      } else {
        setError(data.error || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      if ((!navigator.onLine || offlineSyncService.isDesktopEnvironment()) && tryOfflineSession()) {
        return;
      }
      setError('Connection error. Please check your internet connection or server.');
    } finally {
      setLoading(false);
    }
  };

  const handleLicenseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const machineId = await offlineSyncService.getMachineId();
      const res = await fetch('/api/auth/license-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...licenseInput, machineId })
      });
      const data = await res.json();
      if (res.ok) {
        authClient.setSession(data.token, data.user, data.offlineToken);
        onLoginSuccess();
      } else {
        setError(data.error || 'Invalid License Key or Email.');
      }
    } catch (err) {
      if ((!navigator.onLine || offlineSyncService.isDesktopEnvironment()) && tryOfflineSession()) {
        return;
      }
      setError('Connection error. Please check your internet connection or server.');
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSignupStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setStep(2);
    setError('');
  };

  const handleSignupStep2 = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...signupData, plan: selectedPlan })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Registration failed');

      const userId = data.userId;

      if (selectedPlan === 'TRIAL') {
        alert('Registration successful! Your 3-Day Free Trial starts now.');
        setStep(1);
        setIsLogin(true);
        setLoading(false);
        return;
      }

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
        description: `${selectedPlan} Subscription`,
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
                userId,
                plan: selectedPlan
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              alert('Payment Successful! Registration Complete.');
              setStep(1);
              setIsLogin(true);
            } else {
              setError(verifyData.error || 'Payment verification failed');
            }
          } catch (err) {
            setError('Payment verification failed');
          }
        },
        prefill: {
          name: signupData.name,
          email: signupData.email,
          contact: signupData.mobile
        },
        theme: { color: '#1c5282' }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const form = (e.target as HTMLElement).closest('form');
      if (form) {
        const inputs = Array.from(form.querySelectorAll('input, select, textarea')) as HTMLElement[];
        const idx = inputs.indexOf(e.target as HTMLElement);
        if (idx >= 0 && idx < inputs.length - 1) {
          inputs[idx + 1].focus();
        } else if (idx === inputs.length - 1) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Background with video playing inside the monitor screen */}
      <div className="auth-bg-layer">
        <div className="auth-bg-canvas">
          <img src="/auth-bg.png" alt="" className="auth-bg-img" />
          <div className="auth-monitor-video-frame">
            <a
              href="https://www.youtube.com/watch?v=hjsto8zoWR8"
              target="_blank"
              rel="noopener noreferrer"
              className="auth-monitor-link"
              title="LedgerX ERP Tutorial - Click to watch on YouTube"
            >
              <iframe
                src="https://www.youtube-nocookie.com/embed/hjsto8zoWR8?autoplay=1&mute=1&loop=1&playlist=hjsto8zoWR8&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1"
                title="LedgerX ERP Tutorial"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                className="auth-monitor-video"
              />
              <div className="auth-monitor-badge">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="#ff0000">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span>YouTube ↗</span>
              </div>
            </a>
          </div>

          {/* Right: Smart & Premium Download / Activation Guide Card */}
          <div className="auth-guide-card">
            <div className="auth-guide-header">
              <div className="auth-guide-header-title">
                <div className="auth-guide-icon">⚡</div>
                <h3 className="auth-guide-h3">DOWNLOAD / ACTIVATION</h3>
              </div>
              <span className="auth-guide-badge">Desktop App</span>
            </div>
            <div className="auth-guide-body">
              <a href="/api/download/desktop-setup?os=windows" download className="auth-guide-btn">
                <span>⬇</span> Download Windows App (.exe)
              </a>

              <div className="auth-step-item">
                <div className="auth-step-num">1</div>
                <div className="auth-step-content">
                  <strong>Download Setup</strong>: Upar diye gaye button se <code>LedgerX-Setup.exe</code> download karein.
                </div>
              </div>

              <div className="auth-step-item">
                <div className="auth-step-num">2</div>
                <div className="auth-step-content">
                  <strong>Easy Install</strong>: Setup run karein. Windows prompt aane par <em>"More info &gt; Run anyway"</em> karein.
                </div>
              </div>

              <div className="auth-step-item">
                <div className="auth-step-num">3</div>
                <div className="auth-step-content">
                  <strong>Get License Key</strong>: Pehle web portal par <em>"Register Organization"</em> karke License Key generate karein.
                </div>
              </div>

              <div className="auth-step-item">
                <div className="auth-step-num">4</div>
                <div className="auth-step-content">
                  <strong>Device Activation</strong>: Desktop App me <strong>"License Key Activation"</strong> tab me Email &amp; Key enter karein.
                </div>
              </div>

              <div className="auth-step-item">
                <div className="auth-step-num">5</div>
                <div className="auth-step-content">
                  <strong>100% Offline ERP</strong>: Activate hote hi app bina internet ke chalegi aur online aate hi auto-sync hogi.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`auth-container ${isLogin ? 'login-mode' : 'signup-mode'}`}>

        {/* Sidebar */}
        <div className="auth-sidebar">
          <div>
            <div className="logo-section">
              <div className="logo-box">L</div>
              <h1>LedgerX</h1>
            </div>
            <p className="sidebar-desc">
              Advanced Enterprise Accounting Solution with keyboard-first intelligence.
            </p>
            <div className="sidebar-features">
              <div className="feature-item">✓ Multi-Company Isolation</div>
              <div className="feature-item">✓ Cloud Session Persistence</div>
              <div className="feature-item">✓ LedgerX-Compatible Shortcuts</div>
            </div>
          </div>
          <div className="sidebar-footer">© 2026 LedgerX ERP Systems</div>
        </div>

        {/* Form Section */}
        <div className="auth-form-section">
          <div className="form-header">
            <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p>{isLogin ? 'Please enter your credentials to access your dashboard' : 'Fill in the details to register your organization'}</p>
          </div>

          {error && (
            <div className="error-alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {isLogin ? (
            <div>
              {/* Method Switcher Tabs - ONLY in Desktop App */}
              {isDesktopApp && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 18, background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
                  <button
                    type="button"
                    onClick={() => { setLoginMethod('password'); setError(''); }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: 'none',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      background: loginMethod === 'password' ? '#ffffff' : 'transparent',
                      color: loginMethod === 'password' ? '#0f172a' : '#64748b',
                      boxShadow: loginMethod === 'password' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    🔒 Password Login
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginMethod('license'); setError(''); }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: 'none',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      background: loginMethod === 'license' ? '#ffffff' : 'transparent',
                      color: loginMethod === 'license' ? '#0284c7' : '#64748b',
                      boxShadow: loginMethod === 'license' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    🔑 License Key Activation
                  </button>
                </div>
              )}

              {/* Connected Server Indicator - ONLY in Desktop App */}
              {isDesktopApp && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16, fontSize: 11, color: '#64748b' }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }}></span>
                  <span>Connected Server: <strong style={{ color: '#0f172a' }}>{typeof window !== 'undefined' ? window.location.origin : 'Cloud'}</strong></span>
                </div>
              )}

              {(!isDesktopApp || loginMethod === 'password') ? (
                <form onSubmit={handleLogin} className="premium-form">
                  <div className="input-field">
                    <label>USER ID / EMAIL <span className="req">*</span></label>
                    <div className="input-wrapper">
                      <input
                        type="email"
                        required
                        autoFocus
                        placeholder="name@company.com"
                        onKeyDown={handleKeyDown}
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="input-field">
                    <label>PASSWORD <span className="req">*</span></label>
                    <div className="input-wrapper">
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        onKeyDown={handleKeyDown}
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? <span className="auth-loader"></span> : 'SIGN IN'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLicenseLogin} className="premium-form">
                  <div className="input-field">
                    <label>REGISTERED EMAIL <span className="req">*</span></label>
                    <div className="input-wrapper">
                      <input
                        type="email"
                        required
                        autoFocus
                        placeholder="name@company.com"
                        onKeyDown={handleKeyDown}
                        value={licenseInput.email}
                        onChange={(e) => setLicenseInput({ ...licenseInput, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="input-field">
                    <label>ACTIVATION LICENSE KEY <span className="req">*</span></label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        required
                        placeholder="e.g. LX-0001-A9F2-2026"
                        style={{ fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}
                        onKeyDown={handleKeyDown}
                        value={licenseInput.licenseKey}
                        onChange={(e) => setLicenseInput({ ...licenseInput, licenseKey: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                      Enter your software license key to activate this device offline.
                    </span>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary" style={{ background: '#0284c7' }}>
                    {loading ? <span className="auth-loader"></span> : 'ACTIVATE & SIGN IN'}
                  </button>
                </form>
              )}
              {isDesktopApp && offlineSyncService.getOfflineToken() && (
                <div style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={tryOfflineSession}
                    className="btn-primary"
                    style={{ background: 'linear-gradient(135deg, #059669, #10b981)', width: '100%' }}
                  >
                    ⚡ Open Directly (Active License Mode)
                  </button>
                </div>
              )}
              <div className="form-footer">
                Don&apos;t have an account?{' '}
                <button type="button" onClick={() => { setIsLogin(false); setError(''); }}>
                  Register Organization
                </button>
              </div>
            </div>

          ) : step === 1 ? (
            /* SIGNUP FORM STEP 1 */
            <form onSubmit={handleSignupStep1} className="premium-form signup-grid">
              <div className="input-field">
                <label>FULL NAME <span className="req">*</span></label>
                <input type="text" required autoFocus onKeyDown={handleKeyDown}
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })} />
              </div>
              <div className="input-field">
                <label>ORGANIZATION <span className="req">*</span></label>
                <input type="text" required onKeyDown={handleKeyDown}
                  value={signupData.organizationName}
                  onChange={(e) => setSignupData({ ...signupData, organizationName: e.target.value })} />
              </div>
              <div className="input-field">
                <label>MOBILE NO <span className="req">*</span></label>
                <input type="text" required onKeyDown={handleKeyDown}
                  value={signupData.mobile}
                  onChange={(e) => setSignupData({ ...signupData, mobile: e.target.value })} />
              </div>
              <div className="input-field">
                <label>PROFESSION <span className="req">*</span></label>
                <input type="text" required onKeyDown={handleKeyDown}
                  value={signupData.profession}
                  onChange={(e) => setSignupData({ ...signupData, profession: e.target.value })} />
              </div>
              <div className="input-field full-width">
                <label>OFFICE ADDRESS <span className="req">*</span></label>
                <input type="text" required onKeyDown={handleKeyDown}
                  value={signupData.address}
                  onChange={(e) => setSignupData({ ...signupData, address: e.target.value })} />
              </div>
              <div className="input-field full-width">
                <label>EMAIL ID (USER ID) <span className="req">*</span></label>
                <input type="email" required onKeyDown={handleKeyDown}
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })} />
              </div>
              <div className="input-field">
                <label>PASSWORD <span className="req">*</span></label>
                <input type="password" required onKeyDown={handleKeyDown}
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })} />
              </div>
              <div className="input-field">
                <label>CONFIRM PASSWORD <span className="req">*</span></label>
                <input type="password" required onKeyDown={handleKeyDown}
                  value={signupData.confirmPassword}
                  onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })} />
              </div>
              <div className="full-width">
                <button type="submit" className="btn-primary">CONTINUE TO PLANS</button>
                <div className="form-footer">
                  Already registered?{' '}
                  <button type="button" onClick={() => { setIsLogin(true); setError(''); }}>
                    Back to Login
                  </button>
                </div>
              </div>
            </form>

          ) : (
            /* PLAN SELECTION STEP 2 */
            <div className="plan-selection">
              <div className="plan-cards">
                <div className={`plan-card ${selectedPlan === 'TRIAL' ? 'active' : ''}`} onClick={() => setSelectedPlan('TRIAL')}>
                  <h3>3-Day Trial</h3>
                  <div className="price">₹0</div>
                  <p>Full access for 3 days to test the platform.</p>
                </div>
                <div className={`plan-card ${selectedPlan === 'MONTHLY' ? 'active' : ''}`} onClick={() => setSelectedPlan('MONTHLY')}>
                  <h3>Monthly</h3>
                  <div className="price">₹299<span>/mo</span></div>
                  <p>Flexible monthly billing.</p>
                </div>
                <div className={`plan-card ${selectedPlan === 'YEARLY' ? 'active' : ''}`} onClick={() => setSelectedPlan('YEARLY')}>
                  <div className="badge">Best Value</div>
                  <h3>Yearly</h3>
                  <div className="price">₹1999<span>/yr</span></div>
                  <p>Save massive amounts with annual billing.</p>
                </div>
                <div className={`plan-card lifetime ${selectedPlan === 'LIFETIME' ? 'active' : ''}`} onClick={() => setSelectedPlan('LIFETIME')}>
                  <div className="badge badge-lifetime">Lifetime</div>
                  <h3>Lifetime</h3>
                  <div className="price">₹11,999<span> one-time</span></div>
                  <p>Pay once, use forever. No renewals.</p>
                </div>
              </div>
              <div className="form-actions" style={{ marginTop: 30 }}>
                <button type="button" className="btn-secondary" onClick={() => setStep(1)} disabled={loading}>
                  Back
                </button>
                <button type="button" className="btn-primary" style={{ flex: 1, marginTop: 0 }}
                  onClick={handleSignupStep2} disabled={loading}>
                  {loading ? <span className="auth-loader"></span> : (selectedPlan === 'TRIAL' ? 'START FREE TRIAL' : 'PAY & REGISTER')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
