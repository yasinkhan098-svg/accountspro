import {
  VirtualFormData,
  CalculatedVirtualFinancials,
  VirtualPartnerItem,
  VirtualAssetItem,
  VirtualProjectedYearResult,
  VirtualProjectionConfig,
  VirtualFinancialItem,
  VirtualBSSections,
  VirtualPLData
} from './types';

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export const sum = (arr: { amount?: number; closingBal?: number }[]) =>
  arr.reduce((s, i) => s + (Number(i.amount ?? i.closingBal) || 0), 0);

// ─── Helper: Detect Standard Income Tax Depreciation Rate ────────────────────
export function detectDepreciationRate(name: string): number {
  const l = (name || '').toLowerCase();
  if (l.includes('computer') || l.includes('laptop') || l.includes('software') || l.includes('printer')) return 40;
  if (l.includes('furniture') || l.includes('fixture') || l.includes('building') || l.includes('premises')) return 10;
  return 15;
}

// ─── Helper: Auto-Derive Annexure B (Fixed Assets) from Balance Sheet ─────────
export function deriveFASchedule(
  fixedAssets: VirtualFinancialItem[],
  existingFA: VirtualAssetItem[] = []
): VirtualAssetItem[] {
  if (existingFA && existingFA.length > 0) {
    return existingFA.map((fa, idx) => {
      const rate = Number(fa.depreciationRate) || detectDepreciationRate(fa.name);
      const op = Number(fa.openingBal) || 0;
      const addB = Number(fa.additionBefore) || 0;
      const addA = Number(fa.additionAfter) || 0;
      const depr = r2((op + addB) * (rate / 100) + addA * (rate / 200));
      const close = r2(Math.max(0, op + addB + addA - depr));
      return {
        id: fa.id || `fa-${idx + 1}`,
        name: (fa.name || `ASSET ${idx + 1}`).toUpperCase(),
        openingBal: op,
        additionBefore: addB,
        additionAfter: addA,
        depreciationRate: rate,
        depreciation: depr,
        closingBal: close,
      };
    });
  }

  const faItems = (fixedAssets || []).filter(fa => fa.name || Math.abs(fa.amount) > 0.001);
  if (faItems.length === 0) return [];

  return faItems.map((fa, idx) => {
    const rate = detectDepreciationRate(fa.name);
    const op = Number(fa.amount) || 0;
    const depr = r2(op * (rate / 100));
    const close = r2(Math.max(0, op - depr));
    return {
      id: fa.id || `fa-${idx + 1}`,
      name: (fa.name || `ASSET ${idx + 1}`).toUpperCase(),
      openingBal: op,
      additionBefore: 0,
      additionAfter: 0,
      depreciationRate: rate,
      depreciation: depr,
      closingBal: close,
    };
  });
}

