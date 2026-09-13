'use client';

import React, { useState, useMemo } from 'react';
import {
  VirtualFormData,
  VirtualFinancialItem,
  VirtualPartnerItem,
  VirtualAssetItem,
  CalculatedVirtualFinancials,
  VirtualProjectedYearResult
} from './types';
import { DEFAULT_VIRTUAL_FORM_DATA } from './defaults';
import { computeVirtualActualFinancials, computeVirtualProjections, r2 } from './virtualEngine';

const fmt = (n: number | undefined | null) =>
  (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function VirtualFinalBSModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<VirtualFormData>(DEFAULT_VIRTUAL_FORM_DATA);
  const [activeSectionTab, setActiveSectionTab] = useState<'bs' | 'pl' | 'annexA' | 'annexB'>('bs');
  const [isExporting, setIsExporting] = useState(false);

  // ─── Real-time Calculation ────────────────────────────────────────────────
  const actualFin = useMemo(() => computeVirtualActualFinancials(form), [form]);

  const projResults = useMemo(() => {
    if (form.mode !== 'provisional') return [];
    return computeVirtualProjections(actualFin, form, form.projectionConfig);
  }, [actualFin, form]);

  const currentProj: VirtualProjectedYearResult | null =
    projResults.length > 0 ? projResults[projResults.length - 1] : null;

  const activeData = form.mode === 'provisional' && currentProj ? currentProj : actualFin;

  if (!isOpen) return null;

  // ─── Handlers for Dynamic Row Additions / Deletions ────────────────────────
  const addItem = (sectionKey: keyof typeof form.bsSections) => {
    const newItem: VirtualFinancialItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: 'New Ledger A/c',
      amount: 0,
    };
    setForm(f => ({
      ...f,
      bsSections: {
        ...f.bsSections,
        [sectionKey]: [...(f.bsSections[sectionKey] || []), newItem],
      },
    }));
  };

  const updateItem = (sectionKey: keyof typeof form.bsSections, id: string, field: 'name' | 'amount', value: any) => {
    setForm(f => ({
      ...f,
      bsSections: {
        ...f.bsSections,
        [sectionKey]: (f.bsSections[sectionKey] || []).map(it =>
          it.id === id ? { ...it, [field]: field === 'amount' ? (parseFloat(value) || 0) : value } : it
        ),
      },
    }));
  };

  const deleteItem = (sectionKey: keyof typeof form.bsSections, id: string) => {
    setForm(f => ({
      ...f,
      bsSections: {
        ...f.bsSections,
        [sectionKey]: (f.bsSections[sectionKey] || []).filter(it => it.id !== id),
      },
    }));
  };

  // Direct / Indirect Exp & Inc Handlers
  const addPLExp = (type: 'directExpenses' | 'indirectExpenses' | 'indirectIncomes') => {
    const newItem: VirtualFinancialItem = {
      id: `pl-${Date.now()}`,
      name: type === 'indirectIncomes' ? 'New Income A/c' : 'New Expense A/c',
      amount: 0,
    };
    setForm(f => {
      if (type === 'directExpenses') {
        return {
          ...f,
          plData: {
            ...f.plData,
            trading: {
              ...f.plData.trading,
              directExpenses: [...(f.plData.trading.directExpenses || []), newItem],
            },
          },
        };
      } else {
        return {
          ...f,
          plData: {
            ...f.plData,
            [type]: [...(f.plData[type] || []), newItem],
          },
        };
      }
    });
  };

  const updatePLExp = (type: 'directExpenses' | 'indirectExpenses' | 'indirectIncomes', id: string, field: 'name' | 'amount', val: any) => {
    setForm(f => {
      const parsedVal = field === 'amount' ? (parseFloat(val) || 0) : val;
      if (type === 'directExpenses') {
        return {
          ...f,
          plData: {
            ...f.plData,
            trading: {
              ...f.plData.trading,
              directExpenses: f.plData.trading.directExpenses.map(e => e.id === id ? { ...e, [field]: parsedVal } : e),
            },
          },
        };
      } else {
        return {
          ...f,
          plData: {
            ...f.plData,
            [type]: f.plData[type].map(e => e.id === id ? { ...e, [field]: parsedVal } : e),
          },
        };
      }
    });
  };

  const deletePLExp = (type: 'directExpenses' | 'indirectExpenses' | 'indirectIncomes', id: string) => {
    setForm(f => {
      if (type === 'directExpenses') {
        return {
          ...f,
          plData: {
            ...f.plData,
            trading: {
              ...f.plData.trading,
              directExpenses: f.plData.trading.directExpenses.filter(e => e.id !== id),
            },
          },
        };
      } else {
        return {
          ...f,
          plData: {
            ...f.plData,
            [type]: f.plData[type].filter(e => e.id !== id),
          },
        };
      }
    });
  };

  // Partners Handlers
  const addPartner = () => {
    const count = (form.partners || []).length;
    const newP: VirtualPartnerItem = {
      id: `p-${Date.now()}`,
      name: `PARTNER ${count + 1}`,
      sharePct: 0,
      openingBal: 0,
      addition: 0,
      salary: 0,
      interestRate: 12,
      withdrawalsAmt: 0,
    };
    setForm(f => ({ ...f, partners: [...(f.partners || []), newP] }));
  };

  const updatePartner = (id: string, field: keyof VirtualPartnerItem, val: any) => {
    setForm(f => ({
      ...f,
      partners: (f.partners || []).map(p =>
        p.id === id ? { ...p, [field]: typeof p[field] === 'number' ? (parseFloat(val) || 0) : val } : p
      ),
    }));
  };

  const deletePartner = (id: string) => {
    setForm(f => ({ ...f, partners: (f.partners || []).filter(p => p.id !== id) }));
  };

  // Fixed Assets Handlers
  const addFA = () => {
    const count = (form.fixedAssetSchedule || []).length;
    const newFA: VirtualAssetItem = {
      id: `fa-${Date.now()}`,
      name: `Asset ${count + 1}`,
      openingBal: 0,
      additionBefore: 0,
      additionAfter: 0,
      depreciationRate: 15,
      closingBal: 0,
    };
    setForm(f => ({ ...f, fixedAssetSchedule: [...(f.fixedAssetSchedule || []), newFA] }));
  };

  const updateFA = (id: string, field: keyof VirtualAssetItem, val: any) => {
    setForm(f => ({
      ...f,
      fixedAssetSchedule: (f.fixedAssetSchedule || []).map(fa =>
        fa.id === id ? { ...fa, [field]: typeof fa[field] === 'number' ? (parseFloat(val) || 0) : val } : fa
      ),
    }));
  };

  const deleteFA = (id: string) => {
    setForm(f => ({ ...f, fixedAssetSchedule: (f.fixedAssetSchedule || []).filter(fa => fa.id !== id) }));
  };

  // ─── Export Handler ───────────────────────────────────────────────────────
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const payload = {
        company: form.company,
        signatory: form.signatory,
        calculatedData: activeData,
        form: form,
        isProvisional: form.mode === 'provisional',
      };

      const res = await fetch('/api/reports/virtual-export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Virtual Export failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filePrefix = form.mode === 'provisional' ? 'PROV_' : '';
      a.download = `${(form.company.name || 'Company').replace(/[^a-zA-Z0-9_-]/g, '_')}_${filePrefix}Financial_Statements_CA_Format.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Export failed: ' + (err.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  const totalPartnerShare = (form.partners || []).reduce((s, p) => s + (Number(p.sharePct) || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-box"
        style={{
          width: 960,
          maxWidth: '98vw',
          maxHeight: '94vh',
          overflowY: 'auto',
          borderRadius: 8,
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          background: '#fff',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#fff',
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 14 }}>
                Virtual / Manual Final Balance Sheet & P&L (CA Excel Format — 4 Sheets)
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                100% Isolated Data Entry • Live Automatic Formulas • Full CA Excel Export
              </div>
            </div>
          </div>
          <span
            style={{ cursor: 'pointer', fontSize: 18, fontWeight: 'bold', color: '#cbd5e1' }}
            onClick={onClose}
          >
            ✕
          </span>
        </div>

        <div style={{ padding: 18 }}>
          {/* ── Mode Switcher Tabs ── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, mode: 'actual' }))}
              style={{
                flex: 1,
                padding: '8px 14px',
                borderRadius: 6,
                border: 'none',
                fontWeight: 'bold',
                fontSize: 12,
                cursor: 'pointer',
                background: form.mode === 'actual' ? '#1c5282' : 'transparent',
                color: form.mode === 'actual' ? '#fff' : '#475569',
                boxShadow: form.mode === 'actual' ? '0 2px 6px rgba(28,82,130,0.3)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              📄 Actual Statements (Current Year)
            </button>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, mode: 'provisional' }))}
              style={{
                flex: 1,
                padding: '8px 14px',
                borderRadius: 6,
                border: 'none',
                fontWeight: 'bold',
                fontSize: 12,
                cursor: 'pointer',
                background: form.mode === 'provisional' ? 'linear-gradient(135deg, #059669, #10b981)' : 'transparent',
                color: form.mode === 'provisional' ? '#fff' : '#475569',
                boxShadow: form.mode === 'provisional' ? '0 2px 6px rgba(16,185,129,0.3)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              📈 Provisional / Projected (Next Year Growth)
            </button>
          </div>

          {/* ── Company Information Card ── */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#1e293b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🏢</span> Company & Period Details (Type any company name & address):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: 3 }}>
                  Company Name:
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: 12, fontWeight: 'bold' }}
                  value={form.company.name}
                  onChange={e => setForm(f => ({ ...f, company: { ...f.company, name: e.target.value } }))}
                  placeholder="e.g. M/S AIMAN TRADERS"
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: 3 }}>
                  Place / City / State:
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: 12 }}
                  value={form.company.place}
                  onChange={e => setForm(f => ({ ...f, company: { ...f.company, place: e.target.value } }))}
                  placeholder="e.g. UTTARAKHAND"
                />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: 3 }}>
                Company Full Address:
              </label>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', fontSize: 11 }}
                value={form.company.address}
                onChange={e => setForm(f => ({ ...f, company: { ...f.company, address: e.target.value } }))}
                placeholder="e.g. KHATIMA ROAD NEAR GOVERNMENT HOSPITAL SITARGANJ UDHAM SINGH NAGAR"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: 3 }}>
                  Balance Sheet As On:
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: 11 }}
                  value={form.company.asOnDate}
                  onChange={e => setForm(f => ({ ...f, company: { ...f.company, asOnDate: e.target.value } }))}
                  placeholder="31.03.2027"
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: 3 }}>
                  P&L From Date:
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: 11 }}
                  value={form.company.fromDate}
                  onChange={e => setForm(f => ({ ...f, company: { ...f.company, fromDate: e.target.value } }))}
                  placeholder="01-Apr-2026"
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: 3 }}>
                  P&L To Date:
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: 11 }}
                  value={form.company.toDate}
                  onChange={e => setForm(f => ({ ...f, company: { ...f.company, toDate: e.target.value } }))}
                  placeholder="31-Mar-2027"
                />
              </div>
            </div>
          </div>

          {/* ── CA / Signatory Details Card ── */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#1e293b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✍️</span> Chartered Accountant / Signatory Details:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: 3 }}>
                  CA / Firm Name:
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: 11 }}
                  value={form.signatory.caName}
                  onChange={e => setForm(f => ({ ...f, signatory: { ...f.signatory, caName: e.target.value } }))}
                  placeholder="e.g. RAMESH GUPTA & CO."
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: 3 }}>
                  M.No. (Membership No.):
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: 11 }}
                  value={form.signatory.caMno}
                  onChange={e => setForm(f => ({ ...f, signatory: { ...f.signatory, caMno: e.target.value } }))}
                  placeholder="e.g. 054321"
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: 4 }}>
                Firm Signatory Title:
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['PARTNER', 'PROPRIETOR', 'DIRECTOR', 'AUTH. SIGNATORY'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, signatory: { ...f.signatory, signatoryTitle: t } }))}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 4,
                      border: form.signatory.signatoryTitle === t ? '1px solid #1c5282' : '1px solid #cbd5e1',
                      background: form.signatory.signatoryTitle === t ? '#1c5282' : '#fff',
                      color: form.signatory.signatoryTitle === t ? '#fff' : '#334155',
                      fontSize: 11,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Provisional Controls (If in provisional mode) ── */}
          {form.mode === 'provisional' && (
            <div style={{ border: '1px solid #a7f3d0', background: '#f0fdf4', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontWeight: 'bold', fontSize: 13, color: '#065f46' }}>
                  🎯 Projection Horizon & Growth Benchmarks:
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, projectionConfig: { ...f.projectionConfig, horizonYears: h } }))}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 4,
                        border: form.projectionConfig.horizonYears === h ? '1px solid #059669' : '1px solid #cbd5e1',
                        background: form.projectionConfig.horizonYears === h ? '#059669' : '#fff',
                        color: form.projectionConfig.horizonYears === h ? '#fff' : '#334155',
                        fontWeight: form.projectionConfig.horizonYears === h ? 'bold' : 'normal',
                        fontSize: 11,
                        cursor: 'pointer'
                      }}
                    >
                      {h === 1 ? '+1 Year Prov.' : `+${h} Years Proj.`}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: 2 }}>
                    Sales Growth %:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ width: '100%', fontSize: 11, fontWeight: 'bold', color: '#065f46' }}
                    value={form.projectionConfig.salesGrowthPct}
                    onChange={e => setForm(f => ({ ...f, projectionConfig: { ...f.projectionConfig, salesGrowthPct: parseFloat(e.target.value) || 0 } }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: 2 }}>
                    Target GP Margin %:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ width: '100%', fontSize: 11, fontWeight: 'bold', color: '#065f46' }}
                    value={form.projectionConfig.gpMarginPct}
                    onChange={e => setForm(f => ({ ...f, projectionConfig: { ...f.projectionConfig, gpMarginPct: parseFloat(e.target.value) || 0 } }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: 2 }}>
                    Stock Growth %:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ width: '100%', fontSize: 11 }}
                    value={form.projectionConfig.stockGrowthPct}
                    onChange={e => setForm(f => ({ ...f, projectionConfig: { ...f.projectionConfig, stockGrowthPct: parseFloat(e.target.value) || 0 } }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: 2 }}>
                    Admin Inflation %:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ width: '100%', fontSize: 11 }}
                    value={form.projectionConfig.expenseInflationPct}
                    onChange={e => setForm(f => ({ ...f, projectionConfig: { ...f.projectionConfig, expenseInflationPct: parseFloat(e.target.value) || 0 } }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: 2 }}>
                    CC Limit Growth %:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ width: '100%', fontSize: 11 }}
                    value={form.projectionConfig.ccLimitGrowthPct}
                    onChange={e => setForm(f => ({ ...f, projectionConfig: { ...f.projectionConfig, ccLimitGrowthPct: parseFloat(e.target.value) || 0 } }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Sub-navigation for Data Sections ── */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, borderBottom: '2px solid #e2e8f0', paddingBottom: 6 }}>
            {[
              { id: 'bs', label: '📊 Balance Sheet Sections' },
              { id: 'pl', label: '📈 Profit & Loss (Trading & P&L)' },
              { id: 'annexA', label: `👥 Annexure "A" (Partners Capital: ${form.partners?.length || 0})` },
              { id: 'annexB', label: `🏗️ Annexure "B" (Fixed Assets: ${form.fixedAssetSchedule?.length || 0})` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSectionTab(tab.id as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontWeight: activeSectionTab === tab.id ? 'bold' : 'normal',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: activeSectionTab === tab.id ? '#1e293b' : '#f1f5f9',
                  color: activeSectionTab === tab.id ? '#fff' : '#475569',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 1: BALANCE SHEET SECTIONS
             ═══════════════════════════════════════════════════════════════════ */}
          {activeSectionTab === 'bs' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Left: LIABILITIES */}
                <div>
                  <div style={{ background: '#1c5282', color: '#fff', padding: '6px 10px', borderRadius: 4, fontWeight: 'bold', fontSize: 12, marginBottom: 8 }}>
                    LIABILITIES SIDE
                  </div>

                  {/* CAPITAL ACCOUNT */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 11, color: '#1e293b' }}>CAPITAL ACCOUNT</span>
                      <button type="button" onClick={() => addItem('capitalItems')} style={{ fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>+ Add</button>
                    </div>
                    {(form.bsSections.capitalItems || []).map(it => (
                      <div key={it.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 2, fontSize: 11 }}
                          value={it.name}
                          onChange={e => updateItem('capitalItems', it.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right' }}
                          value={it.amount}
                          onChange={e => updateItem('capitalItems', it.id, 'amount', e.target.value)}
                        />
                        <button type="button" onClick={() => deleteItem('capitalItems', it.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>

                  {/* SECURED LOAN */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 11, color: '#1e293b' }}>SECURED LOAN :</span>
                      <button type="button" onClick={() => addItem('securedLoans')} style={{ fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>+ Add</button>
                    </div>
                    {(form.bsSections.securedLoans || []).map(it => (
                      <div key={it.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 2, fontSize: 11 }}
                          value={it.name}
                          onChange={e => updateItem('securedLoans', it.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right' }}
                          value={it.amount}
                          onChange={e => updateItem('securedLoans', it.id, 'amount', e.target.value)}
                        />
                        <button type="button" onClick={() => deleteItem('securedLoans', it.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>

                  {/* UNSECURED LOAN */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 11, color: '#1e293b' }}>UNSECURED LOAN :</span>
                      <button type="button" onClick={() => addItem('unsecuredLoans')} style={{ fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>+ Add</button>
                    </div>
                    {(form.bsSections.unsecuredLoans || []).map(it => (
                      <div key={it.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 2, fontSize: 11 }}
                          value={it.name}
                          onChange={e => updateItem('unsecuredLoans', it.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right' }}
                          value={it.amount}
                          onChange={e => updateItem('unsecuredLoans', it.id, 'amount', e.target.value)}
                        />
                        <button type="button" onClick={() => deleteItem('unsecuredLoans', it.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>

                  {/* CURRENT LIABILITIES */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 11, color: '#1e293b' }}>CURRENT LIABILITIES</span>
                      <button type="button" onClick={() => addItem('currentLiabilities')} style={{ fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>+ Add</button>
                    </div>
                    {(form.bsSections.currentLiabilities || []).map(it => (
                      <div key={it.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 2, fontSize: 11 }}
                          value={it.name}
                          onChange={e => updateItem('currentLiabilities', it.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right' }}
                          value={it.amount}
                          onChange={e => updateItem('currentLiabilities', it.id, 'amount', e.target.value)}
                        />
                        <button type="button" onClick={() => deleteItem('currentLiabilities', it.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: ASSETS */}
                <div>
                  <div style={{ background: '#1c5282', color: '#fff', padding: '6px 10px', borderRadius: 4, fontWeight: 'bold', fontSize: 12, marginBottom: 8 }}>
                    ASSETS SIDE
                  </div>

                  {/* FIXED ASSETS */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 11, color: '#1e293b' }}>FIXED ASSETS</span>
                      <button type="button" onClick={() => addItem('fixedAssets')} style={{ fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>+ Add</button>
                    </div>
                    {(form.bsSections.fixedAssets || []).map(it => (
                      <div key={it.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 2, fontSize: 11 }}
                          value={it.name}
                          onChange={e => updateItem('fixedAssets', it.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right' }}
                          value={it.amount}
                          onChange={e => updateItem('fixedAssets', it.id, 'amount', e.target.value)}
                        />
                        <button type="button" onClick={() => deleteItem('fixedAssets', it.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>

                  {/* SECURITY DEPOSITS */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 11, color: '#1e293b' }}>SECURITY DEPOSITS</span>
                      <button type="button" onClick={() => addItem('securityDeposits')} style={{ fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>+ Add</button>
                    </div>
                    {(form.bsSections.securityDeposits || []).map(it => (
                      <div key={it.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 2, fontSize: 11 }}
                          value={it.name}
                          onChange={e => updateItem('securityDeposits', it.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right' }}
                          value={it.amount}
                          onChange={e => updateItem('securityDeposits', it.id, 'amount', e.target.value)}
                        />
                        <button type="button" onClick={() => deleteItem('securityDeposits', it.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>

                  {/* CURRENT ASSETS */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 11, color: '#1e293b' }}>CURRENT ASSETS</span>
                      <button type="button" onClick={() => addItem('currentAssets')} style={{ fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>+ Add</button>
                    </div>
                    {(form.bsSections.currentAssets || []).map(it => (
                      <div key={it.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 2, fontSize: 11 }}
                          value={it.name}
                          onChange={e => updateItem('currentAssets', it.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right' }}
                          value={it.amount}
                          onChange={e => updateItem('currentAssets', it.id, 'amount', e.target.value)}
                        />
                        <button type="button" onClick={() => deleteItem('currentAssets', it.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 2: PROFIT & LOSS DATA
             ═══════════════════════════════════════════════════════════════════ */}
          {activeSectionTab === 'pl' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Trading Account Inputs */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 10 }}>
                  <div style={{ fontWeight: 'bold', fontSize: 12, color: '#1c5282', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
                    TRADING ACCOUNT
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 'bold' }}>To Opening Stock (₹):</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ width: '100%', fontSize: 11 }}
                        value={form.plData.trading.openingStock}
                        onChange={e => setForm(f => ({ ...f, plData: { ...f.plData, trading: { ...f.plData.trading, openingStock: parseFloat(e.target.value) || 0 } } }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 'bold' }}>To Purchases (₹):</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ width: '100%', fontSize: 11 }}
                        value={form.plData.trading.purchases}
                        onChange={e => setForm(f => ({ ...f, plData: { ...f.plData, trading: { ...f.plData.trading, purchases: parseFloat(e.target.value) || 0 } } }))}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 'bold' }}>By Sales (₹):</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ width: '100%', fontSize: 11, fontWeight: 'bold', color: '#065f46' }}
                        value={form.plData.trading.sales}
                        onChange={e => setForm(f => ({ ...f, plData: { ...f.plData, trading: { ...f.plData.trading, sales: parseFloat(e.target.value) || 0 } } }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 'bold' }}>By Closing Stock (₹):</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        style={{ width: '100%', fontSize: 11 }}
                        value={form.plData.trading.closingStock}
                        onChange={e => setForm(f => ({ ...f, plData: { ...f.plData, trading: { ...f.plData.trading, closingStock: parseFloat(e.target.value) || 0 } } }))}
                      />
                    </div>
                  </div>

                  {/* Direct Expenses */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 'bold' }}>Direct Expenses:</span>
                      <button type="button" onClick={() => addPLExp('directExpenses')} style={{ fontSize: 10, padding: '2px 6px' }}>+ Add</button>
                    </div>
                    {(form.plData.trading.directExpenses || []).map(de => (
                      <div key={de.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 2, fontSize: 11 }}
                          value={de.name}
                          onChange={e => updatePLExp('directExpenses', de.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right' }}
                          value={de.amount}
                          onChange={e => updatePLExp('directExpenses', de.id, 'amount', e.target.value)}
                        />
                        <button type="button" onClick={() => deletePLExp('directExpenses', de.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent' }}>✕</button>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 10, background: '#f0fdf4', padding: '6px 8px', borderRadius: 4, display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 'bold' }}>
                    <span>Gross Profit:</span>
                    <span style={{ color: activeData.grossProfit >= 0 ? '#059669' : '#dc2626' }}>₹{fmt(activeData.grossProfit)}</span>
                  </div>
                </div>

                {/* Indirect Expenses & Incomes */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 10 }}>
                  <div style={{ fontWeight: 'bold', fontSize: 12, color: '#1c5282', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
                    INDIRECT EXPENSES & INCOMES
                  </div>

                  {/* Indirect Incomes */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 'bold' }}>Indirect Incomes:</span>
                      <button type="button" onClick={() => addPLExp('indirectIncomes')} style={{ fontSize: 10, padding: '2px 6px' }}>+ Add</button>
                    </div>
                    {(form.plData.indirectIncomes || []).map(ii => (
                      <div key={ii.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 2, fontSize: 11 }}
                          value={ii.name}
                          onChange={e => updatePLExp('indirectIncomes', ii.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right' }}
                          value={ii.amount}
                          onChange={e => updatePLExp('indirectIncomes', ii.id, 'amount', e.target.value)}
                        />
                        <button type="button" onClick={() => deletePLExp('indirectIncomes', ii.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent' }}>✕</button>
                      </div>
                    ))}
                  </div>

                  {/* Indirect Expenses */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 'bold' }}>Indirect Expenses:</span>
                      <button type="button" onClick={() => addPLExp('indirectExpenses')} style={{ fontSize: 10, padding: '2px 6px' }}>+ Add</button>
                    </div>
                    {(form.plData.indirectExpenses || []).map(ie => (
                      <div key={ie.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 2, fontSize: 11 }}
                          value={ie.name}
                          onChange={e => updatePLExp('indirectExpenses', ie.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right' }}
                          value={ie.amount}
                          onChange={e => updatePLExp('indirectExpenses', ie.id, 'amount', e.target.value)}
                        />
                        <button type="button" onClick={() => deletePLExp('indirectExpenses', ie.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent' }}>✕</button>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 14, background: '#e0f2fe', padding: '6px 8px', borderRadius: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 'bold' }}>
                    <span>Net Profit / (Loss):</span>
                    <span style={{ color: activeData.netProfit >= 0 ? '#0369a1' : '#dc2626' }}>₹{fmt(activeData.netProfit)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 3: ANNEXURE "A" (PARTNERS CAPITAL ACCOUNT)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeSectionTab === 'annexA' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: '#334155' }}>
                  Total Share: <b>{totalPartnerShare}%</b>{' '}
                  {totalPartnerShare === 100 ? (
                    <span style={{ color: '#059669', fontWeight: 'bold' }}>✓ (100% OK)</span>
                  ) : (
                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>(Total must equal 100%)</span>
                  )}
                  {' • '}Net Profit to Distribute: <b>₹{fmt(activeData.netProfit)}</b>
                </div>
                <button type="button" onClick={addPartner} style={{ fontSize: 11, padding: '4px 10px', background: '#1c5282', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
                  + Add Partner
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', border: '1px solid #cbd5e1' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: 6, textAlign: 'left' }}>Partner Name</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 75 }}>Share %</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 105 }}>Opening Bal</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 90 }}>Addition</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 90 }}>Salary</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 70 }}>Int %</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 95 }}>Withdrawals</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 105 }}>Profit Share</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 110 }}>Closing Balance</th>
                      <th style={{ padding: 6, textAlign: 'center', width: 35 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeData.calculatedPartners || []).map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: 4 }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ width: '100%', fontSize: 11 }}
                            value={p.name}
                            onChange={e => updatePartner(p.id, 'name', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            value={p.sharePct}
                            onChange={e => updatePartner(p.id, 'sharePct', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            value={p.openingBal}
                            onChange={e => updatePartner(p.id, 'openingBal', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            value={p.addition}
                            onChange={e => updatePartner(p.id, 'addition', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            value={p.salary}
                            onChange={e => updatePartner(p.id, 'salary', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="0.1"
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            value={p.interestRate}
                            onChange={e => updatePartner(p.id, 'interestRate', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            value={p.withdrawalsAmt}
                            onChange={e => updatePartner(p.id, 'withdrawalsAmt', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4, textAlign: 'right', fontWeight: 'bold', color: '#0369a1' }}>
                          ₹{fmt(p.profitShare)}
                        </td>
                        <td style={{ padding: 4, textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>
                          ₹{fmt(p.closingBal)}
                        </td>
                        <td style={{ padding: 4, textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => deletePartner(p.id)}
                            style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                      <td style={{ padding: 6 }}>TOTAL CLOSING CAPITAL</td>
                      <td style={{ padding: 6, textAlign: 'right' }}>{totalPartnerShare}%</td>
                      <td colSpan={6}></td>
                      <td style={{ padding: 6, textAlign: 'right', color: '#059669', fontSize: 12 }}>
                        ₹{fmt(activeData.totalClosingCapital)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 4: ANNEXURE "B" (FIXED ASSETS SCHEDULE)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeSectionTab === 'annexB' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>
                  Total Fixed Assets Closing WDV: <b>₹{fmt(activeData.totalClosingFA)}</b>
                </span>
                <button type="button" onClick={addFA} style={{ fontSize: 11, padding: '4px 10px', background: '#1c5282', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
                  + Add Asset
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', border: '1px solid #cbd5e1' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: 6, textAlign: 'left' }}>Description of Asset</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 110 }}>Opening WDV</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 100 }}>Addition &lt; 180</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 100 }}>Addition &gt; 180</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 80 }}>Dep. Rate %</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 110 }}>Depreciation</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 120 }}>Closing WDV</th>
                      <th style={{ padding: 6, textAlign: 'center', width: 35 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeData.calculatedFASchedule || []).map(fa => (
                      <tr key={fa.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: 4 }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ width: '100%', fontSize: 11 }}
                            value={fa.name}
                            onChange={e => updateFA(fa.id, 'name', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            value={fa.openingBal}
                            onChange={e => updateFA(fa.id, 'openingBal', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            value={fa.additionBefore}
                            onChange={e => updateFA(fa.id, 'additionBefore', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            value={fa.additionAfter}
                            onChange={e => updateFA(fa.id, 'additionAfter', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="0.1"
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            value={fa.depreciationRate}
                            onChange={e => updateFA(fa.id, 'depreciationRate', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4, textAlign: 'right', color: '#dc2626' }}>
                          ₹{fmt(fa.depreciation)}
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right', fontWeight: 'bold' }}
                            value={fa.closingBal}
                            onChange={e => updateFA(fa.id, 'closingBal', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4, textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => deleteFA(fa.id)}
                            style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                      <td style={{ padding: 6 }}>TOTAL CLOSING WDV</td>
                      <td colSpan={5}></td>
                      <td style={{ padding: 6, textAlign: 'right', color: '#1c5282', fontSize: 12 }}>
                        ₹{fmt(activeData.totalClosingFA)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── Live KPI Balance Bar ── */}
          <div
            style={{
              marginTop: 18,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Balance Sheet Status:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 14 }}>
                  {activeData.isBalanced ? '✅' : '⚠️'}
                </span>
                <span
                  style={{
                    fontWeight: 'bold',
                    fontSize: 13,
                    color: activeData.isBalanced ? '#059669' : '#d97706',
                  }}
                >
                  {activeData.isBalanced
                    ? `100% Balanced: Total Liabilities (₹${fmt(activeData.totalLiabilities)}) = Total Assets (₹${fmt(activeData.totalAssets)})`
                    : `Difference: ₹${fmt(Math.abs(activeData.diff))}`}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 14, fontSize: 11 }}>
              <div>
                <span style={{ color: '#64748b' }}>Gross Profit:</span>{' '}
                <b>₹{fmt(activeData.grossProfit)}</b>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Net Profit:</span>{' '}
                <b style={{ color: activeData.netProfit >= 0 ? '#059669' : '#dc2626' }}>
                  ₹{fmt(activeData.netProfit)}
                </b>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Cash Balancing:</span>{' '}
                <b>₹{fmt(activeData.balancingCash)}</b>
              </div>
            </div>
          </div>

          {/* ── Actions Footer ── */}
          <div
            style={{
              marginTop: 18,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() => setForm(DEFAULT_VIRTUAL_FORM_DATA)}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                padding: '8px 14px',
                borderRadius: 6,
                fontSize: 12,
                cursor: 'pointer',
                color: '#475569',
              }}
            >
              🔄 Reset to Defaults
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                  color: '#334155',
                }}
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                style={{
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 20px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 'bold',
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {isExporting ? '⏳ Exporting Excel...' : '📊 Export 4-Sheet CA Excel Workbook (.xlsx)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
