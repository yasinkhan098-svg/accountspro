/**
 * Global Multi-Currency Pricing & Localization Engine for LedgerX ERP
 * Provides dynamic country detection, localized currency formatting,
 * and regional pricing tiers across every continent.
 */

export interface CountryPricingTier {
  country: string;
  currencyCode: string;
  currencySymbol: string;
  currencyName: string;
  decimals: number; // 0 for JPY, 2 for INR/USD/EUR, 3 for KWD/BHD
  trial: { amount: number; display: string };
  monthly: { amount: number; display: string };
  yearly: { amount: number; display: string };
  lifetime: { amount: number; display: string };
}

export const COUNTRY_PRICING_CATALOG: Record<string, CountryPricingTier> = {
  India: {
    country: 'India',
    currencyCode: 'INR',
    currencySymbol: '₹',
    currencyName: 'Indian Rupee',
    decimals: 2,
    trial: { amount: 0, display: '₹0' },
    monthly: { amount: 299, display: '₹299' },
    yearly: { amount: 1999, display: '₹1,999' },
    lifetime: { amount: 11999, display: '₹11,999' },
  },
  Japan: {
    country: 'Japan',
    currencyCode: 'JPY',
    currencySymbol: '¥',
    currencyName: 'Japanese Yen',
    decimals: 0,
    trial: { amount: 0, display: '¥0' },
    monthly: { amount: 1500, display: '¥1,500' },
    yearly: { amount: 7500, display: '¥7,500' },
    lifetime: { amount: 37500, display: '¥37,500' },
  },
  USA: {
    country: 'USA',
    currencyCode: 'USD',
    currencySymbol: '$',
    currencyName: 'US Dollar',
    decimals: 2,
    trial: { amount: 0, display: '$0' },
    monthly: { amount: 10, display: '$10' },
    yearly: { amount: 50, display: '$50' },
    lifetime: { amount: 250, display: '$250' },
  },
  'United Kingdom': {
    country: 'United Kingdom',
    currencyCode: 'GBP',
    currencySymbol: '£',
    currencyName: 'Pound Sterling',
    decimals: 2,
    trial: { amount: 0, display: '£0' },
    monthly: { amount: 8, display: '£8' },
    yearly: { amount: 40, display: '£40' },
    lifetime: { amount: 199, display: '£199' },
  },
  'United Arab Emirates': {
    country: 'United Arab Emirates',
    currencyCode: 'AED',
    currencySymbol: 'AED',
    currencyName: 'UAE Dirham',
    decimals: 2,
    trial: { amount: 0, display: 'AED 0' },
    monthly: { amount: 37, display: 'AED 37' },
    yearly: { amount: 185, display: 'AED 185' },
    lifetime: { amount: 920, display: 'AED 920' },
  },
  'Saudi Arabia': {
    country: 'Saudi Arabia',
    currencyCode: 'SAR',
    currencySymbol: 'SAR',
    currencyName: 'Saudi Riyal',
    decimals: 2,
    trial: { amount: 0, display: 'SAR 0' },
    monthly: { amount: 38, display: 'SAR 38' },
    yearly: { amount: 190, display: 'SAR 190' },
    lifetime: { amount: 940, display: 'SAR 940' },
  },
  Germany: {
    country: 'Germany',
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    decimals: 2,
    trial: { amount: 0, display: '€0' },
    monthly: { amount: 9.5, display: '€9.50' },
    yearly: { amount: 48, display: '€48' },
    lifetime: { amount: 235, display: '€235' },
  },
  France: {
    country: 'France',
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    decimals: 2,
    trial: { amount: 0, display: '€0' },
    monthly: { amount: 9.5, display: '€9.50' },
    yearly: { amount: 48, display: '€48' },
    lifetime: { amount: 235, display: '€235' },
  },
  Australia: {
    country: 'Australia',
    currencyCode: 'AUD',
    currencySymbol: 'A$',
    currencyName: 'Australian Dollar',
    decimals: 2,
    trial: { amount: 0, display: 'A$0' },
    monthly: { amount: 15, display: 'A$15' },
    yearly: { amount: 76, display: 'A$76' },
    lifetime: { amount: 380, display: 'A$380' },
  },
  Canada: {
    country: 'Canada',
    currencyCode: 'CAD',
    currencySymbol: 'C$',
    currencyName: 'Canadian Dollar',
    decimals: 2,
    trial: { amount: 0, display: 'C$0' },
    monthly: { amount: 14, display: 'C$14' },
    yearly: { amount: 69, display: 'C$69' },
    lifetime: { amount: 345, display: 'C$345' },
  },
  Singapore: {
    country: 'Singapore',
    currencyCode: 'SGD',
    currencySymbol: 'S$',
    currencyName: 'Singapore Dollar',
    decimals: 2,
    trial: { amount: 0, display: 'S$0' },
    monthly: { amount: 13.5, display: 'S$13.50' },
    yearly: { amount: 67, display: 'S$67' },
    lifetime: { amount: 335, display: 'S$335' },
  },
  'New Zealand': {
    country: 'New Zealand',
    currencyCode: 'NZD',
    currencySymbol: 'NZ$',
    currencyName: 'New Zealand Dollar',
    decimals: 2,
    trial: { amount: 0, display: 'NZ$0' },
    monthly: { amount: 16, display: 'NZ$16' },
    yearly: { amount: 82, display: 'NZ$82' },
    lifetime: { amount: 410, display: 'NZ$410' },
  },
  'South Africa': {
    country: 'South Africa',
    currencyCode: 'ZAR',
    currencySymbol: 'R',
    currencyName: 'South African Rand',
    decimals: 2,
    trial: { amount: 0, display: 'R0' },
    monthly: { amount: 180, display: 'R180' },
    yearly: { amount: 910, display: 'R910' },
    lifetime: { amount: 4550, display: 'R4,550' },
  },
  Malaysia: {
    country: 'Malaysia',
    currencyCode: 'MYR',
    currencySymbol: 'RM',
    currencyName: 'Malaysian Ringgit',
    decimals: 2,
    trial: { amount: 0, display: 'RM0' },
    monthly: { amount: 45, display: 'RM45' },
    yearly: { amount: 225, display: 'RM225' },
    lifetime: { amount: 1120, display: 'RM1,120' },
  },
  Bangladesh: {
    country: 'Bangladesh',
    currencyCode: 'BDT',
    currencySymbol: '৳',
    currencyName: 'Bangladeshi Taka',
    decimals: 2,
    trial: { amount: 0, display: '৳0' },
    monthly: { amount: 1200, display: '৳1,200' },
    yearly: { amount: 6000, display: '৳6,000' },
    lifetime: { amount: 30000, display: '৳30,000' },
  },
  Nepal: {
    country: 'Nepal',
    currencyCode: 'NPR',
    currencySymbol: 'Rs',
    currencyName: 'Nepalese Rupee',
    decimals: 2,
    trial: { amount: 0, display: 'Rs 0' },
    monthly: { amount: 1330, display: 'Rs 1,330' },
    yearly: { amount: 6650, display: 'Rs 6,650' },
    lifetime: { amount: 33250, display: 'Rs 33,250' },
  },
  'Sri Lanka': {
    country: 'Sri Lanka',
    currencyCode: 'LKR',
    currencySymbol: 'Rs',
    currencyName: 'Sri Lankan Rupee',
    decimals: 2,
    trial: { amount: 0, display: 'Rs 0' },
    monthly: { amount: 2900, display: 'Rs 2,900' },
    yearly: { amount: 14500, display: 'Rs 14,500' },
    lifetime: { amount: 72500, display: 'Rs 72,500' },
  },
  Pakistan: {
    country: 'Pakistan',
    currencyCode: 'PKR',
    currencySymbol: '₨',
    currencyName: 'Pakistani Rupee',
    decimals: 2,
    trial: { amount: 0, display: '₨0' },
    monthly: { amount: 2780, display: '₨2,780' },
    yearly: { amount: 13900, display: '₨13,900' },
    lifetime: { amount: 69500, display: '₨69,500' },
  },
  Indonesia: {
    country: 'Indonesia',
    currencyCode: 'IDR',
    currencySymbol: 'Rp',
    currencyName: 'Indonesian Rupiah',
    decimals: 0,
    trial: { amount: 0, display: 'Rp 0' },
    monthly: { amount: 160000, display: 'Rp 160,000' },
    yearly: { amount: 800000, display: 'Rp 800,000' },
    lifetime: { amount: 4000000, display: 'Rp 4,000,000' },
  },
  Thailand: {
    country: 'Thailand',
    currencyCode: 'THB',
    currencySymbol: '฿',
    currencyName: 'Thai Baht',
    decimals: 2,
    trial: { amount: 0, display: '฿0' },
    monthly: { amount: 350, display: '฿350' },
    yearly: { amount: 1750, display: '฿1,750' },
    lifetime: { amount: 8750, display: '฿8,750' },
  },
  Kuwait: {
    country: 'Kuwait',
    currencyCode: 'KWD',
    currencySymbol: 'KD',
    currencyName: 'Kuwaiti Dinar',
    decimals: 3,
    trial: { amount: 0, display: 'KD 0' },
    monthly: { amount: 3.1, display: 'KD 3.10' },
    yearly: { amount: 15.5, display: 'KD 15.50' },
    lifetime: { amount: 77.5, display: 'KD 77.50' },
  },
  Qatar: {
    country: 'Qatar',
    currencyCode: 'QAR',
    currencySymbol: 'QR',
    currencyName: 'Qatari Riyal',
    decimals: 2,
    trial: { amount: 0, display: 'QR 0' },
    monthly: { amount: 37, display: 'QR 37' },
    yearly: { amount: 185, display: 'QR 185' },
    lifetime: { amount: 920, display: 'QR 920' },
  },
  Bahrain: {
    country: 'Bahrain',
    currencyCode: 'BHD',
    currencySymbol: 'BD',
    currencyName: 'Bahraini Dinar',
    decimals: 3,
    trial: { amount: 0, display: 'BD 0' },
    monthly: { amount: 3.75, display: 'BD 3.75' },
    yearly: { amount: 18.8, display: 'BD 18.80' },
    lifetime: { amount: 94, display: 'BD 94.00' },
  },
  Oman: {
    country: 'Oman',
    currencyCode: 'OMR',
    currencySymbol: 'RO',
    currencyName: 'Omani Rial',
    decimals: 3,
    trial: { amount: 0, display: 'RO 0' },
    monthly: { amount: 3.85, display: 'RO 3.85' },
    yearly: { amount: 19.2, display: 'RO 19.20' },
    lifetime: { amount: 96, display: 'RO 96.00' },
  },
  Nigeria: {
    country: 'Nigeria',
    currencyCode: 'NGN',
    currencySymbol: '₦',
    currencyName: 'Nigerian Naira',
    decimals: 2,
    trial: { amount: 0, display: '₦0' },
    monthly: { amount: 16500, display: '₦16,500' },
    yearly: { amount: 82500, display: '₦82,500' },
    lifetime: { amount: 412500, display: '₦412,500' },
  },
  Kenya: {
    country: 'Kenya',
    currencyCode: 'KES',
    currencySymbol: 'KSh',
    currencyName: 'Kenyan Shilling',
    decimals: 2,
    trial: { amount: 0, display: 'KSh 0' },
    monthly: { amount: 1300, display: 'KSh 1,300' },
    yearly: { amount: 6500, display: 'KSh 6,500' },
    lifetime: { amount: 32500, display: 'KSh 32,500' },
  },
  Mexico: {
    country: 'Mexico',
    currencyCode: 'MXN',
    currencySymbol: 'MX$',
    currencyName: 'Mexican Peso',
    decimals: 2,
    trial: { amount: 0, display: 'MX$0' },
    monthly: { amount: 200, display: 'MX$200' },
    yearly: { amount: 1000, display: 'MX$1,000' },
    lifetime: { amount: 5000, display: 'MX$5,000' },
  },
  Brazil: {
    country: 'Brazil',
    currencyCode: 'BRL',
    currencySymbol: 'R$',
    currencyName: 'Brazilian Real',
    decimals: 2,
    trial: { amount: 0, display: 'R$0' },
    monthly: { amount: 58, display: 'R$58' },
    yearly: { amount: 290, display: 'R$290' },
    lifetime: { amount: 1450, display: 'R$1,450' },
  },
  China: {
    country: 'China',
    currencyCode: 'CNY',
    currencySymbol: '¥',
    currencyName: 'Chinese Yuan',
    decimals: 2,
    trial: { amount: 0, display: '¥0' },
    monthly: { amount: 72, display: '¥72' },
    yearly: { amount: 360, display: '¥360' },
    lifetime: { amount: 1800, display: '¥1,800' },
  },
};

