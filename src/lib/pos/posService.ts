/**
 * LedgerX Retail POS (Point of Sale) Engine
 * Handles tax-inclusive calculations, barcode lookup, bill management,
 * stock deduction, and offline company persistence.
 */

import { companyDataFolderService } from '../companyDataFolderService';
import { offlineSyncService } from '../offlineSyncService';

export interface POSCartItem {
  cartId: string;
  itemId: number;
  name: string;
  barcode?: string;
  hsnCode?: string;
  unit: string;
  qty: number;
  rateWithTax: number;     // User requirement: Price WITH TAX (Inclusive / MRP)
  taxableRate: number;     // Base rate without tax
  gstRate: number;         // 0, 5, 12, 18, 28
  taxAmount: number;       // Total GST for line
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  discountPerc: number;
  discountAmt: number;
  lineTotal: number;       // Final amount with tax
  stockAvailable: number;
}

export interface POSCartTotals {
  subtotal: number;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  discountAmount: number;
  roundOff: number;
  grandTotal: number;
  itemsCount: number;
  totalQty: number;
}

export interface POSCustomer {
  name: string;
  mobile: string;
  gstin?: string;
  address?: string;
}

export interface POSPaymentDetails {
  mode: 'Cash' | 'UPI_QR' | 'Card' | 'Credit' | 'Split';
  cashTendered: number;
  changeDue: number;
  upiRef?: string;
  cardRef?: string;
  cardLast4?: string;
  customerLedgerId?: number;
}

export interface POSHeldBill {
  id: string;
  billNo: string;
  heldAt: string;
  customer: POSCustomer;
  items: POSCartItem[];
  totals: POSCartTotals;
  note?: string;
}

export class POSService {
  /**
   * Calculates backward tax-inclusive amounts
   * Given priceWithTax = 118, gstRate = 18 => taxable = 100, gst = 18
   */
  public calcTaxInclusive(priceWithTax: number, gstRate: number, isInterState = false) {
    const rateWithTax = Number(priceWithTax) || 0;
    const gst = Number(gstRate) || 0;

    let taxableRate = rateWithTax;
    let taxAmount = 0;

    if (gst > 0) {
      taxableRate = Math.round((rateWithTax / (1 + gst / 100)) * 100) / 100;
      taxAmount = Math.round((rateWithTax - taxableRate) * 100) / 100;
    }

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (isInterState) {
      igstAmount = taxAmount;
    } else {
      cgstAmount = Math.round((taxAmount / 2) * 100) / 100;
      sgstAmount = Math.round((taxAmount - cgstAmount) * 100) / 100;
    }

    return {
      rateWithTax,
      taxableRate,
      taxAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
    };
  }

