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
  purchaseOrders?: any[];  // Purchase Orders offline storage
  boms?: any[];            // BOM templates offline storage
  manufacturingJournals?: any[]; // Manufacturing Journals offline storage
  users?: any[];           // Company-specific LAN users and roles
  posPurchaseList?: any[]; // Purchase POS List offline storage
}

export function getBridgeBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // If hosted over HTTPS (e.g. Vercel, cloud domain) or cloud production, route to cloud API directly
    if (window.location.protocol === 'https:' || (window.location.hostname && (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('ledgerxerp.com')))) {
      return window.location.origin;
    }
    try {
      const params = new URLSearchParams(window.location.search);
      const hostParam = params.get('host');
      if (hostParam && hostParam.trim()) {
        localStorage.setItem('ledgerx_lan_host_ip', hostParam.trim());
        return `http://${hostParam.trim()}:45454`;
      }
    } catch (e) { }
    try {
      const savedHost = localStorage.getItem('ledgerx_lan_host_ip');
      if (savedHost && savedHost !== 'localhost' && savedHost !== '127.0.0.1') {
        return `http://${savedHost}:45454`;
      }
    } catch (e) { }
    if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && !window.location.hostname.includes('vercel.app') && !window.location.hostname.includes('ledgerxerp.com')) {
      return `http://${window.location.hostname}:45454`;
    }
  }
  return 'http://127.0.0.1:45454';
}

const LOCAL_BRIDGE_URL = 'http://127.0.0.1:45454';

class CompanyDataFolderService {
  private bridgeAvailable: boolean | null = null;
  private lastBridgeCheckTime = 0;

  public getBridgeUrl(): string {
    return getBridgeBaseUrl();
  }

  /**
   * Generates or retrieves the 5-digit Tally-style folder number: e.g. "10000", "10001", "10002"
   */
  public getCompanyFolderCode(company: any, allCompanies: any[] = []): string {
    // 1. Stored companyCode if 5-digit or valid string
    if (company?.companyCode && typeof company.companyCode === 'string') {
      const trimmed = company.companyCode.trim().toUpperCase();
      if (/^\d{5}$/.test(trimmed)) return trimmed;
      if (trimmed.length > 0 && trimmed.length <= 10) return trimmed;
    }
    // 2. Alias-based 5-digit code
    if (company?.alias && /^\d{5}$/.test(String(company.alias).trim())) {
      return String(company.alias).trim();
    }
    // 3. Sequential index among companies (starting at 10000 exactly like Tally Prime)
    if (Array.isArray(allCompanies) && allCompanies.length > 0) {
      const idx = allCompanies.findIndex(c => c && (c.id === company?.id || (c.name && company?.name && c.name.toLowerCase() === company.name.toLowerCase())));
      if (idx >= 0) {
        return String(10000 + idx);
      }
    }
    // 4. Derive from small numeric ID (< 10000)
    if (company?.id) {
      const numId = Number(company.id);
      if (!isNaN(numId) && numId > 0 && numId < 10000) {
        return String(10000 + (numId - 1));
      }
      if (!isNaN(numId) && numId >= 10000 && numId <= 99999) {
        return String(numId);
      }
    }
    return '10000';
  }

