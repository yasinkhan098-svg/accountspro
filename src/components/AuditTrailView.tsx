"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Search, 
  Filter, 
  FileText, 
  ArrowLeft, 
  Clock, 
  Lock, 
  Hash, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  Download,
  Copy,
  Check
} from 'lucide-react';

interface AuditTrailItem {
  id: number;
  companyId: number;
  entityType: string;
  entityId: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  voucherNo?: string | null;
  voucherType?: string | null;
  amount?: number | null;
  narration?: string | null;
  details?: string | null;
  performedBy?: string | null;
  timestamp: string;
  prevHash: string;
  currentHash: string;
}

interface VerificationState {
  isVerifying: boolean;
  result: {
    valid: boolean;
    totalLogs: number;
    tamperedLogId?: number;
    reason?: string;
    verifiedAt?: string;
    headHash?: string;
    actionBreakdown?: {
      creates: number;
      updates: number;
      deletes: number;
    };
  } | null;
}

interface AuditTrailViewProps {
  company: any;
  onBack: () => void;
}

export default function AuditTrailView({ company, onBack }: AuditTrailViewProps) {
  const [logs, setLogs] = useState<AuditTrailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, creates: 0, updates: 0, deletes: 0 });
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditTrailItem | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationState>({
    isVerifying: false,
    result: null
  });

  const companyId = company?.id;

  const fetchLogs = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        companyId: String(companyId),
        limit: '100'
      });
      if (search) params.set('search', search);
      if (filterAction && filterAction !== 'ALL') params.set('filterAction', filterAction);

      const res = await fetch(`/api/audit-trail?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data || []);
        if (json.stats) {
          setStats(json.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load audit trail:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, search, filterAction]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Run cryptographic chain verification
  const runVerification = async () => {
    if (!companyId) return;
    setVerification(prev => ({ ...prev, isVerifying: true }));
    try {
      const res = await fetch(`/api/audit-trail?companyId=${companyId}&mode=verify`);
      const json = await res.json();
      if (json.success && json.verification) {
        setVerification({
          isVerifying: false,
          result: json.verification
        });
      }
    } catch (err) {
      console.error('Verification error:', err);
      setVerification({
        isVerifying: false,
        result: {
          valid: false,
          totalLogs: 0,
          reason: 'Network or server error during verification'
        }
      });
    }
  };

  // Keyboard shortcut: Esc to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedLog) {
          setSelectedLog(null);
        } else {
          onBack();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLog, onBack]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const exportAuditCSV = () => {
    if (!logs.length) return;
    const headers = ['Seq ID', 'Timestamp', 'Action', 'Voucher Type', 'Voucher No', 'Amount (INR)', 'Narration', 'User', 'Hash', 'Previous Hash'];
    const rows = logs.map(l => [
      l.id,
      new Date(l.timestamp).toLocaleString('en-IN'),
      l.action,
      l.voucherType || '',
      l.voucherNo || '',
      l.amount !== null && l.amount !== undefined ? l.amount : '',
      `"${(l.narration || '').replace(/"/g, '""')}"`,
      l.performedBy || '',
      l.currentHash,
      l.prevHash
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Trail_${company?.name || 'Company'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse details json safely
  const parseDetails = (raw?: string | null) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* TOP HEADER */}
      <header style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={onBack}
            style={{
              background: '#334155',
              border: 'none',
              color: '#f8fafc',
              padding: '8px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600
            }}
            title="Esc: Back to Gateway"
          >
            <ArrowLeft size={16} /> Esc: Back
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
                Tamper-Proof Audit Trail & Ledger
              </h1>
              <span style={{
                background: '#065f46',
                color: '#6ee7b7',
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                fontWeight: 600,
                letterSpacing: '0.5px'
              }}>
                MCA COMPLIANT (RULE 3)
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
              Company: <strong style={{ color: '#e2e8f0' }}>{company?.name || 'Current Company'}</strong> • Cryptographic SHA-256 Chained Ledger
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={runVerification}
            disabled={verification.isVerifying}
            style={{
              background: verification.isVerifying ? '#1e293b' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: verification.isVerifying ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 8px rgba(2,132,199,0.3)',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={15} className={verification.isVerifying ? 'animate-spin' : ''} />
            {verification.isVerifying ? 'Verifying Hashes...' : 'Verify Chain Integrity'}
          </button>

          <button
            onClick={exportAuditCSV}
            disabled={!logs.length}
            style={{
              background: '#334155',
              color: '#e2e8f0',
              border: '1px solid #475569',
              padding: '8px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              cursor: logs.length ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </header>

      {/* VERIFICATION BANNER (IF RUN) */}
      {verification.result && (
        <div style={{
          padding: '12px 24px',
          background: verification.result.valid ? 'rgba(6, 95, 70, 0.35)' : 'rgba(153, 27, 27, 0.45)',
          borderBottom: `1px solid ${verification.result.valid ? '#059669' : '#dc2626'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'fadeIn 0.3s'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {verification.result.valid ? (
              <ShieldCheck size={28} color="#34d399" />
            ) : (
              <ShieldAlert size={28} color="#f87171" />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: verification.result.valid ? '#34d399' : '#f87171' }}>
                {verification.result.valid
                  ? `Cryptographic Chain Integrity Verified (100% Untampered)`
                  : `SECURITY ALERT: Tampering Detected in Database!`}
              </div>
              <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                {verification.result.valid
                  ? `All ${verification.result.totalLogs} blocks verified sequentially. Zero hash mismatches. Genesis link is intact.`
                  : verification.result.reason}
              </div>
            </div>
          </div>

          {verification.result.headHash && (
            <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
              Head Hash: <span style={{ color: '#38bdf8' }}>{verification.result.headHash.slice(0, 16)}...</span>
            </div>
          )}
        </div>
      )}

      {/* STATS OVERVIEW CARDS */}
      <div style={{
        padding: '20px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 16
      }}>
        <div style={{ background: '#1e293b', padding: '16px 20px', borderRadius: 8, border: '1px solid #334155' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={14} color="#38bdf8" /> Total Chained Logs
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#38bdf8', marginTop: 4 }}>
            {stats.total || logs.length}
          </div>
        </div>

        <div style={{ background: '#1e293b', padding: '16px 20px', borderRadius: 8, border: '1px solid #334155' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={14} color="#34d399" /> Vouchers Created
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#34d399', marginTop: 4 }}>
            {stats.creates}
          </div>
        </div>

        <div style={{ background: '#1e293b', padding: '16px 20px', borderRadius: 8, border: '1px solid #334155' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color="#fbbf24" /> Vouchers Modified
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fbbf24', marginTop: 4 }}>
            {stats.updates}
          </div>
        </div>

        <div style={{ background: '#1e293b', padding: '16px 20px', borderRadius: 8, border: '1px solid #334155' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} color="#f87171" /> Vouchers Deleted
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f87171', marginTop: 4 }}>
            {stats.deletes}
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div style={{
        padding: '0 24px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260, maxWidth: 450 }}>
          <div style={{
            position: 'relative',
            width: '100%'
          }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search voucher #, narration, user..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#f8fafc',
                padding: '8px 12px 8px 34px',
                borderRadius: 6,
                fontSize: 13,
                outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={13} /> Action:
          </span>
          {['ALL', 'CREATE', 'UPDATE', 'DELETE'].map(act => (
            <button
              key={act}
              onClick={() => setFilterAction(act)}
              style={{
                background: filterAction === act ? '#0284c7' : '#1e293b',
                color: filterAction === act ? '#ffffff' : '#94a3b8',
                border: `1px solid ${filterAction === act ? '#0284c7' : '#334155'}`,
                padding: '6px 12px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {act}
            </button>
          ))}

          <button
            onClick={fetchLogs}
            style={{
              background: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #334155',
              padding: '6px 10px',
              borderRadius: 4,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12
            }}
            title="Refresh Logs"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* AUDIT LOG TABLE */}
      <div style={{ flex: 1, padding: '0 24px 24px', overflowX: 'auto' }}>
        <div style={{
          background: '#1e293b',
          borderRadius: 8,
          border: '1px solid #334155',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, width: 70 }}>Seq #</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, width: 170 }}>Date & Time</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, width: 110 }}>Action</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, width: 140 }}>Voucher</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, width: 120 }}>Amount</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Narration</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, width: 140 }}>User</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, width: 150 }}>Cryptographic Hash</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, width: 90, textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                    Loading encrypted audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 50, color: '#94a3b8' }}>
                    <ShieldCheck size={36} color="#059669" style={{ margin: '0 auto 8px' }} />
                    <p style={{ margin: '4px 0', fontSize: 14, fontWeight: 500, color: '#f8fafc' }}>
                      No Audit Records Found
                    </p>
                    <span style={{ fontSize: 12 }}>
                      Any future voucher creation, editing, or deletion will automatically be logged here with SHA-256 hash chaining.
                    </span>
                  </td>
                </tr>
              ) : (
                logs.map((item, idx) => {
                  const dateObj = new Date(item.timestamp);
                  const isActionCreate = item.action === 'CREATE';
                  const isActionUpdate = item.action === 'UPDATE';
                  const isActionDelete = item.action === 'DELETE';

                  const badgeColor = isActionCreate
                    ? { bg: '#064e3b', text: '#34d399', border: '#059669' }
                    : isActionUpdate
                    ? { bg: '#78350f', text: '#fbbf24', border: '#d97706' }
                    : { bg: '#7f1d1d', text: '#f87171', border: '#dc2626' };

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #334155',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                        transition: 'background 0.15s'
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#64748b' }}>
                        #{item.id}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                        {dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          background: badgeColor.bg,
                          color: badgeColor.text,
                          border: `1px solid ${badgeColor.border}`,
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700
                        }}>
                          {item.action}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                          {item.voucherType || 'Voucher'}
                        </div>
                        <div style={{ fontSize: 11, color: '#38bdf8' }}>
                          No: {item.voucherNo || '-'}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#e2e8f0' }}>
                        {item.amount !== null && item.amount !== undefined ? (
                          `₹ ${Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        ) : (
                          '-'
                        )}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#94a3b8', maxWidth: 220 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.narration || '-'}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', color: '#cbd5e1', fontSize: 12 }}>
                        {item.performedBy || 'System'}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: 11,
                              color: '#38bdf8',
                              background: '#0f172a',
                              padding: '2px 6px',
                              borderRadius: 4
                            }}
                            title={`Full Current Hash: ${item.currentHash}\nPrev Hash: ${item.prevHash}`}
                          >
                            {item.currentHash.slice(0, 10)}...
                          </span>
                          <button
                            onClick={() => copyToClipboard(item.currentHash)}
                            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
                            title="Copy SHA-256 Hash"
                          >
                            {copiedHash === item.currentHash ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedLog(item)}
                          style={{
                            background: '#334155',
                            color: '#38bdf8',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600
                          }}
                        >
                          <Eye size={12} /> Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL INSPECT MODAL */}
      {selectedLog && (
        <div
          onClick={() => setSelectedLog(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1e293b',
              border: '1px solid #475569',
              borderRadius: 12,
              width: '100%',
              maxWidth: 720,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* MODAL HEADER */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  background: selectedLog.action === 'CREATE' ? '#064e3b' : selectedLog.action === 'UPDATE' ? '#78350f' : '#7f1d1d',
                  color: selectedLog.action === 'CREATE' ? '#34d399' : selectedLog.action === 'UPDATE' ? '#fbbf24' : '#f87171',
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 700
                }}>
                  {selectedLog.action}
                </span>
                <h3 style={{ margin: 0, fontSize: 16, color: '#f8fafc' }}>
                  Audit Record #{selectedLog.id} • {selectedLog.voucherType} No: {selectedLog.voucherNo}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: 18,
                  cursor: 'pointer',
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            </div>

            {/* MODAL CONTENT */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, fontSize: 13 }}>
              {/* BLOCK CHAIN METRICS */}
              <div style={{ background: '#0f172a', padding: 14, borderRadius: 8, border: '1px solid #334155' }}>
                <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Hash size={15} /> Cryptographic Proof & Chain Link
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Current SHA-256 Hash:</span>
                    <div style={{ fontFamily: 'monospace', color: '#a7f3d0', wordBreak: 'break-all', marginTop: 2 }}>
                      {selectedLog.currentHash}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Previous Block Hash (Parent Link):</span>
                    <div style={{ fontFamily: 'monospace', color: '#93c5fd', wordBreak: 'break-all', marginTop: 2 }}>
                      {selectedLog.prevHash}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginTop: 4 }}>
                    <span>Timestamp: {new Date(selectedLog.timestamp).toLocaleString('en-IN')}</span>
                    <span>Logged By: {selectedLog.performedBy || 'System'}</span>
                  </div>
                </div>
              </div>

              {/* SNAPSHOT / DIFF */}
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={15} color="#38bdf8" /> Transaction Payload & State Diff
                </h4>

                {(() => {
                  const details = parseDetails(selectedLog.details);

                  if (!details) {
                    return <div style={{ color: '#94a3b8' }}>No extra payload recorded for this action.</div>;
                  }

                  // If it's an UPDATE with previousState & newState
                  if (details.previousState && details.newState) {
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {/* OLD STATE */}
                        <div style={{ background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: 6, padding: 12 }}>
                          <div style={{ color: '#f87171', fontWeight: 700, marginBottom: 8 }}>
                            Before Modification (Old)
                          </div>
                          <div style={{ fontSize: 12, color: '#fca5a5', lineHeight: 1.6 }}>
                            <div><strong>Type:</strong> {details.previousState.type}</div>
                            <div><strong>Voucher No:</strong> {details.previousState.voucherNo}</div>
                            <div><strong>Narration:</strong> {details.previousState.narration || '-'}</div>
                            <div style={{ marginTop: 8, fontWeight: 600 }}>Ledger Entries:</div>
                            <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                              {(details.previousState.entries || []).map((e: any, i: number) => (
                                <li key={i}>{e.ledgerName}: ₹{e.amount} ({e.entryType})</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* NEW STATE */}
                        <div style={{ background: '#0e2e1e', border: '1px solid #065f46', borderRadius: 6, padding: 12 }}>
                          <div style={{ color: '#34d399', fontWeight: 700, marginBottom: 8 }}>
                            After Modification (New)
                          </div>
                          <div style={{ fontSize: 12, color: '#6ee7b7', lineHeight: 1.6 }}>
                            <div><strong>Type:</strong> {details.newState.type}</div>
                            <div><strong>Voucher No:</strong> {details.newState.voucherNo}</div>
                            <div><strong>Narration:</strong> {details.newState.narration || '-'}</div>
                            <div style={{ marginTop: 8, fontWeight: 600 }}>Ledger Entries:</div>
                            <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                              {(details.newState.entries || []).map((e: any, i: number) => (
                                <li key={i}>{e.ledgerName}: ₹{e.amount} ({e.entryType})</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // If it's a DELETE with deletedVoucher
                  if (details.deletedVoucher) {
                    const dv = details.deletedVoucher;
                    return (
                      <div style={{ background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: 6, padding: 12 }}>
                        <div style={{ color: '#f87171', fontWeight: 700, marginBottom: 8 }}>
                          Preserved Record of Deleted Voucher (Auditor Recovery Snapshot)
                        </div>
                        <div style={{ fontSize: 12, color: '#fca5a5', lineHeight: 1.6 }}>
                          <div><strong>Type:</strong> {dv.type} | <strong>Voucher No:</strong> {dv.voucherNo}</div>
                          <div><strong>Date:</strong> {dv.date ? new Date(dv.date).toLocaleDateString() : '-'}</div>
                          <div><strong>Narration:</strong> {dv.narration || '-'}</div>
                          <div style={{ marginTop: 8, fontWeight: 600 }}>Ledger Entries before deletion:</div>
                          <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                            {(dv.entries || []).map((e: any, i: number) => (
                              <li key={i}>{e.ledgerName}: ₹{e.amount} ({e.entryType})</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  }

                  // Generic display
                  return (
                    <pre style={{
                      background: '#0f172a',
                      padding: 12,
                      borderRadius: 6,
                      border: '1px solid #334155',
                      color: '#cbd5e1',
                      overflowX: 'auto',
                      fontSize: 12
                    }}>
                      {JSON.stringify(details, null, 2)}
                    </pre>
                  );
                })()}
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #334155',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#0f172a'
            }}>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  background: '#334155',
                  color: '#f8fafc',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
