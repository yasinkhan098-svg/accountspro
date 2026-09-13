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
    type RowEntry = { type: 'section-header' | 'ledger' | 'section-total' | 'net-entry' | 'blank'; name: string; amount?: number };
    const liabRows: RowEntry[] = [];
    const assetRows: RowEntry[] = [];

    // Capital
    const capList = (form?.bsSections?.capitalItems && form.bsSections.capitalItems.length > 0)
      ? form.bsSections.capitalItems
      : [{ name: 'Capital Account', amount: calculatedData.capitalTotal }];
    liabRows.push({ type: 'section-header', name: 'CAPITAL ACCOUNT' });
    capList.forEach((c: any) => liabRows.push({ type: 'ledger', name: c.name, amount: c.amount }));
    liabRows.push({ type: 'section-total', name: '', amount: calculatedData.capitalTotal });
    liabRows.push({ type: 'blank', name: '' });

    // Secured
    if (form?.bsSections?.securedLoans && form.bsSections.securedLoans.length > 0) {
      liabRows.push({ type: 'section-header', name: 'SECURED LOAN :' });
      form.bsSections.securedLoans.forEach((l: any) => liabRows.push({ type: 'ledger', name: l.name, amount: l.amount }));
      liabRows.push({ type: 'section-total', name: '', amount: calculatedData.securedTotal });
      liabRows.push({ type: 'blank', name: '' });
    }

    // Unsecured
    if (form?.bsSections?.unsecuredLoans && form.bsSections.unsecuredLoans.length > 0) {
      liabRows.push({ type: 'section-header', name: 'UNSECURED LOAN :' });
      form.bsSections.unsecuredLoans.forEach((l: any) => liabRows.push({ type: 'ledger', name: l.name, amount: l.amount }));
      liabRows.push({ type: 'section-total', name: '', amount: calculatedData.unsecuredTotal });
      liabRows.push({ type: 'blank', name: '' });
    }

    // Current Liabilities (with deduplication)
    if (form?.bsSections?.currentLiabilities && form.bsSections.currentLiabilities.length > 0) {
      liabRows.push({ type: 'section-header', name: 'CURRENT LIABILITIES' });
      const seen = new Map<string, number>();
      const deduped: any[] = [];
      for (const cl of form.bsSections.currentLiabilities) {
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

    // Net Profit on Liabilities side
    if (calculatedData.netProfit > 0) {
      liabRows.push({ type: 'net-entry', name: 'Add: Net Profit (as per P&L)', amount: calculatedData.netProfit });
    }

    // Fixed Assets
    const faList = (form?.bsSections?.fixedAssets && form.bsSections.fixedAssets.length > 0)
      ? form.bsSections.fixedAssets
      : (calculatedData.calculatedFASchedule || []);
    if (faList.length > 0) {
      assetRows.push({ type: 'section-header', name: 'FIXED ASSETS' });
      faList.forEach((fa: any) => assetRows.push({ type: 'ledger', name: fa.name, amount: fa.amount || fa.closingBal }));
      assetRows.push({ type: 'section-total', name: '', amount: calculatedData.fixedAssetTotal });
      assetRows.push({ type: 'blank', name: '' });
    }

    // Security Deposits
    if (form?.bsSections?.securityDeposits && form.bsSections.securityDeposits.length > 0) {
      assetRows.push({ type: 'section-header', name: 'SECURITY DEPOSITS' });
      form.bsSections.securityDeposits.forEach((sd: any) => assetRows.push({ type: 'ledger', name: sd.name, amount: sd.amount }));
      assetRows.push({ type: 'section-total', name: '', amount: calculatedData.securityDepositsTotal });
      assetRows.push({ type: 'blank', name: '' });
    }

    // Current Assets
    const caList = (form?.bsSections?.currentAssets && form.bsSections.currentAssets.length > 0)
      ? form.bsSections.currentAssets
      : [];
    if (caList.length > 0) {
      assetRows.push({ type: 'section-header', name: 'CURRENT ASSETS' });
      const seenA = new Map<string, number>();
      const dedupedA: any[] = [];
      for (const ca of caList) {
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

    // Net Loss on Assets side
    if (calculatedData.netProfit < 0) {
      assetRows.push({ type: 'net-entry', name: 'Less: Net Loss (as per P&L)', amount: Math.abs(calculatedData.netProfit) });
    }

    const maxBSRows = Math.max(liabRows.length, assetRows.length);
    const liabSumCells: string[] = [];
    const assetSumCells: string[] = [];

    for (let i = 0; i < maxBSRows; i++) {
      const l = liabRows[i];
      const a = assetRows[i];
      const row = wsBS.getRow(bsRow);
      row.height = 20;

      // Left (Liabilities)
      const cellA = row.getCell(1);
      const cellB = row.getCell(2);
      if (l) {
        cellA.value = l.name;
        cellA.alignment = { horizontal: 'left', vertical: 'middle' };
        if (l.type === 'section-header') {
          cellA.font = { name: 'Arial', size: 10, bold: true, underline: true };
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
            cellB.font = { name: 'Arial', size: 10, bold: true, color: GREEN };
            liabSumCells.push(`B${bsRow}`);
          } else {
            cellB.font = { name: 'Arial', size: 10, color: RED };
          }
        }
      }

      // Right (Assets)
      const cellC = row.getCell(3);
      const cellD = row.getCell(4);
      if (a) {
        cellC.value = a.name;
        cellC.alignment = { horizontal: 'left', vertical: 'middle' };
        if (a.type === 'section-header') {
          cellC.font = { name: 'Arial', size: 10, bold: true, underline: true };
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
            cellD.font = { name: 'Arial', size: 10, bold: true, color: RED };
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

    bsRow += 2;
    const noteRow = wsBS.getRow(bsRow++);
    noteRow.getCell(1).value = 'compiled on the basis of information provided to us';
    noteRow.getCell(1).font = { italic: true, name: 'Arial', size: 9, color: { argb: 'FF555555' } };
    wsBS.mergeCells(noteRow.number, 1, noteRow.number, 4);
    noteRow.getCell(1).alignment = { horizontal: 'center' };

    bsRow += 2;
    const sigTopRow = wsBS.getRow(bsRow++);
    sigTopRow.getCell(1).value = `PLACE:  ${compPlace}`;
    sigTopRow.getCell(1).font = { bold: true, name: 'Arial', size: 9 };
    sigTopRow.getCell(3).value = `FOR ${compName}`;
    sigTopRow.getCell(3).font = { bold: true, name: 'Arial', size: 9 };

    const sigDateRow = wsBS.getRow(bsRow++);
    sigDateRow.getCell(1).value = `DATED:  ${asOnDateStr}`;
    sigDateRow.getCell(1).font = { bold: true, name: 'Arial', size: 9 };

    bsRow += 2;
    const sigTitleRow = wsBS.getRow(bsRow++);
    sigTitleRow.getCell(3).value = signatory?.signatoryTitle || 'PARTNER';
    sigTitleRow.getCell(3).font = { bold: true, name: 'Arial', size: 9 };

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
    addPLHeader(`${titlePrefix}PROFIT & LOSS ACCOUNT FOR THE YEAR ENDED ${formatDotDate(toDateStr)}`, true, 11);
    plRow++;

    // Sub-header
    const plSubHeader = wsPL.getRow(plRow);
    const plHeaders = ['PARTICULARS', 'AMOUNT', 'PARTICULARS', 'AMOUNT'];
    plHeaders.forEach((h, i) => {
      const cell = plSubHeader.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, name: 'Arial', size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
      cell.alignment = { horizontal: i % 2 === 0 ? 'left' : 'right' };
    });
    plRow++;

    // ── Trading Account ──
    const tradDebitRows: { name: string; amount: number }[] = [
      { name: 'To Opening Stock', amount: form?.plData?.trading?.openingStock || 0 },
      { name: 'To Purchases', amount: form?.plData?.trading?.purchases || 0 },
    ];
    (form?.plData?.trading?.directExpenses || []).forEach((e: any) => {
      tradDebitRows.push({ name: `To ${e.name}`, amount: Number(e.amount) || 0 });
    });
    if (calculatedData.grossProfit > 0) {
      tradDebitRows.push({ name: 'To Gross Profit c/d', amount: calculatedData.grossProfit });
    }

    const tradCreditRows: { name: string; amount: number }[] = [
      { name: 'By Sales', amount: form?.plData?.trading?.sales || 0 },
      { name: 'By Closing Stock', amount: form?.plData?.trading?.closingStock || 0 },
    ];
    if (calculatedData.grossProfit < 0) {
      tradCreditRows.push({ name: 'By Gross Loss c/d', amount: Math.abs(calculatedData.grossProfit) });
    }

    const tradStartRow = plRow;
    const maxTrad = Math.max(tradDebitRows.length, tradCreditRows.length);
    let gpRowDebit = 0;
    let gpRowCredit = 0;

    for (let i = 0; i < maxTrad; i++) {
      const d = tradDebitRows[i];
      const c = tradCreditRows[i];
      const r = wsPL.getRow(plRow);
      r.height = 20;

      if (d) {
        r.getCell(1).value = d.name;
        r.getCell(1).font = { name: 'Arial', size: 10, bold: d.name.includes('Gross Profit') };
        r.getCell(2).value = Number(d.amount);
        r.getCell(2).numFmt = CURR_FMT;
        r.getCell(2).font = { name: 'Arial', size: 10, color: d.name.includes('Gross Profit') ? GREEN : RED, bold: d.name.includes('Gross Profit') };
        r.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
        if (d.name.includes('Gross Profit')) gpRowDebit = plRow;
      }
      if (c) {
        r.getCell(3).value = c.name;
        r.getCell(3).font = { name: 'Arial', size: 10, bold: c.name.includes('Gross Loss') };
        r.getCell(4).value = Number(c.amount);
        r.getCell(4).numFmt = CURR_FMT;
        r.getCell(4).font = { name: 'Arial', size: 10, color: c.name.includes('Gross Loss') ? RED : RED, bold: c.name.includes('Gross Loss') };
        r.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
        if (c.name.includes('Gross Loss')) gpRowCredit = plRow;
      }
      plRow++;
    }

    // Trading Total Row (Formulas)
    const tradEndRow = plRow - 1;
    const tradTotR = wsPL.getRow(plRow++);
    tradTotR.height = 22;
    tradTotR.getCell(1).value = 'TOTAL RS.';
    tradTotR.getCell(1).font = { bold: true, name: 'Arial', size: 10 };
    tradTotR.getCell(1).border = { top: { style: 'thin' }, bottom: { style: 'double' } };

    const tradTotCellB = tradTotR.getCell(2);
    tradTotCellB.value = { formula: `SUM(B${tradStartRow}:B${tradEndRow})`, result: calculatedData.tradingDebitTotal };
    tradTotCellB.numFmt = CURR_FMT;
    tradTotCellB.font = { bold: true, name: 'Arial', size: 10 };
    tradTotCellB.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    tradTotCellB.alignment = { horizontal: 'right', vertical: 'middle' };

    tradTotR.getCell(3).value = 'TOTAL RS.';
    tradTotR.getCell(3).font = { bold: true, name: 'Arial', size: 10 };
    tradTotR.getCell(3).border = { top: { style: 'thin' }, bottom: { style: 'double' } };

    const tradTotCellD = tradTotR.getCell(4);
    tradTotCellD.value = { formula: `SUM(D${tradStartRow}:D${tradEndRow})`, result: calculatedData.tradingCreditTotal };
    tradTotCellD.numFmt = CURR_FMT;
    tradTotCellD.font = { bold: true, name: 'Arial', size: 10 };
    tradTotCellD.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    tradTotCellD.alignment = { horizontal: 'right', vertical: 'middle' };

    // Empty space between Trading and P&L
    plRow++;

    // ── Profit & Loss Account ──
    const plDebitRows: { name: string; amount: number; isFormula?: boolean; formulaRef?: string }[] = [];
    const plCreditRows: { name: string; amount: number; isFormula?: boolean; formulaRef?: string }[] = [];

    if (calculatedData.grossProfit < 0) {
      plDebitRows.push({
        name: 'To Gross Loss b/d',
        amount: Math.abs(calculatedData.grossProfit),
        isFormula: gpRowCredit > 0,
        formulaRef: gpRowCredit > 0 ? `D${gpRowCredit}` : undefined
      });
    }
    (form?.plData?.indirectExpenses || []).forEach((e: any) => {
      plDebitRows.push({ name: e.name.startsWith('To ') ? e.name : `To ${e.name}`, amount: Number(e.amount) || 0 });
    });
    if (calculatedData.netProfit > 0) {
      plDebitRows.push({ name: 'To Net Profit transferred to Capital A/c', amount: calculatedData.netProfit });
    }

    if (calculatedData.grossProfit > 0) {
      plCreditRows.push({
        name: 'By Gross Profit b/d',
        amount: calculatedData.grossProfit,
        isFormula: gpRowDebit > 0,
        formulaRef: gpRowDebit > 0 ? `B${gpRowDebit}` : undefined
      });
    }
    (form?.plData?.indirectIncomes || []).forEach((i: any) => {
      plCreditRows.push({ name: i.name.startsWith('By ') ? i.name : `By ${i.name}`, amount: Number(i.amount) || 0 });
    });
    if (calculatedData.netProfit < 0) {
      plCreditRows.push({ name: 'By Net Loss transferred to Capital A/c', amount: Math.abs(calculatedData.netProfit) });
    }

    const plDataStartRow = plRow;
    const maxPL = Math.max(plDebitRows.length, plCreditRows.length);
    let netProfitRowDebit = 0;

    for (let i = 0; i < maxPL; i++) {
      const d = plDebitRows[i];
      const c = plCreditRows[i];
      const r = wsPL.getRow(plRow);
      r.height = 20;

      if (d) {
        r.getCell(1).value = d.name;
        r.getCell(1).font = { name: 'Arial', size: 10, bold: d.name.includes('Net Profit') || d.name.includes('Gross Loss') };
        const cell = r.getCell(2);
        if (d.isFormula && d.formulaRef) {
          cell.value = { formula: d.formulaRef, result: d.amount };
        } else {
          cell.value = Number(d.amount);
        }
        cell.numFmt = CURR_FMT;
        cell.font = { name: 'Arial', size: 10, color: d.name.includes('Net Profit') ? GREEN : RED, bold: d.name.includes('Net Profit') };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (d.name.includes('Net Profit')) netProfitRowDebit = plRow;
      }

      if (c) {
        r.getCell(3).value = c.name;
        r.getCell(3).font = { name: 'Arial', size: 10, bold: c.name.includes('Gross Profit') || c.name.includes('Net Loss') };
        const cell = r.getCell(4);
        if (c.isFormula && c.formulaRef) {
          cell.value = { formula: c.formulaRef, result: c.amount };
        } else {
          cell.value = Number(c.amount);
        }
        cell.numFmt = CURR_FMT;
        cell.font = { name: 'Arial', size: 10, color: c.name.includes('Gross Profit') ? GREEN : RED, bold: c.name.includes('Gross Profit') };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      plRow++;
    }

    // P&L Total Row (Formulas)
    const plDataEndRow = plRow - 1;
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

    // P&L Signatures
    plRow += 2;
    const plSigTopRow = wsPL.getRow(plRow++);
    plSigTopRow.getCell(1).value = `PLACE:  ${compPlace}`;
    plSigTopRow.getCell(1).font = { bold: true, name: 'Arial', size: 9 };
    plSigTopRow.getCell(3).value = `FOR ${compName}`;
    plSigTopRow.getCell(3).font = { bold: true, name: 'Arial', size: 9 };

    const plSigDateRow = wsPL.getRow(plRow++);
    plSigDateRow.getCell(1).value = `DATED:  ${asOnDateStr}`;
    plSigDateRow.getCell(1).font = { bold: true, name: 'Arial', size: 9 };

    plRow += 2;
    const plSigTitleRow = wsPL.getRow(plRow++);
    plSigTitleRow.getCell(3).value = signatory?.signatoryTitle || 'PARTNER';
    plSigTitleRow.getCell(3).font = { bold: true, name: 'Arial', size: 9 };

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

    // Headers
    const aHRow = wsA.getRow(aRow++);
    const aHeaders = [
      'S.No.', 'Name of Partner', 'Share %', 'Opening Bal.', 'Addition',
      'Salary/Remun.', 'Int. Rate', 'Interest', 'Share of Profit',
      'TOTAL', 'Withdrawals', 'Nature', 'Closing Balance'
    ];
    aHeaders.forEach((h, i) => {
      const cell = aHRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, name: 'Arial', size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
      cell.alignment = { horizontal: i >= 2 && i !== 11 ? 'right' : 'left', vertical: 'middle', wrapText: true };
    });

    const annexAStart = aRow;
    const partnersList = calculatedData.calculatedPartners || [];

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

      r.getCell(8).value = Number(p.interestAmt) || 0;
      r.getCell(8).numFmt = CURR_FMT;

      r.getCell(9).value = Number(p.profitShare) || 0;
      r.getCell(9).numFmt = CURR_FMT;

      // TOTAL = SUM(D:I)
      r.getCell(10).value = { formula: `SUM(D${aRow}:F${aRow})+H${aRow}+I${aRow}`, result: Number(p.total) };
      r.getCell(10).numFmt = CURR_FMT;
      r.getCell(10).font = { bold: true };

      r.getCell(11).value = Number(p.withdrawalsAmt) || 0;
      r.getCell(11).numFmt = CURR_FMT;

      r.getCell(12).value = p.withdrawalsNature || '';

      // Closing = J - K
      r.getCell(13).value = { formula: `J${aRow}-K${aRow}`, result: Number(p.closingBal) };
      r.getCell(13).numFmt = CURR_FMT;
      r.getCell(13).font = { bold: true };

      for (let c = 1; c <= 13; c++) {
        r.getCell(c).font = { name: 'Arial', size: 9, bold: c === 10 || c === 13 };
        r.getCell(c).alignment = { horizontal: c >= 3 && c !== 12 ? 'right' : 'left', vertical: 'middle' };
      }
      aRow++;
    });

    const annexAEnd = aRow - 1;
    const aTotRow = wsA.getRow(aRow++);
    aTotRow.height = 22;
    aTotRow.getCell(2).value = 'TOTAL RS.';
    aTotRow.getCell(2).font = { bold: true, name: 'Arial', size: 9 };

    [3, 4, 5, 6, 8, 9, 10, 11, 13].forEach(c => {
      const colLetter = String.fromCharCode(64 + c);
      const cell = aTotRow.getCell(c);
      cell.value = { formula: `SUM(${colLetter}${annexAStart}:${colLetter}${annexAEnd})` };
      cell.numFmt = c === 3 ? '0.00"%"' : CURR_FMT;
      cell.font = { bold: true, name: 'Arial', size: 9 };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });

    for (let c = 1; c <= 13; c++) {
      aTotRow.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    }

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
        r.getCell(c).font = { name: 'Arial', size: 9, bold: c === 8 };
        r.getCell(c).alignment = { horizontal: c >= 3 ? 'right' : 'left', vertical: 'middle' };
      }
      bRow++;
    });

    const annexBEnd = bRow - 1;
    const bTotRow = wsB.getRow(bRow++);
    bTotRow.height = 22;
    bTotRow.getCell(2).value = 'TOTAL RS.';
    bTotRow.getCell(2).font = { bold: true, name: 'Arial', size: 9 };

    [3, 4, 5, 7, 8].forEach(c => {
      const colLetter = String.fromCharCode(64 + c);
      const cell = bTotRow.getCell(c);
      cell.value = { formula: `SUM(${colLetter}${annexBStart}:${colLetter}${annexBEnd})` };
      cell.numFmt = CURR_FMT;
      cell.font = { bold: true, name: 'Arial', size: 9 };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });

    for (let c = 1; c <= 8; c++) {
      bTotRow.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    }

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
