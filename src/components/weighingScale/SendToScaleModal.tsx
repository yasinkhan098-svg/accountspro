import React, { useState, useMemo, useRef } from 'react';
import {
  ScalePLUItem,
} from '@/lib/weighingScale/scaleTypes';
import {
  extractAndSortScalePLUs,
} from '@/lib/weighingScale/scaleAutoSorter';
import {
  ScaleUsbBridge,
  isWebSerialSupported,
  ScaleUsbTransferProgress,
} from '@/lib/weighingScale/scaleUsbBridge';

interface SendToScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  companyName: string;
  currencySymbol?: string;
}

export const SendToScaleModal: React.FC<SendToScaleModalProps> = ({
  isOpen,
  onClose,
  items,
  companyName,
  currencySymbol = '₹',
}) => {
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [progress, setProgress] = useState<ScaleUsbTransferProgress | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const bridgeRef = useRef<ScaleUsbBridge | null>(null);

  // Extract and sort loose items alphabetically A to Z
  const loosePLUs: ScalePLUItem[] = useMemo(() => {
    return extractAndSortScalePLUs(items, companyName);
  }, [items, companyName]);

  if (!isOpen) return null;

  const supported = isWebSerialSupported();

  const handleStartUsbTransfer = async () => {
    if (!supported) {
      alert('Direct USB transfer requires Google Chrome or Microsoft Edge with WebSerial support.');
      return;
    }

    if (loosePLUs.length === 0) {
      alert('No loose items found with variant "Loose". Please tag loose items first!');
      return;
    }

    setIsConnecting(true);
    setStatusMessage('Please select your Weighing Scale USB / COM port in the browser prompt...');
    setIsSuccess(false);

    try {
      const bridge = new ScaleUsbBridge();
      bridgeRef.current = bridge;

      await bridge.requestAndOpenPort(baudRate);
      setIsConnecting(false);
      setIsStreaming(true);
      setStatusMessage('Connected to scale! Streaming PLU records...');

      const result = await bridge.streamPLUItemsToScale(
        loosePLUs,
        companyName || 'STORE',
        prog => {
          setProgress(prog);
          setStatusMessage(prog.statusText);
        }
      );

      if (result.success) {
        setIsSuccess(true);
        setStatusMessage(`✓ Success! Transferred ${result.totalSent} items directly into scale memory.`);
      }
    } catch (err: any) {
      console.error('USB Transfer Error:', err);
      setStatusMessage(`❌ Error: ${err.message || 'Failed to connect to scale'}`);
    } finally {
      setIsConnecting(false);
      setIsStreaming(false);
      if (bridgeRef.current) {
        await bridgeRef.current.closePort();
        bridgeRef.current = null;
      }
    }
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
          maxWidth: 680,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)',
            color: '#ffffff',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>📡</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, letterSpacing: '0.02em' }}>
                Direct USB Send to Weighing Scale
              </h2>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.9 }}>
                Direct cable connection (Windows COM Port & macOS USB Serial)
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

        {/* Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {/* WebSerial Support Check */}
          {!supported ? (
            <div
              style={{
                background: '#fef2f2',
                border: '1.5px solid #ef4444',
                color: '#991b1b',
                padding: 12,
                borderRadius: 8,
                fontSize: 12,
                marginBottom: 16,
              }}
            >
              <b>⚠️ WebSerial API Not Supported in this browser.</b>
              <div style={{ marginTop: 4 }}>
                Please open LedgerX in <b>Google Chrome</b> or <b>Microsoft Edge</b> on Windows or macOS to use direct USB cable transfer.
                Alternatively, use the <b>⚖️ Export for Weighing Scale</b> button for Pen Drive loading.
              </div>
            </div>
          ) : (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                color: '#166534',
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 11.5,
                fontWeight: 700,
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>✓</span> Ready for USB Serial Connection (Windows & macOS Supported)
            </div>
          )}

          {/* Configuration Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr',
              gap: 12,
              marginBottom: 16,
              background: '#f8fafc',
              padding: 12,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                Active Store / Company:
              </label>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#0369a1' }}>
                {companyName || 'STORE'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                Baud Rate (Speed):
              </label>
              <select
                value={baudRate}
                onChange={e => setBaudRate(Number(e.target.value))}
                disabled={isConnecting || isStreaming}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1.5px solid #0284c7',
                  fontSize: 12,
                  fontWeight: 700,
                  outline: 'none',
                  background: '#ffffff',
                }}
              >
                <option value={9600}>9600 bps (Standard Raintech/Essae)</option>
                <option value={19200}>19200 bps</option>
                <option value={38400}>38400 bps</option>
                <option value={115200}>115200 bps (High Speed)</option>
              </select>
            </div>
          </div>

          {/* Loose items count & overview */}
          <div
            style={{
              background: '#f1f5f9',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>
                {loosePLUs.length} Loose Items Ready to Stream
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                All items sorted Alphabetically (A to Z) with Scale Keys 1 to {loosePLUs.length}
              </div>
            </div>
            <span
              style={{
                background: '#0284c7',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 900,
                padding: '4px 10px',
                borderRadius: 20,
              }}
            >
              Keys 1 to {loosePLUs.length}
            </span>
          </div>

          {/* Progress Bar & Status */}
          {(isStreaming || isConnecting || statusMessage) && (
            <div
              style={{
                background: isSuccess ? '#ecfdf5' : '#f8fafc',
                border: isSuccess ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                borderRadius: 8,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: isSuccess ? '#065f46' : '#1e293b', marginBottom: 8 }}>
                {statusMessage}
              </div>

              {progress && (
                <div>
                  <div
                    style={{
                      height: 12,
                      background: '#e2e8f0',
                      borderRadius: 6,
                      overflow: 'hidden',
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${progress.percentage}%`,
                        background: 'linear-gradient(90deg, #0284c7, #10b981)',
                        transition: 'width 0.15s ease',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                    <span>Item: <b>{progress.currentItemName}</b></span>
                    <span><b>{progress.percentage}%</b> ({progress.sentCount}/{progress.totalCount})</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
            <b>Instructions:</b>
            <ol style={{ margin: '4px 0 0 0', paddingLeft: 18 }}>
              <li>Connect USB cable from your PC/Mac to the weighing scale.</li>
              <li>Turn on the weighing scale.</li>
              <li>Click <b>"Connect & Send to Scale"</b> below.</li>
              <li>Select your scale USB/COM device from the browser popup.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="pos-touch-btn"
            style={{
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>

          <button
            type="button"
            onClick={handleStartUsbTransfer}
            disabled={!supported || isConnecting || isStreaming || loosePLUs.length === 0}
            className="pos-touch-btn"
            style={{
              background: (!supported || loosePLUs.length === 0) ? '#94a3b8' : 'linear-gradient(135deg, #0284c7, #0369a1)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 20px',
              fontSize: 12,
              fontWeight: 900,
              cursor: (!supported || loosePLUs.length === 0 || isConnecting || isStreaming) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 4px rgba(2, 132, 199, 0.3)',
            }}
          >
            <span>📡</span>
            {isConnecting ? 'Waiting for Port...' : (isStreaming ? 'Streaming...' : 'Connect & Send to Scale')}
          </button>
        </div>
      </div>
    </div>
  );
};
