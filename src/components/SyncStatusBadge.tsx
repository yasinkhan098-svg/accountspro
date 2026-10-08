"use client";
import { useEffect, useRef } from 'react';
import { offlineSyncService } from '@/lib/offlineSyncService';

interface SyncStatusBadgeProps {
  companyId?: number;
  authToken?: string;
  onDataMerged?: (pulled: any) => void;
}

/**
 * Headless background sync manager.
 * Operates 100% silently in the background without rendering any UI buttons or badges in the header.
 */
export default function SyncStatusBadge({ companyId, authToken, onDataMerged }: SyncStatusBadgeProps) {
  const isSyncingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!companyId) return;

    const performSilentSync = async () => {
      if (isSyncingRef.current || !navigator.onLine) return;
      const token = authToken || offlineSyncService.getOfflineToken() || '';
      if (!token) return;

      try {
        isSyncingRef.current = true;
        await offlineSyncService.syncWithCloud(companyId, token, onDataMerged);
      } catch (err) {
        console.warn('Silent background sync error:', err);
      } finally {
        isSyncingRef.current = false;
      }
    };

    // 1. Initial check: if online, sync silently immediately (pulls cloud data & pushes local data)
    if (navigator.onLine) {
      performSilentSync();
    }

    // 2. Event listener for manual or triggered sync events
    const handleTrigger = () => {
      performSilentSync();
    };
    window.addEventListener('ledgerx:trigger-auto-sync', handleTrigger);

    // 3. Auto-sync whenever internet connectivity is restored
    const handleOnline = () => {
      performSilentSync();
    };
    window.addEventListener('online', handleOnline);

    // 4. Periodic silent heartbeat sync every 15 seconds (2-way sync)
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        performSilentSync();
      }
    }, 15000);

    return () => {
      window.removeEventListener('ledgerx:trigger-auto-sync', handleTrigger);
      window.removeEventListener('online', handleOnline);
      clearInterval(intervalId);
    };
  }, [companyId, authToken, onDataMerged]);

  // Completely headless - nothing rendered in the top header
  return null;
}
