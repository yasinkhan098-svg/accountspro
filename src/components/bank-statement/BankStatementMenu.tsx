import React, { useEffect, useRef } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectUpload: () => void;
  onSelectEntry: () => void;
  pendingCount?: number;
}

export default function BankStatementMenu({
  isOpen,
  onClose,
  onSelectUpload,
  onSelectEntry,
  pendingCount = 0
}: Props) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        background: '#1e293b',
        border: '1px solid #475569',
        borderRadius: 6,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
        zIndex: 99999,
        minWidth: 220,
        overflow: 'hidden',
        marginTop: 4
      }}
    >
      <div
        onClick={() => {
          onClose();
          onSelectUpload();
        }}
        style={{
          padding: '10px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#f8fafc',
          fontSize: 12,
          fontWeight: 600,
          borderBottom: '1px solid #334155',
          transition: 'background 0.15s'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#334155')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ fontSize: 16 }}>📤</span>
        <span>Bank Statement Upload</span>
      </div>

      <div
        onClick={() => {
          onClose();
          onSelectEntry();
        }}
        style={{
          padding: '10px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#f8fafc',
          fontSize: 12,
          fontWeight: 600,
          transition: 'background 0.15s'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#334155')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>📑</span>
          <span>Bank Statement Entry</span>
        </div>
        {pendingCount > 0 && (
          <span style={{
            background: '#0284c7',
            color: '#ffffff',
            padding: '2px 7px',
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 'bold'
          }}>
            {pendingCount}
          </span>
        )}
      </div>
    </div>
  );
}
