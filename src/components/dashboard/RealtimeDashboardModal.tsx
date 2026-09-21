"use client";
import React, { useState, useEffect, useMemo } from 'react';

export interface DashboardProps {
  activeCompany: any;
  vouchers: any[];
  ledgers: any[];
  stockItems?: any[];
  currentPeriod?: { start: string; end: string };
  onClose: () => void;
}

export default function RealtimeDashboardModal({
  activeCompany,
  vouchers,
  ledgers,
  stockItems = [],
  currentPeriod,
  onClose
}: DashboardProps) {
  const [hoveredSalesPoint, setHoveredSalesPoint] = useState<{ name: string; label: string; val: number; x: number; y: number } | null>(null);
  const [hoveredPurchasePoint, setHoveredPurchasePoint] = useState<{ name: string; label: string; val: number; x: number; y: number } | null>(null);
  const [activeLedgerGroup, setActiveLedgerGroup] = useState<'Bank Accounts' | 'Sundry Debtors' | 'Sundry Creditors'>('Bank Accounts');
  const [chartViewMode, setChartViewMode] = useState<'individual' | 'combined'>('individual');

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Indian currency formatter
  const fmt = (n: number) => {
    const num = Math.abs(Number(n) || 0);
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Compact Indian Currency Formatter (e.g. ₹ 4.52 L or ₹ 1.20 Cr)
  const fmtCompact = (n: number) => {
    const num = Math.abs(Number(n) || 0);
    if (num >= 10000000) {
      return `₹ ${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
      return `₹ ${(num / 100000).toFixed(2)} L`;
    }
    if (num >= 1000) {
      return `₹ ${(num / 1000).toFixed(1)} K`;
    }
    return `₹ ${num.toFixed(2)}`;
  };

  // Helper to compute individual ledger balance
  const getLedgerBalance = (ledger: any) => {
    let dr = ledger.balanceType === 'Dr' ? (Number(ledger.openingBalance ?? ledger.openingBal) || 0) : 0;
    let cr = ledger.balanceType === 'Cr' ? (Number(ledger.openingBalance ?? ledger.openingBal) || 0) : 0;

    for (const v of vouchers) {
      for (const e of (v.entries || [])) {
        if (Number(e.ledgerId) === Number(ledger.id)) {
          if (e.entryType === 'Dr') dr += Number(e.amount) || 0;
          else cr += Number(e.amount) || 0;
        }
      }
    }
    const net = dr - cr;
    return {
      amount: Math.abs(net),
      type: net >= 0 ? 'Dr' : 'Cr',
      net
    };
  };

  // ─── Financial Calculations ───
  const calculations = useMemo(() => {
    // 1. Group balances
    const cashLedgers = ledgers.filter(l => (l.groupName || '').toLowerCase().includes('cash-in-hand'));
    const bankLedgers = ledgers.filter(l => {
      const gn = (l.groupName || '').toLowerCase();
      return gn.includes('bank accounts') || gn.includes('bank od') || gn.includes('bank occ');
    });
    const debtorLedgers = ledgers.filter(l => (l.groupName || '').toLowerCase().includes('sundry debtors'));
    const creditorLedgers = ledgers.filter(l => (l.groupName || '').toLowerCase().includes('sundry creditors'));

    // Cash-in-Hand total
    let cashNet = 0;
    cashLedgers.forEach(l => {
      const b = getLedgerBalance(l);
      cashNet += b.type === 'Dr' ? b.amount : -b.amount;
    });
    const cashInHand = { amount: Math.abs(cashNet), type: cashNet >= 0 ? 'Dr' : 'Cr' };

    // Bank Accounts total
    let bankNet = 0;
    bankLedgers.forEach(l => {
      const b = getLedgerBalance(l);
      bankNet += b.type === 'Dr' ? b.amount : -b.amount;
    });
    const bankAccounts = { amount: Math.abs(bankNet), type: bankNet >= 0 ? 'Dr' : 'Cr' };

    // Total Liquid Cash & Bank
    const totalLiquidCash = (cashNet >= 0 ? cashNet : 0) + (bankNet >= 0 ? bankNet : 0);

    // Receivables (Sundry Debtors)
    let receivablesNet = 0;
    debtorLedgers.forEach(l => {
      const b = getLedgerBalance(l);
      receivablesNet += b.type === 'Dr' ? b.amount : -b.amount;
    });
    const receivables = Math.max(0, receivablesNet);

    // Payables (Sundry Creditors)
    let payablesNet = 0;
    creditorLedgers.forEach(l => {
      const b = getLedgerBalance(l);
      payablesNet += b.type === 'Cr' ? b.amount : -b.amount;
    });
    const payables = Math.max(0, payablesNet);

    // 2. Sales & Purchase Totals
    let salesTotal = 0;
    let salesQty = 0;
    let purchaseTotal = 0;
    let purchaseQty = 0;

    vouchers.forEach(v => {
      if (v.type === 'Sales') {
        salesTotal += Number(v.total) || 0;
        (v.inventoryEntries || []).forEach((ie: any) => { salesQty += Number(ie.qty) || 0; });
      } else if (v.type === 'Purchase') {
        purchaseTotal += Number(v.total) || 0;
        (v.inventoryEntries || []).forEach((ie: any) => { purchaseQty += Number(ie.qty) || 0; });
      }
    });

    // 3. Stock Valuations
    let openingStockVal = 0;
    let closingStockVal = 0;
    let closingStockQty = 0;

    if (stockItems && stockItems.length > 0) {
      openingStockVal = stockItems.reduce((acc, it) => acc + ((Number(it.openingQty) || 0) * (Number(it.openingRate) || 0)), 0);
      for (const it of stockItems) {
        let qty = Number(it.openingQty) || 0;
        let totalCost = (Number(it.openingQty) || 0) * (Number(it.openingRate) || 0);
        let totalInQty = Number(it.openingQty) || 0;
        for (const v of vouchers) {
          for (const ie of (v.inventoryEntries || [])) {
            if (Number(ie.stockItemId || ie.itemId) === Number(it.id)) {
              if (v.type === 'Purchase' || v.type === 'Credit Note') {
                qty += Number(ie.qty) || 0;
                totalCost += (Number(ie.qty) || 0) * (Number(ie.rate) || 0);
                totalInQty += Number(ie.qty) || 0;
              } else if (v.type === 'Sales' || v.type === 'Debit Note') {
                qty -= Number(ie.qty) || 0;
              }
            }
          }
        }
        closingStockQty += Math.max(0, qty);
        closingStockVal += Math.max(0, qty) * (totalInQty > 0 ? totalCost / totalInQty : (Number(it.openingRate) || 0));
      }
    } else {
      const stockLedgers = ledgers.filter(l => (l.groupName || '').toLowerCase().includes('stock-in-hand'));
      stockLedgers.forEach(l => {
        const ob = Number(l.openingBalance ?? l.openingBal) || 0;
        openingStockVal += l.balanceType === 'Dr' ? ob : -ob;
        const b = getLedgerBalance(l);
        closingStockVal += b.type === 'Dr' ? b.amount : -b.amount;
      });
    }

    // 4. Expenses & Incomes
    let directExp = 0;
    let indirectExp = 0;
    let indirectInc = 0;

    ledgers.forEach(l => {
      const gn = (l.groupName || '').toLowerCase();
      const b = getLedgerBalance(l);
      if (gn.includes('direct exp') || gn.includes('expenses (direct)')) {
        directExp += b.type === 'Dr' ? b.amount : -b.amount;
      } else if (gn.includes('indirect exp') || gn.includes('expenses (indirect)')) {
        indirectExp += b.type === 'Dr' ? b.amount : -b.amount;
      } else if (gn.includes('indirect inc') || gn.includes('income (indirect)')) {
        indirectInc += b.type === 'Cr' ? b.amount : -b.amount;
      }
    });

    // 5. Profit calculations
    const grossProfit = salesTotal + closingStockVal - (openingStockVal + purchaseTotal + directExp);
    const netProfit = grossProfit + indirectInc - indirectExp;
    const grossProfitMargin = salesTotal > 0 ? ((grossProfit / salesTotal) * 100).toFixed(1) : '0.0';
    const netProfitMargin = salesTotal > 0 ? ((netProfit / salesTotal) * 100).toFixed(1) : '0.0';

    // 6. Assets & Liabilities
    const currAssetGroups = ['stock-in-hand', 'sundry debtors', 'cash-in-hand', 'bank accounts', 'loans & advances (asset)', 'current assets'];
    const currLiabGroups = ['sundry creditors', 'current liabilities', 'provisions', 'duties & taxes'];

    let currentAssetsNet = 0;
    let currentLiabNet = 0;
    let capitalNet = 0;
    let loansNet = 0;

    ledgers.forEach(l => {
      const gn = (l.groupName || '').toLowerCase();
      const b = getLedgerBalance(l);
      if (currAssetGroups.some(g => gn.includes(g))) {
        currentAssetsNet += b.type === 'Dr' ? b.amount : -b.amount;
      }
      if (currLiabGroups.some(g => gn.includes(g))) {
        currentLiabNet += b.type === 'Cr' ? b.amount : -b.amount;
      }
      if (gn.includes('capital') || gn.includes('reserves')) {
        capitalNet += b.type === 'Cr' ? b.amount : -b.amount;
      }
      if (gn.includes('secured') || gn.includes('unsecured') || gn.includes('loans (liability)')) {
        loansNet += b.type === 'Cr' ? b.amount : -b.amount;
      }
    });

    // Add closing stock to current assets if not already included
    if (!ledgers.some(l => (l.groupName || '').toLowerCase().includes('stock-in-hand'))) {
      currentAssetsNet += closingStockVal;
    }

    const workingCapital = currentAssetsNet - currentLiabNet;
    const currentRatio = currentLiabNet > 0 ? (currentAssetsNet / currentLiabNet).toFixed(2) : (currentAssetsNet > 0 ? '∞' : '1.00');

    // 7. Cash Flow (Inflow & Outflow)
    let inflow = 0;
    let outflow = 0;

    vouchers.forEach(v => {
      if (v.type === 'Receipt') {
        inflow += Number(v.total) || 0;
      } else if (v.type === 'Payment') {
        outflow += Number(v.total) || 0;
      } else {
        // Check Dr/Cr on cash/bank
        (v.entries || []).forEach((e: any) => {
          const l = ledgers.find(led => led.id === e.ledgerId);
          const gn = (l?.groupName || '').toLowerCase();
          if (gn.includes('cash') || gn.includes('bank')) {
            if (e.entryType === 'Dr') inflow += Number(e.amount) || 0;
            else outflow += Number(e.amount) || 0;
          }
        });
      }
    });
    const nettFlow = inflow - outflow;
    const totalCashTurnover = inflow + outflow;
    const inflowPercent = totalCashTurnover > 0 ? Math.round((inflow / totalCashTurnover) * 100) : 50;
    const outflowPercent = totalCashTurnover > 0 ? (100 - inflowPercent) : 50;

    // 8. Accounting Ratios
    const inventoryTurnover = closingStockVal > 0 ? (salesTotal / closingStockVal).toFixed(2) : '0.00';
    const debtEquityRatio = capitalNet > 0 ? (loansNet / capitalNet).toFixed(2) + ' : 1' : '0.00 : 1';
    const receivableTurnoverDays = salesTotal > 0 ? ((receivables / salesTotal) * 365).toFixed(0) + ' days' : '0 days';
    const returnOnInvestment = capitalNet > 0 ? ((netProfit / capitalNet) * 100).toFixed(1) + ' %' : 'N/A';

    return {
      cashInHand,
      bankAccounts,
      totalLiquidCash,
      receivables,
      payables,
      salesTotal,
      salesQty,
      purchaseTotal,
      purchaseQty,
      openingStockVal,
      closingStockVal,
      closingStockQty,
      directExp,
      indirectExp,
      indirectInc,
      grossProfit,
      netProfit,
      grossProfitMargin,
      netProfitMargin,
      currentAssets: { amount: Math.abs(currentAssetsNet), type: currentAssetsNet >= 0 ? 'Dr' : 'Cr' },
      currentLiabilities: { amount: Math.abs(currentLiabNet), type: currentLiabNet >= 0 ? 'Dr' : 'Cr' },
      workingCapital,
      currentRatio,
      inflow,
      outflow,
      inflowPercent,
      outflowPercent,
      nettFlow: { amount: Math.abs(nettFlow), type: nettFlow >= 0 ? 'Dr' : 'Cr', val: nettFlow },
      inventoryTurnover,
      debtEquityRatio,
      receivableTurnoverDays,
      returnOnInvestment,
      bankLedgers,
      debtorLedgers,
      creditorLedgers
    };
  }, [vouchers, ledgers, stockItems]);

  // ─── 12-Month Trend Data for Line Charts (Apr to Mar) ───
  const trendMonths = useMemo(() => {
    return [
      { name: 'Apr', label: 'Apr-26', mIdx: 3 },
      { name: 'May', label: 'May-26', mIdx: 4 },
      { name: 'Jun', label: 'Jun-26', mIdx: 5 },
      { name: 'Jul', label: 'Jul-26', mIdx: 6 },
      { name: 'Aug', label: 'Aug-26', mIdx: 7 },
      { name: 'Sep', label: 'Sep-26', mIdx: 8 },
      { name: 'Oct', label: 'Oct-26', mIdx: 9 },
      { name: 'Nov', label: 'Nov-26', mIdx: 10 },
      { name: 'Dec', label: 'Dec-26', mIdx: 11 },
      { name: 'Jan', label: 'Jan-27', mIdx: 0 },
      { name: 'Feb', label: 'Feb-27', mIdx: 1 },
      { name: 'Mar', label: 'Mar-27', mIdx: 2 }
    ];
  }, []);

  const { salesTrendData, purchaseTrendData, maxSalesLakhs, maxPurchaseLakhs } = useMemo(() => {
    const parseVchMonth = (dateStr: string) => {
      if (!dateStr) return -1;
      const s = String(dateStr).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        return parseInt(s.slice(5, 7), 10) - 1; // 0-11
      }
      const parts = s.split(/[-/]/);
      if (parts.length === 3) {
        const m = parts[1].toLowerCase();
        const mList = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const idx = mList.findIndex(ml => m.startsWith(ml));
        if (idx !== -1) return idx;
        const num = parseInt(parts[1], 10);
        if (!isNaN(num)) return num - 1;
      }
      return -1;
    };

    const sData = trendMonths.map(tm => ({ ...tm, val: 0 }));
    const pData = trendMonths.map(tm => ({ ...tm, val: 0 }));

    vouchers.forEach(v => {
      const m = parseVchMonth(v.date);
      if (m !== -1) {
        const sItem = sData.find(item => item.mIdx === m);
        const pItem = pData.find(item => item.mIdx === m);
        if (v.type === 'Sales' && sItem) {
          sItem.val += Number(v.total) || 0;
        } else if (v.type === 'Purchase' && pItem) {
          pItem.val += Number(v.total) || 0;
        }
      }
    });

    const maxS = Math.max(...sData.map(d => d.val / 100000), 20);
    const maxP = Math.max(...pData.map(d => d.val / 100000), 20);

    return {
      salesTrendData: sData,
      purchaseTrendData: pData,
      maxSalesLakhs: Math.ceil(maxS / 10) * 10,
      maxPurchaseLakhs: Math.ceil(maxP / 10) * 10
    };
  }, [vouchers, trendMonths]);

  // Date range label
  const periodLabel = currentPeriod ? `${currentPeriod.start} to ${currentPeriod.end}` : '1-Apr-2026 to 31-Mar-2027';

  // SVG Chart Dimensions & Helpers
  const chartW = 420;
  const chartH = 160;
  const paddingL = 38;
  const paddingR = 15;
  const paddingT = 20;
  const paddingB = 32;
  const plotW = chartW - paddingL - paddingR;
  const plotH = chartH - paddingT - paddingB;

  // Function to create smooth cubic bezier curve path
  const createSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cp1x = curr.x + (next.x - curr.x) / 2;
      const cp1y = curr.y;
      const cp2x = curr.x + (next.x - curr.x) / 2;
      const cp2y = next.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }
    return d;
  };

  const createAreaPath = (points: { x: number; y: number }[], baseY: number) => {
    if (points.length === 0) return '';
    const linePath = createSmoothPath(points);
    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;
  };

  // Reusable Pill Badges for Dr and Cr
  const DrPill = () => (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '1px 6px',
      fontSize: 10,
      fontWeight: 700,
      borderRadius: 4,
      background: 'rgba(37, 99, 235, 0.12)',
      color: '#2563eb',
      border: '1px solid rgba(37, 99, 235, 0.3)',
      letterSpacing: '0.5px'
    }}>
      Dr
    </span>
  );

  const CrPill = () => (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '1px 6px',
      fontSize: 10,
      fontWeight: 700,
      borderRadius: 4,
      background: 'rgba(5, 150, 105, 0.12)',
      color: '#059669',
      border: '1px solid rgba(5, 150, 105, 0.3)',
      letterSpacing: '0.5px'
    }}>
      Cr
    </span>
  );

  return (
    <div 
      className="dashboard-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#0a0f1d',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
        color: '#1e293b',
        overflow: 'hidden'
      }}
    >
      {/* ─── Top Executive Header Bar (Dark Glassmorphism) ─── */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #0b1329 0%, #111d3d 50%, #1e293b 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)'
        }}
      >
        {/* Left: Branding & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)'
          }}>
            📊
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: '#ffffff', letterSpacing: '0.5px' }}>
                EXECUTIVE ANALYTICAL DASHBOARD
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 8px',
                borderRadius: 20,
                fontSize: 10,
                fontWeight: 700,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
                LIVE CALCULATED
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', gap: 15, marginTop: 2 }}>
              <span>Period: <strong style={{ color: '#e2e8f0' }}>{periodLabel}</strong></span>
              <span>•</span>
              <span>Standard: <strong style={{ color: '#38bdf8' }}>Double-Entry Accounting (Dr / Cr)</strong></span>
            </div>
          </div>
        </div>

        {/* Center: Company Name */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            padding: '4px 16px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 6,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'inline-block'
          }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '1px', display: 'block' }}>
              Active Entity
            </span>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc', letterSpacing: '0.8px' }}>
              {activeCompany?.name ? activeCompany.name.toUpperCase() : 'NO COMPANY SELECTED'}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setChartViewMode(chartViewMode === 'individual' ? 'combined' : 'individual')}
            style={{
              background: chartViewMode === 'combined' ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s'
            }}
            title="Toggle Dual Chart View"
          >
            <span>{chartViewMode === 'combined' ? 'Split Charts' : 'Dual Overlay'}</span>
          </button>

          <button 
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 12,
              color: '#ffffff',
              padding: '7px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 10px rgba(239, 68, 68, 0.35)',
              transition: 'all 0.2s'
            }}
            title="Close Dashboard (Esc)"
          >
            <span>✕ Close</span>
            <span style={{ fontSize: 10, opacity: 0.8 }}>(Esc)</span>
          </button>
        </div>
      </div>

      {/* ─── Top Executive KPI Analytics Ribbon (5 Colorful Cards) ─── */}
      <div 
        style={{
          background: '#0f172a',
          padding: '12px 16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 12,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'inset 0 -10px 20px rgba(0,0,0,0.15)'
        }}
      >
        {/* KPI 1: Total Revenue (Sales) - Emerald */}
        <div style={{
          background: 'linear-gradient(145deg, #064e3b 0%, #022c22 100%)',
          border: '1px solid #059669',
          borderRadius: 10,
          padding: '10px 14px',
          boxShadow: '0 4px 15px rgba(5, 150, 105, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', right: -10, top: -10, fontSize: 48, opacity: 0.12, userSelect: 'none' }}>📈</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Revenue (Sales)
            </span>
            <CrPill />
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#ffffff', marginTop: 4, letterSpacing: '0.5px' }}>
            ₹ {fmt(calculations.salesTotal)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 11, color: '#a7f3d0' }}>
            <span>Qty: <strong>{calculations.salesQty}</strong> units</span>
            <span style={{ fontWeight: 600 }}>{fmtCompact(calculations.salesTotal)}</span>
          </div>
        </div>

        {/* KPI 2: Total Cost (Purchases) - Rose */}
        <div style={{
          background: 'linear-gradient(145deg, #881337 0%, #4c0519 100%)',
          border: '1px solid #e11d48',
          borderRadius: 10,
          padding: '10px 14px',
          boxShadow: '0 4px 15px rgba(225, 29, 72, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', right: -10, top: -10, fontSize: 48, opacity: 0.12, userSelect: 'none' }}>🛒</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fda4af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Purchases (Cost)
            </span>
            <DrPill />
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#ffffff', marginTop: 4, letterSpacing: '0.5px' }}>
            ₹ {fmt(calculations.purchaseTotal)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 11, color: '#fecdd3' }}>
            <span>Qty: <strong>{calculations.purchaseQty}</strong> units</span>
            <span style={{ fontWeight: 600 }}>{fmtCompact(calculations.purchaseTotal)}</span>
          </div>
        </div>

        {/* KPI 3: Net Profit & Margin - Radiant Gold / Emerald */}
        <div style={{
          background: calculations.netProfit >= 0 
            ? 'linear-gradient(145deg, #14532d 0%, #052e16 100%)' 
            : 'linear-gradient(145deg, #7f1d1d 0%, #450a0a 100%)',
          border: calculations.netProfit >= 0 ? '1px solid #22c55e' : '1px solid #ef4444',
          borderRadius: 10,
          padding: '10px 14px',
          boxShadow: calculations.netProfit >= 0 ? '0 4px 15px rgba(34, 197, 94, 0.2)' : '0 4px 15px rgba(239, 68, 68, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', right: -10, top: -10, fontSize: 48, opacity: 0.12, userSelect: 'none' }}>💎</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: calculations.netProfit >= 0 ? '#86efac' : '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {calculations.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
            </span>
            <span style={{
              padding: '1px 6px',
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 4,
              background: calculations.netProfit >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: calculations.netProfit >= 0 ? '#4ade80' : '#f87171'
            }}>
              Margin {calculations.netProfitMargin}%
            </span>
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#ffffff', marginTop: 4, letterSpacing: '0.5px' }}>
            ₹ {fmt(calculations.netProfit)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 11, color: '#d1fae5' }}>
            <span>Gross: <strong>₹ {fmt(calculations.grossProfit)}</strong></span>
            <span style={{ fontWeight: 600 }}>GM: {calculations.grossProfitMargin}%</span>
          </div>
        </div>

        {/* KPI 4: Cash Flow (Inflow vs Outflow) - Cyan/Teal */}
        <div style={{
          background: 'linear-gradient(145deg, #0c4a6e 0%, #082f49 100%)',
          border: '1px solid #0284c7',
          borderRadius: 10,
          padding: '10px 14px',
          boxShadow: '0 4px 15px rgba(2, 132, 199, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', right: -10, top: -10, fontSize: 48, opacity: 0.12, userSelect: 'none' }}>🌊</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Nett Cash Flow
            </span>
            {calculations.nettFlow.type === 'Dr' ? <DrPill /> : <CrPill />}
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#ffffff', marginTop: 4, letterSpacing: '0.5px' }}>
            ₹ {fmt(calculations.nettFlow.amount)}
          </div>
          {/* Visual split progress bar */}
          <div style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#bae6fd', marginBottom: 2 }}>
              <span>In: ₹ {fmtCompact(calculations.inflow)}</span>
              <span>Out: ₹ {fmtCompact(calculations.outflow)}</span>
            </div>
            <div style={{ width: '100%', height: 4, background: '#075985', borderRadius: 2, overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${calculations.inflowPercent}%`, background: '#10b981', transition: 'width 0.3s' }}></div>
              <div style={{ width: `${calculations.outflowPercent}%`, background: '#f43f5e', transition: 'width 0.3s' }}></div>
            </div>
          </div>
        </div>

        {/* KPI 5: Working Capital & Liquidity - Royal Indigo */}
        <div style={{
          background: 'linear-gradient(145deg, #312e81 0%, #1e1b4b 100%)',
          border: '1px solid #6366f1',
          borderRadius: 10,
          padding: '10px 14px',
          boxShadow: '0 4px 15px rgba(99, 102, 241, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', right: -10, top: -10, fontSize: 48, opacity: 0.12, userSelect: 'none' }}>⚖️</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Working Capital
            </span>
            <span style={{
              padding: '1px 6px',
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 4,
              background: 'rgba(99, 102, 241, 0.25)',
              color: '#a5b4fc'
            }}>
              Ratio {calculations.currentRatio}
            </span>
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#ffffff', marginTop: 4, letterSpacing: '0.5px' }}>
            ₹ {fmt(calculations.workingCapital)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 11, color: '#e0e7ff' }}>
            <span>Liquid Cash: <strong>₹ {fmtCompact(calculations.totalLiquidCash)}</strong></span>
            <span style={{ color: calculations.workingCapital >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>
              {calculations.workingCapital >= 0 ? '● Solvent' : '● Deficit'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Main Content Grid (3 Columns) ─── */}
      <div 
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          background: '#0f172a'
        }}
      >
        {/* ═══════════ COLUMN 1: REVENUE & TRADING (EMERALD / GREEN THEME) ═══════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 1. Sales Trend Interactive Area Chart */}
          <div 
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 10,
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              padding: '12px 14px',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
                <span style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc' }}>Monthly Sales Trend</span>
              </div>
              <CrPill />
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8, marginTop: 2 }}>
              Financial Year Trend (Apr - Mar) • In Lakhs (₹)
            </div>

            {/* Chart SVG */}
            <div style={{ position: 'relative', width: '100%', height: chartH }}>
              <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                  {/* Sales Gradient Area */}
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                  {/* Glowing line filter */}
                  <filter id="glowSales" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.6" />
                  </filter>
                </defs>

                {/* Horizontal Grid lines */}
                <line x1={paddingL} y1={paddingT} x2={chartW - paddingR} y2={paddingT} stroke="#334155" strokeDasharray="3 3" />
                <line x1={paddingL} y1={paddingT + plotH / 2} x2={chartW - paddingR} y2={paddingT + plotH / 2} stroke="#334155" strokeDasharray="3 3" />
                <line x1={paddingL} y1={chartH - paddingB} x2={chartW - paddingR} y2={chartH - paddingB} stroke="#475569" strokeWidth="1.2" />

                {/* Y-Axis Labels */}
                <text x={paddingL - 6} y={paddingT + 4} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">{maxSalesLakhs}L</text>
                <text x={paddingL - 6} y={paddingT + plotH / 2 + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">{maxSalesLakhs / 2}L</text>
                <text x={paddingL - 6} y={chartH - paddingB + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">0</text>

                {/* Points & Line */}
                {(() => {
                  const points = salesTrendData.map((d, i) => {
                    const x = paddingL + (i / (salesTrendData.length - 1)) * plotW;
                    const valLakhs = d.val / 100000;
                    const y = (chartH - paddingB) - (valLakhs / maxSalesLakhs) * plotH;
                    return { x, y, ...d };
                  });

                  const lineD = createSmoothPath(points);
                  const areaD = createAreaPath(points, chartH - paddingB);

                  return (
                    <>
                      {/* Translucent Area Fill */}
                      <path d={areaD} fill="url(#salesGradient)" />
                      {/* Glowing Stroke */}
                      <path d={lineD} fill="none" stroke="#10b981" strokeWidth="2.5" filter="url(#glowSales)" />

                      {/* Interactive Circles & X-Labels */}
                      {points.map((p, i) => (
                        <g key={i}>
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r={p.val > 0 ? 4.5 : 2.5} 
                            fill={p.val > 0 ? '#34d399' : '#059669'} 
                            stroke="#ffffff" 
                            strokeWidth={p.val > 0 ? 1.5 : 0.8}
                            style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                            onMouseEnter={() => setHoveredSalesPoint(p)}
                            onMouseLeave={() => setHoveredSalesPoint(null)}
                          />
                          {/* X-axis labels */}
                          <text 
                            x={p.x} 
                            y={chartH - paddingB + 13} 
                            textAnchor="middle" 
                            fontSize="8.5" 
                            fill="#cbd5e1"
                            fontWeight="600"
                          >
                            {p.name}
                          </text>
                          <text 
                            x={p.x} 
                            y={chartH - paddingB + 23} 
                            textAnchor="middle" 
                            fontSize="7.5" 
                            fill="#64748b"
                          >
                            {p.label.split('-')[1]}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>

              {/* High-Tech Hover Tooltip */}
              {hoveredSalesPoint && (
                <div 
                  style={{
                    position: 'absolute',
                    left: `${(hoveredSalesPoint.x / chartW) * 100}%`,
                    top: `${(hoveredSalesPoint.y / chartH) * 100}%`,
                    transform: 'translate(-50%, -125%)',
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid #10b981',
                    color: '#ffffff',
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    zIndex: 20,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                  }}
                >
                  <div style={{ color: '#6ee7b7', fontWeight: 700, fontSize: 10 }}>{hoveredSalesPoint.label} (Credit)</div>
                  <div style={{ fontSize: 13, fontWeight: 800, marginTop: 1 }}>₹ {fmt(hoveredSalesPoint.val)}</div>
                  <div style={{ fontSize: 9.5, color: '#94a3b8' }}>{(hoveredSalesPoint.val / 100000).toFixed(2)} Lakhs</div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>Monthly Sales Revenue (Cr)</span>
            </div>
          </div>

          {/* 2. Trading Details Panel (P&L Breakdown) */}
          <div 
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 10,
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              padding: '12px 14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc' }}>Trading & Profitability</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>P&L Structure</span>
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>Revenue, Direct Costs & Margins</div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 600 }}>Particulars</th>
                  <th style={{ textAlign: 'center', padding: '6px 0', fontWeight: 600, width: 45 }}>Type</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 0', color: '#f1f5f9' }}>Sales Accounts</td>
                  <td style={{ textAlign: 'center', padding: '6px 0' }}><CrPill /></td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700, color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.salesTotal)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 0', color: '#f1f5f9' }}>Purchase Accounts</td>
                  <td style={{ textAlign: 'center', padding: '6px 0' }}><DrPill /></td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700, color: '#fb7185', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.purchaseTotal)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 0', color: '#cbd5e1' }}>Direct Expenses</td>
                  <td style={{ textAlign: 'center', padding: '6px 0' }}><DrPill /></td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600, color: '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.directExp)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 0', color: '#cbd5e1' }}>Indirect Expenses</td>
                  <td style={{ textAlign: 'center', padding: '6px 0' }}><DrPill /></td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600, color: '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.indirectExp)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 0', color: '#cbd5e1' }}>Indirect Incomes</td>
                  <td style={{ textAlign: 'center', padding: '6px 0' }}><CrPill /></td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600, color: '#4ade80', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.indirectInc)}
                  </td>
                </tr>
                <tr style={{ borderTop: '1px solid #475569', background: 'rgba(5, 150, 105, 0.08)' }}>
                  <td style={{ padding: '7px 4px', fontWeight: 700, color: '#6ee7b7' }}>Gross Profit</td>
                  <td style={{ textAlign: 'center', padding: '7px 0' }}>
                    {calculations.grossProfit >= 0 ? <CrPill /> : <DrPill />}
                  </td>
                  <td style={{ textAlign: 'right', padding: '7px 4px', fontWeight: 800, color: calculations.grossProfit >= 0 ? '#34d399' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.grossProfit)}
                  </td>
                </tr>
                <tr style={{ borderTop: '1px solid #475569', background: calculations.netProfit >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }}>
                  <td style={{ padding: '8px 4px', fontWeight: 800, color: '#ffffff' }}>Net Profit / (Loss)</td>
                  <td style={{ textAlign: 'center', padding: '8px 0' }}>
                    {calculations.netProfit >= 0 ? <CrPill /> : <DrPill />}
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 800, fontSize: 13, color: calculations.netProfit >= 0 ? '#4ade80' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.netProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 3. Cash & Bank Accounts Panel */}
          <div 
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 10,
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              padding: '12px 14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc' }}>Cash & Bank Balances</span>
              <span style={{
                padding: '2px 8px',
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 12,
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc',
                border: '1px solid rgba(99, 102, 241, 0.4)'
              }}>
                Liquid: ₹ {fmtCompact(calculations.totalLiquidCash)}
              </span>
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8, marginTop: 2 }}>Ready Liquidity at Hand</div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 600 }}>Account Group</th>
                  <th style={{ textAlign: 'center', padding: '6px 0', fontWeight: 600, width: 45 }}>Type</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>Closing Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '7px 0', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>💵</span>
                    <span>Cash-in-Hand</span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '7px 0' }}>
                    {calculations.cashInHand.type === 'Dr' ? <DrPill /> : <CrPill />}
                  </td>
                  <td style={{ textAlign: 'right', padding: '7px 0', fontWeight: 700, color: '#60a5fa', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.cashInHand.amount)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '7px 0', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>🏦</span>
                    <span>Bank Accounts</span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '7px 0' }}>
                    {calculations.bankAccounts.type === 'Dr' ? <DrPill /> : <CrPill />}
                  </td>
                  <td style={{ textAlign: 'right', padding: '7px 0', fontWeight: 700, color: '#818cf8', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.bankAccounts.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 4. Inventory Performance Details */}
          <div 
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 10,
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              padding: '12px 14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc' }}>Inventory Stock & Movement</span>
              <span style={{ fontSize: 10, color: '#38bdf8' }}>♦ Primary</span>
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8, marginTop: 2 }}>Stock Valuation & Turnover</div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 600 }}>Particulars</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>Quantity</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>Value (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 0', color: '#f1f5f9' }}>Closing Stock (Asset)</td>
                  <td style={{ textAlign: 'right', padding: '6px 0', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
                    {calculations.closingStockQty > 0 ? calculations.closingStockQty : '—'}
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700, color: '#38bdf8', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.closingStockVal)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 0', color: '#f1f5f9' }}>Outwards (Dispatches)</td>
                  <td style={{ textAlign: 'right', padding: '6px 0', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
                    {calculations.salesQty > 0 ? calculations.salesQty : '—'}
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700, color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.salesTotal)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: '#f1f5f9' }}>Inwards (Receipts)</td>
                  <td style={{ textAlign: 'right', padding: '6px 0', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
                    {calculations.purchaseQty > 0 ? calculations.purchaseQty : '—'}
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700, color: '#f43f5e', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.purchaseTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══════════ COLUMN 2: PURCHASES & WORKING CAPITAL (ROSE / INDIGO THEME) ═══════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 1. Purchase Trend Interactive Area Chart */}
          <div 
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 10,
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              padding: '12px 14px',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e' }}></span>
                <span style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc' }}>Monthly Purchase Trend</span>
              </div>
              <DrPill />
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8, marginTop: 2 }}>
              Financial Year Trend (Apr - Mar) • In Lakhs (₹)
            </div>

            {/* Chart SVG */}
            <div style={{ position: 'relative', width: '100%', height: chartH }}>
              <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                  {/* Purchase Gradient Area */}
                  <linearGradient id="purchaseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                  </linearGradient>
                  {/* Glowing line filter */}
                  <filter id="glowPurchase" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#f43f5e" floodOpacity="0.6" />
                  </filter>
                </defs>

                {/* Horizontal Grid lines */}
                <line x1={paddingL} y1={paddingT} x2={chartW - paddingR} y2={paddingT} stroke="#334155" strokeDasharray="3 3" />
                <line x1={paddingL} y1={paddingT + plotH / 2} x2={chartW - paddingR} y2={paddingT + plotH / 2} stroke="#334155" strokeDasharray="3 3" />
                <line x1={paddingL} y1={chartH - paddingB} x2={chartW - paddingR} y2={chartH - paddingB} stroke="#475569" strokeWidth="1.2" />

                {/* Y-Axis Labels */}
                <text x={paddingL - 6} y={paddingT + 4} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">{maxPurchaseLakhs}L</text>
                <text x={paddingL - 6} y={paddingT + plotH / 2 + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">{maxPurchaseLakhs / 2}L</text>
                <text x={paddingL - 6} y={chartH - paddingB + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">0</text>

                {/* Points & Line */}
                {(() => {
                  const points = purchaseTrendData.map((d, i) => {
                    const x = paddingL + (i / (purchaseTrendData.length - 1)) * plotW;
                    const valLakhs = d.val / 100000;
                    const y = (chartH - paddingB) - (valLakhs / maxPurchaseLakhs) * plotH;
                    return { x, y, ...d };
                  });

                  const lineD = createSmoothPath(points);
                  const areaD = createAreaPath(points, chartH - paddingB);

                  return (
                    <>
                      {/* Translucent Area Fill */}
                      <path d={areaD} fill="url(#purchaseGradient)" />
                      {/* Glowing Stroke */}
                      <path d={lineD} fill="none" stroke="#f43f5e" strokeWidth="2.5" filter="url(#glowPurchase)" />

                      {/* Interactive Circles & X-Labels */}
                      {points.map((p, i) => (
                        <g key={i}>
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r={p.val > 0 ? 4.5 : 2.5} 
                            fill={p.val > 0 ? '#fb7185' : '#e11d48'} 
                            stroke="#ffffff" 
                            strokeWidth={p.val > 0 ? 1.5 : 0.8}
                            style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                            onMouseEnter={() => setHoveredPurchasePoint(p)}
                            onMouseLeave={() => setHoveredPurchasePoint(null)}
                          />
                          {/* X-axis labels */}
                          <text 
                            x={p.x} 
                            y={chartH - paddingB + 13} 
                            textAnchor="middle" 
                            fontSize="8.5" 
                            fill="#cbd5e1"
                            fontWeight="600"
                          >
                            {p.name}
                          </text>
                          <text 
                            x={p.x} 
                            y={chartH - paddingB + 23} 
                            textAnchor="middle" 
                            fontSize="7.5" 
                            fill="#64748b"
                          >
                            {p.label.split('-')[1]}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>

              {/* High-Tech Hover Tooltip */}
              {hoveredPurchasePoint && (
                <div 
                  style={{
                    position: 'absolute',
                    left: `${(hoveredPurchasePoint.x / chartW) * 100}%`,
                    top: `${(hoveredPurchasePoint.y / chartH) * 100}%`,
                    transform: 'translate(-50%, -125%)',
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid #f43f5e',
                    color: '#ffffff',
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    zIndex: 20,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                  }}
                >
                  <div style={{ color: '#fda4af', fontWeight: 700, fontSize: 10 }}>{hoveredPurchasePoint.label} (Debit)</div>
                  <div style={{ fontSize: 13, fontWeight: 800, marginTop: 1 }}>₹ {fmt(hoveredPurchasePoint.val)}</div>
                  <div style={{ fontSize: 9.5, color: '#94a3b8' }}>{(hoveredPurchasePoint.val / 100000).toFixed(2)} Lakhs</div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f43f5e' }}></span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>Monthly Purchase Outflow (Dr)</span>
            </div>
          </div>

          {/* 2. Assets & Liabilities Balance */}
          <div 
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 10,
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              padding: '12px 14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc' }}>Current Assets & Liabilities</span>
              <span style={{
                padding: '2px 8px',
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 12,
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}>
                Current Ratio: {calculations.currentRatio}
              </span>
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8, marginTop: 2 }}>Balance Sheet Solvency</div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 600 }}>Category</th>
                  <th style={{ textAlign: 'center', padding: '6px 0', fontWeight: 600, width: 45 }}>Type</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>Closing Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '7px 0', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8' }}></span>
                    <span>Current Assets</span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '7px 0' }}><DrPill /></td>
                  <td style={{ textAlign: 'right', padding: '7px 0', fontWeight: 700, color: '#38bdf8', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.currentAssets.amount)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '7px 0', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }}></span>
                    <span>Current Liabilities</span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '7px 0' }}><CrPill /></td>
                  <td style={{ textAlign: 'right', padding: '7px 0', fontWeight: 700, color: '#fbbf24', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.currentLiabilities.amount)}
                  </td>
                </tr>
                <tr style={{ borderTop: '1px solid #475569', background: 'rgba(99, 102, 241, 0.1)' }}>
                  <td style={{ padding: '8px 4px', fontWeight: 700, color: '#c7d2fe' }}>Net Working Capital</td>
                  <td style={{ textAlign: 'center', padding: '8px 0' }}>
                    {calculations.workingCapital >= 0 ? <DrPill /> : <CrPill />}
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 800, color: calculations.workingCapital >= 0 ? '#a5b4fc' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.workingCapital)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 3. Top Groups / Ledgers with Interactive Selector */}
          <div 
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 10,
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              padding: '12px 14px',
              flex: 1
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc' }}>Top Ledgers Breakdown</span>
              <select 
                value={activeLedgerGroup} 
                onChange={e => setActiveLedgerGroup(e.target.value as any)}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  border: '1px solid #475569',
                  borderRadius: 6,
                  padding: '3px 8px',
                  color: '#f8fafc',
                  background: '#0f172a',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="Bank Accounts">Bank Accounts</option>
                <option value="Sundry Debtors">Sundry Debtors (Receivables)</option>
                <option value="Sundry Creditors">Sundry Creditors (Payables)</option>
              </select>
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8, marginTop: 2 }}>
              Ranked Ledger-wise Position ({activeLedgerGroup})
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 600 }}>Ledger Name</th>
                  <th style={{ textAlign: 'center', padding: '6px 0', fontWeight: 600, width: 45 }}>Type</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>Closing Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let list: any[] = [];
                  if (activeLedgerGroup === 'Bank Accounts') list = calculations.bankLedgers;
                  else if (activeLedgerGroup === 'Sundry Debtors') list = calculations.debtorLedgers;
                  else list = calculations.creditorLedgers;

                  if (!list || list.length === 0) {
                    return (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '20px 0', color: '#64748b' }}>
                          No ledgers found under {activeLedgerGroup}
                        </td>
                      </tr>
                    );
                  }

                  return list.slice(0, 7).map((l, i) => {
                    const b = getLedgerBalance(l);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '6px 0', textTransform: 'uppercase', color: '#f1f5f9', fontWeight: 500 }}>
                          <span style={{
                            display: 'inline-block',
                            width: 18,
                            fontSize: 9,
                            fontWeight: 700,
                            color: '#94a3b8'
                          }}>
                            #{i + 1}
                          </span>
                          {l.name}
                        </td>
                        <td style={{ textAlign: 'center', padding: '6px 0' }}>
                          {b.type === 'Dr' ? <DrPill /> : <CrPill />}
                        </td>
                        <td style={{ 
                          textAlign: 'right', 
                          padding: '6px 0', 
                          fontWeight: 700, 
                          color: b.type === 'Dr' ? '#60a5fa' : '#34d399',
                          fontVariantNumeric: 'tabular-nums' 
                        }}>
                          {fmt(b.amount)}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══════════ COLUMN 3: CASH FLOW, RECEIVABLES & KEY RATIOS (CYAN / AMBER THEME) ═══════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 1. Cash In/Out Flow Analysis */}
          <div 
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 10,
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              padding: '12px 14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc' }}>Cash Inflow & Outflow</span>
              <span style={{ fontSize: 10, color: '#38bdf8' }}>♦ Primary</span>
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8, marginTop: 2 }}>Operational Liquidity Movement</div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 600 }}>Particulars</th>
                  <th style={{ textAlign: 'center', padding: '6px 0', fontWeight: 600, width: 45 }}>Type</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 0', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
                    <span>Total Inflow (Receipts)</span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '6px 0' }}><DrPill /></td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700, color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.inflow)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 0', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e' }}></span>
                    <span>Total Outflow (Payments)</span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '6px 0' }}><CrPill /></td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700, color: '#fb7185', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.outflow)}
                  </td>
                </tr>
                <tr style={{ borderTop: '1px solid #475569', background: 'rgba(56, 189, 248, 0.1)' }}>
                  <td style={{ padding: '8px 4px', fontWeight: 700, color: '#7dd3fc' }}>Nett Cash Position</td>
                  <td style={{ textAlign: 'center', padding: '8px 0' }}>
                    {calculations.nettFlow.type === 'Dr' ? <DrPill /> : <CrPill />}
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 800, color: calculations.nettFlow.type === 'Dr' ? '#38bdf8' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.nettFlow.amount)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Visual ratio bar */}
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: '#94a3b8', marginBottom: 3 }}>
                <span>Inflow {calculations.inflowPercent}%</span>
                <span>Outflow {calculations.outflowPercent}%</span>
              </div>
              <div style={{ width: '100%', height: 6, background: '#334155', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${calculations.inflowPercent}%`, background: '#10b981' }}></div>
                <div style={{ width: `${calculations.outflowPercent}%`, background: '#f43f5e' }}></div>
              </div>
            </div>
          </div>

          {/* 2. Receivables vs Payables (Debtors vs Creditors) */}
          <div 
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 10,
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              padding: '12px 14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc' }}>Receivables & Payables</span>
              <span style={{
                padding: '2px 8px',
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 12,
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}>
                Net: ₹ {fmtCompact(Math.abs(calculations.receivables - calculations.payables))} {calculations.receivables >= calculations.payables ? 'Dr' : 'Cr'}
              </span>
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8, marginTop: 2 }}>Debtor & Creditor Commitments</div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 600 }}>Particulars</th>
                  <th style={{ textAlign: 'center', padding: '6px 0', fontWeight: 600, width: 45 }}>Type</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>Pending Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 0', color: '#f1f5f9' }}>Receivables (Sundry Debtors)</td>
                  <td style={{ textAlign: 'center', padding: '6px 0' }}><DrPill /></td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700, color: '#38bdf8', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.receivables)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 0', color: '#cbd5e1' }}>Overdue Receivables</td>
                  <td style={{ textAlign: 'center', padding: '6px 0' }}><DrPill /></td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600, color: '#7dd3fc', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.receivables)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 0', color: '#f1f5f9' }}>Payables (Sundry Creditors)</td>
                  <td style={{ textAlign: 'center', padding: '6px 0' }}><CrPill /></td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700, color: '#fbbf24', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.payables)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: '#cbd5e1' }}>Overdue Payables</td>
                  <td style={{ textAlign: 'center', padding: '6px 0' }}><CrPill /></td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600, color: '#fde68a', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(calculations.payables)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 3. Executive Accounting Ratios */}
          <div 
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 10,
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              padding: '12px 14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc' }}>Accounting & Financial Ratios</span>
              <span style={{ fontSize: 10, color: '#a78bfa' }}>KPI Health</span>
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8, marginTop: 2 }}>Calculated Performance Indicators</div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 600 }}>Ratio Metric</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>Calculated Value</th>
                  <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>Benchmark</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 0', color: '#f1f5f9' }}>Inventory Turnover</td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700, color: '#38bdf8', fontVariantNumeric: 'tabular-nums' }}>
                    {calculations.inventoryTurnover}x
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 0', color: '#94a3b8', fontSize: 10 }}>&gt; 0.5x</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 0', color: '#f1f5f9' }}>Debt / Equity Ratio</td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700, color: '#fbbf24', fontVariantNumeric: 'tabular-nums' }}>
                    {calculations.debtEquityRatio}
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 0', color: '#94a3b8', fontSize: 10 }}>&lt; 2.0</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 0', color: '#f1f5f9' }}>Receivable Turnover</td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700, color: '#a78bfa', fontVariantNumeric: 'tabular-nums' }}>
                    {calculations.receivableTurnoverDays}
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 0', color: '#94a3b8', fontSize: 10 }}>&lt; 90 d</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 0', color: '#f1f5f9' }}>Return on Investment (ROI)</td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700, color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>
                    {calculations.returnOnInvestment}
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 0', color: '#94a3b8', fontSize: 10 }}>&gt; 15%</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: '#f1f5f9' }}>Net Profit Margin</td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 700, color: calculations.netProfit >= 0 ? '#4ade80' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                    {calculations.netProfitMargin}%
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 0', color: '#94a3b8', fontSize: 10 }}>&gt; 10%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Bottom Status Bar ─── */}
      <div 
        style={{
          background: '#0b1329',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#94a3b8',
          padding: '6px 20px',
          fontSize: 11,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span>Entity: <strong style={{ color: '#f8fafc' }}>{activeCompany?.name || 'No Company Selected'}</strong></span>
          <span>•</span>
          <span>Period: <strong style={{ color: '#f8fafc' }}>{periodLabel}</strong></span>
          <span>•</span>
          <span>Base Currency: <strong style={{ color: '#38bdf8' }}>INR (₹)</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <span style={{ color: '#64748b' }}>Press <strong>Esc</strong> key anytime to close</span>
          <button 
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#000000',
              fontWeight: 800,
              border: 'none',
              borderRadius: 4,
              padding: '3px 10px',
              fontSize: 10,
              cursor: 'pointer',
              letterSpacing: '0.5px'
            }}
          >
            Esc: Exit
          </button>
        </div>
      </div>
    </div>
  );
}
