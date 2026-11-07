/**
 * LAN User & Role Management Service
 * Communicates with the local Host PC bridge to store and manage users in data/<companyCode>/users.json
 * Isolated 100% per company!
 */

import { LANUser, DEFAULT_ADMIN_PERMISSIONS, DEFAULT_OPERATOR_PERMISSIONS } from './permissionGuard';
import { getBridgeBaseUrl } from './companyDataFolderService';

export interface HostLANInfo {
  isHostRunning: boolean;
  hostName: string;
  localIps: string[];
  port: number;
  dataDir: string;
  lanUrl: string;
}

class LANUserManagementService {
  private companyUsersCache: Map<string, LANUser[]> = new Map();

  /**
   * Helper to get currently active company code from localStorage
   */
  public getActiveCompanyCode(): string {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('ledgerx_active_company_code');
        if (stored && /^\d{5}$/.test(stored.trim())) return stored.trim().toUpperCase();
      } catch (e) {}
    }
    return '10000';
  }

  /**
   * Helper to set active company code
   */
  public setActiveCompanyCode(code: string) {
    if (typeof window !== 'undefined' && code) {
      try {
        localStorage.setItem('ledgerx_active_company_code', code.trim().toUpperCase());
      } catch (e) {}
    }
    this.companyUsersCache.clear();
  }

  /**
   * Generates a starter administrator for a given company
   */
  public getDefaultCompanyAdmin(companyCode: string, companyName?: string): LANUser {
    const code = (companyCode || this.getActiveCompanyCode()).toUpperCase().trim();
    return {
      id: `usr_admin_${code}`,
      username: 'admin',
      fullName: companyName ? `Administrator (${companyName})` : `Company Administrator`,
      password: '',
      assignedCompanyCodes: [code],
      isAdmin: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      permissions: DEFAULT_ADMIN_PERMISSIONS,
    };
  }

  /**
   * Generates default starter users (Admin + Cashier) for a company
   */
  public getDefaultCompanyUsers(companyCode: string, companyName?: string): LANUser[] {
    const code = (companyCode || this.getActiveCompanyCode()).toUpperCase().trim();
    const admin = this.getDefaultCompanyAdmin(code, companyName);
    const cashier: LANUser = {
      id: `usr_cashier_${code}`,
      username: 'cashier',
      fullName: companyName ? `Cashier (${companyName})` : `Counter Cashier`,
      password: '',
      assignedCompanyCodes: [code],
      isAdmin: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      permissions: DEFAULT_OPERATOR_PERMISSIONS,
    };
    return [admin, cashier];
  }

  /**
   * Fetches the host PC's LAN IP, port, and status
   */
  public async getHostLANInfo(): Promise<HostLANInfo> {
    const defaultInfo: HostLANInfo = {
      isHostRunning: false,
      hostName: 'Host-PC',
      localIps: ['127.0.0.1'],
      port: 45454,
      dataDir: 'C:\\Users\\...\\AppData\\Local\\LedgerX\\data\\',
      lanUrl: 'http://127.0.0.1:45454',
    };

    if (typeof window === 'undefined') return defaultInfo;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${getBridgeBaseUrl()}/api/lan/info`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        return {
          isHostRunning: true,
          hostName: data.hostName || 'Host-PC',
          localIps: data.localIps || ['127.0.0.1'],
          port: data.port || 45454,
          dataDir: data.dataDir || '',
          lanUrl: data.lanUrl || `http://${data.localIps?.[0] || '127.0.0.1'}:45454`,
        };
      }
    } catch (e) {}

    return defaultInfo;
  }

  /**
   * Retrieves LAN users for a specific company (from data/<companyCode>/users.json)
   * Intelligently merges Server API, C# Desktop Bridge, and LocalStorage so custom users are never lost!
   */
  public async getUsers(companyCode?: string, companyName?: string): Promise<LANUser[]> {
    if (typeof window === 'undefined') return [];
    const code = (companyCode || this.getActiveCompanyCode()).toUpperCase().trim();

    const collectedUsers: LANUser[] = [];

    // 1. Load from local cache / localStorage first (immediate responsiveness)
    const local = this.loadFromLocalStorage(code);
    if (local.length > 0) {
      collectedUsers.push(...local);
    }
    const mem = this.companyUsersCache.get(code);
    if (mem && mem.length > 0) {
      collectedUsers.push(...mem);
    }

    // 2. Query relative Next.js Server API (/api/lan/users)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`/api/lan/users?code=${encodeURIComponent(code)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.users) && json.users.length > 0) {
          collectedUsers.push(...json.users);
        }
      }
    } catch (_) {}

    // 3. Query local C# bridge if running on desktop port 45454
    try {
      const bridgeUrl = getBridgeBaseUrl();
      if (bridgeUrl && bridgeUrl !== window.location.origin) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${bridgeUrl}/api/lan/users?code=${encodeURIComponent(code)}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.users) && json.users.length > 0) {
            collectedUsers.push(...json.users);
          }
        }
      }
    } catch (_) {}

    // 4. Strictly filter collected users to this company:
    // A user belongs to this company ONLY if assignedCompanyCodes is either:
    // a) contains this code, or
    // b) is empty/undefined AND the user was locally loaded from this company's storage
    // NEVER pull in users created in other companies!
    const companyScopedUsers = collectedUsers.filter(u => {
      if (!u || !u.username) return false;
      if (Array.isArray(u.assignedCompanyCodes) && u.assignedCompanyCodes.length > 0) {
        return u.assignedCompanyCodes.includes(code);
      }
      return true;
    });

    // 5. Intelligent Merge: unique by username.toLowerCase()
    const mergedMap = new Map<string, LANUser>();
    for (const u of companyScopedUsers) {
      if (u && u.username) {
        const key = u.username.trim().toLowerCase();
        // If already present, preserve the one with full properties
        if (!mergedMap.has(key)) {
          mergedMap.set(key, { ...u, assignedCompanyCodes: u.assignedCompanyCodes?.length ? u.assignedCompanyCodes : [code] });
        } else {
          mergedMap.set(key, { ...mergedMap.get(key)!, ...u, assignedCompanyCodes: u.assignedCompanyCodes?.length ? u.assignedCompanyCodes : [code] });
        }
      }
    }

    // 6. Ensure default Administrator and Cashier exist if not present
    if (!mergedMap.has('admin')) {
      const defaultAdmin = this.getDefaultCompanyAdmin(code, companyName);
      mergedMap.set('admin', defaultAdmin);
    }
    if (!mergedMap.has('cashier')) {
      const defaultUsers = this.getDefaultCompanyUsers(code, companyName);
      const defCashier = defaultUsers.find(u => u.username === 'cashier');
      if (defCashier) mergedMap.set('cashier', defCashier);
    }

    const finalList = Array.from(mergedMap.values());
    this.companyUsersCache.set(code, finalList);
    this.saveToLocalStorage(code, finalList);

    // Background push to server & bridge so persistence is guaranteed
    this.syncToServer(code, finalList).catch(() => {});

    return finalList;
  }

  /**
   * Background sync to server API and local C# bridge
   */
  private async syncToServer(companyCode: string, users: LANUser[]) {
    if (typeof window === 'undefined') return;
    const code = companyCode.toUpperCase().trim();

    // 1. Next.js API
    try {
      await fetch(`/api/lan/users?code=${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyCode: code, users }),
      });
    } catch (_) {}

    // 2. C# Bridge
    try {
      const bridgeUrl = getBridgeBaseUrl();
      if (bridgeUrl && bridgeUrl !== window.location.origin) {
        await fetch(`${bridgeUrl}/api/lan/users?code=${encodeURIComponent(code)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyCode: code, users }),
        });
      }
    } catch (_) {}
  }

  /**
   * Saves the users array to Host PC's data/<companyCode>/users.json and Server DB
   */
  public async saveUsers(users: LANUser[], companyCode?: string): Promise<boolean> {
    const code = (companyCode || this.getActiveCompanyCode()).toUpperCase().trim();
    this.companyUsersCache.set(code, users);
    this.saveToLocalStorage(code, users);

    if (typeof window === 'undefined') return true;

    // 1. Send to local Next.js Server API
    try {
      await fetch(`/api/lan/users?code=${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyCode: code, users }),
      });
    } catch (_) {}

    // 2. Send to local C# bridge
    try {
      const bridgeUrl = getBridgeBaseUrl();
      if (bridgeUrl && bridgeUrl !== window.location.origin) {
        await fetch(`${bridgeUrl}/api/lan/users?code=${encodeURIComponent(code)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyCode: code, users }),
        });
      }
    } catch (_) {}

    // 3. Fallback: direct save-file endpoint
    try {
      await fetch(`/api/save-file?code=${encodeURIComponent(code)}&file=users.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(users, null, 2),
      });
    } catch (_) {}

    return true;
  }

  /**
   * Adds or updates a single user for a specific company
   */
  public async saveUser(user: LANUser, companyCode?: string): Promise<boolean> {
    const code = (companyCode || this.getActiveCompanyCode()).toUpperCase().trim();
    const users = await this.getUsers(code);
    const cleanUName = user.username.trim().toLowerCase();
    const idx = users.findIndex(u => u.id === user.id || u.username.toLowerCase() === cleanUName);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...user };
    } else {
      users.push(user);
    }
    return this.saveUsers(users, code);
  }

  /**
   * Deletes a user by ID for a specific company
   */
  public async deleteUser(id: string, companyCode?: string): Promise<boolean> {
    const code = (companyCode || this.getActiveCompanyCode()).toUpperCase().trim();
    const users = await this.getUsers(code);
    const filtered = users.filter(u => u.id !== id);
    return this.saveUsers(filtered, code);
  }

  /**
   * Authenticates a user credentials on LAN for a specific company
   */
  public async loginUser(username: string, password = '', companyCode?: string): Promise<{ success: boolean; user?: LANUser; error?: string }> {
    const code = (companyCode || this.getActiveCompanyCode()).toUpperCase().trim();
    const users = await this.getUsers(code);
    const cleanUser = username.trim().toLowerCase();
    const found = users.find(u => u.username.toLowerCase() === cleanUser || u.id.toLowerCase() === cleanUser);

    if (!found) {
      return { success: false, error: 'User does not exist in this company.' };
    }

    if (!found.isActive) {
      return { success: false, error: 'This user account is deactivated by the Administrator.' };
    }

    if (found.password && found.password.trim()) {
      if (found.password.trim() !== password.trim()) {
        return { success: false, error: 'Incorrect password.' };
      }
    }

    return { success: true, user: found };
  }

  /**
   * Collects all users across companies and caches (for POS operator switch & fast lookups)
   */
  public getAllUsersAcrossCompanies(): LANUser[] {
    if (typeof window === 'undefined') return [];
    const allMap = new Map<string, LANUser>();
    try {
      // 1. From memory cache
      this.companyUsersCache.forEach(list => {
        if (Array.isArray(list)) {
          list.forEach(u => {
            if (u && u.username) allMap.set(u.username.toLowerCase(), u);
          });
        }
      });
      // 2. From ledgerx_all_users
      const allRaw = localStorage.getItem('ledgerx_all_users');
      if (allRaw) {
        const parsed = JSON.parse(allRaw);
        if (Array.isArray(parsed)) {
          parsed.forEach(u => {
            if (u && u.username) allMap.set(u.username.toLowerCase(), u);
          });
        }
      }
      // 3. From all localStorage keys matching ledgerx_lan_users_
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ledgerx_lan_users_')) {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                list.forEach(u => {
                  if (u && u.username) allMap.set(u.username.toLowerCase(), u);
                });
              }
            }
          } catch (_) {}
        }
      }
    } catch (_) {}
    return Array.from(allMap.values());
  }

  // ==================== LOCAL STORAGE HELPERS ====================

  private saveToLocalStorage(companyCode: string, users: LANUser[]) {
    try {
      localStorage.setItem(`ledgerx_lan_users_${companyCode}`, JSON.stringify(users));
    } catch (_) {}
  }

  private loadFromLocalStorage(companyCode: string): LANUser[] {
    try {
      const raw = localStorage.getItem(`ledgerx_lan_users_${companyCode}`);
      if (raw) return JSON.parse(raw);
      return [];
    } catch (e) {
      return [];
    }
  }
}

export const lanUserManagementService = new LANUserManagementService();
