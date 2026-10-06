"use client";
import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, Monitor, ShieldCheck, WifiOff, RefreshCw, X, Laptop } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
}

export default function DesktopAppDownloadModal({ isOpen, onClose, currentUser }: Props) {
  const [loading, setLoading] = useState(false);
  const [licenseData, setLicenseData] = useState<any>(currentUser ? {
    licenseKey: currentUser.licenseKey,
    plan: currentUser.plan,
    subscriptionExpiry: currentUser.subscriptionExpiry
  } : null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLicenseInfo();
    }
  }, [isOpen]);

  const fetchLicenseInfo = async () => {
    try {
      setLoading(true);
      const token = authClient.getToken();
      const res = await fetch('/api/license/my-key', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setLicenseData(data);
      }
    } catch (e) {
      console.error('Failed to load license details', e);
    } finally {
      setLoading(false);
    }
  };

  const copyLicense = () => {
    const key = licenseData?.licenseKey || currentUser?.licenseKey;
    if (key) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(key).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          }).catch(() => {
            fallbackCopy(key);
          });
        } else {
          fallbackCopy(key);
        }
      } catch (e) {
        fallbackCopy(key);
      }
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Fallback copy failed", err);
    }
  };

  if (!isOpen) return null;

  const validUntilStr = licenseData?.subscriptionExpiry
    ? new Date(licenseData.subscriptionExpiry).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Lifetime / Active';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: 16,
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 720,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a, #0284c7)',
          padding: '24px 28px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Monitor size={28} color="#38bdf8" />
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
                LedgerX Desktop (Offline Edition)
              </h2>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#bae6fd' }}>
              Work completely offline on Windows PC. Lightning fast (0.1ms) with automatic cloud sync.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', maxHeight: '75vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 12px' }} />
              <p>Loading license information...</p>
            </div>
          ) : (
            <>
              {/* License Card */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: 12,
                padding: '20px 22px',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Your Activation License Key
                  </div>
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    Plan: {licenseData?.plan || 'Active'} (Valid: {validUntilStr})
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="text"
                    readOnly
                    value={licenseData?.licenseKey || 'Loading...'}
                    style={{
                      flex: 1,
                      fontFamily: 'monospace',
                      fontSize: 18,
                      fontWeight: 800,
                      letterSpacing: 1.5,
                      padding: '10px 14px',
                      background: '#ffffff',
                      border: '1.5px solid #94a3b8',
                      borderRadius: 8,
                      color: '#0f172a',
                    }}
                  />
                  <button
                    onClick={copyLicense}
                    style={{
                      background: copied ? '#16a34a' : '#1e293b',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '11px 18px',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'background 0.2s',
                    }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy Key'}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                  💡 Use this key once when opening the desktop app to link your PC for offline access.
                </div>
              </div>

              {/* Download Action Box */}
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4, #e0f2fe)',
                border: '1.5px solid #86efac',
                borderRadius: 12,
                padding: '20px 22px',
                marginBottom: 24,
              }}>
                <div style={{ marginBottom: 14 }}>
                  <h4 style={{ margin: 0, fontSize: 16, color: '#0f172a', fontWeight: 800 }}>
                    Download Desktop Application
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>
                    Select your operating system to download the standalone offline installer:
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {/* Windows .exe Button */}
                  <a
                    href="/api/download/desktop-setup?os=windows"
                    download="LedgerX-Setup.exe"
                    style={{
                      flex: 1,
                      minWidth: 220,
                      background: '#16a34a',
                      color: '#ffffff',
                      textDecoration: 'none',
                      padding: '12px 18px',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                      cursor: 'pointer',
                    }}
                  >
                    <Download size={18} />
                    <span>Download for <b>Windows (.exe)</b></span>
                  </a>

                  {/* macOS .dmg Button */}
                  <a
                    href="/api/download/desktop-setup?os=mac"
                    download="LedgerX-Setup.dmg"
                    style={{
                      flex: 1,
                      minWidth: 220,
                      background: '#0f172a',
                      color: '#ffffff',
                      textDecoration: 'none',
                      padding: '12px 18px',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
                      cursor: 'pointer',
                    }}
                  >
                    <Download size={18} />
                    <span>Download for <b>macOS (.dmg)</b></span>
                  </a>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: '#64748b' }}>
                  <span>&bull; Windows 10, 11 (64-bit)</span>
                  <span>&bull; macOS 11+ (Apple Silicon M-Series & Intel)</span>
                </div>
              </div>

              {/* 3 Step Guide (English) */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 14px', fontSize: 14, color: '#1e293b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  How to setup on your computer (3 Simple Steps)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div style={{ background: '#f8fafc', padding: '14px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#0284c7', fontWeight: 800, fontSize: 13, marginBottom: 4 }}>1. Install</div>
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                      Download the installer and double-click to install on your computer.
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '14px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#0284c7', fontWeight: 800, fontSize: 13, marginBottom: 4 }}>2. 1-Sec Activation</div>
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                      Open the app, enter your Email & the <b>License Key</b> above to activate.
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '14px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#16a34a', fontWeight: 800, fontSize: 13, marginBottom: 4 }}>3. Work Offline</div>
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                      Create vouchers and reports without internet. Auto-syncs to cloud when online!
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Badges */}
              <div style={{
                display: 'flex',
                gap: 16,
                padding: '12px 16px',
                background: '#f1f5f9',
                borderRadius: 8,
                fontSize: 12,
                color: '#475569',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={16} color="#16a34a" />
                  <span>Hardware-Locked Security</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <WifiOff size={16} color="#0284c7" />
                  <span>100% Offline Capable</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RefreshCw size={16} color="#8b5cf6" />
                  <span>Auto Cloud Sync</span>
                </div>
              </div>

              {/* Registered Devices List (if any) */}
              {licenseData?.devices && licenseData.devices.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h5 style={{ margin: '0 0 8px', fontSize: 13, color: '#334155' }}>
                    Registered Computers ({licenseData.devices.length}):
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {licenseData.devices.map((d: any) => (
                      <div key={d.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        fontSize: 12,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Laptop size={14} color="#64748b" />
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{d.deviceName || 'Windows PC'}</span>
                          <span style={{ color: '#94a3b8', fontSize: 11 }}>({d.machineId.slice(0, 12)}...)</span>
                        </div>
                        <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 11 }}>● Active</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          background: '#f8fafc',
          padding: '14px 28px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#e2e8f0',
              color: '#334155',
              border: 'none',
              padding: '8px 20px',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
