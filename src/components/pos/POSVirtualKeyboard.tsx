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
          box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.1) !important;
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
        {/* Round Blue 3D Glass View Button with Image */}
        {onOpenView && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <button
              type="button"
              className="pos-kb-key"
              onMouseDown={e => e.preventDefault()}
              onClick={onOpenView}
              title="Browse Stock Catalog (View)"
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: 'linear-gradient(145deg, #38bdf8 0%, #0284c7 55%, #0369a1 100%)',
                border: '2px solid rgba(255, 255, 255, 0.8)',
                color: '#ffffff',
                boxShadow: '0 5px 14px rgba(2, 132, 199, 0.45), inset 0 2px 3px rgba(255, 255, 255, 0.8), inset 0 -2px 4px rgba(0, 0, 0, 0.25)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                backdropFilter: 'blur(8px)',
              }}
            >
              🖼️
            </button>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#0369a1', letterSpacing: 0.5 }}>View</span>
          </div>
        )}

        {/* Round Blue/Red 3D Glass Lock Button with Image */}
        {onOpenSecureMode && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <button
              type="button"
              className="pos-kb-key"
              onMouseDown={e => e.preventDefault()}
              onClick={onOpenSecureMode}
              title="Supervisor Secure Mode Lock"
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: 'linear-gradient(145deg, #60a5fa 0%, #2563eb 55%, #1d4ed8 100%)',
                border: '2px solid rgba(255, 255, 255, 0.8)',
                color: '#ffffff',
                boxShadow: '0 5px 14px rgba(37, 99, 235, 0.45), inset 0 2px 3px rgba(255, 255, 255, 0.8), inset 0 -2px 4px rgba(0, 0, 0, 0.25)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                backdropFilter: 'blur(8px)',
              }}
            >
              🔒
            </button>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#1e40af', letterSpacing: 0.5 }}>Lock</span>
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
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleKeyClick(key)}
              style={blueGlassKeyStyle}
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
              onMouseDown={e => e.preventDefault()}
              onClick={() => (key === '@' ? onKeyPress('@') : handleKeyClick(key))}
              style={blueGlassKeyStyle}
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
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleKeyClick(key)}
              style={blueGlassKeyStyle}
            >
              {isCaps ? key.toUpperCase() : key.toLowerCase()}
            </button>
          ))}

          {/* Aa (Caps Lock toggle) - exactly 1 key width */}
          <button
            type="button"
            className="pos-kb-key"
            onMouseDown={e => e.preventDefault()}
            onClick={() => setIsCaps(!isCaps)}
            style={{
              ...blueGlassKeyStyle,
              background: isCaps 
                ? 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)' 
                : 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
              border: isCaps ? '1px solid #fef3c7' : '1px solid rgba(255, 255, 255, 0.7)',
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
            onMouseDown={e => e.preventDefault()}
            onClick={() => onKeyPress(' ')}
            style={{
              ...blueGlassKeyStyle,
              gridColumn: 'span 2',
              fontSize: 13,
              fontWeight: 800,
              color: '#ffffff',
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

// 3D Blue Glassmorphism Embossed Key Style
const blueGlassKeyStyle: React.CSSProperties = {
  height: 48,
  background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 50%, #0369a1 100%)',
  border: '1px solid rgba(255, 255, 255, 0.75)',
  borderBottom: '2.5px solid #075985',
  borderRadius: 8,
  fontSize: 18,
  fontWeight: 800,
  color: '#ffffff',
  cursor: 'pointer',
  boxShadow: '0 4px 10px rgba(2, 132, 199, 0.35), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.8), inset 0 -2px 3px rgba(0, 0, 0, 0.25)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'manipulation',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
};
