/**
 * Invoice Scanner Service
 * High-reliability AI Purchase Invoice / Bill OCR Scanner
 * Supports Multi-Page Images (JPG, PNG, WEBP) and PDF files.
 * Works seamlessly in Desktop Offline Mode (port 45454) and Web Mode with active internet.
 */

export interface ParsedInvoiceItem {
  itemName: string;
  hsnCode?: string;
  qty: number;
  rate: number;
  unit: string;
  discountPerc?: number;
  discountAmt?: number;
  taxRate?: number;
  gstRate?: number;
  taxName?: string;
  amount: number;
}

export interface ParsedInvoiceData {
  supplierName?: string;
  supplierGstin?: string;
  supplierAddress?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  taxName?: string;
  items: ParsedInvoiceItem[];
  additionalLedgers?: Array<{
    ledgerName: string;
    amount: number;
    type: 'Discount' | 'Expense';
  }>;
  subtotal?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  taxAmount?: number;
  roundOff?: number;
  totalAmount?: number;
}

export interface ScanResult {
  success: boolean;
  invoiceData?: ParsedInvoiceData;
  error?: string;
  code?: 'NO_INTERNET' | 'NO_API_KEY' | 'INVALID_API_KEY' | 'SCAN_FAILED';
}

const STORAGE_KEY = 'ledgerx_gemini_api_key';