/**
 * Fallback tier for any country not explicitly listed (benchmarked in USD)
 */
export function getCountryPricing(countryName?: string): CountryPricingTier {
  if (!countryName) return COUNTRY_PRICING_CATALOG['India'];
  const normalized = countryName.trim();
  if (COUNTRY_PRICING_CATALOG[normalized]) {
    return COUNTRY_PRICING_CATALOG[normalized];
  }

  // Case-insensitive lookup
  const found = Object.keys(COUNTRY_PRICING_CATALOG).find(
    k => k.toLowerCase() === normalized.toLowerCase()
  );
  if (found) return COUNTRY_PRICING_CATALOG[found];

  // International standard tier (USD)
  return {
    country: normalized,
    currencyCode: 'USD',
    currencySymbol: '$',
    currencyName: 'US Dollar',
    decimals: 2,
    trial: { amount: 0, display: '$0' },
    monthly: { amount: 10, display: '$10' },
    yearly: { amount: 50, display: '$50' },
    lifetime: { amount: 250, display: '$250' },
  };
}

/**
 * Calculates subunit amount (e.g. cents/paise) expected by payment gateways
 * JPY = 0 decimals (amount as integer)
 * USD/INR/EUR = 2 decimals (amount * 100)
 * KWD/BHD = 3 decimals (amount * 1000)
 */
