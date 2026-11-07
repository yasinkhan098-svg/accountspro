"use client";
import React, { useState, useEffect, useRef } from 'react';

interface POSSecureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancelToLogin?: () => void;
  onAuthorize: (password: string) => boolean | Promise<boolean>;
  title?: string;
  actionDescription?: string;
  password?: string;
  onPasswordChange?: (val: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export default function POSSecureModal({
  isOpen,
  onClose,
  onCancelToLogin,
  onAuthorize,
  title = 'Secure Mode',
  actionDescription = 'Supervisor / Cashier Authorization',
  password: propPassword,
  onPasswordChange,
  inputRef: externalInputRef,
}: POSSecureModalProps) {
  const [internalPassword, setInternalPassword] = useState('');
  const password = propPassword !== undefined ? propPassword : internalPassword;
  const setPassword = (val: string) => {
    if (onPasswordChange) onPasswordChange(val);
    else setInternalPassword(val);
  };
  const passwordRef = useRef(password);
  useEffect(() => {
    passwordRef.current = password;
  }, [password]);

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const localInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef || localInputRef;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const currentPwd = (passwordRef.current || '').trim();
    if (!currentPwd) {
      setErrorMsg('Password is required');
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const ok = await onAuthorize(currentPwd);
      if (ok) {
        setPassword('');
        onClose();
      } else {
        setErrorMsg('Invalid password!');
        inputRef.current?.focus();
      }
    } catch (err: any) {
      setErrorMsg('Authorization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword('');
    setErrorMsg('');
    onClose();
  };

  // Keyboard listener: Escape closes modal, Enter submits modal (capture phase)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  // Focus password input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // Non-blocking backdrop so user can see screen, but modal is fully clickable
        background: 'rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000000,
        pointerEvents: 'none',
      }}
    >
      {/* Modal Box: Spacious 440px width so OK button never clips */}
      <div
        style={{
          width: 440,
          maxWidth: '92vw',
          background: '#ffffff',
          borderRadius: 10,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          border: '2px solid #1e3a5f',
          pointerEvents: 'auto',
          boxSizing: 'border-box',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Navy Header matching photo poss3 */}
        <div
          style={{
            background: 'linear-gradient(180deg, #1e3a5f 0%, #152942 100%)',
            color: '#ffffff',
            padding: '13px 18px',
            fontWeight: 'bold',
            fontSize: 16,
            textAlign: 'center',
            letterSpacing: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span>🔒</span> {title}
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: '22px 24px', boxSizing: 'border-box' }}>
          <div style={{ fontSize: 13, color: '#475569', textAlign: 'center', marginBottom: 14 }}>
            {actionDescription}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 'bold',
                color: '#0f172a',
                marginBottom: 6,
                textAlign: 'center',
              }}
            >
              Password:
            </label>
            <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'stretch', boxSizing: 'border-box' }}>
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmit();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCancel();
                  }
                }}
                autoFocus
                placeholder="••••••••"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 48,
                  padding: '0 14px',
                  border: '2px solid #0284c7',
                  borderRadius: 8,
                  fontSize: 22,
                  textAlign: 'center',
                  outline: 'none',
                  letterSpacing: 4,
                  background: '#ffffff',
                  boxSizing: 'border-box',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
                }}
              />
              <button
                id="pos-secure-submit-btn"
                type="submit"
                disabled={loading}
                className="pos-touch-btn"
                style={{
                  flexShrink: 0,
                  minWidth: 84,
                  height: 48,
                  background: 'linear-gradient(145deg, #38bdf8 0%, #0284c7 50%, #0369a1 100%)',
                  color: '#ffffff',
                  border: '1.5px solid rgba(255, 255, 255, 0.6)',
                  borderBottom: '3.5px solid #075985',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 900,
                  cursor: loading ? 'wait' : 'pointer',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4), inset 0 1.5px 2px rgba(255, 255, 255, 0.75)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  touchAction: 'manipulation',
                }}
              >
                {loading ? '...' : 'OK ↵'}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                color: '#dc2626',
                fontSize: 12,
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: 12,
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Cancel Button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
            <button
              type="button"
              onClick={handleCancel}
              className="pos-touch-btn"
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderBottom: '2.5px solid #94a3b8',
                borderRadius: 20,
                padding: '8px 32px',
                fontSize: 13,
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
              }}
            >
              Cancel (Esc)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