  /**
   * Recalculates line item with discounts and tax
   */
  public calculateLineItem(
    item: {
      itemId: number;
      name: string;
      barcode?: string;
      hsnCode?: string;
      unit: string;
      qty: number;
      rateWithTax: number;
      gstRate: number;
      discountPerc?: number;
      stockAvailable: number;
    },
    isInterState = false,
    existingCartId?: string
  ): POSCartItem {
    const qty = Math.max(0.001, Number(item.qty) || 1);
    const origRateWithTax = Number(item.rateWithTax) || 0;
    const discPerc = Number(item.discountPerc) || 0;
    const discAmt = discPerc > 0 ? (origRateWithTax * discPerc) / 100 : 0;
    const netRateWithTax = Math.max(0, origRateWithTax - discAmt);

    const taxInfo = this.calcTaxInclusive(netRateWithTax, item.gstRate, isInterState);
    const lineTotal = Math.round(netRateWithTax * qty * 100) / 100;

    return {
      cartId: existingCartId || `pos_item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      itemId: item.itemId,
      name: item.name,
      barcode: item.barcode,
      hsnCode: item.hsnCode,
      unit: item.unit || 'NOS',
      qty,
      rateWithTax: origRateWithTax,
      taxableRate: taxInfo.taxableRate,
      gstRate: item.gstRate || 0,
      taxAmount: Math.round(taxInfo.taxAmount * qty * 100) / 100,
      cgstAmount: Math.round(taxInfo.cgstAmount * qty * 100) / 100,
      sgstAmount: Math.round(taxInfo.sgstAmount * qty * 100) / 100,
      igstAmount: Math.round(taxInfo.igstAmount * qty * 100) / 100,
      discountPerc: discPerc,
      discountAmt: Math.round(discAmt * qty * 100) / 100,
      lineTotal,
      stockAvailable: item.stockAvailable,
    };
  }

  /**
   * Calculates grand totals, taxes, and round off for cart
   */
  public calculateCartTotals(items: POSCartItem[], globalDiscountPerc = 0): POSCartTotals {
    let subtotal = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalTax = 0;
    let totalQty = 0;

    for (const item of items) {
      subtotal += item.lineTotal;
      totalTaxable += item.taxableRate * item.qty;
      totalCgst += item.cgstAmount;
      totalSgst += item.sgstAmount;
      totalIgst += item.igstAmount;
      totalTax += item.taxAmount;
      totalQty += item.qty;
    }

    subtotal = Math.round(subtotal * 100) / 100;
    totalTaxable = Math.round(totalTaxable * 100) / 100;
    totalCgst = Math.round(totalCgst * 100) / 100;
    totalSgst = Math.round(totalSgst * 100) / 100;
    totalIgst = Math.round(totalIgst * 100) / 100;
    totalTax = Math.round(totalTax * 100) / 100;

    let discountAmount = 0;
    if (globalDiscountPerc > 0) {
      discountAmount = Math.round(((subtotal * globalDiscountPerc) / 100) * 100) / 100;
    }

    const netBeforeRound = Math.max(0, subtotal - discountAmount);
    const grandTotal = Math.round(netBeforeRound);
    const roundOff = Math.round((grandTotal - netBeforeRound) * 100) / 100;

    return {
      subtotal,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax,
      discountAmount,
      roundOff,
      grandTotal,
      itemsCount: items.length,
      totalQty,
    };
  }

  /**
   * Matches barcode / QR code / alias / SKU / name against stockItems
   */
  public matchStockItem(query: string, stockItems: any[]): any | null {
    if (!query || !stockItems || stockItems.length === 0) return null;
    const q = query.trim().toLowerCase();

    // 1. Direct barcode match
    const byBarcode = stockItems.find(
      s => s.barcode && String(s.barcode).trim().toLowerCase() === q
    );
    if (byBarcode) return byBarcode;

    // 2. Direct alias / partNo / SKU match
    const byAlias = stockItems.find(
      s => (s.alias && String(s.alias).trim().toLowerCase() === q) ||
           (s.sku && String(s.sku).trim().toLowerCase() === q) ||
           (s.partNo && String(s.partNo).trim().toLowerCase() === q)
    );
    if (byAlias) return byAlias;

    // 3. Exact HSN match (if unique)
    const byHsn = stockItems.filter(
      s => s.hsnCode && String(s.hsnCode).trim().toLowerCase() === q
    );
    if (byHsn.length === 1) return byHsn[0];

    // 4. Exact Name match
    const byExactName = stockItems.find(
      s => s.name && s.name.trim().toLowerCase() === q
    );
    if (byExactName) return byExactName;

    // 5. Prefix / substring match
    const bySub = stockItems.find(
      s => s.name && s.name.trim().toLowerCase().includes(q)
    );
    if (bySub) return bySub;

    return null;
  }

  /**
   * Generates sequential POS bill number e.g. POS-2627-0001
   */
  public generateBillNo(vouchers: any[], companyCode = '10000'): string {
    const prefix = 'POS';
    const posVouchers = (vouchers || []).filter(
      v => (v.voucherNo && v.voucherNo.startsWith(prefix)) || v.refNo?.startsWith(prefix)
    );
    const nextSeq = posVouchers.length + 1;
    const padded = String(nextSeq).padStart(4, '0');
    return `${prefix}-${padded}`;
  }

  /**
   * Hold & Recall Bills (Local storage queue per company)
   */
  public getHeldBills(companyCode: string): POSHeldBill[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(`ledgerx_pos_held_${companyCode}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  public holdBill(companyCode: string, bill: POSHeldBill): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const list = this.getHeldBills(companyCode);
      list.unshift(bill);
      localStorage.setItem(`ledgerx_pos_held_${companyCode}`, JSON.stringify(list.slice(0, 50)));
      return true;
    } catch (e) {
      return false;
    }
  }

