"use client";
import React, { useRef, useEffect } from 'react';
import { POSCartItem, POSCartTotals, POSCustomer, POSPaymentDetails, posService } from '@/lib/pos/posService';

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
  autoPrint?: boolean;
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
  autoPrint = true,
}: POSReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  // Auto-print effect as requested by user
  useEffect(() => {
    if (isOpen && autoPrint) {
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch (e) {}
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint]);

  if (!isOpen) return null;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const handlePrint = () => {
    window.print();
  };

  // Build UPI verification QR code for receipt
  const storeName = company?.name || 'LedgerX Retail Limited';
  const qrData = `UPI-INV:${billNo}|AMT:${totals.grandTotal}|GSTIN:${company?.gstin || '05AABCR1718E1ZU'}|DT:${dateStr}`;
  const qrUrl = posService.getQrImageUrl(qrData, 140);

  // Group items by GST rate for the Breakup Details Table
  const gstGroups: Record<number, { taxable: number; cgst: number; sgst: number; total: number }> = {};
  for (const it of items) {
    const rate = it.gstRate || 0;
    if (!gstGroups[rate]) {
      gstGroups[rate] = { taxable: 0, cgst: 0, sgst: 0, total: 0 };
    }
    gstGroups[rate].taxable += it.taxableRate * it.qty;
    gstGroups[rate].cgst += it.cgstAmount;
    gstGroups[rate].sgst += it.sgstAmount;
    gstGroups[rate].total += it.lineTotal;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000000,
      }}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .pos-thermal-slip, .pos-thermal-slip * {
            visibility: visible;
          }
          .pos-thermal-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important;
            margin: 0 !important;
            padding: 2mm !important;
            box-shadow: none !important;
            border: none !important;
          }
          .pos-no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        style={{
          width: 480,
          maxHeight: '96vh',
          background: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '2px solid #0f3c64',
        }}
      >
        {/* Top Header Actions */}
        <div
          className="pos-no-print"
          style={{
            background: '#0f3c64',
            color: '#ffffff',
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: 15 }}>
            🖨️ Retail Tax Invoice (Auto Printed)
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handlePrint}
              style={{
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: 4,
                padding: '6px 14px',
                fontWeight: 'bold',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Print Again
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
                padding: '6px 12px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Next Bill (Esc)
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            background: '#e2e8f0',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {/* THERMAL 80MM RECEIPT SLIP (EXACT 100% REPLICA OF USER PHOTO) */}
          <div
            ref={receiptRef}
            className="pos-thermal-slip"
            style={{
              width: '100%',
              maxWidth: 380,
              background: '#ffffff',
              padding: '18px 16px',
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: 11,
              lineHeight: 1.25,
              color: '#000000',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              border: '1px solid #cbd5e1',
            }}
          >
            {/* 1. TOP LOGO EMBLEM */}
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  border: '2px solid #000',
                  margin: '0 auto 6px auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 28,
                  fontFamily: 'sans-serif',
                }}
              >
                L
              </div>
              <div style={{ fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase' }}>
                {company?.name || 'LedgerX Retail Limited'}
              </div>
              <div style={{ fontSize: 11, fontWeight: 'bold' }}>
                LEDGERX SMART POINT
              </div>
              <div style={{ fontSize: 9 }}>
                {company?.address || 'GF, Ashoka Seed Complex, Khatima Road,'}
              </div>
              <div style={{ fontSize: 9 }}>
                Sitarganj, District Udham Singh Nagar
              </div>
              <div style={{ fontSize: 9 }}>
                Uttarakhand-262405.
              </div>
              <div style={{ fontSize: 9 }}>
                Customer care : 18008910001
              </div>
              <div style={{ fontSize: 9 }}>
                CIN NO : U01100MH1999PLC120563
              </div>
              <div style={{ fontSize: 9 }}>
                GSTIN- {company?.gstin || '05AABCR1718E1ZU'}
              </div>
              <div style={{ fontSize: 9 }}>
                FSSAI Lic No -12622012000067
              </div>
            </div>

            {/* 2. SAVINGS BANNER (EXACT REPLICA FROM PHOTO) */}
            <div style={{ textAlign: 'center', margin: '8px 0', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '4px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 'bold' }}>
                You have saved Rs.{totals.discountAmount > 0 ? totals.discountAmount.toFixed(2) : '150.00'}
              </div>
            </div>

            {/* 3. TAX INVOICE META */}
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 'bold' }}>TAX INVOICE</div>
              <div style={{ fontSize: 9 }}>xxxxxxxxxxxxx Original for Recipient xxxxxxxxxxxxx</div>
            </div>

            <div style={{ fontSize: 9, marginBottom: 4 }}>
              <div>Place of Supply & State Code: {company?.stateCode || '05 UK'}</div>
              <div>Customer Type: {customer?.gstin ? 'B2B Registered' : 'URP'}</div>
              {customer?.name && customer.name !== 'Cash Customer' && (
                <div>Customer Name: {customer.name} {customer.mobile ? `(${customer.mobile})` : ''}</div>
              )}
              {customer?.gstin && <div>Customer GSTIN: {customer.gstin}</div>}
              {customer?.walkInDelivery && <div>Delivery: Walk in Delivery</div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
              <span>Date: {dateStr} {timeStr}</span>
              <span>Bill No: {billNo.replace('POS-', '')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 6 }}>
              <span>Store: U1FX</span>
              <span>Cashier: {cashierName}</span>
              <span>Pos No: R141</span>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

            {/* 4. ITEMS TABLE (FORMAT: HSN Code Item Description Net Price Qty Value) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 'bold', marginBottom: 4 }}>
              <span style={{ width: '48%' }}>HSN Code Item Description</span>
              <span style={{ width: '18%', textAlign: 'right' }}>Net Price</span>
              <span style={{ width: '14%', textAlign: 'center' }}>Qty</span>
              <span style={{ width: '20%', textAlign: 'right' }}>Value</span>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

            {/* Item Rows */}
            {items.map((it, idx) => {
              const halfGst = (it.gstRate / 2).toFixed(2);
              return (
                <div key={it.cartId || idx} style={{ marginBottom: 6, fontSize: 9 }}>
                  {/* GST rate line above item */}
                  <div style={{ fontSize: 8, color: '#333' }}>
                    {idx + 1}) CGST @ {halfGst}% SGST @ {halfGst}%
                  </div>
                  {/* Item description and figures */}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ width: '48%', wordBreak: 'break-word', fontWeight: 'bold' }}>
                      {it.hsnCode || '732393'} {it.name}
                    </span>
                    <span style={{ width: '18%', textAlign: 'right' }}>
                      {it.rateWithTax.toFixed(2)}
                    </span>
                    <span style={{ width: '14%', textAlign: 'center' }}>
                      {it.qty}
                    </span>
                    <span style={{ width: '20%', textAlign: 'right', fontWeight: 'bold' }}>
                      {it.lineTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* 5. TOTALS BREAKDOWN */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 2 }}>
              <span>Items: {totals.itemsCount}</span>
              <span>Qty: {totals.totalQty}</span>
              <span style={{ fontWeight: 'bold' }}>{totals.subtotal.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 2 }}>
              <span>Gross sales Value</span>
              <span>{(totals.grossSalesValue || totals.subtotal + totals.discountAmount).toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 2 }}>
              <span>Total Discount</span>
              <span>{totals.discountAmount.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 2 }}>
              <span>Net Sales Value (Inclusive of GST)</span>
              <span>{totals.subtotal.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 'bold', margin: '4px 0' }}>
              <span>Total Amount Paid</span>
              <span>{totals.grandTotal.toFixed(2)}</span>
            </div>

            {/* Payment Mode Specifics */}
            {payment.mode === 'Split' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
                  <span>CASH TENDERED</span>
                  <span>{payment.cashAmount?.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
                  <span>JIOPAY UPI DQR {payment.upiRef || 'X-2319-30492630'}</span>
                  <span>{payment.upiAmount?.toFixed(2)}</span>
                </div>
              </>
            ) : payment.mode === 'UPI_QR' ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
                <span>JIOPAY UPI DQR {payment.upiRef || 'X-2319-30492630'}</span>
                <span>{totals.grandTotal.toFixed(2)}</span>
              </div>
            ) : payment.mode === 'Cash' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
                  <span>CASH TENDERED</span>
                  <span>{payment.cashTendered.toFixed(2)}</span>
                </div>
                {payment.changeDue > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
                    <span>CHANGE RETURNED</span>
                    <span>{payment.changeDue.toFixed(2)}</span>
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
                <span>TENDER: {payment.mode}</span>
                <span>{totals.grandTotal.toFixed(2)}</span>
              </div>
            )}

            <div style={{ fontSize: 8, textAlign: 'center', marginTop: 4 }}>
              (AMOUNT INCLUSIVE OF APPLICABLE TAXES)
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* 6. GST BREAKUP DETAILS TABLE (EXACT REPLICA FROM PHOTO) */}
            <div style={{ textAlign: 'center', fontSize: 8, fontWeight: 'bold', marginBottom: 4 }}>
              -------GST Breakup Details--------Amount (INR)
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontWeight: 'bold', marginBottom: 2 }}>
              <span style={{ width: '12%' }}>GST<br />IND</span>
              <span style={{ width: '22%', textAlign: 'right' }}>Taxable<br />Amount</span>
              <span style={{ width: '18%', textAlign: 'right' }}>CGST</span>
              <span style={{ width: '18%', textAlign: 'right' }}>SGST</span>
              <span style={{ width: '12%', textAlign: 'right' }}>CESS</span>
              <span style={{ width: '18%', textAlign: 'right' }}>Total<br />Amount</span>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '2px 0' }} />

            {Object.entries(gstGroups).map(([rate, g], i) => (
              <div key={rate} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, marginBottom: 2 }}>
                <span style={{ width: '12%' }}>{i + 1}</span>
                <span style={{ width: '22%', textAlign: 'right' }}>{g.taxable.toFixed(2)}</span>
                <span style={{ width: '18%', textAlign: 'right' }}>{g.cgst.toFixed(2)}</span>
                <span style={{ width: '18%', textAlign: 'right' }}>{g.sgst.toFixed(2)}</span>
                <span style={{ width: '12%', textAlign: 'right' }}>0.00</span>
                <span style={{ width: '18%', textAlign: 'right' }}>{g.total.toFixed(2)}</span>
              </div>
            ))}

            <div style={{ borderTop: '1px dashed #000', margin: '2px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontWeight: 'bold' }}>
              <span style={{ width: '12%' }}>Total</span>
              <span style={{ width: '22%', textAlign: 'right' }}>{totals.totalTaxable.toFixed(2)}</span>
              <span style={{ width: '18%', textAlign: 'right' }}>{totals.totalCgst.toFixed(2)}</span>
              <span style={{ width: '18%', textAlign: 'right' }}>{totals.totalSgst.toFixed(2)}</span>
              <span style={{ width: '12%', textAlign: 'right' }}>0.00</span>
              <span style={{ width: '18%', textAlign: 'right' }}>{totals.grandTotal.toFixed(2)}</span>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* 7. REFERENCE & INVOICE NUMBERS */}
            <div style={{ fontSize: 8, lineHeight: 1.4 }}>
              <div>PaymentRefNo# U1FX{Date.now().toString().slice(-14)}</div>
              <div>TaxInvoice# U1FX{(Date.now() + 500).toString().slice(-11)}</div>
              <div>ROne Card No. :701XXXX631 ROne Bal(Amount) :138.35</div>
              <div>Terms & Conditions Apply</div>
              <div style={{ letterSpacing: 2, margin: '4px 0' }}>304U1FX1410037000001</div>
            </div>

            {/* 8. CENTERED DYNAMIC QR CODE */}
            <div style={{ textAlign: 'center', margin: '8px 0' }}>
              <img
                src={qrUrl}
                alt="Receipt Verification QR"
                style={{ width: 110, height: 110, display: 'inline-block' }}
              />
            </div>

            {/* 9. COMPLIANCE & FOOTER */}
            <div style={{ textAlign: 'center', fontSize: 8, lineHeight: 1.3 }}>
              <div>* Thank You for Shopping with us *</div>
              <div>Website: www.ledgerxretail.com</div>
              <div>Customer Care email & customercare@ledgerx.com</div>
              <div style={{ marginTop: 2 }}>Please refer to our Website link</div>
              <div>https://ledgerxretail.com/privacy-policy.html</div>
              <div>for Privacy Policy</div>
              <div style={{ marginTop: 3 }}>
                Dynamic Quick Response (QR) code is made available to the Recipient through a digital display.
              </div>
              <div style={{ marginTop: 3 }}>
                I/We hereby certify that food/foods mentioned in this invoice is/are warranted to be of the nature and quality which it/these purports/purported to be.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div
          className="pos-no-print"
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
            🖨️ Print Slip (Ctrl+P)
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
