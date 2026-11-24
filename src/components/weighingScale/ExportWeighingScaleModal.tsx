import React, { useState, useMemo } from 'react';
import {
  ScaleBrand,
  SCALE_BRANDS,
  ScalePLUItem,
} from '@/lib/weighingScale/scaleTypes';
import {
  extractAndSortScalePLUs,
} from '@/lib/weighingScale/scaleAutoSorter';
import {
  formatScalePLUData,
  triggerScaleFileDownload,
} from '@/lib/weighingScale/scaleFormats';

interface ExportWeighingScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  companyName: string;
  currencySymbol?: string;
}

export const ExportWeighingScaleModal: React.FC<ExportWeighingScaleModalProps> = ({
  isOpen,
  onClose,
  items,
  companyName,
  currencySymbol = '₹',
}) => {
  const [selectedBrand, setSelectedBrand] = useState<ScaleBrand>('raintech');
  const [storeHeader, setStoreHeader] = useState<string>(companyName || 'STORE');
  const [tagline, setTagline] = useState<string>('* Thank You & Visit Again *');
  const [showKeypadPrint, setShowKeypadPrint] = useState<boolean>(false);

  // Extract only loose items and sort A to Z with sequential Scale Keys
  const loosePLUs: ScalePLUItem[] = useMemo(() => {
    return extractAndSortScalePLUs(items, storeHeader);
  }, [items, storeHeader]);

  if (!isOpen) return null;

  const currentBrandMeta = SCALE_BRANDS.find(b => b.id === selectedBrand) || SCALE_BRANDS[0];

  const handleDownload = () => {
    if (loosePLUs.length === 0) {
      alert('No loose items found with variant "Loose". Please tag loose items first!');
      return;
    }
    const { content, filename, mimeType } = formatScalePLUData(selectedBrand, loosePLUs, {
      brand: selectedBrand,
      companyName: storeHeader,
      tagline,
      barcodeType: '10_digit',
    });
    triggerScaleFileDownload(content, filename, mimeType);
  };

  const handlePrintKeypadSheet = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          width: '100%',
          maxWidth: 780,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
            color: '#ffffff',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>⚖️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, letterSpacing: '0.02em' }}>
                Export for Barcode Weighing Scale (Pen Drive)
              </h2>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.9 }}>
                Directly load PLU items & rates into Raintech, Rongta, Essae, CAS, DIGI scales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#ffffff',
              borderRadius: 6,
              width: 30,
              height: 30,
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 900,
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {/* Top Options Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr 1fr',
              gap: 12,
              marginBottom: 16,
              background: '#f8fafc',
              padding: 12,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}
          >
            {/* 1. Scale Brand */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                1. Select Scale Brand:
              </label>
              <select
                value={selectedBrand}
                onChange={e => setSelectedBrand(e.target.value as ScaleBrand)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: '1.5px solid #059669',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#0f172a',
                  background: '#ffffff',
                  outline: 'none',
                }}
              >
                {SCALE_BRANDS.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Store Header (Company Name) */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                2. Store Header on Sticker:
              </label>
              <input
                type="text"
                value={storeHeader}
                onChange={e => setStoreHeader(e.target.value)}
                placeholder="Company Name"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 12,
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 3. Footer Slogan */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                3. Sticker Footer Tagline:
              </label>
              <input
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                placeholder="Thank You & Visit Again"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 12,
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Strict Loose Variant Filter Banner */}
          <div
            style={{
              background: '#ecfdf5',
              border: '1.5px solid #10b981',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: '#065f46' }}>
                ✓ Strict "Loose" Variant Filter Active
              </div>
              <div style={{ fontSize: 11, color: '#047857' }}>
                Out of <b>{items.length} total items</b> in Purchase POS List, exactly{' '}
                <b>{loosePLUs.length} items</b> have variant <code>Loose</code> and are sorted Alphabetically (A to Z).
              </div>
            </div>
            <span
              style={{
                background: '#059669',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 900,
                padding: '4px 10px',
                borderRadius: 20,
              }}
            >
              {loosePLUs.length} Loose Items Ready
            </span>
          </div>

          {/* Table of Loose Items preview */}
          {loosePLUs.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                background: '#fffbeb',
                borderRadius: 8,
                border: '1px dashed #f59e0b',
                color: '#92400e',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>No Items with Variant "Loose" Found!</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                To send items to the scale, click on an item's <b>Variant</b> in the Purchase POS List and tap{' '}
                <b>⚡ Loose</b>.
              </div>
            </div>
          ) : (
            <div
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                overflow: 'hidden',
                maxHeight: 260,
                overflowY: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', fontWeight: 900, color: '#0f172a', width: 90 }}>Scale Key #</th>
                    <th style={{ padding: '8px 10px', fontWeight: 900, color: '#0f172a', width: 90 }}>Barcode</th>
                    <th style={{ padding: '8px 10px', fontWeight: 900, color: '#0f172a' }}>Item Name (A to Z)</th>
                    <th style={{ padding: '8px 10px', fontWeight: 900, color: '#0f172a', textAlign: 'right', width: 110 }}>Rate / Kg</th>
                    <th style={{ padding: '8px 10px', fontWeight: 900, color: '#0f172a', width: 70 }}>Unit</th>
                    <th style={{ padding: '8px 10px', fontWeight: 900, color: '#0f172a', width: 80 }}>Variant</th>
                  </tr>
                </thead>
                <tbody>
                  {loosePLUs.map((it, idx) => (
                    <tr
                      key={it.itemCode}
                      style={{
                        background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <td style={{ padding: '6px 10px', fontWeight: 900, color: '#0284c7' }}>
                        🔑 Key {it.keyNo}
                      </td>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>
                        {it.itemCode}
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: 800, color: '#0f172a' }}>
                        {it.name}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 900, color: '#059669' }}>
                        {currencySymbol}{it.retailPrice.toFixed(2)}
                      </td>
                      <td style={{ padding: '6px 10px', color: '#64748b', fontWeight: 700 }}>
                        {it.unit}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <span
                          style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        >
                          {it.variant}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 11, color: '#64748b' }}>
            Brand: <b>{currentBrandMeta.name}</b> | Format: <code>.{currentBrandMeta.defaultExt}</code>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Print Scale Keypad Sheet */}
            <button
              type="button"
              onClick={() => setShowKeypadPrint(!showKeypadPrint)}
              className="pos-touch-btn"
              style={{
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              title="Print keyboard insert sheet for scale hotkeys"
            >
              <span>🖨️</span> Print Keypad Sheet
            </button>

            {/* Download Pen Drive File */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={loosePLUs.length === 0}
              className="pos-touch-btn"
              style={{
                background: loosePLUs.length === 0 ? '#94a3b8' : 'linear-gradient(135deg, #059669, #10b981)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 18px',
                fontSize: 12,
                fontWeight: 900,
                cursor: loosePLUs.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)',
              }}
            >
              <span>💾</span> Download for Pen Drive
            </button>
          </div>
        </div>

        {/* Printable Scale Keypad Insert Sheet Overlay (When opened) */}
        {showKeypadPrint && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: '#ffffff',
              zIndex: 99999999,
              padding: 24,
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>
                  Weighing Scale Hotkeys Insert Sheet - {storeHeader}
                </h2>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                  Print this sheet and slide it under your weighing scale's transparent keyboard cover.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handlePrintKeypadSheet}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 6,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  🖨️ Print Now
                </button>
                <button
                  onClick={() => setShowKeypadPrint(false)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    padding: '8px 14px',
                    borderRadius: 6,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
                border: '1px solid #cbd5e1',
                padding: 12,
                borderRadius: 8,
              }}
            >
              {loosePLUs.map(it => (
                <div
                  key={it.itemCode}
                  style={{
                    border: '1.5px dashed #0284c7',
                    borderRadius: 6,
                    padding: 8,
                    background: '#f0f9ff',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 900, color: '#0369a1' }}>
                    KEY {it.keyNo} (PLU {it.plu})
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
                    {it.name}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#059669' }}>
                    {currencySymbol}{it.retailPrice.toFixed(2)} / {it.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
