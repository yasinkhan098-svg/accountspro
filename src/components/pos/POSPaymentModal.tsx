"use client";
import React, { useState, useEffect } from 'react';
import { POSCartTotals, POSCustomer, POSPaymentDetails, posService } from '@/lib/pos/posService';

interface POSPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totals: POSCartTotals;
  companyName: string;
  upiVpa?: string;
  billNo?: string;
  ledgers?: any[];
  onConfirmPayment: (payment: POSPaymentDetails, customer: POSCustomer) => void;
}

export default function POSPaymentModal({
  isOpen,
  onClose,
  totals,
  companyName,
  upiVpa = 'retail@upi',
  billNo = '0001',
  ledgers = [],
  onConfirmPayment,
}: POSPaymentModalProps) {
  const [payMode, setPayMode] = useState<'Cash' | 'UPI_QR' | 'Split' | 'Card' | 'Credit'>('Cash');
  const [cashTendered, setCashTendered] = useState<number>(totals.grandTotal);
  const [splitCash, setSplitCash] = useState<number>(Math.floor(totals.grandTotal / 2));
  const [custName, setCustName] = useState('Cash Customer');
  const [custMobile, setCustMobile] = useState('');
  const [custGstin, setCustGstin] = useState('');
  const [walkInDelivery, setWalkInDelivery] = useState(false);
  const [upiRef, setUpiRef] = useState('');
  const [cardRef, setCardRef] = useState('');
  const [selectedLedgerId, setSelectedLedgerId] = useState<number | undefined>(undefined);

  useEffect(() => {
    setCashTendered(totals.grandTotal);
    setSplitCash(Math.floor(totals.grandTotal / 2));
  }, [totals.grandTotal]);

  if (!isOpen) return null;

  const changeDue = Math.max(0, Math.round((cashTendered - totals.grandTotal) * 100) / 100);
  const splitUpi = Math.max(0, Math.round((totals.grandTotal - splitCash) * 100) / 100);

  // Quick cash buttons helper
  const handleQuickCash = (amt: number) => {
    setCashTendered(amt);
  };
  const handleAddCash = (amt: number) => {
    setCashTendered(prev => prev + amt);
  };

  // UPI payment URI & QR code image
  const effectiveUpiAmount = payMode === 'Split' ? splitUpi : totals.grandTotal;
  const upiPayUrl = posService.getUpiUri({
    vpa: upiVpa || 'retail@upi',
    companyName: companyName || 'LedgerX Retail',
    amount: effectiveUpiAmount,
    billNo,
  });
  const qrApiUrl = posService.getQrImageUrl(upiPayUrl, 180);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (payMode === 'Cash' && cashTendered < totals.grandTotal) {
      alert(`Tendered cash (₹${cashTendered}) is less than Total (₹${totals.grandTotal})!`);
      return;
    }

    if (payMode === 'Split' && splitCash + splitUpi !== totals.grandTotal) {
      alert(`Split Cash (₹${splitCash}) + UPI (₹${splitUpi}) must equal Total (₹${totals.grandTotal})!`);
      return;
    }

    const payment: POSPaymentDetails = {
      mode: payMode,
      cashTendered: payMode === 'Cash' ? cashTendered : payMode === 'Split' ? splitCash : totals.grandTotal,
      changeDue: payMode === 'Cash' ? changeDue : 0,
      cashAmount: payMode === 'Split' ? splitCash : payMode === 'Cash' ? totals.grandTotal : 0,
      upiAmount: payMode === 'Split' ? splitUpi : payMode === 'UPI_QR' ? totals.grandTotal : 0,
      upiRef: upiRef.trim() || (payMode === 'UPI_QR' || payMode === 'Split' ? `UPI-${Date.now().toString().slice(-6)}` : undefined),
      cardRef: cardRef.trim() || undefined,
      customerLedgerId: selectedLedgerId,
    };

    const customer: POSCustomer = {
      name: custName.trim() || 'Cash Customer',
      mobile: custMobile.trim(),
      gstin: custGstin.trim(),
      walkInDelivery,
    };

    onConfirmPayment(payment, customer);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 720,
          maxHeight: '94vh',
          background: '#ffffff',
          borderRadius: 10,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '2px solid #0f3c64',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(180deg, #0f3c64 0%, #082138 100%)',
            color: '#ffffff',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid #051624',
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>💳 Payment & Settlement (Bill #{billNo})</div>
            <div style={{ fontSize: 11, color: '#93c5fd' }}>Select payment tender • Auto print receipt on confirmation</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: '#ffffff',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* Top Payable Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0f3c64 100%)',
              color: '#ffffff',
              borderRadius: 8,
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            }}
          >
            <div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#bae6fd' }}>
                Net Amount Payable
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#ffffff' }}>
                ₹{totals.grandTotal.toFixed(2)}
              </div>
              {totals.discountAmount > 0 && (
                <div style={{ fontSize: 11, color: '#86efac', fontWeight: 600 }}>
                  ★ You saved ₹{totals.discountAmount.toFixed(2)} on this bill
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: '#f1f5f9' }}>
              <div>Total Items: <b>{totals.itemsCount}</b> (Qty: <b>{totals.totalQty}</b>)</div>
              <div>Tax (GST): <b>₹{totals.totalTax.toFixed(2)}</b></div>
            </div>
          </div>

          {/* Tender Type Selector Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { mode: 'Cash', label: '💵 Cash', bg: '#10b981' },
              { mode: 'UPI_QR', label: '📱 UPI QR', bg: '#6366f1' },
              { mode: 'Split', label: '⚖️ Cash + UPI', bg: '#0284c7' },
              { mode: 'Card', label: '💳 Card', bg: '#8b5cf6' },
              { mode: 'Credit', label: '📒 Credit/Due', bg: '#d97706' },
            ].map(t => (
              <button
                key={t.mode}
                type="button"
                onClick={() => setPayMode(t.mode as any)}
                style={{
                  padding: '10px 6px',
                  borderRadius: 6,
                  border: payMode === t.mode ? `2px solid ${t.bg}` : '1px solid #cbd5e1',
                  background: payMode === t.mode ? `${t.bg}15` : '#f8fafc',
                  color: payMode === t.mode ? t.bg : '#334155',
                  fontWeight: 'bold',
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: payMode === t.mode ? `0 0 0 1px ${t.bg}` : 'none',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: CASH TENDER */}
          {payMode === 'Cash' && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#334155', marginBottom: 4 }}>
                    Cash Received (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={cashTendered}
                    onChange={e => setCashTendered(parseFloat(e.target.value) || 0)}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: 20,
                      fontWeight: 'bold',
                      color: '#0f3c64',
                      border: '2px solid #0284c7',
                      borderRadius: 6,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#334155', marginBottom: 4 }}>
                    Change Return to Customer (₹)
                  </label>
                  <div
                    style={{
                      padding: '10px 12px',
                      fontSize: 20,
                      fontWeight: 'bold',
                      color: changeDue > 0 ? '#16a34a' : '#64748b',
                      background: changeDue > 0 ? '#dcfce7' : '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                    }}
                  >
                    ₹{changeDue.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[100, 200, 500, 1000, 2000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickCash(amt)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 4,
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 'bold',
                      color: '#0f3c64',
                      cursor: 'pointer',
                    }}
                  >
                    ₹{amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleQuickCash(totals.grandTotal)}
                  style={{
                    background: '#e0f2fe',
                    border: '1px solid #38bdf8',
                    borderRadius: 4,
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: '#0284c7',
                    cursor: 'pointer',
                  }}
                >
                  Exact (₹{totals.grandTotal})
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: UPI DYNAMIC QR CODE */}
          {payMode === 'UPI_QR' && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 16,
                marginBottom: 14,
                display: 'flex',
                gap: 20,
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  background: '#ffffff',
                  padding: 8,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  textAlign: 'center',
                }}
              >
                <img
                  src={qrApiUrl}
                  alt="UPI Payment QR Code"
                  style={{ width: 160, height: 160, display: 'block' }}
                />
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: 'bold' }}>
                  Scan to Pay ₹{totals.grandTotal.toFixed(2)}
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 'bold', color: '#0f3c64' }}>
                  📱 Customer UPI QR Code
                </div>
                <div style={{ fontSize: 12, color: '#475569' }}>
                  Ask the customer to scan the QR code with <b>Google Pay</b>, <b>PhonePe</b>, <b>Paytm</b>, or any BHIM UPI app.
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 'bold', color: '#334155', marginBottom: 2 }}>
                    UPI Reference / Txn ID (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 30492630xxxx"
                    value={upiRef}
                    onChange={e => setUpiRef(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: 13,
                      border: '1px solid #cbd5e1',
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SPLIT PAYMENT (CASH + UPI) */}
          {payMode === 'Split' && (
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#0369a1', marginBottom: 10 }}>
                ⚖️ Split Payment: Cash + Dynamic UPI QR
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#334155', marginBottom: 4 }}>
                    💵 Cash Portion (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={splitCash}
                    onChange={e => {
                      const c = Math.max(0, parseFloat(e.target.value) || 0);
                      setSplitCash(Math.min(totals.grandTotal, c));
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: '#0f3c64',
                      border: '2px solid #0284c7',
                      borderRadius: 6,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#334155', marginBottom: 4 }}>
                    📱 Remaining by UPI QR (₹)
                  </label>
                  <div
                    style={{
                      padding: '8px 10px',
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: '#6366f1',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                    }}
                  >
                    ₹{splitUpi.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Dynamic QR for Remaining Balance */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                <img
                  src={qrApiUrl}
                  alt="Split UPI QR"
                  style={{ width: 100, height: 100, display: 'block' }}
                />
                <div style={{ fontSize: 12, color: '#334155' }}>
                  <div>Dynamic QR updated for remaining: <b>₹{splitUpi.toFixed(2)}</b></div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    Customer scans to pay balance while giving ₹{splitCash.toFixed(2)} in cash.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CARD / CREDIT */}
          {payMode === 'Card' && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#334155', marginBottom: 4 }}>
                Card Approval Code / Last 4 Digits:
              </label>
              <input
                type="text"
                placeholder="e.g. 5432 / AUTH-8921"
                value={cardRef}
                onChange={e => setCardRef(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: 13,
                  border: '1px solid #cbd5e1',
                  borderRadius: 4,
                }}
              />
            </div>
          )}

          {payMode === 'Credit' && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#334155', marginBottom: 4 }}>
                Select Customer Ledger (Sundry Debtor):
              </label>
              <select
                value={selectedLedgerId || ''}
                onChange={e => setSelectedLedgerId(Number(e.target.value) || undefined)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: 13,
                  border: '1px solid #cbd5e1',
                  borderRadius: 4,
                }}
              >
                <option value="">-- Walk-in / Select Debtor --</option>
                {ledgers
                  .filter(l => l.groupName === 'Sundry Debtors' || l.groupName === 'Branch / Divisions')
                  .map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Customer Meta (Optional) */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 8 }}>
              Customer Details & Delivery
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <input
                  type="text"
                  placeholder="Customer Mobile (Optional)"
                  value={custMobile}
                  onChange={e => setCustMobile(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4 }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="walkInDelivery"
                  checked={walkInDelivery}
                  onChange={e => setWalkInDelivery(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="walkInDelivery" style={{ fontSize: 12, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                  Walk in Delivery
                </label>
              </div>
            </div>
          </div>
        </form>

        {/* Bottom Actions */}
        <div
          style={{
            background: '#f8fafc',
            borderTop: '1px solid #cbd5e1',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            Cancel (Esc)
          </button>

          {/* User requirement: "qr code pr jiase hi payment reciept ho succes hote hi automatic slip print hokr aye" */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            style={{
              background: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 24px',
              fontSize: 15,
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(22,163,74,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>✓ Complete Payment & Print Slip (Enter)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
