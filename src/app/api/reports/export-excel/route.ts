import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ─── Group Mappings ────────────────────────────────────────────────────────
const CAPITAL_GROUPS        = ['Capital Account', 'Reserves & Surplus', 'Retained Earnings'];
const SECURED_LOAN_GROUPS   = ['Secured Loans', 'Bank OD A/c', 'Bank OCC A/c'];
const UNSECURED_LOAN_GROUPS = ['Unsecured Loans'];
const CURRENT_LIAB_GROUPS   = ['Sundry Creditors', 'Current Liabilities', 'Provisions', 'Duties & Taxes'];
const FIXED_ASSET_GROUPS    = ['Fixed Assets'];
const INVESTMENT_GROUPS     = ['Investments', 'Deposits (Asset)', 'Misc. Expenses (ASSET)'];
const CURRENT_ASSET_GROUPS  = ['Stock-in-hand', 'Sundry Debtors', 'Cash-in-hand', 'Bank Accounts', 'Loans & Advances (Asset)', 'Current Assets'];
const SALES_GROUPS          = ['Sales Accounts', 'Direct Incomes', 'Income (Direct)'];
const PURCHASE_GROUPS       = ['Purchase Accounts'];
const DIRECT_EXP_GROUPS     = ['Direct Expenses', 'Expenses (Direct)'];
const INDIRECT_EXP_GROUPS   = ['Indirect Expenses', 'Expenses (Indirect)'];
const INDIRECT_INC_GROUPS   = ['Indirect Incomes', 'Income (Indirect)'];
const STOCK_GROUPS          = ['Stock-in-hand'];

// ─── Helpers ───────────────────────────────────────────────────────────────
function parseReportDate(d: string | null | undefined, endOfDay = false): Date | null {
  if (!d) return null;
  const s = String(d).trim();
  if (!s) return null;
  const months: Record<string, number> = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
  };
  const parts = s.replace(/[\.\/]/g, '-').split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const y = parseInt(parts[0]);
      const m = (parseInt(parts[1]) || 1) - 1;
      const day = parseInt(parts[2]) || 1;
      return new Date(y, m, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    } else {
      const day = parseInt(parts[0]) || 1;
      const mKey = parts[1].toLowerCase().slice(0, 3);
      const m = months[mKey] ?? ((parseInt(parts[1]) || 1) - 1);
      const y = parseInt(parts[2]) || new Date().getFullYear();
      return new Date(y, m, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    }
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    if (endOfDay) parsed.setHours(23, 59, 59, 999);
    else parsed.setHours(0, 0, 0, 0);
    return parsed;
  }
  return null;
}

