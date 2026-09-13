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
    for (const e of (v.entries || [])) {
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
  return ledgers.filter(l => groups.includes(l.groupName) && l.name !== 'Profit & Loss A/c').map(l => {
    const { balance, type } = getLedgerBalance(l, vouchers);
    const amt = (type === 'Cr') ? balance : -balance;
    return { name: l.name, amount: Math.round(amt * 100) / 100 };
  }).filter(i => Math.abs(i.amount) > 0.001);
}

function buildAssetSection(ledgers: any[], groups: string[], vouchers: any[]) {
  return ledgers.filter(l => groups.includes(l.groupName)).map(l => {
    const { balance, type } = getLedgerBalance(l, vouchers);
    const amt = (type === 'Dr') ? balance : -balance;
    return { name: l.name, amount: Math.round(amt * 100) / 100 };
  }).filter(i => Math.abs(i.amount) > 0.001);
}

function buildExpense(ledgers: any[], groups: string[], vouchers: any[]) {
  return ledgers.filter(l => groups.includes(l.groupName)).map(l => {
    const { balance, type } = getLedgerBalance(l, vouchers);
    return { name: l.name, amount: Math.round((type === 'Dr' ? balance : -balance) * 100) / 100 };
  }).filter(i => Math.abs(i.amount) > 0.001);
}

function buildIncome(ledgers: any[], groups: string[], vouchers: any[]) {
  return ledgers.filter(l => groups.includes(l.groupName)).map(l => {
    const { balance, type } = getLedgerBalance(l, vouchers);
    return { name: l.name, amount: Math.round((type === 'Cr' ? balance : -balance) * 100) / 100 };
  }).filter(i => Math.abs(i.amount) > 0.001);
}

const sum = (arr: any[]) => arr.reduce((s, i) => s + (Number(i.amount) || 0), 0);

