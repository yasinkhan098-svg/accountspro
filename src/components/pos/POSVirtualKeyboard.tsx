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

  const row1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  const row2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '@'];
  const row3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];

  const handleKeyClick = (k: string) => {
    const char = isCaps ? k.toUpperCase() : k.toLowerCase();
    onKeyPress(char);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '8px 10px',
        background: '#e2e8f0',
        borderRadius: 8,
        border: '1px solid #cbd5e1',
        userSelect: 'none',
      }}
    >
      {/* Row 1 */}
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
        {row1.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => handleKeyClick(key)}
            style={{
              flex: 1,
              height: 48,
              minWidth: 38,
              maxWidth: 62,
              background: '#ffffff',
              border: '1px solid #94a3b8',
              borderRadius: 6,
              fontSize: 18,
              fontWeight: 'bold',
              color: '#0f172a',
              cursor: 'pointer',
              boxShadow: '0 2px 0 #94a3b8, inset 0 1px 0 #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.1s, transform 0.05s',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'translateY(1px)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'none')}
          >
            {isCaps ? key.toUpperCase() : key.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Row 2 */}
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
        {row2.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => (key === '@' ? onKeyPress('@') : handleKeyClick(key))}
            style={{
              flex: 1,
              height: 48,
              minWidth: 38,
              maxWidth: 62,
              background: '#ffffff',
              border: '1px solid #94a3b8',
              borderRadius: 6,
              fontSize: 18,
              fontWeight: 'bold',
              color: '#0f172a',
              cursor: 'pointer',
              boxShadow: '0 2px 0 #94a3b8, inset 0 1px 0 #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.1s, transform 0.05s',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'translateY(1px)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'none')}
          >
            {key === '@' ? '@' : isCaps ? key.toUpperCase() : key.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Row 3 */}
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', alignItems: 'center' }}>
        {/* Left Action: View Items */}
        {onOpenView && (
          <button
            type="button"
            onClick={onOpenView}
            title="Browse Stock Catalog"
            style={{
              width: 58,
              height: 48,
              background: '#f8fafc',
              border: '1px solid #94a3b8',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 'bold',
              color: '#0f3c64',
              cursor: 'pointer',
              boxShadow: '0 2px 0 #94a3b8',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1.1,
            }}
          >
            <span style={{ fontSize: 15 }}>🖼️</span>
            <span>View</span>
          </button>
        )}

        {/* Left Action: Secure Mode */}
        {onOpenSecureMode && (
          <button
            type="button"
            onClick={onOpenSecureMode}
            title="Supervisor Secure Mode"
            style={{
              width: 58,
              height: 48,
              background: '#fee2e2',
              border: '1px solid #f87171',
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 'bold',
              color: '#991b1b',
              cursor: 'pointer',
              boxShadow: '0 2px 0 #f87171',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1.1,
            }}
          >
            <span style={{ fontSize: 14 }}>🔒</span>
            <span>Lock</span>
          </button>
        )}

        {/* Z X C V B N M */}
        {row3.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => handleKeyClick(key)}
            style={{
              flex: 1,
              height: 48,
              minWidth: 38,
              maxWidth: 62,
              background: '#ffffff',
              border: '1px solid #94a3b8',
              borderRadius: 6,
              fontSize: 18,
              fontWeight: 'bold',
              color: '#0f172a',
              cursor: 'pointer',
              boxShadow: '0 2px 0 #94a3b8, inset 0 1px 0 #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isCaps ? key.toUpperCase() : key.toLowerCase()}
          </button>
        ))}

        {/* Caps / Aa Toggle */}
        <button
          type="button"
          onClick={() => setIsCaps(!isCaps)}
          style={{
            minWidth: 46,
            height: 48,
            background: isCaps ? '#0284c7' : '#ffffff',
            color: isCaps ? '#ffffff' : '#0f172a',
            border: '1px solid #94a3b8',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 0 #94a3b8',
          }}
        >
          Aa
        </button>

        {/* Space Bar */}
        <button
          type="button"
          onClick={() => onKeyPress(' ')}
          style={{
            flex: 2,
            height: 48,
            minWidth: 80,
            background: '#ffffff',
            border: '1px solid #94a3b8',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 'bold',
            color: '#475569',
            cursor: 'pointer',
            boxShadow: '0 2px 0 #94a3b8',
          }}
        >
          SPACE
        </button>
      </div>
    </div>
  );
}
