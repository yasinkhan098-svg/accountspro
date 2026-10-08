import { LicensePayload } from './licenseEngine';

const SIGNING_SECRET = process.env.NEXT_PUBLIC_LICENSE_SIGNING_SECRET || 'accounts_pro_offline_master_secret_2027';
const OFFLINE_TOKEN_KEY = 'ledgerx_offline_license_token';
const MACHINE_ID_KEY = 'ledgerx_machine_id';
const SYNC_QUEUE_KEY = 'ledgerx_sync_queue';
const LAST_SYNC_TIME_KEY = 'ledgerx_last_sync_time';
const TIME_GUARD_KEY = 'ledgerx_time_guard';
const OFFLINE_BACKUP_KEY = 'ledgerx_offline_data_backup';

export interface SyncQueueItem {
  id: string; // unique local ID e.g. "sq_1712345678"
  type: 'VOUCHER' | 'LEDGER' | 'STOCK_ITEM' | 'UNIT' | 'STOCK_GROUP' | 'COMPANY';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  data: any;
  companyId: number;
  timestamp: string;
}

export interface OfflineGuardResult {
  allowed: boolean;
  reason?: 'NO_LICENSE' | 'EXPIRED' | 'CLOCK_ROLLBACK' | 'INVALID_TOKEN';
  message?: string;
  payload?: LicensePayload;
  expiryDate?: Date;
  daysRemaining?: number;
}

export type SyncStatusType = 'online-synced' | 'offline-pending' | 'syncing' | 'offline-locked' | 'error';

class OfflineSyncService {
  private syncInProgress = false;
  private statusListeners: ((status: SyncStatusType, meta?: any) => void)[] = [];
  private currentStatus: SyncStatusType = 'online-synced';

  constructor() {
    if (typeof window !== 'undefined') {
      this.initNetworkListeners();
      this.updateTimeGuard();
      // Record time guard tick every 5 minutes
      setInterval(() => this.updateTimeGuard(), 5 * 60 * 1000);
      // Auto-sync heartbeat check every 30 seconds
      setInterval(() => {
        if (this.isOnline()) {
          if (this.getPendingCount() > 0) {
            this.triggerAutoSync();
          } else {
            this.verifyOnlineLicenseHeartbeat();
          }
        }
      }, 30 * 1000);
    }
  }

