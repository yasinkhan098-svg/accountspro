"use client";
import React from 'react';
import { F8SalesPrintConfig } from '@/lib/printConfig/printConfigTypes';
import { printConfigService } from '@/lib/printConfig/printConfigService';

interface InternationalSalesInvoicePrintProps {
  voucher: any;
  company: any;
  ledgers?: any[];
  copyIndex?: number;
  copyLabel?: string;
}

// Convert numbers to English words on international scale (Millions, Billions, Thousands)
export function numberToWordsInternational(num: number, currencyCode: string = 'AED'): string {
  if (isNaN(num) || num === 0) return `${currencyCode} Zero Only`;

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

  function convertHundreds(n: number): string {
    let str = '';
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 10 && n <= 19) {
      str += teens[n - 10] + ' ';
    } else if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      if (n % 10 > 0) {
        str += units[n % 10] + ' ';
      }
    } else if (n > 0) {
      str += units[n] + ' ';
    }
    return str.trim();
  }

  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);

  let words = '';
  if (intPart === 0) {
    words = 'Zero';
  } else {
    let temp = intPart;
    let scaleIdx = 0;
    const chunks: string[] = [];
    while (temp > 0) {
      const chunk = temp % 1000;
      if (chunk !== 0) {
        const chunkWords = convertHundreds(chunk);
        chunks.unshift(chunkWords + (scales[scaleIdx] ? ' ' + scales[scaleIdx] : ''));
      }
      temp = Math.floor(temp / 1000);
      scaleIdx++;
    }
    words = chunks.join(' ');
  }

  // Currency subunit naming
  const c = (currencyCode || 'AED').toUpperCase().trim();
  let subUnit = 'Fils';
  if (c === 'USD' || c === 'CAD' || c === 'AUD' || c === 'SGD' || c === 'EUR') subUnit = 'Cents';
  else if (c === 'GBP') subUnit = 'Pence';
  else if (c === 'SAR' || c === 'QAR') subUnit = 'Halalas';
  else if (c === 'OMR') subUnit = 'Baisa';
  else if (c === 'KWD' || c === 'BHD') subUnit = 'Fils';

  let result = `${c} ${words.trim()}`;
  if (decPart > 0) {
    const decWords = convertHundreds(decPart);
    result += ` and ${decWords} ${subUnit}`;
  }
  return result + ' Only';
}

