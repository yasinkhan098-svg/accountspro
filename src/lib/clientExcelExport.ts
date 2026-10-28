/**
 * Client-Side Professional Excel Export Utility (using ExcelJS)
 * 
 * Generates 100% identical CA-format multi-sheet financial statement Excel files
 * directly in the browser without requiring a server connection.
 * Used for offline mode and desktop app, as well as offline fallback.
 */

// ─── Style Constants (Exact match with /api/reports/export-excel) ───────────
const RED_ARGB   = 'FFCC0000';
const GREEN_ARGB = 'FF006600';
const BLACK_ARGB = 'FF000000';
const DARK_BG_ARGB = 'FFD3D3D3';
const HEADER_BG_ARGB = 'FFF0F0F0';
const TOTAL_BG_ARGB  = 'FFF8F8F8';
const CURR_FMT = '#,##0.00';

function applyBorder(cell: any, sides: string[] = ['top', 'left', 'bottom', 'right']) {
  const border: any = {};
  sides.forEach(s => (border[s] = { style: 'thin', color: { argb: BLACK_ARGB } }));
  cell.border = border;
}

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

const sum = (arr: any[]) => arr.reduce((s, i) => s + (Number(i.amount) || 0), 0);

/**
 * Loads ExcelJS in browser with local vendor fallback and multiple CDN fallbacks.
 */
export async function loadExcelJS(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).ExcelJS) {
    return (window as any).ExcelJS;
  }

  const sources = [
    '/vendor/exceljs.min.js',
    'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
    'https://unpkg.com/exceljs@4.4.0/dist/exceljs.min.js',
  ];

  for (const src of sources) {
    try {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        const timer = setTimeout(() => reject(new Error(`Timeout loading ${src}`)), 8000);
        s.onload = () => { clearTimeout(timer); resolve(); };
        s.onerror = () => { clearTimeout(timer); reject(new Error(`Failed to load ${src}`)); };
        document.head.appendChild(s);
      });
      if ((window as any).ExcelJS) return (window as any).ExcelJS;
    } catch {
      // try next source
    }
  }

  throw new Error('Excel library load nahi ho saki. Kripya browser refresh karein.');
}

/**
 * Triggers a browser download of the generated workbook buffer.
 */
