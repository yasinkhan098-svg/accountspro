"use client";
import React, { useState } from 'react';
import { authClient } from '@/lib/auth-client';

interface AuthUIProps {
  onLoginSuccess: () => void;
}

export default function AuthUI({ onLoginSuccess }: AuthUIProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      const data = await res.json();
      if (res.ok) {
        authClient.setSession(data.token, data.user);
        onLoginSuccess();
      } else {
        setError(data.error || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Please check your server.');
    } finally {
      setLoading(false);
    }
  };

  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('TRIAL'); // TRIAL, MONTHLY, YEARLY

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
      // 1. Submit Registration (User gets created as PENDING or TRIAL)
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...signupData, plan: selectedPlan })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      const userId = data.userId;

      if (selectedPlan === 'TRIAL') {
        alert('Registration successful! Your 3-Day Free Trial starts now.');
        setStep(1);
        setIsLogin(true);
        setLoading(false);
        return;
      }

      // 2. Paid Plan: Load Razorpay
      const resRazorpay = await loadRazorpay();
      if (!resRazorpay) throw new Error('Razorpay SDK failed to load. Are you online?');

      // 3. Create Order
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan })
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      // 4. Open Razorpay Modal
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
          // If it's the last field, trigger form submission
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    }
  };

  return (
    <div className="auth-wrapper">
      <div className={`auth-container ${isLogin ? 'login-mode' : 'signup-mode'}`}>
        <div className="auth-sidebar">
          <div className="sidebar-content">
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
          <div className="sidebar-footer">
            © 2026 LedgerX ERP Systems
          </div>
        </div>

        <div className="auth-form-section">
          <div className="form-header">
            <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p>{isLogin ? 'Please enter your credentials to access your dashboard' : 'Fill in the details to register your organization'}</p>
          </div>

          {error && (
            <div className="error-alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span>{error}</span>
            </div>
          )}

          {isLogin ? (
            <form onSubmit={handleLogin} className="premium-form">
              <div className="input-field">
                <label>USER ID / EMAIL <span className="req">*</span></label>
                <div className="input-wrapper">
                  <input type="email" required autoFocus placeholder="name@company.com" 
                    onKeyDown={handleKeyDown}
                    value={loginData.email} onChange={(e) => setLoginData({...loginData, email: e.target.value})} />
                </div>
              </div>
              <div className="input-field">
                <label>PASSWORD <span className="req">*</span></label>
                <div className="input-wrapper">
                  <input type="password" required placeholder="••••••••" 
                    onKeyDown={handleKeyDown}
                    value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <span className="loader"></span> : 'SIGN IN'}
              </button>
              <div className="form-footer">
                Don't have an account? <button type="button" onClick={() => setIsLogin(false)}>Register Organization</button>
              </div>
            </form>
          ) : step === 1 ? (
            <form onSubmit={handleSignupStep1} className="premium-form signup-grid">
              <div className="input-field">
                <label>FULL NAME <span className="req">*</span></label>
                <input type="text" required autoFocus onKeyDown={handleKeyDown} value={signupData.name} onChange={(e) => setSignupData({...signupData, name: e.target.value})} />
              </div>
              <div className="input-field">
                <label>ORGANIZATION <span className="req">*</span></label>
                <input type="text" required onKeyDown={handleKeyDown} value={signupData.organizationName} onChange={(e) => setSignupData({...signupData, organizationName: e.target.value})} />
              </div>
              <div className="input-field">
                <label>MOBILE NO <span className="req">*</span></label>
                <input type="text" required onKeyDown={handleKeyDown} value={signupData.mobile} onChange={(e) => setSignupData({...signupData, mobile: e.target.value})} />
              </div>
              <div className="input-field">
                <label>PROFESSION <span className="req">*</span></label>
                <input type="text" required onKeyDown={handleKeyDown} value={signupData.profession} onChange={(e) => setSignupData({...signupData, profession: e.target.value})} />
              </div>
              <div className="input-field full-width">
                <label>OFFICE ADDRESS <span className="req">*</span></label>
                <input type="text" required onKeyDown={handleKeyDown} value={signupData.address} onChange={(e) => setSignupData({...signupData, address: e.target.value})} />
              </div>
              <div className="input-field full-width">
                <label>EMAIL ID (USER ID) <span className="req">*</span></label>
                <input type="email" required onKeyDown={handleKeyDown} value={signupData.email} onChange={(e) => setSignupData({...signupData, email: e.target.value})} />
              </div>
              <div className="input-field">
                <label>PASSWORD <span className="req">*</span></label>
                <input type="password" required onKeyDown={handleKeyDown} value={signupData.password} onChange={(e) => setSignupData({...signupData, password: e.target.value})} />
              </div>
              <div className="input-field">
                <label>CONFIRM PASSWORD <span className="req">*</span></label>
                <input type="password" required onKeyDown={handleKeyDown} value={signupData.confirmPassword} onChange={(e) => setSignupData({...signupData, confirmPassword: e.target.value})} />
              </div>
              <div className="form-actions full-width">
                <button type="submit" className="btn-primary">
                  CONTINUE TO PLANS
                </button>
                <div className="form-footer">
                  Already registered? <button type="button" onClick={() => setIsLogin(true)}>Back to Login</button>
                </div>
              </div>
            </form>
          ) : (
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
                  <div className="price">₹999<span>/yr</span></div>
                  <p>Save massive amounts with annual billing.</p>
                </div>
              </div>
              <div className="form-actions" style={{ marginTop: 30, display: 'flex', gap: 10 }}>
                <button type="button" className="btn-secondary" onClick={() => setStep(1)} disabled={loading}>
                  Back
                </button>
                <button type="button" className="btn-primary" style={{ flex: 1, marginTop: 0 }} onClick={handleSignupStep2} disabled={loading}>
                  {loading ? <span className="loader"></span> : (selectedPlan === 'TRIAL' ? 'START FREE TRIAL' : 'PAY & REGISTER')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .auth-wrapper {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: #0f172a;
          background-image: radial-gradient(circle at 2px 2px, #1e293b 1px, transparent 0);
          background-size: 40px 40px;
          display: flex; justify-content: center; align-items: center;
          padding: 20px; z-index: 10000; overflow-y: auto;
        }
        .auth-container {
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

        .auth-form-section { flex: 1; padding: 40px 60px; display: flex; flex-direction: column; background: #fff; }
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
        }
        .btn-primary:hover { background: #154066; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(28, 82, 130, 0.25); }
        .btn-primary:active { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

        .form-footer { text-align: center; font-size: 13px; color: #64748b; margin-top: 20px; }
        .form-footer button {
          background: none; border: none; color: #1c5282; font-weight: 700;
          cursor: pointer; padding: 0 4px; text-decoration: underline;
        }

        .loader {
          width: 20px; height: 20px; border: 2px solid #fff; border-bottom-color: transparent;
          border-radius: 50%; display: inline-block; animation: rotation 1s linear infinite;
        }
        @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        @media (max-width: 850px) {
          .auth-container { flex-direction: column; height: auto; }
          .auth-sidebar { width: 100%; padding: 30px; }
          .auth-form-section { padding: 30px; }
          .signup-grid { grid-template-columns: 1fr; }
          .input-field.full-width { grid-column: span 1; }
          .plan-cards { flex-direction: column; }
        }

        .plan-selection {
          display: flex; flex-direction: column; height: 100%; justify-content: center;
        }
        .plan-cards {
          display: flex; gap: 20px;
        }
        .plan-card {
          flex: 1; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px;
          cursor: pointer; transition: all 0.2s; position: relative; background: #f8fafc;
        }
        .plan-card:hover { border-color: #94a3b8; transform: translateY(-2px); }
        .plan-card.active {
          border-color: #1c5282; background: #f0f7ff;
          box-shadow: 0 10px 25px -5px rgba(28, 82, 130, 0.2);
        }
        .plan-card h3 { margin: 0 0 10px; font-size: 18px; color: #0f172a; }
        .plan-card .price { font-size: 28px; font-weight: 800; color: #1c5282; margin-bottom: 12px; }
        .plan-card .price span { font-size: 14px; font-weight: 600; color: #64748b; }
        .plan-card p { font-size: 13px; color: #475569; margin: 0; line-height: 1.5; }
        .plan-card .badge {
          position: absolute; top: -10px; right: 10px; background: #f59e0b;
          color: #fff; font-size: 11px; font-weight: 800; padding: 4px 8px;
          border-radius: 12px; letter-spacing: 0.5px; text-transform: uppercase;
        }
        .btn-secondary {
          background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;
          padding: 14px 24px; border-radius: 8px; font-size: 14px; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-secondary:hover { background: #e2e8f0; }
      `}</style>
    </div>
  );
}
