import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

// Helper to clean and normalize text
function cleanText(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    // ExcelJS might return rich text or formula result
    if (val.text) return String(val.text).trim();
    if (val.result) return String(val.result).trim();
  }
  return String(val).trim();
}

// Helper to parse numbers safely
function parseAmount(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Math.abs(val);
  if (typeof val === 'object' && val.result !== undefined) {
    return parseAmount(val.result);
  }
  const str = cleanText(val)
    .replace(/[₹$,]/g, '')
    .replace(/\s+/g, '')
    .replace(/[()]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.abs(num);
}

// Convert Excel date or text to DD-MMM-YYYY standard format
function parseDate(val: any): { displayDate: string; rawDate: string } {
  if (!val) return { displayDate: '', rawDate: '' };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Handle JS Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    const d = val.getDate().toString().padStart(2, '0');
    const m = months[val.getMonth()];
    const y = val.getFullYear();
    return { displayDate: `${d}-${m}-${y}`, rawDate: val.toISOString().split('T')[0] };
  }

  // Handle Excel serial date number
  if (typeof val === 'number' && val > 30000 && val < 60000) {
    const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(jsDate.getTime())) {
      const d = jsDate.getDate().toString().padStart(2, '0');
      const m = months[jsDate.getMonth()];
      const y = jsDate.getFullYear();
      return { displayDate: `${d}-${m}-${y}`, rawDate: jsDate.toISOString().split('T')[0] };
    }
  }

  const rawStr = cleanText(val);
  if (!rawStr) return { displayDate: '', rawDate: '' };

  // Try parsing string formats like DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD-MMM-YYYY
  const parts = rawStr.replace(/[\.\/\s]+/g, '-').split('-');
  if (parts.length === 3) {
    const p1 = parts[0].trim();
    const p2 = parts[1].trim();
    const p3 = parts[2].trim();

    // YYYY-MM-DD
    if (p1.length === 4 && !isNaN(parseInt(p1))) {
      const year = parseInt(p1);
      const monthIdx = (parseInt(p2) || 1) - 1;
      const day = (parseInt(p3) || 1).toString().padStart(2, '0');
      const mName = months[Math.max(0, Math.min(11, monthIdx))];
      return { displayDate: `${day}-${mName}-${year}`, rawDate: `${year}-${(monthIdx + 1).toString().padStart(2, '0')}-${day}` };
    }

    // DD-MM-YYYY or DD-MMM-YYYY
    const day = (parseInt(p1) || 1).toString().padStart(2, '0');
    let monthIdx = -1;
    const p2Lower = p2.toLowerCase();
    const monthIndex = months.findIndex(m => m.toLowerCase() === p2Lower || p2Lower.startsWith(m.toLowerCase()));
    if (monthIndex !== -1) {
      monthIdx = monthIndex;
    } else {
      const mNum = parseInt(p2);
      if (!isNaN(mNum) && mNum >= 1 && mNum <= 12) {
        monthIdx = mNum - 1;
      }
    }
    if (monthIdx === -1) monthIdx = 0;

    let year = parseInt(p3) || new Date().getFullYear();
    if (year < 100) year += 2000;

    const mName = months[monthIdx];
    return { displayDate: `${day}-${mName}-${year}`, rawDate: `${year}-${(monthIdx + 1).toString().padStart(2, '0')}-${day}` };
  }

  // Fallback to Date.parse
  const parsed = new Date(rawStr);
  if (!isNaN(parsed.getTime())) {
    const d = parsed.getDate().toString().padStart(2, '0');
    const m = months[parsed.getMonth()];
    const y = parsed.getFullYear();
    return { displayDate: `${d}-${m}-${y}`, rawDate: parsed.toISOString().split('T')[0] };
  }

  return { displayDate: rawStr, rawDate: rawStr };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = new ExcelJS.Workbook();
    const fileName = file.name || 'statement.xlsx';
    const isCsv = fileName.toLowerCase().endsWith('.csv');

    if (isCsv) {
      const stream = require('stream');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(buffer);
      await workbook.csv.read(bufferStream);
    } else {
      await workbook.xlsx.load(buffer as any);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ success: false, error: 'Empty Excel sheet' }, { status: 400 });
    }

    // 1. Scan metadata (first 25 rows) for Account Number and Bank Name
    let detectedAccountNo = '';
    let detectedBankName = '';

    const bankKeywords = ['sbi', 'state bank', 'hdfc', 'icici', 'axis', 'punjab national', 'pnb', 'kotak', 'bank of baroda', 'bob', 'canara', 'indusind', 'union bank', 'yes bank', 'idfc'];

    for (let r = 1; r <= Math.min(25, worksheet.rowCount); r++) {
      const row = worksheet.getRow(r);
      const rowText = row.values ? (row.values as any[]).map(cleanText).join(' ') : '';
      const rowLower = rowText.toLowerCase();

      // Account number detection
      if (!detectedAccountNo) {
        const acMatch = rowText.match(/(?:a\/c|ac|account|acc)\s*(?:no|num|number)?[:.\s\-#]*([0-9]{8,20})/i)
          || rowText.match(/\b([0-9]{9,18})\b/);
        if (acMatch && acMatch[1]) {
          detectedAccountNo = acMatch[1];
        }
      }

      // Bank name detection
      if (!detectedBankName) {
        for (const bk of bankKeywords) {
          if (rowLower.includes(bk)) {
            detectedBankName = bk.toUpperCase();
            break;
          }
        }
      }
    }

    // 2. Identify Table Header Row
    let headerRowIdx = -1;
    let colDate = -1;
    let colNarration = -1;
    let colWithdrawal = -1;
    let colDeposit = -1;
    let colRefNo = -1;
    let colBalance = -1;
    let colAmountSingle = -1;
    let colDrCrSingle = -1;

    // Header keywords
    const dateKws = ['date', 'txn date', 'transaction date', 'value date', 'val date', 'post date', 'posting date', 'trx date'];
    const narrKws = ['narration', 'description', 'particulars', 'transaction details', 'remarks', 'transaction remarks', 'details', 'memo', 'description / narration', 'transaction description', 'trans details'];
    const withdrawKws = [
      'withdrawal amt.', 'dr.amount', 'dr. amt.', 'dr amt', 'paid', 'dr', 'debit', 'withdrawal', 'withdrawals', 
      'debit amount', 'dr.', 'withdrawal amount (inr)', 'withdrawal amount', 'paid amount', 'debit (inr)', 
      'withdrawal (dr)', 'debit amt', 'debit amt.'
    ];
    const depositKws = [
      'deposit amt.', 'cr.amount', 'cr amt.reciev', 'cr amt', 'credit', 'deposit', 'deposits', 
      'credit amount', 'cr.', 'deposit amount (inr)', 'deposit amount', 'received', 'cr amount', 
      'deposit (cr)', 'credit (inr)', 'credit amt', 'credit amt.'
    ];
    const refKws = ['chq', 'cheque', 'ref no', 'reference', 'utr', 'chq./ref.no.', 'cheque / ref. no.', 'ref/cheque no', 'transaction id'];
    const balKws = ['balance', 'closing balance', 'bal'];

    for (let r = 1; r <= Math.min(30, worksheet.rowCount); r++) {
      const row = worksheet.getRow(r);
      const cells: { col: number; text: string; lower: string }[] = [];
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const text = cleanText(cell.value);
        cells.push({ col: colNumber, text, lower: text.toLowerCase() });
      });

      let foundDate = -1;
      let foundNarr = -1;
      let foundWithdraw = -1;
      let foundDeposit = -1;
      let foundRef = -1;
      let foundBal = -1;
      let foundSingleAmt = -1;
      let foundDrCr = -1;

      for (const c of cells) {
        const l = c.lower;
        if (foundDate === -1 && dateKws.some(k => l === k || l.startsWith(k))) {
          foundDate = c.col;
        } else if (foundNarr === -1 && narrKws.some(k => l === k || l.includes(k))) {
          foundNarr = c.col;
        } else if (foundWithdraw === -1 && withdrawKws.some(k => l === k || l.includes(k))) {
          foundWithdraw = c.col;
        } else if (foundDeposit === -1 && depositKws.some(k => l === k || l.includes(k))) {
          foundDeposit = c.col;
        } else if (foundRef === -1 && refKws.some(k => l === k || l.includes(k))) {
          foundRef = c.col;
        } else if (foundBal === -1 && balKws.some(k => l === k || l.includes(k))) {
          foundBal = c.col;
        } else if (foundSingleAmt === -1 && (l === 'amount' || l === 'amount (inr)' || l === 'txn amount')) {
          foundSingleAmt = c.col;
        } else if (foundDrCr === -1 && (l === 'cr/dr' || l === 'dr/cr' || l === 'type' || l === 'txn type')) {
          foundDrCr = c.col;
        }
      }

      // Valid header row must at least have Date AND (Narration OR Amount/Withdrawal)
      if (foundDate !== -1 && (foundNarr !== -1 || foundWithdraw !== -1 || foundDeposit !== -1 || foundSingleAmt !== -1)) {
        headerRowIdx = r;
        colDate = foundDate;
        colNarration = foundNarr;
        colWithdrawal = foundWithdraw;
        colDeposit = foundDeposit;
        colRefNo = foundRef;
        colBalance = foundBal;
        colAmountSingle = foundSingleAmt;
        colDrCrSingle = foundDrCr;
        break;
      }
    }

    if (headerRowIdx === -1 || colDate === -1) {
      return NextResponse.json({
        success: false,
        error: "Could not identify bank statement header columns (Date, Particulars/Narration, Withdrawal/Deposit). Please verify the Excel sheet format."
      }, { status: 400 });
    }

    // 3. Parse Data Rows
    const payments: any[] = [];
    const receipts: any[] = [];

    let entryIndex = 1;

    for (let r = headerRowIdx + 1; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const dateCell = row.getCell(colDate).value;
      if (!dateCell) continue;

      const { displayDate, rawDate } = parseDate(dateCell);
      if (!displayDate) continue;

      // Extract Narration / Particulars
      let narration = colNarration !== -1 ? cleanText(row.getCell(colNarration).value) : '';
      
      // Skip summary / opening / closing rows
      const lowerNarr = narration.toLowerCase();
      if (
        lowerNarr.includes('opening balance') || 
        lowerNarr.includes('brought forward') || 
        lowerNarr.includes('b/f') || 
        lowerNarr.includes('total') || 
        lowerNarr.includes('closing balance')
      ) {
        continue;
      }

      const refNo = colRefNo !== -1 ? cleanText(row.getCell(colRefNo).value) : '';
      const balance = colBalance !== -1 ? parseAmount(row.getCell(colBalance).value) : undefined;

      let withdrawAmt = 0;
      let depositAmt = 0;

      if (colWithdrawal !== -1 && colDeposit !== -1) {
        withdrawAmt = parseAmount(row.getCell(colWithdrawal).value);
        depositAmt = parseAmount(row.getCell(colDeposit).value);
      } else if (colAmountSingle !== -1) {
        const amt = parseAmount(row.getCell(colAmountSingle).value);
        const typeStr = colDrCrSingle !== -1 ? cleanText(row.getCell(colDrCrSingle).value).toLowerCase() : '';
        if (typeStr.includes('dr') || typeStr.includes('debit')) {
          withdrawAmt = amt;
        } else if (typeStr.includes('cr') || typeStr.includes('credit')) {
          depositAmt = amt;
        } else {
          // If no separate type column, check if raw cell had negative sign
          const rawCellStr = cleanText(row.getCell(colAmountSingle).value);
          if (rawCellStr.includes('-') || rawCellStr.includes('Dr')) {
            withdrawAmt = amt;
          } else {
            depositAmt = amt;
          }
        }
      } else if (colWithdrawal !== -1) {
        withdrawAmt = parseAmount(row.getCell(colWithdrawal).value);
      } else if (colDeposit !== -1) {
        depositAmt = parseAmount(row.getCell(colDeposit).value);
      }

      // If narration was empty, use refNo or fallback
      if (!narration) {
        narration = refNo ? `Bank Transaction Ref: ${refNo}` : `Bank Transaction`;
      }

      // Categorize into Payments (Withdrawal) or Receipts (Deposit)
      if (withdrawAmt > 0) {
        payments.push({
          id: `bs-pay-${entryIndex++}`,
          date: displayDate,
          rawDate: rawDate,
          narration: narration,
          refNo: refNo,
          type: 'payment',
          amount: withdrawAmt,
          balance: balance
        });
      }

      if (depositAmt > 0) {
        receipts.push({
          id: `bs-rec-${entryIndex++}`,
          date: displayDate,
          rawDate: rawDate,
          narration: narration,
          refNo: refNo,
          type: 'receipt',
          amount: depositAmt,
          balance: balance
        });
      }
    }

    return NextResponse.json({
      success: true,
      fileName,
      detectedAccountNo,
      detectedBankName,
      totalCount: payments.length + receipts.length,
      payments,
      receipts
    });

  } catch (err: any) {
    console.error('Bank Statement Parse Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to parse bank statement'
    }, { status: 500 });
  }
}
