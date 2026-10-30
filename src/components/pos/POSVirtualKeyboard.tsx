"use client";
import React, { useState } from 'react';

interface POSVirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onClear?: () => void;
  onOpenView?: () => void;
  onOpenSecureMode?: () => void;
}

export default function POSVirtualKeyboard({
  onKeyPress,
  onBackspace,
  onClear,
  onOpenView,
  onOpenSecureMode,
}: POSVirtualKeyboardProps) {
  const [isCaps, setIsCaps] = useState(false);

  const row1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
  const row2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '@'];
  const row3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];

  const handleKeyClick = (k: string) => {
    const char = isCaps ? k.toUpperCase() : k.toLowerCase();
    onKeyPress(char);
  };

  const keyStyle: React.CSSProperties = {
    height: 46,
    background: '#ffffff',
    border: '1px solid #94a3b8',
    borderRadius: 6,
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
    cursor: 'pointer',
    boxShadow: '0 2px 0 #94a3b8, inset 0 1px 0 #ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    transition: 'background 0.1s, transform 0.05s',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        background: '#e2e8f0',
        borderRadius: 8,
        border: '1px solid #cbd5e1',
        userSelect: 'none',
      }}
    >
      {/* Left Action Buttons: Round Circle View & Lock Buttons */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          alignItems: 'center',
          justifyContent: 'center',
          paddingRight: 6,
          borderRight: '1px solid #cbd5e1',
        }}
      >
        {/* Round Circle View Button */}
        {onOpenView && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <button
              type="button"
              onClick={onOpenView}
              title="Browse Stock Catalog"
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ffffff, #f1f5f9)',
                border: '2px solid #0284c7',
                color: '#0284c7',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                transition: 'transform 0.05s',
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'none')}
            >
              🖼️
            </button>
            <span style={{ fontSize: 10, fontWeight: 'bold', color: '#0369a1' }}>View</span>
          </div>
        )}

        {/* Round Circle Lock / Secure Mode Button */}
        {onOpenSecureMode && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <button
              type="button"
              onClick={onOpenSecureMode}
              title="Supervisor Secure Mode"
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
                border: '2px solid #ef4444',
                color: '#b91c1c',
                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.25)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                transition: 'transform 0.05s',
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'none')}
            >
              🔒
            </button>
            <span style={{ fontSize: 10, fontWeight: 'bold', color: '#991b1b' }}>Lock</span>
          </div>
        )}
      </div>

      {/* Main QWERTY Grid (100% Aligned Top to Bottom: Exactly 10 Units on All 3 Rows) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Row 1: 10 Keys */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
          {row1.map(key => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeyClick(key)}
              style={keyStyle}
              onMouseDown={e => (e.currentTarget.style.transform = 'translateY(1px)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'none')}
            >
              {isCaps ? key.toUpperCase() : key.toLowerCase()}
            </button>
          ))}
        </div>

        {/* Row 2: 10 Keys */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
          {row2.map(key => (
            <button
              key={key}
              type="button"
              onClick={() => (key === '@' ? onKeyPress('@') : handleKeyClick(key))}
              style={keyStyle}
              onMouseDown={e => (e.currentTarget.style.transform = 'translateY(1px)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'none')}
            >
              {key === '@' ? '@' : isCaps ? key.toUpperCase() : key.toLowerCase()}
            </button>
          ))}
        </div>

        {/* Row 3: 7 letter keys (1 col each) + Aa (1 col) + SPACE (EXACTLY 2 KEYS WIDTH!) = 10 Units */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
          {row3.map(key => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeyClick(key)}
              style={keyStyle}
              onMouseDown={e => (e.currentTarget.style.transform = 'translateY(1px)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'none')}
            >
              {isCaps ? key.toUpperCase() : key.toLowerCase()}
            </button>
          ))}

          {/* Aa (Caps Lock toggle) - exactly 1 key width */}
          <button
            type="button"
            onClick={() => setIsCaps(!isCaps)}
            style={{
              ...keyStyle,
              background: isCaps ? '#0284c7' : '#ffffff',
              color: isCaps ? '#ffffff' : '#0f172a',
              border: isCaps ? '1px solid #0369a1' : '1px solid #94a3b8',
              fontSize: 14,
            }}
            title="Toggle Caps"
          >
            Aa
          </button>

          {/* SPACE Key - EXACTLY 2 KEYS WIDE (spans 2 columns) */}
          <button
            type="button"
            onClick={() => onKeyPress(' ')}
            style={{
              ...keyStyle,
              gridColumn: 'span 2',
              fontSize: 13,
              color: '#475569',
              letterSpacing: 1,
            }}
          >
            SPACE
          </button>
        </div>
      </div>
    </div>
  );
}