export function getSubunitAmount(tier: CountryPricingTier, plan: 'TRIAL' | 'MONTHLY' | 'YEARLY' | 'LIFETIME'): number {
  if (plan === 'TRIAL') return 0;
  const rawAmount = tier[plan.toLowerCase() as 'monthly' | 'yearly' | 'lifetime'].amount;
  if (tier.decimals === 0) return Math.round(rawAmount);
  if (tier.decimals === 3) return Math.round(rawAmount * 1000);
  return Math.round(rawAmount * 100);
}

/**
 * Client-side Timezone to Country detector
 * Provides instantaneous, zero-latency country resolution even before API returns
 */
export function detectCountryFromClient(): string {
  if (typeof window === 'undefined') return 'India';
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Tokyo') || tz.includes('Japan')) return 'Japan';
    if (tz.includes('Kolkata') || tz.includes('India')) return 'India';
    if (tz.includes('Dubai')) return 'United Arab Emirates';
    if (tz.includes('Riyadh')) return 'Saudi Arabia';
    if (tz.includes('London')) return 'United Kingdom';
    if (tz.includes('Paris')) return 'France';
    if (tz.includes('Berlin')) return 'Germany';
    if (tz.includes('Sydney') || tz.includes('Melbourne') || tz.includes('Brisbane')) return 'Australia';
    if (tz.includes('Toronto') || tz.includes('Vancouver') || tz.includes('Montreal')) return 'Canada';
    if (tz.includes('Singapore')) return 'Singapore';
    if (tz.includes('Dhaka')) return 'Bangladesh';
    if (tz.includes('Kathmandu')) return 'Nepal';
    if (tz.includes('Karachi')) return 'Pakistan';
    if (tz.includes('Colombo')) return 'Sri Lanka';
    if (tz.includes('Bangkok')) return 'Thailand';
    if (tz.includes('Jakarta')) return 'Indonesia';
    if (tz.includes('Kuala_Lumpur')) return 'Malaysia';
    if (tz.includes('New_York') || tz.includes('Los_Angeles') || tz.includes('Chicago') || tz.includes('Denver')) return 'USA';
    if (tz.includes('Auckland')) return 'New Zealand';
    if (tz.includes('Johannesburg')) return 'South Africa';
    if (tz.includes('Cairo')) return 'Egypt';
    if (tz.includes('Lagos')) return 'Nigeria';
    if (tz.includes('Nairobi')) return 'Kenya';
    if (tz.includes('Sao_Paulo')) return 'Brazil';
    if (tz.includes('Mexico_City')) return 'Mexico';
    if (tz.includes('Shanghai')) return 'China';
  } catch (_) {}
  return 'India';
}

/**
 * Full list of all supported countries in alphabetical order for select dropdowns
 */
export const ALL_COUNTRY_NAMES = Object.keys(COUNTRY_PRICING_CATALOG).sort();
