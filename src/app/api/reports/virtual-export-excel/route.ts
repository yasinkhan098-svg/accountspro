import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

// ─── Format & Style Constants ────────────────────────────────────────────────
const CURR_FMT = '#,##0.00;[Red](#,##0.00);"-"';
const DARK_BG = 'FFE8EEF5';
const HEADER_FILL = 'FFF2F6FA';
const ACCENT_ROW_FILL = 'FFF9FAFB';
const RED = { argb: 'FF8B0000' };
const GREEN = { argb: 'FF006400' };

function formatDotDate(d: string | null | undefined): string {
  if (!d) return '';
  const s = String(d).trim();
  if (s.includes('.')) return s;
  const parts = s.replace(/[\/\\]/g, '-').split('-');
  if (parts.length === 3) {
    const months: Record<string, string> = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };
    if (parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[0]}`;
    } else {
      const m = months[parts[1].toLowerCase().slice(0, 3)] || parts[1].padStart(2, '0');
      return `${parts[0].padStart(2, '0')}.${m}.${parts[2]}`;
    }
  }
  return s;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { company, signatory, calculatedData, form, isProvisional } = body;

    if (!company || !company.name) {
      return NextResponse.json({ success: false, error: 'Company details required' }, { status: 400 });
    }

    const compName = (company.name || 'COMPANY NAME').toUpperCase();
    const compAddr = (company.address || '').toUpperCase();
    const compPlace = (company.place || '').toUpperCase();
    const asOnDateStr = formatDotDate(company.asOnDate || '31.03.2027');
    const fromDateStr = company.fromDate || '01-Apr-2026';
    const toDateStr = company.toDate || '31-Mar-2027';
    const titlePrefix = isProvisional ? 'PROVISIONAL ' : '';

    // CA and Signatory details
    const caName = (signatory?.caName || '').toUpperCase();
    const caMno = (signatory?.caMno || '').trim();
    const caFrn = (signatory?.caFirmRegNo || '').trim();
    const caUdin = (signatory?.caUdin || '').trim();
    const signatoryTitle = (signatory?.signatoryTitle || 'PARTNER').toUpperCase();

    const activeBSSections = isProvisional && calculatedData.projBSSections
      ? calculatedData.projBSSections
      : form?.bsSections;

    const activePLData = isProvisional && calculatedData.projPLData
      ? calculatedData.projPLData
      : form?.plData;

    const wb = new ExcelJS.Workbook();
    wb.creator = compName;
    wb.created = new Date();

    // ═════════════════════════════════════════════════════════════════════════
    //  SHEET 1: BALANCE SHEET
    // ═════════════════════════════════════════════════════════════════════════
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
    const addBSHeader = (text: string, bold = true, size = 11) => {
      const r = wsBS.getRow(bsRow);
      r.getCell(1).value = text;
      r.getCell(1).font = { bold, size, name: 'Arial' };
      wsBS.mergeCells(bsRow, 1, bsRow, 4);
      r.getCell(1).alignment = { horizontal: 'center' };
      bsRow++;
    };

    addBSHeader(compName, true, 13);
    if (compAddr) addBSHeader(compAddr, false, 10);
    addBSHeader(`${titlePrefix}BALANCE SHEET AS ON ${asOnDateStr}`, true, 11);
    bsRow++; // Blank row

    // Sub-header
    const bsSubHeader = wsBS.getRow(bsRow);
    const bsHeaders = ['LIABILITIES', 'AMOUNT', 'ASSETS', 'AMOUNT'];
    bsHeaders.forEach((h, i) => {
      const cell = bsSubHeader.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, name: 'Arial', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
      cell.alignment = { horizontal: i % 2 === 0 ? 'left' : 'right' };
    });
    bsRow++;

    // Build side item arrays
    type RowEntry = { type: 'section-header' | 'group-header' | 'ledger' | 'section-total' | 'blank'; name: string; amount?: number };
    const liabRows: RowEntry[] = [];
    const assetRows: RowEntry[] = [];

    // 1. CAPITAL ACCOUNT (Linked directly to Annexure "A")
    liabRows.push({ type: 'section-header', name: 'CAPITAL ACCOUNT' });
    const partnersList = calculatedData.calculatedPartners || [];
    if (partnersList.length > 0) {
      partnersList.forEach((p: any) => {
        liabRows.push({
          type: 'ledger',
          name: `${(p.name || 'PARTNER').toUpperCase()} (As per Annexure "A")`,
          amount: p.closingBal
        });
      });
    } else {
      const capList = activeBSSections?.capitalItems || [{ name: 'Capital Account', amount: calculatedData.capitalTotal }];
      capList.forEach((c: any) => liabRows.push({ type: 'ledger', name: c.name, amount: c.amount }));
    }
    liabRows.push({ type: 'section-total', name: '', amount: calculatedData.capitalTotal });
    liabRows.push({ type: 'blank', name: '' });

    // 2. SECURED LOANS
    if (activeBSSections?.securedLoans && activeBSSections.securedLoans.length > 0) {
      liabRows.push({ type: 'section-header', name: 'SECURED LOAN :' });
      activeBSSections.securedLoans.forEach((l: any) => liabRows.push({ type: 'ledger', name: l.name, amount: l.amount }));
      liabRows.push({ type: 'section-total', name: '', amount: calculatedData.securedTotal });
      liabRows.push({ type: 'blank', name: '' });
    }

    // 3. UNSECURED LOANS
    if (activeBSSections?.unsecuredLoans && activeBSSections.unsecuredLoans.length > 0) {
      liabRows.push({ type: 'section-header', name: 'UNSECURED LOAN :' });
      activeBSSections.unsecuredLoans.forEach((l: any) => liabRows.push({ type: 'ledger', name: l.name, amount: l.amount }));
      liabRows.push({ type: 'section-total', name: '', amount: calculatedData.unsecuredTotal });
      liabRows.push({ type: 'blank', name: '' });
    }

    // 4. CURRENT LIABILITIES
    if (activeBSSections?.currentLiabilities && activeBSSections.currentLiabilities.length > 0) {
      liabRows.push({ type: 'section-header', name: 'CURRENT LIABILITIES' });
      const seen = new Map<string, number>();
      const deduped: any[] = [];
      for (const cl of activeBSSections.currentLiabilities) {
        const k = (cl.name || '').trim().toLowerCase();
        if (seen.has(k)) {
          const idx = seen.get(k)!;
          deduped[idx].amount = Math.round(((deduped[idx].amount || 0) + (Number(cl.amount) || 0)) * 100) / 100;
        } else {
          seen.set(k, deduped.length);
          deduped.push({ ...cl });
        }
      }
      deduped.forEach((c: any) => liabRows.push({ type: 'ledger', name: c.name, amount: c.amount }));
      const clTotal = deduped.reduce((s, x) => s + (Number(x.amount) || 0), 0);
      liabRows.push({ type: 'section-total', name: '', amount: clTotal });
      liabRows.push({ type: 'blank', name: '' });
    }

    // ── ASSETS SIDE ──

    // 1. FIXED ASSETS (Linked directly to Annexure "B")
    assetRows.push({ type: 'section-header', name: 'FIXED ASSETS' });
    assetRows.push({ type: 'group-header', name: '(As per Annexure "B" Attached)' });
    const faList = calculatedData.calculatedFASchedule || [];
    if (faList.length > 0) {
      faList.forEach((fa: any) => assetRows.push({ type: 'ledger', name: fa.name, amount: fa.closingBal }));
    } else {
      (activeBSSections?.fixedAssets || []).forEach((fa: any) => assetRows.push({ type: 'ledger', name: fa.name, amount: fa.amount }));
    }
    assetRows.push({ type: 'section-total', name: '', amount: calculatedData.totalClosingFA || calculatedData.fixedAssetTotal });
    assetRows.push({ type: 'blank', name: '' });

    // 2. SECURITY DEPOSITS
    if (activeBSSections?.securityDeposits && activeBSSections.securityDeposits.length > 0) {
      assetRows.push({ type: 'section-header', name: 'SECURITY DEPOSITS' });
      activeBSSections.securityDeposits.forEach((sd: any) => assetRows.push({ type: 'ledger', name: sd.name, amount: sd.amount }));
      assetRows.push({ type: 'section-total', name: '', amount: calculatedData.securityDepositsTotal });
      assetRows.push({ type: 'blank', name: '' });
    }

    // 3. CURRENT ASSETS
    if (activeBSSections?.currentAssets && activeBSSections.currentAssets.length > 0) {
      assetRows.push({ type: 'section-header', name: 'CURRENT ASSETS' });
      const seenA = new Map<string, number>();
      const dedupedA: any[] = [];
      for (const ca of activeBSSections.currentAssets) {
        const k = (ca.name || '').trim().toLowerCase();
        if (seenA.has(k)) {
          const idx = seenA.get(k)!;
          dedupedA[idx].amount = Math.round(((dedupedA[idx].amount || 0) + (Number(ca.amount) || 0)) * 100) / 100;
        } else {
          seenA.set(k, dedupedA.length);
          dedupedA.push({ ...ca });
        }
      }
      dedupedA.forEach((ca: any) => assetRows.push({ type: 'ledger', name: ca.name, amount: ca.amount }));
      const caTotal = dedupedA.reduce((s, x) => s + (Number(x.amount) || 0), 0);
      assetRows.push({ type: 'section-total', name: '', amount: caTotal });
      assetRows.push({ type: 'blank', name: '' });
    }

    // Render Side-by-side rows
    const maxRows = Math.max(liabRows.length, assetRows.length);
    const startDataRow = bsRow;
    const liabSumCells: string[] = [];
    const assetSumCells: string[] = [];

    for (let i = 0; i < maxRows; i++) {
      const l = liabRows[i];
      const a = assetRows[i];
      const row = wsBS.getRow(bsRow);
      row.height = 20;

      // Liabilities cell (Col A & B)
      const cellA = row.getCell(1);
      const cellB = row.getCell(2);
      if (l) {
        cellA.value = l.name;
        cellA.alignment = { horizontal: 'left', vertical: 'middle' };

        if (l.type === 'section-header') {
          cellA.font = { name: 'Arial', size: 10, bold: true, underline: true };
        } else if (l.type === 'group-header') {
          cellA.font = { name: 'Arial', size: 9, italic: true };
          cellA.alignment = { indent: 1, horizontal: 'left', vertical: 'middle' };
        } else if (l.type === 'ledger') {
          cellA.font = { name: 'Arial', size: 10 };
          cellA.alignment = { indent: 2, horizontal: 'left', vertical: 'middle' };
        }

        if (l.amount !== undefined && l.type !== 'section-header' && l.type !== 'blank') {
          cellB.value = Number(l.amount);
          cellB.numFmt = CURR_FMT;
          cellB.alignment = { horizontal: 'right', vertical: 'middle' };

          if (l.type === 'section-total') {
            cellB.font = { name: 'Arial', size: 10, bold: true };
            cellB.border = { top: { style: 'thin' } };
            liabSumCells.push(`B${bsRow}`);
          } else {
            cellB.font = { name: 'Arial', size: 10, color: RED };
          }
        }
      }

      // Assets cell (Col C & D)
      const cellC = row.getCell(3);
      const cellD = row.getCell(4);
      if (a) {
        cellC.value = a.name;
        cellC.alignment = { horizontal: 'left', vertical: 'middle' };

        if (a.type === 'section-header') {
          cellC.font = { name: 'Arial', size: 10, bold: true, underline: true };
        } else if (a.type === 'group-header') {
          cellC.font = { name: 'Arial', size: 9, italic: true };
          cellC.alignment = { indent: 1, horizontal: 'left', vertical: 'middle' };
        } else if (a.type === 'ledger') {
          cellC.font = { name: 'Arial', size: 10 };
          cellC.alignment = { indent: 2, horizontal: 'left', vertical: 'middle' };
        }

        if (a.amount !== undefined && a.type !== 'section-header' && a.type !== 'blank') {
          cellD.value = Number(a.amount);
          cellD.numFmt = CURR_FMT;
          cellD.alignment = { horizontal: 'right', vertical: 'middle' };

          if (a.type === 'section-total') {
            cellD.font = { name: 'Arial', size: 10, bold: true };
            cellD.border = { top: { style: 'thin' } };
            assetSumCells.push(`D${bsRow}`);
          } else {
            cellD.font = { name: 'Arial', size: 10, color: RED };
          }
        }
      }
      bsRow++;
    }

    // Total Row (Formula)
    const totalR = wsBS.getRow(bsRow);
    totalR.height = 24;
    totalR.getCell(1).value = 'TOTAL RS.';
    totalR.getCell(1).font = { bold: true, name: 'Arial', size: 11 };
    totalR.getCell(1).border = { top: { style: 'thin' }, bottom: { style: 'double' } };

    const liabAmtCell = totalR.getCell(2);
    const liabFormula = liabSumCells.length > 0 ? liabSumCells.join('+') : '0';
    liabAmtCell.value = { formula: liabFormula, result: Number(calculatedData.totalLiabilities) };
    liabAmtCell.numFmt = CURR_FMT;
    liabAmtCell.font = { bold: true, name: 'Arial', size: 11 };
    liabAmtCell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    liabAmtCell.alignment = { horizontal: 'right', vertical: 'middle' };

    totalR.getCell(3).value = 'TOTAL RS.';
    totalR.getCell(3).font = { bold: true, name: 'Arial', size: 11 };
    totalR.getCell(3).border = { top: { style: 'thin' }, bottom: { style: 'double' } };

    const assetAmtCell = totalR.getCell(4);
    const assetFormula = assetSumCells.length > 0 ? assetSumCells.join('+') : '0';
    assetAmtCell.value = { formula: assetFormula, result: Number(calculatedData.totalAssets) };
    assetAmtCell.numFmt = CURR_FMT;
    assetAmtCell.font = { bold: true, name: 'Arial', size: 11 };
    assetAmtCell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    assetAmtCell.alignment = { horizontal: 'right', vertical: 'middle' };

    // ── SHEET 1: FOOTER & CA SIGNATURES (Matching CA Format) ──
    bsRow += 2;
    const compiledR = wsBS.getRow(bsRow);
    compiledR.getCell(1).value = 'compiled on the basis of information provided to us';
    wsBS.mergeCells(bsRow, 1, bsRow, 4);
    compiledR.getCell(1).alignment = { horizontal: 'center' };
    compiledR.getCell(1).font = { italic: true, name: 'Arial', size: 9 };
    bsRow += 2;

    const placeR = wsBS.getRow(bsRow);
    placeR.getCell(1).value = `PLACE  :  ${(compPlace || '').toUpperCase()}`;
    placeR.getCell(1).font = { name: 'Arial', size: 10 };
    bsRow += 2;

    const firmNameR = wsBS.getRow(bsRow);
    firmNameR.getCell(1).value = `    ${compName}`;
    firmNameR.getCell(1).font = { name: 'Arial', size: 10 };
    if (caName) {
      firmNameR.getCell(3).value = `For ${caName}`;
      firmNameR.getCell(3).alignment = { horizontal: 'center' };
      firmNameR.getCell(3).font = { name: 'Arial', size: 10 };
      wsBS.mergeCells(bsRow, 3, bsRow, 4);
    }
    bsRow++;

    if (caName) {
      const caFirmR = wsBS.getRow(bsRow);
      caFirmR.getCell(3).value = 'CHARTERED ACCOUNTANTS';
      caFirmR.getCell(3).alignment = { horizontal: 'center' };
      caFirmR.getCell(3).font = { bold: true, name: 'Arial', size: 10 };
      wsBS.mergeCells(bsRow, 3, bsRow, 4);
      bsRow += 2;

      const caNameR = wsBS.getRow(bsRow);
      caNameR.getCell(3).value = caName;
      caNameR.getCell(3).alignment = { horizontal: 'center' };
      caNameR.getCell(3).font = { name: 'Arial', size: 10 };
      wsBS.mergeCells(bsRow, 3, bsRow, 4);
      bsRow += 2;
    } else {
      bsRow += 3;
    }

    const partnerR = wsBS.getRow(bsRow);
    partnerR.getCell(1).value = signatoryTitle;
    partnerR.getCell(1).alignment = { horizontal: 'center' };
    partnerR.getCell(1).font = { bold: true, name: 'Arial', size: 10 };

    if (caMno) {
      partnerR.getCell(3).value = `M.No. ${caMno}`;
      partnerR.getCell(3).alignment = { horizontal: 'center' };
      partnerR.getCell(3).font = { name: 'Arial', size: 10 };
      wsBS.mergeCells(bsRow, 3, bsRow, 4);
      const mnoBorder = partnerR.getCell(3);
      mnoBorder.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };
    }
    bsRow++;

    if (caFrn) {
      const frnR = wsBS.getRow(bsRow);
      frnR.getCell(3).value = `FRN: ${caFrn}`;
      frnR.getCell(3).alignment = { horizontal: 'center' };
      frnR.getCell(3).font = { size: 9, name: 'Arial' };
      wsBS.mergeCells(bsRow, 3, bsRow, 4);
      bsRow++;
    }

    if (caUdin) {
      const udinR = wsBS.getRow(bsRow);
      udinR.getCell(3).value = `UDIN: ${caUdin}`;
      udinR.getCell(3).alignment = { horizontal: 'center' };
      udinR.getCell(3).font = { size: 9, name: 'Arial' };
      wsBS.mergeCells(bsRow, 3, bsRow, 4);
      bsRow++;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  SHEET 2: PROFIT & LOSS ACCOUNT
    // ═════════════════════════════════════════════════════════════════════════
    const wsPL = wb.addWorksheet('Profit & Loss', {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
    });
    wsPL.views = [{ showGridLines: true }];
    wsPL.columns = [
      { key: 'A', width: 38 },
      { key: 'B', width: 18 },
      { key: 'C', width: 38 },
      { key: 'D', width: 18 },
    ];

    let plRow = 1;
    const addPLHeader = (text: string, bold = true, size = 11) => {
      const r = wsPL.getRow(plRow);
      r.getCell(1).value = text;
      r.getCell(1).font = { bold, size, name: 'Arial' };
      wsPL.mergeCells(plRow, 1, plRow, 4);
      r.getCell(1).alignment = { horizontal: 'center' };
      plRow++;
    };

    addPLHeader(compName, true, 13);
    if (compAddr) addPLHeader(compAddr, false, 10);
    addPLHeader(`${titlePrefix}TRADING AND PROFIT & LOSS ACCOUNT FOR THE YEAR ENDED ${asOnDateStr}`, true, 11);
    plRow++;

    // Subheader
    const plSubH = wsPL.getRow(plRow);
    const plHeaders = ['PARTICULARS', 'AMOUNT', 'PARTICULARS', 'AMOUNT'];
    plHeaders.forEach((h, i) => {
      const cell = plSubH.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, name: 'Arial', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
      cell.alignment = { horizontal: i % 2 === 0 ? 'left' : 'right' };
    });
    plRow++;

    const trading = activePLData?.trading || {
      openingStock: 0,
      purchases: 0,
      directExpenses: [],
      sales: 0,
      closingStock: 0,
    };

    // ── Trading Account Left Side ──
    const trLeft: { name: string; amount: number }[] = [
      { name: 'To Opening Stock', amount: trading.openingStock },
      { name: 'To Purchases', amount: trading.purchases },
    ];
    (trading.directExpenses || []).forEach((e: any) => {
      trLeft.push({ name: `To ${e.name}`, amount: e.amount });
    });
    if (calculatedData.grossProfit > 0) {
      trLeft.push({ name: 'To Gross Profit c/d', amount: calculatedData.grossProfit });
    }

    // ── Trading Account Right Side ──
    const trRight: { name: string; amount: number }[] = [
      { name: 'By Sales', amount: trading.sales },
      { name: 'By Closing Stock', amount: trading.closingStock },
    ];
    if (calculatedData.grossProfit < 0) {
      trRight.push({ name: 'By Gross Loss c/d', amount: Math.abs(calculatedData.grossProfit) });
    }

    const trMax = Math.max(trLeft.length, trRight.length);
    const trStartRow = plRow;

    for (let i = 0; i < trMax; i++) {
      const l = trLeft[i];
      const r = trRight[i];
      const row = wsPL.getRow(plRow);
      row.height = 20;

      if (l) {
        row.getCell(1).value = l.name;
        row.getCell(1).font = { name: 'Arial', size: 10, bold: l.name.includes('Gross Profit') };
        row.getCell(2).value = Number(l.amount);
        row.getCell(2).numFmt = CURR_FMT;
        row.getCell(2).font = { name: 'Arial', size: 10, bold: l.name.includes('Gross Profit') };
        row.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
      }

      if (r) {
        row.getCell(3).value = r.name;
        row.getCell(3).font = { name: 'Arial', size: 10, bold: r.name.includes('Gross Loss') };
        row.getCell(4).value = Number(r.amount);
        row.getCell(4).numFmt = CURR_FMT;
        row.getCell(4).font = { name: 'Arial', size: 10, bold: r.name.includes('Gross Loss') };
        row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
      }
      plRow++;
    }

    const trEndRow = plRow - 1;
    // Trading Totals
    const trTotR = wsPL.getRow(plRow++);
    trTotR.height = 22;
    trTotR.getCell(1).value = 'TOTAL RS.';
    trTotR.getCell(1).font = { bold: true, name: 'Arial', size: 10 };
    trTotR.getCell(1).border = { top: { style: 'thin' }, bottom: { style: 'double' } };

    const trTotCellB = trTotR.getCell(2);
    trTotCellB.value = { formula: `SUM(B${trStartRow}:B${trEndRow})`, result: calculatedData.tradingDebitTotal };
    trTotCellB.numFmt = CURR_FMT;
    trTotCellB.font = { bold: true, name: 'Arial', size: 10 };
    trTotCellB.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    trTotCellB.alignment = { horizontal: 'right', vertical: 'middle' };

    trTotR.getCell(3).value = 'TOTAL RS.';
    trTotR.getCell(3).font = { bold: true, name: 'Arial', size: 10 };
    trTotR.getCell(3).border = { top: { style: 'thin' }, bottom: { style: 'double' } };

    const trTotCellD = trTotR.getCell(4);
    trTotCellD.value = { formula: `SUM(D${trStartRow}:D${trEndRow})`, result: calculatedData.tradingCreditTotal };
    trTotCellD.numFmt = CURR_FMT;
    trTotCellD.font = { bold: true, name: 'Arial', size: 10 };
    trTotCellD.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    trTotCellD.alignment = { horizontal: 'right', vertical: 'middle' };

    plRow++; // Blank row before P&L section

    // ── P&L Account Left Side (Expenses) ──
    const plLeft: { name: string; amount: number }[] = [];
    if (calculatedData.grossProfit < 0) {
      plLeft.push({ name: 'To Gross Loss b/d', amount: Math.abs(calculatedData.grossProfit) });
    }

    // Include Indirect Expenses (including Annexure B depreciation)
    let indExp = [...(activePLData?.indirectExpenses || [])];
    if (calculatedData.totalDepreciation > 0 && !indExp.some(e => e.name.toLowerCase().includes('depr'))) {
      indExp.push({ id: 'depr-auto', name: 'To Depreciation', amount: calculatedData.totalDepreciation });
    }

    indExp.forEach((e: any) => {
      plLeft.push({ name: e.name.startsWith('To ') ? e.name : `To ${e.name}`, amount: e.amount });
    });

    if (calculatedData.netProfit > 0) {
      plLeft.push({ name: 'To Net Profit Transferred to Capital A/c', amount: calculatedData.netProfit });
    }

    // ── P&L Account Right Side (Incomes) ──
    const plRight: { name: string; amount: number }[] = [];
    if (calculatedData.grossProfit > 0) {
      plRight.push({ name: 'By Gross Profit b/d', amount: calculatedData.grossProfit });
    }
    (activePLData?.indirectIncomes || []).forEach((i: any) => {
      plRight.push({ name: i.name.startsWith('By ') ? i.name : `By ${i.name}`, amount: i.amount });
    });
    if (calculatedData.netProfit < 0) {
      plRight.push({ name: 'By Net Loss Transferred to Capital A/c', amount: Math.abs(calculatedData.netProfit) });
    }

    const plMax = Math.max(plLeft.length, plRight.length);
    const plDataStartRow = plRow;

    for (let i = 0; i < plMax; i++) {
      const l = plLeft[i];
      const r = plRight[i];
      const row = wsPL.getRow(plRow);
      row.height = 20;

      if (l) {
        row.getCell(1).value = l.name;
        row.getCell(1).font = { name: 'Arial', size: 10, bold: l.name.includes('Net Profit') };
        row.getCell(2).value = Number(l.amount);
        row.getCell(2).numFmt = CURR_FMT;
        row.getCell(2).font = { name: 'Arial', size: 10, bold: l.name.includes('Net Profit'), color: l.name.includes('Net Profit') ? GREEN : undefined };
        row.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
      }

      if (r) {
        row.getCell(3).value = r.name;
        row.getCell(3).font = { name: 'Arial', size: 10, bold: r.name.includes('Net Loss') };
        row.getCell(4).value = Number(r.amount);
        row.getCell(4).numFmt = CURR_FMT;
        row.getCell(4).font = { name: 'Arial', size: 10, bold: r.name.includes('Net Loss') };
        row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
      }
      plRow++;
    }

    const plDataEndRow = plRow - 1;
    // P&L Totals
    const plTotR = wsPL.getRow(plRow++);
    plTotR.height = 22;
    plTotR.getCell(1).value = 'TOTAL RS.';
    plTotR.getCell(1).font = { bold: true, name: 'Arial', size: 10 };
    plTotR.getCell(1).border = { top: { style: 'thin' }, bottom: { style: 'double' } };

    const plTotCellB = plTotR.getCell(2);
    plTotCellB.value = { formula: `SUM(B${plDataStartRow}:B${plDataEndRow})`, result: calculatedData.plDebitTotal };
    plTotCellB.numFmt = CURR_FMT;
    plTotCellB.font = { bold: true, name: 'Arial', size: 10 };
    plTotCellB.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    plTotCellB.alignment = { horizontal: 'right', vertical: 'middle' };

    plTotR.getCell(3).value = 'TOTAL RS.';
    plTotR.getCell(3).font = { bold: true, name: 'Arial', size: 10 };
    plTotR.getCell(3).border = { top: { style: 'thin' }, bottom: { style: 'double' } };

    const plTotCellD = plTotR.getCell(4);
    plTotCellD.value = { formula: `SUM(D${plDataStartRow}:D${plDataEndRow})`, result: calculatedData.plCreditTotal };
    plTotCellD.numFmt = CURR_FMT;
    plTotCellD.font = { bold: true, name: 'Arial', size: 10 };
    plTotCellD.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    plTotCellD.alignment = { horizontal: 'right', vertical: 'middle' };

    // ── SHEET 2: FOOTER & CA SIGNATURES (Identical to Sheet 1) ──
    plRow += 2;
    const plCompiledR = wsPL.getRow(plRow);
    plCompiledR.getCell(1).value = 'compiled on the basis of information provided to us';
    wsPL.mergeCells(plRow, 1, plRow, 4);
    plCompiledR.getCell(1).alignment = { horizontal: 'center' };
    plCompiledR.getCell(1).font = { italic: true, name: 'Arial', size: 9 };
    plRow += 2;

    const plPlaceR = wsPL.getRow(plRow);
    plPlaceR.getCell(1).value = `PLACE  :  ${(compPlace || '').toUpperCase()}`;
    plPlaceR.getCell(1).font = { name: 'Arial', size: 10 };
    plRow += 2;

    const plFirmR = wsPL.getRow(plRow);
    plFirmR.getCell(1).value = `    ${compName}`;
    plFirmR.getCell(1).font = { name: 'Arial', size: 10 };
    if (caName) {
      plFirmR.getCell(3).value = `For ${caName}`;
      plFirmR.getCell(3).alignment = { horizontal: 'center' };
      plFirmR.getCell(3).font = { name: 'Arial', size: 10 };
      wsPL.mergeCells(plRow, 3, plRow, 4);
    }
    plRow++;

    if (caName) {
      const plCaFirmR = wsPL.getRow(plRow);
      plCaFirmR.getCell(3).value = 'CHARTERED ACCOUNTANTS';
      plCaFirmR.getCell(3).alignment = { horizontal: 'center' };
      plCaFirmR.getCell(3).font = { bold: true, name: 'Arial', size: 10 };
      wsPL.mergeCells(plRow, 3, plRow, 4);
      plRow += 2;

      const plCaNameR = wsPL.getRow(plRow);
      plCaNameR.getCell(3).value = caName;
      plCaNameR.getCell(3).alignment = { horizontal: 'center' };
      plCaNameR.getCell(3).font = { name: 'Arial', size: 10 };
      wsPL.mergeCells(plRow, 3, plRow, 4);
      plRow += 2;
    } else {
      plRow += 3;
    }

    const plPartnerR = wsPL.getRow(plRow);
    plPartnerR.getCell(1).value = signatoryTitle;
    plPartnerR.getCell(1).alignment = { horizontal: 'center' };
    plPartnerR.getCell(1).font = { bold: true, name: 'Arial', size: 10 };

    if (caMno) {
      plPartnerR.getCell(3).value = `M.No. ${caMno}`;
      plPartnerR.getCell(3).alignment = { horizontal: 'center' };
      plPartnerR.getCell(3).font = { name: 'Arial', size: 10 };
      wsPL.mergeCells(plRow, 3, plRow, 4);
      const plMnoBorder = plPartnerR.getCell(3);
      plMnoBorder.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };
    }
    plRow++;

    if (caFrn) {
      const frnR = wsPL.getRow(plRow);
      frnR.getCell(3).value = `FRN: ${caFrn}`;
      frnR.getCell(3).alignment = { horizontal: 'center' };
      frnR.getCell(3).font = { size: 9, name: 'Arial' };
      wsPL.mergeCells(plRow, 3, plRow, 4);
      plRow++;
    }

    if (caUdin) {
      const udinR = wsPL.getRow(plRow);
      udinR.getCell(3).value = `UDIN: ${caUdin}`;
      udinR.getCell(3).alignment = { horizontal: 'center' };
      udinR.getCell(3).font = { size: 9, name: 'Arial' };
      wsPL.mergeCells(plRow, 3, plRow, 4);
      plRow++;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  SHEET 3: ANNEXURE "A" (PARTNERS CAPITAL ACCOUNT)
    // ═════════════════════════════════════════════════════════════════════════
    const wsA = wb.addWorksheet('Annexure A', {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
    });
    wsA.views = [{ showGridLines: true }];
    wsA.columns = [
      { key: 'A', width: 6 },
      { key: 'B', width: 24 },
      { key: 'C', width: 10 },
      { key: 'D', width: 16 },
      { key: 'E', width: 14 },
      { key: 'F', width: 14 },
      { key: 'G', width: 10 },
      { key: 'H', width: 14 },
      { key: 'I', width: 16 },
      { key: 'J', width: 16 },
      { key: 'K', width: 15 },
      { key: 'L', width: 18 },
      { key: 'M', width: 16 },
    ];

    let aRow = 1;
    const addAHeader = (text: string, bold = true, size = 11) => {
      const r = wsA.getRow(aRow);
      r.getCell(1).value = text;
      r.getCell(1).font = { bold, size, name: 'Arial' };
      wsA.mergeCells(aRow, 1, aRow, 13);
      r.getCell(1).alignment = { horizontal: 'center' };
      aRow++;
    };

    addAHeader(compName, true, 13);
    if (compAddr) addAHeader(compAddr, false, 10);
    addAHeader(`ANNEXURE "A" ATTACHED TO AND FORMING PART OF BALANCE SHEET AS ON ${asOnDateStr}`, true, 10);
    addAHeader('STATEMENT OF PARTNERS CAPITAL ACCOUNT', true, 11);
    aRow++;

    const aHRow = wsA.getRow(aRow++);
    const aHeaders = [
      'S.No.', 'Name of Partners', 'Share %', 'Opening Bal.', 'Addition',
      'Salary', 'Int. %', 'Int. Amt', 'Profit Share', 'Total',
      'Withdrawals Nature', 'Withdrawals Amt', 'Closing Bal.'
    ];
    aHeaders.forEach((h, i) => {
      const cell = aHRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, name: 'Arial', size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
      cell.alignment = { horizontal: i >= 2 && i !== 10 ? 'right' : 'left', vertical: 'middle', wrapText: true };
    });

    const annexAStart = aRow;
    partnersList.forEach((p: any, idx: number) => {
      const r = wsA.getRow(aRow);
      r.height = 20;

      r.getCell(1).value = idx + 1;
      r.getCell(2).value = (p.name || `PARTNER ${idx + 1}`).toUpperCase();
      r.getCell(3).value = Number(p.sharePct) || 0;
      r.getCell(3).numFmt = '0.00"%"';

      r.getCell(4).value = Number(p.openingBal) || 0;
      r.getCell(4).numFmt = CURR_FMT;

      r.getCell(5).value = Number(p.addition) || 0;
      r.getCell(5).numFmt = CURR_FMT;

      r.getCell(6).value = Number(p.salary) || 0;
      r.getCell(6).numFmt = CURR_FMT;

      r.getCell(7).value = Number(p.interestRate) || 12;
      r.getCell(7).numFmt = '0"%"';

      // Int. Amt formula = D * G%
      r.getCell(8).value = { formula: `D${aRow}*(G${aRow}/100)`, result: Number(p.interestAmt) || 0 };
      r.getCell(8).numFmt = CURR_FMT;

      r.getCell(9).value = Number(p.profitShare) || 0;
      r.getCell(9).numFmt = CURR_FMT;

      // Total = D + E + F + H + I
      r.getCell(10).value = { formula: `D${aRow}+E${aRow}+F${aRow}+H${aRow}+I${aRow}`, result: Number(p.total) || 0 };
      r.getCell(10).numFmt = CURR_FMT;

      r.getCell(11).value = p.withdrawalsNature || '';
      r.getCell(12).value = Number(p.withdrawalsAmt) || 0;
      r.getCell(12).numFmt = CURR_FMT;

      // Closing = J - L
      r.getCell(13).value = { formula: `J${aRow}-L${aRow}`, result: Number(p.closingBal) || 0 };
      r.getCell(13).numFmt = CURR_FMT;
      r.getCell(13).font = { bold: true };

      for (let c = 1; c <= 13; c++) {
        r.getCell(c).font = { ...r.getCell(c).font, name: 'Arial', size: 9 };
        r.getCell(c).alignment = {
          horizontal: c >= 3 && c !== 11 ? 'right' : 'left',
          vertical: 'middle'
        };
      }
      aRow++;
    });

    const annexAEnd = aRow - 1;
    // Totals Row
    const aTotRow = wsA.getRow(aRow++);
    aTotRow.height = 22;
    aTotRow.getCell(2).value = 'TOTAL RS.';
    aTotRow.getCell(2).font = { bold: true, name: 'Arial', size: 9 };

    [3, 4, 5, 6, 8, 9, 10, 12, 13].forEach(c => {
      const colLetter = wsA.getColumn(c).letter;
      const cell = aTotRow.getCell(c);
      cell.value = { formula: `SUM(${colLetter}${annexAStart}:${colLetter}${annexAEnd})` };
      cell.numFmt = c === 3 ? '0.00"%"' : CURR_FMT;
      cell.font = { bold: true, name: 'Arial', size: 9 };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });

    for (let c = 1; c <= 13; c++) {
      aTotRow.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    }

    // Annexure A Signatures
    let aSignRow = aRow + 2;
    const aPlaceR = wsA.getRow(aSignRow);
    aPlaceR.getCell(1).value = `PLACE  :  ${(compPlace || '').toUpperCase()}`;
    aPlaceR.getCell(1).font = { name: 'Arial', size: 10 };

    aPlaceR.getCell(9).value = `M/S ${compName}`;
    aPlaceR.getCell(9).alignment = { horizontal: 'center' };
    aPlaceR.getCell(9).font = { name: 'Arial', size: 10 };
    wsA.mergeCells(aSignRow, 9, aSignRow, 13);
    aSignRow += 2;

    const aSigR = wsA.getRow(aSignRow);
    aSigR.getCell(9).value = signatoryTitle;
    aSigR.getCell(9).alignment = { horizontal: 'center' };
    aSigR.getCell(9).font = { bold: true, name: 'Arial', size: 10 };
    wsA.mergeCells(aSignRow, 9, aSignRow, 13);

    // ═════════════════════════════════════════════════════════════════════════
    //  SHEET 4: ANNEXURE "B" (FIXED ASSETS SCHEDULE)
    // ═════════════════════════════════════════════════════════════════════════
    const wsB = wb.addWorksheet('Annexure B', {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
    });
    wsB.views = [{ showGridLines: true }];
    wsB.columns = [
      { key: 'A', width: 6 },
      { key: 'B', width: 26 },
      { key: 'C', width: 16 },
      { key: 'D', width: 14 },
      { key: 'E', width: 14 },
      { key: 'F', width: 10 },
      { key: 'G', width: 14 },
      { key: 'H', width: 18 },
    ];

    let bRow = 1;
    const addBHeader = (text: string, bold = true, size = 11) => {
      const r = wsB.getRow(bRow);
      r.getCell(1).value = text;
      r.getCell(1).font = { bold, size, name: 'Arial' };
      wsB.mergeCells(bRow, 1, bRow, 8);
      r.getCell(1).alignment = { horizontal: 'center' };
      bRow++;
    };

    addBHeader(compName, true, 13);
    if (compAddr) addBHeader(compAddr, false, 10);
    addBHeader(`ANNEXURE "B" ATTACHED TO AND FORMING PART OF BALANCE SHEET AS ON ${asOnDateStr}`, true, 10);
    addBHeader('STATEMENT OF DEPRECIATION AS PER INCOME TAX ACT, 1961', true, 11);
    bRow++;

    const bHRow = wsB.getRow(bRow++);
    const bHeaders = [
      'S.No.', 'Description of Assets', 'Opening WDV', 'Addition < 180',
      'Addition > 180', 'Dep. Rate', 'Depreciation', 'Closing WDV'
    ];
    bHeaders.forEach((h, i) => {
      const cell = bHRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, name: 'Arial', size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
      cell.alignment = { horizontal: i >= 2 ? 'right' : 'left', vertical: 'middle', wrapText: true };
    });

    const annexBStart = bRow;
    const faListB = calculatedData.calculatedFASchedule || [];

    faListB.forEach((fa: any, idx: number) => {
      const r = wsB.getRow(bRow);
      r.height = 20;

      r.getCell(1).value = idx + 1;
      r.getCell(2).value = (fa.name || `ASSET ${idx + 1}`).toUpperCase();

      r.getCell(3).value = Number(fa.openingBal) || 0;
      r.getCell(3).numFmt = CURR_FMT;

      r.getCell(4).value = Number(fa.additionBefore) || 0;
      r.getCell(4).numFmt = CURR_FMT;

      r.getCell(5).value = Number(fa.additionAfter) || 0;
      r.getCell(5).numFmt = CURR_FMT;

      r.getCell(6).value = Number(fa.depreciationRate) || 15;
      r.getCell(6).numFmt = '0"%"';

      r.getCell(7).value = Number(fa.depreciation) || 0;
      r.getCell(7).numFmt = CURR_FMT;

      // Closing WDV = C + D + E - G
      r.getCell(8).value = { formula: `C${bRow}+D${bRow}+E${bRow}-G${bRow}`, result: Number(fa.closingBal) };
      r.getCell(8).numFmt = CURR_FMT;
      r.getCell(8).font = { bold: true };

      for (let c = 1; c <= 8; c++) {
        r.getCell(c).font = { ...r.getCell(c).font, name: 'Arial', size: 9 };
        r.getCell(c).alignment = { horizontal: c >= 3 ? 'right' : 'left', vertical: 'middle' };
      }
      bRow++;
    });

    const annexBEnd = bRow - 1;
    // Totals Row
    const bTotRow = wsB.getRow(bRow++);
    bTotRow.height = 22;
    bTotRow.getCell(2).value = 'TOTAL RS.';
    bTotRow.getCell(2).font = { bold: true, name: 'Arial', size: 9 };

    [3, 4, 5, 7, 8].forEach(c => {
      const colLetter = wsB.getColumn(c).letter;
      const cell = bTotRow.getCell(c);
      cell.value = { formula: `SUM(${colLetter}${annexBStart}:${colLetter}${annexBEnd})` };
      cell.numFmt = CURR_FMT;
      cell.font = { bold: true, name: 'Arial', size: 9 };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });

    for (let c = 1; c <= 8; c++) {
      bTotRow.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    }

    // Annexure B Signatures
    let bSignRow = bRow + 2;
    const bPlaceR = wsB.getRow(bSignRow);
    bPlaceR.getCell(1).value = `PLACE  :  ${(compPlace || '').toUpperCase()}`;
    bPlaceR.getCell(1).font = { name: 'Arial', size: 10 };

    bPlaceR.getCell(6).value = `M/S ${compName}`;
    bPlaceR.getCell(6).alignment = { horizontal: 'center' };
    bPlaceR.getCell(6).font = { name: 'Arial', size: 10 };
    wsB.mergeCells(bSignRow, 6, bSignRow, 8);
    bSignRow += 2;

    const bSigR = wsB.getRow(bSignRow);
    bSigR.getCell(6).value = signatoryTitle;
    bSigR.getCell(6).alignment = { horizontal: 'center' };
    bSigR.getCell(6).font = { bold: true, name: 'Arial', size: 10 };
    wsB.mergeCells(bSignRow, 6, bSignRow, 8);

    // Generate Excel buffer
    const buffer = await wb.xlsx.writeBuffer();
    const safeName = compName.replace(/[^A-Z0-9_-]/gi, '_');
    const filename = `${safeName}_${titlePrefix}Financial_Statements_CA_Format.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error('Virtual Excel Export Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Export error' }, { status: 500 });
  }
}
