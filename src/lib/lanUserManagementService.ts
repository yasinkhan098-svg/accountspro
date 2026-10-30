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
   */
  public async getUsers(companyCode?: string, companyName?: string): Promise<LANUser[]> {
    if (typeof window === 'undefined') return [];
    const code = (companyCode || this.getActiveCompanyCode()).toUpperCase().trim();

    // 1. Try local C# bridge for company-specific users.json
    try {
      const res = await fetch(`${getBridgeBaseUrl()}/api/lan/users?code=${encodeURIComponent(code)}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.users) && json.users.length > 0) {
          this.companyUsersCache.set(code, json.users);
          this.saveToLocalStorage(code, json.users);
          return json.users;
        }
      }
    } catch (e) {}

    // 2. Fallback: LocalStorage company cache
    const local = this.loadFromLocalStorage(code);
    if (local.length > 0) {
      this.companyUsersCache.set(code, local);
      return local;
    }

    // 3. In-memory cache
    if (this.companyUsersCache.has(code)) {
      return this.companyUsersCache.get(code)!;
    }

    // 4. Default starter admin user for this company
    const defaultAdmin = this.getDefaultCompanyAdmin(code, companyName);
    const initial = [defaultAdmin];
    this.companyUsersCache.set(code, initial);
    this.saveToLocalStorage(code, initial);
    this.saveUsers(initial, code).catch(() => {});
    return initial;
  }

  /**
   * Saves the users array to Host PC's data/<companyCode>/users.json
   */
  public async saveUsers(users: LANUser[], companyCode?: string): Promise<boolean> {
    const code = (companyCode || this.getActiveCompanyCode()).toUpperCase().trim();
    this.companyUsersCache.set(code, users);
    this.saveToLocalStorage(code, users);

    if (typeof window === 'undefined') return true;

    // Send to local C# bridge
    try {
      const res = await fetch(`${getBridgeBaseUrl()}/api/lan/users?code=${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyCode: code, users }),
      });
      if (res.ok) return true;
    } catch (e) {}

    // Fallback: direct save-file endpoint
    try {
      await fetch(`${getBridgeBaseUrl()}/api/save-file?code=${encodeURIComponent(code)}&file=users.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(users, null, 2),
      });
      return true;
    } catch (e) {}

    return true;
  }

  /**
   * Adds or updates a single user for a specific company
   */
  public async saveUser(user: LANUser, companyCode?: string): Promise<boolean> {
    const code = (companyCode || this.getActiveCompanyCode()).toUpperCase().trim();
    const users = await this.getUsers(code);
    const idx = users.findIndex(u => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase());
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
    const found = users.find(u => u.username.toLowerCase() === cleanUser);

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

  // ==================== LOCAL STORAGE HELPERS ====================

  private saveToLocalStorage(companyCode: string, users: LANUser[]) {
    try {
      localStorage.setItem(`ledgerx_lan_users_${companyCode}`, JSON.stringify(users));
      localStorage.setItem('ledgerx_lan_users_cache', JSON.stringify(users));
    } catch (e) {}
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
