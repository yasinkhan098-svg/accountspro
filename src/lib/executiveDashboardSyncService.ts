import { calculateDashboardAnalytics, computeLedgerClosingBalance, getSafeVoucherTotal } from './dashboardAnalyticsService';

/**
 * Executive Analytical Dashboard Sync Service
 * 
 * Provides real-time, privacy-preserving cloud sync for the Mobile Executive Dashboard:
 * 1. Computes local KPI snapshot (Sales, Purchases, Net Profit, Cash, Bank, Receivables, Payables).
 * 2. Does NOT upload raw accounting database tables to cloud.
 * 3. Sends compact snapshot (~15 KB) to /api/live-dashboard/sync-snapshot whenever internet is online.
 * 4. Enables business owner to see live real-time metrics on mobile via /live/[token].
 */

const SNAPSHOT_TOKEN_KEY = 'ledgerx_dashboard_token_';

class ExecutiveDashboardSyncService {
  private syncInProgress = false;
  private lastSnapshotHash = '';
  private lastSyncedAt: string | null = null;

  public async syncSnapshotNow(
    company: any,
    vouchers: any[],
    ledgers: any[],
    stockItems: any[] = [],
    currentPeriod?: { start: string; end: string }
  ): Promise<{ success: boolean; error?: string; syncedAt?: string }> {
    if (typeof window === 'undefined') return { success: false, error: 'Server environment' };
    if (!company) return { success: false, error: 'No active company' };
    if (!navigator.onLine) return { success: false, error: 'Device is offline' };
    if (this.syncInProgress) return { success: false, error: 'Sync already in progress' };

    this.syncInProgress = true;

    try {
      // 1. Calculate local analytics KPIs
      const analytics = calculateDashboardAnalytics(ledgers || [], vouchers || [], stockItems || []);

      // 2. Compute 12-Month Sales & Purchase Trends
      const trendMonths = [
        { name: 'Apr', label: 'Apr-26', mIdx: 3 },
        { name: 'May', label: 'May-26', mIdx: 4 },
        { name: 'Jun', label: 'Jun-26', mIdx: 5 },
        { name: 'Jul', label: 'Jul-26', mIdx: 6 },
        { name: 'Aug', label: 'Aug-26', mIdx: 7 },
        { name: 'Sep', label: 'Sep-26', mIdx: 8 },
        { name: 'Oct', label: 'Oct-26', mIdx: 9 },
        { name: 'Nov', label: 'Nov-26', mIdx: 10 },
        { name: 'Dec', label: 'Dec-26', mIdx: 11 },
        { name: 'Jan', label: 'Jan-27', mIdx: 0 },
        { name: 'Feb', label: 'Feb-27', mIdx: 1 },
        { name: 'Mar', label: 'Mar-27', mIdx: 2 }
      ];

      const sData = trendMonths.map(tm => ({ ...tm, val: 0 }));
      const pData = trendMonths.map(tm => ({ ...tm, val: 0 }));

      const parseVchMonth = (dateStr: string) => {
        if (!dateStr) return -1;
        const s = String(dateStr).trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return parseInt(s.slice(5, 7), 10) - 1;
        const parts = s.split(/[-/]/);
        if (parts.length === 3) {
          const m = parts[1].toLowerCase();
          const mList = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const idx = mList.findIndex(ml => m.startsWith(ml));
          if (idx !== -1) return idx;
          const num = parseInt(parts[1], 10);
          if (!isNaN(num)) return num - 1;
        }
        return -1;
      };

      (vouchers || []).forEach(v => {
        const m = parseVchMonth(v.date);
        if (m !== -1) {
          const sItem = sData.find(item => item.mIdx === m);
          const pItem = pData.find(item => item.mIdx === m);
          const vTot = getSafeVoucherTotal(v);
          if (v.type === 'Sales' && sItem) sItem.val += vTot;
          else if (v.type === 'Purchase' && pItem) pItem.val += vTot;
        }
      });

      const maxS = Math.max(...sData.map(d => d.val / 100000), 20);
      const maxP = Math.max(...pData.map(d => d.val / 100000), 20);

      // 3. Compact Recent Vouchers (last 25 records only)
      const sortedVouchers = [...(vouchers || [])].sort((a, b) => {
        const da = new Date(a.date || 0).getTime();
        const db = new Date(b.date || 0).getTime();
        return db - da;
      });

      const recentVouchers = sortedVouchers.slice(0, 25).map(v => {
        const partyEntry = (v.entries || []).find((e: any) =>
          ['Sales', 'Payment', 'Debit Note'].includes(v.type) ? e.entryType === 'Dr' : e.entryType === 'Cr'
        );
        const partyLedger = (ledgers || []).find((l: any) => l.id === partyEntry?.ledgerId);
        return {
          id: v.id,
          type: v.type,
          date: v.date,
          voucherNo: v.voucherNo,
          total: getSafeVoucherTotal(v),
          partyName: partyLedger?.name || partyEntry?.ledgerName || '',
          narration: v.narration || '',
        };
      });

      // 4. Compact Key Ledgers (Bank Accounts, Cash, Top Debtors, Top Creditors)
      const keyLedgers = (ledgers || [])
        .filter((l: any) => {
          const gn = String(l.groupName || '').toLowerCase();
          return (
            gn.includes('bank') ||
            gn.includes('cash') ||
            gn.includes('debtor') ||
            gn.includes('creditor')
          );
        })
        .slice(0, 50)
        .map((l: any) => {
          const bal = computeLedgerClosingBalance(l, vouchers || []);
          return {
            id: l.id,
            name: l.name,
            groupName: l.groupName,
            accountNo: l.accountNo || '',
            ifsc: l.ifsc || '',
            openingBal: bal.amount,
            balanceType: bal.type,
          };
        });

      // 5. Build full Snapshot Payload
      const nowIso = new Date().toISOString();
      const snapshot = {
        company: {
          id: company.id,
          name: company.name,
          currencySymbol: company.currencySymbol || '₹',
          financialYearStart: company.financialYearStart,
          booksBeginFrom: company.booksBeginFrom,
        },
        currentPeriod: currentPeriod || {
          start: `01-Apr-2026`,
          end: `31-Mar-2027`,
        },
        analytics,
        salesTrendData: sData,
        purchaseTrendData: pData,
        maxSalesLakhs: Math.ceil(maxS / 10) * 10,
        maxPurchaseLakhs: Math.ceil(maxP / 10) * 10,
        recentVouchers,
        ledgers: keyLedgers,
        lastSyncedAt: nowIso,
      };

      // 6. Avoid redundant sync if data hash hasn't changed
      const quickHash = `${company.id}_${vouchers.length}_${ledgers.length}_${analytics.salesTotal}_${analytics.purchaseTotal}_${analytics.cashInHand.amount}_${analytics.bankAccounts.amount}`;
      if (quickHash === this.lastSnapshotHash) {
        return { success: true, syncedAt: this.lastSyncedAt || nowIso };
      }

      // 7. Determine Dashboard Token
      const token = company.dashboardToken || localStorage.getItem(SNAPSHOT_TOKEN_KEY + company.id) || '';

      const licenseToken = localStorage.getItem('ledgerx_offline_license_token') || localStorage.getItem('ledgerx_license_vault') || '';
      const machineId = localStorage.getItem('ledgerx_machine_id') || 'DESKTOP-APP';

      // 8. Push to Cloud Endpoint
      const res = await fetch('/api/live-dashboard/sync-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          companyId: company.id,
          companyName: company.name,
          licenseToken,
          machineId,
          snapshot,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const resData = await res.json();
      this.lastSnapshotHash = quickHash;
      this.lastSyncedAt = resData.syncedAt || nowIso;

      if (resData.token && !company.dashboardToken) {
        company.dashboardToken = resData.token;
        localStorage.setItem(SNAPSHOT_TOKEN_KEY + company.id, resData.token);
      }

      console.log(`[ExecutiveSync] Real-time Dashboard Snapshot synced successfully (${resData.sizeBytes} bytes) for ${company.name}`);
      return { success: true, syncedAt: this.lastSyncedAt || undefined };
    } catch (err: any) {
      console.warn('[ExecutiveSync] Failed to sync live dashboard snapshot:', err?.message || err);
      return { success: false, error: err?.message || 'Sync failed' };
    } finally {
      this.syncInProgress = false;
    }
  }
}

export const executiveDashboardSyncService = new ExecutiveDashboardSyncService();
