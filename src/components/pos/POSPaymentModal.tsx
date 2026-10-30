"use client";
import React, { useState, useEffect } from 'react';
import { POSCartTotals, POSCustomer, POSPaymentDetails } from '@/lib/pos/posService';

interface POSPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totals: POSCartTotals;
  companyName: string;
  upiVpa?: string;
  ledgers?: any[];
  onConfirmPayment: (payment: POSPaymentDetails, customer: POSCustomer) => void;
}

export default function POSPaymentModal({
  isOpen,
  onClose,
  totals,
  companyName,
  upiVpa = 'retail@upi',
  ledgers = [],
  onConfirmPayment,
}: POSPaymentModalProps) {
  const [payMode, setPayMode] = useState<'Cash' | 'UPI_QR' | 'Card' | 'Credit'>('Cash');
  const [cashTendered, setCashTendered] = useState<number>(totals.grandTotal);
  const [custName, setCustName] = useState('Cash Customer');
  const [custMobile, setCustMobile] = useState('');
  const [custGstin, setCustGstin] = useState('');
  const [upiRef, setUpiRef] = useState('');
  const [cardRef, setCardRef] = useState('');
  const [selectedLedgerId, setSelectedLedgerId] = useState<number | undefined>(undefined);

  useEffect(() => {
    setCashTendered(totals.grandTotal);
  }, [totals.grandTotal]);

  if (!isOpen) return null;

  const changeDue = Math.max(0, Math.round((cashTendered - totals.grandTotal) * 100) / 100);

  const handleQuickCash = (amt: number) => {
    setCashTendered(amt);
  };

  const handleAddCash = (amt: number) => {
    setCashTendered(prev => prev + amt);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (payMode === 'Cash' && cashTendered < totals.grandTotal) {
      alert(`Tendered amount (₹${cashTendered}) is less than Total (₹${totals.grandTotal})!`);
      return;
    }

    const payment: POSPaymentDetails = {
      mode: payMode,
      cashTendered: payMode === 'Cash' ? cashTendered : totals.grandTotal,
      changeDue: payMode === 'Cash' ? changeDue : 0,
      upiRef: upiRef.trim() || undefined,
      cardRef: cardRef.trim() || undefined,
      customerLedgerId: selectedLedgerId,
    };

    const customer: POSCustomer = {
      name: custName.trim() || 'Cash Customer',
      mobile: custMobile.trim(),
      gstin: custGstin.trim(),
    };

    onConfirmPayment(payment, customer);
  };

  // Construct UPI URI for QR code
  const cleanVpa = (upiVpa || 'merchant@upi').trim();
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(cleanVpa)}&pn=${encodeURIComponent(companyName)}&am=${totals.grandTotal}&cu=INR&tn=POS-BILL`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiPayUrl)}`;

  const debtorLedgers = ledgers.filter(
    l => l.groupName === 'Sundry Debtors' || l.groupName === 'Branch / Divisions'
  );

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
          width: 680,
          maxHeight: '92vh',
          background: '#ffffff',
          borderRadius: 10,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #cbd5e1',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: '#0f3c64',
            color: '#ffffff',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 'bold' }}>💳 Payment & Settlement</div>
            <div style={{ fontSize: 11, color: '#93c5fd' }}>Select payment tender to finalize POS bill</div>
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
              background: 'linear-gradient(135deg, #0284c7, #0f3c64)',
              color: '#ffffff',
              borderRadius: 8,
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <div>
              <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.85 }}>
                Net Payable Amount
              </div>
              <div style={{ fontSize: 32, fontWeight: 'bold' }}>₹{totals.grandTotal.toFixed(2)}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, opacity: 0.9 }}>
              <div>Total Items: <b>{totals.itemsCount}</b> (Qty: <b>{totals.totalQty}</b>)</div>
              <div>Tax (GST): <b>₹{totals.totalTax.toFixed(2)}</b></div>
            </div>
          </div>

          {/* Tender Type Selector Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { mode: 'Cash', label: '💵 Cash', bg: '#10b981' },
              { mode: 'UPI_QR', label: '📱 UPI QR', bg: '#6366f1' },
              { mode: 'Card', label: '💳 Card', bg: '#0284c7' },
              { mode: 'Credit', label: '📒 Credit/Due', bg: '#d97706' },
            ].map(t => (
              <button
                key={t.mode}
                type="button"
                onClick={() => setPayMode(t.mode as any)}
                style={{
                  padding: '12px 10px',
                  borderRadius: 8,
                  border: payMode === t.mode ? `2px solid ${t.bg}` : '1px solid #cbd5e1',
                  background: payMode === t.mode ? `${t.bg}15` : '#f8fafc',
                  color: payMode === t.mode ? t.bg : '#334155',
                  fontWeight: 'bold',
                  fontSize: 14,
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

          {/* Tab 1: Cash Tender Details */}
          {payMode === 'Cash' && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
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

              {/* Quick Cash Currency Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Quick Tender:</span>
                <button type="button" onClick={() => handleQuickCash(totals.grandTotal)} style={{ padding: '5px 10px', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: 4, fontSize: 12, fontWeight: 'bold', color: '#0369a1', cursor: 'pointer' }}>
                  Exact (₹{totals.grandTotal})
                </button>
                <button type="button" onClick={() => handleQuickCash(Math.ceil(totals.grandTotal / 100) * 100)} style={{ padding: '5px 10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  ₹{Math.ceil(totals.grandTotal / 100) * 100}
                </button>
                <button type="button" onClick={() => handleQuickCash(500)} style={{ padding: '5px 10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  ₹500
                </button>
                <button type="button" onClick={() => handleQuickCash(1000)} style={{ padding: '5px 10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  ₹1,000
                </button>
                <button type="button" onClick={() => handleAddCash(100)} style={{ padding: '5px 10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  + ₹100
                </button>
                <button type="button" onClick={() => handleAddCash(500)} style={{ padding: '5px 10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  + ₹500
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Dynamic UPI QR Code */}
          {payMode === 'UPI_QR' && (
            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: 16, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 'bold', color: '#4338ca', marginBottom: 10 }}>
                📱 Customer Scan & Pay via GPay / PhonePe / Paytm / BHIM
              </div>
              <div style={{ display: 'inline-block', background: '#ffffff', padding: 10, borderRadius: 8, border: '2px solid #6366f1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                {/* Real dynamic QR Code */}
                <img
                  src={qrApiUrl}
                  alt="UPI Payment QR Code"
                  width={180}
                  height={180}
                  style={{ display: 'block' }}
                />
              </div>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#1e1b4b', marginTop: 10 }}>
                Scan to pay ₹{totals.grandTotal.toFixed(2)} to {companyName}
              </div>
              <div style={{ marginTop: 10, maxWidth: 300, margin: '10px auto 0' }}>
                <input
                  type="text"
                  placeholder="UTR / UPI Ref No. (Optional)"
                  value={upiRef}
                  onChange={e => setUpiRef(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12, textAlign: 'center' }}
                />
              </div>
            </div>
          )}

          {/* Tab 3: Card Tender */}
          {payMode === 'Card' && (
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#0369a1', marginBottom: 8 }}>
                💳 Swipe / Tap Card on POS EDC Machine
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 4 }}>Approval / RRN / Txn Ref</label>
                  <input
                    type="text"
                    value={cardRef}
                    onChange={e => setCardRef(e.target.value)}
                    placeholder="e.g. TXN-894728"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 4 }}>Card Type / Bank</label>
                  <input
                    type="text"
                    placeholder="e.g. Visa / HDFC Debit"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Credit / Customer Account */}
          {payMode === 'Credit' && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#b45309', marginBottom: 8 }}>
                📒 Post to Customer Outstanding Ledger (Credit Sale)
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 4 }}>Select Customer Ledger</label>
                <select
                  value={selectedLedgerId || ''}
                  onChange={e => setSelectedLedgerId(Number(e.target.value) || undefined)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
                >
                  <option value="">-- Choose Party / Customer Ledger --</option>
                  {debtorLedgers.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.groupName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Customer Details Box (Optional) */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 8 }}>
              👤 Customer Details (Optional)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <input
                  type="text"
                  placeholder="Customer Mobile No."
                  value={custMobile}
                  onChange={e => setCustMobile(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Customer Name (Defaults to Cash Customer)"
                  value={custName}
                  onChange={e => setCustName(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}
                />
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: 14,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Cancel (Esc)
            </button>
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '10px 28px',
                fontWeight: 'bold',
                fontSize: 16,
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)',
              }}
            >
              ✓ Complete Sale & Print Bill (Enter)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

