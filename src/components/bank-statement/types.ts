export interface BankStatementEntry {
  id: string;
  date: string;         // Standard display date e.g. "15-Apr-2024" or "YYYY-MM-DD"
  rawDate: string;      // Original date string from Excel
  narration: string;    // Description / Particulars / Remarks
  refNo?: string;       // Cheque / UTR / Reference No if present
  type: 'payment' | 'receipt';
  amount: number;       // Positive transaction amount
  balance?: number;     // Running balance if present in statement
  selectedLedgerId?: number;
  selectedLedgerName?: string;
}

export interface BankStatementState {
  companyId: number;
  bankLedgerId: number | null;
  bankLedgerName: string;
  bankAccountNo?: string;
  fileName: string;
  uploadDate: string;
  payments: BankStatementEntry[]; // Withdrawals (Debit entries)
  receipts: BankStatementEntry[]; // Deposits (Credit entries)
}
