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
    monthly: { amount: 600, display: '¥600' },
    yearly: { amount: 3900, display: '¥3,900' },
    lifetime: { amount: 24000, display: '¥24,000' },
  },
  USA: {
    country: 'USA',
    currencyCode: 'USD',
    currencySymbol: '$',
    currencyName: 'US Dollar',
    decimals: 2,
    trial: { amount: 0, display: '$0' },
    monthly: { amount: 4, display: '$4' },
    yearly: { amount: 25, display: '$25' },
    lifetime: { amount: 149, display: '$149' },
  },
  'United Kingdom': {
    country: 'United Kingdom',
    currencyCode: 'GBP',
    currencySymbol: '£',
    currencyName: 'Pound Sterling',
    decimals: 2,
    trial: { amount: 0, display: '£0' },
    monthly: { amount: 3.5, display: '£3.50' },
    yearly: { amount: 22, display: '£22' },
    lifetime: { amount: 129, display: '£129' },
  },
  'United Arab Emirates': {
    country: 'United Arab Emirates',
    currencyCode: 'AED',
    currencySymbol: 'AED',
    currencyName: 'UAE Dirham',
    decimals: 2,
    trial: { amount: 0, display: 'AED 0' },
    monthly: { amount: 15, display: 'AED 15' },
    yearly: { amount: 99, display: 'AED 99' },
    lifetime: { amount: 599, display: 'AED 599' },
  },
  'Saudi Arabia': {
    country: 'Saudi Arabia',
    currencyCode: 'SAR',
    currencySymbol: 'SAR',
    currencyName: 'Saudi Riyal',
    decimals: 2,
    trial: { amount: 0, display: 'SAR 0' },
    monthly: { amount: 15, display: 'SAR 15' },
    yearly: { amount: 99, display: 'SAR 99' },
    lifetime: { amount: 599, display: 'SAR 599' },
  },
  Germany: {
    country: 'Germany',
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    decimals: 2,
    trial: { amount: 0, display: '€0' },
    monthly: { amount: 3.99, display: '€3.99' },
    yearly: { amount: 24.99, display: '€24.99' },
    lifetime: { amount: 139, display: '€139' },
  },
  France: {
    country: 'France',
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    decimals: 2,
    trial: { amount: 0, display: '€0' },
    monthly: { amount: 3.99, display: '€3.99' },
    yearly: { amount: 24.99, display: '€24.99' },
    lifetime: { amount: 139, display: '€139' },
  },
  Australia: {
    country: 'Australia',
    currencyCode: 'AUD',
    currencySymbol: 'A$',
    currencyName: 'Australian Dollar',
    decimals: 2,
    trial: { amount: 0, display: 'A$0' },
    monthly: { amount: 6, display: 'A$6' },
    yearly: { amount: 39, display: 'A$39' },
    lifetime: { amount: 229, display: 'A$229' },
  },
  Canada: {
    country: 'Canada',
    currencyCode: 'CAD',
    currencySymbol: 'C$',
    currencyName: 'Canadian Dollar',
    decimals: 2,
    trial: { amount: 0, display: 'C$0' },
    monthly: { amount: 5.5, display: 'C$5.50' },
    yearly: { amount: 35, display: 'C$35' },
    lifetime: { amount: 209, display: 'C$209' },
  },
  Singapore: {
    country: 'Singapore',
    currencyCode: 'SGD',
    currencySymbol: 'S$',
    currencyName: 'Singapore Dollar',
    decimals: 2,
    trial: { amount: 0, display: 'S$0' },
    monthly: { amount: 5.5, display: 'S$5.50' },
    yearly: { amount: 35, display: 'S$35' },
    lifetime: { amount: 199, display: 'S$199' },
  },
  'New Zealand': {
    country: 'New Zealand',
    currencyCode: 'NZD',
    currencySymbol: 'NZ$',
    currencyName: 'New Zealand Dollar',
    decimals: 2,
    trial: { amount: 0, display: 'NZ$0' },
    monthly: { amount: 6.5, display: 'NZ$6.50' },
    yearly: { amount: 42, display: 'NZ$42' },
    lifetime: { amount: 249, display: 'NZ$249' },
  },
  'South Africa': {
    country: 'South Africa',
    currencyCode: 'ZAR',
    currencySymbol: 'R',
    currencyName: 'South African Rand',
    decimals: 2,
    trial: { amount: 0, display: 'R0' },
    monthly: { amount: 75, display: 'R75' },
    yearly: { amount: 499, display: 'R499' },
    lifetime: { amount: 2899, display: 'R2,899' },
  },
  Malaysia: {
    country: 'Malaysia',
    currencyCode: 'MYR',
    currencySymbol: 'RM',
    currencyName: 'Malaysian Ringgit',
    decimals: 2,
    trial: { amount: 0, display: 'RM0' },
    monthly: { amount: 18, display: 'RM18' },
    yearly: { amount: 119, display: 'RM119' },
    lifetime: { amount: 699, display: 'RM699' },
  },
  Bangladesh: {
    country: 'Bangladesh',
    currencyCode: 'BDT',
    currencySymbol: '৳',
    currencyName: 'Bangladeshi Taka',
    decimals: 2,
    trial: { amount: 0, display: '৳0' },
    monthly: { amount: 450, display: '৳450' },
    yearly: { amount: 2999, display: '৳2,999' },
    lifetime: { amount: 17999, display: '৳17,999' },
  },
  Nepal: {
    country: 'Nepal',
    currencyCode: 'NPR',
    currencySymbol: 'Rs',
    currencyName: 'Nepalese Rupee',
    decimals: 2,
    trial: { amount: 0, display: 'Rs 0' },
    monthly: { amount: 480, display: 'Rs 480' },
    yearly: { amount: 3199, display: 'Rs 3,199' },
    lifetime: { amount: 18999, display: 'Rs 18,999' },
  },
  'Sri Lanka': {
    country: 'Sri Lanka',
    currencyCode: 'LKR',
    currencySymbol: 'Rs',
    currencyName: 'Sri Lankan Rupee',
    decimals: 2,
    trial: { amount: 0, display: 'Rs 0' },
    monthly: { amount: 1200, display: 'Rs 1,200' },
    yearly: { amount: 7999, display: 'Rs 7,999' },
    lifetime: { amount: 47999, display: 'Rs 47,999' },
  },
  Pakistan: {
    country: 'Pakistan',
    currencyCode: 'PKR',
    currencySymbol: '₨',
    currencyName: 'Pakistani Rupee',
    decimals: 2,
    trial: { amount: 0, display: '₨0' },
    monthly: { amount: 1100, display: '₨1,100' },
    yearly: { amount: 7499, display: '₨7,499' },
    lifetime: { amount: 44999, display: '₨44,999' },
  },
  Indonesia: {
    country: 'Indonesia',
    currencyCode: 'IDR',
    currencySymbol: 'Rp',
    currencyName: 'Indonesian Rupiah',
    decimals: 0,
    trial: { amount: 0, display: 'Rp 0' },
    monthly: { amount: 65000, display: 'Rp 65,000' },
    yearly: { amount: 425000, display: 'Rp 425,000' },
    lifetime: { amount: 2550000, display: 'Rp 2,550,000' },
  },
  Thailand: {
    country: 'Thailand',
    currencyCode: 'THB',
    currencySymbol: '฿',
    currencyName: 'Thai Baht',
    decimals: 2,
    trial: { amount: 0, display: '฿0' },
    monthly: { amount: 140, display: '฿140' },
    yearly: { amount: 899, display: '฿899' },
    lifetime: { amount: 5499, display: '฿5,499' },
  },
  Kuwait: {
    country: 'Kuwait',
    currencyCode: 'KWD',
    currencySymbol: 'KD',
    currencyName: 'Kuwaiti Dinar',
    decimals: 3,
    trial: { amount: 0, display: 'KD 0' },
    monthly: { amount: 1.25, display: 'KD 1.25' },
    yearly: { amount: 8.5, display: 'KD 8.50' },
    lifetime: { amount: 49, display: 'KD 49.00' },
  },
  Qatar: {
    country: 'Qatar',
    currencyCode: 'QAR',
    currencySymbol: 'QR',
    currencyName: 'Qatari Riyal',
    decimals: 2,
    trial: { amount: 0, display: 'QR 0' },
    monthly: { amount: 15, display: 'QR 15' },
    yearly: { amount: 99, display: 'QR 99' },
    lifetime: { amount: 599, display: 'QR 599' },
  },
  Bahrain: {
    country: 'Bahrain',
    currencyCode: 'BHD',
    currencySymbol: 'BD',
    currencyName: 'Bahraini Dinar',
    decimals: 3,
    trial: { amount: 0, display: 'BD 0' },
    monthly: { amount: 1.5, display: 'BD 1.50' },
    yearly: { amount: 10, display: 'BD 10.00' },
    lifetime: { amount: 59, display: 'BD 59.00' },
  },
  Oman: {
    country: 'Oman',
    currencyCode: 'OMR',
    currencySymbol: 'RO',
    currencyName: 'Omani Rial',
    decimals: 3,
    trial: { amount: 0, display: 'RO 0' },
    monthly: { amount: 1.5, display: 'RO 1.50' },
    yearly: { amount: 10, display: 'RO 10.00' },
    lifetime: { amount: 59, display: 'RO 59.00' },
  },
  Nigeria: {
    country: 'Nigeria',
    currencyCode: 'NGN',
    currencySymbol: '₦',
    currencyName: 'Nigerian Naira',
    decimals: 2,
    trial: { amount: 0, display: '₦0' },
    monthly: { amount: 6500, display: '₦6,500' },
    yearly: { amount: 42000, display: '₦42,000' },
    lifetime: { amount: 249000, display: '₦249,000' },
  },
  Kenya: {
    country: 'Kenya',
    currencyCode: 'KES',
    currencySymbol: 'KSh',
    currencyName: 'Kenyan Shilling',
    decimals: 2,
    trial: { amount: 0, display: 'KSh 0' },
    monthly: { amount: 550, display: 'KSh 550' },
    yearly: { amount: 3500, display: 'KSh 3,500' },
    lifetime: { amount: 21000, display: 'KSh 21,000' },
  },
  Mexico: {
    country: 'Mexico',
    currencyCode: 'MXN',
    currencySymbol: 'MX$',
    currencyName: 'Mexican Peso',
    decimals: 2,
    trial: { amount: 0, display: 'MX$0' },
    monthly: { amount: 80, display: 'MX$80' },
    yearly: { amount: 520, display: 'MX$520' },
    lifetime: { amount: 3100, display: 'MX$3,100' },
  },
  Brazil: {
    country: 'Brazil',
    currencyCode: 'BRL',
    currencySymbol: 'R$',
    currencyName: 'Brazilian Real',
    decimals: 2,
    trial: { amount: 0, display: 'R$0' },
    monthly: { amount: 24, display: 'R$24' },
    yearly: { amount: 155, display: 'R$155' },
    lifetime: { amount: 920, display: 'R$920' },
  },
  China: {
    country: 'China',
    currencyCode: 'CNY',
    currencySymbol: '¥',
    currencyName: 'Chinese Yuan',
    decimals: 2,
    trial: { amount: 0, display: '¥0' },
    monthly: { amount: 28, display: '¥28' },
    yearly: { amount: 180, display: '¥180' },
    lifetime: { amount: 1080, display: '¥1,080' },
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
    monthly: { amount: 4, display: '$4' },
    yearly: { amount: 25, display: '$25' },
    lifetime: { amount: 149, display: '$149' },
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
