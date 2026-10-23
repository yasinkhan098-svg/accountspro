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