function formatDotDate(d: Date | null): string {
  if (!d || isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatDashDate(d: Date | null): string {
  if (!d || isNaN(d.getTime())) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatOrdinalDate(d: Date | null): string {
  if (!d || isNaN(d.getTime())) return '';
  const day = d.getDate();
  let ord = 'TH';
  if (day === 1 || day === 21 || day === 31) ord = 'ST';
  else if (day === 2 || day === 22) ord = 'ND';
  else if (day === 3 || day === 23) ord = 'RD';
  const fullMonths = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  return `${day}${ord} ${fullMonths[d.getMonth()]} ${d.getFullYear()}`;
}

function getLedgerBalance(ledger: any, vouchers: any[]) {
  let dr = ledger.balanceType === 'Dr' ? (ledger.openingBal ?? 0) : 0;
  let cr = ledger.balanceType === 'Cr' ? (ledger.openingBal ?? 0) : 0;
  for (const v of vouchers) {
    for (const e of v.entries) {
      if (e.ledgerId === ledger.id) {
        if (e.entryType === 'Dr') dr += e.amount;
        else cr += e.amount;
      }
    }
  }
  const net = dr - cr;
  return net >= 0 ? { balance: net, type: 'Dr' } : { balance: Math.abs(net), type: 'Cr' };
}

function buildLiabSection(ledgers: any[], groups: string[], vouchers: any[]) {
  return ledgers.filter(l => groups.includes(l.groupName)).map(l => {
    const { balance, type } = getLedgerBalance(l, vouchers);
    const amt = (type === 'Cr') ? balance : -balance;
    return { name: l.name, amount: amt };
  }).filter(i => Math.abs(i.amount) > 0.001);
}

function buildAssetSection(ledgers: any[], groups: string[], vouchers: any[]) {
  return ledgers.filter(l => groups.includes(l.groupName)).map(l => {
    const { balance, type } = getLedgerBalance(l, vouchers);
    const amt = (type === 'Dr') ? balance : -balance;
    return { name: l.name, amount: amt };
  }).filter(i => Math.abs(i.amount) > 0.001);
}

function buildExpense(ledgers: any[], groups: string[], vouchers: any[]) {
  return ledgers.filter(l => groups.includes(l.groupName)).map(l => {
    const { balance, type } = getLedgerBalance(l, vouchers);
    return { name: l.name, amount: type === 'Dr' ? balance : -balance };
  }).filter(i => Math.abs(i.amount) > 0.001);
}

function buildIncome(ledgers: any[], groups: string[], vouchers: any[]) {
  return ledgers.filter(l => groups.includes(l.groupName)).map(l => {
    const { balance, type } = getLedgerBalance(l, vouchers);
    return { name: l.name, amount: type === 'Cr' ? balance : -balance };
  }).filter(i => Math.abs(i.amount) > 0.001);
}

const sum = (arr: any[]) => arr.reduce((s, i) => s + i.amount, 0);

function fmt(n: number): string {
  return Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Style Helpers ─────────────────────────────────────────────────────────
const RED   = { argb: 'FFCC0000' } as ExcelJS.Color;
const BLACK = { argb: 'FF000000' } as ExcelJS.Color;
const DARK_BG = { argb: 'FFD3D3D3' } as ExcelJS.Color;

function applyBorder(cell: ExcelJS.Cell, sides: string[] = ['top','left','bottom','right']) {
  const border: any = {};
  sides.forEach(s => (border[s] = { style: 'thin', color: { argb: 'FF000000' } }));
  cell.border = border;
}

// ─── Main Export Handler ───────────────────────────────────────────────────
async function generateExcelResponse(req: Request, postBody?: any) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = postBody?.companyId || searchParams.get('companyId');
    const asOnDate  = postBody?.asOnDate  || searchParams.get('asOnDate');
    const fromDate  = postBody?.fromDate  || searchParams.get('fromDate');
    const toDate    = postBody?.toDate    || searchParams.get('toDate');
    const caName    = postBody?.caName    || searchParams.get('caName') || 'C.A NAME';
    const caMno     = postBody?.caMno     || searchParams.get('caMno')  || '000000';
    const place     = postBody?.place     || searchParams.get('place')  || '';
    const rawSignatory = postBody?.signatoryTitle || searchParams.get('signatoryTitle') || 'PARTNER';

    let signatoryTitle = (rawSignatory || 'PARTNER').trim();
    if (signatoryTitle.toLowerCase() === 'proprietorship') {
      signatoryTitle = 'PROPRIETOR';
    } else if (signatoryTitle.toLowerCase() === 'partnership') {
      signatoryTitle = 'PARTNER';
    }
    signatoryTitle = signatoryTitle.toUpperCase();

    // Parse partnersData
    let inputPartners: any[] = [];
    const partnersDataRaw = postBody?.partnersData || searchParams.get('partnersData');
    if (Array.isArray(partnersDataRaw)) {
      inputPartners = partnersDataRaw;
    } else if (typeof partnersDataRaw === 'string') {
      try {
        inputPartners = JSON.parse(decodeURIComponent(partnersDataRaw));
      } catch {
        try {
          inputPartners = JSON.parse(partnersDataRaw);
        } catch {}
      }
    }

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId required' }, { status: 400 });
    }

    const cid = parseInt(companyId);
    const company = await prisma.company.findUnique({
      where: { id: cid },
      select: {
        id: true,
        name: true,
        mailingName: true,
        address: true,
        state: true,
        pinCode: true,
        telephone: true,
        mobile: true,
        email: true,
        gstin: true,
        financialYearStart: true,
        booksBeginFrom: true,
      }
    });
    if (!company) return NextResponse.json({ success: false, error: 'Company not found' }, { status: 404 });

    const ledgers = await prisma.ledger.findMany({
      where: { companyId: cid },
      select: {
        id: true,
        name: true,
        groupName: true,
        openingBal: true,
        balanceType: true,
      }
    });

    const parsedAsOn = parseReportDate(asOnDate, true);
    const parsedFrom = parseReportDate(fromDate, false);
    const parsedTo   = parseReportDate(toDate, true);

    const fromDateObj = parsedFrom || new Date(new Date().getFullYear(), 3, 1);
    const toDateObj   = parsedTo   || parsedAsOn || new Date(new Date().getFullYear() + 1, 2, 31, 23, 59, 59, 999);

    // Vouchers for Balance Sheet (all entries up to asOnDate)
    const bsVouchers = await prisma.voucher.findMany({
      where: {
        companyId: cid,
        type: { notIn: ['Sales Quotation', 'Quotation'] },
        ...(parsedAsOn ? { date: { lte: parsedAsOn } } : {}),
      },
      select: {
        id: true,
        type: true,
        date: true,
        entries: {
          select: {
            id: true,
            ledgerId: true,
            amount: true,
            entryType: true,
          }
        }
      }
    });

    // Vouchers for P&L (entries strictly within fromDate..toDate)
    const plDateFilter: any = {};
    if (parsedFrom) plDateFilter.gte = parsedFrom;
    if (parsedTo)   plDateFilter.lte = parsedTo;

    const plVouchers = await prisma.voucher.findMany({
      where: {
        companyId: cid,
        type: { notIn: ['Sales Quotation', 'Quotation'] },
        ...(Object.keys(plDateFilter).length > 0 ? { date: plDateFilter } : {}),
      },
      select: {
        id: true,
        type: true,
        date: true,
        entries: {
          select: {
            id: true,
            ledgerId: true,
            amount: true,
            entryType: true,
          }
        }
      }
    });

    // ─── Calculate Balance Sheet Data ─────────────────────────────────
    const capitalItems      = buildLiabSection(ledgers, CAPITAL_GROUPS,        bsVouchers);
    const securedItems      = buildLiabSection(ledgers, SECURED_LOAN_GROUPS,   bsVouchers);
    const unsecuredItems    = buildLiabSection(ledgers, UNSECURED_LOAN_GROUPS, bsVouchers);
    const currLiabItems     = buildLiabSection(ledgers, CURRENT_LIAB_GROUPS,   bsVouchers);
    const fixedAssetItems   = buildAssetSection(ledgers, FIXED_ASSET_GROUPS,   bsVouchers);
    const investmentItems   = buildAssetSection(ledgers, INVESTMENT_GROUPS,    bsVouchers);
    const currAssetItems    = buildAssetSection(ledgers, CURRENT_ASSET_GROUPS, bsVouchers);

    const capitalTotal      = sum(capitalItems);
    const securedTotal      = sum(securedItems);
    const unsecuredTotal    = sum(unsecuredItems);
    const currLiabTotal     = sum(currLiabItems);

    const fixedAssetTotal   = sum(fixedAssetItems);
    const investmentTotal   = sum(investmentItems);
    const currAssetTotal    = sum(currAssetItems);

    // ─── Calculate P&L Data ────────────────────────────────────────────
    const stockLedgers      = ledgers.filter(l => STOCK_GROUPS.includes(l.groupName));
    const openingStock      = stockLedgers.reduce((s, l) => {
      const ob = l.openingBal ?? 0;
      return s + (l.balanceType === 'Dr' ? ob : -ob);
    }, 0);
    const closingStock      = stockLedgers.reduce((s, l) => {
      const { balance, type } = getLedgerBalance(l, plVouchers);
      return s + (type === 'Dr' ? balance : -balance);
    }, 0);

    const salesItems        = buildIncome(ledgers, SALES_GROUPS,        plVouchers);
    const purchaseItems     = buildExpense(ledgers, PURCHASE_GROUPS,    plVouchers);
    const directExpItems    = buildExpense(ledgers, DIRECT_EXP_GROUPS,  plVouchers);
    const indirectExpItems  = buildExpense(ledgers, INDIRECT_EXP_GROUPS,plVouchers);
    const indirectIncItems  = buildIncome(ledgers, INDIRECT_INC_GROUPS, plVouchers);

    const salesTotal        = sum(salesItems);
    const purchaseTotal     = sum(purchaseItems);
    const directExpTotal    = sum(directExpItems);
    const indirectExpTotal  = sum(indirectExpItems);
    const indirectIncTotal  = sum(indirectIncItems);

    const tradingDebit      = openingStock + purchaseTotal + directExpTotal;
    const tradingCredit     = salesTotal + closingStock;
    const grossProfit       = tradingCredit - tradingDebit;
    const netProfit         = grossProfit + indirectIncTotal - indirectExpTotal;
    const tradingTotal      = Math.max(tradingDebit + (grossProfit > 0 ? grossProfit : 0),
                                       tradingCredit + (grossProfit < 0 ? Math.abs(grossProfit) : 0));
    const plTotal           = Math.max(
      indirectExpTotal + (netProfit > 0 ? netProfit : 0),
      (grossProfit > 0 ? grossProfit : 0) + indirectIncTotal + (netProfit < 0 ? Math.abs(netProfit) : 0)
    );

    // ─── Calculate Partners Capital Account (Annexure A) ─────────────
    let partnersList: any[] = inputPartners;
    if (!partnersList || partnersList.length === 0) {
      const capLedgers = ledgers.filter(l => CAPITAL_GROUPS.includes(l.groupName) && l.name !== 'Profit & Loss A/c');
      if (capLedgers.length > 0) {
        const pct = Math.floor((100 / capLedgers.length) * 100) / 100;
        partnersList = capLedgers.map((l, idx) => {
          const { balance, type } = getLedgerBalance(l, bsVouchers);
          const amt = type === 'Cr' ? balance : -balance;
          return {
            name: l.name,
            sharePct: idx === capLedgers.length - 1 ? 100 - (pct * (capLedgers.length - 1)) : pct,
            openingBal: l.openingBal ?? amt,
            addition: 0,
            salary: 0,
            interestRate: 12,
            withdrawalsAmt: 0,
            withdrawalsNature: '',
          };
        });
      } else {
        partnersList = [
          { name: 'PARTNER 1', sharePct: 50, openingBal: capitalTotal * 0.5, addition: 0, salary: 0, interestRate: 12, withdrawalsAmt: 0, withdrawalsNature: '' },
          { name: 'PARTNER 2', sharePct: 50, openingBal: capitalTotal * 0.5, addition: 0, salary: 0, interestRate: 12, withdrawalsAmt: 0, withdrawalsNature: '' },
        ];
      }
    }

    const calculatedPartners = partnersList.map((p: any, idx: number) => {
      const name = (p.name && String(p.name).trim()) ? String(p.name).trim().toUpperCase() : `PARTNER ${idx + 1}`;
      const sharePct = Number(p.sharePct || 0);
      const openingBal = Number(p.openingBal || 0);
      const addition = Number(p.addition || 0);
      const salary = Number(p.salary || 0);
      const interestRate = p.interestRate !== undefined ? Number(p.interestRate) : 12;
      const interestAmt = (p.interestAmt !== undefined && p.interestAmt !== '' && p.interestAmt !== null)
        ? Number(p.interestAmt)
        : Math.round((openingBal * (interestRate / 100)) * 100) / 100;
      const profitShare = Math.round((netProfit * (sharePct / 100)) * 100) / 100;
      const total = openingBal + addition + salary + interestAmt + profitShare;
      const withdrawalsAmt = Number(p.withdrawalsAmt || 0);
      const withdrawalsNature = String(p.withdrawalsNature || '');
      const closingBal = total - withdrawalsAmt;
      return {
        name,
        sharePct,
        openingBal,
        addition,
        salary,
        interestRate,
        interestAmt,
        profitShare,
        total,
        withdrawalsAmt,
        withdrawalsNature,
        closingBal,
      };
    });

    const annexAClosingTotal = sum(calculatedPartners.map(p => ({ amount: p.closingBal })));

    // ─── Calculate Fixed Assets Schedule (Annexure B) ─────────────────
    const faLedgers = ledgers.filter(l => FIXED_ASSET_GROUPS.includes(l.groupName));
    const fyStartYear = fromDateObj.getFullYear();
    const septCutoff = new Date(fyStartYear, 8, 30, 23, 59, 59, 999);

    const faScheduleRows = faLedgers.map(l => {
      let openingBal = l.openingBal ? (l.balanceType === 'Dr' ? l.openingBal : -l.openingBal) : 0;
      let additionBefore = 0;
      let additionAfter = 0;
      let depreciation = 0;

      for (const v of bsVouchers) {
        const vDate = new Date(v.date);
        for (const e of v.entries) {
          if (e.ledgerId === l.id) {
            if (e.entryType === 'Dr') {
              if (vDate <= septCutoff) {
                additionBefore += e.amount;
              } else {
                additionAfter += e.amount;
              }
            } else {
              depreciation += e.amount;
            }
          }
        }
      }

      const closingBal = openingBal + additionBefore + additionAfter - depreciation;
      return {
        name: l.name,
        openingBal,
        additionBefore,
        additionAfter,
        depreciation,
        closingBal,
      };
    }).filter(r => Math.abs(r.openingBal) > 0.001 || Math.abs(r.closingBal) > 0.001 || r.additionBefore > 0 || r.additionAfter > 0 || r.depreciation > 0);

    const annexBClosingTotal = sum(faScheduleRows.map(r => ({ amount: r.closingBal })));

    // Totals linked with Annexures if generated
    const effectiveCapitalTotal = annexAClosingTotal !== 0 ? annexAClosingTotal : capitalTotal;
    const effectiveFixedAssetTotal = annexBClosingTotal !== 0 ? annexBClosingTotal : fixedAssetTotal;
    const totalLiab = effectiveCapitalTotal + securedTotal + unsecuredTotal + currLiabTotal;
    const totalAssets = effectiveFixedAssetTotal + investmentTotal + currAssetTotal;

    // ─── Create Workbook ───────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = company.name;
    wb.created = new Date();

    // ═══════════════════════════════════════════════════════════════════
    //  SHEET 1: BALANCE SHEET
    // ═══════════════════════════════════════════════════════════════════
    const wsBS = wb.addWorksheet('Balance Sheet', {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
    });
    wsBS.views = [{ showGridLines: true }];

    // Column widths (4 cols: Liab-name, Liab-amt, Asset-name, Asset-amt)
    wsBS.columns = [
      { key: 'A', width: 36 },
      { key: 'B', width: 16 },
      { key: 'C', width: 36 },
      { key: 'D', width: 16 },
    ];

    let bsRow = 1;
    const bsDateStr = asOnDate
      ? new Date(asOnDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Header
    const addBSHeader = (text: string, bold = true, size = 11) => {
      const r = wsBS.getRow(bsRow);
      r.getCell(1).value = text;
      r.getCell(1).font = { bold, size, name: 'Arial' };
      wsBS.mergeCells(bsRow, 1, bsRow, 4);
      r.getCell(1).alignment = { horizontal: 'center' };
      bsRow++;
    };

    addBSHeader((company.mailingName || company.name).toUpperCase(), true, 13);
    if (company.address) addBSHeader(company.address.toUpperCase(), false, 10);
    addBSHeader(`BALANCE SHEET AS ON ${bsDateStr}`, true, 11);

    // Empty row
    bsRow++;

    // Sub-header: LIABILITIES | AMOUNT | ASSETS | AMOUNT
    const bsSubHeader = wsBS.getRow(bsRow);
    const bsHeaders = ['LIABILITIES', 'AMOUNT', 'ASSETS', 'AMOUNT'];
    bsHeaders.forEach((h, i) => {
      const cell = bsSubHeader.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, name: 'Arial', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: DARK_BG };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
      cell.alignment = { horizontal: i % 2 === 0 ? 'left' : 'right' };
    });
    bsRow++;

    const addBSDataRow = (
      liabName: string, liabAmt: number | null, liabBold = false,
      assetName: string, assetAmt: number | null, assetBold = false,
      liabRed = false, assetRed = false
    ) => {
      const r = wsBS.getRow(bsRow);
      r.getCell(1).value = liabName;
      r.getCell(1).font = { bold: liabBold, name: 'Arial', size: 10 };

      if (liabAmt !== null && liabAmt !== undefined) {
        const amtCell = r.getCell(2);
        amtCell.value = liabAmt !== 0 ? fmt(liabAmt) : '';
        amtCell.font = { bold: liabBold, name: 'Arial', size: 10, color: liabRed ? RED : BLACK };
        amtCell.alignment = { horizontal: 'right' };
      }

      r.getCell(3).value = assetName;
      r.getCell(3).font = { bold: assetBold, name: 'Arial', size: 10 };

      if (assetAmt !== null && assetAmt !== undefined) {
        const amtCell = r.getCell(4);
        amtCell.value = assetAmt !== 0 ? fmt(assetAmt) : '';
        amtCell.font = { bold: assetBold, name: 'Arial', size: 10, color: assetRed ? RED : BLACK };
        amtCell.alignment = { horizontal: 'right' };
      }

      bsRow++;
    };

    const addBSSectionHeader = (liabLabel: string, assetLabel: string) => {
      const r = wsBS.getRow(bsRow);
      const lCell = r.getCell(1);
      lCell.value = liabLabel;
      lCell.font = { bold: true, underline: true, name: 'Arial', size: 10 };
      const aCell = r.getCell(3);
      aCell.value = assetLabel;
      aCell.font = { bold: true, underline: true, name: 'Arial', size: 10 };
      bsRow++;
    };

    // ── CAPITAL ACCOUNT & FIXED ASSETS ──────────────────────────────────
    addBSSectionHeader('CAPITAL ACCOUNT', 'FIXED ASSETS');
    addBSDataRow(
      'As Per Annexure "A"', effectiveCapitalTotal, false,
      'As Per Annexure "B"', effectiveFixedAssetTotal, true,
      false, false
    );
    addBSDataRow('', null, false, '', null, false);

    // ── SECURITY DEPOSITS ────────────────────────────────────────────────
    addBSSectionHeader('SECURED LOAN :', 'SECURITY DEPOSITS');
    for (let i = 0; i < Math.max(securedItems.length, investmentItems.length); i++) {
      const li = securedItems[i];
      const ai = investmentItems[i];
      addBSDataRow(
        li ? li.name : '', li ? li.amount : null, !!li,
        ai ? ai.name : '', ai ? ai.amount : null, false
      );
    }
    addBSDataRow('', null, false, '', null, false);

    // ── UNSECURED LOAN ───────────────────────────────────────────────────
    addBSSectionHeader('UNSECURED LOAN :', 'CURRENT ASSETS');
    const maxUnsecCurrRows = Math.max(unsecuredItems.length, currAssetItems.length);
    for (let i = 0; i < maxUnsecCurrRows; i++) {
      const li = unsecuredItems[i];
      const ai = currAssetItems[i];
      addBSDataRow(
        li ? li.name : '', li ? li.amount : null, false,
        ai ? ai.name : '', ai ? ai.amount : null, false
      );
    }
    addBSDataRow('', null, false, '', null, false);

    // ── CURRENT LIABILITIES ──────────────────────────────────────────────
    addBSSectionHeader('CURRENT LIABILITIES', '');
    for (const item of currLiabItems) {
      addBSDataRow(item.name, item.amount, true, '', null, false);
    }
    addBSDataRow('', currLiabTotal, false, '', null, false);
    addBSDataRow('', null, false, '', null, false);

    // ── TOTAL ROW ────────────────────────────────────────────────────────
    const totalR = wsBS.getRow(bsRow);
    ['TOTAL RS.', fmt(totalLiab), 'TOTAL RS.', fmt(totalAssets)].forEach((v, i) => {
      const cell = totalR.getCell(i + 1);
      cell.value = v;
      cell.font = { bold: true, name: 'Arial', size: 10 };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
      cell.alignment = i % 2 === 0 ? { horizontal: 'left' } : { horizontal: 'right' };
    });
    bsRow++;
    addBSDataRow('', null, false, '', null, false);

    // Footer & Signatures
    const compiledR = wsBS.getRow(bsRow);
    compiledR.getCell(1).value = 'compiled on the basis of information provided to us';
    wsBS.mergeCells(bsRow, 1, bsRow, 4);
    compiledR.getCell(1).alignment = { horizontal: 'center' };
    compiledR.getCell(1).font = { italic: true, name: 'Arial', size: 9 };
    bsRow++;
    bsRow++;

    const placeR = wsBS.getRow(bsRow);
    placeR.getCell(1).value = `PLACE  :  ${(place || company.state || '').toUpperCase()}`;
    placeR.getCell(1).font = { name: 'Arial', size: 10 };
    bsRow++;
    bsRow++;

    const firmNameR = wsBS.getRow(bsRow);
    firmNameR.getCell(1).value = `    ${(company.mailingName || company.name).toUpperCase()}`;
    firmNameR.getCell(1).font = { name: 'Arial', size: 10 };
    firmNameR.getCell(3).value = `For ${caName}`;
    firmNameR.getCell(3).alignment = { horizontal: 'center' };
    wsBS.mergeCells(bsRow, 3, bsRow, 4);
    bsRow++;

    const caFirmR = wsBS.getRow(bsRow);
    caFirmR.getCell(3).value = 'CHARTERED ACCOUNTANTS';
    caFirmR.getCell(3).alignment = { horizontal: 'center' };
    caFirmR.getCell(3).font = { bold: true, name: 'Arial', size: 10 };
    wsBS.mergeCells(bsRow, 3, bsRow, 4);
    bsRow++;
    bsRow++;

    const caNameR = wsBS.getRow(bsRow);
    caNameR.getCell(3).value = caName;
    caNameR.getCell(3).alignment = { horizontal: 'center' };
    wsBS.mergeCells(bsRow, 3, bsRow, 4);
    bsRow++;
    bsRow++;

    const partnerR = wsBS.getRow(bsRow);
    partnerR.getCell(1).value = signatoryTitle;
    partnerR.getCell(1).alignment = { horizontal: 'center' };
    partnerR.getCell(1).font = { bold: true, name: 'Arial', size: 10 };
    partnerR.getCell(3).value = `M.No. ${caMno}`;
    partnerR.getCell(3).alignment = { horizontal: 'center' };
    wsBS.mergeCells(bsRow, 3, bsRow, 4);
    const mnoBorder = partnerR.getCell(3);
    mnoBorder.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };


    // ═══════════════════════════════════════════════════════════════════
    //  SHEET 2: TRADING, PROFIT & LOSS
    // ═══════════════════════════════════════════════════════════════════
    const wsPL = wb.addWorksheet('Profit & Loss', {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
    });
    wsPL.views = [{ showGridLines: true }];

    wsPL.columns = [
      { key: 'A', width: 40 },
      { key: 'B', width: 16 },
      { key: 'C', width: 40 },
      { key: 'D', width: 16 },
    ];

    let plRow = 1;
    const fromStr = fromDate || (company.financialYearStart ? new Date(company.financialYearStart).toLocaleDateString('en-IN') : '01-Apr-2025');
    const toStr   = toDate || (asOnDate ? new Date(asOnDate).toLocaleDateString('en-IN') : '31-Mar-2026');

    const addPLHeader = (text: string, bold = true, size = 11) => {
      const r = wsPL.getRow(plRow);
      r.getCell(1).value = text;
      r.getCell(1).font = { bold, size, name: 'Arial' };
      wsPL.mergeCells(plRow, 1, plRow, 4);
      r.getCell(1).alignment = { horizontal: 'center' };
      plRow++;
    };

    addPLHeader((company.mailingName || company.name).toUpperCase(), true, 13);
    if (company.address) addPLHeader(company.address.toUpperCase(), false, 10);
    addPLHeader(`TRADING AND PROFIT & LOSS ACCOUNT FOR THE YEAR ENDED ${toStr}`, true, 11);

    plRow++;

    // Sub-header: PARTICULARS | AMOUNT | PARTICULARS | AMOUNT
    const plSubHeader = wsPL.getRow(plRow);
    ['PARTICULARS', 'AMOUNT', 'PARTICULARS', 'AMOUNT'].forEach((h, i) => {
      const cell = plSubHeader.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, name: 'Arial', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: DARK_BG };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
      cell.alignment = { horizontal: i % 2 === 0 ? 'left' : 'right' };
    });
    plRow++;

    const addPLDataRow = (
      drName: string, drAmt: number | null, drBold = false,
      crName: string, crAmt: number | null, crBold = false,
      drRed = false, crRed = false, indent = false
    ) => {
      const r = wsPL.getRow(plRow);
      r.getCell(1).value = indent ? `   ${drName}` : drName;
      r.getCell(1).font = { bold: drBold, name: 'Arial', size: 10 };

      if (drAmt !== null && drAmt !== undefined) {
        const amtCell = r.getCell(2);
        amtCell.value = drAmt !== 0 ? fmt(drAmt) : '';
        amtCell.font = { bold: drBold, name: 'Arial', size: 10, color: drRed ? RED : BLACK };
        amtCell.alignment = { horizontal: 'right' };
      }

      r.getCell(3).value = crName;
      r.getCell(3).font = { bold: crBold, name: 'Arial', size: 10 };

      if (crAmt !== null && crAmt !== undefined) {
        const amtCell = r.getCell(4);
        amtCell.value = crAmt !== 0 ? fmt(crAmt) : '';
        amtCell.font = { bold: crBold, name: 'Arial', size: 10, color: crRed ? RED : BLACK };
        amtCell.alignment = { horizontal: 'right' };
      }

      plRow++;
    };

    const addPLSectionLabel = (drLabel: string, crLabel: string, underline = false) => {
      const r = wsPL.getRow(plRow);
      r.getCell(1).value = drLabel;
      r.getCell(1).font = { bold: true, underline, name: 'Arial', size: 10 };
      r.getCell(3).value = crLabel;
      r.getCell(3).font = { bold: true, underline, name: 'Arial', size: 10 };
      plRow++;
    };

    // ── TRADING SECTION ──────────────────────────────────────────────────
    addPLDataRow('To Opening Stock', openingStock, true, 'By Sales', salesTotal, true);
    addPLDataRow('To Purchase', purchaseTotal, true, 'By Closing Stock', closingStock, false);

    addPLSectionLabel('To Direct Expenses', '');
    for (const item of directExpItems) {
      addPLDataRow(item.name, item.amount, true, '', null, false, false, false, true);
    }

    if (grossProfit > 0) {
      addPLDataRow('To Gross Profit', grossProfit, false, '', null, false, false);
    } else {
      addPLDataRow('', null, false, 'By Gross Loss', Math.abs(grossProfit), false);
    }

    addPLDataRow('', null, false, '', null, false);

    // Trading Total row
    const tradTotalR = wsPL.getRow(plRow);
    ['TOTAL RS.', fmt(tradingTotal), 'TOTAL RS.', fmt(tradingTotal)].forEach((v, i) => {
      const cell = tradTotalR.getCell(i + 1);
      cell.value = v;
      cell.font = { bold: true, name: 'Arial', size: 10 };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
      cell.alignment = i % 2 === 0 ? { horizontal: 'left' } : { horizontal: 'right' };
    });
    plRow++;
    addPLDataRow('', null, false, '', null, false);

    // ── P&L SECTION ──────────────────────────────────────────────────────
    for (const item of indirectExpItems) {
      addPLDataRow(item.name, item.amount, true, '', null, false);
    }
    for (const item of indirectIncItems) {
      addPLDataRow('', null, false, item.name, item.amount, true);
    }
    if (grossProfit > 0) {
      addPLDataRow('', null, false, 'By Gross Profit', grossProfit, false);
    }

    if (netProfit > 0) {
      addPLDataRow('To Net Profit tfd. to Capital A/c', netProfit, false, '', null, false);
    } else {
      addPLDataRow('', null, false, 'By Net Loss tfd. to Capital A/c', Math.abs(netProfit), false);
    }

    addPLDataRow('', null, false, '', null, false);

    // P&L Total row
    const plTotalR = wsPL.getRow(plRow);
    ['', fmt(plTotal), '', fmt(plTotal)].forEach((v, i) => {
      const cell = plTotalR.getCell(i + 1);
      cell.value = v;
      cell.font = { bold: true, name: 'Arial', size: 10 };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
      cell.alignment = { horizontal: 'right' };
    });
    plRow++;
    addPLDataRow('', null, false, '', null, false);

    // Signatures in P&L
    const compiledPLR = wsPL.getRow(plRow);
    compiledPLR.getCell(1).value = 'compiled on the basis of information provided to us';
    wsPL.mergeCells(plRow, 1, plRow, 4);
    compiledPLR.getCell(1).alignment = { horizontal: 'center' };
    compiledPLR.getCell(1).font = { italic: true, name: 'Arial', size: 9 };
    plRow++;
    plRow++;

    const plPlaceR = wsPL.getRow(plRow);
    plPlaceR.getCell(1).value = `PLACE  :  ${(place || company.state || '').toUpperCase()}`;
    plPlaceR.getCell(1).font = { name: 'Arial', size: 10 };
    plRow++;
    plRow++;

    const plFirmR = wsPL.getRow(plRow);
    plFirmR.getCell(1).value = `    ${(company.mailingName || company.name).toUpperCase()}`;
    plFirmR.getCell(1).font = { name: 'Arial', size: 10 };
    plFirmR.getCell(3).value = `For ${caName}`;
    plFirmR.getCell(3).alignment = { horizontal: 'center' };
    wsPL.mergeCells(plRow, 3, plRow, 4);
    plRow++;

    const plCaFirmR = wsPL.getRow(plRow);
    plCaFirmR.getCell(3).value = 'CHARTERED ACCOUNTANTS';
    plCaFirmR.getCell(3).alignment = { horizontal: 'center' };
    plCaFirmR.getCell(3).font = { bold: true, name: 'Arial', size: 10 };
    wsPL.mergeCells(plRow, 3, plRow, 4);
    plRow++;
    plRow++;

    const plCaNameR = wsPL.getRow(plRow);
    plCaNameR.getCell(3).value = caName;
    plCaNameR.getCell(3).alignment = { horizontal: 'center' };
    wsPL.mergeCells(plRow, 3, plRow, 4);
    plRow++;
    plRow++;

    const plPartnerR = wsPL.getRow(plRow);
    plPartnerR.getCell(1).value = signatoryTitle;
    plPartnerR.getCell(1).alignment = { horizontal: 'center' };
    plPartnerR.getCell(1).font = { bold: true, name: 'Arial', size: 10 };
    plPartnerR.getCell(3).value = `M.No. ${caMno}`;
    plPartnerR.getCell(3).alignment = { horizontal: 'center' };
    wsPL.mergeCells(plRow, 3, plRow, 4);
    const plMnoBorder = plPartnerR.getCell(3);
    plMnoBorder.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };


    // ═══════════════════════════════════════════════════════════════════
    //  SHEET 3: ANNEXURE "A" - PARTNERS CAPITAL ACCOUNT (Image 1)
    // ═══════════════════════════════════════════════════════════════════
    const wsAnnexA = wb.addWorksheet('Annexure A', {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
    });
    wsAnnexA.views = [{ showGridLines: true }];

    wsAnnexA.columns = [
      { key: 'A', width: 7 },   // 1. SL. NO.
      { key: 'B', width: 34 },  // 2. NAME OF PARTNERS
      { key: 'C', width: 8 },   // %
      { key: 'D', width: 16 },  // 3. OPENING BALANCE
      { key: 'E', width: 14 },  // 4. ADDITION DURING THE YEAR
      { key: 'F', width: 18 },  // 5. SALARY / REMUNERATION
      { key: 'G', width: 18 },  // 6. INTEREST ON CAPITAL (@ 12%)
      { key: 'H', width: 15 },  // 7. PROFIT/ LOSS FOR THE YEAR
      { key: 'I', width: 17 },  // 8. TOTAL
      { key: 'J', width: 15 },  // 9. WITHDRAWALS AMOUNT
      { key: 'K', width: 13 },  // 10. WITHDRAWALS NATURE
      { key: 'L', width: 17 },  // 11. CLOSING BALANCE
    ];

    // Row 1: M/S <COMPANY NAME>
    const aR1 = wsAnnexA.getRow(1);
    aR1.getCell(1).value = `M/S ${(company.mailingName || company.name).toUpperCase()}`;
    aR1.getCell(1).font = { bold: true, name: 'Arial', size: 11 };
    wsAnnexA.mergeCells(1, 1, 1, 12);
    for (let c = 1; c <= 12; c++) {
      aR1.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
    }

    // Row 2: Address & ANNEXURE "A"
    const aR2 = wsAnnexA.getRow(2);
    aR2.getCell(1).value = (company.address || '').toUpperCase();
    aR2.getCell(1).font = { name: 'Arial', size: 10 };
    wsAnnexA.mergeCells(2, 1, 2, 10);
    aR2.getCell(11).value = 'ANNEXURE "A"';
    aR2.getCell(11).font = { bold: true, name: 'Arial', size: 10 };
    aR2.getCell(11).alignment = { horizontal: 'right' };
    wsAnnexA.mergeCells(2, 11, 2, 12);

    // Row 3: Title
    const aR3 = wsAnnexA.getRow(3);
    const endDateOrdinal = toDateObj ? formatOrdinalDate(toDateObj) : '31ST MARCH 2026';
    aR3.getCell(1).value = `ESTIMATED STATEMENT OF PARTNERS CAPITAL ACCOUNT FOR THE YEAR ENDED ${endDateOrdinal}`;
    aR3.getCell(1).font = { bold: true, underline: true, name: 'Arial', size: 11 };
    wsAnnexA.mergeCells(3, 1, 3, 12);

    // Row 5 & 6: Two-tier Headers
    const aR5 = wsAnnexA.getRow(5);
    const aR6 = wsAnnexA.getRow(6);

    const fromDot = fromDateObj ? formatDotDate(fromDateObj) : '01.04.2025';
    const toDot = toDateObj ? formatDotDate(toDateObj) : '31.03.2026';

    aR5.getCell(1).value = 'SL.\nNO.';
    wsAnnexA.mergeCells(5, 1, 6, 1);

    aR5.getCell(2).value = 'NAME OF\nPARTNERS';
    wsAnnexA.mergeCells(5, 2, 6, 3);

    aR5.getCell(4).value = `OPENING\nBALANCE\n${fromDot}`;
    wsAnnexA.mergeCells(5, 4, 6, 4);

    aR5.getCell(5).value = 'ADDITION\nDURING THE\nYEAR';
    wsAnnexA.mergeCells(5, 5, 6, 5);

    aR5.getCell(6).value = 'SALARY /\nREMUNERATION\nFOR THE YEAR\n( RS. )';
    wsAnnexA.mergeCells(5, 6, 6, 6);

    const avgIntRate = calculatedPartners.length > 0 ? (calculatedPartners[0].interestRate || 12) : 12;
    aR5.getCell(7).value = `INTEREST ON\nCAPITAL FOR\nTHE YEAR\n(@ ${avgIntRate}%)`;
    wsAnnexA.mergeCells(5, 7, 6, 7);

    aR5.getCell(8).value = 'PROFIT/\nLOSS FOR\nTHE YEAR';
    wsAnnexA.mergeCells(5, 8, 6, 8);

    aR5.getCell(9).value = 'TOTAL';
    wsAnnexA.mergeCells(5, 9, 6, 9);

    aR5.getCell(10).value = 'WITHDRAWALS';
    wsAnnexA.mergeCells(5, 10, 5, 11);
    aR6.getCell(10).value = 'AMOUNT';
    aR6.getCell(11).value = 'NATURE';

    aR5.getCell(12).value = `CLOSING\nBALANCE\n${toDot}`;
    wsAnnexA.mergeCells(5, 12, 6, 12);

    for (let r = 5; r <= 6; r++) {
      const rowObj = wsAnnexA.getRow(r);
      for (let c = 1; c <= 12; c++) {
        const cell = rowObj.getCell(c);
        cell.font = { bold: true, name: 'Arial', size: 9 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        applyBorder(cell);
      }
    }

    // Row 7: Numbered row (1 to 11 as in Image 1)
    const aR7 = wsAnnexA.getRow(7);
    const colNumbers: Record<number, string> = {
      1: '1', 2: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7', 9: '8', 10: '9', 11: '10', 12: '11'
    };
    wsAnnexA.mergeCells(7, 2, 7, 3);
    for (let c = 1; c <= 12; c++) {
      const cell = aR7.getCell(c);
      if (colNumbers[c]) cell.value = colNumbers[c];
      cell.font = { bold: true, name: 'Arial', size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      applyBorder(cell);
    }

    // Data Rows
    let annexARow = 8;
    for (let i = 0; i < calculatedPartners.length; i++) {
      const p = calculatedPartners[i];
      const r = wsAnnexA.getRow(annexARow);
      r.getCell(1).value = i + 1;
      r.getCell(1).alignment = { horizontal: 'center' };

      r.getCell(2).value = p.name;
      r.getCell(2).alignment = { horizontal: 'left' };
      r.getCell(2).font = { bold: true, name: 'Arial', size: 9 };

      r.getCell(3).value = `${p.sharePct}%`;
      r.getCell(3).alignment = { horizontal: 'center' };
      r.getCell(3).font = { bold: true, name: 'Arial', size: 9 };

      r.getCell(4).value = fmt(p.openingBal);
      r.getCell(4).alignment = { horizontal: 'right' };

      r.getCell(5).value = fmt(p.addition);
      r.getCell(5).alignment = { horizontal: 'right' };

      r.getCell(6).value = fmt(p.salary);
      r.getCell(6).alignment = { horizontal: 'right' };

      r.getCell(7).value = fmt(p.interestAmt);
      r.getCell(7).alignment = { horizontal: 'right' };

      r.getCell(8).value = fmt(p.profitShare);
      r.getCell(8).alignment = { horizontal: 'right' };

      r.getCell(9).value = fmt(p.total);
      r.getCell(9).alignment = { horizontal: 'right' };

      r.getCell(10).value = fmt(p.withdrawalsAmt);
      r.getCell(10).alignment = { horizontal: 'right' };

      r.getCell(11).value = p.withdrawalsNature || '';
      r.getCell(11).alignment = { horizontal: 'center' };

      r.getCell(12).value = fmt(p.closingBal);
      r.getCell(12).alignment = { horizontal: 'right' };

      for (let c = 1; c <= 12; c++) {
        const cell = r.getCell(c);
        if (!cell.font) cell.font = { name: 'Arial', size: 9 };
        applyBorder(cell);
      }
      annexARow++;
    }

    // Totals Row
    const totARow = wsAnnexA.getRow(annexARow);
    totARow.getCell(1).value = 'TOTAL';
    totARow.getCell(1).font = { bold: true, name: 'Arial', size: 10 };
    totARow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    wsAnnexA.mergeCells(annexARow, 1, annexARow, 3);

    const sumAOpening     = sum(calculatedPartners.map(p => ({ amount: p.openingBal })));
    const sumAAddition    = sum(calculatedPartners.map(p => ({ amount: p.addition })));
    const sumASalary      = sum(calculatedPartners.map(p => ({ amount: p.salary })));
    const sumAInterest    = sum(calculatedPartners.map(p => ({ amount: p.interestAmt })));
    const sumAProfit      = sum(calculatedPartners.map(p => ({ amount: p.profitShare })));
    const sumATotal       = sum(calculatedPartners.map(p => ({ amount: p.total })));
    const sumAWithdrawals = sum(calculatedPartners.map(p => ({ amount: p.withdrawalsAmt })));
    const sumAClosing     = sum(calculatedPartners.map(p => ({ amount: p.closingBal })));

    // Opening total in red bold as in Image 1
    totARow.getCell(4).value = fmt(sumAOpening);
    totARow.getCell(4).font = { bold: true, color: RED, name: 'Arial', size: 9.5 };
    totARow.getCell(4).alignment = { horizontal: 'right' };

    totARow.getCell(5).value = fmt(sumAAddition);
    totARow.getCell(6).value = fmt(sumASalary);
    totARow.getCell(7).value = fmt(sumAInterest);
    totARow.getCell(8).value = fmt(sumAProfit);
    totARow.getCell(9).value = fmt(sumATotal);
    totARow.getCell(10).value = fmt(sumAWithdrawals);
    totARow.getCell(11).value = '';
    totARow.getCell(12).value = fmt(sumAClosing);

    for (let c = 5; c <= 12; c++) {
      const cell = totARow.getCell(c);
      cell.font = { bold: true, name: 'Arial', size: 9.5 };
      cell.alignment = { horizontal: 'right' };
    }

    for (let c = 1; c <= 12; c++) {
      const cell = totARow.getCell(c);
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'double' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    annexARow++;
    annexARow++;

    // Signatures in Annexure A
    const aPlaceR = wsAnnexA.getRow(annexARow);
    aPlaceR.getCell(1).value = `PLACE  :  ${(place || company.state || '').toUpperCase()}`;
    aPlaceR.getCell(1).font = { name: 'Arial', size: 10 };

    aPlaceR.getCell(9).value = `M/S ${(company.mailingName || company.name).toUpperCase()}`;
    aPlaceR.getCell(9).alignment = { horizontal: 'center' };
    aPlaceR.getCell(9).font = { name: 'Arial', size: 10 };
    wsAnnexA.mergeCells(annexARow, 9, annexARow, 12);
    annexARow++;
    annexARow++;

    const aSigR = wsAnnexA.getRow(annexARow);
    aSigR.getCell(9).value = (signatoryTitle || 'PARTNER').toUpperCase();
    aSigR.getCell(9).alignment = { horizontal: 'center' };
    aSigR.getCell(9).font = { bold: true, name: 'Arial', size: 10 };
    wsAnnexA.mergeCells(annexARow, 9, annexARow, 12);


    // ═══════════════════════════════════════════════════════════════════
    //  SHEET 4: ANNEXURE "B" - FIXED ASSETS SCHEDULE (Image 2)
    // ═══════════════════════════════════════════════════════════════════
    const wsAnnexB = wb.addWorksheet('Annexure B', {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
    });
    wsAnnexB.views = [{ showGridLines: true }];

    wsAnnexB.columns = [
      { key: 'A', width: 32 },  // Particulars
      { key: 'B', width: 18 },  // Opening Balance
      { key: 'C', width: 18 },  // Addition before 30.09.YYYY
      { key: 'D', width: 18 },  // Addition after 30.09.YYYY
      { key: 'E', width: 16 },  // Depreciation
      { key: 'F', width: 18 },  // Closing Balance
    ];

    // Row 1: Fixed Assets
    const bR1 = wsAnnexB.getRow(1);
    bR1.getCell(1).value = 'Fixed Assets';
    bR1.getCell(1).font = { bold: true, name: 'Arial', size: 11 };
    bR1.getCell(1).alignment = { horizontal: 'center' };
    wsAnnexB.mergeCells(1, 1, 1, 6);
    for (let c = 1; c <= 6; c++) {
      bR1.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
    }

    // Row 2: Company Name
    const bR2 = wsAnnexB.getRow(2);
    bR2.getCell(1).value = `M/S ${(company.mailingName || company.name).toUpperCase()}`;
    bR2.getCell(1).font = { bold: true, name: 'Arial', size: 11 };
    bR2.getCell(1).alignment = { horizontal: 'center' };
    wsAnnexB.mergeCells(2, 1, 2, 6);

    // Row 3: Date range
    const bR3 = wsAnnexB.getRow(3);
    const fromDash = fromDateObj ? formatDashDate(fromDateObj) : '1-Apr-2025';
    const toDash = toDateObj ? formatDashDate(toDateObj) : '31-Mar-2026';
    bR3.getCell(1).value = `${fromDash} to ${toDash}`;
    bR3.getCell(1).font = { name: 'Arial', size: 10 };
    bR3.getCell(1).alignment = { horizontal: 'center' };
    wsAnnexB.mergeCells(3, 1, 3, 6);

    // Row 4 & 5: Headers
    const bR4 = wsAnnexB.getRow(4);
    const bR5 = wsAnnexB.getRow(5);

    bR4.getCell(1).value = 'Particulars';
    wsAnnexB.mergeCells(4, 1, 5, 1);

    bR4.getCell(2).value = 'Opening\nBalance';
    wsAnnexB.mergeCells(4, 2, 5, 2);

    bR4.getCell(3).value = 'Transactions';
    wsAnnexB.mergeCells(4, 3, 4, 5);

    bR5.getCell(3).value = `Addition before\n30.09.${fyStartYear}`;
    bR5.getCell(4).value = `Addition after\n30.09.${fyStartYear}`;
    bR5.getCell(5).value = 'Depreciation';

    bR4.getCell(6).value = 'Closing\nBalance';
    wsAnnexB.mergeCells(4, 6, 5, 6);

    for (let r = 4; r <= 5; r++) {
      const rowObj = wsAnnexB.getRow(r);
      for (let c = 1; c <= 6; c++) {
        const cell = rowObj.getCell(c);
        cell.font = { bold: true, name: 'Arial', size: 9.5 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        applyBorder(cell);
      }
    }

    // Data Rows
    let annexBRow = 6;
    const itemsToRender = faScheduleRows.length > 0 ? faScheduleRows : [
      { name: 'Fixed Assets', openingBal: fixedAssetTotal, additionBefore: 0, additionAfter: 0, depreciation: 0, closingBal: fixedAssetTotal }
    ];

    for (const item of itemsToRender) {
      const r = wsAnnexB.getRow(annexBRow);
      r.getCell(1).value = item.name;
      r.getCell(1).alignment = { horizontal: 'left' };
      r.getCell(1).font = { name: 'Arial', size: 9.5 };

      r.getCell(2).value = fmt(item.openingBal);
      r.getCell(2).alignment = { horizontal: 'right' };

      r.getCell(3).value = fmt(item.additionBefore);
      r.getCell(3).alignment = { horizontal: 'right' };

      r.getCell(4).value = fmt(item.additionAfter);
      r.getCell(4).alignment = { horizontal: 'right' };

      r.getCell(5).value = fmt(item.depreciation);
      r.getCell(5).alignment = { horizontal: 'right' };

      r.getCell(6).value = fmt(item.closingBal);
      r.getCell(6).alignment = { horizontal: 'right' };

      for (let c = 1; c <= 6; c++) {
        const cell = r.getCell(c);
        if (!cell.font) cell.font = { name: 'Arial', size: 9.5 };
        applyBorder(cell);
      }
      annexBRow++;
    }

    // Grand Total Row
    const grandTotR = wsAnnexB.getRow(annexBRow);
    grandTotR.getCell(1).value = 'Grand Total';
    grandTotR.getCell(1).font = { bold: true, name: 'Arial', size: 10 };
    grandTotR.getCell(1).alignment = { horizontal: 'left' };

    const sumFaOpening = sum(itemsToRender.map(i => ({ amount: i.openingBal })));
    const sumFaAddBefore = sum(itemsToRender.map(i => ({ amount: i.additionBefore })));
    const sumFaAddAfter = sum(itemsToRender.map(i => ({ amount: i.additionAfter })));
    const sumFaDep = sum(itemsToRender.map(i => ({ amount: i.depreciation })));
    const sumFaClosing = sum(itemsToRender.map(i => ({ amount: i.closingBal })));

    grandTotR.getCell(2).value = fmt(sumFaOpening);
    grandTotR.getCell(3).value = fmt(sumFaAddBefore);
    grandTotR.getCell(4).value = fmt(sumFaAddAfter);
    grandTotR.getCell(5).value = fmt(sumFaDep);
    grandTotR.getCell(6).value = fmt(sumFaClosing);

    for (let c = 2; c <= 6; c++) {
      const cell = grandTotR.getCell(c);
      cell.font = { bold: true, name: 'Arial', size: 10 };
      cell.alignment = { horizontal: 'right' };
    }

    for (let c = 1; c <= 6; c++) {
      const cell = grandTotR.getCell(c);
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'double' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    }


    // ─── Output Excel ──────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const companySlug = (company.name || 'company').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${companySlug}_FinancialStatements_CA_Format.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (err: any) {
    console.error('Excel Export Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return generateExcelResponse(req);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return generateExcelResponse(req, body);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
