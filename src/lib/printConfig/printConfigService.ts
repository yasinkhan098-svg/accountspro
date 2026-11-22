import { CompanyPrintConfig, PrintFieldConfig, F8SalesPrintConfig } from './printConfigTypes';
import { getCountryPrintPreset } from './countryPrintPresets';
import { companyDataFolderService, getBridgeBaseUrl } from '../companyDataFolderService';

export function getDefaultF8SalesConfig(company: any): F8SalesPrintConfig {
  const country = company?.country || 'India';
  const isUAE = country.toLowerCase().includes('uae') || country.toLowerCase().includes('emirates');

  return {
    documentTitle: { label: 'Invoice Title', value: 'TAX INVOICE', enabled: true },
    sellerTradeLicense: {
      label: 'Seller Trade License No.',
      value: company?.tradeLicense || (isUAE ? 'TL-894920' : ''),
      enabled: true
    },
    buyerTradeLicense: {
      label: 'Buyer Trade License No.',
      value: '',
      enabled: true
    },
    paymentTerms: {
      label: 'Payment Terms',
      value: '30 Days Credit',
      enabled: true
    },
    placeOfSupply: {
      label: 'Place of Supply',
      value: company?.state ? `${company.state}, ${country}` : (isUAE ? 'Dubai, UAE' : country),
      enabled: true
    },
    salesperson: {
      label: 'Salesperson Name',
      value: '',
      enabled: true
    },
    vehicleRoute: {
      label: 'Vehicle / Route',
      value: '',
      enabled: true
    },
    bankName: {
      label: 'Remittance Bank Name',
      value: company?.bankName || (isUAE ? 'EMIRATES NBD, Dubai' : ''),
      enabled: true
    },
    accountName: {
      label: 'Bank Account / Beneficiary Name',
      value: company?.accountName || company?.name || '',
      enabled: true
    },
    iban: {
      label: 'IBAN / Bank A/C No.',
      value: company?.iban || company?.accountNo || (isUAE ? 'AE45026000001015483231402' : ''),
      enabled: true
    },
    swift: {
      label: 'SWIFT / BIC Code',
      value: company?.swift || (isUAE ? 'EBILAEAD' : ''),
      enabled: true
    },
    showStampSignature: {
      label: "Receiver's Stamp & Signature Box",
      value: "Receiver's Stamp & Signature",
      enabled: true
    },
    showAuthorisedSignatory: {
      label: 'Authorised Signatory',
      value: 'Authorised Signatory',
      enabled: true
    },
    showLpoNo: {
      label: 'LPO / PO No. Field',
      value: 'LPO / PO No:',
      enabled: true
    },
    showDeliveryNoteNo: {
      label: 'Delivery Note No. Field',
      value: 'Delivery Note No:',
      enabled: true
    },
    customInvoiceSeries: {
      enabled: false,
      prefix: '',
      startingNumber: 1,
      padDigits: 4,
    },
    customFields: []
  };
}

