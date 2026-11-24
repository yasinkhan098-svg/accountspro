// ============================================================================
// Direct USB / Serial WebSerial Bridge for Weighing Scales
// Cross-Platform (Windows COM1..N & macOS /dev/tty.usbserial-*)
// ============================================================================

import { ScalePLUItem } from './scaleTypes';

export interface ScaleUsbTransferProgress {
  sentCount: number;
  totalCount: number;
  percentage: number;
  currentItemName: string;
  statusText: string;
}

export type ProgressCallback = (progress: ScaleUsbTransferProgress) => void;

/**
 * Checks whether the browser and OS support WebSerial API
 */
export const isWebSerialSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
};

/**
 * Direct USB Serial Scale Bridge
 */
export class ScaleUsbBridge {
  private port: any = null;
  private writer: any = null;

  /**
   * Request USB port from user prompt (Windows & macOS)
   */
  async requestAndOpenPort(baudRate = 9600): Promise<boolean> {
    if (!isWebSerialSupported()) {
      throw new Error(
        'WebSerial API is not supported in this browser. Please use Google Chrome or Microsoft Edge on Windows or macOS.'
      );
    }

    try {
      // Prompt user to pick USB / COM Port of the scale
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({
        baudRate: Number(baudRate) || 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
      });
      return true;
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        throw new Error('No scale USB port was selected.');
      }
      throw err;
    }
  }

  /**
   * Sends formatted PLU records over USB to the scale with live progress
   */
  async streamPLUItemsToScale(
    items: ScalePLUItem[],
    companyName: string,
    onProgress?: ProgressCallback
  ): Promise<{ success: boolean; totalSent: number }> {
    if (!this.port || !this.port.writable) {
      throw new Error('Scale USB port is not connected or not writable.');
    }

    const textEncoder = new TextEncoder();
    this.writer = this.port.writable.getWriter();

    try {
      const total = items.length;

      // 1. Initial Handshake / Wakeup packet
      const initFrame = `\x02#INIT_SCALE#STORE:${companyName.slice(0, 24)}\x03\r\n`;
      await this.writer.write(textEncoder.encode(initFrame));
      await new Promise(r => setTimeout(r, 100)); // Small throttle for scale microcontroller

      // 2. Stream individual PLU item records
      for (let i = 0; i < total; i++) {
        const it = items[i];
        const code = it.itemCode || String(it.plu).padStart(5, '0');
        const price = it.retailPrice.toFixed(2);
        const name = it.name.slice(0, 24);

        // Standard PLU packet structure: STX + PLU + Code + Name + Price + ETX
        const pluFrame = `\x02PLU:${it.plu},${code},${name},${price}\x03\r\n`;
        await this.writer.write(textEncoder.encode(pluFrame));

        if (onProgress) {
          const sentCount = i + 1;
          const percentage = Math.round((sentCount / total) * 100);
          onProgress({
            sentCount,
            totalCount: total,
            percentage,
            currentItemName: it.name,
            statusText: `Streaming item ${sentCount}/${total}: ${it.name}...`,
          });
        }

        // 35ms pause between packets allows scale hardware buffer to flush without overflow
        await new Promise(r => setTimeout(r, 35));
      }

      // 3. Final synchronization packet
      const endFrame = `\x02#END_SYNC#ITEMS:${total}\x03\r\n`;
      await this.writer.write(textEncoder.encode(endFrame));
      await new Promise(r => setTimeout(r, 100));

      return { success: true, totalSent: total };
    } finally {
      if (this.writer) {
        try {
          this.writer.releaseLock();
        } catch (_) {}
      }
    }
  }

  /**
   * Safely closes the USB port
   */
  async closePort(): Promise<void> {
    try {
      if (this.port) {
        await this.port.close();
      }
    } catch (_) {
    } finally {
      this.port = null;
      this.writer = null;
    }
  }
}