export const invoiceScannerService = {
  /**
   * Get saved Gemini API Key from localStorage or environment
   */
  getApiKey(): string {
    if (typeof window === 'undefined') return '';
    try {
      const local = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('gemini_api_key') || '';
      if (local && local.trim()) return local.trim();
    } catch { }
    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY && process.env.NEXT_PUBLIC_GEMINI_API_KEY.trim()) {
      return process.env.NEXT_PUBLIC_GEMINI_API_KEY.trim();
    }
    return '';
  },

  /**
   * Save Gemini API Key to localStorage and attempt local disk sync
   */
  saveApiKey(key: string): void {
    if (typeof window === 'undefined') return;
    const cleanKey = (key || '').trim();
    try {
      localStorage.setItem(STORAGE_KEY, cleanKey);
      localStorage.setItem('gemini_api_key', cleanKey);
    } catch { }

    // Also persist to desktop host data folder if available
    try {
      fetch(`/api/save-file?file=gemini_api_key.txt`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: cleanKey,
      }).catch(() => { });
    } catch { }
  },

  /**
   * Clear invalid/suspended API Key from localStorage & disk
   */
  clearApiKey(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('gemini_api_key');
    } catch { }
    try {
      fetch(`/api/save-file?file=gemini_api_key.txt`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: '',
      }).catch(() => { });
    } catch { }
  },

  /**
   * Robust internet connectivity check
   */
  async isOnline(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      return true;
    }
    // Double check with a fast, no-cors ping if navigator.onLine was falsely reported
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      await fetch('https://www.google.com/favicon.ico', {
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(id);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Convert file to base64 inlineData part
   */
  async fileToBase64Part(file: File): Promise<{ inlineData: { mimeType: string; data: string } }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data:mime/type;base64,
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        let mime = file.type || 'image/jpeg';
        if (file.name.toLowerCase().endsWith('.pdf')) {
          mime = 'application/pdf';
        }
        resolve({
          inlineData: {
            mimeType: mime,
            data: base64,
          },
        });
      };
      reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
      reader.readAsDataURL(file);
    });
  },

  /**
   * Main scan function
   */
  async scanInvoiceFiles(
    files: File[],
    customKey?: string,
    companyContext?: { country?: string; taxName?: string; defaultRate?: number }
  ): Promise<ScanResult> {
    if (!files || files.length === 0) {
      return { success: false, error: 'No files uploaded', code: 'SCAN_FAILED' };
    }

    // 1. Internet Check
    const online = await this.isOnline();
    if (!online) {
      return {
        success: false,
        error: 'Internet connection is required for AI bill scanning.',
        code: 'NO_INTERNET',
      };
    }

    // 2. API Key Check
    const apiKey = (customKey || this.getApiKey()).trim();
    if (!apiKey) {
      return {
        success: false,
        error: 'Gemini API Key is not configured.',
        code: 'NO_API_KEY',
      };
    }

    // 3. Prepare Multi-page image/PDF parts
    let imageParts: any[] = [];
    try {
      imageParts = await Promise.all(files.map(f => this.fileToBase64Part(f)));
    } catch (readErr: any) {
      return { success: false, error: readErr?.message || 'Failed to read bill files', code: 'SCAN_FAILED' };
    }

    const countryStr = (companyContext?.country || '').trim();
    const taxNameStr = (companyContext?.taxName || '').trim();
    const defaultRateVal = companyContext?.defaultRate;

    const companyContextBlock = countryStr
      ? `\nBUYER COMPANY ENVIRONMENT:\n- Country: ${countryStr}\n- Applicable Tax: ${taxNameStr || 'GST'}${defaultRateVal !== undefined ? ` (Standard: ${defaultRateVal}%)` : ''}\nIf the bill specifies its own tax rates/labels, ALWAYS PRIORITIZE whatever is printed on the bill. If the bill does not state explicit tax rates, use this context.`
      : '';

    const promptText = `You are a professional invoice parser. Analyze this purchase invoice/bill document (single or multi-page) carefully.
Note: There are ${files.length} image/page(s) attached representing this purchase invoice. Treat all attached images as sequential pages of the EXACT SAME purchase invoice/bill.${companyContextBlock}

CRITICAL RULES FOR ITEM NAME EXTRACTION:
1. In the items table (under columns like "Description of Goods", "Description", "Item Name", "Goods Name"):
   - Extract ONLY the primary item/product title (the main bold or distinct product header font).
   - DO NOT include long descriptive sub-text, technical specifications, or tax remarks in "itemName" (e.g. strip out text like "IN Central GST", "IN State GST", "Op Code...", batch details, or secondary paragraph descriptions). Keep "itemName" clean, sharp, and concise.

CRITICAL RULES FOR UNITS & NUMBERS:
2. "unit": Extract the unit of measure (e.g., Kg, Pcs, Box, Mtr, Ltr, Nos, Roll, Set, Bag, Pack, Pair, Sqft). If unit is NOT mentioned or blank, default strictly to "Nos".
3. "qty": Extract exact quantity as a number.
4. "rate": Extract unit rate as a number.
5. "discountPerc" & "discountAmt": Extract any item-level discount (in-bill discount, cash discount, or trade discount percentage/amount). If discount is present, calculate taxable amount = (qty * rate) - discount.
6. "amount": Extract net amount for the item row after item discounts.

CRITICAL RULES FOR ITEM TAX / GST / VAT RATE EXTRACTION (ANY COUNTRY TAX SYSTEM):
7. "taxRate" & "gstRate": Extract the EXACT percentage rate of tax applicable to EACH item as printed or calculated on this specific bill.
   - SUPPORT ANY COUNTRY'S TAX SYSTEM (India GST, Canada GST/HST, UAE/GCC VAT, UK/Europe VAT, USA Sales Tax, Australia GST, etc.).
   - Check the item row columns such as "Tax %", "GST %", "VAT %", "Rate %", "IGST %", "CGST % + SGST %", "Tax Rate".
   - DUAL TAX SPLIT: If dual tax columns are shown (e.g. CGST 2.5% + SGST 2.5%), SUM THEM to get the total item tax rate (2.5 + 2.5 = 5.0). Similarly, 6% + 6% = 12.0, 9% + 9% = 18.0, 14% + 14% = 28.0.
   - SINGLE TAX: If single tax is shown (e.g. VAT 5%, VAT 20%, GST 5%, GST 10%, Sales Tax 7%), extract that exact number (5.0, 20.0, 5.0, 10.0, 7.0).
   - ZERO/EXEMPT: If an item is zero-rated, exempt, nil-rated, or no tax is charged (0%), extract 0.0.
   - HSN / FOOTER BREAKDOWN: If the item row has no tax column, inspect the HSN / Tax summary breakdown table at the bottom of the bill for that item or HSN code to find its percentage. If still not specified per item but total bill tax amount is shown, compute: (total tax / subtotal) * 100.
   - CRITICAL: DO NOT ALWAYS RETURN 18%! Return ONLY the exact tax percentage that belongs to this item on this bill (e.g. 0, 5, 12, 18, 28, or whichever rate is printed).
8. "taxName": Extract the tax name from the bill (e.g. "GST", "VAT", "GST/HST", "Sales Tax", "SST").

CRITICAL RULES FOR ADDITIONAL CHARGES & DISCOUNTS BELOW ITEMS:
9. Extract all additional expenses, charges, or discounts listed below the items table (such as SPL.DISCOUNT, Special Discount, Discount Given, Trade Discount, Freight Charges, Transportation Charges, Packaging, Loading Charges, Cartage, Round Off).
   - Use their EXACT printed names as "ledgerName".
   - Specify "type": "Discount" for discounts/less items, or "Expense" for extra charges.

Output ONLY a valid JSON object strictly following this structure:
{
  "supplierName": "Name of the seller or supplier company/party",
  "supplierGstin": "GSTIN / TRN / VAT / Tax ID of the supplier",
  "supplierAddress": "Full address of the supplier",
  "invoiceNo": "Invoice or Bill Number",
  "invoiceDate": "Date of invoice formatted as DD-MMM-YYYY (e.g. 12-Aug-2026)",
  "taxName": "GST",
  "items": [
    {
      "itemName": "Clean main product title only",
      "hsnCode": "HSN or SAC Code if available",
      "qty": 1,
      "rate": 100,
      "unit": "Nos",
      "discountPerc": 0.0,
      "discountAmt": 0.0,
      "taxRate": 5.0,
      "gstRate": 5.0,
      "taxName": "GST",
      "amount": 100
    }
  ],
  "additionalLedgers": [
    {
      "ledgerName": "SPL.DISCOUNT",
      "amount": 2750.0,
      "type": "Discount"
    }
  ],
  "subtotal": 1000.0,
  "cgstAmount": 0.0,
  "sgstAmount": 0.0,
  "igstAmount": 0.0,
  "taxAmount": 50.0,
  "roundOff": 0.0,
  "totalAmount": 1050.0
}
Return ONLY valid JSON. Do not include markdown ticks or additional conversation.`;

    const payload = {
      contents: [
        {
          parts: [{ text: promptText }, ...imageParts],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    };

    // Candidate Gemini models to try in order of speed and capability
    const candidateModels = [
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite-preview',
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
    ];

    let lastErrorText = '';
    let isKeyError = false;

    // Direct Browser-to-Gemini Call (100% works in offline desktop app whenever internet is on)
    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          const rawContent = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const invoiceData = this.repairAndParseJson(rawContent);
          if (invoiceData && invoiceData.items) {
            return { success: true, invoiceData };
          }
        } else {
          lastErrorText = await res.text();
          // Detect invalid key, deleted service account, consumer project suspended, or permission denied
          if (
            res.status === 401 ||
            res.status === 403 ||
            lastErrorText.includes('ACCOUNT_STATE_INVALID') ||
            lastErrorText.includes('CONSUMER_SUSPENDED') ||
            lastErrorText.includes('PERMISSION_DENIED') ||
            lastErrorText.includes('suspended') ||
            lastErrorText.includes('API_KEY_INVALID') ||
            lastErrorText.includes('UNAUTHENTICATED') ||
            lastErrorText.includes('deleted or disabled') ||
            lastErrorText.includes('API key not valid') ||
            lastErrorText.includes('PROJECT_DELETED')
          ) {
            isKeyError = true;
            this.clearApiKey();
            break; // Key/Project is invalid or suspended, stop immediately
          }
        }
      } catch (err: any) {
        lastErrorText = err?.message || 'Network error';
      }
    }

    if (isKeyError) {
      this.clearApiKey();
      return {
        success: false,
        error: 'Permission Denied: The Google Cloud project linked to this API key has been suspended. Please create an API key in a NEW project in Google AI Studio.',
        code: 'INVALID_API_KEY',
      };
    }

    return {
      success: false,
      error: lastErrorText || 'Failed to scan invoice via AI. Please check your internet or API key.',
      code: 'SCAN_FAILED',
    };
  },

  /**
   * Safe JSON parse & repair
   */
  repairAndParseJson(raw: string): any {
    if (!raw) return null;
    let s = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const firstBrace = s.indexOf('{');
    const lastBrace = s.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      s = s.substring(firstBrace, lastBrace + 1);
    }
    try {
      return JSON.parse(s);
    } catch {
      let repaired = s
        .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1')
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/(['"])?([a-zA-Z0-9_]+)\1\s*:/g, '"$2":');
      try {
        return JSON.parse(repaired);
      } catch {
        const sanitized = repaired.replace(/[\u0000-\u001F]+/g, ' ');
        try {
          return JSON.parse(sanitized);
        } catch {
          return null;
        }
      }
    }
  },
};
