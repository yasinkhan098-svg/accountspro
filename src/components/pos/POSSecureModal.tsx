"use client";
import React, { useState } from 'react';

interface POSSecureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthorize: (password: string) => boolean | Promise<boolean>;
  title?: string;
  actionDescription?: string;
}

export default function POSSecureModal({
  isOpen,
  onClose,
  onAuthorize,
  title = 'Secure Mode',
  actionDescription = 'Supervisor Authorization Required',
}: POSSecureModalProps) {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Password is required');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const ok = await onAuthorize(password.trim());
      if (ok) {
        setPassword('');
        onClose();
      } else {
        setErrorMsg('Invalid supervisor password!');
      }
    } catch (err: any) {
      setErrorMsg('Authorization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 360,
          background: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          border: '2px solid #0f3c64',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Navy Header matching Posiflex screen */}
        <div
          style={{
            background: '#1e3a5f',
            color: '#ffffff',
            padding: '12px 16px',
            fontWeight: 'bold',
            fontSize: 16,
            textAlign: 'center',
            letterSpacing: 0.5,
          }}
        >
          {title}
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 14 }}>
            {actionDescription}
          </div>

          <div style={{ marginBottom: 16 }}>
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
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                placeholder="••••••••"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '2px solid #0284c7',
                  borderRadius: 6,
                  fontSize: 18,
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '0 16px',
                  fontWeight: 'bold',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {loading ? '...' : 'OK'}
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
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: 20,
                padding: '6px 24px',
                fontSize: 13,
                fontWeight: '600',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

