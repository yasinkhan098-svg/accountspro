import React, { useState, useRef } from 'react';
import { BankStatementState } from './types';
import { saveBankStatementState } from './bankStatementStorage';

interface Props {
  companyId: number;
  ledgers: any[];
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (state: BankStatementState) => void;
}

export default function BankStatementUploadModal({
  companyId,
  ledgers,
  isOpen,
  onClose,
  onUploadSuccess
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBankLedgerId, setSelectedBankLedgerId] = useState<number | null>(null);
  const [detectedAccountNo, setDetectedAccountNo] = useState<string>('');
  const [detectedBankName, setDetectedBankName] = useState<string>('');
  const [parsedData, setParsedData] = useState<{ payments: any[]; receipts: any[]; fileName: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Filter bank ledgers
  const bankLedgers = ledgers.filter(l => {
    const gn = (l.groupName || '').toLowerCase();
    return gn.includes('bank account') || gn.includes('bank od') || gn.includes('bank occ');
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setParsedData(null);
    }
  };

  const handleParse = async () => {
    if (!file) {
      setError('Please select an Excel or CSV bank statement file.');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/bank-statement/parse', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to parse bank statement');
      }

      setDetectedAccountNo(data.detectedAccountNo || '');
      setDetectedBankName(data.detectedBankName || '');
      setParsedData({
        payments: data.payments,
        receipts: data.receipts,
        fileName: data.fileName
      });

      // Auto-match Bank Ledger
      let matched = bankLedgers.find(bl => {
        if (data.detectedAccountNo && bl.accountNo) {
          const cleanBl = String(bl.accountNo).replace(/[\s\-]/g, '').toLowerCase();
          const cleanDet = String(data.detectedAccountNo).replace(/[\s\-]/g, '').toLowerCase();
          if (cleanBl === cleanDet || cleanBl.includes(cleanDet) || cleanDet.includes(cleanBl)) return true;
        }
        if (data.detectedBankName && bl.name.toLowerCase().includes(data.detectedBankName.toLowerCase())) {
          return true;
        }
        return false;
      });

      if (matched) {
        setSelectedBankLedgerId(matched.id);
        setError(null);
      } else {
        setSelectedBankLedgerId(null);
        if (data.detectedAccountNo) {
          setError(`⚠️ Statement me Account No. "${data.detectedAccountNo}" paya gaya hai, lekin is Account Number ka koi Bank Ledger Company me nahi mila! Jab tak is Account Number ka Bank Ledger Company Masters me create nahi hota, tab tak iski entry nahi ho sakti. Kripya pehle Company Masters me jaakar is Account No. ka Bank Ledger banayein.`);
        } else {
          setError(`⚠️ Statement ka koi matching Bank Ledger Company me nahi mila! Kripya pehle Bank Ledger banayein ya neeche dropdown se sahi Bank Ledger select karein.`);
        }
      }

    } catch (err: any) {
      setError(err.message || 'Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProceed = () => {
    if (!parsedData) {
      setError('Please upload and parse a statement first.');
      return;
    }

    if (!selectedBankLedgerId) {
      setError('Kripya pehle Company Masters me jaakar is Account Number ka Bank Ledger banayein ya sahi Bank select karein.');
      return;
    }

    const bankLedger = bankLedgers.find(bl => bl.id === selectedBankLedgerId);
    if (!bankLedger) {
      setError('Kripya pehle Company Masters me jaakar is Account Number ka Bank Ledger banayein ya sahi Bank select karein.');
      return;
    }

    const state: BankStatementState = {
      companyId,
      bankLedgerId: bankLedger.id,
      bankLedgerName: bankLedger.name,
      bankAccountNo: bankLedger.accountNo || detectedAccountNo,
      fileName: parsedData.fileName,
      uploadDate: new Date().toISOString(),
      payments: parsedData.payments,
      receipts: parsedData.receipts
    };

    saveBankStatementState(state);
    onUploadSuccess(state);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      backdropFilter: 'blur(2px)'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 8,
        width: 580,
        maxWidth: '95vw',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        border: '1px solid #cbd5e1'
      }}>
        {/* Header */}
        <div style={{
          background: '#1e293b',
          color: '#ffffff',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🏦</span>
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>Bank Statement Upload</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: 18,
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #f87171',
              color: '#991b1b',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 13,
              marginBottom: 16
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* File selector box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #94a3b8',
              borderRadius: 8,
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: file ? '#f8fafc' : '#ffffff',
              transition: 'all 0.2s',
              marginBottom: 20
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
            />
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>
              {file ? file.name : 'Click to select Bank Statement Excel / CSV'}
            </div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
              Supports .xlsx, .xls, .csv from any bank (SBI, HDFC, ICICI, Axis, etc.)
            </div>
          </div>

          {/* Action button to parse if not parsed yet */}
          {!parsedData && (
            <button
              onClick={handleParse}
              disabled={!file || isUploading}
              style={{
                width: '100%',
                padding: '11px 0',
                background: !file || isUploading ? '#94a3b8' : '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 14,
                cursor: !file || isUploading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              {isUploading ? '⏳ Uploading & Analyzing Statement...' : '📤 Upload & Analyze Statement'}
            </button>
          )}

          {/* If parsed successfully, show Bank Ledger selector and details */}
          {parsedData && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              padding: 16,
              marginTop: 10
            }}>
              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14, marginBottom: 12 }}>
                ✅ Statement Analyzed Successfully
              </div>

              {/* Detected info badge */}
              {(detectedAccountNo || detectedBankName) && (
                <div style={{
                  background: '#e0f2fe',
                  border: '1px solid #bae6fd',
                  color: '#0369a1',
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  marginBottom: 14,
                  display: 'flex',
                  gap: 16
                }}>
                  {detectedBankName && <div><strong>Bank:</strong> {detectedBankName}</div>}
                  {detectedAccountNo && <div><strong>A/c No:</strong> {detectedAccountNo}</div>}
                </div>
              )}

              {/* Bank Ledger Selection */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Select Company Bank Ledger:
                </label>
                <select
                  value={selectedBankLedgerId || ''}
                  onChange={(e) => setSelectedBankLedgerId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    background: '#ffffff'
                  }}
                >
                  {bankLedgers.length === 0 && (
                    <option value="">No Bank Accounts found in Ledgers</option>
                  )}
                  {bankLedgers.map(bl => (
                    <option key={bl.id} value={bl.id}>
                      {bl.name} {bl.accountNo ? `(A/c: ${bl.accountNo})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stats summary */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{
                  flex: 1,
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  borderRadius: 6,
                  padding: '10px 14px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 11, color: '#be123c', fontWeight: 600, textTransform: 'uppercase' }}>
                    Payments (Withdrawals)
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#9f1239', marginTop: 4 }}>
                    {parsedData.payments.length} Entries
                  </div>
                </div>

                <div style={{
                  flex: 1,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 6,
                  padding: '10px 14px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 11, color: '#15803d', fontWeight: 600, textTransform: 'uppercase' }}>
                    Receipts (Deposits)
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#166534', marginTop: 4 }}>
                    {parsedData.receipts.length} Entries
                  </div>
                </div>
              </div>

              {/* Open Entry view button */}
              <button
                onClick={handleProceed}
                disabled={!selectedBankLedgerId}
                style={{
                  width: '100%',
                  padding: '11px 0',
                  background: !selectedBankLedgerId ? '#94a3b8' : '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: !selectedBankLedgerId ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                📋 Open Bank Statement Entry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