// ─── Helper: Auto-Derive Annexure A (Partners Capital) from Balance Sheet & P&L
export function derivePartners(
  capitalItems: VirtualFinancialItem[],
  netProfit: number,
  existingPartners: VirtualPartnerItem[] = []
): VirtualPartnerItem[] {
  // If user has defined partners in existingPartners, use them as authoritative!
  if (existingPartners && existingPartners.length > 0) {
    return existingPartners.map((p, idx) => {
      const name = (p.name || `PARTNER ${idx + 1}`).toUpperCase();
      const sharePct = Number(p.sharePct) || 0;
      const op = Number(p.openingBal) || 0;
      const add = Number(p.addition) || 0;
      const sal = Number(p.salary) || 0;
      const iRate = p.interestRate !== undefined && p.interestRate !== null ? Number(p.interestRate) : 12;
      const iAmt = r2(op * (iRate / 100));
      const pShare = r2(netProfit * (sharePct / 100));
      const tot = r2(op + add + sal + iAmt + pShare);
      const wAmt = Number(p.withdrawalsAmt) || 0;
      const close = r2(tot - wAmt);
      return {
        id: p.id || `p-${idx + 1}`,
        name,
        sharePct,
        openingBal: op,
        addition: add,
        salary: sal,
        interestRate: iRate,
        interestAmt: iAmt,
        profitShare: pShare,
        total: tot,
        withdrawalsAmt: wAmt,
        withdrawalsNature: p.withdrawalsNature || '',
        closingBal: close,
      };
    });
  }

  // Fallback: derive from capitalItems if existingPartners is empty
  const capList = (capitalItems || []).filter(c => c.name || Math.abs(c.amount) > 0.001);
  if (capList.length === 0) {
    const pShare = netProfit;
    return [{
      id: 'p-1',
      name: 'PARTNER 1',
      sharePct: 100,
      openingBal: 0,
      addition: 0,
      salary: 0,
      interestRate: 0,
      interestAmt: 0,
      profitShare: pShare,
      total: pShare,
      withdrawalsAmt: 0,
      closingBal: pShare,
    }];
  }

  const count = capList.length;
  const baseShare = Math.round((100 / count) * 100) / 100;
  return capList.map((c, idx) => {
    let pName = c.name.trim();
    if (pName.toUpperCase().endsWith('CAPITAL ACCOUNT') || pName.toUpperCase().endsWith('CAPITAL A/C')) {
      pName = pName.replace(/capital\s+account|capital\s+a\/c/gi, '').trim();
    }
    if (!pName) pName = c.name.trim();
    const sharePct = idx === count - 1 ? r2(100 - baseShare * (count - 1)) : baseShare;
    const op = Number(c.amount) || 0;
    const pShare = r2(netProfit * (sharePct / 100));
    const tot = r2(op + pShare);
    return {
      id: c.id || `p-${idx + 1}`,
      name: pName.toUpperCase(),
      sharePct,
      openingBal: op,
      addition: 0,
      salary: 0,
      interestRate: 12,
      interestAmt: r2(op * 0.12),
      profitShare: pShare,
      total: tot,
      withdrawalsAmt: 0,
      closingBal: tot,
    };
  });
}

