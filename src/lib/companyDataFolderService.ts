/**
 * Company Data Folder Service (Tally-Style Modular Data Storage)
 * 
 * Stores each company's data in its own numbered folder inside the local "data" directory:
 * e.g. %LocalAppData%\LedgerX\data\10001\ (or LX0001\)
 *        ├── company.json
 *        ├── ledgers.json
 *        ├── vouchers.json
 *        ├── stock_items.json
 *        ├── stock_groups.json
 *        └── units.json
 * 
 * Portability: When a folder (e.g. "10001") is copied from one computer and pasted
 * into another user's "data" folder, scanning automatically loads and runs that company!
 */

export interface CompanyFolderData {
  companyCode: string;
  company: any;
  ledgers: any[];
  vouchers: any[];
  stockItems: any[];
  stockGroups?: any[];
  units?: any[];
  groups?: any[];
  voucherTypes?: any[];
}

const LOCAL_BRIDGE_URL = 'http://127.0.0.1:45454';

class CompanyDataFolderService {
  private bridgeAvailable: boolean | null = null;
  private lastBridgeCheckTime = 0;

  /**
   * Generates a 5-digit Tally-style folder number: e.g. "10001", "10002", "10003"
   */
  public getCompanyFolderCode(company: any, allCompanies: any[] = []): string {
    if (company?.companyCode && typeof company.companyCode === 'string') {
      return company.companyCode.trim().toUpperCase();
    }
    // Check if company has an existing code in alias or custom fields
    if (company?.alias && (company.alias.startsWith('10') || company.alias.startsWith('LX'))) {
      return company.alias.trim().toUpperCase();
    }
    // Derive sequential code based on company ID or index: 10001, 10002...
    const idx = allCompanies.findIndex(c => c.id === company?.id);
    const seqNum = idx >= 0 ? 10001 + idx : 10001 + Math.max(0, allCompanies.length);
    return String(seqNum);
  }

