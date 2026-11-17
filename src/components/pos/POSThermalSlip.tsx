"use client";
import React from 'react';
import { POSCartItem, POSCartTotals, POSCustomer, POSPaymentDetails } from '@/lib/pos/posService';
import { getCompanyTaxInfo } from '@/lib/taxEngine';
import { printConfigService } from '@/lib/printConfig/printConfigService';

export interface POSThermalSlipProps {
  billNo: string;
  company: any;
  cashierName: string;
  items: POSCartItem[];
  totals: POSCartTotals;
  payment: POSPaymentDetails;
  customer: POSCustomer;
  qrCodeDataUrl?: string;
}

export default function POSThermalSlip({
  billNo,
  company,
  cashierName,
  items,
  totals,
  payment,
  customer,
  qrCodeDataUrl,
}: POSThermalSlipProps) {
  const currencySymbol = company?.currencySymbol || company?.baseCurrencySymbol || company?.currency || '₹';
  const companyTax = getCompanyTaxInfo(company);

  // Load Company-specific print configuration
  const companyCode = String(company?.companyCode || company?.code || '10000').toUpperCase().trim();
  const printConfig = printConfigService.loadPrintConfig(companyCode, company);

  const tagline = printConfigService.formatFieldValue(printConfig.storeTagline);
  const carePhone = printConfigService.formatFieldValue(printConfig.customerCarePhone);
  const bizIdVal = printConfigService.formatFieldValue(printConfig.businessId);
  const foodLicVal = printConfigService.formatFieldValue(printConfig.foodLicense);
  const cardNoVal = printConfigService.formatFieldValue(printConfig.customerCard, customer?.mobile || '');
  const cardBalVal = printConfigService.formatFieldValue(printConfig.customerBalance);
  const websiteVal = printConfigService.formatFieldValue(printConfig.website);
  const emailVal = printConfigService.formatFieldValue(printConfig.email);
  const policyVal = printConfigService.formatFieldValue(printConfig.privacyPolicy);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const storeName = company?.name || 'LedgerX Retail Limited';
  const hasUpi = Boolean(company?.upiId && company.upiId.trim());

  const isTraining = Boolean(company?.isTraining || billNo.startsWith('TRN') || company?.companyCode === 'TRAINING');

  // Group items by GST rate for the Breakup Details Table
  const gstGroups: Record<number, { taxable: number; cgst: number; sgst: number; total: number }> = {};
  for (const it of items) {
    const rate = it.gstRate || 0;
    if (!gstGroups[rate]) {
      gstGroups[rate] = { taxable: 0, cgst: 0, sgst: 0, total: 0 };
    }
    gstGroups[rate].taxable += (it.taxableRate || 0) * (it.qty || 1);
    gstGroups[rate].cgst += it.cgstAmount || 0;
    gstGroups[rate].sgst += it.sgstAmount || 0;
    gstGroups[rate].total += it.lineTotal || 0;
  }

  // Symmetrize CGST and SGST per rate group so both columns are always identical
  for (const rate of Object.keys(gstGroups)) {
    const r = Number(rate);
    const combinedGst = (gstGroups[r].cgst || 0) + (gstGroups[r].sgst || 0);
    const half = Math.round((combinedGst / 2) * 100) / 100;
    gstGroups[r].cgst = half;
    gstGroups[r].sgst = half;
  }

  return (
    <div
      className="pos-thermal-slip"
      style={{
        width: '100%',
        maxWidth: 380,
        background: '#ffffff',
        padding: '12px 14px',
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: 10.5,
        lineHeight: 1.25,
        color: '#000000',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. TOP LOGO EMBLEM */}
      {isTraining && (
        <div
          style={{
            border: '2px dashed #000000',
            padding: '5px 4px',
            margin: '0 0 8px 0',
            textAlign: 'center',
            fontWeight: 900,
            fontSize: 11,
            letterSpacing: 1,
            background: '#f8fafc',
          }}
        >
          *** TRAINING MODE DEMO RECEIPT ***
          <div style={{ fontSize: 8, fontWeight: 'bold', marginTop: 2 }}>
            NOT A TAX INVOICE • DEMO PRACTICE ONLY
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '2px solid #000',
            margin: '0 auto 5px auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: 24,
            fontFamily: 'sans-serif',
            lineHeight: '44px',
          }}
        >
          L
        </div>
        <div style={{ fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>
          {company?.name || 'LedgerX Retail Limited'}
        </div>
        {tagline && (
          <div style={{ fontSize: 10, fontWeight: 'bold' }}>
            {tagline}
          </div>
        )}
        <div style={{ fontSize: 9 }}>
          {company?.address || 'GF, Ashoka Complex, Sitarganj'}
        </div>
        {carePhone && (
          <div style={{ fontSize: 9 }}>
            {printConfig.customerCarePhone.label} : {carePhone}
          </div>
        )}
        {bizIdVal && (
          <div style={{ fontSize: 9 }}>
            {printConfig.businessId.label} : {bizIdVal}
          </div>
        )}
        <div style={{ fontSize: 9 }}>
          {companyTax.taxIdLabel}- {company?.gstin || (companyTax.isIndiaGst ? '05AABCR1718E1ZU' : '—')}
        </div>
        {foodLicVal && (
          <div style={{ fontSize: 9 }}>
            {printConfig.foodLicense.label} - {foodLicVal}
          </div>
        )}
        {(printConfig.customFields || []).map((cf, i) => {
          const val = printConfigService.formatFieldValue(cf);
          if (!val) return null;
          return (
            <div key={cf.id || i} style={{ fontSize: 9 }}>
              {cf.label} : {val}
            </div>
          );
        })}
      </div>

      {/* 2. SAVINGS BANNER */}
      <div style={{ textAlign: 'center', margin: '6px 0', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '4px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 'bold' }}>
          You have saved {currencySymbol}{totals.discountAmount > 0 ? totals.discountAmount.toFixed(2) : '150.00'}
        </div>
      </div>

      {/* 3. TAX INVOICE META */}
      <div style={{ textAlign: 'center', marginBottom: 5 }}>
        <div style={{ fontSize: 11, fontWeight: 'bold' }}>{companyTax.taxName.toUpperCase()} INVOICE</div>
        <div style={{ fontSize: 8 }}>xxxxxxxxxxxxx Original for Recipient xxxxxxxxxxxxx</div>
      </div>

      <div style={{ fontSize: 9, marginBottom: 4 }}>
        <div>Place of Supply & State Code: {company?.stateCode || (companyTax.isIndiaGst ? '05 UK' : (company?.country || '—'))}</div>
        <div>Customer Type: {customer?.gstin ? 'B2B Registered' : 'URP'}</div>
        {customer?.name && customer.name !== 'Cash Customer' && (
          <div>Customer Name: {customer.name} {customer.mobile ? `(${customer.mobile})` : ''}</div>
        )}
        {customer?.gstin && <div>Customer {companyTax.taxIdLabel}: {customer.gstin}</div>}
        {customer?.walkInDelivery && <div>Delivery: Walk in Delivery</div>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
        <span>Date: {dateStr} {timeStr}</span>
        <span>Bill No: {billNo.replace('POS-', '')}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 5 }}>
        <span>Store: U1FX</span>
        <span>Cashier: {cashierName}</span>
        <span>Pos No: R141</span>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* 4. ITEMS TABLE (FORMAT: HSN Code Item Description Net Price Qty Value) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 'bold', marginBottom: 4 }}>
        <span style={{ width: '48%' }}>HSN Code Item Description</span>
        <span style={{ width: '18%', textAlign: 'right' }}>Net Price ({currencySymbol})</span>
        <span style={{ width: '14%', textAlign: 'center' }}>Qty</span>
        <span style={{ width: '20%', textAlign: 'right' }}>Value ({currencySymbol})</span>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* Item Rows */}
      {items.map((it, idx) => {
        const halfGst = ((it.gstRate || 0) / 2).toFixed(2);
        return (
          <div key={it.cartId || idx} style={{ marginBottom: 5, fontSize: 9 }}>
            {/* GST rate line above item */}
            <div style={{ fontSize: 8, color: '#333' }}>
              {idx + 1}) CGST @ {halfGst}% SGST @ {halfGst}%
            </div>
            {/* Item description and figures */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ width: '48%', wordBreak: 'break-word', fontWeight: 'bold' }}>
                {it.hsnCode || '732393'} {it.name}
                {it.mrpRate > it.rateWithTax && (
                  <div style={{ fontSize: 7.5, color: '#16a34a', fontWeight: 'normal' }}>
                    MRP: {currencySymbol}{it.mrpRate.toFixed(2)} (Save {currencySymbol}{((it.mrpRate - it.rateWithTax) * it.qty).toFixed(2)})
                  </div>
                )}
              </span>
              <span style={{ width: '18%', textAlign: 'right' }}>
                {currencySymbol}{it.rateWithTax.toFixed(2)}
              </span>
              <span style={{ width: '14%', textAlign: 'center' }}>
                {it.qty} {it.unit || ''}
              </span>
              <span style={{ width: '20%', textAlign: 'right', fontWeight: 'bold' }}>
                {currencySymbol}{it.lineTotal.toFixed(2)}
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
        <span style={{ fontWeight: 'bold' }}>{currencySymbol}{totals.subtotal.toFixed(2)}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 2 }}>
        <span>Gross sales Value</span>
        <span>{currencySymbol}{(totals.grossSalesValue || totals.subtotal + totals.discountAmount).toFixed(2)}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 2 }}>
        <span>Total Discount</span>
        <span>{currencySymbol}{totals.discountAmount.toFixed(2)}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 2 }}>
        <span>Net Sales Value (Inclusive of {companyTax.taxName})</span>
        <span>{currencySymbol}{totals.subtotal.toFixed(2)}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 'bold', margin: '4px 0' }}>
        <span>Total Amount Paid</span>
        <span>{currencySymbol}{totals.grandTotal.toFixed(2)}</span>
      </div>

      {/* Payment Mode Specifics */}
      {payment.mode === 'Split' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
            <span>CASH TENDERED</span>
            <span>{currencySymbol}{payment.cashAmount?.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
            <span>JIOPAY UPI DQR {payment.upiRef || 'X-2319-30492630'}</span>
            <span>{currencySymbol}{payment.upiAmount?.toFixed(2)}</span>
          </div>
        </>
      ) : payment.mode === 'UPI_QR' ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
          <span>JIOPAY UPI DQR {payment.upiRef || 'X-2319-30492630'}</span>
          <span>{currencySymbol}{totals.grandTotal.toFixed(2)}</span>
        </div>
      ) : payment.mode === 'Cash' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
            <span>CASH TENDERED</span>
            <span>{currencySymbol}{(payment.cashTendered || totals.grandTotal).toFixed(2)}</span>
          </div>
          {(payment.changeDue || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
              <span>CHANGE RETURNED</span>
              <span>{currencySymbol}{(payment.changeDue || 0).toFixed(2)}</span>
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
          <span>TENDER: {payment.mode}</span>
          <span>{currencySymbol}{totals.grandTotal.toFixed(2)}</span>
        </div>
      )}

      <div style={{ fontSize: 8, textAlign: 'center', marginTop: 4 }}>
        (AMOUNT INCLUSIVE OF APPLICABLE TAXES)
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

      {/* 6. TAX BREAKUP DETAILS TABLE */}
      {companyTax.isIndiaGst ? (
        <>
          <div style={{ textAlign: 'center', fontSize: 8, fontWeight: 'bold', marginBottom: 4 }}>
            -------GST Breakup Details--------Amount ({currencySymbol})
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
              <span style={{ width: '22%', textAlign: 'right' }}>{currencySymbol}{g.taxable.toFixed(2)}</span>
              <span style={{ width: '18%', textAlign: 'right' }}>{currencySymbol}{g.cgst.toFixed(2)}</span>
              <span style={{ width: '18%', textAlign: 'right' }}>{currencySymbol}{g.sgst.toFixed(2)}</span>
              <span style={{ width: '12%', textAlign: 'right' }}>{currencySymbol}0.00</span>
              <span style={{ width: '18%', textAlign: 'right' }}>{currencySymbol}{g.total.toFixed(2)}</span>
            </div>
          ))}

          <div style={{ borderTop: '1px dashed #000', margin: '2px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontWeight: 'bold' }}>
            <span style={{ width: '12%' }}>Total</span>
            <span style={{ width: '22%', textAlign: 'right' }}>{currencySymbol}{totals.totalTaxable.toFixed(2)}</span>
            <span style={{ width: '18%', textAlign: 'right' }}>{currencySymbol}{totals.totalCgst.toFixed(2)}</span>
            <span style={{ width: '18%', textAlign: 'right' }}>{currencySymbol}{totals.totalSgst.toFixed(2)}</span>
            <span style={{ width: '12%', textAlign: 'right' }}>{currencySymbol}0.00</span>
            <span style={{ width: '18%', textAlign: 'right' }}>{currencySymbol}{totals.grandTotal.toFixed(2)}</span>
          </div>
        </>
      ) : (
        <>
          <div style={{ textAlign: 'center', fontSize: 8, fontWeight: 'bold', marginBottom: 4 }}>
            -------{companyTax.taxName} Breakup Details--------Amount ({currencySymbol})
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontWeight: 'bold', marginBottom: 2 }}>
            <span style={{ width: '15%' }}>Rate</span>
            <span style={{ width: '30%', textAlign: 'right' }}>Taxable<br />Amount</span>
            <span style={{ width: '25%', textAlign: 'right' }}>{companyTax.taxName}<br />Amount</span>
            <span style={{ width: '30%', textAlign: 'right' }}>Total<br />Amount</span>
          </div>

          <div style={{ borderTop: '1px dashed #000', margin: '2px 0' }} />

          {Object.entries(gstGroups).map(([rate, g]) => {
            const lineTax = g.cgst + g.sgst;
            return (
              <div key={rate} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, marginBottom: 2 }}>
                <span style={{ width: '15%' }}>{rate}%</span>
                <span style={{ width: '30%', textAlign: 'right' }}>{currencySymbol}{g.taxable.toFixed(2)}</span>
                <span style={{ width: '25%', textAlign: 'right' }}>{currencySymbol}{lineTax.toFixed(2)}</span>
                <span style={{ width: '30%', textAlign: 'right' }}>{currencySymbol}{g.total.toFixed(2)}</span>
              </div>
            );
          })}

          <div style={{ borderTop: '1px dashed #000', margin: '2px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontWeight: 'bold' }}>
            <span style={{ width: '15%' }}>Total</span>
            <span style={{ width: '30%', textAlign: 'right' }}>{currencySymbol}{totals.totalTaxable.toFixed(2)}</span>
            <span style={{ width: '25%', textAlign: 'right' }}>{currencySymbol}{totals.totalTax.toFixed(2)}</span>
            <span style={{ width: '30%', textAlign: 'right' }}>{currencySymbol}{totals.grandTotal.toFixed(2)}</span>
          </div>
        </>
      )}

      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

      {/* 7. REFERENCE & INVOICE NUMBERS */}
      <div style={{ fontSize: 8, lineHeight: 1.4 }}>
        <div>PaymentRefNo# U1FX{Date.now().toString().slice(-14)}</div>
        <div>TaxInvoice# U1FX{(Date.now() + 500).toString().slice(-11)}</div>
        {cardNoVal && (
          <div>
            {printConfig.customerCard.label} :{cardNoVal}
            {cardBalVal ? ` ${printConfig.customerBalance.label} :${cardBalVal}` : ''}
          </div>
        )}
        <div>Terms & Conditions Apply</div>
        <div style={{ letterSpacing: 2, margin: '4px 0' }}>304U1FX1410037000001</div>
      </div>

      {/* 8. CENTERED DYNAMIC UPI QR CODE & PAYMENT DETAILS BOX */}
      <div
        style={{
          margin: '8px 0',
          padding: '6px 4px',
          border: '1px solid #000',
          borderRadius: 4,
          textAlign: 'center',
          background: '#fff',
        }}
      >
        <div style={{ fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 2 }}>
          [ 📲 SCAN & PAY WITH ANY UPI APP ]
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '4px 0' }}>
          {qrCodeDataUrl ? (
            <img
              src={qrCodeDataUrl}
              alt="UPI Payment QR Code"
              style={{ width: 110, height: 110, display: 'block', margin: '0 auto', imageRendering: 'pixelated' }}
            />
          ) : (
            <div style={{ width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #999', fontSize: 8, margin: '0 auto' }}>
              QR Ready
            </div>
          )}
        </div>
        <div style={{ fontSize: 8, lineHeight: 1.4, marginTop: 2 }}>
          <div><b>Payee:</b> {storeName}</div>
          {hasUpi && <div><b>UPI ID:</b> {company.upiId.trim().toLowerCase()}</div>}
          <div><b>Bill Amount:</b> {currencySymbol}{totals.grandTotal.toFixed(2)}</div>
          <div><b>Bill No:</b> {billNo}</div>
          {payment && (payment.mode === 'UPI_QR' || payment.mode === 'Split') && (
            <div style={{ fontWeight: 'bold', color: '#000', marginTop: 2, fontSize: 8 }}>
              ✓ PAID VIA UPI {payment.upiRef ? `(Ref: ${payment.upiRef})` : ''}
            </div>
          )}
          <div style={{ fontSize: 7, color: '#333', marginTop: 3, letterSpacing: 0.2 }}>
            Google Pay • PhonePe • Paytm • BHIM • Cred • Any UPI
          </div>
        </div>
      </div>

      {/* 9. COMPLIANCE & FOOTER */}
      <div style={{ textAlign: 'center', fontSize: 8, lineHeight: 1.3 }}>
        <div>* Thank You for Shopping with us *</div>
        {websiteVal && <div>{printConfig.website.label}: {websiteVal}</div>}
        {emailVal && <div>{printConfig.email.label} & {emailVal}</div>}
        {policyVal && (
          <>
            <div style={{ marginTop: 2 }}>Please refer to our Website link</div>
            <div>{policyVal}</div>
            <div>for Privacy Policy</div>
          </>
        )}
        <div style={{ marginTop: 3 }}>
          Dynamic Quick Response (QR) code is made available to the Recipient through a digital display.
        </div>
        <div style={{ marginTop: 3 }}>
          I/We hereby certify that food/foods mentioned in this invoice is/are warranted to be of the nature and quality which it/these purports/purported to be.
        </div>
      </div>
    </div>
  );
}
