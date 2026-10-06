"use client";
import React, { useState, useEffect } from 'react';
import { offlineSyncService, SyncStatusType, SyncQueueItem } from '@/lib/offlineSyncService';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, Clock, AlertTriangle, X } from 'lucide-react';

interface SyncStatusBadgeProps {
  companyId?: number;
  authToken?: string;
  onDataMerged?: (pulled: any) => void;
}

export default function SyncStatusBadge({ companyId, authToken, onDataMerged }: SyncStatusBadgeProps) {
  const [status, setStatus] = useState<SyncStatusType>('online-synced');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [licenseInfo, setLicenseInfo] = useState<any>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncMsg, setLastSyncMsg] = useState<string>('');

  useEffect(() => {
    // 1. Initial pending count and license info
    setPendingCount(offlineSyncService.getPendingCount());
    setQueueItems(offlineSyncService.getQueue());

    const token = offlineSyncService.getOfflineToken();
    if (token) {
      const decoded = offlineSyncService.decodeToken(token);
      setLicenseInfo(decoded.payload);
    }

    // 2. Subscribe to status changes
    const unsubscribe = offlineSyncService.subscribe((newStatus, meta) => {
      setStatus(newStatus);
      if (meta?.pendingCount !== undefined) {
        setPendingCount(meta.pendingCount);
      } else {
        setPendingCount(offlineSyncService.getPendingCount());
      }
      setQueueItems(offlineSyncService.getQueue());
    });

    // 3. Listen to trigger-auto-sync event
    const handleTrigger = async () => {
      if (companyId && (authToken || offlineSyncService.getOfflineToken())) {
        await handleManualSync();
      }
    };

    window.addEventListener('ledgerx:trigger-auto-sync', handleTrigger);

    return () => {
      unsubscribe();
      window.removeEventListener('ledgerx:trigger-auto-sync', handleTrigger);
    };
  }, [companyId, authToken]);

  const handleManualSync = async () => {
    if (!companyId) return;
    const token = authToken || offlineSyncService.getOfflineToken() || '';
    setSyncing(true);
    setLastSyncMsg('');

    const res = await offlineSyncService.syncWithCloud(companyId, token, onDataMerged);
    setSyncing(false);

    if (res.success) {
      setLastSyncMsg(`Synced successfully! (${res.pushedCount} pushed)`);
      setPendingCount(0);
      setQueueItems([]);
    } else {
      setLastSyncMsg(res.error || 'Sync failed');
    }
  };

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // Badge appearance config
  let badgeBg = '#ecfdf5';
  let badgeBorder = '#a7f3d0';
  let badgeText = '#065f46';
  let icon = <CheckCircle2 size={13} color="#059669" />;
  let label = 'Online (Synced)';

  if (!isOnline) {
    badgeBg = pendingCount > 0 ? '#fffbeb' : '#f1f5f9';
    badgeBorder = pendingCount > 0 ? '#fde68a' : '#cbd5e1';
    badgeText = pendingCount > 0 ? '#92400e' : '#475569';
    icon = <WifiOff size={13} color={pendingCount > 0 ? '#d97706' : '#64748b'} />;
    label = pendingCount > 0 ? `Offline (${pendingCount} pending)` : 'Offline Mode';
  } else if (status === 'syncing' || syncing) {
    badgeBg = '#eff6ff';
    badgeBorder = '#bfdbfe';
    badgeText = '#1e40af';
    icon = <RefreshCw size={13} color="#2563eb" className="animate-spin" />;
    label = 'Syncing...';
  } else if (pendingCount > 0) {
    badgeBg = '#fffbeb';
    badgeBorder = '#fde68a';
    badgeText = '#92400e';
    icon = <Clock size={13} color="#d97706" />;
    label = `${pendingCount} to Sync`;
  }

  return (
    <>
      <button
        onClick={() => {
          setQueueItems(offlineSyncService.getQueue());
          setShowModal(true);
        }}
        title="Click to view Offline & Cloud Sync Status"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: badgeBg,
          border: `1px solid ${badgeBorder}`,
          color: badgeText,
          borderRadius: 20,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
        }}
      >
        {icon}
        <span>{label}</span>
      </button>

      {/* Sync Status Details Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: 20,
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            width: '100%',
            maxWidth: 480,
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            fontFamily: 'Segoe UI, -apple-system, sans-serif',
            color: '#1e293b',
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1e3a8a, #0284c7)',
              color: '#ffffff',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  Cloud &amp; Offline Sync Center
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: 20 }}>
              {/* Status Card */}
              <div style={{
                background: isOnline ? '#f0fdf4' : '#fffbeb',
                border: isOnline ? '1px solid #bbf7d0' : '1px solid #fde68a',
                padding: '12px 16px',
                borderRadius: 8,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isOnline ? '#166534' : '#92400e' }}>
                    {isOnline ? '🟢 Connected to Cloud' : '🟡 Offline Mode (Local Storage)'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {isOnline
                      ? 'Transactions save locally and sync with cloud automatically.'
                      : 'All vouchers and changes are securely saved on this computer.'}
                  </div>
                </div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: pendingCount > 0 ? '#d97706' : '#16a34a',
                }}>
                  {pendingCount} <span>Pending</span>
                </div>
              </div>

              {/* License Info */}
              {licenseInfo && (
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#64748b' }}>License Key:</span>
                    <strong style={{ fontFamily: 'monospace', color: '#0284c7' }}>{licenseInfo.licenseKey}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#64748b' }}>Valid Until:</span>
                    <strong>{licenseInfo.validUntil ? new Date(licenseInfo.validUntil).toLocaleDateString('en-GB') : 'Active'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Offline Status:</span>
                    <strong style={{ color: '#16a34a' }}>✓ Authorized &amp; Enabled</strong>
                  </div>
                </div>
              )}

              {/* Pending Queue Items */}
              {queueItems.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase' }}>
                    Pending Items Waiting to Sync ({queueItems.length}):
                  </div>
                  <div style={{ maxHeight: 130, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                    {queueItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        style={{
                          padding: '6px 10px',
                          borderBottom: idx < queueItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                          fontSize: 11,
                          display: 'flex',
                          justifyContent: 'space-between',
                          background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        }}
                      >
                        <span>
                          <strong>{item.type}</strong> {item.action}: {item.data?.voucherNo || item.data?.name || item.data?.id}
                        </span>
                        <span style={{ color: '#94a3b8' }}>
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {lastSyncMsg && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  marginBottom: 14,
                  background: lastSyncMsg.includes('success') ? '#f0fdf4' : '#fef2f2',
                  color: lastSyncMsg.includes('success') ? '#166534' : '#dc2626',
                  fontWeight: 600,
                }}>
                  {lastSyncMsg}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleManualSync}
                  disabled={syncing || !isOnline}
                  style={{
                    flex: 1,
                    background: isOnline ? '#16a34a' : '#cbd5e1',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 14px',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: syncing || !isOnline ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
                  <span>{syncing ? 'Syncing...' : isOnline ? 'Sync With Cloud Now' : 'Connect Internet to Sync'}</span>
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    padding: '10px 16px',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
