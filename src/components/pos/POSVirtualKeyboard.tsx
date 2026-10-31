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

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        background: 'linear-gradient(180deg, #dbe4ee 0%, #cbd5e1 100%)',
        borderRadius: 12,
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.8), 0 4px 12px rgba(0, 0, 0, 0.08)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'manipulation',
      }}
    >
      <style>{`
        .pos-kb-key {
          touch-action: manipulation;
          user-select: none;
          -webkit-user-select: none;
          transition: transform 0.06s ease, box-shadow 0.06s ease, background 0.08s ease;
        }
        .pos-kb-key:active {
          transform: translateY(2px) scale(0.97) !important;
          box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.25), 0 1px 2px rgba(0, 0, 0, 0.1) !important;
        }
      `}</style>

      {/* Left Action Buttons: Circular 3D Glass View & Lock Buttons */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          alignItems: 'center',
          justifyContent: 'center',
          paddingRight: 8,
          borderRight: '1px solid rgba(148, 163, 184, 0.5)',
        }}
      >
        {/* Round 3D Glass View Button */}
        {onOpenView && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <button
              type="button"
              className="pos-kb-key"
              onClick={onOpenView}
              title="Browse Stock Catalog (View)"
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: 'linear-gradient(145deg, #ffffff 0%, #e0f2fe 50%, #bae6fd 100%)',
                border: '2px solid #38bdf8',
                color: '#0284c7',
                boxShadow: '0 5px 12px rgba(2, 132, 199, 0.3), inset 0 2px 2px rgba(255, 255, 255, 0.95), inset 0 -2px 4px rgba(2, 132, 199, 0.2)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                backdropFilter: 'blur(6px)',
              }}
            >
              🖼️
            </button>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#0369a1', letterSpacing: 0.5 }}>View</span>
          </div>
        )}

        {/* Round 3D Glass Lock Button */}
        {onOpenSecureMode && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <button
              type="button"
              className="pos-kb-key"
              onClick={onOpenSecureMode}
              title="Supervisor Secure Mode Lock"
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: 'linear-gradient(145deg, #ffffff 0%, #fee2e2 50%, #fecaca 100%)',
                border: '2px solid #f87171',
                color: '#b91c1c',
                boxShadow: '0 5px 12px rgba(239, 68, 68, 0.3), inset 0 2px 2px rgba(255, 255, 255, 0.95), inset 0 -2px 4px rgba(239, 68, 68, 0.2)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                backdropFilter: 'blur(6px)',
              }}
            >
              🔒
            </button>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#991b1b', letterSpacing: 0.5 }}>Lock</span>
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
              className="pos-kb-key"
              onClick={() => handleKeyClick(key)}
              style={glassKeyStyle}
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
              className="pos-kb-key"
              onClick={() => (key === '@' ? onKeyPress('@') : handleKeyClick(key))}
              style={glassKeyStyle}
            >
              {key === '@' ? '@' : isCaps ? key.toUpperCase() : key.toLowerCase()}
            </button>
          ))}
        </div>

        {/* Row 3: 7 letter keys (1 col each) + Aa (1 col) + SPACE (EXACTLY 2 KEYS WIDTH) = 10 Units */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
          {row3.map(key => (
            <button
              key={key}
              type="button"
              className="pos-kb-key"
              onClick={() => handleKeyClick(key)}
              style={glassKeyStyle}
            >
              {isCaps ? key.toUpperCase() : key.toLowerCase()}
            </button>
          ))}

          {/* Aa (Caps Lock toggle) - exactly 1 key width */}
          <button
            type="button"
            className="pos-kb-key"
            onClick={() => setIsCaps(!isCaps)}
            style={{
              ...glassKeyStyle,
              background: isCaps 
                ? 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)' 
                : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.85) 100%)',
              color: isCaps ? '#ffffff' : '#0f172a',
              border: isCaps ? '1px solid #0369a1' : '1px solid rgba(255, 255, 255, 0.9)',
              fontSize: 15,
              fontWeight: 900,
            }}
            title="Toggle Caps"
          >
            Aa
          </button>

          {/* SPACE Key - EXACTLY 2 KEYS WIDE (spans 2 columns) */}
          <button
            type="button"
            className="pos-kb-key"
            onClick={() => onKeyPress(' ')}
            style={{
              ...glassKeyStyle,
              gridColumn: 'span 2',
              fontSize: 13,
              fontWeight: 800,
              color: '#475569',
              letterSpacing: 2,
            }}
          >
            SPACE
          </button>
        </div>
      </div>
    </div>
  );
}

// 3D Glassmorphism Embossed Key Style
const glassKeyStyle: React.CSSProperties = {
  height: 48,
  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.9) 60%, rgba(226, 232, 240, 0.85) 100%)',
  border: '1px solid rgba(255, 255, 255, 0.9)',
  borderBottom: '2px solid rgba(148, 163, 184, 0.6)',
  borderRadius: 8,
  fontSize: 18,
  fontWeight: 800,
  color: '#0f172a',
  cursor: 'pointer',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 1px rgba(255, 255, 255, 1), inset 0 -2px 0 rgba(0, 0, 0, 0.06)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'manipulation',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};
