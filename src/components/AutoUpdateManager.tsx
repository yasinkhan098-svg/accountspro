"use client";
import React, { useEffect, useState } from 'react';

interface AutoUpdateManagerProps {
  isDesktop?: boolean;
  onToast?: (msg: string) => void;
}

export default function AutoUpdateManager({ isDesktop, onToast }: AutoUpdateManagerProps) {
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const checkVersion = async (isManual = false) => {
    if (!navigator.onLine) {
      if (isManual && onToast) {
        onToast("Offline Mode • Cannot check for updates without internet.");
      }
      return;
    }

    try {
      if (isManual) setChecking(true);
      const res = await fetch(`/api/app-version?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      if (!res.ok) return;

      const data = await res.json();
      const currentVersion = localStorage.getItem('ledgerx_current_build_version');

      if (!currentVersion) {
        // First run: save current version
        localStorage.setItem('ledgerx_current_build_version', data.version);
        if (isManual && onToast) {
          onToast("You are running the latest version! ✓");
        }
        return;
      }

      if (currentVersion !== data.version) {
        // New update available!
        setUpdateAvailable(true);
        localStorage.setItem('ledgerx_current_build_version', data.version);
        if (onToast) {
          onToast("🚀 New Online Update Detected! Updating application now...");
        }

        // Purge old cache and update service worker
        try {
          if (typeof window !== 'undefined' && (window as any).caches) {
            const keys = await (window as any).caches.keys();
            await Promise.all(keys.map((k: string) => (window as any).caches.delete(k)));
          }
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
              if (reg.active) {
                reg.active.postMessage({ type: 'CLEAR_CACHE' });
              }
              await reg.update();
            }
          }
        } catch (e) {
          console.warn('Cache purge error:', e);
        }

        // Reload window with fresh assets
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        if (isManual && onToast) {
          onToast("Software is up to date with cloud! ✓");
        }
      }
    } catch (err) {
      console.warn('Update check failed:', err);
    } finally {
      if (isManual) setChecking(false);
    }
  };

  useEffect(() => {
    // 1. Check immediately on mount
    checkVersion();

    // 2. Check whenever device reconnects to internet
    const onOnline = () => {
      checkVersion();
    };
    window.addEventListener('online', onOnline);

    // 3. Periodic background check every 60 seconds
    const interval = setInterval(() => {
      checkVersion();
    }, 60 * 1000);

    // 4. Global keyboard shortcut Ctrl+Shift+R for hard reload
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        if (onToast) onToast("Refreshing & Syncing with Cloud...");
        if (typeof window !== 'undefined' && (window as any).caches) {
          (window as any).caches.keys().then((keys: string[]) => Promise.all(keys.map(k => (window as any).caches.delete(k)))).then(() => {
            window.location.reload();
          });
        } else {
          window.location.reload();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    // 5. Expose manual trigger function on window
    (window as any).checkForAppUpdates = () => checkVersion(true);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('keydown', onKeyDown);
      clearInterval(interval);
    };
  }, []);

  return null;
}
