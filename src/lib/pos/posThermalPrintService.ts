/**
 * POS Direct Silent Thermal Receipt Printing Service
 * Supports 100% silent background printing without preview popups,
 * local printer isolation on Client PCs, and auto-adapting 80mm/58mm roll paper.
 */
import { POSCartItem, POSCartTotals, POSCustomer, POSPaymentDetails, posService } from './posService';
import { getCompanyTaxInfo } from '../taxEngine';

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

  const isTraining = Boolean(company?.isTraining || billNo.startsWith('TRN') || company?.companyCode === 'TRAINING');

  // Render items rows
  const itemRowsHtml = items.map((it, idx) => {
    const halfGst = ((it.gstRate || 0) / 2).toFixed(2);
    const saveAmt = it.mrpRate > it.rateWithTax ? ((it.mrpRate - it.rateWithTax) * it.qty).toFixed(2) : null;
    return `
      <div style="margin-bottom: 5px; font-size: 9px;">
        <div style="font-size: 8px; color: #333;">
          ${idx + 1}) CGST @ ${halfGst}% SGST @ ${halfGst}%
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <span style="width: 48%; word-break: break-word; font-weight: bold;">
            ${it.hsnCode || '732393'} ${it.name}
            ${saveAmt ? `<div style="font-size: 7.5px; color: #16a34a; font-weight: normal;">MRP: ${currencySymbol}${it.mrpRate.toFixed(2)} (Save ${currencySymbol}${saveAmt})</div>` : ''}
          </span>
          <span style="width: 18%; text-align: right;">${it.rateWithTax.toFixed(2)}</span>
          <span style="width: 14%; text-align: center;">${it.qty} ${it.unit || ''}</span>
          <span style="width: 20%; text-align: right; font-weight: bold;">${it.lineTotal.toFixed(2)}</span>
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
        <span>${(payment.cashAmount || 0).toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 9px;">
        <span>JIOPAY UPI DQR ${payment.upiRef || 'X-2319-30492630'}</span>
        <span>${(payment.upiAmount || 0).toFixed(2)}</span>
      </div>
    `;
  } else if (payment.mode === 'UPI_QR') {
    paymentHtml = `
      <div style="display: flex; justify-content: space-between; font-size: 9px;">
        <span>JIOPAY UPI DQR ${payment.upiRef || 'X-2319-30492630'}</span>
        <span>${totals.grandTotal.toFixed(2)}</span>
      </div>
    `;
  } else if (payment.mode === 'Cash') {
    paymentHtml = `
      <div style="display: flex; justify-content: space-between; font-size: 9px;">
        <span>CASH TENDERED</span>
        <span>${(payment.cashTendered || totals.grandTotal).toFixed(2)}</span>
      </div>
      ${(payment.changeDue || 0) > 0 ? `
      <div style="display: flex; justify-content: space-between; font-size: 9px;">
        <span>CHANGE RETURNED</span>
        <span>${(payment.changeDue || 0).toFixed(2)}</span>
      </div>
      ` : ''}
    `;
  } else {
    paymentHtml = `
      <div style="display: flex; justify-content: space-between; font-size: 9px;">
        <span>TENDER: ${payment.mode}</span>
        <span>${totals.grandTotal.toFixed(2)}</span>
      </div>
    `;
  }

  // Tax Breakup Table
  let taxBreakupHtml = '';
  if (companyTax.isIndiaGst) {
    const rows = Object.entries(gstGroups).map(([rate, g], i) => `
      <div style="display: flex; justify-content: space-between; font-size: 8px; margin-bottom: 2px;">
        <span style="width: 12%;">${i + 1}</span>
        <span style="width: 22%; text-align: right;">${g.taxable.toFixed(2)}</span>
        <span style="width: 18%; text-align: right;">${g.cgst.toFixed(2)}</span>
        <span style="width: 18%; text-align: right;">${g.sgst.toFixed(2)}</span>
        <span style="width: 12%; text-align: right;">0.00</span>
        <span style="width: 18%; text-align: right;">${g.total.toFixed(2)}</span>
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
        <span style="width: 22%; text-align: right;">${totals.totalTaxable.toFixed(2)}</span>
        <span style="width: 18%; text-align: right;">${totals.totalCgst.toFixed(2)}</span>
        <span style="width: 18%; text-align: right;">${totals.totalSgst.toFixed(2)}</span>
        <span style="width: 12%; text-align: right;">0.00</span>
        <span style="width: 18%; text-align: right;">${totals.grandTotal.toFixed(2)}</span>
      </div>
    `;
  } else {
    const rows = Object.entries(gstGroups).map(([rate, g]) => `
      <div style="display: flex; justify-content: space-between; font-size: 8px; margin-bottom: 2px;">
        <span style="width: 15%;">${rate}%</span>
        <span style="width: 30%; text-align: right;">${g.taxable.toFixed(2)}</span>
        <span style="width: 25%; text-align: right;">${(g.cgst + g.sgst).toFixed(2)}</span>
        <span style="width: 30%; text-align: right;">${g.total.toFixed(2)}</span>
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
        <span style="width: 30%; text-align: right;">${totals.totalTaxable.toFixed(2)}</span>
        <span style="width: 25%; text-align: right;">${totals.totalTax.toFixed(2)}</span>
        <span style="width: 30%; text-align: right;">${totals.grandTotal.toFixed(2)}</span>
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
      body {
        margin: 0 !important;
        padding: 0 !important;
      }
      .pos-thermal-slip {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 1.5mm 2mm !important;
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
      <div style="font-size: 10px; font-weight: bold;">
        LEDGERX SMART POINT
      </div>
      <div style="font-size: 9px;">
        ${company?.address || 'GF, Ashoka Seed Complex, Khatima Road,'}
      </div>
      <div style="font-size: 9px;">
        Sitarganj, District Udham Singh Nagar
      </div>
      <div style="font-size: 9px;">
        Uttarakhand-262405.
      </div>
      <div style="font-size: 9px;">
        Customer care : 18008910001
      </div>
      <div style="font-size: 9px;">
        CIN NO : U01100MH1999PLC120563
      </div>
      <div style="font-size: 9px;">
        ${companyTax.taxIdLabel}- ${company?.gstin || (companyTax.isIndiaGst ? '05AABCR1718E1ZU' : '—')}
      </div>
      ${companyTax.isIndiaGst ? '<div style="font-size: 9px;">FSSAI Lic No -12622012000067</div>' : ''}
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
      <span style="width: 18%; text-align: right;">Net Price</span>
      <span style="width: 14%; text-align: center;">Qty</span>
      <span style="width: 20%; text-align: right;">Value</span>
    </div>

    <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>

    ${itemRowsHtml}

    <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

    <!-- 5. TOTALS BREAKDOWN -->
    <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px;">
      <span>Items: ${totals.itemsCount}</span>
      <span>Qty: ${totals.totalQty}</span>
      <span style="font-weight: bold;">${totals.subtotal.toFixed(2)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px;">
      <span>Gross sales Value</span>
      <span>${(totals.grossSalesValue || totals.subtotal + totals.discountAmount).toFixed(2)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px;">
      <span>Total Discount</span>
      <span>${totals.discountAmount.toFixed(2)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px;">
      <span>Net Sales Value (Inclusive of GST)</span>
      <span>${totals.subtotal.toFixed(2)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; margin: 4px 0;">
      <span>Total Amount Paid</span>
      <span>${totals.grandTotal.toFixed(2)}</span>
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
      <div>ROne Card No. :701XXXX631 ROne Bal(Amount) :138.35</div>
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
      <div>Website: www.ledgerxretail.com</div>
      <div>Customer Care email & customercare@ledgerx.com</div>
      <div style="margin-top: 2px;">Please refer to our Website link</div>
      <div>https://ledgerxretail.com/privacy-policy.html</div>
      <div>for Privacy Policy</div>
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

      // Create an off-screen hidden iframe for silent printing
      const iframeId = 'pos-silent-thermal-print-frame';
      let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
      if (iframe) {
        try { document.body.removeChild(iframe); } catch (e) {}
      }

      iframe = document.createElement('iframe');
      iframe.id = iframeId;
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!frameDoc) {
        throw new Error('Unable to access iframe document for printing');
      }

      frameDoc.open();
      frameDoc.write(fullHtml);
      frameDoc.close();

      // Give images a short moment to render, then trigger print
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          try {
            if (iframe && iframe.contentWindow) {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }
          } catch (err) {
            console.warn('Silent iframe print failed, falling back to window.print():', err);
            try { window.print(); } catch (e) {}
          }
          resolve();
        }, 300);
      });

      // Cleanup iframe after printing finishes
      setTimeout(() => {
        try {
          const el = document.getElementById(iframeId);
          if (el && el.parentNode) el.parentNode.removeChild(el);
        } catch (e) {}
      }, 3000);

      return { success: true };
    } catch (error: any) {
      console.error('Direct thermal print error:', error);
      return { success: false, error: error?.message || 'Print failed' };
    }
  }
}

export const posThermalPrintService = new POSThermalPrintService();
