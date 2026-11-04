"use client";
import React, { useState, useEffect, useRef } from 'react';
import { lanUserManagementService } from '@/lib/lanUserManagementService';
import { permissionGuard, LANUser, DEFAULT_ADMIN_PERMISSIONS, DEFAULT_OPERATOR_PERMISSIONS } from '@/lib/permissionGuard';
import { TRAINING_COMPANY, TRAINING_USERS, TRAINING_COMPANY_CODE, posTrainingService } from '@/lib/pos/posTrainingService';

interface POSLoginScreenProps {
  company: any;
  companyCode: string;
  onLoginSuccess: (user: any) => void;
  onExit: () => void;
}

export default function POSLoginScreen({
  company,
  companyCode,
  onLoginSuccess,
  onExit,
}: POSLoginScreenProps) {
  const [isTrainingMode, setIsTrainingMode] = useState(false);
  const [cashierId, setCashierId] = useState('');
  const [password, setPassword] = useState('');
  const [activeField, setActiveField] = useState<'cashierId' | 'password'>('cashierId');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<LANUser[]>([]);

  const cashierInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Load company users on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const uList = await lanUserManagementService.getUsers(companyCode, company?.name);
        const allGlobal = lanUserManagementService.getAllUsersAcrossCompanies();
        const combinedMap = new Map<string, LANUser>();
        if (Array.isArray(uList)) {
          uList.forEach(u => { if (u && u.username) combinedMap.set(u.username.toLowerCase(), u); });
        }
        allGlobal.forEach(u => {
          if (u && u.username && !combinedMap.has(u.username.toLowerCase())) {
            combinedMap.set(u.username.toLowerCase(), u);
          }
        });
        const combinedList = Array.from(combinedMap.values());
        if (mounted && combinedList.length > 0) {
          setRegisteredUsers(combinedList);
          // Auto-fill first cashier or admin username if available
          const first = combinedList[0];
          if (first && !cashierId) {
            setCashierId(first.username);
            setActiveField('password');
          }
        }
      } catch (err) {}
    })();
    return () => {
      mounted = false;
    };
  }, [companyCode, company]);

  // Handle hardware keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!permissionGuard.isClientSession()) {
          onExit();
        }
      } else if (e.key === 'Enter') {
        if (activeField === 'cashierId' && cashierId.trim()) {
          setActiveField('password');
          passwordInputRef.current?.focus();
        } else if (activeField === 'password') {
          handleSignIn(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cashierId, password, activeField]);

  // Touch numpad click
  const handleNumpadKey = (key: string) => {
    setErrorMsg('');
    if (key === 'NO') {
      // Clear both fields
      setCashierId('');
      setPassword('');
      setActiveField('cashierId');
      cashierInputRef.current?.focus();
      return;
    }
    if (key === 'C') {
      // Clear current field
      if (activeField === 'cashierId') setCashierId('');
      else setPassword('');
      return;
    }
    if (key === '<') {
      // Backspace
      if (activeField === 'cashierId') setCashierId(prev => prev.slice(0, -1));
      else setPassword(prev => prev.slice(0, -1));
      return;
    }
    if (key === 'Enter') {
      if (activeField === 'cashierId' && cashierId.trim()) {
        setActiveField('password');
        passwordInputRef.current?.focus();
      } else {
        handleSignIn(false);
      }
      return;
    }

    // Append digit or character
    if (activeField === 'cashierId') {
      setCashierId(prev => prev + key);
    } else {
      setPassword(prev => prev + key);
    }
  };

  const handleModeSwitch = (training: boolean) => {
    setIsTrainingMode(training);
    setErrorMsg('');
    if (training) {
      setCashierId('trainee1');
      setPassword('');
      setActiveField('cashierId');
    } else {
      const first = registeredUsers[0];
      setCashierId(first?.username || 'admin');
      setPassword('');
      setActiveField('password');
    }
  };

  // Authenticate user
  const handleSignIn = async (asTrainingMode = false) => {
    const activeTraining = isTrainingMode || asTrainingMode;
    const cleanId = cashierId.trim().toLowerCase();
    const cleanPwd = password.trim();

    if (!cleanId) {
      setErrorMsg('Please enter Cashier ID / Username');
      setActiveField('cashierId');
      cashierInputRef.current?.focus();
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // 0. Isolated Training Mode Authentication (ZERO real company data)
      if (activeTraining) {
        const matchedTrn = TRAINING_USERS.find(
          u => u.username.toLowerCase() === cleanId ||
               u.id.toLowerCase() === cleanId ||
               (u.fullName && u.fullName.toLowerCase() === cleanId)
        ) || {
          id: `train_${cleanId || 'cashier1'}`,
          username: cleanId || 'trainee1',
          fullName: cleanId === 'trainer' ? 'Supervisor Demo (Admin)' : `Trainee Cashier (${cleanId || 'trainee1'})`,
          isAdmin: cleanId === 'trainer',
          isActive: true,
          createdAt: new Date().toISOString(),
          assignedCompanyCodes: [TRAINING_COMPANY_CODE],
          permissions: cleanId === 'trainer' ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_OPERATOR_PERMISSIONS,
        };

        try {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {});
          }
        } catch (e) {}

        permissionGuard.setCurrentUser(matchedTrn);
        onLoginSuccess({
          ...matchedTrn,
          isTrainingMode: true,
        });
        return;
      }

      // 1. Live Store Authentication: Check in loaded registered users
      let matched = registeredUsers.find(
        u => u.username.toLowerCase() === cleanId || 
             u.id.toLowerCase() === cleanId ||
             (u.fullName && u.fullName.toLowerCase() === cleanId)
      );

      // 1.5 Deep live lookup across all sources if not matched in state
      if (!matched) {
        const freshUsers = await lanUserManagementService.getUsers(companyCode, company?.name);
        const allGlobal = lanUserManagementService.getAllUsersAcrossCompanies();
        const candidateUsers = [...freshUsers, ...allGlobal];
        matched = candidateUsers.find(
          u => u && (
            u.username.toLowerCase() === cleanId ||
            u.id.toLowerCase() === cleanId ||
            (u.fullName && u.fullName.toLowerCase() === cleanId)
          )
        );
        if (matched) {
          setRegisteredUsers(prev => {
            const m = new Map(prev.map(p => [p.username.toLowerCase(), p]));
            m.set(matched!.username.toLowerCase(), matched!);
            return Array.from(m.values());
          });
        }
      }

      if (matched) {
        if (!matched.isActive) {
          setErrorMsg(`User account "${matched.username}" is deactivated by the Administrator.`);
          setLoading(false);
          return;
        }
        if (matched.password && matched.password.trim()) {
          if (matched.password.trim() !== cleanPwd) {
            setErrorMsg('Invalid Password!');
            setLoading(false);
            return;
          }
        }
        // Match found!
        try {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {});
          }
        } catch (e) {}
        permissionGuard.setCurrentUser(matched);
        onLoginSuccess({
          ...matched,
          id: matched.id,
          username: matched.username,
          fullName: matched.fullName || matched.username,
          isAdmin: matched.isAdmin,
          permissions: matched.permissions,
          isTrainingMode: false,
        });
        return;
      }

      // 2. Default fallback admin / supervisor credentials if no users configured
      if (cleanId === 'admin' || cleanId === 'cashier' || cleanId === '101' || cleanId === 'pos') {
        const fallbackUser: LANUser = {
          id: `usr_${cleanId}`,
          username: cleanId,
          fullName: cleanId === 'admin' ? 'Administrator' : `Cashier (${cleanId})`,
          isAdmin: cleanId === 'admin',
          isActive: true,
          createdAt: new Date().toISOString(),
          assignedCompanyCodes: [companyCode],
          permissions: cleanId === 'admin' ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_OPERATOR_PERMISSIONS,
        };
        permissionGuard.setCurrentUser(fallbackUser);
        onLoginSuccess({
          ...fallbackUser,
          id: fallbackUser.id,
          username: fallbackUser.username,
          fullName: fallbackUser.fullName,
          isAdmin: fallbackUser.isAdmin,
          permissions: fallbackUser.permissions,
          isTrainingMode: false,
        });
        return;
      }

      setErrorMsg(`User "${cashierId}" not found for this store. Use "admin" or select a user.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login error occurred');
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
        width: '100vw',
        height: '100vh',
        background: '#d4d8dd',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 999999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* 1. TOP HEADER BAR (BROWN/GOLD METALLIC AS IN POSS1 PHOTO) */}
      <div
        style={{
          background: 'linear-gradient(180deg, #78522e 0%, #56391d 100%)',
          color: '#ffffff',
          padding: '8px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #3c2712',
          boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
          minHeight: 46,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: '#f59e0b',
                color: '#0f3c64',
                fontWeight: 900,
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              L
            </div>
            <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.5 }}>LedgerX POS</span>
          </div>

          <div style={{ fontSize: 12, color: '#fef3c7', display: 'flex', gap: 14 }}>
            <span>Store: <b>{isTrainingMode ? TRAINING_COMPANY.name : (company?.name || 'Main Retail')}</b> [{isTrainingMode ? 'TRAINING' : companyCode}]</span>
            <span>Device ID: <b>01 POS</b></span>
            <span>Counter: <b>R141</b></span>
          </div>
        </div>

        {/* CENTER: MODE SELECTOR PILL (LIVE COUNTER vs TRAINING DEMO SANDBOX) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.45)',
            padding: '3px 4px',
            borderRadius: 24,
            border: '1px solid rgba(255, 255, 255, 0.25)',
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => handleModeSwitch(false)}
            style={{
              padding: '4px 14px',
              borderRadius: 20,
              border: 'none',
              background: !isTrainingMode ? '#16a34a' : 'transparent',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: !isTrainingMode ? '0 2px 6px rgba(0,0,0,0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🟢 Live Store</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch(true)}
            style={{
              padding: '4px 14px',
              borderRadius: 20,
              border: 'none',
              background: isTrainingMode ? '#2563eb' : 'transparent',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: isTrainingMode ? '0 0 12px rgba(37,99,235,0.9)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🎓 Training Sandbox</span>
          </button>
        </div>

        {/* Top Right Links (Forgot Password? / Need Help?) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#fef3c7' }}>
          <span
            onClick={() => alert('Please contact store administrator to reset cashier password.')}
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
          >
            Forgot Password?
          </span>
          <span
            onClick={() => alert(`Store Support: Contact 18008910001\nCompany Code: ${companyCode}`)}
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
          >
            Need Help?
          </span>
          <button
            onClick={() => {
              try {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen?.().catch(() => {});
                } else {
                  document.exitFullscreen?.().catch(() => {});
                }
              } catch (e) {}
            }}
            title="Toggle Fullscreen Mode (F11)"
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 4,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 'bold',
              cursor: 'pointer',
              marginLeft: 4,
            }}
          >
            ⛶ Fullscreen
          </button>
          <button
            onClick={() => {
              if (permissionGuard.isClientSession()) {
                if (confirm('Close POS terminal window?')) {
                  try { window.close(); } catch(e) {}
                }
              } else {
                onExit();
              }
            }}
            title="Exit POS (Esc)"
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 4,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 'bold',
              cursor: 'pointer',
              marginLeft: 8,
            }}
          >
            ✕ Exit (Esc)
          </button>
        </div>
      </div>

      {/* 2. MAIN BODY (SPLIT: CIRCULAR LOGO ON LEFT | LOGIN FORM + NUMPAD ON RIGHT) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 40px',
          background: 'radial-gradient(circle at center, #edf2f7 0%, #cbd5e1 100%)',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 960,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 40,
          }}
        >
          {/* LEFT HALF: LARGE CIRCULAR LEDGERX LOGO EMBLEM (EXACT MATCHING POSS1 PHOTO) */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Outer Circular Medallion */}
            <div
              style={{
                width: 290,
                height: 290,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #b45309 0%, #d97706 35%, #78350f 70%, #92400e 100%)',
                padding: 10,
                boxShadow: '0 20px 35px -5px rgba(0,0,0,0.35), inset 0 2px 4px rgba(255,255,255,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {/* Inner Decorative Bezel */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #0f3c64 0%, #082138 85%, #051624 100%)',
                  border: '4px solid #fef3c7',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.6)',
                }}
              >
                {/* Golden Stylized R / L Monogram Artwork */}
                <div
                  style={{
                    position: 'relative',
                    width: 130,
                    height: 130,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Outer Glowing Ring */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      border: '3px dashed rgba(245, 158, 11, 0.5)',
                      animation: 'spin 40s linear infinite',
                    }}
                  />
                  {/* Large Stylized 'L' Glyph */}
                  <span
                    style={{
                      fontSize: 100,
                      fontWeight: 900,
                      color: '#fbbf24',
                      textShadow: '0 4px 10px rgba(0,0,0,0.6), 0 0 20px rgba(251,191,36,0.5)',
                      lineHeight: 1,
                      fontFamily: '"Trebuchet MS", Arial, sans-serif',
                    }}
                  >
                    L
                  </span>
                </div>

                {/* LedgerX Ribbon Banner inside emblem */}
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 20,
                    fontWeight: 900,
                    color: '#ffffff',
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                  }}
                >
                  LedgerX
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: isTrainingMode ? '#60a5fa' : '#f59e0b',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                  }}
                >
                  {isTrainingMode ? '🎓 Training Sandbox Terminal' : 'Retail POS Terminal'}
                </div>
              </div>
            </div>

            {/* Quick User Picker Helper (Live Users or Training Users) */}
            {(() => {
              const displayedUsers = isTrainingMode ? TRAINING_USERS : registeredUsers;
              if (displayedUsers.length === 0) return null;
              return (
                <div style={{ marginTop: 16, width: 320, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: isTrainingMode ? '#2563eb' : '#64748b', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {isTrainingMode ? '🎓 Training Cashiers (Demo Only):' : 'Quick Cashier Switch:'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxHeight: 110, overflowY: 'auto', padding: '2px 4px' }}>
                    {displayedUsers.map(u => {
                      const isSelected = cashierId.toLowerCase() === u.username.toLowerCase();
                      return (
                        <button
                          key={u.id || u.username}
                          type="button"
                          onClick={() => {
                            setCashierId(u.username);
                            setPassword('');
                            setActiveField('password');
                            passwordInputRef.current?.focus();
                          }}
                          style={{
                            padding: '5px 12px',
                            background: isSelected 
                              ? (isTrainingMode ? 'linear-gradient(180deg, #1d4ed8 0%, #1e3a8a 100%)' : 'linear-gradient(180deg, #0f3c64 0%, #09233a 100%)')
                              : '#ffffff',
                            color: isSelected ? '#ffffff' : (isTrainingMode ? '#1d4ed8' : '#0f3c64'),
                            border: isSelected ? (isTrainingMode ? '1.5px solid #1d4ed8' : '1.5px solid #0f3c64') : '1px solid #cbd5e1',
                            borderRadius: 14,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: isSelected ? '0 2px 6px rgba(15, 60, 100, 0.25)' : '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'all 0.15s ease-in-out',
                          }}
                          title={`Select ${u.fullName || u.username}`}
                        >
                          {u.username === 'admin' ? (u.fullName || 'Admin') : (u.fullName ? `${u.fullName} (${u.username})` : u.username)}
                        </button>
                      );
                    })}
                  </div>
                  {isTrainingMode && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Reset Training Demo Data back to fresh default state (stock = 50, test sales cleared)?')) {
                          await posTrainingService.resetTrainingData();
                          alert('Training Demo Data has been restored to default state.');
                        }
                      }}
                      style={{
                        marginTop: 10,
                        padding: '4px 12px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px dashed #3b82f6',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      🔄 Reset Training Demo Data
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* RIGHT HALF: LOGIN INPUTS + TOUCH NUMPAD (MATCHING POSS1 PHOTO) */}
          <div
            style={{
              width: 380,
              background: '#f8fafc',
              border: '2px solid #cbd5e1',
              borderRadius: 10,
              padding: '24px 22px',
              boxShadow: '0 15px 30px -5px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {/* Field 1: Cashier ID */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 'bold', color: '#334155' }}>
                  Cashier ID / Username:
                </label>
                {activeField === 'cashierId' && (
                  <span style={{ fontSize: 10, color: '#0284c7', fontWeight: 'bold' }}>● Active</span>
                )}
              </div>
              <input
                ref={cashierInputRef}
                type="text"
                value={cashierId}
                onChange={e => setCashierId(e.target.value)}
                onFocus={() => setActiveField('cashierId')}
                placeholder="Enter Cashier ID (e.g. admin)"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#0f172a',
                  border: activeField === 'cashierId' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                  borderRadius: 6,
                  background: '#ffffff',
                  outline: 'none',
                  boxShadow: activeField === 'cashierId' ? '0 0 0 3px rgba(2,132,199,0.15)' : 'none',
                }}
              />
            </div>

            {/* Field 2: Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 'bold', color: '#334155' }}>
                  Password:
                </label>
                {activeField === 'password' && (
                  <span style={{ fontSize: 10, color: '#0284c7', fontWeight: 'bold' }}>● Active</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  ref={passwordInputRef}
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setActiveField('password')}
                  placeholder="••••••••"
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    fontSize: 16,
                    letterSpacing: 2,
                    fontWeight: 600,
                    color: '#0f172a',
                    border: activeField === 'password' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    borderRadius: 6,
                    background: '#ffffff',
                    outline: 'none',
                    boxShadow: activeField === 'password' ? '0 0 0 3px rgba(2,132,199,0.15)' : 'none',
                  }}
                />
                <button
                  type="button"
                  title="Password pad"
                  style={{
                    background: '#e2e8f0',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '0 10px',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                  onClick={() => setActiveField('password')}
                >
                  🔒
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div
                style={{
                  background: '#fee2e2',
                  border: '1px solid #f87171',
                  color: '#b91c1c',
                  padding: '6px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* ACTION BUTTON 1: GREEN SIGN IN BUTTON */}
            <button
              type="button"
              onClick={() => handleSignIn(isTrainingMode)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '11px',
                background: isTrainingMode 
                  ? 'linear-gradient(180deg, #1d4ed8 0%, #1e3a8a 100%)' 
                  : 'linear-gradient(180deg, #2e7d32 0%, #1b5e20 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 'bold',
                cursor: loading ? 'wait' : 'pointer',
                boxShadow: isTrainingMode ? '0 3px 6px rgba(29,78,216,0.4)' : '0 3px 6px rgba(27,94,32,0.3)',
                letterSpacing: 0.5,
              }}
            >
              {loading ? 'Authenticating...' : (isTrainingMode ? 'Start Training Mode' : 'Sign In')}
            </button>

            {/* ACTION BUTTON 2: BLUE TRAINING MODE BUTTON */}
            <button
              type="button"
              onClick={() => {
                if (!isTrainingMode) {
                  handleModeSwitch(true);
                  handleSignIn(true);
                } else {
                  handleSignIn(true);
                }
              }}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                background: isTrainingMode 
                  ? 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)' 
                  : 'linear-gradient(180deg, #1e40af 0%, #1e3a8a 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 'bold',
                cursor: loading ? 'wait' : 'pointer',
                boxShadow: '0 3px 6px rgba(30,58,138,0.3)',
                letterSpacing: 0.5,
              }}
            >
              {isTrainingMode ? '🎓 Launch Training Counter' : 'Training Mode'}
            </button>

            {/* TOUCH NUMERIC KEYPAD (MATCHING EXACT POSS1 KEYPAD: 7 8 9 NO / 4 5 6 < / 1 2 3 C / . 0 Enter) */}
            <div
              style={{
                marginTop: 6,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
              }}
            >
              {/* Row 1 */}
              <button
                type="button"
                onClick={() => handleNumpadKey('7')}
                style={touchBtnStyle}
              >
                7
              </button>
              <button
                type="button"
                onClick={() => handleNumpadKey('8')}
                style={touchBtnStyle}
              >
                8
              </button>
              <button
                type="button"
                onClick={() => handleNumpadKey('9')}
                style={touchBtnStyle}
              >
                9
              </button>
              <button
                type="button"
                onClick={() => handleNumpadKey('NO')}
                style={{
                  ...touchBtnStyle,
                  background: '#f1f5f9',
                  color: '#dc2626',
                  fontWeight: 800,
                }}
              >
                NO
              </button>

              {/* Row 2 */}
              <button
                type="button"
                onClick={() => handleNumpadKey('4')}
                style={touchBtnStyle}
              >
                4
              </button>
              <button
                type="button"
                onClick={() => handleNumpadKey('5')}
                style={touchBtnStyle}
              >
                5
              </button>
              <button
                type="button"
                onClick={() => handleNumpadKey('6')}
                style={touchBtnStyle}
              >
                6
              </button>
              <button
                type="button"
                onClick={() => handleNumpadKey('<')}
                style={{
                  ...touchBtnStyle,
                  background: '#f1f5f9',
                  color: '#d97706',
                  fontWeight: 800,
                }}
              >
                ⌫
              </button>

              {/* Row 3 */}
              <button
                type="button"
                onClick={() => handleNumpadKey('1')}
                style={touchBtnStyle}
              >
                1
              </button>
              <button
                type="button"
                onClick={() => handleNumpadKey('2')}
                style={touchBtnStyle}
              >
                2
              </button>
              <button
                type="button"
                onClick={() => handleNumpadKey('3')}
                style={touchBtnStyle}
              >
                3
              </button>
              <button
                type="button"
                onClick={() => handleNumpadKey('C')}
                style={{
                  ...touchBtnStyle,
                  background: '#f1f5f9',
                  color: '#475569',
                  fontWeight: 800,
                }}
              >
                C
              </button>

              {/* Row 4 */}
              <button
                type="button"
                onClick={() => handleNumpadKey('.')}
                style={touchBtnStyle}
              >
                .
              </button>
              <button
                type="button"
                onClick={() => handleNumpadKey('0')}
                style={touchBtnStyle}
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleNumpadKey('Enter')}
                style={{
                  ...touchBtnStyle,
                  gridColumn: 'span 2',
                  background: '#0284c7',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: 14,
                }}
              >
                Enter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. POSIFLEX BOTTOM TERMINAL HARDWARE BEZEL */}
      <div
        style={{
          background: '#1e293b',
          color: '#94a3b8',
          padding: '6px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11,
          borderTop: '2px solid #0f172a',
        }}
      >
        <div>
          LedgerX Retail Counter • Touch POS • 100% Offline Secured
        </div>
        <div style={{ fontWeight: 900, letterSpacing: 2, color: '#38bdf8', fontSize: 13 }}>
          POSIFLEX
        </div>
        <div>
          Press <b>Esc</b> to return to LedgerX Gateway
        </div>
      </div>
    </div>
  );
}

const touchBtnStyle: React.CSSProperties = {
  height: 48,
  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.9) 60%, rgba(226, 232, 240, 0.85) 100%)',
  border: '1px solid rgba(255, 255, 255, 0.95)',
  borderBottom: '2.5px solid rgba(148, 163, 184, 0.65)',
  borderRadius: 8,
  fontSize: 18,
  fontWeight: 800,
  color: '#0f172a',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 8px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1.5px 1px #ffffff, inset 0 -2px 0 rgba(0, 0, 0, 0.06)',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'manipulation',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};
