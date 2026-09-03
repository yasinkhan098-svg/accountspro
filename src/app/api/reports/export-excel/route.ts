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

function headerRow(ws: ExcelJS.Worksheet, row: number, text: string, cols: number = 4) {
  const r = ws.getRow(row);
  r.getCell(1).value = text;
  r.getCell(1).font = { bold: true, size: 11, name: 'Arial' };
  ws.mergeCells(row, 1, row, cols);
  r.getCell(1).alignment = { horizontal: 'center' };
}

// ─── Main Export Handler ───────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const asOnDate  = searchParams.get('asOnDate');
    const fromDate  = searchParams.get('fromDate');
    const toDate    = searchParams.get('toDate');
    const caName    = searchParams.get('caName') || 'C.A NAME';
    const caMno     = searchParams.get('caMno')  || '000000';
    const place     = searchParams.get('place')  || '';

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

    const bsVouchers = await prisma.voucher.findMany({
      where: { companyId: cid, ...(parsedAsOn ? { date: { lte: parsedAsOn } } : {}) },
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
    const plVouchers = await prisma.voucher.findMany({
      where: {
        companyId: cid,
        ...(parsedFrom || parsedTo ? {
          date: {
            ...(parsedFrom ? { gte: parsedFrom } : {}),
            ...(parsedTo ? { lte: parsedTo } : {})
          }
        } : {}),
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
    const totalLiab         = capitalTotal + securedTotal + unsecuredTotal + currLiabTotal;

    const fixedAssetTotal   = sum(fixedAssetItems);
    const investmentTotal   = sum(investmentItems);
    const currAssetTotal    = sum(currAssetItems);
    const totalAssets       = fixedAssetTotal + investmentTotal + currAssetTotal;

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

    // Column widths matching image (4 cols: Liab-name, Liab-amt, Asset-name, Asset-amt)
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

    // ── Header ──────────────────────────────────────────────────────────
    const addBSHeader = (text: string, bold = true, size = 11) => {
      const r = wsBS.getRow(bsRow);
      r.getCell(1).value = text;
      r.getCell(1).font = { bold, size, name: 'Arial' };
      wsBS.mergeCells(bsRow, 1, bsRow, 4);
      r.getCell(1).alignment = { horizontal: 'center' };
      bsRow++;
    };

    addBSHeader((company.mailingName || company.name).toUpperCase(), true, 12);
    addBSHeader((company.address || '').toUpperCase(), false, 10);
    addBSHeader(`BALANCE SHEET AS ON ${bsDateStr}`, true, 11);

    // ── Column Headers ───────────────────────────────────────────────────
    const bsColRow = wsBS.getRow(bsRow);
    ['LIABILITIES', 'AMOUNT', 'ASSETS', 'AMOUNT'].forEach((h, i) => {
      const cell = bsColRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, name: 'Arial', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: DARK_BG };
      cell.border = { bottom: { style: 'thin' }, top: { style: 'thin' } };
      cell.alignment = i % 2 === 0 ? { horizontal: 'left' } : { horizontal: 'right' };
    });
    bsRow++;

    // ── Helper to add BS row ─────────────────────────────────────────────
    const addBSDataRow = (
      liabLabel: string, liabAmt: number | null, liabRed: boolean,
      assetLabel: string, assetAmt: number | null, assetRed: boolean,
      liabBold = false, assetBold = false
    ) => {
      const r = wsBS.getRow(bsRow);

      // Liabilities side
      const lCell = r.getCell(1);
      lCell.value = liabLabel;
      lCell.font = { bold: liabBold, name: 'Arial', size: 10 };
      lCell.alignment = { horizontal: 'left' };

      if (liabAmt !== null) {
        const amtCell = r.getCell(2);
        amtCell.value = liabAmt !== 0 ? fmt(liabAmt) : '';
        amtCell.font = { bold: liabBold, name: 'Arial', size: 10, color: liabRed ? RED : BLACK };
        amtCell.alignment = { horizontal: 'right' };
      }

      // Assets side
      const aCell = r.getCell(3);
      aCell.value = assetLabel;
      aCell.font = { bold: assetBold, name: 'Arial', size: 10 };
      aCell.alignment = { horizontal: 'left' };

      if (assetAmt !== null) {
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

    // ── CAPITAL ACCOUNT ──────────────────────────────────────────────────
    addBSSectionHeader('CAPITAL ACCOUNT', 'FIXED ASSETS');
    addBSDataRow(
      'As Per Annexure "A"', capitalTotal, false,
      'As Per Annexure "B"', fixedAssetTotal, true,
      false, false
    );
    // blank row
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
    // Current Liabilities subtotal
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

    // ── "compiled on..." footer ──────────────────────────────────────────
    const compiledR = wsBS.getRow(bsRow);
    compiledR.getCell(1).value = 'compiled on the basis of information provided to us';
    wsBS.mergeCells(bsRow, 1, bsRow, 4);
    compiledR.getCell(1).alignment = { horizontal: 'center' };
    compiledR.getCell(1).font = { italic: true, name: 'Arial', size: 9 };
    bsRow++;
    bsRow++;

    // ── Place & Signatures ───────────────────────────────────────────────
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
    partnerR.getCell(1).value = 'PARTNER';
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
    wsPL.columns = [
      { key: 'A', width: 40 },
      { key: 'B', width: 16 },
      { key: 'C', width: 40 },
      { key: 'D', width: 16 },
    ];

    let plRow = 1;
    const fyFromStr = fromDate
      ? new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : (company.financialYearStart ? new Date(company.financialYearStart).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');
    const fyToStr = toDate
      ? new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const addPLHeader = (text: string, bold = true, size = 11) => {
      const r = wsPL.getRow(plRow);
      r.getCell(1).value = text;
      r.getCell(1).font = { bold, size, name: 'Arial' };
      wsPL.mergeCells(plRow, 1, plRow, 4);
      r.getCell(1).alignment = { horizontal: 'center' };
      plRow++;
    };

    addPLHeader((company.mailingName || company.name).toUpperCase(), true, 12);
    addPLHeader((company.address || '').toUpperCase(), false, 10);
    addPLHeader(`TRADING, PROFIT & LOSS  ACCOUNT FROM ${fyFromStr} TO ${fyToStr}`, true, 11);

    // Column headers
    const plColRow = wsPL.getRow(plRow);
    ['PARTICULARS', 'AMOUNT', 'PARTICULARS', 'AMOUNT'].forEach((h, i) => {
      const cell = plColRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, name: 'Arial', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: DARK_BG };
      cell.border = { bottom: { style: 'thin' }, top: { style: 'thin' } };
      cell.alignment = i % 2 === 0 ? { horizontal: 'left' } : { horizontal: 'right' };
    });
    plRow++;

    const addPLDataRow = (
      drLabel: string, drAmt: number | null, drRed: boolean,
      crLabel: string, crAmt: number | null, crRed: boolean,
      drBold = false, crBold = false, drIndent = false
    ) => {
      const r = wsPL.getRow(plRow);

      const dCell = r.getCell(1);
      dCell.value = drIndent ? `   ${drLabel}` : drLabel;
      dCell.font = { bold: drBold, name: 'Arial', size: 10 };

      if (drAmt !== null && drAmt !== 0) {
        const ac = r.getCell(2);
        ac.value = fmt(drAmt);
        ac.font = { bold: drBold, name: 'Arial', size: 10, color: drRed ? RED : BLACK };
        ac.alignment = { horizontal: 'right' };
      }

      const cCell = r.getCell(3);
      cCell.value = crLabel;
      cCell.font = { bold: crBold, name: 'Arial', size: 10 };

      if (crAmt !== null && crAmt !== 0) {
        const ac = r.getCell(4);
        ac.value = fmt(crAmt);
        ac.font = { bold: crBold, name: 'Arial', size: 10, color: crRed ? RED : BLACK };
        ac.alignment = { horizontal: 'right' };
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

    // Direct Expenses header
    addPLSectionLabel('To Direct Expenses', '');
    for (const item of directExpItems) {
      addPLDataRow(item.name, item.amount, true, '', null, false, false, false, true);
    }

    // Gross Profit / Loss
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

    // ── "compiled on..." footer ──────────────────────────────────────────
    const compiledPLR = wsPL.getRow(plRow);
    compiledPLR.getCell(1).value = 'compiled on the basis of information provided to us';
    wsPL.mergeCells(plRow, 1, plRow, 4);
    compiledPLR.getCell(1).alignment = { horizontal: 'center' };
    compiledPLR.getCell(1).font = { italic: true, name: 'Arial', size: 9 };
    plRow++;
    plRow++;

    // Signatures
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
    plPartnerR.getCell(1).value = 'PARTNER';
    plPartnerR.getCell(1).alignment = { horizontal: 'center' };
    plPartnerR.getCell(1).font = { bold: true, name: 'Arial', size: 10 };
    plPartnerR.getCell(3).value = `M.No. ${caMno}`;
    plPartnerR.getCell(3).alignment = { horizontal: 'center' };
    wsPL.mergeCells(plRow, 3, plRow, 4);
    const plMnoBorder = plPartnerR.getCell(3);
    plMnoBorder.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };

    // ─── Output Excel ──────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const companySlug = (company.name || 'company').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${companySlug}_FinancialStatements.xlsx`;

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