function downloadWorkbookBuffer(buffer: any, fileName: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. FULL CA-FORMAT FINANCIAL STATEMENTS (4 Sheets: BS, P&L, Annex A, Annex B)
// Exact match with /api/reports/export-excel/route.ts
// ─────────────────────────────────────────────────────────────────────────────
export async function exportCAFormatExcelClient(postBody: any): Promise<void> {
  const ExcelJS = await loadExcelJS();

  const company = postBody?.company || {
    name: postBody?.companyName || 'COMPANY NAME',
    mailingName: postBody?.companyName || 'COMPANY NAME',
    address: postBody?.companyAddress || '',
    state: postBody?.place || '',
  };

  const asOnDate  = postBody?.asOnDate;
  const fromDate  = postBody?.fromDate;
  const toDate    = postBody?.toDate;
  const caName    = postBody?.caName || 'C.A NAME';
  const caMno     = postBody?.caMno  || '000000';
  const place     = postBody?.place  || company?.state || '';
  const rawSignatory = postBody?.signatoryTitle || 'PARTNER';

  let signatoryTitle = (rawSignatory || 'PARTNER').trim();
  if (signatoryTitle.toLowerCase() === 'proprietorship') {
    signatoryTitle = 'PROPRIETOR';
  } else if (signatoryTitle.toLowerCase() === 'partnership') {
    signatoryTitle = 'PARTNER';
  }
  signatoryTitle = signatoryTitle.toUpperCase();

  const isProvisional = postBody?.reportMode === 'provisional' || postBody?.isProvisional;
  const isProjected   = postBody?.reportMode === 'projected';
  const titlePrefix   = isProvisional ? 'PROV. ' : isProjected ? 'PROJECTED ' : '';

  const sourceData = (isProvisional || isProjected)
    ? (postBody?.projectedData || postBody?.statementData)
    : (postBody?.statementData || postBody?.projectedData);

  let inputPartners: any[] = [];
  const partnersDataRaw = postBody?.partnersData;
  if (Array.isArray(partnersDataRaw)) {
    inputPartners = partnersDataRaw;
  } else if (typeof partnersDataRaw === 'string') {
    try { inputPartners = JSON.parse(partnersDataRaw); } catch {}
  }

  const parsedAsOn = parseReportDate(asOnDate, true);
  const parsedFrom = parseReportDate(fromDate, false);
  const parsedTo   = parseReportDate(toDate, true);

  const fromDateObj = parsedFrom || new Date(new Date().getFullYear(), 3, 1);
  const toDateObj   = parsedTo   || parsedAsOn || new Date(new Date().getFullYear() + 1, 2, 31, 23, 59, 59, 999);

  // Extract or Compute P&L Data
  const salesItems: any[]      = sourceData?.salesItems      ? sourceData.salesItems.map((i: any) => ({ name: i.name, amount: Number(i.amount) || 0 })) : [];
  const purchaseItems: any[]   = sourceData?.purchaseItems   ? sourceData.purchaseItems.map((i: any) => ({ name: i.name, amount: Number(i.amount) || 0 })) : [];
  const directExpItems: any[]  = sourceData?.directExpItems  ? sourceData.directExpItems.map((i: any) => ({ name: i.name, amount: Number(i.amount) || 0 })) : [];
  const indirectExpItems: any[]= sourceData?.indirectExpItems? sourceData.indirectExpItems.map((i: any) => ({ name: i.name, amount: Number(i.amount) || 0 })) : [];
  const indirectIncItems: any[]= sourceData?.indirectIncItems? sourceData.indirectIncItems.map((i: any) => ({ name: i.name, amount: Number(i.amount) || 0 })) : [];

  const openingStock = sourceData?.openingStock !== undefined ? Math.round(Number(sourceData.openingStock) * 100) / 100 : 0;
  const closingStock = sourceData?.closingStock !== undefined ? Math.round(Number(sourceData.closingStock) * 100) / 100 : 0;

  let salesTotal        = sourceData?.salesTotal !== undefined ? Number(sourceData.salesTotal) : (salesItems.length > 0 ? sum(salesItems) : Number(sourceData?.salesAmount || 0));
  let purchaseTotal     = sourceData?.purchaseTotal !== undefined ? Number(sourceData.purchaseTotal) : (purchaseItems.length > 0 ? sum(purchaseItems) : Number(sourceData?.purchaseAmount || 0));
  let directExpTotal    = sourceData?.directExpTotal !== undefined ? Number(sourceData.directExpTotal) : sum(directExpItems);
  let indirectExpTotal  = sourceData?.indirectExpTotal !== undefined ? Number(sourceData.indirectExpTotal) : sum(indirectExpItems);
  let indirectIncTotal  = sourceData?.indirectIncTotal !== undefined ? Number(sourceData.indirectIncTotal) : sum(indirectIncItems);

  salesTotal        = Math.round(salesTotal * 100) / 100;
  purchaseTotal     = Math.round(purchaseTotal * 100) / 100;
  directExpTotal    = Math.round(directExpTotal * 100) / 100;
  indirectExpTotal  = Math.round(indirectExpTotal * 100) / 100;
  indirectIncTotal  = Math.round(indirectIncTotal * 100) / 100;

  const tradingDebit      = Math.round((openingStock + purchaseTotal + directExpTotal) * 100) / 100;
  const tradingCredit     = Math.round((salesTotal + closingStock) * 100) / 100;
  const grossProfit       = sourceData?.grossProfit !== undefined ? Number(sourceData.grossProfit) : Math.round((tradingCredit - tradingDebit) * 100) / 100;
  const netProfit         = sourceData?.netProfit !== undefined ? Number(sourceData.netProfit) : Math.round((grossProfit + indirectIncTotal - indirectExpTotal) * 100) / 100;
  const tradingTotal      = Math.round(Math.max(tradingDebit + (grossProfit > 0 ? grossProfit : 0),
                                                tradingCredit + (grossProfit < 0 ? Math.abs(grossProfit) : 0)) * 100) / 100;
  const plTotal           = Math.round(Math.max(
    indirectExpTotal + (netProfit > 0 ? netProfit : 0),
    (grossProfit > 0 ? grossProfit : 0) + indirectIncTotal + (netProfit < 0 ? Math.abs(netProfit) : 0)
  ) * 100) / 100;

  // Clean and merge duplicate Balance Sheet rows
  const cleanBSRows = (rows: any[]): any[] => {
    if (!Array.isArray(rows)) return [];
    const cleaned: any[] = [];
    const seenInSection = new Map<string, number>();

    for (const r of rows) {
      if (!r) continue;
      if (r.type === 'section-header') {
        seenInSection.clear();
        cleaned.push(r);
      } else if (r.type === 'section-total' || r.type === 'blank' || r.type === 'net-entry') {
        cleaned.push(r);
      } else {
        const k = (r.name || '').trim().toLowerCase();
        if (k && seenInSection.has(k)) {
          const existingIdx = seenInSection.get(k)!;
          cleaned[existingIdx].amount = Math.round(((Number(cleaned[existingIdx].amount) || 0) + (Number(r.amount) || 0)) * 100) / 100;
        } else {
          if (k) seenInSection.set(k, cleaned.length);
          cleaned.push({ ...r });
        }
      }
    }

    let currentSecItems: any[] = [];
    for (let i = 0; i < cleaned.length; i++) {
      const item = cleaned[i];
      if (item.type === 'section-header') {
        currentSecItems = [];
      } else if (item.type === 'section-total') {
        const newTotal = currentSecItems.reduce((s, x) => s + (Number(x.amount) || 0), 0);
        cleaned[i].amount = Math.round(newTotal * 100) / 100;
      } else if (item.type !== 'blank' && item.type !== 'net-entry') {
        currentSecItems.push(item);
      }
    }
    return cleaned;
  };

  const rawLiabilities = postBody?.balanceSheetRows?.liabilities || [];
  const rawAssets = postBody?.balanceSheetRows?.assets || [];
  const liabilities = cleanBSRows(rawLiabilities);
  const assets = cleanBSRows(rawAssets);

  const liabTotalsSum = liabilities.filter((r: any) => r.type === 'section-total').reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
  const liabNetEntry = liabilities.find((r: any) => r.type === 'net-entry');
  const calculatedTotalLiab = Math.round((liabTotalsSum + (liabNetEntry ? (Number(liabNetEntry.amount) || 0) : 0)) * 100) / 100;

  const assetTotalsSum = assets.filter((r: any) => r.type === 'section-total').reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
  const assetNetEntry = assets.find((r: any) => r.type === 'net-entry');
  const calculatedTotalAssets = Math.round((assetTotalsSum + (assetNetEntry ? (Number(assetNetEntry.amount) || 0) : 0)) * 100) / 100;

  const totalLiabilities = calculatedTotalLiab > 0 ? calculatedTotalLiab : (Number(postBody?.balanceSheetRows?.totalLiabilities) || 0);
  const totalAssets = calculatedTotalAssets > 0 ? calculatedTotalAssets : (Number(postBody?.balanceSheetRows?.totalAssets) || 0);

  // Extract Capital Accounts from Balance Sheet for Annexure A
  const capitalItemsFromBS: any[] = [];
  if (liabilities && Array.isArray(liabilities)) {
    let inCapitalSection = false;
    for (const row of liabilities) {
      if (row.type === 'section-header' && row.name.toUpperCase().includes('CAPITAL')) {
        inCapitalSection = true;
        continue;
      }
      if (inCapitalSection) {
        if (row.type === 'section-header' || row.type === 'section-total' || row.type === 'blank') {
          if (row.type === 'section-total' || row.type === 'section-header') inCapitalSection = false;
          continue;
        }
        if (row.amount && row.amount > 0) {
          capitalItemsFromBS.push({ name: row.name, amount: row.amount });
        }
      }
    }
  }

  // Extract Fixed Assets from Balance Sheet for Annexure B
  const fixedAssetsFromBS: any[] = [];
  if (assets && Array.isArray(assets)) {
    let inFixedAssetSection = false;
    for (const row of assets) {
      if (row.type === 'section-header' && row.name.toUpperCase().includes('FIXED')) {
        inFixedAssetSection = true;
        continue;
      }
      if (inFixedAssetSection) {
        if (row.type === 'section-header' || row.type === 'section-total' || row.type === 'blank') {
          if (row.type === 'section-total' || row.type === 'section-header') inFixedAssetSection = false;
          continue;
        }
        if (row.amount && row.amount > 0) {
          fixedAssetsFromBS.push({ name: row.name, amount: row.amount });
        }
      }
    }
  }

  // Calculate Annexure A (Partners / Proprietor Capital Account)
  let calculatedPartners: any[] = [];
  const bsCapTotal = capitalItemsFromBS.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  if (inputPartners && inputPartners.length > 0) {
    const sumInputOpening = inputPartners.reduce((s: number, p: any) => s + (Number(p.openingBal || p.openingBalance) || 0), 0);
    calculatedPartners = inputPartners.map((p: any, idx: number) => {
      const name = (p.name && String(p.name).trim()) ? String(p.name).trim().toUpperCase() : `PARTNER ${idx + 1}`;
      const sharePct = Number(p.sharePct || p.share || (100 / inputPartners.length));
      let openingBal = Math.round(Number(p.openingBal || p.openingBalance || 0) * 100) / 100;
      if (sumInputOpening === 0 && bsCapTotal > 0) {
        openingBal = Math.round(bsCapTotal * (sharePct / 100) * 100) / 100;
      }
      const addition = Math.round(Number(p.addition || 0) * 100) / 100;
      const salary = Math.round(Number(p.salary || 0) * 100) / 100;
      const interestRate = p.interestRate !== undefined ? Number(p.interestRate) : 12;
      const interestAmt = (p.interestAmt !== undefined && p.interestAmt !== '' && p.interestAmt !== null)
        ? Math.round(Number(p.interestAmt) * 100) / 100
        : (p.interest !== undefined ? Math.round(Number(p.interest) * 100) / 100 : Math.round(openingBal * (interestRate / 100) * 100) / 100);
      const profitShare = (p.profitShare !== undefined && p.profitShare !== '' && p.profitShare !== null)
        ? Math.round(Number(p.profitShare) * 100) / 100
        : Math.round((netProfit * (sharePct / 100)) * 100) / 100;
      const total = (p.total !== undefined && p.total !== '' && p.total !== null)
        ? Math.round(Number(p.total) * 100) / 100
        : Math.round((openingBal + addition + salary + interestAmt + profitShare) * 100) / 100;
      const withdrawalsAmt = Math.round(Number(p.withdrawalsAmt || p.withdrawals || 0) * 100) / 100;
      const withdrawalsNature = String(p.withdrawalsNature || '');
      const closingBal = (p.closingBal !== undefined && p.closingBal !== '' && p.closingBal !== null)
        ? Math.round(Number(p.closingBal) * 100) / 100
        : (p.closingBalance !== undefined ? Math.round(Number(p.closingBalance) * 100) / 100 : Math.round((total - withdrawalsAmt) * 100) / 100);
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
  } else if (capitalItemsFromBS.length > 0) {
    const pct = Math.floor((100 / capitalItemsFromBS.length) * 100) / 100;
    calculatedPartners = capitalItemsFromBS.map((c: any, idx: number) => {
      const name = (c.name && String(c.name).trim()) ? String(c.name).trim().toUpperCase() : `PARTNER ${idx + 1}`;
      const sharePct = idx === capitalItemsFromBS.length - 1 ? (100 - (pct * (capitalItemsFromBS.length - 1))) : pct;
      const openingBal = Math.round(Number(c.amount || 0) * 100) / 100;
      const addition = 0;
      const salary = 0;
      const interestRate = 12;
      const interestAmt = Math.round(openingBal * (interestRate / 100) * 100) / 100;
      const profitShare = Math.round((netProfit * (sharePct / 100)) * 100) / 100;
      const total = Math.round((openingBal + addition + salary + interestAmt + profitShare) * 100) / 100;
      const withdrawalsAmt = 0;
      const withdrawalsNature = '';
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
  } else {
    calculatedPartners = [
      {
        name: (company.mailingName || company.name || 'PROPRIETOR').toUpperCase(),
        sharePct: 100,
        openingBal: bsCapTotal || 0,
        addition: 0,
        salary: 0,
        interestRate: 12,
        interestAmt: 0,
        profitShare: netProfit,
        total: (bsCapTotal || 0) + netProfit,
        withdrawalsAmt: 0,
        withdrawalsNature: '',
        closingBal: (bsCapTotal || 0) + netProfit,
      }
    ];
  }

  // Calculate Annexure B (Fixed Assets Schedule)
  const fyStartYear = fromDateObj.getFullYear();
  let faScheduleRows: any[] = [];

  if (fixedAssetsFromBS.length > 0) {
    faScheduleRows = fixedAssetsFromBS.map((fa: any) => {
      const existing = (sourceData?.fixedAssetSchedule || []).find((x: any) => (x.name || '').trim().toLowerCase() === fa.name.trim().toLowerCase());
      const closingBal = Math.round(Number(fa.amount || 0) * 100) / 100;
      const additionBefore = existing ? Math.round(Number(existing.additionBefore || 0) * 100) / 100 : 0;
      const additionAfter = existing ? Math.round(Number(existing.additionAfter || 0) * 100) / 100 : 0;
      const depreciation = existing ? Math.round(Number(existing.depreciation || 0) * 100) / 100 : 0;
      const calcOpening = Math.round((closingBal - additionBefore - additionAfter + depreciation) * 100) / 100;
      const openingBal = existing?.openingBal ? Math.round(Number(existing.openingBal) * 100) / 100 : (calcOpening > 0 ? calcOpening : closingBal);
      return {
        name: fa.name,
        openingBal,
        additionBefore,
        additionAfter,
        depreciation,
        closingBal,
      };
    });
  } else if (sourceData?.fixedAssetSchedule && sourceData.fixedAssetSchedule.length > 0) {
    faScheduleRows = sourceData.fixedAssetSchedule.map((fa: any) => ({
      name: fa.name,
      openingBal: Math.round(Number(fa.openingBal || 0) * 100) / 100,
      additionBefore: Math.round(Number(fa.additionBefore || 0) * 100) / 100,
      additionAfter: Math.round(Number(fa.additionAfter || 0) * 100) / 100,
      depreciation: Math.round(Number(fa.depreciation || 0) * 100) / 100,
      closingBal: Math.round(Number(fa.closingBal || 0) * 100) / 100,
    }));
  } else {
    faScheduleRows = [
      { name: 'Fixed Assets', openingBal: 0, additionBefore: 0, additionAfter: 0, depreciation: 0, closingBal: 0 }
    ];
  }

  const annexAStartRow = 8;
  const annexAEndRow = calculatedPartners.length > 0 ? (annexAStartRow + calculatedPartners.length - 1) : 8;
  const annexATotalRow = annexAEndRow + 1;

  const annexBStartRow = 6;
  const annexBEndRow = faScheduleRows.length > 0 ? (annexBStartRow + faScheduleRows.length - 1) : 6;
  const annexBTotalRow = annexBEndRow + 1;

  // ─── Create Workbook ───────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = company.name || 'AccountsPro';
  wb.created = new Date();

  // ═══════════════════════════════════════════════════════════════════
  //  SHEET 1: BALANCE SHEET (Exact Real Entries & Format as on Screen)
  // ═══════════════════════════════════════════════════════════════════
  const wsBS = wb.addWorksheet('Balance Sheet', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
  });
  wsBS.views = [{ showGridLines: true }];

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

  // Company Header
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

  bsRow++; // Blank row

  // Sub-header: LIABILITIES | AMOUNT | ASSETS | AMOUNT
  const bsSubHeader = wsBS.getRow(bsRow);
  const bsHeaders = ['LIABILITIES', 'AMOUNT', 'ASSETS', 'AMOUNT'];
  bsHeaders.forEach((h, i) => {
    const cell = bsSubHeader.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, name: 'Arial', size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG_ARGB } };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
    cell.alignment = { horizontal: i % 2 === 0 ? 'left' : 'right' };
  });
  bsRow++;

  const startDataRow = bsRow;
  const maxBSRows = Math.max(liabilities.length, assets.length);
  const liabSumCells: string[] = [];
  const assetSumCells: string[] = [];

  for (let i = 0; i < maxBSRows; i++) {
    const l = liabilities[i];
    const a = assets[i];
    const row = wsBS.getRow(bsRow);
    row.height = 20;

    // Left Side (Liabilities)
    const cellA = row.getCell(1);
    const cellB = row.getCell(2);

    if (l) {
      cellA.value = l.name;
      cellA.alignment = { horizontal: 'left', vertical: 'middle' };

      if (l.type === 'section-header') {
        cellA.font = { name: 'Arial', size: 10, bold: true, underline: true };
      } else if (l.type === 'group-header') {
        cellA.font = { name: 'Arial', size: 10, bold: true };
        cellA.alignment = { indent: 1, horizontal: 'left', vertical: 'middle' };
      } else if (l.type === 'ledger') {
        cellA.font = { name: 'Arial', size: 10 };
        cellA.alignment = { indent: 2, horizontal: 'left', vertical: 'middle' };
      } else if (l.type === 'net-entry') {
        cellA.font = { name: 'Arial', size: 10, italic: true, bold: true };
        cellA.alignment = { indent: 1, horizontal: 'left', vertical: 'middle' };
      }

      if (l.amount !== undefined && l.amount !== null && l.type !== 'section-header' && l.type !== 'blank') {
        cellB.value = Number(l.amount);
        cellB.numFmt = CURR_FMT;
        cellB.alignment = { horizontal: 'right', vertical: 'middle' };

        if (l.type === 'section-total') {
          cellB.font = { name: 'Arial', size: 10, bold: true };
          cellB.border = { top: { style: 'thin' } };
          liabSumCells.push(`B${bsRow}`);
        } else if (l.type === 'net-entry') {
          cellB.font = { name: 'Arial', size: 10, bold: true, color: { argb: GREEN_ARGB } };
          liabSumCells.push(`B${bsRow}`);
        } else {
          cellB.font = { name: 'Arial', size: 10, color: { argb: RED_ARGB } };
        }
      }
    }

    // Right Side (Assets)
    const cellC = row.getCell(3);
    const cellD = row.getCell(4);

    if (a) {
      cellC.value = a.name;
      cellC.alignment = { horizontal: 'left', vertical: 'middle' };

      if (a.type === 'section-header') {
        cellC.font = { name: 'Arial', size: 10, bold: true, underline: true };
      } else if (a.type === 'group-header') {
        cellC.font = { name: 'Arial', size: 10, bold: true };
        cellC.alignment = { indent: 1, horizontal: 'left', vertical: 'middle' };
      } else if (a.type === 'ledger') {
        cellC.font = { name: 'Arial', size: 10 };
        cellC.alignment = { indent: 2, horizontal: 'left', vertical: 'middle' };
      } else if (a.type === 'net-entry') {
        cellC.font = { name: 'Arial', size: 10, italic: true, bold: true };
        cellC.alignment = { indent: 1, horizontal: 'left', vertical: 'middle' };
      }

      if (a.amount !== undefined && a.amount !== null && a.type !== 'section-header' && a.type !== 'blank') {
        cellD.value = Number(a.amount);
        cellD.numFmt = CURR_FMT;
        cellD.alignment = { horizontal: 'right', vertical: 'middle' };

        if (a.type === 'section-total') {
          cellD.font = { name: 'Arial', size: 10, bold: true };
          cellD.border = { top: { style: 'thin' } };
          assetSumCells.push(`D${bsRow}`);
        } else if (a.type === 'net-entry') {
          cellD.font = { name: 'Arial', size: 10, bold: true, color: { argb: RED_ARGB } };
          assetSumCells.push(`D${bsRow}`);
        } else {
          cellD.font = { name: 'Arial', size: 10, color: { argb: RED_ARGB } };
        }
      }
    }

    bsRow++;
  }

  // Total Row
  const totalR = wsBS.getRow(bsRow);
  totalR.height = 24;

  const liabLabelCell = totalR.getCell(1);
  liabLabelCell.value = 'TOTAL RS.';
  liabLabelCell.font = { bold: true, name: 'Arial', size: 11 };
  liabLabelCell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };

  const liabAmtCell = totalR.getCell(2);
  const liabFormula = liabSumCells.length > 0 ? liabSumCells.join('+') : `SUM(B${startDataRow}:B${bsRow - 1})`;
  liabAmtCell.value = { formula: liabFormula, result: Number(totalLiabilities) };
  liabAmtCell.numFmt = CURR_FMT;
  liabAmtCell.font = { bold: true, name: 'Arial', size: 11 };
  liabAmtCell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
  liabAmtCell.alignment = { horizontal: 'right', vertical: 'middle' };

  const assetLabelCell = totalR.getCell(3);
  assetLabelCell.value = 'TOTAL RS.';
  assetLabelCell.font = { bold: true, name: 'Arial', size: 11 };
  assetLabelCell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };

  const assetAmtCell = totalR.getCell(4);
  const assetFormula = assetSumCells.length > 0 ? assetSumCells.join('+') : `SUM(D${startDataRow}:D${bsRow - 1})`;
  assetAmtCell.value = { formula: assetFormula, result: Number(totalAssets) };
  assetAmtCell.numFmt = CURR_FMT;
  assetAmtCell.font = { bold: true, name: 'Arial', size: 11 };
  assetAmtCell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
  assetAmtCell.alignment = { horizontal: 'right', vertical: 'middle' };
  bsRow++;

  bsRow++; // Blank row

  // Signatures
  const compiledR = wsBS.getRow(bsRow);
  compiledR.getCell(1).value = 'compiled on the basis of information provided to us';
  wsBS.mergeCells(bsRow, 1, bsRow, 4);
  compiledR.getCell(1).alignment = { horizontal: 'center' };
  compiledR.getCell(1).font = { italic: true, name: 'Arial', size: 9 };
  bsRow += 2;

  const placeR = wsBS.getRow(bsRow);
  placeR.getCell(1).value = `PLACE  :  ${(place || company.state || '').toUpperCase()}`;
  placeR.getCell(1).font = { name: 'Arial', size: 10 };
  bsRow += 2;

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
  bsRow += 2;

  const caNameR = wsBS.getRow(bsRow);
  caNameR.getCell(3).value = caName;
  caNameR.getCell(3).alignment = { horizontal: 'center' };
  wsBS.mergeCells(bsRow, 3, bsRow, 4);
  bsRow += 2;

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
  //  SHEET 2: TRADING, PROFIT & LOSS (Matching P&L View)
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

  const plSubHeader = wsPL.getRow(plRow);
  ['PARTICULARS', 'AMOUNT', 'PARTICULARS', 'AMOUNT'].forEach((h, i) => {
    const cell = plSubHeader.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, name: 'Arial', size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG_ARGB } };
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
      amtCell.font = { bold: drBold, name: 'Arial', size: 10, color: { argb: drRed ? RED_ARGB : BLACK_ARGB } };
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
      amtCell.font = { bold: crBold, name: 'Arial', size: 10, color: { argb: crRed ? RED_ARGB : BLACK_ARGB } };
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

  // Trading Section
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

  // Trading Total Row
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

  // P&L Section
  const plSectionStartRow = plRow;

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

  // P&L Total Row
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

  // Appropriation Section (For Partnership firms / Annexure A)
  if (signatoryTitle === 'PARTNER' && calculatedPartners.length > 0) {
    const totInterest = Math.round(calculatedPartners.reduce((s: number, p: any) => s + (p.interestAmt || 0), 0) * 100) / 100;
    const totSalary   = Math.round(calculatedPartners.reduce((s: number, p: any) => s + (p.salary || 0), 0) * 100) / 100;
    const totProfitCd = Math.round(calculatedPartners.reduce((s: number, p: any) => s + (p.profitShare || 0), 0) * 100) / 100;
    const appropriationTotal = Math.round((totInterest + totSalary + totProfitCd) * 100) / 100;

    const appStartRow = plRow;

    addPLDataRow(
      'To Interest on Capital', 
      { formula: `'Annexure A'!G${annexATotalRow}`, result: totInterest }, 
      false,
      'By Net Profit b/d', 
      { formula: `B${npRow}`, result: netProfit }, 
      false
    );

    addPLDataRow(
      'To Salary to partner', 
      { formula: `'Annexure A'!F${annexATotalRow}`, result: totSalary }, 
      false,
      '', null, false
    );

    addPLDataRow(
      'To Net Profit C/d', 
      { formula: `'Annexure A'!H${annexATotalRow}`, result: totProfitCd }, 
      false,
      '', null, false
    );

    addPLDataRow(
      '(Transferred to Capital A/c)', null, false,
      '', null, false
    );

    const appEndRow = plRow - 1;

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
  plRow += 2;

  const plPlaceR = wsPL.getRow(plRow);
  plPlaceR.getCell(1).value = `PLACE  :  ${(place || company.state || '').toUpperCase()}`;
  plPlaceR.getCell(1).font = { name: 'Arial', size: 10 };
  plRow += 2;

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
  plRow += 2;

  const plCaNameR = wsPL.getRow(plRow);
  plCaNameR.getCell(3).value = caName;
  plCaNameR.getCell(3).alignment = { horizontal: 'center' };
  wsPL.mergeCells(plRow, 3, plRow, 4);
  plRow += 2;

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

  const aR1 = wsAnnexA.getRow(1);
  aR1.getCell(1).value = `M/S ${(company.mailingName || company.name).toUpperCase()}`;
  aR1.getCell(1).font = { bold: true, name: 'Arial', size: 11 };
  wsAnnexA.mergeCells(1, 1, 1, 12);
  for (let c = 1; c <= 12; c++) {
    aR1.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
  }

  const aR2 = wsAnnexA.getRow(2);
  aR2.getCell(1).value = (company.address || '').toUpperCase();
  aR2.getCell(1).font = { name: 'Arial', size: 10 };
  wsAnnexA.mergeCells(2, 1, 2, 10);
  aR2.getCell(11).value = 'ANNEXURE "A"';
  aR2.getCell(11).font = { bold: true, name: 'Arial', size: 10 };
  aR2.getCell(11).alignment = { horizontal: 'right' };
  wsAnnexA.mergeCells(2, 11, 2, 12);

  const aR3 = wsAnnexA.getRow(3);
  const endDateOrdinal = toDateObj ? formatOrdinalDate(toDateObj) : '31ST MARCH 2026';
  const isMultiYearProjected = isProjected || (sourceData?.yearNumber && sourceData.yearNumber > 1);
  const annexAPrefix = isMultiYearProjected ? 'PROJECTED ' : (isProvisional ? 'ESTIMATED ' : '');
  aR3.getCell(1).value = `${annexAPrefix}STATEMENT OF PARTNERS CAPITAL ACCOUNT FOR THE YEAR ENDED ${endDateOrdinal}`;
  aR3.getCell(1).font = { bold: true, underline: true, name: 'Arial', size: 11 };
  wsAnnexA.mergeCells(3, 1, 3, 12);

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

  // Data Rows
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

    const dCell = r.getCell(4);
    dCell.value = p.openingBal;
    dCell.numFmt = CURR_FMT;
    dCell.alignment = { horizontal: 'right' };

    const eCell = r.getCell(5);
    eCell.value = p.addition;
    eCell.numFmt = CURR_FMT;
    eCell.alignment = { horizontal: 'right' };

    const fCell = r.getCell(6);
    fCell.value = p.salary;
    fCell.numFmt = CURR_FMT;
    fCell.alignment = { horizontal: 'right' };

    const gCell = r.getCell(7);
    gCell.value = p.interestAmt;
    gCell.numFmt = CURR_FMT;
    gCell.alignment = { horizontal: 'right' };

    const hCell = r.getCell(8);
    hCell.value = p.profitShare;
    hCell.numFmt = CURR_FMT;
    hCell.alignment = { horizontal: 'right' };

    const iCell = r.getCell(9);
    iCell.value = { formula: `SUM(D${rowNum}:H${rowNum})`, result: p.total };
    iCell.numFmt = CURR_FMT;
    iCell.alignment = { horizontal: 'right' };

    const jCell = r.getCell(10);
    jCell.value = p.withdrawalsAmt;
    jCell.numFmt = CURR_FMT;
    jCell.alignment = { horizontal: 'right' };

    r.getCell(11).value = p.withdrawalsNature || '';
    r.getCell(11).alignment = { horizontal: 'center' };

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

  // Totals Row
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

  const totD = totARow.getCell(4);
  totD.value = { formula: `SUM(D${annexAStartRow}:D${annexAEndRow})`, result: sumAOpening };
  totD.numFmt = CURR_FMT;
  totD.font = { bold: true, color: { argb: RED_ARGB }, name: 'Arial', size: 9.5 };
  totD.alignment = { horizontal: 'right' };

  const totE = totARow.getCell(5);
  totE.value = { formula: `SUM(E${annexAStartRow}:E${annexAEndRow})`, result: sumAAddition };
  totE.numFmt = CURR_FMT;

  const totF = totARow.getCell(6);
  totF.value = { formula: `SUM(F${annexAStartRow}:F${annexAEndRow})`, result: sumASalary };
  totF.numFmt = CURR_FMT;

  const totG = totARow.getCell(7);
  totG.value = { formula: `SUM(G${annexAStartRow}:G${annexAEndRow})`, result: sumAInterest };
  totG.numFmt = CURR_FMT;

  const totH = totARow.getCell(8);
  totH.value = { formula: `SUM(H${annexAStartRow}:H${annexAEndRow})`, result: sumAProfit };
  totH.numFmt = CURR_FMT;

  const totI = totARow.getCell(9);
  totI.value = { formula: `SUM(I${annexAStartRow}:I${annexAEndRow})`, result: sumATotal };
  totI.numFmt = CURR_FMT;

  const totJ = totARow.getCell(10);
  totJ.value = { formula: `SUM(J${annexAStartRow}:J${annexAEndRow})`, result: sumAWithdrawals };
  totJ.numFmt = CURR_FMT;

  totARow.getCell(11).value = '';

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
    { key: 'A', width: 34 },
    { key: 'B', width: 18 },
    { key: 'C', width: 18 },
    { key: 'D', width: 18 },
    { key: 'E', width: 16 },
    { key: 'F', width: 18 },
  ];

  const bR1 = wsAnnexB.getRow(1);
  bR1.getCell(1).value = 'Fixed Assets';
  bR1.getCell(1).font = { bold: true, name: 'Arial', size: 11 };
  bR1.getCell(1).alignment = { horizontal: 'center' };
  wsAnnexB.mergeCells(1, 1, 1, 6);
  for (let c = 1; c <= 6; c++) {
    bR1.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
  }

  const bR2 = wsAnnexB.getRow(2);
  bR2.getCell(1).value = `M/S ${(company.mailingName || company.name).toUpperCase()}`;
  bR2.getCell(1).font = { bold: true, name: 'Arial', size: 11 };
  bR2.getCell(1).alignment = { horizontal: 'center' };
  wsAnnexB.mergeCells(2, 1, 2, 6);

  const bR3 = wsAnnexB.getRow(3);
  const fromDash = fromDateObj ? formatDashDate(fromDateObj) : '1-Apr-2025';
  const toDash = toDateObj ? formatDashDate(toDateObj) : '31-Mar-2026';
  bR3.getCell(1).value = `${fromDash} to ${toDash}`;
  bR3.getCell(1).font = { name: 'Arial', size: 10 };
  bR3.getCell(1).alignment = { horizontal: 'center' };
  wsAnnexB.mergeCells(3, 1, 3, 6);

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

  let currentAnnexBRow = annexBStartRow;
  for (const item of faScheduleRows) {
    const r = wsAnnexB.getRow(currentAnnexBRow);
    const rowNum = currentAnnexBRow;

    r.getCell(1).value = item.name;
    r.getCell(1).alignment = { horizontal: 'left' };
    r.getCell(1).font = { name: 'Arial', size: 9.5 };

    const bCell = r.getCell(2);
    bCell.value = item.openingBal;
    bCell.numFmt = CURR_FMT;
    bCell.alignment = { horizontal: 'right' };

    const cCell = r.getCell(3);
    cCell.value = item.additionBefore;
    cCell.numFmt = CURR_FMT;
    cCell.alignment = { horizontal: 'right' };

    const dCell = r.getCell(4);
    dCell.value = item.additionAfter;
    dCell.numFmt = CURR_FMT;
    dCell.alignment = { horizontal: 'right' };

    const eCell = r.getCell(5);
    eCell.value = item.depreciation;
    eCell.numFmt = CURR_FMT;
    eCell.alignment = { horizontal: 'right' };

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

  // Grand Total Row
  const grandTotR = wsAnnexB.getRow(annexBTotalRow);
  grandTotR.getCell(1).value = 'Grand Total';
  grandTotR.getCell(1).font = { bold: true, name: 'Arial', size: 10 };
  grandTotR.getCell(1).alignment = { horizontal: 'left' };

  const sumFaOpening   = Math.round(sum(faScheduleRows.map(i => ({ amount: i.openingBal }))) * 100) / 100;
  const sumFaAddBefore = Math.round(sum(faScheduleRows.map(i => ({ amount: i.additionBefore }))) * 100) / 100;
  const sumFaAddAfter  = Math.round(sum(faScheduleRows.map(i => ({ amount: i.additionAfter }))) * 100) / 100;
  const sumFaDep       = Math.round(sum(faScheduleRows.map(i => ({ amount: i.depreciation }))) * 100) / 100;
  const sumFaClosing   = Math.round(sum(faScheduleRows.map(i => ({ amount: i.closingBal }))) * 100) / 100;

  const totB = grandTotR.getCell(2);
  totB.value = { formula: `SUM(B${annexBStartRow}:B${annexBEndRow})`, result: sumFaOpening };
  totB.numFmt = CURR_FMT;

  const totC = grandTotR.getCell(3);
  totC.value = { formula: `SUM(C${annexBStartRow}:C${annexBEndRow})`, result: sumFaAddBefore };
  totC.numFmt = CURR_FMT;

  const totDCol = grandTotR.getCell(4);
  totDCol.value = { formula: `SUM(D${annexBStartRow}:D${annexBEndRow})`, result: sumFaAddAfter };
  totDCol.numFmt = CURR_FMT;

  const totECol = grandTotR.getCell(5);
  totECol.value = { formula: `SUM(E${annexBStartRow}:E${annexBEndRow})`, result: sumFaDep };
  totECol.numFmt = CURR_FMT;

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

  // Generate and Download
  const buffer = await wb.xlsx.writeBuffer();
  const companySlug = (company.name || 'Company').replace(/[^a-zA-Z0-9]/g, '_');
  const prefixSlug = isProvisional ? 'PROV_' : (isProjected ? 'PROJECTED_' : '');
  const fileName = `${companySlug}_${prefixSlug}FinancialStatements_CA_Format.xlsx`;

  downloadWorkbookBuffer(buffer, fileName);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. STATEMENT BALANCE SHEET EXCEL GENERATOR (Single Sheet view)
// Exact match with /api/reports/export-statement-excel/route.ts (Balance Sheet)
// ─────────────────────────────────────────────────────────────────────────────
export async function exportStatementBalanceSheetExcelClient(data: any): Promise<void> {
  const ExcelJS = await loadExcelJS();

  const {
    companyName = 'COMPANY NAME',
    companyAddress = '',
    companyPlace = '',
    asOnDate = '',
    signatoryTitle = 'PARTNER',
    liabilities = [],
    assets = [],
    totalLiabilities = 0,
    totalAssets = 0,
  } = data;

  const BORDER_THIN = { style: 'thin', color: { argb: 'FFCCCCCC' } };
  const BORDER_DARK = { style: 'thin', color: { argb: 'FF333333' } };
  const BORDER_DOUBLE = { style: 'double', color: { argb: 'FF333333' } };

  const wb = new ExcelJS.Workbook();
  wb.creator = 'AccountsPro';
  wb.created = new Date();

  const ws = wb.addWorksheet('Balance Sheet', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });
  ws.views = [{ showGridLines: true }];

  ws.columns = [
    { key: 'A', width: 38 },
    { key: 'B', width: 18 },
    { key: 'C', width: 38 },
    { key: 'D', width: 18 },
  ];

  let rIdx = 1;

  const addMergedTitle = (text: string, bold = false, size = 11) => {
    ws.mergeCells(rIdx, 1, rIdx, 4);
    const cell = ws.getCell(rIdx, 1);
    cell.value = text;
    cell.font = { name: 'Arial', size, bold };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    rIdx++;
  };

  addMergedTitle(companyName.toUpperCase(), true, 13);
  if (companyAddress) addMergedTitle(companyAddress.toUpperCase(), false, 10);
  addMergedTitle(`BALANCE SHEET AS ON ${asOnDate.toUpperCase()}`, true, 11);

  rIdx++; // Blank row

  const headerRow = ws.getRow(rIdx);
  headerRow.height = 24;
  const headers = ['LIABILITIES', 'AMOUNT', 'ASSETS', 'AMOUNT'];
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG_ARGB } };
    cell.alignment = { horizontal: i % 2 === 0 ? 'left' : 'right', vertical: 'middle' };
    cell.border = {
      top: BORDER_DARK,
      bottom: BORDER_DARK,
      left: i === 0 || i === 2 ? BORDER_THIN : undefined,
      right: i === 1 || i === 3 ? (i === 1 ? BORDER_DARK : BORDER_THIN) : BORDER_THIN,
    };
  });
  rIdx++;

  const startDataRow = rIdx;
  const maxRows = Math.max(liabilities.length, assets.length);
  const liabSumCells: string[] = [];
  const assetSumCells: string[] = [];

  const hasLiabSecTotals = liabilities.some((x: any) => x.type === 'section-total');
  const hasAssetSecTotals = assets.some((x: any) => x.type === 'section-total');

  for (let i = 0; i < maxRows; i++) {
    const l = liabilities[i];
    const a = assets[i];
    const row = ws.getRow(rIdx);
    row.height = 20;

    // Liabilities
    const cellA = row.getCell(1);
    const cellB = row.getCell(2);

    if (l) {
      cellA.value = l.name;
      cellA.alignment = { horizontal: 'left', vertical: 'middle' };

      if (l.type === 'section-header') {
        cellA.font = { name: 'Arial', size: 10, bold: true, underline: true };
      } else if (l.type === 'group-header') {
        cellA.font = { name: 'Arial', size: 10, bold: true };
        cellA.alignment = { indent: 1, horizontal: 'left', vertical: 'middle' };
      } else if (l.type === 'ledger') {
        cellA.font = { name: 'Arial', size: 10 };
        cellA.alignment = { indent: 2, horizontal: 'left', vertical: 'middle' };
      } else if (l.type === 'net-entry') {
        cellA.font = { name: 'Arial', size: 10, italic: true, bold: true };
        cellA.alignment = { indent: 1, horizontal: 'left', vertical: 'middle' };
      }

      if (l.amount !== undefined && l.amount !== null && l.type !== 'section-header' && l.type !== 'blank') {
        cellB.value = Number(l.amount);
        cellB.numFmt = CURR_FMT;
        cellB.alignment = { horizontal: 'right', vertical: 'middle' };

        if (l.type === 'section-total') {
          cellB.font = { name: 'Arial', size: 10, bold: true };
          cellB.border = { top: BORDER_THIN };
          if (hasLiabSecTotals) liabSumCells.push(`B${rIdx}`);
        } else if (l.type === 'net-entry') {
          cellB.font = { name: 'Arial', size: 10, bold: true, color: { argb: GREEN_ARGB } };
          liabSumCells.push(`B${rIdx}`);
        } else {
          cellB.font = { name: 'Arial', size: 10, color: { argb: RED_ARGB } };
          if (!hasLiabSecTotals && l.amount > 0) liabSumCells.push(`B${rIdx}`);
        }
      }
    }

    cellA.border = { left: BORDER_THIN, right: BORDER_THIN };
    cellB.border = { right: BORDER_DARK };

    // Assets
    const cellC = row.getCell(3);
    const cellD = row.getCell(4);

    if (a) {
      cellC.value = a.name;
      cellC.alignment = { horizontal: 'left', vertical: 'middle' };

      if (a.type === 'section-header') {
        cellC.font = { name: 'Arial', size: 10, bold: true, underline: true };
      } else if (a.type === 'group-header') {
        cellC.font = { name: 'Arial', size: 10, bold: true };
        cellC.alignment = { indent: 1, horizontal: 'left', vertical: 'middle' };
      } else if (a.type === 'ledger') {
        cellC.font = { name: 'Arial', size: 10 };
        cellC.alignment = { indent: 2, horizontal: 'left', vertical: 'middle' };
      } else if (a.type === 'net-entry') {
        cellC.font = { name: 'Arial', size: 10, italic: true, bold: true };
        cellC.alignment = { indent: 1, horizontal: 'left', vertical: 'middle' };
      }

      if (a.amount !== undefined && a.amount !== null && a.type !== 'section-header' && a.type !== 'blank') {
        cellD.value = Number(a.amount);
        cellD.numFmt = CURR_FMT;
        cellD.alignment = { horizontal: 'right', vertical: 'middle' };

        if (a.type === 'section-total') {
          cellD.font = { name: 'Arial', size: 10, bold: true };
          cellD.border = { top: BORDER_THIN };
          if (hasAssetSecTotals) assetSumCells.push(`D${rIdx}`);
        } else if (a.type === 'net-entry') {
          cellD.font = { name: 'Arial', size: 10, bold: true, color: { argb: RED_ARGB } };
          assetSumCells.push(`D${rIdx}`);
        } else {
          cellD.font = { name: 'Arial', size: 10, color: { argb: RED_ARGB } };
          if (!hasAssetSecTotals && a.amount > 0) assetSumCells.push(`D${rIdx}`);
        }
      }
    }

    cellC.border = { right: BORDER_THIN };
    cellD.border = { right: BORDER_THIN };

    rIdx++;
  }

  // Total Row
  const totRow = ws.getRow(rIdx);
  totRow.height = 24;

  const tA = totRow.getCell(1);
  const tB = totRow.getCell(2);
  const tC = totRow.getCell(3);
  const tD = totRow.getCell(4);

  tA.value = 'TOTAL RS.';
  tA.font = { name: 'Arial', size: 11, bold: true };
  tA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG_ARGB } };
  tA.alignment = { horizontal: 'left', vertical: 'middle' };
  tA.border = { top: BORDER_DARK, bottom: BORDER_DOUBLE, left: BORDER_THIN, right: BORDER_THIN };

  const liabFormula = liabSumCells.length > 0 ? liabSumCells.join('+') : `SUM(B${startDataRow}:B${rIdx - 1})`;
  tB.value = { formula: liabFormula, result: Number(totalLiabilities) };
  tB.numFmt = CURR_FMT;
  tB.font = { name: 'Arial', size: 11, bold: true };
  tB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG_ARGB } };
  tB.alignment = { horizontal: 'right', vertical: 'middle' };
  tB.border = { top: BORDER_DARK, bottom: BORDER_DOUBLE, right: BORDER_DARK };

  tC.value = 'TOTAL RS.';
  tC.font = { name: 'Arial', size: 11, bold: true };
  tC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG_ARGB } };
  tC.alignment = { horizontal: 'left', vertical: 'middle' };
  tC.border = { top: BORDER_DARK, bottom: BORDER_DOUBLE, right: BORDER_THIN };

  const assetFormula = assetSumCells.length > 0 ? assetSumCells.join('+') : `SUM(D${startDataRow}:D${rIdx - 1})`;
  tD.value = { formula: assetFormula, result: Number(totalAssets) };
  tD.numFmt = CURR_FMT;
  tD.font = { name: 'Arial', size: 11, bold: true };
  tD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG_ARGB } };
  tD.alignment = { horizontal: 'right', vertical: 'middle' };
  tD.border = { top: BORDER_DARK, bottom: BORDER_DOUBLE, right: BORDER_THIN };

  rIdx++;

  // Note & Signatures
  rIdx++;
  ws.mergeCells(rIdx, 1, rIdx, 4);
  const noteCell = ws.getCell(rIdx, 1);
  noteCell.value = 'compiled on the basis of information provided to us';
  noteCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF555555' } };
  noteCell.alignment = { horizontal: 'center', vertical: 'middle' };
  rIdx += 2;

  const placeRow = ws.getRow(rIdx);
  placeRow.getCell(1).value = `PLACE : ${(companyPlace || 'UTTARAKHAND').toUpperCase()}`;
  placeRow.getCell(1).font = { name: 'Arial', size: 10, bold: true };
  rIdx++;

  const sigRow1 = ws.getRow(rIdx);
  sigRow1.getCell(1).value = companyName.toUpperCase();
  sigRow1.getCell(1).font = { name: 'Arial', size: 10, bold: true };
  sigRow1.getCell(3).value = 'For C.A NAME';
  sigRow1.getCell(3).font = { name: 'Arial', size: 10 };
  sigRow1.getCell(3).alignment = { horizontal: 'center' };
  rIdx++;

  const sigRow2 = ws.getRow(rIdx);
  sigRow2.getCell(3).value = 'CHARTERED ACCOUNTANTS';
  sigRow2.getCell(3).font = { name: 'Arial', size: 10, bold: true };
  sigRow2.getCell(3).alignment = { horizontal: 'center' };
  rIdx += 3;

  const sigRow3 = ws.getRow(rIdx);
  sigRow3.getCell(1).value = (signatoryTitle || 'PARTNER').toUpperCase();
  sigRow3.getCell(1).font = { name: 'Arial', size: 10, bold: true };
  sigRow3.getCell(3).value = 'C.A NAME';
  sigRow3.getCell(3).font = { name: 'Arial', size: 10 };
  sigRow3.getCell(3).alignment = { horizontal: 'center' };
  rIdx++;

  const sigRow4 = ws.getRow(rIdx);
  sigRow4.getCell(3).value = 'M.No. 000000';
  sigRow4.getCell(3).font = { name: 'Arial', size: 10 };
  sigRow4.getCell(3).alignment = { horizontal: 'center' };

  const buffer = await wb.xlsx.writeBuffer();
  const safeName = (companyName || 'Company').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${safeName}_Balance_Sheet_${(asOnDate || 'Report').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;

  downloadWorkbookBuffer(buffer, fileName);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. STATEMENT P&L EXCEL GENERATOR (Trading & Profit & Loss)
// Exact match with /api/reports/export-statement-excel/route.ts (P&L)
// ─────────────────────────────────────────────────────────────────────────────
export async function exportStatementPLExcelClient(data: any): Promise<void> {
  const ExcelJS = await loadExcelJS();

  const {
    companyName = 'COMPANY NAME',
    companyAddress = '',
    companyPlace = '',
    startDate = '',
    endDate = '',
    signatoryTitle = 'PARTNER',
    trading = { leftRows: [], rightRows: [], total: 0 },
    pl = { leftRows: [], rightRows: [], total: 0 },
  } = data;

  const BORDER_THIN = { style: 'thin', color: { argb: 'FFCCCCCC' } };
  const BORDER_DARK = { style: 'thin', color: { argb: 'FF333333' } };
  const BORDER_DOUBLE = { style: 'double', color: { argb: 'FF333333' } };

  const wb = new ExcelJS.Workbook();
  wb.creator = 'AccountsPro';
  wb.created = new Date();

  const ws = wb.addWorksheet('Trading & P&L', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });
  ws.views = [{ showGridLines: true }];

  ws.columns = [
    { key: 'A', width: 38 },
    { key: 'B', width: 18 },
    { key: 'C', width: 38 },
    { key: 'D', width: 18 },
  ];

  let rIdx = 1;

  const addMergedTitle = (text: string, bold = false, size = 11) => {
    ws.mergeCells(rIdx, 1, rIdx, 4);
    const cell = ws.getCell(rIdx, 1);
    cell.value = text;
    cell.font = { name: 'Arial', size, bold };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    rIdx++;
  };

  addMergedTitle(companyName.toUpperCase(), true, 13);
  if (companyAddress) addMergedTitle(companyAddress.toUpperCase(), false, 10);
  addMergedTitle(`TRADING, PROFIT & LOSS ACCOUNT FROM ${startDate.toUpperCase()} TO ${endDate.toUpperCase()}`, true, 11);

  rIdx++; // Blank row

  const headerRow = ws.getRow(rIdx);
  headerRow.height = 24;
  const headers = ['PARTICULARS', 'AMOUNT', 'PARTICULARS', 'AMOUNT'];
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG_ARGB } };
    cell.alignment = { horizontal: i % 2 === 0 ? 'left' : 'right', vertical: 'middle' };
    cell.border = {
      top: BORDER_DARK,
      bottom: BORDER_DARK,
      left: i === 0 || i === 2 ? BORDER_THIN : undefined,
      right: i === 1 || i === 3 ? (i === 1 ? BORDER_DARK : BORDER_THIN) : BORDER_THIN,
    };
  });
  rIdx++;

  // ─── TRADING SECTION ───
  const maxTrd = Math.max(trading.leftRows.length, trading.rightRows.length);
  const trdStartRow = rIdx;
  const trdLeftAmtRows: number[] = [];
  const trdRightAmtRows: number[] = [];

  for (let i = 0; i < maxTrd; i++) {
    const l = trading.leftRows[i];
    const r = trading.rightRows[i];
    const row = ws.getRow(rIdx);
    row.height = 20;

    const cellA = row.getCell(1);
    const cellB = row.getCell(2);

    if (l) {
      cellA.value = l.label || l.name;
      cellA.font = {
        name: 'Arial',
        size: 10,
        bold: !!l.isBold,
        underline: !!l.isLabel,
      };
      cellA.alignment = {
        indent: l.isSub ? 2 : 0,
        horizontal: 'left',
        vertical: 'middle',
      };

      const amtVal = l.amt !== undefined ? l.amt : l.amount;
      if (!l.isLabel && amtVal !== undefined && amtVal !== null) {
        cellB.value = Number(amtVal);
        cellB.numFmt = CURR_FMT;
        cellB.font = { name: 'Arial', size: 10, bold: !!l.isBold, color: l.isBold ? undefined : { argb: RED_ARGB } };
        cellB.alignment = { horizontal: 'right', vertical: 'middle' };
        trdLeftAmtRows.push(rIdx);
      }
    }

    cellA.border = { left: BORDER_THIN, right: BORDER_THIN };
    cellB.border = { right: BORDER_DARK };

    const cellC = row.getCell(3);
    const cellD = row.getCell(4);

    if (r) {
      cellC.value = r.label || r.name;
      cellC.font = {
        name: 'Arial',
        size: 10,
        bold: !!r.isBold,
        underline: !!r.isLabel,
      };
      cellC.alignment = {
        indent: r.isSub ? 2 : 0,
        horizontal: 'left',
        vertical: 'middle',
      };

      const amtVal = r.amt !== undefined ? r.amt : r.amount;
      if (!r.isLabel && amtVal !== undefined && amtVal !== null) {
        cellD.value = Number(amtVal);
        cellD.numFmt = CURR_FMT;
        cellD.font = { name: 'Arial', size: 10, bold: !!r.isBold, color: r.isBold ? undefined : { argb: RED_ARGB } };
        cellD.alignment = { horizontal: 'right', vertical: 'middle' };
        trdRightAmtRows.push(rIdx);
      }
    }

    cellC.border = { right: BORDER_THIN };
    cellD.border = { right: BORDER_THIN };

    rIdx++;
  }

  // TRADING TOTAL ROW
  const trdTotRow = ws.getRow(rIdx);
  trdTotRow.height = 24;

  const ttA = trdTotRow.getCell(1);
  const ttB = trdTotRow.getCell(2);
  const ttC = trdTotRow.getCell(3);
  const ttD = trdTotRow.getCell(4);

  ttA.value = 'TOTAL RS.';
  ttA.font = { name: 'Arial', size: 11, bold: true };
  ttA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG_ARGB } };
  ttA.alignment = { horizontal: 'left', vertical: 'middle' };
  ttA.border = { top: BORDER_DARK, bottom: BORDER_DARK, left: BORDER_THIN, right: BORDER_THIN };

  const leftTrdFormula = trdLeftAmtRows.length > 0 ? `SUM(B${trdStartRow}:B${rIdx - 1})` : `${trading.total}`;
  ttB.value = { formula: leftTrdFormula, result: Number(trading.total) };
  ttB.numFmt = CURR_FMT;
  ttB.font = { name: 'Arial', size: 11, bold: true };
  ttB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG_ARGB } };
  ttB.alignment = { horizontal: 'right', vertical: 'middle' };
  ttB.border = { top: BORDER_DARK, bottom: BORDER_DARK, right: BORDER_DARK };

  ttC.value = 'TOTAL RS.';
  ttC.font = { name: 'Arial', size: 11, bold: true };
  ttC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG_ARGB } };
  ttC.alignment = { horizontal: 'left', vertical: 'middle' };
  ttC.border = { top: BORDER_DARK, bottom: BORDER_DARK, right: BORDER_THIN };

  const rightTrdFormula = trdRightAmtRows.length > 0 ? `SUM(D${trdStartRow}:D${rIdx - 1})` : `${trading.total}`;
  ttD.value = { formula: rightTrdFormula, result: Number(trading.total) };
  ttD.numFmt = CURR_FMT;
  ttD.font = { name: 'Arial', size: 11, bold: true };
  ttD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG_ARGB } };
  ttD.alignment = { horizontal: 'right', vertical: 'middle' };
  ttD.border = { top: BORDER_DARK, bottom: BORDER_DARK, right: BORDER_THIN };

  rIdx++;

  // ─── P&L SECTION ───
  const maxPL = Math.max(pl.leftRows.length, pl.rightRows.length);
  const plStartRow = rIdx;
  const plLeftAmtRows: number[] = [];
  const plRightAmtRows: number[] = [];

  for (let i = 0; i < maxPL; i++) {
    const l = pl.leftRows[i];
    const r = pl.rightRows[i];
    const row = ws.getRow(rIdx);
    row.height = 20;

    const cellA = row.getCell(1);
    const cellB = row.getCell(2);

    if (l) {
      cellA.value = l.label || l.name;
      cellA.font = {
        name: 'Arial',
        size: 10,
        bold: !!l.isBold,
        underline: !!l.isLabel,
      };
      cellA.alignment = {
        indent: l.isSub ? 2 : 0,
        horizontal: 'left',
        vertical: 'middle',
      };

      const amtVal = l.amt !== undefined ? l.amt : l.amount;
      if (!l.isLabel && amtVal !== undefined && amtVal !== null) {
        cellB.value = Number(amtVal);
        cellB.numFmt = CURR_FMT;
        cellB.font = { name: 'Arial', size: 10, bold: !!l.isBold, color: l.isBold ? undefined : { argb: RED_ARGB } };
        cellB.alignment = { horizontal: 'right', vertical: 'middle' };
        plLeftAmtRows.push(rIdx);
      }
    }

    cellA.border = { left: BORDER_THIN, right: BORDER_THIN };
    cellB.border = { right: BORDER_DARK };

    const cellC = row.getCell(3);
    const cellD = row.getCell(4);

    if (r) {
      cellC.value = r.label || r.name;
      cellC.font = {
        name: 'Arial',
        size: 10,
        bold: !!r.isBold,
        underline: !!r.isLabel,
      };
      cellC.alignment = {
        indent: r.isSub ? 2 : 0,
        horizontal: 'left',
        vertical: 'middle',
      };

      const amtVal = r.amt !== undefined ? r.amt : r.amount;
      if (!r.isLabel && amtVal !== undefined && amtVal !== null) {
        cellD.value = Number(amtVal);
        cellD.numFmt = CURR_FMT;
        cellD.font = { name: 'Arial', size: 10, bold: !!r.isBold, color: r.isBold ? undefined : { argb: RED_ARGB } };
        cellD.alignment = { horizontal: 'right', vertical: 'middle' };
        plRightAmtRows.push(rIdx);
      }
    }

    cellC.border = { right: BORDER_THIN };
    cellD.border = { right: BORDER_THIN };

    rIdx++;
  }

  // P&L TOTAL ROW
  const plTotRow = ws.getRow(rIdx);
  plTotRow.height = 24;

  const ptA = plTotRow.getCell(1);
  const ptB = plTotRow.getCell(2);
  const ptC = plTotRow.getCell(3);
  const ptD = plTotRow.getCell(4);

  ptA.value = '';
  ptA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG_ARGB } };
  ptA.border = { top: BORDER_DARK, bottom: BORDER_DOUBLE, left: BORDER_THIN, right: BORDER_THIN };

  const leftPLFormula = plLeftAmtRows.length > 0 ? `SUM(B${plStartRow}:B${rIdx - 1})` : `${pl.total}`;
  ptB.value = { formula: leftPLFormula, result: Number(pl.total) };
  ptB.numFmt = CURR_FMT;
  ptB.font = { name: 'Arial', size: 11, bold: true };
  ptB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG_ARGB } };
  ptB.alignment = { horizontal: 'right', vertical: 'middle' };
  ptB.border = { top: BORDER_DARK, bottom: BORDER_DOUBLE, right: BORDER_DARK };

  ptC.value = '';
  ptC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG_ARGB } };
  ptC.border = { top: BORDER_DARK, bottom: BORDER_DOUBLE, right: BORDER_THIN };

  const rightPLFormula = plRightAmtRows.length > 0 ? `SUM(D${plStartRow}:D${rIdx - 1})` : `${pl.total}`;
  ptD.value = { formula: rightPLFormula, result: Number(pl.total) };
  ptD.numFmt = CURR_FMT;
  ptD.font = { name: 'Arial', size: 11, bold: true };
  ptD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG_ARGB } };
  ptD.alignment = { horizontal: 'right', vertical: 'middle' };
  ptD.border = { top: BORDER_DARK, bottom: BORDER_DOUBLE, right: BORDER_THIN };

  rIdx++;

  // Note & Signatures
  rIdx++;
  ws.mergeCells(rIdx, 1, rIdx, 4);
  const noteCell = ws.getCell(rIdx, 1);
  noteCell.value = 'compiled on the basis of information provided to us';
  noteCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF555555' } };
  noteCell.alignment = { horizontal: 'center', vertical: 'middle' };
  rIdx += 2;

  const placeRow = ws.getRow(rIdx);
  placeRow.getCell(1).value = `PLACE : ${(companyPlace || 'UTTARAKHAND').toUpperCase()}`;
  placeRow.getCell(1).font = { name: 'Arial', size: 10, bold: true };
  rIdx++;

  const sigRow1 = ws.getRow(rIdx);
  sigRow1.getCell(1).value = companyName.toUpperCase();
  sigRow1.getCell(1).font = { name: 'Arial', size: 10, bold: true };
  sigRow1.getCell(3).value = 'For C.A NAME';
  sigRow1.getCell(3).font = { name: 'Arial', size: 10 };
  sigRow1.getCell(3).alignment = { horizontal: 'center' };
  rIdx++;

  const sigRow2 = ws.getRow(rIdx);
  sigRow2.getCell(3).value = 'CHARTERED ACCOUNTANTS';
  sigRow2.getCell(3).font = { name: 'Arial', size: 10, bold: true };
  sigRow2.getCell(3).alignment = { horizontal: 'center' };
  rIdx += 3;

  const sigRow3 = ws.getRow(rIdx);
  sigRow3.getCell(1).value = (signatoryTitle || 'PARTNER').toUpperCase();
  sigRow3.getCell(1).font = { name: 'Arial', size: 10, bold: true };
  sigRow3.getCell(3).value = 'C.A NAME';
  sigRow3.getCell(3).font = { name: 'Arial', size: 10 };
  sigRow3.getCell(3).alignment = { horizontal: 'center' };
  rIdx++;

  const sigRow4 = ws.getRow(rIdx);
  sigRow4.getCell(3).value = 'M.No. 000000';
  sigRow4.getCell(3).font = { name: 'Arial', size: 10 };
  sigRow4.getCell(3).alignment = { horizontal: 'center' };

  const buffer = await wb.xlsx.writeBuffer();
  const safeName = (companyName || 'Company').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${safeName}_Profit_and_Loss_${(startDate || 'Start').replace(/[^a-zA-Z0-9_-]/g, '_')}_to_${(endDate || 'End').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;

  downloadWorkbookBuffer(buffer, fileName);
}
