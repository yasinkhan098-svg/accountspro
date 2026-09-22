import React, { useState, useEffect, useRef } from 'react';
import { BankStatementEntry, BankStatementState } from './types';
import { getBankStatementState, saveBankStatementState, removeBankStatementEntry } from './bankStatementStorage';

interface Props {
  companyId: number;
  ledgers: any[];
  vouchers: any[];
  onSaveVoucher: (voucherData: any) => Promise<any>;
  onBack: () => void;
  onOpenUpload: () => void;
}

export default function BankStatementEntryView({
  companyId,
  ledgers,
  vouchers,
  onSaveVoucher,
  onBack,
  onOpenUpload
}: Props) {
  const [statementState, setStatementState] = useState<BankStatementState | null>(null);
  const [activeSide, setActiveSide] = useState<'payment' | 'receipt'>('payment');
  
  // Ledger search & autocomplete state
  const [activeEntry, setActiveEntry] = useState<BankStatementEntry | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [dropdownOpenForId, setDropdownOpenForId] = useState<string | null>(null);
  const [highlightedLedgerIdx, setHighlightedLedgerIdx] = useState<number>(0);

  // Confirmation modal state
  const [pendingConfirm, setPendingConfirm] = useState<{
    entry: BankStatementEntry;
    ledger: any;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Refs for input elements to enable keyboard navigation
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Load statement state on mount or companyId change
  useEffect(() => {
    const loaded = getBankStatementState(companyId);
    setStatementState(loaded);
  }, [companyId]);

  // Toast auto-hide
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  // Global key listener for Esc to close or confirm modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (pendingConfirm) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleConfirmSave();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setPendingConfirm(null);
        }
      } else if (dropdownOpenForId) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setDropdownOpenForId(null);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingConfirm, dropdownOpenForId, onBack]);

  // Filter ledgers for search dropdown (exclude the bank ledger itself)
  const filteredLedgers = React.useMemo(() => {
    const bankId = statementState?.bankLedgerId;
    const query = ledgerSearch.toLowerCase().trim();
    return ledgers.filter(l => {
      if (bankId && l.id === bankId) return false;
      if (!query) return true;
      return l.name.toLowerCase().includes(query) || (l.groupName && l.groupName.toLowerCase().includes(query));
    });
  }, [ledgers, statementState?.bankLedgerId, ledgerSearch]);

  // Focus helper
  const focusInput = (id: string) => {
    setTimeout(() => {
      const el = inputRefs.current[id];
      if (el) {
        el.focus();
        el.select();
      }
    }, 50);
  };

  // Keyboard navigation between rows
  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    entry: BankStatementEntry,
    list: BankStatementEntry[],
    index: number
  ) => {
    // If dropdown is open, handle up/down/enter for selecting from dropdown
    if (dropdownOpenForId === entry.id && filteredLedgers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedLedgerIdx(prev => (prev + 1) % filteredLedgers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedLedgerIdx(prev => (prev - 1 + filteredLedgers.length) % filteredLedgers.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredLedgers[highlightedLedgerIdx];
        if (selected) {
          handleSelectLedger(entry, selected);
        }
        return;
      }
    }

    // If dropdown is NOT open, or input is empty:
    // Enter on empty box -> move to next row
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index < list.length - 1) {
        focusInput(list[index + 1].id);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (index < list.length - 1) {
        focusInput(list[index + 1].id);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index > 0) {
        focusInput(list[index - 1].id);
      }
    }
  };

  // When a ledger is picked from dropdown
  const handleSelectLedger = (entry: BankStatementEntry, ledger: any) => {
    setDropdownOpenForId(null);
    setPendingConfirm({
      entry,
      ledger
    });
  };

  // Save the confirmed voucher in the background
  const handleConfirmSave = async () => {
    if (!pendingConfirm || !statementState) return;

    const { entry, ledger } = pendingConfirm;
    const isPayment = entry.type === 'payment';
    const bankLedgerId = statementState.bankLedgerId;
    const bankLedgerName = statementState.bankLedgerName || 'Bank A/c';

    setIsSaving(true);

    try {
      // Build standard voucher data
      // Payment: Dr = Party/Expense, Cr = Bank
      // Receipt: Dr = Bank, Cr = Party/Income
      const voucherData = {
        companyId,
        type: isPayment ? 'Payment' : 'Receipt',
        date: entry.rawDate || entry.date,
        voucherNo: `${isPayment ? 'PMT' : 'RCT'}-${Date.now().toString().slice(-6)}`,
        narration: entry.narration,
        partyName: ledger.name,
        partyId: ledger.id,
        entries: isPayment ? [
          {
            id: 1,
            ledgerId: ledger.id,
            ledgerName: ledger.name,
            amount: entry.amount,
            entryType: 'Dr'
          },
          {
            id: 2,
            ledgerId: bankLedgerId,
            ledgerName: bankLedgerName,
            amount: entry.amount,
            entryType: 'Cr'
          }
        ] : [
          {
            id: 1,
            ledgerId: bankLedgerId,
            ledgerName: bankLedgerName,
            amount: entry.amount,
            entryType: 'Dr'
          },
          {
            id: 2,
            ledgerId: ledger.id,
            ledgerName: ledger.name,
            amount: entry.amount,
            entryType: 'Cr'
          }
        ]
      };

      await onSaveVoucher(voucherData);

      // Remove only this entry from state and localStorage
      const updatedState = removeBankStatementEntry(companyId, entry.id, entry.type);
      setStatementState(updatedState ? { ...updatedState } : null);

      setToastMsg(`✓ ${isPayment ? 'Payment' : 'Receipt'} Voucher saved for ₹${entry.amount.toLocaleString('en-IN')}!`);

      // Find next entry to focus
      const currentList = isPayment ? statementState.payments : statementState.receipts;
      const currentIndex = currentList.findIndex(e => e.id === entry.id);
      let nextEntryId: string | null = null;
      if (currentIndex !== -1 && currentIndex < currentList.length - 1) {
        nextEntryId = currentList[currentIndex + 1].id;
      } else if (currentList.length > 1) {
        nextEntryId = currentList[0].id === entry.id ? currentList[1]?.id : currentList[0]?.id;
      }

      setPendingConfirm(null);
      setLedgerSearch('');

      if (nextEntryId) {
        focusInput(nextEntryId);
      }

    } catch (err: any) {
      console.error('Failed to auto-save voucher:', err);
      alert('Error saving voucher: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // If no statement is loaded yet
  if (!statementState || (statementState.payments.length === 0 && statementState.receipts.length === 0)) {
    return (
      <div style={{
        height: 'calc(100vh - 40px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        fontFamily: 'Segoe UI, Tahoma, sans-serif'
      }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '40px 48px',
          textAlign: 'center',
          maxWidth: 480,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🏦</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
            No Active Bank Statement
          </h2>
          <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5, marginBottom: 24 }}>
            Please upload a bank statement Excel or CSV file to start auto-categorizing and saving Payment and Receipt vouchers.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={onOpenUpload}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              📤 Upload Bank Statement
            </button>
            <button
              onClick={onBack}
              style={{
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              Back to Gateway (Esc)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const payments = statementState.payments || [];
  const receipts = statementState.receipts || [];

  return (
    <div style={{
      height: 'calc(100vh - 40px)',
      display: 'flex',
      flexDirection: 'column',
      background: '#f1f5f9',
      fontFamily: 'Segoe UI, Tahoma, sans-serif',
      userSelect: 'none'
    }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: 50,
          right: 30,
          background: '#15803d',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: 6,
          fontWeight: 600,
          fontSize: 13,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          {toastMsg}
        </div>
      )}

      {/* Top Header Bar */}
      <div style={{
        background: '#0f172a',
        color: '#ffffff',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '2px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🏦</span>
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>Bank Statement Entry</span>
          </div>
          <div style={{
            background: '#1e293b',
            border: '1px solid #475569',
            borderRadius: 4,
            padding: '3px 10px',
            fontSize: 12,
            color: '#38bdf8'
          }}>
            Bank: <strong>{statementState.bankLedgerName}</strong>
            {statementState.bankAccountNo && <span> | A/c: {statementState.bankAccountNo}</span>}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            File: {statementState.fileName}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 12, display: 'flex', gap: 10 }}>
            <span style={{ background: '#7f1d1d', color: '#fecaca', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>
              Payments Pending: {payments.length}
            </span>
            <span style={{ background: '#14532d', color: '#bbf7d0', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>
              Receipts Pending: {receipts.length}
            </span>
          </div>

          <button
            onClick={onOpenUpload}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 4,
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            📤 Upload New
          </button>

          <button
            onClick={onBack}
            style={{
              background: '#334155',
              color: '#ffffff',
              border: 'none',
              borderRadius: 4,
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Esc: Back
          </button>
        </div>
      </div>

      {/* Main Split-Screen Container */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* ================= LEFT COLUMN: PAYMENTS (WITHDRAWALS) ================= */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '2px solid #cbd5e1',
          background: '#ffffff'
        }}>
          {/* Section Header */}
          <div style={{
            background: '#991b1b',
            color: '#ffffff',
            padding: '8px 16px',
            fontWeight: 'bold',
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>💸 PAYMENTS (Withdrawals / Dr entries)</span>
            <span style={{ fontSize: 11, background: '#7f1d1d', padding: '2px 8px', borderRadius: 4 }}>
              {payments.length} items
            </span>
          </div>

          {/* Table Headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '90px 1.4fr 1.6fr 100px',
            background: '#fee2e2',
            color: '#991b1b',
            fontSize: 11,
            fontWeight: 700,
            padding: '8px 12px',
            borderBottom: '1px solid #fca5a5'
          }}>
            <div>DATE</div>
            <div>PARTICULARS / NARRATION</div>
            <div>LEDGER SELECTION</div>
            <div style={{ textAlign: 'right' }}>WITHDRAWAL AMT</div>
          </div>

          {/* List of Payments */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {payments.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                ✓ All payment entries completed!
              </div>
            ) : (
              payments.map((entry, idx) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1.4fr 1.6fr 100px',
                    alignItems: 'center',
                    padding: '6px 12px',
                    fontSize: 12,
                    borderBottom: '1px solid #f1f5f9',
                    background: idx % 2 === 0 ? '#ffffff' : '#fff5f5',
                    position: 'relative'
                  }}
                >
                  {/* Date: Clean Text */}
                  <div style={{ color: '#334155', fontWeight: 500 }}>
                    {entry.date}
                  </div>

                  {/* Narration: Clean Text */}
                  <div
                    title={entry.narration}
                    style={{
                      color: '#475569',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      paddingRight: 10
                    }}
                  >
                    {entry.narration}
                  </div>

                  {/* Ledger Selection Box: The ONLY visible input box */}
                  <div style={{ position: 'relative', paddingRight: 10 }}>
                    <input
                      ref={el => { inputRefs.current[entry.id] = el; }}
                      type="text"
                      placeholder="Select Ledger (Type to search)..."
                      value={dropdownOpenForId === entry.id ? ledgerSearch : (entry.selectedLedgerName || '')}
                      onFocus={() => {
                        setActiveSide('payment');
                        setDropdownOpenForId(entry.id);
                        setLedgerSearch(entry.selectedLedgerName || '');
                        setHighlightedLedgerIdx(0);
                      }}
                      onChange={(e) => {
                        setLedgerSearch(e.target.value);
                        setHighlightedLedgerIdx(0);
                      }}
                      onKeyDown={(e) => handleInputKeyDown(e, entry, payments, idx)}
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: 12,
                        borderRadius: 4,
                        border: '1.5px solid #0284c7',
                        background: '#ffffff',
                        outline: 'none',
                        boxShadow: dropdownOpenForId === entry.id ? '0 0 0 2px rgba(2, 132, 199, 0.3)' : 'none'
                      }}
                    />

                    {/* Autocomplete Dropdown */}
                    {dropdownOpenForId === entry.id && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 10,
                        maxHeight: 220,
                        overflowY: 'auto',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        zIndex: 9999,
                        marginTop: 2
                      }}>
                        {filteredLedgers.length === 0 ? (
                          <div style={{ padding: '8px 12px', color: '#94a3b8', fontSize: 11 }}>
                            No ledger found matching &quot;{ledgerSearch}&quot;
                          </div>
                        ) : (
                          filteredLedgers.map((l, lIdx) => (
                            <div
                              key={l.id}
                              onMouseDown={(e) => {
                                e.preventDefault(); // prevent blur
                                handleSelectLedger(entry, l);
                              }}
                              onMouseEnter={() => setHighlightedLedgerIdx(lIdx)}
                              style={{
                                padding: '6px 10px',
                                fontSize: 12,
                                cursor: 'pointer',
                                background: highlightedLedgerIdx === lIdx ? '#0284c7' : '#ffffff',
                                color: highlightedLedgerIdx === lIdx ? '#ffffff' : '#1e293b',
                                display: 'flex',
                                justifyContent: 'space-between'
                              }}
                            >
                              <span style={{ fontWeight: 500 }}>{l.name}</span>
                              <span style={{ fontSize: 10, opacity: 0.8 }}>{l.groupName}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Amount: Clean Text (Red Accent) */}
                  <div style={{
                    textAlign: 'right',
                    fontWeight: 'bold',
                    color: '#dc2626',
                    fontSize: 12
                  }}>
                    ₹{entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: RECEIPTS (DEPOSITS) ================= */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff'
        }}>
          {/* Section Header */}
          <div style={{
            background: '#15803d',
            color: '#ffffff',
            padding: '8px 16px',
            fontWeight: 'bold',
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>💰 RECEIPTS (Deposits / Cr entries)</span>
            <span style={{ fontSize: 11, background: '#166534', padding: '2px 8px', borderRadius: 4 }}>
              {receipts.length} items
            </span>
          </div>

          {/* Table Headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '90px 1.4fr 1.6fr 100px',
            background: '#dcfce7',
            color: '#15803d',
            fontSize: 11,
            fontWeight: 700,
            padding: '8px 12px',
            borderBottom: '1px solid #86efac'
          }}>
            <div>DATE</div>
            <div>PARTICULARS / NARRATION</div>
            <div>LEDGER SELECTION</div>
            <div style={{ textAlign: 'right' }}>DEPOSIT AMT</div>
          </div>

          {/* List of Receipts */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {receipts.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                ✓ All receipt entries completed!
              </div>
            ) : (
              receipts.map((entry, idx) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1.4fr 1.6fr 100px',
                    alignItems: 'center',
                    padding: '6px 12px',
                    fontSize: 12,
                    borderBottom: '1px solid #f1f5f9',
                    background: idx % 2 === 0 ? '#ffffff' : '#f0fdf4',
                    position: 'relative'
                  }}
                >
                  {/* Date: Clean Text */}
                  <div style={{ color: '#334155', fontWeight: 500 }}>
                    {entry.date}
                  </div>

                  {/* Narration: Clean Text */}
                  <div
                    title={entry.narration}
                    style={{
                      color: '#475569',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      paddingRight: 10
                    }}
                  >
                    {entry.narration}
                  </div>

                  {/* Ledger Selection Box: The ONLY visible input box */}
                  <div style={{ position: 'relative', paddingRight: 10 }}>
                    <input
                      ref={el => { inputRefs.current[entry.id] = el; }}
                      type="text"
                      placeholder="Select Ledger (Type to search)..."
                      value={dropdownOpenForId === entry.id ? ledgerSearch : (entry.selectedLedgerName || '')}
                      onFocus={() => {
                        setActiveSide('receipt');
                        setDropdownOpenForId(entry.id);
                        setLedgerSearch(entry.selectedLedgerName || '');
                        setHighlightedLedgerIdx(0);
                      }}
                      onChange={(e) => {
                        setLedgerSearch(e.target.value);
                        setHighlightedLedgerIdx(0);
                      }}
                      onKeyDown={(e) => handleInputKeyDown(e, entry, receipts, idx)}
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: 12,
                        borderRadius: 4,
                        border: '1.5px solid #16a34a',
                        background: '#ffffff',
                        outline: 'none',
                        boxShadow: dropdownOpenForId === entry.id ? '0 0 0 2px rgba(22, 163, 74, 0.3)' : 'none'
                      }}
                    />

                    {/* Autocomplete Dropdown */}
                    {dropdownOpenForId === entry.id && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 10,
                        maxHeight: 220,
                        overflowY: 'auto',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        zIndex: 9999,
                        marginTop: 2
                      }}>
                        {filteredLedgers.length === 0 ? (
                          <div style={{ padding: '8px 12px', color: '#94a3b8', fontSize: 11 }}>
                            No ledger found matching &quot;{ledgerSearch}&quot;
                          </div>
                        ) : (
                          filteredLedgers.map((l, lIdx) => (
                            <div
                              key={l.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectLedger(entry, l);
                              }}
                              onMouseEnter={() => setHighlightedLedgerIdx(lIdx)}
                              style={{
                                padding: '6px 10px',
                                fontSize: 12,
                                cursor: 'pointer',
                                background: highlightedLedgerIdx === lIdx ? '#16a34a' : '#ffffff',
                                color: highlightedLedgerIdx === lIdx ? '#ffffff' : '#1e293b',
                                display: 'flex',
                                justifyContent: 'space-between'
                              }}
                            >
                              <span style={{ fontWeight: 500 }}>{l.name}</span>
                              <span style={{ fontSize: 10, opacity: 0.8 }}>{l.groupName}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Amount: Clean Text (Green Accent) */}
                  <div style={{
                    textAlign: 'right',
                    fontWeight: 'bold',
                    color: '#16a34a',
                    fontSize: 12
                  }}>
                    ₹{entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ================= CONFIRMATION MODAL ================= */}
      {pendingConfirm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 8,
            width: 480,
            maxWidth: '90vw',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            border: '2px solid #334155'
          }}>
            {/* Header */}
            <div style={{
              background: pendingConfirm.entry.type === 'payment' ? '#991b1b' : '#15803d',
              color: '#ffffff',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontWeight: 'bold', fontSize: 15 }}>
                {pendingConfirm.entry.type === 'payment' ? '💸 Save Payment Voucher?' : '💰 Save Receipt Voucher?'}
              </span>
              <span style={{ fontSize: 12, opacity: 0.8 }}>Press Enter for Yes / Esc for No</span>
            </div>

            {/* Body */}
            <div style={{ padding: 20 }}>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                padding: 14,
                marginBottom: 16,
                fontSize: 13
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>Date:</span>
                  <strong style={{ color: '#0f172a' }}>{pendingConfirm.entry.date}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>Bank A/c:</span>
                  <strong style={{ color: '#0f172a' }}>{statementState.bankLedgerName}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>Selected Ledger:</span>
                  <strong style={{ color: '#0284c7', fontSize: 14 }}>{pendingConfirm.ledger.name}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>Amount:</span>
                  <strong style={{
                    color: pendingConfirm.entry.type === 'payment' ? '#dc2626' : '#16a34a',
                    fontSize: 15
                  }}>
                    ₹{pendingConfirm.entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>

                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 2 }}>Narration:</span>
                  <div style={{ color: '#334155', fontSize: 12, fontStyle: 'italic' }}>
                    {pendingConfirm.entry.narration}
                  </div>
                </div>
              </div>

              {/* Yes / No Buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleConfirmSave}
                  disabled={isSaving}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 'bold',
                    fontSize: 14,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  {isSaving ? '⏳ Saving...' : 'Yes, Save (Enter)'}
                </button>

                <button
                  onClick={() => setPendingConfirm(null)}
                  disabled={isSaving}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: isSaving ? 'not-allowed' : 'pointer'
                  }}
                >
                  No, Cancel (Esc)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