class PrintConfigService {
  /**
   * Generates a fully populated default configuration for a company based on its country.
   */
  public getDefaultPrintConfig(company: any): CompanyPrintConfig {
    const companyCode = String(company?.companyCode || company?.code || '10000').toUpperCase().trim();
    const country = company?.country || 'India';
    const preset = getCountryPrintPreset(country);

    return {
      companyCode,
      country,
      storeTagline: {
        label: 'Store Tagline / Sub-heading',
        value: 'LEDGERX SMART POINT',
        enabled: true,
      },
      customerCarePhone: {
        label: 'Customer care',
        value: company?.telephone || company?.mobile || '18008910001',
        enabled: true,
      },
      businessId: {
        label: preset.businessIdLabel,
        value: company?.cin || (country.toLowerCase() === 'india' ? 'U01100MH1999PLC120563' : preset.businessIdPlaceholder),
        enabled: true,
      },
      foodLicense: {
        label: preset.foodLicenseLabel,
        value: country.toLowerCase() === 'india' ? '12622012000067' : preset.foodLicensePlaceholder,
        enabled: true,
      },
      customerCard: {
        label: 'ROne Card No.',
        value: '', // Will dynamically use POS customer mobile when available
        enabled: true,
      },
      customerBalance: {
        label: 'ROne Bal(Amount)',
        value: '0.00',
        enabled: true,
      },
      website: {
        label: 'Website',
        value: company?.website || 'www.ledgerxretail.com',
        enabled: true,
      },
      email: {
        label: 'Customer Care email',
        value: company?.email || 'customercare@ledgerx.com',
        enabled: true,
      },
      privacyPolicy: {
        label: 'Privacy Policy Notice',
        value: 'https://ledgerxretail.com/privacy-policy.html',
        enabled: true,
      },
      posBillConfig: {
        billPrefix: 'CASH',
        startingNumber: 1,
        padDigits: 4,
        printCopies: 1,
      },
      f8SalesConfig: getDefaultF8SalesConfig(company),
      customFields: [],
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Loads the print configuration for a company.
   * Checks localStorage (latest user updates) -> company object -> fallback defaults.
   */
  public loadPrintConfig(companyCode?: string, company?: any): CompanyPrintConfig {
    let code = '';
    if (companyCode && /^\d{5}$/.test(String(companyCode).trim())) {
      code = String(companyCode).trim().toUpperCase();
    } else if (company) {
      code = companyDataFolderService.getCompanyFolderCode(company);
    } else {
      code = String(companyCode || '10000').toUpperCase().trim();
    }
    const defaults = this.getDefaultPrintConfig(company);

    if (typeof window === 'undefined') {
      return defaults;
    }

    try {
      // 1. Local storage cache per company - always takes priority for live edits
      const cached = localStorage.getItem(`ledgerx_print_config_${code}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        const merged = this.mergeWithDefaults(parsed, defaults);
        if (company) company.printConfig = merged;
        return merged;
      }

      // 2. Direct attachment on activeCompany (from company.json)
      if (company?.printConfig && typeof company.printConfig === 'object') {
        return this.mergeWithDefaults(company.printConfig, defaults);
      }
    } catch (e) {
      console.warn('Error loading print config from local storage:', e);
    }

    return defaults;
  }

  /**
   * Saves the print configuration for a company.
   * Persists to localStorage, activeCompany, and company.json via companyDataFolderService.
   */
  public async savePrintConfig(companyCode: string, config: CompanyPrintConfig, company?: any): Promise<boolean> {
    let code = '';
    if (companyCode && /^\d{5}$/.test(String(companyCode).trim())) {
      code = String(companyCode).trim().toUpperCase();
    } else if (company) {
      code = companyDataFolderService.getCompanyFolderCode(company);
    } else {
      code = String(companyCode || '10000').toUpperCase().trim();
    }
    config.companyCode = code;
    config.updatedAt = new Date().toISOString();

    if (company) {
      company.printConfig = config;
      company.companyCode = code;
      company.code = code;
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`ledgerx_print_config_${code}`, JSON.stringify(config));
        window.dispatchEvent(new CustomEvent('ledgerx_print_config_updated', {
          detail: { companyCode: code, config }
        }));
      } catch (e) {
        console.warn('Failed to cache print config in localStorage:', e);
      }
    }

    // Persist to company data folder (company.json)
    try {
      if (company) {
        await companyDataFolderService.saveCompanyFolder({
          companyCode: code,
          company: { ...company, companyCode: code, code: code, printConfig: config },
        });
      }
    } catch (err) {
      console.warn('Notice saving print config to company data folder:', err);
    }

    return true;
  }

  /**
   * Formats a field's print representation following the user's rule:
   * - If not enabled: returns empty string (do not print)
   * - If enabled and value given: returns trimmed value
   * - If enabled and value is blank: returns 'xxxxx'
   */
  public formatFieldValue(field?: PrintFieldConfig | null, dynamicValue?: string): string {
    if (!field || !field.enabled) {
      return '';
    }
    const val = (dynamicValue && dynamicValue.trim()) || (field.value && field.value.trim()) || '';
    if (val) {
      return val;
    }
    return 'xxxxx';
  }

  private mergeWithDefaults(saved: any, defaults: CompanyPrintConfig): CompanyPrintConfig {
    return {
      ...defaults,
      ...saved,
      storeTagline: { ...defaults.storeTagline, ...(saved.storeTagline || {}) },
      customerCarePhone: { ...defaults.customerCarePhone, ...(saved.customerCarePhone || {}) },
      businessId: { ...defaults.businessId, ...(saved.businessId || {}) },
      foodLicense: { ...defaults.foodLicense, ...(saved.foodLicense || {}) },
      customerCard: { ...defaults.customerCard, ...(saved.customerCard || {}) },
      customerBalance: { ...defaults.customerBalance, ...(saved.customerBalance || {}) },
      website: { ...defaults.website, ...(saved.website || {}) },
      email: { ...defaults.email, ...(saved.email || {}) },
      privacyPolicy: { ...defaults.privacyPolicy, ...(saved.privacyPolicy || {}) },
      posBillConfig: {
        billPrefix: (saved.posBillConfig?.billPrefix !== undefined ? saved.posBillConfig.billPrefix : defaults.posBillConfig?.billPrefix) || 'CASH',
        startingNumber: Number(saved.posBillConfig?.startingNumber) > 0 ? Number(saved.posBillConfig.startingNumber) : (defaults.posBillConfig?.startingNumber || 1),
        padDigits: Number(saved.posBillConfig?.padDigits) > 0 ? Number(saved.posBillConfig.padDigits) : (defaults.posBillConfig?.padDigits || 4),
        printCopies: Number(saved.posBillConfig?.printCopies) > 0 ? Number(saved.posBillConfig.printCopies) : (defaults.posBillConfig?.printCopies || 1),
      },
      f8SalesConfig: {
        ...defaults.f8SalesConfig,
        ...(saved.f8SalesConfig || {}),
        documentTitle: { ...defaults.f8SalesConfig?.documentTitle, ...(saved.f8SalesConfig?.documentTitle || {}) },
        sellerTradeLicense: { ...defaults.f8SalesConfig?.sellerTradeLicense, ...(saved.f8SalesConfig?.sellerTradeLicense || {}) },
        buyerTradeLicense: { ...defaults.f8SalesConfig?.buyerTradeLicense, ...(saved.f8SalesConfig?.buyerTradeLicense || {}) },
        paymentTerms: { ...defaults.f8SalesConfig?.paymentTerms, ...(saved.f8SalesConfig?.paymentTerms || {}) },
        placeOfSupply: { ...defaults.f8SalesConfig?.placeOfSupply, ...(saved.f8SalesConfig?.placeOfSupply || {}) },
        salesperson: { ...defaults.f8SalesConfig?.salesperson, ...(saved.f8SalesConfig?.salesperson || {}) },
        vehicleRoute: { ...defaults.f8SalesConfig?.vehicleRoute, ...(saved.f8SalesConfig?.vehicleRoute || {}) },
        bankName: { ...defaults.f8SalesConfig?.bankName, ...(saved.f8SalesConfig?.bankName || {}) },
        accountName: { ...defaults.f8SalesConfig?.accountName, ...(saved.f8SalesConfig?.accountName || {}) },
        iban: { ...defaults.f8SalesConfig?.iban, ...(saved.f8SalesConfig?.iban || {}) },
        swift: { ...defaults.f8SalesConfig?.swift, ...(saved.f8SalesConfig?.swift || {}) },
        showStampSignature: { ...defaults.f8SalesConfig?.showStampSignature, ...(saved.f8SalesConfig?.showStampSignature || {}) },
        showAuthorisedSignatory: { ...defaults.f8SalesConfig?.showAuthorisedSignatory, ...(saved.f8SalesConfig?.showAuthorisedSignatory || {}) },
        showLpoNo: { ...defaults.f8SalesConfig?.showLpoNo, ...(saved.f8SalesConfig?.showLpoNo || {}) },
        showDeliveryNoteNo: { ...defaults.f8SalesConfig?.showDeliveryNoteNo, ...(saved.f8SalesConfig?.showDeliveryNoteNo || {}) },
        customInvoiceSeries: {
          enabled: !!saved.f8SalesConfig?.customInvoiceSeries?.enabled,
          prefix: saved.f8SalesConfig?.customInvoiceSeries?.prefix !== undefined ? String(saved.f8SalesConfig.customInvoiceSeries.prefix) : '',
          startingNumber: Number(saved.f8SalesConfig?.customInvoiceSeries?.startingNumber) > 0 ? Number(saved.f8SalesConfig.customInvoiceSeries.startingNumber) : 1,
          padDigits: Number(saved.f8SalesConfig?.customInvoiceSeries?.padDigits) > 0 ? Number(saved.f8SalesConfig.customInvoiceSeries.padDigits) : 4,
        },
        customFields: Array.isArray(saved.f8SalesConfig?.customFields) ? saved.f8SalesConfig.customFields : [],
      } as any,
      customFields: Array.isArray(saved.customFields) ? saved.customFields : [],
    };
  }
}

export const printConfigService = new PrintConfigService();
