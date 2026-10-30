"use client";
import React, { useRef } from 'react';
import { POSCartItem, POSCartTotals, POSCustomer, POSPaymentDetails } from '@/lib/pos/posService';

interface POSReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  billNo: string;
  company: any;
  cashierName: string;
  items: POSCartItem[];
  totals: POSCartTotals;
  payment: POSPaymentDetails;
  customer: POSCustomer;
  onNewSale: () => void;
}

export default function POSReceiptModal({
  isOpen,
  onClose,
  billNo,
  company,
  cashierName,
  items,
  totals,
  payment,
  customer,
  onNewSale,
}: POSReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000000,
      }}
    >
      <div
        style={{
          width: 440,
          maxHeight: '94vh',
          background: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Top Actions */}
        <div
          style={{
            background: '#0f3c64',
            color: '#ffffff',
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: 15 }}>🖨️ POS Thermal Receipt Memo</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handlePrint}
              style={{
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: 4,
                padding: '5px 12px',
                fontWeight: 'bold',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Print Bill
            </button>
            <button
              onClick={() => {
                onClose();
                onNewSale();
              }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 4,
                padding: '5px 10px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Done (New Sale)
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            background: '#fafafa',
          }}
        >
          {/* Printable 80mm Slip */}
          <div
            ref={receiptRef}
            className="pos-thermal-receipt"
            style={{
              background: '#ffffff',
              padding: '16px 14px',
              border: '1px dashed #cbd5e1',
              fontFamily: 'monospace',
              fontSize: 12,
              color: '#000000',
              lineHeight: 1.3,
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' }}>
                {company?.name || 'LEDGERX RETAIL STORE'}
              </div>
              {company?.address && <div style={{ fontSize: 11 }}>{company.address}</div>}
              {company?.gstin && <div style={{ fontSize: 11 }}>GSTIN: {company.gstin}</div>}
              {company?.telephone && <div style={{ fontSize: 11 }}>Ph: {company.telephone}</div>}
              <div style={{ margin: '6px 0', borderTop: '1px dashed #000' }} />
              <div style={{ fontSize: 13, fontWeight: 'bold' }}>TAX INVOICE / CASH MEMO</div>
              <div style={{ margin: '6px 0', borderTop: '1px dashed #000' }} />
            </div>

            {/* Bill Meta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
              <span><b>Bill No:</b> {billNo}</span>
              <span><b>Date:</b> {dateStr}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
              <span><b>Time:</b> {timeStr}</span>
              <span><b>Cashier:</b> {cashierName}</span>
            </div>
            {customer?.name && (
              <div style={{ fontSize: 11, marginBottom: 6 }}>
                <b>Customer:</b> {customer.name} {customer.mobile ? `(${customer.mobile})` : ''}
              </div>
            )}

            <div style={{ margin: '6px 0', borderTop: '1px dashed #000' }} />

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 8 }}>
              <thead>
                <tr style={{ borderBottom: '1px dashed #000', textAlign: 'left' }}>
                  <th style={{ padding: '3px 0' }}>Item</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Rate (₹)</th>
                  <th style={{ textAlign: 'right' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.cartId || idx}>
                    <td style={{ padding: '3px 0', maxWidth: 140, wordBreak: 'break-word' }}>
                      {it.name}
                      {it.gstRate > 0 && <span style={{ fontSize: 9, color: '#555' }}> ({it.gstRate}%)</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>{it.qty}</td>
                    <td style={{ textAlign: 'right' }}>{it.rateWithTax.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{it.lineTotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ margin: '6px 0', borderTop: '1px dashed #000' }} />

            {/* Totals Breakdown */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
              <span>Total Items / Qty:</span>
              <span>{totals.itemsCount} / {totals.totalQty}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
              <span>Subtotal:</span>
              <span>₹{totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                <span>Discount:</span>
                <span>- ₹{totals.discountAmount.toFixed(2)}</span>
              </div>
            )}
            {totals.roundOff !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                <span>Round Off:</span>
                <span>{totals.roundOff > 0 ? `+ ₹${totals.roundOff.toFixed(2)}` : `- ₹${Math.abs(totals.roundOff).toFixed(2)}`}</span>
              </div>
            )}

            <div style={{ margin: '6px 0', borderTop: '2px solid #000' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 'bold', marginBottom: 6 }}>
              <span>GRAND TOTAL:</span>
              <span>₹{totals.grandTotal.toFixed(2)}</span>
            </div>

            <div style={{ margin: '6px 0', borderTop: '1px dashed #000' }} />

            {/* Tender Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
              <span>Payment Mode:</span>
              <span><b>{payment.mode}</b></span>
            </div>
            {payment.mode === 'Cash' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span>Cash Tendered:</span>
                  <span>₹{payment.cashTendered.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span>Change Returned:</span>
                  <span>₹{payment.changeDue.toFixed(2)}</span>
                </div>
              </>
            )}
            {payment.upiRef && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                <span>UPI Ref:</span>
                <span>{payment.upiRef}</span>
              </div>
            )}

            {/* GST Summary */}
            {totals.totalTax > 0 && (
              <div style={{ marginTop: 8, padding: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 10 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 2 }}>GST Tax Breakdown (Incl):</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Taxable: ₹{totals.totalTaxable.toFixed(2)}</span>
                  <span>CGST: ₹{totals.totalCgst.toFixed(2)}</span>
                  <span>SGST: ₹{totals.totalSgst.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11 }}>
              <div style={{ fontWeight: 'bold' }}>*** THANK YOU! VISIT AGAIN ***</div>
              <div style={{ fontSize: 9, color: '#666', marginTop: 4 }}>Powered by LedgerX Offline POS</div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Buttons */}
        <div
          style={{
            background: '#ffffff',
            borderTop: '1px solid #cbd5e1',
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={handlePrint}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 20px',
              fontWeight: 'bold',
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            🖨️ Print Receipt
          </button>
          <button
            onClick={() => {
              onClose();
              onNewSale();
            }}
            style={{
              background: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 24px',
              fontWeight: 'bold',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            ➕ Next Sale (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}

