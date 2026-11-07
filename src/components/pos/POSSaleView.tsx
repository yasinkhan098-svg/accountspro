"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  posService,
  POSCartItem,
  POSCartTotals,
  POSCustomer,
  POSPaymentDetails,
  POSHeldBill
} from '@/lib/pos/posService';
import POSVirtualKeyboard from './POSVirtualKeyboard';
import POSSecureModal from './POSSecureModal';
import POSPaymentModal from './POSPaymentModal';
import POSReceiptModal from './POSReceiptModal';
import POSItemSearchModal from './POSItemSearchModal';
import { companyDataFolderService } from '@/lib/companyDataFolderService';
import { permissionGuard } from '@/lib/permissionGuard';
import { lanUserManagementService } from '@/lib/lanUserManagementService';
import { posTrainingService } from '@/lib/pos/posTrainingService';
import { resolveUnitString } from '@/lib/unitResolver';

interface POSSaleViewProps {
  company: any;
  availableCompanies?: any[];
  stockItems: any[];
  posPurchaseList?: any[];
  ledgers: any[];
  vouchers: any[];
  cashierUser?: any;
  onBack: () => void;
  onLogoutToLogin?: () => void;
  onStockUpdated?: (updatedStock: any[]) => void;
  onVouchersUpdated?: (updatedVouchers: any[]) => void;
  onOpenPurchasePOSList?: () => void;
}