  public deleteHeldBill(companyCode: string, holdId: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const list = this.getHeldBills(companyCode).filter(b => b.id !== holdId);
      localStorage.setItem(`ledgerx_pos_held_${companyCode}`, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Completes a POS Sale:
   * 1. Creates Sales Voucher with all inventory & accounting entries
   * 2. Deducts sold quantities from stockItems
   * 3. Persists to local disk (data/<companyCode>/vouchers.json and stockItems.json)
   * 4. Enqueues for offline sync
   */
  public async finalizePOSSale(params: {
    company: any;
    companyCode: string;
    billNo: string;
    customer: POSCustomer;
    items: POSCartItem[];
    totals: POSCartTotals;
    payment: POSPaymentDetails;
    cashierName: string;
    existingStockItems: any[];
    existingVouchers: any[];
    ledgers: any[];
  }): Promise<{ success: boolean; voucher: any; updatedStockItems: any[]; error?: string }> {
    const {
      company,
      companyCode,
      billNo,
      customer,
      items,
      totals,
      payment,
      cashierName,
      existingStockItems,
      existingVouchers,
      ledgers,
    } = params;

    if (!items || items.length === 0) {
      return { success: false, voucher: null, updatedStockItems: existingStockItems, error: 'Cart is empty!' };
    }

    const cid = Number(company?.id) || 1;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

    // 1. Resolve Accounts / Ledgers
    const cashLedger = ledgers.find(l => l.name.toLowerCase() === 'cash' || l.groupName === 'Cash-in-hand') || {
      id: 9001,
      name: 'Cash',
    };
    const bankLedger = ledgers.find(l => l.groupName === 'Bank Accounts') || cashLedger;
    const salesLedger = ledgers.find(l => l.name.toLowerCase() === 'sales a/c' || l.groupName === 'Sales Accounts') || {
      id: 9002,
      name: 'Sales A/c',
    };
    const cgstLedger = ledgers.find(l => l.name.toUpperCase().includes('CGST')) || { id: 9003, name: 'CGST Payable' };
    const sgstLedger = ledgers.find(l => l.name.toUpperCase().includes('SGST')) || { id: 9004, name: 'SGST Payable' };
    const igstLedger = ledgers.find(l => l.name.toUpperCase().includes('IGST')) || { id: 9005, name: 'IGST Payable' };
    const roundOffLedger = ledgers.find(l => l.name.toLowerCase().includes('round off')) || { id: 9006, name: 'Round Off' };

    let debitLedgerName = 'Cash';
    let debitLedgerId = cashLedger.id;

    if (payment.mode === 'UPI_QR' || payment.mode === 'Card') {
      debitLedgerName = bankLedger.name;
      debitLedgerId = bankLedger.id;
    } else if (payment.mode === 'Credit') {
      debitLedgerName = customer.name || 'Sundry Debtor (POS Customer)';
      debitLedgerId = payment.customerLedgerId || 9099;
    }

    // 2. Build Inventory Entries
    const inventoryEntries = items.map((it, idx) => ({
      id: Date.now() + idx,
      itemId: it.itemId,
      stockItemId: it.itemId,
      itemName: it.name,
      qty: it.qty,
      unit: it.unit || 'NOS',
      rate: it.taxableRate,
      rateInclTax: it.rateWithTax,
      amountInclTax: it.lineTotal,
      amount: Math.round(it.taxableRate * it.qty * 100) / 100,
      taxableAmount: Math.round(it.taxableRate * it.qty * 100) / 100,
      gstRate: it.gstRate,
      hsnCode: it.hsnCode || '',
      discountPerc: it.discountPerc || 0,
      discountAmt: it.discountAmt || 0,
    }));

    // 3. Build Double-Entry Accounting Rows
    const entries: any[] = [
      {
        id: Date.now() + 10,
        ledgerId: debitLedgerId,
        ledgerName: debitLedgerName,
        amount: totals.grandTotal,
        entryType: 'Dr',
        narration: `POS Tender: ${payment.mode} | Bill #${billNo}`,
      },
      {
        id: Date.now() + 20,
        ledgerId: salesLedger.id,
        ledgerName: salesLedger.name,
        amount: totals.totalTaxable,
        entryType: 'Cr',
      },
    ];

    if (totals.totalCgst > 0) {
      entries.push({
        id: Date.now() + 30,
        ledgerId: cgstLedger.id,
        ledgerName: cgstLedger.name,
        amount: totals.totalCgst,
        entryType: 'Cr',
      });
    }
    if (totals.totalSgst > 0) {
      entries.push({
        id: Date.now() + 40,
        ledgerId: sgstLedger.id,
        ledgerName: sgstLedger.name,
        amount: totals.totalSgst,
        entryType: 'Cr',
      });
    }
    if (totals.totalIgst > 0) {
      entries.push({
        id: Date.now() + 50,
        ledgerId: igstLedger.id,
        ledgerName: igstLedger.name,
        amount: totals.totalIgst,
        entryType: 'Cr',
      });
    }
    if (totals.roundOff !== 0) {
      entries.push({
        id: Date.now() + 60,
        ledgerId: roundOffLedger.id,
        ledgerName: roundOffLedger.name,
        amount: Math.abs(totals.roundOff),
        entryType: totals.roundOff > 0 ? 'Cr' : 'Dr',
      });
    }

    // 4. Construct Full Sales Voucher
    const voucherId = Date.now();
    const newVoucher = {
      id: voucherId,
      companyId: cid,
      type: 'Sales',
      date: dateStr,
      number: existingVouchers.length + 1,
      voucherNo: billNo,
      refNo: `POS-${billNo}`,
      partyName: customer.name || 'Cash Customer',
      partyId: debitLedgerId,
      narration: `Retail POS Counter Sale | Cashier: ${cashierName} | Pay Mode: ${payment.mode}${payment.upiRef ? ' Ref: ' + payment.upiRef : ''}`,
      total: totals.grandTotal,
      entries,
      inventoryEntries,
      isPOS: true,
      partyDetails: {
        buyerName: customer.name || 'Walk-in Customer',
        phone: customer.mobile || '',
        gstin: customer.gstin || '',
        address: customer.address || '',
      },
    };

    // 5. Deduct Quantities from Stock Items
    const updatedStockItems = existingStockItems.map(si => {
      const soldItem = items.find(it => it.itemId === si.id);
      if (soldItem) {
        const curQty = Number(si.openingQty) || 0;
        const newQty = Math.max(0, Math.round((curQty - soldItem.qty) * 1000) / 1000);
        return {
          ...si,
          openingQty: newQty,
        };
      }
      return si;
    });

    // 6. Persist to Local Company Folder (data/<companyCode>/)
    try {
      const allUpdatedVouchers = [...existingVouchers, newVoucher];
      await companyDataFolderService.saveCompanyFolder({
        companyCode,
        company,
        vouchers: allUpdatedVouchers,
        stockItems: updatedStockItems,
      });

      // Enqueue for offline sync
      offlineSyncService.enqueue({
        type: 'VOUCHER',
        action: 'CREATE',
        data: newVoucher,
        companyId: cid,
      });
    } catch (saveErr) {
      console.warn('POS folder auto-save notice:', saveErr);
    }

    return {
      success: true,
      voucher: newVoucher,
      updatedStockItems,
    };
  }
}

export const posService = new POSService();

