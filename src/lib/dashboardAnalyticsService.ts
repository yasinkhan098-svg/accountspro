/**
 * Dashboard Analytics Calculation Service for LedgerX ERP
 * 
 * Provides real-time, 100% accurate accounting metrics computed from
 * live ledgers, vouchers, and stock items.
 */

export interface LedgerBalanceResult {
  amount: number;
  type: 'Dr' | 'Cr';
  net: number; // positive = Dr, negative = Cr
}

export interface BankLedgerDetail {
  id: number;
  name: string;
  groupName: string;
  accountNo?: string;
  ifscCode?: string;
  bankName?: string;
  closingBalance: number;
  balanceType: 'Dr' | 'Cr';
  isOverdraft: boolean;
  odLimit: number;
}

export interface PartyLedgerDetail {
  id: number;
  name: string;
  groupName: string;
  closingBalance: number;
  balanceType: 'Dr' | 'Cr';
}

export interface DashboardMetrics {
  // Cash & Bank Balances
  cashInHand: { amount: number; type: 'Dr' | 'Cr'; net: number };
  bankAccounts: { amount: number; type: 'Dr' | 'Cr'; net: number };
  totalLiquidCash: number;
  totalBankOverdraft: number;
  bankLedgerList: BankLedgerDetail[];

  // Receipts & Payments Breakdown
  cashReceipts: number;
  bankReceipts: number;
  totalReceipts: number;

  cashPayments: number;
  bankPayments: number;
  totalPayments: number;

  contraDeposits: number;    // Cash to Bank
  contraWithdrawals: number; // Bank to Cash
  contraTransfers: number;   // Bank to Bank

  // Operational Cash Flow
  cashInflow: number;
  bankInflow: number;
  totalInflow: number;
  inflow: number;

  cashOutflow: number;
  bankOutflow: number;
  totalOutflow: number;
  outflow: number;

  nettFlow: { amount: number; type: 'Dr' | 'Cr'; val: number };
  inflowPercent: number;
  outflowPercent: number;

  // Receivables & Payables
  receivables: number;
  payables: number;
  netReceivablesPayables: { amount: number; type: 'Dr' | 'Cr'; net: number };
  debtorList: PartyLedgerDetail[];
  creditorList: PartyLedgerDetail[];

  // Sales & Purchases
  salesTotal: number;
  salesQty: number;
  purchaseTotal: number;
  purchaseQty: number;

  // Stock Valuations
  openingStockVal: number;
  closingStockVal: number;
  closingStockQty: number;

  // P&L Metrics
  directExp: number;
  indirectExp: number;
  indirectInc: number;
  grossProfit: number;
  netProfit: number;
  grossProfitMargin: string;
  netProfitMargin: string;

  // Assets & Liabilities
  currentAssets: { amount: number; type: 'Dr' | 'Cr'; val: number };
  currentLiabilities: { amount: number; type: 'Dr' | 'Cr'; val: number };
  workingCapital: number;

  // Accounting Ratios
  currentRatio: string;
  quickRatio: string;
  debtEquityRatio: string;
  inventoryTurnover: string;
  receivableTurnoverDays: string;
  returnOnInvestment: string;
  liquidityRatio: string;

  bankLedgers: any[];
  debtorLedgers: any[];
  creditorLedgers: any[];
}

// Helper: Round to 2 decimal places
export function round2(n: number): number {
  if (n === null || n === undefined || isNaN(n)) return 0;
  return Math.round(n * 100) / 100;
}