// ─── Style Constants ───────────────────────────────────────────────────────
const RED     = { argb: 'FFCC0000' } as ExcelJS.Color;
const BLACK   = { argb: 'FF000000' } as ExcelJS.Color;
const DARK_BG = { argb: 'FFD3D3D3' } as ExcelJS.Color;
const CURR_FMT = '#,##0.00';

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

    const isProvisional = postBody?.reportMode === 'provisional' || searchParams.get('reportMode') === 'provisional' || postBody?.isProvisional || searchParams.get('isProvisional') === 'true';
    const isProjected   = postBody?.reportMode === 'projected'   || searchParams.get('reportMode') === 'projected';
    const titlePrefix   = isProvisional ? 'PROV. ' : isProjected ? 'PROJECTED ' : '';

    // Data passed directly from frontend (fully calculated from BaseFinancials or Projections)
    const sourceData = (isProvisional || isProjected)
      ? (postBody?.projectedData || postBody?.statementData)
      : (postBody?.statementData || postBody?.projectedData);

    // Parse partnersData fallback
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

    const parsedAsOn = parseReportDate(asOnDate, true);
    const parsedFrom = parseReportDate(fromDate, false);
    const parsedTo   = parseReportDate(toDate, true);

    const fromDateObj = parsedFrom || new Date(new Date().getFullYear(), 3, 1);
    const toDateObj   = parsedTo   || parsedAsOn || new Date(new Date().getFullYear() + 1, 2, 31, 23, 59, 59, 999);

    // If sourceData is NOT supplied, load ledgers and vouchers from database as fallback
    let ledgers: any[] = [];
    let bsVouchers: any[] = [];
    let plVouchers: any[] = [];
    let stockItemsDb: any[] = [];

    if (!sourceData) {
      ledgers = await prisma.ledger.findMany({
        where: { companyId: cid },
        select: {
          id: true,
          name: true,
          groupName: true,
          openingBal: true,
          balanceType: true,
        }
      });

      stockItemsDb = await prisma.stockItem.findMany({
        where: { companyId: cid },
        select: {
          id: true,
          name: true,
          openingQty: true,
          openingRate: true,
        }
      });

      bsVouchers = await prisma.voucher.findMany({
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
          },
          inventoryEntries: {
            select: {
              id: true,
              stockItemId: true,
              qty: true,
              rate: true,
              amount: true,
              taxableAmount: true,
            }
          }
        }
      });

      const plDateFilter: any = {};
      if (parsedFrom) plDateFilter.gte = parsedFrom;
      if (parsedTo)   plDateFilter.lte = parsedTo;

      plVouchers = await prisma.voucher.findMany({
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
          },
          inventoryEntries: {
            select: {
              id: true,
              stockItemId: true,
              qty: true,
              rate: true,
              amount: true,
              taxableAmount: true,
            }
          }
        }
      });
    }

    // ─── Calculate or Extract Financial Sections ──────────────────────
    let capitalItems: any[]    = sourceData?.capitalItems    ? sourceData.capitalItems.map((i: any) => ({ name: i.name, amount: Number(i.amount) || 0 })) : buildLiabSection(ledgers, CAPITAL_GROUPS, bsVouchers);
    let securedItems: any[]    = sourceData?.securedItems    ? sourceData.securedItems.map((i: any) => ({ name: i.name, amount: Number(i.amount) || 0 })) : buildLiabSection(ledgers, SECURED_LOAN_GROUPS, bsVouchers);
    let unsecuredItems: any[]  = sourceData?.unsecuredItems  ? sourceData.unsecuredItems.map((i: any) => ({ name: i.name, amount: Number(i.amount) || 0 })) : buildLiabSection(ledgers, UNSECURED_LOAN_GROUPS, bsVouchers);
    let currLiabItems: any[]   = sourceData?.currLiabItems   ? sourceData.currLiabItems.map((i: any) => ({ name: i.name, amount: Number(i.amount) || 0 })) : buildLiabSection(ledgers, CURRENT_LIAB_GROUPS, bsVouchers);

    let fixedAssetItems: any[] = sourceData?.fixedAssetItems ? sourceData.fixedAssetItems.map((i: any) => ({ name: i.name, amount: Number(i.amount) || 0 })) : buildAssetSection(ledgers, FIXED_ASSET_GROUPS, bsVouchers);
    let investmentItems: any[] = sourceData?.investmentItems ? sourceData.investmentItems.map((i: any) => ({ name: i.name, amount: Number(i.amount) || 0 })) : buildAssetSection(ledgers, INVESTMENT_GROUPS, bsVouchers);
    let currAssetItems: any[]  = sourceData?.currAssetItems  ? sourceData.currAssetItems.map((i: any) => ({ name: i.name, amount: Number(i.amount) || 0 })) : buildAssetSection(ledgers, CURRENT_ASSET_GROUPS, bsVouchers);

    let salesItems: any[]      = sourceData?.salesItems      ? sourceData.salesItems.map((i: any) => ({ name: i.name, amount: Number(i.amount) || 0 })) : buildIncome(ledgers, SALES_GROUPS, plVouchers);
    let purchaseItems: any[]   = sourceData?.purchaseItems   ? sourceData.purchaseItems.map((i: any) => ({ name: i.name, amount: Number(i.amount) || 0 })) : buildExpense(ledgers, PURCHASE_GROUPS, plVouchers);
    let directExpItems: any[]  = sourceData?.directExpItems  ? sourceData.directExpItems.map((i: any) => ({ name: i.name, amount: Number(i.amount) || 0 })) : buildExpense(ledgers, DIRECT_EXP_GROUPS, plVouchers);
    let indirectExpItems: any[]= sourceData?.indirectExpItems? sourceData.indirectExpItems.map((i: any) => ({ name: i.name, amount: Number(i.amount) || 0 })) : buildExpense(ledgers, INDIRECT_EXP_GROUPS, plVouchers);
    let indirectIncItems: any[]= sourceData?.indirectIncItems? sourceData.indirectIncItems.map((i: any) => ({ name: i.name, amount: Number(i.amount) || 0 })) : buildIncome(ledgers, INDIRECT_INC_GROUPS, plVouchers);

    let openingStock = 0;
    let closingStock = 0;

    if (sourceData && (sourceData.openingStock !== undefined || sourceData.closingStock !== undefined)) {
      openingStock = Math.round(Number(sourceData.openingStock || 0) * 100) / 100;
      closingStock = Math.round(Number(sourceData.closingStock || 0) * 100) / 100;
    } else if (stockItemsDb && stockItemsDb.length > 0) {
      openingStock = Math.round(stockItemsDb.reduce((acc, it) => acc + ((Number(it.openingQty) || 0) * (Number(it.openingRate) || 0)), 0) * 100) / 100;
      let totalVal = 0;
      for (const it of stockItemsDb) {
        let qty = Number(it.openingQty) || 0;
        let totalCost = (Number(it.openingQty) || 0) * (Number(it.openingRate) || 0);
        let totalInQty = Number(it.openingQty) || 0;
        for (const v of bsVouchers) {
          for (const ie of (v.inventoryEntries || [])) {
            if (Number(ie.stockItemId) === Number(it.id)) {
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
        totalVal += Math.max(0, qty) * (totalInQty > 0 ? totalCost / totalInQty : (Number(it.openingRate) || 0));
      }
      closingStock = Math.round(totalVal * 100) / 100;
    } else {
      const stockLedgers = ledgers.filter(l => STOCK_GROUPS.includes(l.groupName));
      openingStock = stockLedgers.reduce((s, l) => {
        const ob = l.openingBal ?? 0;
        return s + (l.balanceType === 'Dr' ? ob : -ob);
      }, 0);
      closingStock = stockLedgers.reduce((s, l) => {
        const { balance, type } = getLedgerBalance(l, plVouchers);
        return s + (type === 'Dr' ? balance : -balance);
      }, 0);
    }

    // Ensure closing stock is reflected in Current Assets
    const stockItemIdx = currAssetItems.findIndex(i => i.name.toLowerCase().includes('stock'));
    if (closingStock > 0) {
      if (stockItemIdx >= 0) {
        currAssetItems[stockItemIdx].amount = closingStock;
      } else {
        currAssetItems.push({ name: 'Closing Stock', amount: closingStock });
      }
    }

    const capitalTotal      = Math.round(sum(capitalItems) * 100) / 100;
    const securedTotal      = Math.round(sum(securedItems) * 100) / 100;
    const unsecuredTotal    = Math.round(sum(unsecuredItems) * 100) / 100;
    const currLiabTotal     = Math.round(sum(currLiabItems) * 100) / 100;

    const fixedAssetTotal   = Math.round(sum(fixedAssetItems) * 100) / 100;
    const investmentTotal   = Math.round(sum(investmentItems) * 100) / 100;
    const currAssetTotal    = Math.round(sum(currAssetItems) * 100) / 100;

    const salesTotal        = Math.round(sum(salesItems) * 100) / 100;
    const purchaseTotal     = Math.round(sum(purchaseItems) * 100) / 100;
    const directExpTotal    = Math.round(sum(directExpItems) * 100) / 100;
    const indirectExpTotal  = Math.round(sum(indirectExpItems) * 100) / 100;
    const indirectIncTotal  = Math.round(sum(indirectIncItems) * 100) / 100;

    const tradingDebit      = Math.round((openingStock + purchaseTotal + directExpTotal) * 100) / 100;
    const tradingCredit     = Math.round((salesTotal + closingStock) * 100) / 100;
    const grossProfit       = Math.round((tradingCredit - tradingDebit) * 100) / 100;
    const netProfit         = Math.round((grossProfit + indirectIncTotal - indirectExpTotal) * 100) / 100;
    const tradingTotal      = Math.round(Math.max(tradingDebit + (grossProfit > 0 ? grossProfit : 0),
                                                  tradingCredit + (grossProfit < 0 ? Math.abs(grossProfit) : 0)) * 100) / 100;
    const plTotal           = Math.round(Math.max(
      indirectExpTotal + (netProfit > 0 ? netProfit : 0),
      (grossProfit > 0 ? grossProfit : 0) + indirectIncTotal + (netProfit < 0 ? Math.abs(netProfit) : 0)
    ) * 100) / 100;

    // ─── Calculate Partners Capital Account (Annexure A) ─────────────
    let partnersList: any[] = (sourceData?.partners && Array.isArray(sourceData.partners) && sourceData.partners.length > 0)
      ? sourceData.partners
      : inputPartners;

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

    const calculatedPartners: any[] = partnersList.map((p: any, idx: number) => {
      const name = (p.name && String(p.name).trim()) ? String(p.name).trim().toUpperCase() : `PARTNER ${idx + 1}`;
      const sharePct = Number(p.sharePct || 0);
      const openingBal = Math.round(Number(p.openingBal || 0) * 100) / 100;
      const addition = Math.round(Number(p.addition || 0) * 100) / 100;
      const salary = Math.round(Number(p.salary || 0) * 100) / 100;
      const interestRate = p.interestRate !== undefined ? Number(p.interestRate) : 12;
      const interestAmt = (p.interestAmt !== undefined && p.interestAmt !== '' && p.interestAmt !== null)
        ? Math.round(Number(p.interestAmt) * 100) / 100
        : Math.round(openingBal * (interestRate / 100) * 100) / 100;
      const profitShare = (p.profitShare !== undefined && p.profitShare !== '' && p.profitShare !== null)
        ? Math.round(Number(p.profitShare) * 100) / 100
        : Math.round((netProfit * (sharePct / 100)) * 100) / 100;
      const total = (p.total !== undefined && p.total !== '' && p.total !== null)
        ? Math.round(Number(p.total) * 100) / 100
        : Math.round((openingBal + addition + salary + interestAmt + profitShare) * 100) / 100;
      const withdrawalsAmt = Math.round(Number(p.withdrawalsAmt || 0) * 100) / 100;
      const withdrawalsNature = String(p.withdrawalsNature || '');
      const closingBal = (p.closingBal !== undefined && p.closingBal !== '' && p.closingBal !== null)
        ? Math.round(Number(p.closingBal) * 100) / 100
        : Math.round((total - withdrawalsAmt) * 100) / 100;
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

    const annexAClosingTotal = Math.round(sum(calculatedPartners.map((p: any) => ({ amount: p.closingBal }))) * 100) / 100;

    // ─── Calculate Fixed Assets Schedule (Annexure B) ─────────────────
    const fyStartYear = fromDateObj.getFullYear();
    const septCutoff = new Date(fyStartYear, 8, 30, 23, 59, 59, 999);
    let faScheduleRows: any[] = [];
    if (sourceData?.fixedAssetSchedule && sourceData.fixedAssetSchedule.length > 0) {
      faScheduleRows = sourceData.fixedAssetSchedule.map((fa: any) => ({
        name: fa.name,
        openingBal: Math.round(Number(fa.openingBal || 0) * 100) / 100,
        additionBefore: Math.round(Number(fa.additionBefore || 0) * 100) / 100,
        additionAfter: Math.round(Number(fa.additionAfter || 0) * 100) / 100,
        depreciation: Math.round(Number(fa.depreciation || 0) * 100) / 100,
        closingBal: Math.round(Number(fa.closingBal || 0) * 100) / 100,
      }));
    } else {
      const faLedgers = ledgers.filter(l => FIXED_ASSET_GROUPS.includes(l.groupName));

      faScheduleRows = faLedgers.map(l => {
        let openingBal = l.openingBal ? (l.balanceType === 'Dr' ? l.openingBal : -l.openingBal) : 0;
        let additionBefore = 0;
        let additionAfter = 0;
        let depreciation = 0;

        for (const v of bsVouchers) {
          const vDate = new Date(v.date);
          for (const e of (v.entries || [])) {
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
          openingBal: Math.round(openingBal * 100) / 100,
          additionBefore: Math.round(additionBefore * 100) / 100,
          additionAfter: Math.round(additionAfter * 100) / 100,
          depreciation: Math.round(depreciation * 100) / 100,
          closingBal: Math.round(closingBal * 100) / 100,
        };
      }).filter(r => Math.abs(r.openingBal) > 0.001 || Math.abs(r.closingBal) > 0.001 || r.additionBefore > 0 || r.additionAfter > 0 || r.depreciation > 0);
    }

    const itemsToRenderAnnexB = faScheduleRows.length > 0 ? faScheduleRows : [
      { name: 'Fixed Assets', openingBal: fixedAssetTotal, additionBefore: 0, additionAfter: 0, depreciation: 0, closingBal: fixedAssetTotal }
    ];

    const annexBClosingTotal = Math.round(sum(itemsToRenderAnnexB.map(r => ({ amount: r.closingBal }))) * 100) / 100;

    // Totals linked with Annexures
    const effectiveCapitalTotal = annexAClosingTotal !== 0 ? annexAClosingTotal : capitalTotal;
    const effectiveFixedAssetTotal = annexBClosingTotal !== 0 ? annexBClosingTotal : fixedAssetTotal;
    let totalLiab = Math.round((effectiveCapitalTotal + securedTotal + unsecuredTotal + currLiabTotal) * 100) / 100;
    let totalAssets = Math.round((effectiveFixedAssetTotal + investmentTotal + currAssetTotal) * 100) / 100;

    // Auto-balance Balance Sheet cash/bank if slight difference
    const diff = Math.round((totalLiab - totalAssets) * 100) / 100;
    if (Math.abs(diff) > 0.001) {
      const cashItem = currAssetItems.find(i => i.name.toLowerCase().includes('cash'));
      if (cashItem) {
        cashItem.amount = Math.round((cashItem.amount + diff) * 100) / 100;
      } else if (currAssetItems.length > 0) {
        currAssetItems[0].amount = Math.round((currAssetItems[0].amount + diff) * 100) / 100;
      } else {
        currAssetItems.push({ name: 'Cash in hand', amount: Math.max(0, diff) });
      }
      totalAssets = Math.round((effectiveFixedAssetTotal + investmentTotal + sum(currAssetItems)) * 100) / 100;
    }

    // Pre-calculate Annexure Grand Total Row Numbers for cross-sheet live formulas
    const annexAStartRow = 8;
    const annexAEndRow = calculatedPartners.length > 0 ? (annexAStartRow + calculatedPartners.length - 1) : 8;
    const annexATotalRow = annexAEndRow + 1;

    const annexBStartRow = 6;
    const annexBEndRow = itemsToRenderAnnexB.length > 0 ? (annexBStartRow + itemsToRenderAnnexB.length - 1) : 6;
    const annexBTotalRow = annexBEndRow + 1;

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
      { key: 'A', width: 38 },
      { key: 'B', width: 18 },
      { key: 'C', width: 38 },
      { key: 'D', width: 18 },
    ];

    let bsRow = 1;
    const bsDateStr = parsedAsOn 
      ? formatDotDate(parsedAsOn) 
      : (asOnDate ? (asOnDate.includes('.') ? asOnDate : formatDotDate(parseReportDate(asOnDate, true))) : (toDateObj ? formatDotDate(toDateObj) : '31.03.2026'));

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
    addBSHeader(`${titlePrefix}BALANCE SHEET AS ON ${bsDateStr}`, true, 11);

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
      liabName: string, liabAmt: number | { formula: string; result?: number } | null, liabBold = false,
      assetName: string, assetAmt: number | { formula: string; result?: number } | null, assetBold = false,
      liabRed = false, assetRed = false
    ) => {
      const r = wsBS.getRow(bsRow);
      r.getCell(1).value = liabName;
      r.getCell(1).font = { bold: liabBold, name: 'Arial', size: 10 };

      if (liabAmt !== null && liabAmt !== undefined) {
        const amtCell = r.getCell(2);
        if (typeof liabAmt === 'object' && liabAmt !== null && 'formula' in liabAmt) {
          amtCell.value = liabAmt;
        } else if (typeof liabAmt === 'number') {
          amtCell.value = liabAmt;
        }
        amtCell.numFmt = CURR_FMT;
        amtCell.font = { bold: liabBold, name: 'Arial', size: 10, color: liabRed ? RED : BLACK };
        amtCell.alignment = { horizontal: 'right' };
      }

      r.getCell(3).value = assetName;
      r.getCell(3).font = { bold: assetBold, name: 'Arial', size: 10 };

      if (assetAmt !== null && assetAmt !== undefined) {
        const amtCell = r.getCell(4);
        if (typeof assetAmt === 'object' && assetAmt !== null && 'formula' in assetAmt) {
          amtCell.value = assetAmt;
        } else if (typeof assetAmt === 'number') {
          amtCell.value = assetAmt;
        }
        amtCell.numFmt = CURR_FMT;
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

    const bsDataStartRow = bsRow;

    // ── CAPITAL ACCOUNT & FIXED ASSETS ──────────────────────────────────
    addBSSectionHeader('CAPITAL ACCOUNT', 'FIXED ASSETS');
    addBSDataRow(
      'As Per Annexure "A"', 
      { formula: `'Annexure A'!L${annexATotalRow}`, result: effectiveCapitalTotal }, 
      false,
      'As Per Annexure "B"', 
      { formula: `'Annexure B'!F${annexBTotalRow}`, result: effectiveFixedAssetTotal }, 
      true,
      false, false
    );
    addBSDataRow('', null, false, '', null, false);

    // ── SECURED LOAN & SECURITY DEPOSITS ─────────────────────────────────
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

    // ── UNSECURED LOAN & CURRENT ASSETS ──────────────────────────────────
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
    addBSDataRow('', null, false, '', null, false);

    const bsDataEndRow = bsRow - 1;

    // ── TOTAL ROW (With live Auto Excel SUM formulas) ───────────────────
    const totalR = wsBS.getRow(bsRow);
    const liabLabelCell = totalR.getCell(1);
    liabLabelCell.value = 'TOTAL RS.';
    liabLabelCell.font = { bold: true, name: 'Arial', size: 10 };
    liabLabelCell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };

    const liabAmtCell = totalR.getCell(2);
    liabAmtCell.value = { formula: `SUM(B${bsDataStartRow}:B${bsDataEndRow})`, result: totalLiab };
    liabAmtCell.numFmt = CURR_FMT;
    liabAmtCell.font = { bold: true, name: 'Arial', size: 10 };
    liabAmtCell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    liabAmtCell.alignment = { horizontal: 'right' };

    const assetLabelCell = totalR.getCell(3);
    assetLabelCell.value = 'TOTAL RS.';
    assetLabelCell.font = { bold: true, name: 'Arial', size: 10 };
    assetLabelCell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };

    const assetAmtCell = totalR.getCell(4);
    assetAmtCell.value = { formula: `SUM(D${bsDataStartRow}:D${bsDataEndRow})`, result: totalAssets };
    assetAmtCell.numFmt = CURR_FMT;
    assetAmtCell.font = { bold: true, name: 'Arial', size: 10 };
    assetAmtCell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    assetAmtCell.alignment = { horizontal: 'right' };
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
      { key: 'B', width: 18 },
      { key: 'C', width: 40 },
      { key: 'D', width: 18 },
    ];

    let plRow = 1;
    const plFromStr = fromDateObj 
      ? formatDotDate(fromDateObj) 
      : (fromDate ? (fromDate.includes('.') ? fromDate : formatDotDate(parseReportDate(fromDate, false))) : '01.04.2025');
    const plToStr = toDateObj 
      ? formatDotDate(toDateObj) 
      : (toDate ? (toDate.includes('.') ? toDate : formatDotDate(parseReportDate(toDate, true))) : '31.03.2026');

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
    addPLHeader(`${titlePrefix}TRADING, PROFIT & LOSS ACCOUNT FROM ${plFromStr} TO ${plToStr}`, true, 11);

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
      drName: string, drAmt: number | { formula: string; result?: number } | null, drBold = false,
      crName: string, crAmt: number | { formula: string; result?: number } | null, crBold = false,
      drRed = false, crRed = false, indent = false
    ) => {
      const r = wsPL.getRow(plRow);
      r.getCell(1).value = indent ? `   ${drName}` : drName;
      r.getCell(1).font = { bold: drBold, name: 'Arial', size: 10 };

      if (drAmt !== null && drAmt !== undefined) {
        const amtCell = r.getCell(2);
        if (typeof drAmt === 'object' && drAmt !== null && 'formula' in drAmt) {
          amtCell.value = drAmt;
        } else if (typeof drAmt === 'number') {
          amtCell.value = drAmt;
        }
        amtCell.numFmt = CURR_FMT;
        amtCell.font = { bold: drBold, name: 'Arial', size: 10, color: drRed ? RED : BLACK };
        amtCell.alignment = { horizontal: 'right' };
      }

      r.getCell(3).value = crName;
      r.getCell(3).font = { bold: crBold, name: 'Arial', size: 10 };

      if (crAmt !== null && crAmt !== undefined) {
        const amtCell = r.getCell(4);
        if (typeof crAmt === 'object' && crAmt !== null && 'formula' in crAmt) {
          amtCell.value = crAmt;
        } else if (typeof crAmt === 'number') {
          amtCell.value = crAmt;
        }
        amtCell.numFmt = CURR_FMT;
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
    const tradStartRow = plRow;
    addPLDataRow('To Opening Stock', openingStock, true, 'By Sales', salesTotal, true);
    addPLDataRow('To Purchase', purchaseTotal, true, 'By Closing Stock', closingStock, false);

    addPLSectionLabel('To Direct Expenses', '');
    for (const item of directExpItems) {
      addPLDataRow(item.name, item.amount, true, '', null, false, false, false, true);
    }

    const gpRow = plRow;
    if (grossProfit >= 0) {
      addPLDataRow('To Gross Profit c/d', grossProfit, true, '', null, false, false);
    } else {
      addPLDataRow('', null, false, 'By Gross Loss c/d', Math.abs(grossProfit), true);
    }

    addPLDataRow('', null, false, '', null, false);

    // Trading Total row (with live auto SUM formula)
    const tradTotalR = wsPL.getRow(plRow);
    const tradTotalDrLabel = tradTotalR.getCell(1);
    tradTotalDrLabel.value = 'TOTAL RS.';
    tradTotalDrLabel.font = { bold: true, name: 'Arial', size: 10 };
    tradTotalDrLabel.border = { top: { style: 'thin' }, bottom: { style: 'double' } };

    const tradTotalDrAmt = tradTotalR.getCell(2);
    tradTotalDrAmt.value = { formula: `SUM(B${tradStartRow}:B${gpRow})`, result: tradingTotal };
    tradTotalDrAmt.numFmt = CURR_FMT;
    tradTotalDrAmt.font = { bold: true, name: 'Arial', size: 10 };
    tradTotalDrAmt.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    tradTotalDrAmt.alignment = { horizontal: 'right' };

    const tradTotalCrLabel = tradTotalR.getCell(3);
    tradTotalCrLabel.value = 'TOTAL RS.';
    tradTotalCrLabel.font = { bold: true, name: 'Arial', size: 10 };
    tradTotalCrLabel.border = { top: { style: 'thin' }, bottom: { style: 'double' } };

    const tradTotalCrAmt = tradTotalR.getCell(4);
    tradTotalCrAmt.value = { formula: `SUM(D${tradStartRow}:D${gpRow})`, result: tradingTotal };
    tradTotalCrAmt.numFmt = CURR_FMT;
    tradTotalCrAmt.font = { bold: true, name: 'Arial', size: 10 };
    tradTotalCrAmt.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    tradTotalCrAmt.alignment = { horizontal: 'right' };
    plRow++;

    addPLDataRow('', null, false, '', null, false);

    // ── P&L SECTION ──────────────────────────────────────────────────────
    const plSectionStartRow = plRow;

    // Gross profit b/d linked by live formula to Trading Account
    if (grossProfit >= 0) {
      addPLDataRow('', null, false, 'By Gross Profit b/d', { formula: `B${gpRow}`, result: grossProfit }, true);
    } else {
      addPLDataRow('To Gross Loss b/d', { formula: `D${gpRow}`, result: Math.abs(grossProfit) }, true, '', null, false);
    }

    const maxIndirRows = Math.max(indirectExpItems.length, indirectIncItems.length);
    for (let i = 0; i < maxIndirRows; i++) {
      const exp = indirectExpItems[i];
      const inc = indirectIncItems[i];
      addPLDataRow(
        exp ? exp.name : '', exp ? exp.amount : null, true,
        inc ? inc.name : '', inc ? inc.amount : null, true
      );
    }

    const npRow = plRow;
    if (netProfit >= 0) {
      addPLDataRow('To Net Profit tfd. to Capital A/c', netProfit, true, '', null, false);
    } else {
      addPLDataRow('', null, false, 'By Net Loss tfd. to Capital A/c', Math.abs(netProfit), true);
    }

    addPLDataRow('', null, false, '', null, false);

    // P&L Total row (with live auto SUM formula)
    const plTotalR = wsPL.getRow(plRow);
    const plDrLabel = plTotalR.getCell(1);
    plDrLabel.value = 'TOTAL RS.';
    plDrLabel.font = { bold: true, name: 'Arial', size: 10 };
    plDrLabel.border = { top: { style: 'thin' }, bottom: { style: 'double' } };

    const plDrAmt = plTotalR.getCell(2);
    plDrAmt.value = { formula: `SUM(B${plSectionStartRow}:B${npRow})`, result: plTotal };
    plDrAmt.numFmt = CURR_FMT;
    plDrAmt.font = { bold: true, name: 'Arial', size: 10 };
    plDrAmt.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    plDrAmt.alignment = { horizontal: 'right' };

    const plCrLabel = plTotalR.getCell(3);
    plCrLabel.value = 'TOTAL RS.';
    plCrLabel.font = { bold: true, name: 'Arial', size: 10 };
    plCrLabel.border = { top: { style: 'thin' }, bottom: { style: 'double' } };

    const plCrAmt = plTotalR.getCell(4);
    plCrAmt.value = { formula: `SUM(D${plSectionStartRow}:D${npRow})`, result: plTotal };
    plCrAmt.numFmt = CURR_FMT;
    plCrAmt.font = { bold: true, name: 'Arial', size: 10 };
    plCrAmt.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    plCrAmt.alignment = { horizontal: 'right' };
    plRow++;

    addPLDataRow('', null, false, '', null, false);

    // ── APPROPRIATION SECTION (For Partnership firms / Annexure A) ─────
    if (signatoryTitle === 'PARTNER' && calculatedPartners.length > 0) {
      const totInterest = Math.round(calculatedPartners.reduce((s: number, p: any) => s + (p.interestAmt || 0), 0) * 100) / 100;
      const totSalary   = Math.round(calculatedPartners.reduce((s: number, p: any) => s + (p.salary || 0), 0) * 100) / 100;
      const totProfitCd = Math.round(calculatedPartners.reduce((s: number, p: any) => s + (p.profitShare || 0), 0) * 100) / 100;
      const appropriationTotal = Math.round((totInterest + totSalary + totProfitCd) * 100) / 100;

      const appStartRow = plRow;

      // Row 1: Interest on Capital & Net Profit b/d
      addPLDataRow(
        'To Interest on Capital', 
        { formula: `'Annexure A'!G${annexATotalRow}`, result: totInterest }, 
        false,
        'By Net Profit b/d', 
        { formula: `B${npRow}`, result: netProfit }, 
        false
      );

      // Row 2: Salary to Partner
      addPLDataRow(
        'To Salary to partner', 
        { formula: `'Annexure A'!F${annexATotalRow}`, result: totSalary }, 
        false,
        '', null, false
      );

      // Row 3: Net Profit c/d
      addPLDataRow(
        'To Net Profit C/d', 
        { formula: `'Annexure A'!H${annexATotalRow}`, result: totProfitCd }, 
        false,
        '', null, false
      );

      // Row 4: Note
      addPLDataRow(
        '(Transferred to Capital A/c)', null, false,
        '', null, false
      );

      const appEndRow = plRow - 1;

      // Appropriation Total row
      const appTotalR = wsPL.getRow(plRow);
      const appDrLabel = appTotalR.getCell(1);
      appDrLabel.value = 'TOTAL RS.';
      appDrLabel.font = { bold: true, name: 'Arial', size: 10 };
      appDrLabel.border = { top: { style: 'thin' }, bottom: { style: 'double' } };

      const appDrAmt = appTotalR.getCell(2);
      appDrAmt.value = { formula: `SUM(B${appStartRow}:B${appEndRow})`, result: appropriationTotal };
      appDrAmt.numFmt = CURR_FMT;
      appDrAmt.font = { bold: true, name: 'Arial', size: 10 };
      appDrAmt.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
      appDrAmt.alignment = { horizontal: 'right' };

      const appCrLabel = appTotalR.getCell(3);
      appCrLabel.value = 'TOTAL RS.';
      appCrLabel.font = { bold: true, name: 'Arial', size: 10 };
      appCrLabel.border = { top: { style: 'thin' }, bottom: { style: 'double' } };

      const appCrAmt = appTotalR.getCell(4);
      appCrAmt.value = { formula: `D${appStartRow}`, result: netProfit };
      appCrAmt.numFmt = CURR_FMT;
      appCrAmt.font = { bold: true, name: 'Arial', size: 10 };
      appCrAmt.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
      appCrAmt.alignment = { horizontal: 'right' };
      plRow++;

      addPLDataRow('', null, false, '', null, false);
    }

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
    //  SHEET 3: ANNEXURE "A" - PARTNERS CAPITAL ACCOUNT
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
    const isMultiYearProjected = isProjected || (sourceData?.yearNumber && sourceData.yearNumber > 1);
    const annexAPrefix = isMultiYearProjected ? 'PROJECTED ' : (isProvisional ? 'ESTIMATED ' : '');
    aR3.getCell(1).value = `${annexAPrefix}STATEMENT OF PARTNERS CAPITAL ACCOUNT FOR THE YEAR ENDED ${endDateOrdinal}`;
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

    // Row 7: Numbered row (1 to 11)
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

    // Data Rows (Starting at Row 8) with Live Excel Formulas
    let currentAnnexARow = annexAStartRow;
    for (let i = 0; i < calculatedPartners.length; i++) {
      const p = calculatedPartners[i];
      const r = wsAnnexA.getRow(currentAnnexARow);
      const rowNum = currentAnnexARow;

      r.getCell(1).value = i + 1;
      r.getCell(1).alignment = { horizontal: 'center' };

      r.getCell(2).value = p.name;
      r.getCell(2).alignment = { horizontal: 'left' };
      r.getCell(2).font = { bold: true, name: 'Arial', size: 9 };

      r.getCell(3).value = `${p.sharePct}%`;
      r.getCell(3).alignment = { horizontal: 'center' };
      r.getCell(3).font = { bold: true, name: 'Arial', size: 9 };

      // Col D: Opening Balance (number)
      const dCell = r.getCell(4);
      dCell.value = p.openingBal;
      dCell.numFmt = CURR_FMT;
      dCell.alignment = { horizontal: 'right' };

      // Col E: Addition (number)
      const eCell = r.getCell(5);
      eCell.value = p.addition;
      eCell.numFmt = CURR_FMT;
      eCell.alignment = { horizontal: 'right' };

      // Col F: Salary (number)
      const fCell = r.getCell(6);
      fCell.value = p.salary;
      fCell.numFmt = CURR_FMT;
      fCell.alignment = { horizontal: 'right' };

      // Col G: Interest on Capital (number)
      const gCell = r.getCell(7);
      gCell.value = p.interestAmt;
      gCell.numFmt = CURR_FMT;
      gCell.alignment = { horizontal: 'right' };

      // Col H: Profit / Loss Share (number)
      const hCell = r.getCell(8);
      hCell.value = p.profitShare;
      hCell.numFmt = CURR_FMT;
      hCell.alignment = { horizontal: 'right' };

      // Col I: Total = SUM(D:H) (Formula)
      const iCell = r.getCell(9);
      iCell.value = { formula: `SUM(D${rowNum}:H${rowNum})`, result: p.total };
      iCell.numFmt = CURR_FMT;
      iCell.alignment = { horizontal: 'right' };

      // Col J: Withdrawals Amount (number)
      const jCell = r.getCell(10);
      jCell.value = p.withdrawalsAmt;
      jCell.numFmt = CURR_FMT;
      jCell.alignment = { horizontal: 'right' };

      // Col K: Withdrawals Nature (text)
      r.getCell(11).value = p.withdrawalsNature || '';
      r.getCell(11).alignment = { horizontal: 'center' };

      // Col L: Closing Balance = Total - Withdrawals = I - J (Formula)
      const lCell = r.getCell(12);
      lCell.value = { formula: `I${rowNum}-J${rowNum}`, result: p.closingBal };
      lCell.numFmt = CURR_FMT;
      lCell.alignment = { horizontal: 'right' };

      for (let c = 1; c <= 12; c++) {
        const cell = r.getCell(c);
        if (!cell.font) cell.font = { name: 'Arial', size: 9 };
        applyBorder(cell);
      }
      currentAnnexARow++;
    }

    // Totals Row with Auto Excel SUM Formulas
    const totARow = wsAnnexA.getRow(annexATotalRow);
    totARow.getCell(1).value = 'TOTAL';
    totARow.getCell(1).font = { bold: true, name: 'Arial', size: 10 };
    totARow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    wsAnnexA.mergeCells(annexATotalRow, 1, annexATotalRow, 3);

    const sumAOpening     = Math.round(sum(calculatedPartners.map((p: any) => ({ amount: p.openingBal }))) * 100) / 100;
    const sumAAddition    = Math.round(sum(calculatedPartners.map((p: any) => ({ amount: p.addition }))) * 100) / 100;
    const sumASalary      = Math.round(sum(calculatedPartners.map((p: any) => ({ amount: p.salary }))) * 100) / 100;
    const sumAInterest    = Math.round(sum(calculatedPartners.map((p: any) => ({ amount: p.interestAmt }))) * 100) / 100;
    const sumAProfit      = Math.round(sum(calculatedPartners.map((p: any) => ({ amount: p.profitShare }))) * 100) / 100;
    const sumATotal       = Math.round(sum(calculatedPartners.map((p: any) => ({ amount: p.total }))) * 100) / 100;
    const sumAWithdrawals = Math.round(sum(calculatedPartners.map((p: any) => ({ amount: p.withdrawalsAmt }))) * 100) / 100;
    const sumAClosing     = Math.round(sum(calculatedPartners.map((p: any) => ({ amount: p.closingBal }))) * 100) / 100;

    // Col D: Opening total
    const totD = totARow.getCell(4);
    totD.value = { formula: `SUM(D${annexAStartRow}:D${annexAEndRow})`, result: sumAOpening };
    totD.numFmt = CURR_FMT;
    totD.font = { bold: true, color: RED, name: 'Arial', size: 9.5 };
    totD.alignment = { horizontal: 'right' };

    // Col E: Addition total
    const totE = totARow.getCell(5);
    totE.value = { formula: `SUM(E${annexAStartRow}:E${annexAEndRow})`, result: sumAAddition };
    totE.numFmt = CURR_FMT;

    // Col F: Salary total
    const totF = totARow.getCell(6);
    totF.value = { formula: `SUM(F${annexAStartRow}:F${annexAEndRow})`, result: sumASalary };
    totF.numFmt = CURR_FMT;

    // Col G: Interest total
    const totG = totARow.getCell(7);
    totG.value = { formula: `SUM(G${annexAStartRow}:G${annexAEndRow})`, result: sumAInterest };
    totG.numFmt = CURR_FMT;

    // Col H: Profit total
    const totH = totARow.getCell(8);
    totH.value = { formula: `SUM(H${annexAStartRow}:H${annexAEndRow})`, result: sumAProfit };
    totH.numFmt = CURR_FMT;

    // Col I: Grand Total
    const totI = totARow.getCell(9);
    totI.value = { formula: `SUM(I${annexAStartRow}:I${annexAEndRow})`, result: sumATotal };
    totI.numFmt = CURR_FMT;

    // Col J: Withdrawals total
    const totJ = totARow.getCell(10);
    totJ.value = { formula: `SUM(J${annexAStartRow}:J${annexAEndRow})`, result: sumAWithdrawals };
    totJ.numFmt = CURR_FMT;

    totARow.getCell(11).value = '';

    // Col L: Closing balance total
    const totL = totARow.getCell(12);
    totL.value = { formula: `SUM(L${annexAStartRow}:L${annexAEndRow})`, result: sumAClosing };
    totL.numFmt = CURR_FMT;

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

    let aSignRow = annexATotalRow + 2;

    // Signatures in Annexure A
    const aPlaceR = wsAnnexA.getRow(aSignRow);
    aPlaceR.getCell(1).value = `PLACE  :  ${(place || company.state || '').toUpperCase()}`;
    aPlaceR.getCell(1).font = { name: 'Arial', size: 10 };

    aPlaceR.getCell(9).value = `M/S ${(company.mailingName || company.name).toUpperCase()}`;
    aPlaceR.getCell(9).alignment = { horizontal: 'center' };
    aPlaceR.getCell(9).font = { name: 'Arial', size: 10 };
    wsAnnexA.mergeCells(aSignRow, 9, aSignRow, 12);
    aSignRow += 2;

    const aSigR = wsAnnexA.getRow(aSignRow);
    aSigR.getCell(9).value = (signatoryTitle || 'PARTNER').toUpperCase();
    aSigR.getCell(9).alignment = { horizontal: 'center' };
    aSigR.getCell(9).font = { bold: true, name: 'Arial', size: 10 };
    wsAnnexA.mergeCells(aSignRow, 9, aSignRow, 12);


    // ═══════════════════════════════════════════════════════════════════
    //  SHEET 4: ANNEXURE "B" - FIXED ASSETS SCHEDULE
    // ═══════════════════════════════════════════════════════════════════
    const wsAnnexB = wb.addWorksheet('Annexure B', {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
    });
    wsAnnexB.views = [{ showGridLines: true }];

    wsAnnexB.columns = [
      { key: 'A', width: 34 },  // Particulars
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

    // Data Rows (Starting at Row 6) with Live Excel Formulas
    let currentAnnexBRow = annexBStartRow;
    for (const item of itemsToRenderAnnexB) {
      const r = wsAnnexB.getRow(currentAnnexBRow);
      const rowNum = currentAnnexBRow;

      r.getCell(1).value = item.name;
      r.getCell(1).alignment = { horizontal: 'left' };
      r.getCell(1).font = { name: 'Arial', size: 9.5 };

      // Col B: Opening
      const bCell = r.getCell(2);
      bCell.value = item.openingBal;
      bCell.numFmt = CURR_FMT;
      bCell.alignment = { horizontal: 'right' };

      // Col C: Addition Before 30.09
      const cCell = r.getCell(3);
      cCell.value = item.additionBefore;
      cCell.numFmt = CURR_FMT;
      cCell.alignment = { horizontal: 'right' };

      // Col D: Addition After 30.09
      const dCell = r.getCell(4);
      dCell.value = item.additionAfter;
      dCell.numFmt = CURR_FMT;
      dCell.alignment = { horizontal: 'right' };

      // Col E: Depreciation
      const eCell = r.getCell(5);
      eCell.value = item.depreciation;
      eCell.numFmt = CURR_FMT;
      eCell.alignment = { horizontal: 'right' };

      // Col F: Closing Balance = Opening + Additions - Depreciation = B + C + D - E (Formula)
      const fCell = r.getCell(6);
      fCell.value = { formula: `B${rowNum}+C${rowNum}+D${rowNum}-E${rowNum}`, result: item.closingBal };
      fCell.numFmt = CURR_FMT;
      fCell.alignment = { horizontal: 'right' };

      for (let c = 1; c <= 6; c++) {
        const cell = r.getCell(c);
        if (!cell.font) cell.font = { name: 'Arial', size: 9.5 };
        applyBorder(cell);
      }
      currentAnnexBRow++;
    }

    // Grand Total Row with Auto Excel SUM Formulas
    const grandTotR = wsAnnexB.getRow(annexBTotalRow);
    grandTotR.getCell(1).value = 'Grand Total';
    grandTotR.getCell(1).font = { bold: true, name: 'Arial', size: 10 };
    grandTotR.getCell(1).alignment = { horizontal: 'left' };

    const sumFaOpening   = Math.round(sum(itemsToRenderAnnexB.map(i => ({ amount: i.openingBal }))) * 100) / 100;
    const sumFaAddBefore = Math.round(sum(itemsToRenderAnnexB.map(i => ({ amount: i.additionBefore }))) * 100) / 100;
    const sumFaAddAfter  = Math.round(sum(itemsToRenderAnnexB.map(i => ({ amount: i.additionAfter }))) * 100) / 100;
    const sumFaDep       = Math.round(sum(itemsToRenderAnnexB.map(i => ({ amount: i.depreciation }))) * 100) / 100;
    const sumFaClosing   = Math.round(sum(itemsToRenderAnnexB.map(i => ({ amount: i.closingBal }))) * 100) / 100;

    // Col B total: SUM(B6:Bend)
    const totB = grandTotR.getCell(2);
    totB.value = { formula: `SUM(B${annexBStartRow}:B${annexBEndRow})`, result: sumFaOpening };
    totB.numFmt = CURR_FMT;

    // Col C total: SUM(C6:Cend)
    const totC = grandTotR.getCell(3);
    totC.value = { formula: `SUM(C${annexBStartRow}:C${annexBEndRow})`, result: sumFaAddBefore };
    totC.numFmt = CURR_FMT;

    // Col D total: SUM(D6:Dend)
    const totDCol = grandTotR.getCell(4);
    totDCol.value = { formula: `SUM(D${annexBStartRow}:D${annexBEndRow})`, result: sumFaAddAfter };
    totDCol.numFmt = CURR_FMT;

    // Col E total: SUM(E6:Eend)
    const totECol = grandTotR.getCell(5);
    totECol.value = { formula: `SUM(E${annexBStartRow}:E${annexBEndRow})`, result: sumFaDep };
    totECol.numFmt = CURR_FMT;

    // Col F total: SUM(F6:Fend)
    const totFCol = grandTotR.getCell(6);
    totFCol.value = { formula: `SUM(F${annexBStartRow}:F${annexBEndRow})`, result: sumFaClosing };
    totFCol.numFmt = CURR_FMT;

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
    const prefixSlug = isProvisional ? 'PROV_' : (isProjected ? 'PROJECTED_' : '');
    const fileName = `${companySlug}_${prefixSlug}FinancialStatements_CA_Format.xlsx`;

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
