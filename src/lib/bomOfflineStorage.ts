import { companyDataFolderService } from './companyDataFolderService';
import { offlineSyncService } from './offlineSyncService';

const BOM_KEY_PREFIX = 'tally_boms_';
const JOURNAL_KEY_PREFIX = 'tally_mfg_journals_';

function safeParseJSON(str: any, fallback: any = []) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export const bomOfflineStorage = {
  getLocalBOMs(companyId: number): any[] {
    if (typeof window === 'undefined' || !companyId) return [];
    try {
      const raw = localStorage.getItem(`${BOM_KEY_PREFIX}${companyId}`);
      return safeParseJSON(raw, []);
    } catch {
      return [];
    }
  },

  saveLocalBOMs(companyId: number, boms: any[]) {
    if (typeof window === 'undefined' || !companyId) return;
    try {
      localStorage.setItem(`${BOM_KEY_PREFIX}${companyId}`, JSON.stringify(boms));
    } catch (e) {
      console.warn("Error saving BOMs to localStorage:", e);
    }
  },

  async saveBOM(company: any, bom: any): Promise<any> {
    const cid = company?.id || bom.companyId || 0;
    const existing = bomOfflineStorage.getLocalBOMs(cid);
    const id = bom.id || Date.now();
    const savedBOM = {
      ...bom,
      id,
      companyId: cid,
      updatedAt: new Date().toISOString()
    };

    const isEdit = existing.some(b => b.id === id);
    const updated = isEdit
      ? existing.map(b => b.id === id ? savedBOM : b)
      : [...existing, savedBOM];

    bomOfflineStorage.saveLocalBOMs(cid, updated);

    // Save to company data folder if desktop app
    if (company) {
      try {
        await companyDataFolderService.saveCompanyFolder({ company, boms: updated });
      } catch (err) {
        console.warn("Failed saving BOM to desktop folder:", err);
      }
    }

    // Enqueue for cloud sync
    offlineSyncService.enqueue({
      type: 'BOM',
      action: isEdit ? 'UPDATE' : 'CREATE',
      data: savedBOM,
      companyId: cid
    });

    return savedBOM;
  },

  async deleteBOM(company: any, bomId: number) {
    const cid = company?.id || 0;
    const existing = bomOfflineStorage.getLocalBOMs(cid);
    const updated = existing.filter(b => b.id !== bomId);
    bomOfflineStorage.saveLocalBOMs(cid, updated);

    if (company) {
      try {
        await companyDataFolderService.saveCompanyFolder({ company, boms: updated });
      } catch (err) {
        console.warn("Failed deleting BOM in desktop folder:", err);
      }
    }

    offlineSyncService.enqueue({
      type: 'BOM',
      action: 'DELETE',
      data: { id: bomId },
      companyId: cid
    });
  },

  getLocalJournals(companyId: number): any[] {
    if (typeof window === 'undefined' || !companyId) return [];
    try {
      const raw = localStorage.getItem(`${JOURNAL_KEY_PREFIX}${companyId}`);
      return safeParseJSON(raw, []);
    } catch {
      return [];
    }
  },

  saveLocalJournals(companyId: number, journals: any[]) {
    if (typeof window === 'undefined' || !companyId) return;
    try {
      localStorage.setItem(`${JOURNAL_KEY_PREFIX}${companyId}`, JSON.stringify(journals));
    } catch (e) {
      console.warn("Error saving Manufacturing Journals to localStorage:", e);
    }
  },

  /**
   * Builds an accounting/inventory Voucher for a Manufacturing Journal.
   * - Raw materials are recorded with entryType: 'Consumption' (Outward from stock).
   * - Finished good is recorded with entryType: 'Production' (Inward to stock).
   */
  buildJournalVoucher(companyId: number, journal: any, stockItemsList: any[] = []): any {
    const cid = Number(companyId || journal.companyId || 0);
    const jNo = journal.journalNo || `MFG-${Date.now().toString().slice(-4)}`;
    const outputQty = Math.max(0, parseFloat(String(journal.outputQty || 0)) || 0);
    const costPerUnit = Math.max(0, parseFloat(String(journal.costPerUnit || journal.outputRate || 0)) || 0);
    const totalCost = Math.max(0, parseFloat(String(journal.totalCost || (outputQty * costPerUnit) || 0)) || 0);
    const fItemName = (journal.finishedItemName || '').trim();
    let fItemId = parseInt(String(journal.finishedItemId || 0), 10);
    const fUnit = journal.outputUnit || 'Nos';

    // Match finished good in stock items list if available
    const matchedFg = stockItemsList.find(si =>
      Number(si.companyId) === cid &&
      ((fItemId > 0 && Number(si.id) === fItemId) || (si.name && si.name.trim().toLowerCase() === fItemName.toLowerCase()))
    );
    if (matchedFg) {
      fItemId = Number(matchedFg.id);
    }

    const invEntries: any[] = [];

    // 1. Raw Materials Consumed (Consumption / Outward)
    const rms = Array.isArray(journal.rawMaterials) ? journal.rawMaterials : [];
    rms.forEach((rm: any, idx: number) => {
      const rmName = (rm.itemName || '').trim();
      if (!rmName) return;

      let sId = parseInt(String(rm.stockItemId || rm.itemId || 0), 10);
      const matchedRm = stockItemsList.find(si =>
        Number(si.companyId) === cid &&
        ((sId > 0 && Number(si.id) === sId) || (si.name && si.name.trim().toLowerCase() === rmName.toLowerCase()))
      );
      if (matchedRm) {
        sId = Number(matchedRm.id);
      }

      // Read actualQty or requiredQty or qty (never 0 if user entered either)
      const rawQty = (rm.actualQty !== undefined && rm.actualQty !== "")
        ? rm.actualQty
        : (rm.requiredQty !== undefined && rm.requiredQty !== "" ? rm.requiredQty : (rm.qty || 0));
      const q = Math.abs(parseFloat(String(rawQty))) || 0;
      const r = Math.max(0, parseFloat(String(rm.rate || (matchedRm ? matchedRm.openingRate : 0))) || 0);
      const amt = Math.max(0, parseFloat(String(rm.amount || (q * r))) || 0);

      invEntries.push({
        id: Date.now() + 10 + idx,
        itemId: sId || 0,
        stockItemId: sId || 0,
        itemName: matchedRm ? matchedRm.name : rmName,
        qty: q,
        rate: r,
        rateInclTax: r,
        amountInclTax: amt,
        amount: amt,
        unit: rm.unit || matchedRm?.unit || 'Nos',
        gstRate: 0,
        desc1: `Consumed in ${matchedFg ? matchedFg.name : fItemName}`,
        entryType: 'Consumption'
      });
    });

    // 2. Finished Good Produced (Production / Inward)
    if (fItemName && outputQty > 0) {
      invEntries.push({
        id: Date.now() + 1,
        itemId: fItemId || 0,
        stockItemId: fItemId || 0,
        itemName: matchedFg ? matchedFg.name : fItemName,
        qty: outputQty,
        rate: costPerUnit,
        rateInclTax: costPerUnit,
        amountInclTax: totalCost,
        amount: totalCost,
        unit: matchedFg?.unit || fUnit,
        gstRate: 0,
        desc1: 'Production / Inward',
        entryType: 'Production'
      });
    }

    // 3. Wastage / Scrap (Production into Scrap items)
    let wList: any[] = [];
    if (Array.isArray(journal.wastageDetails)) wList = journal.wastageDetails;
    else if (typeof journal.wastageDetails === 'string') {
      try { wList = JSON.parse(journal.wastageDetails); } catch { wList = []; }
    }
    wList.forEach((w: any, idx: number) => {
      const wQ = parseFloat(String(w.qty || 0)) || 0;
      if (wQ <= 0) return;
      const wType = (w.type || 'Scrap').trim();
      const wName = `${wType} - ${fItemName}`;
      const wR = parseFloat(String(w.rate || 0)) || 0;
      const wVal = parseFloat(String(w.value || (wQ * wR))) || 0;
      invEntries.push({
        id: Date.now() + 100 + idx,
        itemId: parseInt(String(w.stockItemId || 0), 10) || 0,
        stockItemId: parseInt(String(w.stockItemId || 0), 10) || 0,
        itemName: wName,
        qty: wQ,
        rate: wR,
        rateInclTax: wR,
        amountInclTax: wVal,
        amount: wVal,
        unit: w.unit || fUnit,
        gstRate: 0,
        desc1: 'Wastage / Scrap Production',
        entryType: 'Production'
      });
    });

    return {
      id: journal.voucherId || journal.id || Date.now(),
      companyId: cid,
      type: 'Manufacturing Journal',
      date: journal.date || new Date().toISOString().slice(0, 10),
      number: jNo ? parseInt(jNo.replace(/\D/g, '')) || 1 : 1,
      voucherNo: jNo,
      refNo: journal.bomName || '',
      narration: journal.narration || `Manufactured ${outputQty} ${fUnit} of ${fItemName}`,
      partyName: 'Manufacturing / Assembly',
      partyId: 0,
      total: totalCost,
      entries: [],
      inventoryEntries: invEntries
    };
  },

  /**
   * Ensures the finished good, consumed raw materials, and scrap stock item masters exist in stockItems.
   * Keeps opening balance intact so the voucher's Inwards and Outwards accurately reflect transactions.
   */
  applyManufacturingToStock(companyId: number, stockItems: any[], journal: any, isReversal: boolean = false): any[] {
    const cid = Number(companyId || journal.companyId || 0);
    const fItemName = (journal.finishedItemName || '').trim();
    const fItemId = parseInt(String(journal.finishedItemId || 0), 10);
    const costPerUnit = Math.max(0, parseFloat(String(journal.costPerUnit || journal.outputRate || 0)) || 0);
    const fUnit = journal.outputUnit || 'Nos';

    if (!fItemName) return stockItems;

    let items = [...stockItems];

    // 1. Ensure Finished Good exists in stock items
    const fgIdx = items.findIndex(si => 
      Number(si.companyId) === cid && 
      ((fItemId > 0 && Number(si.id) === fItemId) || (si.name && si.name.trim().toLowerCase() === fItemName.toLowerCase()))
    );

    if (fgIdx >= 0) {
      const cur = items[fgIdx];
      items[fgIdx] = {
        ...cur,
        unit: cur.unit || fUnit,
        under: cur.under || cur.groupName || 'Finished Goods',
        groupName: cur.groupName || cur.under || 'Finished Goods'
      };
    } else if (!isReversal) {
      // Auto-create Finished Product stock item master
      const newItem = {
        id: fItemId > 0 ? fItemId : Date.now(),
        companyId: cid,
        name: fItemName,
        under: 'Finished Goods',
        groupName: 'Finished Goods',
        unit: fUnit,
        openingQty: 0,
        openingRate: costPerUnit,
        openingVal: 0,
        gstRate: 18,
        gstApplicable: 'Applicable'
      };
      items.push(newItem);
    }

    // 2. Ensure Consumed Raw Materials exist in stock items
    const rms = Array.isArray(journal.rawMaterials) ? journal.rawMaterials : [];
    rms.forEach((rm: any, idx: number) => {
      const rmName = (rm.itemName || '').trim();
      if (!rmName) return;
      const sId = parseInt(String(rm.stockItemId || rm.itemId || 0), 10);
      const exists = items.some(si =>
        Number(si.companyId) === cid &&
        ((sId > 0 && Number(si.id) === sId) || (si.name && si.name.trim().toLowerCase() === rmName.toLowerCase()))
      );
      if (!exists && !isReversal) {
        items.push({
          id: sId > 0 ? sId : Date.now() + 500 + idx,
          companyId: cid,
          name: rmName,
          under: 'Raw Materials',
          groupName: 'Raw Materials',
          unit: rm.unit || 'Nos',
          openingQty: 0,
          openingRate: parseFloat(String(rm.rate || 0)) || 0,
          openingVal: 0,
          gstRate: 18,
          gstApplicable: 'Applicable'
        });
      }
    });

    // 3. Process Scrap / Wastage items
    let wList: any[] = [];
    if (Array.isArray(journal.wastageDetails)) wList = journal.wastageDetails;
    else if (typeof journal.wastageDetails === 'string') {
      try { wList = JSON.parse(journal.wastageDetails); } catch { wList = []; }
    }

    wList.forEach((w: any) => {
      const wQ = parseFloat(String(w.qty || 0)) || 0;
      if (wQ <= 0) return;
      const wType = (w.type || 'Scrap').trim();
      const wName = `${wType} - ${fItemName}`;
      const wR = parseFloat(String(w.rate || 0)) || 0;

      const scrapIdx = items.findIndex(si =>
        Number(si.companyId) === cid && si.name && si.name.trim().toLowerCase() === wName.toLowerCase()
      );

      if (scrapIdx < 0 && !isReversal) {
        items.push({
          id: Date.now() + Math.floor(Math.random() * 1000),
          companyId: cid,
          name: wName,
          under: 'Wastage & Scrap',
          groupName: 'Wastage & Scrap',
          unit: w.unit || fUnit,
          openingQty: 0,
          openingRate: wR,
          openingVal: 0,
          gstRate: 18,
          gstApplicable: 'Applicable'
        });
      }
    });

    return items;
  },

  async saveJournal(company: any, journal: any): Promise<any> {
    const cid = company?.id || journal.companyId || 0;
    const existing = bomOfflineStorage.getLocalJournals(cid);
    const id = journal.id || Date.now();
    const journalNo = journal.journalNo || `MJ-${Date.now().toString().slice(-4)}`;
    const savedJournal = {
      ...journal,
      id,
      companyId: cid,
      journalNo,
      status: 'Posted',
      createdAt: journal.createdAt || new Date().toISOString()
    };

    const isEdit = existing.some(j => j.id === id);
    const updated = isEdit
      ? existing.map(j => j.id === id ? savedJournal : j)
      : [...existing, savedJournal];

    bomOfflineStorage.saveLocalJournals(cid, updated);

    // Save to company data folder if desktop app
    if (company) {
      try {
        await companyDataFolderService.saveCompanyFolder({ company, manufacturingJournals: updated });
      } catch (err) {
        console.warn("Failed saving Journal to desktop folder:", err);
      }
    }

    // Enqueue for cloud sync
    offlineSyncService.enqueue({
      type: 'MANUFACTURING_JOURNAL',
      action: isEdit ? 'UPDATE' : 'CREATE',
      data: savedJournal,
      companyId: cid
    });

    return savedJournal;
  },

  async deleteJournal(company: any, journalId: number) {
    const cid = company?.id || 0;
    const existing = bomOfflineStorage.getLocalJournals(cid);
    const updated = existing.filter(j => j.id !== journalId);
    bomOfflineStorage.saveLocalJournals(cid, updated);

    if (company) {
      try {
        await companyDataFolderService.saveCompanyFolder({ company, manufacturingJournals: updated });
      } catch (err) {
        console.warn("Failed deleting Journal in desktop folder:", err);
      }
    }

    offlineSyncService.enqueue({
      type: 'MANUFACTURING_JOURNAL',
      action: 'DELETE',
      data: { id: journalId },
      companyId: cid
    });
  }
};