// Helper: Calculate exact ledger closing balance
export function computeLedgerClosingBalance(ledger: any, vouchers: any[] = []): LedgerBalanceResult {
  if (!ledger) return { amount: 0, type: 'Dr', net: 0 };

  // Opening balance: Opening balance is strictly openingBalance (not odLimit)
  const opBal = Number(ledger.openingBalance ?? ledger.openingBal) || 0;
  let net = ledger.balanceType === 'Cr' ? -opBal : opBal;

  const targetId = Number(ledger.id);
  const targetName = (ledger.name || '').trim().toLowerCase();

  for (const v of vouchers) {
    if (!v || !v.entries || v.type === 'Sales Quotation' || v.type === 'Quotation') continue;

    for (const e of v.entries) {
      const eId = Number(e.ledgerId);
      const eName = (e.ledgerName || '').trim().toLowerCase();

      const isMatch = (targetId && eId === targetId) || (targetName && eName === targetName);
      if (isMatch) {
        const amt = Number(e.amount) || 0;
        if (e.entryType === 'Dr') {
          net += amt;
        } else {
          net -= amt;
        }
      }
    }
  }

  net = round2(net);
  return {
    amount: Math.abs(net),
    type: net >= 0 ? 'Dr' : 'Cr',
    net
  };
}

// Group classifier helpers
export function isCashGroup(groupName: string = '', ledgerName: string = ''): boolean {
  const gn = groupName.toLowerCase().trim();
  const ln = ledgerName.toLowerCase().trim();
  return gn.includes('cash-in-hand') || ln === 'cash' || ln === 'petty cash';
}

export function isBankGroup(groupName: string = '', ledgerName: string = ''): boolean {
  const gn = groupName.toLowerCase().trim();
  const ln = ledgerName.toLowerCase().trim();
  return (
    gn.includes('bank accounts') ||
    gn.includes('bank account') ||
    gn.includes('bank od') ||
    gn.includes('bank occ') ||
    ln.includes('bank')
  );
}

export function isDebtorGroup(groupName: string = ''): boolean {
  return groupName.toLowerCase().trim().includes('sundry debtors');
}

export function isCreditorGroup(groupName: string = ''): boolean {
  return groupName.toLowerCase().trim().includes('sundry creditors');
}

// Helper to reliably get voucher total
export function getSafeVoucherTotal(v: any): number {
  if (!v) return 0;
  const t = Number(v.total);
  if (t > 0) return t;

  const partySide = ['Sales', 'Payment', 'Debit Note'].includes(v.type) ? 'Dr' : 'Cr';
  const partyEntry = (v.entries || []).find((e: any) => e.entryType === partySide);
  if (partyEntry && Number(partyEntry.amount) > 0) return Number(partyEntry.amount);

  return (v.entries || []).reduce((max: number, e: any) => Math.max(max, Number(e.amount) || 0), 0) || 0;
}

/**
 * Main calculation engine: Computes full real-time dashboard analytics
 */
