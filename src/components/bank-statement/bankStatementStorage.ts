import { BankStatementState, BankStatementEntry } from './types';

const STORAGE_KEY_PREFIX = 'tally_bank_statement_state_';

export function getBankStatementState(companyId: number): BankStatementState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${companyId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load bank statement state from localStorage', e);
    return null;
  }
}

export function saveBankStatementState(state: BankStatementState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${state.companyId}`, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save bank statement state to localStorage', e);
  }
}

export function clearBankStatementState(companyId: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${companyId}`);
  } catch (e) {
    console.error('Failed to clear bank statement state from localStorage', e);
  }
}

export function removeBankStatementEntry(
  companyId: number, 
  entryId: string, 
  type: 'payment' | 'receipt'
): BankStatementState | null {
  const current = getBankStatementState(companyId);
  if (!current) return null;

  if (type === 'payment') {
    current.payments = current.payments.filter(p => p.id !== entryId);
  } else {
    current.receipts = current.receipts.filter(r => r.id !== entryId);
  }

  saveBankStatementState(current);
  return current;
}
