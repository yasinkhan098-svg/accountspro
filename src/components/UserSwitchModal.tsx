"use client";
import React, { useState, useEffect } from 'react';
import { LANUser, permissionGuard } from '@/lib/permissionGuard';
import { lanUserManagementService } from '@/lib/lanUserManagementService';

interface UserSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserChanged?: (user: LANUser | null) => void;
  onOpenRoleManager?: () => void;
}

export default function UserSwitchModal({
  isOpen,
  onClose,
  onUserChanged,
  onOpenRoleManager,
}: UserSwitchModalProps) {
  const [users, setUsers] = useState<LANUser[]>([]);
  const [currentUser, setCurrentUser] = useState<LANUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<LANUser | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    setPasswordInput('');
    const uList = await lanUserManagementService.getUsers();
    setUsers(uList);
    const active = permissionGuard.getCurrentUser();
    setCurrentUser(active);
    setSelectedUser(active);
    setLoading(false);
  };

  if (!isOpen) return null;

  const handleSelectUser = (user: LANUser | null) => {
    setSelectedUser(user);
    setErrorMsg('');
    setPasswordInput('');
  };

  const handleApplySwitch = () => {
    if (!selectedUser) {
      // Switching to Master Admin
      permissionGuard.setCurrentUser(null);
      setCurrentUser(null);
      if (onUserChanged) onUserChanged(null);
      onClose();
      return;
    }

    // If user has a password, verify it
    if (selectedUser.password && selectedUser.password.trim().length > 0) {
      if (passwordInput !== selectedUser.password) {
        setErrorMsg('Incorrect password. Please try again.');
        return;
      }
    }

    permissionGuard.setCurrentUser(selectedUser);
    setCurrentUser(selectedUser);
    if (onUserChanged) onUserChanged(selectedUser);
    onClose();
  };

  const getPermSummary = (u: LANUser): string => {
    if (u.isAdmin) return 'Full Admin Access (All Vouchers, Ledgers, Reports)';
    const enabledV = Object.entries(u.permissions?.vouchers || {})
      .filter(([_, v]) => v)
      .map(([k]) => k);
    if (enabledV.length === 0) return 'Read-Only / No Vouchers Permitted';
    if (enabledV.length === 1) return `${enabledV[0]} Only (Strict Isolation)`;
    return enabledV.join(', ');
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 580,
          background: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e3a5f, #0f172a)',
            color: 'white',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>👤 LAN Multi-User Switcher</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              Switch active local profile or test role-based access control
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Current User Badge */}
          <div
            style={{
              padding: '10px 14px',
              background: currentUser && !currentUser.isAdmin ? '#ecfdf5' : '#f0f9ff',
              border: `1px solid ${currentUser && !currentUser.isAdmin ? '#a7f3d0' : '#bae6fd'}`,
              borderRadius: 6,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Active Profile:
              </span>
              <div style={{ fontSize: 14, fontWeight: 'bold', color: '#0f172a' }}>
                {currentUser ? `${currentUser.fullName} (@${currentUser.username})` : 'System Administrator (Master)'}
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                padding: '3px 10px',
                borderRadius: 12,
                fontWeight: 'bold',
                background: currentUser && !currentUser.isAdmin ? '#10b981' : '#0284c7',
                color: 'white',
              }}
            >
              {currentUser && !currentUser.isAdmin ? 'Restricted Operator' : 'Admin'}
            </span>
          </div>

          <div style={{ fontSize: 12, fontWeight: 'bold', color: '#334155', marginBottom: 8 }}>
            Select User to Login:
          </div>

          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Loading LAN users...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 250, overflowY: 'auto' }}>
              {/* Default Master Admin Option */}
              <div
                onClick={() => handleSelectUser(null)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: `2px solid ${selectedUser === null ? '#0284c7' : '#e2e8f0'}`,
                  background: selectedUser === null ? '#f0f9ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: 13 }}>
                    🛡️ Master Administrator (No Restrictions)
                  </div>
                  <span style={{ fontSize: 10, background: '#0284c7', color: 'white', padding: '2px 8px', borderRadius: 10 }}>
                    Admin
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Full permissions across all vouchers, reports, registers, and companies.
                </div>
              </div>

              {/* User options */}
              {users.map(u => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 6,
                      border: `2px solid ${isSelected ? '#10b981' : '#e2e8f0'}`,
                      background: isSelected ? '#f0fdf4' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: 13 }}>
                        👤 {u.fullName} <span style={{ color: '#64748b', fontWeight: 'normal' }}>(@{u.username})</span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          background: u.isAdmin ? '#0284c7' : '#10b981',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: 10,
                        }}
                      >
                        {u.isAdmin ? 'Admin' : 'Operator'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>
                      <strong>Permissions:</strong> {getPermSummary(u)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Password Prompt if user has password */}
          {selectedUser && selectedUser.password && selectedUser.password.trim().length > 0 && (
            <div style={{ marginTop: 16, padding: '12px 14px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#334155', marginBottom: 4 }}>
                Enter Password for @{selectedUser.username}:
              </div>
              <input
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="Enter password..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 4,
                  fontSize: 13,
                  outline: 'none',
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleApplySwitch();
                }}
              />
            </div>
          )}

          {errorMsg && (
            <div style={{ marginTop: 10, color: '#ef4444', fontSize: 12, fontWeight: 500 }}>
              ⚠️ {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            {onOpenRoleManager && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRoleManager();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0284c7',
                  fontSize: 12,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontWeight: 600,
                }}
              >
                ⚙️ Open Role Management
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: '6px 14px',
                border: '1px solid #cbd5e1',
                background: 'white',
                color: '#475569',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApplySwitch}
              style={{
                padding: '6px 18px',
                background: selectedUser && !selectedUser.isAdmin ? '#059669' : '#0284c7',
                border: 'none',
                color: 'white',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: 12,
              }}
            >
              Confirm & Switch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

