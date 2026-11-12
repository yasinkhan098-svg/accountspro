"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { generateBarcodeSvg, generateNextUniqueBarcode, printBarcodeLabels, BarcodeLabelData, BarcodePrintLayout } from '@/lib/pos/barcodeGenerator';
import { companyDataFolderService } from '@/lib/companyDataFolderService';
import { resolveUnitString } from '@/lib/unitResolver';
import { permissionGuard } from '@/lib/permissionGuard';

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
  variant?: string;
  variants?: string[];
}

interface PurchasePOSListViewProps {
  company: any;
  availableCompanies?: any[];
  stockItems: any[];
  vouchers: any[];
  onBack: () => void;
  onStockUpdated?: (updatedStock: any[]) => void;
}

// Editable column sequence for Enter key navigation:
// 0: name, 1: expiryDate, 2: cessPerc, 3: barcode, 4: mrp, 5: discountPerc, 6: discountAmt, 7: retailSalePrice
const EDITABLE_COLS_COUNT = 8;

export default function PurchasePOSListView({
  company,
  availableCompanies = [],
  stockItems = [],
  vouchers = [],
  onBack,
  onStockUpdated,
}: PurchasePOSListViewProps) {
  const currencySymbol = useMemo(() => {
    return company?.currencySymbol || company?.baseCurrencySymbol || company?.currency || '₹';
  }, [company]);

  const [items, setItems] = useState<POSPurchaseItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | ''>('');
  const [printModalItem, setPrintModalItem] = useState<POSPurchaseItem | null>(null);
  const [printCount, setPrintCount] = useState<number>(1);
  const [printLayout, setPrintLayout] = useState<BarcodePrintLayout>('a4_40_up');
  const [showBulkPrintModal, setShowBulkPrintModal] = useState(false);
  const [bulkPrintLayout, setBulkPrintLayout] = useState<BarcodePrintLayout>('a4_40_up');
  const [variantModalItem, setVariantModalItem] = useState<POSPurchaseItem | null>(null);
  const [variantInputText, setVariantInputText] = useState<string>('');

  const isInitializedRef = useRef(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const itemsRef = useRef<POSPurchaseItem[]>([]);
  itemsRef.current = items;

  const companyCode = company
    ? companyDataFolderService.getCompanyFolderCode(company, availableCompanies)
    : (company?.companyCode || '10000').toUpperCase().trim();
  const companyId = company?.id || 0;
  const storageKey = `ledgerx_pos_purchase_list_${companyCode}`;

  // 1. Calculate live stock from vouchers
  const calculateLiveStock = useCallback((item: any): number => {
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
  }, [vouchers]);

  // 2. Resolve initial and latest purchase prices (with tax)
  const resolvePurchasePrices = useCallback((item: any): { purchasePrice: number; newPurchasePrice: number } => {
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

    const newPrice = (latestRateWithTax > 0 && latestRateWithTax !== initialPriceWithTax)
      ? latestRateWithTax
      : (latestRateWithTax > 0 ? latestRateWithTax : 0);

    return {
      purchasePrice: initialPriceWithTax,
      newPurchasePrice: newPrice,
    };
  }, [vouchers]);

  // 3. PERSISTENCE ENGINE: Save immediately to Database, Local Disk & Company Folder
  const persistChanges = useCallback(async (currentItems: POSPurchaseItem[]) => {
    if (!currentItems || currentItems.length === 0) return;
    setSaveStatus('saving');
    try {
      // Stamp every item with companyId and companyCode
      const stampedItems = currentItems.map(it => ({
        ...it,
        companyId: companyId,
        companyCode: companyCode,
      }));

      // A. Save to LocalStorage immediately
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(stampedItems));
      }

      // B. Save to Database API /api/pos/purchase-list (both online Turso DB + offline JSON)
      try {
        await fetch('/api/pos/purchase-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: companyId,
            companyCode: companyCode,
            items: stampedItems,
          }),
        });
      } catch (err) {
        console.warn("API save error:", err);
      }

      // C. Save to C# Launcher Bridge and Local Company Folder (both posPurchaseList AND stockItems!)
      try {
        const convertedStockItems = stampedItems.map((it: any) => ({
          id: it.id,
          name: it.name,
          companyId: companyId,
          companyCode: companyCode,
          barcode: it.barcode || '',
          mrp: Number(it.mrp) || 0,
          retailSalePrice: Number(it.retailSalePrice) || 0,
          openingStock: Number(it.openingStock) || 0,
          openingRate: Number(it.purchasePrice || it.newPurchasePrice) || 0,
          unit: it.unit || 'Nos',
          gstRate: Number(it.gstRate) || 18,
          cessPerc: Number(it.cessPerc) || 0,
          expiryDate: it.expiryDate || '',
          variant: it.variant || '',
          variants: it.variants || (it.variant ? [it.variant] : []),
        }));

        await companyDataFolderService.saveCompanyFolder({
          companyCode,
          posPurchaseList: stampedItems,
          stockItems: convertedStockItems,
        });
      } catch (err) {
        console.warn("Folder service save error:", err);
      }

      // D. Merge updated fields back into stockItems for POS Sale
      if (onStockUpdated) {
        const scopedStockItems = (stockItems || []).filter(si => {
          if (!companyId) return true;
          return !si.companyId || Number(si.companyId) === Number(companyId);
        });
        const updatedStockItems = scopedStockItems.map(si => {
          const found = currentItems.find(it => it.id === si.id || it.name.trim().toLowerCase() === (si.name || '').trim().toLowerCase());
          if (found) {
            return {
              ...si,
              companyId: companyId || si.companyId,
              barcode: found.barcode,
              mrp: found.mrp,
              discountPerc: found.discountPerc,
              discountAmt: found.discountAmt,
              retailSalePrice: found.retailSalePrice,
              expiryDate: found.expiryDate,
              cessPerc: found.cessPerc,
              variant: found.variant,
              variants: found.variants,
            };
          }
          return si;
        });
        onStockUpdated(updatedStockItems);
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (e) {
      console.error("Persist error:", e);
      setSaveStatus('dirty');
    }
  }, [storageKey, companyId, companyCode, stockItems, onStockUpdated]);

  // Debounced auto-save on change
  const triggerAutoSave = useCallback((updatedItems: POSPurchaseItem[]) => {
    setSaveStatus('dirty');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      persistChanges(updatedItems);
    }, 400);
  }, [persistChanges]);

  // Helper to build list by combining stock items with saved data
  const buildItemsList = useCallback((savedData: any[], explicitStockItems?: any[]): POSPurchaseItem[] => {
    const assignedBarcodes: string[] = [];
    const savedMap = new Map<string, any>();

    const targetCode = String(companyCode || company?.companyCode || company?.code || '').toUpperCase().trim();
    const targetId = Number(companyId || company?.id);

    const matchCo = (cId: any, cCode: any) => {
      const scCode = String(cCode || '').toUpperCase().trim();
      const scId = Number(cId);
      if (targetCode && scCode && scCode === targetCode) return true;
      if (targetId && scId && targetId === scId) return true;
      if (targetCode && scId && String(scId) === targetCode) return true;
      if (targetId && scCode && String(targetId) === scCode) return true;
      return false;
    };

    // Index saved items by ID and by lowercased name (strictly for this company)
    (savedData || []).forEach(s => {
      if (!s) return;
      if (explicitStockItems && explicitStockItems.length > 0) {
        if (s.companyCode && targetCode && String(s.companyCode).toUpperCase().trim() !== targetCode) return;
      } else if (s.companyCode || s.companyId) {
        if (!matchCo(s.companyId, s.companyCode)) return;
      }
      if (s.id !== undefined) savedMap.set(String(s.id), s);
      if (s.name) savedMap.set(String(s.name).trim().toLowerCase(), s);
    });

    const effectiveStock = (Array.isArray(explicitStockItems) && explicitStockItems.length > 0)
      ? explicitStockItems
      : (Array.isArray(stockItems) ? stockItems : []);

    // 1. Process items from stockItems strictly belonging to this company
    const scopedStockItems = effectiveStock.filter(si => {
      if (!si) return false;
      // If explicitStockItems was passed directly from loaded company folder, trust it
      if (explicitStockItems && explicitStockItems.length > 0) {
        if (si.companyCode && targetCode && String(si.companyCode).toUpperCase().trim() !== targetCode) {
          return false;
        }
        return true;
      }
      if (!companyId && !companyCode) return false;
      if (si.companyCode && targetCode && String(si.companyCode).toUpperCase().trim() === targetCode) {
        return true;
      }
      if (si.companyId || si.companyCode) {
        return matchCo(si.companyId, si.companyCode);
      }
      return true;
    });

    const built: POSPurchaseItem[] = scopedStockItems.map((si, idx) => {
      const saved = savedMap.get(String(si.id)) || savedMap.get((si.name || '').trim().toLowerCase()) || {};
      const { purchasePrice, newPurchasePrice } = resolvePurchasePrices(si);
      const liveStock = calculateLiveStock(si);

      let barcode = String(saved.barcode !== undefined ? saved.barcode : (si.barcode || '')).trim();
      if (!barcode) {
        barcode = generateNextUniqueBarcode(assignedBarcodes);
      }
      assignedBarcodes.push(barcode);

      // MRP resolution: Saved value takes first priority!
      let mrp = 0;
      if (saved.mrp !== undefined && saved.mrp !== null && saved.mrp !== '') {
        mrp = Number(saved.mrp) || 0;
      } else if (si.mrp !== undefined && si.mrp !== null && si.mrp > 0) {
        mrp = Number(si.mrp) || 0;
      } else if (purchasePrice > 0) {
        mrp = Math.round(purchasePrice * 1.2 * 100) / 100;
      }

      // Discount %
      let discountPerc = 0;
      if (saved.discountPerc !== undefined && saved.discountPerc !== null && saved.discountPerc !== '') {
        discountPerc = Number(saved.discountPerc) || 0;
      } else if (si.defaultDiscount !== undefined && si.defaultDiscount > 0) {
        discountPerc = Number(si.defaultDiscount) || 0;
      }

      // Discount Amount
      let discountAmt = 0;
      if (saved.discountAmt !== undefined && saved.discountAmt !== null && saved.discountAmt !== '') {
        discountAmt = Number(saved.discountAmt) || 0;
      } else if (mrp > 0 && discountPerc > 0) {
        discountAmt = Math.round((mrp * discountPerc / 100) * 100) / 100;
      }

      // Retail Sale Price: Saved value takes first priority!
      let retailSalePrice = 0;
      if (saved.retailSalePrice !== undefined && saved.retailSalePrice !== null && saved.retailSalePrice !== '') {
        retailSalePrice = Number(saved.retailSalePrice) || 0;
      } else if (si.retailSalePrice !== undefined && si.retailSalePrice > 0) {
        retailSalePrice = Number(si.retailSalePrice) || 0;
      } else {
        retailSalePrice = Math.max(0, mrp - discountAmt);
      }

      return {
        id: si.id,
        sNo: idx + 1,
        name: si.name,
        purchasePrice,
        newPurchasePrice,
        expiryDate: saved.expiryDate !== undefined ? saved.expiryDate : (si.expiryDate || ''),
        cessPerc: Number(saved.cessPerc !== undefined ? saved.cessPerc : (si.cessPerc || 0)),
        openingStock: liveStock,
        barcode,
        mrp: Math.round(mrp * 100) / 100,
        discountPerc: Math.round(discountPerc * 100) / 100,
        discountAmt: Math.round(discountAmt * 100) / 100,
        retailSalePrice: Math.round(retailSalePrice * 100) / 100,
        unit: resolveUnitString(si) || resolveUnitString(saved),
        gstRate: Number(si.gstRate) || 18,
        variant: saved.variant || (Array.isArray(saved.variants) && saved.variants[0]) || si.variant || (Array.isArray(si.variants) && si.variants[0]) || '',
        variants: saved.variants || (saved.variant ? [saved.variant] : (si.variants || [])),
      };
    });

    // 2. Also preserve any custom inserted items that were in savedData but not in stockItems
    (savedData || []).forEach(s => {
      if (!s) return;
      if (explicitStockItems && explicitStockItems.length > 0) {
        if (s.companyCode && targetCode && String(s.companyCode).toUpperCase().trim() !== targetCode) return;
      } else if (s.companyCode || s.companyId) {
        if (!matchCo(s.companyId, s.companyCode)) return;
      }
      const alreadyIncluded = built.some(b => b.id === s.id || b.name.trim().toLowerCase() === (s.name || '').trim().toLowerCase());
      if (!alreadyIncluded && s.name) {
        built.push({
          id: s.id || Date.now(),
          sNo: built.length + 1,
          name: s.name,
          purchasePrice: Number(s.purchasePrice) || 0,
          newPurchasePrice: Number(s.newPurchasePrice) || 0,
          expiryDate: s.expiryDate || '',
          cessPerc: Number(s.cessPerc) || 0,
          openingStock: Number(s.openingStock) || 0,
          barcode: s.barcode || generateNextUniqueBarcode(assignedBarcodes),
          mrp: Number(s.mrp) || 0,
          discountPerc: Number(s.discountPerc) || 0,
          discountAmt: Number(s.discountAmt) || 0,
          retailSalePrice: Number(s.retailSalePrice) || 0,
          unit: resolveUnitString(s),
          gstRate: Number(s.gstRate) || 18,
          variant: s.variant || (Array.isArray(s.variants) && s.variants[0]) || '',
          variants: s.variants || (s.variant ? [s.variant] : []),
        });
      }
    });

    // 3. Strict Deduplication: Ensure each item appears exactly once by unique trimmed lowercase name
    const dedupedBuilt: POSPurchaseItem[] = [];
    const seenNames = new Set<string>();
    for (const item of built) {
      if (!item || !item.name) continue;
      const cleanName = item.name.trim().toLowerCase();
      if (seenNames.has(cleanName)) continue;
      seenNames.add(cleanName);
      dedupedBuilt.push({
        ...item,
        sNo: dedupedBuilt.length + 1,
      });
    }

    return dedupedBuilt;
  }, [stockItems, companyId, companyCode, calculateLiveStock, resolvePurchasePrices]);

  // 4. Initial and company-change load from LocalStorage and Database API
  const prevCompanyCodeRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevCompanyCodeRef.current === companyCode && isInitializedRef.current) return;
    prevCompanyCodeRef.current = companyCode;
    isInitializedRef.current = true;

    const isClient = permissionGuard.isClientSession();

    // A. Read LocalStorage cache first (ONLY for standalone main PC, NEVER in client session)
    let cachedList: any[] = [];
    if (!isClient) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            cachedList = parsed;
          }
        }
      } catch (e) { }
    }

    // Initialize with cached list or stock items
    const initialBuilt = buildItemsList(cachedList);
    setItems(initialBuilt);

    // B. Fetch fresh data directly from Host PC company folder
    companyDataFolderService.loadCompanyFolder(companyCode).then(folder => {
      if (folder) {
        const folderStock = Array.isArray(folder.stockItems) ? folder.stockItems : [];
        const folderList = Array.isArray(folder.posPurchaseList) ? folder.posPurchaseList : [];
        const freshBuilt = buildItemsList(folderList, folderStock);
        setItems(freshBuilt);
        if (!isClient && typeof window !== 'undefined') {
          localStorage.setItem(storageKey, JSON.stringify(freshBuilt));
        }
        if (freshBuilt.length > 0 && onStockUpdated) {
          const convertedStock = freshBuilt.map(b => ({
            id: b.id,
            companyId: companyId || companyCode,
            companyCode: companyCode,
            name: b.name,
            alias: b.barcode || '',
            partNumber: b.barcode || '',
            barcode: b.barcode || '',
            groupName: b.variant || 'Primary',
            categoryName: 'Primary',
            unit: b.unit || 'PCS',
            unitName: b.unit || 'PCS',
            gstRate: Number(b.gstRate || 18),
            cessRate: Number(b.cessPerc || 0),
            mrp: Number(b.mrp || 0),
            retailSalePrice: Number(b.retailSalePrice || b.mrp || 0),
            rateInclTax: Number(b.retailSalePrice || b.mrp || 0),
            openingQty: Number(b.openingStock || 0),
            openingRate: Number(b.purchasePrice || 0),
            openingValue: Number(b.openingStock || 0) * Number(b.purchasePrice || 0),
            variant: b.variant || '',
            variants: b.variants || (b.variant ? [b.variant] : []),
            expiryDate: b.expiryDate || '',
          }));
          onStockUpdated(convertedStock);
        }
        return;
      }
      // Fallback to API if folder not found
      const fetchApiUrl = `/api/pos/purchase-list?companyCode=${encodeURIComponent(companyCode)}&companyId=${companyId}`;
      fetch(fetchApiUrl)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.items)) {
            const freshBuilt = buildItemsList(data.items);
            setItems(freshBuilt);
            if (typeof window !== 'undefined') {
              localStorage.setItem(storageKey, JSON.stringify(freshBuilt));
            }
          }
        })
        .catch(err => {
          console.warn("Could not fetch remote purchase list:", err);
        });
    }).catch(() => { });
  }, [storageKey, companyCode, companyId, buildItemsList, onStockUpdated]);

  // 4B. Live Reactive Sync: When stockItems prop updates (e.g. user altered item unit or name in Masters), update items immediately!
  useEffect(() => {
    if (!isInitializedRef.current || !stockItems || stockItems.length === 0) return;
    setItems(prev => {
      let hasChanges = false;
      const updated = prev.map(item => {
        const matchedSi = (stockItems || []).find(
          si => si.id === item.id || (si.name && si.name.trim().toLowerCase() === item.name.trim().toLowerCase())
        );
        if (!matchedSi) return item;

        const liveUnit = resolveUnitString(matchedSi);
        const liveStock = calculateLiveStock(matchedSi);
        const liveName = matchedSi.name || item.name;

        if (item.unit !== liveUnit || item.openingStock !== liveStock || item.name !== liveName) {
          hasChanges = true;
          return {
            ...item,
            name: liveName,
            unit: liveUnit,
            openingStock: liveStock,
          };
        }
        return item;
      });

      if (hasChanges) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        }
        return updated;
      }
      return prev;
    });
  }, [stockItems, vouchers, calculateLiveStock, storageKey]);

  // 5. Reactive Item Updating with Auto-Save
  const handleUpdateItem = (id: number, field: keyof POSPurchaseItem, value: any) => {
    setItems(prev => {
      const updated = prev.map(item => {
        if (item.id !== id) return item;
        const cur = { ...item, [field]: value };

        if (field === 'mrp') {
          const mrp = Math.max(0, Number(value) || 0);
          cur.mrp = mrp;
          if (cur.discountPerc > 0) {
            cur.discountAmt = Math.round((mrp * cur.discountPerc / 100) * 100) / 100;
          }
          cur.retailSalePrice = Math.round(Math.max(0, mrp - cur.discountAmt) * 100) / 100;
        }
        else if (field === 'discountPerc') {
          const perc = Math.max(0, Math.min(100, Number(value) || 0));
          cur.discountPerc = perc;
          cur.discountAmt = Math.round((cur.mrp * perc / 100) * 100) / 100;
          cur.retailSalePrice = Math.round(Math.max(0, cur.mrp - cur.discountAmt) * 100) / 100;
        }
        else if (field === 'discountAmt') {
          const amt = Math.max(0, Number(value) || 0);
          cur.discountAmt = amt;
          cur.discountPerc = cur.mrp > 0 ? Math.round((amt / cur.mrp * 100) * 100) / 100 : 0;
          cur.retailSalePrice = Math.round(Math.max(0, cur.mrp - amt) * 100) / 100;
        }
        else if (field === 'retailSalePrice') {
          const rsp = Math.max(0, Number(value) || 0);
          cur.retailSalePrice = rsp;
          if (cur.mrp > rsp) {
            cur.discountAmt = Math.round((cur.mrp - rsp) * 100) / 100;
            cur.discountPerc = Math.round((cur.discountAmt / cur.mrp * 100) * 100) / 100;
          } else {
            cur.discountAmt = 0;
            cur.discountPerc = 0;
          }
        }

        return cur;
      });

      triggerAutoSave(updated);
      return updated;
    });
  };

  // Immediate save on blur
  const handleCellBlur = () => {
    persistChanges(itemsRef.current);
  };

  // 6. Keyboard & Enter-key Navigation between Cells (Excel Workflow)
  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      // Flush current value immediately
      persistChanges(itemsRef.current);

      // If last editable column in row (Retail Sale Price), jump to next row
      if (colIdx >= EDITABLE_COLS_COUNT - 1) {
        const nextRowIdx = rowIdx + 1;
        if (nextRowIdx < items.length) {
          const nextEl = document.getElementById(`pos-cell-${nextRowIdx}-1`); // focus expiryDate of next row
          if (nextEl) nextEl.focus();
        } else {
          // If on the very last row, insert a new row automatically
          handleInsertRow();
          setTimeout(() => {
            const el = document.getElementById(`pos-cell-${nextRowIdx}-0`);
            if (el) el.focus();
          }, 80);
        }
      } else {
        // Move to next cell in current row
        const nextCol = colIdx + 1;
        const nextEl = document.getElementById(`pos-cell-${rowIdx}-${nextCol}`);
        if (nextEl) nextEl.focus();
      }
    } else if (e.key === 'ArrowDown') {
      const nextRow = rowIdx + 1;
      if (nextRow < items.length) {
        e.preventDefault();
        const el = document.getElementById(`pos-cell-${nextRow}-${colIdx}`);
        if (el) el.focus();
      }
    } else if (e.key === 'ArrowUp') {
      const prevRow = rowIdx - 1;
      if (prevRow >= 0) {
        e.preventDefault();
        const el = document.getElementById(`pos-cell-${prevRow}-${colIdx}`);
        if (el) el.focus();
      }
    }
  };

  // 7. Insert new product row
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
      variant: '',
      variants: [],
    };

    setItems(prev => {
      const updated = [...prev, newItem];
      persistChanges(updated);
      return updated;
    });
  };

  // 8. Delete row
  const handleDeleteRow = (id: number) => {
    if (confirm('Are you sure you want to remove this item from the Purchase POS List?')) {
      setItems(prev => {
        const updated = prev.filter(i => i.id !== id).map((it, idx) => ({ ...it, sNo: idx + 1 }));
        persistChanges(updated);
        return updated;
      });
    }
  };

  // 9. Auto-generate missing unique barcodes
  const handleAutoGenerateMissingBarcodes = () => {
    const existing = items.map(i => i.barcode).filter(Boolean);
    let count = 0;
    setItems(prev => {
      const updated = prev.map(item => {
        if (!item.barcode || !item.barcode.trim()) {
          const nextCode = generateNextUniqueBarcode(existing);
          existing.push(nextCode);
          count++;
          return { ...item, barcode: nextCode };
        }
        return item;
      });
      persistChanges(updated);
      return updated;
    });
    alert(`Assigned unique barcodes for ${count} items!`);
  };

  // 10. Manual Save button trigger
  const handleManualSave = async () => {
    setIsSaving(true);
    await persistChanges(items);
    setIsSaving(false);
  };

  // Audio Feedback Synthesizer for tactile touch
  const playTouchBeep = useCallback((freq = 920, duration = 0.035) => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
      setTimeout(() => ctx.close().catch(() => { }), (duration + 0.1) * 1000);
    } catch (_) { }
  }, []);

  // Unique list of all existing variants across all items
  const existingVariants = useMemo(() => {
    const set = new Set<string>();
    items.forEach(it => {
      const v = (it.variant || it.variants?.[0] || '').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [items]);

  const handleSaveVariant = () => {
    if (!variantModalItem) return;
    playTouchBeep(1046, 0.05);
    const v = variantInputText.trim();
    handleUpdateItem(variantModalItem.id, 'variant', v);
    handleUpdateItem(variantModalItem.id, 'variants', v ? [v] : []);
    setVariantModalItem(null);
  };

  const handleClearVariant = () => {
    if (!variantModalItem) return;
    playTouchBeep(700, 0.04);
    handleUpdateItem(variantModalItem.id, 'variant', '');
    handleUpdateItem(variantModalItem.id, 'variants', []);
    setVariantModalItem(null);
  };

  // Global keyboard shortcuts (Ctrl+S & Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      } else if (e.key === 'Escape') {
        if (variantModalItem) {
          e.preventDefault();
          e.stopPropagation();
          setVariantModalItem(null);
        } else if (printModalItem) {
          e.preventDefault();
          e.stopPropagation();
          setPrintModalItem(null);
        } else if (showBulkPrintModal) {
          e.preventDefault();
          e.stopPropagation();
          setShowBulkPrintModal(false);
        } else if (searchQuery.trim()) {
          e.preventDefault();
          e.stopPropagation();
          setSearchQuery('');
        } else {
          e.preventDefault();
          e.stopPropagation();
          (e as any).stopImmediatePropagation?.();
          onBack();
        }
      }
    };

    try {
      if (typeof window !== 'undefined' && (navigator as any)?.keyboard?.lock) {
        (navigator as any).keyboard.lock(['Escape']).catch(() => { });
      }
    } catch (_) { }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [items, variantModalItem, printModalItem, showBulkPrintModal, searchQuery, onBack]);

  // Filter items
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      i => (i.name && i.name.toLowerCase().includes(q)) ||
        (i.barcode && i.barcode.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  // Reusable sticky style for fixed golden yellow header row
  const thStickyBase: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 30,
    background: '#eab308',
    color: '#000000',
    fontWeight: 900,
    borderBottom: '2.5px solid #ca8a04',
    borderRight: '1px solid #d4a373',
    boxSizing: 'border-box',
    userSelect: 'none',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        margin: 0,
        padding: 0,
        background: '#f8fafc',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
      }}
    >
      <style>{`
        .pos-touch-btn {
          touch-action: manipulation;
          user-select: none;
          -webkit-user-select: none;
          transition: transform 0.08s ease, box-shadow 0.08s ease, filter 0.08s ease;
        }
        .pos-touch-btn:active {
          transform: translateY(2px) scale(0.97) !important;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.25) !important;
          filter: brightness(0.93);
        }
        .pos-grid-input {
          touch-action: manipulation;
          transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
          box-sizing: border-box;
          height: 36px;
        }
        .pos-grid-input:focus {
          border-color: #0284c7 !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.3) !important;
          outline: none !important;
        }
        .pos-purchase-table {
          border-collapse: separate !important;
          border-spacing: 0 !important;
        }
        .pos-purchase-table thead th {
          position: sticky;
          top: 0;
          z-index: 30;
          background: #eab308;
          border-bottom: 2.5px solid #ca8a04;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        }
        .pos-purchase-table tbody td {
          border-bottom: 1px solid #e2e8f0;
        }
        @media (max-width: 1280px) {
          .pos-purchase-header-wrap {
            padding: 6px 12px !important;
            min-height: 48px !important;
          }
          .pos-purchase-title-h1 {
            font-size: 15px !important;
          }
          .pos-purchase-actions-wrap {
            gap: 6px !important;
          }
          .pos-purchase-search-input {
            width: 180px !important;
            padding: 6px 10px !important;
            min-height: 34px !important;
            font-size: 12px !important;
          }
          .pos-purchase-action-btn {
            padding: 6px 10px !important;
            min-height: 34px !important;
            font-size: 11px !important;
          }
        }
        @media (max-width: 900px) {
          .pos-purchase-header-wrap {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }
          .pos-purchase-actions-wrap {
            flex-wrap: wrap !important;
            width: 100% !important;
            justify-content: flex-start !important;
          }
          .pos-purchase-search-input {
            flex: 1 1 100% !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* ==================== 1. TOP HEADER & TOOLBAR ==================== */}
      <div
        className="pos-purchase-header-wrap"
        style={{
          background: 'linear-gradient(180deg, #1e3a5f 0%, #152942 100%)',
          color: '#ffffff',
          padding: '8px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2.5px solid #0284c7',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          minHeight: 54,
          flexShrink: 0,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={onBack}
            className="pos-touch-btn pos-purchase-action-btn"
            style={{
              background: '#334155',
              color: '#ffffff',
              border: '1px solid #475569',
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 38,
            }}
          >
            ← Back (Esc)
          </button>
          <div>
            <h1 className="pos-purchase-title-h1" style={{ margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📋</span> Purchase POS List & Barcode Master
            </h1>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              Company: <b style={{ color: '#38bdf8' }}>{company?.name || 'Aiman Polymers'}</b> | Code: <b>{companyCode}</b> |
              Status: {saveStatus === 'saved' ? <b style={{ color: '#4ade80' }}>✓ Saved (DB & Local Storage)</b> : (saveStatus === 'saving' ? <b style={{ color: '#facc15' }}>Saving...</b> : <span style={{ color: '#cbd5e1' }}>Online & Offline Synced</span>)}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pos-purchase-actions-wrap" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            className="pos-purchase-search-input"
            placeholder="🔍 Search product or barcode..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1.5px solid #0284c7',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: 13,
              width: 250,
              minHeight: 38,
              outline: 'none',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
            }}
          />

          <button
            onClick={handleAutoGenerateMissingBarcodes}
            className="pos-touch-btn pos-purchase-action-btn"
            title="Generate unique barcodes for items without barcode"
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 6,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 38,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            ⚡ Auto Barcodes
          </button>

          <button
            onClick={() => setShowBulkPrintModal(true)}
            className="pos-touch-btn pos-purchase-action-btn"
            title="Print barcode labels for all items"
            style={{
              background: '#7c3aed',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 6,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 38,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            🖨️ Print All Barcodes
          </button>

          <button
            onClick={handleInsertRow}
            className="pos-touch-btn pos-purchase-action-btn"
            style={{
              background: '#16a34a',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 6,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 38,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            ➕ Insert Item
          </button>

          <button
            onClick={handleManualSave}
            disabled={isSaving}
            className="pos-touch-btn pos-purchase-action-btn"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              border: '1.5px solid rgba(255,255,255,0.4)',
              borderRadius: 6,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 900,
              cursor: isSaving ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 38,
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.45)',
            }}
          >
            {isSaving ? 'Saving...' : '💾 Save (Ctrl+S)'}
          </button>
        </div>
      </div>

      {/* ==================== 2. MAIN EXCEL-STYLE GRID TABLE ==================== */}
      {/* Scrollable grid container with permanently sticky yellow header row */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          margin: '8px 12px 10px 12px',
          border: '1.5px solid #cbd5e1',
          borderRadius: 6,
          background: '#ffffff',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06)',
          overflowY: 'auto',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        <table className="pos-purchase-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, textAlign: 'left', minWidth: 1250 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 30, background: '#eab308' }}>
            {/* Golden Yellow Header matching uploaded screenshot */}
            <tr style={{ background: '#eab308', color: '#000000', fontWeight: 900, textTransform: 'capitalize', whiteSpace: 'nowrap', height: 44 }}>
              <th style={{ ...thStickyBase, width: 50, textAlign: 'center', padding: '10px 8px', borderTopLeftRadius: 5 }}>S.no</th>
              <th style={{ ...thStickyBase, minWidth: 190, padding: '10px 12px' }}>Product Name</th>
              <th style={{ ...thStickyBase, textAlign: 'right', minWidth: 110, padding: '10px 10px' }}>Purchase Price</th>
              <th style={{ ...thStickyBase, textAlign: 'right', minWidth: 135, padding: '10px 10px' }}>New Purchase Price</th>
              <th style={{ ...thStickyBase, textAlign: 'center', minWidth: 115, padding: '10px 10px' }}>Expiry Date</th>
              <th style={{ ...thStickyBase, textAlign: 'right', width: 75, padding: '10px 8px' }}>CESS%</th>
              <th style={{ ...thStickyBase, textAlign: 'right', minWidth: 110, padding: '10px 10px' }}>Openning Stock</th>
              <th style={{ ...thStickyBase, minWidth: 145, padding: '10px 10px' }}>Barcode</th>
              <th style={{ ...thStickyBase, textAlign: 'right', minWidth: 95, padding: '10px 10px' }}>MRP</th>
              <th style={{ ...thStickyBase, textAlign: 'right', minWidth: 155, padding: '10px 10px' }}>Discount% in percentage</th>
              <th style={{ ...thStickyBase, textAlign: 'right', minWidth: 140, padding: '10px 10px' }}>Discount in Amount</th>
              <th style={{ ...thStickyBase, textAlign: 'right', minWidth: 125, padding: '10px 14px', background: '#f59e0b', color: '#000000' }}>Retail Sale Price</th>
              <th style={{ ...thStickyBase, textAlign: 'center', width: 70, padding: '10px 8px' }}>insert</th>
              <th style={{ ...thStickyBase, textAlign: 'center', width: 70, padding: '10px 8px' }}>delete</th>
              <th style={{ ...thStickyBase, textAlign: 'center', width: 115, padding: '10px 10px' }}>print Barcode</th>
              <th style={{ ...thStickyBase, textAlign: 'center', width: 85, padding: '10px 8px', borderRight: 'none', borderTopRightRadius: 5 }}>Variant</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={16} style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                  No stock items found. Click <b>➕ Insert Item</b> above to add your first product.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => {
                const isSelected = selectedItemId === item.id;
                const rowBg = isSelected ? '#eff6ff' : (idx % 2 === 0 ? '#ffffff' : '#fafafa');

                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    style={{
                      background: rowBg,
                      borderBottom: '1px solid #e2e8f0',
                      height: 50, // Comfortable touch row height
                    }}
                  >
                    {/* 1. S.no */}
                    <td style={{ padding: '6px 8px', textAlign: 'center', borderRight: '1px solid #e2e8f0', fontWeight: 'bold', color: '#64748b' }}>
                      {item.sNo}
                    </td>

                    {/* 2. Product Name (Col 0) */}
                    <td style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0' }}>
                      <input
                        id={`pos-cell-${idx}-0`}
                        type="text"
                        className="pos-grid-input"
                        value={item.name}
                        onChange={e => handleUpdateItem(item.id, 'name', e.target.value)}
                        onBlur={handleCellBlur}
                        onKeyDown={e => handleCellKeyDown(e, idx, 0)}
                        style={{
                          width: '100%',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          padding: '6px 8px',
                          fontWeight: 700,
                          color: '#0f172a',
                          borderRadius: 4,
                          fontSize: 13,
                        }}
                      />
                    </td>

                    {/* 3. Purchase Price (Initial with tax) */}
                    <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '1px solid #e2e8f0', fontWeight: 'bold', color: '#334155' }}>
                      {currencySymbol}{item.purchasePrice.toFixed(2)}
                    </td>

                    {/* 4. New Purchase Price (Latest with tax from F9) */}
                    <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '1px solid #e2e8f0', fontWeight: 'bold', color: item.newPurchasePrice > 0 ? (item.newPurchasePrice > item.purchasePrice ? '#dc2626' : '#16a34a') : '#94a3b8' }}>
                      {item.newPurchasePrice > 0 ? `${currencySymbol}${item.newPurchasePrice.toFixed(2)}` : '0'}
                    </td>

                    {/* 5. Expiry Date (Col 1) */}
                    <td style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <input
                        id={`pos-cell-${idx}-1`}
                        type="text"
                        className="pos-grid-input"
                        placeholder="DD/MM/YYYY"
                        value={item.expiryDate}
                        onChange={e => handleUpdateItem(item.id, 'expiryDate', e.target.value)}
                        onBlur={handleCellBlur}
                        onKeyDown={e => handleCellKeyDown(e, idx, 1)}
                        style={{
                          width: 105,
                          textAlign: 'center',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          borderRadius: 4,
                          padding: '6px 6px',
                          fontSize: 12,
                        }}
                      />
                    </td>

                    {/* 6. CESS% (Col 2) */}
                    <td style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0', textAlign: 'right' }}>
                      <input
                        id={`pos-cell-${idx}-2`}
                        type="number"
                        step="0.5"
                        min="0"
                        className="pos-grid-input"
                        value={item.cessPerc || ''}
                        onChange={e => handleUpdateItem(item.id, 'cessPerc', parseFloat(e.target.value) || 0)}
                        onBlur={handleCellBlur}
                        onKeyDown={e => handleCellKeyDown(e, idx, 2)}
                        style={{
                          width: 65,
                          textAlign: 'right',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          borderRadius: 4,
                          padding: '6px 6px',
                          fontSize: 12,
                        }}
                      />
                    </td>

                    {/* 7. Opening Stock (Live real-time quantity) */}
                    <td style={{ padding: '6px 10px', textAlign: 'right', borderRight: '1px solid #e2e8f0', fontWeight: 900, color: item.openingStock > 0 ? '#16a34a' : '#dc2626' }}>
                      {item.openingStock} <span style={{ fontSize: 11, color: '#64748b' }}>{item.unit}</span>
                    </td>

                    {/* 8. Barcode (Col 3) */}
                    <td style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0' }}>
                      <input
                        id={`pos-cell-${idx}-3`}
                        type="text"
                        className="pos-grid-input"
                        value={item.barcode}
                        placeholder="Scan / Type Code"
                        onChange={e => handleUpdateItem(item.id, 'barcode', e.target.value)}
                        onBlur={handleCellBlur}
                        onKeyDown={e => handleCellKeyDown(e, idx, 3)}
                        style={{
                          width: '100%',
                          border: '1.5px solid #0284c7',
                          background: '#f0f9ff',
                          color: '#0369a1',
                          fontWeight: 800,
                          borderRadius: 4,
                          padding: '6px 8px',
                          fontSize: 13,
                          letterSpacing: 0.5,
                        }}
                      />
                    </td>

                    {/* 9. MRP (Col 4) */}
                    <td style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0', textAlign: 'right' }}>
                      <input
                        id={`pos-cell-${idx}-4`}
                        type="number"
                        step="0.5"
                        min="0"
                        className="pos-grid-input"
                        value={item.mrp || ''}
                        placeholder="0"
                        onChange={e => handleUpdateItem(item.id, 'mrp', parseFloat(e.target.value) || 0)}
                        onBlur={handleCellBlur}
                        onKeyDown={e => handleCellKeyDown(e, idx, 4)}
                        style={{
                          width: 85,
                          textAlign: 'right',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          borderRadius: 4,
                          padding: '6px 6px',
                          fontSize: 13,
                          fontWeight: 'bold',
                        }}
                      />
                    </td>

                    {/* 10. Discount% in percentage (Col 5) */}
                    <td style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0', textAlign: 'right' }}>
                      <input
                        id={`pos-cell-${idx}-5`}
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        className="pos-grid-input"
                        value={item.discountPerc || ''}
                        placeholder="0%"
                        onChange={e => handleUpdateItem(item.id, 'discountPerc', parseFloat(e.target.value) || 0)}
                        onBlur={handleCellBlur}
                        onKeyDown={e => handleCellKeyDown(e, idx, 5)}
                        style={{
                          width: 80,
                          textAlign: 'right',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          borderRadius: 4,
                          padding: '6px 6px',
                          fontSize: 12,
                        }}
                      />
                    </td>

                    {/* 11. Discount in Amount (Col 6) */}
                    <td style={{ padding: '5px 8px', borderRight: '1px solid #e2e8f0', textAlign: 'right' }}>
                      <input
                        id={`pos-cell-${idx}-6`}
                        type="number"
                        step="0.5"
                        min="0"
                        className="pos-grid-input"
                        value={item.discountAmt || ''}
                        placeholder={`${currencySymbol}0`}
                        onChange={e => handleUpdateItem(item.id, 'discountAmt', parseFloat(e.target.value) || 0)}
                        onBlur={handleCellBlur}
                        onKeyDown={e => handleCellKeyDown(e, idx, 6)}
                        style={{
                          width: 80,
                          textAlign: 'right',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          borderRadius: 4,
                          padding: '6px 6px',
                          fontSize: 12,
                        }}
                      />
                    </td>

                    {/* 12. Retail Sale Price (Col 7) */}
                    <td style={{ padding: '5px 8px', textAlign: 'right', borderRight: '1px solid #e2e8f0', fontWeight: 900, fontSize: 13, color: '#0369a1', background: '#fef3c7' }}>
                      <input
                        id={`pos-cell-${idx}-7`}
                        type="number"
                        step="0.5"
                        min="0"
                        className="pos-grid-input"
                        value={item.retailSalePrice || ''}
                        placeholder="0"
                        onChange={e => handleUpdateItem(item.id, 'retailSalePrice', parseFloat(e.target.value) || 0)}
                        onBlur={handleCellBlur}
                        onKeyDown={e => handleCellKeyDown(e, idx, 7)}
                        style={{
                          width: 90,
                          textAlign: 'right',
                          border: '1px solid #f59e0b',
                          background: '#fffbeb',
                          borderRadius: 4,
                          padding: '6px 8px',
                          fontSize: 13,
                          fontWeight: 900,
                          color: '#0369a1',
                        }}
                      />
                    </td>

                    {/* 13. Action: insert */}
                    <td style={{ padding: '5px 8px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                      <button
                        onClick={handleInsertRow}
                        className="pos-touch-btn"
                        title="Insert new row"
                        style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          border: '1.5px solid #86efac',
                          borderRadius: 6,
                          padding: '6px 14px',
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                          minHeight: 34,
                        }}
                      >
                        insert
                      </button>
                    </td>

                    {/* 14. Action: delete */}
                    <td style={{ padding: '5px 8px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                      <button
                        onClick={() => handleDeleteRow(item.id)}
                        className="pos-touch-btn"
                        title="Delete row"
                        style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: '1.5px solid #fca5a5',
                          borderRadius: 6,
                          padding: '6px 14px',
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                          minHeight: 34,
                        }}
                      >
                        delete
                      </button>
                    </td>

                    {/* 15. Action: print Barcode */}
                    <td style={{ padding: '5px 8px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                      <button
                        onClick={() => {
                          setPrintModalItem(item);
                          setPrintCount(Math.max(1, Math.min(50, Math.round(item.openingStock) || 1)));
                        }}
                        className="pos-touch-btn"
                        title="Print Barcode sticker"
                        style={{
                          background: '#f3e8ff',
                          color: '#6b21a8',
                          border: '1.5px solid #d8b4fe',
                          borderRadius: 6,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          minHeight: 34,
                        }}
                      >
                        print Barcode
                      </button>
                    </td>

                    {/* 16. Action: Variant */}
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                      {item.variant || (item.variants && item.variants.length > 0) ? (
                        <button
                          onClick={() => {
                            playTouchBeep();
                            setVariantModalItem(item);
                            setVariantInputText(item.variant || item.variants?.[0] || '');
                          }}
                          className="pos-touch-btn"
                          title={`Variant: ${item.variant || item.variants?.[0]} (Click to change)`}
                          style={{
                            background: 'linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)',
                            color: '#1d4ed8',
                            border: '1.5px solid #93c5fd',
                            borderRadius: 6,
                            padding: '5px 8px',
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer',
                            minHeight: 34,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            maxWidth: 120,
                            boxShadow: '0 1px 3px rgba(37, 99, 235, 0.15)',
                          }}
                        >
                          <span>🏷️</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.variant || item.variants?.[0]}
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            playTouchBeep();
                            setVariantModalItem(item);
                            setVariantInputText('');
                          }}
                          className="pos-touch-btn"
                          title="Touch to assign or create variant"
                          style={{
                            background: '#f8fafc',
                            color: '#64748b',
                            border: '1.5px dashed #cbd5e1',
                            borderRadius: 6,
                            padding: '5px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            minHeight: 34,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          + Variant
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
            {filteredItems.length > 0 && (
              <tr>
                <td colSpan={16} style={{ height: 40, border: 'none', background: 'transparent' }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ==================== 3. FIXED BOTTOM STATUS FOOTER ==================== */}
      <div
        style={{
          position: 'relative',
          height: 44,
          background: '#ffffff',
          borderTop: '2px solid #cbd5e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
          fontSize: 12,
          color: '#334155',
          boxShadow: '0 -2px 6px rgba(0,0,0,0.06)',
          flexShrink: 0,
          zIndex: 15,
          boxSizing: 'border-box',
        }}
      >
        <div>
          💡 <b>Keyboard Tip:</b> Press <b>Enter</b> to navigate cell-to-cell across the row. Values <b>auto-save immediately</b> to offline and online database!
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>Total Products: <b style={{ color: '#0f172a' }}>{items.length}</b></span>
          <span>In Stock: <b style={{ color: '#16a34a' }}>{items.filter(i => i.openingStock > 0).length}</b></span>
          {saveStatus === 'saved' && <span style={{ color: '#16a34a', fontWeight: 900 }}>✓ All changes saved</span>}
          {saveStatus === 'saving' && <span style={{ color: '#d97706', fontWeight: 900 }}>Saving changes...</span>}
        </div>
      </div>

      {/* ================= MODAL: Touch-Friendly Item Variant Setup ================= */}
      {variantModalItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000000,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setVariantModalItem(null);
            }
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: '20px 24px',
              width: 480,
              maxWidth: '95vw',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              border: '2px solid #3b82f6',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🏷️</span> Item Variant Setup
                </h3>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                  Product: <b style={{ color: '#0f172a' }}>{variantModalItem.name}</b>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVariantModalItem(null)}
                style={{
                  border: 'none',
                  background: '#f1f5f9',
                  borderRadius: 6,
                  width: 28,
                  height: 28,
                  cursor: 'pointer',
                  fontWeight: 900,
                  fontSize: 14,
                  color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>

            {/* Input for new or custom variant */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#334155', marginBottom: 5 }}>
                Type Variant Name (e.g. Computer Hardware, Vegetables, Paints, Grocery):
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  autoFocus
                  value={variantInputText}
                  onChange={(e) => setVariantInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveVariant();
                    }
                  }}
                  placeholder="Enter or select variant..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1.5px solid #3b82f6',
                    fontSize: 13,
                    fontWeight: 700,
                    outline: 'none',
                    background: '#f8fafc',
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveVariant}
                  className="pos-touch-btn"
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '0 16px',
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  ✓ OK
                </button>
              </div>
            </div>

            {/* Existing Variants Dropdown & Touch Quick-Pick Chips */}
            {existingVariants.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#334155', marginBottom: 5 }}>
                  Or Choose from Existing Variants ({existingVariants.length}):
                </label>

                {/* Dropdown Selection */}
                <select
                  value={variantInputText}
                  onChange={(e) => {
                    playTouchBeep();
                    setVariantInputText(e.target.value);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#0f172a',
                    background: '#ffffff',
                    marginBottom: 8,
                    cursor: 'pointer'
                  }}
                >
                  <option value="">-- Touch to Select Existing Variant --</option>
                  {existingVariants.map(v => (
                    <option key={v} value={v}>🏷️ {v}</option>
                  ))}
                </select>

                {/* Touch Quick-Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 110, overflowY: 'auto', padding: '2px 0' }}>
                  {existingVariants.map(v => {
                    const isSelected = variantInputText.trim().toLowerCase() === v.trim().toLowerCase();
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          playTouchBeep();
                          setVariantInputText(v);
                        }}
                        className="pos-touch-btn"
                        style={{
                          background: isSelected ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#f1f5f9',
                          color: isSelected ? '#ffffff' : '#334155',
                          border: isSelected ? '1.5px solid #1e40af' : '1px solid #cbd5e1',
                          borderRadius: 20,
                          padding: '5px 12px',
                          fontSize: 11.5,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span>🏷️</span> {v}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => {
                  playTouchBeep();
                  handleClearVariant();
                }}
                className="pos-touch-btn"
                style={{
                  padding: '7px 12px',
                  borderRadius: 6,
                  border: '1px solid #fca5a5',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontWeight: 800,
                  fontSize: 11,
                  cursor: 'pointer'
                }}
              >
                ✕ Clear Variant
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setVariantModalItem(null)}
                  className="pos-touch-btn"
                  style={{
                    padding: '7px 14px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#64748b',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveVariant}
                  className="pos-touch-btn"
                  style={{
                    padding: '7px 18px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: 12,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  ✓ Save Variant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: Single Item Barcode Label Print ================= */}
      {printModalItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000000 }}>
          <div style={{ background: '#ffffff', borderRadius: 8, padding: 22, width: 440, maxWidth: '90vw', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', border: '2px solid #0284c7' }}>
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
                <span style={{ color: '#64748b' }}>MRP: {currencySymbol}{printModalItem.mrp.toFixed(2)}</span>
                <span style={{ color: '#0284c7', fontWeight: 900 }}>OUR: {currencySymbol}{printModalItem.retailSalePrice.toFixed(2)}</span>
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
                      className="pos-touch-btn"
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
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Label Paper Format / Printer Type:</label>
                <select
                  value={printLayout}
                  onChange={e => setPrintLayout(e.target.value as any)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid #0284c7', fontSize: 12, fontWeight: 600, background: '#f0f9ff' }}
                >
                  <option value="a4_40_up">📄 A4 Sticker Sheet (40 Stickers per sheet / 4 Cols × 10 Rows - 50mm × 25mm)</option>
                  <option value="a4_24_up">📄 A4 Sticker Sheet (24 Stickers per sheet / 3 Cols × 8 Rows - 65mm × 34mm)</option>
                  <option value="roll_50x25">🏷️ Thermal Barcode Roll Printer (50mm × 25mm / 2" × 1" Single Sticker Roll)</option>
                  <option value="roll_38x25">🏷️ Thermal Barcode Roll Printer (38mm × 25mm / 1.5" × 1" Single Sticker Roll)</option>
                </select>
                <div style={{ fontSize: 11, color: '#0369a1', marginTop: 4, fontWeight: 600 }}>
                  {printLayout === 'a4_40_up' && `💡 A4 sheet par 40 stickers aate hain. Aapke ${printCount} stickers 1 hi A4 page par fit honge.`}
                  {printLayout === 'a4_24_up' && `💡 A4 sheet par 24 bade stickers aate hain. Aapke ${printCount} stickers 1 hi A4 page par fit honge.`}
                  {printLayout === 'roll_50x25' && `💡 Barcode roll printer par exact 50mm × 25mm sticker feed hoga (No blank margins).`}
                  {printLayout === 'roll_38x25' && `💡 Barcode roll printer par exact 38mm × 25mm sticker feed hoga (No blank margins).`}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setPrintModalItem(null)}
                className="pos-touch-btn"
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
                className="pos-touch-btn"
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000000 }}>
          <div style={{ background: '#ffffff', borderRadius: 8, padding: 22, width: 440, maxWidth: '90vw', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', border: '2px solid #7c3aed' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: 16, fontWeight: 900, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🖨️</span> Bulk Print All Barcodes
            </h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
              This will generate scannable barcode stickers for all <b>{items.length} products</b> in this company.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>Select Label Format / Printer Type:</label>
              <select
                value={bulkPrintLayout}
                onChange={e => setBulkPrintLayout(e.target.value as any)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid #7c3aed', fontSize: 13, fontWeight: 600, background: '#faf5ff' }}
              >
                <option value="a4_40_up">📄 A4 Sticker Sheet (40 Stickers per sheet / 4 Cols × 10 Rows - 50mm × 25mm)</option>
                <option value="a4_24_up">📄 A4 Sticker Sheet (24 Stickers per sheet / 3 Cols × 8 Rows - 65mm × 34mm)</option>
                <option value="roll_50x25">🏷️ Thermal Barcode Roll Printer (50mm × 25mm / 2" × 1" Single Sticker Roll)</option>
                <option value="roll_38x25">🏷️ Thermal Barcode Roll Printer (38mm × 25mm / 1.5" × 1" Single Sticker Roll)</option>
              </select>
              <div style={{ fontSize: 11, color: '#6b21a8', marginTop: 4, fontWeight: 600 }}>
                {bulkPrintLayout === 'a4_40_up' && `💡 A4 sheet par 40 stickers aate hain. ${items.length} products ke liye ~${Math.ceil(items.length / 40)} sheet(s) use hongi.`}
                {bulkPrintLayout === 'a4_24_up' && `💡 A4 sheet par 24 stickers aate hain. ${items.length} products ke liye ~${Math.ceil(items.length / 24)} sheet(s) use hongi.`}
                {bulkPrintLayout === 'roll_50x25' && `💡 Dedicated barcode printer par continuous 50mm × 25mm roll stickers print honge.`}
                {bulkPrintLayout === 'roll_38x25' && `💡 Dedicated barcode printer par continuous 38mm × 25mm roll stickers print honge.`}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setShowBulkPrintModal(false)}
                className="pos-touch-btn"
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
                className="pos-touch-btn"
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
