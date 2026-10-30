"use client";
import React from 'react';

interface POSVirtualNumpadProps {
  onNumberPress: (digit: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  onClear?: () => void;
  onPayClick?: () => void;
  onQtySet?: () => void;
}

export default function POSVirtualNumpad({
  onNumberPress,
  onBackspace,
  onEnter,
  onClear,
  onPayClick,
  onQtySet,
}: POSVirtualNumpadProps) {
  const btnStyle: React.CSSProperties = {
    flex: 1,
    height: 48,
    background: '#ffffff',
    border: '1px solid #94a3b8',
    borderRadius: 6,
    fontSize: 20,
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

  const actionBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: '#f1f5f9',
    color: '#0369a1',
    fontSize: 16,
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
        width: '100%',
      }}
    >
      {/* Row 1: 7, 8, 9, NG */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" style={btnStyle} onClick={() => onNumberPress('7')}>7</button>
        <button type="button" style={btnStyle} onClick={() => onNumberPress('8')}>8</button>
        <button type="button" style={btnStyle} onClick={() => onNumberPress('9')}>9</button>
        <button
          type="button"
          style={{ ...actionBtnStyle, background: '#fee2e2', color: '#b91c1c' }}
          onClick={onClear}
          title="Clear Input / No Goods"
        >
          NG
        </button>
      </div>

      {/* Row 2: 4, 5, 6, < (Backspace) */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" style={btnStyle} onClick={() => onNumberPress('4')}>4</button>
        <button type="button" style={btnStyle} onClick={() => onNumberPress('5')}>5</button>
        <button type="button" style={btnStyle} onClick={() => onNumberPress('6')}>6</button>
        <button
          type="button"
          style={{ ...actionBtnStyle, background: '#fef3c7', color: '#b45309', fontSize: 20 }}
          onClick={onBackspace}
          title="Backspace"
        >
          ⌫
        </button>
      </div>

      {/* Row 3: 1, 2, 3, = (Qty Set) */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" style={btnStyle} onClick={() => onNumberPress('1')}>1</button>
        <button type="button" style={btnStyle} onClick={() => onNumberPress('2')}>2</button>
        <button type="button" style={btnStyle} onClick={() => onNumberPress('3')}>3</button>
        <button
          type="button"
          style={{ ...actionBtnStyle, background: '#e0f2fe', color: '#0369a1', fontSize: 18 }}
          onClick={onQtySet || onEnter}
          title="Apply Qty / Calc"
        >
          =
        </button>
      </div>

      {/* Row 4: ., 0, Enter */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" style={btnStyle} onClick={() => onNumberPress('.')}>.</button>
        <button type="button" style={btnStyle} onClick={() => onNumberPress('0')}>0</button>
        <button
          type="button"
          style={{
            ...btnStyle,
            flex: 2,
            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
            color: '#ffffff',
            boxShadow: '0 2px 0 #075985',
            fontSize: 16,
          }}
          onClick={onEnter}
        >
          Enter ↵
        </button>
      </div>

      {/* Big Pay / Settle Button */}
      {onPayClick && (
        <button
          type="button"
          onClick={onPayClick}
          style={{
            width: '100%',
            height: 52,
            marginTop: 4,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'none',
            borderRadius: 6,
            color: '#ffffff',
            fontSize: 18,
            fontWeight: 'bold',
            letterSpacing: 0.5,
            cursor: 'pointer',
            boxShadow: '0 3px 0 #047857',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span>💵 PAY / SETTLE (F12)</span>
        </button>
      )}
    </div>
  );
}

