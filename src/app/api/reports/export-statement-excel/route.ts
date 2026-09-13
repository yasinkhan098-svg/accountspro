import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

const RED_COLOR: Partial<ExcelJS.Color> = { argb: 'FFCC0000' };
const GREEN_COLOR: Partial<ExcelJS.Color> = { argb: 'FF006600' };
const HEADER_BG: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF0F0F0' },
};
const TOTAL_BG: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF8F8F8' },
};

const BORDER_THIN: ExcelJS.Border = { style: 'thin', color: { argb: 'FFCCCCCC' } };
const BORDER_DARK: ExcelJS.Border = { style: 'thin', color: { argb: 'FF333333' } };
const BORDER_DOUBLE: ExcelJS.Border = { style: 'double', color: { argb: 'FF333333' } };

export async function POST(req: Request) {
  try {
    const data = await req.json().catch(() => ({}));
    const { reportType } = data;

    if (reportType === 'balance-sheet') {
      return generateBalanceSheetExcel(data);
    } else if (reportType === 'profit-loss') {
      return generateProfitLossExcel(data);
    } else {
      return NextResponse.json({ error: 'Invalid reportType' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Export statement Excel error:', err);
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BALANCE SHEET EXCEL GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
async function generateBalanceSheetExcel(data: any) {
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

  // Title block
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

  // Blank row
  rIdx++;

  // Header row
  const headerRow = ws.getRow(rIdx);
  headerRow.height = 24;
  const headers = ['LIABILITIES', 'AMOUNT', 'ASSETS', 'AMOUNT'];
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.fill = HEADER_BG;
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

  // Track if section totals exist or if we sum individual items
  const hasLiabSecTotals = liabilities.some((x: any) => x.type === 'section-total');
  const hasAssetSecTotals = assets.some((x: any) => x.type === 'section-total');

  for (let i = 0; i < maxRows; i++) {
    const l = liabilities[i];
    const a = assets[i];
    const row = ws.getRow(rIdx);
    row.height = 20;

    // --- Left side (Liabilities) ---
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
        cellB.numFmt = '#,##0.00';
        cellB.alignment = { horizontal: 'right', vertical: 'middle' };

        if (l.type === 'section-total') {
          cellB.font = { name: 'Arial', size: 10, bold: true };
          cellB.border = { top: BORDER_THIN };
          if (hasLiabSecTotals) liabSumCells.push(`B${rIdx}`);
        } else if (l.type === 'net-entry') {
          cellB.font = { name: 'Arial', size: 10, bold: true, color: GREEN_COLOR };
          liabSumCells.push(`B${rIdx}`);
        } else {
          cellB.font = { name: 'Arial', size: 10, color: RED_COLOR };
          if (!hasLiabSecTotals && l.amount > 0) liabSumCells.push(`B${rIdx}`);
        }
      }
    }

    cellA.border = { left: BORDER_THIN, right: BORDER_THIN };
    cellB.border = { right: BORDER_DARK };

    // --- Right side (Assets) ---
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
        cellD.numFmt = '#,##0.00';
        cellD.alignment = { horizontal: 'right', vertical: 'middle' };

        if (a.type === 'section-total') {
          cellD.font = { name: 'Arial', size: 10, bold: true };
          cellD.border = { top: BORDER_THIN };
          if (hasAssetSecTotals) assetSumCells.push(`D${rIdx}`);
        } else if (a.type === 'net-entry') {
          cellD.font = { name: 'Arial', size: 10, bold: true, color: RED_COLOR };
          assetSumCells.push(`D${rIdx}`);
        } else {
          cellD.font = { name: 'Arial', size: 10, color: RED_COLOR };
          if (!hasAssetSecTotals && a.amount > 0) assetSumCells.push(`D${rIdx}`);
        }
      }
    }

    cellC.border = { right: BORDER_THIN };
    cellD.border = { right: BORDER_THIN };

    rIdx++;
  }

  // --- Total Row ---
  const totRow = ws.getRow(rIdx);
  totRow.height = 24;

  const tA = totRow.getCell(1);
  const tB = totRow.getCell(2);
  const tC = totRow.getCell(3);
  const tD = totRow.getCell(4);

  tA.value = 'TOTAL RS.';
  tA.font = { name: 'Arial', size: 11, bold: true };
  tA.fill = TOTAL_BG;
  tA.alignment = { horizontal: 'left', vertical: 'middle' };
  tA.border = { top: BORDER_DARK, bottom: BORDER_DOUBLE, left: BORDER_THIN, right: BORDER_THIN };

  const liabFormula = liabSumCells.length > 0 ? liabSumCells.join('+') : `SUM(B${startDataRow}:B${rIdx - 1})`;
  tB.value = { formula: liabFormula, result: Number(totalLiabilities) };
  tB.numFmt = '#,##0.00';
  tB.font = { name: 'Arial', size: 11, bold: true };
  tB.fill = TOTAL_BG;
  tB.alignment = { horizontal: 'right', vertical: 'middle' };
  tB.border = { top: BORDER_DARK, bottom: BORDER_DOUBLE, right: BORDER_DARK };

  tC.value = 'TOTAL RS.';
  tC.font = { name: 'Arial', size: 11, bold: true };
  tC.fill = TOTAL_BG;
  tC.alignment = { horizontal: 'left', vertical: 'middle' };
  tC.border = { top: BORDER_DARK, bottom: BORDER_DOUBLE, right: BORDER_THIN };

  const assetFormula = assetSumCells.length > 0 ? assetSumCells.join('+') : `SUM(D${startDataRow}:D${rIdx - 1})`;
  tD.value = { formula: assetFormula, result: Number(totalAssets) };
  tD.numFmt = '#,##0.00';
  tD.font = { name: 'Arial', size: 11, bold: true };
  tD.fill = TOTAL_BG;
  tD.alignment = { horizontal: 'right', vertical: 'middle' };
  tD.border = { top: BORDER_DARK, bottom: BORDER_DOUBLE, right: BORDER_THIN };

  rIdx++;

  // --- Compiled Note ---
  rIdx++;
  ws.mergeCells(rIdx, 1, rIdx, 4);
  const noteCell = ws.getCell(rIdx, 1);
  noteCell.value = 'compiled on the basis of information provided to us';
  noteCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF555555' } };
  noteCell.alignment = { horizontal: 'center', vertical: 'middle' };
  rIdx += 2;

  // --- Sign-off Block ---
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
  const fileName = `${safeName}_Balance_Sheet_${(asOnDate || 'Date').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PROFIT & LOSS EXCEL GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
async function generateProfitLossExcel(data: any) {
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

  // Title block
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

  // Blank row
  rIdx++;

  // Column headers
  const headerRow = ws.getRow(rIdx);
  headerRow.height = 24;
  const headers = ['PARTICULARS', 'AMOUNT', 'PARTICULARS', 'AMOUNT'];
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.fill = HEADER_BG;
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
      cellA.value = l.label;
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

      if (!l.isLabel && l.amt !== undefined && l.amt !== null) {
        cellB.value = Number(l.amt);
        cellB.numFmt = '#,##0.00';
        cellB.font = { name: 'Arial', size: 10, bold: !!l.isBold, color: l.isBold ? undefined : RED_COLOR };
        cellB.alignment = { horizontal: 'right', vertical: 'middle' };
        trdLeftAmtRows.push(rIdx);
      }
    }

    cellA.border = { left: BORDER_THIN, right: BORDER_THIN };
    cellB.border = { right: BORDER_DARK };

    const cellC = row.getCell(3);
    const cellD = row.getCell(4);

    if (r) {
      cellC.value = r.label;
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

      if (!r.isLabel && r.amt !== undefined && r.amt !== null) {
        cellD.value = Number(r.amt);
        cellD.numFmt = '#,##0.00';
        cellD.font = { name: 'Arial', size: 10, bold: !!r.isBold, color: r.isBold ? undefined : RED_COLOR };
        cellD.alignment = { horizontal: 'right', vertical: 'middle' };
        trdRightAmtRows.push(rIdx);
      }
    }

    cellC.border = { right: BORDER_THIN };
    cellD.border = { right: BORDER_THIN };

    rIdx++;
  }

  // ─── TRADING TOTAL ROW ───
  const trdTotRow = ws.getRow(rIdx);
  trdTotRow.height = 24;

  const ttA = trdTotRow.getCell(1);
  const ttB = trdTotRow.getCell(2);
  const ttC = trdTotRow.getCell(3);
  const ttD = trdTotRow.getCell(4);

  ttA.value = 'TOTAL RS.';
  ttA.font = { name: 'Arial', size: 11, bold: true };
  ttA.fill = TOTAL_BG;
  ttA.alignment = { horizontal: 'left', vertical: 'middle' };
  ttA.border = { top: BORDER_DARK, bottom: BORDER_DARK, left: BORDER_THIN, right: BORDER_THIN };

  const leftTrdFormula = trdLeftAmtRows.length > 0 ? `SUM(B${trdStartRow}:B${rIdx - 1})` : `${trading.total}`;
  ttB.value = { formula: leftTrdFormula, result: Number(trading.total) };
  ttB.numFmt = '#,##0.00';
  ttB.font = { name: 'Arial', size: 11, bold: true };
  ttB.fill = TOTAL_BG;
  ttB.alignment = { horizontal: 'right', vertical: 'middle' };
  ttB.border = { top: BORDER_DARK, bottom: BORDER_DARK, right: BORDER_DARK };

  ttC.value = 'TOTAL RS.';
  ttC.font = { name: 'Arial', size: 11, bold: true };
  ttC.fill = TOTAL_BG;
  ttC.alignment = { horizontal: 'left', vertical: 'middle' };
  ttC.border = { top: BORDER_DARK, bottom: BORDER_DARK, right: BORDER_THIN };

  const rightTrdFormula = trdRightAmtRows.length > 0 ? `SUM(D${trdStartRow}:D${rIdx - 1})` : `${trading.total}`;
  ttD.value = { formula: rightTrdFormula, result: Number(trading.total) };
  ttD.numFmt = '#,##0.00';
  ttD.font = { name: 'Arial', size: 11, bold: true };
  ttD.fill = TOTAL_BG;
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
      cellA.value = l.label;
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

      if (!l.isLabel && l.amt !== undefined && l.amt !== null) {
        cellB.value = Number(l.amt);
        cellB.numFmt = '#,##0.00';
        cellB.font = { name: 'Arial', size: 10, bold: !!l.isBold, color: l.isBold ? undefined : RED_COLOR };
        cellB.alignment = { horizontal: 'right', vertical: 'middle' };
        plLeftAmtRows.push(rIdx);
      }
    }

    cellA.border = { left: BORDER_THIN, right: BORDER_THIN };
    cellB.border = { right: BORDER_DARK };

    const cellC = row.getCell(3);
    const cellD = row.getCell(4);

    if (r) {
      cellC.value = r.label;
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

      if (!r.isLabel && r.amt !== undefined && r.amt !== null) {
        cellD.value = Number(r.amt);
        cellD.numFmt = '#,##0.00';
        cellD.font = { name: 'Arial', size: 10, bold: !!r.isBold, color: r.isBold ? undefined : RED_COLOR };
        cellD.alignment = { horizontal: 'right', vertical: 'middle' };
        plRightAmtRows.push(rIdx);
      }
    }

    cellC.border = { right: BORDER_THIN };
    cellD.border = { right: BORDER_THIN };

    rIdx++;
  }

  // ─── P&L TOTAL ROW ───
  const plTotRow = ws.getRow(rIdx);
  plTotRow.height = 24;

  const ptA = plTotRow.getCell(1);
  const ptB = plTotRow.getCell(2);
  const ptC = plTotRow.getCell(3);
  const ptD = plTotRow.getCell(4);

  ptA.value = '';
  ptA.fill = TOTAL_BG;
  ptA.border = { top: BORDER_DARK, bottom: BORDER_DOUBLE, left: BORDER_THIN, right: BORDER_THIN };

  const leftPLFormula = plLeftAmtRows.length > 0 ? `SUM(B${plStartRow}:B${rIdx - 1})` : `${pl.total}`;
  ptB.value = { formula: leftPLFormula, result: Number(pl.total) };
  ptB.numFmt = '#,##0.00';
  ptB.font = { name: 'Arial', size: 11, bold: true };
  ptB.fill = TOTAL_BG;
  ptB.alignment = { horizontal: 'right', vertical: 'middle' };
  ptB.border = { top: BORDER_DARK, bottom: BORDER_DOUBLE, right: BORDER_DARK };

  ptC.value = '';
  ptC.fill = TOTAL_BG;
  ptC.border = { top: BORDER_DARK, bottom: BORDER_DOUBLE, right: BORDER_THIN };

  const rightPLFormula = plRightAmtRows.length > 0 ? `SUM(D${plStartRow}:D${rIdx - 1})` : `${pl.total}`;
  ptD.value = { formula: rightPLFormula, result: Number(pl.total) };
  ptD.numFmt = '#,##0.00';
  ptD.font = { name: 'Arial', size: 11, bold: true };
  ptD.fill = TOTAL_BG;
  ptD.alignment = { horizontal: 'right', vertical: 'middle' };
  ptD.border = { top: BORDER_DARK, bottom: BORDER_DOUBLE, right: BORDER_THIN };

  rIdx++;

  // --- Compiled Note ---
  rIdx++;
  ws.mergeCells(rIdx, 1, rIdx, 4);
  const noteCell = ws.getCell(rIdx, 1);
  noteCell.value = 'compiled on the basis of information provided to us';
  noteCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF555555' } };
  noteCell.alignment = { horizontal: 'center', vertical: 'middle' };
  rIdx += 2;

  // --- Sign-off Block ---
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

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