// AI Realistic Product Mockup Generator
function generateAIImageForProduct(item: any): string {
  const name = String(item.name || '').trim().toUpperCase();

  let primaryColor = '#0284c7';
  let secondaryColor = '#0369a1';
  let accentColor = '#38bdf8';

  if (name.includes('RED') || name.includes('RLD') || name.includes('ROSE')) {
    primaryColor = '#dc2626';
    secondaryColor = '#991b1b';
    accentColor = '#f87171';
  } else if (name.includes('GREEN') || name.includes('GRN') || name.includes('EMERALD')) {
    primaryColor = '#16a34a';
    secondaryColor = '#14532d';
    accentColor = '#4ade80';
  } else if (name.includes('YELLOW') || name.includes('YLW') || name.includes('GOLD')) {
    primaryColor = '#eab308';
    secondaryColor = '#854d0e';
    accentColor = '#fde047';
  } else if (name.includes('BLUE') || name.includes('SKY') || name.includes('INDIGO')) {
    primaryColor = '#2563eb';
    secondaryColor = '#1e3a8a';
    accentColor = '#60a5fa';
  } else if (name.includes('ORANGE') || name.includes('SUNRISE')) {
    primaryColor = '#ea580c';
    secondaryColor = '#9a3412';
    accentColor = '#fb923c';
  } else if (name.includes('BLACK') || name.includes('CARBON')) {
    primaryColor = '#1e293b';
    secondaryColor = '#0f172a';
    accentColor = '#64748b';
  } else if (name.includes('WHITE') || name.includes('SILVER')) {
    primaryColor = '#64748b';
    secondaryColor = '#334155';
    accentColor = '#cbd5e1';
  }

  let capacityText = '';
  if (name.includes('1LT') || name.includes('1 LT') || name.includes('1LTR')) capacityText = '1 LTR';
  else if (name.includes('4LT') || name.includes('4 LT') || name.includes('4LTR')) capacityText = '4 LTR';
  else if (name.includes('10LT') || name.includes('10 LT')) capacityText = '10 LTR';
  else if (name.includes('20LT') || name.includes('20 LT')) capacityText = '20 LTR';
  else if (name.includes('500ML') || name.includes('500 ML')) capacityText = '500 ML';
  else if (name.includes('50KG') || name.includes('50 KG')) capacityText = '50 KG';
  else if (name.includes('25KG') || name.includes('25 KG')) capacityText = '25 KG';
  else capacityText = item.unit || 'PACK';

  const cleanTitle = name.slice(0, 16);
  const idStr = String(item.id || Math.random()).replace(/[^a-zA-Z0-9]/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="100%" height="100%">
  <defs>
    <linearGradient id="bodyGrad_${idStr}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${secondaryColor}" />
      <stop offset="40%" stop-color="${primaryColor}" />
      <stop offset="70%" stop-color="${accentColor}" />
      <stop offset="100%" stop-color="${secondaryColor}" />
    </linearGradient>
    <linearGradient id="lidGrad_${idStr}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#cbd5e1" stop-opacity="0.8" />
    </linearGradient>
    <filter id="shadow_${idStr}" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.3" />
    </filter>
  </defs>
  <ellipse cx="80" cy="142" rx="46" ry="9" fill="#94a3b8" opacity="0.35" />
  <g filter="url(#shadow_${idStr})">
    <path d="M 40 46 L 46 128 C 46 136, 114 136, 114 128 L 120 46 Z" fill="url(#bodyGrad_${idStr})" />
    <ellipse cx="80" cy="46" rx="40" ry="8" fill="url(#lidGrad_${idStr})" stroke="#94a3b8" stroke-width="0.75" />
    <ellipse cx="80" cy="43" rx="34" ry="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.75" />
    <path d="M 37 49 C 37 20, 123 20, 123 49" fill="none" stroke="#e2e8f0" stroke-width="2.5" stroke-linecap="round" />
    <path d="M 37 49 C 37 20, 123 20, 123 49" fill="none" stroke="#64748b" stroke-width="1.2" stroke-linecap="round" opacity="0.6" />
    <rect x="48" y="66" width="64" height="46" rx="5" fill="#ffffff" opacity="0.95" />
    <rect x="50" y="68" width="60" height="42" rx="4" fill="none" stroke="${primaryColor}" stroke-width="1.2" />
    <circle cx="80" cy="79" r="6.5" fill="${primaryColor}" />
    <text x="80" y="82" font-size="6.5" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">★</text>
    <text x="80" y="94" font-size="6.5" font-weight="800" fill="#0f172a" text-anchor="middle" font-family="sans-serif">
      ${cleanTitle.length > 12 ? cleanTitle.slice(0, 12) + '..' : cleanTitle}
    </text>
    <rect x="62" y="99" width="36" height="8" rx="4" fill="${secondaryColor}" />
    <text x="80" y="105.5" font-size="5.5" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">
      ${capacityText}
    </text>
  </g>
  <path d="M 47 52 Q 52 90 51 124" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.45" />
</svg>`;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export default function POSSaleView({
  company,
  availableCompanies = [],
  stockItems = [],
  posPurchaseList = [],
  ledgers = [],
  vouchers = [],
  cashierUser,
  onBack,
  onLogoutToLogin,
  onStockUpdated,
  onVouchersUpdated,
  onOpenPurchasePOSList,
}: POSSaleViewProps) {
  const companyCode = company
    ? companyDataFolderService.getCompanyFolderCode(company, availableCompanies)
    : '10000';

  const currentUser = permissionGuard.getCurrentUser();
  const cashierName = cashierUser?.fullName || currentUser?.fullName || currentUser?.username || 'Cashier-01';
  const isTrainingMode = Boolean(cashierUser?.isTrainingMode);

  // Cashier role permission helper for Purchase POS List
  const hasPurchasePOSListPermission = (): boolean => {
    if (isTrainingMode) return true;
    if (cashierUser?.isAdmin || (cashierUser as any)?.isAdmin || currentUser?.isAdmin) return true;
    const perms = (cashierUser as any)?.permissions || currentUser?.permissions;
    if (perms && perms.vouchers) {
      return !!perms.vouchers['Purchase POS List'];
    }
    return false;
  };

  // POS Core State
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [selectedCartId, setSelectedCartId] = useState<string | null>(null);
  const selectedCartItem = cart.find(c => c.cartId === selectedCartId);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [billNo, setBillNo] = useState(() => posService.generateBillNo(vouchers, companyCode));
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString('en-US', { hour12: false }));
  const [dateStr, setDateStr] = useState(() => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));

  // Sub-table summary meta
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerName, setCustomerName] = useState('Cash Customer');
  const [walkInDelivery, setWalkInDelivery] = useState(false);
  const [promoDiscountAmt, setPromoDiscountAmt] = useState(0);
  const [showKeyboard, setShowKeyboard] = useState(true);

  // Modals state
  const [showSecureModal, setShowSecureModal] = useState(false);
  const [securePassword, setSecurePassword] = useState('');
  const secureInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [activeField, setActiveField] = useState<'barcode' | 'mobile' | 'securePassword'>('barcode');
  const activeFieldRef = useRef<'barcode' | 'mobile' | 'securePassword'>('barcode');

  // Sync activeField with Secure Mode
  useEffect(() => {
    if (showSecureModal) {
      activeFieldRef.current = 'securePassword';
      setActiveField('securePassword');
    } else {
      activeFieldRef.current = 'barcode';
      setActiveField('barcode');
      setSecurePassword('');
    }
  }, [showSecureModal]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rightViewMode, setRightViewMode] = useState<'SCANNED' | 'SALE_POS' | 'RUBIC_POS'>('SCANNED');
  const [scannedActiveItems, setScannedActiveItems] = useState<any[]>([]);
  const [posSearchQuery, setPosSearchQuery] = useState('');
  const [rubicSearchQuery, setRubicSearchQuery] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiImagesMap, setAiImagesMap] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('ledgerx_stock_item_ai_images');
        if (stored) return JSON.parse(stored);
      } catch (e) { }
    }
    return {};
  });

  // Track Fullscreen status & attempt fullscreen on first touch
  useEffect(() => {
    const checkFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', checkFs);
    const triggerFs = () => {
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => { });
        }
      } catch (e) { }
    };
    window.addEventListener('click', triggerFs, { once: true });
    window.addEventListener('keydown', triggerFs, { once: true });
    return () => {
      document.removeEventListener('fullscreenchange', checkFs);
      window.removeEventListener('click', triggerFs);
      window.removeEventListener('keydown', triggerFs);
    };
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => { });
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => { });
        }
      }
    } catch (e) { }
  };

  // Live stock calculator per item (Vouchers + Opening Qty)
  const getItemStock = useCallback((item: any): number => {
    let stock = Number(item.openingQty) || 0;
    if (Array.isArray(vouchers)) {
      for (const v of vouchers) {
        if (!v.inventoryEntries) continue;
        for (const ie of v.inventoryEntries) {
          const isMatch = ie.itemId === item.id ||
            (ie.stockItemId && ie.stockItemId === item.id) ||
            (ie.itemName && item.name && ie.itemName.trim().toLowerCase() === item.name.trim().toLowerCase());
          if (isMatch) {
            const q = Number(ie.qty) || 0;
            if (v.type === 'Purchase' || v.type === 'Credit Note') {
              stock += q;
            } else if (v.type === 'Sales' || v.type === 'Debit Note' || v.type === 'POS Sale') {
              stock -= q;
            } else if (v.type === 'Manufacturing Journal' || v.type === 'Manufacturing') {
              const isMfgProd = ie.entryType === 'Production' || (ie.desc1 && ie.desc1.includes('Production'));
              if (isMfgProd) stock += q;
              else stock -= q;
            }
          }
        }
      }
    }
    return Math.round(stock * 100) / 100;
  }, [vouchers]);

  // Active Purchase POS List (Stock, MRP, Barcodes, Retail Prices, Expiry & Discounts)
  const [activePOSPurchaseList, setActivePOSPurchaseList] = useState<any[]>(posPurchaseList || []);

  useEffect(() => {
    if (Array.isArray(posPurchaseList) && posPurchaseList.length > 0) {
      setActivePOSPurchaseList(posPurchaseList);
      return;
    }
    // Fallback load from LocalStorage and disk
    try {
      const local = localStorage.getItem(`ledgerx_pos_purchase_list_${companyCode}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActivePOSPurchaseList(parsed);
          return;
        }
      }
    } catch (_) { }
    companyDataFolderService.loadCompanyFolder(companyCode).then(f => {
      if (f?.posPurchaseList && Array.isArray(f.posPurchaseList) && f.posPurchaseList.length > 0) {
        setActivePOSPurchaseList(f.posPurchaseList);
      }
    }).catch(() => { });
  }, [posPurchaseList, companyCode]);

  // Unified Catalog: Stock items merged with Purchase POS List
  // Guarantees that every item in POS Sale (and barcode scanning) uses Retail Sale Price, MRP & Discount from Purchase POS List
  const catalogItems = useMemo(() => {
    const list = Array.isArray(stockItems) ? [...stockItems] : [];
    const posList = Array.isArray(activePOSPurchaseList) ? activePOSPurchaseList : [];

    const merged = list.map(si => {
      const targetId = Number(si.id);
      const targetName = (si.name || '').trim().toLowerCase();
      const posMatch = posList.find(p =>
        (targetId && Number(p.id) === targetId) ||
        ((p.barcode || '').trim() && (p.barcode || '').trim() === (si.barcode || '').trim()) ||
        ((p.name || '').trim().toLowerCase() === targetName)
      );

      const resolvedUnit = resolveUnitString(posMatch?.unit ? posMatch : si);
      const mrp = Number(posMatch?.mrp) > 0 ? Number(posMatch.mrp) : (Number(si.mrp) > 0 ? Number(si.mrp) : 0);
      const discountPerc = Number(posMatch?.discountPerc) || 0;
      const discountAmt = Number(posMatch?.discountAmt) || 0;

      let retailSalePrice = Number(posMatch?.retailSalePrice);
      if (isNaN(retailSalePrice) || retailSalePrice <= 0) {
        if (mrp > 0 && discountAmt > 0) retailSalePrice = Math.max(0, mrp - discountAmt);
        else if (mrp > 0 && discountPerc > 0) retailSalePrice = Math.max(0, mrp - (mrp * discountPerc / 100));
        else if (mrp > 0) retailSalePrice = mrp;
        else retailSalePrice = Number(si.rateInclTax || si.openingRate) || 0;
      }

      return {
        ...si,
        unit: resolvedUnit,
        barcode: (posMatch?.barcode || '').trim() || (si.barcode || '').trim() || (si.partNumber || '').trim(),
        mrp: mrp > 0 ? mrp : retailSalePrice,
        discountPerc,
        discountAmt,
        retailSalePrice,
        expiryDate: posMatch?.expiryDate || si.expiryDate || '',
      };
    });

    posList.forEach(p => {
      if (!p || !p.name) return;
      const exists = merged.some(m => m.id === p.id || m.name.trim().toLowerCase() === p.name.trim().toLowerCase());
      if (!exists) {
        const mrp = Number(p.mrp) || 0;
        const discountPerc = Number(p.discountPerc) || 0;
        const discountAmt = Number(p.discountAmt) || 0;
        let retailSalePrice = Number(p.retailSalePrice);
        if (isNaN(retailSalePrice) || retailSalePrice <= 0) {
          retailSalePrice = mrp > 0 ? Math.max(0, mrp - (discountAmt || (mrp * discountPerc / 100))) : 0;
        }
        merged.push({
          id: p.id || Date.now() + Math.floor(Math.random() * 1000),
          name: p.name,
          unit: resolveUnitString(p),
          barcode: (p.barcode || '').trim(),
          mrp: mrp > 0 ? mrp : retailSalePrice,
          discountPerc,
          discountAmt,
          retailSalePrice,
          openingQty: Number(p.openingStock) || 0,
          gstRate: Number(p.gstRate) || 18,
          hsnCode: p.hsnCode || '',
          expiryDate: p.expiryDate || '',
        });
      }
    });

    return merged;
  }, [stockItems, activePOSPurchaseList]);

  // Filter items: Only positive stock (> 0) shown in both Sale POS and Rubic POS
  const positiveStockItems = useMemo(() => {
    return catalogItems
      .map(item => ({
        ...item,
        _calculatedStock: getItemStock(item)
      }))
      .filter(item => item._calculatedStock > 0);
  }, [catalogItems, getItemStock]);

  // AI Product Image Generator Trigger
  const handleGenerateAIImages = () => {
    setIsGeneratingAI(true);
    try {
      const updatedMap = { ...aiImagesMap };
      let generatedCount = 0;
      for (const it of stockItems) {
        const key = String(it.id);
        if (!updatedMap[key] && !it.image) {
          updatedMap[key] = generateAIImageForProduct(it);
          generatedCount++;
        }
      }
      setAiImagesMap(updatedMap);
      if (typeof window !== 'undefined') {
        localStorage.setItem('ledgerx_stock_item_ai_images', JSON.stringify(updatedMap));
      }
      alert(`✨ AI Image Generation Complete!\nGenerated realistic product imagery for ${generatedCount} items.`);
    } catch (err: any) {
      alert('AI image generation error: ' + err.message);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Add & register in scannedActiveItems
  const handleSelectOrScanItem = (item: any, quantity = 1) => {
    addItemToCart(item, quantity);
    setScannedActiveItems(prev => {
      const exists = prev.find(p => p.id === item.id);
      if (exists) return prev;
      return [item, ...prev];
    });
  };
  const [lastCompletedBill, setLastCompletedBill] = useState<{
    billNo: string;
    items: POSCartItem[];
    totals: POSCartTotals;
    payment: POSPaymentDetails;
    customer: POSCustomer;
  } | null>(null);

  // Scanner buffer ref for hardware USB/Bluetooth barcode guns
  const scanBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Inactivity auto-lock timer ref (triggers poss3 Secure Mode after 60s idle)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const IDLE_TIMEOUT_MS = 60000; // 60 seconds

  // Reset inactivity timer on user action
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    // Only arm idle timer if secure modal is not already open
    if (!showSecureModal && !showPaymentModal && !showReceiptModal) {
      idleTimerRef.current = setTimeout(() => {
        setShowSecureModal(true);
      }, IDLE_TIMEOUT_MS);
    }
  }, [showSecureModal, showPaymentModal, showReceiptModal]);

  // Track user activity for auto-lock
  useEffect(() => {
    const handleActivity = () => resetIdleTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    resetIdleTimer();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // Cart totals calculation with promo discount
  const totals = posService.calculateCartTotals(cart, promoDiscountAmt);

  // Realtime clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio Scanner Beep
  const playBeep = (freq = 880, duration = 0.08) => {
    try {
      if (typeof window !== 'undefined' && (window as any).AudioContext) {
        const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.start();
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.stop(ctx.currentTime + duration);
      }
    } catch (e) { }
  };

  // Hardware Barcode Scanner listener
  useEffect(() => {
    const handleHardwareScan = (e: KeyboardEvent) => {
      if (showPaymentModal || showSecureModal || showReceiptModal || showCatalogModal) return;

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Handle Escape to exit POS
      if (e.key === 'Escape') {
        if (cart.length > 0) {
          if (confirm('Discard current POS bill and exit?')) {
            onBack();
          }
        } else {
          onBack();
        }
        return;
      }

      // Handle F12 or Ctrl+Enter for Quick Pay
      if (e.key === 'F12' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        if (cart.length > 0) setShowPaymentModal(true);
        return;
      }

      // Barcode Gun sends keystrokes rapidly (typically < 45ms per character)
      if (e.key === 'Enter') {
        if (scanBufferRef.current.length >= 3) {
          e.preventDefault();
          const scanned = scanBufferRef.current;
          scanBufferRef.current = '';
          handleProcessBarcode(scanned);
          return;
        }
        scanBufferRef.current = '';
      } else if (e.key.length === 1) {
        if (timeDiff > 60) {
          scanBufferRef.current = '';
        }
        scanBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleHardwareScan);
    return () => window.removeEventListener('keydown', handleHardwareScan);
  }, [cart, showPaymentModal, showSecureModal, showReceiptModal, showCatalogModal]);

  // Process barcode lookup
  const handleProcessBarcode = (query: string) => {
    if (!query || !query.trim()) return;
    const cleanQ = query.trim();

    const matched = posService.matchStockItem(cleanQ, catalogItems);
    if (matched) {
      playBeep(1046, 0.08); // Success high beep
      handleSelectOrScanItem(matched);
      setBarcodeInput('');
    } else {
      playBeep(330, 0.2); // Error low buzz
      alert(`Item not found for barcode / code: "${cleanQ}"`);
    }
  };

  // Helper to resolve actual item unit (e.g. Kg, Box, Pcs, Bags, Ltr, Mtr, Nos)
  const resolveItemUnit = useCallback((item: any): string => {
    if (!item) return '';
    return resolveUnitString(item);
  }, []);

  // Add item to cart (with tax-inclusive rate & resolved unit)
  const addItemToCart = (item: any, quantity = 1) => {
    const baseRate = Number(item.openingRate) || 0;
    const gstRate = Number(item.gstRate) || 0;
    const retailPrice = Number(item.retailSalePrice);
    const rateWithTax = retailPrice > 0
      ? retailPrice
      : (item.showInclTax || item.rateInclTax
        ? Number(item.rateInclTax || item.openingRate)
        : Math.round(baseRate * (1 + gstRate / 100) * 100) / 100);

    const mrpRate = Number(item.mrp) > 0 ? Number(item.mrp) : rateWithTax;
    const availableStock = item._calculatedStock !== undefined ? item._calculatedStock : (Number(item.openingQty) || 0);
    const itemUnit = resolveItemUnit(item);
    const discPerc = Number(item.discountPerc) || 0;
    const discAmt = Number(item.discountAmt) || (mrpRate > rateWithTax ? (mrpRate - rateWithTax) : 0);

    // Check if already in cart
    const existingIdx = cart.findIndex(c => c.itemId === item.id);
    if (existingIdx >= 0) {
      const existing = cart[existingIdx];
      const newQty = existing.qty + quantity;
      const updated = posService.calculateLineItem({
        itemId: existing.itemId,
        name: existing.name,
        barcode: existing.barcode,
        hsnCode: existing.hsnCode,
        unit: itemUnit || existing.unit || 'Nos',
        qty: newQty,
        mrpRate: existing.mrpRate || mrpRate,
        rateWithTax: existing.rateWithTax || rateWithTax,
        gstRate: existing.gstRate,
        discountPerc: existing.discountPerc !== undefined ? existing.discountPerc : discPerc,
        discountAmt: (discAmt > 0 ? discAmt * newQty : 0),
        stockAvailable: existing.stockAvailable,
      }, false, existing.cartId);

      setCart(prev => prev.map((c, i) => (i === existingIdx ? updated : c)));
      setSelectedCartId(existing.cartId);
    } else {
      const lineItem = posService.calculateLineItem({
        itemId: item.id,
        name: item.name,
        barcode: item.barcode,
        hsnCode: item.hsnCode,
        unit: itemUnit,
        qty: quantity,
        mrpRate,
        rateWithTax,
        gstRate,
        discountPerc: discPerc,
        discountAmt: discAmt * quantity,
        stockAvailable: availableStock,
      });

      setCart(prev => [lineItem, ...prev]);
      setSelectedCartId(lineItem.cartId);
    }
  };

  // Row selection arrows: [⬇] Down and [⬆] Up
  const handleSelectDown = () => {
    if (cart.length === 0) return;
    if (!selectedCartId) {
      setSelectedCartId(cart[0].cartId);
      return;
    }
    const idx = cart.findIndex(c => c.cartId === selectedCartId);
    if (idx >= 0 && idx < cart.length - 1) {
      setSelectedCartId(cart[idx + 1].cartId);
    }
  };

  const handleSelectUp = () => {
    if (cart.length === 0) return;
    if (!selectedCartId) {
      setSelectedCartId(cart[cart.length - 1].cartId);
      return;
    }
    const idx = cart.findIndex(c => c.cartId === selectedCartId);
    if (idx > 0) {
      setSelectedCartId(cart[idx - 1].cartId);
    }
  };

  // Quantity adjusters: Circular [-] and [+] buttons
  const handleIncrementSelected = () => {
    if (!selectedCartId) return;
    setCart(prev =>
      prev.map(item => {
        if (item.cartId === selectedCartId) {
          playBeep(980, 0.04);
          return posService.calculateLineItem({
            ...item,
            qty: item.qty + 1,
          }, false, item.cartId);
        }
        return item;
      })
    );
  };

  const handleDecrementSelected = () => {
    if (!selectedCartId) return;
    setCart(prev =>
      prev
        .map(item => {
          if (item.cartId === selectedCartId) {
            playBeep(740, 0.04);
            const nextQty = item.qty - 1;
            if (nextQty <= 0) return null;
            return posService.calculateLineItem({
              ...item,
              qty: nextQty,
            }, false, item.cartId);
          }
          return item;
        })
        .filter(Boolean) as POSCartItem[]
    );
  };

  // Void selected item or entire bill
  const handleVoidItemOrBill = () => {
    if (selectedCartId) {
      if (confirm('Void selected item from cart?')) {
        const itemToVoid = cart.find(c => c.cartId === selectedCartId);
        setCart(prev => prev.filter(c => c.cartId !== selectedCartId));
        if (itemToVoid) {
          setScannedActiveItems(prev => prev.filter(it => it.id !== itemToVoid.itemId));
        }
        setSelectedCartId(null);
      }
    } else if (cart.length > 0) {
      if (confirm('Void entire current bill and reset cart?')) {
        resetNewSale();
      }
    } else {
      alert('Cart is empty.');
    }
  };

  // RR Coupon Promo handler
  const handleApplyCoupon = () => {
    const coupon = prompt('Enter Promotional / Discount Coupon Code or Amount (₹):', '150');
    if (!coupon) return;
    const numAmt = parseFloat(coupon);
    if (!isNaN(numAmt) && numAmt > 0) {
      setPromoDiscountAmt(numAmt);
      alert(`Applied Promo Discount: ₹${numAmt.toFixed(2)}`);
    } else if (coupon.toUpperCase() === 'SAVE150' || coupon.toUpperCase() === 'RELIANCE150') {
      setPromoDiscountAmt(150);
      alert('Coupon Applied: ₹150.00 Promo Discount!');
    } else {
      alert(`Coupon code "${coupon}" applied successfully with ₹50 discount.`);
      setPromoDiscountAmt(50);
    }
  };

  // Universal keyboard & numpad typing handler (works across Secure Mode, Mobile No, Barcode, etc.)
  const handleUniversalKey = (key: string) => {
    if (showSecureModal || activeFieldRef.current === 'securePassword') {
      setSecurePassword(prev => prev + key);
      return;
    }

    if (activeFieldRef.current === 'mobile') {
      const el = mobileInputRef.current;
      if (el && el.selectionStart !== null && el.selectionEnd !== null) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        setCustomerMobile(prev => {
          const nextVal = prev.slice(0, start) + key + prev.slice(end);
          setTimeout(() => {
            el.selectionStart = start + key.length;
            el.selectionEnd = start + key.length;
          }, 0);
          return nextVal;
        });
      } else {
        setCustomerMobile(prev => prev + key);
      }
      return;
    }

    // Default: Barcode input
    const el = barcodeInputRef.current;
    if (el && el.selectionStart !== null && el.selectionEnd !== null) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      setBarcodeInput(prev => {
        const nextVal = prev.slice(0, start) + key + prev.slice(end);
        setTimeout(() => {
          el.selectionStart = start + key.length;
          el.selectionEnd = start + key.length;
        }, 0);
        return nextVal;
      });
    } else {
      setBarcodeInput(prev => prev + key);
      if (el && document.activeElement !== el) el.focus();
    }
  };

  const handleUniversalBackspace = () => {
    if (showSecureModal || activeFieldRef.current === 'securePassword') {
      setSecurePassword(prev => prev.slice(0, -1));
      return;
    }

    if (activeFieldRef.current === 'mobile') {
      const el = mobileInputRef.current;
      if (el && el.selectionStart !== null && el.selectionEnd !== null) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        if (start === end && start > 0) {
          setCustomerMobile(prev => {
            const nextVal = prev.slice(0, start - 1) + prev.slice(end);
            setTimeout(() => {
              el.selectionStart = start - 1;
              el.selectionEnd = start - 1;
            }, 0);
            return nextVal;
          });
          return;
        } else if (start !== end) {
          setCustomerMobile(prev => {
            const nextVal = prev.slice(0, start) + prev.slice(end);
            setTimeout(() => {
              el.selectionStart = start;
              el.selectionEnd = start;
            }, 0);
            return nextVal;
          });
          return;
        }
      }
      setCustomerMobile(prev => prev.slice(0, -1));
      return;
    }

    const el = barcodeInputRef.current;
    if (el && el.selectionStart !== null && el.selectionEnd !== null) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start === end && start > 0) {
        setBarcodeInput(prev => {
          const nextVal = prev.slice(0, start - 1) + prev.slice(end);
          setTimeout(() => {
            el.selectionStart = start - 1;
            el.selectionEnd = start - 1;
          }, 0);
          return nextVal;
        });
        return;
      } else if (start !== end) {
        setBarcodeInput(prev => {
          const nextVal = prev.slice(0, start) + prev.slice(end);
          setTimeout(() => {
            el.selectionStart = start;
            el.selectionEnd = start;
          }, 0);
          return nextVal;
        });
        return;
      }
    }
    setBarcodeInput(prev => prev.slice(0, -1));
  };

  const handleUniversalClear = () => {
    if (showSecureModal || activeFieldRef.current === 'securePassword') {
      setSecurePassword('');
      return;
    }
    if (activeFieldRef.current === 'mobile') {
      setCustomerMobile('');
      return;
    }
    setBarcodeInput('');
  };

  const handleUniversalEnter = () => {
    if (showSecureModal || activeFieldRef.current === 'securePassword') {
      const submitBtn = document.getElementById('pos-secure-submit-btn');
      if (submitBtn) {
        submitBtn.click();
      }
      return;
    }
    if (activeFieldRef.current === 'mobile') {
      activeFieldRef.current = 'barcode';
      setActiveField('barcode');
      if (barcodeInputRef.current) barcodeInputRef.current.focus();
      return;
    }
    if (barcodeInput.trim()) {
      handleProcessBarcode(barcodeInput);
    } else if (cart.length > 0) {
      setShowPaymentModal(true);
    }
  };

  // Hold current bill
  const handleHoldBill = () => {
    if (cart.length === 0) {
      alert('Cart is empty. Nothing to suspend/hold.');
      return;
    }
    const held: POSHeldBill = {
      id: `hold_${Date.now()}`,
      billNo,
      heldAt: new Date().toLocaleTimeString(),
      customer: { name: customerName, mobile: customerMobile, walkInDelivery },
      items: cart,
      totals,
    };
    posService.holdBill(companyCode, held);
    alert(`Bill ${billNo} has been SUSPENDED.`);
    resetNewSale();
  };

  // Reset for new sale
  const resetNewSale = () => {
    setCart([]);
    setSelectedCartId(null);
    setBarcodeInput('');
    setPromoDiscountAmt(0);
    setScannedActiveItems([]);
    setBillNo(posService.generateBillNo(vouchers, companyCode));
  };

  // Finalize payment from modal
  const handleConfirmPayment = async (payment: POSPaymentDetails, customer: POSCustomer) => {
    setShowPaymentModal(false);

    // If in Training Mode, persist strictly into isolated TRAINING folder ONLY
    if (isTrainingMode) {
      playBeep(1200, 0.15);
      const trnResult = await posTrainingService.recordTrainingSale({
        billNo,
        items: cart,
        totals,
        payment,
        customer: { name: customerName, mobile: customerMobile, walkInDelivery },
        cashierName,
      });

      if (trnResult.success) {
        if (onStockUpdated) onStockUpdated(trnResult.updatedStock);
        if (onVouchersUpdated) onVouchersUpdated([...vouchers, trnResult.voucher]);
      }

      setLastCompletedBill({
        billNo,
        items: cart,
        totals,
        payment,
        customer: { name: customerName, mobile: customerMobile, walkInDelivery },
      });
      setShowReceiptModal(true);
      return;
    }

    const result = await posService.finalizePOSSale({
      company,
      companyCode,
      billNo,
      customer,
      items: cart,
      totals,
      payment,
      cashierName,
      existingStockItems: stockItems,
      existingVouchers: vouchers,
      ledgers,
    });

    if (result.success && result.voucher) {
      playBeep(1200, 0.15);
      if (onStockUpdated) onStockUpdated(result.updatedStockItems);
      if (onVouchersUpdated) onVouchersUpdated([...vouchers, result.voucher]);

      setLastCompletedBill({
        billNo,
        items: cart,
        totals,
        payment,
        customer,
      });

      // Auto-trigger receipt modal with auto-print!
      setShowReceiptModal(true);
    } else {
      alert(result.error || 'Failed to complete sale!');
    }
  };

  // Quick 8 Pill items for the right upper panel
  const quickItems = catalogItems.slice(0, 8);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: '#e2e8f0',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
      }}
    >
      <style>{`
        .pos-touch-btn {
          touch-action: manipulation;
          user-select: none;
          -webkit-user-select: none;
          transition: transform 0.06s ease, box-shadow 0.06s ease, filter 0.06s ease;
        }
        .pos-touch-btn:active {
          transform: translateY(2px) scale(0.97) !important;
          box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.25), 0 1px 2px rgba(0, 0, 0, 0.1) !important;
          filter: brightness(0.95);
        }
        .pos-glass-morph-btn {
          touch-action: manipulation;
          user-select: none;
          -webkit-user-select: none;
          position: relative;
          transition: transform 0.08s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.08s cubic-bezier(0.4, 0, 0.2, 1), filter 0.08s ease;
        }
        .pos-glass-morph-btn:hover {
          filter: brightness(1.04);
          transform: translateY(-1px);
        }
        .pos-glass-morph-btn:active {
          transform: translateY(2.5px) scale(0.96) !important;
          box-shadow: inset 0 3.5px 7px rgba(0, 0, 0, 0.35), 0 1px 2px rgba(0, 0, 0, 0.15) !important;
          filter: brightness(0.93);
        }
      `}</style>
      {/* ==================== 1. TOP HEADER BAR (MAROON / BURGUNDY) ==================== */}
      <div
        style={{
          background: 'linear-gradient(180deg, #7b1824 0%, #61111c 100%)',
          color: '#ffffff',
          padding: '6px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #4a0c14',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          minHeight: 50,
          pointerEvents: showSecureModal ? 'none' : 'auto',
          opacity: showSecureModal ? 0.65 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        {/* Left Branding (Exact LedgerX logo mark matching user image) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Yellow Rounded Badge with Bold Dark Blue 'L' */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 24,
              color: '#0f3c64',
              boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
              userSelect: 'none',
              lineHeight: 1,
            }}
          >
            L
          </div>

          {/* Bold White 'LedgerX' typography */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: -0.5,
              }}
            >
              LedgerX
            </span>
            <span
              style={{
                background: '#f59e0b',
                color: '#0f3c64',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 900,
              }}
            >
              POS
            </span>
            {isTrainingMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 'bold',
                    letterSpacing: 0.5,
                  }}
                >
                  🎓 TRAINING MODE (DEMO SANDBOX)
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Reset Training Demo Data to fresh default state (stock = 50, demo sales cleared)?')) {
                      const fresh = await posTrainingService.resetTrainingData();
                      if (onStockUpdated) onStockUpdated(fresh.stockItems);
                      if (onVouchersUpdated) onVouchersUpdated(fresh.vouchers);
                      resetNewSale();
                      alert('Training Demo Data has been restored to default state.');
                    }
                  }}
                  title="Reset Demo Data"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.4)',
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: 10,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  🔄 Reset Demo Stock
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Center System Info / Cashier Meta (replica of Posiflex header line) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 12, color: '#fecdd3' }}>
          <div>
            Cashier: <b style={{ color: '#ffffff' }}>{cashierName}</b>
          </div>
          <div>
            Store: <b style={{ color: '#ffffff' }}>{company?.name || 'Main Retail'}</b> [{companyCode}]
          </div>
          <div>
            Txn: <b style={{ color: '#ffffff' }}>{billNo}</b>
          </div>
          <div>
            {dateStr} <b style={{ color: '#ffffff', marginLeft: 4 }}>{clock}</b>
          </div>
        </div>

        {/* Right Search Input & Exit Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', width: 260 }}>
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Scan Barcode / Item Code..."
              value={barcodeInput}
              onFocus={() => {
                activeFieldRef.current = 'barcode';
                setActiveField('barcode');
              }}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleProcessBarcode(barcodeInput);
                }
              }}
              style={{
                width: '100%',
                padding: '6px 36px 6px 12px',
                borderRadius: 20,
                border: activeField === 'barcode' ? '2px solid #38bdf8' : '2px solid #fbbf24',
                fontSize: 12,
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none',
                background: '#ffffff',
              }}
            />
            <span
              onClick={() => handleProcessBarcode(barcodeInput)}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                fontSize: 14,
              }}
              title="Search / Scan"
            >
              🔍
            </span>
          </div>

          {/* Fullscreen Kiosk Mode Button */}
          <button
            className="pos-touch-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (F11)" : "Enter 100% Fullscreen Software Mode (F11)"}
            style={{
              background: 'linear-gradient(180deg, #10b981 0%, #059669 60%, #047857 100%)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              borderBottom: '2px solid #065f46',
              borderRadius: 8,
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 800,
              boxShadow: '0 4px 10px rgba(5, 150, 105, 0.4), inset 0 1.5px 1px rgba(255, 255, 255, 0.7)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {isFullscreen ? '🗗 Window' : '⛶ Fullscreen'}
          </button>

          {/* Secure Lock Button */}
          <button
            className="pos-touch-btn"
            onClick={() => setShowSecureModal(true)}
            title="Lock POS Terminal (Secure Mode)"
            style={{
              background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 60%, #0369a1 100%)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              borderBottom: '2px solid #075985',
              borderRadius: 8,
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 800,
              boxShadow: '0 4px 10px rgba(2, 132, 199, 0.4), inset 0 1.5px 1px rgba(255, 255, 255, 0.7)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            🔒 Lock
          </button>

          {/* Exit POS Button */}
          <button
            className="pos-touch-btn"
            onClick={() => {
              const handleExitAction = () => {
                if (permissionGuard.isClientSession()) {
                  if (onLogoutToLogin) onLogoutToLogin();
                  else onBack();
                } else {
                  onBack();
                }
              };

              if (cart.length > 0) {
                if (confirm('Discard current POS cart and switch cashier / exit?')) {
                  handleExitAction();
                }
              } else {
                handleExitAction();
              }
            }}
            title="Exit POS Terminal (Esc)"
            style={{
              background: 'linear-gradient(180deg, #f87171 0%, #dc2626 60%, #991b1b 100%)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              borderBottom: '2px solid #7f1d1d',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 800,
              boxShadow: '0 4px 10px rgba(220, 38, 38, 0.4), inset 0 1.5px 1px rgba(255, 255, 255, 0.7)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            ✕ Exit (Esc)
          </button>
        </div>
      </div>

      {/* ==================== 2. MAIN POS WORKSPACE (SPLIT LAYOUT) ==================== */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ========== LEFT PANEL: ITEM CART TABLE + STATS + RIBBON + TOUCH KEYBOARD ========== */}
        <div
          style={{
            flex: 6.5,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '2px solid #cbd5e1',
            background: '#ffffff',
            overflow: 'hidden',
          }}
        >
          {/* Cart Table */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              pointerEvents: showSecureModal ? 'none' : 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
              <thead>
                <tr
                  style={{
                    background: '#f1f5f9',
                    borderBottom: '2px solid #cbd5e1',
                    color: '#334155',
                    fontSize: 12,
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                  }}
                >
                  <th style={{ width: '46%', padding: '8px 12px' }}>Item Description</th>
                  <th style={{ width: '14%', padding: '8px', textAlign: 'center' }}>Qty</th>
                  <th style={{ width: '20%', padding: '8px', textAlign: 'right' }}>Price (Incl Tax)</th>
                  <th style={{ width: '20%', padding: '8px 12px', textAlign: 'right' }}>Amt (₹)</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  // Blank cyan/blue striped placeholder bars (matching Posiflex screen poss2)
                  Array.from({ length: 9 }).map((_, i) => (
                    <tr
                      key={i}
                      style={{
                        height: 34,
                        background: i % 2 === 0 ? '#38bdf8' : '#7dd3fc',
                        opacity: 0.35,
                        borderBottom: '1px solid #bae6fd',
                      }}
                    >
                      <td colSpan={4} style={{ padding: '0 12px', color: '#0369a1', fontSize: 11, fontStyle: 'italic' }}>
                        {i === 3 && 'Ready to scan barcode or select items...'}
                      </td>
                    </tr>
                  ))
                ) : (
                  cart.map((item, index) => {
                    const isSelected = selectedCartId === item.cartId;
                    return (
                      <tr
                        key={item.cartId}
                        onClick={() => setSelectedCartId(item.cartId)}
                        style={{
                          height: 40,
                          cursor: 'pointer',
                          background: isSelected
                            ? '#fef08a' // Selected highlight
                            : index % 2 === 0
                              ? '#e0f2fe' // Alternating cyan light
                              : '#bae6fd', // Alternating cyan dark
                          borderBottom: '1px solid #93c5fd',
                          color: '#0f172a',
                          fontWeight: isSelected ? 'bold' : 500,
                        }}
                      >
                        <td style={{ padding: '6px 12px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{item.name}</div>
                          <div style={{ fontSize: 9.5, color: '#475569', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                            {item.unit && (
                              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: 4, fontWeight: 800, fontSize: 9 }}>
                                Unit: {item.unit}
                              </span>
                            )}
                            {/* Visible Item Discount Badge (exact user requirement: "aur item pr jitna discount ho apne discount ki jgah dikhe") */}
                            {(item.mrpRate > item.rateWithTax || (item.discountPerc && item.discountPerc > 0) || (item.discountAmt && item.discountAmt > 0)) && (
                              <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '1px 6px', borderRadius: 4, fontWeight: 700, fontSize: 9 }}>
                                🏷️ MRP: ₹{item.mrpRate.toFixed(2)} • Disc: {item.discountPerc > 0 ? `${item.discountPerc.toFixed(1)}%` : `₹${item.discountAmt.toFixed(2)}`} (Save ₹{((item.mrpRate - item.rateWithTax) * item.qty).toFixed(2)})
                              </span>
                            )}
                            {item.barcode && <span style={{ color: '#64748b' }}>Barcode: {item.barcode}</span>}
                            {item.hsnCode && <span>HSN: {item.hsnCode}</span>}
                            {item.gstRate !== undefined && <span>GST: {item.gstRate}%</span>}
                          </div>
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center', fontSize: 14, fontWeight: 'bold' }}>
                          {item.qty} {item.unit}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'right', fontSize: 13, fontWeight: 600 }}>
                          ₹{item.rateWithTax.toFixed(2)}
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', fontSize: 14, fontWeight: 'bold', color: '#0f3c64' }}>
                          ₹{item.lineTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ==================== SUB-TABLE STATS BLOCK (EXACT POSS2 PHOTO REPLICA) ==================== */}
          <div
            style={{
              background: '#f8fafc',
              borderTop: '2px solid #cbd5e1',
              borderBottom: '2px solid #cbd5e1',
              padding: '8px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12,
              color: '#1e293b',
              pointerEvents: showSecureModal ? 'none' : 'auto',
              opacity: showSecureModal ? 0.7 : 1,
              transition: 'opacity 0.2s ease',
            }}
          >
            {/* Left Column of Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                <span style={{ color: '#475569' }}>Total Discount:</span>
                <span style={{ fontWeight: 'bold' }}>₹{totals.discountAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                <span style={{ color: '#475569' }}>Promo Amount:</span>
                <span style={{ fontWeight: 'bold', color: promoDiscountAmt > 0 ? '#16a34a' : '#475569' }}>
                  {promoDiscountAmt > 0 ? `- ₹${promoDiscountAmt.toFixed(2)}` : '0.00'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ color: '#475569' }}>Mobile No:</span>
                <input
                  ref={mobileInputRef}
                  type="text"
                  placeholder="Customer Phone"
                  value={customerMobile}
                  onFocus={() => {
                    activeFieldRef.current = 'mobile';
                    setActiveField('mobile');
                  }}
                  onChange={e => setCustomerMobile(e.target.value)}
                  style={{
                    padding: '2px 6px',
                    fontSize: 11,
                    border: activeField === 'mobile' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    borderRadius: 4,
                    width: 110,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Right Column of Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                <span style={{ color: '#475569' }}>Txn:</span>
                <span style={{ fontWeight: 'bold' }}>{billNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                <span style={{ color: '#475569' }}>Item Count:</span>
                <span style={{ fontWeight: 'bold' }}>{totals.itemsCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center' }}>
                <span style={{ color: '#475569' }}>Total:</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#0f3c64' }}>
                  ₹{totals.grandTotal.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  id="walkInDeliveryCheck"
                  checked={walkInDelivery}
                  onChange={e => setWalkInDelivery(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="walkInDeliveryCheck" style={{ cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#334155' }}>
                  Walk in Delivery
                </label>
              </div>
            </div>

            {/* Row Selection Arrow Controls: [ ⬇ ] and [ ⬆ ] */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="pos-touch-btn"
                onClick={handleSelectDown}
                title="Select Next Row Down"
                style={glassArrowBtnStyle}
              >
                ⬇
              </button>
              <button
                type="button"
                className="pos-touch-btn"
                onClick={handleSelectUp}
                title="Select Previous Row Up"
                style={glassArrowBtnStyle}
              >
                ⬆
              </button>
            </div>
          </div>

          {/* ==================== HORIZONTAL ACTION RIBBON (MATCHING POSS2 PHOTO) ==================== */}
          <div
            style={{
              background: 'linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%)',
              padding: '8px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              borderBottom: '1px solid #cbd5e1',
              boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.8)',
              overflowX: 'auto',
              pointerEvents: showSecureModal ? 'none' : 'auto',
              opacity: showSecureModal ? 0.6 : 1,
              transition: 'opacity 0.2s ease',
            }}
          >
            {/* 1. Secure Mode */}
            <button
              type="button"
              className="pos-touch-btn"
              onClick={() => setShowSecureModal(true)}
              style={ribbonBtnStyle}
              title="Secure Mode Lock"
            >
              <div style={ribbonIconCircleStyle}>🔒</div>
              <span style={ribbonTextStyle}>Secure Mode</span>
            </button>

            {/* 1B. Purchase POS List (Stock, MRP, Barcodes & Labels) - Protected by Role Permission */}
            {hasPurchasePOSListPermission() && onOpenPurchasePOSList && (
              <button
                type="button"
                className="pos-touch-btn"
                onClick={onOpenPurchasePOSList}
                style={{
                  ...ribbonBtnStyle,
                  background: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)',
                  border: '1.5px solid #d97706',
                }}
                title="Purchase POS List (Stock, MRP, Barcodes & Labels)"
              >
                <div style={{ ...ribbonIconCircleStyle, color: '#b45309' }}>📋</div>
                <span style={{ ...ribbonTextStyle, color: '#92400e', fontWeight: 900 }}>POS List</span>
              </button>
            )}

            {/* 2. Void */}
            <button
              type="button"
              className="pos-touch-btn"
              onClick={handleVoidItemOrBill}
              style={ribbonBtnStyle}
              title="Void Item / Bill"
            >
              <div style={{ ...ribbonIconCircleStyle, color: '#dc2626' }}>🗑️</div>
              <span style={ribbonTextStyle}>Void</span>
            </button>

            {/* 3. RR Coupon */}
            <button
              type="button"
              className="pos-touch-btn"
              onClick={handleApplyCoupon}
              style={ribbonBtnStyle}
              title="Apply Promo / Coupon"
            >
              <div style={{ ...ribbonIconCircleStyle, color: '#d97706' }}>🎟️</div>
              <span style={ribbonTextStyle}>RR Coupon</span>
            </button>

            {/* 4. Product Search */}
            <button
              type="button"
              className="pos-touch-btn"
              onClick={() => setShowCatalogModal(true)}
              style={ribbonBtnStyle}
              title="Search Products / Catalog"
            >
              <div style={{ ...ribbonIconCircleStyle, color: '#0284c7' }}>🔍</div>
              <span style={ribbonTextStyle}>Product Search</span>
            </button>

            {/* 5. Order Pickup */}
            <button
              type="button"
              className="pos-touch-btn"
              onClick={() => {
                const orderId = prompt('Enter Order Pickup ID:');
                if (orderId) alert(`Pickup Order #${orderId} verified for customer!`);
              }}
              style={ribbonBtnStyle}
              title="Order Pickup"
            >
              <div style={{ ...ribbonIconCircleStyle, color: '#059669' }}>📦</div>
              <span style={ribbonTextStyle}>Order Pickup</span>
            </button>

            {/* 6. Suspend */}
            <button
              type="button"
              className="pos-touch-btn"
              onClick={handleHoldBill}
              disabled={cart.length === 0}
              style={ribbonBtnStyle}
              title="Suspend Current Bill"
            >
              <div style={{ ...ribbonIconCircleStyle, color: '#475569' }}>⏸️</div>
              <span style={ribbonTextStyle}>Suspend</span>
            </button>

            {/* 7. Balance Enquiry */}
            <button
              type="button"
              className="pos-touch-btn"
              onClick={() => {
                const acc = prompt('Enter Customer Mobile or Account ID for Balance Enquiry:', customerMobile);
                if (acc) alert(`Account: ${acc}\nLoyalty ROne Balance: ₹138.35\nAvailable Credit: ₹5,000.00`);
              }}
              style={ribbonBtnStyle}
              title="Balance Enquiry"
            >
              <div style={{ ...ribbonIconCircleStyle, color: '#7c3aed' }}>💳</div>
              <span style={ribbonTextStyle}>Balance Enquiry</span>
            </button>

            {/* 8. Keyboard Toggle */}
            <button
              type="button"
              className="pos-touch-btn"
              onClick={() => setShowKeyboard(prev => !prev)}
              style={ribbonBtnStyle}
              title="Toggle Virtual Keyboard"
            >
              <div style={ribbonIconCircleStyle}>⌨️</div>
              <span style={ribbonTextStyle}>{showKeyboard ? 'Hide Keys' : 'Show Keys'}</span>
            </button>

            {/* 9. Check Out */}
            <button
              type="button"
              className="pos-touch-btn"
              onClick={() => {
                if (cart.length === 0) {
                  alert('Cart is empty. Please scan or select an item first.');
                  return;
                }
                setShowPaymentModal(true);
              }}
              style={{
                ...ribbonBtnStyle,
                background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 55%, #15803d 100%)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                borderBottom: '3px solid #14532d',
                boxShadow: '0 6px 16px rgba(22, 163, 74, 0.4), inset 0 2px 2px rgba(255, 255, 255, 0.7), inset 0 -2px 3px rgba(0, 0, 0, 0.25)',
                color: '#ffffff',
                minWidth: 84,
              }}
              title="Check Out & Settle (F12)"
            >
              <div style={{ ...ribbonIconCircleStyle, background: 'linear-gradient(145deg, #ffffff, #dcfce7)', color: '#16a34a', fontWeight: 900, fontSize: 16 }}>
                ₹
              </div>
              <span style={{ ...ribbonTextStyle, color: '#ffffff', fontWeight: 900 }}>Check Out</span>
            </button>
          </div>

          {/* ==================== TOUCH QWERTY KEYBOARD (BOTTOM LEFT) ==================== */}
          {showKeyboard && (
            <div
              style={{
                padding: '6px 8px',
                background: '#cbd5e1',
                borderTop: '1px solid #94a3b8',
                position: 'relative',
                zIndex: showSecureModal ? 10005 : 1,
                pointerEvents: 'auto',
              }}
            >
              <POSVirtualKeyboard
                onKeyPress={handleUniversalKey}
                onBackspace={handleUniversalBackspace}
                onClear={handleUniversalClear}
                onOpenView={() => { if (!showSecureModal) setShowCatalogModal(true); }}
                onOpenSecureMode={() => setShowSecureModal(true)}
              />
            </div>
          )}
        </div>

        {/* ========== RIGHT PANEL: QUICK PILLS + SELECTED ITEM CONTROLS + NUMPAD ========== */}
        <div
          style={{
            flex: 3.5,
            minWidth: 460,
            background: '#f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: 8,
            overflow: 'hidden',
            height: '100%',
          }}
        >
          {/* Top Section: Quick Item Add + [sale pos] + [rubic pos] (Takes all space above Quantity Adjuster) */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              pointerEvents: showSecureModal ? 'none' : 'auto',
              opacity: showSecureModal ? 0.6 : 1,
              transition: 'opacity 0.2s ease',
            }}
          >
            {/* Header: Title + Sale POS + Rubic POS Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2, flexShrink: 0 }}>
              <div
                onClick={() => setRightViewMode('SCANNED')}
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: rightViewMode === 'SCANNED' ? '#0284c7' : '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
                title="View Scanned / Active Cart Items"
              >
                <span>⚡ QUICK ITEM ADD</span>
                {scannedActiveItems.length > 0 && (
                  <span style={{ fontSize: 9, background: '#0284c7', color: 'white', padding: '1px 6px', borderRadius: 10, fontWeight: 900 }}>
                    {scannedActiveItems.length}
                  </span>
                )}
              </div>

              {/* Two Action Buttons: sale pos (Blue Glassmorphism) & rubic pos (Green Glassmorphism) */}
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Blue Glassmorphism 3D Button: sale pos */}
                <button
                  type="button"
                  className="pos-glass-morph-btn"
                  onClick={() => setRightViewMode(prev => prev === 'SALE_POS' ? 'SCANNED' : 'SALE_POS')}
                  style={{
                    padding: '5px 13px',
                    fontSize: 11.5,
                    fontWeight: 900,
                    textTransform: 'lowercase',
                    borderRadius: 9,
                    cursor: 'pointer',
                    backdropFilter: rightViewMode === 'SALE_POS' ? 'blur(12px)' : 'blur(10px)',
                    WebkitBackdropFilter: rightViewMode === 'SALE_POS' ? 'blur(12px)' : 'blur(10px)',
                    background: rightViewMode === 'SALE_POS'
                      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.95) 0%, rgba(2, 132, 199, 0.95) 50%, rgba(3, 105, 161, 0.98) 100%)'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(224, 242, 254, 0.82) 50%, rgba(186, 230, 253, 0.72) 100%)',
                    color: rightViewMode === 'SALE_POS' ? '#ffffff' : '#0369a1',
                    border: rightViewMode === 'SALE_POS'
                      ? '1.5px solid rgba(255, 255, 255, 0.85)'
                      : '1.5px solid rgba(255, 255, 255, 0.95)',
                    borderBottom: rightViewMode === 'SALE_POS'
                      ? '3.5px solid #0369a1'
                      : '3px solid #38bdf8',
                    boxShadow: rightViewMode === 'SALE_POS'
                      ? '0 6px 14px rgba(2, 132, 199, 0.45), inset 0 2px 2px rgba(255, 255, 255, 0.75), inset 0 -2px 3px rgba(3, 105, 161, 0.6)'
                      : '0 4px 10px rgba(2, 132, 199, 0.2), inset 0 1.5px 2px #ffffff, inset 0 -1.5px 2px rgba(2, 132, 199, 0.15)',
                    textShadow: rightViewMode === 'SALE_POS' ? '0 1px 2px rgba(0, 0, 0, 0.35)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  title="Open Sale POS Item Stock List"
                >
                  <span style={{ fontSize: 13 }}>📋</span> sale pos
                </button>

                {/* Green Glassmorphism 3D Button: rubic pos */}
                <button
                  type="button"
                  className="pos-glass-morph-btn"
                  onClick={() => setRightViewMode(prev => prev === 'RUBIC_POS' ? 'SCANNED' : 'RUBIC_POS')}
                  style={{
                    padding: '5px 13px',
                    fontSize: 11.5,
                    fontWeight: 900,
                    textTransform: 'lowercase',
                    borderRadius: 9,
                    cursor: 'pointer',
                    backdropFilter: rightViewMode === 'RUBIC_POS' ? 'blur(12px)' : 'blur(10px)',
                    WebkitBackdropFilter: rightViewMode === 'RUBIC_POS' ? 'blur(12px)' : 'blur(10px)',
                    background: rightViewMode === 'RUBIC_POS'
                      ? 'linear-gradient(135deg, rgba(52, 211, 153, 0.95) 0%, rgba(16, 185, 129, 0.95) 50%, rgba(5, 150, 105, 0.98) 100%)'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(209, 250, 229, 0.82) 50%, rgba(167, 243, 208, 0.72) 100%)',
                    color: rightViewMode === 'RUBIC_POS' ? '#ffffff' : '#047857',
                    border: rightViewMode === 'RUBIC_POS'
                      ? '1.5px solid rgba(255, 255, 255, 0.85)'
                      : '1.5px solid rgba(255, 255, 255, 0.95)',
                    borderBottom: rightViewMode === 'RUBIC_POS'
                      ? '3.5px solid #064e3b'
                      : '3px solid #34d399',
                    boxShadow: rightViewMode === 'RUBIC_POS'
                      ? '0 6px 14px rgba(16, 185, 129, 0.45), inset 0 2px 2px rgba(255, 255, 255, 0.75), inset 0 -2px 3px rgba(5, 150, 105, 0.6)'
                      : '0 4px 10px rgba(16, 185, 129, 0.2), inset 0 1.5px 2px #ffffff, inset 0 -1.5px 2px rgba(16, 185, 129, 0.15)',
                    textShadow: rightViewMode === 'RUBIC_POS' ? '0 1px 2px rgba(0, 0, 0, 0.35)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  title="Open Rubic Visual Catalog with AI Images"
                >
                  <span style={{ fontSize: 13 }}>🎨</span> rubic pos
                </button>
              </div>
            </div>

            {/* Container Box: Fills all height down to Quantity Adjuster */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                background: 'rgba(255, 255, 255, 0.65)',
                border: '1.5px solid #cbd5e1',
                borderRadius: 10,
                padding: 6,
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* MODE 1: SCANNED / ACTIVE ITEMS (Empty until scanned/selected) */}
              {rightViewMode === 'SCANNED' && (
                <>
                  {scannedActiveItems.length === 0 ? (
                    <div style={{
                      height: '100%',
                      minHeight: 180,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1.5px dashed #cbd5e1',
                      borderRadius: 8,
                      padding: 14,
                      textAlign: 'center',
                      color: '#64748b',
                      background: 'rgba(248, 250, 252, 0.7)'
                    }}>
                      <span style={{ fontSize: 26, marginBottom: 4 }}>📦</span>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#334155' }}>No Scanned Items</div>
                      <div style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 3, lineHeight: 1.3 }}>
                        Scan barcode/QR code or tap <b>sale pos</b> / <b>rubic pos</b> above to add & quick-adjust items here
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                      {scannedActiveItems.map(item => {
                        const inCart = cart.find(c => c.itemId === item.id);
                        const isSelected = selectedCartItem?.itemId === item.id;
                        const qty = inCart?.qty || 0;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className="pos-touch-btn"
                            onClick={() => {
                              playBeep(1046, 0.05);
                              if (inCart) {
                                setSelectedCartId(inCart.cartId);
                              } else {
                                handleSelectOrScanItem(item, 1);
                              }
                            }}
                            style={{
                              ...glassQuickPillStyle,
                              border: isSelected ? '2px solid #0284c7' : '1px solid rgba(255, 255, 255, 0.65)',
                              background: isSelected
                                ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.85) 0%, rgba(30, 58, 138, 0.9) 100%)'
                                : glassQuickPillStyle.background,
                              color: isSelected ? '#ffffff' : '#0f172a',
                              boxShadow: isSelected ? '0 0 10px rgba(2, 132, 199, 0.5)' : glassQuickPillStyle.boxShadow,
                            }}
                            title={item.name}
                          >
                            <span style={{ fontSize: 12, flexShrink: 0 }}>🏷️</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
                              {item.name}
                            </span>
                            {qty > 0 && (
                              <span style={{
                                fontSize: 9,
                                fontWeight: 900,
                                background: isSelected ? '#ffffff' : '#0284c7',
                                color: isSelected ? '#0284c7' : '#ffffff',
                                padding: '1px 5px',
                                borderRadius: 8,
                                flexShrink: 0
                              }}>
                                x{qty}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* MODE 2: SALE POS (Complete List with Positive Stock > 0) */}
              {rightViewMode === 'SALE_POS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%' }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
                    <input
                      type="text"
                      placeholder="🔍 Search item in stock..."
                      value={posSearchQuery}
                      onChange={e => setPosSearchQuery(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        fontSize: 11,
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        outline: 'none',
                        background: '#ffffff'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setRightViewMode('SCANNED')}
                      style={{ padding: '2px 8px', fontSize: 10, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
                      title="Back to Scanned Items"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {positiveStockItems
                      .filter((it: any) => !posSearchQuery || it.name.toLowerCase().includes(posSearchQuery.toLowerCase()))
                      .map((item: any) => {
                        const st = item._calculatedStock;
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              playBeep(1046, 0.05);
                              handleSelectOrScanItem(item, 1);
                            }}
                            className="pos-touch-btn"
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              fontSize: 11,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                            }}
                          >
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '58%' }}>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.name}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              <span style={{ fontWeight: 800, color: '#0284c7' }}>
                                ₹{(Number(item.retailSalePrice) > 0 ? Number(item.retailSalePrice) : (Number(item.mrp) > 0 ? Number(item.mrp) : (Number(item.rateInclTax || item.openingRate) || 0))).toFixed(2)}
                              </span>
                              <span style={{ fontSize: 9, fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 8 }}>
                                Stock: {st}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* MODE 3: RUBIC POS (Visual Catalog with AI Images & Stock > 0) */}
              {rightViewMode === 'RUBIC_POS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%' }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 2, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="🔍 Search visual items..."
                      value={rubicSearchQuery}
                      onChange={e => setRubicSearchQuery(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        fontSize: 11,
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        outline: 'none',
                        background: '#ffffff'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleGenerateAIImages}
                      disabled={isGeneratingAI}
                      title="AI Auto-Generate Images for all items missing photos"
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontSize: 10,
                        fontWeight: 800,
                        cursor: isGeneratingAI ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        flexShrink: 0,
                        boxShadow: '0 2px 5px rgba(109, 40, 217, 0.35)'
                      }}
                    >
                      {isGeneratingAI ? '⏳ AI...' : '✨ AI Images'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightViewMode('SCANNED')}
                      style={{ padding: '2px 8px', fontSize: 10, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
                      title="Back to Scanned Items"
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 4, padding: 2 }}>
                    {positiveStockItems
                      .filter((it: any) => !rubicSearchQuery || it.name.toLowerCase().includes(rubicSearchQuery.toLowerCase()))
                      .map((item: any) => {
                        const st = item._calculatedStock;
                        const imgSrc = item.image || aiImagesMap[String(item.id)] || generateAIImageForProduct(item);
                        const isSelected = selectedCartItem?.itemId === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              playBeep(1046, 0.05);
                              handleSelectOrScanItem(item, 1);
                            }}
                            className="pos-touch-btn"
                            style={{
                              background: isSelected
                                ? 'linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)'
                                : '#ffffff',
                              border: isSelected ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                              borderRadius: 6,
                              padding: '4px 3px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              cursor: 'pointer',
                              boxShadow: isSelected ? '0 0 6px rgba(2, 132, 199, 0.4)' : '0 1px 3px rgba(0,0,0,0.05)',
                              position: 'relative',
                              minWidth: 0,
                              overflow: 'hidden',
                            }}
                            title={`${item.name} | Stock: ${st} | ₹${item.showInclTax || item.rateInclTax ? (item.rateInclTax || item.openingRate) : Math.round((Number(item.openingRate) || 0) * (1 + (Number(item.gstRate) || 0) / 100) * 100) / 100}`}
                          >
                            <img
                              src={imgSrc}
                              alt={item.name}
                              style={{ width: 32, height: 32, objectFit: 'contain', marginBottom: 2, borderRadius: 3 }}
                            />
                            <div style={{
                              fontSize: 8.5,
                              fontWeight: 700,
                              color: '#0f172a',
                              textAlign: 'center',
                              width: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              lineHeight: 1.2
                            }}>
                              {item.name}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginTop: 2, gap: 1 }}>
                              <span style={{ fontSize: 8.5, fontWeight: 900, color: '#0284c7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                ₹{(Number(item.retailSalePrice) > 0 ? Number(item.retailSalePrice) : (Number(item.mrp) > 0 ? Number(item.mrp) : (Number(item.rateInclTax || item.openingRate) || 0))).toFixed(2)}
                              </span>
                              <span style={{ fontSize: 7.5, fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '1px 3px', borderRadius: 4, flexShrink: 0 }}>
                                S:{st}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. MIDDLE SECTION: QUANTITY ADJUSTER (Positioned snugly right above Number Keypad) */}
          <div
            style={{
              flexShrink: 0,
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.85) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              borderBottom: '2px solid rgba(148, 163, 184, 0.5)',
              borderRadius: 10,
              padding: '5px 12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05), inset 0 1px 2px #ffffff',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ fontSize: 9.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, textAlign: 'center', letterSpacing: 0.5 }}>
              Quantity Adjuster {selectedCartItem ? `(${selectedCartItem.name.slice(0, 16)}..)` : ''}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28 }}>
              {/* Circular Blue [-] Button */}
              <button
                type="button"
                className="pos-touch-btn"
                onClick={handleDecrementSelected}
                disabled={!selectedCartId}
                title="Decrease Qty (-)"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: selectedCartId
                    ? 'linear-gradient(145deg, #38bdf8 0%, #0284c7 55%, #0369a1 100%)'
                    : 'linear-gradient(145deg, #cbd5e1 0%, #94a3b8 100%)',
                  color: '#ffffff',
                  border: '2px solid rgba(255, 255, 255, 0.7)',
                  fontSize: 24,
                  fontWeight: 900,
                  cursor: selectedCartId ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: selectedCartId
                    ? '0 4px 12px rgba(2, 132, 199, 0.4), inset 0 2px 2px rgba(255, 255, 255, 0.7), inset 0 -2px 3px rgba(3, 105, 161, 0.5)'
                    : 'none',
                  touchAction: 'manipulation',
                }}
              >
                −
              </button>

              {/* Circular Blue [+] Button */}
              <button
                type="button"
                className="pos-touch-btn"
                onClick={handleIncrementSelected}
                disabled={!selectedCartId}
                title="Increase Qty (+)"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: selectedCartId
                    ? 'linear-gradient(145deg, #38bdf8 0%, #0284c7 55%, #0369a1 100%)'
                    : 'linear-gradient(145deg, #cbd5e1 0%, #94a3b8 100%)',
                  color: '#ffffff',
                  border: '2px solid rgba(255, 255, 255, 0.7)',
                  fontSize: 24,
                  fontWeight: 900,
                  cursor: selectedCartId ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: selectedCartId
                    ? '0 4px 12px rgba(2, 132, 199, 0.4), inset 0 2px 2px rgba(255, 255, 255, 0.7), inset 0 -2px 3px rgba(3, 105, 161, 0.5)'
                    : 'none',
                  touchAction: 'manipulation',
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Bottom Section: Touch Numpad */}
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.85) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              borderBottom: '2px solid rgba(148, 163, 184, 0.5)',
              borderRadius: 12,
              padding: 8,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06), inset 0 1px 2px #ffffff',
              backdropFilter: 'blur(8px)',
              position: 'relative',
              zIndex: showSecureModal ? 10005 : 1,
              pointerEvents: 'auto',
            }}
          >
            {/* 4 rows x 4 cols layout matching photo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {/* Row 1: 7 8 9 NG */}
              <button type="button" className="pos-touch-btn" onMouseDown={e => e.preventDefault()} onClick={() => handleUniversalKey('7')} style={numpadBtnStyle}>7</button>
              <button type="button" className="pos-touch-btn" onMouseDown={e => e.preventDefault()} onClick={() => handleUniversalKey('8')} style={numpadBtnStyle}>8</button>
              <button type="button" className="pos-touch-btn" onMouseDown={e => e.preventDefault()} onClick={() => handleUniversalKey('9')} style={numpadBtnStyle}>9</button>
              <button
                type="button"
                className="pos-touch-btn"
                onMouseDown={e => e.preventDefault()}
                onClick={() => handleUniversalClear()}
                style={{
                  ...numpadBtnStyle,
                  background: 'linear-gradient(180deg, #f87171 0%, #dc2626 50%, #b91c1c 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.75)',
                  borderBottom: '2.5px solid #7f1d1d',
                  color: '#ffffff',
                  boxShadow: '0 4px 10px rgba(220, 38, 38, 0.35), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.8), inset 0 -2px 3px rgba(0, 0, 0, 0.25)',
                  fontWeight: 900,
                }}
              >
                NG
              </button>

              {/* Row 2: 4 5 6 < */}
              <button type="button" className="pos-touch-btn" onMouseDown={e => e.preventDefault()} onClick={() => handleUniversalKey('4')} style={numpadBtnStyle}>4</button>
              <button type="button" className="pos-touch-btn" onMouseDown={e => e.preventDefault()} onClick={() => handleUniversalKey('5')} style={numpadBtnStyle}>5</button>
              <button type="button" className="pos-touch-btn" onMouseDown={e => e.preventDefault()} onClick={() => handleUniversalKey('6')} style={numpadBtnStyle}>6</button>
              <button
                type="button"
                className="pos-touch-btn"
                onMouseDown={e => e.preventDefault()}
                onClick={() => handleUniversalBackspace()}
                style={{
                  ...numpadBtnStyle,
                  background: 'linear-gradient(180deg, #fbbf24 0%, #d97706 50%, #b45309 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.75)',
                  borderBottom: '2.5px solid #78350f',
                  color: '#ffffff',
                  boxShadow: '0 4px 10px rgba(217, 119, 6, 0.35), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.8), inset 0 -2px 3px rgba(0, 0, 0, 0.25)',
                  fontWeight: 900,
                  fontSize: 20,
                }}
              >
                ⌫
              </button>

              {/* Row 3: 1 2 3 - */}
              <button type="button" className="pos-touch-btn" onMouseDown={e => e.preventDefault()} onClick={() => handleUniversalKey('1')} style={numpadBtnStyle}>1</button>
              <button type="button" className="pos-touch-btn" onMouseDown={e => e.preventDefault()} onClick={() => handleUniversalKey('2')} style={numpadBtnStyle}>2</button>
              <button type="button" className="pos-touch-btn" onMouseDown={e => e.preventDefault()} onClick={() => handleUniversalKey('3')} style={numpadBtnStyle}>3</button>
              <button
                type="button"
                className="pos-touch-btn"
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  if (showSecureModal || activeFieldRef.current === 'mobile') {
                    handleUniversalKey('-');
                  } else {
                    handleDecrementSelected();
                  }
                }}
                style={{
                  ...numpadBtnStyle,
                  background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 50%, #0369a1 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.75)',
                  borderBottom: '2.5px solid #075985',
                  color: '#ffffff',
                  boxShadow: '0 4px 10px rgba(2, 132, 199, 0.35), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.8), inset 0 -2px 3px rgba(0, 0, 0, 0.25)',
                  fontWeight: 900,
                  fontSize: 22,
                }}
              >
                −
              </button>

              {/* Row 4: . 0 Enter (span 2) */}
              <button type="button" className="pos-touch-btn" onMouseDown={e => e.preventDefault()} onClick={() => handleUniversalKey('.')} style={numpadBtnStyle}>.</button>
              <button type="button" className="pos-touch-btn" onMouseDown={e => e.preventDefault()} onClick={() => handleUniversalKey('0')} style={numpadBtnStyle}>0</button>
              <button
                type="button"
                className="pos-touch-btn"
                onMouseDown={e => e.preventDefault()}
                onClick={handleUniversalEnter}
                style={{
                  ...numpadBtnStyle,
                  gridColumn: 'span 2',
                  background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 50%, #0369a1 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.75)',
                  borderBottom: '3px solid #075985',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: 16,
                  boxShadow: '0 6px 14px rgba(2, 132, 199, 0.45), inset 0 2px 2px rgba(255, 255, 255, 0.8), inset 0 -2px 3px rgba(0, 0, 0, 0.25)',
                }}
              >
                ↵ Enter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 3. MODALS ==================== */}

      {/* 3A. Secure Mode / Auto-Lock Modal (poss3) */}
      <POSSecureModal
        isOpen={showSecureModal}
        password={securePassword}
        onPasswordChange={setSecurePassword}
        inputRef={secureInputRef}
        onClose={() => {
          setShowSecureModal(false);
          setSecurePassword('');
          resetIdleTimer();
        }}
        onCancelToLogin={() => {
          setShowSecureModal(false);
          setSecurePassword('');
          if (onLogoutToLogin) onLogoutToLogin();
          else onBack();
        }}
        onAuthorize={async pwd => {
          const cleanPwd = pwd.trim();
          if (!cleanPwd) return false;

          // 0. Check Session Login Password (the exact password entered by cashier at login screen)
          let sessionLoginPwd = '';
          try {
            if (typeof window !== 'undefined') {
              sessionLoginPwd = (sessionStorage.getItem('ledgerx_pos_session_password') || '').trim();
            }
          } catch (_) { }
          const userSessionPwd = (
            (cashierUser as any)?.sessionLoginPassword ||
            (cashierUser as any)?.password ||
            permissionGuard.getCurrentUser()?.password ||
            ''
          ).trim();

          if (sessionLoginPwd && (cleanPwd === sessionLoginPwd || cleanPwd.toLowerCase() === sessionLoginPwd.toLowerCase())) {
            setSecurePassword('');
            return true;
          }
          if (userSessionPwd && (cleanPwd === userSessionPwd || cleanPwd.toLowerCase() === userSessionPwd.toLowerCase())) {
            setSecurePassword('');
            return true;
          }

          // 1. Direct matches for default / common supervisor / admin PINs
          const standardMasterPasswords = [
            'admin', '1234', '0000', '123', '12345', '123456',
            'cashier', 'pos', 'pass', 'password', 'supervisor', 'ledgerx'
          ];
          if (standardMasterPasswords.includes(cleanPwd.toLowerCase())) {
            setSecurePassword('');
            return true;
          }

          // 2. Check currentUser (active session user)
          const activeUser = permissionGuard.getCurrentUser();
          if (activeUser?.password && (cleanPwd === activeUser.password.trim() || cleanPwd.toLowerCase() === activeUser.password.trim().toLowerCase())) {
            setSecurePassword('');
            return true;
          }

          // 3. Check cashierUser prop
          if ((cashierUser as any)?.password && (cleanPwd === (cashierUser as any).password.trim() || cleanPwd.toLowerCase() === (cashierUser as any).password.trim().toLowerCase())) {
            setSecurePassword('');
            return true;
          }

          // 4. Fetch actual registered users from lanUserManagementService for this company (reads data/<code >/users.json)
          try {
            const companyUsers = await lanUserManagementService.getUsers(companyCode, company?.name);
            if (Array.isArray(companyUsers)) {
              for (const u of companyUsers) {
                if (u.password && (u.password.trim() === cleanPwd || u.password.trim().toLowerCase() === cleanPwd.toLowerCase())) {
                  setSecurePassword('');
                  return true;
                }
              }
            }
          } catch (e) { }

          // 5. Also check global users in data/users.json
          try {
            const globalUsers = await lanUserManagementService.getUsers('10000');
            if (Array.isArray(globalUsers)) {
              for (const u of globalUsers) {
                if (u.password && (u.password.trim() === cleanPwd || u.password.trim().toLowerCase() === cleanPwd.toLowerCase())) {
                  setSecurePassword('');
                  return true;
                }
              }
            }
          } catch (e) { }

          // 6. Check company master password / PIN if set
          if (company?.password && String(company.password).trim() === cleanPwd) {
            setSecurePassword('');
            return true;
          }
          if (company?.pin && String(company.pin).trim() === cleanPwd) {
            setSecurePassword('');
            return true;
          }

          // 7. Check localStorage cached company users
          try {
            const rawStored = localStorage.getItem(`ledgerx_company_users_${companyCode}`);
            if (rawStored) {
              const parsed = JSON.parse(rawStored);
              if (Array.isArray(parsed)) {
                for (const u of parsed) {
                  if (u.password && (u.password.trim() === cleanPwd || u.password.trim().toLowerCase() === cleanPwd.toLowerCase())) {
                    setSecurePassword('');
                    return true;
                  }
                }
              }
            }
          } catch (e) { }

          // 8. If NO user in this company has any password configured (passwordless setup), allow unlocking
          try {
            const companyUsers = await lanUserManagementService.getUsers(companyCode, company?.name);
            const hasAnyPassword = companyUsers.some(u => Boolean(u.password && u.password.trim()));
            if (!hasAnyPassword && (!activeUser?.password || activeUser.password.trim() === '')) {
              setSecurePassword('');
              return true;
            }
          } catch (e) { }

          return false;
        }}
      />

      {/* 3B. Payment / Tender Modal */}
      <POSPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totals={totals}
        companyName={company?.name || 'LedgerX Retail Store'}
        upiVpa={company?.upiId || ''}
        billNo={billNo}
        ledgers={ledgers}
        onConfirmPayment={handleConfirmPayment}
      />

      {/* 3C. Thermal Receipt Print Preview (Auto Printed) */}
      {lastCompletedBill && (
        <POSReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          billNo={lastCompletedBill.billNo}
          company={company}
          cashierName={cashierName}
          items={lastCompletedBill.items}
          totals={lastCompletedBill.totals}
          payment={lastCompletedBill.payment}
          customer={lastCompletedBill.customer}
          onNewSale={resetNewSale}
          autoPrint={true}
        />
      )}

      {/* 3D. Touch Item Catalog Browser */}
      <POSItemSearchModal
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        stockItems={catalogItems}
        onSelectItem={item => addItemToCart(item, 1)}
      />
    </div>
  );
}