// ─── 1. Calculate Actual Financials from Virtual Form ────────────────────────
export function computeVirtualActualFinancials(form: VirtualFormData): CalculatedVirtualFinancials {
  const { bsSections, plData, partners, fixedAssetSchedule } = form;

  // A. Trading Account
  const directExpTotal = r2(sum(plData.trading.directExpenses || []));
  const tradingDebit = r2(plData.trading.openingStock + plData.trading.purchases + directExpTotal);
  const tradingCredit = r2(plData.trading.sales + plData.trading.closingStock);
  const grossProfit = r2(tradingCredit - tradingDebit);

  const tradingDebitTotal = r2(tradingDebit + (grossProfit > 0 ? grossProfit : 0));
  const tradingCreditTotal = r2(tradingCredit + (grossProfit < 0 ? Math.abs(grossProfit) : 0));

  // B. Fixed Assets Schedule (Annexure B) - Auto-derived from bsSections.fixedAssets
  const calculatedFASchedule: VirtualAssetItem[] = deriveFASchedule(bsSections.fixedAssets, fixedAssetSchedule);
  const totalClosingFA = r2(calculatedFASchedule.reduce((s, fa) => s + (fa.closingBal || 0), 0));
  const totalDepreciation = r2(calculatedFASchedule.reduce((s, fa) => s + (fa.depreciation || 0), 0));

  // C. Profit & Loss Account
  const indirectIncTotal = r2(sum(plData.indirectIncomes || []));

  // Auto-sync Annexure B depreciation into Indirect Expenses if not already present
  let indirectExpList = [...(plData.indirectExpenses || [])];
  if (totalDepreciation > 0) {
    const hasDepr = indirectExpList.some(e => e.name.toLowerCase().includes('depr'));
    if (hasDepr) {
      indirectExpList = indirectExpList.map(e =>
        e.name.toLowerCase().includes('depr') ? { ...e, amount: totalDepreciation } : e
      );
    } else {
      indirectExpList.push({ id: 'depr-auto', name: 'To Depreciation', amount: totalDepreciation });
    }
  }
  const indirectExpTotal = r2(sum(indirectExpList));

  const plCredit = r2((grossProfit > 0 ? grossProfit : 0) + indirectIncTotal);
  const plDebit = r2((grossProfit < 0 ? Math.abs(grossProfit) : 0) + indirectExpTotal);
  const netProfit = r2(plCredit - plDebit);

  const plDebitTotal = r2(plDebit + (netProfit > 0 ? netProfit : 0));
  const plCreditTotal = r2(plCredit + (netProfit < 0 ? Math.abs(netProfit) : 0));

  // D. Partners Capital Account (Annexure A) - Auto-derived from bsSections.capitalItems and Net Profit
  const calculatedPartners: VirtualPartnerItem[] = derivePartners(bsSections.capitalItems, netProfit, partners);
  const totalClosingCapital = r2(calculatedPartners.reduce((s, p) => s + (p.closingBal || 0), 0));

  // E. Balance Sheet Liabilities
  let capitalTotal = totalClosingCapital;
  if (capitalTotal === 0) {
    capitalTotal = r2(sum(bsSections.capitalItems || []));
  }
  const securedTotal = r2(sum(bsSections.securedLoans || []));
  const unsecuredTotal = r2(sum(bsSections.unsecuredLoans || []));
  const currLiabTotal = r2(sum(bsSections.currentLiabilities || []));

  const totalLiabilities = r2(capitalTotal + securedTotal + unsecuredTotal + currLiabTotal);

  // F. Balance Sheet Assets
  let fixedAssetTotal = totalClosingFA;
  if (fixedAssetTotal === 0) {
    fixedAssetTotal = r2(sum(bsSections.fixedAssets || []));
  }
  const securityDepositsTotal = r2(sum(bsSections.securityDeposits || []));

  // Ensure Closing stock is synchronized with P&L Closing Stock
  const currAssetList = (bsSections.currentAssets || []).map(a => {
    if (a.name.toLowerCase().includes('stock')) {
      return { ...a, amount: r2(plData.trading.closingStock) };
    }
    return { ...a };
  });
  if (!currAssetList.some(a => a.name.toLowerCase().includes('stock')) && plData.trading.closingStock > 0) {
    currAssetList.push({ id: 'ca-stock-auto', name: 'Closing Stock', amount: r2(plData.trading.closingStock) });
  }

  // Balancing Cash-in-hand calculation to achieve exact 100% balance
  const nonCashAssets = r2(
    fixedAssetTotal +
    securityDepositsTotal +
    sum(currAssetList.filter(a => !a.name.toLowerCase().includes('cash')))
  );
  const balancingCash = r2(totalLiabilities - nonCashAssets);

  const finalCurrAssets = currAssetList.map(a => {
    if (a.name.toLowerCase().includes('cash')) {
      return { ...a, amount: balancingCash };
    }
    return a;
  });
  if (!finalCurrAssets.some(a => a.name.toLowerCase().includes('cash'))) {
    finalCurrAssets.push({ id: 'ca-cash-auto', name: 'Cash-in-hand', amount: balancingCash });
  }

  const currAssetTotal = r2(sum(finalCurrAssets));
  const totalAssets = r2(fixedAssetTotal + securityDepositsTotal + currAssetTotal);
  const diff = r2(totalLiabilities - totalAssets);

  return {
    directExpTotal,
    indirectExpTotal,
    indirectIncTotal,
    grossProfit,
    netProfit,
    tradingDebitTotal,
    tradingCreditTotal,
    plDebitTotal,
    plCreditTotal,
    calculatedPartners,
    totalClosingCapital,
    calculatedFASchedule,
    totalClosingFA,
    totalDepreciation,
    capitalTotal,
    securedTotal,
    unsecuredTotal,
    currLiabTotal,
    totalLiabilities,
    fixedAssetTotal,
    securityDepositsTotal,
    currAssetTotal,
    balancingCash,
    totalAssets,
    isBalanced: Math.abs(diff) < 0.01,
    diff,
  };
}

