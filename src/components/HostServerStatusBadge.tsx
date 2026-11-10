"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { lanUserManagementService, HostLANInfo } from '@/lib/lanUserManagementService';

interface HostServerStatusBadgeProps {
  className?: string;
  style?: React.CSSProperties;
  compact?: boolean;
}

export default function HostServerStatusBadge({
  style,
  compact = false,
}: HostServerStatusBadgeProps) {
  const [hostInfo, setHostInfo] = useState<HostLANInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pingMs, setPingMs] = useState<number | null>(null);

  const checkConnection = useCallback(async () => {
    const t0 = performance.now();
    try {
      const info = await lanUserManagementService.getHostLANInfo();
      const t1 = performance.now();
      setHostInfo(info);
      if (info && info.isHostRunning) {
        setPingMs(Math.max(1, Math.round(t1 - t0)));
      } else {
        setPingMs(null);
      }
    } catch (_) {
      setPingMs(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    checkConnection();
    const interval = setInterval(() => {
      if (mounted) checkConnection();
    }, 3500);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [checkConnection]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await checkConnection();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const isConnected = Boolean(hostInfo && hostInfo.isHostRunning);
  const primaryIp = hostInfo?.localIps?.[0] || '192.168.240.48';
  const serverName = hostInfo?.hostName || 'Accounts-PC';

  return (
    <>
      {/* 1. VISIBLE LIVE BADGE */}
      <div
        onClick={() => setShowModal(true)}
        role="button"
        title="Click to view Host Accounting Server status & network details"
        style={{
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: compact ? '2px 8px' : '4px 12px',
          borderRadius: 20,
          background: isConnected
            ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.35) 100%)'
            : 'linear-gradient(180deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.35) 100%)',
          border: `1px solid ${isConnected ? '#34d399' : '#f87171'}`,
          boxShadow: isConnected
            ? '0 0 10px rgba(16, 185, 129, 0.35)'
            : '0 0 8px rgba(239, 68, 68, 0.3)',
          color: '#ffffff',
          fontSize: compact ? 11 : 12,
          fontWeight: 700,
          userSelect: 'none',
          transition: 'all 0.2s ease',
          ...style,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isConnected ? '#10b981' : '#ef4444',
            boxShadow: isConnected ? '0 0 8px #10b981' : '0 0 8px #ef4444',
            display: 'inline-block',
          }}
        />
        <span style={{ letterSpacing: 0.2 }}>
          {isConnected ? (
            <>
              <b>Server:</b> {serverName}{' '}
              <span style={{ opacity: 0.85, fontSize: 10 }}>({primaryIp})</span>
            </>
          ) : (
            <>
              <b>Server:</b> <span style={{ color: '#fca5a5' }}>Searching LAN...</span>
            </>
          )}
        </span>
        {pingMs !== null && isConnected && (
          <span
            style={{
              fontSize: 9,
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '1px 5px',
              borderRadius: 10,
              color: '#a7f3d0',
            }}
          >
            {pingMs}ms
          </span>
        )}
      </div>

      {/* 2. SERVER STATUS MODAL DIALOG */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999999,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0f172a',
              color: '#f8fafc',
              border: '2px solid #334155',
              borderRadius: 12,
              width: 520,
              maxWidth: '92vw',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              fontFamily: 'Segoe UI, Roboto, system-ui, sans-serif',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #334155',
                paddingBottom: 14,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>📡</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>
                    Main Host Accounting Server
                  </h3>
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                    Dynamic DHCP LAN Auto-Discovery & Live Connection Status
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: 20,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 4,
                }}
              >
                ✕
              </button>
            </div>

            {/* Connection Banner */}
            <div
              style={{
                background: isConnected ? '#064e3b' : '#7f1d1d',
                border: `1px solid ${isConnected ? '#059669' : '#b91c1c'}`,
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 28 }}>{isConnected ? '🟢' : '🔴'}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#ffffff' }}>
                  {isConnected
                    ? 'CONNECTED TO MAIN HOST COMPUTER'
                    : 'HOST COMPUTER NOT FOUND / SEARCHING'}
                </div>
                <div style={{ fontSize: 11, color: '#e2e8f0', marginTop: 2 }}>
                  {isConnected
                    ? 'This client is live and synchronized. Every voucher, sale, item, and user action is saved directly to the Host PC disk.'
                    : 'Client is broadcasting on UDP port 45455 & scanning subnet port 45454. Ensure LedgerX Desktop is running on the main PC.'}
                </div>
              </div>
            </div>

            {/* Details Table */}
            <div
              style={{
                background: '#1e293b',
                borderRadius: 8,
                padding: '12px 16px',
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                border: '1px solid #334155',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Host Computer Name:</span>
                <span style={{ fontWeight: 700, color: '#38bdf8' }}>{serverName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Host IP Address:</span>
                <span style={{ fontWeight: 700, color: '#facc15' }}>{primaryIp}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Bridge Port:</span>
                <span style={{ fontWeight: 700, color: '#f8fafc' }}>
                  {hostInfo?.port || 45454} (TCP) & 45455 (UDP)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>DHCP Discovery:</span>
                <span style={{ fontWeight: 700, color: '#4ade80' }}>
                  Automatic (Beacon Broadcast + Subnet Scan)
                </span>
              </div>
              {pingMs !== null && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>LAN Latency:</span>
                  <span style={{ fontWeight: 700, color: '#a7f3d0' }}>{pingMs} ms (Ultra Fast)</span>
                </div>
              )}
              {hostInfo?.dataDir && (
                <div style={{ borderTop: '1px solid #334155', paddingTop: 8 }}>
                  <div style={{ color: '#94a3b8', marginBottom: 2 }}>Host Database Path:</div>
                  <div
                    style={{
                      fontFamily: 'Consolas, monospace',
                      fontSize: 11,
                      color: '#cbd5e1',
                      wordBreak: 'break-all',
                      background: '#0f172a',
                      padding: '4px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {hostInfo.dataDir}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 20,
              }}
            >
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                style={{
                  background: 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  border: '1px solid #60a5fa',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: isRefreshing ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>{isRefreshing ? '⏳' : '🔄'}</span>
                <span>{isRefreshing ? 'Scanning LAN...' : 'Re-Scan LAN Host'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: '#334155',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 20px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

