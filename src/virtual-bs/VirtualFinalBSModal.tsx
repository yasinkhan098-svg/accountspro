'use client';

import React, { useState, useMemo } from 'react';
import {
  VirtualFormData,
  VirtualFinancialItem,
  VirtualPartnerItem,
  VirtualAssetItem,
  VirtualProjectedYearResult
} from './types';
import { DEFAULT_VIRTUAL_FORM_DATA } from './defaults';
import { computeVirtualActualFinancials, computeVirtualProjections } from './virtualEngine';

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
  const [showSignatoryCard, setShowSignatoryCard] = useState(true);

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

  // ─── Handlers for Dynamic Row Additions / Deletions (Actual Mode) ──────────
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
              directExpenses: (f.plData.trading.directExpenses || []).map(e => e.id === id ? { ...e, [field]: parsedVal } : e),
            },
          },
        };
      } else {
        return {
          ...f,
          plData: {
            ...f.plData,
            [type]: (f.plData[type] || []).map(e => e.id === id ? { ...e, [field]: parsedVal } : e),
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
              directExpenses: (f.plData.trading.directExpenses || []).filter(e => e.id !== id),
            },
          },
        };
      } else {
        return {
          ...f,
          plData: {
            ...f.plData,
            [type]: (f.plData[type] || []).filter(e => e.id !== id),
          },
        };
      }
    });
  };

  // Partners Fine-tuning Handlers (Updates custom adjustments)
  const updatePartnerCustom = (id: string, name: string, field: keyof VirtualPartnerItem, val: any) => {
    setForm(f => {
      const existing = (f.partners || []).find(
        p => p.id === id || p.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      let updatedList = [...(f.partners || [])];
      const parsedVal = typeof existing?.[field] === 'number' || field === 'salary' || field === 'withdrawalsAmt' || field === 'interestRate' || field === 'addition' || field === 'sharePct'
        ? (parseFloat(val) || 0)
        : val;

      if (existing) {
        updatedList = updatedList.map(p =>
          (p.id === existing.id || p.name.trim().toLowerCase() === name.trim().toLowerCase())
            ? { ...p, [field]: parsedVal }
            : p
        );
      } else {
        updatedList.push({
          id,
          name,
          sharePct: field === 'sharePct' ? parsedVal : 0,
          openingBal: 0,
          addition: field === 'addition' ? parsedVal : 0,
          salary: field === 'salary' ? parsedVal : 0,
          interestRate: field === 'interestRate' ? parsedVal : 12,
          withdrawalsAmt: field === 'withdrawalsAmt' ? parsedVal : 0,
          [field]: parsedVal,
        });
      }
      return { ...f, partners: updatedList };
    });
  };

  // Fixed Assets Fine-tuning Handlers
  const updateFACustom = (id: string, name: string, field: keyof VirtualAssetItem, val: any) => {
    setForm(f => {
      const existing = (f.fixedAssetSchedule || []).find(
        fa => fa.id === id || fa.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      let updatedList = [...(f.fixedAssetSchedule || [])];
      const parsedVal = parseFloat(val) || 0;

      if (existing) {
        updatedList = updatedList.map(fa =>
          (fa.id === existing.id || fa.name.trim().toLowerCase() === name.trim().toLowerCase())
            ? { ...fa, [field]: parsedVal }
            : fa
        );
      } else {
        updatedList.push({
          id,
          name,
          openingBal: 0,
          additionBefore: field === 'additionBefore' ? parsedVal : 0,
          additionAfter: field === 'additionAfter' ? parsedVal : 0,
          depreciationRate: field === 'depreciationRate' ? parsedVal : 15,
          [field]: parsedVal,
        });
      }
      return { ...f, fixedAssetSchedule: updatedList };
    });
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
      alert(`Export Error: ${err.message || 'Error occurred'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const totalPartnerShare = Math.round((activeData.calculatedPartners || []).reduce((s, p) => s + (Number(p.sharePct) || 0), 0) * 100) / 100;

  // Active BS & PL datasets (in Provisional mode, shows projected items; in Actual mode, shows user items)
  const isProv = form.mode === 'provisional';
  const displayBSSections = isProv && currentProj?.projBSSections ? currentProj.projBSSections : form.bsSections;
  const displayPLData = isProv && currentProj?.projPLData ? currentProj.projPLData : form.plData;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '96vw',
          maxWidth: '1360px',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* ─── Modal Header ─────────────────────────────────────────────────── */}
        <div
          style={{
            background: isProv
              ? 'linear-gradient(135deg, #065f46 0%, #047857 100%)'
              : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#fff',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                background: '#f59e0b',
                color: '#0f172a',
                fontWeight: 900,
                fontSize: 12,
                padding: '3px 8px',
                borderRadius: 4,
                letterSpacing: 1,
              }}
            >
              VIRTUAL CA GENERATOR
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: 0.3 }}>
                Standalone CA Balance Sheet & Profit & Loss
              </h2>
              <div style={{ fontSize: 11, opacity: 0.85 }}>
                {isProv
                  ? '🟢 Provisional / Projected Statements (Auto-calculated from Actuals)'
                  : '📘 Actual Statements (Auto-Deriving Annexure A & Annexure B)'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Mode Switcher */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.12)',
                borderRadius: 6,
                padding: 3,
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, mode: 'actual' }))}
                style={{
                  padding: '4px 14px',
                  borderRadius: 4,
                  border: 'none',
                  fontWeight: form.mode === 'actual' ? 'bold' : 'normal',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: form.mode === 'actual' ? '#3b82f6' : 'transparent',
                  color: '#fff',
                }}
              >
                Actual Statements
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, mode: 'provisional' }))}
                style={{
                  padding: '4px 14px',
                  borderRadius: 4,
                  border: 'none',
                  fontWeight: form.mode === 'provisional' ? 'bold' : 'normal',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: form.mode === 'provisional' ? '#10b981' : 'transparent',
                  color: '#fff',
                }}
              >
                Provisional / Projected
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#fff',
                fontSize: 16,
                width: 32,
                height: 32,
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ─── Scrollable Modal Body ────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#f8fafc' }}>
          
          {/* ── Company Details Bar ── */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 1.2fr 1fr 1fr 1fr', gap: 10, alignItems: 'center' }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', display: 'block' }}>Company Name</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: 11, fontWeight: 'bold' }}
                  value={form.company.name}
                  onChange={e => setForm(f => ({ ...f, company: { ...f.company, name: e.target.value } }))}
                  placeholder="AIMAN TRADERS"
                />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', display: 'block' }}>Company Address</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: 11 }}
                  value={form.company.address}
                  onChange={e => setForm(f => ({ ...f, company: { ...f.company, address: e.target.value } }))}
                  placeholder="Khatima Road, Sitarganj..."
                />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', display: 'block' }}>Place / State</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: 11 }}
                  value={form.company.place}
                  onChange={e => setForm(f => ({ ...f, company: { ...f.company, place: e.target.value } }))}
                  placeholder="UTTARAKHAND"
                />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', display: 'block' }}>From Date</label>
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
                <label style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', display: 'block' }}>To Date</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: 11 }}
                  value={form.company.toDate}
                  onChange={e => setForm(f => ({ ...f, company: { ...f.company, toDate: e.target.value } }))}
                  placeholder="31-Mar-2027"
                />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', display: 'block' }}>As On Date</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: 11, fontWeight: 'bold' }}
                  value={form.company.asOnDate}
                  onChange={e => setForm(f => ({ ...f, company: { ...f.company, asOnDate: e.target.value } }))}
                  placeholder="31.03.2027"
                />
              </div>
            </div>
          </div>

          {/* ── CA & Signatory Details Card (Collapsible) ── */}
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setShowSignatoryCard(s => !s)}
            >
              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>✍️</span> Chartered Accountant / Signatory Details (Exported to Sheet 1, 2, 3 & 4)
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>{showSignatoryCard ? '▲ Hide' : '▼ Show & Edit'}</span>
            </div>

            {showSignatoryCard && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 2fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: 2 }}>
                      CA Firm / Auditor Name:
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
                    <label style={{ fontSize: 10, fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: 2 }}>
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
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: 2 }}>
                      FRN (Firm Reg. No.):
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: '100%', fontSize: 11 }}
                      value={form.signatory.caFirmRegNo || ''}
                      onChange={e => setForm(f => ({ ...f, signatory: { ...f.signatory, caFirmRegNo: e.target.value } }))}
                      placeholder="e.g. 012345N"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: 2 }}>
                      UDIN:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: '100%', fontSize: 11 }}
                      value={form.signatory.caUdin || ''}
                      onChange={e => setForm(f => ({ ...f, signatory: { ...f.signatory, caUdin: e.target.value } }))}
                      placeholder="e.g. 26054321AAAAAA1234"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: 2 }}>
                      Firm Signatory Title:
                    </label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['PARTNER', 'PROPRIETOR', 'DIRECTOR', 'AUTH. SIGNATORY'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, signatory: { ...f.signatory, signatoryTitle: t } }))}
                          style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            border: form.signatory.signatoryTitle === t ? '1px solid #1c5282' : '1px solid #cbd5e1',
                            background: form.signatory.signatoryTitle === t ? '#1c5282' : '#f8fafc',
                            color: form.signatory.signatoryTitle === t ? '#fff' : '#334155',
                            fontSize: 10,
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                        >
                          {t === 'AUTH. SIGNATORY' ? 'AUTH. SIGN' : t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Provisional Controls (If in provisional mode) ── */}
          {isProv && (
            <div style={{ border: '1px solid #a7f3d0', background: '#ecfdf5', borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>🎯</span>
                  <span style={{ fontWeight: 'bold', fontSize: 12, color: '#065f46' }}>
                    PROVISIONAL / PROJECTED BENCHMARKS (Auto-Generating all Statements & Annexures):
                  </span>
                </div>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 'bold', color: '#065f46', display: 'block' }}>Sales Growth %</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ width: '100%', fontSize: 11, fontWeight: 'bold' }}
                    value={form.projectionConfig.salesGrowthPct}
                    onChange={e => setForm(f => ({ ...f, projectionConfig: { ...f.projectionConfig, salesGrowthPct: parseFloat(e.target.value) || 0 } }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 'bold', color: '#065f46', display: 'block' }}>Target GP Margin %</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ width: '100%', fontSize: 11, fontWeight: 'bold' }}
                    value={form.projectionConfig.gpMarginPct}
                    onChange={e => setForm(f => ({ ...f, projectionConfig: { ...f.projectionConfig, gpMarginPct: parseFloat(e.target.value) || 0 } }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 'bold', color: '#065f46', display: 'block' }}>Stock Growth %</label>
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
                  <label style={{ fontSize: 10, fontWeight: 'bold', color: '#065f46', display: 'block' }}>Admin Inflation %</label>
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
                  <label style={{ fontSize: 10, fontWeight: 'bold', color: '#065f46', display: 'block' }}>CC Limit Growth %</label>
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

          {/* ── Sub-navigation Tabs ── */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, borderBottom: '2px solid #e2e8f0', paddingBottom: 6 }}>
            {[
              { id: 'bs', label: '📊 Balance Sheet Sections' },
              { id: 'pl', label: '📈 Profit & Loss (Trading & P&L)' },
              { id: 'annexA', label: `👥 Annexure "A" (Partners Capital: ${activeData.calculatedPartners?.length || 0})` },
              { id: 'annexB', label: `🏗️ Annexure "B" (Fixed Assets: ${activeData.calculatedFASchedule?.length || 0})` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSectionTab(tab.id as any)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: 'none',
                  fontWeight: activeSectionTab === tab.id ? 'bold' : '500',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: activeSectionTab === tab.id
                    ? (isProv ? '#065f46' : '#1e293b')
                    : '#e2e8f0',
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
              {isProv && (
                <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 6, padding: '6px 12px', fontSize: 11, color: '#065f46', marginBottom: 10 }}>
                  ⚡ <b>Provisional Mode Active:</b> Below are the projected Balance Sheet sections automatically computed from your Actual statements based on your growth settings.
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Left: LIABILITIES */}
                <div>
                  <div style={{ background: '#1c5282', color: '#fff', padding: '6px 10px', borderRadius: 4, fontWeight: 'bold', fontSize: 12, marginBottom: 8 }}>
                    LIABILITIES SIDE
                  </div>

                  {/* CAPITAL ACCOUNT */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, marginBottom: 10, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 11, color: '#1e293b' }}>
                        CAPITAL ACCOUNT {isProv ? '(Projected)' : '(Auto-Syncs with Annexure "A")'}
                      </span>
                      {!isProv && (
                        <button type="button" onClick={() => addItem('capitalItems')} style={{ fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>+ Add</button>
                      )}
                    </div>
                    {(displayBSSections.capitalItems || []).map(it => (
                      <div key={it.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          disabled={isProv}
                          className="form-input"
                          style={{ flex: 2, fontSize: 11, fontWeight: 'bold' }}
                          value={it.name}
                          onChange={e => updateItem('capitalItems', it.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          disabled={isProv}
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right', fontWeight: 'bold', color: '#059669' }}
                          value={it.amount}
                          onChange={e => updateItem('capitalItems', it.id, 'amount', e.target.value)}
                        />
                        {!isProv && (
                          <button type="button" onClick={() => deleteItem('capitalItems', it.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
                        )}
                      </div>
                    ))}
                    <div style={{ textAlign: 'right', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      Total Capital: <b>₹{fmt(activeData.capitalTotal)}</b>
                    </div>
                  </div>

                  {/* SECURED LOAN */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, marginBottom: 10, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 11, color: '#1e293b' }}>SECURED LOAN :</span>
                      {!isProv && (
                        <button type="button" onClick={() => addItem('securedLoans')} style={{ fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>+ Add</button>
                      )}
                    </div>
                    {(displayBSSections.securedLoans || []).map(it => (
                      <div key={it.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          disabled={isProv}
                          className="form-input"
                          style={{ flex: 2, fontSize: 11 }}
                          value={it.name}
                          onChange={e => updateItem('securedLoans', it.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          disabled={isProv}
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right' }}
                          value={it.amount}
                          onChange={e => updateItem('securedLoans', it.id, 'amount', e.target.value)}
                        />
                        {!isProv && (
                          <button type="button" onClick={() => deleteItem('securedLoans', it.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* UNSECURED LOAN */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, marginBottom: 10, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 11, color: '#1e293b' }}>UNSECURED LOAN :</span>
                      {!isProv && (
                        <button type="button" onClick={() => addItem('unsecuredLoans')} style={{ fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>+ Add</button>
                      )}
                    </div>
                    {(displayBSSections.unsecuredLoans || []).map(it => (
                      <div key={it.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          disabled={isProv}
                          className="form-input"
                          style={{ flex: 2, fontSize: 11 }}
                          value={it.name}
                          onChange={e => updateItem('unsecuredLoans', it.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          disabled={isProv}
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right' }}
                          value={it.amount}
                          onChange={e => updateItem('unsecuredLoans', it.id, 'amount', e.target.value)}
                        />
                        {!isProv && (
                          <button type="button" onClick={() => deleteItem('unsecuredLoans', it.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* CURRENT LIABILITIES */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, marginBottom: 10, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 11, color: '#1e293b' }}>CURRENT LIABILITIES</span>
                      {!isProv && (
                        <button type="button" onClick={() => addItem('currentLiabilities')} style={{ fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>+ Add</button>
                      )}
                    </div>
                    {(displayBSSections.currentLiabilities || []).map(it => (
                      <div key={it.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          disabled={isProv}
                          className="form-input"
                          style={{ flex: 2, fontSize: 11 }}
                          value={it.name}
                          onChange={e => updateItem('currentLiabilities', it.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          disabled={isProv}
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right' }}
                          value={it.amount}
                          onChange={e => updateItem('currentLiabilities', it.id, 'amount', e.target.value)}
                        />
                        {!isProv && (
                          <button type="button" onClick={() => deleteItem('currentLiabilities', it.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
                        )}
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
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, marginBottom: 10, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 11, color: '#1e293b' }}>
                        FIXED ASSETS {isProv ? '(Projected Closing WDV)' : '(Auto-Syncs with Annexure "B")'}
                      </span>
                      {!isProv && (
                        <button type="button" onClick={() => addItem('fixedAssets')} style={{ fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>+ Add</button>
                      )}
                    </div>
                    {(displayBSSections.fixedAssets || []).map(it => (
                      <div key={it.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          disabled={isProv}
                          className="form-input"
                          style={{ flex: 2, fontSize: 11 }}
                          value={it.name}
                          onChange={e => updateItem('fixedAssets', it.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          disabled={isProv}
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right' }}
                          value={it.amount}
                          onChange={e => updateItem('fixedAssets', it.id, 'amount', e.target.value)}
                        />
                        {!isProv && (
                          <button type="button" onClick={() => deleteItem('fixedAssets', it.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
                        )}
                      </div>
                    ))}
                    <div style={{ textAlign: 'right', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      Total Closing Fixed Assets: <b>₹{fmt(activeData.fixedAssetTotal)}</b>
                    </div>
                  </div>

                  {/* SECURITY DEPOSITS */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, marginBottom: 10, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 11, color: '#1e293b' }}>SECURITY DEPOSITS</span>
                      {!isProv && (
                        <button type="button" onClick={() => addItem('securityDeposits')} style={{ fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>+ Add</button>
                      )}
                    </div>
                    {(displayBSSections.securityDeposits || []).map(it => (
                      <div key={it.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          disabled={isProv}
                          className="form-input"
                          style={{ flex: 2, fontSize: 11 }}
                          value={it.name}
                          onChange={e => updateItem('securityDeposits', it.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          disabled={isProv}
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right' }}
                          value={it.amount}
                          onChange={e => updateItem('securityDeposits', it.id, 'amount', e.target.value)}
                        />
                        {!isProv && (
                          <button type="button" onClick={() => deleteItem('securityDeposits', it.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* CURRENT ASSETS */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, marginBottom: 10, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 11, color: '#1e293b' }}>CURRENT ASSETS</span>
                      {!isProv && (
                        <button type="button" onClick={() => addItem('currentAssets')} style={{ fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>+ Add</button>
                      )}
                    </div>
                    {(displayBSSections.currentAssets || []).map(it => {
                      const isCash = it.name.toLowerCase().includes('cash');
                      const isStock = it.name.toLowerCase().includes('stock');
                      return (
                        <div key={it.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                          <input
                            type="text"
                            disabled={isProv}
                            className="form-input"
                            style={{ flex: 2, fontSize: 11 }}
                            value={it.name}
                            onChange={e => updateItem('currentAssets', it.id, 'name', e.target.value)}
                          />
                          <input
                            type="number"
                            step="0.01"
                            disabled={isCash || isStock || isProv}
                            className="form-input"
                            style={{
                              flex: 1,
                              fontSize: 11,
                              textAlign: 'right',
                              background: (isCash || isStock) ? '#f1f5f9' : '#fff',
                              color: isCash ? '#059669' : '#1e293b',
                              fontWeight: isCash ? 'bold' : 'normal',
                            }}
                            value={isCash ? activeData.balancingCash : it.amount}
                            onChange={e => updateItem('currentAssets', it.id, 'amount', e.target.value)}
                          />
                          {!isProv && !isCash && !isStock && (
                            <button type="button" onClick={() => deleteItem('currentAssets', it.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
                          )}
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 10, color: '#059669', fontStyle: 'italic', marginTop: 4 }}>
                      ✓ Cash-in-hand is automatically balanced to match Total Liabilities exactly.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 2: PROFIT & LOSS (TRADING & P&L)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeSectionTab === 'pl' && (
            <div>
              {isProv && (
                <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 6, padding: '6px 12px', fontSize: 11, color: '#065f46', marginBottom: 10 }}>
                  ⚡ <b>Provisional Mode Active:</b> Projected Trading & Profit & Loss statements calculated automatically based on Sales Growth ({form.projectionConfig.salesGrowthPct}%) and Target GP ({form.projectionConfig.gpMarginPct}%).
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Trading Account */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 10, background: '#fff' }}>
                  <div style={{ fontWeight: 'bold', fontSize: 12, color: '#1c5282', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
                    TRADING ACCOUNT (Gross Profit / Loss)
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', display: 'block' }}>Opening Stock</label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={isProv}
                        className="form-input"
                        style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                        value={displayPLData.trading.openingStock}
                        onChange={e => setForm(f => ({ ...f, plData: { ...f.plData, trading: { ...f.plData.trading, openingStock: parseFloat(e.target.value) || 0 } } }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', display: 'block' }}>Purchases</label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={isProv}
                        className="form-input"
                        style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                        value={displayPLData.trading.purchases}
                        onChange={e => setForm(f => ({ ...f, plData: { ...f.plData, trading: { ...f.plData.trading, purchases: parseFloat(e.target.value) || 0 } } }))}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', display: 'block' }}>Sales</label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={isProv}
                        className="form-input"
                        style={{ width: '100%', fontSize: 11, textAlign: 'right', fontWeight: 'bold', color: '#0369a1' }}
                        value={displayPLData.trading.sales}
                        onChange={e => setForm(f => ({ ...f, plData: { ...f.plData, trading: { ...f.plData.trading, sales: parseFloat(e.target.value) || 0 } } }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', display: 'block' }}>Closing Stock</label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={isProv}
                        className="form-input"
                        style={{ width: '100%', fontSize: 11, textAlign: 'right', fontWeight: 'bold', color: '#059669' }}
                        value={displayPLData.trading.closingStock}
                        onChange={e => setForm(f => ({ ...f, plData: { ...f.plData, trading: { ...f.plData.trading, closingStock: parseFloat(e.target.value) || 0 } } }))}
                      />
                    </div>
                  </div>

                  {/* Direct Expenses */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 'bold' }}>Direct Expenses:</span>
                      {!isProv && (
                        <button type="button" onClick={() => addPLExp('directExpenses')} style={{ fontSize: 10, padding: '2px 6px' }}>+ Add</button>
                      )}
                    </div>
                    {(displayPLData.trading.directExpenses || []).map(de => (
                      <div key={de.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          disabled={isProv}
                          className="form-input"
                          style={{ flex: 2, fontSize: 11 }}
                          value={de.name}
                          onChange={e => updatePLExp('directExpenses', de.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          disabled={isProv}
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right' }}
                          value={de.amount}
                          onChange={e => updatePLExp('directExpenses', de.id, 'amount', e.target.value)}
                        />
                        {!isProv && (
                          <button type="button" onClick={() => deletePLExp('directExpenses', de.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent' }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 14, background: '#f1f5f9', padding: '6px 8px', borderRadius: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 'bold' }}>
                    <span>Gross Profit / (Loss):</span>
                    <span style={{ color: activeData.grossProfit >= 0 ? '#059669' : '#dc2626' }}>₹{fmt(activeData.grossProfit)}</span>
                  </div>
                </div>

                {/* Indirect Expenses & Incomes */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 10, background: '#fff' }}>
                  <div style={{ fontWeight: 'bold', fontSize: 12, color: '#1c5282', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
                    INDIRECT EXPENSES & INCOMES
                  </div>

                  {/* Indirect Incomes */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 'bold' }}>Indirect Incomes:</span>
                      {!isProv && (
                        <button type="button" onClick={() => addPLExp('indirectIncomes')} style={{ fontSize: 10, padding: '2px 6px' }}>+ Add</button>
                      )}
                    </div>
                    {(displayPLData.indirectIncomes || []).map(ii => (
                      <div key={ii.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          disabled={isProv}
                          className="form-input"
                          style={{ flex: 2, fontSize: 11 }}
                          value={ii.name}
                          onChange={e => updatePLExp('indirectIncomes', ii.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          disabled={isProv}
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right' }}
                          value={ii.amount}
                          onChange={e => updatePLExp('indirectIncomes', ii.id, 'amount', e.target.value)}
                        />
                        {!isProv && (
                          <button type="button" onClick={() => deletePLExp('indirectIncomes', ii.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent' }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Indirect Expenses */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 'bold' }}>Indirect Expenses:</span>
                      {!isProv && (
                        <button type="button" onClick={() => addPLExp('indirectExpenses')} style={{ fontSize: 10, padding: '2px 6px' }}>+ Add</button>
                      )}
                    </div>
                    {(displayPLData.indirectExpenses || []).map(ie => (
                      <div key={ie.id} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <input
                          type="text"
                          disabled={isProv}
                          className="form-input"
                          style={{ flex: 2, fontSize: 11 }}
                          value={ie.name}
                          onChange={e => updatePLExp('indirectExpenses', ie.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          disabled={isProv}
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right' }}
                          value={ie.amount}
                          onChange={e => updatePLExp('indirectExpenses', ie.id, 'amount', e.target.value)}
                        />
                        {!isProv && (
                          <button type="button" onClick={() => deletePLExp('indirectExpenses', ie.id)} style={{ color: '#ef4444', border: 'none', background: 'transparent' }}>✕</button>
                        )}
                      </div>
                    ))}
                    {activeData.totalDepreciation > 0 && !displayPLData.indirectExpenses?.some((e: any) => e.name.toLowerCase().includes('depr')) && (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 4, opacity: 0.9 }}>
                        <input
                          type="text"
                          disabled
                          className="form-input"
                          style={{ flex: 2, fontSize: 11, fontStyle: 'italic', background: '#f8fafc' }}
                          value="To Depreciation (from Annexure B)"
                        />
                        <input
                          type="number"
                          disabled
                          className="form-input"
                          style={{ flex: 1, fontSize: 11, textAlign: 'right', background: '#f8fafc', fontWeight: 'bold' }}
                          value={activeData.totalDepreciation}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 14, background: '#e0f2fe', padding: '6px 8px', borderRadius: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 'bold' }}>
                    <span>Net Profit / (Loss) Transferred to Capital:</span>
                    <span style={{ color: activeData.netProfit >= 0 ? '#0369a1' : '#dc2626' }}>₹{fmt(activeData.netProfit)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 3: ANNEXURE "A" (PARTNERS CAPITAL ACCOUNT) - AUTO-CALCULATED
             ═══════════════════════════════════════════════════════════════════ */}
          {activeSectionTab === 'annexA' && (
            <div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#166534', marginBottom: 12 }}>
                ⚡ <b>100% Auto-Derived from Balance Sheet Capital & Net Profit (₹{fmt(activeData.netProfit)}):</b>{' '}
                Partners, Opening Balances, Profit distribution and Closing Balances are calculated automatically. You do NOT need to type anything here unless you want to customize Salary, Interest Rate or Withdrawals.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#334155' }}>
                  Total Profit Distribution Share: <b>{totalPartnerShare}%</b>{' '}
                  {totalPartnerShare === 100 ? (
                    <span style={{ color: '#059669', fontWeight: 'bold' }}>✓ (100% OK)</span>
                  ) : (
                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>(Check: Total should equal 100%)</span>
                  )}
                  {' • '}Net Profit: <b>₹{fmt(activeData.netProfit)}</b>
                </div>
              </div>

              <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: 6, textAlign: 'left', width: 35 }}>S.N.</th>
                      <th style={{ padding: 6, textAlign: 'left' }}>Partner Name</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 75 }}>Share %</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 105 }}>Opening Bal</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 85 }}>Addition</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 85 }}>Salary</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 65 }}>Int %</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 85 }}>Int. Amt</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 105 }}>Profit Share (Auto)</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 105 }}>Total</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 95 }}>Withdrawals</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 115 }}>Closing Bal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeData.calculatedPartners || []).map((p, idx) => (
                      <tr key={p.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 4px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="text"
                            disabled={isProv}
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, fontWeight: 'bold' }}
                            value={p.name}
                            onChange={e => updatePartnerCustom(p.id, p.name, 'name', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isProv}
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            value={p.sharePct}
                            onChange={e => updatePartnerCustom(p.id, p.name, 'sharePct', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4, textAlign: 'right', fontWeight: '500' }}>
                          ₹{fmt(p.openingBal)}
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isProv}
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            value={p.addition}
                            onChange={e => updatePartnerCustom(p.id, p.name, 'addition', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isProv}
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            value={p.salary}
                            onChange={e => updatePartnerCustom(p.id, p.name, 'salary', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="0.1"
                            disabled={isProv}
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            value={p.interestRate}
                            onChange={e => updatePartnerCustom(p.id, p.name, 'interestRate', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4, textAlign: 'right' }}>
                          ₹{fmt(p.interestAmt)}
                        </td>
                        <td style={{ padding: 4, textAlign: 'right', fontWeight: 'bold', color: '#0369a1' }}>
                          ₹{fmt(p.profitShare)}
                        </td>
                        <td style={{ padding: 4, textAlign: 'right', fontWeight: '500' }}>
                          ₹{fmt(p.total)}
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isProv}
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            value={p.withdrawalsAmt}
                            onChange={e => updatePartnerCustom(p.id, p.name, 'withdrawalsAmt', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4, textAlign: 'right', fontWeight: 'bold', color: '#059669', fontSize: 12 }}>
                          ₹{fmt(p.closingBal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                      <td colSpan={2} style={{ padding: 6 }}>TOTAL CLOSING CAPITAL</td>
                      <td style={{ padding: 6, textAlign: 'right' }}>{totalPartnerShare}%</td>
                      <td colSpan={8}></td>
                      <td style={{ padding: 6, textAlign: 'right', color: '#059669', fontSize: 13 }}>
                        ₹{fmt(activeData.totalClosingCapital)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 4: ANNEXURE "B" (FIXED ASSETS SCHEDULE) - AUTO-CALCULATED
             ═══════════════════════════════════════════════════════════════════ */}
          {activeSectionTab === 'annexB' && (
            <div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#166534', marginBottom: 12 }}>
                ⚡ <b>100% Auto-Derived from Balance Sheet Fixed Assets:</b>{' '}
                Assets, Depreciation Rates, Depreciation amounts and Closing WDV are calculated automatically as per the Income Tax Act. You do NOT need to type anything here unless you want to customize Additions or Rates.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#334155' }}>
                  Total Fixed Assets Closing WDV: <b style={{ color: '#059669' }}>₹{fmt(activeData.totalClosingFA)}</b>
                  {' • '}Total Depreciation: <b>₹{fmt(activeData.totalDepreciation)}</b>
                </span>
              </div>

              <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: 6, textAlign: 'left', width: 35 }}>S.N.</th>
                      <th style={{ padding: 6, textAlign: 'left' }}>Description of Assets</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 120 }}>Opening WDV</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 110 }}>Addition &lt; 180</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 110 }}>Addition &gt; 180</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 85 }}>Dep. Rate %</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 110 }}>Depreciation</th>
                      <th style={{ padding: 6, textAlign: 'right', width: 125 }}>Closing WDV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeData.calculatedFASchedule || []).map((fa, idx) => (
                      <tr key={fa.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 4px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="text"
                            disabled={isProv}
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, fontWeight: 'bold' }}
                            value={fa.name}
                            onChange={e => updateFACustom(fa.id, fa.name, 'name', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4, textAlign: 'right', fontWeight: '500' }}>
                          ₹{fmt(fa.openingBal)}
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isProv}
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            value={fa.additionBefore}
                            onChange={e => updateFACustom(fa.id, fa.name, 'additionBefore', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isProv}
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            value={fa.additionAfter}
                            onChange={e => updateFACustom(fa.id, fa.name, 'additionAfter', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            type="number"
                            step="1"
                            disabled={isProv}
                            className="form-input"
                            style={{ width: '100%', fontSize: 11, textAlign: 'right' }}
                            value={fa.depreciationRate}
                            onChange={e => updateFACustom(fa.id, fa.name, 'depreciationRate', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4, textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>
                          ₹{fmt(fa.depreciation)}
                        </td>
                        <td style={{ padding: 4, textAlign: 'right', fontWeight: 'bold', color: '#059669', fontSize: 12 }}>
                          ₹{fmt(fa.closingBal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                      <td colSpan={2} style={{ padding: 6 }}>TOTAL CLOSING FIXED ASSETS</td>
                      <td colSpan={4}></td>
                      <td style={{ padding: 6, textAlign: 'right', color: '#dc2626' }}>
                        ₹{fmt(activeData.totalDepreciation)}
                      </td>
                      <td style={{ padding: 6, textAlign: 'right', color: '#059669', fontSize: 13 }}>
                        ₹{fmt(activeData.totalClosingFA)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* ─── Sticky Bottom Reconciliation & Action Bar ───────────────────── */}
        <div
          style={{
            background: '#ffffff',
            borderTop: '2px solid #e2e8f0',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.03)',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12 }}>
              Net Profit: <b style={{ color: activeData.netProfit >= 0 ? '#059669' : '#dc2626' }}>₹{fmt(activeData.netProfit)}</b>
            </div>
            <div style={{ height: 16, width: 1, background: '#cbd5e1' }} />
            <div style={{ fontSize: 12 }}>
              Total Liabilities: <b style={{ color: '#1e293b' }}>₹{fmt(activeData.totalLiabilities)}</b>
            </div>
            <div style={{ height: 16, width: 1, background: '#cbd5e1' }} />
            <div style={{ fontSize: 12 }}>
              Total Assets: <b style={{ color: '#1e293b' }}>₹{fmt(activeData.totalAssets)}</b>
            </div>
            <div style={{ height: 16, width: 1, background: '#cbd5e1' }} />
            <div
              style={{
                background: activeData.isBalanced ? '#ecfdf5' : '#fef2f2',
                color: activeData.isBalanced ? '#059669' : '#dc2626',
                border: activeData.isBalanced ? '1px solid #a7f3d0' : '1px solid #fecaca',
                padding: '3px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {activeData.isBalanced ? '✓ 100% BALANCED (Diff: ₹0.00)' : `⚠️ Diff: ₹${fmt(activeData.diff)}`}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isExporting}
              style={{ padding: '8px 16px', borderRadius: 6, fontSize: 12 }}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExport}
              disabled={isExporting}
              style={{
                background: isProv
                  ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                  : 'linear-gradient(135deg, #1c5282 0%, #2563eb 100%)',
                color: '#fff',
                fontWeight: 'bold',
                padding: '8px 20px',
                borderRadius: 6,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: isProv
                  ? '0 4px 12px rgba(16, 185, 129, 0.35)'
                  : '0 4px 12px rgba(37, 99, 235, 0.35)',
              }}
            >
              {isExporting ? (
                '⏳ Generating CA Excel...'
              ) : isProv ? (
                '📊 Download PROV. CA Excel (4 Sheets)'
              ) : (
                '📊 Download CA Excel (4 Sheets)'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
