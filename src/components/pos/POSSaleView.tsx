"use client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  posService, 
  POSCartItem, 
  POSCartTotals, 
  POSCustomer, 
  POSPaymentDetails, 
  POSHeldBill 
} from '@/lib/pos/posService';
import POSVirtualKeyboard from './POSVirtualKeyboard';
import POSVirtualNumpad from './POSVirtualNumpad';
import POSSecureModal from './POSSecureModal';
import POSPaymentModal from './POSPaymentModal';
import POSReceiptModal from './POSReceiptModal';
import POSItemSearchModal from './POSItemSearchModal';
import { companyDataFolderService } from '@/lib/companyDataFolderService';
import { permissionGuard } from '@/lib/permissionGuard';

interface POSSaleViewProps {
  company: any;
  availableCompanies?: any[];
  stockItems: any[];
  ledgers: any[];
  vouchers: any[];
  onBack: () => void;
  onStockUpdated?: (updatedStock: any[]) => void;
  onVouchersUpdated?: (updatedVouchers: any[]) => void;
}

export default function POSSaleView({
  company,
  availableCompanies = [],
  stockItems = [],
  ledgers = [],
  vouchers = [],
  onBack,
  onStockUpdated,
  onVouchersUpdated,
}: POSSaleViewProps) {
  const companyCode = company 
    ? companyDataFolderService.getCompanyFolderCode(company, availableCompanies) 
    : '10000';

  const currentUser = permissionGuard.getCurrentUser();
  const cashierName = currentUser?.fullName || currentUser?.username || 'Cashier-01';

  // POS State
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [selectedCartId, setSelectedCartId] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [activeInputFocus, setActiveInputFocus] = useState<'barcode' | 'qty' | 'other'>('barcode');
  const [billNo, setBillNo] = useState(() => posService.generateBillNo(vouchers, companyCode));
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString('en-US', { hour12: false }));
  const [dateStr, setDateStr] = useState(() => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));

  // Modals state
  const [showSecureModal, setShowSecureModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
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

  // Cart totals calculation
  const totals = posService.calculateCartTotals(cart);

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
    } catch (e) {}
  };

  // Hardware Barcode Scanner listener
  useEffect(() => {
    const handleHardwareScan = (e: KeyboardEvent) => {
      // If modal is active, let modal handle keys
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

      // Barcode Gun sends keystrokes rapidly (typically < 35ms per character)
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

    const matched = posService.matchStockItem(cleanQ, stockItems);
    if (matched) {
      playBeep(1046, 0.08); // Success high beep
      addItemToCart(matched);
      setBarcodeInput('');
    } else {
      playBeep(330, 0.2); // Error low buzz
      alert(`Item not found for barcode / code: "${cleanQ}"`);
    }
  };

  // Add item to cart (with tax-inclusive rate)
  const addItemToCart = (item: any, quantity = 1) => {
    const baseRate = Number(item.openingRate) || 0;
    const gstRate = Number(item.gstRate) || 0;
    // Calculate inclusive price if not already inclusive
    const rateWithTax = item.showInclTax || item.rateInclTax 
      ? Number(item.rateInclTax || item.openingRate) 
      : Math.round(baseRate * (1 + gstRate / 100) * 100) / 100;

    const availableStock = Number(item.openingQty) || 0;

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
        unit: existing.unit,
        qty: newQty,
        rateWithTax: existing.rateWithTax,
        gstRate: existing.gstRate,
        discountPerc: existing.discountPerc,
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
        unit: item.unit?.symbol || item.unit || 'NOS',
        qty: quantity,
        rateWithTax,
        gstRate,
        discountPerc: 0,
        stockAvailable: availableStock,
      });

      setCart(prev => [lineItem, ...prev]);
      setSelectedCartId(lineItem.cartId);
    }
  };

  // Circular [+] button
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

  // Circular [-] button
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

  // Delete selected item
  const handleDeleteSelected = () => {
    if (!selectedCartId) return;
    setCart(prev => prev.filter(item => item.cartId !== selectedCartId));
    setSelectedCartId(null);
  };

  // Virtual keyboard typing handler
  const handleVirtualKey = (key: string) => {
    setBarcodeInput(prev => prev + key);
    if (barcodeInputRef.current) barcodeInputRef.current.focus();
  };

  const handleVirtualBackspace = () => {
    setBarcodeInput(prev => prev.slice(0, -1));
  };

  const handleVirtualClear = () => {
    setBarcodeInput('');
  };

  // Virtual numpad typing handler
  const handleNumpadDigit = (digit: string) => {
    setBarcodeInput(prev => prev + digit);
  };

  // Hold current bill
  const handleHoldBill = () => {
    if (cart.length === 0) {
      alert('Cart is empty. Nothing to hold.');
      return;
    }
    const held: POSHeldBill = {
      id: `hold_${Date.now()}`,
      billNo,
      heldAt: new Date().toLocaleTimeString(),
      customer: { name: 'Customer', mobile: '' },
      items: cart,
      totals,
    };
    posService.holdBill(companyCode, held);
    alert(`Bill ${billNo} put on HOLD.`);
    resetNewSale();
  };

  // Recall held bills
  const handleRecallBill = () => {
    const heldList = posService.getHeldBills(companyCode);
    if (heldList.length === 0) {
      alert('No bills currently on hold.');
      return;
    }
    const latest = heldList[0];
    if (cart.length > 0) {
      if (!confirm('Replace current cart with held bill?')) return;
    }
    setCart(latest.items);
    setBillNo(latest.billNo);
    posService.deleteHeldBill(companyCode, latest.id);
    alert(`Recalled Bill ${latest.billNo}!`);
  };

  // Reset for new sale
  const resetNewSale = () => {
    setCart([]);
    setSelectedCartId(null);
    setBarcodeInput('');
    setBillNo(posService.generateBillNo(vouchers, companyCode));
  };

  // Finalize payment from modal
  const handleConfirmPayment = async (payment: POSPaymentDetails, customer: POSCustomer) => {
    setShowPaymentModal(false);

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

      setShowReceiptModal(true);
    } else {
      alert(result.error || 'Failed to complete sale!');
    }
  };

  // Quick categories for top right panel
  const quickCategories = Array.from(new Set(stockItems.map(s => s.under || s.groupName || 'General'))).slice(0, 8);

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
          minHeight: 52,
        }}
      >
        {/* Left Branding (Exact LedgerX logo mark matching user image) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Yellow Rounded Badge with Bold Dark Blue 'L' */}
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 26,
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
                fontSize: 24,
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: -0.5,
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              LedgerX
            </span>
            <span
              style={{
                background: '#f59e0b',
                color: '#0f3c64',
                padding: '2px 7px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0.5,
              }}
            >
              POS
            </span>
          </div>

          <span style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 'bold' }}>
            TERMINAL 01
          </span>
        </div>

        {/* Center System Info / Cashier Meta (exact replica of Posiflex header line) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 13, color: '#fecdd3' }}>
          <div>
            Cashier: <b style={{ color: '#ffffff' }}>{cashierName}</b>
          </div>
          <div>
            Store: <b style={{ color: '#ffffff' }}>{company?.name || 'Main Retail'}</b> [{companyCode}]
          </div>
          <div>
            Bill: <b style={{ color: '#ffffff' }}>{billNo}</b>
          </div>
          <div>
            {dateStr} <b style={{ color: '#ffffff', marginLeft: 4 }}>{clock}</b>
          </div>
        </div>

        {/* Right Search Bar & Exit Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', width: 280 }}>
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Scan Barcode or Type Code..."
              value={barcodeInput}
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
                border: '2px solid #fbbf24',
                fontSize: 13,
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none',
                background: '#ffffff',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
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
                fontSize: 16,
              }}
              title="Search / Scan"
            >
              🔍
            </span>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
            title="Toggle Fullscreen"
            style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 6,
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 'bold',
            }}
          >
            ⛶
          </button>

          {/* Exit POS Button */}
          <button
            onClick={() => {
              if (cart.length > 0) {
                if (confirm('Discard current POS cart and exit to LedgerX?')) onBack();
              } else {
                onBack();
              }
            }}
            title="Exit POS Terminal (Esc)"
            style={{
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            ✕ Exit POS (Esc)
          </button>
        </div>
      </div>

      {/* ==================== 2. MAIN POS WORKSPACE (SPLIT LAYOUT) ==================== */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* ========== LEFT PANEL: ITEM CART TABLE + TOUCH QWERTY KEYBOARD ========== */}
        <div
          style={{
            flex: 6.8,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '2px solid #cbd5e1',
            background: '#ffffff',
          }}
        >
          {/* Cart Table Container */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
              <thead>
                <tr
                  style={{
                    background: '#f1f5f9',
                    borderBottom: '2px solid #cbd5e1',
                    color: '#334155',
                    fontSize: 13,
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                  }}
                >
                  <th style={{ width: '40%', padding: '10px 14px' }}>Item Description</th>
                  <th style={{ width: '12%', padding: '10px 8px', textAlign: 'center' }}>Qty</th>
                  <th style={{ width: '18%', padding: '10px 8px', textAlign: 'right' }}>Price (Incl. Tax)</th>
                  <th style={{ width: '12%', padding: '10px 8px', textAlign: 'center' }}>Tax %</th>
                  <th style={{ width: '18%', padding: '10px 14px', textAlign: 'right' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  // Blank cyan/blue striped placeholder bars (mirroring Posiflex empty screen in photo)
                  Array.from({ length: 9 }).map((_, i) => (
                    <tr
                      key={i}
                      style={{
                        height: 38,
                        background: i % 2 === 0 ? '#38bdf8' : '#7dd3fc',
                        opacity: 0.35,
                        borderBottom: '1px solid #bae6fd',
                      }}
                    >
                      <td colSpan={5} style={{ padding: '0 14px', color: '#0369a1', fontSize: 11, fontStyle: 'italic' }}>
                        {i === 3 && 'Scan barcode or tap View to add items...'}
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
                          height: 44,
                          cursor: 'pointer',
                          background: isSelected
                            ? '#fef08a' // Selected row highlight
                            : index % 2 === 0
                            ? '#e0f2fe' // Alternating cyan light
                            : '#bae6fd', // Alternating cyan dark (matching Posiflex blue bars)
                          borderBottom: '1px solid #93c5fd',
                          color: '#0f172a',
                          fontWeight: isSelected ? 'bold' : 500,
                        }}
                      >
                        <td style={{ padding: '8px 14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: 14 }}>{item.name}</div>
                          {item.hsnCode && <div style={{ fontSize: 10, color: '#475569' }}>HSN: {item.hsnCode}</div>}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', fontSize: 15, fontWeight: 'bold' }}>
                          {item.qty} {item.unit}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontSize: 14 }}>
                          ₹{item.rateWithTax.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', fontSize: 12 }}>
                          {item.gstRate}%
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 15, fontWeight: 'bold', color: '#0f3c64' }}>
                          ₹{item.lineTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Subtotal & Cart Stat Summary Bar (above touch keyboard) */}
          <div
            style={{
              background: '#f8fafc',
              borderTop: '2px solid #cbd5e1',
              padding: '8px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
            }}
          >
            <div>
              <span>Items: <b>{totals.itemsCount}</b></span>
              <span style={{ margin: '0 8px' }}>•</span>
              <span>Total Qty: <b>{totals.totalQty}</b></span>
            </div>
            <div>
              <span>Taxable: <b>₹{totals.totalTaxable.toFixed(2)}</b></span>
              <span style={{ margin: '0 8px' }}>•</span>
              <span>GST: <b>₹{totals.totalTax.toFixed(2)}</b></span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 'bold', color: '#0f3c64' }}>
              Subtotal: ₹{totals.subtotal.toFixed(2)}
            </div>
          </div>

          {/* Virtual Touch QWERTY Keyboard */}
          <div style={{ padding: '6px 8px', background: '#cbd5e1', borderTop: '1px solid #94a3b8' }}>
            <POSVirtualKeyboard
              onKeyPress={handleVirtualKey}
              onBackspace={handleVirtualBackspace}
              onClear={handleVirtualClear}
              onOpenView={() => setShowCatalogModal(true)}
              onOpenSecureMode={() => setShowSecureModal(true)}
            />
          </div>
        </div>

        {/* ========== RIGHT PANEL: ACTIONS + NUMPAD + SETTLE ========== */}
        <div
          style={{
            flex: 3.2,
            background: '#f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 10,
          }}
        >
          {/* Top Half of Right Panel: Quick Categories & Item Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Quick Catalog Button */}
            <button
              onClick={() => setShowCatalogModal(true)}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '10px 12px',
                fontSize: 14,
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 2px 4px rgba(2,132,199,0.3)',
              }}
            >
              <span>🖼️ Browse Item Catalog (View)</span>
            </button>

            {/* Selected Item Quantity Adjusters (Circular [-] and [+] matching the photo) */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '10px 14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>
                Selected Item Controls
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
                {/* Circular Blue [-] Button */}
                <button
                  type="button"
                  onClick={handleDecrementSelected}
                  disabled={!selectedCartId}
                  title="Decrease Qty (-)"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: selectedCartId ? '#0284c7' : '#94a3b8',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 28,
                    fontWeight: 'bold',
                    cursor: selectedCartId ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 3px 6px rgba(0,0,0,0.2)',
                  }}
                >
                  −
                </button>

                {/* Circular Blue [+] Button */}
                <button
                  type="button"
                  onClick={handleIncrementSelected}
                  disabled={!selectedCartId}
                  title="Increase Qty (+)"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: selectedCartId ? '#0284c7' : '#94a3b8',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 28,
                    fontWeight: 'bold',
                    cursor: selectedCartId ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 3px 6px rgba(0,0,0,0.2)',
                  }}
                >
                  +
                </button>
              </div>

              {/* Remove / Del Selected Button */}
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={!selectedCartId}
                  style={{
                    flex: 1,
                    background: selectedCartId ? '#fee2e2' : '#f1f5f9',
                    color: selectedCartId ? '#b91c1c' : '#94a3b8',
                    border: '1px solid #fca5a5',
                    borderRadius: 4,
                    padding: '6px 8px',
                    fontSize: 12,
                    fontWeight: 'bold',
                    cursor: selectedCartId ? 'pointer' : 'not-allowed',
                  }}
                >
                  🗑️ Remove
                </button>
                <button
                  type="button"
                  onClick={handleHoldBill}
                  disabled={cart.length === 0}
                  style={{
                    flex: 1,
                    background: '#fef3c7',
                    color: '#b45309',
                    border: '1px solid #fde68a',
                    borderRadius: 4,
                    padding: '6px 8px',
                    fontSize: 12,
                    fontWeight: 'bold',
                    cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
                  }}
                >
                  ⏸ Hold Bill
                </button>
                <button
                  type="button"
                  onClick={handleRecallBill}
                  style={{
                    flex: 1,
                    background: '#e0e7ff',
                    color: '#4338ca',
                    border: '1px solid #c7d2fe',
                    borderRadius: 4,
                    padding: '6px 8px',
                    fontSize: 12,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ▶ Recall
                </button>
              </div>
            </div>

            {/* Quick Grand Total Tile */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0f3c64, #1e293b)',
                color: '#ffffff',
                borderRadius: 8,
                padding: '12px 14px',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#93c5fd' }}>
                Net Amount To Pay
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#38bdf8' }}>
                ₹{totals.grandTotal.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Bottom Half of Right Panel: Touch Numpad & Pay Button */}
          <div>
            <POSVirtualNumpad
              onNumberPress={handleNumpadDigit}
              onBackspace={handleVirtualBackspace}
              onClear={handleVirtualClear}
              onEnter={() => handleProcessBarcode(barcodeInput)}
              onPayClick={() => {
                if (cart.length === 0) {
                  alert('Cart is empty. Please scan or select an item first.');
                  return;
                }
                setShowPaymentModal(true);
              }}
            />
          </div>
        </div>
      </div>

      {/* ==================== 3. MODALS ==================== */}

      {/* 3A. Secure Mode / Supervisor Modal (exact replica from center of photo) */}
      <POSSecureModal
        isOpen={showSecureModal}
        onClose={() => setShowSecureModal(false)}
        onAuthorize={async pwd => {
          // Check if admin password matches or allow standard supervisor override
          if (pwd === 'admin' || pwd === '1234' || (currentUser?.password && pwd === currentUser.password)) {
            alert('Supervisor Authorization Granted!');
            return true;
          }
          return false;
        }}
      />

      {/* 3B. Payment / Tender Modal */}
      <POSPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totals={totals}
        companyName={company?.name || 'Retail Store'}
        upiVpa={company?.email || 'retail@upi'}
        ledgers={ledgers}
        onConfirmPayment={handleConfirmPayment}
      />

      {/* 3C. Thermal Receipt Print Preview */}
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
        />
      )}

      {/* 3D. Touch Item Catalog Browser */}
      <POSItemSearchModal
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        stockItems={stockItems}
        onSelectItem={item => addItemToCart(item, 1)}
      />
    </div>
  );
}

