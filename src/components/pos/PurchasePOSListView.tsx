"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { generateBarcodeSvg, generateNextUniqueBarcode, printBarcodeLabels, BarcodeLabelData } from '@/lib/pos/barcodeGenerator';
import { companyDataFolderService } from '@/lib/companyDataFolderService';
import { offlineSyncService } from '@/lib/offlineSyncService';

export interface POSPurchaseItem {
  id: number;
  sNo: number;
  name: string;
  purchasePrice: number;       // Initial purchase price with tax
  newPurchasePrice: number;    // Latest purchase price with tax from recent Purchase vouchers
  expiryDate: string;          // DD/MM/YYYY
  cessPerc: number;            // CESS %
  openingStock: number;        // Live stock available
  barcode: string;             // Auto unique or scanned barcode
  mrp: number;                 // Maximum Retail Price
  discountPerc: number;        // Discount in %
  discountAmt: number;         // Discount in Amount
  retailSalePrice: number;     // MRP - Discount
  unit: string;
  gstRate: number;
  variants?: string[];
}

interface PurchasePOSListViewProps {
  company: any;
  stockItems: any[];
  vouchers: any[];
  onBack: () => void;
  onStockUpdated?: (updatedStock: any[]) => void;
}

export default function PurchasePOSListView({
  company,
  stockItems = [],
  vouchers = [],
  onBack,
  onStockUpdated,
}: PurchasePOSListViewProps) {
  const [items, setItems] = useState<POSPurchaseItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState('');
  const [printModalItem, setPrintModalItem] = useState<POSPurchaseItem | null>(null);
  const [printCount, setPrintCount] = useState<number>(1);
  const [printLayout, setPrintLayout] = useState<'roll_50x25' | 'a4_sheet'>('roll_50x25');
  const [showBulkPrintModal, setShowBulkPrintModal] = useState(false);
  const [bulkPrintLayout, setBulkPrintLayout] = useState<'roll_50x25' | 'a4_sheet'>('roll_50x25');

  const barcodeInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // 1. Calculate live stock from vouchers
  const calculateLiveStock = (item: any): number => {
    let stock = Number(item.openingQty) || 0;
    const targetId = Number(item.id);
    const targetName = (item.name || '').trim().toLowerCase();

    for (const v of vouchers || []) {
      if (!v.inventoryEntries || !Array.isArray(v.inventoryEntries)) continue;
      for (const ie of v.inventoryEntries) {
        const matchId = Number(ie.stockItemId || ie.itemId);
        const matchName = (ie.itemName || '').trim().toLowerCase();
        if (matchId === targetId || (matchName && matchName === targetName)) {
          const q = Number(ie.qty) || 0;
          if (v.type === 'Purchase' || v.type === 'Sales Return' || v.type === 'Credit Note') {
            stock += q;
          } else if (v.type === 'Sales' || v.type === 'Purchase Return' || v.type === 'Debit Note') {
            stock -= q;
          } else if (v.type === 'Manufacturing Journal' || v.type === 'Manufacturing') {
            const isProd = ie.entryType === 'Production' || (ie.desc1 && ie.desc1.includes('Production'));
            if (isProd) stock += q;
            else stock -= q;
          }
        }
      }
    }
    return Math.round(stock * 100) / 100;
  };

  // 2. Resolve initial and latest purchase prices (with tax)
  const resolvePurchasePrices = (item: any): { purchasePrice: number; newPurchasePrice: number } => {
    const gstRate = Number(item.gstRate) || 0;
    const baseOpeningRate = Number(item.openingRate) || 0;
    
    // Initial Purchase Price with Tax
    const initialPriceWithTax = item.showInclTax || item.rateInclTax
      ? Number(item.rateInclTax || baseOpeningRate)
      : Math.round(baseOpeningRate * (1 + gstRate / 100) * 100) / 100;

    // Check Purchase Vouchers (F9) for the latest purchase price with tax
    let latestRateWithTax = 0;
    let latestVoucherDate = 0;
    const targetId = Number(item.id);
    const targetName = (item.name || '').trim().toLowerCase();

    for (const v of vouchers || []) {
      if (v.type !== 'Purchase' || !v.inventoryEntries || !Array.isArray(v.inventoryEntries)) continue;
      const vDate = new Date(v.date || v.createdAt || 0).getTime();
      for (const ie of v.inventoryEntries) {
        const matchId = Number(ie.stockItemId || ie.itemId);
        const matchName = (ie.itemName || '').trim().toLowerCase();
        if (matchId === targetId || (matchName && matchName === targetName)) {
          if (vDate >= latestVoucherDate) {
            latestVoucherDate = vDate;
            const rate = Number(ie.rate) || 0;
            const itemGst = Number(ie.gstRate ?? gstRate) || 0;
            latestRateWithTax = ie.rateInclTax 
              ? Number(ie.rateInclTax) 
              : Math.round(rate * (1 + itemGst / 100) * 100) / 100;
          }
        }
      }
    }

    // If latest purchase rate exists and differs from initial, report as newPurchasePrice
    const newPrice = (latestRateWithTax > 0 && latestRateWithTax !== initialPriceWithTax)
      ? latestRateWithTax
      : (latestRateWithTax > 0 ? latestRateWithTax : 0);

    return {
      purchasePrice: initialPriceWithTax,
      newPurchasePrice: newPrice,
    };
  };

  // 3. Initialize list from stockItems and saved configuration
  useEffect(() => {
    const savedKey = `ledgerx_pos_purchase_list_${company?.id || 1}`;
    let savedList: any[] = [];
    try {
      const raw = localStorage.getItem(savedKey);
      if (raw) savedList = JSON.parse(raw);
    } catch (e) {}

    const assignedBarcodes: string[] = [];

    const built: POSPurchaseItem[] = (stockItems || []).map((si, idx) => {
      const saved = savedList.find((s: any) => s.id === si.id || s.name === si.name) || {};
      const { purchasePrice, newPurchasePrice } = resolvePurchasePrices(si);
      const liveStock = calculateLiveStock(si);

      // Barcode resolution: saved barcode > si.barcode > generated unique barcode
      let barcode = String(saved.barcode || si.barcode || '').trim();
      if (!barcode) {
        barcode = generateNextUniqueBarcode(assignedBarcodes);
      }
      assignedBarcodes.push(barcode);

      // MRP and discount resolution
      const mrp = Number(saved.mrp !== undefined ? saved.mrp : (si.mrp || purchasePrice * 1.2 || 0));
      let discountPerc = Number(saved.discountPerc !== undefined ? saved.discountPerc : (si.defaultDiscount || 0));
      let discountAmt = Number(saved.discountAmt !== undefined ? saved.discountAmt : (mrp > 0 && discountPerc > 0 ? (mrp * discountPerc) / 100 : 0));
      let retailSalePrice = Number(saved.retailSalePrice !== undefined ? saved.retailSalePrice : (si.retailSalePrice || Math.max(0, mrp - discountAmt)));

      // If retail price wasn't set, default to MRP - discount
      if (!retailSalePrice || retailSalePrice <= 0) {
        retailSalePrice = Math.max(0, mrp - discountAmt);
      }

      return {
        id: si.id,
        sNo: idx + 1,
        name: si.name,
        purchasePrice,
        newPurchasePrice,
        expiryDate: saved.expiryDate || si.expiryDate || '',
        cessPerc: Number(saved.cessPerc !== undefined ? saved.cessPerc : (si.cessPerc || 0)),
        openingStock: liveStock,
        barcode,
        mrp: Math.round(mrp * 100) / 100,
        discountPerc: Math.round(discountPerc * 100) / 100,
        discountAmt: Math.round(discountAmt * 100) / 100,
        retailSalePrice: Math.round(retailSalePrice * 100) / 100,
        unit: si.unitName || si.unit?.name || 'NOS',
        gstRate: Number(si.gstRate) || 0,
        variants: saved.variants || si.variants || [],
      };
    });

    setItems(built);
  }, [stockItems, vouchers, company]);

  // 4. Two-way discount & retail price calculation handlers
  const handleUpdateItem = (id: number, field: keyof POSPurchaseItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };

      if (field === 'mrp') {
        const mrp = Math.max(0, Number(value) || 0);
        updated.mrp = mrp;
        if (updated.discountPerc > 0) {
          updated.discountAmt = Math.round((mrp * updated.discountPerc / 100) * 100) / 100;
        }
        updated.retailSalePrice = Math.round(Math.max(0, mrp - updated.discountAmt) * 100) / 100;
      } 
      else if (field === 'discountPerc') {
        const perc = Math.max(0, Math.min(100, Number(value) || 0));
        updated.discountPerc = perc;
        updated.discountAmt = Math.round((updated.mrp * perc / 100) * 100) / 100;
        updated.retailSalePrice = Math.round(Math.max(0, updated.mrp - updated.discountAmt) * 100) / 100;
      } 
      else if (field === 'discountAmt') {
        const amt = Math.max(0, Number(value) || 0);
        updated.discountAmt = amt;
        updated.discountPerc = updated.mrp > 0 ? Math.round((amt / updated.mrp * 100) * 100) / 100 : 0;
        updated.retailSalePrice = Math.round(Math.max(0, updated.mrp - amt) * 100) / 100;
      }
      else if (field === 'retailSalePrice') {
        const rsp = Math.max(0, Number(value) || 0);
        updated.retailSalePrice = rsp;
        if (updated.mrp > rsp) {
          updated.discountAmt = Math.round((updated.mrp - rsp) * 100) / 100;
          updated.discountPerc = Math.round((updated.discountAmt / updated.mrp * 100) * 100) / 100;
        } else {
          updated.discountAmt = 0;
          updated.discountPerc = 0;
        }
      }

      return updated;
    }));
  };

  // 5. Insert new product row directly
  const handleInsertRow = () => {
    const newId = Date.now();
    const existingBarcodes = items.map(i => i.barcode);
    const newBarcode = generateNextUniqueBarcode(existingBarcodes);

    const newItem: POSPurchaseItem = {
      id: newId,
      sNo: items.length + 1,
      name: `NEW ITEM ${items.length + 1}`,
      purchasePrice: 0,
      newPurchasePrice: 0,
      expiryDate: '',
      cessPerc: 0,
      openingStock: 0,
      barcode: newBarcode,
      mrp: 0,
      discountPerc: 0,
      discountAmt: 0,
      retailSalePrice: 0,
      unit: 'NOS',
      gstRate: 18,
      variants: [],
    };

    setItems(prev => [...prev, newItem]);
  };

  // 6. Delete row from list
  const handleDeleteRow = (id: number) => {
    if (confirm('Are you sure you want to remove this item from the Purchase POS List?')) {
      setItems(prev => prev.filter(i => i.id !== id).map((it, idx) => ({ ...it, sNo: idx + 1 })));
    }
  };

  // 7. Auto-generate missing unique barcodes
  const handleAutoGenerateMissingBarcodes = () => {
    const existing = items.map(i => i.barcode).filter(Boolean);
    let count = 0;
    setItems(prev => prev.map(item => {
      if (!item.barcode || !item.barcode.trim()) {
        const nextCode = generateNextUniqueBarcode(existing);
        existing.push(nextCode);
        count++;
        return { ...item, barcode: nextCode };
      }
      return item;
    }));
    alert(`Assigned unique barcodes for ${count} items!`);
  };

  // 8. Save all changes to local disk & sync with stockItems
  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveToast('');
    try {
      const savedKey = `ledgerx_pos_purchase_list_${company?.id || 1}`;
      if (typeof window !== 'undefined') {
        localStorage.setItem(savedKey, JSON.stringify(items));
      }

      // Merge updated fields back into stockItems
      const updatedStockItems = (stockItems || []).map(si => {
        const found = items.find(it => it.id === si.id || it.name === si.name);
        if (found) {
          return {
            ...si,
            barcode: found.barcode,
            mrp: found.mrp,
            discountPerc: found.discountPerc,
            discountAmt: found.discountAmt,
            retailSalePrice: found.retailSalePrice,
            expiryDate: found.expiryDate,
            cessPerc: found.cessPerc,
          };
        }
        return si;
      });

      // Save to local company folder
      const folderCode = companyDataFolderService.getCompanyFolderCode(company);
      await companyDataFolderService.saveCompanyFolder({
        companyCode: folderCode,
        stockItems: updatedStockItems,
      });

      if (onStockUpdated) {
        onStockUpdated(updatedStockItems);
      }

      setSaveToast('✓ Purchase POS List saved successfully!');
      setTimeout(() => setSaveToast(''), 3000);
    } catch (e: any) {
      alert('Save failed: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveAll();
      } else if (e.key === 'Escape' && !printModalItem && !showBulkPrintModal) {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, printModalItem, showBulkPrintModal]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      i => (i.name && i.name.toLowerCase().includes(q)) ||
           (i.barcode && i.barcode.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Segoe UI, Arial, sans-serif' }}>
      
      {/* Top Header & Ribbon */}
      <div style={{ background: 'linear-gradient(180deg, #1e3a5f 0%, #152942 100%)', color: '#ffffff', padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0284c7', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onBack}
            style={{
              background: '#334155',
              color: '#ffffff',
              border: '1px solid #475569',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ← Back (Esc)
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📋</span> Purchase POS List & Barcode Master
            </h1>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Company: <b style={{ color: '#38bdf8' }}>{company?.name || 'Aiman Polymers'}</b> | Code: <b>{company?.companyCode || '10000'}</b> | Live Auto-sync with POS Sale & Sales Register
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="text"
            placeholder="🔍 Search product or barcode..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 6,
              border: '1px solid #0284c7',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: 13,
              width: 240,
              outline: 'none',
            }}
          />

          <button
            onClick={handleAutoGenerateMissingBarcodes}
            title="Generate unique barcodes for items without barcode"
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            ⚡ Auto Barcodes
          </button>

          <button
            onClick={() => setShowBulkPrintModal(true)}
            title="Print barcode labels for all items"
            style={{
              background: '#7c3aed',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            🖨️ Print All Barcodes
          </button>

          <button
            onClick={handleInsertRow}
            style={{
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            ➕ Insert Item
          </button>

          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '7px 18px',
              fontSize: 13,
              fontWeight: 900,
              cursor: isSaving ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.4)',
            }}
          >
            {isSaving ? 'Saving...' : '💾 Save (Ctrl+S)'}
          </button>
        </div>
      </div>

      {saveToast && (
        <div style={{ background: '#16a34a', color: '#ffffff', padding: '6px 16px', textAlign: 'center', fontSize: 13, fontWeight: 'bold' }}>
          {saveToast}
        </div>
      )}

      {/* Main Excel-Style Grid Table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
        <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden', background: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
            <thead>
              {/* Golden Yellow Header matching uploaded screenshot */}
              <tr style={{ background: '#eab308', color: '#000000', fontWeight: 900, textTransform: 'capitalize', borderBottom: '2px solid #ca8a04', whiteSpace: 'nowrap' }}>
                <th style={{ padding: '9px 8px', borderRight: '1px solid #d4a373', width: 45, textAlign: 'center' }}>S.no</th>
                <th style={{ padding: '9px 12px', borderRight: '1px solid #d4a373', minWidth: 160 }}>Product Name</th>
                <th style={{ padding: '9px 10px', borderRight: '1px solid #d4a373', textAlign: 'right', minWidth: 100 }}>Purchase Price</th>
                <th style={{ padding: '9px 10px', borderRight: '1px solid #d4a373', textAlign: 'right', minWidth: 120 }}>New Purchase Price</th>
                <th style={{ padding: '9px 10px', borderRight: '1px solid #d4a373', textAlign: 'center', minWidth: 105 }}>Expiry Date</th>
                <th style={{ padding: '9px 8px', borderRight: '1px solid #d4a373', textAlign: 'right', width: 65 }}>CESS%</th>
                <th style={{ padding: '9px 10px', borderRight: '1px solid #d4a373', textAlign: 'right', minWidth: 95 }}>Openning Stock</th>
                <th style={{ padding: '9px 10px', borderRight: '1px solid #d4a373', minWidth: 135 }}>Barcode</th>
                <th style={{ padding: '9px 10px', borderRight: '1px solid #d4a373', textAlign: 'right', minWidth: 80 }}>MRP</th>
                <th style={{ padding: '9px 10px', borderRight: '1px solid #d4a373', textAlign: 'right', minWidth: 140 }}>Discount% in percentage</th>
                <th style={{ padding: '9px 10px', borderRight: '1px solid #d4a373', textAlign: 'right', minWidth: 125 }}>Discount in Amount</th>
                <th style={{ padding: '9px 12px', borderRight: '1px solid #d4a373', textAlign: 'right', minWidth: 110, background: '#f59e0b', color: '#000000', fontWeight: 900 }}>Retail Sale Price</th>
                <th style={{ padding: '9px 8px', borderRight: '1px solid #d4a373', textAlign: 'center', width: 60 }}>insert</th>
                <th style={{ padding: '9px 8px', borderRight: '1px solid #d4a373', textAlign: 'center', width: 60 }}>delete</th>
                <th style={{ padding: '9px 10px', borderRight: '1px solid #d4a373', textAlign: 'center', width: 100 }}>print Barcode</th>
                <th style={{ padding: '9px 8px', textAlign: 'center', width: 70 }}>Variant</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={16} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No stock items found. Click <b>➕ Insert Item</b> to add your first product.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isSelected = selectedItemId === item.id;
                  const rowBg = isSelected ? '#eff6ff' : (idx % 2 === 0 ? '#ffffff' : '#fcfcfc');

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      style={{
                        background: rowBg,
                        borderBottom: '1px solid #e2e8f0',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* 1. S.no */}
                      <td style={{ padding: '6px 8px', textAlign: 'center', borderRight: '1px solid #e2e8f0', fontWeight: 'bold', color: '#64748b' }}>
                        {item.sNo}
                      </td>

                      {/* 2. Product Name */}
                      <td style={{ padding: '4px 6px', borderRight: '1px solid #e2e8f0' }}>
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => handleUpdateItem(item.id, 'name', e.target.value)}
                          style={{
                            width: '100%',
                            border: '1px solid transparent',
                            background: 'transparent',
                            padding: '4px 6px',
                            fontWeight: 700,
                            color: '#0f172a',
                            borderRadius: 4,
                            outline: 'none',
                          }}
                          onFocus={e => (e.target.style.border = '1px solid #0284c7')}
                          onBlur={e => (e.target.style.border = '1px solid transparent')}
                        />
                      </td>

                      {/* 3. Purchase Price (Initial with tax) */}
                      <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '1px solid #e2e8f0', fontWeight: 'bold', color: '#334155' }}>
                        ₹{item.purchasePrice.toFixed(2)}
                      </td>

                      {/* 4. New Purchase Price (Latest with tax from F9) */}
                      <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '1px solid #e2e8f0', fontWeight: 'bold', color: item.newPurchasePrice > 0 ? (item.newPurchasePrice > item.purchasePrice ? '#dc2626' : '#16a34a') : '#64748b' }}>
                        {item.newPurchasePrice > 0 ? `₹${item.newPurchasePrice.toFixed(2)}` : '0'}
                      </td>

                      {/* 5. Expiry Date */}
                      <td style={{ padding: '4px 6px', borderRight: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <input
                          type="text"
                          placeholder="DD/MM/YYYY"
                          value={item.expiryDate}
                          onChange={e => handleUpdateItem(item.id, 'expiryDate', e.target.value)}
                          style={{
                            width: 95,
                            textAlign: 'center',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            borderRadius: 4,
                            padding: '3px 4px',
                            fontSize: 11,
                            outline: 'none',
                          }}
                        />
                      </td>

                      {/* 6. CESS% */}
                      <td style={{ padding: '4px 6px', borderRight: '1px solid #e2e8f0', textAlign: 'right' }}>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={item.cessPerc || ''}
                          onChange={e => handleUpdateItem(item.id, 'cessPerc', parseFloat(e.target.value) || 0)}
                          style={{
                            width: 50,
                            textAlign: 'right',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            borderRadius: 4,
                            padding: '3px 4px',
                            fontSize: 11,
                            outline: 'none',
                          }}
                        />
                      </td>

                      {/* 7. Opening Stock (Live real-time quantity) */}
                      <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '1px solid #e2e8f0', fontWeight: 900, color: item.openingStock > 0 ? '#16a34a' : '#dc2626' }}>
                        {item.openingStock} <span style={{ fontSize: 10, color: '#64748b' }}>{item.unit}</span>
                      </td>

                      {/* 8. Barcode (Auto-generated or hardware scanned) */}
                      <td style={{ padding: '4px 6px', borderRight: '1px solid #e2e8f0' }}>
                        <input
                          ref={el => { barcodeInputRefs.current[item.id] = el; }}
                          type="text"
                          value={item.barcode}
                          placeholder="Scan / Type Code"
                          onChange={e => handleUpdateItem(item.id, 'barcode', e.target.value)}
                          style={{
                            width: '100%',
                            border: '1.5px solid #0284c7',
                            background: '#f0f9ff',
                            color: '#0369a1',
                            fontWeight: 800,
                            borderRadius: 4,
                            padding: '3px 6px',
                            fontSize: 11,
                            letterSpacing: 0.5,
                            outline: 'none',
                          }}
                        />
                      </td>

                      {/* 9. MRP */}
                      <td style={{ padding: '4px 6px', borderRight: '1px solid #e2e8f0', textAlign: 'right' }}>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={item.mrp || ''}
                          onChange={e => handleUpdateItem(item.id, 'mrp', parseFloat(e.target.value) || 0)}
                          style={{
                            width: 70,
                            textAlign: 'right',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            borderRadius: 4,
                            padding: '3px 4px',
                            fontSize: 11,
                            fontWeight: 'bold',
                            outline: 'none',
                          }}
                        />
                      </td>

                      {/* 10. Discount% in percentage */}
                      <td style={{ padding: '4px 6px', borderRight: '1px solid #e2e8f0', textAlign: 'right' }}>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={item.discountPerc || ''}
                          placeholder="0%"
                          onChange={e => handleUpdateItem(item.id, 'discountPerc', parseFloat(e.target.value) || 0)}
                          style={{
                            width: 65,
                            textAlign: 'right',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            borderRadius: 4,
                            padding: '3px 4px',
                            fontSize: 11,
                            outline: 'none',
                          }}
                        />
                      </td>

                      {/* 11. Discount in Amount */}
                      <td style={{ padding: '4px 6px', borderRight: '1px solid #e2e8f0', textAlign: 'right' }}>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={item.discountAmt || ''}
                          placeholder="₹0"
                          onChange={e => handleUpdateItem(item.id, 'discountAmt', parseFloat(e.target.value) || 0)}
                          style={{
                            width: 65,
                            textAlign: 'right',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            borderRadius: 4,
                            padding: '3px 4px',
                            fontSize: 11,
                            outline: 'none',
                          }}
                        />
                      </td>

                      {/* 12. Retail Sale Price (MRP - Discount) */}
                      <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid #e2e8f0', fontWeight: 900, fontSize: 13, color: '#0369a1', background: '#fef3c7' }}>
                        ₹{item.retailSalePrice.toFixed(2)}
                      </td>

                      {/* 13. Action: insert */}
                      <td style={{ padding: '4px 6px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                        <button
                          onClick={handleInsertRow}
                          title="Insert row"
                          style={{
                            background: '#e0f2fe',
                            color: '#0284c7',
                            border: '1px solid #bae6fd',
                            borderRadius: 4,
                            padding: '2px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          insert
                        </button>
                      </td>

                      {/* 14. Action: delete */}
                      <td style={{ padding: '4px 6px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                        <button
                          onClick={() => handleDeleteRow(item.id)}
                          title="Delete row"
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: 4,
                            padding: '2px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          delete
                        </button>
                      </td>

                      {/* 15. Action: print Barcode */}
                      <td style={{ padding: '4px 6px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                        <button
                          onClick={() => {
                            setPrintModalItem(item);
                            setPrintCount(Math.max(1, Math.min(50, Math.round(item.openingStock) || 1)));
                          }}
                          title="Print Barcode sticker"
                          style={{
                            background: '#f3e8ff',
                            color: '#7c3aed',
                            border: '1px solid #e9d5ff',
                            borderRadius: 4,
                            padding: '2px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          print Barcode
                        </button>
                      </td>

                      {/* 16. Action: Variant */}
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            const vStr = prompt('Enter variants (comma separated, e.g. Red, Blue, 1kg):', (item.variants || []).join(', '));
                            if (vStr !== null) {
                              const vars = vStr.split(',').map(s => s.trim()).filter(Boolean);
                              handleUpdateItem(item.id, 'variants', vars);
                            }
                          }}
                          title="Configure item variants"
                          style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: 4,
                            padding: '2px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Variant {item.variants && item.variants.length > 0 ? `(${item.variants.length})` : ''}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info & Instructions */}
      <div style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '8px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
        <div>
          💡 <b>Tip:</b> Click into the <b>Barcode</b> column and scan any product with your barcode gun to auto-save its code. Edit <b>MRP</b> or <b>Discount</b> to automatically recalculate <b>Retail Sale Price</b> for Sale POS and Rubic POS.
        </div>
        <div>
          Total Products: <b style={{ color: '#0f172a' }}>{items.length}</b> | In Stock: <b style={{ color: '#16a34a' }}>{items.filter(i => i.openingStock > 0).length}</b>
        </div>
      </div>

      {/* ================= MODAL: Single Item Barcode Label Print ================= */}
      {printModalItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: '#ffffff', borderRadius: 8, padding: 20, width: 420, maxWidth: '90vw', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', border: '2px solid #0284c7' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 900, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🏷️</span> Print Barcode Sticker: {printModalItem.name}
            </h3>

            {/* Sticker Preview Box */}
            <div style={{ border: '1px dashed #cbd5e1', borderRadius: 6, padding: '10px 14px', background: '#f8fafc', marginBottom: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#475569' }}>{company?.name || 'STORE'}</div>
              <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a', margin: '2px 0 6px 0' }}>{printModalItem.name}</div>
              <div
                style={{ height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0' }}
                dangerouslySetInnerHTML={{
                  __html: generateBarcodeSvg(printModalItem.barcode, { height: 32, moduleWidth: 1.2, showText: true, fontSize: 10 })
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 'bold', borderTop: '1px solid #cbd5e1', paddingTop: 4, marginTop: 4 }}>
                <span style={{ color: '#64748b' }}>MRP: ₹{printModalItem.mrp.toFixed(2)}</span>
                <span style={{ color: '#0284c7', fontWeight: 900 }}>OUR: ₹{printModalItem.retailSalePrice.toFixed(2)}</span>
              </div>
              <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>
                {printModalItem.expiryDate ? `EXP: ${printModalItem.expiryDate}` : 'Incl. of all taxes'}
              </div>
            </div>

            {/* Print Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Number of Copies (Stickers):</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 5, 10, printModalItem.openingStock > 0 ? Math.round(printModalItem.openingStock) : 20].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setPrintCount(cnt)}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        borderRadius: 4,
                        border: printCount === cnt ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        background: printCount === cnt ? '#eff6ff' : '#ffffff',
                        fontWeight: 'bold',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {cnt}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={printCount}
                    onChange={e => setPrintCount(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: 65, textAlign: 'center', padding: '4px', borderRadius: 4, border: '1px solid #cbd5e1', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Label Paper Format:</label>
                <select
                  value={printLayout}
                  onChange={e => setPrintLayout(e.target.value as any)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                >
                  <option value="roll_50x25">Thermal Barcode Roll (50mm × 25mm / Continuous Roll)</option>
                  <option value="a4_sheet">A4 Sticker Sheet (24-up / 3 Columns × 8 Rows)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setPrintModalItem(null)}
                style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  printBarcodeLabels([{
                    companyName: company?.name || 'STORE',
                    productName: printModalItem.name,
                    barcode: printModalItem.barcode,
                    mrp: printModalItem.mrp,
                    retailPrice: printModalItem.retailSalePrice,
                    expiryDate: printModalItem.expiryDate,
                    count: printCount,
                  }], printLayout);
                  setPrintModalItem(null);
                }}
                style={{ padding: '7px 18px', borderRadius: 6, border: 'none', background: '#7c3aed', color: '#ffffff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
              >
                🖨️ Print {printCount} Label(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: Bulk All Items Barcode Label Print ================= */}
      {showBulkPrintModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: '#ffffff', borderRadius: 8, padding: 22, width: 440, maxWidth: '90vw', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', border: '2px solid #7c3aed' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: 16, fontWeight: 900, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🖨️</span> Bulk Print All Barcodes
            </h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
              This will generate scannable barcode stickers for all <b>{items.length} products</b> in this company.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>Select Label Format:</label>
              <select
                value={bulkPrintLayout}
                onChange={e => setBulkPrintLayout(e.target.value as any)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                <option value="roll_50x25">Thermal Barcode Roll (50mm × 25mm / 1 label per page)</option>
                <option value="a4_sheet">A4 Sticker Sheet (24 labels per page / 3 columns)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setShowBulkPrintModal(false)}
                style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const bulkData: BarcodeLabelData[] = items.map(it => ({
                    companyName: company?.name || 'STORE',
                    productName: it.name,
                    barcode: it.barcode,
                    mrp: it.mrp,
                    retailPrice: it.retailSalePrice,
                    expiryDate: it.expiryDate,
                    count: 1,
                  }));
                  printBarcodeLabels(bulkData, bulkPrintLayout);
                  setShowBulkPrintModal(false);
                }}
                style={{ padding: '7px 18px', borderRadius: 6, border: 'none', background: '#7c3aed', color: '#ffffff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
              >
                🖨️ Generate & Print ({items.length} Labels)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
