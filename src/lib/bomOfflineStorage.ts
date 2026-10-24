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
  buildJournalVoucher(companyId: number, journal: any): any {
    const cid = Number(companyId || journal.companyId || 0);
    const jNo = journal.journalNo || `MFG-${Date.now().toString().slice(-4)}`;
    const outputQty = parseFloat(journal.outputQty || 0);
    const costPerUnit = parseFloat(journal.costPerUnit || journal.outputRate || 0);
    const totalCost = parseFloat(journal.totalCost || (outputQty * costPerUnit) || 0);
    const fItemName = (journal.finishedItemName || '').trim();
    const fItemId = parseInt(journal.finishedItemId || 0, 10);
    const fUnit = journal.outputUnit || 'Nos';

    const invEntries: any[] = [];

    // 1. Raw Materials Consumed (Consumption / Outward)
    const rms = Array.isArray(journal.rawMaterials) ? journal.rawMaterials : [];
    rms.forEach((rm: any, idx: number) => {
      const rmName = (rm.itemName || '').trim();
      if (!rmName) return;
      const sId = parseInt(rm.stockItemId || rm.itemId || 0, 10);
      const q = parseFloat(rm.actualQty || rm.qty || 0);
      const r = parseFloat(rm.rate || 0);
      const amt = parseFloat(rm.amount || (q * r) || 0);
      invEntries.push({
        id: Date.now() + 10 + idx,
        itemId: sId,
        stockItemId: sId,
        itemName: rmName,
        qty: q,
        rate: r,
        rateInclTax: r,
        amountInclTax: amt,
        amount: amt,
        unit: rm.unit || 'Nos',
        gstRate: 0,
        desc1: `Consumed in ${fItemName}`,
        entryType: 'Consumption'
      });
    });

    // 2. Finished Good Produced (Production / Inward)
    if (fItemName && outputQty > 0) {
      invEntries.push({
        id: Date.now() + 1,
        itemId: fItemId,
        stockItemId: fItemId,
        itemName: fItemName,
        qty: outputQty,
        rate: costPerUnit,
        rateInclTax: costPerUnit,
        amountInclTax: totalCost,
        amount: totalCost,
        unit: fUnit,
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
      const wQ = parseFloat(w.qty || 0);
      if (wQ <= 0) return;
      const wType = (w.type || 'Scrap').trim();
      const wName = `${wType} - ${fItemName}`;
      const wR = parseFloat(w.rate || 0);
      const wVal = parseFloat(w.value || (wQ * wR) || 0);
      invEntries.push({
        id: Date.now() + 100 + idx,
        itemId: parseInt(w.stockItemId || 0, 10),
        stockItemId: parseInt(w.stockItemId || 0, 10),
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
   * Applies or reverses the finished good and scrap stock item updates for a Manufacturing Journal.
   * Updates openingQty, openingRate (weighted average), and openingVal on the StockItem.
   */
  applyManufacturingToStock(companyId: number, stockItems: any[], journal: any, isReversal: boolean = false): any[] {
    const cid = Number(companyId || journal.companyId || 0);
    const fItemName = (journal.finishedItemName || '').trim();
    const fItemId = parseInt(journal.finishedItemId || 0, 10);
    const outputQty = Math.max(0, parseFloat(journal.outputQty || 0));
    const costPerUnit = Math.max(0, parseFloat(journal.costPerUnit || journal.outputRate || 0));
    const outputVal = outputQty * costPerUnit;
    const fUnit = journal.outputUnit || 'Nos';

    if (!fItemName || outputQty <= 0) return stockItems;

    let items = [...stockItems];

    // Find Finished Good by ID or exact name
    const fgIdx = items.findIndex(si => 
      Number(si.companyId) === cid && 
      ((fItemId > 0 && Number(si.id) === fItemId) || (si.name && si.name.trim().toLowerCase() === fItemName.toLowerCase()))
    );

    if (fgIdx >= 0) {
      const cur = items[fgIdx];
      const curQ = Math.max(0, parseFloat(cur.openingQty || 0));
      const curR = Math.max(0, parseFloat(cur.openingRate || 0));
      const curVal = curQ * curR;

      let nextQ: number;
      let nextVal: number;
      let nextR: number;

      if (!isReversal) {
        nextQ = curQ + outputQty;
        nextVal = curVal + outputVal;
        nextR = nextQ > 0 ? nextVal / nextQ : costPerUnit;
      } else {
        nextQ = Math.max(0, curQ - outputQty);
        nextVal = Math.max(0, curVal - outputVal);
        nextR = nextQ > 0 ? nextVal / nextQ : curR;
      }

      items[fgIdx] = {
        ...cur,
        openingQty: nextQ,
        openingRate: nextR,
        openingVal: nextVal,
        unit: cur.unit || fUnit,
        under: cur.under || cur.groupName || 'Finished Goods',
        groupName: cur.groupName || cur.under || 'Finished Goods'
      };
    } else if (!isReversal) {
      // Auto-create Finished Product stock item
      const newItem = {
        id: fItemId > 0 ? fItemId : Date.now(),
        companyId: cid,
        name: fItemName,
        under: 'Finished Goods',
        groupName: 'Finished Goods',
        unit: fUnit,
        openingQty: outputQty,
        openingRate: costPerUnit,
        openingVal: outputVal,
        gstRate: 18,
        gstApplicable: 'Applicable'
      };
      items.push(newItem);
    }

    // Process Scrap / Wastage items
    let wList: any[] = [];
    if (Array.isArray(journal.wastageDetails)) wList = journal.wastageDetails;
    else if (typeof journal.wastageDetails === 'string') {
      try { wList = JSON.parse(journal.wastageDetails); } catch { wList = []; }
    }

    wList.forEach((w: any) => {
      const wQ = parseFloat(w.qty || 0);
      if (wQ <= 0) return;
      const wType = (w.type || 'Scrap').trim();
      const wName = `${wType} - ${fItemName}`;
      const wR = parseFloat(w.rate || 0);
      const wVal = parseFloat(w.value || (wQ * wR) || 0);

      const scrapIdx = items.findIndex(si =>
        Number(si.companyId) === cid && si.name && si.name.trim().toLowerCase() === wName.toLowerCase()
      );

      if (scrapIdx >= 0) {
        const cur = items[scrapIdx];
        const curQ = Math.max(0, parseFloat(cur.openingQty || 0));
        const curVal = curQ * Math.max(0, parseFloat(cur.openingRate || 0));
        let nextQ: number;
        let nextV: number;
        if (!isReversal) {
          nextQ = curQ + wQ;
          nextV = curVal + wVal;
        } else {
          nextQ = Math.max(0, curQ - wQ);
          nextV = Math.max(0, curVal - wVal);
        }
        const nextR = nextQ > 0 ? nextV / nextQ : wR;
        items[scrapIdx] = {
          ...cur,
          openingQty: nextQ,
          openingRate: nextR,
          openingVal: nextV,
        };
      } else if (!isReversal) {
        items.push({
          id: Date.now() + Math.floor(Math.random() * 1000),
          companyId: cid,
          name: wName,
          under: 'Wastage & Scrap',
          groupName: 'Wastage & Scrap',
          unit: w.unit || fUnit,
          openingQty: wQ,
          openingRate: wR,
          openingVal: wVal,
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