  /**
   * Calculates the next sequential 5-digit company code for a brand new company
   * Exactly matching Tally Prime: 10000, 10001, 10002, 10003...
   */
  public async getNextCompanyCode(existingCompanies: any[] = []): Promise<string> {
    // 1. Query local HTTP bridge for next-code from actual disk folders
    if (await this.checkBridge()) {
      try {
        const res = await fetch(`${this.getBridgeUrl()}/api/next-code`);
        if (res.ok) {
          const json = await res.json();
          if (json.nextCode && /^\d{5}$/.test(json.nextCode)) {
            return json.nextCode;
          }
        }
      } catch (e) { }
    }

    // 2. Calculate from existingCompanies and cached codes
    const codes: number[] = [];
    const scanList = [...existingCompanies, ...this.getAllCachedCodes().map(c => ({ companyCode: c }))];
    for (const c of scanList) {
      const codeStr = String(c?.companyCode || c?.code || c?.alias || '').trim();
      if (/^\d{5}$/.test(codeStr)) {
        codes.push(parseInt(codeStr, 10));
      }
    }
    if (codes.length === 0) return '10000';
    const maxCode = Math.max(...codes);
    return String(Math.max(10000, maxCode + 1));
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
      const res = await fetch(`${this.getBridgeUrl()}/api/ping`, {
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
  public async openDataFolder(companyCode?: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // 1. Electron bridge
    if ((window as any).desktopBridge?.openDataFolder) {
      try {
        await (window as any).desktopBridge.openDataFolder(companyCode);
        return true;
      } catch (e) { }
    }

    // 2. C# Launcher HTTP bridge (test both 127.0.0.1 and localhost)
    const bridgeUrls = [this.getBridgeUrl(), 'http://127.0.0.1:45454', 'http://localhost:45454'];
    const q = companyCode ? `?code=${encodeURIComponent(companyCode)}` : '';
    for (const bUrl of bridgeUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(`${bUrl}/api/open-folder${q}`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) return true;
      } catch (e) { }
    }

    // 3. Local Next.js API (if running local Next server)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`/api/local-data/open-folder${q}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) return true;
    } catch (e) { }

    // 4. Browser File System Access API (Allow user to pick / open folder in Explorer dialog)
    try {
      if ('showDirectoryPicker' in window) {
        await (window as any).showDirectoryPicker();
        return true;
      }
    } catch (e) {
      // User cancelled picker or denied permission
    }

    // 5. Fallback: try to get actual path from bridge, then show it
    let actualDataPath = '[LedgerX Install Folder]\\data\\';
    // Try C# bridge for actual path
    for (const bUrl of [this.getBridgeUrl(), 'http://127.0.0.1:45454', 'http://localhost:45454']) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const r = await fetch(`${bUrl}/api/data-path`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (r.ok) {
          const j = await r.json();
          if (j.dataDir) { actualDataPath = j.dataDir; break; }
        }
      } catch (e) { }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(actualDataPath);
      }
    } catch (e) { }

