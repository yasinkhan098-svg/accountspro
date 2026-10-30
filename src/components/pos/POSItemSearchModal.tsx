"use client";
import React, { useState } from 'react';

interface POSItemSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockItems: any[];
  onSelectItem: (item: any) => void;
}

export default function POSItemSearchModal({
  isOpen,
  onClose,
  stockItems = [],
  onSelectItem,
}: POSItemSearchModalProps) {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');

  if (!isOpen) return null;

  const groups = ['ALL', ...Array.from(new Set(stockItems.map(s => s.under || s.groupName || 'General')))];

  const filtered = stockItems.filter(s => {
    const matchQ = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.barcode && String(s.barcode).includes(search)) ||
      (s.alias && s.alias.toLowerCase().includes(search.toLowerCase())) ||
      (s.hsnCode && String(s.hsnCode).includes(search));

    const matchG = selectedGroup === 'ALL' || (s.under || s.groupName || 'General') === selectedGroup;
    return matchQ && matchG;
  });

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 760,
          maxHeight: '90vh',
          background: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #cbd5e1',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: '#0f3c64',
            color: '#ffffff',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>📦 Stock Items Catalog (Touch Selection)</div>
            <div style={{ fontSize: 11, color: '#93c5fd' }}>Tap any item to add directly into current POS cart</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: '#ffffff',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Search & Group Bar */}
        <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <input
            type="text"
            placeholder="🔍 Search item name, barcode, alias or HSN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '2px solid #0284c7',
              borderRadius: 6,
              fontSize: 14,
              marginBottom: 10,
            }}
          />

          {/* Group Filter Chips */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {groups.map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGroup(g)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: selectedGroup === g ? 'bold' : 'normal',
                  background: selectedGroup === g ? '#0284c7' : '#ffffff',
                  color: selectedGroup === g ? '#ffffff' : '#334155',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
            background: '#f1f5f9',
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: '#64748b' }}>
              No stock items found matching "{search}".
            </div>
          ) : (
            filtered.map(item => {
              const rate = Number(item.openingRate) || 0;
              const gst = Number(item.gstRate) || 0;
              const rateWithTax = Math.round(rate * (1 + gst / 100) * 100) / 100;
              const stock = Number(item.openingQty) || 0;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectItem(item);
                    onClose();
                  }}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: 12,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'transform 0.1s, border-color 0.1s',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#0284c7';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: 14, color: '#0f172a', marginBottom: 4 }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 6 }}>
                      {item.barcode && <span>Code: {item.barcode}</span>}
                      {item.hsnCode && <span>HSN: {item.hsnCode}</span>}
                    </div>
                  </div>

                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 'bold', color: '#0369a1' }}>
                        ₹{rateWithTax.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 10, color: '#16a34a' }}>
                        Incl. {gst}% GST
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: stock > 0 ? '#dcfce7' : '#fee2e2',
                        color: stock > 0 ? '#166534' : '#991b1b',
                        fontWeight: 'bold',
                      }}
                    >
                      Stock: {stock} {item.unit || ''}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

