import { CompanyPrintConfig, PrintFieldConfig } from './printConfigTypes';
import { getCountryPrintPreset } from './countryPrintPresets';
import { getBridgeBaseUrl } from '../companyDataFolderService';

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
      customFields: [],
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Loads the print configuration for a company.
   * Checks company object -> localStorage -> fallback defaults.
   */
  public loadPrintConfig(companyCode: string, company?: any): CompanyPrintConfig {
    const code = String(companyCode || company?.companyCode || company?.code || '10000').toUpperCase().trim();
    const defaults = this.getDefaultPrintConfig(company);

    if (typeof window === 'undefined') {
      return defaults;
    }

    try {
      // 1. Direct attachment on activeCompany
      if (company?.printConfig && typeof company.printConfig === 'object') {
        return this.mergeWithDefaults(company.printConfig, defaults);
      }

      // 2. Local storage cache per company
      const cached = localStorage.getItem(`ledgerx_print_config_${code}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        return this.mergeWithDefaults(parsed, defaults);
      }
    } catch (e) {
      console.warn('Error loading print config from local storage:', e);
    }

    return defaults;
  }

  /**
   * Saves the print configuration for a company.
   */
  public async savePrintConfig(companyCode: string, config: CompanyPrintConfig, company?: any): Promise<boolean> {
    const code = String(companyCode || company?.companyCode || company?.code || '10000').toUpperCase().trim();
    config.updatedAt = new Date().toISOString();

    if (company) {
      company.printConfig = config;
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`ledgerx_print_config_${code}`, JSON.stringify(config));
      } catch (e) {
        console.warn('Failed to cache print config in localStorage:', e);
      }
    }

    // Persist to Bridge / File system if Bridge is active
    try {
      const bridgeUrl = getBridgeBaseUrl();
      const res = await fetch(`${bridgeUrl}/api/local-data/company-print-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyCode: code, printConfig: config }),
      });
      if (res.ok) return true;
    } catch (err) {
      // Offline/browser fallback
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
      customFields: Array.isArray(saved.customFields) ? saved.customFields : [],
    };
  }
}

export const printConfigService = new PrintConfigService();