// ─── 2. Calculate Multi-Year Provisional / Projected Statements ───────────────
export function computeVirtualProjections(
  baseFin: CalculatedVirtualFinancials,
  form: VirtualFormData,
  config: VirtualProjectionConfig
): VirtualProjectedYearResult[] {
  const results: VirtualProjectedYearResult[] = [];
  const years = Math.min(Math.max(1, config.horizonYears || 1), 3);

  let currentSales = form.plData.trading.sales;
  let currentPurchases = form.plData.trading.purchases;
  let currentClosingStock = form.plData.trading.closingStock;
  let currentPartners = [...baseFin.calculatedPartners];
  let currentFASchedule = [...baseFin.calculatedFASchedule];

  const baseYearMatch = form.company.toDate.match(/(\d{4})/);
  let baseEndYear = baseYearMatch ? parseInt(baseYearMatch[1], 10) : 2026;

  for (let y = 1; y <= years; y++) {
    const projYearEnd = baseEndYear + y;
    const projYearStart = projYearEnd - 1;
    const yearLabel = y === 1 ? 'PROVISIONAL' : `PROJECTED YEAR ${y}`;
    const fromDateStr = `01-Apr-${projYearStart}`;
    const toDateStr = `31-Mar-${projYearEnd}`;
    const asOnDateStr = `31.03.${projYearEnd}`;

    const salesGrowth = 1 + (config.salesGrowthPct / 100);
    const targetGpMargin = (config.gpMarginPct / 100);
    const stockGrowth = 1 + (config.stockGrowthPct / 100);
    const inflation = 1 + (config.expenseInflationPct / 100);
    const labourGrowth = 1 + (config.labourGrowthPct / 100);
    const deprReduction = 1 - (config.deprReductionPct / 100);
    const ccLimitGrowth = 1 + (config.ccLimitGrowthPct / 100);

    // 1. Trading Projections
    const projSales = r2(currentSales * salesGrowth);
    const projOpeningStock = currentClosingStock;
    const projClosingStock = r2(currentClosingStock * stockGrowth);
    const projGrossProfit = r2(projSales * targetGpMargin);

    const projDirectExpenses: VirtualFinancialItem[] = (form.plData.trading.directExpenses || []).map(e => {
      const l = e.name.toLowerCase();
      const mult = (l.includes('labour') || l.includes('wage')) ? labourGrowth : inflation;
      return { id: e.id, name: e.name, amount: r2(e.amount * mult) };
    });
    const projDirectExpTotal = r2(sum(projDirectExpenses));

    // Purchases = Sales + ClosingStock - OpeningStock - DirectExp - GrossProfit
    const projPurchases = r2(projSales + projClosingStock - projOpeningStock - projDirectExpTotal - projGrossProfit);

    const tradingDebitTotal = r2(projOpeningStock + projPurchases + projDirectExpTotal + (projGrossProfit > 0 ? projGrossProfit : 0));
    const tradingCreditTotal = r2(projSales + projClosingStock + (projGrossProfit < 0 ? Math.abs(projGrossProfit) : 0));

    // 2. Fixed Assets Schedule Projections (Annexure B)
    const projFASchedule: VirtualAssetItem[] = currentFASchedule.map(fa => {
      const op = fa.closingBal || fa.openingBal;
      const rate = Number(fa.depreciationRate) || 15;
      const depr = r2(op * (rate / 100) * deprReduction);
      const close = r2(Math.max(0, op - depr));
      return {
        ...fa,
        openingBal: op,
        additionBefore: 0,
        additionAfter: 0,
        depreciation: depr,
        closingBal: close,
      };
    });
    const projTotalClosingFA = r2(projFASchedule.reduce((s, fa) => s + (fa.closingBal || 0), 0));
    const projDeprTotal = r2(projFASchedule.reduce((s, fa) => s + (fa.depreciation || 0), 0));

    // 3. Indirect Expenses & Incomes
    const projIndirectIncomes: VirtualFinancialItem[] = (form.plData.indirectIncomes || []).map(i => ({
      id: i.id,
      name: i.name,
      amount: r2(i.amount * (projSales / currentSales) * 0.8)
    }));
    const projIndirectIncTotal = r2(sum(projIndirectIncomes));

    let projIndirectExpenses: VirtualFinancialItem[] = (form.plData.indirectExpenses || []).map(e => {
      const l = e.name.toLowerCase();
      if (l.includes('depr')) {
        return { id: e.id, name: e.name, amount: projDeprTotal };
      } else if (l.includes('bank') || l.includes('cc') || l.includes('interest')) {
        return { id: e.id, name: e.name, amount: r2(e.amount * ccLimitGrowth) };
      } else {
        return { id: e.id, name: e.name, amount: r2(e.amount * inflation) };
      }
    });
    if (!projIndirectExpenses.some(e => e.name.toLowerCase().includes('depr')) && projDeprTotal > 0) {
      projIndirectExpenses.push({ id: 'proj-depr', name: 'To Depreciation', amount: projDeprTotal });
    }
    const projIndirectExpTotal = r2(sum(projIndirectExpenses));

    // 4. Net Profit
    const projNetProfit = r2(projGrossProfit + projIndirectIncTotal - projIndirectExpTotal);
    const plDebitTotal = r2(projIndirectExpTotal + (projNetProfit > 0 ? projNetProfit : 0));
    const plCreditTotal = r2(projGrossProfit + projIndirectIncTotal + (projNetProfit < 0 ? Math.abs(projNetProfit) : 0));

    // 5. Partners Capital Projection (Annexure A)
    const drawingsGrowth = 1 + ((config.drawingsGrowthPct ?? 20) / 100);
    const targetIntRate = config.interestRatePct ?? 8.0;

    const projPartners: VirtualPartnerItem[] = currentPartners.map(p => {
      const op = p.closingBal || p.openingBal;
      const iAmt = r2(op * (targetIntRate / 100));
      const pShare = r2(projNetProfit * ((Number(p.sharePct) || 0) / 100));
      const sal = r2(p.salary);
      const add = 0;
      const tot = r2(op + add + sal + iAmt + pShare);
      const wAmt = r2(p.withdrawalsAmt * drawingsGrowth);
      const close = r2(tot - wAmt);
      return {
        ...p,
        openingBal: op,
        addition: add,
        salary: sal,
        interestRate: targetIntRate,
        interestAmt: iAmt,
        profitShare: pShare,
        total: tot,
        withdrawalsAmt: wAmt,
        closingBal: close,
      };
    });
    const projTotalClosingCapital = r2(projPartners.reduce((s, p) => s + (p.closingBal || 0), 0));

    // 6. Balance Sheet Projections
    const projCapitalItems: VirtualFinancialItem[] = projPartners.map((p, idx) => ({
      id: `cap-proj-${idx}`,
      name: `${p.name} CAPITAL`,
      amount: p.closingBal || 0,
    }));
    const projSecuredLoans: VirtualFinancialItem[] = (form.bsSections.securedLoans || []).map(l => {
      const lower = l.name.toLowerCase();
      if (lower.includes('cc') || lower.includes('bank')) {
        return { id: l.id, name: l.name, amount: r2(l.amount * ccLimitGrowth) };
      }
      return { id: l.id, name: l.name, amount: l.amount };
    });
    const projUnsecuredLoans: VirtualFinancialItem[] = (form.bsSections.unsecuredLoans || []).map(l => ({ ...l }));

    // Trade credit scales with purchases
    const basePurchases = form.plData.trading.purchases || 1;
    const projCurrLiabilities: VirtualFinancialItem[] = (form.bsSections.currentLiabilities || []).map(c => {
      const lower = c.name.toLowerCase();
      if (lower.includes('creditor')) {
        const ratio = c.amount / basePurchases;
        return { id: c.id, name: c.name, amount: r2(projPurchases * ratio) };
      } else {
        return { id: c.id, name: c.name, amount: r2(c.amount * inflation) };
      }
    });

    const capitalTotal = projTotalClosingCapital;
    const securedTotal = r2(sum(projSecuredLoans));
    const unsecuredTotal = r2(sum(projUnsecuredLoans));
    const currLiabTotal = r2(sum(projCurrLiabilities));
    const totalLiabilities = r2(capitalTotal + securedTotal + unsecuredTotal + currLiabTotal);

    // Assets Projection
    const projFixedAssets: VirtualFinancialItem[] = projFASchedule.map(fa => ({
      id: fa.id,
      name: fa.name,
      amount: fa.closingBal || 0,
    }));
    const fixedAssetTotal = projTotalClosingFA;

    const projSecurityDeposits: VirtualFinancialItem[] = (form.bsSections.securityDeposits || []).map(s => ({ ...s }));
    const securityDepositsTotal = r2(sum(projSecurityDeposits));

    // Current Assets Projection
    const baseSales = form.plData.trading.sales || 1;
    const projCurrAssets: VirtualFinancialItem[] = (form.bsSections.currentAssets || []).map(a => {
      const lower = a.name.toLowerCase();
      if (lower.includes('stock')) {
        return { id: a.id, name: a.name, amount: projClosingStock };
      } else if (lower.includes('debtor')) {
        const ratio = a.amount / baseSales;
        return { id: a.id, name: a.name, amount: r2(projSales * ratio) };
      } else if (lower.includes('cash')) {
        return { id: a.id, name: a.name, amount: 0 };
      } else {
        return { id: a.id, name: a.name, amount: a.amount };
      }
    });

    const nonCashAssets = r2(
      fixedAssetTotal +
      securityDepositsTotal +
      sum(projCurrAssets.filter(a => !a.name.toLowerCase().includes('cash')))
    );
    const balancingCash = r2(totalLiabilities - nonCashAssets);

    const finalProjCurrAssets = projCurrAssets.map(a => {
      if (a.name.toLowerCase().includes('cash')) {
        return { ...a, amount: balancingCash };
      }
      return a;
    });
    if (!finalProjCurrAssets.some(a => a.name.toLowerCase().includes('cash'))) {
      finalProjCurrAssets.push({ id: 'proj-cash', name: 'Cash-in-hand', amount: balancingCash });
    }

    const currAssetTotal = r2(sum(finalProjCurrAssets));
    const totalAssets = r2(fixedAssetTotal + securityDepositsTotal + currAssetTotal);
    const diff = r2(totalLiabilities - totalAssets);

    const projBSSections: VirtualBSSections = {
      capitalItems: projCapitalItems,
      securedLoans: projSecuredLoans,
      unsecuredLoans: projUnsecuredLoans,
      currentLiabilities: projCurrLiabilities,
      fixedAssets: projFixedAssets,
      securityDeposits: projSecurityDeposits,
      currentAssets: finalProjCurrAssets,
    };

    const projPLData: VirtualPLData = {
      trading: {
        openingStock: projOpeningStock,
        purchases: projPurchases,
        directExpenses: projDirectExpenses,
        sales: projSales,
        closingStock: projClosingStock,
      },
      indirectIncomes: projIndirectIncomes,
      indirectExpenses: projIndirectExpenses,
    };

    const yearRes: VirtualProjectedYearResult = {
      yearNumber: y,
      yearLabel,
      fromDateStr,
      toDateStr,
      asOnDateStr,
      salesTotal: projSales,
      purchaseTotal: projPurchases,
      openingStock: projOpeningStock,
      closingStock: projClosingStock,
      directExpTotal: projDirectExpTotal,
      indirectExpTotal: projIndirectExpTotal,
      indirectIncTotal: projIndirectIncTotal,
      grossProfit: projGrossProfit,
      netProfit: projNetProfit,
      tradingDebitTotal,
      tradingCreditTotal,
      plDebitTotal,
      plCreditTotal,
      calculatedPartners: projPartners,
      totalClosingCapital: projTotalClosingCapital,
      calculatedFASchedule: projFASchedule,
      totalClosingFA: projTotalClosingFA,
      totalDepreciation: projDeprTotal,
      capitalTotal,
      securedTotal,
      unsecuredTotal,
      currLiabTotal,
      totalLiabilities,
      fixedAssetTotal,
      securityDepositsTotal,
      currAssetTotal,
      balancingCash,
      totalAssets,
      isBalanced: Math.abs(diff) < 0.01,
      diff,
      projBSSections,
      projPLData,
    };

    results.push(yearRes);

    // Iterative update for next horizon year
    currentSales = projSales;
    currentPurchases = projPurchases;
    currentClosingStock = projClosingStock;
    currentPartners = projPartners;
    currentFASchedule = projFASchedule;
  }

  return results;
}