  public async verifyOnlineLicenseHeartbeat(): Promise<void> {
    if (typeof window === 'undefined' || !this.isOnline() || !this.isDesktopEnvironment()) return;
    const token = this.getOfflineToken();
    if (!token) return;

    try {
      const machineId = await this.getMachineId();
      const res = await fetch('/api/license/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, machineId }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.valid && data.token) {
          await this.saveOfflineToken(data.token);
        }
      } else if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.deactivated) {
          console.warn('[OfflineSync] Device deactivated by server.');
          this.removeOfflineToken();
          alert('Hardware Security Alert:\n\nThis computer was unlinked from your account portal because your license was transferred to another computer.\n\nDesktop access on this machine is now locked.');
          window.location.reload();
        }
      }
    } catch (e) {
      // Offline or network error, continue normal operation
    }
  }

  // ==================== 1. NETWORK & TIME GUARD ====================

  public isOnline(): boolean {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  }

  public isDesktopEnvironment(): boolean {
    if (typeof window === 'undefined') return false;
    if ((window as any).desktopBridge?.isDesktopApp) return true;
    if (typeof navigator !== 'undefined' && navigator.userAgent && /electron/i.test(navigator.userAgent)) return true;
    if (window.location.search.includes('desktop=1')) {
      localStorage.setItem('ledgerx_is_desktop', '1');
      return true;
    }
    if (localStorage.getItem('ledgerx_is_desktop') === '1') return true;
    return false;
  }

  private initNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('[OfflineSync] Internet reconnected! Triggering auto-sync...');
      this.triggerAutoSync();
    });

    window.addEventListener('offline', () => {
      console.log('[OfflineSync] Internet lost. Switched to offline mode.');
      this.notifyStatus(this.getPendingCount() > 0 ? 'offline-pending' : 'online-synced');
    });
  }

  private updateTimeGuard(): void {
    if (typeof window === 'undefined') return;
    try {
      const now = Date.now();
      const last = parseInt(localStorage.getItem(TIME_GUARD_KEY) || '0', 10);
      if (last > 0 && now < last - (15 * 60 * 1000)) {
        console.warn('[OfflineSync] System clock rollback detected!');
      } else {
        localStorage.setItem(TIME_GUARD_KEY, String(now));
      }
    } catch (e) {}
  }

  public isClockRolledBack(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const now = Date.now();
      const last = parseInt(localStorage.getItem(TIME_GUARD_KEY) || '0', 10);
      return last > 0 && now < last - (15 * 60 * 1000);
    } catch (e) {
      return false;
    }
  }

  // ==================== 2. MACHINE ID (HARDWARE FINGERPRINT) ====================

  public async getMachineId(): Promise<string> {
    if (typeof window === 'undefined') return 'DESKTOP-SERVER';

    // 1. Electron bridge if running in desktop app
    if ((window as any).desktopBridge?.getMachineId) {
      try {
        const hwid = await (window as any).desktopBridge.getMachineId();
        if (hwid) {
          localStorage.setItem(MACHINE_ID_KEY, hwid);
          return hwid;
        }
      } catch (e) {}
    }

    // 2. C# Launcher URL parameter ?hwid=...
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlHwid = urlParams.get('hwid');
      if (urlHwid) {
        localStorage.setItem(MACHINE_ID_KEY, urlHwid);
        return urlHwid;
      }
    } catch (e) {}

    // 3. Persistent Machine ID fallback in storage
    let storedHwid = localStorage.getItem(MACHINE_ID_KEY);
    if (storedHwid) return storedHwid;

    // 4. Stable hardware fingerprint from system attributes
    try {
      const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
      const navInfo = `${navigator.userAgent}_${navigator.language}_${navigator.hardwareConcurrency || 4}`;
      let hash = 0;
      const str = screenInfo + '_' + navInfo;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
      storedHwid = `LX-HWID-${hex}-${Date.now().toString(36).toUpperCase()}`;
      localStorage.setItem(MACHINE_ID_KEY, storedHwid);
      return storedHwid;
    } catch (e) {
      storedHwid = `LX-HWID-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      localStorage.setItem(MACHINE_ID_KEY, storedHwid);
      return storedHwid;
    }
  }

  // ==================== 3. OFFLINE LICENSE MANAGEMENT ====================

  public getOfflineToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(OFFLINE_TOKEN_KEY) || localStorage.getItem('ledgerx_license_vault');
  }

  public async saveOfflineToken(token: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(OFFLINE_TOKEN_KEY, token);
      localStorage.setItem('ledgerx_license_vault', token);
      if ((window as any).desktopBridge?.saveOfflineToken) {
        await (window as any).desktopBridge.saveOfflineToken(token);
      }
      return true;
    } catch (e) {
      console.error('Failed to save offline token:', e);
      return false;
    }
  }

  public removeOfflineToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(OFFLINE_TOKEN_KEY);
    localStorage.removeItem('ledgerx_license_vault');
  }

  public decodeToken(token: string): { payload: LicensePayload | null; signature: string } {
    try {
      const raw = atob(token);
      const tokenObj = JSON.parse(raw);
      if (!tokenObj.p || !tokenObj.s) return { payload: null, signature: '' };
      const jsonStr = atob(tokenObj.p);
      const payload: LicensePayload = JSON.parse(jsonStr);
      return { payload, signature: tokenObj.s };
    } catch (e) {
      return { payload: null, signature: '' };
    }
  }

  /**
   * Evaluates if the current app is allowed to run offline.
   * STRICT ENFORCEMENT & SEAMLESS PERSISTENCE:
   * 1. Browser online users are never blocked.
   * 2. Once activated on Desktop PC, app remains 100% unlocked offline until subscription expiry!
   * 3. Hardware fingerprint lock ensures token cannot be stolen to run on another PC.
   */
  public async verifyOfflineGuard(): Promise<OfflineGuardResult> {
    if (typeof window === 'undefined') {
      return { allowed: true };
    }

    const isDesktop = this.isDesktopEnvironment();
    const isOnline = navigator.onLine;

    // Normal browser session while online -> allow access without desktop lock
    if (!isDesktop && isOnline) {
      return { allowed: true };
    }

    const token = this.getOfflineToken();

    // 1. No license activated at all
    if (!token) {
      return {
        allowed: false,
        reason: 'NO_LICENSE',
        message: 'Desktop App requires one-time activation. Please connect to the internet and enter your license key once.',
      };
    }

    // 2. Decode token
    const { payload } = this.decodeToken(token);
    if (!payload || !payload.licenseKey) {
      return {
        allowed: false,
        reason: 'INVALID_TOKEN',
        message: 'Invalid or corrupted desktop license key. Please reactivate your device.',
      };
    }

    // 3. Hardware / Machine ID Lock check
    const currentHwid = await this.getMachineId();
    if (
      payload.machineId &&
      payload.machineId !== 'DESKTOP-APP' &&
      payload.machineId !== 'DESKTOP-ADMIN' &&
      currentHwid &&
      currentHwid !== 'DESKTOP-APP'
    ) {
      if (payload.machineId.startsWith('LX-HWID-') && currentHwid.startsWith('LX-HWID-')) {
        if (payload.machineId !== currentHwid) {
          return {
            allowed: false,
            reason: 'INVALID_TOKEN',
            message: `Hardware Security Lock: This desktop license is locked to another computer (${payload.machineId.substring(0, 16)}...). It cannot be run on this PC.`,
            payload,
          };
        }
      }
    }

    // 4. Clock rollback protection
    if (this.isClockRolledBack()) {
      return {
        allowed: false,
        reason: 'CLOCK_ROLLBACK',
        message: 'System date rollback detected! Please correct your computer system clock to continue.',
        payload,
      };
    }

    // 5. Expiry Check
    if (payload.validUntil) {
      const expiry = new Date(payload.validUntil).getTime();
      const now = Date.now();
      if (now > expiry) {
        return {
          allowed: false,
          reason: 'EXPIRED',
          message: `Your License Subscription expired on ${new Date(payload.validUntil).toLocaleDateString('en-GB')}. Please reconnect to the internet and renew your subscription.`,
          payload,
          expiryDate: new Date(payload.validUntil),
          daysRemaining: 0,
        };
      }

      const diffDays = Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));
      return {
        allowed: true,
        payload,
        expiryDate: new Date(payload.validUntil),
        daysRemaining: diffDays,
      };
    }

    return { allowed: true, payload };
  }

  // ==================== 4. OUTBOX SYNC QUEUE ====================

  public getQueue(): SyncQueueItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(SYNC_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  public getPendingCount(): number {
    return this.getQueue().length;
  }

  public enqueue(item: Omit<SyncQueueItem, 'id' | 'timestamp'>): SyncQueueItem {
    const queue = this.getQueue();
    const newItem: SyncQueueItem = {
      ...item,
      id: `sq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    // If item is a duplicate update/create of same type and ID, overwrite it
    const existingIdx = queue.findIndex(
      q => q.type === newItem.type && q.data?.id === newItem.data?.id && q.action === newItem.action
    );
    if (existingIdx >= 0) {
      queue[existingIdx] = newItem;
    } else {
      queue.push(newItem);
    }

    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {}

    this.notifyStatus(this.isOnline() ? 'online-synced' : 'offline-pending', { pendingCount: queue.length });
    return newItem;
  }

  public dequeue(ids: string[]): void {
    const queue = this.getQueue();
    const idSet = new Set(ids);
    const updated = queue.filter(item => !idSet.has(item.id));
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updated));
    } catch (e) {}

    this.notifyStatus(this.isOnline() ? 'online-synced' : 'offline-pending', { pendingCount: updated.length });
  }

  public clearQueue(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SYNC_QUEUE_KEY);
    this.notifyStatus('online-synced', { pendingCount: 0 });
  }

  // ==================== 5. LOCAL DISK DATA VAULT (data folder) ====================

  public async saveLocalDataVault(data: any): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(OFFLINE_BACKUP_KEY, JSON.stringify(data));
      if ((window as any).desktopBridge?.saveDataFile) {
        await (window as any).desktopBridge.saveDataFile(data);
      }
      return true;
    } catch (e) {
      console.warn('Failed to save to local data vault:', e);
      return false;
    }
  }

  public async getLocalDataVault(): Promise<any | null> {
    if (typeof window === 'undefined') return null;
    try {
      if ((window as any).desktopBridge?.loadDataFile) {
        const fileData = await (window as any).desktopBridge.loadDataFile();
        if (fileData) return fileData;
      }
      const raw = localStorage.getItem(OFFLINE_BACKUP_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // ==================== 6. 2-WAY SYNC EXECUTION ====================

  public async syncWithCloud(
    companyId: number,
    authToken: string,
    onMergeData?: (pulled: any) => void
  ): Promise<{ success: boolean; pushedCount: number; error?: string }> {
    if (this.syncInProgress) {
      return { success: false, pushedCount: 0, error: 'Sync already in progress' };
    }

    if (!this.isOnline()) {
      return { success: false, pushedCount: 0, error: 'Offline - cannot sync until internet is connected' };
    }

    const token = this.getOfflineToken() || authToken;
    if (!token || !companyId) {
      return { success: false, pushedCount: 0, error: 'Token or Company ID missing' };
    }

    this.syncInProgress = true;
    this.notifyStatus('syncing');

    try {
      const machineId = await this.getMachineId();
      const queue = this.getQueue().filter(q => q.companyId === companyId || !q.companyId);

      // Separate pushed items by category
      const pushedVouchers = queue.filter(q => q.type === 'VOUCHER' && q.action !== 'DELETE').map(q => q.data);
      const deletedVoucherIds = queue.filter(q => q.type === 'VOUCHER' && q.action === 'DELETE').map(q => q.data?.id);
      const pushedLedgers = queue.filter(q => q.type === 'LEDGER' && q.action !== 'DELETE').map(q => q.data);
      const pushedStockItems = queue.filter(q => q.type === 'STOCK_ITEM' && q.action !== 'DELETE').map(q => q.data);
      const pushedUnits = queue.filter(q => q.type === 'UNIT' && q.action !== 'DELETE').map(q => q.data);
      const pushedStockGroups = queue.filter(q => q.type === 'STOCK_GROUP' && q.action !== 'DELETE').map(q => q.data);

      const lastSyncedAt = localStorage.getItem(LAST_SYNC_TIME_KEY);

      const res = await fetch('/api/sync/v1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          machineId,
          companyId,
          lastSyncedAt,
          push: {
            vouchers: pushedVouchers,
            deletedVoucherIds,
            ledgers: pushedLedgers,
            stockItems: pushedStockItems,
            units: pushedUnits,
            stockGroups: pushedStockGroups,
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (errJson.error === 'CLOUD_SYNC_EXPIRED') {
          console.log('[OfflineSync] 1-Year Cloud Sync expired for Lifetime user. Offline storage remains permanently active.');
          return {
            success: false,
            pushedCount: 0,
            error: errJson.message || '1-Year Cloud Sync period ended. Offline mode remains permanently active.',
          };
        }

        if (errJson.error === 'DEVICE_DEACTIVATED') {
          console.warn('[OfflineSync] Device was revoked by server! Locking desktop app.');
          this.removeOfflineToken();
          if (typeof window !== 'undefined') {
            alert('Hardware License Alert:\n\nThis computer was unlinked from your web account because your license was transferred to another computer.\n\nPlease enter a valid license key to continue.');
            window.location.reload();
          }
        }
        throw new Error(errJson.message || errJson.error || `Server responded with ${res.status}`);
      }

      const syncResult = await res.json();

      // Dequeue successfully pushed items
      const processedIds = queue.map(q => q.id);
      this.dequeue(processedIds);

      // Update sync timestamp
      if (syncResult.syncedAt) {
        localStorage.setItem(LAST_SYNC_TIME_KEY, syncResult.syncedAt);
      }

      // If callback provided to merge pulled records into UI state:
      if (onMergeData && syncResult.pull) {
        onMergeData(syncResult.pull);
      }

      this.notifyStatus('online-synced', {
        pushedCount: queue.length,
        syncedAt: syncResult.syncedAt,
      });

      return { success: true, pushedCount: queue.length };
    } catch (err: any) {
      console.error('[OfflineSync] Sync failed:', err);
      this.notifyStatus('error', { error: err.message });
      return { success: false, pushedCount: 0, error: err.message };
    } finally {
      this.syncInProgress = false;
    }
  }

  public async triggerAutoSync(): Promise<void> {
    if (!this.isOnline() || this.syncInProgress) return;
    // Dispatch an event so the active view can provide companyId and token
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ledgerx:trigger-auto-sync'));
    }
  }

  // ==================== 7. OBSERVABLE LISTENERS ====================

  public subscribe(listener: (status: SyncStatusType, meta?: any) => void): () => void {
    this.statusListeners.push(listener);
    listener(this.currentStatus, { pendingCount: this.getPendingCount() });
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  private notifyStatus(status: SyncStatusType, meta?: any) {
    this.currentStatus = status;
    this.statusListeners.forEach(listener => {
      try {
        listener(status, meta);
      } catch (e) {}
    });
  }
}

export const offlineSyncService = new OfflineSyncService();