    alert(
      `📂 Local Company Data Folder:\n\n${actualDataPath}\n\n(Path copied to clipboard!)\n\n` +
      `Data folder .exe file ke saath SAME folder mein hota hai!\n\n` +
      `Windows mein kholne ke liye:\n` +
      `1. Win + R press karein\n` +
      `2. Ctrl+V paste karein aur Enter dabayein\n\n` +
      `Note: Agar Program Files mein install hai aur admin nahi hai,\n` +
      `to data %LOCALAPPDATA%\\LedgerX\\data\\ mein ho sakta hai.`
    );
    return true;
  }

  /**
   * Saves a company and all its accounting data into its numbered folder
   * e.g. %LocalAppData%\LedgerX\data\10000\
   */
  public async saveCompanyFolder(data: Partial<CompanyFolderData>): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const code = (data.companyCode || this.getCompanyFolderCode(data.company)).toUpperCase();
    const existing = this.loadFromLocalCache(code);
    let unwrappedCompany = {
      ...(existing?.company || {}),
      ...data.company,
      companyCode: code,
    };
    for (let depth = 0; depth < 5 && unwrappedCompany && typeof unwrappedCompany === 'object'; depth++) {
      if (unwrappedCompany.company && typeof unwrappedCompany.company === 'object' && unwrappedCompany.company !== unwrappedCompany) {
        const inner = unwrappedCompany.company;
        const shallow = { ...unwrappedCompany };
        delete shallow.company;
        unwrappedCompany = { ...inner, ...shallow };
      } else {
        break;
      }
    }

    // Deduplicate units strictly by name/symbol so file never bloats
    const rawUnits = data.units !== undefined ? data.units : (existing?.units || []);
    const deduplicatedUnits: any[] = [];
    const unitKeys = new Set<string>();
    if (Array.isArray(rawUnits)) {
      for (const u of rawUnits) {
        if (!u) continue;
        const k = String(u.name || u.symbol || u.id || '').trim().toLowerCase();
        if (k && !unitKeys.has(k)) {
          unitKeys.add(k);
          deduplicatedUnits.push(u);
        }
      }
    }

    const cleanData: CompanyFolderData = {
      ...existing,
      ...data,
      companyCode: code,
      company: unwrappedCompany,
      ledgers: data.ledgers !== undefined ? data.ledgers : (existing?.ledgers || []),
      vouchers: data.vouchers !== undefined ? data.vouchers : (existing?.vouchers || []),
      stockItems: data.stockItems !== undefined ? data.stockItems : (existing?.stockItems || []),
      stockGroups: data.stockGroups !== undefined ? data.stockGroups : (existing?.stockGroups || []),
      units: deduplicatedUnits.length > 0 ? deduplicatedUnits : (rawUnits || []),
      groups: data.groups !== undefined ? data.groups : (existing?.groups || []),
      voucherTypes: data.voucherTypes !== undefined ? data.voucherTypes : (existing?.voucherTypes || []),
      purchaseOrders: data.purchaseOrders !== undefined ? data.purchaseOrders : (existing?.purchaseOrders || []),
      boms: data.boms !== undefined ? data.boms : (existing?.boms || []),
      manufacturingJournals: data.manufacturingJournals !== undefined ? data.manufacturingJournals : (existing?.manufacturingJournals || []),
      // CRITICAL: NEVER overwrite users.json unless explicit non-empty users array is passed
      users: (Array.isArray(data.users) && data.users.length > 0) ? data.users : undefined,
      posPurchaseList: data.posPurchaseList !== undefined ? data.posPurchaseList : (existing?.posPurchaseList || []),
    };

    // Bi-directional Auto-Sync between stockItems and posPurchaseList:
    if (Array.isArray(cleanData.stockItems) && cleanData.stockItems.length > 0 && (!cleanData.posPurchaseList || cleanData.posPurchaseList.length === 0)) {
      cleanData.posPurchaseList = cleanData.stockItems.map((si: any, idx: number) => ({
        id: si.id || Date.now() + idx,
        sNo: idx + 1,
        name: si.name,
        purchasePrice: Number(si.purchasePrice || si.openingRate || 0),
        newPurchasePrice: 0,
        expiryDate: si.expiryDate || '',
        cessPerc: Number(si.cessPerc || si.cessRate || 0),
        openingStock: Number(si.openingStock ?? si.openingQty ?? si.stock ?? 0),
        barcode: String(si.barcode || si.partNumber || si.alias || '').trim() || String(8900000000 + (si.id || idx)),
        mrp: Number(si.mrp || 0),
        discountPerc: Number(si.defaultDiscount || si.discountPerc || 0),
        discountAmt: Number(si.discountAmt || 0),
        retailSalePrice: Number(si.retailSalePrice || si.rateInclTax || si.mrp || 0),
        unit: si.unit || si.unitName || 'PCS',
        gstRate: Number(si.gstRate || 18),
        variant: si.variant || (Array.isArray(si.variants) && si.variants[0]) || '',
        variants: si.variants || (si.variant ? [si.variant] : []),
        companyCode: code,
        companyId: unwrappedCompany?.id || code,
      }));
    } else if (Array.isArray(cleanData.posPurchaseList) && cleanData.posPurchaseList.length > 0 && (!cleanData.stockItems || cleanData.stockItems.length === 0)) {
      cleanData.stockItems = cleanData.posPurchaseList.map((p: any, idx: number) => ({
        id: p.id || Date.now() + idx,
        companyId: unwrappedCompany?.id || code,
        companyCode: code,
        name: p.name,
        alias: p.barcode || '',
        partNumber: p.barcode || '',
        barcode: p.barcode || '',
        groupName: p.variant || 'Primary',
        categoryName: 'Primary',
        unit: p.unit || 'PCS',
        unitName: p.unit || 'PCS',
        gstRate: Number(p.gstRate || 18),
        cessRate: Number(p.cessPerc || 0),
        mrp: Number(p.mrp || 0),
        retailSalePrice: Number(p.retailSalePrice || p.mrp || 0),
        rateInclTax: Number(p.retailSalePrice || p.mrp || 0),
        openingQty: Number(p.openingStock || 0),
        openingRate: Number(p.purchasePrice || 0),
        openingValue: Number(p.openingStock || 0) * Number(p.purchasePrice || 0),
        variant: p.variant || '',
        variants: p.variants || (p.variant ? [p.variant] : []),
        expiryDate: p.expiryDate || '',
      }));
    }

    // 1. Electron bridge
    if ((window as any).desktopBridge?.saveCompanyFolder) {
      try {
        await (window as any).desktopBridge.saveCompanyFolder(cleanData);
        this.saveToLocalCache(code, cleanData);
        return true;
      } catch (e) { }
    }

    // 2. C# Launcher HTTP bridge
    if (await this.checkBridge()) {
      try {
        // A. Primary batch save (omit users if undefined to prevent wiping)
        const batchPayload: any = { ...cleanData };
        if (cleanData.users === undefined) delete batchPayload.users;

        await fetch(`${this.getBridgeUrl()}/api/company`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batchPayload),
        });

        // B. Stream individual files directly to disk for 100% data fidelity
        const filesToStream: [string, any][] = [
          ['company.json', cleanData.company],
          ['ledgers.json', cleanData.ledgers],
          ['vouchers.json', cleanData.vouchers],
          ['stock_items.json', cleanData.stockItems],
          ['stock_groups.json', cleanData.stockGroups],
          ['units.json', cleanData.units],
          ['groups.json', cleanData.groups],
          ['voucher_types.json', cleanData.voucherTypes],
          ['purchase_orders.json', cleanData.purchaseOrders],
          ['boms.json', cleanData.boms],
          ['manufacturing_journals.json', cleanData.manufacturingJournals],
          ['pos_purchase_list.json', cleanData.posPurchaseList],
        ];

        // Only stream users.json if data.users was explicitly provided
        if (cleanData.users !== undefined && Array.isArray(cleanData.users) && cleanData.users.length > 0) {
          filesToStream.push(['users.json', cleanData.users]);
        }

        for (const [fName, fVal] of filesToStream) {
          if (fVal !== undefined) {
            fetch(`${this.getBridgeUrl()}/api/save-file?code=${encodeURIComponent(code)}&file=${encodeURIComponent(fName)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fVal, null, 2),
            }).catch(() => { });
          }
        }

        this.saveToLocalCache(code, cleanData);
        return true;
      } catch (e) { }
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
    } catch (e) { }

    // 4. Client-side LocalStorage cache (always available fallback)
    this.saveToLocalCache(code, cleanData);
    return true;
  }

  private normalizeFolderData(code: string, data: any): CompanyFolderData {
    if (!data) return data;
    let co = data.company;
    for (let depth = 0; depth < 5 && co && typeof co === 'object'; depth++) {
      if (co.company && typeof co.company === 'object' && co.company !== co) {
        const inner = co.company;
        const shallow = { ...co };
        delete shallow.company;
        co = { ...inner, ...shallow };
      } else {
        break;
      }
    }
    data.company = co;

    let stockItems = Array.isArray(data.stockItems) ? [...data.stockItems] : [];
    let posPurchaseList = Array.isArray(data.posPurchaseList) ? [...data.posPurchaseList] : [];

    // 1. If posPurchaseList is empty but stockItems has items, synthesize posPurchaseList
    if (posPurchaseList.length === 0 && stockItems.length > 0) {
      posPurchaseList = stockItems.map((si, idx) => ({
        id: si.id || Date.now() + idx,
        sNo: idx + 1,
        name: si.name,
        purchasePrice: Number(si.purchasePrice || si.openingRate || 0),
        newPurchasePrice: 0,
        expiryDate: si.expiryDate || '',
        cessPerc: Number(si.cessPerc || si.cessRate || 0),
        openingStock: Number(si.openingStock ?? si.openingQty ?? si.stock ?? 0),
        barcode: String(si.barcode || si.partNumber || si.alias || '').trim() || String(8900000000 + (si.id || idx)),
        mrp: Number(si.mrp || 0),
        discountPerc: Number(si.defaultDiscount || si.discountPerc || 0),
        discountAmt: Number(si.discountAmt || 0),
        retailSalePrice: Number(si.retailSalePrice || si.rateInclTax || si.mrp || 0),
        unit: si.unit || si.unitName || 'PCS',
        gstRate: Number(si.gstRate || 18),
        variant: si.variant || (Array.isArray(si.variants) && si.variants[0]) || '',
        variants: si.variants || (si.variant ? [si.variant] : []),
        companyCode: code,
        companyId: co?.id || code,
      }));
    }

    // 2. If stockItems is empty but posPurchaseList has items, synthesize stockItems
    if (stockItems.length === 0 && posPurchaseList.length > 0) {
      stockItems = posPurchaseList.map((p, idx) => ({
        id: p.id || Date.now() + idx,
        companyId: co?.id || code,
        companyCode: code,
        name: p.name,
        alias: p.barcode || '',
        partNumber: p.barcode || '',
        barcode: p.barcode || '',
        groupName: p.variant || 'Primary',
        categoryName: 'Primary',
        unit: p.unit || 'PCS',
        unitName: p.unit || 'PCS',
        gstRate: Number(p.gstRate || 18),
        cessRate: Number(p.cessPerc || 0),
        mrp: Number(p.mrp || 0),
        retailSalePrice: Number(p.retailSalePrice || p.mrp || 0),
        rateInclTax: Number(p.retailSalePrice || p.mrp || 0),
        openingQty: Number(p.openingStock || 0),
        openingRate: Number(p.purchasePrice || 0),
        openingValue: Number(p.openingStock || 0) * Number(p.purchasePrice || 0),
        variant: p.variant || '',
        variants: p.variants || (p.variant ? [p.variant] : []),
        expiryDate: p.expiryDate || '',
      }));
    }

    // 3. Stamp every item with companyCode and companyId
    stockItems = stockItems.map(si => ({
      ...si,
      companyCode: code,
      companyId: si.companyId || co?.id || code,
    }));
    posPurchaseList = posPurchaseList.map(p => ({
      ...p,
      companyCode: code,
      companyId: p.companyId || co?.id || code,
    }));

    data.stockItems = stockItems;
    data.posPurchaseList = posPurchaseList;

    try {
      if (typeof window !== 'undefined' && posPurchaseList.length > 0) {
        localStorage.setItem(`ledgerx_pos_purchase_list_${code}`, JSON.stringify(posPurchaseList));
      }
    } catch (_) {}

    return data;
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
        if (data && data.company) {
          const norm = this.normalizeFolderData(code, data);
          this.saveToLocalCache(code, norm);
          return norm;
        }
      } catch (e) { }
    }

    // 2. C# Launcher HTTP bridge
    if (await this.checkBridge()) {
      try {
        const res = await fetch(`${this.getBridgeUrl()}/api/company?code=${encodeURIComponent(code)}&_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.company) {
            const norm = this.normalizeFolderData(code, data);
            this.saveToLocalCache(code, norm);
            return norm;
          }
        }
      } catch (e) { }
    }

    // 3. Local Next.js API
    try {
      const res = await fetch(`/api/local-data/company?code=${encodeURIComponent(code)}&_t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.company) {
          const norm = this.normalizeFolderData(code, data);
          this.saveToLocalCache(code, norm);
          return norm;
        }
      }
    } catch (e) { }

    // 4. LocalStorage cache fallback
    const cached = this.loadFromLocalCache(code);
    return cached ? this.normalizeFolderData(code, cached) : null;
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
      } catch (e) { }
    }

    // 2. C# Launcher HTTP bridge
    if (scanned.length === 0 && (await this.checkBridge())) {
      try {
        const res = await fetch(`${this.getBridgeUrl()}/api/companies`);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.companies) && json.companies.length > 0) {
            scanned = json.companies.map((item: any) => {
              let co = item.company;
              for (let depth = 0; depth < 5 && co && typeof co === 'object'; depth++) {
                if (co.company && typeof co.company === 'object' && co.company !== co) {
                  const inner = co.company;
                  const shallow = { ...co };
                  delete shallow.company;
                  co = { ...inner, ...shallow };
                } else {
                  break;
                }
              }
              return {
                companyCode: item.companyCode,
                ...co,
                company: {
                  ...co,
                  companyCode: item.companyCode,
                }
              };
            });
          }
        }
      } catch (e) { }
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
      } catch (e) { }
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
    } catch (e) { }
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