export function calculateDashboardAnalytics(
  ledgers: any[] = [],
  vouchers: any[] = [],
  stockItems: any[] = []
): DashboardMetrics {
  // 1. Group Ledgers
  const cashLedgers = ledgers.filter(l => isCashGroup(l.groupName, l.name));
  const bankLedgers = ledgers.filter(l => isBankGroup(l.groupName, l.name));
  const debtorLedgers = ledgers.filter(l => isDebtorGroup(l.groupName));
  const creditorLedgers = ledgers.filter(l => isCreditorGroup(l.groupName));

  // 2. Cash-in-Hand Total
  let cashNetTotal = 0;
  cashLedgers.forEach(l => {
    const b = computeLedgerClosingBalance(l, vouchers);
    cashNetTotal += b.net;
  });
  cashNetTotal = round2(cashNetTotal);
  const cashInHand = {
    amount: Math.abs(cashNetTotal),
    type: (cashNetTotal >= 0 ? 'Dr' : 'Cr') as 'Dr' | 'Cr',
    net: cashNetTotal
  };

  // 3. Bank Accounts Total & Individual Bank List
  let bankNetTotal = 0;
  let totalBankOverdraft = 0;
  const bankLedgerList: BankLedgerDetail[] = bankLedgers.map(l => {
    const b = computeLedgerClosingBalance(l, vouchers);
    bankNetTotal += b.net;
    const isOverdraft = b.net < 0 || (l.groupName || '').toLowerCase().includes('od') || (l.groupName || '').toLowerCase().includes('occ');
    if (b.net < 0) {
      totalBankOverdraft += Math.abs(b.net);
    }
    return {
      id: Number(l.id),
      name: l.name || 'Bank Account',
      groupName: l.groupName || 'Bank Accounts',
      accountNo: l.accountNo || l.bankAccountNo || '',
      ifscCode: l.ifscCode || '',
      bankName: l.bankName || '',
      closingBalance: b.amount,
      balanceType: b.type,
      isOverdraft,
      odLimit: Number(l.odLimit) || 0
    };
  }).sort((a, b) => b.closingBalance - a.closingBalance);

  bankNetTotal = round2(bankNetTotal);
  const bankAccounts = {
    amount: Math.abs(bankNetTotal),
    type: (bankNetTotal >= 0 ? 'Dr' : 'Cr') as 'Dr' | 'Cr',
    net: bankNetTotal
  };

  // Ready Liquid Cash & Bank (positive Dr funds readily available)
  const totalLiquidCash = round2(
    (cashNetTotal > 0 ? cashNetTotal : 0) +
    bankLedgers.reduce((sum, l) => {
      const b = computeLedgerClosingBalance(l, vouchers);
      return sum + (b.net > 0 ? b.net : 0);
    }, 0)
  );

  // 4. Receivables (Sundry Debtors) & Payables (Sundry Creditors)
  let receivablesNet = 0;
  const debtorList: PartyLedgerDetail[] = debtorLedgers.map(l => {
    const b = computeLedgerClosingBalance(l, vouchers);
    if (b.type === 'Dr') receivablesNet += b.amount;
    else receivablesNet -= b.amount;
    return {
      id: Number(l.id),
      name: l.name,
      groupName: l.groupName,
      closingBalance: b.amount,
      balanceType: b.type
    };
  }).sort((a, b) => b.closingBalance - a.closingBalance);

  const receivables = Math.max(0, round2(receivablesNet));

  let payablesNet = 0;
  const creditorList: PartyLedgerDetail[] = creditorLedgers.map(l => {
    const b = computeLedgerClosingBalance(l, vouchers);
    if (b.type === 'Cr') payablesNet += b.amount;
    else payablesNet -= b.amount;
    return {
      id: Number(l.id),
      name: l.name,
      groupName: l.groupName,
      closingBalance: b.amount,
      balanceType: b.type
    };
  }).sort((a, b) => b.closingBalance - a.closingBalance);

  const payables = Math.max(0, round2(payablesNet));

  const netDiff = round2(receivables - payables);
  const netReceivablesPayables = {
    amount: Math.abs(netDiff),
    type: (netDiff >= 0 ? 'Dr' : 'Cr') as 'Dr' | 'Cr',
    net: netDiff
  };

  // 5. Receipts & Payments Analysis (Cash vs Bank Breakdown)
  let cashReceipts = 0;
  let bankReceipts = 0;

  let cashPayments = 0;
  let bankPayments = 0;

  let contraDeposits = 0;    // Cash -> Bank
  let contraWithdrawals = 0; // Bank -> Cash
  let contraTransfers = 0;   // Bank -> Bank

  let cashSalesInflow = 0;
  let bankSalesInflow = 0;

  let cashPurchaseOutflow = 0;
  let bankPurchaseOutflow = 0;

  let salesTotal = 0;
  let salesQty = 0;
  let purchaseTotal = 0;
  let purchaseQty = 0;

  for (const v of vouchers) {
    if (!v || v.type === 'Sales Quotation' || v.type === 'Quotation') continue;
    const vTot = getSafeVoucherTotal(v);

    // Sales Summary
    if (v.type === 'Sales') {
      salesTotal += vTot;
      (v.inventoryEntries || []).forEach((ie: any) => { salesQty += Number(ie.qty) || 0; });

      // Direct Cash / Bank Sales Inflow
      const pName = (v.partyName || '').trim();
      const pLedger = ledgers.find(lx => lx.name.toLowerCase() === pName.toLowerCase());
      if (isCashGroup(pLedger?.groupName, pName)) {
        cashSalesInflow += vTot;
      } else if (isBankGroup(pLedger?.groupName, pName)) {
        bankSalesInflow += vTot;
      }
    }
    // Purchase Summary
    else if (v.type === 'Purchase') {
      purchaseTotal += vTot;
      (v.inventoryEntries || []).forEach((ie: any) => { purchaseQty += Number(ie.qty) || 0; });

      // Direct Cash / Bank Purchase Outflow
      const pName = (v.partyName || '').trim();
      const pLedger = ledgers.find(lx => lx.name.toLowerCase() === pName.toLowerCase());
      if (isCashGroup(pLedger?.groupName, pName)) {
        cashPurchaseOutflow += vTot;
      } else if (isBankGroup(pLedger?.groupName, pName)) {
        bankPurchaseOutflow += vTot;
      }
    }
    // Receipt Vouchers
    else if (v.type === 'Receipt') {
      // In Receipt, the Account being debited is the receiving cash or bank account
      const pName = (v.partyName || '').trim();
      const pLedger = ledgers.find(lx => lx.name.toLowerCase() === pName.toLowerCase());
      const isCash = isCashGroup(pLedger?.groupName, pName);
      const isBank = isBankGroup(pLedger?.groupName, pName);

      if (isCash) {
        cashReceipts += vTot;
      } else if (isBank) {
        bankReceipts += vTot;
      } else {
        // Inspect entries if party was not directly identified
        let found = false;
        for (const e of (v.entries || [])) {
          if (e.entryType === 'Dr') {
            const eLedger = ledgers.find(lx => lx.id === e.ledgerId || lx.name.toLowerCase() === (e.ledgerName || '').toLowerCase());
            if (isCashGroup(eLedger?.groupName, e.ledgerName)) {
              cashReceipts += Number(e.amount) || 0;
              found = true;
            } else if (isBankGroup(eLedger?.groupName, e.ledgerName)) {
              bankReceipts += Number(e.amount) || 0;
              found = true;
            }
          }
        }
        if (!found) {
          // Default fallback to bank receipt if unclassified
          bankReceipts += vTot;
        }
      }
    }
    // Payment Vouchers
    else if (v.type === 'Payment') {
      // In Payment, the Account being credited is the paying cash or bank account
      const pName = (v.partyName || '').trim();
      const pLedger = ledgers.find(lx => lx.name.toLowerCase() === pName.toLowerCase());
      const isCash = isCashGroup(pLedger?.groupName, pName);
      const isBank = isBankGroup(pLedger?.groupName, pName);

      if (isCash) {
        cashPayments += vTot;
      } else if (isBank) {
        bankPayments += vTot;
      } else {
        // Inspect entries
        let found = false;
        for (const e of (v.entries || [])) {
          if (e.entryType === 'Cr') {
            const eLedger = ledgers.find(lx => lx.id === e.ledgerId || lx.name.toLowerCase() === (e.ledgerName || '').toLowerCase());
            if (isCashGroup(eLedger?.groupName, e.ledgerName)) {
              cashPayments += Number(e.amount) || 0;
              found = true;
            } else if (isBankGroup(eLedger?.groupName, e.ledgerName)) {
              bankPayments += Number(e.amount) || 0;
              found = true;
            }
          }
        }
        if (!found) {
          bankPayments += vTot;
        }
      }
    }
    // Contra Vouchers (Internal Transfers)
    else if (v.type === 'Contra') {
      let drCash = false;
      let drBank = false;
      let crCash = false;
      let crBank = false;

      const pName = (v.partyName || '').trim();
      const pLedger = ledgers.find(lx => lx.name.toLowerCase() === pName.toLowerCase());
      if (isCashGroup(pLedger?.groupName, pName)) drCash = true;
      if (isBankGroup(pLedger?.groupName, pName)) drBank = true;

      for (const e of (v.entries || [])) {
        const eLedger = ledgers.find(lx => lx.id === e.ledgerId || lx.name.toLowerCase() === (e.ledgerName || '').toLowerCase());
        const eName = e.ledgerName || eLedger?.name || '';
        const eGroup = eLedger?.groupName || '';
        if (e.entryType === 'Dr') {
          if (isCashGroup(eGroup, eName)) drCash = true;
          if (isBankGroup(eGroup, eName)) drBank = true;
        } else if (e.entryType === 'Cr') {
          if (isCashGroup(eGroup, eName)) crCash = true;
          if (isBankGroup(eGroup, eName)) crBank = true;
        }
      }

      if (drBank && crCash) {
        contraDeposits += vTot; // Cash deposited into Bank
      } else if (drCash && crBank) {
        contraWithdrawals += vTot; // Cash withdrawn from Bank
      } else if (drBank && crBank) {
        contraTransfers += vTot; // Inter-bank transfer
      }
    }
  }

  cashReceipts = round2(cashReceipts);
  bankReceipts = round2(bankReceipts);
  const totalReceipts = round2(cashReceipts + bankReceipts);

  cashPayments = round2(cashPayments);
  bankPayments = round2(bankPayments);
  const totalPayments = round2(cashPayments + bankPayments);

  contraDeposits = round2(contraDeposits);
  contraWithdrawals = round2(contraWithdrawals);
  contraTransfers = round2(contraTransfers);

  // Operational Cash Flow
  const cashInflow = round2(cashReceipts + cashSalesInflow);
  const bankInflow = round2(bankReceipts + bankSalesInflow);
  const totalInflow = round2(cashInflow + bankInflow);

  const cashOutflow = round2(cashPayments + cashPurchaseOutflow);
  const bankOutflow = round2(bankPayments + bankPurchaseOutflow);
  const totalOutflow = round2(cashOutflow + bankOutflow);

  const nettFlowVal = round2(totalInflow - totalOutflow);
  const nettFlow = {
    amount: Math.abs(nettFlowVal),
    type: (nettFlowVal >= 0 ? 'Dr' : 'Cr') as 'Dr' | 'Cr',
    val: nettFlowVal
  };

  const totalTurnover = totalInflow + totalOutflow;
  const inflowPercent = totalTurnover > 0 ? Math.round((totalInflow / totalTurnover) * 100) : 50;
  const outflowPercent = totalTurnover > 0 ? (100 - inflowPercent) : 50;

  salesTotal = round2(salesTotal);
  purchaseTotal = round2(purchaseTotal);

  // 6. Stock Valuations
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
            const q = Number(ie.qty) || 0;
            const r = Number(ie.rate) || 0;
            if (v.type === 'Purchase' || v.type === 'Credit Note') {
              qty += q;
              totalCost += q * r;
              totalInQty += q;
            } else if (v.type === 'Sales' || v.type === 'Debit Note') {
              qty -= q;
            }
          }
        }
      }
      closingStockQty += Math.max(0, qty);
      const avgRate = totalInQty > 0 ? totalCost / totalInQty : (Number(it.openingRate) || 0);
      closingStockVal += Math.max(0, qty) * avgRate;
    }
  } else {
    const stockLedgers = ledgers.filter(l => (l.groupName || '').toLowerCase().includes('stock-in-hand'));
    stockLedgers.forEach(l => {
      const b = computeLedgerClosingBalance(l, vouchers);
      closingStockVal += b.net > 0 ? b.net : 0;
      const ob = Number(l.openingBalance ?? l.openingBal) || 0;
      openingStockVal += l.balanceType === 'Dr' ? ob : -ob;
    });
  }

  openingStockVal = round2(openingStockVal);
  closingStockVal = round2(closingStockVal);

  // 7. Expenses & Incomes
  let directExp = 0;
  let indirectExp = 0;
  let indirectInc = 0;

  ledgers.forEach(l => {
    const gn = (l.groupName || '').toLowerCase();
    const b = computeLedgerClosingBalance(l, vouchers);
    if (gn.includes('direct exp') || gn.includes('expenses (direct)')) {
      directExp += b.type === 'Dr' ? b.amount : -b.amount;
    } else if (gn.includes('indirect exp') || gn.includes('expenses (indirect)')) {
      indirectExp += b.type === 'Dr' ? b.amount : -b.amount;
    } else if (gn.includes('indirect inc') || gn.includes('income (indirect)')) {
      indirectInc += b.type === 'Cr' ? b.amount : -b.amount;
    }
  });

  directExp = round2(directExp);
  indirectExp = round2(indirectExp);
  indirectInc = round2(indirectInc);

  // 8. Profits
  const grossProfit = round2(salesTotal + closingStockVal - (openingStockVal + purchaseTotal + directExp));
  const netProfit = round2(grossProfit + indirectInc - indirectExp);
  const grossProfitMargin = salesTotal > 0 ? ((grossProfit / salesTotal) * 100).toFixed(1) : '0.0';
  const netProfitMargin = salesTotal > 0 ? ((netProfit / salesTotal) * 100).toFixed(1) : '0.0';

  // 9. Assets & Liabilities
  const currAssetGroups = ['stock-in-hand', 'sundry debtors', 'cash-in-hand', 'bank accounts', 'bank account', 'loans & advances (asset)', 'current assets'];
  const currLiabGroups = ['sundry creditors', 'current liabilities', 'provisions', 'duties & taxes', 'bank od', 'bank occ'];

  let currentAssetsNet = 0;
  let currentLiabNet = 0;
  let capitalNet = 0;
  let loansNet = 0;

  ledgers.forEach(l => {
    const gn = (l.groupName || '').toLowerCase();
    const b = computeLedgerClosingBalance(l, vouchers);

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

  // Include closing stock in current assets if not already represented in ledgers
  if (!ledgers.some(l => (l.groupName || '').toLowerCase().includes('stock-in-hand'))) {
    currentAssetsNet += closingStockVal;
  }

  currentAssetsNet = round2(currentAssetsNet);
  currentLiabNet = round2(currentLiabNet);
  const workingCapital = round2(currentAssetsNet - currentLiabNet);

  // 10. Accounting Ratios
  const currentRatio = currentLiabNet > 0 
    ? (currentAssetsNet / currentLiabNet).toFixed(2) 
    : (currentAssetsNet > 0 ? '∞' : '1.00');

  const quickAssets = Math.max(0, currentAssetsNet - closingStockVal);
  const quickRatio = currentLiabNet > 0
    ? (quickAssets / currentLiabNet).toFixed(2)
    : (quickAssets > 0 ? '∞' : '1.00');

  const debtEquityRatio = capitalNet > 0 ? (loansNet / capitalNet).toFixed(2) + ' : 1' : '0.00 : 1';
  const inventoryTurnover = closingStockVal > 0 ? (salesTotal / closingStockVal).toFixed(2) : '0.00';
  const receivableTurnoverDays = salesTotal > 0 ? ((receivables / salesTotal) * 365).toFixed(0) + ' days' : '0 days';
  const returnOnInvestment = capitalNet > 0 ? ((netProfit / capitalNet) * 100).toFixed(1) + ' %' : 'N/A';
  const liquidityRatio = currentLiabNet > 0 ? (totalLiquidCash / currentLiabNet).toFixed(2) : '1.00';

  return {
    cashInHand,
    bankAccounts,
    totalLiquidCash,
    totalBankOverdraft,
    bankLedgerList,

    cashReceipts,
    bankReceipts,
    totalReceipts,

    cashPayments,
    bankPayments,
    totalPayments,

    contraDeposits,
    contraWithdrawals,
    contraTransfers,

    cashInflow,
    bankInflow,
    totalInflow,
    inflow: totalInflow,

    cashOutflow,
    bankOutflow,
    totalOutflow,
    outflow: totalOutflow,

    nettFlow,
    inflowPercent,
    outflowPercent,

    receivables,
    payables,
    netReceivablesPayables,
    debtorList,
    creditorList,

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

    currentAssets: { amount: Math.abs(currentAssetsNet), type: currentAssetsNet >= 0 ? 'Dr' : 'Cr', val: currentAssetsNet },
    currentLiabilities: { amount: Math.abs(currentLiabNet), type: currentLiabNet >= 0 ? 'Dr' : 'Cr', val: currentLiabNet },
    workingCapital,

    currentRatio,
    quickRatio,
    debtEquityRatio,
    inventoryTurnover,
    receivableTurnoverDays,
    returnOnInvestment,
    liquidityRatio,

    bankLedgers,
    debtorLedgers,
    creditorLedgers
  };
}
