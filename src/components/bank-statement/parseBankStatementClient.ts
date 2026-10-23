import * as XLSX from 'xlsx';

// Helper to clean and normalize text
function cleanText(val: any): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    return val.toISOString();
  }
  return String(val).trim();
}

// Helper to parse numbers safely
function parseAmount(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Math.abs(val);
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

export async function parseBankStatementClient(file: File): Promise<{
  success: boolean;
  fileName: string;
  detectedAccountNo: string;
  detectedBankName: string;
  totalCount: number;
  payments: any[];
  receipts: any[];
  error?: string;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const fileName = file.name || 'statement.xlsx';

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, raw: false });
    } catch {
      try {
        const text = new TextDecoder('utf-8').decode(arrayBuffer);
        workbook = XLSX.read(text, { type: 'string', cellDates: true });
      } catch {
        throw new Error("Unable to read this file format. Please ensure it is a valid Excel or CSV statement.");
      }
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('Empty Excel sheet');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!rows || rows.length === 0) {
      throw new Error('No data found in statement');
    }

    // 1. Scan metadata (first 25 rows) for Account Number and Bank Name
    let detectedAccountNo = '';
    let detectedBankName = '';

    const bankKeywords = [
      'sbi', 'state bank', 'hdfc', 'icici', 'axis', 'punjab national', 'pnb',
      'kotak', 'bank of baroda', 'bob', 'canara', 'indusind', 'union bank', 'yes bank', 'idfc'
    ];

    for (let r = 0; r < Math.min(25, rows.length); r++) {
      const row = rows[r];
      const rowText = Array.isArray(row) ? row.map(cleanText).join(' ') : '';
      const rowLower = rowText.toLowerCase();

      if (!detectedAccountNo) {
        const acMatch = rowText.match(/(?:a\/c|ac|account|acc)\s*(?:no|num|number)?[:.\s\-#]*([0-9]{8,20})/i)
          || rowText.match(/\b([0-9]{9,18})\b/);
        if (acMatch && acMatch[1]) {
          detectedAccountNo = acMatch[1];
        }
      }

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

    for (let r = 0; r < Math.min(30, rows.length); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      let foundDate = -1;
      let foundNarr = -1;
      let foundWithdraw = -1;
      let foundDeposit = -1;
      let foundRef = -1;
      let foundBal = -1;
      let foundSingleAmt = -1;
      let foundDrCr = -1;

      for (let c = 0; c < row.length; c++) {
        const text = cleanText(row[c]);
        const l = text.toLowerCase();
        if (!l) continue;

        if (foundDate === -1 && dateKws.some(k => l === k || l.startsWith(k))) {
          foundDate = c;
        } else if (foundNarr === -1 && narrKws.some(k => l === k || l.includes(k))) {
          foundNarr = c;
        } else if (foundWithdraw === -1 && withdrawKws.some(k => l === k || l.includes(k))) {
          foundWithdraw = c;
        } else if (foundDeposit === -1 && depositKws.some(k => l === k || l.includes(k))) {
          foundDeposit = c;
        } else if (foundRef === -1 && refKws.some(k => l === k || l.includes(k))) {
          foundRef = c;
        } else if (foundBal === -1 && balKws.some(k => l === k || l.includes(k))) {
          foundBal = c;
        } else if (foundSingleAmt === -1 && (l === 'amount' || l === 'amount (inr)' || l === 'txn amount')) {
          foundSingleAmt = c;
        } else if (foundDrCr === -1 && (l === 'cr/dr' || l === 'dr/cr' || l === 'type' || l === 'txn type')) {
          foundDrCr = c;
        }
      }

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
      throw new Error("Could not identify bank statement header columns (Date, Particulars/Narration, Withdrawal/Deposit). Please verify the Excel sheet format.");
    }

    // 3. Parse Data Rows
    const payments: any[] = [];
    const receipts: any[] = [];
    let entryIndex = 1;

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      const dateCell = row[colDate];
      if (!dateCell) continue;

      const { displayDate, rawDate } = parseDate(dateCell);
      if (!displayDate) continue;

      let narration = colNarration !== -1 ? cleanText(row[colNarration]) : '';
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

      const refNo = colRefNo !== -1 ? cleanText(row[colRefNo]) : '';
      const balance = colBalance !== -1 ? parseAmount(row[colBalance]) : undefined;

      let withdrawAmt = 0;
      let depositAmt = 0;

      if (colWithdrawal !== -1 && colDeposit !== -1) {
        withdrawAmt = parseAmount(row[colWithdrawal]);
        depositAmt = parseAmount(row[colDeposit]);
      } else if (colAmountSingle !== -1) {
        const amt = parseAmount(row[colAmountSingle]);
        const typeStr = colDrCrSingle !== -1 ? cleanText(row[colDrCrSingle]).toLowerCase() : '';
        if (typeStr.includes('dr') || typeStr.includes('debit')) {
          withdrawAmt = amt;
        } else if (typeStr.includes('cr') || typeStr.includes('credit')) {
          depositAmt = amt;
        } else {
          const rawCellStr = cleanText(row[colAmountSingle]);
          if (rawCellStr.includes('-') || rawCellStr.includes('Dr')) {
            withdrawAmt = amt;
          } else {
            depositAmt = amt;
          }
        }
      } else if (colWithdrawal !== -1) {
        withdrawAmt = parseAmount(row[colWithdrawal]);
      } else if (colDeposit !== -1) {
        depositAmt = parseAmount(row[colDeposit]);
      }

      if (!narration) {
        narration = refNo ? `Bank Transaction Ref: ${refNo}` : `Bank Transaction`;
      }

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

    return {
      success: true,
      fileName,
      detectedAccountNo,
      detectedBankName,
      totalCount: payments.length + receipts.length,
      payments,
      receipts
    };
  } catch (err: any) {
    return {
      success: false,
      fileName: file.name || 'statement.xlsx',
      detectedAccountNo: '',
      detectedBankName: '',
      totalCount: 0,
      payments: [],
      receipts: [],
      error: err.message || 'Failed to parse bank statement'
    };
  }
}