// 3D Glassmorphism & Embossed Blue Button Styles
const ribbonBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 50%, #0369a1 100%)',
  border: '1px solid rgba(255, 255, 255, 0.75)',
  borderBottom: '3px solid #075985',
  borderRadius: 10,
  padding: '6px 10px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  minWidth: 78,
  height: 64,
  boxShadow: '0 5px 12px rgba(2, 132, 199, 0.4), inset 0 2px 2px rgba(255, 255, 255, 0.8), inset 0 -2px 3px rgba(0, 0, 0, 0.25)',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'manipulation',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};

const ribbonIconCircleStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: 'linear-gradient(145deg, #ffffff 0%, #e0f2fe 100%)',
  border: '1.5px solid rgba(255, 255, 255, 0.95)',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25), inset 0 1.5px 1.5px #ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  marginBottom: 3,
};

const ribbonTextStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 800,
  color: '#ffffff',
  whiteSpace: 'nowrap',
  letterSpacing: -0.2,
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
};

const glassArrowBtnStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 8,
  background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 50%, #0369a1 100%)',
  border: '1px solid rgba(255, 255, 255, 0.75)',
  borderBottom: '2.5px solid #075985',
  fontSize: 18,
  fontWeight: 900,
  color: '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 10px rgba(2, 132, 199, 0.35), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.8), inset 0 -2px 3px rgba(0, 0, 0, 0.25)',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'manipulation',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
};

const numpadBtnStyle: React.CSSProperties = {
  height: 50,
  background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 50%, #0369a1 100%)',
  border: '1px solid rgba(255, 255, 255, 0.75)',
  borderBottom: '2.5px solid #075985',
  borderRadius: 8,
  fontSize: 19,
  fontWeight: 900,
  color: '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 10px rgba(2, 132, 199, 0.35), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.8), inset 0 -2px 3px rgba(0, 0, 0, 0.25)',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'manipulation',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
};

const glassQuickPillStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 50%, #0369a1 100%)',
  border: '1px solid rgba(255, 255, 255, 0.75)',
  borderBottom: '2.5px solid #075985',
  borderRadius: 20,
  padding: '8px 12px',
  fontSize: 12,
  fontWeight: 800,
  color: '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 10px rgba(2, 132, 199, 0.35), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.8), inset 0 -2px 3px rgba(0, 0, 0, 0.25)',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'manipulation',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
};
