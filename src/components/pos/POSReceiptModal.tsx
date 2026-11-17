"use client";
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { POSCartItem, POSCartTotals, POSCustomer, POSPaymentDetails, posService } from '@/lib/pos/posService';
import { getCompanyTaxInfo } from '@/lib/taxEngine';
import POSThermalSlip from './POSThermalSlip';
import { posThermalPrintService } from '@/lib/pos/posThermalPrintService';

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
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const currencySymbol = company?.currencySymbol || company?.baseCurrencySymbol || company?.currency || '₹';
  const companyTax = useMemo(() => getCompanyTaxInfo(company), [company]);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  // Build dynamic UPI payment QR code for receipt
  const storeName = company?.name || 'LedgerX Retail Limited';
  const hasUpi = Boolean(company?.upiId && company.upiId.trim());
  const upiPayUrl = hasUpi
    ? posService.getUpiUri({
        vpa: company.upiId.trim(),
        companyName: storeName,
        amount: totals.grandTotal,
        billNo,
      })
    : `UPI-INV:${billNo}|AMT:${totals.grandTotal}|GSTIN:${company?.gstin || ''}|DT:${dateStr}`;

  useEffect(() => {
    let active = true;
    posService.generateQrDataUrl(upiPayUrl, 160).then(url => {
      if (active) setQrCodeDataUrl(url);
    }).catch(() => {
      if (active) setQrCodeDataUrl(posService.getQrImageUrl(upiPayUrl, 160));
    });
    return () => { active = false; };
  }, [upiPayUrl]);

  // Auto-print effect as requested by user (triggers once QR is ready)
  useEffect(() => {
    if (isOpen && autoPrint && qrCodeDataUrl) {
      const timer = setTimeout(() => {
        try {
          handlePrint();
        } catch (e) {}
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint, qrCodeDataUrl]);

  // Step-by-step Escape listener: closes receipt print modal safely back to counter
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = async () => {
    try {
      await posThermalPrintService.directPrintReceipt({
        billNo,
        company,
        cashierName,
        items,
        totals,
        payment,
        customer,
      });
    } catch (e) {
      window.print();
    }
  };

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
          {/* THERMAL 80MM RECEIPT SLIP */}
          <div ref={receiptRef} style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #cbd5e1' }}>
            <POSThermalSlip
              billNo={billNo}
              company={company}
              cashierName={cashierName}
              items={items}
              totals={totals}
              payment={payment}
              customer={customer}
              qrCodeDataUrl={qrCodeDataUrl}
            />
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