  /**
   * Checks if local C# Launcher HTTP bridge is running on http://127.0.0.1:45454
   */
  private async checkBridge(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const now = Date.now();
    if (this.bridgeAvailable !== null && (now - this.lastBridgeCheckTime) < 15000) {
      return this.bridgeAvailable;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${LOCAL_BRIDGE_URL}/api/ping`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      this.bridgeAvailable = res.ok;
      this.lastBridgeCheckTime = now;
      return this.bridgeAvailable;
    } catch (e) {
      this.bridgeAvailable = false;
      this.lastBridgeCheckTime = now;
      return false;
    }
  }

  /**
   * Opens the local "data" directory in Windows File Explorer
   */
  public async openDataFolder(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // 1. Electron bridge
    if ((window as any).desktopBridge?.openDataFolder) {
      try {
        await (window as any).desktopBridge.openDataFolder();
        return true;
      } catch (e) {}
    }

    // 2. C# Launcher HTTP bridge
    if (await this.checkBridge()) {
      try {
        const res = await fetch(`${LOCAL_BRIDGE_URL}/api/open-folder`);
        return res.ok;
      } catch (e) {}
    }

    // 3. Local Next.js API
    try {
      const res = await fetch('/api/local-data/open-folder');
      if (res.ok) return true;
    } catch (e) {}

    return false;
  }

  /**
   * Saves a company and all its accounting data into its numbered folder
   * e.g. %LocalAppData%\LedgerX\data\10001\
   */
  public async saveCompanyFolder(data: CompanyFolderData): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const code = (data.companyCode || this.getCompanyFolderCode(data.company)).toUpperCase();
    const cleanData: CompanyFolderData = {
      ...data,
      companyCode: code,
      company: {
        ...data.company,
        companyCode: code,
      },
    };

    // 1. Electron bridge
    if ((window as any).desktopBridge?.saveCompanyFolder) {
      try {
        await (window as any).desktopBridge.saveCompanyFolder(cleanData);
        this.saveToLocalCache(code, cleanData);
        return true;
      } catch (e) {}
    }

    // 2. C# Launcher HTTP bridge
    if (await this.checkBridge()) {
      try {
        const res = await fetch(`${LOCAL_BRIDGE_URL}/api/company`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanData),
        });
        if (res.ok) {
          this.saveToLocalCache(code, cleanData);
          return true;
        }
      } catch (e) {}
    }

    // 3. Local Next.js API
    try {
      const res = await fetch('/api/local-data/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData),
      });
      if (res.ok) {
        this.saveToLocalCache(code, cleanData);
        return true;
      }
    } catch (e) {}

    // 4. Client-side LocalStorage cache (always available fallback)
    this.saveToLocalCache(code, cleanData);
    return true;
  }

  /**
   * Loads a company's data from its numbered folder (e.g. "10001")
   */
  public async loadCompanyFolder(companyCode: string): Promise<CompanyFolderData | null> {
    if (typeof window === 'undefined') return null;
    const code = companyCode.toUpperCase();

    // 1. Electron bridge
    if ((window as any).desktopBridge?.loadCompanyFolder) {
      try {
        const data = await (window as any).desktopBridge.loadCompanyFolder(code);
        if (data && data.company) return data;
      } catch (e) {}
    }

    // 2. C# Launcher HTTP bridge
    if (await this.checkBridge()) {
      try {
        const res = await fetch(`${LOCAL_BRIDGE_URL}/api/company?code=${encodeURIComponent(code)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.company) return data;
        }
      } catch (e) {}
    }

    // 3. Local Next.js API
    try {
      const res = await fetch(`/api/local-data/company?code=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.company) return data;
      }
    } catch (e) {}

    // 4. LocalStorage cache fallback
    return this.loadFromLocalCache(code);
  }

  /**
   * Scans the local "data" directory for all numbered company folders (e.g. 10001, 10002, LX0001).
   * This discovers companies pasted from another computer!
   */
  public async scanCompanyFolders(): Promise<{ companyCode: string; company: any }[]> {
    if (typeof window === 'undefined') return [];

    let scanned: { companyCode: string; company: any }[] = [];

    // 1. Electron bridge
    if ((window as any).desktopBridge?.scanCompanyFolders) {
      try {
        const res = await (window as any).desktopBridge.scanCompanyFolders();
        if (Array.isArray(res) && res.length > 0) scanned = res;
      } catch (e) {}
    }

    // 2. C# Launcher HTTP bridge
    if (scanned.length === 0 && (await this.checkBridge())) {
      try {
        const res = await fetch(`${LOCAL_BRIDGE_URL}/api/companies`);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.companies) && json.companies.length > 0) {
            scanned = json.companies;
          }
        }
      } catch (e) {}
    }

    // 3. Local Next.js API
    if (scanned.length === 0) {
      try {
        const res = await fetch('/api/local-data/companies');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.companies) && json.companies.length > 0) {
            scanned = json.companies;
          }
        }
      } catch (e) {}
    }

    // 4. Merge with LocalStorage index
    const cachedCodes = this.getAllCachedCodes();
    for (const code of cachedCodes) {
      if (!scanned.some(s => s.companyCode.toUpperCase() === code.toUpperCase())) {
        const cached = this.loadFromLocalCache(code);
        if (cached && cached.company) {
          scanned.push({ companyCode: code, company: cached.company });
        }
      }
    }

    return scanned;
  }

  // ==================== LOCAL STORAGE CACHE HELPERS ====================

  private saveToLocalCache(code: string, data: CompanyFolderData) {
    try {
      localStorage.setItem(`ledgerx_company_folder_${code}`, JSON.stringify(data));
      const indexRaw = localStorage.getItem('ledgerx_company_folders_index');
      const codes: string[] = indexRaw ? JSON.parse(indexRaw) : [];
      if (!codes.includes(code)) {
        codes.push(code);
        localStorage.setItem('ledgerx_company_folders_index', JSON.stringify(codes));
      }
    } catch (e) {}
  }

  private loadFromLocalCache(code: string): CompanyFolderData | null {
    try {
      const raw = localStorage.getItem(`ledgerx_company_folder_${code}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  private getAllCachedCodes(): string[] {
    try {
      const raw = localStorage.getItem('ledgerx_company_folders_index');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
}

export const companyDataFolderService = new CompanyDataFolderService();
