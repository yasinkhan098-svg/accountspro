/**
 * LAN User & Role Management Service
 * Communicates with the local Host PC bridge to store and manage users in data/users.json
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
  private cachedUsers: LANUser[] = [];
  private usersLoaded = false;

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
   * Retrieves all LAN users from the Host PC
   */
  public async getUsers(): Promise<LANUser[]> {
    if (typeof window === 'undefined') return [];

    // 1. Try local bridge
    try {
      const res = await fetch(`${getBridgeBaseUrl()}/api/lan/users`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.users)) {
          this.cachedUsers = json.users;
          this.usersLoaded = true;
          this.saveToLocalStorage(json.users);
          return json.users;
        }
      }
    } catch (e) {}

    // 2. Fallback: LocalStorage
    const local = this.loadFromLocalStorage();
    if (local.length > 0) {
      this.cachedUsers = local;
      this.usersLoaded = true;
      return local;
    }

    // 3. Default starter admin user
    const defaultAdmin: LANUser = {
      id: 'usr_admin',
      username: 'admin',
      fullName: 'System Administrator',
      password: '',
      assignedCompanyCodes: [],
      isAdmin: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      permissions: DEFAULT_ADMIN_PERMISSIONS,
    };

    const initial = [defaultAdmin];
    this.cachedUsers = initial;
    this.saveToLocalStorage(initial);
    this.saveUsers(initial).catch(() => {});
    return initial;
  }

  /**
   * Saves the entire users array to Host PC's data/users.json
   */
  public async saveUsers(users: LANUser[]): Promise<boolean> {
    this.cachedUsers = users;
    this.saveToLocalStorage(users);

    if (typeof window === 'undefined') return true;

    // Send to local C# bridge
    try {
      const res = await fetch(`${getBridgeBaseUrl()}/api/lan/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users }),
      });
      if (res.ok) return true;
    } catch (e) {}

    // Fallback: direct save-file endpoint
    try {
      await fetch(`${getBridgeBaseUrl()}/api/save-file?file=users.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users }, null, 2),
      });
      return true;
    } catch (e) {}

    return true;
  }

  /**
   * Adds or updates a single user
   */
  public async saveUser(user: LANUser): Promise<boolean> {
    const users = await this.getUsers();
    const idx = users.findIndex(u => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase());
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...user };
    } else {
      users.push(user);
    }
    return this.saveUsers(users);
  }

  /**
   * Deletes a user by ID
   */
  public async deleteUser(id: string): Promise<boolean> {
    const users = await this.getUsers();
    const filtered = users.filter(u => u.id !== id);
    return this.saveUsers(filtered);
  }

  /**
   * Authenticates a user credentials on LAN
   */
  public async loginUser(username: string, password = ''): Promise<{ success: boolean; user?: LANUser; error?: string }> {
    const users = await this.getUsers();
    const cleanUser = username.trim().toLowerCase();
    const found = users.find(u => u.username.toLowerCase() === cleanUser);

    if (!found) {
      return { success: false, error: 'User does not exist on this system.' };
    }

    if (!found.isActive) {
      return { success: false, error: 'This user account is deactivated by the Administrator.' };
    }

    // Verify password if set
    if (found.password && found.password.trim()) {
      if (found.password.trim() !== password.trim()) {
        return { success: false, error: 'Incorrect password.' };
      }
    }

    return { success: true, user: found };
  }

  // ==================== LOCAL STORAGE HELPERS ====================

  private saveToLocalStorage(users: LANUser[]) {
    try {
      localStorage.setItem('ledgerx_lan_users_cache', JSON.stringify(users));
    } catch (e) {}
  }

  private loadFromLocalStorage(): LANUser[] {
    try {
      const raw = localStorage.getItem('ledgerx_lan_users_cache');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
}

export const lanUserManagementService = new LANUserManagementService();