export default function InternationalSalesInvoicePrint({
  voucher,
  company,
  ledgers,
  copyIndex = 0,
  copyLabel,
}: InternationalSalesInvoicePrintProps) {
  const v = voucher;
  const companyCode = String(company?.companyCode || company?.code || '10000').toUpperCase().trim();
  const printConfig = printConfigService.loadPrintConfig(companyCode, company);
  const f8Config: F8SalesPrintConfig = printConfig.f8SalesConfig || printConfigService.getDefaultPrintConfig(company).f8SalesConfig!;

  const safeParseJSON = (data: any) => {
    if (!data) return null;
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  };

  const pd = safeParseJSON(v.partyDetails) || v.partyDetails;
  const dd = safeParseJSON(v.dispatchDetails) || v.dispatchDetails;
  const partyLedger = (ledgers || []).find((l: any) => l.name === v.partyName);

  const curSym = company?.currencySymbol || company?.baseCurrencySymbol || company?.currency || 'AED';
  const curName = (company?.currency || 'AED').toUpperCase();

  // Field fallback logic: Company Master > F8 Config > Default/Blank
  const sellerTrn = company?.gstin || company?.trn || company?.vatNumber || '';
  const sellerTradeLicense = f8Config.sellerTradeLicense?.enabled
    ? (company?.tradeLicense || f8Config.sellerTradeLicense?.value || '')
    : '';

  const buyerTrn = partyLedger?.gstin || partyLedger?.trn || pd?.gstin || '';
  const buyerTradeLicense = f8Config.buyerTradeLicense?.enabled
    ? (partyLedger?.tradeLicense || pd?.tradeLicense || f8Config.buyerTradeLicense?.value || '')
    : '';

  const paymentTerms = f8Config.paymentTerms?.enabled
    ? (pd?.paymentTerms || v.paymentTerms || f8Config.paymentTerms?.value || '30 Days Credit')
    : '';

  const placeOfSupply = f8Config.placeOfSupply?.enabled
    ? (pd?.placeOfSupply || partyLedger?.state || company?.state ? `${company?.state}, ${company?.country || 'UAE'}` : f8Config.placeOfSupply?.value || '')
    : '';

  const salesperson = f8Config.salesperson?.enabled
    ? (v.salesperson || dd?.salesperson || f8Config.salesperson?.value || '')
    : '';

  const vehicleRoute = f8Config.vehicleRoute?.enabled
    ? (dd?.motorVehicleNo || dd?.dispatchedThrough || f8Config.vehicleRoute?.value || '')
    : '';

  // Bank details
  const bankName = f8Config.bankName?.enabled
    ? (company?.bankName || f8Config.bankName?.value || '')
    : '';
  const accountName = f8Config.accountName?.enabled
    ? (company?.accountName || f8Config.accountName?.value || company?.name || '')
    : '';
  const iban = f8Config.iban?.enabled
    ? (company?.iban || company?.accountNo || f8Config.iban?.value || '')
    : '';
  const swift = f8Config.swift?.enabled
    ? (company?.swift || f8Config.swift?.value || '')
    : '';

  const docTitle = (f8Config.documentTitle?.enabled && f8Config.documentTitle?.value)
    ? f8Config.documentTitle.value
    : 'TAX INVOICE';

  // Calculations
  const inventoryItems = v.inventoryEntries || [];
  const subtotal = inventoryItems.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);

  // Extract Tax entries
  const taxEntries = (v.entries || []).filter((e: any) => {
    const lname = String(e.ledgerName || e.account || '').toLowerCase();
    return lname.includes('vat') || lname.includes('tax') || lname.includes('gst');
  });

  const taxAmount = taxEntries.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
  const grandTotal = v.total || (subtotal + taxAmount);

  // Tax rate identification
  let taxRatePercent = 5;
  if (taxEntries.length > 0) {
    const match = taxEntries[0].ledgerName?.match(/(\d+(\.\d+)?)%/);
    if (match) {
      taxRatePercent = parseFloat(match[1]);
    } else if (subtotal > 0 && taxAmount > 0) {
      taxRatePercent = Math.round((taxAmount / subtotal) * 100);
    }
  }

  const taxLabel = (company?.country?.toLowerCase().includes('uae') || company?.country?.toLowerCase().includes('emirates'))
    ? `UAE VAT @ ${taxRatePercent}%`
    : `VAT / Tax @ ${taxRatePercent}%`;

  const defaultCopyLabels = ["ORIGINAL FOR RECIPIENT", "DUPLICATE FOR TRANSPORTER", "TRIPLICATE FOR SUPPLIER", "EXTRA COPY"];
  const displayCopyLabel = copyLabel || defaultCopyLabels[copyIndex] || defaultCopyLabels[0];

  const fmt = (n: number) => {
    return (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div
      className="invoice-copy international-sales-invoice"
      style={{
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto 30px auto',
        background: '#ffffff',
        fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Roboto, Arial, sans-serif',
        fontSize: 11,
        color: '#1e293b',
        position: 'relative',
        boxSizing: 'border-box',
        padding: '14mm 16mm',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Top Copy Label */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 20,
          fontSize: 8.5,
          fontWeight: 700,
          color: '#64748b',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}
      >
        {displayCopyLabel}
      </div>

      {/* 1. HEADER SECTION (Brand & Invoice Meta) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5px solid #cbd5e1', paddingBottom: 12 }}>
        {/* Left: Company Details */}
        <div style={{ flex: '1 1 60%', paddingRight: 20 }}>
          {company?.showLogo && company?.logo && (
            <div style={{ marginBottom: 8 }}>
              <img src={company.logo} alt="Company Logo" style={{ maxHeight: 50, maxWidth: 180, objectFit: 'contain' }} />
            </div>
          )}
          <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
            {company?.name || 'Company Legal Name'}
          </div>
          {company?.address && (
            <div style={{ fontSize: 10, color: '#475569', marginTop: 3, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
              {company.address}{company.pinCode ? ` - ${company.pinCode}` : ''}
              {company.state && `, ${company.state}`}
              {company.country && `, ${company.country}`}
            </div>
          )}
          <div style={{ fontSize: 9.5, color: '#475569', marginTop: 3 }}>
            {company?.telephone && <span>Tel: <b>{company.telephone}</b></span>}
            {company?.telephone && company?.email && <span> | </span>}
            {company?.email && <span>Phone: <b>{company.email}</b></span>}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>
            {sellerTrn && (
              <span>Seller TRN: <b>{sellerTrn}</b></span>
            )}
            {sellerTrn && sellerTradeLicense && <span> | </span>}
            {sellerTradeLicense && (
              <span>Trade License No: <b>{sellerTradeLicense}</b></span>
            )}
          </div>
        </div>

        {/* Right: Invoice Metadata */}
        <div style={{ flex: '0 0 220px', textAlign: 'right' }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: '#1a365d', letterSpacing: '0.5px', marginBottom: 6 }}>
            {docTitle}
          </div>
          <div style={{ fontSize: 11, color: '#0f172a', marginBottom: 2 }}>
            Invoice No: <b>{v.voucherNo}</b>
          </div>
          <div style={{ fontSize: 11, color: '#0f172a', marginBottom: 2 }}>
            Invoice Date: <b>{v.date}</b>
          </div>
          {paymentTerms && (
            <div style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>
              Payment Terms: <b>{paymentTerms}</b>
            </div>
          )}
          <div style={{ fontSize: 10, color: '#475569' }}>
            Currency: <b>{curSym}</b> {curName !== curSym ? `(${curName})` : ''}
          </div>
        </div>
      </div>

      {/* 2. TWO BOXES: BILL TO & DELIVERY/REFERENCE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '12px 0' }}>
        {/* Box 1: BILL TO (CUSTOMER DETAILS) */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: 4, overflow: 'hidden', background: '#ffffff' }}>
          <div
            style={{
              background: '#f1f5f9',
              fontWeight: 800,
              fontSize: 10,
              color: '#1e293b',
              padding: '5px 10px',
              borderBottom: '1px solid #cbd5e1',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            BILL TO (CUSTOMER DETAILS)
          </div>
          <div style={{ padding: '8px 10px', fontSize: 10, lineHeight: 1.45 }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: '#0f172a', marginBottom: 2 }}>
              {pd?.partyName || v.partyName || 'Cash / Customer'}
            </div>
            {(partyLedger?.address || pd?.address) && (
              <div style={{ color: '#475569', whiteSpace: 'pre-wrap', marginBottom: 3 }}>
                {partyLedger?.address || pd?.address}
              </div>
            )}
            {buyerTrn && (
              <div style={{ color: '#0f172a', fontWeight: 600 }}>
                TRN No: <b>{buyerTrn}</b>
              </div>
            )}
            {buyerTradeLicense && (
              <div style={{ color: '#0f172a', fontWeight: 600 }}>
                Trade License No: <b>{buyerTradeLicense}</b>
              </div>
            )}
            {(partyLedger?.phone || pd?.contact || partyLedger?.email || pd?.email) && (
              <div style={{ color: '#475569', marginTop: 2 }}>
                Contact: {partyLedger?.phone || pd?.contact || ''}
                {(partyLedger?.phone || pd?.contact) && (partyLedger?.email || pd?.email) && ' | '}
                {partyLedger?.email || pd?.email || ''}
              </div>
            )}
          </div>
        </div>

        {/* Box 2: DELIVERY & REFERENCE DETAILS */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: 4, overflow: 'hidden', background: '#ffffff' }}>
          <div
            style={{
              background: '#f1f5f9',
              fontWeight: 800,
              fontSize: 10,
              color: '#1e293b',
              padding: '5px 10px',
              borderBottom: '1px solid #cbd5e1',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            DELIVERY &amp; REFERENCE DETAILS
          </div>
          <div style={{ padding: '8px 10px', fontSize: 10, lineHeight: 1.45 }}>
            {f8Config.showLpoNo?.enabled && (
              <div style={{ marginBottom: 2 }}>
                LPO / PO No: <b>{v.refNo || pd?.buyerOrderNo || dd?.orderNo || '—'}</b>
              </div>
            )}
            {f8Config.showDeliveryNoteNo?.enabled && (
              <div style={{ marginBottom: 2 }}>
                Delivery Note No: <b>{dd?.deliveryNoteNo || '—'}</b>
              </div>
            )}
            {placeOfSupply && (
              <div style={{ marginBottom: 2 }}>
                Place of Supply: <b>{placeOfSupply}</b>
              </div>
            )}
            {salesperson && (
              <div style={{ marginBottom: 2 }}>
                Salesperson: <b>{salesperson}</b>
              </div>
            )}
            {vehicleRoute && (
              <div>
                Vehicle / Route: <b>{vehicleRoute}</b>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. ITEMS TABLE */}
      <div style={{ border: '1px solid #cbd5e1', borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr style={{ background: '#1a365d', color: '#ffffff', fontWeight: 700 }}>
              <th style={{ padding: '7px 8px', textAlign: 'center', width: 40, borderRight: '1px solid rgba(255,255,255,0.15)' }}>S/N</th>
              <th style={{ padding: '7px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)' }}>Item Description</th>
              <th style={{ padding: '7px 8px', textAlign: 'center', width: 60, borderRight: '1px solid rgba(255,255,255,0.15)' }}>Unit</th>
              <th style={{ padding: '7px 8px', textAlign: 'right', width: 60, borderRight: '1px solid rgba(255,255,255,0.15)' }}>Qty</th>
              <th style={{ padding: '7px 10px', textAlign: 'right', width: 85, borderRight: '1px solid rgba(255,255,255,0.15)' }}>Rate ({curSym})</th>
              <th style={{ padding: '7px 10px', textAlign: 'right', width: 100 }}>Amount ({curSym})</th>
            </tr>
          </thead>
          <tbody>
            {inventoryItems.map((item: any, idx: number) => (
              <tr
                key={idx}
                style={{
                  background: idx % 2 === 1 ? '#f8fafc' : '#ffffff',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b', borderRight: '1px solid #f1f5f9' }}>
                  {idx + 1}
                </td>
                <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 600, borderRight: '1px solid #f1f5f9' }}>
                  {item.stockItemName || item.itemName || item.name}
                  {item.description && (
                    <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 400 }}>{item.description}</div>
                  )}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'center', color: '#475569', borderRight: '1px solid #f1f5f9' }}>
                  {item.unit || item.uom || '—'}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right', color: '#0f172a', fontWeight: 600, borderRight: '1px solid #f1f5f9' }}>
                  {fmt(item.billedQty || item.actualQty || item.quantity || 0)}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: '#0f172a', borderRight: '1px solid #f1f5f9' }}>
                  {fmt(item.rate || 0)}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: '#0f172a', fontWeight: 700 }}>
                  {fmt(item.amount || 0)}
                </td>
              </tr>
            ))}

            {/* Minimum rows padding for clean spacing if fewer items */}
            {Array.from({ length: Math.max(0, 4 - inventoryItems.length) }).map((_, i) => (
              <tr key={'empty_' + i} style={{ height: 26, borderBottom: '1px solid #f8fafc' }}>
                <td style={{ borderRight: '1px solid #f8fafc' }} />
                <td style={{ borderRight: '1px solid #f8fafc' }} />
                <td style={{ borderRight: '1px solid #f8fafc' }} />
                <td style={{ borderRight: '1px solid #f8fafc' }} />
                <td style={{ borderRight: '1px solid #f8fafc' }} />
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. TOTALS, WORDS & BANK REMITTANCE SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 14, marginTop: 12 }}>
        {/* Left Column: Words & Bank Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Amount in Words */}
          <div style={{ fontSize: 9.5, lineHeight: 1.4, color: '#0f172a' }}>
            <span style={{ color: '#475569' }}>Amount in Words: </span>
            <b>{numberToWordsInternational(grandTotal, curSym)}</b>
          </div>

          {/* Bank Details for Remittance */}
          {(bankName || iban) && (
            <div
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 4,
                padding: '8px 10px',
                background: '#fafafa',
                fontSize: 9.5,
                lineHeight: 1.45,
              }}
            >
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 3, textTransform: 'uppercase', fontSize: 9.5 }}>
                Bank Details for Remittance:
              </div>
              <div>
                Bank: <b>{bankName}</b>
                {accountName && <span> | A/C Name: <b>{accountName}</b></span>}
              </div>
              <div>
                {iban && <span>IBAN: <b>{iban}</b></span>}
                {iban && swift && <span> | </span>}
                {swift && <span>SWIFT: <b>{swift}</b></span>}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Subtotal, VAT, Grand Total */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px' }}>
            <span style={{ color: '#475569' }}>Subtotal (Excl. VAT)</span>
            <b style={{ color: '#0f172a' }}>{fmt(subtotal)}</b>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ color: '#475569' }}>{taxLabel}</span>
            <b style={{ color: '#0f172a' }}>{fmt(taxAmount)}</b>
          </div>

          {/* GRAND TOTAL IN PROMINENT DARK NAVY BAR */}
          <div
            style={{
              background: '#1a365d',
              color: '#ffffff',
              padding: '8px 10px',
              borderRadius: 4,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 800,
              fontSize: 12.5,
              letterSpacing: 0.3,
              marginTop: 4,
            }}
          >
            <span>GRAND TOTAL ({curSym})</span>
            <span>{fmt(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* 5. FOOTER SECTION: STAMP & SIGNATURE */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginTop: 40,
          paddingTop: 10,
        }}
      >
        {/* Receiver's Stamp & Signature */}
        {f8Config.showStampSignature?.enabled ? (
          <div style={{ width: 220, textAlign: 'center', fontSize: 9.5, color: '#475569' }}>
            <div style={{ height: 45, borderBottom: '1px solid #94a3b8', marginBottom: 6 }} />
            <div style={{ fontWeight: 600 }}>Receiver's Stamp &amp; Signature</div>
          </div>
        ) : <div />}

        {/* Company Authorised Signatory */}
        {f8Config.showAuthorisedSignatory?.enabled ? (
          <div style={{ width: 240, textAlign: 'center', fontSize: 9.5, color: '#475569' }}>
            <div style={{ fontSize: 10, color: '#0f172a', marginBottom: 4 }}>
              For <b>{company?.name || 'Company Legal Name'}</b>
            </div>
            <div style={{ height: 35, borderBottom: '1px solid #94a3b8', marginBottom: 6 }} />
            <div style={{ fontWeight: 600 }}>Authorised Signatory</div>
          </div>
        ) : <div />}
      </div>
    </div>
  );
}
