/**
 * POS Direct Silent Thermal Receipt Printing Service
 * Supports 100% silent background printing without preview popups,
 * local printer isolation on Client PCs, and auto-adapting 80mm/58mm roll paper.
 */
import { POSCartItem, POSCartTotals, POSCustomer, POSPaymentDetails, posService } from './posService';
import { getCompanyTaxInfo } from '../taxEngine';
import { printConfigService } from '../printConfig/printConfigService';

export interface POSPrintReceiptData {
  billNo: string;
  company: any;
  cashierName: string;
  items: POSCartItem[];
  totals: POSCartTotals;
  payment: POSPaymentDetails;
  customer: POSCustomer;
}

export function buildReceiptSlipHtml(data: POSPrintReceiptData, qrCodeDataUrl: string): string {
  const { billNo, company, cashierName, items, totals, payment, customer } = data;
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

  const customFieldsHtml = (printConfig.customFields || [])
    .map(cf => {
      const val = printConfigService.formatFieldValue(cf);
      if (!val) return '';
      return `<div style="font-size: 9px;">${cf.label} : ${val}</div>`;
    })
    .filter(Boolean)
    .join('');

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const storeName = company?.name || 'LedgerX Retail Limited';
  const hasUpi = Boolean(company?.upiId && company.upiId.trim());

  // Group items by GST rate
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

  const isTraining = Boolean(company?.isTraining || billNo.startsWith('TRN') || company?.companyCode === 'TRAINING');

  // Render items rows
  const itemRowsHtml = items.map((it, idx) => {
    let itemRateLine = '';
    if (companyTax.isIndiaGst) {
      const halfGst = ((it.gstRate || 0) / 2).toFixed(2);
      itemRateLine = `${idx + 1}) CGST @ ${halfGst}% SGST @ ${halfGst}%`;
    } else {
      const rateVal = (it.gstRate || 0).toFixed(2);
      const taxAmtStr = (it.taxAmount || 0) > 0 ? ` (${currencySymbol}${(it.taxAmount || 0).toFixed(2)})` : '';
      itemRateLine = `${idx + 1}) ${companyTax.taxName} @ ${rateVal}%${taxAmtStr}`;
    }
    const saveAmt = it.mrpRate > it.rateWithTax ? ((it.mrpRate - it.rateWithTax) * it.qty).toFixed(2) : null;
    return `
      <div style="margin-bottom: 5px; font-size: 9px;">
        <div style="font-size: 8px; color: #333;">
          ${itemRateLine}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <span style="width: 48%; word-break: break-word; font-weight: bold;">
            ${it.hsnCode || '732393'} ${it.name}
            ${saveAmt ? `<div style="font-size: 7.5px; color: #16a34a; font-weight: normal;">MRP: ${currencySymbol}${it.mrpRate.toFixed(2)} (Save ${currencySymbol}${saveAmt})</div>` : ''}
          </span>
          <span style="width: 18%; text-align: right;">${currencySymbol}${it.rateWithTax.toFixed(2)}</span>
          <span style="width: 14%; text-align: center;">${it.qty} ${it.unit || ''}</span>
          <span style="width: 20%; text-align: right; font-weight: bold;">${currencySymbol}${it.lineTotal.toFixed(2)}</span>
        </div>
      </div>
    `;
  }).join('');

  // Payment Tender breakdown
  let paymentHtml = '';
  if (payment.mode === 'Split') {
    paymentHtml = `
      <div style="display: flex; justify-content: space-between; font-size: 9px;">
        <span>CASH TENDERED</span>
        <span>${currencySymbol}${(payment.cashAmount || 0).toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 9px;">
        <span>JIOPAY UPI DQR ${payment.upiRef || 'X-2319-30492630'}</span>
        <span>${currencySymbol}${(payment.upiAmount || 0).toFixed(2)}</span>
      </div>
    `;
  } else if (payment.mode === 'UPI_QR') {
    paymentHtml = `
      <div style="display: flex; justify-content: space-between; font-size: 9px;">
        <span>JIOPAY UPI DQR ${payment.upiRef || 'X-2319-30492630'}</span>
        <span>${currencySymbol}${totals.grandTotal.toFixed(2)}</span>
      </div>
    `;
  } else if (payment.mode === 'Cash') {
    paymentHtml = `
      <div style="display: flex; justify-content: space-between; font-size: 9px;">
        <span>CASH TENDERED</span>
        <span>${currencySymbol}${(payment.cashTendered || totals.grandTotal).toFixed(2)}</span>
      </div>
      ${(payment.changeDue || 0) > 0 ? `
      <div style="display: flex; justify-content: space-between; font-size: 9px;">
        <span>CHANGE RETURNED</span>
        <span>${currencySymbol}${(payment.changeDue || 0).toFixed(2)}</span>
      </div>
      ` : ''}
    `;
  } else {
    paymentHtml = `
      <div style="display: flex; justify-content: space-between; font-size: 9px;">
        <span>TENDER: ${payment.mode}</span>
        <span>${currencySymbol}${totals.grandTotal.toFixed(2)}</span>
      </div>
    `;
  }

  // Tax Breakup Table
  let taxBreakupHtml = '';
  if (companyTax.isIndiaGst) {
    const rows = Object.entries(gstGroups).map(([rate, g], i) => `
      <div style="display: flex; justify-content: space-between; font-size: 8px; margin-bottom: 2px;">
        <span style="width: 12%;">${i + 1}</span>
        <span style="width: 22%; text-align: right;">${currencySymbol}${g.taxable.toFixed(2)}</span>
        <span style="width: 18%; text-align: right;">${currencySymbol}${g.cgst.toFixed(2)}</span>
        <span style="width: 18%; text-align: right;">${currencySymbol}${g.sgst.toFixed(2)}</span>
        <span style="width: 12%; text-align: right;">${currencySymbol}0.00</span>
        <span style="width: 18%; text-align: right;">${currencySymbol}${g.total.toFixed(2)}</span>
      </div>
    `).join('');

    taxBreakupHtml = `
      <div style="text-align: center; font-size: 8px; font-weight: bold; margin-bottom: 4px;">
        -------GST Breakup Details--------Amount (${currencySymbol})
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 8px; font-weight: bold; margin-bottom: 2px;">
        <span style="width: 12%;">GST<br />IND</span>
        <span style="width: 22%; text-align: right;">Taxable<br />Amount</span>
        <span style="width: 18%; text-align: right;">CGST</span>
        <span style="width: 18%; text-align: right;">SGST</span>
        <span style="width: 12%; text-align: right;">CESS</span>
        <span style="width: 18%; text-align: right;">Total<br />Amount</span>
      </div>
      <div style="border-top: 1px dashed #000; margin: 2px 0;"></div>
      ${rows}
      <div style="border-top: 1px dashed #000; margin: 2px 0;"></div>
      <div style="display: flex; justify-content: space-between; font-size: 8px; font-weight: bold;">
        <span style="width: 12%;">Total</span>
        <span style="width: 22%; text-align: right;">${currencySymbol}${totals.totalTaxable.toFixed(2)}</span>
        <span style="width: 18%; text-align: right;">${currencySymbol}${totals.totalCgst.toFixed(2)}</span>
        <span style="width: 18%; text-align: right;">${currencySymbol}${totals.totalSgst.toFixed(2)}</span>
        <span style="width: 12%; text-align: right;">${currencySymbol}0.00</span>
        <span style="width: 18%; text-align: right;">${currencySymbol}${totals.grandTotal.toFixed(2)}</span>
      </div>
    `;
  } else {
    const rows = Object.entries(gstGroups).map(([rate, g]) => `
      <div style="display: flex; justify-content: space-between; font-size: 8px; margin-bottom: 2px;">
        <span style="width: 15%;">${rate}%</span>
        <span style="width: 30%; text-align: right;">${currencySymbol}${g.taxable.toFixed(2)}</span>
        <span style="width: 25%; text-align: right;">${currencySymbol}${(g.cgst + g.sgst).toFixed(2)}</span>
        <span style="width: 30%; text-align: right;">${currencySymbol}${g.total.toFixed(2)}</span>
      </div>
    `).join('');

    taxBreakupHtml = `
      <div style="text-align: center; font-size: 8px; font-weight: bold; margin-bottom: 4px;">
        -------${companyTax.taxName} Breakup Details--------Amount (${currencySymbol})
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 8px; font-weight: bold; margin-bottom: 2px;">
        <span style="width: 15%;">Rate</span>
        <span style="width: 30%; text-align: right;">Taxable<br />Amount</span>
        <span style="width: 25%; text-align: right;">${companyTax.taxName}<br />Amount</span>
        <span style="width: 30%; text-align: right;">Total<br />Amount</span>
      </div>
      <div style="border-top: 1px dashed #000; margin: 2px 0;"></div>
      ${rows}
      <div style="border-top: 1px dashed #000; margin: 2px 0;"></div>
      <div style="display: flex; justify-content: space-between; font-size: 8px; font-weight: bold;">
        <span style="width: 15%;">Total</span>
        <span style="width: 30%; text-align: right;">${currencySymbol}${totals.totalTaxable.toFixed(2)}</span>
        <span style="width: 25%; text-align: right;">${currencySymbol}${totals.totalTax.toFixed(2)}</span>
        <span style="width: 30%; text-align: right;">${currencySymbol}${totals.grandTotal.toFixed(2)}</span>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt - ${billNo}</title>
  <style>
    @page {
      size: auto;
      margin: 0mm !important;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .pos-thermal-slip {
      width: 100% !important;
      max-width: 78mm !important;
      margin: 0 auto !important;
      padding: 2mm 3mm !important;
      font-family: "Courier New", Courier, monospace !important;
      font-size: 10px !important;
      line-height: 1.25 !important;
      color: #000000 !important;
      background: #ffffff !important;
    }
    @media print {
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        opacity: 1 !important;
        visibility: visible !important;
      }
      .pos-thermal-slip {
        width: 100% !important;
        max-width: 78mm !important;
        margin: 0 auto !important;
        padding: 1.5mm 2mm !important;
        opacity: 1 !important;
        visibility: visible !important;
      }
    }
  </style>
</head>
<body>
  <div class="pos-thermal-slip">
    ${isTraining ? `
      <div style="border: 2px dashed #000; padding: 4px; margin-bottom: 8px; text-align: center; font-weight: 900; font-size: 11px;">
        *** TRAINING MODE DEMO RECEIPT ***
        <div style="font-size: 8px; font-weight: bold; margin-top: 2px;">NOT A TAX INVOICE • DEMO PRACTICE ONLY</div>
      </div>
    ` : ''}

    <!-- 1. LOGO & COMPANY HEADER -->
    <div style="text-align: center; margin-bottom: 8px;">
      <div style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid #000; margin: 0 auto 5px auto; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 24px; font-family: sans-serif; line-height: 44px; text-align: center;">
        L
      </div>
      <div style="font-size: 12px; font-weight: bold; text-transform: uppercase;">
        ${company?.name || 'LedgerX Retail Limited'}
      </div>
      ${tagline ? `<div style="font-size: 10px; font-weight: bold;">${tagline}</div>` : ''}
      <div style="font-size: 9px;">
        ${company?.address || 'GF, Ashoka Seed Complex, Khatima Road, Sitarganj'}
      </div>
      ${carePhone ? `<div style="font-size: 9px;">${printConfig.customerCarePhone.label} : ${carePhone}</div>` : ''}
      ${bizIdVal ? `<div style="font-size: 9px;">${printConfig.businessId.label} : ${bizIdVal}</div>` : ''}
      <div style="font-size: 9px;">
        ${companyTax.taxIdLabel}- ${company?.gstin || (companyTax.isIndiaGst ? '05AABCR1718E1ZU' : '—')}
      </div>
      ${foodLicVal ? `<div style="font-size: 9px;">${printConfig.foodLicense.label} - ${foodLicVal}</div>` : ''}
      ${customFieldsHtml}
    </div>

    <!-- 2. SAVINGS BANNER -->
    <div style="text-align: center; margin: 6px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0;">
      <div style="font-size: 12px; font-weight: bold;">
        You have saved ${currencySymbol}${totals.discountAmount > 0 ? totals.discountAmount.toFixed(2) : '150.00'}
      </div>
    </div>

    <!-- 3. TAX INVOICE META -->
    <div style="text-align: center; margin-bottom: 5px;">
      <div style="font-size: 11px; font-weight: bold;">${companyTax.taxName.toUpperCase()} INVOICE</div>
      <div style="font-size: 8px;">xxxxxxxxxxxxx Original for Recipient xxxxxxxxxxxxx</div>
    </div>

    <div style="font-size: 9px; margin-bottom: 4px;">
      <div>Place of Supply & State Code: ${company?.stateCode || (companyTax.isIndiaGst ? '05 UK' : (company?.country || '—'))}</div>
      <div>Customer Type: ${customer?.gstin ? 'B2B Registered' : 'URP'}</div>
      ${customer?.name && customer.name !== 'Cash Customer' ? `<div>Customer Name: ${customer.name} ${customer.mobile ? `(${customer.mobile})` : ''}</div>` : ''}
      ${customer?.gstin ? `<div>Customer ${companyTax.taxIdLabel}: ${customer.gstin}</div>` : ''}
      ${customer?.walkInDelivery ? '<div>Delivery: Walk in Delivery</div>' : ''}
    </div>

    <div style="display: flex; justify-content: space-between; font-size: 9px;">
      <span>Date: ${dateStr} ${timeStr}</span>
      <span>Bill No: ${billNo.replace('POS-', '')}</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 5px;">
      <span>Store: U1FX</span>
      <span>Cashier: ${cashierName}</span>
      <span>Pos No: R141</span>
    </div>

    <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>

    <!-- 4. ITEMS TABLE -->
    <div style="display: flex; justify-content: space-between; font-size: 9px; font-weight: bold; margin-bottom: 4px;">
      <span style="width: 48%;">HSN Code Item Description</span>
      <span style="width: 18%; text-align: right;">Net Price (${currencySymbol})</span>
      <span style="width: 14%; text-align: center;">Qty</span>
      <span style="width: 20%; text-align: right;">Value (${currencySymbol})</span>
    </div>

    <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>

    ${itemRowsHtml}

    <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

    <!-- 5. TOTALS BREAKDOWN -->
    <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px;">
      <span>Items: ${totals.itemsCount}</span>
      <span>Qty: ${totals.totalQty}</span>
      <span style="font-weight: bold;">${currencySymbol}${totals.subtotal.toFixed(2)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px;">
      <span>Gross sales Value</span>
      <span>${currencySymbol}${(totals.grossSalesValue || totals.subtotal + totals.discountAmount).toFixed(2)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px;">
      <span>Total Discount</span>
      <span>${currencySymbol}${totals.discountAmount.toFixed(2)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px;">
      <span>Net Sales Value (Inclusive of ${companyTax.taxName})</span>
      <span>${currencySymbol}${totals.subtotal.toFixed(2)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; margin: 4px 0;">
      <span>Total Amount Paid</span>
      <span>${currencySymbol}${totals.grandTotal.toFixed(2)}</span>
    </div>

    ${paymentHtml}

    <div style="font-size: 8px; text-align: center; margin-top: 4px;">
      (AMOUNT INCLUSIVE OF APPLICABLE TAXES)
    </div>

    <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

    <!-- 6. TAX BREAKUP TABLE -->
    ${taxBreakupHtml}

    <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

    <!-- 7. REFERENCE & INVOICE NUMBERS -->
    <div style="font-size: 8px; line-height: 1.4;">
      <div>PaymentRefNo# U1FX${Date.now().toString().slice(-14)}</div>
      <div>TaxInvoice# U1FX${(Date.now() + 500).toString().slice(-11)}</div>
      ${cardNoVal ? `<div>${printConfig.customerCard.label} :${cardNoVal} ${cardBalVal ? `${printConfig.customerBalance.label} :${cardBalVal}` : ''}</div>` : ''}
      <div>Terms & Conditions Apply</div>
      <div style="letter-spacing: 2px; margin: 4px 0;">304U1FX1410037000001</div>
    </div>

    <!-- 8. UPI QR CODE & PAYMENT DETAILS BOX -->
    <div style="margin: 8px 0; padding: 6px 4px; border: 1px solid #000; border-radius: 4px; text-align: center; background: #fff;">
      <div style="font-size: 9px; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 2px;">
        [ 📲 SCAN & PAY WITH ANY UPI APP ]
      </div>
      <div style="display: flex; justify-content: center; align-items: center; margin: 4px 0;">
        ${qrCodeDataUrl ? `
          <img src="${qrCodeDataUrl}" alt="UPI QR" style="width: 110px; height: 110px; display: block; margin: 0 auto; image-rendering: pixelated;" />
        ` : ''}
      </div>
      <div style="font-size: 8px; line-height: 1.4; margin-top: 2px;">
        <div><b>Payee:</b> ${storeName}</div>
        ${hasUpi ? `<div><b>UPI ID:</b> ${company.upiId.trim().toLowerCase()}</div>` : ''}
        <div><b>Bill Amount:</b> ${currencySymbol}${totals.grandTotal.toFixed(2)}</div>
        <div><b>Bill No:</b> ${billNo}</div>
        ${payment && (payment.mode === 'UPI_QR' || payment.mode === 'Split') ? `
          <div style="font-weight: bold; color: #000; margin-top: 2px; font-size: 8px;">
            ✓ PAID VIA UPI ${payment.upiRef ? `(Ref: ${payment.upiRef})` : ''}
          </div>
        ` : ''}
        <div style="font-size: 7px; color: #333; margin-top: 3px; letter-spacing: 0.2px;">
          Google Pay • PhonePe • Paytm • BHIM • Cred • Any UPI
        </div>
      </div>
    </div>

    <!-- 9. COMPLIANCE & FOOTER -->
    <div style="text-align: center; font-size: 8px; line-height: 1.3;">
      <div>* Thank You for Shopping with us *</div>
      ${websiteVal ? `<div>${printConfig.website.label}: ${websiteVal}</div>` : ''}
      ${emailVal ? `<div>${printConfig.email.label} & ${emailVal}</div>` : ''}
      ${policyVal ? `
        <div style="margin-top: 2px;">Please refer to our Website link</div>
        <div>${policyVal}</div>
        <div>for Privacy Policy</div>
      ` : ''}
      <div style="margin-top: 3px;">
        Dynamic Quick Response (QR) code is made available to the Recipient through a digital display.
      </div>
      <div style="margin-top: 3px;">
        I/We hereby certify that food/foods mentioned in this invoice is/are warranted to be of the nature and quality which it/these purports/purported to be.
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildDirectPrintJsonPayload(data: POSPrintReceiptData, qrCodeDataUrl: string): any {
  const { billNo, company, cashierName, items, totals, payment, customer } = data;
  const currencySymbol = company?.currencySymbol || company?.baseCurrencySymbol || company?.currency || '₹';
  const companyTax = getCompanyTaxInfo(company);

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

  const customFields: string[] = (printConfig.customFields || [])
    .map(cf => {
      const val = printConfigService.formatFieldValue(cf);
      return val ? `${cf.label} : ${val}` : '';
    })
    .filter(Boolean);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const storeName = company?.name || 'LedgerX Retail Limited';

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

  for (const rate of Object.keys(gstGroups)) {
    const r = Number(rate);
    const combinedGst = (gstGroups[r].cgst || 0) + (gstGroups[r].sgst || 0);
    const half = Math.round((combinedGst / 2) * 100) / 100;
    gstGroups[r].cgst = half;
    gstGroups[r].sgst = half;
  }

  const formattedItems = items.map((it, idx) => {
    let rateLineText = '';
    if (companyTax.isIndiaGst) {
      const halfGst = ((it.gstRate || 0) / 2).toFixed(2);
      rateLineText = `${idx + 1}) CGST @ ${halfGst}% SGST @ ${halfGst}%`;
    } else {
      const rateVal = (it.gstRate || 0).toFixed(2);
      const taxAmtStr = (it.taxAmount || 0) > 0 ? ` (${currencySymbol}${(it.taxAmount || 0).toFixed(2)})` : '';
      rateLineText = `${idx + 1}) ${companyTax.taxName} @ ${rateVal}%${taxAmtStr}`;
    }
    const saveAmt = it.mrpRate > it.rateWithTax ? ((it.mrpRate - it.rateWithTax) * it.qty).toFixed(2) : null;
    return {
      idx: idx + 1,
      rateLine: rateLineText,
      name: `${it.hsnCode || '732393'} ${it.name}`,
      mrpText: saveAmt ? `MRP: ${currencySymbol}${it.mrpRate.toFixed(2)} (Save ${currencySymbol}${saveAmt})` : '',
      netPrice: `${currencySymbol}${it.rateWithTax.toFixed(2)}`,
      qty: `${it.qty} ${it.unit || ''}`.trim(),
      value: `${currencySymbol}${it.lineTotal.toFixed(2)}`,
    };
  });

  const payments: { label: string; amount: string }[] = [];
  if (payment.mode === 'Split') {
    payments.push({ label: 'CASH TENDERED', amount: `${currencySymbol}${(payment.cashAmount || 0).toFixed(2)}` });
    payments.push({ label: `JIOPAY UPI DQR ${payment.upiRef || 'X-2319-30492630'}`, amount: `${currencySymbol}${(payment.upiAmount || 0).toFixed(2)}` });
  } else if (payment.mode === 'UPI_QR') {
    payments.push({ label: `JIOPAY UPI DQR ${payment.upiRef || 'X-2319-30492630'}`, amount: `${currencySymbol}${totals.grandTotal.toFixed(2)}` });
  } else if (payment.mode === 'Cash') {
    payments.push({ label: 'CASH TENDERED', amount: `${currencySymbol}${(payment.cashTendered || totals.grandTotal).toFixed(2)}` });
    if ((payment.changeDue || 0) > 0) {
      payments.push({ label: 'CHANGE RETURNED', amount: `${currencySymbol}${(payment.changeDue || 0).toFixed(2)}` });
    }
  } else {
    payments.push({ label: `TENDER: ${payment.mode}`, amount: `${currencySymbol}${totals.grandTotal.toFixed(2)}` });
  }

  let taxHeaders: string[];
  let taxRows: string[][];
  let taxTotalRow: string[];

  if (companyTax.isIndiaGst) {
    taxHeaders = ['GST IND', 'Taxable', 'CGST', 'SGST', 'Total'];
    taxRows = Object.entries(gstGroups).map(([rate, g], i) => [
      `${i + 1}`,
      `${currencySymbol}${g.taxable.toFixed(2)}`,
      `${currencySymbol}${g.cgst.toFixed(2)}`,
      `${currencySymbol}${g.sgst.toFixed(2)}`,
      `${currencySymbol}${g.total.toFixed(2)}`,
    ]);
    taxTotalRow = [
      'Total',
      `${currencySymbol}${totals.totalTaxable.toFixed(2)}`,
      `${currencySymbol}${totals.totalCgst.toFixed(2)}`,
      `${currencySymbol}${totals.totalSgst.toFixed(2)}`,
      `${currencySymbol}${totals.grandTotal.toFixed(2)}`,
    ];
  } else {
    taxHeaders = ['Rate', 'Taxable', companyTax.taxName, 'Total'];
    taxRows = Object.entries(gstGroups).map(([rate, g]) => [
      `${rate}%`,
      `${currencySymbol}${g.taxable.toFixed(2)}`,
      `${currencySymbol}${(g.cgst + g.sgst).toFixed(2)}`,
      `${currencySymbol}${g.total.toFixed(2)}`,
    ]);
    taxTotalRow = [
      'Total',
      `${currencySymbol}${totals.totalTaxable.toFixed(2)}`,
      `${currencySymbol}${totals.totalTax.toFixed(2)}`,
      `${currencySymbol}${totals.grandTotal.toFixed(2)}`,
    ];
  }

  return {
    billNo: billNo.replace('POS-', ''),
    storeName,
    tagline: tagline || '',
    address: company?.address || 'GF, Ashoka Seed Complex, Khatima Road, Sitarganj',
    carePhone: carePhone ? `${printConfig.customerCarePhone.label} : ${carePhone}` : '',
    businessId: bizIdVal ? `${printConfig.businessId.label} : ${bizIdVal}` : '',
    taxId: `${companyTax.taxIdLabel}- ${company?.gstin || (companyTax.isIndiaGst ? '05AABCR1718E1ZU' : '—')}`,
    foodLicense: foodLicVal ? `${printConfig.foodLicense.label} - ${foodLicVal}` : '',
    customFields,
    savingsText: `You have saved ${currencySymbol}${totals.discountAmount > 0 ? totals.discountAmount.toFixed(2) : '150.00'}`,
    taxInvoiceTitle: `${companyTax.taxName} INVOICE`,
    placeOfSupply: `Place of Supply & State Code: ${company?.stateCode || (companyTax.isIndiaGst ? '05 UK' : (company?.country || '—'))}`,
    customerType: `Customer Type: ${customer?.gstin ? 'B2B Registered' : 'URP'}`,
    customerInfo: customer?.name && customer.name !== 'Cash Customer' ? `Customer: ${customer.name} ${customer.mobile ? `(${customer.mobile})` : ''}` : '',
    dateStr: `${dateStr} ${timeStr}`,
    cashier: cashierName,
    posNo: 'R141',
    currencySymbol,
    items: formattedItems,
    totals: {
      itemsCount: totals.itemsCount,
      totalQty: totals.totalQty,
      subtotal: `${currencySymbol}${totals.subtotal.toFixed(2)}`,
      grossSalesValue: `${currencySymbol}${(totals.grossSalesValue || totals.subtotal + totals.discountAmount).toFixed(2)}`,
      totalDiscount: `${currencySymbol}${totals.discountAmount.toFixed(2)}`,
      netSalesValue: `${currencySymbol}${totals.subtotal.toFixed(2)}`,
      grandTotal: `${currencySymbol}${totals.grandTotal.toFixed(2)}`,
    },
    payments,
    taxBreakup: {
      title: `-------${companyTax.taxName} Breakup Details--------Amount (${currencySymbol})`,
      isDual: companyTax.isIndiaGst,
      headers: taxHeaders,
      rows: taxRows,
      totalRow: taxTotalRow,
    },
    referenceLines: [
      `PaymentRefNo# U1FX${Date.now().toString().slice(-14)}`,
      `TaxInvoice# U1FX${(Date.now() + 500).toString().slice(-11)}`,
      cardNoVal ? `${printConfig.customerCard.label} :${cardNoVal} ${cardBalVal ? `${printConfig.customerBalance.label} :${cardBalVal}` : ''}` : '',
      'Terms & Conditions Apply',
      '304U1FX1410037000001',
    ].filter(Boolean),
    qrCodeBase64: qrCodeDataUrl || '',
    qrFooterLines: [
      `Payee: ${storeName}`,
      company?.upiId ? `UPI ID: ${company.upiId.trim().toLowerCase()}` : '',
      `Bill Amount: ${currencySymbol}${totals.grandTotal.toFixed(2)}`,
      `Bill No: ${billNo.replace('POS-', '')}`,
      'Google Pay • PhonePe • Paytm • BHIM • Cred • Any UPI',
    ].filter(Boolean),
    footerLines: [
      '* Thank You for Shopping with us *',
      websiteVal ? `${printConfig.website.label}: ${websiteVal}` : '',
      emailVal ? `${printConfig.email.label} & ${emailVal}` : '',
      policyVal ? 'Please refer to our Website link' : '',
      policyVal || '',
      policyVal ? 'for Privacy Policy' : '',
      'Dynamic Quick Response (QR) code is made available to the Recipient through a digital display.',
      'I/We hereby certify that food/foods mentioned in this invoice is/are warranted to be of the nature and quality which it/these purports/purported to be.',
    ].filter(Boolean),
  };
}

class POSThermalPrintService {
  /**
   * Directly prints the thermal receipt silently to the local Windows default printer,
   * without showing any preview modal or blocking the cashier.
   */
  public async directPrintReceipt(data: POSPrintReceiptData): Promise<{ success: boolean; error?: string }> {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Cannot print in non-browser environment' };
    }

    try {
      const { company, billNo, totals } = data;
      const storeName = company?.name || 'LedgerX Retail Limited';
      const hasUpi = Boolean(company?.upiId && company.upiId.trim());

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

      const upiPayUrl = hasUpi
        ? posService.getUpiUri({
          vpa: company.upiId.trim(),
          companyName: storeName,
          amount: totals.grandTotal,
          billNo,
        })
        : `UPI-INV:${billNo}|AMT:${totals.grandTotal}|GSTIN:${company?.gstin || ''}|DT:${dateStr}`;

      // Generate dynamic QR code data URL
      let qrCodeDataUrl = '';
      try {
        qrCodeDataUrl = await posService.generateQrDataUrl(upiPayUrl, 160);
      } catch (e) {
        qrCodeDataUrl = posService.getQrImageUrl(upiPayUrl, 160);
      }

      // Generate full slip HTML
      const fullHtml = buildReceiptSlipHtml(data, qrCodeDataUrl);

      // 1. Try Native Windows Spooler Direct Print via LedgerX Background Host / API (Zero white flash, zero circle searching)
      try {
        const payload = buildDirectPrintJsonPayload(data, qrCodeDataUrl);
        const candidates: string[] = [];
        if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
          candidates.push(`${window.location.origin}/api/pos/direct-print`);
        }
        candidates.push('http://127.0.0.1:45454/api/pos/direct-print');
        candidates.push('http://localhost:45454/api/pos/direct-print');
        candidates.push('/api/pos/direct-print');

        const uniqueCandidates = Array.from(new Set(candidates));

        for (const url of uniqueCandidates) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1800);
            const hostRes = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (hostRes.ok) {
              const resJson = await hostRes.json().catch(() => null);
              if (resJson && resJson.success) {
                return { success: true };
              }
            }
          } catch (e) {
            // Try next candidate
          }
        }
      } catch (nativeErr) {
        // Native background host not reachable; fall back to off-screen iframe
      }

      // 2. Fallback: Create an off-screen hidden iframe for silent printing
      const iframeId = 'pos-silent-thermal-print-frame';
      let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
      if (iframe) {
        try { document.body.removeChild(iframe); } catch (e) { }
      }

      iframe = document.createElement('iframe');
      iframe.id = iframeId;
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '78mm';
      iframe.style.height = '1000px';
      iframe.style.border = 'none';
      iframe.style.opacity = '0.01'; // Very slightly visible to avoid Chromium optimizing out paint
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-99999';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!frameDoc) {
        throw new Error('Unable to access iframe document for printing');
      }

      frameDoc.open();
      frameDoc.write(fullHtml);
      frameDoc.close();

      // Give images and DOM layout a reliable moment to paint, then trigger print silently
      await new Promise<void>((resolve) => {
        const trigger = () => {
          try {
            if (iframe && iframe.contentWindow) {
              // Direct silent print without focusing iframe (prevents full-screen white canvas flash)
              iframe.contentWindow.print();
            }
          } catch (err) {
            console.warn('Silent iframe print failed:', err);
          }
          resolve();
        };

        const img = frameDoc.querySelector('img');
        if (img && !img.complete) {
          img.onload = () => setTimeout(trigger, 80);
          img.onerror = () => trigger();
        } else {
          setTimeout(trigger, 120);
        }
      });

      // Cleanup iframe after printing finishes
      setTimeout(() => {
        try {
          const el = document.getElementById(iframeId);
          if (el && el.parentNode) el.parentNode.removeChild(el);
        } catch (e) { }
      }, 3000);

      return { success: true };
    } catch (error: any) {
      console.error('Direct thermal print error:', error);
      return { success: false, error: error?.message || 'Print failed' };
    }
  }
}

export const posThermalPrintService = new POSThermalPrintService();
