"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AuthUI from '@/components/AuthUI';
import SubscriptionRenewalUI from '@/components/SubscriptionRenewalUI';
import PlanUpgradeModal from '@/components/PlanUpgradeModal';
import { authClient } from '@/lib/auth-client';

// ==================== SCREEN TYPES ====================
type ScreenType =
  | 'GATEWAY_MAIN' | 'MASTER_MENU' | 'ALTER_MENU' | 'DISPLAY_REPORTS_MENU' | 'ACCOUNT_BOOKS_MENU'
  | 'COMPANY_CREATION' | 'GROUP_CREATION' | 'LEDGER_CREATION' | 'CURRENCY_CREATION'
  | 'VOUCHER_TYPE_CREATION' | 'STOCK_GROUP_CREATION' | 'STOCK_CATEGORY_CREATION'
  | 'STOCK_ITEM_CREATION' | 'UNIT_CREATION' | 'GODOWN_CREATION'
  | 'VOUCHER_ENTRY' | 'ALTER_LIST'
  | 'BALANCE_SHEET' | 'PROFIT_LOSS' | 'TRIAL_BALANCE' | 'DAY_BOOK'
  | 'SALES_REGISTER' | 'PURCHASE_REGISTER' | 'CONTRA_REGISTER' | 'PAYMENT_REGISTER'
  | 'RECEIPT_REGISTER' | 'JOURNAL_REGISTER' | 'DEBIT_NOTE_REGISTER' | 'CREDIT_NOTE_REGISTER'
  | 'QUOTATION_REGISTER'
  | 'LEDGER_REPORT' | 'GROUP_SUMMARY' | 'STOCK_SUMMARY'
  | 'OUTSTANDING_REPORT' | 'CHART_OF_ACCOUNTS' | 'PRINT_PREVIEW'
  | 'GSTR1_REPORT' | 'GSTR3B_REPORT' | 'USER_ROLES' | 'DATA_EXCHANGE';

type VoucherTypeKey = 'Contra' | 'Payment' | 'Receipt' | 'Journal' | 'Sales' | 'Purchase' | 'Credit Note' | 'Debit Note' | 'Sales Quotation';

// ==================== DATA INTERFACES ====================
interface Ledger {
  id: number; companyId: number; name: string; alias?: string; groupName: string;
  openingBalance: number; balanceType: 'Dr' | 'Cr';
  mailingName?: string; address?: string; state?: string; country?: string;
  gstin?: string; pan?: string; phone?: string; email?: string;
  registrationType?: string; bankName?: string; accountNo?: string; ifsc?: string; pinCode?: string;
  bankHolderName?: string; setAlterGstDetails?: string;
  odLimit?: number | null;
}
interface StockGroup { id: number; companyId: number; name: string; alias?: string; under: string; }
interface StockCategory { id: number; companyId: number; name: string; alias?: string; under: string; }
interface StockItem {
  id: number; companyId: number; name: string; alias?: string; under: string; category: string;
  unit: any; altUnit?: any; gstRate: number; hsnCode?: string;
  openingQty: number; openingRate: number;
  showInclTax?: boolean;
  showAmtInclTax?: boolean;
  gstApplicable?: string;
  typeOfSupply?: string;
  costingMethod?: string;
  marketValuationMethod?: string;
  defaultDiscount?: number;
  enableDescription?: boolean;
  descLine1?: boolean;
  descLine2?: boolean;
  descLine3?: boolean;
}
interface UnitData { id: number; companyId: number; name: string; symbol: string; formalName: string; uqc: string; decimalPlaces: number; }
interface GodownData { id: number; companyId: number; name: string; alias?: string; under: string; address?: string; }
interface VoucherTypeData { id: number; companyId: number; name: string; type: string; abbreviation: string; numberingMethod: string; startNumber: number; prefix?: string; suffix?: string; width?: number; prefillWithZero?: boolean; }
interface CurrencyData { id: number; companyId: number; name: string; symbol: string; isoCode: string; decimalPlaces: number; }
interface Company { 
  id: number; name: string; mailingName?: string; address?: string; state?: string; country?: string; gstin?: string; 
  telephone?: string; mobile?: string; email?: string; website?: string; 
  registrationType?: string; bankName?: string; bankHolderName?: string; accountNo?: string; branch?: string; ifsc?: string; swiftCode?: string; 
  financialYearStart?: string; booksBeginFrom?: string; securityControl?: boolean; password?: string;
  showMobile?: boolean; showEmail?: boolean; showWebsite?: boolean;
  logo?: string; showLogo?: boolean; pinCode?: string;
  showDiscount?: boolean;
}
type UserRole = 'Admin' | 'Accountant' | 'Data Entry' | 'Viewer';
interface AppUser { id: number; username: string; role: UserRole; email?: string; }

interface VoucherEntry { 
  id: number; 
  ledgerId: number; 
  ledgerName: string; 
  amount: number; 
  entryType: 'Dr' | 'Cr'; 
  narration?: string; 
}

interface InventoryEntry { id: number; itemId: number; itemName: string; qty: number; rate: number; rateInclTax: number; amountInclTax: number; unit: string; amount: number; discountPerc?: number; discountAmt?: number; taxableAmount?: number; gstRate: number; hsnCode?: string; altQty?: string; stockItem?: StockItem; desc1?: string; desc2?: string; desc3?: string; }

interface VoucherRow {
  itemId: number;
  itemName: string;
  qty: number;
  rate: number;
  rateInclTax: number;
  amountInclTax: number;
  unit: string;
  amount: number;
  discountPerc?: number;
  discountAmt?: number;
  taxableAmount?: number;
  gstRate: number;
  hsnCode?: string;
  desc1?: string;
  desc2?: string;
  desc3?: string;
}

interface AccountEntry {
  ledgerId: number;
  ledgerName: string;
  amount: number;
  entryType: 'Dr' | 'Cr';
}
interface PartyDetails {
  buyerName: string; buyerMailingName: string; buyerAddress: string;
  buyerState: string; buyerCountry: string; buyerGstin: string; buyerPlace: string;
  shipName: string; shipMailingName: string; shipAddress: string;
  shipState: string; shipCountry: string; shipGstin: string; shipPlace: string;
  buyerOrderNo: string; buyerOrderDate: string; termsOfDelivery: string;
  supplierInvNo?: string; supplierInvDate?: string;
}
interface DispatchDetails {
  deliveryNoteNo: string; dispatchDocNo: string; dispatchedThrough: string;
  destination: string; carrierNameAgent: string; billOfLadingNo: string;
  billOfLadingDate: string; motorVehicleNo: string;
  customerPoNo?: string; grNo?: string; transport?: string; station?: string; ewayBillNo?: string;
}
interface Voucher {
  id: number; companyId: number; type: string; date: string; number: number; voucherNo: string; refNo: string;
  partyName: string; partyId: number;
  entries: VoucherEntry[]; inventoryEntries: InventoryEntry[];
  narration: string; total: number;
  partyDetails?: PartyDetails;
  dispatchDetails?: DispatchDetails;
}
interface MenuOption { label: string; highlight: string; action: () => void; category?: 'header' | 'item'; }
interface AltCContext { fieldType: 'ledger' | 'group' | 'stockItem' | 'stockGroup' | 'unit' | 'currency' | 'voucherType' | 'godown' | 'stockCategory'; onCreated: (newItem: any) => void; activeAlterItem?: any; }

// ==================== STATIC DATA ====================
const TALLY_GROUPS = [
  "Primary", "Bank Accounts", "Bank OCC A/c", "Bank OD A/c", "Branch / Divisions",
  "Capital Account", "Cash-in-hand", "Current Assets", "Current Liabilities",
  "Deposits (Asset)", "Direct Expenses", "Direct Incomes", "Duties & Taxes",
  "Expenses (Direct)", "Expenses (Indirect)", "Fixed Assets", "Income (Direct)",
  "Income (Indirect)", "Indirect Expenses", "Indirect Incomes", "Investments",
  "Loans & Advances (Asset)", "Loans (Liability)", "Misc. Expenses (ASSET)",
  "Provisions", "Purchase Accounts", "Reserves & Surplus", "Retained Earnings",
  "Sales Accounts", "Secured Loans", "Stock-in-hand", "Sundry Creditors",
  "Sundry Debtors", "Suspense A/c", "Unsecured Loans"
];
// Country → Currency mapping (Tally Prime style)
const COUNTRY_CURRENCY: Record<string,{symbol:string;name:string;isoCode:string;paise:string}> = {
  "India":                {symbol:"₹",  name:"Indian Rupee",       isoCode:"INR", paise:"Paise"},
  "USA":                  {symbol:"$",  name:"US Dollar",          isoCode:"USD", paise:"Cents"},
  "United Kingdom":       {symbol:"£",  name:"Pound Sterling",     isoCode:"GBP", paise:"Pence"},
  "United Arab Emirates":{symbol:"AED",name:"UAE Dirham",          isoCode:"AED", paise:"Fils"},
  "Australia":            {symbol:"A$", name:"Australian Dollar",   isoCode:"AUD", paise:"Cents"},
  "Canada":               {symbol:"C$", name:"Canadian Dollar",     isoCode:"CAD", paise:"Cents"},
  "Germany":              {symbol:"€",  name:"Euro",                isoCode:"EUR", paise:"Cents"},
  "France":               {symbol:"€",  name:"Euro",                isoCode:"EUR", paise:"Cents"},
  "Japan":                {symbol:"¥",  name:"Japanese Yen",        isoCode:"JPY", paise:"Sen"},
  "China":                {symbol:"¥",  name:"Chinese Yuan",        isoCode:"CNY", paise:"Fen"},
  "Saudi Arabia":         {symbol:"SAR",name:"Saudi Riyal",         isoCode:"SAR", paise:"Halalah"},
  "Singapore":            {symbol:"S$", name:"Singapore Dollar",    isoCode:"SGD", paise:"Cents"},
  "New Zealand":          {symbol:"NZ$",name:"New Zealand Dollar",  isoCode:"NZD", paise:"Cents"},
  "South Africa":         {symbol:"R",  name:"South African Rand",  isoCode:"ZAR", paise:"Cents"},
  "Malaysia":             {symbol:"RM", name:"Malaysian Ringgit",   isoCode:"MYR", paise:"Sen"},
  "Bangladesh":           {symbol:"৳",  name:"Bangladeshi Taka",   isoCode:"BDT", paise:"Poisha"},
  "Nepal":                {symbol:"Rs", name:"Nepalese Rupee",      isoCode:"NPR", paise:"Paisa"},
  "Sri Lanka":            {symbol:"Rs", name:"Sri Lankan Rupee",    isoCode:"LKR", paise:"Cents"},
  "Pakistan":             {symbol:"₨",  name:"Pakistani Rupee",     isoCode:"PKR", paise:"Paisa"},
  "Indonesia":            {symbol:"Rp", name:"Indonesian Rupiah",   isoCode:"IDR", paise:"Sen"},
  "Thailand":             {symbol:"฿",  name:"Thai Baht",           isoCode:"THB", paise:"Satang"},
  "Kuwait":               {symbol:"KD", name:"Kuwaiti Dinar",       isoCode:"KWD", paise:"Fils"},
  "Qatar":                {symbol:"QR", name:"Qatari Riyal",        isoCode:"QAR", paise:"Dirham"},
  "Bahrain":              {symbol:"BD", name:"Bahraini Dinar",      isoCode:"BHD", paise:"Fils"},
  "Oman":                 {symbol:"RO", name:"Omani Rial",          isoCode:"OMR", paise:"Baisa"},
  "Nigeria":              {symbol:"₦",  name:"Nigerian Naira",      isoCode:"NGN", paise:"Kobo"},
  "Kenya":                {symbol:"KSh",name:"Kenyan Shilling",     isoCode:"KES", paise:"Cents"},
  "Ethiopia":             {symbol:"Br", name:"Ethiopian Birr",      isoCode:"ETB", paise:"Cents"},
  "Mexico":               {symbol:"MX$",name:"Mexican Peso",        isoCode:"MXN", paise:"Cents"},
  "Brazil":               {symbol:"R$", name:"Brazilian Real",      isoCode:"BRL", paise:"Cents"},
};

const COUNTRY_DATA: Record<string, string[]> = {
  "India": [
    "Andaman and Nicobar Islands","Andhra Pradesh","Arunachal Pradesh","Assam","Bihar",
    "Chandigarh","Chhattisgarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Goa",
    "Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir","Jharkhand","Karnataka",
    "Kerala","Ladakh","Lakshadweep","Madhya Pradesh","Maharashtra","Manipur","Meghalaya",
    "Mizoram","Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim",
    "Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"
  ],
  "USA": [
    "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
    "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
    "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
    "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
    "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
    "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
    "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
    "Wisconsin","Wyoming","District of Columbia"
  ],
  "United Kingdom": [
    "Bedfordshire","Berkshire","Bristol","Buckinghamshire","Cambridgeshire",
    "Cheshire","City of London","Cornwall","Cumbria","Derbyshire","Devon",
    "Dorset","Durham","East Riding of Yorkshire","East Sussex","Essex",
    "Gloucestershire","Greater London","Greater Manchester","Hampshire","Herefordshire",
    "Hertfordshire","Isle of Wight","Kent","Lancashire","Leicestershire","Lincolnshire",
    "Merseyside","Norfolk","North Yorkshire","Northamptonshire","Northumberland",
    "Nottinghamshire","Oxfordshire","Shropshire","Somerset","South Yorkshire",
    "Staffordshire","Suffolk","Surrey","Tyne and Wear","Warwickshire",
    "West Midlands","West Sussex","West Yorkshire","Wiltshire","Worcestershire",
    "Scotland - Aberdeen City","Scotland - Dundee City","Scotland - Edinburgh City",
    "Scotland - Glasgow City","Scotland - Highland","Scotland - Fife",
    "Wales - Cardiff","Wales - Swansea","Wales - Newport",
    "Northern Ireland - Belfast","Northern Ireland - Derry"
  ],
  "United Arab Emirates": [
    "Abu Dhabi","Ajman","Dubai","Fujairah","Ras Al Khaimah","Sharjah","Umm Al Quwain"
  ],
  "Australia": [
    "Australian Capital Territory","New South Wales","Northern Territory",
    "Queensland","South Australia","Tasmania","Victoria","Western Australia"
  ],
  "Canada": [
    "Alberta","British Columbia","Manitoba","New Brunswick",
    "Newfoundland and Labrador","Northwest Territories","Nova Scotia",
    "Nunavut","Ontario","Prince Edward Island","Quebec","Saskatchewan","Yukon"
  ],
  "Germany": [
    "Baden-Württemberg","Bavaria","Berlin","Brandenburg","Bremen","Hamburg",
    "Hesse","Lower Saxony","Mecklenburg-Vorpommern","North Rhine-Westphalia",
    "Rhineland-Palatinate","Saarland","Saxony","Saxony-Anhalt",
    "Schleswig-Holstein","Thuringia"
  ],
  "France": [
    "Auvergne-Rhône-Alpes","Bourgogne-Franche-Comté","Brittany","Centre-Val de Loire",
    "Corsica","Grand Est","Hauts-de-France","Île-de-France","Normandy",
    "Nouvelle-Aquitaine","Occitanie","Pays de la Loire","Provence-Alpes-Côte d'Azur"
  ],
  "China": [
    "Anhui","Beijing","Chongqing","Fujian","Gansu","Guangdong","Guangxi",
    "Guizhou","Hainan","Hebei","Heilongjiang","Henan","Hong Kong","Hubei",
    "Hunan","Inner Mongolia","Jiangsu","Jiangxi","Jilin","Liaoning","Macau",
    "Ningxia","Qinghai","Shaanxi","Shandong","Shanghai","Shanxi","Sichuan",
    "Tianjin","Tibet","Xinjiang","Yunnan","Zhejiang"
  ],
  "Japan": [
    "Aichi","Akita","Aomori","Chiba","Ehime","Fukui","Fukuoka","Fukushima",
    "Gifu","Gunma","Hiroshima","Hokkaido","Hyogo","Ibaraki","Ishikawa",
    "Iwate","Kagawa","Kagoshima","Kanagawa","Kochi","Kumamoto","Kyoto",
    "Mie","Miyagi","Miyazaki","Nagano","Nagasaki","Nara","Niigata","Oita",
    "Okayama","Okinawa","Osaka","Saga","Saitama","Shiga","Shimane",
    "Shizuoka","Tochigi","Tokushima","Tokyo","Tottori","Toyama","Wakayama",
    "Yamagata","Yamaguchi","Yamanashi"
  ],
  "Saudi Arabia": [
    "Al Bahah","Al Jawf","Al Madinah","Al Qassim","Asir",
    "Eastern Province","Ha'il","Jazan","Makkah","Najran",
    "Northern Borders","Riyadh","Tabuk"
  ],
  "Singapore": ["Central","East","North","North-East","West"],
  "Malaysia": [
    "Johor","Kedah","Kelantan","Kuala Lumpur","Labuan","Melaka","Negeri Sembilan",
    "Pahang","Perak","Perlis","Pulau Pinang","Putrajaya","Sabah","Sarawak","Selangor","Terengganu"
  ],
  "New Zealand": [
    "Auckland","Bay of Plenty","Canterbury","Gisborne","Hawke's Bay",
    "Manawatu-Whanganui","Marlborough","Nelson","Northland","Otago",
    "Southland","Taranaki","Tasman","Waikato","Wellington","West Coast"
  ],
  "South Africa": [
    "Eastern Cape","Free State","Gauteng","KwaZulu-Natal",
    "Limpopo","Mpumalanga","North West","Northern Cape","Western Cape"
  ],
  "Indonesia": [
    "Aceh","Bali","Bangka Belitung","Banten","Bengkulu","Central Java",
    "Central Kalimantan","Central Sulawesi","East Java","East Kalimantan",
    "East Nusa Tenggara","Gorontalo","Jakarta","Jambi","Lampung","Maluku",
    "North Kalimantan","North Maluku","North Sulawesi","North Sumatra",
    "Papua","Riau","South Kalimantan","South Sulawesi","South Sumatra",
    "Southeast Sulawesi","West Java","West Kalimantan","West Nusa Tenggara",
    "West Papua","West Sulawesi","West Sumatra","Yogyakarta"
  ],
  "Thailand": [
    "Amnat Charoen","Ang Thong","Bangkok","Bueng Kan","Buriram","Chachoengsao",
    "Chai Nat","Chaiyaphum","Chanthaburi","Chiang Mai","Chiang Rai","Chonburi",
    "Chumphon","Kalasin","Kamphaeng Phet","Kanchanaburi","Khon Kaen","Krabi",
    "Lampang","Lamphun","Loei","Lopburi","Mae Hong Son","Maha Sarakham",
    "Mukdahan","Nakhon Nayok","Nakhon Pathom","Nakhon Phanom","Nakhon Ratchasima",
    "Nakhon Sawan","Nakhon Si Thammarat","Nan","Narathiwat","Nong Bua Lam Phu",
    "Nong Khai","Nonthaburi","Pathum Thani","Pattani","Phang Nga","Phatthalung",
    "Phayao","Phetchabun","Phetchaburi","Phichit","Phitsanulok","Phra Nakhon Si Ayutthaya",
    "Phrae","Phuket","Prachinburi","Prachuap Khiri Khan","Ranong","Ratchaburi",
    "Rayong","Roi Et","Sa Kaeo","Sakon Nakhon","Samut Prakan","Samut Sakhon",
    "Samut Songkhram","Saraburi","Satun","Sing Buri","Sisaket","Songkhla",
    "Sukhothai","Suphan Buri","Surat Thani","Surin","Tak","Trang","Trat",
    "Ubon Ratchathani","Udon Thani","Uthai Thani","Uttaradit","Yala","Yasothon"
  ],
  "Kuwait":  ["Al Ahmadi","Al Asimah","Al Farwaniyah","Al Jahra","Hawalli","Mubarak Al-Kabeer"],
  "Qatar":   ["Ad Dawhah","Al Khawr","Al Rayyan","Al Wakrah","Ash Shamal","Az Za'ayen","Madinat ash Shamal","Umm Salal"],
  "Bahrain": ["Capital","Central","Muharraq","Northern","Southern"],
  "Oman":    ["Ad Dakhiliyah","Ad Dhahirah","Al Batinah North","Al Batinah South","Al Buraymi","Al Wusta","Ash Sharqiyyah North","Ash Sharqiyyah South","Dhofar","Musandam","Muscat"],
  "Bangladesh": [
    "Barisal","Chittagong","Dhaka","Khulna","Mymensingh","Rajshahi","Rangpur","Sylhet"
  ],
  "Nepal": [
    "Bagmati","Gandaki","Karnali","Koshi","Lumbini","Madhesh","Sudurpashchim"
  ],
  "Sri Lanka": [
    "Central","Eastern","North Central","Northern","North Western",
    "Sabaragamuwa","Southern","Uva","Western"
  ],
  "Pakistan": [
    "Azad Kashmir","Balochistan","Federal Capital","Gilgit-Baltistan",
    "Khyber Pakhtunkhwa","Punjab","Sindh"
  ],
  "Brazil": [
    "Acre","Alagoas","Amapá","Amazonas","Bahia","Ceará","Distrito Federal",
    "Espírito Santo","Goiás","Maranhão","Mato Grosso","Mato Grosso do Sul",
    "Minas Gerais","Pará","Paraíba","Paraná","Pernambuco","Piauí",
    "Rio de Janeiro","Rio Grande do Norte","Rio Grande do Sul","Rondônia",
    "Roraima","Santa Catarina","São Paulo","Sergipe","Tocantins"
  ],
  "Mexico": [
    "Aguascalientes","Baja California","Baja California Sur","Campeche",
    "Chiapas","Chihuahua","Ciudad de Mexico","Coahuila","Colima","Durango",
    "Guanajuato","Guerrero","Hidalgo","Jalisco","Mexico","Michoacan",
    "Morelos","Nayarit","Nuevo Leon","Oaxaca","Puebla","Queretaro",
    "Quintana Roo","San Luis Potosi","Sinaloa","Sonora","Tabasco",
    "Tamaulipas","Tlaxcala","Veracruz","Yucatan","Zacatecas"
  ],
  "Nigeria": [
    "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
    "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","Federal Capital Territory",
    "Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi",
    "Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo",
    "Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"
  ],
  "Kenya": [
    "Baringo","Bomet","Bungoma","Busia","Elgeyo Marakwet","Embu","Garissa",
    "Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi",
    "Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos",
    "Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a",
    "Nairobi","Nakuru","Nandi","Narok","Nyamira","Nyandarua","Nyeri",
    "Samburu","Siaya","Taita Taveta","Tana River","Tharaka Nithi","Trans Nzoia",
    "Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot"
  ],
  "Ethiopia":   ["Addis Ababa","Afar","Amhara","Benishangul-Gumuz","Dire Dawa","Gambella","Harari","Oromia","Sidama","SNNPR","Somali","Tigray"],
};
const ALL_COUNTRIES = Object.keys(COUNTRY_DATA).sort();
const VOUCHER_TYPES_DEFAULT = ['Contra','Payment','Receipt','Journal','Sales','Purchase','Credit Note','Debit Note','Sales Quotation','Reversing Journal','Memorandum'];

// ==================== INITIAL DUMMY DATA ====================
const INIT_LEDGERS: Ledger[] = [];

const INIT_STOCK_ITEMS: StockItem[] = [];

const INIT_UNITS: UnitData[] = [
  { id:-1, companyId:-1, name:"Nos",   symbol:"Nos",   formalName:"Numbers",     uqc:"NOS", decimalPlaces:0 },
  { id:-2, companyId:-1, name:"Pcs",   symbol:"Pcs",   formalName:"Pieces",      uqc:"PCS", decimalPlaces:0 },
  { id:-3, companyId:-1, name:"Kg",    symbol:"Kg",    formalName:"Kilogram",    uqc:"KGS", decimalPlaces:2 },
  { id:-4, companyId:-1, name:"Gms",   symbol:"Gms",   formalName:"Grams",       uqc:"GMS", decimalPlaces:0 },
  { id:-5, companyId:-1, name:"Ltr",   symbol:"Ltr",   formalName:"Litre",       uqc:"LTR", decimalPlaces:2 },
  { id:-6, companyId:-1, name:"Mtr",   symbol:"Mtr",   formalName:"Meter",       uqc:"MTR", decimalPlaces:2 },
  { id:-7, companyId:-1, name:"Set",   symbol:"Set",   formalName:"Set",         uqc:"SET", decimalPlaces:0 },
  { id:-8, companyId:-1, name:"Bdl",   symbol:"Bdl",   formalName:"Bundle",      uqc:"BDL", decimalPlaces:0 },
  { id:-9, companyId:-1, name:"Cft",   symbol:"Cft",   formalName:"Cubic Feet",  uqc:"CFT", decimalPlaces:2 },
  { id:-10, companyId:-1, name:"Sqft", symbol:"Sqft",  formalName:"Square Feet", uqc:"SQF", decimalPlaces:2 },
  { id:-11, companyId:-1, name:"Box",  symbol:"Box",   formalName:"Boxes",       uqc:"BOX", decimalPlaces:0 },
  { id:-12, companyId:-1, name:"Dzn",  symbol:"Dzn",   formalName:"Dozen",       uqc:"DZN", decimalPlaces:0 },
  { id:-13, companyId:-1, name:"Btl",  symbol:"Btl",   formalName:"Bottles",     uqc:"BTL", decimalPlaces:0 },
  { id:-14, companyId:-1, name:"Bag",  symbol:"Bag",   formalName:"Bags",        uqc:"BAG", decimalPlaces:0 },
  { id:-15, companyId:-1, name:"Tons", symbol:"Tons",  formalName:"Metric Tons", uqc:"MTS", decimalPlaces:2 },
  { id:-16, companyId:-1, name:"Kits", symbol:"Kits",  formalName:"Kits",        uqc:"KIT", decimalPlaces:0 },
  { id:-17, companyId:-1, name:"Pack", symbol:"Pack",  formalName:"Packs",       uqc:"PAC", decimalPlaces:0 },
  { id:-18, companyId:-1, name:"Rol",  symbol:"Rol",   formalName:"Rolls",       uqc:"ROL", decimalPlaces:0 },
  { id:-19, companyId:-1, name:"Ctn",  symbol:"Ctn",   formalName:"Cartons",     uqc:"CTN", decimalPlaces:0 },
  { id:-20, companyId:-1, name:"Pair", symbol:"Pair",  formalName:"Pairs",       uqc:"PAR", decimalPlaces:0 }
];

const INIT_STOCK_GROUPS: StockGroup[] = [];

const INIT_VOUCHER_TYPES: VoucherTypeData[] = VOUCHER_TYPES_DEFAULT.map((v, i) => ({
  id: i+1, companyId:1, name: v, type: v, abbreviation: v.slice(0,3).toUpperCase(), numberingMethod: "Automatic", startNumber: 1
}));

const INIT_CURRENCIES: CurrencyData[] = [
  { id:1, companyId:1, name:"Indian Rupee", symbol:"₹", isoCode:"INR", decimalPlaces:2 },
  { id:2, companyId:1, name:"US Dollar",    symbol:"$", isoCode:"USD", decimalPlaces:2 },
];

const INIT_COMPANIES: Company[] = [];

const INIT_VOUCHERS: Voucher[] = [];

// ==================== UTILITY FUNCTIONS ====================
function round2(n: number) {
  if (n === null || n === undefined || isNaN(n)) return 0;
  return Math.round(n * 100) / 100;
}

function fmt(n: number) {
  if (n === null || n === undefined || isNaN(n)) return '0.00';
  return Math.abs(round2(n)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getDaysRemainingText(expiryStr: string | Date | null | undefined) {
  if (!expiryStr) return '';
  const expiry = new Date(expiryStr);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Expired';
  if (diffDays === 1) return '1 day left';
  return `${diffDays} days left`;
}

function getLedgerClosingBalance(ledger: Ledger, vouchers: Voucher[]): number {
  if (!ledger) return 0;
  // If ledger has odLimit set and openingBalance is zero/null, use odLimit as initial base balance
  const opBal = (ledger.openingBalance && Math.abs(ledger.openingBalance) > 0) 
    ? ledger.openingBalance 
    : (ledger.odLimit || 0);

  let bal = ledger.balanceType === 'Dr' ? opBal : -opBal;
  for (const v of vouchers) {
    if (!v || !v.entries || v.type === 'Sales Quotation' || v.type === 'Quotation') continue;
    for (const e of v.entries) {
      if (e.ledgerId === ledger.id || (e.ledgerName && e.ledgerName.trim().toLowerCase() === ledger.name.trim().toLowerCase())) {
        bal += e.entryType === 'Dr' ? e.amount : -e.amount;
      }
    }
  }
  return bal;
}

function getLedgerEntries(ledgerId: number, vouchers: Voucher[]): { voucher: Voucher; entry: VoucherEntry }[] {
  const result: { voucher: Voucher; entry: VoucherEntry }[] = [];
  for (const v of vouchers) {
    if (!v || !v.entries || v.type === 'Sales Quotation' || v.type === 'Quotation') continue;
    for (const e of v.entries) {
      if (e.ledgerId === ledgerId) result.push({ voucher: v, entry: e });
    }
  }
  return result;
}

// Group balances for Balance Sheet
function groupLedgersByParent(ledgers: Ledger[], vouchers: Voucher[]) {
  const groups: Record<string, { ledger: Ledger; balance: number }[]> = {};
  for (const l of ledgers) {
    if (!groups[l.groupName]) groups[l.groupName] = [];
    groups[l.groupName].push({ ledger: l, balance: getLedgerClosingBalance(l, vouchers) });
  }
  return groups;
}

function getVoucherPartyDisplayName(v: Voucher | null | undefined): string {
  if (!v) return '-';
  const isSalesOrPurchaseAc = (s?: string) => !s || ['sales a/c', 'sales a/c.', 'sales ac', 'sales', 'purchase a/c', 'purchase a/c.', 'purchase ac', 'purchase'].includes(s.trim().toLowerCase());

  const pd = v.partyDetails;
  if (pd?.buyerName && !isSalesOrPurchaseAc(pd.buyerName)) return pd.buyerName;
  if (pd?.buyerMailingName && !isSalesOrPurchaseAc(pd.buyerMailingName)) return pd.buyerMailingName;
  if (v.partyName && !isSalesOrPurchaseAc(v.partyName)) return v.partyName;

  const partyEnt = (v.entries || []).find((e: any) => {
    const name = e.ledgerName || e.ledger?.name || '';
    return !isSalesOrPurchaseAc(name) && !name.includes('GST Payable') && name !== 'Round Off';
  });
  return partyEnt?.ledgerName || (v.partyName && !isSalesOrPurchaseAc(v.partyName) ? v.partyName : '-') || '-';
}

// ==================== MAIN APP ====================
const parseDate = (d: string | Date | null | undefined): Date => {
  if (!d) return new Date(1970, 0, 1);
  if (d instanceof Date) return d;
  const s = String(d).trim();
  if (!s) return new Date(1970, 0, 1);

  // Normalize delimiters (/ and . -> -)
  const normalized = s.replace(/[\.\/]/g, '-').trim();
  const parts = normalized.split('-');

  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    january: 0, february: 1, march: 2, april: 3, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };

  if (parts.length === 3) {
    let p1 = parts[0].trim();
    let p2 = parts[1].trim();
    let p3 = parts[2].trim();

    // Check if ISO format YYYY-MM-DD
    if (p1.length === 4 && !isNaN(parseInt(p1))) {
      const year = parseInt(p1);
      const month = (parseInt(p2) || 1) - 1;
      const day = parseInt(p3) || 1;
      return new Date(year, month, day);
    }

    // Standard DD-MMM-YYYY or DD-MM-YYYY
    const day = parseInt(p1) || 1;
    let month = -1;

    const p2Lower = p2.toLowerCase();
    if (monthMap[p2Lower] !== undefined) {
      month = monthMap[p2Lower];
    } else {
      for (const [mName, mVal] of Object.entries(monthMap)) {
        if (p2Lower.startsWith(mName)) {
          month = mVal;
          break;
        }
      }
    }

    if (month === -1) {
      const mNum = parseInt(p2);
      if (!isNaN(mNum) && mNum >= 1 && mNum <= 12) {
        month = mNum - 1;
      }
    }

    if (month === -1) month = 0;

    let year = parseInt(p3) || new Date().getFullYear();
    if (year < 100) year += 2000;

    return new Date(year, month, day);
  }

  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? new Date(1970, 0, 1) : parsed;
};

export default function App() {
  const [screen, setScreen] = useState<ScreenType>('GATEWAY_MAIN');
  const [history, setHistory] = useState<ScreenType[]>([]);
  const [altCReturnContext, setAltCReturnContext] = useState<{screen: ScreenType, field: string, rowIdx?: number, newItem?: any} | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(1);
  const [activeVoucher, setActiveVoucher] = useState<VoucherTypeKey>('Sales');
  const [alterItem, setAlterItem] = useState<any>(null);
  const [alterListType, setAlterListType] = useState('');
  const [reportLedgerId, setReportLedgerId] = useState<number | null>(null);
  const [reportGroupName, setReportGroupName] = useState<string>('');
  const [altCCtx, setAltCCtx] = useState<AltCContext | null>(null);
  const [gstr1DrillDown, setGstr1DrillDown] = useState<string | null>(null);
  const [gstr1DrillDownParty, setGstr1DrillDownParty] = useState<number | null>(null);
  const [gstr1SelectedRow, setGstr1SelectedRow] = useState<number>(0);
  const [gstr1SelectedVchIdx, setGstr1SelectedVchIdx] = useState<number>(0);
  const [showCompanySelect, setShowCompanySelect] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showGST, setShowGST] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  });
  const [companyModalIdx, setCompanyModalIdx] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDirHandle, setExportDirHandle] = useState<any>(null);
  const [exportDirPath, setExportDirPath] = useState('C:\\Downloads');
  const lastFocusRef = useRef<HTMLElement|null>(null);
  const isInitializingRef = useRef(false);
  const [isMounted, setIsMounted] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{type:string, id:number, name:string}|null>(null);
  const [pwdPrompt, setPwdPrompt] = useState<{company: Company, action: 'open' | 'alter'} | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const authStatus = authClient.isAuthenticated();
    setIsAuthenticated(authStatus);
    if (authStatus) {
      const user = authClient.getUser();
      setCurrentUser(user);
      if (user && user.subscriptionExpiry) {
        if (new Date(user.subscriptionExpiry) < new Date()) {
          setSubscriptionExpired(true);
        }
      }
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setCurrentUser(authClient.getUser());
    // Refresh page to clear any old state and reload user data
    window.location.reload();
  };

  const handleLogout = () => {
    authClient.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    window.location.reload();
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleShowDate = () => {
    lastFocusRef.current = document.activeElement as HTMLElement;
    setShowDate(true);
  };

  const handleCloseDate = () => {
    setShowDate(false);
    setTimeout(() => lastFocusRef.current?.focus(), 80);
  };

  const handleExcelExport = async (customFileName: string) => {
    const table = document.querySelector('.report-table') as HTMLTableElement;
    if (!table) {
      alert("No report table found on this screen to export.");
      return;
    }

    const isCsv = customFileName.toLowerCase().endsWith('.csv');
    const finalFileName = isCsv ? customFileName : (customFileName.endsWith('.xls') ? customFileName : customFileName + '.xls');

    if (isCsv) {
      // Generate CSV data from table
      let csvContent = "";
      const rows = Array.from(table.rows);
      rows.forEach(row => {
        const cols = Array.from(row.cells).map(cell => `"${cell.innerText.replace(/"/g, '""')}"`);
        csvContent += cols.join(",") + "\n";
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFileName;
      a.click();
      setSaveToast(`${finalFileName} exported!`);
      return;
    }

    const cleanScreen = screen.replace(/_/g, ' ');
    const reportTitle = cleanScreen === 'GATEWAY MAIN' ? 'FINANCIAL REPORT' : cleanScreen.toUpperCase();

    // Build the Excel HTML content
    let excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          .header-title { font-size: 22pt; font-weight: bold; color: #1c5282; text-align: center; }
          .header-sub { font-size: 11pt; text-align: center; }
          .report-title { font-size: 16pt; font-weight: bold; text-decoration: underline; text-align: center; }
          .period-title { font-size: 10pt; font-style: italic; text-align: center; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #f2f2f2; border: 1px solid #333; font-weight: bold; padding: 10px; }
          td { border: 1px solid #333; padding: 8px; }
          .footer-sig { font-size: 11pt; font-weight: bold; text-align: center; }
          .footer-line { border-top: 1px solid #333; font-size: 10pt; text-align: center; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="${table.rows[0].cells.length}" class="header-title">${activeCompany?.name || 'LEDGERX COMPANY'}</td></tr>
          <tr><td colspan="${table.rows[0].cells.length}" class="header-sub">${activeCompany?.address || ''}</td></tr>
          <tr><td colspan="${table.rows[0].cells.length}" class="header-sub">GSTIN: ${activeCompany?.gstin || ''} | Phone: ${activeCompany?.telephone || ''}</td></tr>
          <tr><td colspan="${table.rows[0].cells.length}" class="header-sub" style="color:#d9534f; font-weight:bold;">Financial Year: ${activeCompany?.financialYearStart || '2026-27'}</td></tr>
          <tr><td colspan="${table.rows[0].cells.length}"></td></tr>
          <tr><td colspan="${table.rows[0].cells.length}" class="report-title">${reportTitle}</td></tr>
          <tr><td colspan="${table.rows[0].cells.length}" class="period-title">Report Period: ${currentPeriod?.start} to ${currentPeriod?.end}</td></tr>
          <tr><td colspan="${table.rows[0].cells.length}"></td></tr>
        </table>

        ${table.outerHTML}

        <br/><br/>
        <table>
          <tr>
            <td colspan="2" class="footer-sig">For ${activeCompany?.name || 'LEDGERX COMPANY'}</td>
            <td colspan="${table.rows[0].cells.length - 4}"></td>
            <td colspan="2" class="footer-sig">Verified & Audited</td>
          </tr>
          <tr><td colspan="${table.rows[0].cells.length}"></td></tr>
          <tr><td colspan="${table.rows[0].cells.length}"></td></tr>
          <tr>
            <td colspan="2" class="footer-line">Authorized Signatory</td>
            <td colspan="${table.rows[0].cells.length - 4}"></td>
            <td colspan="2" class="footer-line">Chartered Accountant</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel' });
    
    try {
      if (exportDirHandle) {
        const fileHandle = await exportDirHandle.getFileHandle(finalFileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        alert("Excel file successfully exported to selected folder!");
      } else {
        // Fallback for standard download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error('Excel export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };


  const handlePdfExport = async (customFileName: string) => {
    if (!(window as any).html2pdf) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      document.head.appendChild(script);
      await new Promise(r => script.onload = r);
    }
    
    const table = document.querySelector('.report-table') as HTMLTableElement;
    if (!table) {
      alert("No report table found on this screen to export.");
      return;
    }

    // BUILD HTML STRING MANUALLY FOR RELIABILITY
    let tableHtml = `<table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:30px;">`;
    
    // Add Header
    const thead = table.querySelector('thead');
    if (thead) {
      tableHtml += `<thead>`;
      Array.from(thead.rows).forEach(row => {
        tableHtml += `<tr style="background-color:#f2f2f2;">`;
        Array.from(row.cells).forEach(cell => {
          tableHtml += `<th style="border:1px solid #333; padding:8px; font-weight:bold; text-align:center;">${cell.innerText}</th>`;
        });
        tableHtml += `</tr>`;
      });
      tableHtml += `</thead>`;
    }

    // Add Body
    const tbody = table.querySelector('tbody');
    if (tbody) {
      tableHtml += `<tbody>`;
      Array.from(tbody.rows).forEach(row => {
        tableHtml += `<tr>`;
        Array.from(row.cells).forEach(cell => {
          const textAlign = cell.style.textAlign || 'left';
          const fontWeight = cell.style.fontWeight || 'normal';
          tableHtml += `<td style="border:1px solid #333; padding:6px 10px; text-align:${textAlign}; font-weight:${fontWeight};">${cell.innerText}</td>`;
        });
        tableHtml += `</tr>`;
      });
      tableHtml += `</tbody>`;
    }

    // Add Footer
    const tfoot = table.querySelector('tfoot');
    if (tfoot) {
      tableHtml += `<tfoot>`;
      Array.from(tfoot.rows).forEach(row => {
        tableHtml += `<tr style="background-color:#f9f9f9; font-weight:bold;">`;
        Array.from(row.cells).forEach(cell => {
          const textAlign = cell.style.textAlign || 'left';
          tableHtml += `<td style="border:1px solid #333; padding:8px 10px; text-align:${textAlign};">${cell.innerText}</td>`;
        });
        tableHtml += `</tr>`;
      });
      tableHtml += `</tfoot>`;
    }
    tableHtml += `</table>`;

    const cleanScreen = screen.replace(/_/g, ' ');
    const reportTitle = cleanScreen === 'GATEWAY MAIN' ? 'FINANCIAL REPORT' : cleanScreen.toUpperCase();
    
    // BUILD THE FINAL DOCUMENT HTML
    const fullHtml = `
      <div style="padding:40px; font-family:Arial, sans-serif; background:#fff; color:#000; width:720px; margin:0 auto;">
        <div style="text-align:center; margin-bottom:30px; border-bottom:3px double #333; padding-bottom:15px;">
          <h1 style="margin:0; font-size:28px; color:#1c5282; font-weight:bold;">${activeCompany?.name || 'LEDGERX COMPANY'}</h1>
          <p style="margin:5px 0; font-size:13px; font-weight:bold;">${activeCompany?.address || ''}</p>
          <p style="margin:2px 0; font-size:12px;">GSTIN: ${activeCompany?.gstin || ''} | Phone: ${activeCompany?.telephone || ''}</p>
          <p style="margin:10px 0 0 0; font-size:14px; font-weight:bold; color:#d9534f;">Financial Year: ${activeCompany?.financialYearStart || '2026-27'}</p>
        </div>
        
        <div style="text-align:center; margin-bottom:25px;">
          <h2 style="margin:0; font-size:20px; text-decoration:underline; font-weight:bold;">${reportTitle}</h2>
          <p style="margin:8px 0; font-size:12px; font-style:italic;">Report Period: ${currentPeriod?.start} to ${currentPeriod?.end}</p>
        </div>

        ${tableHtml}

        <div style="margin-top:80px; display:flex; justify-content:space-between;">
          <div style="text-align:center; width:220px;">
            <p style="margin-bottom:50px; font-weight:bold;">For ${activeCompany?.name || 'LEDGERX COMPANY'}</p>
            <div style="border-top:1px solid #333; padding-top:5px; font-size:12px;">Authorized Signatory</div>
          </div>
          
          <div style="text-align:center; width:220px;">
            <p style="margin-bottom:50px; font-weight:bold;">Verified & Audited</p>
            <div style="border-top:1px solid #333; padding-top:5px; font-size:12px;">Chartered Accountant</div>
          </div>
        </div>
        
        <div style="margin-top:30px; font-size:10px; color:#666; text-align:center; border-top:1px solid #eee; padding-top:10px;">
          This is a computer generated document and does not require a physical signature if verified online.
        </div>
      </div>
    `;

    const finalFileName = customFileName.endsWith('.pdf') ? customFileName : customFileName + '.pdf';
    
    try {
      const opt = {
        margin: 10,
        filename: finalFileName,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      if (exportDirHandle) {
        const pdfBlob = await (window as any).html2pdf().set(opt).from(fullHtml).output('blob');
        const fileHandle = await exportDirHandle.getFileHandle(finalFileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(pdfBlob);
        await writable.close();
        alert("PDF exported successfully in C.A. format!");
      } else {
         await (window as any).html2pdf().set(opt).from(fullHtml).save();
      }
    } catch(err: any) {
      console.error('PDF export failed:', err);
      alert("PDF generation failed. Checking table data...");
    } finally {
      setIsExporting(false);
    }


  };


  const handleEmailSend = (to: string, subject: string, bodyText: string) => {
    const table = document.querySelector('.report-table') as HTMLTableElement;
    let fallbackText = "Please find the report below:\n\n";
    if (table) {
      for (let i = 0; i < table.rows.length; i++) {
        const rowData = [];
        for (let j = 0; j < table.rows[i].cells.length; j++) {
          rowData.push(table.rows[i].cells[j].innerText);
        }
        fallbackText += rowData.join(' | ') + '\n';
      }
    } else {
      fallbackText += "No report data available on this screen.";
    }
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText + '\n\n' + fallbackText)}`;
    window.location.href = mailto;
  };


  // PERSISTENCE HELPERS
  const getStored = useCallback((key: string, defaultValue: any) => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const data = localStorage.getItem('tally_' + key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error("Error loading " + key, e);
      return defaultValue;
    }
  }, []);

  // ALL MASTER DATA IN STATE
  const [companies,     setCompanies]     = useState<Company[]>([]);
  const [allLedgers,    setAllLedgers]    = useState<Ledger[]>([]);
  const [allGroups,     setAllGroups]     = useState<StockGroup[]>(() => TALLY_GROUPS.map((g, i) => ({ id: i + 1, companyId: -1, name: g, under: 'Primary' })));
  const [allStockGroups, setAllStockGroups] = useState<StockGroup[]>([]);
  const [allStockCategories, setAllStockCategories] = useState<StockCategory[]>([]);
  const [allStockItems, setAllStockItems]   = useState<StockItem[]>([]);
  const [allUnits,      setAllUnits]      = useState<UnitData[]>([]);
  const [allGodowns,    setAllGodowns]    = useState<GodownData[]>([]);
  const [allVoucherTypes, setAllVoucherTypes] = useState<VoucherTypeData[]>([]);
  const [allCurrencies, setAllCurrencies]   = useState<CurrencyData[]>([]);
  const [allVouchers,   setAllVouchers]   = useState<Voucher[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState(() => getStored('currentPeriod', { start: '01-Apr-2026', end: '31-Mar-2027' }));
  const [showPeriod, setShowPeriod] = useState(false);

  // SYNC DATA WITH USER SESSION
  useEffect(() => {
    if (!isMounted || !isAuthenticated || !currentUser) return;

    const uId = currentUser.id;
    const getUStored = (key: string, def: any) => {
      try {
        const data = localStorage.getItem(`tally_u${uId}_${key}`);
        return data ? JSON.parse(data) : def;
      } catch (e) { return def; }
    };

    // Load user-specific local data
    const localCompanies = getUStored('companies', []);
    if (localCompanies.length > 0) setCompanies(localCompanies);
    
    const localLedgers = getUStored('allLedgers', []);
    if (localLedgers.length > 0) setAllLedgers(localLedgers);
    
    const localVouchers = getUStored('allVouchers', []);
    if (localVouchers.length > 0) setAllVouchers(localVouchers);

    const localActive = getUStored('activeCompany', null);
    if (localActive) setActiveCompany(localActive);

    const storedUnits = getUStored('allUnits', INIT_UNITS);
    const missingInitUnits = INIT_UNITS.filter(iu => !storedUnits.some((eu: any) => eu.name === iu.name && Number(eu.companyId) === -1));
    if (missingInitUnits.length > 0) {
      setAllUnits([...storedUnits, ...missingInitUnits]);
    } else {
      setAllUnits(storedUnits.length > 0 ? storedUnits : INIT_UNITS);
    }
    if (allStockItems.length === 0) setAllStockItems(getUStored('allStockItems', []));
    if (allGroups.length === 0) setAllGroups(getUStored('allGroups', TALLY_GROUPS.map((g, i) => ({ id: Date.now() + i, companyId: -1, name: g, under: 'Primary' }))));

    // Fetch from backend to sync
    const fetchCompanies = async () => {
      try {
        const res = await fetch('/api/companies', {
          headers: { 'Authorization': `Bearer ${authClient.getToken()}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.companies) {
            setCompanies(data.companies);
            // If we have an active company ID, re-sync it
            if (activeCompany) {
              const match = data.companies.find((c: any) => Number(c.id) === Number(activeCompany.id));
              if (match) setActiveCompany(match);
            }
          }
        }
      } catch (err) { console.error('Failed to sync companies:', err); }
    };
    fetchCompanies();
  }, [isMounted, isAuthenticated, currentUser?.id]);

  // Cloud Sync for all data when Company is opened
  useEffect(() => {
    if (!isAuthenticated || !activeCompany || !activeCompany.id) return;

    const syncData = async () => {
      try {
        const token = authClient.getToken();
        const cid = activeCompany.id;

        // 1. Fetch Ledgers
        const lRes = await fetch(`/api/ledgers?companyId=${cid}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const lData = await lRes.json();
        if (lRes.ok && lData.ledgers) {
          setAllLedgers(prev => [...prev.filter(l => Number(l.companyId) !== Number(cid)), ...lData.ledgers]);
        }

        // 2. Fetch Vouchers
        const vRes = await fetch(`/api/vouchers?companyId=${cid}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const vData = await vRes.json();
        if (vRes.ok && vData.vouchers) {
          setAllVouchers(prev => {
            const others = prev.filter(v => Number(v.companyId) !== Number(cid));
            const localOnly = prev.filter(v => Number(v.companyId) === Number(cid) && String(v.id).length >= 12);
            const mapped = vData.vouchers.map((v: any) => {
              const partySide = ['Sales', 'Payment', 'Debit Note'].includes(v.type) ? 'Dr' : 'Cr';
              const partyEntry = v.entries?.find((e: any) => e.entryType === partySide);
              // Compute total: party entry amount is the invoice total (includes tax + all charges)
              const computedTotal = partyEntry?.amount || (v.entries || []).reduce((max: number, e: any) => Math.max(max, e.amount || 0), 0) || 0;
              // Parse number from voucherNo (e.g. "SAL/001" -> 1, "1" -> 1)
              const vNoStr = String(v.voucherNo || '');
              const numMatch = vNoStr.match(/(\d+)\s*$/);
              const computedNumber = numMatch ? parseInt(numMatch[1]) : (v.id || 0);
              return {
                ...v,
                entries: (v.entries || []).map((e: any) => ({
                  ...e,
                  ledgerName: e.ledgerName || e.ledger?.name || '',
                })),
                  inventoryEntries: (v.inventoryEntries || []).map((ie: any) => ({
                    ...ie,
                    itemId: ie.stockItemId || ie.itemId,
                    itemName: ie.itemName || ie.stockItem?.name || '',
                    showInclTax: ie.stockItem?.showInclTax ?? false,
                    showAmtInclTax: ie.stockItem?.showAmtInclTax ?? false,
                  })),
                partyName: v.partyName || partyEntry?.ledger?.name || partyEntry?.ledgerName || 'Unknown Party',
                partyId: v.partyId || partyEntry?.ledgerId || partyEntry?.ledger?.id || 0,
                number: v.number || computedNumber,
                total: v.total || computedTotal,
                date: new Date(v.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
              };
            });
            return [...others, ...localOnly, ...mapped];
          });
        }

        // 3. Fetch Stock Items
        const siRes = await fetch(`/api/stock-items?companyId=${cid}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const siData = await siRes.json();
        if (siRes.ok && siData.items) {
          setAllStockItems(prev => [...prev.filter(si => Number(si.companyId) !== Number(cid)), ...siData.items]);
        }

        // 4. Fetch Units
        const uRes = await fetch(`/api/units?companyId=${cid}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const uData = await uRes.json();
        if (uRes.ok && uData.units) {
          setAllUnits(prev => [...prev.filter(u => Number(u.companyId) !== Number(cid)), ...uData.units]);
        }

        // 5. Fetch Stock Groups
        const sgRes = await fetch(`/api/stock-groups?companyId=${cid}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const sgData = await sgRes.json();
        if (sgRes.ok && sgData.groups) {
          setAllStockGroups(prev => [...prev.filter(sg => Number(sg.companyId) !== Number(cid)), ...sgData.groups]);
        }

      } catch (err) {
        console.error("Cloud Sync Error:", err);
      }
    };
    syncData();
  }, [activeCompany?.id, isAuthenticated]);

  // User-Specific Auto Save Effect
  useEffect(() => {
    if (!isMounted || !isAuthenticated || !currentUser) return;
    const uId = currentUser.id;
    const save = (key: string, data: any) => {
      try { localStorage.setItem(`tally_u${uId}_${key}`, JSON.stringify(data)); } catch (e) {}
    };
    save('companies', companies);
    save('allLedgers', allLedgers);
    save('allGroups', allGroups);
    save('allStockGroups', allStockGroups);
    save('allStockCategories', allStockCategories);
    save('allStockItems', allStockItems);
    save('allUnits', allUnits);
    save('allGodowns', allGodowns);
    save('allVoucherTypes', allVoucherTypes);
    save('allCurrencies', allCurrencies);
    save('allVouchers', allVouchers);
    save('activeCompany', activeCompany);
    save('currentPeriod', currentPeriod);
  }, [companies, allLedgers, allGroups, allStockGroups, allStockCategories, allStockItems, allUnits, allGodowns, allVoucherTypes, allCurrencies, allVouchers, activeCompany, currentPeriod, isMounted, isAuthenticated, currentUser?.id]);

  // Periodically Check Session (Single Session Enforcement)
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/check', {
          headers: { 'Authorization': `Bearer ${authClient.getToken()}` }
        });
        if (res.status === 401) {
          alert("Your session has expired or you have logged in from another device.");
          handleLogout();
        }
      } catch (err) {
        console.error("Session check failed", err);
      }
    };

    const interval = setInterval(checkSession, 15000); // Check every 15 seconds
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Fetch Companies from Backend with Auth Guard
  useEffect(() => {
    if (isAuthenticated) {
      const fetchCompanies = async () => {
        try {
          const res = await fetch('/api/companies', {
            headers: {
              'Authorization': `Bearer ${authClient.getToken()}`
            }
          });
          
          if (res.status === 401) {
            handleLogout();
            return;
          }

          const data = await res.json();
          if (res.ok && data.companies) {
            setCompanies(data.companies);
          }
        } catch (err) {
          console.error('Failed to fetch companies:', err);
        }
      };
      fetchCompanies();
    }
  }, [isAuthenticated]);

  // DERIVED DATA FOR ACTIVE COMPANY
  const ledgers        = useMemo(() => {
    if (!activeCompany) return [];
    return allLedgers.filter(l => 
      Number(l.companyId) === Number(activeCompany.id) && 
      !TALLY_GROUPS.includes(l.name)
    );
  }, [allLedgers, activeCompany]);
  const groups         = useMemo(() => {
    if (!activeCompany) return [];
    // Always include standard groups
    const standard = allGroups.filter(g => Number(g.companyId) === -1 || Number(g.companyId) === 1);
    // User requested that in 'Under' list, only standard groups should be selectable, not user-created ones.
    return standard;
  }, [allGroups, activeCompany]);
  const stockGroups    = useMemo(() => activeCompany ? allStockGroups.filter(sg => Number(sg.companyId) === Number(activeCompany.id)) : [], [allStockGroups, activeCompany]);
  const stockCategories = useMemo(() => activeCompany ? allStockCategories.filter(sc => Number(sc.companyId) === Number(activeCompany.id)) : [], [allStockCategories, activeCompany]);
  const stockItems     = useMemo(() => activeCompany ? allStockItems.filter(si => Number(si.companyId) === Number(activeCompany.id)) : [], [allStockItems, activeCompany]);
  const units          = useMemo(() => {
    if (!activeCompany) return [];
    const defaults = allUnits.filter(u => Number(u.companyId) === 1 || Number(u.companyId) === -1);
    const companyUnits = allUnits.filter(u => Number(u.companyId) === Number(activeCompany.id));
    const merged = [...defaults];
    companyUnits.forEach(cu => {
      const cuSym = (cu.symbol || cu.name || '').toLowerCase();
      if (!merged.find(du => (du.symbol || du.name || '').toLowerCase() === cuSym)) {
        merged.push(cu);
      }
    });
    return merged;
  }, [allUnits, activeCompany]);
  const godowns        = useMemo(() => activeCompany ? allGodowns.filter(g => Number(g.companyId) === Number(activeCompany.id)) : [], [allGodowns, activeCompany]);
  const voucherTypes   = useMemo(() => activeCompany ? allVoucherTypes.filter(vt => Number(vt.companyId) === Number(activeCompany.id)) : [], [allVoucherTypes, activeCompany]);
  
  const prevCompanyIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (activeCompany && activeCompany.id !== prevCompanyIdRef.current) {
      // Force return to Gateway whenever active company changes (selection, opening, creation)
      setScreen('GATEWAY_MAIN');
      setHistory([]);
      setAlterItem(null);
      setAlterListType('');
      setReportLedgerId(null);
      setReportGroupName('');
      setShowCompanySelect(false);
      setPwdPrompt(null);
      setSelectedIdx(1); 
      prevCompanyIdRef.current = activeCompany.id;
    }
  }, [activeCompany?.id]);

  // Ensure all standard ledgers exist for the active company
  useEffect(() => {
    if (!isAuthenticated || !activeCompany) return;
    const cid = activeCompany.id;
    if (allLedgers.length === 0) return;
    if (isInitializingRef.current) return;

    const standardLedgers = [
      { name: 'Cash', groupName: 'Cash-in-hand', openingBalance: 0, balanceType: 'Dr' },
      { name: 'Profit & Loss A/c', groupName: 'Primary', openingBalance: 0, balanceType: 'Cr' },
      { name: 'Round Off', groupName: 'Indirect Expenses', openingBalance: 0, balanceType: 'Dr' },
      { name: 'Discount Given', groupName: 'Indirect Expenses', openingBalance: 0, balanceType: 'Dr' },
      { name: 'Discount Received', groupName: 'Indirect Incomes', openingBalance: 0, balanceType: 'Cr' },
      { name: 'Transportation Charges', groupName: 'Direct Expenses', openingBalance: 0, balanceType: 'Dr' },
      { name: 'Freight Charges', groupName: 'Direct Expenses', openingBalance: 0, balanceType: 'Dr' },
      { name: 'CGST Payable', groupName: 'Duties & Taxes', openingBalance: 0, balanceType: 'Cr' },
      { name: 'SGST Payable', groupName: 'Duties & Taxes', openingBalance: 0, balanceType: 'Cr' },
      { name: 'IGST Payable', groupName: 'Duties & Taxes', openingBalance: 0, balanceType: 'Cr' },
      { name: 'Sales A/c', groupName: 'Sales Accounts', openingBalance: 0, balanceType: 'Cr' },
      { name: 'Purchase A/c', groupName: 'Purchase Accounts', openingBalance: 0, balanceType: 'Dr' },
    ];

    const companyLedgers = allLedgers.filter(l => Number(l.companyId) === Number(cid));
    const missingLedgers = standardLedgers.filter(sl => !companyLedgers.some(cl => cl.name === sl.name));

    if (missingLedgers.length > 0) {
      isInitializingRef.current = true;
      const initMissing = async () => {
        try {
          for (const l of missingLedgers) {
            const newLedger = {
              name: l.name,
              groupName: l.groupName,
              openingBalance: l.openingBalance,
              balanceType: l.balanceType
            };
            await saveMaster('ledger', newLedger);
          }
        } finally {
          isInitializingRef.current = false;
        }
      };
      initMissing();
    }
  }, [activeCompany?.id, allLedgers.length, isAuthenticated]);

  const currencies     = useMemo(() => activeCompany ? allCurrencies.filter(c => Number(c.companyId) === Number(activeCompany.id)) : [], [allCurrencies, activeCompany]);
  const vouchers       = useMemo(() => activeCompany ? allVouchers.filter(v => Number(v.companyId) === Number(activeCompany.id)) : [], [allVouchers, activeCompany]);
  const filteredVouchers = useMemo(() => {
    const ps = parseDate(currentPeriod.start);
    ps.setHours(0, 0, 0, 0);

    const pe = parseDate(currentPeriod.end);
    pe.setHours(23, 59, 59, 999);

    return vouchers.filter(v => {
      const vd = parseDate(v.date);
      return vd.getTime() >= ps.getTime() && vd.getTime() <= pe.getTime();
    });
  }, [vouchers, currentPeriod]);
  const [formKey, setFormKey] = useState(0);
  const [saveToast, setSaveToast] = useState<string|null>(null);
  const [printVoucher, setPrintVoucher] = useState<Voucher|null>(null);

  const resetForm = (savedName: string) => {
    setSaveToast(savedName + ' saved!');
    setTimeout(() => setSaveToast(null), 2500);
    setFormKey(k => k + 1);
  };

  const nav = (s: ScreenType, item?: any, typeName?: string) => {
    lastFocusRef.current = document.activeElement as HTMLElement;
    setHistory(h => [...h, screen]);
    setScreen(s);
    setAlterItem(item || null);
    if (typeName) setAlterListType(typeName);
    // When opening a saved voucher, show its original date in the form
    // When creating a new voucher, reset to today's date
    if (s === 'VOUCHER_ENTRY') {
      if (item?.date) {
        setCurrentDate(item.date);
      } else if (!item) {
        const today = new Date();
        setCurrentDate(today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'));
      }
    }
    if (s === 'GSTR1_REPORT') {
      setGstr1DrillDown(null);
      setGstr1DrillDownParty(null);
      setGstr1SelectedRow(0);
      setGstr1SelectedVchIdx(0);
    }
  };

  const handleOpenAltC = (ctx: AltCContext | null) => {
    if (ctx) lastFocusRef.current = document.activeElement as HTMLElement;
    setAltCCtx(ctx);
  };

  const goBack = useCallback(() => {
    setAltCCtx(null);
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setScreen(prev);
    } else {
      setScreen('GATEWAY_MAIN');
    }
    setAlterItem(null);
  }, [history]);

  // Save master
  const saveMaster = async (type: string, data: any, existingItem?: any) => {
    const token = authClient.getToken();
    const cid = activeCompany?.id || 0;
    const targetItem = existingItem || alterItem;

    if (targetItem && targetItem.id) {
      if (type === 'ledger') {
        try {
          const res = await fetch('/api/ledgers', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ id: targetItem.id, ...data })
          });
          if (res.ok) {
            const resData = await res.json();
            const updated = {
              ...targetItem,
              ...data,
              id: targetItem.id,
              openingBalance: resData.ledger?.openingBalance ?? data.openingBalance,
              pan: resData.ledger?.pan ?? data.pan,
            };
            setAllLedgers(p => p.map(x => x.id === targetItem.id ? { ...x, ...updated } : x));
            return updated;
          } else {
            const errData = await res.json().catch(() => ({}));
            const errMsg = errData.error || `Failed to update ledger on server`;
            alert(errMsg);
            return null;
          }
        } catch (e: any) {
          console.error("Ledger update failed", e);
          alert("Error connecting to server to update ledger: " + e.message);
          return null;
        }
      }
      else if (type === 'stockItem') {
        try {
          const res = await fetch('/api/stock-items', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ id: targetItem.id, companyId: cid, ...data })
          });
          if (res.ok) {
            const resData = await res.json();
            setAllStockItems(p => p.map(x => x.id === targetItem.id ? resData.item : x));
            return resData.item;
          } else {
            const errData = await res.json().catch(() => ({}));
            const errMsg = errData.error || `Failed to update stock item on server`;
            alert(errMsg);
            return null;
          }
        } catch (e: any) {
          console.error('Stock Item update error:', e);
          alert('Error connecting to server to update stock item: ' + e.message);
          return null;
        }
      }
      else if (type === 'group') setAllGroups(p => p.map(x => x.id === targetItem.id ? { ...x, ...data } : x));
      else if (type === 'stockGroup') {
        try {
          const res = await fetch('/api/stock-groups', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ id: targetItem.id, ...data })
          });
          if (res.ok) {
            const resData = await res.json();
            setAllStockGroups(p => p.map(x => x.id === targetItem.id ? resData.group : x));
            return resData.group;
          } else {
            const errText = await res.text();
            alert("Failed to update stock group: " + errText);
            return null;
          }
        } catch (e: any) {
          console.error("Stock Group update failed", e);
          alert("Error connecting to server to update stock group: " + e.message);
          return null;
        }
      }
      else if (type === 'unit') {
        try {
          const res = await fetch('/api/units', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ id: targetItem.id, ...data })
          });
          if (res.ok) {
            const resData = await res.json();
            setAllUnits(p => p.map(x => x.id === targetItem.id ? resData.unit : x));
            return resData.unit;
          } else {
            const errText = await res.text();
            alert("Failed to update unit: " + errText);
            return null;
          }
        } catch (e: any) {
          console.error("Unit update failed", e);
          alert("Error connecting to server to update unit: " + e.message);
          return null;
        }
      }
      else if (type === 'company') {
        setCompanies(p => p.map(x => x.id === targetItem.id ? { ...x, ...data } : x));
        if (activeCompany && activeCompany.id === targetItem.id) {
          setActiveCompany({ ...activeCompany, ...data });
        }
        try {
          const res = await fetch('/api/companies', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ id: targetItem.id, ...data })
          });
          if (res.ok) {
            return true;
          } else {
            const resData = await res.json();
            alert("Failed to update company: " + (resData.error || "Unknown error"));
            return false;
          }
        } catch (e: any) {
          alert("Error updating company: " + e.message);
          return false;
        }
      }
      return true;
    } else {
      const id = Date.now();
      if (type === 'ledger') {
        try {
          const res = await fetch('/api/ledgers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ companyId: cid, ...data })
          });
          if (res.ok) {
            const resData = await res.json();
            setAllLedgers(p => [...p, resData.ledger]);
            return resData.ledger;
          } else {
            const errData = await res.json().catch(() => ({}));
            const errMsg = errData.error || `Failed to save ledger on server`;
            alert(errMsg);
            return null;
          }
        } catch (e: any) {
          console.error("Ledger save failed", e);
          alert("Error connecting to server to save ledger: " + e.message);
          return null;
        }
      }
      else if (type === 'stockItem') {
        try {
          const res = await fetch('/api/stock-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ companyId: cid, ...data })
          });
          if (res.ok) {
            const resData = await res.json();
            setAllStockItems(p => [...p, resData.item]);
            return resData.item;
          } else {
            const errData = await res.json().catch(() => ({}));
            const errMsg = errData.error || `Failed to save stock item on server`;
            alert(errMsg);
            return null;
          }
        } catch (e: any) {
          console.error("Stock Item save failed", e);
          alert("Error connecting to server to save stock item: " + e.message);
          return null;
        }
      }
      else if (type === 'unit') {
        try {
          const res = await fetch('/api/units', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ companyId: cid, ...data })
          });
          if (res.ok) {
            const resData = await res.json();
            setAllUnits(p => [...p, resData.unit]);
            return resData.unit;
          } else {
            const errData = await res.json().catch(() => ({}));
            const errMsg = errData.error || `Failed to save unit on server`;
            alert(errMsg);
            return null;
          }
        } catch (e: any) {
          console.error("Unit save failed", e);
          alert("Error connecting to server to save unit: " + e.message);
          return null;
        }
      }
      else if (type === 'stockGroup') {
        try {
          const res = await fetch('/api/stock-groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ companyId: cid, ...data })
          });
          if (res.ok) {
            const resData = await res.json();
            setAllStockGroups(p => [...p, resData.group]);
            return resData.group;
          } else {
            const errText = await res.text();
            alert("Failed to save stock group on server: " + errText);
            return null;
          }
        } catch (e: any) {
          console.error("Stock Group save failed", e);
          alert("Error connecting to server to save stock group: " + e.message);
          return null;
        }
      }
      else if (type === 'company') {
        // Double-submit guard: pehli company POST complete hone se pehle doosri nahi jayegi
        if ((saveMaster as any)._savingCompany) {
          console.warn('Company save already in progress, ignoring duplicate call.');
          return false;
        }
        (saveMaster as any)._savingCompany = true;
        try {
          const res = await fetch('/api/companies', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
          });
          const resData = await res.json();
          if (res.ok && resData.company) {
            const newCo = resData.company;
            setCompanies(p => [...p, newCo]);
            setAllGroups(p => [...p, ...TALLY_GROUPS.map((g, i) => ({ id: Date.now() + i, companyId: newCo.id, name: g, under: 'Primary' }))]);
            setAllVoucherTypes(p => [...p, ...VOUCHER_TYPES_DEFAULT.map((v, i) => ({ id: Date.now() + i + 100, companyId: newCo.id, name: v, type: v, abbreviation: v.slice(0,3).toUpperCase(), numberingMethod: "Automatic", startNumber: 1 }))]);
            setAllCurrencies(p => [...p, { id: Date.now() + 200, companyId: newCo.id, name: "Indian Rupee", symbol: "₹", isoCode: "INR", decimalPlaces: 2 }]);
            setAllLedgers(p => [...p, { id: Date.now() + 300, companyId: newCo.id, name: "Cash", groupName: "Cash-in-hand", openingBalance: 0, balanceType: "Dr" }]);
            setAllUnits(p => [...p, ...INIT_UNITS.map((u, i) => ({ ...u, id: Date.now() + 400 + i, companyId: newCo.id }))]);
            setActiveCompany(newCo);
            return newCo;
          } else {
            alert("Failed to create company: " + (resData.error || "Unknown error"));
            return false;
          }
        } catch (e: any) {
          alert("Error creating company: " + e.message);
          return false;
        } finally {
          (saveMaster as any)._savingCompany = false;
        }
      }
      else if (type === 'group') setAllGroups(p => [...p, { id, companyId: cid, ...data }]);
      else if (type === 'stockCategory') setAllStockCategories(p => [...p, { id, companyId: cid, ...data }]);
      return true;
    }
  };

  const deleteMaster = (type: string, id: number) => {
    let name = 'this item';
    if (type === 'company') {
      const co = companies.find(c => Number(c.id) === Number(id));
      name = co ? co.name : 'this company';
    } else if (type === 'ledger') {
      const l = allLedgers.find(x => Number(x.id) === Number(id));
      name = l ? l.name : 'this ledger';
    }
    // Set pending delete to show custom modal
    setPendingDelete({ type, id, name });
  };

  const executeDelete = async () => {
    if (!pendingDelete) return;
    const { type, id, name } = pendingDelete;
    setPendingDelete(null);

    const token = authClient.getToken();

    try {
      let endpoint = '';
      if (type === 'company') endpoint = '/api/companies';
      else if (type === 'ledger') endpoint = '/api/ledgers';
      else if (type === 'stockItem') endpoint = '/api/stock-items';
      else if (type === 'stockGroup') endpoint = '/api/stock-groups';
      else if (type === 'unit') endpoint = '/api/units';

      if (endpoint) {
        await fetch(endpoint, {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ id })
        });
      }
    } catch (e) { console.warn("API Delete Error:", e); }

    if (type === 'company') {
      setCompanies(p => p.filter(x => Number(x.id) !== Number(id)));
      setAllLedgers(p => p.filter(x => Number(x.companyId) !== Number(id)));
      setAllVouchers(p => p.filter(x => Number(x.companyId) !== Number(id)));
      setAllGroups(p => p.filter(x => Number(x.companyId) !== Number(id)));
      setAllStockGroups(p => p.filter(x => Number(x.companyId) !== Number(id)));
      setAllStockItems(p => p.filter(x => Number(x.companyId) !== Number(id)));
      setAllUnits(p => p.filter(x => Number(x.companyId) !== Number(id)));
      setAllVoucherTypes(p => p.filter(x => Number(x.companyId) !== Number(id)));
      setAllCurrencies(p => p.filter(x => Number(x.companyId) !== Number(id)));
      setAllGodowns(p => p.filter(x => Number(x.companyId) !== Number(id)));
      setAllStockCategories(p => p.filter(x => Number(x.companyId) !== Number(id)));

      if (activeCompany && Number(activeCompany.id) === Number(id)) {
        const remaining = companies.filter(c => Number(c.id) !== Number(id));
        if (remaining.length > 0) {
          setActiveCompany(remaining[0]);
        } else {
          setActiveCompany({ id: 0, name: 'No Company Selected' });
          setScreen('COMPANY_CREATION');
          setHistory([]);
          return;
        }
      }
      alert(`Company "${name}" deleted successfully.`);
    } else {
      if (type === 'ledger') setAllLedgers(p => p.filter(x => Number(x.id) !== Number(id)));
      else if (type === 'group') setAllGroups(p => p.filter(x => Number(x.id) !== Number(id)));
      else if (type === 'stockGroup') setAllStockGroups(p => p.filter(x => Number(x.id) !== Number(id)));
      else if (type === 'stockItem') setAllStockItems(p => p.filter(x => Number(x.id) !== Number(id)));
      else if (type === 'unit') setAllUnits(p => p.filter(x => Number(x.id) !== Number(id)));
      else if (type === 'godown') setAllGodowns(p => p.filter(x => Number(x.id) !== Number(id)));
      else if (type === 'voucherType') setAllVoucherTypes(p => p.filter(x => Number(x.id) !== Number(id)));
      else if (type === 'currency') setAllCurrencies(p => p.filter(x => Number(x.id) !== Number(id)));
      else if (type === 'stockCategory') setAllStockCategories(p => p.filter(x => Number(x.id) !== Number(id)));
      alert(`${type} deleted successfully.`);
    }
    goBack();
  };

  const saveVoucher = async (v: any): Promise<Voucher> => {
    const token = authClient.getToken();
    const companyId = activeCompany?.id || 0;

    // A voucher is an Edit if it has a numeric ID that's not a temporary timestamp
    const isEdit = v.id && !isNaN(Number(v.id)) && Number(v.id) < 1000000000000; 

    try {
      const res = await fetch('/api/vouchers', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...v, companyId })
      });
      if (res.ok) {
        const resData = await res.json();
        const vRaw = resData.voucher || resData;
        
        // Dynamic Party Name Mapping
        const partySide = ['Sales', 'Payment', 'Debit Note'].includes(vRaw.type) ? 'Dr' : 'Cr';
        const partyEntry = vRaw.entries?.find((e: any) => e.entryType === partySide);
        const pName = vRaw.partyName || partyEntry?.ledger?.name || partyEntry?.ledgerName || 'Unknown Party';

        // Build entries: start with DB-returned entries (mapped with ledgerName)
        const dbEntries = (vRaw.entries || []).map((e: any, idx: number) => {
          const localEntry = v.entries?.find((le: any) => le.ledgerId === e.ledgerId && Math.abs(le.amount - e.amount) < 0.01) || v.entries?.[idx];
          return {
            ...e,
            ledgerName: e.ledgerName || e.ledger?.name || localEntry?.ledgerName || '',
          };
        });
        // Re-attach local entries that API filtered out (ledgerId=0 means ledger not in DB yet)
        // This ensures additional ledgers like Freight, Packing etc. appear in print preview
        const dbLedgerIds = new Set(dbEntries.map((e: any) => Number(e.ledgerId)));
        const missingLocalEntries = (v.entries || []).filter((le: any) => {
          const lid = Number(le.ledgerId);
          if (lid > 0 && dbLedgerIds.has(lid)) return false;
          return !!(le.ledgerName);
        }).map((le: any) => ({ ...le, ledger: null }));

        const savedV = {
          ...v,
          ...vRaw,
          entries: [...dbEntries, ...missingLocalEntries],
          inventoryEntries: (vRaw.inventoryEntries || []).map((ie: any, idx: number) => {
            const localItem = v.inventoryEntries?.find((li: any) => (li.itemId || li.stockItemId) === ie.stockItemId) || v.inventoryEntries?.[idx];
            return {
              ...ie,
              itemId: ie.stockItemId || ie.itemId,
              itemName: ie.itemName || ie.stockItem?.name || localItem?.itemName || '',
              showInclTax: ie.stockItem?.showInclTax ?? localItem?.showInclTax ?? false,
              showAmtInclTax: ie.stockItem?.showAmtInclTax ?? localItem?.showAmtInclTax ?? false,
            };
          }),
          partyDetails: typeof vRaw.partyDetails === 'string' ? JSON.parse(vRaw.partyDetails) : (vRaw.partyDetails || v.partyDetails),
          dispatchDetails: typeof vRaw.dispatchDetails === 'string' ? JSON.parse(vRaw.dispatchDetails) : (vRaw.dispatchDetails || v.dispatchDetails),
          partyName: pName,
          date: new Date(vRaw.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
        };
        if (isEdit) {
          setAllVouchers(p => p.map(x => x.id === v.id ? savedV : x));
        } else {
          setAllVouchers(p => [...p, savedV]);
        }
        setPrintVoucher(savedV);
        return savedV;
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Server failed to save voucher");
      }
    } catch (e: any) { 
      console.error("Voucher Cloud Save Failed", e);
      throw e; // Important: throw to handleSave
    }

    // Fallback to local if cloud fails
    const id = v.id || Date.now();
    const newV = { ...v, id, companyId };
    if (v.id) {
      setAllVouchers(p => p.map(x => x.id === v.id ? newV : x));
    } else {
      setAllVouchers(p => [...p, newV]);
    }
    setPrintVoucher(newV);
    return newV;
  };

  const initStandardLedgers = async () => {
    if (!activeCompany) return;
    const cid = activeCompany.id;
    const standardLedgers = [
      { name: 'Cash', groupName: 'Cash-in-hand', openingBalance: 0, balanceType: 'Dr' },
      { name: 'Profit & Loss A/c', groupName: 'Primary', openingBalance: 0, balanceType: 'Cr' },
      { name: 'Round Off', groupName: 'Indirect Expenses', openingBalance: 0, balanceType: 'Dr' },
      { name: 'Discount Given', groupName: 'Indirect Expenses', openingBalance: 0, balanceType: 'Dr' },
      { name: 'Discount Received', groupName: 'Indirect Incomes', openingBalance: 0, balanceType: 'Cr' },
      { name: 'Transportation Charges', groupName: 'Direct Expenses', openingBalance: 0, balanceType: 'Dr' },
      { name: 'Freight Charges', groupName: 'Direct Expenses', openingBalance: 0, balanceType: 'Dr' },
      { name: 'CGST Payable', groupName: 'Duties & Taxes', openingBalance: 0, balanceType: 'Cr' },
      { name: 'SGST Payable', groupName: 'Duties & Taxes', openingBalance: 0, balanceType: 'Cr' },
      { name: 'IGST Payable', groupName: 'Duties & Taxes', openingBalance: 0, balanceType: 'Cr' },
      { name: 'Sales A/c', groupName: 'Sales Accounts', openingBalance: 0, balanceType: 'Cr' },
      { name: 'Purchase A/c', groupName: 'Purchase Accounts', openingBalance: 0, balanceType: 'Dr' },
    ];

    let createdCount = 0;
    for (const l of standardLedgers) {
      if (!ledgers.find(lx => lx.name === l.name)) {
        await saveMaster('ledger', l);
        createdCount++;
      }
    }
    alert(`${createdCount} Standard Ledgers initialized! (Round Off, Discount, GST, etc.)`);
  };

  const deleteVoucher = async (id: number) => {
    try {
      await fetch('/api/vouchers', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authClient.getToken()}`
        },
        body: JSON.stringify({ id })
      });
    } catch (e) { console.error("Voucher Delete Error:", e); }

    setAllVouchers(p => p.filter(x => x.id !== id));
    goBack();
  };

  // MENUS
  const getMasterMenu = (isAlter: boolean): MenuOption[] => {
    const act = (s: ScreenType, typeName: string) => () => isAlter ? nav('ALTER_LIST', undefined, typeName) : nav(s);
    return [
      { label:'ACCOUNTING MASTERS', highlight:'', action:()=>{}, category:'header' },
      { label:'Group',         highlight:'G', action:act('GROUP_CREATION','Group') },
      { label:'Ledger',        highlight:'L', action:act('LEDGER_CREATION','Ledger') },
      { label:'Currency',      highlight:'C', action:act('CURRENCY_CREATION','Currency') },
      { label:'Voucher Type',  highlight:'V', action:act('VOUCHER_TYPE_CREATION','Voucher Type') },
      { label:'',highlight:'',action:()=>{},category:'header'},
      { label:'INVENTORY MASTERS', highlight:'', action:()=>{}, category:'header' },
      { label:'Stock Group',   highlight:'I', action:act('STOCK_GROUP_CREATION','Stock Group') },
      { label:'Stock Category',highlight:'T', action:act('STOCK_CATEGORY_CREATION','Stock Category') },
      { label:'Stock Item',    highlight:'S', action:act('STOCK_ITEM_CREATION','Stock Item') },
      { label:'Unit',          highlight:'U', action:act('UNIT_CREATION','Unit') },
      { label:'Godown',        highlight:'O', action:act('GODOWN_CREATION','Godown') },
      { label:'',highlight:'',action:()=>{},category:'header'},
      { label:'STATUTORY',     highlight:'', action:()=>{}, category:'header' },
      { label:'GST Details',   highlight:'A', action:()=>setShowGST(true) },
      { label:'',highlight:'',action:()=>{},category:'header'},
      { label:'Quit',          highlight:'Q', action:()=>goBack() },
    ];
  };

  const getReportsMenu = (): MenuOption[] => [
    { label:'Trial Balance',       highlight:'T', action:()=>nav('TRIAL_BALANCE') },
    { label:'Day Book',            highlight:'D', action:()=>nav('DAY_BOOK') },
    { label:'',highlight:'',action:()=>{},category:'header'},
    { label:'Account Books',       highlight:'A', action:()=>nav('ACCOUNT_BOOKS_MENU') },
    { label:'',highlight:'',action:()=>{},category:'header'},
    { label:'INVENTORY',           highlight:'', action:()=>{}, category:'header' },
    { label:'Stock Summary',       highlight:'K', action:()=>nav('STOCK_SUMMARY') },
    { label:'',highlight:'',action:()=>{},category:'header'},
    { label:'GSTR1 Report',        highlight:'1', action:()=>nav('GSTR1_REPORT') },
    { label:'GSTR3B Report',       highlight:'3', action:()=>nav('GSTR3B_REPORT') },
    { label:'',highlight:'',action:()=>{},category:'header'},
    { label:'Quit',                highlight:'Q', action:()=>goBack() },
  ];

  const getAccountBooksMenu = (): MenuOption[] => [
    { label:'REGISTERS',              highlight:'', action:()=>{}, category:'header' },
    { label:'ConTra Register',        highlight:'T', action:()=>nav('CONTRA_REGISTER') },
    { label:'PaYment Register',       highlight:'Y', action:()=>nav('PAYMENT_REGISTER') },
    { label:'Receipt Register',       highlight:'R', action:()=>nav('RECEIPT_REGISTER') },
    { label:'Sales Register',         highlight:'S', action:()=>nav('SALES_REGISTER') },
    { label:'Sales Quotation Register',highlight:'U', action:()=>nav('QUOTATION_REGISTER') },
    { label:'Purchase Register',      highlight:'P', action:()=>nav('PURCHASE_REGISTER') },
    { label:'Journal Register',       highlight:'J', action:()=>nav('JOURNAL_REGISTER') },
    { label:'Debit Note Register',    highlight:'D', action:()=>nav('DEBIT_NOTE_REGISTER') },
    { label:'CrEdit Note Register',   highlight:'E', action:()=>nav('CREDIT_NOTE_REGISTER') },
    { label:'',highlight:'',action:()=>{},category:'header'},
    { label:'Ledger',                 highlight:'L', action:()=>nav('LEDGER_REPORT') },
    { label:'',highlight:'',action:()=>{},category:'header'},
    { label:'Outstanding',            highlight:'O', action:()=>nav('OUTSTANDING_REPORT') },
    { label:'',highlight:'',action:()=>{},category:'header'},
    { label:'Quit',                   highlight:'Q', action:()=>goBack() },
  ];

  const gatewayMenu: MenuOption[] = [
    { label:'MASTERS',            highlight:'', action:()=>{}, category:'header' },
    { label:'Create',             highlight:'C', action:()=>nav('MASTER_MENU') },
    { label:'Alter',              highlight:'A', action:()=>nav('ALTER_MENU') },
    { label:'Chart of Accounts',  highlight:'H', action:()=>nav('CHART_OF_ACCOUNTS') },
    { label:'User Roles',         highlight:'U', action:()=>nav('USER_ROLES') },
    { label:'TRANSACTIONS',       highlight:'', action:()=>{}, category:'header' },
    { label:'Vouchers',           highlight:'V', action:()=>nav('VOUCHER_ENTRY') },
    { label:'Day Book',           highlight:'K', action:()=>nav('DAY_BOOK') },
    { label:'Data Exchange',      highlight:'E', action:()=>nav('DATA_EXCHANGE') },
    { label:'REPORTS',            highlight:'', action:()=>{}, category:'header' },
    { label:'Balance Sheet',      highlight:'B', action:()=>nav('BALANCE_SHEET') },
    { label:'Profit & Loss A/c',  highlight:'P', action:()=>nav('PROFIT_LOSS') },
    { label:'Stock Summary',      highlight:'S', action:()=>nav('STOCK_SUMMARY') },
    { label:'Trial Balance',      highlight:'T', action:()=>nav('TRIAL_BALANCE') },
    { label:'Display More Reports',highlight:'D', action:()=>nav('DISPLAY_REPORTS_MENU') },
    { label:'',highlight:'',action:()=>{},category:'header'},
    { label:'Quit',               highlight:'Q', action:()=>alert('Close application?') },
  ];

  const getActiveMenu = () => {
    if (screen === 'MASTER_MENU') return getMasterMenu(false);
    if (screen === 'ALTER_MENU') return getMasterMenu(true);
    if (screen === 'DISPLAY_REPORTS_MENU') return getReportsMenu();
    if (screen === 'ACCOUNT_BOOKS_MENU') return getAccountBooksMenu();
    return gatewayMenu;
  };

  // KEYBOARD
  useEffect(() => {
    if (!isAuthenticated) return;
    const onKey = (e: KeyboardEvent) => {
      // Tally Prime: Collect form data from DOM and save
      const doFormSave = async () => {
        const fv = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value?.trim() || '';
        const fsv = (id: string) => (document.getElementById(id) as HTMLSelectElement)?.value || '';
        let type = '', data: any = null;
        const cid = activeCompany?.id || 0;
        if (screen === 'GROUP_CREATION') {
          const name = fv('g-name'); if (!name) { alert('Group Name is required!'); document.getElementById('g-name')?.focus(); return; }
          if (allGroups.some(g => (g.companyId === cid || g.companyId === -1) && g.name.toLowerCase() === name.toLowerCase() && (!alterItem || g.id !== alterItem.id))) { alert(`Group "${name}" already exists!`); return; }
          type = 'group'; data = { name, alias: fv('g-alias'), under: fv('g-under') || 'Primary' };
        } else if (screen === 'LEDGER_CREATION') {
          const name = fv('l-name'); if (!name) { alert('Ledger Name is required!'); document.getElementById('l-name')?.focus(); return; }
          if (ledgers.some(l => l.name.toLowerCase() === name.toLowerCase() && (!alterItem || l.id !== alterItem.id))) { alert(`Ledger "${name}" already exists!`); return; }
          type = 'ledger'; data = { name, alias: fv('l-alias'), mailingName: fv('l-mail'), groupName: fv('l-under') || 'Sundry Debtors', address: fv('l-addr'), state: fv('l-state'), country: fv('l-country'), gstin: fv('l-gst'), pan: fv('l-pan'), registrationType: fsv('l-reg'), ifsc: fv('l-ifsc'), bankName: fv('l-bank'), accountNo: fv('l-acc'), phone: fv('l-phone'), email: fv('l-email'), pinCode: fv('l-pin'), openingBalance: round2(parseFloat(fv('l-ob')) || 0), balanceType: fsv('l-ob-type') || 'Dr' };
        } else if (screen === 'STOCK_GROUP_CREATION') {
          const name = fv('sg-name'); if (!name) { alert('Stock Group Name is required!'); return; }
          if (allStockGroups.some(g => Number(g.companyId) === Number(cid) && g.name.toLowerCase() === name.toLowerCase() && (!alterItem || g.id !== alterItem.id))) { alert(`Stock Group "${name}" already exists!`); return; }
          type = 'stockGroup'; data = { name, alias: fv('sg-alias'), under: fv('sg-under') || 'Primary' };
        } else if (screen === 'STOCK_CATEGORY_CREATION') {
          const name = fv('sc-name'); if (!name) { alert('Stock Category Name is required!'); return; }
          if (allStockCategories.some(c => Number(c.companyId) === Number(cid) && c.name.toLowerCase() === name.toLowerCase() && (!alterItem || c.id !== alterItem.id))) { alert(`Stock Category "${name}" already exists!`); return; }
          type = 'stockCategory'; data = { name, under: 'Primary' };
        } else if (screen === 'STOCK_ITEM_CREATION') {
          const name = fv('item-name'); if (!name) { alert('Stock Item Name is required!'); return; }
          // Duplicate Check
          if (stockItems.some(it => it.name.toLowerCase() === name.toLowerCase() && (!alterItem || it.id !== alterItem.id))) {
            alert(`Stock Item "${name}" already exists!`); return;
          }
          const unitName = fv('item-units');
          if (!unitName) { alert('Unit is required!'); document.getElementById('item-units')?.focus(); return; }
          const matchedUnit = allUnits.find(u => (u.symbol || u.name || '').toLowerCase() === unitName.toLowerCase());
          if (!matchedUnit) {
            alert(`Unit "${unitName}" not found in master list. Please create it first using Alt+C or select from list.`);
            document.getElementById('item-units')?.focus();
            return;
          }
          type = 'stockItem'; data = { 
            name, alias: fv('item-alias'), 
            under: fv('item-under') || 'Primary', 
            category: fv('item-cat') || 'Not Applicable', 
            unit: matchedUnit.symbol || matchedUnit.name, 
            unitId: matchedUnit.id,
            altUnit: fv('item-altunit') || 'Not Applicable',
            showInclTax: (document.getElementById('item-show-incl-tax') as HTMLSelectElement)?.value === 'Yes',
            showAmtInclTax: (document.getElementById('item-show-amt-incl-tax') as HTMLSelectElement)?.value === 'Yes',
            gstRate: fv('item-gst') ? round2(parseFloat(fv('item-gst'))) : 18, 
            hsnCode: fv('item-hsn'), 
            gstApplicable: fsv('item-gst-app'),
            typeOfSupply: fsv('item-supply-type'),
            costingMethod: fsv('item-costing'),
            marketValuationMethod: fsv('item-market'),
            openingQty: round2(parseFloat(fv('item-oqty')) || 0), 
            openingRate: round2(parseFloat(fv('item-orate')) || 0),
            defaultDiscount: round2(parseFloat(fv('item-disc')) || 0)
          };
        } else if (screen === 'UNIT_CREATION') {
          const sym = fv('unit-sym'); if (!sym) { alert('Unit Symbol is required!'); return; }
          if (allUnits.some(u => Number(u.companyId) === Number(cid) && u.symbol.toLowerCase() === sym.toLowerCase() && (!alterItem || u.id !== alterItem.id))) { alert(`Unit "${sym}" already exists!`); return; }
          type = 'unit'; data = { name: sym, symbol: sym, formalName: fv('unit-name') || sym, uqc: fv('unit-uqc') || 'NOS', decimalPlaces: parseInt(fv('unit-decimal')) || 0 };
        } else if (screen === 'GODOWN_CREATION') {
          const name = fv('gd-name'); if (!name) { alert('Godown Name is required!'); return; }
          if (godowns.some(g => g.name.toLowerCase() === name.toLowerCase() && (!alterItem || g.id !== alterItem.id))) { alert(`Godown "${name}" already exists!`); return; }
          type = 'godown'; data = { name, alias: fv('gd-alias'), under: fsv('gd-under') || 'Primary' };
        } else if (screen === 'CURRENCY_CREATION') {
          const sym = fv('cur-sym'); if (!sym) { alert('Currency Symbol is required!'); return; }
          if (currencies.some(c => c.symbol.toLowerCase() === sym.toLowerCase() && (!alterItem || c.id !== alterItem.id))) { alert(`Currency "${sym}" already exists!`); return; }
          type = 'currency'; data = { name: fv('cur-name') || sym, symbol: sym, isoCode: fv('cur-iso'), decimalPlaces: 2 };
        } else if (screen === 'VOUCHER_TYPE_CREATION') {
          const name = fv('vt-name'); if (!name) { alert('Voucher Type Name is required!'); return; }
          if (voucherTypes.some(v => v.name.toLowerCase() === name.toLowerCase() && (!alterItem || v.id !== alterItem.id))) { alert(`Voucher Type "${name}" already exists!`); return; }
          type = 'voucherType'; data = { 
            name, 
            type: fsv('vt-type') || 'Sales', 
            abbreviation: name.slice(0,3).toUpperCase(), 
            numberingMethod: fsv('vt-numbering') || 'Automatic', 
            startNumber: parseInt(fv('vt-start-no')) || 1,
            prefix: fv('vt-prefix') || '',
            suffix: fv('vt-suffix') || '',
            width: parseInt(fv('vt-width')) || 0,
            prefillWithZero: fsv('vt-zero') === 'Yes'
          };
        } else if (screen === 'COMPANY_CREATION') {
          const name = fv('c-name'); if (!name) { alert('Company Name is required!'); return; }
          if (companies.some(c => c.name.toLowerCase() === name.toLowerCase() && (!alterItem || c.id !== alterItem.id))) { alert(`Company "${name}" already exists!`); return; }
          const logoEl = document.querySelector('img[alt="Preview"]') as HTMLImageElement;
          type = 'company'; data = { 
            name, address: fv('c-addr'), state: fv('c-state'), country: fv('c-country'), gstin: fv('c-gstin'), pan: fv('c-pan'), mobile: fv('c-mob'), telephone: fv('c-telephone'), email: fv('c-email'), website: fv('c-web'), pinCode: fv('c-pin'),
            registrationType: fsv('c-reg-type'), bankName: fv('c-bank-name'), bankHolderName: fv('c-bank-holder'), accountNo: fv('c-acc-no'), ifsc: fv('c-ifsc'), swiftCode: fv('c-swift'),
            financialYearStart: fv('c-fy-start'), booksBeginFrom: fv('c-books-start'),
            securityControl: fsv('c-sec-ctrl') === 'Yes', password: fv('c-pwd'),
            showMobile: (document.getElementById('chk-print-mob') as HTMLInputElement)?.checked ?? true,
            showEmail: (document.getElementById('chk-print-email') as HTMLInputElement)?.checked ?? true,
            showWebsite: (document.getElementById('chk-print-web') as HTMLInputElement)?.checked ?? true,
            showLogo: (document.getElementById('chk-print-Logo') as HTMLInputElement)?.checked ?? false,
            logo: logoEl?.src || null,
          };
        }

        if (!data) return;
        const savedObj = await saveMaster(type, data);
        if (savedObj) {
          const newItem = typeof savedObj === 'object' ? savedObj : { ...data, id: Date.now() };

            if (altCReturnContext) {
              setAltCReturnContext({ ...altCReturnContext, newItem });
              goBack();
              return;
            }

            if (alterItem) {
              alert((data.name || data.symbol || 'Record') + ' altered successfully!');
              goBack();
            } else {
              alert((data.name || data.symbol || 'Record') + ' saved successfully!');
              resetForm(data.name || data.symbol || 'Record');
            }
          }
      };

      if (e.key === 'Escape') {
        if (pwdPrompt) { setPwdPrompt(null); return; }
        if (altCCtx) { 
          setAltCCtx(null); 
          setTimeout(() => lastFocusRef.current?.focus(), 80);
          return; 
        }
        if (showExportModal) { setShowExportModal(false); return; }
        if (showEmailModal) { setShowEmailModal(false); return; }
        if (showGST) { setShowGST(false); return; }
        if (showFeatures) { setShowFeatures(false); return; }
        if (showCompanySelect) { setShowCompanySelect(false); return; }
        if (showDate) { setShowDate(false); return; }
        if (showPeriod) { setShowPeriod(false); return; }
        // Report screens that handle Escape internally for step-by-step
        const internalReports = ['LEDGER_REPORT','GSTR1_REPORT','GSTR3B_REPORT','BALANCE_SHEET','PROFIT_LOSS','TRIAL_BALANCE','DAY_BOOK','STOCK_SUMMARY','OUTSTANDING_REPORT','SALES_REGISTER','PURCHASE_REGISTER','QUOTATION_REGISTER'];
        if (internalReports.includes(screen)) return;
        goBack();
      }
      if (e.key === 'F11') { e.preventDefault(); setShowFeatures(true); }
      if (e.key === 'F3')  { e.preventDefault(); setShowCompanySelect(true); }
      if (e.key === 'F2' && !e.altKey)  { e.preventDefault(); setShowPeriod(true); }
      if (e.key === 'F2' && e.altKey)   { e.preventDefault(); setShowPeriod(true); }
      if (screen === 'VOUCHER_ENTRY') {
        if (e.key === 'F4') { e.preventDefault(); setActiveVoucher('Contra'); }
        if (e.key === 'F5') { e.preventDefault(); setActiveVoucher('Payment'); }
        if (e.key === 'F6') { e.preventDefault(); setActiveVoucher('Receipt'); }
        if (e.key === 'F7') { e.preventDefault(); setActiveVoucher('Journal'); }
        if (e.key === 'F8' && !e.altKey && !e.ctrlKey) { e.preventDefault(); setActiveVoucher('Sales'); }
        if (e.key === 'F8' && (e.altKey || e.ctrlKey)) { e.preventDefault(); setActiveVoucher('Sales Quotation'); }
        if (e.key === 'F9') { e.preventDefault(); setActiveVoucher('Purchase'); }
        if (e.key === 'F10') { e.preventDefault(); setActiveVoucher('Sales Quotation'); }
      }
      if (e.altKey && e.key.toLowerCase() === 'd' && alterItem) {
        e.preventDefault();
        const typeMap: any = {
           'GROUP_CREATION': 'group', 'LEDGER_CREATION': 'ledger', 'STOCK_ITEM_CREATION': 'stockItem', 
           'UNIT_CREATION': 'unit', 'GODOWN_CREATION': 'godown', 'VOUCHER_TYPE_CREATION': 'voucherType', 
           'CURRENCY_CREATION': 'currency', 'STOCK_GROUP_CREATION': 'stockGroup', 
           'STOCK_CATEGORY_CREATION': 'stockCategory', 'COMPANY_CREATION': 'company'
        };
        const type = typeMap[screen];
        if (type) deleteMaster(type, alterItem.id);
      }
      if (e.altKey && e.key.toLowerCase() === 'c' && !altCCtx && screen !== 'VOUCHER_ENTRY') {
        e.preventDefault();
        const id = (document.activeElement as HTMLElement)?.id || '';
        if (id.includes('l-under') || id.includes('g-under')) setAltCCtx({ fieldType:'group', onCreated:()=>{} });
        else if (id.includes('item-under') || id.includes('sg-under')) setAltCCtx({ fieldType:'stockGroup', onCreated:()=>{} });
        else if (id.includes('item-units')) setAltCCtx({ fieldType:'unit', onCreated:()=>{} });
        else setAltCCtx({ fieldType:'ledger', onCreated:()=>{} });
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const formScreens = ['GROUP_CREATION','LEDGER_CREATION','STOCK_ITEM_CREATION','UNIT_CREATION','GODOWN_CREATION','VOUCHER_TYPE_CREATION','CURRENCY_CREATION','STOCK_GROUP_CREATION','STOCK_CATEGORY_CREATION','COMPANY_CREATION'];
        if (formScreens.includes(screen) && (document.activeElement as HTMLElement)?.id !== 'btn-save-item') { doFormSave(); }
      }
      if (e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setShowExportModal(true);
      }
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setShowEmailModal(true);
      }
      // Tally Prime: Enter = next field, Backspace on empty = previous field
      if (['INPUT','SELECT','TEXTAREA'].includes((document.activeElement?.tagName || ''))) {
        if (e.key === 'Backspace') {
          const el = document.activeElement as HTMLInputElement;
          if (el && el.tagName !== 'TEXTAREA' && (!el.value || el.value.length === 0)) {
            e.preventDefault();
            const inputs = Array.from(document.querySelectorAll(
              '.form-workspace input:not([disabled]),.form-workspace select:not([disabled]),.form-workspace textarea:not([disabled]),.altc-panel input,.altc-panel select, .modal-box input, .modal-box select'
            )) as HTMLElement[];
            const idx = inputs.indexOf(el);
            if (idx > 0) (inputs[idx-1]).focus();
          }
        }
        if (e.key === 'Enter') {
          if (e.defaultPrevented) return;
          const activeId = (document.activeElement as HTMLElement)?.id || '';
          const activeVal = (document.activeElement as HTMLInputElement)?.value?.trim() || '';
          const cid = activeCompany?.id || 0;

          // Real-time duplicate validation on Enter
          if (activeId === 'g-name' && allGroups.some(g => (g.companyId === cid || g.companyId === -1) && g.name.toLowerCase() === activeVal.toLowerCase() && (!alterItem || g.id !== alterItem.id))) { alert(`Group "${activeVal}" already exists!`); e.preventDefault(); return; }
          if (activeId === 'l-name' && ledgers.some(l => l.name.toLowerCase() === activeVal.toLowerCase() && (!alterItem || l.id !== alterItem.id))) { alert(`Ledger "${activeVal}" already exists!`); e.preventDefault(); return; }
          if (activeId === 'sg-name' && allStockGroups.some(g => Number(g.companyId) === Number(cid) && g.name.toLowerCase() === activeVal.toLowerCase() && (!alterItem || g.id !== alterItem.id))) { alert(`Stock Group "${activeVal}" already exists!`); return; }
          if (activeId === 'sc-name' && allStockCategories.some(c => Number(c.companyId) === Number(cid) && c.name.toLowerCase() === activeVal.toLowerCase() && (!alterItem || c.id !== alterItem.id))) { alert(`Stock Category "${activeVal}" already exists!`); return; }
          if (activeId === 'item-name' && stockItems.some(it => it.name.toLowerCase() === activeVal.toLowerCase() && (!alterItem || it.id !== alterItem.id))) { alert(`Stock Item "${activeVal}" already exists!`); return; }
          if (activeId === 'unit-sym' && allUnits.some(u => Number(u.companyId) === Number(cid) && u.symbol.toLowerCase() === activeVal.toLowerCase() && (!alterItem || u.id !== alterItem.id))) { alert(`Unit "${activeVal}" already exists!`); return; }
          if (activeId === 'gd-name' && godowns.some(g => g.name.toLowerCase() === activeVal.toLowerCase() && (!alterItem || g.id !== alterItem.id))) { alert(`Godown "${activeVal}" already exists!`); return; }
          if (activeId === 'cur-sym' && currencies.some(c => c.symbol.toLowerCase() === activeVal.toLowerCase() && (!alterItem || c.id !== alterItem.id))) { alert(`Currency "${activeVal}" already exists!`); return; }
          if (activeId === 'vt-name' && voucherTypes.some(v => v.name.toLowerCase() === activeVal.toLowerCase() && (!alterItem || v.id !== alterItem.id))) { alert(`Voucher Type "${activeVal}" already exists!`); return; }
          if (activeId === 'c-name' && companies.some(c => c.name.toLowerCase() === activeVal.toLowerCase() && (!alterItem || c.id !== alterItem.id))) { alert(`Company "${activeVal}" already exists!`); return; }

          const dropdowns = ['l-under','g-under','c-state','c-country','l-state','l-country','item-under','item-units','item-cat','sg-under','sc-under','vt-parent','gd-under'];
          if (dropdowns.includes(activeId)) return;
          e.preventDefault();
          const inputs = Array.from(document.querySelectorAll(
            '.form-workspace input:not([disabled]),.form-workspace select:not([disabled]),.form-workspace textarea:not([disabled]),.altc-panel input,.altc-panel select, .modal-box input, .modal-box select'
          )) as HTMLElement[];
          const idx = inputs.indexOf(document.activeElement as HTMLElement);
          if (e.shiftKey && idx > 0) (inputs[idx-1]).focus();
          else if (!e.shiftKey && idx < inputs.length-1) (inputs[idx+1]).focus();
          else if (idx === inputs.length-1) { 
            if (showExportModal) {
               const fmt = (document.getElementById('export-format') as HTMLSelectElement).value;
               const fName = (document.getElementById('export-filename') as HTMLInputElement).value;
               setShowExportModal(false);
               if (fmt === 'pdf') handlePdfExport(fName); else handleExcelExport(fName);
            } else if (showEmailModal) {
               setShowEmailModal(false);
               alert("E-mail sent successfully!");
            } else {
               doFormSave(); 
            }
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    // Title case formatter
    const onInput = (e: Event) => {
      const t = e.target as HTMLInputElement;
      if (!t || (t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA')) return;
      if (t.type !== 'text' && t.tagName !== 'TEXTAREA') return;
      if (t.id?.toLowerCase().includes('email') || t.id?.toLowerCase().includes('web') || t.id?.toLowerCase().includes('ifsc') || t.id?.toLowerCase().includes('gstin') || t.id?.toLowerCase().includes('pan')) return;
      const start = t.selectionStart; const end = t.selectionEnd;
      const v = t.value.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ');
      if (t.value !== v) { t.value = v; t.setSelectionRange(start,end); }
    };
    document.addEventListener('input', onInput);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('input', onInput); };
  }, [screen, history, altCCtx, showGST, showFeatures, showCompanySelect, showDate, activeVoucher, showExportModal, showEmailModal, allUnits, activeCompany, alterItem, allLedgers, allStockItems, companies, allGroups, allStockGroups, allStockCategories, allGodowns, allVoucherTypes, allCurrencies, ledgers, stockItems, godowns, voucherTypes, currencies, isAuthenticated]);

  // Menu keyboard navigation
  useEffect(() => {
    if (!isAuthenticated) return;
    const isMenu = ['GATEWAY_MAIN','MASTER_MENU','ALTER_MENU','DISPLAY_REPORTS_MENU','ACCOUNT_BOOKS_MENU'].includes(screen);
    if (!isMenu && !showCompanySelect) return;
    const menu = getActiveMenu();
    const onKey = (e: KeyboardEvent) => {
      if (showCompanySelect) {
        const menuItems = [
          { label:'Create Company', action:()=>{setShowCompanySelect(false);nav('COMPANY_CREATION');}},
          { label:'Alter Company',  action:()=>{setShowCompanySelect(false);nav('ALTER_LIST',undefined,'Company');}},
          { label:'Delete Company', action:()=>{setShowCompanySelect(false);nav('ALTER_LIST',undefined,'Company'); alert('Select a company to alter, then press Alt+D or click Delete button to remove it.');}},
          { label:'---', category:'header' },
          ...companies.map(c=>({ label: c.name, action: ()=>{ 
            if (c.securityControl && c.password) {
              setPwdPrompt({ company: c, action: 'open' });
            } else {
              setActiveCompany(c);
            }
          } }))
        ];
        const len = menuItems.length;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          let n = (companyModalIdx + 1) % len;
          while (menuItems[n]?.category === 'header') n = (n + 1) % len;
          setCompanyModalIdx(n);
        }
        else if (e.key === 'ArrowUp') {
          e.preventDefault();
          let n = (companyModalIdx - 1 + len) % len;
          while (menuItems[n]?.category === 'header') n = (n - 1 + len) % len;
          setCompanyModalIdx(n);
        }
        else if (e.key === 'Enter') {
          e.preventDefault(); e.stopPropagation();
          if (menuItems[companyModalIdx] && menuItems[companyModalIdx].category !== 'header') {
            menuItems[companyModalIdx].action?.();
          }
        }
        return;
      }
      if (e.key==='ArrowDown'){e.preventDefault();let n=(selectedIdx+1)%menu.length;while(menu[n]?.category==='header')n=(n+1)%menu.length;setSelectedIdx(n);}
      else if (e.key==='ArrowUp'){e.preventDefault();let n=(selectedIdx-1+menu.length)%menu.length;while(menu[n]?.category==='header')n=(n-1+menu.length)%menu.length;setSelectedIdx(n);}
      else if (e.key==='Enter'){
        if (e.defaultPrevented) return;
        e.preventDefault();
        if(menu[selectedIdx]?.category!=='header') menu[selectedIdx].action?.();
      }
      else {
        const ch=e.key.toLowerCase();
        const fi=menu.findIndex(x=>x.highlight.toLowerCase()===ch&&x.category!=='header');
        if(fi!==-1){e.preventDefault();setSelectedIdx(fi);menu[fi].action?.();}
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, selectedIdx, showCompanySelect, companyModalIdx, companies]);

  useEffect(() => {
    if (screen==='GATEWAY_MAIN') setSelectedIdx(1);
    else if (['MASTER_MENU','ALTER_MENU'].includes(screen)) setSelectedIdx(2);
    else if (screen==='DISPLAY_REPORTS_MENU') setSelectedIdx(0);
  }, [screen]);

  const isFormScreen = !['GATEWAY_MAIN','MASTER_MENU','ALTER_MENU','DISPLAY_REPORTS_MENU','ACCOUNT_BOOKS_MENU'].includes(screen);

  const vColor: Record<string,string> = {Sales:'#1c5282',Purchase:'#5a2d82',Receipt:'#1a7a4a',Payment:'#8B0000',Contra:'#4a4a00',Journal:'#00555a','Credit Note':'#7a3d00','Debit Note':'#00407a','Sales Quotation':'#2a6f97'};

  if (!isMounted) return <div style={{background:'#1e2d3d', height:'100vh'}} />;

  if (!isAuthenticated) {
    return <AuthUI onLoginSuccess={handleLoginSuccess} />;
  }

  if (subscriptionExpired) {
    return <SubscriptionRenewalUI currentUser={currentUser} onRenewSuccess={() => { setSubscriptionExpired(false); window.location.reload(); }} onLogout={handleLogout} />;
  }

  return (
    <div className="app-container">
      {/* Save Toast Notification */}
      {saveToast && (
        <div style={{
          position:'fixed', bottom:50, left:'50%', transform:'translateX(-50%)',
          background:'#1a7a4a', color:'#fff', padding:'10px 28px',
          borderRadius:3, fontSize:13, fontWeight:'bold', zIndex:9999,
          boxShadow:'0 4px 16px rgba(0,0,0,0.35)',
          display:'flex', alignItems:'center', gap:10,
          animation:'fadeIn 0.2s ease',
          border:'1px solid #0f5c36',
          letterSpacing:0.3,
        }}>
          <span style={{fontSize:16}}>✓</span> {saveToast} <span style={{opacity:0.7,fontSize:11,marginLeft:8}}>Press Esc to exit</span>
        </div>
      )}
      {/* TOP NAV */}
      <div className="top-nav">
        <div className="top-nav-left">
          <div className="tally-logo">LedgerX</div>
          {/* Hamburger - only visible on mobile via CSS */}
          <button className="mobile-ham-btn" onClick={() => setMobileDrawerOpen(true)} aria-label="Open menu">
            <span/><span/><span/>
          </button>
          <div className="nav-links">
            <div onClick={()=>setShowCompanySelect(true)}><u>K</u>: Company</div>
            <div onClick={()=>setShowDate(true)}><u>F2</u>: Date</div>
            <div onClick={()=>setShowPeriod(true)}><u>F2</u>: Period</div>
            <div><u>Z</u>: Exchange</div>
          </div>
        </div>
        <div className="go-to-btn">G: Go To</div>
        <div className="header-center">
           <div style={{fontSize:18,fontWeight:'bold',letterSpacing:2,color:'#fff',textShadow:'0 2px 4px rgba(0,0,0,0.3)'}}>LedgerX ERP</div>
        </div>
        <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:15, marginRight:10}}>
           <div style={{textAlign:'right'}}>
             <div style={{fontSize:11, fontWeight:'bold', color:'#f1c40f'}}>{currentUser?.name}</div>
             <div style={{fontSize:9, color:'#fff', opacity:0.8}}>{currentUser?.organizationName}</div>
             <div style={{fontSize:9, color:'#a3e635', fontWeight:'bold', opacity:0.9}}>
                {currentUser?.plan === 'LIFETIME' ? '💎 Lifetime' : currentUser?.plan === 'YEARLY' ? '⭐ Yearly' : currentUser?.plan === 'MONTHLY' ? '📅 Monthly' : currentUser?.plan === 'TRIAL' ? '🆓 Trial' : currentUser?.plan}
                {currentUser?.plan !== 'LIFETIME' && !currentUser?.isAdmin && currentUser?.subscriptionExpiry && (
                  <span style={{color: '#f87171', marginLeft: 6}}>
                    ({getDaysRemainingText(currentUser.subscriptionExpiry)})
                  </span>
                )}
             </div>
           </div>
           {currentUser?.plan !== 'LIFETIME' && !currentUser?.isAdmin && (
             <button
               onClick={() => setShowUpgradeModal(true)}
               style={{
                 background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                 color: 'white', border: 'none',
                 padding: '4px 10px', fontSize: '10px',
                 fontWeight: 'bold', cursor: 'pointer', borderRadius: '3px'
               }}
             >
               ⬆ UPGRADE
             </button>
           )}
           <button 
             onClick={handleLogout}
             style={{
               background: '#d9534f',
               color: 'white',
               border: 'none',
               padding: '4px 10px',
               fontSize: '10px',
               fontWeight: 'bold',
               cursor: 'pointer',
               borderRadius: '3px'
             }}
           >
             LOGOUT
           </button>
        </div>
        <div className="nav-links">
          <div><u>O</u>: Import</div>
          <div onClick={()=>setShowExportModal(true)}><u>E</u>: Export</div>
          <div onClick={()=>setShowEmailModal(true)}><u>M</u>: E-mail</div>
          <div onClick={()=>nav('PRINT_PREVIEW')}><u>P</u>: Print</div>
          <div onClick={()=>setShowFeatures(true)}>F11: Features</div>
        </div>
      </div>

      {/* SUB NAV */}
      <div className="sub-nav">
        <span>
          {screen==='GATEWAY_MAIN' && 'Gateway of LedgerX'}
          {['MASTER_MENU','ALTER_MENU'].includes(screen) && ('List of Masters'+(screen==='ALTER_MENU'?' (Alter)':''))}
          {screen==='DISPLAY_REPORTS_MENU' && 'Display More Reports'}
          {screen==='ACCOUNT_BOOKS_MENU' && 'Account Books'}
          {screen==='GROUP_CREATION' && (alterItem?'Group Alteration':'Group Creation')}
          {screen==='LEDGER_CREATION' && (alterItem?'Ledger Alteration':'Ledger Creation')}
          {screen==='CURRENCY_CREATION' && 'Currency Creation'}
          {screen==='VOUCHER_TYPE_CREATION' && 'Voucher Type Creation'}
          {screen==='STOCK_GROUP_CREATION' && 'Stock Group Creation'}
          {screen==='STOCK_CATEGORY_CREATION' && 'Stock Category Creation'}
          {screen==='STOCK_ITEM_CREATION' && (alterItem?'Stock Item Alteration':'Stock Item Creation')}
          {screen==='UNIT_CREATION' && 'Unit Creation'}
          {screen==='GODOWN_CREATION' && 'Godown Creation'}
          {screen==='COMPANY_CREATION' && 'Company Creation'}
          {screen==='ALTER_LIST' && `List of ${alterListType}s`}
          {screen==='CHART_OF_ACCOUNTS' && 'Chart of Accounts'}
          {screen==='VOUCHER_ENTRY' && `${activeVoucher} Voucher Creation`}
          {screen==='DAY_BOOK' && 'Day Book'}
          {screen==='BALANCE_SHEET' && 'Balance Sheet'}
          {screen==='PROFIT_LOSS' && 'Profit & Loss Account'}
          {screen==='TRIAL_BALANCE' && 'Trial Balance'}
          {screen==='SALES_REGISTER'       && 'Sales Register'}
          {screen==='QUOTATION_REGISTER'   && 'Sales Quotation Register'}
          {screen==='PURCHASE_REGISTER'    && 'Purchase Register'}
          {screen==='CONTRA_REGISTER'      && 'Contra Register'}
          {screen==='PAYMENT_REGISTER'     && 'Payment Register'}
          {screen==='RECEIPT_REGISTER'     && 'Receipt Register'}
          {screen==='JOURNAL_REGISTER'     && 'Journal Register'}
          {screen==='DEBIT_NOTE_REGISTER'  && 'Debit Note Register'}
          {screen==='CREDIT_NOTE_REGISTER' && 'Credit Note Register'}
          {screen==='LEDGER_REPORT' && 'Ledger Report'}
          {screen==='STOCK_SUMMARY' && 'Stock Summary'}
          {screen==='OUTSTANDING_REPORT' && 'Outstanding Report'}
          {screen==='PRINT_PREVIEW' && 'Print Preview'}
        </span>
        <span style={{float:'right',fontSize:11,opacity:0.85}}>
          {activeCompany?.name || 'No Company Open'} &nbsp;|&nbsp; {currentDate} &nbsp;|&nbsp;
          <span style={{color:'#ffdd88'}}>Alt+C: Inline Create &nbsp; Ctrl+A: Accept &nbsp; Esc: Back</span>
        </span>
      </div>

      {/* ===== MOBILE NAV DRAWER (hidden on desktop via CSS) ===== */}
      <div className={`mobile-nav-drawer ${mobileDrawerOpen ? 'open' : ''}`}>
        <div className="mobile-nav-overlay" onClick={() => setMobileDrawerOpen(false)} />
        <div className="mobile-nav-panel">
          {/* Header */}
          <div className="mobile-nav-header">
            <div className="mobile-nav-logo">⚡ LedgerX</div>
            {currentUser && (
              <>
                <div className="mobile-nav-user">{currentUser.name} · {currentUser.organizationName}</div>
                <span className="mobile-nav-plan">
                  {currentUser.plan === 'LIFETIME' ? '💎 Lifetime' : currentUser.plan === 'YEARLY' ? '⭐ Yearly' : currentUser.plan === 'MONTHLY' ? '📅 Monthly' : '🆓 Trial'}
                </span>
              </>
            )}
          </div>
          {/* Company */}
          <div className="mobile-nav-section">
            <div className="mobile-nav-section-title">Company</div>
            <div className="mobile-nav-item" onClick={() => { setMobileDrawerOpen(false); setShowCompanySelect(true); }}>
              <span className="nav-icon">🏢</span> {activeCompany?.name || 'Select Company'}
            </div>
            <div className="mobile-nav-item" onClick={() => { setMobileDrawerOpen(false); nav('COMPANY_CREATION'); }}>
              <span className="nav-icon">➕</span> Create Company
            </div>
          </div>
          {/* Transactions */}
          <div className="mobile-nav-section">
            <div className="mobile-nav-section-title">Transactions</div>
            {(['Sales','Purchase','Receipt','Payment','Journal','Contra','Credit Note','Debit Note'] as const).map(vt => (
              <div key={vt} className="mobile-nav-item" onClick={() => { setMobileDrawerOpen(false); nav('VOUCHER_ENTRY'); setActiveVoucher(vt as VoucherTypeKey); }}>
                <span className="nav-icon">{vt==='Sales'?'🛒':vt==='Purchase'?'📦':vt==='Receipt'?'💰':vt==='Payment'?'💸':vt==='Journal'?'📒':vt==='Contra'?'🔄':vt==='Credit Note'?'➕':'➖'}</span>
                {vt} Voucher
              </div>
            ))}
          </div>
          {/* Reports */}
          <div className="mobile-nav-section">
            <div className="mobile-nav-section-title">Reports</div>
            <div className="mobile-nav-item" onClick={() => { setMobileDrawerOpen(false); nav('DAY_BOOK'); }}><span className="nav-icon">📅</span> Day Book</div>
            <div className="mobile-nav-item" onClick={() => { setMobileDrawerOpen(false); nav('BALANCE_SHEET'); }}><span className="nav-icon">⚖️</span> Balance Sheet</div>
            <div className="mobile-nav-item" onClick={() => { setMobileDrawerOpen(false); nav('PROFIT_LOSS'); }}><span className="nav-icon">📈</span> Profit & Loss</div>
            <div className="mobile-nav-item" onClick={() => { setMobileDrawerOpen(false); nav('TRIAL_BALANCE'); }}><span className="nav-icon">🗂️</span> Trial Balance</div>
            <div className="mobile-nav-item" onClick={() => { setMobileDrawerOpen(false); nav('LEDGER_REPORT'); }}><span className="nav-icon">📖</span> Ledger Report</div>
            <div className="mobile-nav-item" onClick={() => { setMobileDrawerOpen(false); nav('STOCK_SUMMARY'); }}><span className="nav-icon">📦</span> Stock Summary</div>
          </div>
          {/* Masters */}
          <div className="mobile-nav-section">
            <div className="mobile-nav-section-title">Masters</div>
            <div className="mobile-nav-item" onClick={() => { setMobileDrawerOpen(false); nav('LEDGER_CREATION'); }}><span className="nav-icon">👤</span> Ledger Creation</div>
            <div className="mobile-nav-item" onClick={() => { setMobileDrawerOpen(false); nav('STOCK_ITEM_CREATION'); }}><span className="nav-icon">📦</span> Stock Item</div>
            <div className="mobile-nav-item" onClick={() => { setMobileDrawerOpen(false); nav('MASTER_MENU'); }}><span className="nav-icon">⚙️</span> All Masters</div>
          </div>
          {/* Settings */}
          <div className="mobile-nav-section">
            <div className="mobile-nav-section-title">Settings</div>
            <div className="mobile-nav-item" onClick={() => { setMobileDrawerOpen(false); setShowDate(true); }}><span className="nav-icon">📅</span> Change Date</div>
            <div className="mobile-nav-item" onClick={() => { setMobileDrawerOpen(false); setShowPeriod(true); }}><span className="nav-icon">📆</span> Change Period</div>
            <div className="mobile-nav-item" onClick={() => { setMobileDrawerOpen(false); setShowExportModal(true); }}><span className="nav-icon">📤</span> Export Data</div>
          </div>
          {/* Footer */}
          <div className="mobile-nav-footer">
            {currentUser?.plan !== 'LIFETIME' && !currentUser?.isAdmin && (
              <button className="mobile-nav-upgrade-btn" onClick={() => { setMobileDrawerOpen(false); setShowUpgradeModal(true); }}>⬆ Upgrade</button>
            )}
            <button className="mobile-nav-logout-btn" onClick={() => { setMobileDrawerOpen(false); handleLogout(); }}>Logout</button>
          </div>
        </div>
      </div>

      {/* ===== MOBILE COMPANY BAR (hidden on desktop via CSS) ===== */}
      <div className="mobile-company-bar">
        <div>
          <div className="mobile-company-name">🏢 {activeCompany?.name || 'No Company Selected'}</div>
          <div className="mobile-company-date">{currentDate} · {currentPeriod.start} – {currentPeriod.end}</div>
        </div>
        <button onClick={() => setShowCompanySelect(true)} style={{background:'#1d4885',color:'white',border:'none',padding:'5px 10px',borderRadius:6,fontSize:11,fontWeight:'bold',cursor:'pointer'}}>
          Change
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content">
        {/* MENU SCREENS */}
        {!isFormScreen && (
          <>
            <div className="left-panel">
              <div className="company-info-header">
                <div style={{fontWeight:'bold',fontSize:11,color:'#1d4885',cursor:'pointer'}} onClick={()=>setShowPeriod(true)}>CURRENT PERIOD</div>
                <div style={{fontWeight:'bold',fontSize:11,color:'#1d4885',cursor:'pointer'}} onClick={()=>setShowDate(true)}>CURRENT DATE</div>
              </div>
              <div className="company-info-data">
                <div style={{cursor:'pointer'}} onClick={()=>setShowPeriod(true)}>{currentPeriod.start} to {currentPeriod.end}</div>
                <div style={{cursor:'pointer'}} onClick={()=>setShowDate(true)}>{currentDate}</div>
              </div>
              <table className="company-table">
                <thead><tr><th>NAME OF COMPANY</th><th style={{textAlign:'right'}}>LAST ENTRY</th></tr></thead>
                <tbody>
                  {activeCompany ? (
                    <tr className="active-row">
                      <td style={{fontWeight:'bold'}}>{activeCompany?.name}</td>
                      <td style={{textAlign:'right',fontSize:12}}>10-Apr-26</td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={2} style={{textAlign:'center', color:'#888', fontSize:11, padding:'20px 0'}}>
                        No Company Open. <br/> Press F3 to Select/Create.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {/* Quick Stats */}
              {(() => {
                const cashLedger = ledgers.find(l => l.name === 'Cash' || l.groupName === 'Cash-in-hand');
                const bankLedgers = ledgers.filter(l => l.groupName === 'Bank Accounts');
                const cashBal = cashLedger ? getLedgerClosingBalance(cashLedger, vouchers) : 0;
                const bankBal = bankLedgers.reduce((s, l) => s + getLedgerClosingBalance(l, vouchers), 0);
                return (
                  <div style={{padding:'10px 15px',borderTop:'1px solid #ccc',fontSize:12}}>
                    <div style={{color:'#1d4885',fontWeight:'bold',marginBottom:6}}>QUICK OVERVIEW</div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                      <span>Cash Balance</span><span style={{fontWeight:'bold',color:'#006600'}}>
                        ₹ {fmt(cashBal)}
                      </span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                      <span>Bank Balance</span><span style={{fontWeight:'bold',color:'#006600'}}>
                        ₹ {fmt(bankBal)}
                      </span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                      <span>Total Vouchers</span><span style={{fontWeight:'bold'}}>{vouchers.length}</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <span>Total Ledgers</span><span style={{fontWeight:'bold'}}>{ledgers.length}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="right-core">
              <div className="tally-menu-container">
                {screen==='GATEWAY_MAIN' && (
                  <div className="tally-menu-box">
                    <div className="tally-menu-title">Gateway of LedgerX</div>
                    <div className="menu-list-container">
                      {gatewayMenu.map((item,i)=>{
                        if(item.category==='header') return <div key={i} className="menu-header">{item.label}</div>;
                        return <div key={i} className={`menu-item ${selectedIdx===i?'selected':''}`} onClick={()=>{setSelectedIdx(i);item.action?.();}}>
                          <span className="highlight">{item.highlight}</span>: {item.label}
                        </div>;
                      })}
                    </div>
                  </div>
                )}
                {['MASTER_MENU','ALTER_MENU','DISPLAY_REPORTS_MENU','ACCOUNT_BOOKS_MENU'].includes(screen) && (
                  <div className="tally-menu-box">
                    <div className="tally-menu-title">
                      {screen==='MASTER_MENU'&&'List of Masters'}
                      {screen==='ALTER_MENU'&&'List of Masters (Alter)'}
                      {screen==='DISPLAY_REPORTS_MENU'&&'Display More Reports'}
                      {screen==='ACCOUNT_BOOKS_MENU'&&'Account Books'}
                    </div>
                    <div className="menu-list-container">
                      {getActiveMenu().map((item,i)=>{
                        if(item.label===''&&item.category==='header') return <div key={i} style={{height:6}}/>;
                        if(item.category==='header') return <div key={i} className="menu-header">{item.label}</div>;
                        return <div key={i} className={`menu-item ${selectedIdx===i?'selected':''}`} onClick={()=>{setSelectedIdx(i);item.action?.();}}>
                          {item.label.split('').map((ch,ci)=>ch.toUpperCase()===item.highlight.toUpperCase()&&item.label.indexOf(ch)===item.label.toUpperCase().indexOf(item.highlight.toUpperCase())?<span key={ci} className="highlight">{ch}</span>:ch)}
                        </div>;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* FORM SCREENS */}
        {isFormScreen && (
          <div className="form-workspace">
            {screen==='COMPANY_CREATION'    && <CompanyCreationForm    key={formKey} activeAlterItem={alterItem} companies={companies} onSave={async d=>{const ok=await saveMaster('company',d); if(ok){setScreen('GATEWAY_MAIN'); setHistory([]);}}} onDelete={deleteMaster} />}
            {screen==='GROUP_CREATION'      && <GroupCreationForm      key={formKey} activeAlterItem={alterItem} onSave={async d=>{const ok=await saveMaster('group',d); if(ok){if(altCReturnContext)setAltCReturnContext({...altCReturnContext,newItem:ok}); alterItem?goBack():resetForm(d.name);}}} onDelete={deleteMaster} onAltC={handleOpenAltC} ledgers={ledgers} groups={groups} />}
            {screen==='LEDGER_CREATION'     && <LedgerCreationForm     key={formKey} activeAlterItem={alterItem} onSave={async d=>{const ok=await saveMaster('ledger',d); if(ok){if(altCReturnContext)setAltCReturnContext({...altCReturnContext,newItem:ok}); alterItem?goBack():resetForm(d.name);}}} onDelete={deleteMaster} onAltC={handleOpenAltC} ledgers={ledgers} groups={groups} />}
            {screen==='CURRENCY_CREATION'   && <CurrencyCreationForm   key={formKey} activeAlterItem={alterItem} currencies={currencies} onSave={async d=>{const ok=await saveMaster('currency',d); if(ok){if(altCReturnContext)setAltCReturnContext({...altCReturnContext,newItem:ok}); alterItem?goBack():resetForm(d.name||d.symbol);}}} onDelete={deleteMaster} />}
            {screen==='VOUCHER_TYPE_CREATION'&& <VoucherTypeCreationForm key={formKey} activeAlterItem={alterItem} voucherTypes={voucherTypes} onSave={async d=>{const ok=await saveMaster('voucherType',d); if(ok){if(altCReturnContext)setAltCReturnContext({...altCReturnContext,newItem:ok}); alterItem?goBack():resetForm(d.name);}}} onDelete={deleteMaster} />}
            {screen==='STOCK_GROUP_CREATION' && <StockGroupCreationForm  key={formKey} activeAlterItem={alterItem} stockGroups={stockGroups} onSave={async d=>{const ok=await saveMaster('stockGroup',d); if(ok){if(altCReturnContext)setAltCReturnContext({...altCReturnContext,newItem:ok}); alterItem?goBack():resetForm(d.name);}}} onDelete={deleteMaster} onAltC={handleOpenAltC} />}
            {screen==='STOCK_CATEGORY_CREATION'&&<StockCategoryCreationForm key={formKey} activeAlterItem={alterItem} stockCategories={stockCategories} onSave={async d=>{const ok=await saveMaster('stockCategory',d); if(ok){if(altCReturnContext)setAltCReturnContext({...altCReturnContext,newItem:ok}); alterItem?goBack():resetForm(d.name);}}} onDelete={deleteMaster} />}
            {screen==='STOCK_ITEM_CREATION'  && <StockItemCreationForm  key={formKey} activeAlterItem={alterItem} stockGroups={stockGroups} stockCategories={stockCategories} units={units} stockItems={stockItems} onSave={async d=>{const ok=await saveMaster('stockItem',d); if(ok){if(altCReturnContext)setAltCReturnContext({...altCReturnContext,newItem:ok}); alterItem?goBack():resetForm(d.name);}}} onDelete={deleteMaster} onAltC={handleOpenAltC} activeCompany={activeCompany} setActiveCompany={setActiveCompany} setCompanies={setCompanies} />}
            {screen==='UNIT_CREATION'        && <UnitCreationForm        key={formKey} activeAlterItem={alterItem} units={units} onSave={async d=>{const ok=await saveMaster('unit',d); if(ok){if(altCReturnContext)setAltCReturnContext({...altCReturnContext,newItem:ok}); alterItem?goBack():resetForm(d.name||d.symbol);}}} onDelete={deleteMaster} />}
            {screen==='GODOWN_CREATION'      && <GodownCreationForm      key={formKey} activeAlterItem={alterItem} godowns={godowns} onSave={async d=>{const ok=await saveMaster('godown',d); if(ok){if(altCReturnContext)setAltCReturnContext({...altCReturnContext,newItem:ok}); alterItem?goBack():resetForm(d.name);}}} onDelete={deleteMaster} />}
            {screen==='VOUCHER_ENTRY'        && <VoucherEntryForm key={formKey} activeAlterItem={alterItem} activeVoucher={activeVoucher} ledgers={ledgers} stockItems={stockItems} units={units} vouchers={vouchers} activeCompany={activeCompany} onAltC={handleOpenAltC} onSave={saveVoucher} onDelete={deleteVoucher} onChangeType={setActiveVoucher} currentDate={currentDate} onF2={handleShowDate} onCancel={goBack} onPrintPreview={v=>{setPrintVoucher(v);nav('PRINT_PREVIEW');}} voucherTypes={voucherTypes} altCReturnContext={altCReturnContext} onAltCReturnHandled={()=>setAltCReturnContext(null)} setAltCReturnContext={setAltCReturnContext} onNav={nav} setSaveToast={setSaveToast} onSaveMaster={saveMaster} />}
            {screen==='DAY_BOOK'             && <DayBookView vouchers={filteredVouchers.filter(v => v.type !== 'Sales Quotation' && v.type !== 'Quotation')} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='BALANCE_SHEET'        && <BalanceSheetView ledgers={ledgers} vouchers={filteredVouchers.filter(v => v.type !== 'Sales Quotation' && v.type !== 'Quotation')} currentPeriod={currentPeriod} onBack={goBack} onDrillDownLedger={id=>{setReportLedgerId(id); nav('LEDGER_REPORT');}} onDrillDownGroup={gn=>{setReportGroupName(gn); nav('GROUP_SUMMARY');}} onDrillDownVoucher={v=>{nav('VOUCHER_ENTRY',v); setActiveVoucher(v.type as VoucherTypeKey);}} />}
            {screen==='PROFIT_LOSS'          && <ProfitLossView ledgers={ledgers} vouchers={filteredVouchers.filter(v => v.type !== 'Sales Quotation' && v.type !== 'Quotation')} currentPeriod={currentPeriod} stockItems={stockItems} onBack={goBack} onDrillDownLedger={id=>{setReportLedgerId(id); nav('LEDGER_REPORT');}} onDrillDownGroup={gn=>{setReportGroupName(gn); nav('GROUP_SUMMARY');}} onDrillDownVoucher={v=>{nav('VOUCHER_ENTRY',v); setActiveVoucher(v.type as VoucherTypeKey);}} />}
            {screen==='TRIAL_BALANCE'        && <TrialBalanceView ledgers={ledgers} vouchers={filteredVouchers.filter(v => v.type !== 'Sales Quotation' && v.type !== 'Quotation')} currentPeriod={currentPeriod} onBack={goBack} onDrillDownLedger={id=>{setReportLedgerId(id); nav('LEDGER_REPORT');}} onDrillDownGroup={gn=>{setReportGroupName(gn); nav('GROUP_SUMMARY');}} onSaveOpeningBalance={async (ledgerId, ob, bt) => { const token = authClient.getToken(); const res = await fetch('/api/ledgers', {method:'PUT',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({id:ledgerId,openingBalance:ob,balanceType:bt})}); const d = await res.json(); if(d.success){setAllLedgers(p=>p.map(x=>x.id===ledgerId?{...x,openingBalance:ob,balanceType:bt}:x));} }} />}
            {screen==='SALES_REGISTER'       && <UniversalRegisterView voucherType='Sales'       vouchers={filteredVouchers} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='QUOTATION_REGISTER'   && <UniversalRegisterView voucherType='Sales Quotation' vouchers={filteredVouchers} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='PURCHASE_REGISTER'    && <UniversalRegisterView voucherType='Purchase'    vouchers={filteredVouchers} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='CONTRA_REGISTER'      && <UniversalRegisterView voucherType='Contra'      vouchers={filteredVouchers} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='PAYMENT_REGISTER'     && <UniversalRegisterView voucherType='Payment'     vouchers={filteredVouchers} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='RECEIPT_REGISTER'     && <UniversalRegisterView voucherType='Receipt'     vouchers={filteredVouchers} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='JOURNAL_REGISTER'     && <UniversalRegisterView voucherType='Journal'     vouchers={filteredVouchers} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='DEBIT_NOTE_REGISTER'  && <UniversalRegisterView voucherType='Debit Note'  vouchers={filteredVouchers} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='CREDIT_NOTE_REGISTER' && <UniversalRegisterView voucherType='Credit Note' vouchers={filteredVouchers} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='LEDGER_REPORT'        && <LedgerReportView ledgers={ledgers} vouchers={filteredVouchers} preselectedId={reportLedgerId} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='GROUP_SUMMARY'        && <GroupSummaryView ledgers={ledgers} vouchers={filteredVouchers} groupName={reportGroupName} onBack={goBack} onDrillDownLedger={id=>{setReportLedgerId(id); nav('LEDGER_REPORT');}} onDrillDownGroup={gn=>{setReportGroupName(gn); nav('GROUP_SUMMARY');}} />}
            {screen==='STOCK_SUMMARY'        && <StockSummaryView stockItems={stockItems} stockGroups={stockGroups} vouchers={filteredVouchers} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={(id: number)=>{setReportLedgerId(id); nav('LEDGER_REPORT');}} onDrillDownVoucher={(v: Voucher)=>{nav('VOUCHER_ENTRY',v); setActiveVoucher(v.type as VoucherTypeKey);}} onSaveOpeningStock={async (itemId: number, qty: number, rate: number) => { const token = authClient.getToken(); const res = await fetch('/api/stock-items', {method:'PUT',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({id:itemId,openingQty:qty,openingRate:rate})}); const d = await res.json(); if(d.success){setAllStockItems(p=>p.map(x=>x.id===itemId?{...x,openingQty:qty,openingRate:rate}:x));} }} />}
            {screen==='OUTSTANDING_REPORT'   && <OutstandingView ledgers={ledgers} vouchers={filteredVouchers} onBack={goBack} onDrillDown={ledgerId=>{ setReportLedgerId(ledgerId); nav('LEDGER_REPORT'); }} />}
            {screen==='CHART_OF_ACCOUNTS'    && <ChartOfAccountsView ledgers={ledgers} vouchers={filteredVouchers} onBack={goBack} />}
            {screen==='PRINT_PREVIEW'        && <PrintPreview vouchers={vouchers} company={activeCompany} companies={companies} printVoucher={printVoucher} ledgers={ledgers} onSelectVoucher={setPrintVoucher} />}
            {screen==='GSTR1_REPORT'         && (
              <GSTR1ReportView 
                vouchers={filteredVouchers} 
                activeCompany={activeCompany} 
                ledgers={ledgers} 
                currentPeriod={currentPeriod} 
                allUnits={allUnits} 
                goBack={goBack} 
                onDrillDownVoucher={(v)=>nav('VOUCHER_ENTRY',v)}
                drillDown={gstr1DrillDown}
                setDrillDown={setGstr1DrillDown}
                drillDownParty={gstr1DrillDownParty}
                setDrillDownParty={setGstr1DrillDownParty}
                selectedRow={gstr1SelectedRow}
                setSelectedRow={setGstr1SelectedRow}
                selectedVchIdx={gstr1SelectedVchIdx}
                setSelectedVchIdx={setGstr1SelectedVchIdx}
              />
            )}
            {screen==='GSTR3B_REPORT'        && <GSTR3BReportView vouchers={vouchers} goBack={goBack} />}
            {screen==='USER_ROLES'           && <RoleManagementView goBack={goBack} />}
            {screen==='DATA_EXCHANGE'        && <DataExchangeView goBack={goBack} ledgers={ledgers} vouchers={vouchers} stockItems={stockItems} activeCompany={activeCompany} onDataImported={()=>window.location.reload()} />}
            {screen==='ALTER_LIST' && (
              <AlterListView type={alterListType} ledgers={ledgers} groups={groups} stockGroups={stockGroups}
                companies={companies}
                units={units} voucherTypes={voucherTypes} currencies={currencies}
                stockItems={stockItems} stockCategories={stockCategories} godowns={godowns}
                onSelect={item=>{
                  if(alterListType==='Company') {
                    if (item.securityControl && item.password) {
                      setPwdPrompt({ company: item, action: 'alter' });
                    } else {
                      nav('COMPANY_CREATION',item);
                    }
                  }
                  else if(alterListType==='Ledger')   nav('LEDGER_CREATION',item);
                  else if(alterListType==='Group')    nav('GROUP_CREATION',item);
                  else if(alterListType==='Currency') nav('CURRENCY_CREATION',item);
                  else if(alterListType==='Stock Item') nav('STOCK_ITEM_CREATION',item);
                  else if(alterListType==='Stock Group') nav('STOCK_GROUP_CREATION',item);
                  else if(alterListType==='Unit')     nav('UNIT_CREATION',item);
                  else if(alterListType==='Voucher Type') nav('VOUCHER_TYPE_CREATION',item);
                  else if(alterListType==='Godown')   nav('GODOWN_CREATION',item);
                  else if(alterListType==='Stock Category') nav('STOCK_CATEGORY_CREATION',item);
                }}
              />
            )}
          </div>
        )}

        {/* SIDEBAR */}
        <div className="sidebar" style={{display:screen==='VOUCHER_ENTRY'?'none':'flex'}}>
          <div className="sidebar-btn" onClick={()=>setShowDate(true)}>F2: Date</div>
          <div className="sidebar-btn" onClick={()=>setShowCompanySelect(true)}>F3: Company</div>
          <div className="sidebar-btn" onClick={()=>{nav('VOUCHER_ENTRY');setActiveVoucher('Contra');}}>F4: Contra</div>
          <div className="sidebar-btn" onClick={()=>{nav('VOUCHER_ENTRY');setActiveVoucher('Payment');}}>F5: Payment</div>
          <div className="sidebar-btn" onClick={()=>{nav('VOUCHER_ENTRY');setActiveVoucher('Receipt');}}>F6: Receipt</div>
          <div className="sidebar-btn" onClick={()=>{nav('VOUCHER_ENTRY');setActiveVoucher('Journal');}}>F7: Journal</div>
          <div className="sidebar-btn" onClick={()=>{nav('VOUCHER_ENTRY');setActiveVoucher('Sales');}}>F8: Sales</div>
          <div className="sidebar-btn" onClick={()=>{nav('VOUCHER_ENTRY');setActiveVoucher('Sales Quotation');}}>Alt+F8: Quotation</div>
          <div className="sidebar-btn" onClick={()=>{nav('VOUCHER_ENTRY');setActiveVoucher('Purchase');}}>F9: Purchase</div>
          <div className="sidebar-btn" onClick={()=>{nav('VOUCHER_ENTRY');setActiveVoucher('Sales Quotation');}}>F10: Quotation</div>
          <div className="sidebar-btn-spacer"/>
          <div className="sidebar-btn" onClick={()=>setShowFeatures(true)}>F11: Features</div>
          <div className="sidebar-btn">F12: Configure</div>
        </div>
      </div>

      {/* ====== MODALS ====== */}
      {altCCtx && (
        <AltCModal 
          ctx={altCCtx} 
          ledgers={ledgers} 
          stockGroups={stockGroups} 
          units={units} 
          voucherTypes={voucherTypes} 
          groups={groups}
          stockItems={stockItems}
          stockCategories={stockCategories}
          godowns={godowns}
          currencies={currencies}
          onClose={() => {
            setAltCCtx(null);
            setTimeout(() => lastFocusRef.current?.focus(), 80);
          }}
          onSaveMaster={saveMaster}
          onDeleteMaster={deleteMaster}
          activeCompany={activeCompany}
          setActiveCompany={setActiveCompany}
          setCompanies={setCompanies}
        />
      )}

      {showCompanySelect && (
        <div className="modal-overlay" onClick={()=>setShowCompanySelect(false)}>
          <div className="modal-box" style={{width:480}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">Company (F3)</div>
            <div style={{padding:'6px 12px',background:'#eef',fontSize:12,borderBottom:'1px solid #ccc'}}><b>List of Companies</b></div>
            <div className="modal-list">
              {[
                {label:'Create Company',action:()=>{setShowCompanySelect(false);nav('COMPANY_CREATION');}},
                {label:'Alter Company', action:()=>{setShowCompanySelect(false);nav('ALTER_LIST',undefined,'Company');}},
                {label:'Delete Company', action:()=>{setShowCompanySelect(false);nav('ALTER_LIST',undefined,'Company'); alert('Select a company to alter, then press Alt+D or click Delete button to remove it.');}},
                {label:'---', category:'header'},
                ...companies.map(c=>({ label: c.name, action: ()=>{ 
                  if (c.securityControl && c.password) {
                    setPwdPrompt({ company: c, action: 'open' });
                  } else {
                    setActiveCompany(c);
                  }
                } }))
              ].map((m,i)=>{
                if (m.label === '---' && m.category === 'header') {
                  return <div key={i} style={{ borderBottom: '2px solid #1c5282', margin: '4px 0' }} />;
                }
                return (
                  <div key={i} className={`modal-list-item ${companyModalIdx===i?'selected':''}`} onClick={m.action}>
                    {m.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showPeriod && (
        <div className="modal-overlay" onClick={()=>setShowPeriod(false)}>
          <div className="modal-box" style={{width:380, border:'2px solid #1c5282'}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header" style={{background:'#1c5282'}}>Change Period</div>
            <div style={{padding:'20px'}}>
              <div className="form-row">
                <label style={{width:100}}>From</label><span className="colon">:</span>
                <input id="period-from" type="text" className="form-input" 
                  defaultValue={currentPeriod.start} 
                  autoFocus 
                  ref={el => { if(el) setTimeout(() => { el.focus(); el.select(); }, 50); }}
                  onFocus={e => e.currentTarget.select()}
                  onKeyDown={e => {
                    if(e.key === 'Enter') {
                      e.preventDefault(); e.stopPropagation();
                      const toInput = document.getElementById('period-to') as HTMLInputElement;
                      if (toInput) {
                        toInput.focus();
                        toInput.select();
                      }
                    }
                    if(e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setShowPeriod(false); }
                  }}
                />
              </div>
              <div className="form-row">
                <label style={{width:100}}>To</label><span className="colon">:</span>
                <input id="period-to" type="text" className="form-input" 
                  defaultValue={currentPeriod.end} 
                  onFocus={e => e.currentTarget.select()}
                  onKeyDown={e => {
                    if(e.key === 'Enter') {
                      e.preventDefault(); e.stopPropagation();
                      const btn = document.getElementById('period-accept-btn') as HTMLElement;
                      if (btn) btn.focus();
                    }
                    if(e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setShowPeriod(false); }
                  }}
                />
              </div>
              <div style={{marginTop:20,display:'flex',justifyContent:'flex-end', gap:10}}>
                <button 
                  id="period-accept-btn"
                  className="tally-btn" 
                  style={{background:'#1c5282', color:'white', border:'none', padding:'6px 20px', cursor:'pointer'}}
                  onKeyDown={e => {
                    if(e.key === 'Enter') {
                      e.preventDefault(); e.stopPropagation();
                      const start=(document.getElementById('period-from') as HTMLInputElement).value;
                      const end=(document.getElementById('period-to') as HTMLInputElement).value;
                      setCurrentPeriod({start,end});
                      setShowPeriod(false);
                    }
                    if(e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setShowPeriod(false); }
                  }}
                  onClick={()=>{
                    const start=(document.getElementById('period-from') as HTMLInputElement).value;
                    const end=(document.getElementById('period-to') as HTMLInputElement).value;
                    setCurrentPeriod({start,end});
                    setShowPeriod(false);
                  }}
                >Accept (Enter)</button>
                <button className="tally-btn" style={{background:'#eee', color:'#333', border:'1px solid #ccc'}} onClick={()=>setShowPeriod(false)}>Cancel</button>
              </div>
            </div>
            <div style={{padding:'5px 15px', background:'#f0f4f8', fontSize:10, color:'#666', borderTop:'1px solid #ddd'}}>
              Use Format: DD-MMM-YYYY (e.g., 01-Apr-2026)
            </div>
          </div>
        </div>
      )}

      {showFeatures && activeCompany && (
        <div className="modal-overlay" onClick={()=>setShowFeatures(false)}>
          <div className="modal-box" style={{width:820}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">Company Features (F11)</div>
            <div style={{padding:20,display:'flex',gap:20}}>
              {[
                {title:'Accounting Features', rows:[['Maintain Accounts Only','No'],['Enable Bill-wise entry','Yes'],['Activate Interest Calculation','No'],['Enable Cost Centres','No'],['Maintain Multiple Currencies','No']]},
                {title:'Inventory Features', rows:[
                  ['Maintain Stock Categories','No'],
                  ['Maintain Multiple Godowns','No'],
                  ['Show Discount in Invoices', activeCompany.showDiscount ? 'Yes' : 'No', 'showDiscount'],
                  ['Integrate Accounts & Inventory','Yes'],
                ]},
                {title:'Taxation & Setup', rows:[
                  ['Enable GST','Yes'],
                  ['Enable TDS','No'],
                  ['Setup Standard Ledgers', 'Setup', 'initStandardLedgers']
                ]},
              ].map((sec,si)=>(
                <div key={si} style={{flex:1}}>
                  <div className="feature-section" style={{fontWeight:'bold', color:'#1c5282', borderBottom:'1px solid #ccc', marginBottom:10, fontSize:12}}>{sec.title}</div>
                  {sec.rows.map(([label,val,key],ri)=>(
                    <div key={ri} className="feature-row" style={{fontSize:12, marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <span>{label}</span>
                      {key === 'initStandardLedgers' ? (
                        <button 
                          className="tally-btn" 
                          style={{fontSize:10, padding:'2px 8px', background:'#e8f5e9', color:'#2e7d32', border:'1px solid #4caf50'}}
                          onClick={initStandardLedgers}
                        >
                          Initialize
                        </button>
                      ) : (
                        <select 
                          className="form-input" 
                          style={{width:60}} 
                          value={val}
                          onChange={async (e) => {
                            if (key) {
                              const newVal = e.target.value === 'Yes';
                              // Optimistic update
                              const updatedCo = { ...activeCompany, [key]: newVal };
                              setActiveCompany(updatedCo);
                              setCompanies(prev => prev.map(c => c.id === activeCompany.id ? updatedCo : c));
                            }
                          }}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{background:'#f4f8fb',padding:'12px 15px',borderTop:'1px solid #dde',display:'flex',justifyContent:'flex-end',gap:15}}>
              <button 
                className="tally-btn" 
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/companies?id=${activeCompany.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(activeCompany)
                    });
                    if (res.ok) {
                      setSaveToast('Features updated successfully!');
                      setTimeout(() => setSaveToast(null), 3000);
                      setShowFeatures(false);
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                Accept (Ctrl+A)
              </button>
              <button className="tally-btn" style={{background:'#eee', color:'#333', border:'1px solid #ccc'}} onClick={()=>setShowFeatures(false)}>Abandon</button>
            </div>
            <div style={{background:'#f4f8fb',padding:'4px 15px',fontSize:10,color:'#666'}}>Ctrl+A: Accept | Esc: Abandon</div>
          </div>
        </div>
      )}

      {showGST && (
        <div className="modal-overlay" onClick={()=>setShowGST(false)}>
          <div className="modal-box" style={{width:560}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">GST Details</div>
            <div style={{padding:'20px 25px'}}>
              {[
                ['GSTIN/UIN','text','gst-gstin','05AAIPA1234R1Z5'],
                ['Registration Type','select','gst-reg','Regular'],
                ['Applicable From','text','gst-date','1-Apr-2026'],
              ].map(([label,type,id,val],i)=>(
                <div key={i} className="form-row">
                  <label style={{width:200}}>{label}</label><span className="colon">:</span>
                  {type==='select'?<select id={id} className="form-input" style={{width:200}}><option>Regular</option><option>Composition</option><option>Unregistered</option></select>
                   :<input id={id} type="text" className="form-input" style={{width:200}} defaultValue={val as string} autoFocus={i===0} />}
                </div>
              ))}
              <div className="form-row"><label style={{width:200}}>Nature of Business</label><span className="colon">:</span><select className="form-input" style={{width:200}}><option>Manufacturer</option><option>Trader</option><option>Service Provider</option></select></div>
            </div>
            <div style={{padding:'8px 15px',textAlign:'right',background:'#f4f8fb',borderTop:'1px solid #dde',fontSize:11}}>
              <button onClick={()=>setShowGST(false)} style={{background:'#1c5282',color:'white',border:'none',padding:'4px 20px',cursor:'pointer',marginRight:8}}>Accept</button>
              <button onClick={()=>setShowGST(false)} style={{padding:'4px 15px',cursor:'pointer'}}>Abandon</button>
            </div>
          </div>
        </div>
      )}

      {showDate && (
        <div className="modal-overlay" onClick={handleCloseDate}>
          <div className="modal-box" style={{width:320}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">Change Date (F2)</div>
            <div style={{padding:20}}>
              <div className="form-row"><label style={{width:120}}>Voucher Date</label><span className="colon">:</span>
                <input
                  ref={el => {
                    if (el) {
                      setTimeout(() => {
                        el.focus();
                        el.select();
                      }, 50);
                    }
                  }}
                  onFocus={e => {
                    const target = e.target as HTMLInputElement;
                    setTimeout(() => target.select(), 10);
                  }}
                  autoFocus type="text" className="form-input" style={{width:160}}
                  defaultValue={currentDate}
                  placeholder="DD/MM/YYYY"
                  onKeyDown={e=>{
                    if(e.key==='Enter') {
                      e.preventDefault(); e.stopPropagation();
                      let val = (e.target as HTMLInputElement).value;
                      if(val) {
                        // basic Tally-like DD/MM/YYYY parser
                        let s = val.replace(/[\.\/]/g, '-').trim();
                        const parts = s.split('-');
                        if(parts.length >= 2){
                          let md = parseInt(parts[0]);
                          let mmStr = parts[1];
                          let yy = parts.length === 3 ? parseInt(parts[2]) : new Date().getFullYear();
                          if(yy < 100) yy += 2000;
                          let mm = parseInt(mmStr);
                          if(isNaN(mm)) {
                            const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
                            const idx = monthNames.findIndex(m => mmStr.toLowerCase().startsWith(m));
                            if(idx !== -1) mm = idx + 1;
                          }
                          if(!isNaN(mm) && mm >= 1 && mm <= 12) {
                            const dateObj = new Date(yy, mm-1, md);
                            if(!isNaN(dateObj.getTime())) {
                               val = dateObj.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}).replace(/ /g,'-');
                            }
                          }
                        }
                        setCurrentDate(val);
                      }
                      handleCloseDate();
                    }
                    if(e.key==='Escape') { e.preventDefault(); e.stopPropagation(); handleCloseDate(); }
                  }}
                />
              </div>
              <div style={{fontSize:11, color:'#666', marginTop:5}}>Format: DD/MM/YYYY (e.g. 18/04/2026)</div>
              <button 
                id="date-accept-btn"
                onClick={()=>{
                   const el = document.querySelector('.modal-box input') as HTMLInputElement;
                   if(el) el.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter'}));
                }} 
                style={{marginTop:15,background:'#1c5282',color:'white',border:'none',padding:'5px 20px',cursor:'pointer',display:'block',width:'100%'}}>Accept (Enter)</button>
            </div>
          </div>
        </div>
      )}
      
      {isExporting && (
        <div className="modal-overlay" style={{zIndex: 9999}}>
          <div style={{background:'white', padding:'20px 40px', borderRadius:'4px', boxShadow:'0 4px 20px rgba(0,0,0,0.3)', textAlign:'center', color:'#1d4885', fontWeight:'bold', fontSize:'16px'}}>
            <div style={{marginBottom:10}}>Generating File...</div>
            <div style={{fontSize:'12px', color:'#666'}}>Please wait while we format your report.</div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="modal-overlay" onClick={()=>setShowExportModal(false)}>
          <div className="modal-box" style={{width:420}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">Export Report (Alt+E)</div>
            <div style={{padding:20}}>
              <div className="form-row">
                <label style={{width:130}}>Format</label><span className="colon">:</span>
                <select id="export-format" className="form-input" style={{width:200}} autoFocus onChange={(e) => {
                   const input = document.getElementById('export-filename') as HTMLInputElement;
                   if (input) {
                     input.value = e.target.value === 'pdf' ? `${screen.toLowerCase()}.pdf` : `${screen.toLowerCase()}.csv`;
                   }
                }}>
                  <option value="pdf">PDF (Print Format)</option>
                  <option value="excel">Excel (CSV)</option>
                </select>
              </div>
              <div className="form-row" style={{marginTop:10}}>
                <label style={{width:130}}>Folder Path</label><span className="colon">:</span>
                <input type="text" className="form-input" style={{width:140}} value={exportDirPath} readOnly title="Click Browse to select a custom folder" />
                <button 
                  onClick={async () => {
                    try {
                      if ('showDirectoryPicker' in window) {
                        const handle = await (window as any).showDirectoryPicker();
                        setExportDirHandle(handle);
                        setExportDirPath(`...\\${handle.name}`);
                      } else {
                        alert("Your browser does not support folder selection. The default downloads folder will be used.");
                      }
                    } catch(e) { console.error('Directory picking cancelled'); }
                  }}
                  style={{marginLeft:5, padding:'3px 10px', fontSize:12, fontWeight:'bold', background:'#e2eaf2', border:'1px solid #91b9d7', cursor:'pointer', color:'#1d4885'}}
                >Browse</button>
              </div>
              <div className="form-row" style={{marginTop:10}}>
                <label style={{width:130}}>File Name</label><span className="colon">:</span>
                <input id="export-filename" type="text" className="form-input" style={{width:200}} defaultValue={`${screen.toLowerCase()}.pdf`} />
              </div>
              <button 
                onClick={()=>{
                   const fmt = (document.getElementById('export-format') as HTMLSelectElement).value;
                   const fName = (document.getElementById('export-filename') as HTMLInputElement).value;
                   setShowExportModal(false);
                   if (fmt === 'pdf') {
                     handlePdfExport(fName);
                   } else if (fmt === 'excel') {
                     handleExcelExport(fName);
                   }
                }} 
                style={{marginTop:25,background:'#1c5282',color:'white',border:'none',padding:'6px 20px',cursor:'pointer',display:'block',width:'100%',fontWeight:'bold'}}>
                Export (Enter)
              </button>
            </div>
          </div>
        </div>
      )}

      {showEmailModal && (
        <div className="modal-overlay" onClick={()=>setShowEmailModal(false)}>
          <div className="modal-box" style={{width:450}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">E-Mail Report (Alt+M)</div>
            <div style={{padding:20}}>
              <div className="form-row">
                <label style={{width:100}}>E-mail To</label><span className="colon">:</span>
                <input id="email-to" type="text" className="form-input" style={{width:250}} placeholder="recipient@example.com" autoFocus />
              </div>
              <div className="form-row" style={{marginTop:10}}>
                <label style={{width:100}}>Subject</label><span className="colon">:</span>
                <input id="email-subj" type="text" className="form-input" style={{width:250}} defaultValue={`LedgerX Report: ${screen.replace(/_/g, ' ')}`} />
              </div>
              <div className="form-row" style={{marginTop:10, alignItems:'flex-start'}}>
                <label style={{width:100}}>Message</label><span className="colon">:</span>
                <textarea id="email-msg" className="form-input" style={{width:250, height:60}} defaultValue="Please find the attached/included report data." />
              </div>
              <button 
                onClick={()=>{
                   const to = (document.getElementById('email-to') as HTMLInputElement).value;
                   const subj = (document.getElementById('email-subj') as HTMLInputElement).value;
                   const msg = (document.getElementById('email-msg') as HTMLTextAreaElement).value;
                   setShowEmailModal(false);
                   handleEmailSend(to, subj, msg);
                }} 
                style={{marginTop:25,background:'#1a7a4a',color:'white',border:'none',padding:'6px 20px',cursor:'pointer',display:'block',width:'100%',fontWeight:'bold'}}>
                Send E-mail (Enter)
              </button>
            </div>
          </div>
        </div>
      )}

      {pwdPrompt && (
        <div className="modal-overlay" onKeyDown={e => {
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setPwdPrompt(null); }
          if (e.key === 'Enter') {
            e.preventDefault(); e.stopPropagation();
            const p = (document.getElementById('prompt-pwd') as HTMLInputElement)?.value;
            if (p === pwdPrompt.company.password) {
               const comp = pwdPrompt.company;
               const action = pwdPrompt.action;
               setPwdPrompt(null);
               if (action === 'open') {
                 setActiveCompany(comp);
                 setShowCompanySelect(false);
                 setScreen('GATEWAY_MAIN');
                 setHistory([]);
               } else {
                 nav('COMPANY_CREATION', comp);
               }
            } else {
               alert('Wrong Password!');
            }
          }
        }}>
          <div className="modal-box" style={{width:350}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">Company Authorization</div>
            <div style={{padding:20, textAlign:'center'}}>
              <div style={{fontWeight:'bold', marginBottom:15, color:'#1c5282'}}>{pwdPrompt.company.name}</div>
              <div className="form-row" style={{justifyContent:'center'}}>
                <input id="prompt-pwd" type="password" placeholder="Enter Password" autoFocus className="form-input" style={{width:200, textAlign:'center'}} />
              </div>
              <div style={{marginTop:20}}>
                <button className="tally-btn" onClick={()=>{
                  const p = (document.getElementById('prompt-pwd') as HTMLInputElement)?.value;
                  if (p === pwdPrompt.company.password) {
                     const comp = pwdPrompt.company;
                     const action = pwdPrompt.action;
                     setPwdPrompt(null);
                     if (action === 'open') {
                       setActiveCompany(comp);
                       setShowCompanySelect(false);
                       setScreen('GATEWAY_MAIN');
                       setHistory([]);
                     } else {
                       nav('COMPANY_CREATION', comp);
                     }
                  } else {
                     alert('Wrong Password!');
                  }
                }}>Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (() => {
        const isProtectedCompany = pendingDelete.type === 'company' && companies.find(c => c.id === pendingDelete.id)?.securityControl;
        return (
        <div className="modal-overlay" onKeyDown={e => {
          if (e.key === 'Enter') {
             if (isProtectedCompany) {
               const p = (document.getElementById('del-pwd') as HTMLInputElement)?.value;
               if (p !== companies.find(c => c.id === pendingDelete.id)?.password) {
                 alert('Wrong Password!');
                 return;
               }
             }
             executeDelete();
          }
          if (e.key === 'Escape') setPendingDelete(null);
        }}>
          <div className="modal-box" style={{width:400, border: '2px solid #d93025'}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header" style={{background: '#d93025'}}>Delete Confirmation</div>
            <div style={{padding: 25, textAlign: 'center'}}>
              <div style={{fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333'}}>
                Delete {pendingDelete.type}: {pendingDelete.name}?
              </div>
              <div style={{fontSize: 12, color: '#666', marginBottom: 20}}>
                Warning: This action is permanent and all associated data will be removed.
              </div>
              {isProtectedCompany && (
                <div style={{marginBottom: 15}}>
                  <input id="del-pwd" type="password" autoFocus placeholder="Enter Company Password" style={{padding: 6, width: 200, textAlign: 'center'}} />
                </div>
              )}
              <div style={{display: 'flex', gap: 12, justifyContent: 'center'}}>
                <button 
                  autoFocus={!isProtectedCompany}
                  onClick={() => {
                     if (isProtectedCompany) {
                       const p = (document.getElementById('del-pwd') as HTMLInputElement)?.value;
                       if (p !== companies.find(c => c.id === pendingDelete.id)?.password) {
                         alert('Wrong Password!');
                         return;
                       }
                     }
                     executeDelete();
                  }}
                  style={{background: '#d93025', color: 'white', border: 'none', padding: '8px 25px', cursor: 'pointer', fontWeight: 'bold', borderRadius: 2}}
                >
                  Yes (Enter)
                </button>
                <button 
                  onClick={() => setPendingDelete(null)}
                  style={{background: '#eee', color: '#333', border: '1px solid #ccc', padding: '8px 25px', cursor: 'pointer', fontWeight: 'bold', borderRadius: 2}}
                >
                  No (Esc)
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
      {showUpgradeModal && currentUser && (
        <PlanUpgradeModal
          currentUser={currentUser}
          onUpgradeSuccess={(updatedUser) => {
            setCurrentUser(updatedUser);
            setShowUpgradeModal(false);
          }}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

      {/* ===== MOBILE BOTTOM NAV BAR (hidden on desktop via CSS) ===== */}
      <nav className="mobile-bottom-nav">
        <div className="mobile-bottom-nav-inner">
          <button
            className={`mobile-bottom-btn ${screen === 'GATEWAY_MAIN' ? 'active' : ''}`}
            onClick={() => { setScreen('GATEWAY_MAIN'); setHistory([]); }}
          >
            <span className="btn-icon">🏠</span>
            Home
          </button>
          <button
            className={`mobile-bottom-btn ${screen === 'VOUCHER_ENTRY' && activeVoucher === 'Sales' ? 'active' : ''}`}
            onClick={() => { nav('VOUCHER_ENTRY'); setActiveVoucher('Sales'); }}
          >
            <span className="btn-icon">🛒</span>
            Sales
          </button>
          <button
            className={`mobile-bottom-btn ${['DAY_BOOK','BALANCE_SHEET','PROFIT_LOSS','TRIAL_BALANCE','LEDGER_REPORT','SALES_REGISTER','PURCHASE_REGISTER'].includes(screen) ? 'active' : ''}`}
            onClick={() => nav('DISPLAY_REPORTS_MENU')}
          >
            <span className="btn-icon">📊</span>
            Reports
          </button>
          <button
            className={`mobile-bottom-btn ${['LEDGER_CREATION','STOCK_ITEM_CREATION','MASTER_MENU'].includes(screen) ? 'active' : ''}`}
            onClick={() => nav('MASTER_MENU')}
          >
            <span className="btn-icon">⚙️</span>
            Masters
          </button>
          <button
            className="mobile-bottom-btn"
            onClick={() => setMobileDrawerOpen(true)}
          >
            <span className="btn-icon">☰</span>
            More
          </button>
        </div>
      </nav>

    </div>
  );
}

// ==================== MASTER FORMS ====================

function ListPanel({ title, items, selectedName, onSelect, onAltC, fieldKey }: {
  title: string; items: string[]; selectedName?: string; onSelect: (v:string)=>void; onAltC?: ()=>void; fieldKey?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="modal-box" style={{position:'fixed',top:60,right:120,bottom:40,width:300,zIndex:1000,borderRadius:0,display:'flex',flexDirection:'column'}}>
      <div className="modal-header" style={{fontSize:13}}>{title}</div>
      {onAltC && (
        <div style={{padding:'4px 15px',color:'#8B4000',fontSize:11,fontWeight:'bold',cursor:'pointer',background:'#fffbe6',borderBottom:'1px solid #f0d060'}}
          onMouseDown={e=>{e.preventDefault();onAltC();}}>
          ⚡ Alt+C: Create New
        </div>
      )}
      <div ref={ref} style={{flex:1,overflowY:'auto'}}>
        <div className="modal-list">
          {items.map((g,i)=>(
            <div key={i} onMouseDown={e=>{e.preventDefault();onSelect(g);}}
              className={`modal-list-item ${g===selectedName?'selected':''}`}>
              {g==='Primary'&&<span style={{marginRight:6,color:'#888'}}>♦</span>}{g}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompanyCreationForm({ activeAlterItem, onSave, onDelete, companies }: { activeAlterItem?: any; onSave: (d:any)=>void; onDelete: (type:string, id:number)=>void; companies: Company[]; }) {
  const ref = useRef<HTMLInputElement>(null);
  const [focusedField, setFocusFld] = useState<string|null>(null);
  const [secCtrl, setSecCtrl] = useState(activeAlterItem?.securityControl ? 'Yes' : 'No');
  const [filterText, setFilter] = useState('');
  const [selCo, setSelCo] = useState(activeAlterItem?.country||'India');
  const [selIdx, setSelIdx] = useState(0);
  const [showMob, setShowMob] = useState(activeAlterItem?.showMobile ?? true);
  const [showEmail, setShowEmail] = useState(activeAlterItem?.showEmail ?? true);
  const [showWeb, setShowWeb] = useState(activeAlterItem?.showWebsite ?? true);
  const [logo, setLogo] = useState(activeAlterItem?.logo || null);
  const [showLogo, setShowLogo] = useState(activeAlterItem?.showLogo ?? false);

  useEffect(()=>{ ref.current?.focus(); },[]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uniqueCurrencies = Array.from(new Map(Object.values(COUNTRY_CURRENCY).map(c => [c.symbol, c])).values());

  const list = focusedField==='country'
    ? (filterText ? ALL_COUNTRIES.filter(c=>c.toLowerCase().includes(filterText.toLowerCase())) : ALL_COUNTRIES)
    : focusedField==='state'
    ? ((COUNTRY_DATA[selCo]||[]).filter(s=>!filterText||s.toLowerCase().includes(filterText.toLowerCase())))
    : focusedField==='currency'
    ? uniqueCurrencies.filter(c=>!filterText||c.symbol.toLowerCase().includes(filterText.toLowerCase())||c.name.toLowerCase().includes(filterText.toLowerCase()))
    : [];

  useEffect(() => {
    if (!focusedField) return;
    if (focusedField === 'country') {
      const curVal = (document.getElementById('c-country') as HTMLInputElement)?.value || selCo || 'India';
      const idx = ALL_COUNTRIES.findIndex(c => c.toLowerCase() === curVal.trim().toLowerCase());
      setSelIdx(idx >= 0 ? idx : 0);
    } else if (focusedField === 'state') {
      const curVal = (document.getElementById('c-state') as HTMLInputElement)?.value || activeAlterItem?.state || 'Uttarakhand';
      const states = COUNTRY_DATA[selCo] || [];
      const idx = states.findIndex(s => s.toLowerCase() === curVal.trim().toLowerCase());
      setSelIdx(idx >= 0 ? idx : 0);
    } else if (focusedField === 'currency') {
      const curVal = (document.getElementById('c-currency') as HTMLInputElement)?.value || '₹';
      const idx = uniqueCurrencies.findIndex(c => c.symbol === curVal || c.name.toLowerCase() === curVal.toLowerCase());
      setSelIdx(idx >= 0 ? idx : 0);
    }
  }, [focusedField]);

  const pick = (v:any) => {
    let inpStr = '';
    if (focusedField==='country') {
      const inp = document.getElementById('c-country') as HTMLInputElement;
      if(inp) inp.value = v;
      setSelCo(v);
      inpStr = 'c-country';
    } else if (focusedField==='state') {
      const inp = document.getElementById('c-state') as HTMLInputElement;
      if(inp) inp.value = v;
      inpStr = 'c-state';
    } else if (focusedField==='currency') {
      const inpSym = document.getElementById('c-currency') as HTMLInputElement;
      const inpForm = document.getElementById('c-formal') as HTMLInputElement;
      if (inpSym) inpSym.value = v.symbol;
      if (inpForm) inpForm.value = v.name;
      inpStr = 'c-currency';
    }

    setFocusFld(null);
    setTimeout(() => {
      const inp = document.getElementById(inpStr);
      if (inp) {
        const inputs = Array.from(document.querySelectorAll('.form-workspace input:not([disabled]),.form-workspace select:not([disabled]),.form-workspace textarea:not([disabled])')) as HTMLElement[];
        const idx = inputs.indexOf(inp);
        if (idx >= 0 && idx < inputs.length - 1) (inputs[idx + 1]).focus();
      }
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if(!focusedField || list.length===0) {
       if(e.key === 'Enter') {
           e.preventDefault();
           setFocusFld(null);
           const inputs = Array.from(document.querySelectorAll('.form-workspace input:not([disabled]),.form-workspace select:not([disabled]),.form-workspace textarea:not([disabled])')) as HTMLElement[];
           const idx = inputs.indexOf(e.currentTarget);
           if (idx >= 0 && idx < inputs.length - 1) (inputs[idx + 1]).focus();
       }
       return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelIdx(p => (p + 1) % list.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelIdx(p => (p - 1 + list.length) % list.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(list[selIdx]);
    }
  };

  return (
    <div className="form-content" style={{display:'flex',position:'relative',padding:0}}>
      <div style={{flex:1,padding:20}}>
        <div className="form-section-title" style={{color:activeAlterItem?'#c00':'#1c5282',marginTop:0}}>
          Company {activeAlterItem?'Alteration':'Creation'}
          {activeAlterItem && <span style={{float:'right',fontSize:11,color:'#888',fontWeight:'normal'}}>Alt+D: Delete</span>}
        </div>
        {[['Company Name','c-name','text',360,true],['Mailing Name','c-mail','text',360,false]].map(([label,id,type,w,bold],i)=>(
          <div key={i} className="form-row">
            <label style={{width:160}}>{label as string}</label><span className="colon">:</span>
            <input id={id as string} ref={i===0?ref:undefined} autoFocus={i===0} type="text" className="form-input"
              style={{width:w as number,fontWeight:bold?'bold':'normal'}} defaultValue={activeAlterItem?.[(id as string).replace('c-','')]||activeAlterItem?.[id==='c-mail'?'mailingName':'']||''} 
              onInput={e=>{
                if(i===0) {
                  const mail=document.getElementById('c-mail') as HTMLInputElement;
                  const bankHolder=document.getElementById('c-bank-holder') as HTMLInputElement;
                  if(mail&&!mail.dataset.edited)mail.value=e.currentTarget.value;
                  if(bankHolder&&!bankHolder.dataset.edited)bankHolder.value=e.currentTarget.value;
                }
              }}
              onKeyDown={e=>{
                if (e.key === 'Enter' && id === 'c-name') {
                  const val = e.currentTarget.value.trim();
                  if (companies.some(c => c.name.toLowerCase() === val.toLowerCase() && (!activeAlterItem || c.id !== activeAlterItem.id))) {
                    alert(`Company "${val}" already exists!`); e.preventDefault(); return;
                  }
                }
                if(i===1 && !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab','Shift','Control','Alt'].includes(e.key)){
                   (e.currentTarget as any).dataset.edited='1';
                }
              }}
            />
          </div>
        ))}
        <div className="form-row"><label style={{width:160}}>Address</label><span className="colon">:</span><textarea id="c-addr" className="form-input" style={{height:60,width:320}} defaultValue={activeAlterItem?.address||''}/></div>
        <div className="form-row">
          <label style={{width:160}}>State</label><span className="colon">:</span>
          <input id="c-state" type="text" className="form-input" style={{width:200}}
            onFocus={e=>{setFocusFld('state');setFilter(e.target.value);}}
            onInput={e=>setFilter((e.target as HTMLInputElement).value)}
            onBlur={()=>setTimeout(()=>setFocusFld(null),200)}
            onKeyDown={handleKeyDown}
            defaultValue={activeAlterItem?.state||'Uttarakhand'} autoComplete="off"/>
        </div>
        <div className="form-row">
          <label style={{width:160}}>Country</label><span className="colon">:</span>
          <input id="c-country" type="text" className="form-input" style={{width:200}}
            onFocus={e=>{setFocusFld('country');setFilter(e.target.value);}}
            onInput={e=>setFilter((e.target as HTMLInputElement).value)}
            onBlur={()=>setTimeout(()=>setFocusFld(null),200)}
            onKeyDown={handleKeyDown}
            defaultValue={selCo} autoComplete="off"/>
        </div>
        {([['Telephone','c-telephone',200]] as const).map(([label,id,w],i)=>(
          <div key={i} className="form-row"><label style={{width:160}}>{label}</label><span className="colon">:</span><input id={id} type="text" className="form-input" style={{width:w}} defaultValue={activeAlterItem?.telephone||''}/></div>
        ))}
        <div className="form-row"><label style={{width:160}}>Pincode</label><span className="colon">:</span><input id="c-pin" type="text" className="form-input" style={{width:100}} defaultValue={activeAlterItem?.pinCode||''}/></div>
        <div className="form-row">
          <label style={{width:160}}>Mobile</label><span className="colon">:</span>
          <input id="c-mob" type="text" className="form-input" style={{width:200}} defaultValue={activeAlterItem?.mobile||''}/>
          <input id="chk-print-mob" type="checkbox" checked={showMob} onChange={e=>setShowMob(e.target.checked)} style={{marginLeft:10}} />
          <label htmlFor="chk-print-mob" style={{fontSize:11,color:'#666',marginLeft:4,cursor:'pointer'}}>Print</label>
        </div>
        <div className="form-row">
          <label style={{width:160}}>E-Mail</label><span className="colon">:</span>
          <input id="c-email" type="text" className="form-input" style={{width:260}} defaultValue={activeAlterItem?.email||''}/>
          <input id="chk-print-email" type="checkbox" checked={showEmail} onChange={e=>setShowEmail(e.target.checked)} style={{marginLeft:10}} />
          <label htmlFor="chk-print-email" style={{fontSize:11,color:'#666',marginLeft:4,cursor:'pointer'}}>Print</label>
        </div>
        <div className="form-row">
          <label style={{width:160}}>Website</label><span className="colon">:</span>
          <input id="c-web" type="text" className="form-input" style={{width:260}} defaultValue={activeAlterItem?.website||''}/>
          <input id="chk-print-web" type="checkbox" checked={showWeb} onChange={e=>setShowWeb(e.target.checked)} style={{marginLeft:10}} />
          <label htmlFor="chk-print-web" style={{fontSize:11,color:'#666',marginLeft:4,cursor:'pointer'}}>Print</label>
        </div>

        <div className="form-section-title">Company Logo</div>
        <div className="form-row" style={{alignItems:'flex-start'}}>
          <label style={{width:160}}>Logo Image</label><span className="colon">:</span>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <input type="file" accept="image/*" onChange={handleLogoChange} style={{fontSize:11}} />
              {logo && <button onClick={()=>setLogo(null)} style={{fontSize:10,background:'#f44336',color:'white',border:'none',padding:'2px 8px',cursor:'pointer'}}>Remove</button>}
            </div>
            {logo && (
              <div style={{width:'1in',height:'1in',border:'1px solid #ccc',background:'#fff',padding:4,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <img src={logo} alt="Preview" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} />
              </div>
            )}
            <div style={{display:'flex',alignItems:'center'}}>
              <input id="chk-print-Logo" type="checkbox" checked={showLogo} onChange={e=>setShowLogo(e.target.checked)} />
              <label htmlFor="chk-print-Logo" style={{fontSize:11,color:'#666',marginLeft:4,cursor:'pointer'}}>Print Logo on Invoice</label>
            </div>
          </div>
        </div>
      </div>
      <div style={{flex:1,borderLeft:'1px solid #eee',padding:20,background:'#f9f9f9'}}>
        <div className="form-section-title" style={{marginTop:0}}>Financial Year Details</div>
        <div className="form-row"><label style={{width:220}}>Financial year begins from</label><span className="colon">:</span><input id="c-fy-start" type="text" className="form-input" style={{width:120}} defaultValue={activeAlterItem?.financialYearStart||"1-Apr-2026"}/></div>
        <div className="form-row"><label style={{width:220}}>Books beginning from</label><span className="colon">:</span><input id="c-books-start" type="text" className="form-input" style={{width:120}} defaultValue={activeAlterItem?.booksBeginFrom||"1-Apr-2026"}/></div>
        <div className="form-section-title">Statutory Information</div>
        <div className="form-row"><label style={{width:220}}>Registration Type</label><span className="colon">:</span><select id="c-reg-type" className="form-input" style={{width:160}} defaultValue={activeAlterItem?.registrationType||'Regular'}><option>Regular</option><option>Composition</option><option>Unregistered</option><option>Consumer</option></select></div>
        <div className="form-row"><label style={{width:220}}>GSTIN</label><span className="colon">:</span><input id="c-gstin" type="text" className="form-input" style={{width:200}} defaultValue={activeAlterItem?.gstin||''} onInput={e => e.currentTarget.value = e.currentTarget.value.toUpperCase()} onKeyDown={e => {
          if (e.key === 'Enter') {
            const gst = (e.currentTarget.value || '').trim();
            if (gst.length >= 12) {
              const pan = gst.substring(2, 12); // chars 3 to 12 (0-indexed: 2 to 11)
              const panEl = document.getElementById('c-pan') as HTMLInputElement;
              if (panEl && !panEl.value) panEl.value = pan.toUpperCase();
            }
          }
        }}/></div>
        <div className="form-row"><label style={{width:220}}>PAN No.</label><span className="colon">:</span><input id="c-pan" type="text" className="form-input" style={{width:140}} defaultValue={activeAlterItem?.pan||''}/></div>
        <div className="form-section-title">Banking Details</div>
        <div className="form-row"><label style={{width:220}}>Bank Name</label><span className="colon">:</span><input id="c-bank-name" type="text" className="form-input" style={{width:200}} defaultValue={activeAlterItem?.bankName||''}/></div>
        <div className="form-row"><label style={{width:220}}>A/C Holder Name</label><span className="colon">:</span><input id="c-bank-holder" type="text" className="form-input" style={{width:200}} defaultValue={activeAlterItem?.bankHolderName||''} onKeyDown={e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab','Shift','Control','Alt'].includes(e.key)){(e.currentTarget as any).dataset.edited='1';}}}/></div>
        <div className="form-row"><label style={{width:220}}>A/C No.</label><span className="colon">:</span><input id="c-acc-no" type="text" className="form-input" style={{width:160}} defaultValue={activeAlterItem?.accountNo||''}/></div>
        <div className="form-row"><label style={{width:220}}>IFSC Code</label><span className="colon">:</span><input id="c-ifsc" type="text" className="form-input" style={{width:120}} defaultValue={activeAlterItem?.ifsc||''}/></div>
        <div className="form-row"><label style={{width:220}}>SWIFT Code</label><span className="colon">:</span><input id="c-swift" type="text" className="form-input" style={{width:120}} defaultValue={activeAlterItem?.swiftCode||''}/></div>
        <div className="form-section-title">Security Control</div>
        <div className="form-row"><label style={{width:220}}>Use Security Control</label><span className="colon">:</span><select id="c-sec-ctrl" className="form-input" style={{width:80}} value={secCtrl} onChange={e=>setSecCtrl(e.target.value)}><option>No</option><option>Yes</option></select></div>
        {secCtrl === 'Yes' && (
          <div className="form-row"><label style={{width:220}}>Password</label><span className="colon">:</span><input id="c-pwd" type="password" className="form-input" style={{width:160}} defaultValue={activeAlterItem?.password||''} /></div>
        )}
        <div className="form-section-title">Currency</div>
        <div className="form-row"><label style={{width:220}}>Base Currency Symbol</label><span className="colon">:</span>
          <input id="c-currency" type="text" className="form-input" style={{width:60}} defaultValue="₹"
            onFocus={e=>{setFocusFld('currency');setFilter(e.target.value);}}
            onInput={e=>setFilter((e.target as HTMLInputElement).value)}
            onBlur={()=>setTimeout(()=>setFocusFld(null),200)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
        </div>
        <div className="form-row"><label style={{width:220}}>Formal Name</label><span className="colon">:</span><input id="c-formal" type="text" className="form-input" style={{width:180}} defaultValue="Indian Rupee"/></div>
      </div>
      
      {/* Footer / Buttons */}
      <div style={{position:'absolute',bottom:0,left:0,right:0,background:'#eef2f6',padding:'10px 20px',borderTop:'1px solid #ccd',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontSize:11,color:'#666'}}>
          Ctrl+A: Accept | Esc: Abandon {activeAlterItem && '| Alt+D: Delete'}
        </div>
        <div style={{display:'flex',gap:10}}>
          {activeAlterItem && (
            <button 
              onClick={() => {
                console.log("Delete button clicked for company:", activeAlterItem.id);
                onDelete('company', activeAlterItem.id);
              }}
              style={{background:'#d93025',color:'white',border:'none',padding:'6px 20px',cursor:'pointer',fontWeight:'bold',fontSize:12,borderRadius:2}}
            >
              Delete (Alt+D)
            </button>
          )}
          <button 
            onClick={() => {
              const name = ((document.getElementById('c-name') as HTMLInputElement)?.value || '').trim();
              if (!name) { alert('Company Name is required!'); document.getElementById('c-name')?.focus(); return; }
              if (companies.some(c => c.name.toLowerCase() === name.toLowerCase() && (!activeAlterItem || c.id !== activeAlterItem.id))) {
                alert(`Company "${name}" already exists!`); document.getElementById('c-name')?.focus(); return;
              }
              const d = {
                name,
                mailingName: (document.getElementById('c-mail') as HTMLInputElement).value,
                address: (document.getElementById('c-addr') as HTMLTextAreaElement).value,
                state: (document.getElementById('c-state') as HTMLInputElement).value,
                country: (document.getElementById('c-country') as HTMLInputElement).value,
                pinCode: (document.getElementById('c-pin') as HTMLInputElement).value,
                telephone: (document.getElementById('c-telephone') as HTMLInputElement).value,
                mobile: (document.getElementById('c-mob') as HTMLInputElement).value,
                email: (document.getElementById('c-email') as HTMLInputElement).value,
                website: (document.getElementById('c-web') as HTMLInputElement).value,
                financialYearStart: (document.getElementById('c-fy-start') as HTMLInputElement).value,
                booksBeginFrom: (document.getElementById('c-books-start') as HTMLInputElement).value,
                registrationType: (document.getElementById('c-reg-type') as HTMLSelectElement).value,
                gstin: (document.getElementById('c-gstin') as HTMLInputElement).value,
                pan: (document.getElementById('c-pan') as HTMLInputElement).value,
                bankName: (document.getElementById('c-bank-name') as HTMLInputElement).value,
                bankHolderName: (document.getElementById('c-bank-holder') as HTMLInputElement).value,
                accountNo: (document.getElementById('c-acc-no') as HTMLInputElement).value,
                ifsc: (document.getElementById('c-ifsc') as HTMLInputElement).value,
                swiftCode: (document.getElementById('c-swift') as HTMLInputElement).value,
                currencySymbol: (document.getElementById('c-currency') as HTMLInputElement).value,
                currencyName: (document.getElementById('c-formal') as HTMLInputElement).value,
                securityControl: (document.getElementById('c-sec-ctrl') as HTMLSelectElement)?.value === 'Yes',
                password: (document.getElementById('c-pwd') as HTMLInputElement)?.value || '',
                showMobile: showMob,
                showEmail: showEmail,
                showWebsite: showWeb,
                logo: logo,
                showLogo: showLogo,
              };
              onSave(d);
            }}
            style={{background:'#1c5282',color:'white',border:'none',padding:'6px 25px',cursor:'pointer',fontWeight:'bold',fontSize:12,borderRadius:2}}
          >
            Accept (Ctrl+A)
          </button>
        </div>
      </div>
      {focusedField && list.length>0 && (
        <div style={{position:'absolute',top:50,right:20,bottom:20,width:260,background:'#dde4f0',zIndex:100,border:'2px solid #1c5282',display:'flex',flexDirection:'column'}}>
          <div style={{background:'#1c5282',color:'white',padding:'6px 15px',fontSize:12,fontWeight:'bold'}}>
            List of {focusedField==='state'?'States':focusedField==='country'?'Countries':'Currencies'}
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'4px 0'}}>
            {list.map((it,i)=>(
               <div key={i} onMouseDown={e=>{e.preventDefault();pick(it);}} 
                 onMouseEnter={()=>setSelIdx(i)}
                 style={{padding:'3px 20px',cursor:'pointer',background:i===selIdx?'#1c5282':'transparent',color:i===selIdx?'white':'black'}}>
                 {focusedField==='currency' ? `${(it as any).symbol} - ${(it as any).name}` : (typeof it === 'string' ? it : (it as any).name || (it as any).symbol || '')}
               </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GroupCreationForm({ activeAlterItem, onSave, onAltC, onDelete, ledgers, groups }: { activeAlterItem?: any; onSave:(d:any)=>void; onAltC:(ctx:AltCContext)=>void; onDelete?:(type:string,id:number)=>void; ledgers:Ledger[]; groups: StockGroup[]; }) {
  const ref = useRef<HTMLInputElement>(null);
  const [focus, setFocus] = useState(false);
  const [filter, setFilter] = useState('');
  const [selIdx, setSelIdx] = useState(0);
  useEffect(()=>{ ref.current?.focus(); },[]);

  useEffect(() => {
    if (focus) {
      const curUnder = (document.getElementById('g-under') as HTMLInputElement)?.value || activeAlterItem?.under || 'Primary';
      const groupNames = groups.map(g => g.name);
      const idx = groupNames.findIndex(g => g.toLowerCase() === curUnder.trim().toLowerCase());
      setSelIdx(idx >= 0 ? idx : 0);
    }
  }, [focus]);

  const list = filter ? groups.filter(g=>g.name.toLowerCase().includes(filter.toLowerCase())).map(g=>g.name) : groups.map(g=>g.name);

  const pick = (v:string) => {
    const inp = document.getElementById('g-under') as HTMLInputElement;
    if(inp){inp.value=v;}
    setFocus(false);
    setTimeout(() => {
      if (inp) {
        const inputs = Array.from(document.querySelectorAll('.form-workspace input:not([disabled]),.form-workspace select:not([disabled]),.form-workspace textarea:not([disabled])')) as HTMLElement[];
        const idx = inputs.indexOf(inp);
        if (idx >= 0 && idx < inputs.length - 1) (inputs[idx + 1]).focus();
      }
    }, 50);
  };

  return (
    <div className="form-content" style={{display:'flex',height:'100%',padding:0}}>
      <div style={{flex:1,padding:20}}>
        <div className="form-section-title" style={{marginTop:0,color:'#1c5282'}}>Group {activeAlterItem?'Alteration':'Creation'}
          <span style={{float:'right',fontSize:11,color:'#888',fontWeight:'normal'}}>{activeAlterItem ? 'Alt+D: Delete' : 'Alt+C on Under field to create inline'}</span>
        </div>
        <div className="form-row"><label style={{width:100}}>Name</label><span className="colon">:</span>
          <input id="g-name" ref={ref} autoFocus type="text" className="form-input" style={{width:360,fontWeight:'bold'}} defaultValue={activeAlterItem?.name||''}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const val = e.currentTarget.value.trim();
                if (groups.some(g => g.name.toLowerCase() === val.toLowerCase() && (!activeAlterItem || g.id !== activeAlterItem.id))) {
                  alert(`Group "${val}" already exists!`); e.preventDefault(); return;
                }
              }
            }}
            onInput={e=>{const al=document.getElementById('g-alias') as HTMLInputElement;if(al&&!al.dataset.edited)al.value=e.currentTarget.value;}}/>
        </div>
        <div className="form-row"><label style={{width:100}}>(alias)</label><span className="colon">:</span>
          <input id="g-alias" type="text" className="form-input" style={{width:360}} defaultValue={activeAlterItem?.alias||''} onInput={e=>(e.currentTarget.dataset.edited='1')}/>
        </div>
        <div className="form-row" style={{marginTop:20}}>
          <label style={{width:100}}>Under</label><span className="colon">:</span>
          <input id="g-under" type="text" className="form-input" style={{width:300,fontWeight:'bold'}}
            onFocus={()=>{setFocus(true);setFilter('');setSelIdx(0);}}
            onInput={e=>{setFilter((e.target as HTMLInputElement).value);setSelIdx(0);}}
            onKeyDown={e=>{
              if(e.altKey&&e.key.toLowerCase()==='c'){e.preventDefault();onAltC({fieldType:'group',onCreated:n=>{const inp=document.getElementById('g-under') as HTMLInputElement;if(inp)inp.value=n;}});return;}
              if(e.key==='ArrowDown'){e.preventDefault();setSelIdx(p=>(p+1)%list.length);}
              else if(e.key==='ArrowUp'){e.preventDefault();setSelIdx(p=>(p-1+list.length)%list.length);}
              else if(e.key==='Enter'&&list.length>0){e.preventDefault();e.stopPropagation();pick(list[selIdx]);}
            }}
            onBlur={()=>setTimeout(()=>setFocus(false),200)}
            defaultValue={activeAlterItem?.under||'Primary'} autoComplete="off"/>
          <span style={{marginLeft:8,fontSize:11,color:'#888'}}>Alt+C</span>
        </div>
        <div style={{marginTop:30,borderTop:'1px solid #eee',paddingTop:20}}>
          <div className="form-section-title" style={{marginTop:0}}>Group Behaviour</div>
          <div className="form-row" style={{marginBottom:8}}>
            <label style={{width:380}}>Group behaves like a sub-ledger</label><span className="colon">:</span>
            <select id="g-subledger" className="form-input" style={{width:80}} defaultValue={activeAlterItem?.behavesLikeSubLedger||'No'}><option>No</option><option>Yes</option></select>
          </div>
          <div className="form-row" style={{marginBottom:8}}>
            <label style={{width:380}}>Nett Debit/Credit Balances for Reporting</label><span className="colon">:</span>
            <select id="g-nett" className="form-input" style={{width:80}} defaultValue={activeAlterItem?.nettBalances||'No'}><option>No</option><option>Yes</option></select>
          </div>
          <div className="form-row" style={{marginBottom:8}}>
            <label style={{width:380}}>Used for calculation (eg. taxes, discounts)</label><span className="colon">:</span>
            <select id="g-calc" className="form-input" style={{width:80}} defaultValue={activeAlterItem?.usedForCalculation||'No'}><option>No</option><option>Yes</option></select>
          </div>
          <div className="form-row" style={{marginBottom:8}}>
            <label style={{width:380}}>Method to allocate when used in purchase invoice</label><span className="colon">:</span>
            <select id="g-alloc" className="form-input" style={{width:200}} defaultValue={activeAlterItem?.allocationMethod||'Not Applicable'}><option>Not Applicable</option><option>Apportion by Qty</option><option>Apportion by Value</option></select>
          </div>
        </div>
      </div>
      {/* Right list */}
      <div style={{width:280,borderLeft:'2px solid #1c5282',display:'flex',flexDirection:'column',background:'#fbfdff'}}>
        <div className="modal-header" style={{fontSize:12}}>List of Groups</div>
        <div style={{flex:1,overflowY:'auto'}}>
          {TALLY_GROUPS.map((g,i)=><div key={i} className="modal-list-item" style={{fontSize:12}} onMouseDown={e=>{e.preventDefault();const inp=document.getElementById('g-under') as HTMLInputElement;if(inp){inp.value=g;inp.focus();}}}>{g==='Primary'&&<span style={{marginRight:6,color:'#888'}}>♦</span>}{g}</div>)}
        </div>
      </div>
      {focus && (
        <ListPanel title="List of Groups" items={list} selectedName={list[selIdx]} onSelect={pick}
          onAltC={()=>onAltC({fieldType:'group',onCreated:n=>{const inp=document.getElementById('g-under') as HTMLInputElement;if(inp)inp.value=n;}})}
        />
      )}
      <div style={{borderTop:'1px solid #ccc',padding:'12px 25px',background:'#f8f8f8',display:'flex',justifyContent:'flex-end',gap:15}}>
        {activeAlterItem && onDelete && (
          <button style={{background:'#f44336',color:'white',border:'none',padding:'8px 25px',cursor:'pointer',fontWeight:'bold',fontSize:13}}
            onClick={()=>onDelete('group', activeAlterItem.id)}>
            Delete (Alt+D)
          </button>
        )}
        <button style={{background:'#1c5282',color:'white',border:'none',padding:'8px 35px',cursor:'pointer',fontWeight:'bold',fontSize:13}}
          onClick={()=>{
            const fv = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value?.trim() || '';
            const name = fv('g-name'); if (!name) { alert('Group Name is required!'); document.getElementById('g-name')?.focus(); return; }
            const data = { 
              name, alias: fv('g-alias'), under: fv('g-under') || 'Primary',
              behavesLikeSubLedger: (document.getElementById('g-subledger') as HTMLSelectElement)?.value || 'No',
              nettBalances: (document.getElementById('g-nett') as HTMLSelectElement)?.value || 'No',
              usedForCalculation: (document.getElementById('g-calc') as HTMLSelectElement)?.value || 'No',
              allocationMethod: (document.getElementById('g-alloc') as HTMLSelectElement)?.value || 'Not Applicable'
            };
            onSave(data);
          }}>
          ✓ Accept (Ctrl+A)
        </button>
      </div>
    </div>
  );
}

function LedgerCreationForm({ activeAlterItem, onSave, onAltC, onDelete, ledgers, groups }:{activeAlterItem?:any;onSave:(d:any)=>void;onAltC:(ctx:AltCContext)=>void;onDelete?:(type:string,id:number)=>void;ledgers:Ledger[]; groups:StockGroup[];}) {
  const ref = useRef<HTMLInputElement>(null);
  const [focus, setFocus] = useState<string|null>(null);
  const [filter, setFilter] = useState('');
  const [selIdx, setSelIdx] = useState(0);
  const [selCo, setSelCo] = useState(activeAlterItem?.country||'India');
  const [underValue, setUnderValue] = useState<string>(activeAlterItem?.groupName||'Sundry Debtors');
  const [odLimit, setOdLimit] = useState<string>(activeAlterItem?.odLimit != null ? String(activeAlterItem.odLimit) : '');
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{ ref.current?.focus(); },[]);

  // Group-based dynamic field detection
  const isBankOD = underValue.toLowerCase().includes('bank od') || underValue.toLowerCase().includes('bank occ') || underValue.toLowerCase() === 'bank od a/c' || underValue.toLowerCase() === 'bank occ account';
  const isBankAccount = underValue.toLowerCase().includes('bank account') || underValue.toLowerCase() === 'bank accounts';
  const showBankFields = isBankOD || isBankAccount;

  const fv = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value?.trim() || '';
  const fsv = (id: string) => (document.getElementById(id) as HTMLSelectElement)?.value || '';

  const getList = () => {
    if(focus==='under') return filter ? groups.filter(g=>g.name.toLowerCase().includes(filter.toLowerCase())).map(g=>g.name) : groups.map(g=>g.name);
    if(focus==='country') return filter ? ALL_COUNTRIES.filter(c=>c.toLowerCase().includes(filter.toLowerCase())) : ALL_COUNTRIES;
    if(focus==='state') return (COUNTRY_DATA[selCo]||[]).filter(s=>!filter||s.toLowerCase().includes(filter.toLowerCase()));
    return [];
  };
  const list = getList();

  // Auto-highlight current value when list opens
  useEffect(() => {
    if (!focus) return;
    if (focus === 'under') {
      const curUnder = (document.getElementById('l-under') as HTMLInputElement)?.value || underValue || activeAlterItem?.groupName || 'Sundry Debtors';
      const groupNames = groups.map(g => g.name);
      const idx = groupNames.findIndex(g => g.toLowerCase() === curUnder.trim().toLowerCase());
      setSelIdx(idx >= 0 ? idx : 0);
    } else if (focus === 'country') {
      const curCountry = (document.getElementById('l-country') as HTMLInputElement)?.value || selCo || activeAlterItem?.country || 'India';
      const idx = ALL_COUNTRIES.findIndex(c => c.toLowerCase() === curCountry.trim().toLowerCase());
      setSelIdx(idx >= 0 ? idx : 0);
    } else if (focus === 'state') {
      const states = COUNTRY_DATA[selCo] || [];
      const curState = (document.getElementById('l-state') as HTMLInputElement)?.value || activeAlterItem?.state || '';
      const idx = states.findIndex(s => s.toLowerCase() === curState.trim().toLowerCase());
      setSelIdx(idx >= 0 ? idx : 0);
    }
  }, [focus]);

  // Scroll selected item into view
  useEffect(()=>{
    if(listRef.current){
      const items = listRef.current.querySelectorAll('[data-idx]');
      if(items[selIdx]) (items[selIdx] as HTMLElement).scrollIntoView({block:'nearest'});
    }
  },[selIdx, focus]);

  const pick = (v:string) => {
    const ids:Record<string,string> = {under:'l-under',country:'l-country',state:'l-state'};
    const inp = document.getElementById(ids[focus!]||'') as HTMLInputElement;
    const isUnderField = focus === 'under';
    if(inp){inp.value=v;if(focus==='country'){setSelCo(v);}if(isUnderField){setUnderValue(v);}}
    setFocus(null);
    setTimeout(() => {
      // Agar Under field se pick kiya aur Bank OD/OCC group select hua → seedha l-od-limit pe focus
      const uv = v.toLowerCase();
      const isODGroup = uv.includes('bank od') || uv.includes('bank occ');
      if (isUnderField && isODGroup) {
        const odEl = document.getElementById('l-od-limit');
        if (odEl) { odEl.focus(); return; }
      }
      if (inp) {
        const inputs = Array.from(document.querySelectorAll(
          '.form-workspace input:not([disabled]),.form-workspace select:not([disabled]),.form-workspace textarea:not([disabled])'
        )) as HTMLElement[];
        const idx = inputs.indexOf(inp);
        if (idx >= 0 && idx < inputs.length - 1) (inputs[idx + 1]).focus();
      }
    }, 80);
  };

  const handleFieldKey = (field:string) => (e:React.KeyboardEvent) => {
    if(field==='under'&&e.altKey&&e.key.toLowerCase()==='c'){e.preventDefault();onAltC({fieldType:'group',onCreated:n=>{const inp=document.getElementById('l-under') as HTMLInputElement;if(inp)inp.value=n;}});return;}
    if(e.key==='ArrowDown'){e.preventDefault();setSelIdx(p=>(p+1)%Math.max(1,list.length));}
    else if(e.key==='ArrowUp'){e.preventDefault();setSelIdx(p=>(p-1+Math.max(1,list.length))%Math.max(1,list.length));}
    else if(e.key==='Enter'&&list.length>0){e.preventDefault();e.stopPropagation();pick(list[selIdx]);}
    else if(e.key==='Enter'){
      e.preventDefault();
      moveToNext(e.currentTarget.id);
    }
  };

  // ledgerFields — l-od-limit is conditionally inserted after l-under when isBankOD
  const ledgerFields = [
    'l-name', 'l-alias', 'l-under',
    ...(isBankOD ? ['l-od-limit'] : []),
    'l-mail', 'l-addr', 'l-state', 'l-country',
    'l-pin', 'l-phone', 'l-email', 'l-pan', 'l-reg', 'l-gst', 'l-gst-alter',
    'l-bank', 'l-bank-holder', 'l-acc', 'l-ifsc', 'l-ob', 'l-ob-type', 'btn-save-ledger'
  ];

  const moveToNext = (currentId: string) => {
    const idx = ledgerFields.indexOf(currentId);
    if (idx >= 0 && idx < ledgerFields.length - 1) {
      const next = document.getElementById(ledgerFields[idx + 1]);
      if (next) next.focus();
    }
  };

  const handleGlobalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target.id === 'l-name') {
        const val = (target as HTMLInputElement).value.trim();
        if (ledgers.some(l => l.name.toLowerCase() === val.toLowerCase() && (!activeAlterItem || l.id !== activeAlterItem.id))) {
          alert(`Ledger "${val}" already exists!`); e.preventDefault(); return;
        }
      }
      if (target.id === 'btn-save-ledger') return; // Let button handle its own click
      if (['l-under', 'l-state', 'l-country'].includes(target.id) && list.length > 0) return;
      e.preventDefault();
      moveToNext(target.id);
    }
  };

  // Right panel title
  const rightPanelTitle = focus==='under' ? `List of Groups (${list.length})`
    : focus==='country' ? `List of Countries (${list.length})`
    : focus==='state' ? `List of States — ${selCo} (${list.length})`
    : '';

  return (
    <div className="form-content" style={{display:'flex',flexDirection:'column',padding:0,height:'100%',position:'relative'}}>
      <div style={{background:'#1c5282',color:'white',padding:'8px 15px',fontSize:14,fontWeight:'bold',display:'flex',justifyContent:'space-between'}}>
        <span>Ledger {activeAlterItem?'Alteration':'Creation'}</span>
        <span style={{fontSize:11,opacity:0.85}}>{activeAlterItem ? 'Alt+D: Delete | Ctrl+A: Save' : 'Alt+C on Under field | Ctrl+A: Save'}</span>
      </div>
      <div style={{padding:'15px 25px'}}>
        <div className="form-row"><label style={{width:100}}>Name</label><span className="colon">:</span>
          <input id="l-name" ref={ref} autoFocus type="text" className="form-input" style={{width:400,fontWeight:'bold'}} defaultValue={activeAlterItem?.name||''}
            onFocus={()=>setFocus(null)} onKeyDown={handleGlobalKeyDown}
            onInput={e=>{const al=document.getElementById('l-alias') as HTMLInputElement;const ma=document.getElementById('l-mail') as HTMLInputElement;if(al&&!al.dataset.edited)al.value=e.currentTarget.value;if(ma&&!ma.dataset.edited)ma.value=e.currentTarget.value;}}/>
        </div>
        <div className="form-row"><label style={{width:100}}>(alias)</label><span className="colon">:</span>
          <input id="l-alias" type="text" className="form-input" style={{width:400}} defaultValue={activeAlterItem?.alias||''} onFocus={()=>setFocus(null)} onKeyDown={e=>{handleGlobalKeyDown(e);if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab','Shift','Control','Alt'].includes(e.key))(e.currentTarget as any).dataset.edited='1';}}/></div>
        <div className="form-row" style={{marginTop:15}}>
          <label style={{width:100}}>Under</label><span className="colon">:</span>
          <input id="l-under" type="text" className="form-input" style={{width:300,fontWeight:'bold'}}
            onFocus={()=>{setFocus('under');setFilter('');}}
            onInput={e=>{const v=(e.target as HTMLInputElement).value;setFilter(v);setUnderValue(v);setSelIdx(0);}}
            onKeyDown={handleFieldKey('under')}
            onBlur={()=>setTimeout(()=>setFocus(p=>p==='under'?null:p),200)}
            defaultValue={activeAlterItem?.groupName||'Sundry Debtors'} autoComplete="off"/>
          <span style={{marginLeft:8,fontSize:11,color:'#888'}}>Alt+C to create</span>
        </div>
        {/* Set OD Limit — turant Under ke baad, sirf Bank OD/OCC ke liye */}
        {isBankOD && (
          <div className="form-row" style={{marginTop:8,background:'#fff8e1',padding:'6px 10px',borderRadius:4,border:'1px solid #ffe082'}}>
            <label style={{width:100,fontWeight:'bold',color:'#8B0000'}}>Set OD Limit</label><span className="colon">:</span>
            <input id="l-od-limit" type="number" className="form-input" style={{width:160,textAlign:'right',fontWeight:'bold',border:'2px solid #f9a825'}}
              value={odLimit}
              onChange={e=>setOdLimit(e.target.value)}
              onFocus={()=>setFocus(null)}
              onKeyDown={e=>{
                if(e.key==='Enter'){
                  e.preventDefault();
                  moveToNext('l-od-limit');
                }
              }}
              placeholder="0.00"/>
            <span style={{marginLeft:8,fontSize:12,color:'#8B0000',fontWeight:'bold'}}>Cr</span>
            {odLimit && parseFloat(odLimit)>0 && (
              <span style={{marginLeft:12,fontSize:11,color:'#555'}}>= ₹ {parseFloat(odLimit).toLocaleString('en-IN',{minimumFractionDigits:2})} Cr</span>
            )}
          </div>
        )}
      </div>
      <div style={{display:'flex',flex:1,borderTop:'1px solid #eee',overflow:'hidden'}}>
        <div style={{flex:1,padding:'15px 25px',borderRight:'1px solid #eee',overflowY:'auto'}}>
          <b style={{display:'block',marginBottom:10,textDecoration:'underline',fontSize:13}}>Mailing Details</b>
          <div className="form-row"><label style={{width:140}}>Name</label><span className="colon">:</span><input id="l-mail" type="text" className="form-input" style={{width:220}} defaultValue={activeAlterItem?.mailingName || activeAlterItem?.name || ''} onFocus={()=>setFocus(null)} onKeyDown={e=>{handleGlobalKeyDown(e); if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab','Shift','Control','Alt'].includes(e.key))(e.currentTarget as any).dataset.edited='1';}} /></div>
          <div className="form-row"><label style={{width:140}}>Address</label><span className="colon">:</span><textarea id="l-addr" className="form-input" style={{height:55,width:220}} defaultValue={activeAlterItem?.address||''} onFocus={()=>setFocus(null)} onKeyDown={handleGlobalKeyDown}/></div>
          <div className="form-row"><label style={{width:140}}>State</label><span className="colon">:</span>
            <input id="l-state" type="text" className="form-input" style={{width:180}}
              onFocus={()=>{setFocus('state');setFilter('');}}
              onInput={e=>{setFilter((e.target as HTMLInputElement).value);setSelIdx(0);}}
              onKeyDown={handleFieldKey('state')}
              onBlur={()=>setTimeout(()=>setFocus(p=>p==='state'?null:p),200)}
              defaultValue={activeAlterItem?.state||''} autoComplete="off"/>
          </div>
          <div className="form-row"><label style={{width:140}}>Country</label><span className="colon">:</span>
            <input id="l-country" type="text" className="form-input" style={{width:180}}
              onFocus={()=>{setFocus('country');setFilter('');}}
              onInput={e=>{setFilter((e.target as HTMLInputElement).value);setSelIdx(0);}}
              onKeyDown={handleFieldKey('country')}
              onBlur={()=>setTimeout(()=>setFocus(p=>p==='country'?null:p),200)}
              defaultValue={selCo} autoComplete="off"/>
          </div>
          <div className="form-row"><label style={{width:140}}>Pincode</label><span className="colon">:</span><input id="l-pin" type="text" className="form-input" style={{width:100}} defaultValue={activeAlterItem?.pinCode||''} onFocus={()=>setFocus(null)} onKeyDown={handleGlobalKeyDown}/></div>
          <div className="form-row"><label style={{width:140}}>Phone</label><span className="colon">:</span><input id="l-phone" type="text" className="form-input" style={{width:180}} defaultValue={activeAlterItem?.phone||''} onFocus={()=>setFocus(null)} onKeyDown={handleGlobalKeyDown}/></div>
          <div className="form-row"><label style={{width:140}}>E-mail</label><span className="colon">:</span><input id="l-email" type="text" className="form-input" style={{width:220}} defaultValue={activeAlterItem?.email||''} onFocus={()=>setFocus(null)} onKeyDown={handleGlobalKeyDown}/></div>
        </div>
        <div style={{flex:1,padding:'15px 25px',background:'#fcfcfc',overflowY:'auto'}}>
          {/* Tax Registration */}
          <b style={{display:'block',marginBottom:10,textDecoration:'underline',fontSize:13}}>Tax Registration</b>
          <div className="form-row"><label style={{width:180}}>PAN/IT No.</label><span className="colon">:</span><input id="l-pan" type="text" className="form-input" style={{width:180}} defaultValue={activeAlterItem?.pan||''} onFocus={()=>setFocus(null)} onKeyDown={handleGlobalKeyDown}/></div>
          <div className="form-row"><label style={{width:180}}>Registration Type</label><span className="colon">:</span><select id="l-reg" className="form-input" style={{width:180}} defaultValue={activeAlterItem?.registrationType||'Regular'} onKeyDown={handleGlobalKeyDown}><option>Regular</option><option>Composition</option><option>Unregistered</option><option>Consumer</option></select></div>
          <div className="form-row"><label style={{width:180}}>GSTIN/UIN</label><span className="colon">:</span><input id="l-gst" type="text" className="form-input" style={{width:200}} defaultValue={activeAlterItem?.gstin||''} onFocus={()=>setFocus(null)} onKeyDown={handleGlobalKeyDown}/></div>
          <div className="form-row"><label style={{width:180}}>Set/Alter GST Details</label><span className="colon">:</span><select id="l-gst-alter" className="form-input" defaultValue={activeAlterItem?.setAlterGstDetails||'No'} onKeyDown={handleGlobalKeyDown}><option>No</option><option>Yes</option></select></div>
          <b style={{display:'block',margin:'15px 0 10px',textDecoration:'underline',fontSize:13,borderTop:'1px solid #eee',paddingTop:12}}>Banking Details</b>
          <div className="form-row"><label style={{width:180}}>Bank Name</label><span className="colon">:</span><input id="l-bank" type="text" className="form-input" style={{width:180}} defaultValue={activeAlterItem?.bankName||''} onFocus={()=>setFocus(null)} onKeyDown={handleGlobalKeyDown}/></div>
          <div className="form-row"><label style={{width:180}}>A/C Holder Name</label><span className="colon">:</span><input id="l-bank-holder" type="text" className="form-input" style={{width:200}} defaultValue={activeAlterItem?.bankHolderName||''} onFocus={()=>setFocus(null)} onKeyDown={handleGlobalKeyDown}/></div>
          <div className="form-row"><label style={{width:180}}>A/C No.</label><span className="colon">:</span><input id="l-acc" type="text" className="form-input" style={{width:180}} defaultValue={activeAlterItem?.accountNo||''} onFocus={()=>setFocus(null)} onKeyDown={handleGlobalKeyDown}/></div>
          <div className="form-row"><label style={{width:180}}>IFSC Code</label><span className="colon">:</span><input id="l-ifsc" type="text" className="form-input" style={{width:140}} defaultValue={activeAlterItem?.ifsc||''} onFocus={()=>setFocus(null)} onKeyDown={handleGlobalKeyDown}/></div>
        </div>

      </div>
      <div style={{borderTop:'2px solid #1c5282',padding:'12px 25px',background:'#f8f8f8'}}>
        <div className="form-row">
          <label style={{width:200}}>Opening Balance (1-Apr-2026)</label><span className="colon">:</span>
          <input id="l-ob" type="text" className="form-input" style={{width:150,textAlign:'right',fontWeight:'bold'}} defaultValue={activeAlterItem?.openingBalance||'0.00'} onFocus={()=>setFocus(null)} onKeyDown={handleGlobalKeyDown}/>
          <select id="l-ob-type" className="form-input" style={{width:50,marginLeft:8}} defaultValue={activeAlterItem?.balanceType || 'Dr'} onKeyDown={handleGlobalKeyDown}><option>Dr</option><option>Cr</option></select>
        </div>
      </div>

      {focus && (
        <div style={{position:'fixed',top:60,right:120,bottom:0,width:300,background:'#fbfdff',borderLeft:'2px solid #1c5282',display:'flex',flexDirection:'column',zIndex:1000, boxShadow:'-4px 0 15px rgba(0,0,0,0.1)'}}>
          <div style={{padding:'8px 10px',background:'#1c5282',color:'#fff',fontWeight:'bold',fontSize:12}}>
            {rightPanelTitle}
          </div>
          <div ref={listRef} style={{flex:1,overflowY:'auto'}}>
            {list.length === 0 ? (
              <div style={{padding:15,textAlign:'center',color:'#888',fontSize:12}}>No items found</div>
            ) : (
              list.map((item,i)=>(
                <div key={i} data-idx={i}
                  style={{
                    fontSize:12,padding:'5px 12px',cursor:'pointer',
                    background: i===selIdx ? '#ffeb3b' : i%2===0?'#f9fbff':'#fff',
                    color: i===selIdx ? '#000' : 'inherit',
                    border: i===selIdx ? '1px solid #fbc02d' : '1px solid transparent',
                    fontWeight: i===selIdx ? 'bold' : 'normal',
                  }}
                  onMouseDown={e=>{e.preventDefault();pick(typeof item === 'string' ? item : (item as any).name);}}
                  onMouseEnter={()=>setSelIdx(i)}
                >
                  {item==='Primary'&&<span style={{marginRight:6,color:i===selIdx?'#fff':'#888'}}>♦</span>}
                  {typeof item === 'string' ? item : (item as any).name}
                </div>
              ))
            )}
          </div>
          {focus==='under' && (
            <div style={{padding:'6px 10px',borderTop:'1px solid #ccd',fontSize:11,color:'#8B4000',background:'#fffbe6',cursor:'pointer'}}
              onMouseDown={e=>{e.preventDefault();onAltC({fieldType:'group',onCreated:n=>{const inp=document.getElementById('l-under') as HTMLInputElement;if(inp)inp.value=n;}});}}>
              ⚡ Alt+C: Create New Group
            </div>
          )}
        </div>
      )}
      <div style={{borderTop:'1px solid #ccc',padding:'12px 25px',background:'#f8f8f8',display:'flex',justifyContent:'flex-end',gap:15}}>
        {activeAlterItem && onDelete && (
          <button style={{background:'#f44336',color:'white',border:'none',padding:'8px 25px',cursor:'pointer',fontWeight:'bold',fontSize:13}}
            onClick={()=>onDelete('ledger', activeAlterItem.id)}>
            Delete (Alt+D)
          </button>
        )}
        <button id="btn-save-ledger" style={{background:'#1c5282',color:'white',border:'none',padding:'8px 35px',cursor:'pointer',fontWeight:'bold',fontSize:13}}
          onClick={()=>{
            const name = fv('l-name'); if (!name) { alert('Ledger Name is required!'); document.getElementById('l-name')?.focus(); return; }
            // Duplicate Check
            if (ledgers.some(l => l.name.toLowerCase() === name.toLowerCase() && (!activeAlterItem || l.id !== activeAlterItem.id))) {
              alert(`Ledger "${name}" already exists!`); return;
            }
            const data = { 
              name, alias: fv('l-alias'), mailingName: fv('l-mail'), groupName: fv('l-under') || 'Sundry Debtors', 
              address: (document.getElementById('l-addr') as HTMLTextAreaElement)?.value || '', state: fv('l-state'), country: fv('l-country'), 
              gstin: fv('l-gst'), pan: fv('l-pan'), registrationType: fsv('l-reg'), 
              setAlterGstDetails: fsv('l-gst-alter'),
              ifsc: fv('l-ifsc'), bankName: fv('l-bank'), accountNo: fv('l-acc'), bankHolderName: fv('l-bank-holder'),
              phone: fv('l-phone'), email: fv('l-email'), pinCode: fv('l-pin'), 
              openingBalance: parseFloat(fv('l-ob')) || 0, balanceType: fsv('l-ob-type') || 'Dr',
              odLimit: isBankOD && odLimit ? parseFloat(odLimit) : null
            };
            onSave(data);
          }}>
          ✓ Accept (Ctrl+A)
        </button>
      </div>
    </div>
  );
}

function StockGroupCreationForm({activeAlterItem,stockGroups,onSave,onAltC,onDelete}:{activeAlterItem?:any;stockGroups:StockGroup[];onSave:(d:any)=>void;onAltC:(ctx:AltCContext)=>void;onDelete?:(type:string,id:number)=>void}) {
  const ref=useRef<HTMLInputElement>(null);
  const [focus,setFocus]=useState(false);
  const [filter,setFilter]=useState('');
  const [sel,setSel]=useState(0);
  useEffect(()=>{ref.current?.focus();},[]);
  const list=(stockGroups.map(g=>g.name)).filter(g=>!filter||g.toLowerCase().includes(filter.toLowerCase()));
  const pick=(v:string)=>{const inp=document.getElementById('sg-under') as HTMLInputElement;if(inp){inp.value=v;}setFocus(false);
    setTimeout(()=>{if(inp){const inputs=Array.from(document.querySelectorAll('.form-workspace input:not([disabled]),.form-workspace select:not([disabled]),.form-workspace textarea:not([disabled])')) as HTMLElement[];const idx=inputs.indexOf(inp);if(idx>=0&&idx<inputs.length-1)(inputs[idx+1]).focus();}},50);
  };
  return (
    <div className="form-content" style={{display:'flex',height:'100%',padding:0}}>
      <div style={{flex:1,padding:20}}>
        <div className="form-section-title" style={{marginTop:0,color:'#1c5282'}}>Stock Group {activeAlterItem?'Alteration':'Creation'}</div>
        <div className="form-row"><label style={{width:100}}>Name</label><span className="colon">:</span><input id="sg-name" ref={ref} autoFocus type="text" className="form-input" style={{width:360,fontWeight:'bold'}} defaultValue={activeAlterItem?.name||''}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const val = e.currentTarget.value.trim();
              if (stockGroups.some(g => g.name.toLowerCase() === val.toLowerCase() && (!activeAlterItem || g.id !== activeAlterItem.id))) {
                alert(`Stock Group "${val}" already exists!`); e.preventDefault(); return;
              }
            }
          }}
        /></div>
        <div className="form-row"><label style={{width:100}}>(alias)</label><span className="colon">:</span><input id="sg-alias" type="text" className="form-input" style={{width:360}}/></div>
        <div className="form-row" style={{marginTop:20}}>
          <label style={{width:100}}>Under</label><span className="colon">:</span>
          <input id="sg-under" type="text" className="form-input" style={{width:300,fontWeight:'bold'}}
            onFocus={()=>{setFocus(true);setFilter('');setSel(0);}}
            onInput={e=>{setFilter((e.target as HTMLInputElement).value);setSel(0);}}
            onKeyDown={e=>{
              if(e.altKey&&e.key.toLowerCase()==='c'){e.preventDefault();onAltC({fieldType:'stockGroup',onCreated:n=>{const inp=document.getElementById('sg-under') as HTMLInputElement;if(inp)inp.value=n;}});return;}
              if(e.key==='ArrowDown'){e.preventDefault();setSel(p=>(p+1)%list.length);}
              else if(e.key==='ArrowUp'){e.preventDefault();setSel(p=>(p-1+list.length)%list.length);}
              else if(e.key==='Enter'&&list.length>0){e.preventDefault();e.stopPropagation();pick(list[sel]);}
            }}
            onBlur={()=>setTimeout(()=>setFocus(false),200)}
            defaultValue={activeAlterItem?.under||'Primary'} autoComplete="off"/>
          <span style={{marginLeft:8,fontSize:11,color:'#888'}}>Alt+C</span>
        </div>
        <div style={{marginTop:25,borderTop:'1px solid #eee',paddingTop:15}}>
          <div className="form-section-title" style={{marginTop:0}}>Settings</div>
          <div className="form-row"><label style={{width:320}}>Should quantities of items be added</label><span className="colon">:</span><select className="form-input" style={{width:80}}><option>Yes</option><option>No</option></select></div>
        </div>
      </div>
      <div style={{width:280,borderLeft:'2px solid #1c5282',display:'flex',flexDirection:'column',background:'#fbfdff'}}>
        <div className="modal-header" style={{fontSize:12}}>List of Stock Groups</div>
        <div style={{flex:1,overflowY:'auto'}}>
          {stockGroups.map((g,i)=><div key={i} className="modal-list-item" style={{fontSize:12}} onMouseDown={e=>{e.preventDefault();pick(g.name);}}>{g.name==='Primary'&&<span style={{marginRight:6}}>♦</span>}{g.name}</div>)}
        </div>
      </div>
      {focus&&<ListPanel title="List of Stock Groups" items={list} selectedName={list[sel]} onSelect={pick} onAltC={()=>onAltC({fieldType:'stockGroup',onCreated:n=>{const inp=document.getElementById('sg-under') as HTMLInputElement;if(inp)inp.value=n;}})}/>}
      <div style={{borderTop:'1px solid #ccc',padding:'12px 25px',background:'#f8f8f8',display:'flex',justifyContent:'flex-end',gap:15}}>
        {activeAlterItem && onDelete && (
          <button style={{background:'#f44336',color:'white',border:'none',padding:'8px 25px',cursor:'pointer',fontWeight:'bold',fontSize:13}}
            onClick={()=>onDelete('stockGroup', activeAlterItem.id)}>
            Delete (Alt+D)
          </button>
        )}
        <button style={{background:'#1c5282',color:'white',border:'none',padding:'8px 35px',cursor:'pointer',fontWeight:'bold',fontSize:13}}
          onClick={()=>{
            const fv = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value?.trim() || '';
            const name = fv('sg-name'); if (!name) { alert('Stock Group Name is required!'); return; }
            const data = { name, alias: fv('sg-alias'), under: fv('sg-under') || 'Primary' };
            onSave(data);
          }}>
          ✓ Accept (Ctrl+A)
        </button>
      </div>
    </div>
  );
}

function StockCategoryCreationForm({activeAlterItem,stockCategories,onSave,onDelete}:{activeAlterItem?:any;stockCategories:StockCategory[];onSave:(d:any)=>void;onDelete?:(type:string,id:number)=>void}) {
  const ref=useRef<HTMLInputElement>(null);
  useEffect(()=>{ref.current?.focus();},[]);
  return (
    <div className="form-content" style={{display:'flex',height:'100%',padding:0}}>
      <div style={{flex:1,padding:20}}>
        <div className="form-section-title" style={{marginTop:0,color:'#1c5282'}}>Stock Category {activeAlterItem?'Alteration':'Creation'}</div>
        <div className="form-row"><label style={{width:100}}>Name</label><span className="colon">:</span><input id="sc-name" ref={ref} autoFocus type="text" className="form-input" style={{width:360,fontWeight:'bold'}} defaultValue={activeAlterItem?.name||''}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const val = e.currentTarget.value.trim();
              if (stockCategories.some(c => c.name.toLowerCase() === val.toLowerCase() && (!activeAlterItem || c.id !== activeAlterItem.id))) {
                alert(`Stock Category "${val}" already exists!`); e.preventDefault(); return;
              }
            }
          }}
        /></div>
        <div className="form-row"><label style={{width:100}}>(alias)</label><span className="colon">:</span><input type="text" className="form-input" style={{width:360}}/></div>
        <div className="form-row" style={{marginTop:20}}><label style={{width:100}}>Under</label><span className="colon">:</span><input type="text" className="form-input" style={{width:280,fontWeight:'bold'}} defaultValue="Primary"/></div>
        <div style={{marginTop:25,padding:12,background:'#fffbe6',border:'1px solid #f0d060',fontSize:12,borderRadius:2}}>
          Stock Categories let you group items for analysis (e.g., by Brand, Season, Grade etc.) without affecting inventory valuation.
        </div>
      </div>
      <div style={{width:280,borderLeft:'2px solid #1c5282',display:'flex',flexDirection:'column',background:'#fbfdff'}}>
        <div className="modal-header" style={{fontSize:12}}>List of Stock Categories</div>
        <div style={{flex:1,overflowY:'auto'}}>
          {stockCategories.map((c,i)=><div key={i} className="modal-list-item" style={{fontSize:12}}>{c.name}</div>)}
        </div>
        <div style={{borderTop:'1px solid #ccc',padding:'12px 25px',background:'#f8f8f8',display:'flex',justifyContent:'flex-end',gap:15}}>
        {activeAlterItem && onDelete && (
          <button style={{background:'#f44336',color:'white',border:'none',padding:'8px 25px',cursor:'pointer',fontWeight:'bold',fontSize:13}}
            onClick={()=>onDelete('stockCategory', activeAlterItem.id)}>
            Delete (Alt+D)
          </button>
        )}
        <button style={{background:'#1c5282',color:'white',border:'none',padding:'8px 35px',cursor:'pointer',fontWeight:'bold',fontSize:13}}
          onClick={()=>{
            const fv = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value?.trim() || '';
            const name = fv('sc-name'); if (!name) { alert('Stock Category Name is required!'); return; }
            const data = { name };
            onSave(data);
          }}>
          ✓ Accept (Ctrl+A)
        </button>
      </div>
    </div>
    </div>
  );
}

function StockItemCreationForm({activeAlterItem,stockGroups,stockCategories,units,stockItems,onSave,onAltC,onDelete,activeCompany,setActiveCompany,setCompanies}:{activeAlterItem?:any;stockGroups:StockGroup[];stockCategories:StockCategory[];units:UnitData[];stockItems:StockItem[];onSave:(d:any)=>void;onAltC:(ctx:AltCContext)=>void;onDelete?:(type:string,id:number)=>void;activeCompany:Company|null;setActiveCompany:React.Dispatch<React.SetStateAction<Company|null>>;setCompanies:React.Dispatch<React.SetStateAction<Company[]>>;}) {
  const ref=useRef<HTMLInputElement>(null);
  const [focus,setFocus]=useState<string|null>(null);
  const [filter,setFilter]=useState('');
  const [sel,setSel]=useState(0);
  const [nameFilter, setNameFilter]=useState('');
  const [nameSel, setNameSel]=useState(0);
  const [showInclTax, setShowInclTax] = useState(activeAlterItem?.showInclTax ?? false);
  const [showAmtInclTax, setShowAmtInclTax] = useState(activeAlterItem?.showAmtInclTax ?? false);
  const [enableDescription, setEnableDescription] = useState(activeAlterItem?.enableDescription ?? false);
  const [descLine1, setDescLine1] = useState(activeAlterItem?.descLine1 ?? false);
  const [descLine2, setDescLine2] = useState(activeAlterItem?.descLine2 ?? false);
  const [descLine3, setDescLine3] = useState(activeAlterItem?.descLine3 ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const listRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{ref.current?.focus();},[]);

  const fv = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value?.trim() || '';
  const fsv = (id: string) => (document.getElementById(id) as HTMLSelectElement)?.value || '';

  const lists:Record<string,any[]>={
    under: stockGroups.map(g=>g.name),
    category: stockCategories.map(c=>c.name),
    units: units,
    altunit: [{name:'Not Applicable', symbol:'Not Applicable'}, ...units],
  };
  const list=(lists[focus||'']||[]).filter(i=> {
    if(!filter) return true;
    if(typeof i === 'string') return i.toLowerCase().includes(filter.toLowerCase());
    return ((i as any).symbol||(i as any).name||'').toLowerCase().includes(filter.toLowerCase());
  });

  // Filtered stock items for name field
  const filteredStockItems = useMemo(() => {
    if (!stockItems || !Array.isArray(stockItems)) return [];
    if (!nameFilter) return stockItems;
    const q = nameFilter.toLowerCase();
    return stockItems.filter(it => it && it.name && it.name.toLowerCase().includes(q));
  }, [stockItems, nameFilter]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('[data-idx]');
      const idx = focus==='name' ? nameSel : sel;
      if (items[idx]) (items[idx] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [nameSel, sel, focus]);

  // Local state for reactive display
  const [currentUnit, setCurrentUnit] = useState(activeAlterItem?.unit || 'Nos');

  useEffect(() => {
    if (!focus) return;
    if (focus === 'under') {
      const curVal = (document.getElementById('item-under') as HTMLInputElement)?.value || activeAlterItem?.under || 'Primary';
      const idx = stockGroups.findIndex(g => g.name.toLowerCase() === curVal.trim().toLowerCase());
      setSel(idx >= 0 ? idx : 0);
    } else if (focus === 'category') {
      const curVal = (document.getElementById('item-cat') as HTMLInputElement)?.value || activeAlterItem?.category || 'Not Applicable';
      const idx = stockCategories.findIndex(c => c.name.toLowerCase() === curVal.trim().toLowerCase());
      setSel(idx >= 0 ? idx : 0);
    } else if (focus === 'units') {
      const curVal = (document.getElementById('item-units') as HTMLInputElement)?.value || currentUnit || 'Nos';
      const idx = units.findIndex(u => u.name.toLowerCase() === curVal.trim().toLowerCase() || u.symbol.toLowerCase() === curVal.trim().toLowerCase());
      setSel(idx >= 0 ? idx : 0);
    } else if (focus === 'altunit') {
      const curVal = (document.getElementById('item-altunit') as HTMLInputElement)?.value || 'Not Applicable';
      const altUnitsList = [{name:'Not Applicable', symbol:'Not Applicable'}, ...units];
      const idx = altUnitsList.findIndex(u => u.name.toLowerCase() === curVal.trim().toLowerCase() || u.symbol.toLowerCase() === curVal.trim().toLowerCase());
      setSel(idx >= 0 ? idx : 0);
    }
  }, [focus]);

  // pick from under/category/units/altunit list
  const pick=(v:string)=>{
    const ids:Record<string,string>={under:'item-under',category:'item-cat',units:'item-units',altunit:'item-altunit'};
    const inp=document.getElementById(ids[focus!]||'') as HTMLInputElement;
    if(inp){
      inp.value=v;
      if (focus === 'units') setCurrentUnit(v);
    }
    setFocus(null);
    setTimeout(()=>{
      if(inp){
        const inputs=Array.from(document.querySelectorAll('.form-workspace input:not([disabled]),.form-workspace select:not([disabled]),.form-workspace textarea:not([disabled])')) as HTMLElement[];
        const idx=inputs.indexOf(inp);
        if(idx>=0&&idx<inputs.length-1)(inputs[idx+1]).focus();
      }
    },50);
  };

  useEffect(() => {
    if (activeAlterItem) {
      const idx = filteredStockItems.findIndex(it => it.id === activeAlterItem.id);
      if (idx >= 0) setNameSel(idx);
      setShowInclTax(activeAlterItem.showInclTax ?? false);
      setShowAmtInclTax(activeAlterItem.showAmtInclTax ?? false);
      setEnableDescription(activeAlterItem.enableDescription ?? false);
      setDescLine1(activeAlterItem.descLine1 ?? false);
      setDescLine2(activeAlterItem.descLine2 ?? false);
      setDescLine3(activeAlterItem.descLine3 ?? false);
    }
  }, [activeAlterItem, filteredStockItems]);
  const pickStockItem=(it:StockItem)=>{
    if (!it) return;
    const nameEl=document.getElementById('item-name') as HTMLInputElement;
    const underEl=document.getElementById('item-under') as HTMLInputElement;
    const catEl=document.getElementById('item-cat') as HTMLInputElement;
    const unitsEl=document.getElementById('item-units') as HTMLInputElement;
    const hsnEl=document.getElementById('item-hsn') as HTMLInputElement;
    const gstEl=document.getElementById('item-gst') as HTMLInputElement;
    const oqtyEl=document.getElementById('item-oqty') as HTMLInputElement;
    const orateEl=document.getElementById('item-orate') as HTMLInputElement;
    if(nameEl) nameEl.value=it.name || '';
    if(underEl) underEl.value=it.under || 'Primary';
    if(catEl) catEl.value=it.category || 'Not Applicable';
    if(unitsEl) {
      const u = typeof it.unit === 'string' ? it.unit : (it.unit as any)?.name || (it.unit as any)?.symbol || 'Nos';
      unitsEl.value = u;
      setCurrentUnit(u);
    }
    if(hsnEl) hsnEl.value=it.hsnCode||'';
    if(gstEl) gstEl.value=String(it.gstRate || 18);
    if(oqtyEl) oqtyEl.value=String(it.openingQty || 0);
    if(orateEl) orateEl.value=String(it.openingRate || 0);
    setShowInclTax(it.showInclTax ?? false);
    setShowAmtInclTax(it.showAmtInclTax ?? false);
    setEnableDescription(it.enableDescription ?? false);
    setDescLine1(it.descLine1 ?? false);
    setDescLine2(it.descLine2 ?? false);
    setDescLine3(it.descLine3 ?? false);
    setFocus(null);
    setTimeout(()=>{
      const inputs=Array.from(document.querySelectorAll('.form-workspace input:not([disabled]),.form-workspace select:not([disabled]),.form-workspace textarea:not([disabled])')) as HTMLElement[];
      const nameIdx=inputs.indexOf(nameEl);
      if(nameIdx>=0&&nameIdx<inputs.length-1)(inputs[nameIdx+1]).focus();
    },50);
  };

  const stockItemFields = [
    'item-name', 'item-alias', 'item-under', 'item-cat', 'item-units', 'item-altunit',
    'item-hsn', 'item-gst', 'item-show-incl-tax', 'item-show-amt-incl-tax', 'item-enable-desc',
    'item-desc-line1', 'item-desc-line2', 'item-desc-line3',
    'item-gst-app', 'item-supply-type', 'item-costing', 'item-market',
    'item-oqty', 'item-orate', 'btn-save-item'
  ];

  const moveToNext = (currentId: string) => {
    const idx = stockItemFields.indexOf(currentId);
    if (idx >= 0) {
      // Skip fields that are not present in the DOM (e.g. hidden desc-line checkboxes when enableDescription=false)
      for (let i = idx + 1; i < stockItemFields.length; i++) {
        const next = document.getElementById(stockItemFields[i]);
        if (next) { next.focus(); break; }
      }
    }
  };

  const handleGlobalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target.id === 'btn-save-item') return;
      if (target.id === 'item-name' && filteredStockItems.length > 0 && !activeAlterItem) return;
      if (['item-under', 'item-cat', 'item-units', 'item-altunit'].includes(target.id) && list.length > 0) return;
      e.preventDefault();
      moveToNext(target.id);
    }
  };

  const handleKey=(field:string)=>(e:React.KeyboardEvent<HTMLInputElement>)=>{
    if(e.altKey&&e.key.toLowerCase()==='c'){e.preventDefault();const ft:any={under:'stockGroup',units:'unit',altunit:'unit'};onAltC({fieldType:ft[field]||'stockGroup',onCreated:n=>{const ids:any={under:'item-under',units:'item-units',altunit:'item-altunit'};const inp=document.getElementById(ids[field]) as HTMLInputElement;if(inp)inp.value=n;}});return;}
    if(e.key==='ArrowDown'){e.preventDefault();setSel(p=>(p+1)%Math.max(1,list.length));}
    else if(e.key==='ArrowUp'){e.preventDefault();setSel(p=>(p-1+Math.max(1,list.length))%Math.max(1,list.length));}
    else if(e.key==='Enter'&&list.length>0){e.preventDefault();e.stopPropagation();const item=list[sel]; pick(typeof item === 'string' ? item : (item as any).symbol || (item as any).name);}
    else if(e.key==='Enter'){
      e.preventDefault();
      moveToNext(e.currentTarget.id);
    }
  };

  const handleNameKeyDown=(e:React.KeyboardEvent<HTMLInputElement>)=>{
    if(e.key === 'ArrowDown'){e.preventDefault();e.stopPropagation();setNameSel(p=>Math.min(p+1,filteredStockItems.length-1));}
    else if(e.key === 'ArrowUp'){e.preventDefault();e.stopPropagation();setNameSel(p=>Math.max(p-1,0));}
    else if(e.key === 'Enter'){
      const val = e.currentTarget.value.trim();
      // 1. Check for duplicate first
      if (stockItems.some(it => it.name.toLowerCase() === val.toLowerCase() && (!activeAlterItem || it.id !== activeAlterItem.id))) {
        alert(`Stock Item "${val}" already exists!`); e.preventDefault(); return;
      }
      // 2. If no duplicate, then allow picking from list if searching
      if (filteredStockItems.length > 0 && nameFilter && !activeAlterItem) {
        e.preventDefault(); e.stopPropagation(); pickStockItem(filteredStockItems[nameSel]);
      } else {
        // 3. Otherwise move to next field
        e.preventDefault();
        moveToNext(e.currentTarget.id);
      }
    }
  };

  // Determine right panel content
  const showRightPanel = focus !== null && (focus !== 'name' || !!activeAlterItem);
  const rightPanelTitle = focus==='name'
    ? `List of Stock Items (${filteredStockItems.length})`
    : focus==='under' ? `List of Stock Groups (${list.length})`
    : focus==='category' ? `List of Categories (${list.length})`
    : focus==='units' ? `List of Units (${list.length})`
    : focus==='altunit' ? `List of Units (${list.length})`
    : '';

  return (
    <div className="form-content" style={{display:'flex',flexDirection:'column',padding:0,height:'100%',position:'relative'}}>
      <div style={{background:'#1c5282',color:'white',padding:'8px 15px',fontSize:14,fontWeight:'bold',display:'flex',justifyContent:'space-between'}}>
        <span>Stock Item {activeAlterItem?'Alteration':'Creation'}</span>
        <span style={{fontSize:11,opacity:0.85}}>Alt+C on Under/Units to create inline</span>
      </div>
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        <div style={{flex:1,padding:'15px 25px',borderRight:'1px solid #eee',overflowY:'auto'}}>
          {/* Name */}
          <div className="form-row"><label style={{width:140}}>Name</label><span className="colon">:</span>
            <input id="item-name" ref={ref} autoFocus type="text" className="form-input" style={{width:340,fontWeight:'bold'}} defaultValue={activeAlterItem?.name||''}
              onFocus={()=>{setFocus('name');setNameFilter('');setNameSel(0);}}
              onInput={e=>{setNameFilter((e.target as HTMLInputElement).value);setNameSel(0);}}
              onKeyDown={handleNameKeyDown}
              onBlur={()=>setTimeout(()=>setFocus(p=>p==='name'?null:p),200)}
            />
          </div>
          <div className="form-row"><label style={{width:140}}>(alias)</label><span className="colon">:</span>
            <input id="item-alias" type="text" className="form-input" style={{width:340}} defaultValue={activeAlterItem?.alias||''}
              onFocus={()=>setFocus(null)} onKeyDown={handleGlobalKeyDown}
            />
          </div>
          <div style={{marginTop:20}}>
            {/* Under */}
            <div className="form-row">
              <label style={{width:140}}>Under</label><span className="colon">:</span>
              <input id="item-under" type="text" className="form-input" style={{width:260,fontWeight:'bold'}}
                onFocus={()=>{setFocus('under');setFilter('');setSel(0);}}
                onInput={e=>{setFilter((e.target as HTMLInputElement).value);setSel(0);}}
                onKeyDown={handleKey('under')}
                onBlur={()=>setTimeout(()=>setFocus(p=>p==='under'?null:p),200)}
                defaultValue={activeAlterItem?.under||'Primary'} autoComplete="off"/>
              <span style={{marginLeft:6,fontSize:11,color:'#888'}}>Alt+C</span>
            </div>
            {/* Category */}
            <div className="form-row">
              <label style={{width:140}}>Category</label><span className="colon">:</span>
              <input id="item-cat" type="text" className="form-input" style={{width:260,fontWeight:'bold'}}
                onFocus={()=>{setFocus('category');setFilter('');setSel(0);}}
                onInput={e=>{setFilter((e.target as HTMLInputElement).value);setSel(0);}}
                onKeyDown={handleKey('category')}
                onBlur={()=>setTimeout(()=>setFocus(p=>p==='category'?null:p),200)}
                defaultValue={activeAlterItem?.category||'Not Applicable'} autoComplete="off"/>
            </div>
            {/* Units */}
            <div className="form-row">
              <label style={{width:140}}>Units</label><span className="colon">:</span>
              <input id="item-units" type="text" className="form-input" style={{width:260,fontWeight:'bold'}}
                onFocus={()=>{setFocus('units');setFilter('');setSel(0);}}
                onInput={e=>{
                  const val = (e.target as HTMLInputElement).value;
                  setFilter(val);
                  setSel(0);
                  setCurrentUnit(val || 'Nos');
                }}
                onKeyDown={handleKey('units')}
                onBlur={()=>setTimeout(()=>setFocus(p=>p==='units'?null:p),200)}
                defaultValue={typeof activeAlterItem?.unit === 'string' ? activeAlterItem.unit : (activeAlterItem?.unit as any)?.name || (activeAlterItem?.unit as any)?.symbol || 'Nos'} autoComplete="off"/>
              <span style={{marginLeft:6,fontSize:11,color:'#888'}}>Alt+C</span>
            </div>
            {/* Alternate Unit */}
            <div className="form-row">
              <label style={{width:140}}>Alternate Unit</label><span className="colon">:</span>
              <input id="item-altunit" type="text" className="form-input" style={{width:260,fontWeight:'bold'}}
                onFocus={()=>{setFocus('altunit');setFilter('');setSel(0);}}
                onInput={e=>{setFilter((e.target as HTMLInputElement).value);setSel(0);}}
                onKeyDown={handleKey('altunit')}
                onBlur={()=>setTimeout(()=>setFocus(p=>p==='altunit'?null:p),200)}
                defaultValue={activeAlterItem?.altUnit||'Not Applicable'} autoComplete="off"/>
            </div>
            <div className="form-row"><label style={{width:140}}>HSN/SAC Code</label><span className="colon">:</span>
              <input id="item-hsn" type="text" className="form-input" style={{width:140}} defaultValue={activeAlterItem?.hsnCode||''} onFocus={()=>setFocus(null)} onKeyDown={handleGlobalKeyDown}/></div>
            <div className="form-row"><label style={{width:140}}>GST Rate (%)</label><span className="colon">:</span>
              <input id="item-gst" type="text" className="form-input" style={{width:80,textAlign:'right'}} defaultValue={activeAlterItem?.gstRate||'18'} onFocus={()=>setFocus(null)} onKeyDown={handleGlobalKeyDown}/><span style={{marginLeft:5}}>%</span></div>
            <div className="form-row">
              <label style={{width:140}}>Show Incl. Tax Rate</label><span className="colon">:</span>
              <select id="item-show-incl-tax" className="form-input" style={{width:80}} value={showInclTax ? 'Yes' : 'No'} onChange={e=>setShowInclTax(e.target.value==='Yes')} onKeyDown={handleGlobalKeyDown}>
                <option>No</option>
                <option>Yes</option>
              </select>
              <span style={{marginLeft:10,fontSize:11,color:'#666'}}>(For Voucher Entry)</span>
            </div>
            <div className="form-row">
              <label style={{width:140}}>Show Incl. Tax Amt</label><span className="colon">:</span>
              <select id="item-show-amt-incl-tax" className="form-input" style={{width:80}} value={showAmtInclTax ? 'Yes' : 'No'} onChange={e=>setShowAmtInclTax(e.target.value==='Yes')} onKeyDown={handleGlobalKeyDown}>
                <option>No</option>
                <option>Yes</option>
              </select>
              <span style={{marginLeft:10,fontSize:11,color:'#666'}}>(For Voucher Entry)</span>
            </div>
            <div className="form-row" style={{marginTop:6}}>
              <label style={{width:140}}>Provide Description</label><span className="colon">:</span>
              <select id="item-enable-desc" className="form-input" style={{width:80}} value={enableDescription ? 'Yes' : 'No'} onChange={e=>setEnableDescription(e.target.value==='Yes')} onKeyDown={handleGlobalKeyDown}>
                <option>No</option>
                <option>Yes</option>
              </select>
              <span style={{marginLeft:10,fontSize:11,color:'#666'}}>(For Voucher Entry)</span>
            </div>
            {enableDescription && (
              <div style={{marginTop:6, marginBottom:8, background:'#f4f8fc', padding:'8px 12px', borderRadius:4, border:'1px solid #d0e0f0'}}>
                <div style={{fontSize:11, color:'#1c5282', fontWeight:'bold', marginBottom:6}}>Select Description Lines:</div>
                <div style={{display:'flex', gap:18, alignItems:'center', flexWrap:'wrap'}}>
                  <label style={{fontSize:12, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5, fontWeight:'bold', color:'#333'}}>
                    <input id="item-desc-line1" type="checkbox" style={{cursor:'pointer', width:14, height:14}} checked={descLine1} onChange={e=>setDescLine1(e.target.checked)} onKeyDown={handleGlobalKeyDown}/> Line 1
                  </label>
                  <label style={{fontSize:12, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5, fontWeight:'bold', color:'#333'}}>
                    <input id="item-desc-line2" type="checkbox" style={{cursor:'pointer', width:14, height:14}} checked={descLine2} onChange={e=>setDescLine2(e.target.checked)} onKeyDown={handleGlobalKeyDown}/> Line 2
                  </label>
                  <label style={{fontSize:12, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5, fontWeight:'bold', color:'#333'}}>
                    <input id="item-desc-line3" type="checkbox" style={{cursor:'pointer', width:14, height:14}} checked={descLine3} onChange={e=>setDescLine3(e.target.checked)} onKeyDown={handleGlobalKeyDown}/> Line 3
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{flex:1,padding:'15px 25px',background:'#fcfcfc',overflowY:'auto'}}>
          <b style={{display:'block',marginBottom:10,textDecoration:'underline',fontSize:13}}>Statutory Details</b>
          <div className="form-row"><label style={{width:200}}>GST Applicable</label><span className="colon">:</span><select id="item-gst-app" className="form-input" style={{width:140}} defaultValue={activeAlterItem?.gstApplicable||'Applicable'} onKeyDown={handleGlobalKeyDown}><option>Applicable</option><option>Not Applicable</option></select></div>
          <div className="form-row"><label style={{width:200}}>Type of Supply</label><span className="colon">:</span><select id="item-supply-type" className="form-input" style={{width:140}} defaultValue={activeAlterItem?.typeOfSupply||'Goods'} onKeyDown={handleGlobalKeyDown}><option>Goods</option><option>Services</option></select></div>
          <b style={{display:'block',margin:'20px 0 10px',textDecoration:'underline',fontSize:13,borderTop:'1px solid #eee',paddingTop:12}}>Costing / Pricing</b>
          <div className="form-row"><label style={{width:200}}>Costing Method</label><span className="colon">:</span><select id="item-costing" className="form-input" style={{width:180}} defaultValue={activeAlterItem?.costingMethod||'Average Cost'} onKeyDown={handleGlobalKeyDown}><option>Average Cost</option><option>FIFO</option><option>LIFO</option><option>Standard Cost</option></select></div>
           <div className="form-row"><label style={{width:200}}>Market Valuation Method</label><span className="colon">:</span><select id="item-market" className="form-input" style={{width:180}} defaultValue={activeAlterItem?.marketValuationMethod||'Average Price'} onKeyDown={handleGlobalKeyDown}><option>Average Price</option><option>Last Purchase Price</option><option>Last Sale Price</option></select></div>
          <div className="form-row"><label style={{width:200}}>Standard Discount (%)</label><span className="colon">:</span><input id="item-disc" type="text" className="form-input" style={{width:80,textAlign:'center',fontWeight:'bold'}} defaultValue={activeAlterItem?.defaultDiscount||'0.00'} onKeyDown={handleGlobalKeyDown}/></div>
          <div className="form-row">
            <label style={{width:200}}>Show Discount in Invoices</label><span className="colon">:</span>
            <select id="item-enable-discount" className="form-input" style={{width:80}} value={activeCompany?.showDiscount ? 'Yes' : 'No'} 
              onChange={async (e) => {
                const newVal = e.target.value === 'Yes';
                if (activeCompany) {
                  const updatedCo = { ...activeCompany, showDiscount: newVal };
                  setActiveCompany(updatedCo);
                  setCompanies(prev => prev.map(c => c.id === activeCompany.id ? updatedCo : c));
                  // Save to DB
                  fetch('/api/companies', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authClient.getToken()}` },
                    body: JSON.stringify(updatedCo)
                  });
                }
              }}
              onKeyDown={handleGlobalKeyDown}
            >
              <option>No</option>
              <option>Yes</option>
            </select>
            <span style={{marginLeft:10,fontSize:11,color:'#666'}}>(Global Setting)</span>
          </div>
        </div>
      </div>
      <div style={{borderTop:'1px solid #ccc',padding:'12px 25px',background:'#f8f8f8'}}>
        <div style={{display:'flex',gap:20,marginBottom:5,fontSize:12,fontWeight:'bold',color:'#555'}}>
          <span style={{width:150}}>Opening Balance</span><span style={{width:100}}>Quantity</span><span style={{width:100}}>Rate</span><span style={{width:60}}>per</span><span style={{width:120,textAlign:'right'}}>Value</span>
        </div>
        <div style={{display:'flex',gap:20,alignItems:'center'}}>
          <span style={{width:150,fontSize:12}}>As on 1-Apr-2026</span>
          <input id="item-oqty" type="text" className="form-input" style={{width:100,textAlign:'right'}} defaultValue={activeAlterItem?.openingQty||'0'} onFocus={()=>setFocus(null)} onKeyDown={handleGlobalKeyDown}/>
          <input id="item-orate" type="text" className="form-input" style={{width:100,textAlign:'right'}} defaultValue={activeAlterItem?.openingRate||'0.00'} onFocus={()=>setFocus(null)} onKeyDown={handleGlobalKeyDown}/>
          <span style={{width:60,fontSize:11,textAlign:'center'}}>{typeof currentUnit === 'string' ? currentUnit : (currentUnit as any)?.name || (currentUnit as any)?.symbol || 'Nos'}</span>
          <span style={{width:120,textAlign:'right',fontWeight:'bold',fontSize:13}}>
            ₹ {fmt((activeAlterItem?.openingQty||0)*(activeAlterItem?.openingRate||0))}
          </span>
        </div>
      </div>

      {/* Contextual Right Panel - only when a field is focused */}
      {showRightPanel && (
        <div style={{position:'fixed',top:60,right:120,bottom:0,width:300,background:'#fbfdff',borderLeft:'2px solid #1c5282',display:'flex',flexDirection:'column',zIndex:1000, boxShadow:'-4px 0 15px rgba(0,0,0,0.1)'}}>
          <div style={{padding:'8px 10px',background:'#1c5282',color:'#fff',fontWeight:'bold',fontSize:12}}>
            {rightPanelTitle}
          </div>
          <div ref={listRef} style={{flex:1,overflowY:'auto'}}>
            {focus==='name' ? (
              filteredStockItems.length===0
                ? <div style={{padding:15,textAlign:'center',color:'#888',fontSize:12}}>No items found</div>
                : filteredStockItems.map((it,i)=>(
                  <div key={it.id||i} data-idx={i}
                    style={{
                      fontSize:12,padding:'6px 10px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',
                      background: i===nameSel ? '#ffeb3b' : i%2===0?'#f9fbff':'#fff',
                      color: i===nameSel ? '#000' : 'inherit',
                      border: i===nameSel ? '1px solid #fbc02d' : '1px solid transparent',
                      fontWeight: i===nameSel ? 'bold' : 'normal',
                    }}
                    onMouseDown={e=>{e.preventDefault();pickStockItem(it);}}
                    onMouseEnter={()=>setNameSel(i)}
                  >
                    <span>{it?.name || 'Unknown Item'}</span>
                    <span style={{opacity:0.5,fontSize:11}}>{typeof it?.unit === 'string' ? it.unit : (it?.unit as any)?.name || (it?.unit as any)?.symbol || 'Nos'}</span>
                  </div>
                ))
            ) : (
              list.length===0
                ? <div style={{padding:15,textAlign:'center',color:'#888',fontSize:12}}>No items found</div>
                : list.map((item,i)=>(
                  <div key={i} data-idx={i}
                    style={{
                      fontSize:12,padding:'6px 10px',cursor:'pointer',
                      background: i===sel ? '#ffeb3b' : i%2===0?'#f9fbff':'#fff',
                      color: i===sel ? '#000' : 'inherit',
                      border: i===sel ? '1px solid #fbc02d' : '1px solid transparent',
                      fontWeight: i===sel ? 'bold' : 'normal',
                      display:'flex',justifyContent:'space-between',alignItems:'center'
                    }}
                    onMouseDown={e=>{e.preventDefault();pick(typeof item === 'string' ? item : (item as any).symbol || (item as any).name);}}
                    onMouseEnter={()=>setSel(i)}
                  >
                    <span>
                      {item==='Primary' && <span style={{marginRight:6,color: i===sel?'#fff':'#888'}}>♦</span>}
                      {typeof item === 'string' ? item : (item as any).symbol || (item as any).name}
                    </span>
                    {typeof item !== 'string' && (item as any).formalName && <span style={{opacity:0.6,fontSize:11}}>{(item as any).formalName}</span>}
                  </div>
                ))
            )}
          </div>
          {(focus==='under'||focus==='units'||focus==='altunit') && (
            <div style={{padding:'6px 10px',borderTop:'1px solid #ccd',fontSize:11,color:'#8B4000',background:'#fffbe6',cursor:'pointer'}}
              onMouseDown={e=>{e.preventDefault();const ft:any={under:'stockGroup',units:'unit',altunit:'unit'};onAltC({fieldType:ft[focus]||'stockGroup',onCreated:n=>{const ids:any={under:'item-under',units:'item-units',altunit:'item-altunit'};const inp=document.getElementById(ids[focus]) as HTMLInputElement;if(inp){inp.value=n;if(focus==='units')setCurrentUnit(n);}}});}}>
              ⚡ Alt+C: Create New
            </div>
          )}
        </div>
      )}
      <div style={{borderTop:'1px solid #ccc',padding:'12px 25px',background:'#f8f8f8',display:'flex',justifyContent:'flex-end',gap:15}}>
        {activeAlterItem && onDelete && (
          <button style={{background:'#f44336',color:'white',border:'none',padding:'8px 25px',cursor:'pointer',fontWeight:'bold',fontSize:13}}
            onClick={()=>onDelete('stockItem', activeAlterItem.id)}>
            Delete (Alt+D)
          </button>
        )}
        <button id="btn-save-item" disabled={isSaving} style={{background: isSaving ? '#557fa3' : '#1c5282',color:'white',border:'none',padding:'8px 35px',cursor: isSaving ? 'default' : 'pointer',fontWeight:'bold',fontSize:13}}
          onClick={()=>{
            if (isSaving) return;
            const name = fv('item-name'); if (!name) { alert('Stock Item Name is required!'); return; }
            // Duplicate Check
            if (stockItems.some(it => it.name.toLowerCase() === name.toLowerCase() && (!activeAlterItem || it.id !== activeAlterItem.id))) {
              alert(`Stock Item "${name}" already exists!`); return;
            }
            const unitName = fv('item-units');
            if (!unitName) { alert('Unit is required!'); document.getElementById('item-units')?.focus(); return; }
            const matchedUnit = units.find(u => (u.symbol || u.name || '').toLowerCase() === unitName.toLowerCase());
            if (!matchedUnit) {
              alert(`Unit "${unitName}" not found in master list. Please create it first using Alt+C or select from list.`);
              document.getElementById('item-units')?.focus();
              return;
            }
            const data = { 
              name, alias: fv('item-alias'), 
              under: fv('item-under') || 'Primary', 
              category: fv('item-cat') || 'Not Applicable', 
              unit: matchedUnit.symbol || matchedUnit.name, 
              unitId: matchedUnit.id,
              altUnit: fv('item-altunit') || 'Not Applicable',
              showInclTax,
              showAmtInclTax,
              enableDescription,
              descLine1: enableDescription ? descLine1 : false,
              descLine2: enableDescription ? descLine2 : false,
              descLine3: enableDescription ? descLine3 : false,
              gstRate: fv('item-gst') ? parseFloat(fv('item-gst')) : 18, 
              hsnCode: fv('item-hsn'), 
              gstApplicable: fsv('item-gst-app'),
              typeOfSupply: fsv('item-supply-type'),
              costingMethod: fsv('item-costing'),
              marketValuationMethod: fsv('item-market'),
              openingQty: parseFloat(fv('item-oqty')) || 0, 
              openingRate: parseFloat(fv('item-orate')) || 0,
              defaultDiscount: parseFloat(fv('item-disc')) || 0
            };
            setIsSaving(true);
            (async () => {
              try {
                await onSave(data);
              } catch (err) {
                console.error(err);
              } finally {
                setIsSaving(false);
              }
            })();
          }}>
          {isSaving ? '✓ Saving...' : '✓ Accept (Ctrl+A)'}
        </button>
      </div>
    </div>
  );
}

function UnitCreationForm({activeAlterItem,units,onSave,onDelete}:{activeAlterItem?:any;units:UnitData[];onSave:(d:any)=>void;onDelete?:(type:string,id:number)=>void}) {
  const ref=useRef<HTMLInputElement>(null);
  useEffect(()=>{ref.current?.focus();},[]);
  return (
    <div className="form-content" style={{display:'flex',flexDirection:'column',height:'100%',padding:0}}>
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        <div style={{flex:1,padding:20,overflowY:'auto'}}>
          <div className="form-section-title" style={{marginTop:0,color:'#1c5282'}}>Unit {activeAlterItem?'Alteration':'Creation'}</div>
          {[
            ['Symbol (Short Name)', 'unit-sym', 100, 'e.g. Nos', activeAlterItem?.symbol || activeAlterItem?.name],
            ['Formal Name', 'unit-name', 260, 'e.g. Numbers', activeAlterItem?.formalName],
            ['Unit Quantity Code (GST)', 'unit-uqc', 100, 'NOS', activeAlterItem?.uqc]
          ].map(([label, id, w, ph, val], i) => (
            <div key={i} className="form-row">
              <label style={{width:200}}>{label}</label><span className="colon">:</span>
              <input id={id as string} ref={i===0?ref:undefined} autoFocus={i===0} type="text" className="form-input" style={{width:w as number,fontWeight:i===0?'bold':'normal'}} defaultValue={val as string || ''} placeholder={ph as string}
                onKeyDown={e => {
                  if (e.key === 'Enter' && id === 'unit-sym') {
                    const val = e.currentTarget.value.trim();
                    if (units.some(u => u.symbol.toLowerCase() === val.toLowerCase() && (!activeAlterItem || u.id !== activeAlterItem.id))) {
                      alert(`Unit "${val}" already exists!`); e.preventDefault(); return;
                    }
                  }
                }}
              />
            </div>
          ))}
          <div className="form-row"><label style={{width:200}}>Number of Decimal Places</label><span className="colon">:</span><input id="unit-decimal" type="text" className="form-input" style={{width:60,textAlign:'center',fontWeight:'bold'}} defaultValue={activeAlterItem?.decimalPlaces || '0'}/></div>
          <div style={{marginTop:25,borderTop:'1px solid #eee',paddingTop:15}}>
            <div className="form-section-title" style={{marginTop:0}}>Compound Unit (Optional)</div>
            <div className="form-row"><label style={{width:200}}>Is it a compound unit?</label><span className="colon">:</span><select className="form-input" style={{width:80}}><option>No</option><option>Yes</option></select></div>
            <div style={{padding:10,background:'#f7f7f7',border:'1px solid #ddd',fontSize:12,marginTop:10,color:'#555'}}>
              Compound unit example: 1 Box = 12 Nos. Enable this to define relationships between units.
            </div>
          </div>
        </div>
        {activeAlterItem && (
          <div style={{width:280,borderLeft:'2px solid #1c5282',display:'flex',flexDirection:'column',background:'#fbfdff'}}>
            <div className="modal-header" style={{fontSize:12}}>List of Units ({units.length})</div>
            <div style={{flex:1,overflowY:'auto'}}>
              {units.map((u,i)=><div key={i} className="modal-list-item" style={{fontSize:12,display:'flex',justifyContent:'space-between'}}>
                <span style={{fontWeight:'bold'}}>{u.symbol || u.name}</span>
                <span style={{opacity:0.6,fontSize:11}}>{u.formalName}</span>
              </div>)}
            </div>
          </div>
        )}
      </div>
      <div className="form-footer" style={{background:'#dde4f0',padding:'10px 20px',display:'flex',justifyContent:'flex-end',gap:10,borderTop:'2px solid #b0bedc'}}>
        {activeAlterItem && onDelete && (
          <button style={{background:'#d93025',color:'white',border:'none',padding:'7px 25px',cursor:'pointer',fontWeight:'bold',fontSize:12}}
            onClick={() => onDelete('unit', activeAlterItem.id)}>
            Alt+D: Delete
          </button>
        )}
        <button className="dispatch-detail-modal-accept-btn" style={{background:'#1c5282',color:'white',border:'none',padding:'7px 26px',cursor:'pointer',fontWeight:'bold',fontSize:12}}
          onClick={() => {
            const fv = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || '';
            const sym = fv('unit-sym'); if (!sym) { alert('Unit Symbol is required!'); return; }
            onSave({
              name: sym,
              symbol: sym,
              formalName: fv('unit-name'),
              uqc: fv('unit-uqc'),
              decimalPlaces: parseInt(fv('unit-decimal')) || 0
            });
          }}>
          ✓ Accept (Ctrl+A)
        </button>
      </div>
    </div>
  );
}

function GodownCreationForm({activeAlterItem,godowns,onSave,onDelete}:{activeAlterItem?:any;godowns:GodownData[];onSave:(d:any)=>void;onDelete?:(type:string,id:number)=>void}) {
  const ref=useRef<HTMLInputElement>(null);
  useEffect(()=>{ref.current?.focus();},[]);
  return (
    <div className="form-content" style={{display:'flex',height:'100%',padding:0}}>
      <div style={{flex:1,padding:20}}>
        <div className="form-section-title" style={{marginTop:0,color:'#1c5282'}}>Godown {activeAlterItem?'Alteration':'Creation'}</div>
        {[['Name','gd-name',360,true],['(alias)','gd-alias',360,false]].map(([label,id,w,bold],i)=>(
          <div key={i} className="form-row"><label style={{width:120}}>{label}</label><span className="colon">:</span><input id={id as string} ref={i===0?ref:undefined} autoFocus={i===0} type="text" className="form-input" style={{width:w as number,fontWeight:bold?'bold':'normal'}} defaultValue={activeAlterItem?.name||''}
            onKeyDown={e => {
              if (e.key === 'Enter' && id === 'gd-name') {
                const val = e.currentTarget.value.trim();
                if (godowns.some(g => g.name.toLowerCase() === val.toLowerCase() && (!activeAlterItem || g.id !== activeAlterItem.id))) {
                  alert(`Godown "${val}" already exists!`); e.preventDefault(); return;
                }
              }
            }}
          /></div>
        ))}
        <div className="form-row" style={{marginTop:15}}><label style={{width:120}}>Under</label><span className="colon">:</span>
          <select id="gd-under" className="form-input" style={{width:280,fontWeight:'bold'}}>
            <option>Primary</option>
            {godowns.map((g,i)=><option key={i}>{g.name}</option>)}
          </select>
        </div>
        <div style={{marginTop:25,borderTop:'1px solid #eee',paddingTop:15}}>
          <div className="form-section-title" style={{marginTop:0}}>Address Details</div>
          <div className="form-row"><label style={{width:120}}>Address</label><span className="colon">:</span><textarea className="form-input" style={{width:320,height:60}}/></div>
          <div className="form-row"><label style={{width:120}}>Contact Person</label><span className="colon">:</span><input type="text" className="form-input" style={{width:280}}/></div>
          <div className="form-row"><label style={{width:120}}>Phone No.</label><span className="colon">:</span><input type="text" className="form-input" style={{width:200}}/></div>
          <div className="form-row" style={{marginTop:10}}><label style={{width:280}}>Is this the Main Location?</label><span className="colon">:</span><select className="form-input" style={{width:80}}><option>No</option><option>Yes</option></select></div>
        </div>
      </div>
      <div style={{width:280,borderLeft:'2px solid #1c5282',display:'flex',flexDirection:'column',background:'#fbfdff'}}>
        <div className="modal-header" style={{fontSize:12}}>List of Godowns ({godowns.length})</div>
        <div style={{flex:1,overflowY:'auto'}}>
          {godowns.map((g,i)=><div key={i} className="modal-list-item" style={{fontSize:12}}>{g.name}</div>)}
        </div>
      </div>
      <div style={{borderTop:'1px solid #ccc',padding:'12px 25px',background:'#f8f8f8',display:'flex',justifyContent:'flex-end',gap:15}}>
        {activeAlterItem && onDelete && (
          <button style={{background:'#f44336',color:'white',border:'none',padding:'8px 25px',cursor:'pointer',fontWeight:'bold',fontSize:13}}
            onClick={()=>onDelete('godown', activeAlterItem.id)}>
            Delete (Alt+D)
          </button>
        )}
        <button style={{background:'#1c5282',color:'white',border:'none',padding:'8px 35px',cursor:'pointer',fontWeight:'bold',fontSize:13}}
          onClick={()=>{
            const fv = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value?.trim() || '';
            const name = fv('gd-name'); if (!name) { alert('Godown Name is required!'); return; }
            const data = { name, alias: fv('gd-alias'), under: (document.getElementById('gd-under') as HTMLSelectElement)?.value || 'Primary' };
            onSave(data);
          }}>
          ✓ Accept (Ctrl+A)
        </button>
      </div>
    </div>
  );
}

function CurrencyCreationForm({activeAlterItem,currencies,onSave,onDelete}:{activeAlterItem?:any;currencies:CurrencyData[];onSave:(d:any)=>void;onDelete?:(type:string,id:number)=>void}) {
  const ref=useRef<HTMLInputElement>(null);
  const [listSelIdx, setListSelIdx] = useState(0);
  const [showList, setShowList] = useState(false);
  const [filterText, setFilterText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // Build full currency list from COUNTRY_CURRENCY
  const allCurrencyList = useMemo(() => {
    const seen = new Set<string>();
    const list: {symbol:string; name:string; isoCode:string; paise:string; country:string}[] = [];
    for (const [country, curr] of Object.entries(COUNTRY_CURRENCY)) {
      const key = curr.isoCode;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ ...curr, country });
      }
    }
    return list;
  }, []);

  const filteredList = useMemo(() => {
    if (!filterText) return allCurrencyList;
    const q = filterText.toLowerCase();
    return allCurrencyList.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q) ||
      c.isoCode.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q)
    );
  }, [allCurrencyList, filterText]);

  useEffect(()=>{ref.current?.focus();},[]);
  useEffect(()=>{setListSelIdx(0);},[filteredList]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('.currency-list-item');
      if (items[listSelIdx]) {
        items[listSelIdx].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [listSelIdx]);

  const selectCurrency = (cur: typeof allCurrencyList[0]) => {
    const symEl = document.getElementById('cur-sym') as HTMLInputElement;
    const nameEl = document.getElementById('cur-name') as HTMLInputElement;
    const isoEl = document.getElementById('cur-iso') as HTMLInputElement;
    const paiseEl = document.getElementById('cur-paise') as HTMLInputElement;
    if (symEl) { symEl.value = cur.symbol; symEl.focus(); }
    if (nameEl) nameEl.value = cur.name;
    if (isoEl) isoEl.value = cur.isoCode;
    if (paiseEl) paiseEl.value = cur.paise;
    setShowList(false);
    setFilterText('');
  };

  const handleSymbolKeyDown = (e: React.KeyboardEvent) => {
    if (showList && filteredList.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault(); e.stopPropagation();
        setListSelIdx(p => Math.min(p + 1, filteredList.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation();
        setListSelIdx(p => Math.max(p - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault(); e.stopPropagation();
        selectCurrency(filteredList[listSelIdx]);
      }
    }
  };

  return (
    <div className="form-content" style={{display:'flex',height:'100%',padding:0}}>
      <div style={{flex:1,padding:20}}>
        <div className="form-section-title" style={{marginTop:0,color:'#1c5282'}}>Currency {activeAlterItem?'Alteration':'Creation'}</div>
        <div className="form-row">
          <label style={{width:220}}>Symbol</label><span className="colon">:</span>
          <input id="cur-sym" ref={ref} autoFocus type="text" className="form-input"
            style={{width:80,fontWeight:'bold',textAlign:'center'}}
            defaultValue={activeAlterItem?.symbol||''}
            placeholder="₹"
            onFocus={()=>setShowList(true)}
            onChange={(e)=>{setFilterText(e.target.value); setShowList(true);}}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const val = e.currentTarget.value.trim();
                if (currencies.some(c => c.symbol.toLowerCase() === val.toLowerCase() && (!activeAlterItem || c.id !== activeAlterItem.id))) {
                  alert(`Currency "${val}" already exists!`); e.preventDefault(); return;
                }
              }
              handleSymbolKeyDown(e);
            }}
          />
        </div>
        <div className="form-row">
          <label style={{width:220}}>Formal Name</label><span className="colon">:</span>
          <input id="cur-name" type="text" className="form-input"
            style={{width:260}} defaultValue={activeAlterItem?.name||''} placeholder="Indian Rupee"
            onFocus={()=>setShowList(false)}
          />
        </div>
        <div className="form-row">
          <label style={{width:220}}>ISO Currency Code</label><span className="colon">:</span>
          <input id="cur-iso" type="text" className="form-input"
            style={{width:100}} defaultValue={activeAlterItem?.isoCode||''} placeholder="INR"
            onFocus={()=>setShowList(false)}
          />
        </div>
        <div style={{marginTop:25,borderTop:'1px solid #eee',paddingTop:15}}>
          <div className="form-section-title" style={{marginTop:0}}>Display Settings</div>
          {[['Number of decimal places','2','input',50],['Show amount in millions','No','select',60],['Suffix symbol to amount','No','select',60],['Add space between amount and symbol','No','select',60],['Word representing amount after decimal','Paise','input',120,'cur-paise'],['No. of decimal places for amount in words','2','input',50]].map(([label,val,type,w,customId],i)=>(
            <div key={i} className="form-row" style={{marginBottom:8}}><label style={{width:320}}>{label}</label><span className="colon">:</span>
              {type==='select'?<select className="form-input" style={{width:w as number}} onFocus={()=>setShowList(false)}><option selected={val==='No'}>No</option><option selected={val==='Yes'}>Yes</option></select>
               :<input id={customId as string || undefined} type="text" className="form-input" style={{width:w as number,textAlign:'center'}} defaultValue={val as string} onFocus={()=>setShowList(false)}/>}
            </div>
          ))}
        </div>
      </div>
      <div style={{width:300,borderLeft:'2px solid #1c5282',display:'flex',flexDirection:'column',background:'#fbfdff'}}>
        <div className="modal-header" style={{fontSize:12,padding:'8px 10px',background:'#1c5282',color:'#fff',fontWeight:'bold'}}>
          {showList ? `Select Currency (${filteredList.length})` : `List of Currencies (${allCurrencyList.length})`}
        </div>
        <div ref={listRef} style={{flex:1,overflowY:'auto'}}>
          {(showList ? filteredList : allCurrencyList).map((c,i)=>(
            <div key={c.isoCode}
              className="currency-list-item modal-list-item"
              style={{
                fontSize:12,display:'flex',justifyContent:'space-between',alignItems:'center',
                padding:'6px 10px',cursor:'pointer',
                background: showList && i === listSelIdx ? '#1c5282' : 'transparent',
                color: showList && i === listSelIdx ? '#fff' : 'inherit',
              }}
              onClick={()=>selectCurrency(c)}
              onMouseEnter={()=>{if(showList)setListSelIdx(i);}}
            >
              <span style={{fontWeight:'bold',display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:14,minWidth:30,textAlign:'center'}}>{c.symbol}</span>
                <span>{c.name}</span>
              </span>
              <span style={{opacity: showList && i === listSelIdx ? 0.9 : 0.5,fontSize:11,fontWeight:'bold'}}>{c.isoCode}</span>
            </div>
          ))}
          {showList && filteredList.length === 0 && (
            <div style={{padding:15,textAlign:'center',color:'#888',fontSize:12}}>No currencies found</div>
          )}
        </div>
      </div>
      <div style={{borderTop:'1px solid #ccc',padding:'12px 25px',background:'#f8f8f8',display:'flex',justifyContent:'flex-end',gap:15}}>
        {activeAlterItem && onDelete && (
          <button style={{background:'#f44336',color:'white',border:'none',padding:'8px 25px',cursor:'pointer',fontWeight:'bold',fontSize:13}}
            onClick={()=>onDelete('currency', activeAlterItem.id)}>
            Delete (Alt+D)
          </button>
        )}
        <button style={{background:'#1c5282',color:'white',border:'none',padding:'8px 35px',cursor:'pointer',fontWeight:'bold',fontSize:13}}
          onClick={()=>{
            const fv = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value?.trim() || '';
            const sym = fv('cur-sym'); if (!sym) { alert('Currency Symbol is required!'); return; }
            const data = { symbol: sym, name: fv('cur-name') || sym, isoCode: fv('cur-iso'), paise: fv('cur-paise') };
            onSave(data);
          }}>
          ✓ Accept (Ctrl+A)
        </button>
      </div>
    </div>
  );
}

function VoucherTypeCreationForm({activeAlterItem,voucherTypes,onSave,onDelete}:{activeAlterItem?:any;voucherTypes:VoucherTypeData[];onSave:(d:any)=>void;onDelete?:(type:string,id:number)=>void}) {
  const ref=useRef<HTMLInputElement>(null);
  useEffect(()=>{ref.current?.focus();},[]);
  return (
    <div className="form-content" style={{display:'flex',height:'100%',padding:0}}>
      <div style={{flex:1,padding:20,overflowY:'auto'}}>
        <div className="form-section-title" style={{marginTop:0,color:'#1c5282'}}>Voucher Type {activeAlterItem?'Alteration':'Creation'}</div>
        <div className="form-row"><label style={{width:200}}>Name</label><span className="colon">:</span><input id="vt-name" ref={ref} autoFocus type="text" className="form-input" style={{width:260,fontWeight:'bold'}} defaultValue={activeAlterItem?.name||''}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const val = e.currentTarget.value.trim();
              if (voucherTypes.some(v => v.name.toLowerCase() === val.toLowerCase() && (!activeAlterItem || v.id !== activeAlterItem.id))) {
                alert(`Voucher Type "${val}" already exists!`); e.preventDefault(); return;
              }
            }
          }}
        /></div>
        <div className="form-row"><label style={{width:200}}>(alias)</label><span className="colon">:</span><input type="text" className="form-input" style={{width:260}}/></div>
        <div className="form-row" style={{marginTop:10}}>
          <label style={{width:200}}>Type of Voucher</label><span className="colon">:</span>
          <select id="vt-type" className="form-input" style={{width:200,fontWeight:'bold'}}>
            {VOUCHER_TYPES_DEFAULT.map((v,i)=><option key={i} selected={activeAlterItem?.type===v}>{v}</option>)}
          </select>
        </div>
        <div className="form-row"><label style={{width:200}}>Abbreviation</label><span className="colon">:</span><input type="text" className="form-input" style={{width:100}} maxLength={5} defaultValue={activeAlterItem?.abbreviation||''}/></div>
        <div style={{marginTop:20,borderTop:'1px solid #eee',paddingTop:15}}>
          <div className="form-section-title" style={{marginTop:0}}>Voucher Settings</div>
          {[['Use for POS Invoicing','No'],['Use for Cheque Printing','No'],['Allow Narration in voucher','Yes'],['Provide narrations for each ledger','No'],['Make this voucher Optional by default','No'],['Default Print Title','']].map(([label,val],i)=>(
            <div key={i} className="form-row" style={{marginBottom:8}}><label style={{width:320}}>{label}</label><span className="colon">:</span>
              {val===''?<input type="text" className="form-input" style={{width:200}}/>:<select className="form-input" style={{width:80}}><option selected={val==='Yes'}>Yes</option><option selected={val==='No'}>No</option></select>}
            </div>
          ))}
        </div>
        <div style={{marginTop:15,borderTop:'1px solid #eee',paddingTop:15}}>
          <div className="form-section-title" style={{marginTop:0}}>Numbering Details</div>
          <div className="form-row"><label style={{width:280}}>Method of Voucher Numbering</label><span className="colon">:</span><select id="vt-numbering" className="form-input" style={{width:160}} defaultValue={activeAlterItem?.numberingMethod||'Automatic'}><option>Automatic</option><option>Manual</option><option>None</option></select></div>
          <div className="form-row"><label style={{width:280}}>Starting Number</label><span className="colon">:</span><input id="vt-start-no" type="text" className="form-input" style={{width:80,textAlign:'right'}} defaultValue={activeAlterItem?.startNumber||"1"}/></div>
          <div className="form-row"><label style={{width:280}}>Width of Numerical Part</label><span className="colon">:</span><input id="vt-width" type="text" className="form-input" style={{width:80,textAlign:'right'}} defaultValue={activeAlterItem?.width||"0"}/></div>
          <div className="form-row"><label style={{width:280}}>Prefill with Zero</label><span className="colon">:</span><select id="vt-zero" className="form-input" style={{width:80}} defaultValue={activeAlterItem?.prefillWithZero?'Yes':'No'}><option>No</option><option>Yes</option></select></div>
          <div className="form-row" style={{marginTop:10}}><label style={{width:280}}>Prefix Details (e.g. SAL/MAR/)</label><span className="colon">:</span><input id="vt-prefix" type="text" className="form-input" style={{width:160}} defaultValue={activeAlterItem?.prefix||''}/></div>
          <div className="form-row"><label style={{width:280}}>Suffix Details (e.g. /2026)</label><span className="colon">:</span><input id="vt-suffix" type="text" className="form-input" style={{width:160}} defaultValue={activeAlterItem?.suffix||''}/></div>
        </div>
      </div>
      <div style={{width:280,borderLeft:'2px solid #1c5282',display:'flex',flexDirection:'column',background:'#fbfdff'}}>
        <div className="modal-header" style={{fontSize:12}}>List of Voucher Types ({voucherTypes.length})</div>
        <div style={{flex:1,overflowY:'auto'}}>
          {voucherTypes.map((v,i)=><div key={i} className="modal-list-item" style={{fontSize:12}}>{v.name}</div>)}
        </div>
      </div>
      <div style={{borderTop:'1px solid #ccc',padding:'12px 25px',background:'#f8f8f8',display:'flex',justifyContent:'flex-end',gap:15}}>
        {activeAlterItem && onDelete && (
          <button style={{background:'#f44336',color:'white',border:'none',padding:'8px 25px',cursor:'pointer',fontWeight:'bold',fontSize:13}}
            onClick={()=>onDelete('voucherType', activeAlterItem.id)}>
            Delete (Alt+D)
          </button>
        )}
        <button style={{background:'#1c5282',color:'white',border:'none',padding:'8px 35px',cursor:'pointer',fontWeight:'bold',fontSize:13}}
          onClick={()=>{
            const fv = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value?.trim() || '';
            const fsv = (id: string) => (document.getElementById(id) as HTMLSelectElement)?.value || '';
            const name = fv('vt-name'); if (!name) { alert('Voucher Type Name is required!'); return; }
            const data = { name, type: fsv('vt-type'), abbreviation: fv('vt-abbr'), numberingMethod: fsv('vt-numbering'), startNumber: parseInt(fv('vt-start-no'))||1, width: parseInt(fv('vt-width'))||0, prefillWithZero: fsv('vt-zero')==='Yes', prefix: fv('vt-prefix'), suffix: fv('vt-suffix') };
            onSave(data);
          }}>
          ✓ Accept (Ctrl+A)
        </button>
      </div>
    </div>
  );
}

// ==================== JOURNAL VOUCHER EXAMPLES DATA ====================
const JOURNAL_EXAMPLES_DATA = [
  {
    category: "⭐ Top 16 Essential Journal Examples",
    items: [
      {
        title: "1. Depreciation",
        entries: [
          { type: "By (Dr)", ledger: "Depreciation A/c", group: "Indirect Expenses", amount: 0 },
          { type: "To (Cr)", ledger: "Furniture A/c", group: "Fixed Assets", amount: 0 }
        ],
        note: "Depreciation expense बढ़ा → Debit; Furniture की book value कम हुई → Credit."
      },
      {
        title: "2. Outstanding Rent",
        entries: [
          { type: "By (Dr)", ledger: "Rent Expense A/c", group: "Indirect Expenses", amount: 0 },
          { type: "To (Cr)", ledger: "Outstanding Rent A/c", group: "Current Liabilities", amount: 0 }
        ],
        note: "Rent expense हुआ → Debit; अभी भुगतान बाकी है → Liability Credit."
      },
      {
        title: "3. Outstanding Salary",
        entries: [
          { type: "By (Dr)", ledger: "Salary A/c", group: "Indirect Expenses", amount: 0 },
          { type: "To (Cr)", ledger: "Outstanding Salary A/c", group: "Current Liabilities", amount: 0 }
        ],
        note: ""
      },
      {
        title: "4. Bad Debts",
        entries: [
          { type: "By (Dr)", ledger: "Bad Debts A/c", group: "Indirect Expenses", amount: 0 },
          { type: "To (Cr)", ledger: "XYZ Debtor A/c", group: "Sundry Debtors", amount: 0 }
        ],
        note: ""
      },
      {
        title: "5. Prepaid Insurance",
        entries: [
          { type: "By (Dr)", ledger: "Prepaid Insurance A/c", group: "Current Assets", amount: 0 },
          { type: "To (Cr)", ledger: "Insurance Expense A/c", group: "Indirect Expenses", amount: 0 }
        ],
        note: "Future period का expense है, इसलिए Asset बना Debit किया गया।"
      },
      {
        title: "6. Accrued Interest Income",
        entries: [
          { type: "By (Dr)", ledger: "Accrued Interest A/c", group: "Current Assets", amount: 0 },
          { type: "To (Cr)", ledger: "Interest Income A/c", group: "Indirect Incomes", amount: 0 }
        ],
        note: ""
      },
      {
        title: "7. Interest Outstanding",
        entries: [
          { type: "By (Dr)", ledger: "Interest on Loan A/c", group: "Indirect Expenses", amount: 0 },
          { type: "To (Cr)", ledger: "Outstanding Interest A/c", group: "Current Liabilities", amount: 0 }
        ],
        note: ""
      },
      {
        title: "8. Drawings",
        entries: [
          { type: "By (Dr)", ledger: "Drawings A/c", group: "Capital Account", amount: 0 },
          { type: "To (Cr)", ledger: "Bank A/c", group: "Bank Accounts", amount: 0 }
        ],
        note: ""
      },
      {
        title: "9. Capital Introduced",
        entries: [
          { type: "By (Dr)", ledger: "Bank A/c", group: "Bank Accounts", amount: 0 },
          { type: "To (Cr)", ledger: "Capital A/c", group: "Capital Account", amount: 0 }
        ],
        note: ""
      },
      {
        title: "10. Loan Received",
        entries: [
          { type: "By (Dr)", ledger: "Bank A/c", group: "Bank Accounts", amount: 0 },
          { type: "To (Cr)", ledger: "Bank Loan A/c", group: "Secured Loans", amount: 0 }
        ],
        note: ""
      },
      {
        title: "11. Furniture Purchased on Credit",
        entries: [
          { type: "By (Dr)", ledger: "Furniture A/c", group: "Fixed Assets", amount: 0 },
          { type: "To (Cr)", ledger: "XYZ Creditor A/c", group: "Sundry Creditors", amount: 0 }
        ],
        note: ""
      },
      {
        title: "12. Business Expense Paid by Owner",
        entries: [
          { type: "By (Dr)", ledger: "Electricity Expense A/c", group: "Indirect Expenses", amount: 0 },
          { type: "To (Cr)", ledger: "Capital A/c", group: "Capital Account", amount: 0 }
        ],
        note: "Owner ने अपनी जेब से electricity expense दिया।"
      },
      {
        title: "13. Customer Balance Written Off",
        entries: [
          { type: "By (Dr)", ledger: "Bad Debts A/c", group: "Indirect Expenses", amount: 0 },
          { type: "To (Cr)", ledger: "XYZ Debtor A/c", group: "Sundry Debtors", amount: 0 }
        ],
        note: ""
      },
      {
        title: "14. Supplier Balance Written Back",
        entries: [
          { type: "By (Dr)", ledger: "XYZ Creditor A/c", group: "Sundry Creditors", amount: 0 },
          { type: "To (Cr)", ledger: "Income from Write Back A/c", group: "Indirect Incomes", amount: 0 }
        ],
        note: ""
      },
      {
        title: "15. Prepaid Stationery",
        entries: [
          { type: "By (Dr)", ledger: "Prepaid Stationery A/c", group: "Current Assets", amount: 0 },
          { type: "To (Cr)", ledger: "Stationery Expense A/c", group: "Indirect Expenses", amount: 0 }
        ],
        note: ""
      },
      {
        title: "16. Provision for Doubtful Debts",
        entries: [
          { type: "By (Dr)", ledger: "Provision for Doubtful Debts Expense A/c", group: "Indirect Expenses", amount: 0 },
          { type: "To (Cr)", ledger: "Provision for Doubtful Debts A/c", group: "Provisions", amount: 0 }
        ],
        note: "Tally में Provisions सामान्यतः Current Liabilities / Provisions के अंतर्गत रखा जाता है।"
      }
    ]
  },
  {
    category: "Expense & Outstanding Entries",
    items: [
      {
        title: "17. Outstanding Audit Fees",
        entries: [
          { type: "By (Dr)", ledger: "Audit Fees A/c", group: "Indirect Expenses", amount: 0 },
          { type: "To (Cr)", ledger: "Audit Fees Payable A/c", group: "Current Liabilities", amount: 0 }
        ],
        note: ""
      },
      {
        title: "18. Outstanding Telephone Expense",
        entries: [
          { type: "By (Dr)", ledger: "Telephone Expense A/c", group: "Indirect Expenses", amount: 0 },
          { type: "To (Cr)", ledger: "Telephone Charges Payable A/c", group: "Current Liabilities", amount: 0 }
        ],
        note: ""
      },
      {
        title: "19. Outstanding Interest on Loan",
        entries: [
          { type: "By (Dr)", ledger: "Interest on Loan A/c", group: "Indirect Expenses", amount: 0 },
          { type: "To (Cr)", ledger: "Outstanding Interest A/c", group: "Current Liabilities", amount: 0 }
        ],
        note: ""
      }
    ]
  },
  {
    category: "Prepaid Expenses",
    items: [
      {
        title: "20. Prepaid Rent",
        entries: [
          { type: "By (Dr)", ledger: "Prepaid Rent A/c", group: "Current Assets", amount: 0 },
          { type: "To (Cr)", ledger: "Rent Expense A/c", group: "Indirect Expenses", amount: 0 }
        ],
        note: ""
      },
      {
        title: "21. Prepaid Advertisement",
        entries: [
          { type: "By (Dr)", ledger: "Prepaid Advertisement A/c", group: "Current Assets", amount: 0 },
          { type: "To (Cr)", ledger: "Advertisement Expense A/c", group: "Indirect Expenses", amount: 0 }
        ],
        note: ""
      }
    ]
  },
  {
    category: "Bad Debts & Debtors Adjustments",
    items: [
      {
        title: "22. Bad Debts Write-off",
        entries: [
          { type: "By (Dr)", ledger: "Bad Debts A/c", group: "Indirect Expenses", amount: 0 },
          { type: "To (Cr)", ledger: "XYZ Debtor A/c", group: "Sundry Debtors", amount: 0 }
        ],
        note: ""
      },
      {
        title: "23. Bad Debt Recovered",
        entries: [
          { type: "By (Dr)", ledger: "XYZ Customer A/c", group: "Sundry Debtors", amount: 0 },
          { type: "To (Cr)", ledger: "Bad Debts Recovered A/c", group: "Indirect Incomes", amount: 0 }
        ],
        note: "यदि पहले bad debt write off किया गया था और बाद में पैसा recover हुआ।"
      }
    ]
  },
  {
    category: "Accrued Income & Interest",
    items: [
      {
        title: "24. Commission Accrued",
        entries: [
          { type: "By (Dr)", ledger: "Commission Receivable A/c", group: "Current Assets", amount: 0 },
          { type: "To (Cr)", ledger: "Commission Income A/c", group: "Indirect Incomes", amount: 0 }
        ],
        note: ""
      },
      {
        title: "25. Rent Accrued",
        entries: [
          { type: "By (Dr)", ledger: "Rent Receivable A/c", group: "Current Assets", amount: 0 },
          { type: "To (Cr)", ledger: "Rent Income A/c", group: "Indirect Incomes", amount: 0 }
        ],
        note: ""
      },
      {
        title: "26. Income Accrued but Not Received",
        entries: [
          { type: "By (Dr)", ledger: "Income Receivable A/c", group: "Current Assets", amount: 0 },
          { type: "To (Cr)", ledger: "Other Income A/c", group: "Indirect Incomes", amount: 0 }
        ],
        note: ""
      }
    ]
  },
  {
    category: "Capital & Drawings",
    items: [
      {
        title: "27. Owner Introduced Money in Bank",
        entries: [
          { type: "By (Dr)", ledger: "Bank A/c", group: "Bank Accounts", amount: 0 },
          { type: "To (Cr)", ledger: "Capital A/c", group: "Capital Account", amount: 0 }
        ],
        note: ""
      },
      {
        title: "28. Goods Withdrawn for Personal Use",
        entries: [
          { type: "By (Dr)", ledger: "Drawings A/c", group: "Capital Account", amount: 0 },
          { type: "To (Cr)", ledger: "Purchase A/c", group: "Purchase Accounts", amount: 0 }
        ],
        note: ""
      },
      {
        title: "29. Cash Withdrawn by Owner",
        entries: [
          { type: "By (Dr)", ledger: "Drawings A/c", group: "Capital Account", amount: 0 },
          { type: "To (Cr)", ledger: "Cash", group: "Cash-in-hand", amount: 0 }
        ],
        note: ""
      }
    ]
  },
  {
    category: "Loans & Interest",
    items: [
      {
        title: "30. Unsecured Loan Received",
        entries: [
          { type: "By (Dr)", ledger: "Bank A/c", group: "Bank Accounts", amount: 0 },
          { type: "To (Cr)", ledger: "Unsecured Loan A/c", group: "Unsecured Loans", amount: 0 }
        ],
        note: ""
      },
      {
        title: "31. Loan Interest Accrued",
        entries: [
          { type: "By (Dr)", ledger: "Interest on Loan A/c", group: "Indirect Expenses", amount: 0 },
          { type: "To (Cr)", ledger: "Interest Payable A/c", group: "Current Liabilities", amount: 0 }
        ],
        note: ""
      },
      {
        title: "32. Interest Charged on Customer",
        entries: [
          { type: "By (Dr)", ledger: "XYZ Customer A/c", group: "Sundry Debtors", amount: 0 },
          { type: "To (Cr)", ledger: "Interest Income A/c", group: "Indirect Incomes", amount: 0 }
        ],
        note: ""
      }
    ]
  },
  {
    category: "Fixed Assets Purchased on Credit",
    items: [
      {
        title: "33. Computer Purchased on Credit",
        entries: [
          { type: "By (Dr)", ledger: "Computer A/c", group: "Fixed Assets", amount: 0 },
          { type: "To (Cr)", ledger: "XYZ Creditor A/c", group: "Sundry Creditors", amount: 0 }
        ],
        note: ""
      },
      {
        title: "34. Machinery Purchased on Credit",
        entries: [
          { type: "By (Dr)", ledger: "Machinery A/c", group: "Fixed Assets", amount: 0 },
          { type: "To (Cr)", ledger: "XYZ Supplier A/c", group: "Sundry Creditors", amount: 0 }
        ],
        note: ""
      },
      {
        title: "35. Installation Charges Capitalized",
        entries: [
          { type: "By (Dr)", ledger: "Machinery A/c", group: "Fixed Assets", amount: 0 },
          { type: "To (Cr)", ledger: "Installation Charges A/c", group: "Indirect Expenses", amount: 0 }
        ],
        note: "Installation cost asset को usable condition में लाने की directly attributable cost है।"
      }
    ]
  },
  {
    category: "Creditors & Suppliers Adjustments",
    items: [
      {
        title: "36. Discount Received from Supplier",
        entries: [
          { type: "By (Dr)", ledger: "XYZ Creditor A/c", group: "Sundry Creditors", amount: 0 },
          { type: "To (Cr)", ledger: "Discount Received A/c", group: "Indirect Incomes", amount: 0 }
        ],
        note: ""
      },
      {
        title: "37. Purchase Return Adjustment",
        entries: [
          { type: "By (Dr)", ledger: "XYZ Supplier A/c", group: "Sundry Creditors", amount: 0 },
          { type: "To (Cr)", ledger: "Purchase Return A/c", group: "Purchase Accounts", amount: 0 }
        ],
        note: "Purchase Return के लिए Debit Note (Ctrl+F9) भी appropriate है।"
      }
    ]
  },
  {
    category: "Debtors & Customers Adjustments",
    items: [
      {
        title: "38. Discount Allowed to Customer",
        entries: [
          { type: "By (Dr)", ledger: "Discount Allowed A/c", group: "Indirect Expenses", amount: 0 },
          { type: "To (Cr)", ledger: "XYZ Debtor A/c", group: "Sundry Debtors", amount: 0 }
        ],
        note: ""
      },
      {
        title: "39. Sales Return Adjustment",
        entries: [
          { type: "By (Dr)", ledger: "Sales Return A/c", group: "Sales Accounts", amount: 0 },
          { type: "To (Cr)", ledger: "XYZ Customer A/c", group: "Sundry Debtors", amount: 0 }
        ],
        note: "Sales Return के लिए Credit Note (Ctrl+F8) भी appropriate है।"
      }
    ]
  },
  {
    category: "Income Adjustments",
    items: [
      {
        title: "40. Commission Received in Advance",
        entries: [
          { type: "By (Dr)", ledger: "Commission Income A/c", group: "Indirect Incomes", amount: 0 },
          { type: "To (Cr)", ledger: "Commission Received in Advance A/c", group: "Current Liabilities", amount: 0 }
        ],
        note: ""
      },
      {
        title: "41. Rent Received in Advance",
        entries: [
          { type: "By (Dr)", ledger: "Rent Income A/c", group: "Indirect Incomes", amount: 0 },
          { type: "To (Cr)", ledger: "Rent Received in Advance A/c", group: "Current Liabilities", amount: 0 }
        ],
        note: ""
      }
    ]
  },
  {
    category: "Multiple Ledger Compound Entries",
    items: [
      {
        title: "42. Salary + Bonus Payable",
        entries: [
          { type: "By (Dr)", ledger: "Salary A/c", group: "Indirect Expenses", amount: 0 },
          { type: "By (Dr)", ledger: "Bonus Expense A/c", group: "Indirect Expenses", amount: 0 },
          { type: "To (Cr)", ledger: "Salary & Bonus Payable A/c", group: "Current Liabilities", amount: 0 }
        ],
        note: "Compound Entry: Multiple Dr entries to single Cr entry"
      },
      {
        title: "43. Depreciation on Two Assets",
        entries: [
          { type: "By (Dr)", ledger: "Depreciation A/c", group: "Indirect Expenses", amount: 0 },
          { type: "To (Cr)", ledger: "Furniture A/c", group: "Fixed Assets", amount: 0 },
          { type: "To (Cr)", ledger: "Computer A/c", group: "Fixed Assets", amount: 0 }
        ],
        note: "Compound Entry: Single Dr entry to Multiple Cr entries"
      },
      {
        title: "44. Outstanding Expenses - Multiple",
        entries: [
          { type: "By (Dr)", ledger: "Rent Expense A/c", group: "Indirect Expenses", amount: 0 },
          { type: "By (Dr)", ledger: "Electricity Expense A/c", group: "Indirect Expenses", amount: 0 },
          { type: "By (Dr)", ledger: "Telephone Expense A/c", group: "Indirect Expenses", amount: 0 },
          { type: "To (Cr)", ledger: "Outstanding Expenses A/c", group: "Current Liabilities", amount: 0 }
        ],
        note: "Compound Entry: Multiple Expense Dr entries to single Liability Cr entry"
      }
    ]
  },
  {
    category: "Special Adjustment Entries",
    items: [
      {
        title: "45. Transfer of Expense to Capital",
        entries: [
          { type: "By (Dr)", ledger: "Machinery A/c", group: "Fixed Assets", amount: 0 },
          { type: "To (Cr)", ledger: "Direct Cost A/c", group: "Direct Expenses", amount: 0 }
        ],
        note: "Expense को asset cost में capitalize करने के लिए।"
      },
      {
        title: "46. Transfer of Profit to Capital",
        entries: [
          { type: "By (Dr)", ledger: "Profit & Loss A/c", group: "Primary", amount: 0 },
          { type: "To (Cr)", ledger: "Capital A/c", group: "Capital Account", amount: 0 }
        ],
        note: ""
      },
      {
        title: "47. Transfer of Loss to Capital",
        entries: [
          { type: "By (Dr)", ledger: "Capital A/c", group: "Capital Account", amount: 0 },
          { type: "To (Cr)", ledger: "Profit & Loss A/c", group: "Primary", amount: 0 }
        ],
        note: ""
      },
      {
        title: "48. Customer Advance Adjustment",
        entries: [
          { type: "By (Dr)", ledger: "Customer Advance A/c", group: "Current Liabilities", amount: 0 },
          { type: "To (Cr)", ledger: "XYZ Customer A/c", group: "Sundry Debtors", amount: 0 }
        ],
        note: "Customer advance adjustment entry."
      }
    ]
  }
];

// ==================== VOUCHER ENTRY FORM ====================
function VoucherEntryForm({activeAlterItem,activeVoucher,ledgers,stockItems,units,vouchers,activeCompany,onAltC,onSave,onDelete,onChangeType,currentDate,onF2,onPrintPreview,onCancel,voucherTypes,altCReturnContext,onAltCReturnHandled,setAltCReturnContext,onNav,setSaveToast,onSaveMaster}:{
  activeAlterItem?:any; activeVoucher:VoucherTypeKey; ledgers:Ledger[]; stockItems:StockItem[]; units:UnitData[]; vouchers:Voucher[]; activeCompany:Company | null; currentDate:string; onF2:()=>void; onPrintPreview:(v:Voucher)=>void; onCancel:()=>void;
  onAltC:(ctx:AltCContext)=>void; onSave:(v:any)=>Promise<Voucher>; onDelete:(id:number)=>void; onChangeType:(t:VoucherTypeKey)=>void; voucherTypes:VoucherTypeData[];
  altCReturnContext?: any; onAltCReturnHandled:()=>void; setAltCReturnContext:(ctx:any)=>void; onNav:(s:any,item?:any,type?:string)=>void;
  setSaveToast: (msg: string | null) => void;
  onSaveMaster?: (type: string, data: any) => Promise<any>;
}) {
  const [isScanningInvoice, setIsScanningInvoice] = useState(false);

  const handleInvoiceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    try {
      setIsScanningInvoice(true);
      const scanMsg = files.length > 1 
        ? `🤖 AI Scanning ${files.length} Multi-page Invoice Images... Please wait`
        : `🤖 AI Scanning Purchase Invoice... Please wait`;
      setSaveToast(scanMsg);

      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      formData.append('file', files[0]); // Fallback single file key

      const res = await fetch('/api/parse-invoice', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      setSaveToast(null);
      setIsScanningInvoice(false);

      if (!res.ok || !data.success || !data.invoiceData) {
        alert("Failed to read invoice: " + (data.error || "Unknown Error"));
        return;
      }

      const inv = data.invoiceData;
      let createdCount = 0;

      // 1. PARTY LEDGER MATCHING & AUTO-CREATION
      let finalPartyName = partyName;
      if (inv.supplierName) {
        const rawSupplier = inv.supplierName.trim();
        const rawGstin = (inv.supplierGstin || '').trim();

        let matched = (rawGstin ? ledgers.find(l => l.gstin && l.gstin.trim().toUpperCase() === rawGstin.toUpperCase()) : null)
          || ledgers.find(l => l.name.toLowerCase() === rawSupplier.toLowerCase());

        if (matched) {
          finalPartyName = matched.name;
        } else if (onSaveMaster) {
          try {
            const newLedgerData = {
              name: rawSupplier,
              groupName: 'Sundry Creditors',
              gstin: rawGstin,
              address: inv.supplierAddress || '',
              mailingName: rawSupplier
            };
            const createdLedger = await onSaveMaster('ledger', newLedgerData);
            if (createdLedger && createdLedger.name) {
              finalPartyName = createdLedger.name;
              createdCount++;
            }
          } catch (err) {
            console.error("Failed to auto-create supplier ledger:", err);
            finalPartyName = rawSupplier;
          }
        } else {
          finalPartyName = rawSupplier;
        }
      }

      if (finalPartyName) {
        setPartyName(finalPartyName);
      }
      if (inv.invoiceNo) {
        setSupplierInvNo(inv.invoiceNo);
        setRefNo(inv.invoiceNo);
      }
      if (inv.invoiceDate) {
        setSupplierInvDate(inv.invoiceDate);
      }

      // 2. STOCK ITEMS MATCHING & AUTO-CREATION
      const newRows: VoucherRow[] = [];
      if (Array.isArray(inv.items) && inv.items.length > 0) {
        for (const item of inv.items) {
          let rawItemName = (item.itemName || 'Stock Item').trim();
          // Clean out unwanted sub-text like "IN Central GST", "IN State GST", or tax remarks from itemName
          rawItemName = rawItemName
            .replace(/\bIN\s+(Central|State)\s+GST\b.*/gi, '')
            .replace(/\b(Central|State)\s+GST\b.*/gi, '')
            .replace(/\s+/g, ' ')
            .trim() || 'Stock Item';

          const rawHsn = (item.hsnCode || '').trim();
          const itemGst = Number(item.gstRate) || 18;
          const itemQty = Number(item.qty) || 1;
          const itemRate = Number(item.rate) || 0;
          const parsedUnit = (item.unit || '').trim();
          const itemUnit = (parsedUnit && parsedUnit !== '—' && parsedUnit !== '-') ? parsedUnit : 'Nos';

          // Item-level Discount Calculation
          const gross = Math.round(itemQty * itemRate * 100) / 100;
          let discP = Number(item.discountPerc) || 0;
          if (discP === 0 && item.discountAmt && gross > 0) {
            discP = Math.round((Number(item.discountAmt) / gross) * 10000) / 100;
          }
          const discAmt = Math.round(gross * (discP / 100) * 100) / 100;
          const itemAmount = Number(item.amount) || Math.round((gross - discAmt) * 100) / 100;

          // Match existing stock item strictly by exact name
          let matchedStockItem = stockItems.find(s => s.name.toLowerCase().trim() === rawItemName.toLowerCase().trim());

          let itemId = matchedStockItem ? matchedStockItem.id : 0;
          let itemName = matchedStockItem ? matchedStockItem.name : rawItemName;

          if (!matchedStockItem && rawItemName && onSaveMaster) {
            try {
              const newItemData = {
                name: rawItemName,
                hsnCode: rawHsn,
                gstRate: itemGst,
                unit: itemUnit,
                under: 'Primary'
              };
              const createdItem = await onSaveMaster('stockItem', newItemData);
              if (createdItem) {
                itemId = createdItem.id;
                itemName = createdItem.name;
                createdCount++;
              }
            } catch (err) {
              console.error("Failed to auto-create stock item:", err);
            }
          }

          newRows.push({
            itemId: itemId || 0,
            itemName: itemName,
            qty: itemQty,
            rate: itemRate,
            rateInclTax: Math.round(itemRate * (1 + itemGst / 100) * 100) / 100,
            amountInclTax: Math.round(itemAmount * (1 + itemGst / 100) * 100) / 100,
            unit: itemUnit,
            amount: itemAmount,
            discountPerc: discP,
            discountAmt: discAmt,
            taxableAmount: itemAmount,
            gstRate: itemGst,
            hsnCode: rawHsn
          });
        }
      }

      if (newRows.length > 0) {
        setRows(newRows);
      }

      // 3. ADDITIONAL LEDGERS & EXPENSES (SPL.DISCOUNT, Discount Given, Freight, Round Off, etc.)
      const parsedAddl: Array<{ ledgerName: string; amount: number; type?: string }> = Array.isArray(inv.additionalLedgers) ? [...inv.additionalLedgers] : [];
      
      // Auto-add Round Off if present & not already in list
      if (inv.roundOff && !parsedAddl.some(a => a.ledgerName && a.ledgerName.toLowerCase().includes('round'))) {
        parsedAddl.push({
          ledgerName: 'Round Off',
          amount: Math.abs(Number(inv.roundOff)),
          type: Number(inv.roundOff) < 0 ? 'Discount' : 'Expense'
        });
      }

      const newAddlLedgers: AccountEntry[] = [];
      let addlInfoSummary: string[] = [];

      for (const addl of parsedAddl) {
        const rawName = (addl.ledgerName || '').trim();
        const rawAmt = Math.abs(Number(addl.amount) || 0);
        if (!rawName || rawAmt === 0) continue;

        // Is it a discount/less item or expense?
        const isDiscount = (addl.type || '').toLowerCase().includes('disc') 
          || rawName.toLowerCase().includes('disc') 
          || rawName.toLowerCase().includes('less');

        // Match existing ledger strictly by exact name
        let matchedAddl = ledgers.find(l => l.name.toLowerCase().trim() === rawName.toLowerCase().trim());

        let addlId = matchedAddl ? matchedAddl.id : 0;
        let addlName = matchedAddl ? matchedAddl.name : rawName;

        if (!matchedAddl && rawName && onSaveMaster) {
          try {
            const groupName = isDiscount ? 'Indirect Incomes' : (rawName.toLowerCase().includes('round') ? 'Indirect Expenses' : 'Direct Expenses');
            const newAddlData = {
              name: rawName,
              groupName: groupName
            };
            const createdAddl = await onSaveMaster('ledger', newAddlData);
            if (createdAddl && createdAddl.name) {
              addlId = createdAddl.id;
              addlName = createdAddl.name;
              createdCount++;
            }
          } catch (err) {
            console.error("Failed to auto-create additional ledger:", err);
          }
        }

        // In Purchase Voucher: partySide is 'Cr', otherSide is 'Dr'.
        // Expense = 'Dr' (adds to purchase bill), Discount = 'Cr' (subtracts from purchase bill)
        let entryType: 'Dr' | 'Cr' = isDiscount ? 'Cr' : 'Dr';
        if (rawName.toLowerCase().includes('round')) {
          entryType = Number(inv.roundOff) < 0 ? 'Cr' : 'Dr';
        }

        newAddlLedgers.push({
          ledgerId: addlId || 0,
          ledgerName: addlName,
          amount: rawAmt,
          entryType: entryType
        });

        addlInfoSummary.push(`${addlName}: ₹${rawAmt.toFixed(2)} (${entryType})`);
      }

      if (newAddlLedgers.length > 0) {
        setAdditionalLedgers(newAddlLedgers);
      }

      const summaryText = [
        `✅ Invoice scanned & pre-filled successfully!`,
        `• Supplier: ${finalPartyName}`,
        `• Bill No: ${inv.invoiceNo || 'N/A'}`,
        `• Items Parsed: ${newRows.length}`,
        newAddlLedgers.length > 0 ? `• Additional Charges/Discounts: ${addlInfoSummary.join(', ')}` : '',
        `• Masters Auto-Created: ${createdCount}`
      ].filter(Boolean).join('\n');

      alert(summaryText);

    } catch (err: any) {
      console.error("Scanning Error:", err);
      setSaveToast(null);
      setIsScanningInvoice(false);
      alert("Error scanning invoice: " + (err.message || "Failed to scan"));
    } finally {
      setIsScanningInvoice(false);
      setSaveToast(null);
      if (e.target) e.target.value = '';
    }
  };
  const isInventory = ['Sales','Purchase','Credit Note','Debit Note','Sales Quotation'].includes(activeVoucher);
  // Party side: Sales, Payment, Debit Note, and Sales Quotation debit the party.
  // Purchase, Receipt, and Credit Note (Sales Return) credit the party.
  const partySide: 'Dr' | 'Cr' = ['Sales', 'Payment', 'Debit Note', 'Sales Quotation'].includes(activeVoucher) ? 'Dr' : 'Cr';
  const otherSide: 'Dr' | 'Cr' = partySide === 'Dr' ? 'Cr' : 'Dr';
  const isPurchaseSide = activeVoucher === 'Purchase' || activeVoucher === 'Debit Note'; // Used for some legacy checks

  const isSalesAcName = (s?: string) => !s || ['sales a/c', 'sales a/c.', 'sales ac', 'sales'].includes(s.trim().toLowerCase());

  const [partyName, setPartyName] = useState(() => {
    if (!activeAlterItem) return '';
    if (activeAlterItem.partyName && !isSalesAcName(activeAlterItem.partyName)) return activeAlterItem.partyName;
    if (activeAlterItem.partyDetails?.buyerName && !isSalesAcName(activeAlterItem.partyDetails.buyerName)) return activeAlterItem.partyDetails.buyerName;
    const partyEnt = activeAlterItem.entries?.find((e: any) => {
      const name = e.ledger?.name || e.ledgerName || '';
      return !isSalesAcName(name) && name !== 'Purchase A/c';
    });
    return partyEnt?.ledger?.name || partyEnt?.ledgerName || activeAlterItem.partyName || '';
  });
  const [partyBalance, setPartyBalance] = useState<number|null>(null);
  const [refNo, setRefNo] = useState(activeAlterItem?.refNo || '');
  const [supplierInvNo, setSupplierInvNo] = useState(activeAlterItem?.partyDetails?.supplierInvNo || '');
  const [supplierInvDate, setSupplierInvDate] = useState(activeAlterItem?.partyDetails?.supplierInvDate || '');
  const [rows, setRows] = useState<VoucherRow[]>(
    activeAlterItem?.inventoryEntries?.length > 0 
    ? activeAlterItem.inventoryEntries.map((ie: any) => ({
        ...ie,
        itemId: ie.stockItemId || ie.itemId,
        itemName: ie.itemName || ie.stockItem?.name || '',
        unit: ie.unit || ie.stockItem?.unit?.symbol || 'Nos'
      }))
    : [{itemId:0,itemName:'',qty:0,rate:0,rateInclTax:0,amountInclTax:0,unit:'Nos',amount:0,discountPerc:0,discountAmt:0,taxableAmount:0,gstRate:18,hsnCode:''}]
  );
  const [additionalLedgers, setAdditionalLedgers] = useState<AccountEntry[]>(() => {
    if (activeAlterItem?.entries?.length > 0) {
      const salesPurchaseLedger = isPurchaseSide ? 'Purchase A/c' : 'Sales A/c';
      return activeAlterItem.entries
        .filter((e: any) => {
          const lname = e.ledger?.name || e.ledgerName;
          return lname !== activeAlterItem.partyName && lname !== salesPurchaseLedger && !lname.includes('GST Payable') && lname !== 'Round Off';
        })
        .map((e: any) => ({
          ledgerId: e.ledgerId,
          ledgerName: e.ledger?.name || e.ledgerName,
          amount: e.amount,
          entryType: e.entryType
        }));
    }
    return [];
  });
  const [accEntries, setAccEntries] = useState<AccountEntry[]>(
    activeAlterItem && !isInventory && activeAlterItem.entries?.length > 0
    ? activeAlterItem.entries.map((e: any) => ({
        ledgerId: e.ledgerId,
        ledgerName: e.ledger?.name || e.ledgerName,
        amount: e.amount,
        entryType: e.entryType
      }))
    : [{ledgerId:0,ledgerName:'',amount:0,entryType:'Dr'},{ledgerId:0,ledgerName:'',amount:0,entryType:'Cr'}]
  );
  const [narration, setNarration] = useState(activeAlterItem?.narration || '');
  const [focus, setFocus] = useState<{field:string;rowIdx?:number}|null>(null);
  const [filter, setFilter] = useState('');
  const [listSel, setListSel] = useState(0);

  // Reset list selection when filter changes (typing)
  useEffect(() => {
    if (filter) setListSel(0);
  }, [filter]);
  const ref = useRef<HTMLInputElement>(null);
  const manualVoucherRef = useRef<HTMLInputElement>(null);

  // Party Details & Dispatch Details modals
  const [showPartyDetails, setShowPartyDetails] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmSel, setDeleteConfirmSel] = useState<'yes'|'no'>('yes');
  const [partyDetails, setPartyDetails] = useState<PartyDetails|null>(null);
  const [dispatchDetails, setDispatchDetails] = useState<DispatchDetails|null>(null);
  const [showJournalHelp, setShowJournalHelp] = useState(false);
  const [journalExampleSearch, setJournalExampleSearch] = useState('');
  const partyDetailFirstRef = useRef<HTMLInputElement>(null);
  const dispatchFirstRef = useRef<HTMLInputElement>(null);
  
  const vt = voucherTypes.find(v => v.name === activeVoucher) || voucherTypes.find(v => v.type === activeVoucher);
  const numberingMethod = vt?.numberingMethod || 'Automatic';
  const [manualVoucherNo, setManualVoucherNo] = useState('');
  // Per-session numbering mode: defaults from VoucherType setting, user can override inline
  const [localNumberingMode, setLocalNumberingMode] = useState<'Auto'|'Manual'>(
    numberingMethod === 'Manual' ? 'Manual' : 'Auto'
  );

  const formatVoucherNo = useCallback((num: number, vtData?: VoucherTypeData) => {
    if (!vtData) return String(num);
    let s = String(num);
    if (vtData.prefillWithZero && vtData.width && vtData.width > 0) {
      s = s.padStart(vtData.width, '0');
    }
    return (vtData.prefix || '') + s + (vtData.suffix || '');
  }, []);

  const getNextAutoNumber = useCallback((): number => {
    const start = vt?.startNumber || 1;
    const usedNumbers = new Set(
      vouchers
        .filter(v => v.type === activeVoucher)
        .map(v => {
          const prefix = vt?.prefix || '';
          const suffix = vt?.suffix || '';
          let raw = v.voucherNo || String(v.number || '');
          if (prefix && raw.startsWith(prefix)) raw = raw.slice(prefix.length);
          if (suffix && raw.endsWith(suffix)) raw = raw.slice(0, raw.length - suffix.length);
          return parseInt(raw) || v.number || 0;
        })
    );
    let next = start;
    while (usedNumbers.has(next)) next++;
    return next;
  }, [vouchers, activeVoucher, vt]);

  // Print prompt state
  const [showPrintPrompt, setShowPrintPrompt] = useState<{voucher: Voucher, msg: string}|null>(null);
  const [printPromptSel, setPrintPromptSel] = useState<'yes'|'no'>('yes');

  const listRef = useRef<HTMLDivElement>(null);

  // Sync listSel with current field value
  useEffect(() => {
    if (!focus) return;
    const list = getList();
    // For item/addl-ledger fields: default to End of List (99999)
    if (focus.field === 'item' || focus.field === 'addl-ledger') {
      let currentVal = '';
      if (focus.field === 'item') currentVal = focus.rowIdx !== undefined ? (rows[focus.rowIdx]?.itemName || '') : '';
      else if (focus.field === 'addl-ledger') currentVal = focus.rowIdx !== undefined ? (additionalLedgers[focus.rowIdx]?.ledgerName || '') : '';
      
      if (currentVal) {
        const idx = list.findIndex(it => it && 'name' in (it as any) && (it as any).name.toLowerCase() === currentVal.toLowerCase());
        if (idx >= 0) {
          // items render at itemSelIndex = i+1 when no filter (End of List at top occupies slot 0)
          const offset = (!filter || filter.trim() === '') ? 1 : 0;
          setListSel(idx + offset);
        } else if (filter) {
          // While typing (filtering), highlight the first matching item instead of End of List
          setListSel(0);
        } else {
          setListSel(99999);
        }
      } else {
        setListSel(99999);
      }
      return;
    }
    // For party/accledger fields: default to 0
    let currentVal = '';
    if (focus.field === 'party') currentVal = partyName;
    else if (focus.field === 'accledger' && focus.rowIdx !== undefined) currentVal = accEntries[focus.rowIdx]?.ledgerName || '';
    
    if (currentVal) {
      const idx = list.findIndex(it => {
        const name = it && 'name' in (it as any) ? (it as any).name : '';
        return name.toLowerCase() === currentVal.toLowerCase();
      });
      if (idx >= 0) {
        // accledger has "End of List" at top when filter is empty → items start at listSel=1
        const offset = (focus.field === 'accledger' && (!filter || filter.trim() === '')) ? 1 : 0;
        setListSel(idx + offset);
      } else setListSel(0);
    } else {
      setListSel(0);
    }
  }, [focus, filter]);


  // Scroll selected item into view in list
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[listSel] as HTMLElement;
      if (selected) selected.scrollIntoView({ block: 'nearest' });
    }
  }, [listSel, focus]);

  // Focus first field when party detail modal opens
  useEffect(()=>{
    if(showPartyDetails) setTimeout(()=>partyDetailFirstRef.current?.focus(),80);
  },[showPartyDetails]);

  // Focus first field when dispatch modal opens
  useEffect(()=>{
    if(showDispatch) setTimeout(()=>dispatchFirstRef.current?.focus(),80);
  },[showDispatch]);

  // Keyboard handler for modal forms (Enter=next, Backspace on empty=prev, Esc=close)
  const modalKeyDown = useCallback((e: React.KeyboardEvent, containerClass: string, onEsc: ()=>void) => {
    if(e.key === 'Escape'){
      e.preventDefault(); e.stopPropagation();
      onEsc();
      return;
    }
    if(e.ctrlKey && e.key.toLowerCase() === 'a') {
      e.preventDefault(); e.stopPropagation();
      const acceptBtn = document.querySelector(`.${containerClass}-accept-btn`) as HTMLButtonElement | null;
      if (acceptBtn) acceptBtn.click();
      return;
    }
    if(e.key === 'Enter' || (e.key === 'Backspace' && !(e.target as HTMLInputElement).value)){
      if (e.key === 'Enter' && (e.target as HTMLElement).tagName.toUpperCase() === 'BUTTON') return;
      e.preventDefault(); e.stopPropagation();
      const inputs = Array.from(document.querySelectorAll(`.${containerClass} input:not([disabled]),.${containerClass} textarea:not([disabled]), .${containerClass}-accept-btn`)) as HTMLElement[];
      const idx = inputs.indexOf(e.target as HTMLElement);
      if(e.key === 'Enter'){
        if(idx >= 0 && idx < inputs.length - 1) inputs[idx+1].focus();
        else if (idx === inputs.length - 1) {
          const acceptBtn = document.querySelector(`.${containerClass}-accept-btn`) as HTMLButtonElement | null;
          if (acceptBtn) acceptBtn.click();
        }
      } else {
        if(idx > 0) inputs[idx-1].focus();
      }
    }
  },[]);

  // Print prompt keydown
  useEffect(() => {
    if (!showPrintPrompt) return;
    const onPrintKey = (e: KeyboardEvent) => {
      if(e.key==='ArrowLeft' || e.key==='ArrowRight'){ e.preventDefault(); e.stopPropagation(); setPrintPromptSel(p=>p==='yes'?'no':'yes'); }
      else if(e.key==='Enter'){
        e.preventDefault(); e.stopPropagation();
        if(printPromptSel==='yes') { onPrintPreview(showPrintPrompt.voucher); clearVoucherForm(); }
        else { clearVoucherForm(); }
      }
      else if(e.key.toLowerCase()==='y'){ e.preventDefault(); e.stopPropagation(); onPrintPreview(showPrintPrompt.voucher); clearVoucherForm(); }
      else if(e.key.toLowerCase()==='n' || e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); clearVoucherForm(); }
    };
    window.addEventListener('keydown', onPrintKey, true);
    return () => window.removeEventListener('keydown', onPrintKey, true);
  }, [showPrintPrompt, printPromptSel]);

  // Delete prompt keydown
  useEffect(() => {
    if (!showDeleteConfirm) return;
    const onDelConfirmKey = (e: KeyboardEvent) => {
      if(e.key==='ArrowLeft' || e.key==='ArrowRight'){ e.preventDefault(); e.stopPropagation(); setDeleteConfirmSel(p=>p==='yes'?'no':'yes'); }
      else if(e.key==='Enter'){
        e.preventDefault(); e.stopPropagation();
        if(deleteConfirmSel==='yes') { onDelete(activeAlterItem.id); setShowDeleteConfirm(false); }
        else { setShowDeleteConfirm(false); }
      }
      else if(e.key.toLowerCase()==='y'){ e.preventDefault(); e.stopPropagation(); onDelete(activeAlterItem.id); setShowDeleteConfirm(false); }
      else if(e.key.toLowerCase()==='n' || e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); setShowDeleteConfirm(false); }
    };
    window.addEventListener('keydown', onDelConfirmKey, true);
    return () => window.removeEventListener('keydown', onDelConfirmKey, true);
  }, [showDeleteConfirm, deleteConfirmSel, activeAlterItem, onDelete]);

  useEffect(() => {
    const onDelKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'd' && activeAlterItem && !showPrintPrompt && !showDeleteConfirm) {
        e.preventDefault(); e.stopPropagation();
        setShowDeleteConfirm(true);
        setDeleteConfirmSel('yes');
      }
    };
    window.addEventListener('keydown', onDelKey);
    return () => window.removeEventListener('keydown', onDelKey);
  }, [activeAlterItem, showPrintPrompt, showDeleteConfirm]);

  const lastAlterId = useRef<number | string | null>(null);

  const focusRefAfterModal = () => {
    setTimeout(()=>{ (document.getElementById('v-ref') as HTMLInputElement)?.focus(); }, 80);
  };

  useEffect(()=>{
     ref.current?.focus();
     // Unique key for initialization: Type + ID (or 'new' for creation)
     const currentKey = activeAlterItem ? `${activeVoucher}-${activeAlterItem.id}` : `new-${activeVoucher}`;
     if(currentKey === lastAlterId.current) return;
     lastAlterId.current = currentKey;

     if(activeAlterItem) {
       let pName = activeAlterItem.partyName;
       if (isSalesAcName(pName)) {
         if (activeAlterItem.partyDetails?.buyerName && !isSalesAcName(activeAlterItem.partyDetails.buyerName)) {
           pName = activeAlterItem.partyDetails.buyerName;
         } else {
           const partyEnt = activeAlterItem.entries?.find((e: any) => {
             const name = e.ledger?.name || e.ledgerName || '';
             return !isSalesAcName(name) && name !== 'Purchase A/c';
           });
           if (partyEnt) pName = partyEnt.ledger?.name || partyEnt.ledgerName || pName;
         }
       }
       setPartyName(pName);
       setRefNo(activeAlterItem.refNo||'');
       
       if (activeAlterItem.inventoryEntries && activeAlterItem.inventoryEntries.length > 0) {
         const mappedRows = activeAlterItem.inventoryEntries.map((r:any) => {
           const itemId = r.stockItemId || r.itemId || 0;
           const it = stockItems.find(s => s.id === itemId);
           return {
             ...r,
             itemId,
             itemName: r.itemName || r.stockItem?.name || it?.name || '',
             discountPerc: r.discountPerc || 0,
             discountAmt: r.discountAmt || 0,
             taxableAmount: round2(r.taxableAmount || r.amount),
             rateInclTax: round2(r.rateInclTax || (r.rate * (1 + (r.gstRate || 18) / 100))),
             amountInclTax: round2(r.amountInclTax || (r.amount * (1 + (r.gstRate || 18) / 100)))
           };
         });
         setRows(mappedRows);
       } else {
         setRows([{itemId:0,itemName:'',qty:0,rate:0,rateInclTax:0,amountInclTax:0,unit:'Nos',amount:0,discountPerc:0,discountAmt:0,taxableAmount:0,gstRate:18,hsnCode:''}]);
       }

       setAccEntries(activeAlterItem.entries?.length>0 ? activeAlterItem.entries : [{ledgerId:0,ledgerName:'',amount:0,entryType:'Dr'},{ledgerId:0,ledgerName:'',amount:0,entryType:'Cr'}]);
       
       const addl = activeAlterItem.entries?.filter((e:any) => {
          const lname = e.ledgerName || e.ledger?.name || '';
          return lname !== pName && 
                 lname !== 'Sales A/c' && 
                 lname !== 'Purchase A/c' &&
                 !lname.includes('GST Payable') &&
                 e.amount > 0;
        }).map((a:any) => ({ 
          ledgerId: a.ledgerId || a.ledger?.id || 0, 
          ledgerName: a.ledgerName || a.ledger?.name || '', 
          amount: Math.abs(a.amount), 
          entryType: a.entryType 
        })) || [];

        // Always end with a blank row for new entries
        setAdditionalLedgers([...addl, {ledgerId:0, ledgerName:'', amount:0, entryType: otherSide}]);
        
        setNarration(activeAlterItem.narration || '');
        setPartyDetails(activeAlterItem.partyDetails||null);
        setDispatchDetails(activeAlterItem.dispatchDetails||null);
        setSupplierInvNo(activeAlterItem.partyDetails?.supplierInvNo || '');
        setSupplierInvDate(activeAlterItem.partyDetails?.supplierInvDate || '');
        const l = ledgers.find(lx=>lx.id===activeAlterItem.partyId);
        if(l) setPartyBalance(getLedgerClosingBalance(l,vouchers));
      } else {
        setPartyName('');
        setRefNo('');
        setSupplierInvNo('');
        setSupplierInvDate('');
        setRows([{itemId:0,itemName:'',qty:0,rate:0,rateInclTax:0,amountInclTax:0,unit:'Nos',amount:0,discountPerc:0,discountAmt:0,taxableAmount:0,gstRate:18,hsnCode:''}]);
        // Journal: Initialize with Dr (By) + Cr (To) pair
        // Contra: Cr. Receipt: Cr. Others: Dr.
        if (activeVoucher === 'Journal') {
          setAccEntries([
            {ledgerId:0,ledgerName:'',amount:0,entryType:'Dr'},
            {ledgerId:0,ledgerName:'',amount:0,entryType:'Cr'}
          ]);
        } else {
          const defaultEntryType = (activeVoucher === 'Receipt' || activeVoucher === 'Contra') ? 'Cr' : 'Dr';
          setAccEntries([{ledgerId:0,ledgerName:'',amount:0,entryType:defaultEntryType}]);
        }
        setAdditionalLedgers([{ledgerId:0, ledgerName:'', amount:0, entryType: otherSide}]);
        setNarration('');
        setPartyBalance(null);
        setPartyDetails(null);
        setDispatchDetails(null);
      }
     // Reset localNumberingMode when switching voucher type
     setLocalNumberingMode(numberingMethod === 'Manual' ? 'Manual' : 'Auto');
     if (!activeAlterItem) {
        const nextAuto = getNextAutoNumber();
        setManualVoucherNo(formatVoucherNo(nextAuto, vt));
     }
  },[activeVoucher, activeAlterItem, numberingMethod, getNextAutoNumber, formatVoucherNo, vt]);

  // Handle Alt+C return context
  useEffect(() => {
    if (altCReturnContext && altCReturnContext.newItem) {
      const { field, rowIdx, newItem } = altCReturnContext;
      if (field === 'party') {
        setPartyName(newItem.name);
        const bal = getLedgerClosingBalance(newItem, vouchers);
        setPartyBalance(bal);
        setTimeout(() => document.getElementById('v-ref')?.focus(), 100);
      } else if (field === 'accledger' && rowIdx !== undefined) {
        const ne = [...accEntries];
        ne[rowIdx] = { ...ne[rowIdx], ledgerId: newItem.id, ledgerName: newItem.name };
        setAccEntries(ne);
        const type = ne[rowIdx].entryType;
        setTimeout(() => document.getElementById(`acc-amt-${rowIdx}-${type}`)?.focus(), 100);
      } else if (field === 'item' && rowIdx !== undefined) {
        const nr = [...rows];
        const gst = newItem.gstRate || 18;
        nr[rowIdx] = {
          ...nr[rowIdx],
          itemId: newItem.id,
          itemName: newItem.name,
          unit: typeof newItem.unit === 'string' ? newItem.unit : (newItem.unit as any)?.symbol || (newItem.unit as any)?.name || 'Nos',
          gstRate: gst,
          hsnCode: newItem.hsnCode || '',
          rateInclTax: (nr[rowIdx].rate || 0) * (1 + gst / 100),
          amountInclTax: (nr[rowIdx].amount || 0) * (1 + gst / 100)
        };
        setRows(nr);
        setTimeout(() => document.getElementById(`item-qty-${rowIdx}`)?.focus(), 100);
      }
      onAltCReturnHandled(); // Tell App we've handled it
    }
  }, [altCReturnContext]);
  const itemSubtotal = rows.reduce((s: number, r: any) => s + (r.itemName && r.amount ? r.amount : 0), 0);

  // ===== TALLY PRIME GST LOGIC: CGST+SGST (same state) vs IGST (different state) =====
  const companyState = (activeCompany?.state || '').toLowerCase().trim();
  const partyLedger = ledgers.find(l => l.name === partyName);
  const partyState = (partyLedger?.state || '').toLowerCase().trim();
  const isInterState = partyState !== '' && companyState !== '' && partyState !== companyState;

  // 1. Calculate Additional Expenses/Discounts that affect Taxable Subtotal (excluding Round Off)
  const addlTaxableAdjustment = useMemo(() => {
    return additionalLedgers
      .filter(al => al.ledgerName && al.ledgerName !== 'Round Off' && (al.amount || 0) > 0)
      .reduce((s, l) => {
        // If entryType is 'otherSide' (Dr in Purchase/Sales), it ADDS to taxable cost (+).
        // If entryType is 'partySide' (Cr in Purchase/Sales), it SUBTRACTS as discount (-).
        const factor = l.entryType === otherSide ? 1 : -1;
        return s + (l.amount * factor);
      }, 0);
  }, [additionalLedgers, otherSide]);

  // Net Taxable Subtotal (Item Subtotal + Additional Expenses - Additional Discounts)
  const netTaxableSubtotal = Math.max(0, itemSubtotal + addlTaxableAdjustment);

  // Item-wise GST breakdown (grouped by gstRate, calculated on Net Taxable Subtotal)
  const gstBreakdown = useMemo(() => {
    const map = new Map<number, { taxableAmt: number; gstRate: number }>();
    const activeRows = rows.filter(r => r.itemName && r.amount > 0);
    const totalItemSub = activeRows.reduce((sum, r) => sum + r.amount, 0);

    activeRows.forEach(r => {
      const existing = map.get(r.gstRate) || { taxableAmt: 0, gstRate: r.gstRate };
      existing.taxableAmt += r.amount;
      map.set(r.gstRate, existing);
    });

    return Array.from(map.values()).map(g => {
      const ratio = totalItemSub > 0 ? (g.taxableAmt / totalItemSub) : 0;
      const netTaxableForGroup = Math.max(0, g.taxableAmt + (addlTaxableAdjustment * ratio));
      return {
        ...g,
        netTaxableAmt: netTaxableForGroup,
        cgst: isInterState ? 0 : round2(netTaxableForGroup * g.gstRate / 200),
        sgst: isInterState ? 0 : round2(netTaxableForGroup * g.gstRate / 200),
        igst: isInterState ? round2(netTaxableForGroup * g.gstRate / 100) : 0,
      };
    });
  }, [rows, isInterState, addlTaxableAdjustment]);

  const totalCgst = gstBreakdown.reduce((s: number, g: any) => s + g.cgst, 0);
  const totalSgst = gstBreakdown.reduce((s: number, g: any) => s + g.sgst, 0);
  const totalIgst = gstBreakdown.reduce((s: number, g: any) => s + g.igst, 0);
  const totalTax = totalCgst + totalSgst + totalIgst;

  // Dynamic Round Off sync: If "Round Off" ledger is in additionalLedgers, keep it updated
  useEffect(() => {
    const roundOffIdx = additionalLedgers.findIndex(al => al.ledgerName === 'Round Off');
    if (roundOffIdx >= 0) {
      // Calculate total BEFORE round off
      // Calculate total BEFORE round off using the new logical rule:
      // In Tally, additional ledgers on the 'otherSide' (income/recovery in Sales, cost in Purchase) ADD to the total.
      // Ledgers on the 'partySide' (expense/discount in Sales, income/discount in Purchase) SUBTRACT from the total.
      const otherAddlTotal = additionalLedgers.filter((_, i) => i !== roundOffIdx).reduce((s, l) => {
        const factor = l.entryType === otherSide ? 1 : -1;
        return s + (l.amount * factor);
      }, 0);
      
      const currentRawTotal = round2(itemSubtotal + totalTax + otherAddlTotal);
      const currentRounded = Math.round(currentRawTotal);
      const neededRoundOff = round2(currentRounded - currentRawTotal);
      
      const currentAmt = additionalLedgers[roundOffIdx].amount;
      const targetAmt = Math.abs(neededRoundOff);
      // Logic Fix: In Sales (partySide=Dr, otherSide=Cr), to ADD (+ve neededRoundOff), we need targetType = otherSide (Cr).
      const targetType = neededRoundOff >= 0 ? otherSide : partySide;
      
      // Update only if different and NOT currently focused
      if ((Math.abs(currentAmt - targetAmt) > 0.001 || additionalLedgers[roundOffIdx].entryType !== targetType) && focus?.field !== 'addl-ledger') {
        const ne = [...additionalLedgers];
        ne[roundOffIdx] = { ...ne[roundOffIdx], amount: targetAmt, entryType: targetType };
        setAdditionalLedgers(ne);
      }
    }
  }, [itemSubtotal, totalTax, additionalLedgers, focus, ledgers]);

  const isManualMode = !activeAlterItem && localNumberingMode === 'Manual';
  const vNum = activeAlterItem ? activeAlterItem.number : (isManualMode ? (parseInt(manualVoucherNo) || 1) : getNextAutoNumber());
  const formattedNo = activeAlterItem ? activeAlterItem.voucherNo : (isManualMode ? manualVoucherNo : formatVoucherNo(vNum, vt));

  const getList=()=>{
    if(focus?.field==='party'||focus?.field==='accledger'||focus?.field==='addl-ledger') {
      const l=ledgers.filter(l=>!filter||l.name.toLowerCase().includes(filter.toLowerCase()));
      return l;
    }
    if(focus?.field==='item') return stockItems.filter(it=>it && it.name && (!filter || it.name.toLowerCase().includes(filter.toLowerCase())));
    return [];
  };
  const currentList = getList();

  // Auto-sync partyBalance whenever partyName, ledgers, or vouchers change
  useEffect(() => {
    if (partyName) {
      const l = ledgers.find(lx => lx.name.toLowerCase() === partyName.toLowerCase());
      if (l) {
        const bal = getLedgerClosingBalance(l, vouchers);
        setPartyBalance(bal);
      } else {
        setPartyBalance(null);
      }
    } else {
      setPartyBalance(null);
    }
  }, [partyName, ledgers, vouchers]);

  const pickLedger=(l:Ledger)=>{
    if(focus?.field==='party'){
      setPartyName(l.name);
      const bal=getLedgerClosingBalance(l,vouchers);
      setPartyBalance(bal);
      setFocus(null);
      if (isInventory) {
        const pd:PartyDetails={
          buyerName:l.name, buyerMailingName:l.name, buyerAddress:l.address||'',
          buyerState:l.state||'', buyerCountry:l.country||'India', buyerGstin:l.gstin||'', buyerPlace:l.state||'',
          shipName:l.name, shipMailingName:l.name, shipAddress:l.address||'',
          shipState:l.state||'', shipCountry:l.country||'India', shipGstin:l.gstin||'', shipPlace:l.state||'',
          buyerOrderNo:'', buyerOrderDate:'', termsOfDelivery:'',
        };
        setPartyDetails(pd);
        setShowPartyDetails(true);
      } else {
        setTimeout(() => document.getElementById('acc-ledger-0')?.focus(), 80);
      }
    } else if(focus?.field==='accledger'&&focus.rowIdx!==undefined){
      const idx = focus.rowIdx;
      // Contra: Particulars (By) is always Credit. Receipt: Cr. Others: Dr.
      let entryType: 'Dr' | 'Cr';
      if (activeVoucher === 'Contra') {
        entryType = 'Cr';
      } else {
        entryType = accEntries[idx]?.entryType || (activeVoucher === 'Receipt' ? 'Cr' : 'Dr');
      }
      const ne=[...accEntries];ne[idx]={...ne[idx],ledgerId:l.id,ledgerName:l.name,entryType};
      setAccEntries(ne);
      setFocus(null); setFilter(''); setListSel(0);
      setTimeout(() => {
        const amtEl = document.getElementById(`acc-amt-${idx}-${entryType}`) || document.getElementById(`acc-amt-${idx}-Dr`) || document.getElementById(`acc-amt-${idx}-Cr`);
        amtEl?.focus();
      }, 80);
    } else if(focus?.field==='addl-ledger' && focus.rowIdx!==undefined){
      const idx = focus.rowIdx;
      const ne = [...additionalLedgers];
      const isPurchaseSide = activeVoucher === 'Purchase' || activeVoucher === 'Debit Note';
      
      // Smart Sign Logic based on Ledger and Voucher Type
      const isDiscount = l.name.toLowerCase().includes('discount');
      const isExp = l.groupName?.toLowerCase().includes('expense') || l.name.toLowerCase().includes('transport') || l.name.toLowerCase().includes('freight');
      
      // In Sales (otherSide=Cr): Expenses (Dr) subtract, Income (Cr) adds.
      // In Purchase (otherSide=Dr): Expenses (Dr) adds, Income (Cr) subtracts.
      // Rule: Default to otherSide (Add) UNLESS it's a Discount Ledger.
      let eType: 'Dr' | 'Cr' = otherSide;
      if (isDiscount) {
        // Discount should always SUBTRACT. So use partySide.
        eType = partySide;
      } else if (isExp) {
        // Expenses in Sales should subtract (partySide), in Purchase should add (otherSide).
        eType = (activeVoucher === 'Sales' || activeVoucher === 'Debit Note') ? partySide : otherSide;
      }
      
      if (l.name === 'Round Off') eType = 'Dr'; // Will be adjusted by effect logic anyway

      ne[idx] = { ...ne[idx], ledgerId: l.id, ledgerName: l.name, entryType: eType };
      
      // If it's the last row and we just picked a ledger, add a new blank row for next selection
      if (idx === ne.length - 1) {
        // Default the new row to the 'otherSide' (adding side)
        ne.push({ ledgerId: 0, ledgerName: '', amount: 0, entryType: otherSide });
      }
      
      setAdditionalLedgers(ne);

      // Auto-calculate Round Off if selected
      if (l.name === 'Round Off') {
        // The useEffect will handle the amount. Just skip to the next row or narration.
        setTimeout(() => {
           if (idx < ne.length - 1) document.getElementById(`addl-ledger-${idx+1}`)?.focus();
           else document.getElementById('v-narration')?.focus();
        }, 150);
      } else {
        setTimeout(() => document.getElementById(`addl-amt-${idx}`)?.focus(), 80);
      }
    }
    if (focus?.field !== 'addl-ledger' && focus?.field !== 'accledger') {
      setFocus(null);
    }
    setFilter('');setListSel(0);
  };
  const pickItem=(it:StockItem)=>{
    if(!it) return;
    const idx = (focus?.field==='item' && focus.rowIdx!==undefined) ? focus.rowIdx : 0;
    if(focus?.field==='item'&&focus.rowIdx!==undefined){
      const nr=[...rows];
      const gst = it.gstRate || 18;
      nr[idx]={
        ...nr[idx],
        itemId:it.id || 0,
        itemName:it.name || '',
        unit: (typeof it.unit === 'string' ? it.unit : it.unit?.symbol || it.unit?.name) || 'Nos',
        discountPerc: round2(it.defaultDiscount || 0),
        gstRate: round2(gst),
        hsnCode:it.hsnCode || '',
        rateInclTax: round2((nr[idx].rate || 0) * (1 + gst / 100)),
        amountInclTax: round2((nr[idx].amount || 0) * (1 + gst / 100))
      };
      setRows(nr);
    }
    setFocus(null);setFilter('');setListSel(99999);
    setTimeout(() => {
      if (it.enableDescription) {
        if (it.descLine1) document.getElementById(`item-desc1-${idx}`)?.focus();
        else if (it.descLine2) document.getElementById(`item-desc2-${idx}`)?.focus();
        else if (it.descLine3) document.getElementById(`item-desc3-${idx}`)?.focus();
        else document.getElementById(`item-qty-${idx}`)?.focus();
      } else {
        document.getElementById(`item-qty-${idx}`)?.focus();
      }
    }, 100);
  };

  
  const addlLedgerTotal = round2(additionalLedgers.reduce((s: number, l: any) => {
    // Logic: If ledger is on 'otherSide', it adds. If on 'partySide', it subtracts.
    const factor = l.entryType === otherSide ? 1 : -1;
    return s + (l.amount * factor);
  }, 0));
  
  const grandTotal = round2(itemSubtotal + totalTax + addlLedgerTotal);

  const accDr = accEntries.filter(e=>e.entryType==='Dr').reduce((s: number, e: any) => s + e.amount, 0);
  const accCr = accEntries.filter(e=>e.entryType==='Cr').reduce((s: number, e: any) => s + e.amount, 0);
  const balanced = Math.abs(accDr-accCr)<0.01;

  const vColors:Record<string,string>={Sales:'#1c5282',Purchase:'#5a2d82',Receipt:'#1a7a4a',Payment:'#8B0000',Contra:'#4a4a00',Journal:'#00555a','Credit Note':'#7a3d00','Debit Note':'#00407a','Sales Quotation':'#2a6f97'};
  const vc=vColors[activeVoucher]||'#1c5282';

  // For item list / accledger list: End of List option support
  // End of List bottom: listSel >= currentList.length (for all three fields, since items now at 1..N with i+1 offset)
  const isEndOfItem = (focus?.field==='item' || focus?.field==='addl-ledger' || focus?.field==='accledger') && listSel > currentList.length;


  const goToAdditionalLedgers = () => {
    setAdditionalLedgers(prev => prev.length === 0 ? [{ledgerId:0, ledgerName:'', amount:0, entryType: otherSide}] : prev);
    setFocus({field:'addl-ledger', rowIdx: additionalLedgers.length === 0 ? 0 : additionalLedgers.length - 1});
    setFilter(''); setListSel(99999);
    setTimeout(() => document.getElementById(`addl-ledger-0`)?.focus(), 80);
  };

  const goToNarration = () => {
    setFocus(null); setFilter(''); setListSel(0);
    setTimeout(() => document.getElementById('v-narration')?.focus(), 80);
  };

  const listKeyDown=(e:React.KeyboardEvent)=>{
    if(e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();
      if(focus?.field==='item' || focus?.field==='addl-ledger' || focus?.field==='accledger'){
        // End of List (bottom) → wrap to End of List (top, listSel=0)
        if(isEndOfItem) setListSel(0);
        // Last real item (listSel=N with i+1 offset) → End of List bottom (listSel=N+1... but use N as sentinel)
        // For item/addl-ledger: items at listSel 1..N, so End of List bottom at listSel>=N+1; use currentList.length+1
        // For accledger: same i+1 offset, last item at listSel=N, End of List bottom at listSel=N+1
        else if(!filter && listSel >= currentList.length) setListSel(currentList.length + 1);
        else setListSel(p=>p+1);
      } else setListSel(p=>(p+1)%Math.max(1,currentList.length));
    }
    else if(e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();
      if(focus?.field==='item' || focus?.field==='addl-ledger' || focus?.field==='accledger'){
        // End of List (top, listSel=0) → End of List bottom
        if(listSel === 0) setListSel(currentList.length + 1);
        // End of List (bottom) → last real item (listSel=N=currentList.length with i+1 offset)
        else if(isEndOfItem) setListSel(currentList.length);
        else setListSel(p=>p-1);
      } else setListSel(p=>(p-1+Math.max(1,currentList.length))%Math.max(1,currentList.length));
    }
    else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();
      if(focus?.field==='item'){
        if(isEndOfItem || listSel === 0) goToAdditionalLedgers();
        else if(currentList.length > 0) {
          // items render at listSel 1..N (i+1 offset when no filter), so realIndex = listSel-1
          const realIndex = (!filter || filter.trim() === '') ? listSel - 1 : listSel;
          if (realIndex >= 0 && realIndex < currentList.length) pickItem(currentList[realIndex] as StockItem);
        }
      } else if(focus?.field==='addl-ledger'){
        if(isEndOfItem || listSel === 0 || currentList.length === 0) goToNarration();
        else if(currentList.length > 0) {
          const ridx = focus.rowIdx;
          const realIndex = (!filter || filter.trim() === '') ? listSel - 1 : listSel;
          if (realIndex >= 0 && realIndex < currentList.length) {
            pickLedger(currentList[realIndex] as Ledger);
          }
          setTimeout(() => {
            const el = document.getElementById(`addl-amt-${ridx}`);
            if (el) el.focus();
          }, 150);
        }
      } else if(focus?.field==='accledger'){
        if ((listSel === 0 && (!filter || filter.trim()==='')) || isEndOfItem || currentList.length === 0) {
          goToNarration();
        } else {
          const realIndex = (!filter || filter.trim()==='') ? listSel - 1 : listSel;
          if (realIndex >= 0 && realIndex < currentList.length) {
            pickLedger(currentList[realIndex] as Ledger);
          } else {
            goToNarration();
          }
        }
      } else if(currentList.length>0 && listSel < currentList.length) pickLedger(currentList[listSel] as Ledger);
    }
  };

  const getVoucherData = () => {
    const taxEntries: VoucherEntry[] = [];
    const findL = (name: string) => ledgers.find(lx => lx.name === name)?.id || 0;
    
    let entryId = rows.filter(r=>r.itemName).length + 2;
    if (isInterState) {
      if (totalIgst > 0) taxEntries.push({id: entryId++, ledgerId: findL('IGST Payable'), ledgerName:'IGST Payable', amount: totalIgst, entryType: otherSide});
    } else {
      if (totalCgst > 0) {
        taxEntries.push({id: entryId++, ledgerId: findL('CGST Payable'), ledgerName:'CGST Payable', amount: totalCgst, entryType: otherSide});
        taxEntries.push({id: entryId++, ledgerId: findL('SGST Payable'), ledgerName:'SGST Payable', amount: totalSgst, entryType: otherSide});
      }
    }

    const hasManualRoundOff = additionalLedgers.some(al => al.ledgerName === 'Round Off');
    const currentRawTotal = round2(itemSubtotal + totalTax + addlLedgerTotal);
    const currentRounded = Math.round(currentRawTotal);
    const roundOff = round2(currentRounded - currentRawTotal);
    
    const salesPurchaseLedger = isPurchaseSide ? 'Purchase A/c' : 'Sales A/c';

    const isSalesAcName = (s?: string) => !s || ['sales a/c', 'sales a/c.', 'sales ac', 'sales'].includes(s.trim().toLowerCase());
    let savePartyName = partyName;
    if (isSalesAcName(savePartyName) && partyDetails?.buyerName && !isSalesAcName(partyDetails.buyerName)) {
      savePartyName = partyDetails.buyerName;
    }

    return {
      ...(activeAlterItem ? {id: activeAlterItem.id} : {}),
      companyId: activeCompany?.id || 0,
      type:activeVoucher, date:currentDate, number:vNum, voucherNo:formattedNo, refNo:refNo||`${activeVoucher.slice(0,3).toUpperCase()}/${vNum}`,
      partyName: savePartyName, partyId: findL(savePartyName),
      partyDetails: (activeVoucher === 'Purchase' || activeVoucher === 'Debit Note')
        ? { ...(partyDetails as any || {}), supplierInvNo, supplierInvDate } as PartyDetails
        : partyDetails,
      dispatchDetails,
      inventoryEntries: isInventory ? rows.filter(r=>r.itemName).map((r,i)=>{const si=stockItems.find(it=>it.id===r.itemId);return {id:i+1,...r,showInclTax:si?.showInclTax??false,showAmtInclTax:si?.showAmtInclTax??false};}) : [],
      entries: isInventory ? [
        {id:1,ledgerId:findL(savePartyName),ledgerName:savePartyName,amount:grandTotal,entryType: partySide},
        ...rows.filter(r=>r.itemName).map((r,i)=>({id:i+2,ledgerId:findL(salesPurchaseLedger),ledgerName:salesPurchaseLedger,amount:r.amount,entryType: otherSide} as VoucherEntry)),
        ...taxEntries,
        ...additionalLedgers.filter(al=>al.ledgerName && al.amount > 0).map((al, i) => ({
          id: entryId++, 
          ledgerId: al.ledgerId || findL(al.ledgerName), 
          ledgerName: al.ledgerName, 
          amount: al.amount, 
          entryType: al.entryType
        } as VoucherEntry)),
        ...(Math.abs(roundOff) > 0.001 && !hasManualRoundOff ? [{id: entryId++, ledgerId: findL('Round Off'), ledgerName: 'Round Off', amount: Math.abs(roundOff), entryType: roundOff > 0 ? otherSide : partySide} as VoucherEntry] : []),
      ] : (() => {
        const validP = accEntries.filter(e=>e.ledgerName).map((e,i)=>({
          id:i+1, 
          ledgerId: e.ledgerId || findL(e.ledgerName), 
          ledgerName: e.ledgerName, 
          amount: e.amount, 
          entryType: e.entryType
        }));
        if (partyName && !validP.some(e=>e.ledgerName === partyName)) {
          const totDr = validP.filter(e=>e.entryType==='Dr').reduce((s,e)=>s+e.amount, 0);
          const totCr = validP.filter(e=>e.entryType==='Cr').reduce((s,e)=>s+e.amount, 0);
          if (activeVoucher === 'Payment') {
            validP.push({ id: validP.length + 1, ledgerId: findL(partyName), ledgerName: partyName, amount: totDr || totCr, entryType: 'Cr' });
          } else if (activeVoucher === 'Receipt') {
            validP.push({ id: validP.length + 1, ledgerId: findL(partyName), ledgerName: partyName, amount: totCr || totDr, entryType: 'Dr' });
          } else if (activeVoucher === 'Contra') {
            // Contra: Account (partyName) = ALWAYS Dr (To account - receives money)
            const contraAmt = totCr;
            if (contraAmt > 0) {
              validP.push({ id: validP.length + 1, ledgerId: findL(partyName), ledgerName: partyName, amount: contraAmt, entryType: 'Dr' });
            } else if (totDr > 0) {
              validP.push({ id: validP.length + 1, ledgerId: findL(partyName), ledgerName: partyName, amount: totDr, entryType: 'Dr' });
            }
            // Journal: NO auto-add of partyName. Journal uses only accEntries (By/To).
            // partyName is unused for Journal.
          }
        }
        return validP;
      })(),
      narration, total: isInventory ? grandTotal : accDr,
    };
  };

  const handleSave= async ()=>
{
    // 1. Party Name Validation (NOT required for Journal - it uses only Particulars)
    if (activeVoucher !== 'Journal') {
      if(!partyName || partyName.trim() === ""){
        alert('Party A/c Name is required for all vouchers.');
        return;
      }
    }

    const voucherData = getVoucherData();
    
    // 2. Inventory Validation (For Sales, Purchase, etc.)
    if (isInventory) {
      const validItems = voucherData.inventoryEntries.filter((i:any) => i.itemId && i.itemId !== 0);
      if (validItems.length === 0) {
        alert("Please select at least one valid Stock Item name.");
        return;
      }
      // Sync back only valid items to data
      voucherData.inventoryEntries = validItems;
    } else {
      if (activeVoucher === 'Journal') {
        // Journal: needs at least one Dr (By) and one Cr (To) entry
        const journalEntries = voucherData.entries.filter((e:any) => e.ledgerName && e.amount > 0);
        const totalDr = journalEntries.filter((e:any) => e.entryType === 'Dr').reduce((s:number,e:any)=>s+e.amount, 0);
        const totalCr = journalEntries.filter((e:any) => e.entryType === 'Cr').reduce((s:number,e:any)=>s+e.amount, 0);
        if (journalEntries.length < 2) {
          alert('Journal Voucher requires at least 2 entries (By/Dr and To/Cr).');
          return;
        }
        if (totalDr === 0 || totalCr === 0) {
          alert(`Journal Voucher must have both:\n• By (Debit) entries\n• To (Credit) entries`);
          return;
        }
        // 3a. Dr must equal Cr
        if (Math.abs(totalDr - totalCr) > 0.01) {
          alert(`Journal Voucher is not balanced!\nTotal Debit (By): ₹${totalDr.toFixed(2)}\nTotal Credit (To): ₹${totalCr.toFixed(2)}\nDifference: ₹${Math.abs(totalDr-totalCr).toFixed(2)}\n\nPlease balance Dr = Cr before saving.`);
          return;
        }
      } else {
        const otherLedgers = voucherData.entries.filter((e:any) => e.ledgerName && e.ledgerName !== partyName);
        if (otherLedgers.length === 0) {
          alert("Please select at least one Ledger entry (other than the Party).");
          return;
        }
      }
    } // end else (!isInventory)

    // 4. Manual Voucher Number Validation
    if (isManualMode && !manualVoucherNo.trim()) {
      alert('Please enter a Voucher Number in Manual mode.');
      return;
    }

    // 5. Duplicate Check
    const isDup = vouchers.some(v => v.type === activeVoucher && v.voucherNo === formattedNo && (!activeAlterItem || v.id !== activeAlterItem.id));
    if (isDup) {
      alert(`Duplicate Error: ${activeVoucher} No. ${formattedNo} already exists!`);
      return;
    }

    try {
      setSaveToast("Saving...");
      const savedV = await onSave(voucherData);
      setSaveToast(null);
      setPrintPromptSel('yes');
      setShowPrintPrompt({
        voucher: savedV,
        msg: `${activeVoucher} No. ${formattedNo} ${activeAlterItem ? 'Updated' : 'Saved'} successfully!`
      });
    } catch (err: any) {
      console.error("Save Error:", err);
      setSaveToast(null);
      alert("Failed to save: " + (err.message || "Network Error"));
    }
  };

  const clearVoucherForm = () => {
    if(activeAlterItem) { onCancel(); return; }
    setPartyName('');
    setRows([{itemId:0,itemName:'',qty:0,rate:0,rateInclTax:0,amountInclTax:0,unit:'Nos',amount:0,discountPerc:0,discountAmt:0,taxableAmount:0,gstRate:18,hsnCode:''}]);
    // Journal: Initialize with Dr (By) + Cr (To) pair
    if (activeVoucher === 'Journal') {
      setAccEntries([
        {ledgerId:0,ledgerName:'',amount:0,entryType:'Dr'},
        {ledgerId:0,ledgerName:'',amount:0,entryType:'Cr'}
      ]);
    } else {
      // Contra: Particulars (By/Credit side) = Cr. Receipt: Cr. Others: Dr.
      const defaultEntryType = (activeVoucher === 'Receipt' || activeVoucher === 'Contra') ? 'Cr' : 'Dr';
      setAccEntries([{ledgerId:0,ledgerName:'',amount:0,entryType:defaultEntryType}]);
    }
    setAdditionalLedgers([]);
    setNarration('');
    setPartyBalance(null);
    setPartyDetails(null);
    setDispatchDetails(null);
    setRefNo('');
    setSupplierInvNo('');
    setSupplierInvDate('');
    setShowPrintPrompt(null);
    // Manual mode mein cursor voucher number box pe, Auto mode mein party pe
    setTimeout(() => {
      if (isManualMode) {
        manualVoucherRef.current?.focus();
        manualVoucherRef.current?.select();
      } else {
        ref.current?.focus();
      }
    }, 80);
  };

  return (
    <div
      style={{display:'flex',flexDirection:'column',height:'100%',position:'relative'}}
      tabIndex={-1}
      onKeyDown={e => {
        if (e.ctrlKey && e.key.toLowerCase() === 'a') { e.preventDefault(); e.stopPropagation(); handleSave(); }
        else if (e.ctrlKey && e.key.toLowerCase() === 'p') {
          e.preventDefault(); e.stopPropagation();
          onPrintPreview(getVoucherData() as Voucher);
        }
        else if (e.key === 'F2') { e.preventDefault(); e.stopPropagation(); onF2(); }
      }}
    >
      {/* Voucher type bar */}
      <div style={{background:'#1e2d3d',display:'flex',fontSize:11,flexWrap:'wrap'}}>
        {(['Contra','Payment','Receipt','Journal','Sales','Purchase','Sales Quotation','Credit Note','Debit Note'] as VoucherTypeKey[]).map((v,i)=>{
          const labelMap: Record<string, string> = {
            'Contra': 'F4: Contra',
            'Payment': 'F5: Payment',
            'Receipt': 'F6: Receipt',
            'Journal': 'F7: Journal',
            'Sales': 'F8: Sales',
            'Purchase': 'F9: Purchase',
            'Sales Quotation': 'Alt+F8: Quotation',
            'Credit Note': 'Ctrl+F8: Credit Note',
            'Debit Note': 'Alt+F9: Debit Note'
          };
          return (
            <div key={i} style={{padding:'5px 10px',cursor:'pointer',fontWeight:'bold',background:activeVoucher===v?vc:'transparent',color:activeVoucher===v?'white':'#aaa',borderRight:'1px solid #333'}}
              onClick={()=>onChangeType(v)}>
              {labelMap[v] || v}
            </div>
          );
        })}
        <div style={{marginLeft:'auto',padding:'5px 12px',color:'#888',fontSize:10}}>Alt+C: Inline Create | Ctrl+A: Save | Esc: Back</div>
      </div>

      {/* Header */}
      <div style={{background:'#fafafa',padding:'10px 15px',borderBottom:`2px solid ${vc}`}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <span style={{background:vc,color:'white',padding:'3px 14px',fontWeight:'bold',fontSize:14}}>{activeVoucher}</span>
            {activeVoucher === 'Purchase' && (
              <label
                style={{
                  background: isScanningInvoice ? '#ff9800' : '#1e7e34',
                  color: 'white',
                  padding: '4px 12px',
                  fontWeight: 'bold',
                  fontSize: 12,
                  cursor: isScanningInvoice ? 'wait' : 'pointer',
                  borderRadius: 3,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                }}
                title="Upload single or multiple invoice image pages/PDF to auto-scan & pre-fill items"
              >
                {isScanningInvoice ? '⏳ AI Scanning Bill Pages...' : '📷 Auto Scan Bill (Multi-Page / PDF)'}
                <input
                  id="invoice-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp,image/bmp,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
                  multiple={true}
                  disabled={isScanningInvoice}
                  style={{ display: 'none' }}
                  onChange={handleInvoiceFileUpload}
                />
              </label>
            )}
            <span style={{color:'#444',display:'flex',alignItems:'center',gap:6}}>
              {activeVoucher === 'Sales Quotation' ? 'Quotation No.' : 'No.'}
              {/* Numbering Mode Toggle */}
              {!activeAlterItem && (
                <select
                  value={localNumberingMode}
                  onChange={e => {
                    const mode = e.target.value as 'Auto'|'Manual';
                    setLocalNumberingMode(mode);
                    if (mode === 'Manual') {
                      // Pre-fill with next auto number as suggestion
                      const nextAuto = getNextAutoNumber();
                      setManualVoucherNo(formatVoucherNo(nextAuto, vt));
                    }
                  }}
                  style={{
                    fontSize:11, padding:'1px 4px', border:`1px solid ${vc}`, borderRadius:3,
                    background:'#fff', color:vc, fontWeight:'bold', cursor:'pointer', outline:'none'
                  }}
                  title="Voucher Numbering Mode"
                >
                  <option value="Auto">Auto</option>
                  <option value="Manual">Manual</option>
                </select>
              )}
              {isManualMode ? (
                <input
                  ref={manualVoucherRef}
                  type="text"
                  className="form-input"
                  style={{width:130, color:vc, fontWeight:'bold', padding:'2px 6px', height:24, border:`2px solid ${vc}`, borderRadius:3}}
                  value={manualVoucherNo}
                  onChange={e => setManualVoucherNo(e.target.value)}
                  placeholder="Enter Voucher No."
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); ref.current?.focus(); }
                  }}
                  title="Manual Voucher Number"
                />
              ) : (
                <b style={{fontSize:15, color:vc}}>{formattedNo}</b>
              )}
            </span>
          </div>
          <div style={{color:'#444',display:'flex',alignItems:'center',gap:8}}>
            {activeVoucher === 'Journal' && (
              <button
                type="button"
                onClick={() => setShowJournalHelp(prev => !prev)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowJournalHelp(prev => !prev);
                  }
                }}
                style={{
                  padding: '2px 9px',
                  fontSize: 11,
                  fontWeight: 'bold',
                  background: '#00555a',
                  color: '#ffffff',
                  border: '1px solid #003336',
                  borderRadius: 3,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  outline: 'none'
                }}
                title="Journal Voucher Examples & Rules (Click or Enter)"
              >
                <span>📚</span> Examples
              </button>
            )}
            {currentDate} <span onClick={onF2} style={{cursor:'pointer',marginLeft:10,fontSize:11,background:'#fffbe6',padding:'2px 8px',border:'1px solid #f0d060'}}>F2: Change Date</span>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          {/* Account field: HIDDEN for Journal (Journal has no party - only By/To particulars) */}
          {activeVoucher !== 'Journal' && (
          <div className="form-row" style={{marginBottom:0,alignItems:'center'}}>
            <label style={{width:130}}>{!isInventory ? 'Account' : 'Party A/c Name'}</label><span className="colon">:</span>
            <input ref={ref} type="text" className="form-input" style={{width:350,fontWeight:'bold'}}
              value={partyName}
              onChange={e => {
                const val = e.target.value;
                setPartyName(val);
                setFilter(val);
                setFocus({field:'party'});
                setListSel(0);
              }}
              onFocus={() => { setFocus({field:'party'}); setFilter(partyName || ''); setListSel(0); }}
              onKeyDown={e => {
                if ((e.ctrlKey && e.key === 'Enter') || (e.ctrlKey && e.key.toLowerCase() === 'c')) {
                  e.preventDefault(); e.stopPropagation();
                  const l = ledgers.find(lx => lx.name.trim().toLowerCase() === (partyName || '').trim().toLowerCase());
                  if (l) {
                    onAltC({
                      fieldType: 'ledger',
                      activeAlterItem: l,
                      onCreated: (newItem) => {
                        setPartyName(newItem.name);
                        const bal = getLedgerClosingBalance(newItem, vouchers);
                        setPartyBalance(bal);
                        setTimeout(() => document.getElementById(!isInventory ? 'acc-ledger-0' : 'v-ref')?.focus(), 100);
                      }
                    });
                  }
                  return;
                }
                if (e.altKey && e.key.toLowerCase() === 'c') {
                  e.preventDefault(); e.stopPropagation();
                  onAltC({
                    fieldType: 'ledger',
                    onCreated: (newItem) => {
                      setPartyName(newItem.name);
                      const bal = getLedgerClosingBalance(newItem, vouchers);
                      setPartyBalance(bal);
                      setTimeout(() => document.getElementById(!isInventory ? 'acc-ledger-0' : 'v-ref')?.focus(), 100);
                    }
                  });
                  return;
                }
                if (e.key === 'Enter') {
                  e.preventDefault(); e.stopPropagation();
                  if (focus?.field === 'party' && currentList.length > 0 && listSel < currentList.length) {
                    pickLedger(currentList[listSel] as Ledger);
                  } else {
                    if (isInventory && partyName) {
                      const l = ledgers.find(lx => lx.name === partyName);
                      if (l) {
                        const pd: PartyDetails = {
                          buyerName: l.name, buyerMailingName: l.name, buyerAddress: l.address || '',
                          buyerState: l.state || '', buyerCountry: l.country || 'India', buyerGstin: l.gstin || '', buyerPlace: l.state || '',
                          shipName: l.name, shipMailingName: l.name, shipAddress: l.address || '',
                          shipState: l.state || '', shipCountry: l.country || 'India', shipGstin: l.gstin || '', shipPlace: l.state || '',
                          buyerOrderNo: '', buyerOrderDate: '', termsOfDelivery: '',
                        };
                        setPartyDetails(pd);
                        setShowPartyDetails(true);
                      } else {
                        setTimeout(() => document.getElementById('v-ref')?.focus(), 50);
                      }
                    } else {
                      setTimeout(() => {
                        const el = document.getElementById('acc-ledger-0');
                        el?.focus();
                        (el as HTMLInputElement)?.select?.();
                      }, 80);
                    }
                  }
                } else {
                  listKeyDown(e);
                }
              }}
              onBlur={() => setTimeout(() => setFocus(f => f?.field === 'party' ? null : f), 350)}
              placeholder="Select party / bank ledger (Alt+C to create new)"
            />
          </div>
          )}
          {/* Current Balance: hidden for Journal */}
          {activeVoucher !== 'Journal' && partyName && partyName.trim() !== '' && (() => {
            const pLedger = ledgers.find(l => l.name.toLowerCase() === partyName.trim().toLowerCase());
            const baseBal = pLedger ? getLedgerClosingBalance(pLedger, vouchers) : (partyBalance !== null ? partyBalance : 0);
            let pendingAdj = 0;
            if (activeVoucher === 'Payment') pendingAdj = -accDr;
            else if (activeVoucher === 'Receipt') pendingAdj = accCr;
            else if (activeVoucher === 'Contra') pendingAdj = accCr;
            else pendingAdj = accDr - accCr;
            const liveBal = baseBal + pendingAdj;
            const absBal = Math.abs(liveBal);
            const balType = liveBal >= 0 ? 'Dr' : 'Cr';
            const odExceeded = pLedger?.odLimit != null && liveBal < 0 && Math.abs(liveBal) > (pLedger.odLimit || 0);
            return (
              <div className="form-row" style={{marginBottom:4,marginTop:2,alignItems:'center'}}>
                <label style={{width:130,fontSize:11,color:'#555',fontStyle:'italic'}}>Current balance</label>
                <span className="colon">:</span>
                <span style={{fontSize:12,fontWeight:'bold',fontStyle:'italic',color: liveBal < 0 ? '#b30000' : '#006600',marginLeft:2}}>
                  {fmt(absBal)} {balType}
                </span>
                {odExceeded && (
                  <span style={{marginLeft:10,fontSize:10,color:'#c00',background:'#fff0f0',border:'1px solid #f66',padding:'1px 6px',borderRadius:3,fontWeight:'bold'}}>
                    ⚠ OD Limit: ₹{fmt(pLedger!.odLimit!)} exceeded!
                  </span>
                )}
                {pLedger?.odLimit != null && !odExceeded && (
                  <span style={{marginLeft:10,fontSize:10,color:'#555',opacity:0.75}}>
                    (OD Limit: ₹{fmt(pLedger.odLimit)} Cr)
                  </span>
                )}
              </div>
            );
          })()}

          {/* Ref No: hidden for Journal */}
          {activeVoucher !== 'Journal' && (
          <div className="form-row" style={{marginBottom:0}}>
            <label style={{width:80}}>Ref No.</label><span className="colon">:</span>
            <input id="v-ref" type="text" className="form-input" style={{width:160}} value={refNo} onChange={e=>setRefNo(e.target.value)} placeholder="Auto"
              onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault(); e.stopPropagation();
                if (activeVoucher === 'Purchase' || activeVoucher === 'Debit Note') {
                  setTimeout(()=>document.getElementById('v-supplier-inv-no')?.focus(), 50);
                } else {
                  const target = isInventory ? 'item-name-0' : 'acc-ledger-0';
                  setTimeout(()=>document.getElementById(target)?.focus(), 50);
                }
              }}}/>
          </div>
          )}
          {(activeVoucher === 'Purchase' || activeVoucher === 'Debit Note') && (
            <>
              <div className="form-row" style={{marginBottom:0}}>
                <label style={{width:150}}>Supplier Invoice No.</label><span className="colon">:</span>
                <input id="v-supplier-inv-no" type="text" className="form-input" style={{width:160}} value={supplierInvNo} onChange={e=>setSupplierInvNo(e.target.value)} placeholder="Supplier's Inv No."
                  onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault(); e.stopPropagation();
                    setTimeout(()=>document.getElementById('v-supplier-inv-date')?.focus(), 50);
                  }}}/>
              </div>
              <div className="form-row" style={{marginBottom:0}}>
                <label style={{width:150}}>Supplier Invoice Date</label><span className="colon">:</span>
                <input id="v-supplier-inv-date" type="text" className="form-input" style={{width:130}} value={supplierInvDate} onChange={e=>setSupplierInvDate(e.target.value)} placeholder="e.g. 14-May-2026"
                  onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault(); e.stopPropagation();
                    const target = isInventory ? 'item-name-0' : 'acc-ledger-0';
                    setTimeout(()=>document.getElementById(target)?.focus(), 50);
                  }}}/>
              </div>
            </>
          )}
        </div>
      </div>

      {/* INVENTORY MODE */}
      {isInventory && (
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{display:'flex',background:'#e8eef4',padding:'5px 10px',borderBottom:'1px solid #ccc',fontWeight:'bold',fontSize:12}}>
            <div style={{flex:4}}>Name of Item</div>
            <div style={{width:80,textAlign:'right'}}>Quantity</div>
            {rows.some(r => stockItems.find(it => it.id === r.itemId)?.showInclTax) && (
              <div style={{width:100,textAlign:'right'}}>Rate (Incl. Tax)</div>
            )}
            <div style={{width:90,textAlign:'right'}}>Rate</div>
            <div style={{width:55,textAlign:'center'}}>per</div>
            {(activeCompany?.showDiscount || rows.some(r => (r.discountPerc || 0) > 0 || (r.discountAmt || 0) > 0)) && <div style={{width:65,textAlign:'right'}}>Disc %</div>}
            <div style={{width:110,textAlign:'right'}}>Amount</div>
            {rows.some(r => stockItems.find(it => it.id === r.itemId)?.showAmtInclTax) && (
              <div style={{width:110,textAlign:'right'}}>Amount (Incl. Tax)</div>
            )}
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {rows.map((row,idx)=>{
              const item = stockItems.find(it => it.id === row.itemId || (it.name && it.name.trim().toLowerCase() === (row.itemName || '').trim().toLowerCase()));
              const hasDesc = !!item?.enableDescription && (!!item?.descLine1 || !!item?.descLine2 || !!item?.descLine3);
              const showIncl = item?.showInclTax || false;
              const anyShowIncl = rows.some(r => stockItems.find(it => it.id === r.itemId)?.showInclTax);
              const showAmtIncl = item?.showAmtInclTax || false;
              const anyShowAmtIncl = rows.some(r => stockItems.find(it => it.id === r.itemId)?.showAmtInclTax);

              const focusAfterItem = () => {
                if (hasDesc) {
                  if (item?.descLine1) document.getElementById(`item-desc1-${idx}`)?.focus();
                  else if (item?.descLine2) document.getElementById(`item-desc2-${idx}`)?.focus();
                  else if (item?.descLine3) document.getElementById(`item-desc3-${idx}`)?.focus();
                  else document.getElementById(`item-qty-${idx}`)?.focus();
                } else {
                  document.getElementById(`item-qty-${idx}`)?.focus();
                }
              };

              const calculateVoucherRow = (row: VoucherRow, field: string, value: number): Partial<VoucherRow> => {
                const gst = row.gstRate || 18;
                const factor = 1 + gst / 100;
                const updates: Partial<VoucherRow> = {};
                let q = field === 'qty' ? value : (row.qty || 0);
                let r = field === 'rate' ? value : (row.rate || 0);
                let dP = field === 'discountPerc' ? value : (row.discountPerc || 0);
                
                // Round rate to max 2 decimal places before multiplication
                if (field === 'rateInclTax') r = round2(value / factor);
                if (field === 'amount') {
                   const taxable = value;
                   // If rate is set, calculate qty automatically (qty = amount / rate)
                   if (r > 0) q = round2((taxable / (1 - dP/100)) / r);
                   // If rate is 0 but qty is set, calculate rate back
                   else if (q > 0) r = round2((taxable / (1 - dP/100)) / q);
                }

                // Multiply using 2-decimal rate so result stays within 2 decimal places
                const gross = round2(round2(q) * round2(r));
                const discAmt = round2(gross * (dP / 100));
                const taxable = round2(gross - discAmt);
                const amtInclTax = round2(taxable * factor);
                const rateInclTax = round2(r * factor);

                updates.qty = round2(q);
                updates.rate = round2(r);
                updates.discountPerc = round2(dP);
                updates.discountAmt = round2(discAmt);
                // When user is typing amount directly, preserve their typed value exactly
                // (don't recalculate from qty*rate which causes rounding drift)
                updates.taxableAmount = field === 'amount' ? round2(value) : round2(taxable);
                updates.amount = field === 'amount' ? round2(value) : round2(taxable);
                updates.amountInclTax = field === 'amount' ? round2(value * factor) : round2(amtInclTax);
                // rateInclTax mein user jo type kare wahi value store karo (round-trip se value na badle)
                // Agar field 'rateInclTax' hai to user ki typed value directly, warna calculated value
                updates.rateInclTax = field === 'rateInclTax' ? value : round2(rateInclTax);


                return updates;
              };

              const updateRow = (idx: number, updates: Partial<VoucherRow>) => {
                const nr = [...rows];
                nr[idx] = { ...nr[idx], ...updates };
                setRows(nr);
              };

              return (
              <div key={idx} style={{display:'flex',padding:'4px 10px',alignItems:'flex-start',borderBottom:'1px solid #f5f5f5',background:idx%2===0?'#fff':'#fafafa'}}>
                <div style={{flex:4}}>
                  <input id={`item-name-${idx}`} type="text" className="form-input" style={{width:'97%',border:focus?.field==='item'&&focus.rowIdx===idx?'1px solid #ffc436':'1px solid transparent'}}
                    value={row.itemName}
                    onFocus={()=>{setFocus({field:'item',rowIdx:idx});setFilter('');setListSel(99999);}}
                    onChange={e=>{const nr=[...rows];nr[idx].itemName=e.target.value;setRows(nr);setFilter(e.target.value);}}
                    onKeyDown={e=>{
                      if ((e.ctrlKey && e.key === 'Enter') || (e.ctrlKey && e.key.toLowerCase() === 'c')) {
                        e.preventDefault(); e.stopPropagation();
                        const it = stockItems.find(x => x.name.trim().toLowerCase() === (row.itemName || '').trim().toLowerCase());
                        if (it) {
                          onAltC({
                            fieldType: 'stockItem',
                            activeAlterItem: it,
                            onCreated: (newItem) => {
                              const nr = [...rows];
                              const gst = newItem.gstRate || 18;
                              nr[idx] = {
                                ...nr[idx],
                                itemId: newItem.id,
                                itemName: newItem.name,
                                unit: typeof newItem.unit === 'string' ? newItem.unit : (newItem.unit as any)?.symbol || (newItem.unit as any)?.name || 'Nos',
                                gstRate: gst,
                                hsnCode: newItem.hsnCode || '',
                                rateInclTax: (nr[idx].rate || 0) * (1 + gst / 100),
                                amountInclTax: (nr[idx].amount || 0) * (1 + gst / 100)
                              };
                              setRows(nr);
                              setTimeout(() => {
                                if (newItem.enableDescription) {
                                  if (newItem.descLine1) document.getElementById(`item-desc1-${idx}`)?.focus();
                                  else if (newItem.descLine2) document.getElementById(`item-desc2-${idx}`)?.focus();
                                  else if (newItem.descLine3) document.getElementById(`item-desc3-${idx}`)?.focus();
                                  else document.getElementById(`item-qty-${idx}`)?.focus();
                                } else {
                                  document.getElementById(`item-qty-${idx}`)?.focus();
                                }
                              }, 100);
                            }
                          });
                        }
                        return;
                      }
                      if(e.altKey&&e.key.toLowerCase()==='c'){
                        e.preventDefault(); e.stopPropagation();
                        onAltC({
                          fieldType: 'stockItem',
                          onCreated: (newItem) => {
                            const nr = [...rows];
                            const gst = newItem.gstRate || 18;
                            nr[idx] = {
                              ...nr[idx],
                              itemId: newItem.id,
                              itemName: newItem.name,
                              unit: typeof newItem.unit === 'string' ? newItem.unit : (newItem.unit as any)?.symbol || (newItem.unit as any)?.name || 'Nos',
                              gstRate: gst,
                              hsnCode: newItem.hsnCode || '',
                              rateInclTax: (nr[idx].rate || 0) * (1 + gst / 100),
                              amountInclTax: (nr[idx].amount || 0) * (1 + gst / 100)
                            };
                            setRows(nr);
                            setTimeout(() => {
                              if (newItem.enableDescription) {
                                if (newItem.descLine1) document.getElementById(`item-desc1-${idx}`)?.focus();
                                else if (newItem.descLine2) document.getElementById(`item-desc2-${idx}`)?.focus();
                                else if (newItem.descLine3) document.getElementById(`item-desc3-${idx}`)?.focus();
                                else document.getElementById(`item-qty-${idx}`)?.focus();
                              } else {
                                document.getElementById(`item-qty-${idx}`)?.focus();
                              }
                            }, 100);
                          }
                        });
                        return;
                      }
                      else if(e.key==='Enter'){
                        e.preventDefault(); e.stopPropagation();
                        if(focus?.field==='item') {
                          listKeyDown(e);
                        } else {
                          if(isEndOfItem || !row.itemName) goToAdditionalLedgers();
                          else focusAfterItem();
                        }
                      } else {
                        listKeyDown(e);
                      }
                    }}
                    onBlur={()=>setTimeout(()=>setFocus(f=>f?.field==='item'&&f.rowIdx===idx?null:f),200)}
                    placeholder="Select item (Alt+C to create)"
                  />
                  {row.itemName && hasDesc && (
                    <div style={{paddingLeft:8, marginTop:4, display:'flex', flexDirection:'column', gap:3}}>
                      {item?.descLine1 && (
                        <div style={{display:'flex', alignItems:'center', gap:5}}>
                          <span style={{fontSize:10, color:'#1c5282', fontWeight:'bold', width:40}}>Line 1:</span>
                          <input
                            id={`item-desc1-${idx}`}
                            type="text"
                            className="form-input"
                            style={{width:280, maxWidth:'90%', fontSize:11, background:'#fffde6', border:'1px solid #d0c080', padding:'2px 6px', fontWeight:'500'}}
                            placeholder="Description line 1..."
                            value={row.desc1 || ''}
                            onChange={e => {
                              const nr = [...rows];
                              nr[idx].desc1 = e.target.value;
                              setRows(nr);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault(); e.stopPropagation();
                                if (item?.descLine2) document.getElementById(`item-desc2-${idx}`)?.focus();
                                else if (item?.descLine3) document.getElementById(`item-desc3-${idx}`)?.focus();
                                else document.getElementById(`item-qty-${idx}`)?.focus();
                              }
                            }}
                          />
                        </div>
                      )}
                      {item?.descLine2 && (
                        <div style={{display:'flex', alignItems:'center', gap:5}}>
                          <span style={{fontSize:10, color:'#1c5282', fontWeight:'bold', width:40}}>Line 2:</span>
                          <input
                            id={`item-desc2-${idx}`}
                            type="text"
                            className="form-input"
                            style={{width:280, maxWidth:'90%', fontSize:11, background:'#fffde6', border:'1px solid #d0c080', padding:'2px 6px', fontWeight:'500'}}
                            placeholder="Description line 2..."
                            value={row.desc2 || ''}
                            onChange={e => {
                              const nr = [...rows];
                              nr[idx].desc2 = e.target.value;
                              setRows(nr);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault(); e.stopPropagation();
                                if (item?.descLine3) document.getElementById(`item-desc3-${idx}`)?.focus();
                                else document.getElementById(`item-qty-${idx}`)?.focus();
                              }
                            }}
                          />
                        </div>
                      )}
                      {item?.descLine3 && (
                        <div style={{display:'flex', alignItems:'center', gap:5}}>
                          <span style={{fontSize:10, color:'#1c5282', fontWeight:'bold', width:40}}>Line 3:</span>
                          <input
                            id={`item-desc3-${idx}`}
                            type="text"
                            className="form-input"
                            style={{width:280, maxWidth:'90%', fontSize:11, background:'#fffde6', border:'1px solid #d0c080', padding:'2px 6px', fontWeight:'500'}}
                            placeholder="Description line 3..."
                            value={row.desc3 || ''}
                            onChange={e => {
                              const nr = [...rows];
                              nr[idx].desc3 = e.target.value;
                              setRows(nr);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault(); e.stopPropagation();
                                document.getElementById(`item-qty-${idx}`)?.focus();
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{width:80}}>{row.itemName ? <input id={`item-qty-${idx}`} type="number" className="form-input" style={{width:'88%',textAlign:'right'}} value={row.qty||''}
                   onChange={e=>{
                     const q = parseFloat(e.target.value)||0;
                     updateRow(idx, calculateVoucherRow(row, 'qty', q));
                   }}
                   onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault(); e.stopPropagation(); 
                     const nextId = showIncl ? `item-rate-incl-${idx}` : `item-rate-${idx}`;
                     setTimeout(()=>document.getElementById(nextId)?.focus(), 80);
                   }}} /> : null}</div>
                
                {anyShowIncl && (
                  <div style={{width:100}}>
                    {row.itemName && showIncl ? (
                      <input id={`item-rate-incl-${idx}`} type="number" className="form-input" style={{width:'88%',textAlign:'right', background:'#fffbe6'}} value={row.rateInclTax||''}
                        onChange={e=>{
                          const ri = parseFloat(e.target.value)||0;
                          updateRow(idx, calculateVoucherRow(row, 'rateInclTax', ri));
                        }}
                        onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault(); e.stopPropagation();
                          // After Rate Incl. Tax → always go to Rate (step by step)
                          setTimeout(()=>document.getElementById(`item-rate-${idx}`)?.focus(), 80);
                        }}}
                      />
                    ) : (row.itemName ? <div style={{width:'88%', textAlign:'right', color:'#ccc'}}>—</div> : null)}
                  </div>
                )}

                <div style={{width:90}}>{row.itemName ? <input id={`item-rate-${idx}`} type="number" className="form-input" style={{width:'88%',textAlign:'right'}} value={row.rate||''}
                   onChange={e=>{
                     const r = parseFloat(e.target.value)||0;
                     updateRow(idx, calculateVoucherRow(row, 'rate', r));
                   }}
                   onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault(); e.stopPropagation(); 
                     const hasDisc = activeCompany?.showDiscount || rows.some(r => (r.discountPerc || 0) > 0 || (r.discountAmt || 0) > 0);
                     const nextId = hasDisc ? `item-disc-${idx}` : `item-amt-${idx}`;
                     setTimeout(()=>document.getElementById(nextId)?.focus(), 80);
                   }}} /> : null}</div>
                <div style={{width:55,textAlign:'center',fontSize:11,color:'#666'}}>{row.itemName ? (typeof row.unit === 'string' ? row.unit : (row.unit as any)?.name || (row.unit as any)?.symbol || 'Nos') : ''}</div>
                {(activeCompany?.showDiscount || rows.some(r => (r.discountPerc || 0) > 0 || (r.discountAmt || 0) > 0)) && (
                  <div style={{width:65}}>
                    {row.itemName ? <input id={`item-disc-${idx}`} type="number" className="form-input" style={{width:'90%',textAlign:'right',fontWeight:'bold'}}
                      value={row.discountPerc||''}
                      onChange={e=>updateRow(idx, calculateVoucherRow(row, 'discountPerc', parseFloat(e.target.value)||0))}
                      onKeyDown={e=>{
                        if(e.key==='Enter'){
                          e.preventDefault(); e.stopPropagation();
                          document.getElementById(`item-amt-${idx}`)?.focus();
                        }
                      }}
                    /> : null}
                  </div>
                )}
                <div style={{width:110}}>
                  {row.itemName ? <input id={`item-amt-${idx}`} type="number" className="form-input" style={{width:'90%',textAlign:'right',fontWeight:'bold',color:vc}} value={row.amount||''}
                    onChange={e=>{
                      const a = parseFloat(e.target.value)||0;
                      updateRow(idx, calculateVoucherRow(row, 'amount', a));
                    }}
                    onKeyDown={e=>{
                      if(e.key==='Enter'){
                        e.preventDefault(); e.stopPropagation();
                        if (showAmtIncl) {
                          setTimeout(()=>document.getElementById(`item-amt-incl-${idx}`)?.focus(), 80);
                        } else {
                          if(idx === rows.length - 1){
                            setRows(p=>[...p,{itemId:0,itemName:'',qty:0,rate:0,rateInclTax:0,amountInclTax:0,unit:'Nos',amount:0,gstRate:18,hsnCode:''}]);
                            setTimeout(()=>document.getElementById(`item-name-${idx+1}`)?.focus(), 80);
                          } else {
                            setTimeout(()=>document.getElementById(`item-name-${idx+1}`)?.focus(), 80);
                          }
                        }
                      }
                    }}
                  /> : null}
                </div>

                {anyShowAmtIncl && (
                  <div style={{width:110}}>
                    {row.itemName && showAmtIncl ? (
                      <input id={`item-amt-incl-${idx}`} type="number" className="form-input" style={{width:'90%',textAlign:'right',fontWeight:'bold',color:'#1a7a4a',background:'#e8f5e9'}} value={row.amountInclTax||''}
                        onChange={e=>{
                          const ai = parseFloat(e.target.value)||0;
                          updateRow(idx, calculateVoucherRow(row, 'amountInclTax', ai));
                        }}
                        onKeyDown={e=>{
                          if(e.key==='Enter'){
                            e.preventDefault(); e.stopPropagation();
                            if(idx === rows.length - 1){
                              setRows(p=>[...p,{itemId:0,itemName:'',qty:0,rate:0,rateInclTax:0,amountInclTax:0,unit:'Nos',amount:0,gstRate:18,hsnCode:''}]);
                              setTimeout(()=>document.getElementById(`item-name-${idx+1}`)?.focus(), 80);
                            } else {
                              setTimeout(()=>document.getElementById(`item-name-${idx+1}`)?.focus(), 80);
                            }
                          }
                        }}
                      />
                    ) : (row.itemName ? <div style={{width:'90%', textAlign:'right', color:'#ccc'}}>—</div> : null)}
                  </div>
                )}
              </div>
            );})}
            <div style={{padding:'6px 10px',color:'#888',fontSize:11,cursor:'pointer',borderTop:'1px dashed #ddd'}}
              onClick={()=>setRows(p=>[...p,{itemId:0,itemName:'',qty:0,rate:0,rateInclTax:0,amountInclTax:0,unit:'Nos',amount:0,gstRate:18,hsnCode:''}])}>
              + Add another item
            </div>

            {/* Professional Additional Ledgers Grid Continuation */}
            {additionalLedgers.map((al, alIdx) => (
              <div key={alIdx} style={{display:'flex',padding:'4px 10px',alignItems:'center',borderBottom:'1px solid #f5f5f5',background:alIdx%2===0?'#fff':'#fafafa'}}>
                <div style={{flex:4}}>
                  <input id={`addl-ledger-${alIdx}`} type="text" className="form-input" style={{width:'97%',border:focus?.field==='addl-ledger'&&focus.rowIdx===alIdx?'1px solid #ffc436':'1px solid transparent'}}
                    value={al.ledgerName}
                    onFocus={()=>{setFocus({field:'addl-ledger',rowIdx:alIdx});setFilter('');setListSel(99999);}}
                    onChange={e=>{
                      const ne = [...additionalLedgers];
                      ne[alIdx].ledgerName = e.target.value;
                      setAdditionalLedgers(ne);
                      setFilter(e.target.value);
                    }}
                    onKeyDown={e=>{
                      if(e.key==='Enter'){
                        e.preventDefault(); e.stopPropagation();
                        listKeyDown(e);
                      } else {
                        listKeyDown(e);
                      }
                    }}
                    onBlur={()=>setTimeout(()=>setFocus(f=>f?.field==='addl-ledger'&&f.rowIdx===alIdx?null:f),200)}
                    placeholder="Select Particulars (Transportation, Discount, etc.)"
                  />
                </div>
                {/* Empty columns to match item grid layout */}
                <div style={{width:80}}></div>
                {rows.some(r => stockItems.find(it => it.id === r.itemId)?.showInclTax) && <div style={{width:100}}></div>}
                <div style={{width:90}}></div>
                <div style={{width:55}}></div>
                {activeCompany?.showDiscount && <div style={{width:65}}></div>}
                
                <div style={{width:110}}>
                  {al.ledgerName ? (
                    <input id={`addl-amt-${alIdx}`} type="number" className="form-input" style={{width:'90%',textAlign:'right',fontWeight:'bold',color:'#1c5282'}}
                      value={al.amount||''}
                      onChange={e=>{
                        const ne = [...additionalLedgers];
                        ne[alIdx].amount = parseFloat(e.target.value)||0;
                        setAdditionalLedgers(ne);
                      }}
                      onKeyDown={e=>{
                        if(e.key==='Enter'){
                          e.preventDefault(); e.stopPropagation();
                          // Move to next row: add it to state if not exists
                          if(alIdx === additionalLedgers.length - 1) {
                             setAdditionalLedgers(p => [...p, {ledgerId:0, ledgerName:'', amount:0, entryType: isPurchaseSide ? 'Dr' : 'Cr'}]);
                             setTimeout(() => document.getElementById(`addl-ledger-${alIdx+1}`)?.focus(), 80);
                          } else {
                             document.getElementById(`addl-ledger-${alIdx+1}`)?.focus();
                          }
                        }
                      }}
                    />
                  ) : <div style={{width:'90%'}} />}
                </div>
                {rows.some(r => stockItems.find(it => it.id === r.itemId)?.showAmtInclTax) && <div style={{width:110}}></div>}
              </div>
            ))}
          </div>
          {/* Tax lines - TALLY PRIME STYLE with item-wise GST breakdown */}
          <div style={{borderTop:`2px solid ${vc}`,background:'#f8f8f8',padding:'8px 15px'}}>
            <div style={{display:'flex',justifyContent:'flex-end',gap:20,marginBottom:5}}>
              <span style={{fontSize:13,color:'#555'}}>Sub Total:</span>
              <span style={{width:130,textAlign:'right',fontWeight:'bold'}}>₹ {fmt(itemSubtotal)}</span>
            </div>

            {/* State indicator */}
            {partyName && partyLedger?.state && (
              <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginBottom:6,fontSize:11}}>
                <span style={{background:isInterState?'#fff3e0':'#e8f5e9',padding:'2px 10px',border:`1px solid ${isInterState?'#ff9800':'#4caf50'}`,borderRadius:2,fontWeight:'bold',color:isInterState?'#e65100':'#2e7d32'}}>
                  {isInterState ? `⚡ INTER-STATE (${activeCompany?.state} → ${partyLedger.state}) — IGST` : `✓ INTRA-STATE (${activeCompany?.state}) — CGST + SGST`}
                </span>
              </div>
            )}
            {/* Item-wise GST breakdown */}
            {gstBreakdown.map((g, gi) => {
              const displayTaxable = (g as any).netTaxableAmt !== undefined ? (g as any).netTaxableAmt : g.taxableAmt;
              return (
                <div key={gi} style={{marginBottom:4}}>
                  {isInterState ? (
                    <div style={{display:'flex',justifyContent:'flex-end',gap:20,marginBottom:2}}>
                      <span style={{fontSize:12,color:'#555'}}>IGST @ {g.gstRate}% on ₹{fmt(displayTaxable)}:</span>
                      <span style={{width:130,textAlign:'right',fontSize:12}}>₹ {fmt(g.igst)}</span>
                    </div>
                  ) : (
                    <>
                      <div style={{display:'flex',justifyContent:'flex-end',gap:20,marginBottom:2}}>
                        <span style={{fontSize:12,color:'#555'}}>CGST @ {g.gstRate/2}% on ₹{fmt(displayTaxable)}:</span>
                        <span style={{width:130,textAlign:'right',fontSize:12}}>₹ {fmt(g.cgst)}</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'flex-end',gap:20,marginBottom:2}}>
                        <span style={{fontSize:12,color:'#555'}}>SGST @ {g.gstRate/2}% on ₹{fmt(displayTaxable)}:</span>
                        <span style={{width:130,textAlign:'right',fontSize:12}}>₹ {fmt(g.sgst)}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {totalTax > 0 && (
              <div style={{display:'flex',justifyContent:'flex-end',gap:20,marginBottom:4,borderTop:'1px dashed #ccc',paddingTop:4}}>
                <span style={{fontSize:12,fontWeight:'bold',color:'#555'}}>Total Tax:</span>
                <span style={{width:130,textAlign:'right',fontSize:12,fontWeight:'bold'}}>₹ {fmt(totalTax)}</span>
              </div>
            )}
            {/* Round Off and other ledgers are now in the main grid list */}
            <div style={{display:'flex',justifyContent:'flex-end',gap:20,borderTop:`1px solid ${vc}`,paddingTop:6}}>
              <span style={{fontSize:15,fontWeight:'bold',color:vc}}>Grand Total:</span>
              <span style={{width:130,textAlign:'right',fontSize:18,fontWeight:'bold',color:vc}}>₹ {fmt(grandTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNTING MODE */}
      {!isInventory && (
        <div style={{flex:1,display:'flex',flexDirection:'column',background:'#fffdf7',overflow:'hidden'}}>
          {/* Table Header: Particulars / Amount */}
          <div style={{
            display:'flex',
            alignItems:'center',
            justifyContent:'space-between',
            padding:'5px 20px',
            borderTop:'1px solid #777',
            borderBottom:'1px solid #777',
            background:'#f5efe6',
            fontWeight:'bold',
            fontSize:12,
            color:'#222'
          }}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <span>Particulars</span>
              {activeVoucher === 'Journal' && (
                <span style={{fontSize:10,fontWeight:'normal',color:'#555',background:'#fff3cd',padding:'1px 6px',border:'1px solid #f0c040',borderRadius:2}}>
                  By = Dr (Debit) &nbsp;|&nbsp; To = Cr (Credit)
                </span>
              )}
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {activeVoucher === 'Journal' && <span style={{fontSize:11,color:'#555',minWidth:36,textAlign:'center'}}>Dr/Cr</span>}
              <span>Amount</span>
            </div>
          </div>

          {/* Table Body Rows */}
          <div style={{flex:1,overflowY:'auto',padding:'5px 0'}}>
            {accEntries.map((entry, idx) => {
              const entryLedger = entry.ledgerName ? ledgers.find(l => l.name === entry.ledgerName) : null;
              const entryBal = entryLedger ? getLedgerClosingBalance(entryLedger, vouchers) : null;
              const entryBalAbs = entryBal !== null ? Math.abs(entryBal) : null;
              const entryBalType = entryBal !== null ? (entryBal >= 0 ? 'Dr' : 'Cr') : null;
              const entryOdExceeded = entryLedger?.odLimit != null && entryBal !== null && entryBal < 0 && Math.abs(entryBal) > (entryLedger.odLimit || 0);

              const isFocused = focus?.field === 'accledger' && focus.rowIdx === idx;

              return (
                <div
                  key={idx}
                  style={{
                    padding:'6px 20px',
                    background: isFocused ? '#fff7d6' : idx % 2 === 0 ? '#fffdf7' : '#faf6ee',
                    borderBottom:'1px solid #efe8da',
                    transition:'background 0.15s'
                  }}
                >
                  {/* Line 1: By/To prefix + Ledger Name + Dr/Cr Toggle + Amount */}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    {/* By/To label for Journal */}
                    {activeVoucher === 'Journal' && (
                      <span style={{
                        minWidth:28,fontSize:11,fontWeight:'bold',
                        color: entry.entryType === 'Dr' ? '#1a7a4a' : '#8B0000',
                        marginRight:4
                      }}>
                        {entry.entryType === 'Dr' ? 'By' : 'To'}
                      </span>
                    )}
                    <div style={{flex:1,marginRight:8}}>
                      <input
                        id={`acc-ledger-${idx}`}
                        type="text"
                        className="form-input"
                        style={{
                          width:'100%',
                          fontWeight:'bold',
                          fontSize:13,
                          background:'transparent',
                          border:'none',
                          outline:'none',
                          color:'#000'
                        }}
                        value={entry.ledgerName}
                        placeholder={idx === 0 ? `Select Particulars ledger...` : `Particulars...`}
                        onFocus={() => {
                          const val = entry.ledgerName || '';
                          setFocus({field:'accledger', rowIdx:idx});
                          setFilter(val);
                          setListSel(0);
                        }}
                        onChange={e => {
                          const val = e.target.value;
                          const ne = [...accEntries];
                          ne[idx].ledgerName = val;
                          setAccEntries(ne);
                          setFilter(val);
                          setFocus({field:'accledger', rowIdx:idx});
                          setListSel(0);
                        }}
                        onKeyDown={e => {
                          if ((e.ctrlKey && e.key === 'Enter') || (e.ctrlKey && e.key.toLowerCase() === 'c')) {
                            e.preventDefault(); e.stopPropagation();
                            const l = ledgers.find(lx => lx.name.trim().toLowerCase() === (entry.ledgerName || '').trim().toLowerCase());
                            if (l) {
                              onAltC({
                                fieldType: 'ledger',
                                activeAlterItem: l,
                                onCreated: (newItem) => {
                                  const ne = [...accEntries];
                                  ne[idx] = { ...ne[idx], ledgerId: newItem.id, ledgerName: newItem.name };
                                  setAccEntries(ne);
                                  setTimeout(() => document.getElementById(`acc-amt-${idx}-${entry.entryType}`)?.focus(), 100);
                                }
                              });
                            }
                            return;
                          }
                          if (e.altKey && e.key.toLowerCase() === 'c') {
                            e.preventDefault(); e.stopPropagation();
                            onAltC({
                              fieldType: 'ledger',
                              onCreated: (newItem) => {
                                const ne = [...accEntries];
                                ne[idx] = { ...ne[idx], ledgerId: newItem.id, ledgerName: newItem.name };
                                setAccEntries(ne);
                                setTimeout(() => document.getElementById(`acc-amt-${idx}-${entry.entryType}`)?.focus(), 100);
                              }
                            });
                            return;
                          }
                          if (e.key === 'Enter') {
                            e.preventDefault(); e.stopPropagation();
                            if (isEndOfItem || (!entry.ledgerName && idx > 0)) {
                              goToNarration();
                            } else if (focus?.field === 'accledger' && currentList.length > 0 && !isEndOfItem) {
                              // Fix: account for i+1 offset when "End of List" is at top (no filter)
                              // Same realIndex logic as listKeyDown Enter handler
                              const realIndex = (!filter || filter.trim() === '') ? listSel - 1 : listSel;
                              if (realIndex >= 0 && realIndex < currentList.length) {
                                pickLedger(currentList[realIndex] as Ledger);
                              } else if (listSel === 0 || realIndex < 0) {
                                goToNarration();
                              } else {
                                const amtEl = document.getElementById(`acc-amt-${idx}-${entry.entryType}`) || document.getElementById(`acc-amt-${idx}-Dr`) || document.getElementById(`acc-amt-${idx}-Cr`);
                                amtEl?.focus();
                              }
                            } else {
                              const amtEl = document.getElementById(`acc-amt-${idx}-${entry.entryType}`) || document.getElementById(`acc-amt-${idx}-Dr`) || document.getElementById(`acc-amt-${idx}-Cr`);
                              amtEl?.focus();
                            }
                          } else {
                            listKeyDown(e);
                          }
                        }}
                        onBlur={() => setTimeout(() => setFocus(f => f?.field === 'accledger' && f.rowIdx === idx ? null : f), 350)}
                      />
                    </div>
                    {/* Dr/Cr Toggle for Journal */}
                    {activeVoucher === 'Journal' && (
                      <div style={{display:'flex',border:'1px solid #ccc',borderRadius:3,overflow:'hidden',marginRight:8,flexShrink:0}}>
                        <button
                          type="button"
                          onClick={() => {
                            const ne = [...accEntries];
                            ne[idx] = {...ne[idx], entryType: 'Dr'};
                            setAccEntries(ne);
                          }}
                          style={{
                            padding:'2px 8px',fontSize:11,fontWeight:'bold',cursor:'pointer',border:'none',
                            background: entry.entryType === 'Dr' ? '#1a7a4a' : '#f0f0f0',
                            color: entry.entryType === 'Dr' ? '#fff' : '#555'
                          }}
                        >Dr</button>
                        <button
                          type="button"
                          onClick={() => {
                            const ne = [...accEntries];
                            ne[idx] = {...ne[idx], entryType: 'Cr'};
                            setAccEntries(ne);
                          }}
                          style={{
                            padding:'2px 8px',fontSize:11,fontWeight:'bold',cursor:'pointer',border:'none',
                            background: entry.entryType === 'Cr' ? '#8B0000' : '#f0f0f0',
                            color: entry.entryType === 'Cr' ? '#fff' : '#555'
                          }}
                        >Cr</button>
                      </div>
                    )}
                    {/* Amount Input */}
                    <div style={{width:160,textAlign:'right'}}>
                      <input
                        id={`acc-amt-${idx}-${entry.entryType}`}
                        type="number"
                        className="form-input"
                        style={{
                          width:'100%',
                          textAlign:'right',
                          fontWeight:'bold',
                          fontSize:14,
                          background:'transparent',
                          border:'none',
                          outline:'none',
                          color:'#000'
                        }}
                        value={entry.amount || ''}
                        onChange={e => {
                          const ne = [...accEntries];
                          ne[idx].amount = parseFloat(e.target.value) || 0;
                          setAccEntries(ne);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (idx === accEntries.length - 1) {
                              // Journal: alternate Dr/Cr when adding new row
                              // Contra: always Cr. Receipt: Cr. Others: Dr.
                              let defaultType: 'Dr' | 'Cr';
                              if (activeVoucher === 'Journal') {
                                // Alternate based on last entry type to guide balanced entry
                                const lastType = accEntries[accEntries.length - 1]?.entryType || 'Dr';
                                defaultType = lastType === 'Dr' ? 'Cr' : 'Dr';
                              } else {
                                defaultType = (activeVoucher === 'Receipt' || activeVoucher === 'Contra') ? 'Cr' : 'Dr';
                              }
                              setAccEntries(p => [...p, { ledgerId: 0, ledgerName: '', amount: 0, entryType: defaultType }]);
                              setTimeout(() => document.getElementById(`acc-ledger-${idx + 1}`)?.focus(), 80);
                            } else {
                              document.getElementById(`acc-ledger-${idx + 1}`)?.focus();
                            }
                          }
                        }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Line 2: Cur Bal (indented 15px) - Live calculation as user types amount */}
                  {entry.ledgerName && (() => {
                    const baseBal = entryLedger ? getLedgerClosingBalance(entryLedger, vouchers) : 0;
                    const currentAmt = entry.amount || 0;
                    // Contra particulars (By/Credit side): balance DECREASES (Cr reduces balance)
                    // General rule: Dr increases balance, Cr decreases balance
                    const liveBal = baseBal + (entry.entryType === 'Dr' ? currentAmt : -currentAmt);
                    const absBal = Math.abs(liveBal);
                    const balType = liveBal >= 0 ? 'Dr' : 'Cr';
                    const isExceeded = entryLedger?.odLimit != null && liveBal < 0 && Math.abs(liveBal) > (entryLedger.odLimit || 0);

                    return (
                      <div style={{paddingLeft:15,marginTop:2,fontSize:11,fontStyle:'italic',color: isExceeded ? '#c00' : liveBal < 0 ? '#b30000' : '#444'}}>
                        Cur Bal: {fmt(absBal)} {balType}
                        {isExceeded && <span style={{marginLeft:6,color:'#c00',fontWeight:'bold',fontStyle:'normal'}}>⚠ OD Exceeded!</span>}
                      </div>
                    );
                  })()}

                  {/* Line 3: On Account / Agst Ref line (indented 25px) */}
                  {entry.ledgerName && entry.amount > 0 && (
                    <div style={{paddingLeft:25,marginTop:2,fontSize:11,color:'#333',fontWeight:'500'}}>
                      {activeVoucher === 'Journal'
                        ? (entry.entryType === 'Dr' ? 'By' : 'To')
                        : 'On Account'
                      } &nbsp;&nbsp;&nbsp;&nbsp; {fmt(entry.amount)} {entry.entryType}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Ledger Entry Button */}
            <div
              style={{padding:'8px 20px',color:'#1c5282',fontSize:12,fontWeight:'bold',cursor:'pointer'}}
              onClick={() => {
                // Journal: alternate Dr/Cr. Contra: Cr. Receipt: Cr. Others: Dr.
                let defaultType: 'Dr' | 'Cr';
                if (activeVoucher === 'Journal') {
                  const lastType = accEntries[accEntries.length - 1]?.entryType || 'Dr';
                  defaultType = lastType === 'Dr' ? 'Cr' : 'Dr';
                } else {
                  defaultType = (activeVoucher === 'Receipt' || activeVoucher === 'Contra') ? 'Cr' : 'Dr';
                }
                setAccEntries(p => [...p, { ledgerId: 0, ledgerName: '', amount: 0, entryType: defaultType }]);
              }}
            >
              + Add Particulars Entry
            </div>
          </div>

          {/* Bottom Total Bar */}
          {activeVoucher === 'Journal' ? (
            // Journal: Show Dr and Cr totals separately with balance indicator
            <div style={{
              padding:'8px 20px',
              borderTop:'1px solid #777',
              background:'#f5efe6'
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <div style={{display:'flex',gap:24}}>
                  <span style={{fontSize:12,fontWeight:'bold',color:'#1a7a4a'}}>
                    Total By (Dr): ₹ {fmt(accDr)}
                  </span>
                  <span style={{fontSize:12,fontWeight:'bold',color:'#8B0000'}}>
                    Total To (Cr): ₹ {fmt(accCr)}
                  </span>
                </div>
                <div style={{
                  fontSize:13,fontWeight:'bold',
                  color: Math.abs(accDr - accCr) < 0.01 ? '#1a7a4a' : '#c00',
                  background: Math.abs(accDr - accCr) < 0.01 ? '#e8f5e9' : '#fff0f0',
                  border: `1px solid ${Math.abs(accDr - accCr) < 0.01 ? '#4caf50' : '#f44336'}`,
                  padding:'3px 12px', borderRadius:3
                }}>
                  {Math.abs(accDr - accCr) < 0.01
                    ? '✓ Balanced'
                    : `Diff: ₹${fmt(Math.abs(accDr - accCr))} ${accDr > accCr ? 'Dr' : 'Cr'} excess`
                  }
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              display:'flex',
              alignItems:'center',
              justifyContent:'space-between',
              padding:'8px 20px',
              borderTop:'1px solid #777',
              background:'#f5efe6'
            }}>
              <div style={{fontSize:12,fontWeight:'bold',color:'#333'}}>
                Total Particulars: ₹ {fmt(accDr || accCr)}
              </div>
              <div style={{
                fontSize:16,
                fontWeight:'bold',
                color:'#000',
                borderTop:'1px solid #666',
                borderBottom:'3px double #666',
                padding:'2px 8px'
              }}>
                ₹ {fmt(accDr || accCr)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Narration + Save */}
      <div style={{background:'#eef',padding:'8px 15px',borderTop:'1px solid #ccc'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <label style={{width:100,fontSize:12,fontWeight:'bold'}}>Narration</label><span className="colon">:</span>
          <textarea id="v-narration" className="form-input" style={{flex:1,height:36,fontSize:12}} value={narration} onChange={e=>setNarration(e.target.value)} placeholder="Enter narration..."
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.getElementById('btn-save-voucher')?.focus();}}}/>
          <button id="btn-save-voucher" style={{background:vc,color:'white',border:'none',padding:'8px 20px',cursor:'pointer',fontWeight:'bold',fontSize:13}} onClick={handleSave}>
            {activeAlterItem ? '✓ Update (Ctrl+A)' : '✓ Save (Ctrl+A)'}
          </button>
          {activeAlterItem && (
            <button style={{background:'#c00',color:'white',border:'none',padding:'8px 20px',cursor:'pointer',fontWeight:'bold',fontSize:13}} onClick={()=>setShowDeleteConfirm(true)}>
              ✗ Delete (Alt+D)
            </button>
          )}
        </div>
      </div>

      {/* ===== DELETE CONFIRM MODAL ===== */}
      {showDeleteConfirm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',border:'2px solid #c00',padding:'0',width:260,boxShadow:'0 10px 40px rgba(0,0,0,0.4)'}}>
            <div style={{background:'#c00',color:'white',padding:'6px 12px',fontWeight:'bold',fontSize:13,textAlign:'center'}}>Delete?</div>
            <div style={{padding:'20px',textAlign:'center'}}>
              <div style={{display:'flex',justifyContent:'center',gap:25}}>
                <div style={{
                  padding:'6px 20px', border:deleteConfirmSel==='yes'?'2px solid #c00':'2px solid #ddd',
                  background:deleteConfirmSel==='yes'?'#fff5f5':'#fff', cursor:'pointer', fontWeight:'bold',
                  color:deleteConfirmSel==='yes'?'#c00':'#666', borderRadius:2, transition:'all 0.1s'
                }} onClick={()=>{onDelete(activeAlterItem.id); setShowDeleteConfirm(false);}}>Yes</div>
                <div style={{
                  padding:'6px 20px', border:deleteConfirmSel==='no'?'2px solid #333':'2px solid #ddd',
                  background:deleteConfirmSel==='no'?'#f0f0f0':'#fff', cursor:'pointer', fontWeight:'bold',
                  color:deleteConfirmSel==='no'?'#333':'#666', borderRadius:2, transition:'all 0.1s'
                }} onClick={()=>setShowDeleteConfirm(false)}>No</div>
              </div>
              <div style={{marginTop:15,fontSize:10,color:'#888'}}>Use ← → arrows and Enter</div>
            </div>
          </div>
        </div>
      )}

      {/* Side list panel */}
      {focus && ['party','item','accledger','addl-ledger'].includes(focus.field) && (
        <div style={{position:'absolute',top:0,right:0,bottom:0,width:320,background:'#dde4f0',zIndex:100,borderLeft:`2px solid ${vc}`,display:'flex',flexDirection:'column'}}>
          <div style={{background:vc,color:'white',padding:'8px 15px',fontWeight:'bold',fontSize:13}}>
            List of {focus.field==='item'?'Stock Items':'Ledgers'}
          </div>
          <div style={{padding:'4px 15px',color:'#8B4000',fontSize:11,fontWeight:'bold',cursor:'pointer',background:'#fffbe6',borderBottom:'1px solid #f0d060'}}
            onMouseDown={e=>{
              e.preventDefault();
              const fType = focus.field==='item'?'stockItem':'ledger';
              onAltC({
                fieldType: fType,
                onCreated: (newItem: any) => {
                  if (typeof newItem === 'string') {
                    // Fallback if only name is returned
                    if(focus.field==='item' && focus.rowIdx!==undefined){
                      const nr=[...rows]; nr[focus.rowIdx].itemName=newItem; setRows(nr);
                    } else if(focus.field==='accledger'&&focus.rowIdx!==undefined){
                      const ne=[...accEntries]; ne[focus.rowIdx].ledgerName=newItem; setAccEntries(ne);
                    } else setPartyName(newItem);
                    return;
                  }
                  
                  // Proper object return
                  if(focus.field==='item' && focus.rowIdx!==undefined){
                    const nr=[...rows];
                    const gst = newItem.gstRate || 18;
                    nr[focus.rowIdx] = {
                      ...nr[focus.rowIdx],
                      itemId: newItem.id,
                      itemName: newItem.name,
                      unit: typeof newItem.unit === 'string' ? newItem.unit : (newItem.unit as any)?.symbol || (newItem.unit as any)?.name || 'Nos',
                      gstRate: gst,
                      hsnCode: newItem.hsnCode || '',
                      rateInclTax: (nr[focus.rowIdx].rate || 0) * (1 + gst / 100)
                    };
                    setRows(nr);
                  } else if(focus.field==='accledger'&&focus.rowIdx!==undefined){
                    const ne=[...accEntries];
                    ne[focus.rowIdx] = { ...ne[focus.rowIdx], ledgerId: newItem.id, ledgerName: newItem.name };
                    setAccEntries(ne);
                  } else {
                    setPartyName(newItem.name);
                    setPartyBalance(getLedgerClosingBalance(newItem, vouchers));
                  }
                }
              });
            }}>
            ⚡ Alt+C: Create New {focus.field==='item'?'Stock Item':'Ledger'}
          </div>
          <div ref={listRef} style={{flex:1,overflowY:'auto',padding:'4px 0'}}>
            {/* End of List — Available at top for item, addl-ledger, and accledger */}
            {(focus.field==='item' || focus.field==='addl-ledger' || focus.field==='accledger') && (
              <div
                onMouseDown={e=>{
                  e.preventDefault();
                  if (focus.field==='item') goToAdditionalLedgers();
                  else goToNarration();
                }}
                style={{
                  padding:'5px 18px',cursor:'pointer',
                  background: (listSel === 0 && (!filter || filter.trim()==='')) ? '#ffc436' : (isEndOfItem ? '#ffc436' : 'transparent'),
                  fontWeight: (listSel === 0 && (!filter || filter.trim()==='')) ? 'bold' : (isEndOfItem ? 'bold' : 'normal'),
                  fontSize:13, color:'#8B0000',
                  borderBottom:'1px solid #ddd',
                }}
              >
                End of List
              </div>
            )}
            {(currentList as any[]).map((it,i) => {
              const hasTopEnd = (focus.field==='item' || focus.field==='addl-ledger' || focus.field==='accledger');
              const itemSelIndex = hasTopEnd && (!filter || filter.trim() === '') ? i + 1 : i;
              const isSelected = listSel === itemSelIndex;

              return (
                <div
                  key={i}
                  onMouseDown={e => {
                    e.preventDefault();
                    if (focus.field==='item') pickItem(it as StockItem);
                    else pickLedger(it as Ledger);
                  }}
                  style={{
                    padding:'5px 18px',
                    cursor:'pointer',
                    background: isSelected ? '#ffc436' : 'transparent',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    fontSize:13
                  }}
                >
                  {it && 'name' in (it as any) ? (it as any).name : 'Unknown Item'}
                  {focus.field==='item' && (() => {
                    const item = it as StockItem;
                    const unitStr = typeof item.unit === 'string' ? item.unit : (item.unit as any)?.symbol || (item.unit as any)?.name || 'Nos';
                    let totalQty = Number(item.openingQty) || 0;
                    if (vouchers && vouchers.length > 0) {
                      vouchers.forEach(v => {
                        if (v.inventoryEntries) {
                          v.inventoryEntries.forEach(ie => {
                            if (ie.itemId === item.id || (ie.itemName && ie.itemName.trim().toLowerCase() === item.name.trim().toLowerCase())) {
                              if (['Purchase', 'Credit Note'].includes(v.type)) totalQty += (Number(ie.qty) || 0);
                              else if (['Sales', 'Debit Note'].includes(v.type)) totalQty -= (Number(ie.qty) || 0);
                            }
                          });
                        }
                      });
                    }
                    const isNegative = totalQty < 0;
                    return (
                      <span style={{float:'right',fontSize:11,fontWeight:'bold',color: isNegative ? '#c00' : '#00555a',opacity: isNegative ? 1 : 0.85}}>
                        {isNegative ? '-' : ''}{fmt(totalQty)} {unitStr}
                      </span>
                    );
                  })()}
                  {focus.field!=='item' && 'openingBalance' in (it as any) && (() => {
                    const l = it as Ledger;
                    const closingBal = getLedgerClosingBalance(l, vouchers);
                    const absBal = Math.abs(closingBal);
                    const balType = closingBal >= 0 ? 'Dr' : 'Cr';
                    return (
                      <span style={{float:'right',fontSize:11,fontWeight:'bold',color: closingBal < 0 ? '#b30000' : '#00555a',opacity:0.85}}>
                        {fmt(absBal)} {balType}
                      </span>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== PARTY DETAILS MODAL ===== */}
      {showPartyDetails && partyDetails && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#f0f4f8',border:'2px solid #1c5282',width:740,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 8px 30px rgba(0,0,0,0.35)'}}>
            <div style={{background:'#1c5282',color:'white',padding:'8px 18px',fontWeight:'bold',fontSize:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>Party Details</span>
              <span style={{fontSize:11,opacity:0.8}}>Enter: Next Field | Backspace: Prev | Esc: Skip</span>
            </div>
            <div style={{padding:'15px 18px'}} className="party-detail-modal">
              {/* Two-column: Buyer (Bill to) | Consignee (Ship to) */}
              <div 
                style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0,border:'1px solid #aaa'}}
                onKeyDown={e=>modalKeyDown(e,'party-detail-modal',()=>{setShowPartyDetails(false);focusRefAfterModal();})}
              >
                {/* LEFT: Buyer */}
                <div style={{borderRight:'1px solid #aaa',padding:'10px 14px'}}>
                  <div style={{fontWeight:'bold',fontSize:12,color:'#1c5282',marginBottom:8,borderBottom:'1px solid #ccc',paddingBottom:4}}>Buyer (Bill to)</div>
                  {([
                    ['Name','buyerName'],['Mailing Name','buyerMailingName'],['Address','buyerAddress'],
                    ['State','buyerState'],['Country','buyerCountry'],['GSTIN/UIN','buyerGstin'],['Place of Supply','buyerPlace'],
                    ['Buyer\'s Order No.','buyerOrderNo'],['Dated','buyerOrderDate'],
                  ] as [string,keyof PartyDetails][]).map(([label,key],ki)=>(
                    <div key={key} style={{display:'flex',marginBottom:5,alignItems:'flex-start'}}>
                      <span style={{width:130,fontSize:11,color:'#555',flexShrink:0}}>{label}</span>
                      <span style={{fontSize:11,marginRight:4}}>:</span>
                      <input
                        ref={ki===0 ? partyDetailFirstRef : undefined}
                        type="text"
                        style={{flex:1,border:'1px solid #ccc',padding:'2px 5px',fontSize:11,fontWeight:key==='buyerName'?'bold':'normal',background:'#fff',outline:'none'}}
                        value={partyDetails[key] as string}
                        onChange={e=>{const v=e.target.value;setPartyDetails(p=>p?{...p,[key]:v}:p);}}
                        onFocus={e=>(e.target.style.border='1px solid #1c5282')}
                        onBlur={e=>(e.target.style.border='1px solid #ccc')}
                      />
                    </div>
                  ))}
                </div>
                {/* RIGHT: Ship to */}
                <div style={{padding:'10px 14px'}}>
                  <div style={{fontWeight:'bold',fontSize:12,color:'#1c5282',marginBottom:8,borderBottom:'1px solid #ccc',paddingBottom:4}}>Consignee (Ship to)</div>
                  {([
                    ['Name','shipName'],['Mailing Name','shipMailingName'],['Address','shipAddress'],
                    ['State','shipState'],['Country','shipCountry'],['GSTIN/UIN','shipGstin'],['Place of Supply','shipPlace'],
                    ['Terms of Delivery','termsOfDelivery'],
                  ] as [string,keyof PartyDetails][]).map(([label,key])=>(
                    <div key={key} style={{display:'flex',marginBottom:5,alignItems:'flex-start'}}>
                      <span style={{width:130,fontSize:11,color:'#555',flexShrink:0}}>{label}</span>
                      <span style={{fontSize:11,marginRight:4}}>:</span>
                      <input
                        type="text"
                        style={{flex:1,border:'1px solid #ccc',padding:'2px 5px',fontSize:11,fontWeight:key==='shipName'?'bold':'normal',background:'#fff',outline:'none'}}
                        value={partyDetails[key] as string}
                        onChange={e=>{const v=e.target.value;setPartyDetails(p=>p?{...p,[key]:v}:p);}}
                        onFocus={e=>(e.target.style.border='1px solid #1c5282')}
                        onBlur={e=>(e.target.style.border='1px solid #ccc')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{background:'#e8eef4',padding:'8px 18px',display:'flex',justifyContent:'flex-end',gap:10,borderTop:'1px solid #ccd'}}>
              <button className="party-detail-modal-accept-btn" style={{background:'#1c5282',color:'white',border:'none',padding:'6px 22px',cursor:'pointer',fontWeight:'bold',fontSize:12}}
                onClick={()=>{setShowPartyDetails(false);setShowDispatch(true);}}>
                ✓ Accept (A)
              </button>
              <button style={{padding:'6px 18px',cursor:'pointer',border:'1px solid #ccc',fontSize:12}}
                onClick={()=>{setShowPartyDetails(false);focusRefAfterModal();}}>
                Esc: Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DISPATCH DETAILS MODAL ===== */}
      {showDispatch && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#f0f4f8',border:'2px solid #1c5282',width:760,boxShadow:'0 8px 30px rgba(0,0,0,0.35)'}}>
            <div style={{background:'#1c5282',color:'white',padding:'9px 18px',fontWeight:'bold',fontSize:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>Dispatch Details</span>
              <span style={{fontSize:11,opacity:0.8}}>Enter: Next Field | Backspace: Prev | Esc: Skip</span>
            </div>
            <div 
              style={{padding:'16px 20px'}} 
              className="dispatch-detail-modal"
              onKeyDown={e=>modalKeyDown(e,'dispatch-detail-modal',()=>{setShowDispatch(false);focusRefAfterModal();})}
            >
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',columnGap:24,rowGap:10}}>
                {[
                  [['Delivery Note No(s)','deliveryNoteNo'], ['Dispatch Doc No.','dispatchDocNo']],
                  [['Dispatched through','dispatchedThrough'], ['Destination','destination']],
                  [['Carrier Name/Agent','carrierNameAgent'], ['Motor Vehicle No.','motorVehicleNo']],
                  [['Bill of Lading/LR-RR No.','billOfLadingNo'], ['Date','billOfLadingDate']],
                ].map(([left, right], ri) => (
                  <React.Fragment key={ri}>
                    <div style={{display:'flex',alignItems:'center'}}>
                      <span style={{width:162,fontSize:11,color:'#333',flexShrink:0}}>{left[0]}</span>
                      <span style={{fontSize:11,marginRight:5,color:'#666'}}>:</span>
                      <input
                        ref={ri===0 ? dispatchFirstRef : undefined}
                        type="text"
                        style={{flex:1,minWidth:0,border:'1px solid #bbb',padding:'4px 7px',fontSize:11,background:'#fff',outline:'none'}}
                        value={(dispatchDetails as any)?.[left[1]]||''}
                        onChange={e=>{const v=e.target.value;setDispatchDetails(p=>({...(p||{deliveryNoteNo:'',dispatchDocNo:'',dispatchedThrough:'',destination:'',carrierNameAgent:'',billOfLadingNo:'',billOfLadingDate:'',motorVehicleNo:''}),[left[1]]:v}));}}
                        onFocus={e=>{e.target.style.border='1px solid #1c5282';e.target.style.background='#fffff0';}}
                        onBlur={e=>{e.target.style.border='1px solid #bbb';e.target.style.background='#fff';}}
                      />
                    </div>
                    <div style={{display:'flex',alignItems:'center'}}>
                      <span style={{width:145,fontSize:11,color:'#333',flexShrink:0}}>{right[0]}</span>
                      <span style={{fontSize:11,marginRight:5,color:'#666'}}>:</span>
                      <input
                        type="text"
                        style={{flex:1,minWidth:0,border:'1px solid #bbb',padding:'4px 7px',fontSize:11,background:'#fff',outline:'none'}}
                        value={(dispatchDetails as any)?.[right[1]]||''}
                        onChange={e=>{const v=e.target.value;setDispatchDetails(p=>({...(p||{deliveryNoteNo:'',dispatchDocNo:'',dispatchedThrough:'',destination:'',carrierNameAgent:'',billOfLadingNo:'',billOfLadingDate:'',motorVehicleNo:''}),[right[1]]:v}));}}
                        onFocus={e=>{e.target.style.border='1px solid #1c5282';e.target.style.background='#fffff0';}}
                        onBlur={e=>{e.target.style.border='1px solid #bbb';e.target.style.background='#fff';}}
                      />
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div style={{background:'#dde4f0',padding:'10px 20px',display:'flex',justifyContent:'flex-end',gap:10,borderTop:'2px solid #b0bedc'}}>
              <button className="dispatch-detail-modal-accept-btn" style={{background:'#1c5282',color:'white',border:'none',padding:'7px 26px',cursor:'pointer',fontWeight:'bold',fontSize:12}}
                onClick={()=>{setShowDispatch(false);focusRefAfterModal();}}>
                ✓ Accept (A)
              </button>
              <button style={{padding:'7px 18px',cursor:'pointer',border:'1px solid #aaa',fontSize:12,background:'#fff'}}
                onClick={()=>{setShowDispatch(false);focusRefAfterModal();}}>
                Esc: Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PRINT PROMPT MODAL ===== */}
      {showPrintPrompt && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#f0f4f8',border:'2px solid #1c5282',width:380,boxShadow:'0 8px 30px rgba(0,0,0,0.35)'}}>
            <div style={{background:'#1c5282',color:'white',padding:'8px 15px',fontWeight:'bold',fontSize:13,display:'flex',justifyContent:'space-between'}}>
              <span>Voucher Accepted</span>
              <span>Y: Yes | N: No</span>
            </div>
            <div style={{padding:'20px',fontSize:13,whiteSpace:'pre-wrap',color:'#333',textAlign:'center'}}>
              <div style={{color:'#1a7a4a',fontWeight:'bold',marginBottom:10,fontSize:14}}>✓ {showPrintPrompt.msg}</div>
              <div style={{fontSize:15,fontWeight:'bold',color:'#1c5282'}}>Print? Yes or No</div>
            </div>
            <div style={{background:'#dde4f0',padding:'15px',display:'flex',justifyContent:'center',gap:25,borderTop:'1px solid #ccd'}}>
               <button onClick={() => { onPrintPreview(showPrintPrompt.voucher); clearVoucherForm(); }}
                   style={{
                     background:printPromptSel==='yes'?'#1c5282':'#fff', 
                     color:printPromptSel==='yes'?'white':'#333', 
                     border:printPromptSel==='yes'?'2px solid #1c5282':'1px solid #ccc',
                     padding:'6px 20px', cursor:'pointer', fontWeight:'bold', outline:'none'
                   }}>Yes (Y)</button>
               <button onClick={() => clearVoucherForm()}
                   style={{
                     background:printPromptSel==='no'?'#1c5282':'#fff', 
                     color:printPromptSel==='no'?'white':'#333', 
                     border:printPromptSel==='no'?'2px solid #1c5282':'1px solid #ccc',
                     padding:'6px 20px', cursor:'pointer', fontWeight:'bold', outline:'none'
                   }}>No (N)</button>
            </div>
          </div>
        </div>
      )}
      {/* ===== JOURNAL VOUCHER EXAMPLES SIDE PANEL ===== */}
      {showJournalHelp && activeVoucher === 'Journal' && (
        <div style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: 460,
          maxWidth: '92vw',
          background: '#ffffff',
          boxShadow: '-6px 0 25px rgba(0,0,0,0.3)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'sans-serif',
          borderLeft: '4px solid #00555a'
        }}>
          {/* Panel Header */}
          <div style={{
            background: '#00555a',
            color: '#fff',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 'bold', display:'flex', alignItems:'center', gap:6 }}>
                <span>📚</span> Journal Voucher Examples
              </h3>
              <span style={{ fontSize: 11, opacity: 0.9 }}>By (Dr) = Debit | To (Cr) = Credit</span>
            </div>
            <button
              onClick={() => setShowJournalHelp(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                width: 28,
                height: 28,
                borderRadius: '50%',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: 16
              }}
              title="Close Panel (Esc)"
            >✕</button>
          </div>

          {/* Search Bar */}
          <div style={{ padding: '10px 14px', background: '#f5efe6', borderBottom: '1px solid #ddd' }}>
            <input
              type="text"
              placeholder="🔍 Search example (Rent, Salary, Depreciation, Loan...)"
              value={journalExampleSearch}
              onChange={e => setJournalExampleSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px',
                fontSize: 12,
                border: '1px solid #ccc',
                borderRadius: 4,
                outline: 'none',
                background: '#fff'
              }}
            />
          </div>

          {/* Scrollable Examples List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', background: '#faf8f5' }}>
            {/* Accounting Formula Banner */}
            <div style={{
              background: '#e8f5e9',
              border: '1px solid #a5d6a7',
              borderRadius: 4,
              padding: '8px 12px',
              marginBottom: 14,
              fontSize: 11,
              color: '#1b5e20'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: 3 }}>⚡ Key Accounting Rules:</div>
              <div>• <b>By / Debit (Dr)</b>: Asset or Expense increases</div>
              <div>• <b>To / Credit (Cr)</b>: Liability, Income or Capital increases</div>
              <div>• <b>Validation</b>: Total By (Dr) = Total To (Cr)</div>
            </div>

            {JOURNAL_EXAMPLES_DATA.map((cat, cIdx) => {
              const filteredItems = cat.items.filter(item => {
                if (!journalExampleSearch.trim()) return true;
                const q = journalExampleSearch.toLowerCase();
                return item.title.toLowerCase().includes(q) ||
                  item.entries.some(e => e.ledger.toLowerCase().includes(q) || e.group.toLowerCase().includes(q)) ||
                  (item.note && item.note.toLowerCase().includes(q));
              });

              if (filteredItems.length === 0) return null;

              return (
                <div key={cIdx} style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: '#00555a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    margin: '0 0 8px 0',
                    paddingBottom: 4,
                    borderBottom: '2px solid #00555a'
                  }}>
                    {cat.category}
                  </div>

                  {filteredItems.map((item, iIdx) => (
                    <div key={iIdx} style={{
                      background: '#fff',
                      border: '1px solid #e0d8c8',
                      borderRadius: 5,
                      padding: '10px 12px',
                      marginBottom: 10,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 'bold', color: '#222' }}>{item.title}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            const token = authClient.getToken();
                            const cid = activeCompany?.id || 0;
                            // Auto-create missing ledgers in DB and local state
                            for (const e of item.entries) {
                              const exists = ledgers.some(l => l.name.trim().toLowerCase() === e.ledger.trim().toLowerCase());
                              if (!exists) {
                                try {
                                  const res = await fetch('/api/ledgers', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify({
                                      companyId: cid,
                                      name: e.ledger,
                                      groupName: e.group || 'Primary',
                                      openingBalance: 0,
                                      balanceType: e.type.includes('Dr') ? 'Dr' : 'Cr'
                                    })
                                  });
                                  if (res.ok) {
                                    const resData = await res.json();
                                    if (resData.ledger) {
                                      ledgers.push(resData.ledger);
                                    }
                                  }
                                } catch (err) {
                                  console.warn("Auto-create ledger error:", err);
                                }
                              }
                            }
                            // Populate entries with amount 0 so user can enter amount manually
                            const newEntries = item.entries.map(e => {
                              const found = ledgers.find(l => l.name.trim().toLowerCase() === e.ledger.trim().toLowerCase());
                              return {
                                ledgerId: found?.id || 0,
                                ledgerName: found?.name || e.ledger,
                                amount: 0,
                                entryType: (e.type.includes('Dr') ? 'Dr' : 'Cr') as 'Dr' | 'Cr'
                              };
                            });
                            setAccEntries(newEntries);
                            setShowJournalHelp(false);
                            setTimeout(() => {
                              document.getElementById('acc-amt-0-Dr')?.focus() || document.getElementById('acc-amt-0-Cr')?.focus();
                            }, 100);
                          }}
                          style={{
                            background: '#1a7a4a',
                            color: '#fff',
                            border: 'none',
                            padding: '3px 10px',
                            fontSize: 10,
                            fontWeight: 'bold',
                            borderRadius: 3,
                            cursor: 'pointer',
                            flexShrink: 0,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                          }}
                          title="Click to auto-fill ledgers (Amount = 0)"
                        >
                          ⚡ Auto Fill
                        </button>
                      </div>

                      <div style={{ background: '#fdfbf7', border: '1px solid #efe8da', borderRadius: 4, padding: '6px 8px' }}>
                        {item.entries.map((entry, eIdx) => (
                          <div key={eIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, color: '#333' }}>
                            <div>
                              <span style={{
                                fontWeight: 'bold',
                                color: entry.type.includes('Dr') ? '#1a7a4a' : '#8B0000',
                                minWidth: 48,
                                display: 'inline-block'
                              }}>
                                {entry.type}
                              </span>
                              <span style={{ fontWeight: '600' }}>{entry.ledger}</span>
                              <span style={{ color: '#666', fontStyle: 'italic', marginLeft: 4 }}>({entry.group})</span>
                            </div>
                            <span style={{ fontWeight: 'bold', color: '#888' }}>₹0.00</span>
                          </div>
                        ))}
                      </div>

                      {item.note && (
                        <div style={{ fontSize: 10, color: '#555', fontStyle: 'italic', marginTop: 6, paddingLeft: 6, borderLeft: '2px solid #00555a' }}>
                          💡 {item.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Panel Footer */}
          <div style={{ padding: '8px 14px', background: '#f5efe6', borderTop: '1px solid #ddd', fontSize: 11, color: '#555', textAlign: 'center' }}>
            Click <b>⚡ Auto Fill</b> on any example to load it directly!
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== REPORTS ====================

// ==================== BALANCE SHEET VIEW — FULLY FUNCTIONAL ====================
function BalanceSheetView({
  ledgers, vouchers, currentPeriod, onBack, onDrillDownLedger, onDrillDownGroup, onDrillDownVoucher
}: {
  ledgers: Ledger[]; vouchers: Voucher[];
  currentPeriod?: {start:string;end:string};
  onBack: ()=>void;
  onDrillDownLedger: (id:number)=>void;
  onDrillDownGroup: (name:string)=>void;
  onDrillDownVoucher?: (v:Voucher)=>void;
}) {
  const grp = useMemo(()=>groupLedgersByParent(ledgers,vouchers),[ledgers,vouchers]);
  const [expanded, setExpanded] = useState<Record<string,boolean>>({});
  const toggleGroup = (name:string) => setExpanded(p=>({...p,[name]:!p[name]}));
  const [rowIdx, setRowIdx] = useState(0);
  const [col, setCol] = useState<'left'|'right'>('left');

  // ---- TALLY STANDARD GROUP CLASSIFICATIONS ----
  const liabGroups  = ['Capital Account','Reserves & Surplus','Retained Earnings','Secured Loans','Unsecured Loans','Loans (Liability)','Sundry Creditors','Current Liabilities','Provisions','Duties & Taxes','Branch / Divisions'];
  const assetGroups = ['Fixed Assets','Investments','Deposits (Asset)','Loans & Advances (Asset)','Stock-in-hand','Sundry Debtors','Cash-in-hand','Bank Accounts','Bank OD A/c','Current Assets','Misc. Expenses (ASSET)'];
  const incomeGroups = ['Sales Accounts','Direct Incomes','Indirect Incomes','Income (Direct)','Income (Indirect)'];
  const expenseGroups = ['Purchase Accounts','Direct Expenses','Indirect Expenses','Expenses (Direct)','Expenses (Indirect)'];

  // ---- CALCULATIONS ----
  const getGroupTotal = (groupNames: string[]) =>
    groupNames.reduce((s, gn) => s + (grp[gn]||[]).reduce((gs,x)=>gs+x.balance,0), 0);

  const totalIncome   = getGroupTotal(incomeGroups);
  const totalExpense  = getGroupTotal(expenseGroups);
  const netProfit = Math.abs(totalIncome) - Math.abs(totalExpense); // positive = profit

  const totalLiabRaw = getGroupTotal(liabGroups);
  const totalAssetRaw = getGroupTotal(assetGroups);

  const totalLiabDisplay = Math.abs(totalLiabRaw) + (netProfit > 0 ? netProfit : 0);
  const totalAssetDisplay = Math.abs(totalAssetRaw) + (netProfit < 0 ? Math.abs(netProfit) : 0);
  const balanced = Math.abs(totalLiabDisplay - totalAssetDisplay) < 1;

  // Build rows
  type BSRow = { type:'group'|'ledger'; name:string; amount:number; id?:number; };
  const buildSide = (groupNames: string[]): BSRow[] => {
    const rows: BSRow[] = [];
    for (const gn of groupNames) {
      const items = (grp[gn]||[]).filter(x=>x.balance!==0);
      if (!items.length) continue;
      const total = items.reduce((s,x)=>s+x.balance,0);
      rows.push({type:'group', name:gn, amount:total});
      if (expanded[gn]) {
        for (const item of items) {
          rows.push({type:'ledger', name:item.ledger.name, amount:item.balance, id:item.ledger.id});
        }
      }
    }
    return rows;
  };

  const liabRows  = useMemo(() => {
    const rows = buildSide(liabGroups);
    if (netProfit > 0) {
      rows.push({type:'group', name:`Net Profit (Transferred to P&L)`, amount:-netProfit});
    }
    return rows;
  }, [liabGroups, grp, expanded, netProfit]);

  const assetRows = useMemo(() => {
    const rows = buildSide(assetGroups);
    if (netProfit < 0) {
      rows.push({type:'group', name:`Net Loss (Transferred to P&L)`, amount:netProfit});
    }
    return rows;
  }, [assetGroups, grp, expanded, netProfit]);

  const maxRows = Math.max(liabRows.length, assetRows.length);

  // ---- KEYBOARD NAVIGATION (Up, Down, Left, Right, Enter, Escape) ----
  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.modal-overlay')) return;
      const curMax = col === 'left' ? liabRows.length : assetRows.length;
      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setRowIdx(p => Math.min(p + 1, Math.max(0, curMax - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setRowIdx(p => Math.max(p - 1, 0));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (col === 'right') {
          setCol('left');
          setRowIdx(p => Math.min(p, Math.max(0, liabRows.length - 1)));
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (col === 'left') {
          setCol('right');
          setRowIdx(p => Math.min(p, Math.max(0, assetRows.length - 1)));
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = col === 'left' ? liabRows[rowIdx] : assetRows[rowIdx];
        if (!target) return;
        if (target.type === 'group') {
          toggleGroup(target.name);
          onDrillDownGroup(target.name);
        } else if (target.id) {
          onDrillDownLedger(target.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [liabRows, assetRows, col, rowIdx, onBack, onDrillDownGroup, onDrillDownLedger]);

  const C = {header:'#1c3e5a', subHeader:'#2b6cb0', even:'#fafcff', odd:'#fff', sel:'#ffd700', groupBg:'#e8edf5'};

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#f5f7fa'}}>
      {/* Header */}
      <div style={{background:`linear-gradient(90deg,${C.header},${C.subHeader})`,color:'white',padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <div>
          <div style={{fontSize:16,fontWeight:'bold'}}>📊 Balance Sheet</div>
          <div style={{fontSize:11,opacity:0.8}}>As on: {currentPeriod?.end || new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).replace(/ /g,'-')}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:11,padding:'3px 10px',background: balanced?'#1a7a4a':'#8B0000',borderRadius:3,fontWeight:'bold'}}>
            {balanced ? '✓ Balanced' : `⚠ Diff: ₹${fmt(Math.abs(totalLiabDisplay-totalAssetDisplay))}`}
          </span>
          <button onClick={handlePrint} style={{padding:'3px 12px',background:'rgba(255,255,255,0.2)',color:'white',border:'1px solid rgba(255,255,255,0.4)',borderRadius:3,cursor:'pointer',fontSize:11}}>🖨 Print</button>
          <button onClick={onBack} style={{padding:'3px 12px',background:'rgba(255,255,255,0.15)',color:'white',border:'1px solid rgba(255,255,255,0.4)',borderRadius:3,cursor:'pointer',fontSize:11}}>✕ Close</button>
        </div>
      </div>

      {/* Sub header */}
      <div style={{background:'#fff',borderBottom:'1px solid #dde',padding:'5px 20px',fontSize:11,color:'#555',display:'flex',gap:24}}>
        <span>Total Liabilities: <b style={{color:'#1c5282'}}>₹{fmt(totalLiabDisplay)}</b></span>
        <span>Total Assets: <b style={{color:'#1c5282'}}>₹{fmt(totalAssetDisplay)}</b></span>
        {netProfit>0&&<span>Net Profit: <b style={{color:'#1a7a4a'}}>₹{fmt(netProfit)}</b></span>}
        {netProfit<0&&<span>Net Loss: <b style={{color:'#8B0000'}}>₹{fmt(Math.abs(netProfit))}</b></span>}
        <span style={{marginLeft:'auto',fontSize:10,color:'#888'}}>← ↑ ↓ → Navigate | Enter: Expand / Drill-down | Click ▶ to expand group</span>
      </div>

      {/* Table */}
      <div style={{flex:1,overflowY:'auto',background:'#fff'}}>
        <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed',fontSize:12}}>
          <thead>
            <tr style={{background:C.header,color:'white'}}>
              <th style={{padding:'8px 12px',textAlign:'left',width:'35%',borderRight:'3px solid #fff'}}>LIABILITIES</th>
              <th style={{padding:'8px 12px',textAlign:'right',width:'15%',borderRight:'3px solid #fff'}}>Amount (₹)</th>
              <th style={{padding:'8px 12px',textAlign:'left',width:'35%',borderRight:'1px solid rgba(255,255,255,0.3)'}}>ASSETS</th>
              <th style={{padding:'8px 12px',textAlign:'right',width:'15%'}}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({length:maxRows}).map((_,i)=>{
              const l = liabRows[i];
              const r = assetRows[i];
              const isNetL = l?.name?.includes('Net Profit') || l?.name?.includes('Net Loss');
              const isNetR = r?.name?.includes('Net Profit') || r?.name?.includes('Net Loss');

              const isSelL = col === 'left' && i === rowIdx && !!l;
              const isSelR = col === 'right' && i === rowIdx && !!r;

              return (
                <tr key={i} style={{borderBottom:'1px solid #eee',background:i%2===0?C.even:C.odd}}>
                  {/* Liability side */}
                  <td style={{
                    padding:l?.type==='group'?'6px 8px 6px 12px':'4px 8px 4px 28px',
                    borderRight:'2px solid #dde',
                    fontWeight: isSelL ? 'bold' : (l?.type==='group'?'bold':'normal'),
                    background: isSelL ? C.sel : (isNetL ? '#e8f5e8' : (l?.type==='group'?C.groupBg:'transparent')),
                    color: isSelL ? '#000' : (isNetL ? '#1a7a4a' : 'inherit'),
                    cursor:'pointer',
                    fontSize: l?.type==='group'?12:11,
                  }}
                    onClick={()=>{ setCol('left'); setRowIdx(i); if(!l)return; if(l.type==='group'){toggleGroup(l.name); onDrillDownGroup(l.name);} else if(l.id)onDrillDownLedger(l.id); }}
                    onMouseEnter={()=>{ setCol('left'); setRowIdx(i); }}>
                    {l ? (
                      <span style={{display:'flex',alignItems:'center',gap:4}}>
                        {l.type==='group' && <span style={{fontSize:10,color:'#888'}}>{expanded[l.name]?'▼':'▶'}</span>}
                        {isNetL ? '📈 ' : ''}{l.name}
                      </span>
                    ) : ''}
                  </td>
                  <td style={{
                    textAlign:'right',
                    padding:'6px 12px',
                    fontWeight:'bold',
                    borderRight:'3px solid #1c5282',
                    background: isSelL ? C.sel : (l?.type==='group'?C.groupBg:'transparent'),
                    color: isSelL ? '#000' : (isNetL ? '#1a7a4a' : '#333'),
                  }}>
                    {l ? fmt(Math.abs(l.amount)) : ''}
                  </td>

                  {/* Asset side */}
                  <td style={{
                    padding:r?.type==='group'?'6px 8px 6px 12px':'4px 8px 4px 28px',
                    borderRight:'1px solid #dde',
                    fontWeight: isSelR ? 'bold' : (r?.type==='group'?'bold':'normal'),
                    background: isSelR ? C.sel : (isNetR ? '#fff0f0' : (r?.type==='group'?C.groupBg:'transparent')),
                    color: isSelR ? '#000' : (isNetR ? '#8B0000' : 'inherit'),
                    cursor:'pointer',
                    fontSize: r?.type==='group'?12:11,
                  }}
                    onClick={()=>{ setCol('right'); setRowIdx(i); if(!r)return; if(r.type==='group'){toggleGroup(r.name); onDrillDownGroup(r.name);} else if(r.id)onDrillDownLedger(r.id); }}
                    onMouseEnter={()=>{ setCol('right'); setRowIdx(i); }}>
                    {r ? (
                      <span style={{display:'flex',alignItems:'center',gap:4}}>
                        {r.type==='group' && <span style={{fontSize:10,color:'#888'}}>{expanded[r.name]?'▼':'▶'}</span>}
                        {isNetR ? '📉 ' : ''}{r.name}
                      </span>
                    ) : ''}
                  </td>
                  <td style={{
                    textAlign:'right',
                    padding:'6px 12px',
                    fontWeight:'bold',
                    background: isSelR ? C.sel : (r?.type==='group'?C.groupBg:'transparent'),
                    color: isSelR ? '#000' : (isNetR ? '#8B0000' : '#333'),
                  }}>
                    {r ? fmt(Math.abs(r.amount)) : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{background:C.header,color:'white',fontWeight:'bold',borderTop:'2px solid #999'}}>
              <td style={{padding:'10px 12px',letterSpacing:2}}>G r a n d &nbsp; T o t a l</td>
              <td style={{textAlign:'right',padding:'10px 12px',fontSize:13,borderRight:'3px solid #fff'}}>₹ {fmt(totalLiabDisplay)}</td>
              <td style={{padding:'10px 12px',letterSpacing:2}}>G r a n d &nbsp; T o t a l</td>
              <td style={{textAlign:'right',padding:'10px 12px',fontSize:13}}>₹ {fmt(totalAssetDisplay)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}


// ==================== PROFIT & LOSS VIEW — FULLY FUNCTIONAL ====================
function ProfitLossView({
  ledgers, vouchers, currentPeriod, stockItems = [], onBack, onDrillDownLedger, onDrillDownGroup, onDrillDownVoucher
}: {
  ledgers: Ledger[]; vouchers: Voucher[];
  currentPeriod?: {start:string;end:string};
  stockItems?: StockItem[];
  onBack: ()=>void;
  onDrillDownLedger: (id:number)=>void;
  onDrillDownGroup: (name:string)=>void;
  onDrillDownVoucher?: (v:Voucher)=>void;
}) {
  const grp = useMemo(()=>groupLedgersByParent(ledgers,vouchers),[ledgers,vouchers]);
  const [expanded, setExpanded] = useState<Record<string,boolean>>({
    'Sales Accounts': true,
    'Purchase Accounts': true,
    'Direct Expenses': true,
    'Indirect Expenses': true
  });
  const toggleGroup = (name:string) => setExpanded(p=>({...p,[name]:!p[name]}));
  const [rowIdx, setRowIdx] = useState(0);
  const [col, setCol] = useState<'left'|'right'>('left');

  // Standard group lists
  const directExpGroups   = ['Purchase Accounts','Direct Expenses','Expenses (Direct)'];
  const directIncGroups   = ['Sales Accounts','Direct Incomes','Income (Direct)'];
  const indirectExpGroups = ['Indirect Expenses','Expenses (Indirect)'];
  const indirectIncGroups = ['Indirect Incomes','Income (Indirect)'];

  // Opening & Closing Stock calculations
  const openingStockValue = useMemo(()=>{
    return stockItems.reduce((acc, it) => acc + ((it.openingQty || 0) * (it.openingRate || 0)), 0);
  }, [stockItems]);

  const closingStockValue = useMemo(()=>{
    if (stockItems.length > 0) {
      let totalVal = 0;
      for (const it of stockItems) {
        let qty = it.openingQty || 0;
        let totalCost = (it.openingQty || 0) * (it.openingRate || 0);
        let totalInQty = it.openingQty || 0;
        for (const v of vouchers) {
          for (const ie of (v.inventoryEntries || [])) {
            if (ie.itemId === it.id) {
              if (v.type === 'Purchase' || v.type === 'Credit Note') {
                qty += ie.qty || 0;
                totalCost += (ie.qty || 0) * (ie.rate || 0);
                totalInQty += ie.qty || 0;
              } else if (v.type === 'Sales' || v.type === 'Debit Note') {
                qty -= ie.qty || 0;
              }
            }
          }
        }
        const avgRate = totalInQty > 0 ? (totalCost / totalInQty) : (it.openingRate || 0);
        totalVal += Math.max(0, qty) * avgRate;
      }
      return totalVal;
    }
    const stockLedgers = grp['Stock-in-hand'] || [];
    return stockLedgers.reduce((s, x) => s + Math.abs(x.balance), 0);
  }, [stockItems, vouchers, grp]);

  // Aggregate group amounts
  const sumGroups = (gnList: string[]) =>
    gnList.reduce((s, gn) => s + (grp[gn]||[]).reduce((gs,x)=>gs+Math.abs(x.balance),0), 0);

  const netPurchases = sumGroups(directExpGroups);
  const netSales     = sumGroups(directIncGroups);
  const indExpenses  = sumGroups(indirectExpGroups);
  const indIncomes   = sumGroups(indirectIncGroups);

  const tradingDr = openingStockValue + netPurchases;
  const tradingCr = netSales + closingStockValue;
  const grossProfit = tradingCr - tradingDr;

  const plDr = (grossProfit < 0 ? Math.abs(grossProfit) : 0) + indExpenses;
  const plCr = (grossProfit > 0 ? grossProfit : 0) + indIncomes;
  const netProfit = plCr - plDr;

  const totalTradingBoth = Math.max(tradingDr + (grossProfit > 0 ? grossProfit : 0), tradingCr + (grossProfit < 0 ? Math.abs(grossProfit) : 0));
  const totalPLBoth      = Math.max(plDr + (netProfit > 0 ? netProfit : 0), plCr + (netProfit < 0 ? Math.abs(netProfit) : 0));

  type PLRow = { type:'header'|'group'|'ledger'|'summary'; name:string; amount?:number; id?:number; isHighlight?:boolean; };

  const buildGroupRows = (gnList: string[]): PLRow[] => {
    const rows: PLRow[] = [];
    for (const gn of gnList) {
      const items = (grp[gn]||[]).filter(x=>x.balance!==0);
      if (!items.length) continue;
      const total = items.reduce((s,x)=>s+Math.abs(x.balance),0);
      rows.push({type:'group', name:gn, amount:total});
      if (expanded[gn]) {
        for (const item of items) {
          rows.push({type:'ledger', name:item.ledger.name, amount:Math.abs(item.balance), id:item.ledger.id});
        }
      }
    }
    return rows;
  };

  const tradingLeft = useMemo<PLRow[]>(() => {
    const rows: PLRow[] = [
      {type:'summary', name:'Opening Stock', amount:openingStockValue},
      ...buildGroupRows(directExpGroups),
    ];
    if (grossProfit > 0) {
      rows.push({type:'summary', name:'Gross Profit c/d (Transferred to P&L)', amount:grossProfit, isHighlight:true});
    }
    return rows;
  }, [openingStockValue, grp, expanded, directExpGroups, grossProfit]);

  const tradingRight = useMemo<PLRow[]>(() => {
    const rows: PLRow[] = [
      ...buildGroupRows(directIncGroups),
      {type:'summary', name:'Closing Stock', amount:closingStockValue},
    ];
    if (grossProfit < 0) {
      rows.push({type:'summary', name:'Gross Loss c/d (Transferred to P&L)', amount:Math.abs(grossProfit), isHighlight:true});
    }
    return rows;
  }, [directIncGroups, grp, expanded, closingStockValue, grossProfit]);

  const plLeft = useMemo<PLRow[]>(() => {
    const rows: PLRow[] = [];
    if (grossProfit < 0) {
      rows.push({type:'summary', name:'Gross Loss b/d', amount:Math.abs(grossProfit), isHighlight:true});
    }
    rows.push(...buildGroupRows(indirectExpGroups));
    if (netProfit > 0) {
      rows.push({type:'summary', name:'Net Profit (Transferred to Capital)', amount:netProfit, isHighlight:true});
    }
    return rows;
  }, [grossProfit, indirectExpGroups, grp, expanded, netProfit]);

  const plRight = useMemo<PLRow[]>(() => {
    const rows: PLRow[] = [];
    if (grossProfit > 0) {
      rows.push({type:'summary', name:'Gross Profit b/d', amount:grossProfit, isHighlight:true});
    }
    rows.push(...buildGroupRows(indirectIncGroups));
    if (netProfit < 0) {
      rows.push({type:'summary', name:'Net Loss (Transferred to Capital)', amount:Math.abs(netProfit), isHighlight:true});
    }
    return rows;
  }, [grossProfit, indirectIncGroups, grp, expanded, netProfit]);

  const maxTrading = Math.max(tradingLeft.length, tradingRight.length);
  const maxPL      = Math.max(plLeft.length, plRight.length);

  // Combined flat list for keyboard navigation
  const allLeft = useMemo(() => [...tradingLeft, ...plLeft], [tradingLeft, plLeft]);
  const allRight = useMemo(() => [...tradingRight, ...plRight], [tradingRight, plRight]);

  // Keyboard navigation
  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.modal-overlay')) return;
      const curMax = col === 'left' ? allLeft.length : allRight.length;
      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setRowIdx(p => Math.min(p + 1, Math.max(0, curMax - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setRowIdx(p => Math.max(p - 1, 0));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (col === 'right') {
          setCol('left');
          setRowIdx(p => Math.min(p, Math.max(0, allLeft.length - 1)));
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (col === 'left') {
          setCol('right');
          setRowIdx(p => Math.min(p, Math.max(0, allRight.length - 1)));
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = col === 'left' ? allLeft[rowIdx] : allRight[rowIdx];
        if (!target) return;
        if (target.type === 'group') {
          toggleGroup(target.name);
          onDrillDownGroup(target.name);
        } else if (target.id) {
          onDrillDownLedger(target.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [allLeft, allRight, col, rowIdx, onBack, onDrillDownGroup, onDrillDownLedger]);

  const C = {header:'#8B0000', incHeader:'#006600', groupBg:'#f8f9fa', even:'#fafcff', odd:'#fff', sel:'#ffd700'};

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#f5f7fa'}}>
      {/* Title Bar */}
      <div style={{background:'linear-gradient(90deg,#8B0000,#006600)',color:'white',padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <div>
          <div style={{fontSize:16,fontWeight:'bold'}}>📈 Profit &amp; Loss Account</div>
          <div style={{fontSize:11,opacity:0.8}}>Period: {currentPeriod?.start || '01-Apr-2026'} to {currentPeriod?.end || '31-Mar-2027'}</div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <span style={{fontSize:12,padding:'4px 12px',background:netProfit>=0?'#1a7a4a':'#8B0000',borderRadius:4,fontWeight:'bold'}}>
            {netProfit>=0 ? `✓ Net Profit: ₹${fmt(netProfit)}` : `⚠ Net Loss: ₹${fmt(Math.abs(netProfit))}`}
          </span>
          <button onClick={()=>window.print()} style={{padding:'4px 12px',background:'rgba(255,255,255,0.2)',color:'white',border:'1px solid rgba(255,255,255,0.4)',borderRadius:3,cursor:'pointer',fontSize:11}}>🖨 Print</button>
          <button onClick={onBack} style={{padding:'4px 12px',background:'rgba(255,255,255,0.15)',color:'white',border:'1px solid rgba(255,255,255,0.4)',borderRadius:3,cursor:'pointer',fontSize:11}}>✕ Close</button>
        </div>
      </div>

      {/* Highlights bar */}
      <div style={{background:'#fff',borderBottom:'1px solid #dde',padding:'6px 20px',fontSize:11,display:'flex',gap:24,alignItems:'center'}}>
        <span>Sales: <b style={{color:'#006600'}}>₹{fmt(netSales)}</b></span>
        <span>Purchases: <b style={{color:'#8B0000'}}>₹{fmt(netPurchases)}</b></span>
        <span>Gross Profit: <b style={{color:grossProfit>=0?'#006600':'#8B0000'}}>₹{fmt(Math.abs(grossProfit))}</b></span>
        <span>Indirect Exp: <b style={{color:'#8B0000'}}>₹{fmt(indExpenses)}</b></span>
        <span style={{marginLeft:'auto',fontSize:10,color:'#888'}}>← ↑ ↓ → Navigate | Enter: Drill-down / Expand</span>
      </div>

      {/* Main Table */}
      <div style={{flex:1,overflowY:'auto',background:'#fff'}}>
        <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed',fontSize:12}}>
          <thead>
            <tr>
              <th style={{background:C.header,color:'white',padding:'8px 12px',textAlign:'left',width:'35%',borderRight:'2px solid #fff'}}>PARTICULARS (Debit / Expenses)</th>
              <th style={{background:C.header,color:'white',padding:'8px 12px',textAlign:'right',width:'15%',borderRight:'3px solid #333'}}>Amount (₹)</th>
              <th style={{background:C.incHeader,color:'white',padding:'8px 12px',textAlign:'left',width:'35%',borderRight:'2px solid #fff'}}>PARTICULARS (Credit / Incomes)</th>
              <th style={{background:C.incHeader,color:'white',padding:'8px 12px',textAlign:'right',width:'15%'}}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {/* --- SECTION 1: TRADING ACCOUNT --- */}
            <tr style={{background:'#eef2f7',fontWeight:'bold',fontSize:11,color:'#333'}}>
              <td colSpan={2} style={{padding:'4px 12px',borderRight:'3px solid #1c5282'}}>TRADING ACCOUNT (Direct Costs)</td>
              <td colSpan={2} style={{padding:'4px 12px'}}>TRADING ACCOUNT (Direct Revenues)</td>
            </tr>
            {Array.from({length:maxTrading}).map((_,i)=>{
              const l = tradingLeft[i];
              const r = tradingRight[i];
              const isSelL = col === 'left' && rowIdx === i && !!l;
              const isSelR = col === 'right' && rowIdx === i && !!r;

              return (
                <tr key={'tr-'+i} style={{borderBottom:'1px solid #eee',background:i%2===0?C.even:C.odd}}>
                  {/* Trading Left */}
                  <td style={{
                    padding: l?.type==='group'?'6px 8px 6px 12px': l?.type==='ledger'?'3px 8px 3px 28px':'6px 12px',
                    fontWeight: isSelL ? 'bold' : (l?.type==='ledger'?'normal':'bold'),
                    color: isSelL ? '#000' : (l?.isHighlight?'#006600': l?.type==='ledger'?'#444':'#111'),
                    background: isSelL ? C.sel : (l?.isHighlight?'#e8f5e8': l?.type==='group'?C.groupBg:'transparent'),
                    cursor: l?.type==='ledger'||l?.type==='group'?'pointer':'default',
                    borderRight:'1px solid #eee'
                  }}
                    onClick={()=>{ setCol('left'); setRowIdx(i); if(l?.id) onDrillDownLedger(l.id); else if(l?.type==='group') { toggleGroup(l.name); onDrillDownGroup(l.name); } }}
                    onMouseEnter={()=>{ setCol('left'); setRowIdx(i); }}>
                    {l ? (
                      <span style={{display:'flex',alignItems:'center',gap:4}}>
                        {l.type==='group' && <span style={{fontSize:10,color:'#888'}}>{expanded[l.name]?'▼':'▶'}</span>}
                        {l.isHighlight ? '⭐ ' : ''}{l.name}
                      </span>
                    ) : ''}
                  </td>
                  <td style={{
                    textAlign:'right',
                    padding:'6px 12px',
                    fontWeight:'bold',
                    borderRight:'3px solid #1c5282',
                    background: isSelL ? C.sel : 'transparent',
                    color: isSelL ? '#000' : (l?.isHighlight?'#006600':'inherit')
                  }}>
                    {l?.amount !== undefined ? fmt(l.amount) : ''}
                  </td>

                  {/* Trading Right */}
                  <td style={{
                    padding: r?.type==='group'?'6px 8px 6px 12px': r?.type==='ledger'?'3px 8px 3px 28px':'6px 12px',
                    fontWeight: isSelR ? 'bold' : (r?.type==='ledger'?'normal':'bold'),
                    color: isSelR ? '#000' : (r?.isHighlight?'#8B0000': r?.type==='ledger'?'#444':'#111'),
                    background: isSelR ? C.sel : (r?.isHighlight?'#fff0f0': r?.type==='group'?C.groupBg:'transparent'),
                    cursor: r?.type==='ledger'||r?.type==='group'?'pointer':'default',
                    borderRight:'1px solid #eee'
                  }}
                    onClick={()=>{ setCol('right'); setRowIdx(i); if(r?.id) onDrillDownLedger(r.id); else if(r?.type==='group') { toggleGroup(r.name); onDrillDownGroup(r.name); } }}
                    onMouseEnter={()=>{ setCol('right'); setRowIdx(i); }}>
                    {r ? (
                      <span style={{display:'flex',alignItems:'center',gap:4}}>
                        {r.type==='group' && <span style={{fontSize:10,color:'#888'}}>{expanded[r.name]?'▼':'▶'}</span>}
                        {r.isHighlight ? '⭐ ' : ''}{r.name}
                      </span>
                    ) : ''}
                  </td>
                  <td style={{
                    textAlign:'right',
                    padding:'6px 12px',
                    fontWeight:'bold',
                    background: isSelR ? C.sel : 'transparent',
                    color: isSelR ? '#000' : (r?.isHighlight?'#8B0000':'inherit')
                  }}>
                    {r?.amount !== undefined ? fmt(r.amount) : ''}
                  </td>
                </tr>
              );
            })}
            <tr style={{background:'#f0f4f8',fontWeight:'bold',borderTop:'2px solid #aaa',borderBottom:'2px solid #aaa'}}>
              <td style={{padding:'6px 12px'}}>Total Trading Dr</td>
              <td style={{textAlign:'right',padding:'6px 12px',borderRight:'3px solid #1c5282'}}>₹ {fmt(totalTradingBoth)}</td>
              <td style={{padding:'6px 12px'}}>Total Trading Cr</td>
              <td style={{textAlign:'right',padding:'6px 12px'}}>₹ {fmt(totalTradingBoth)}</td>
            </tr>

            {/* --- SECTION 2: PROFIT & LOSS ACCOUNT --- */}
            <tr style={{background:'#eef2f7',fontWeight:'bold',fontSize:11,color:'#333'}}>
              <td colSpan={2} style={{padding:'4px 12px',borderRight:'3px solid #1c5282'}}>PROFIT &amp; LOSS ACCOUNT (Operating &amp; Indirect Expenses)</td>
              <td colSpan={2} style={{padding:'4px 12px'}}>PROFIT &amp; LOSS ACCOUNT (Operating &amp; Indirect Income)</td>
            </tr>
            {Array.from({length:maxPL}).map((_,i)=>{
              const l = plLeft[i];
              const r = plRight[i];
              const actualIdx = tradingLeft.length + i;
              const isSelL = col === 'left' && rowIdx === actualIdx && !!l;
              const isSelR = col === 'right' && rowIdx === actualIdx && !!r;

              return (
                <tr key={'pl-'+i} style={{borderBottom:'1px solid #eee',background:i%2===0?C.even:C.odd}}>
                  {/* P&L Left */}
                  <td style={{
                    padding: l?.type==='group'?'6px 8px 6px 12px': l?.type==='ledger'?'3px 8px 3px 28px':'6px 12px',
                    fontWeight: isSelL ? 'bold' : (l?.type==='ledger'?'normal':'bold'),
                    color: isSelL ? '#000' : (l?.isHighlight?'#006600': l?.type==='ledger'?'#444':'#111'),
                    background: isSelL ? C.sel : (l?.isHighlight?'#e8f5e8': l?.type==='group'?C.groupBg:'transparent'),
                    cursor: l?.type==='ledger'||l?.type==='group'?'pointer':'default',
                    borderRight:'1px solid #eee'
                  }}
                    onClick={()=>{ setCol('left'); setRowIdx(actualIdx); if(l?.id) onDrillDownLedger(l.id); else if(l?.type==='group') { toggleGroup(l.name); onDrillDownGroup(l.name); } }}
                    onMouseEnter={()=>{ setCol('left'); setRowIdx(actualIdx); }}>
                    {l ? (
                      <span style={{display:'flex',alignItems:'center',gap:4}}>
                        {l.type==='group' && <span style={{fontSize:10,color:'#888'}}>{expanded[l.name]?'▼':'▶'}</span>}
                        {l.isHighlight ? '🏆 ' : ''}{l.name}
                      </span>
                    ) : ''}
                  </td>
                  <td style={{
                    textAlign:'right',
                    padding:'6px 12px',
                    fontWeight:'bold',
                    borderRight:'3px solid #1c5282',
                    background: isSelL ? C.sel : 'transparent',
                    color: isSelL ? '#000' : (l?.isHighlight?'#006600':'inherit')
                  }}>
                    {l?.amount !== undefined ? fmt(l.amount) : ''}
                  </td>

                  {/* P&L Right */}
                  <td style={{
                    padding: r?.type==='group'?'6px 8px 6px 12px': r?.type==='ledger'?'3px 8px 3px 28px':'6px 12px',
                    fontWeight: isSelR ? 'bold' : (r?.type==='ledger'?'normal':'bold'),
                    color: isSelR ? '#000' : (r?.isHighlight?'#8B0000': r?.type==='ledger'?'#444':'#111'),
                    background: isSelR ? C.sel : (r?.isHighlight?'#fff0f0': r?.type==='group'?C.groupBg:'transparent'),
                    cursor: r?.type==='ledger'||r?.type==='group'?'pointer':'default',
                    borderRight:'1px solid #eee'
                  }}
                    onClick={()=>{ setCol('right'); setRowIdx(actualIdx); if(r?.id) onDrillDownLedger(r.id); else if(r?.type==='group') { toggleGroup(r.name); onDrillDownGroup(r.name); } }}
                    onMouseEnter={()=>{ setCol('right'); setRowIdx(actualIdx); }}>
                    {r ? (
                      <span style={{display:'flex',alignItems:'center',gap:4}}>
                        {r.type==='group' && <span style={{fontSize:10,color:'#888'}}>{expanded[r.name]?'▼':'▶'}</span>}
                        {r.isHighlight ? '⚠️ ' : ''}{r.name}
                      </span>
                    ) : ''}
                  </td>
                  <td style={{
                    textAlign:'right',
                    padding:'6px 12px',
                    fontWeight:'bold',
                    background: isSelR ? C.sel : 'transparent',
                    color: isSelR ? '#000' : (r?.isHighlight?'#8B0000':'inherit')
                  }}>
                    {r?.amount !== undefined ? fmt(r.amount) : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{background:'#1c5282',color:'white',fontWeight:'bold',borderTop:'2px solid #333'}}>
              <td style={{padding:'9px 12px',letterSpacing:2}}>T O T A L</td>
              <td style={{textAlign:'right',padding:'9px 12px',fontSize:13,borderRight:'3px solid #fff'}}>₹ {fmt(totalPLBoth)}</td>
              <td style={{padding:'9px 12px',letterSpacing:2}}>T O T A L</td>
              <td style={{textAlign:'right',padding:'9px 12px',fontSize:13}}>₹ {fmt(totalPLBoth)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}


// ==================== TRIAL BALANCE VIEW — FULLY FUNCTIONAL ====================
function TrialBalanceView({
  ledgers, vouchers, currentPeriod, onBack, onDrillDownLedger, onDrillDownGroup, onSaveOpeningBalance
}: {
  ledgers: Ledger[]; vouchers: Voucher[];
  currentPeriod?: {start:string;end:string};
  onBack: ()=>void;
  onDrillDownLedger: (id:number)=>void;
  onDrillDownGroup: (name:string)=>void;
  onSaveOpeningBalance?: (ledgerId:number, ob:number, bt:'Dr'|'Cr')=>Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string,boolean>>({});
  const [rowIdx, setRowIdx] = useState(0);
  const [editId, setEditId] = useState<number|null>(null);
  const [editVal, setEditVal] = useState<string>('');
  const [editType, setEditType] = useState<'Dr'|'Cr'>('Dr');
  const [isSaving, setIsSaving] = useState(false);

  // Group ledgers by groupName
  const groupedData = useMemo(()=>{
    const map: Record<string, {
      ledger: Ledger;
      opDr: number; opCr: number;
      txDr: number; txCr: number;
      clDr: number; clCr: number;
    }[]> = {};

    for (const l of ledgers) {
      const vEntries = getLedgerEntries(l.id, vouchers);
      const txDr = vEntries.filter(e=>e.entry.entryType==='Dr').reduce((s,e)=>s+e.entry.amount, 0);
      const txCr = vEntries.filter(e=>e.entry.entryType==='Cr').reduce((s,e)=>s+e.entry.amount, 0);

      const opDr = l.balanceType === 'Dr' ? (l.openingBalance || 0) : 0;
      const opCr = l.balanceType === 'Cr' ? (l.openingBalance || 0) : 0;

      const netCl = (opDr - opCr) + (txDr - txCr);
      const clDr = netCl > 0 ? netCl : 0;
      const clCr = netCl < 0 ? Math.abs(netCl) : 0;

      const gn = l.groupName || 'Primary';
      if (!map[gn]) map[gn] = [];
      map[gn].push({ ledger:l, opDr, opCr, txDr, txCr, clDr, clCr });
    }
    return map;
  }, [ledgers, vouchers]);

  // Expand all by default if groups <= 15
  useEffect(()=>{
    const allKeys = Object.keys(groupedData);
    const init: Record<string,boolean> = {};
    for (const k of allKeys) init[k] = true;
    setExpanded(init);
  }, [groupedData]);

  // Grand Totals
  const totals = useMemo(()=>{
    let opDr = 0, opCr = 0, txDr = 0, txCr = 0, clDr = 0, clCr = 0;
    for (const rows of Object.values(groupedData)) {
      for (const r of rows) {
        opDr += r.opDr; opCr += r.opCr;
        txDr += r.txDr; txCr += r.txCr;
        clDr += r.clDr; clCr += r.clCr;
      }
    }
    return { opDr, opCr, txDr, txCr, clDr, clCr };
  }, [groupedData]);

  const balanced = Math.abs(totals.clDr - totals.clCr) < 1;

  const toggleAll = (expand: boolean) => {
    const next: Record<string,boolean> = {};
    for (const k of Object.keys(groupedData)) next[k] = expand;
    setExpanded(next);
  };

  const handleStartEdit = (l: Ledger, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditId(l.id);
    setEditVal(String(l.openingBalance || 0));
    setEditType(l.balanceType || 'Dr');
  };

  const handleSaveEdit = async (ledgerId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSaveOpeningBalance) return;
    const num = Math.abs(parseFloat(editVal) || 0);
    setIsSaving(true);
    try {
      await onSaveOpeningBalance(ledgerId, num, editType);
      setEditId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditId(null);
  };

  const filteredGroups = useMemo(()=>{
    if (!search.trim()) return Object.entries(groupedData);
    const q = search.toLowerCase();
    const result: [string, typeof groupedData[string]][] = [];
    for (const [gn, rows] of Object.entries(groupedData)) {
      const matchLedgers = rows.filter(r => r.ledger.name.toLowerCase().includes(q) || gn.toLowerCase().includes(q));
      if (matchLedgers.length) result.push([gn, matchLedgers]);
    }
    return result;
  }, [groupedData, search]);

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => {
    const list: { type: 'group'|'ledger'; groupName: string; ledger?: Ledger; id?: number }[] = [];
    for (const [gn, rows] of filteredGroups) {
      list.push({ type: 'group', groupName: gn });
      if (expanded[gn]) {
        for (const r of rows) {
          list.push({ type: 'ledger', groupName: gn, ledger: r.ledger, id: r.ledger.id });
        }
      }
    }
    return list;
  }, [filteredGroups, expanded]);

  // Keyboard navigation
  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.modal-overlay')) return;
      if (editId !== null) return; // Allow input editing
      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setRowIdx(p => Math.min(p + 1, Math.max(0, flatItems.length - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setRowIdx(p => Math.max(p - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = flatItems[rowIdx];
        if (!target) return;
        if (target.type === 'group') {
          setExpanded(p => ({ ...p, [target.groupName]: !p[target.groupName] }));
          onDrillDownGroup(target.groupName);
        } else if (target.id) {
          onDrillDownLedger(target.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flatItems, rowIdx, editId, onBack, onDrillDownGroup, onDrillDownLedger]);

  let runningFlatIdx = 0;

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#f5f7fa'}}>
      {/* Title Header */}
      <div style={{background:'linear-gradient(90deg,#1c3e5a,#2b6cb0)',color:'white',padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <div>
          <div style={{fontSize:16,fontWeight:'bold'}}>⚖️ Trial Balance</div>
          <div style={{fontSize:11,opacity:0.8}}>Period: {currentPeriod?.start || '01-Apr-2026'} to {currentPeriod?.end || '31-Mar-2027'}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input
            value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="Search ledger..."
            style={{padding:'4px 10px',fontSize:11,borderRadius:4,border:'1px solid rgba(255,255,255,0.4)',background:'rgba(255,255,255,0.15)',color:'white',outline:'none',width:150}}
          />
          <button onClick={()=>toggleAll(true)} style={{padding:'4px 10px',background:'rgba(255,255,255,0.2)',color:'white',border:'none',borderRadius:3,cursor:'pointer',fontSize:11}}>Expand All</button>
          <button onClick={()=>toggleAll(false)} style={{padding:'4px 10px',background:'rgba(255,255,255,0.2)',color:'white',border:'none',borderRadius:3,cursor:'pointer',fontSize:11}}>Collapse All</button>
          <button onClick={()=>window.print()} style={{padding:'4px 10px',background:'rgba(255,255,255,0.2)',color:'white',border:'none',borderRadius:3,cursor:'pointer',fontSize:11}}>🖨 Print</button>
          <button onClick={onBack} style={{padding:'4px 12px',background:'rgba(255,255,255,0.15)',color:'white',border:'1px solid rgba(255,255,255,0.4)',borderRadius:3,cursor:'pointer',fontSize:11}}>✕ Close</button>
        </div>
      </div>

      {/* Sub header */}
      <div style={{background:'#fff',borderBottom:'1px solid #dde',padding:'5px 20px',fontSize:11,display:'flex',gap:24,alignItems:'center'}}>
        <span>Opening Diff: <b style={{color:Math.abs(totals.opDr-totals.opCr)<1?'#1a7a4a':'#8B0000'}}>₹{fmt(Math.abs(totals.opDr-totals.opCr))}</b></span>
        <span>Txns Total: <b style={{color:'#1c5282'}}>₹{fmt(totals.txDr)}</b></span>
        <span>Closing Diff: <b style={{color:balanced?'#1a7a4a':'#8B0000'}}>{balanced ? '✓ 0.00 (Balanced)' : `₹${fmt(Math.abs(totals.clDr-totals.clCr))}`}</b></span>
        <span style={{marginLeft:'auto',fontSize:10,color:'#888'}}>↑ ↓ Navigate | Enter: Expand / Drill-down | Click ✏️ to update Opening Balance</span>
      </div>

      {/* Table */}
      <div style={{flex:1,overflowY:'auto',background:'#fff'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead style={{position:'sticky',top:0,zIndex:2}}>
            <tr style={{background:'#1c5282',color:'white',borderBottom:'2px solid #fff'}}>
              <th rowSpan={2} style={{padding:'6px 12px',textAlign:'left',minWidth:220}}>Particulars</th>
              <th colSpan={2} style={{padding:'4px 10px',textAlign:'center',borderLeft:'1px solid rgba(255,255,255,0.3)',background:'#164268'}}>Opening Balance</th>
              <th colSpan={2} style={{padding:'4px 10px',textAlign:'center',borderLeft:'1px solid rgba(255,255,255,0.3)',background:'#1a507e'}}>Transactions</th>
              <th colSpan={2} style={{padding:'4px 10px',textAlign:'center',borderLeft:'1px solid rgba(255,255,255,0.3)',background:'#164268'}}>Closing Balance</th>
            </tr>
            <tr style={{background:'#1c5282',color:'white'}}>
              <th style={{padding:'4px 10px',textAlign:'right',width:105,borderLeft:'1px solid rgba(255,255,255,0.3)',fontSize:11}}>Debit (₹)</th>
              <th style={{padding:'4px 10px',textAlign:'right',width:105,fontSize:11}}>Credit (₹)</th>
              <th style={{padding:'4px 10px',textAlign:'right',width:105,borderLeft:'1px solid rgba(255,255,255,0.3)',fontSize:11}}>Debit (₹)</th>
              <th style={{padding:'4px 10px',textAlign:'right',width:105,fontSize:11}}>Credit (₹)</th>
              <th style={{padding:'4px 10px',textAlign:'right',width:115,borderLeft:'1px solid rgba(255,255,255,0.3)',fontSize:11}}>Debit (₹)</th>
              <th style={{padding:'4px 10px',textAlign:'right',width:115,fontSize:11}}>Credit (₹)</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.map(([gn, rows]) => {
              const isExp = expanded[gn];
              const grpOpDr = rows.reduce((s,r)=>s+r.opDr, 0);
              const grpOpCr = rows.reduce((s,r)=>s+r.opCr, 0);
              const grpTxDr = rows.reduce((s,r)=>s+r.txDr, 0);
              const grpTxCr = rows.reduce((s,r)=>s+r.txCr, 0);
              const grpClDr = rows.reduce((s,r)=>s+r.clDr, 0);
              const grpClCr = rows.reduce((s,r)=>s+r.clCr, 0);

              const currentGroupIdx = runningFlatIdx++;
              const isGrpSelected = rowIdx === currentGroupIdx;

              return (
                <React.Fragment key={gn}>
                  {/* Group Header Row */}
                  <tr style={{
                    background: isGrpSelected ? '#ffd700' : '#eef3f8',
                    color: isGrpSelected ? '#000' : 'inherit',
                    fontWeight:'bold',
                    cursor:'pointer',
                    borderBottom:'1px solid #dde'
                  }}
                    onClick={()=>{ setRowIdx(currentGroupIdx); setExpanded(p=>({...p,[gn]:!p[gn]})); }}
                    onMouseEnter={()=>setRowIdx(currentGroupIdx)}>
                    <td style={{padding:'6px 12px',color: isGrpSelected ? '#000' : '#1c5282'}}>
                      <span style={{marginRight:6,fontSize:10,color: isGrpSelected ? '#000' : '#666'}}>{isExp ? '▼' : '▶'}</span>
                      {gn}
                      <span style={{fontSize:10,color: isGrpSelected ? '#333' : '#888',fontWeight:'normal',marginLeft:8}}>({rows.length} ledgers)</span>
                    </td>
                    <td style={{textAlign:'right',padding:'6px 10px',borderLeft:'1px solid #dde'}}>{grpOpDr>0?fmt(grpOpDr):'-'}</td>
                    <td style={{textAlign:'right',padding:'6px 10px'}}>{grpOpCr>0?fmt(grpOpCr):'-'}</td>
                    <td style={{textAlign:'right',padding:'6px 10px',borderLeft:'1px solid #dde',color: isGrpSelected ? '#000' : '#8B0000'}}>{grpTxDr>0?fmt(grpTxDr):'-'}</td>
                    <td style={{textAlign:'right',padding:'6px 10px',color: isGrpSelected ? '#000' : '#006600'}}>{grpTxCr>0?fmt(grpTxCr):'-'}</td>
                    <td style={{textAlign:'right',padding:'6px 10px',borderLeft:'1px solid #dde',color: isGrpSelected ? '#000' : '#8B0000'}}>{grpClDr>0?fmt(grpClDr):'-'}</td>
                    <td style={{textAlign:'right',padding:'6px 10px',color: isGrpSelected ? '#000' : '#006600'}}>{grpClCr>0?fmt(grpClCr):'-'}</td>
                  </tr>

                  {/* Ledger Rows */}
                  {isExp && rows.map(r => {
                    const currentLedgerIdx = runningFlatIdx++;
                    const isLedgerSelected = rowIdx === currentLedgerIdx;
                    const isEditing = editId === r.ledger.id;

                    return (
                      <tr key={r.ledger.id}
                        style={{
                          borderBottom:'1px solid #f0f0f0',
                          cursor:'pointer',
                          background: isLedgerSelected ? '#ffd700' : '#fff',
                          color: isLedgerSelected ? '#000' : 'inherit'
                        }}
                        onClick={()=>{ setRowIdx(currentLedgerIdx); if (!isEditing) onDrillDownLedger(r.ledger.id); }}
                        onMouseEnter={()=>setRowIdx(currentLedgerIdx)}>
                        <td style={{padding:'4px 12px 4px 32px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{fontWeight: isLedgerSelected ? 'bold' : 'normal'}}>{r.ledger.name}</span>
                          {!isEditing && onSaveOpeningBalance && (
                            <button
                              onClick={e=>handleStartEdit(r.ledger, e)}
                              title="Update Opening Balance"
                              style={{padding:'1px 6px',fontSize:10,background: isLedgerSelected ? '#fff' : '#f0f4f8',border:'1px solid #ccd',borderRadius:3,cursor:'pointer',color:'#555'}}>
                              ✏️
                            </button>
                          )}
                        </td>

                        {/* Opening Bal Dr & Cr (with inline editing) */}
                        {isEditing ? (
                          <td colSpan={2} style={{padding:'2px 8px',borderLeft:'1px solid #eee',background:'#fff9e6'}} onClick={e=>e.stopPropagation()}>
                            <div style={{display:'flex',gap:4,alignItems:'center',justifyContent:'flex-end'}}>
                              <input
                                type="number"
                                value={editVal}
                                onChange={e=>setEditVal(e.target.value)}
                                style={{width:70,padding:'2px 4px',fontSize:11,border:'1px solid #999',borderRadius:2}}
                              />
                              <select
                                value={editType}
                                onChange={e=>setEditType(e.target.value as 'Dr'|'Cr')}
                                style={{padding:'2px 4px',fontSize:11,border:'1px solid #999',borderRadius:2}}>
                                <option value="Dr">Dr</option>
                                <option value="Cr">Cr</option>
                              </select>
                              <button onClick={e=>handleSaveEdit(r.ledger.id, e)} disabled={isSaving} style={{padding:'2px 6px',background:'#1a7a4a',color:'white',border:'none',borderRadius:2,fontSize:10,cursor:'pointer'}}>
                                {isSaving?'…':'✓'}
                              </button>
                              <button onClick={handleCancelEdit} style={{padding:'2px 6px',background:'#888',color:'white',border:'none',borderRadius:2,fontSize:10,cursor:'pointer'}}>✕</button>
                            </div>
                          </td>
                        ) : (
                          <>
                            <td style={{textAlign:'right',padding:'4px 10px',borderLeft:'1px solid #eee',fontSize:11}}>{r.opDr>0?fmt(r.opDr):'-'}</td>
                            <td style={{textAlign:'right',padding:'4px 10px',fontSize:11}}>{r.opCr>0?fmt(r.opCr):'-'}</td>
                          </>
                        )}

                        <td style={{textAlign:'right',padding:'4px 10px',borderLeft:'1px solid #eee',color: isLedgerSelected ? '#000' : '#8B0000',fontSize:11}}>{r.txDr>0?fmt(r.txDr):'-'}</td>
                        <td style={{textAlign:'right',padding:'4px 10px',color: isLedgerSelected ? '#000' : '#006600',fontSize:11}}>{r.txCr>0?fmt(r.txCr):'-'}</td>
                        <td style={{textAlign:'right',padding:'4px 10px',borderLeft:'1px solid #eee',fontWeight:'bold',color: isLedgerSelected ? '#000' : '#8B0000',fontSize:11}}>{r.clDr>0?fmt(r.clDr):'-'}</td>
                        <td style={{textAlign:'right',padding:'4px 10px',fontWeight:'bold',color: isLedgerSelected ? '#000' : '#006600',fontSize:11}}>{r.clCr>0?fmt(r.clCr):'-'}</td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{background:'#1c5282',color:'white',fontWeight:'bold',borderTop:'2px solid #333'}}>
              <td style={{padding:'8px 12px',letterSpacing:2}}>T O T A L</td>
              <td style={{textAlign:'right',padding:'8px 10px',borderLeft:'1px solid rgba(255,255,255,0.3)'}}>₹ {fmt(totals.opDr)}</td>
              <td style={{textAlign:'right',padding:'8px 10px'}}>₹ {fmt(totals.opCr)}</td>
              <td style={{textAlign:'right',padding:'8px 10px',borderLeft:'1px solid rgba(255,255,255,0.3)'}}>₹ {fmt(totals.txDr)}</td>
              <td style={{textAlign:'right',padding:'8px 10px'}}>₹ {fmt(totals.txCr)}</td>
              <td style={{textAlign:'right',padding:'8px 10px',borderLeft:'1px solid rgba(255,255,255,0.3)'}}>₹ {fmt(totals.clDr)}</td>
              <td style={{textAlign:'right',padding:'8px 10px'}}>₹ {fmt(totals.clCr)}</td>
            </tr>
            {!balanced && (
              <tr style={{background:'#fff0f0',color:'#8B0000',fontWeight:'bold'}}>
                <td style={{padding:'6px 12px'}}>Difference in Closing Balance</td>
                <td colSpan={4}></td>
                <td colSpan={2} style={{textAlign:'right',padding:'6px 12px',fontSize:13}}>
                  ⚠ Difference: ₹ {fmt(Math.abs(totals.clDr - totals.clCr))}
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  );
}


interface ItemColumnInfo {
  key: string;
  itemId: number;
  itemName: string;
  unit: string;
}

// Helper: get unique item columns from a list of vouchers
function getItemColumns(voucherList: Voucher[]): ItemColumnInfo[] {
  const map = new Map<string, ItemColumnInfo>();
  for (const v of voucherList) {
    for (const ie of (v.inventoryEntries || [])) {
      const name = (ie.itemName || (ie as any).stockItem?.name || '').trim();
      if (!name) continue;
      const unit = (typeof ie.unit === 'string' ? ie.unit : (ie.unit as any)?.symbol || (ie.unit as any)?.name || 'Nos').trim();
      const key = ie.itemId && ie.itemId !== 0 ? `${ie.itemId}` : `${name}__${unit}`;
      if (!map.has(key)) {
        map.set(key, { key, itemId: ie.itemId || 0, itemName: name, unit });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));
}

// Helper: get item-wise total qty map from a list of vouchers
function getItemQtyMap(voucherList: Voucher[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const v of voucherList) {
    for (const ie of (v.inventoryEntries || [])) {
      const name = (ie.itemName || (ie as any).stockItem?.name || '').trim();
      if (!name) continue;
      const unit = (typeof ie.unit === 'string' ? ie.unit : (ie.unit as any)?.symbol || (ie.unit as any)?.name || 'Nos').trim();
      const key = ie.itemId && ie.itemId !== 0 ? `${ie.itemId}` : `${name}__${unit}`;
      map[key] = (map[key] || 0) + (ie.qty || 0);
    }
  }
  return map;
}

// Helper: get item-wise qty map from a single voucher
function getVoucherItemQty(v: Voucher): Record<string, number> {
  const map: Record<string, number> = {};
  for (const ie of (v.inventoryEntries || [])) {
    const name = (ie.itemName || (ie as any).stockItem?.name || '').trim();
    if (!name) continue;
    const unit = (typeof ie.unit === 'string' ? ie.unit : (ie.unit as any)?.symbol || (ie.unit as any)?.name || 'Nos').trim();
    const key = ie.itemId && ie.itemId !== 0 ? `${ie.itemId}` : `${name}__${unit}`;
    map[key] = (map[key] || 0) + (ie.qty || 0);
  }
  return map;
}

// Helper: determine if voucher type goes to Debit side in registers (Tally Prime convention)
function isDebitSideVoucher(type: string): boolean {
  // Payment, Sales, Debit Note, Contra, Journal → Debit column
  // Receipt, Purchase, Credit Note → Credit column
  return ['Payment','Sales','Debit Note','Contra','Journal'].includes(type);
}

function DayBookView({vouchers, currentPeriod, onBack, onDrillDown}:{vouchers:Voucher[]; currentPeriod?:{start:string;end:string}; onBack:()=>void; onDrillDown?:(v:Voucher)=>void}) {
  const [rowIdx, setRowIdx] = useState(0);
  const rows = [...vouchers].sort((a,b)=>parseDate(b.date).getTime() - parseDate(a.date).getTime());

  // Collect all unique item columns and net qty map (Purchase - Sales)
  const itemCols = getItemColumns(rows);
  const netDayBookQtyMap: Record<string, number> = {};
  itemCols.forEach(col => {
    let net = 0;
    rows.forEach(v => {
      const vItemQty = getVoucherItemQty(v);
      const q = vItemQty[col.key] || 0;
      if (q > 0) {
        if (['Sales', 'Credit Note'].includes(v.type)) {
          net -= q;
        } else {
          net += q;
        }
      }
    });
    netDayBookQtyMap[col.key] = net;
  });

  // Tally Prime: each voucher amount shown in ONE column only
  const totalDr = rows.filter(v=>isDebitSideVoucher(v.type)).reduce((s,v)=>s+(v.total||0),0);
  const totalCr = rows.filter(v=>!isDebitSideVoucher(v.type)).reduce((s,v)=>s+(v.total||0),0);

  useEffect(()=>{
    const onKey = (e:KeyboardEvent)=>{
      if (document.querySelector('.modal-overlay')) return;
      if(e.key==='ArrowDown') { e.preventDefault(); setRowIdx(p=>Math.min(p+1, rows.length-1)); }
      else if(e.key==='ArrowUp') { e.preventDefault(); setRowIdx(p=>Math.max(p-1, 0)); }
      else if(e.key==='Escape') { e.preventDefault(); onBack(); }
      else if(e.key==='Enter' && rows[rowIdx] && onDrillDown) { e.preventDefault(); onDrillDown(rows[rowIdx]); }
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, [rows, rowIdx, onDrillDown, onBack]);


  // Slider state: how many item columns to show at once
  const ITEM_COLS_PER_PAGE = 3;
  const [itemColPage, setItemColPage] = useState(0);
  const totalItemPages = Math.max(1, Math.ceil(itemCols.length / ITEM_COLS_PER_PAGE));
  const visibleItemCols = itemCols.slice(itemColPage * ITEM_COLS_PER_PAGE, (itemColPage + 1) * ITEM_COLS_PER_PAGE);

  return (
    <div className="report-view" style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{background:'#1c5282',color:'white',padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontSize:16,fontWeight:'bold'}}>Day Book</div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {itemCols.length > ITEM_COLS_PER_PAGE && (
            <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,255,255,0.15)',borderRadius:4,padding:'2px 8px'}}>
              <button onClick={()=>setItemColPage(p=>Math.max(0,p-1))} disabled={itemColPage===0}
                style={{background:'none',border:'none',color:'white',cursor:itemColPage===0?'default':'pointer',fontSize:16,opacity:itemColPage===0?0.4:1,padding:'0 4px'}}>◀</button>
              <span style={{fontSize:11,color:'white'}}>Items {itemColPage*ITEM_COLS_PER_PAGE+1}–{Math.min((itemColPage+1)*ITEM_COLS_PER_PAGE,itemCols.length)} of {itemCols.length}</span>
              <button onClick={()=>setItemColPage(p=>Math.min(totalItemPages-1,p+1))} disabled={itemColPage===totalItemPages-1}
                style={{background:'none',border:'none',color:'white',cursor:itemColPage===totalItemPages-1?'default':'pointer',fontSize:16,opacity:itemColPage===totalItemPages-1?0.4:1,padding:'0 4px'}}>▶</button>
            </div>
          )}
          <div style={{fontSize:12}}>{currentPeriod ? `${currentPeriod.start} to ${currentPeriod.end}` : ''}</div>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        <table className="report-table" style={{width:'100%'}}>
          <thead>
            <tr>
              <th style={{whiteSpace:'nowrap',minWidth:80}}>Date</th>
              <th style={{minWidth:160}}>Particulars</th>
              <th style={{whiteSpace:'nowrap'}}>Voucher Type</th>
              <th style={{whiteSpace:'nowrap'}}>Ref No.</th>
              {visibleItemCols.map(col => (
                <th key={col.key} style={{textAlign:'center',background:'#e8f4ec',color:'#1a7a4a',whiteSpace:'nowrap',verticalAlign:'top',padding:'6px 10px',lineHeight:1.3,minWidth:110}}>
                  <div style={{fontWeight:'bold',textAlign:'center'}}>Qty ({col.unit})</div>
                  <div style={{fontWeight:'normal',fontSize:10,color:'#2d7a50',fontStyle:'italic',textAlign:'center',maxWidth:140,margin:'2px auto 0 auto',overflow:'hidden',textOverflow:'ellipsis'}} title={col.itemName}>
                    {col.itemName}
                  </div>
                </th>
              ))}
              <th style={{textAlign:'right',whiteSpace:'nowrap'}}>Debit Amount</th>
              <th style={{textAlign:'right',whiteSpace:'nowrap'}}>Credit Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v,i)=>{
              const showInDebit = isDebitSideVoucher(v.type);
              const drAmt = showInDebit ? (v.total||0) : 0;
              const crAmt = showInDebit ? 0 : (v.total||0);
              const vItemQty = getVoucherItemQty(v);
              const isSales = ['Sales', 'Credit Note'].includes(v.type);
              const qtyColor = isSales ? '#8B0000' : '#006600';
              return <tr key={i} style={{cursor:'pointer', background: i===rowIdx?'#ffd700':'', color:i===rowIdx?'#000':'inherit'}} 
                onClick={()=>onDrillDown?.(v)}
                onMouseEnter={()=>setRowIdx(i)}>
                <td style={{fontSize:12,whiteSpace:'nowrap'}}>{v.date}</td>
                <td>
                  <div style={{fontWeight:'bold',fontSize:13}}>{getVoucherPartyDisplayName(v)}</div>
                  <div style={{fontSize:11,color:'#777'}}>{v.narration}</div>
                </td>
                <td><span style={{padding:'2px 8px',background:'#dde4f0',fontWeight:'bold',fontSize:11,whiteSpace:'nowrap'}}>{v.type}</span></td>
                <td style={{fontSize:12,whiteSpace:'nowrap'}}>{v.refNo}</td>
                {visibleItemCols.map(col => <td key={col.key} style={{textAlign:'center',color:qtyColor,fontWeight:'bold',background:'#f5fbf7'}}>{vItemQty[col.key] ? fmt(vItemQty[col.key]) : ''}</td>)}
                <td style={{textAlign:'right',color:'#8B0000',fontWeight:'bold',whiteSpace:'nowrap'}}>{drAmt>0?'₹'+fmt(drAmt):''}</td>
                <td style={{textAlign:'right',color:'#006600',fontWeight:'bold',whiteSpace:'nowrap'}}>{crAmt>0?'₹'+fmt(crAmt):''}</td>
              </tr>;
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{textAlign:'right',fontWeight:'bold',padding:'8px 12px'}}>Total:</td>
              {visibleItemCols.map(col => {
                const netQty = netDayBookQtyMap[col.key] || 0;
                const isNegative = netQty < 0;
                return (
                  <td key={col.key} style={{textAlign:'center',fontWeight:'bold',color: isNegative ? '#8B0000' : '#006600',padding:'8px 12px',background:'#e8f4ec'}}>
                    {fmt(netQty)}
                  </td>
                );
              })}
              <td style={{textAlign:'right',fontWeight:'bold',color:'#8B0000',padding:'8px 12px'}}>₹ {fmt(totalDr)}</td>
              <td style={{textAlign:'right',fontWeight:'bold',color:'#006600',padding:'8px 12px'}}>₹ {fmt(totalCr)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ==================== UNIVERSAL REGISTER VIEW ====================
// Color map for each voucher type header
const REGISTER_COLORS: Record<string,string> = {
  'Sales':'#1c5282','Purchase':'#5a2d82','Contra':'#4a4a00',
  'Payment':'#8B0000','Receipt':'#1a7a4a','Journal':'#00555a',
  'Debit Note':'#7a3d00','Credit Note':'#00407a'
};

// Fiscal months in order (Apr → Mar)
const FISCAL_MONTHS = ['April','May','June','July','August','September','October','November','December','January','February','March'];
const FISCAL_MONTH_NUMS = [4,5,6,7,8,9,10,11,12,1,2,3]; // corresponding month numbers (1-based)

function parseVoucherDate(dateStr:string): {month:number; year:number} | null {
  if(!dateStr) return null;
  // Handle "DD-Mon-YYYY" like "01-Apr-2026"
  const months:{[k:string]:number}={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  const parts = dateStr.split(/[-\/]/);
  if(parts.length===3) {
    const m = months[parts[1]?.toLowerCase().slice(0,3)];
    if(m) return {month:m, year:parseInt(parts[2])};
    // numeric: DD/MM/YYYY
    const mn=parseInt(parts[1]);
    if(!isNaN(mn)) return {month:mn, year:parseInt(parts[2])};
  }
  return null;
}

function UniversalRegisterView({voucherType, vouchers, currentPeriod, onBack, onDrillDown}:{
  voucherType: string; vouchers: Voucher[];
  currentPeriod: {start:string; end:string};
  onBack:()=>void; onDrillDown?:(v:Voucher)=>void;
}) {
  const [view, setView] = useState<'monthly'|'detail'>('monthly');
  const [selMonthIdx, setSelMonthIdx] = useState(0); // index into FISCAL_MONTHS
  const [rowIdx, setRowIdx] = useState(0);
  const [monthlyItemPage, setMonthlyItemPage] = useState(0);
  const [detailItemPage, setDetailItemPage] = useState(0);
  const ITEM_COLS_PER_PAGE = 3;
  const color = REGISTER_COLORS[voucherType] || '#1c5282';

  // Determine which voucher types to include
  const matchTypes: Record<string,string[]> = {
    'Sales':       ['Sales','Credit Note'],
    'Purchase':    ['Purchase','Debit Note'],
    'Contra':      ['Contra'],
    'Payment':     ['Payment'],
    'Receipt':     ['Receipt'],
    'Journal':     ['Journal'],
    'Debit Note':  ['Debit Note'],
    'Credit Note': ['Credit Note'],
  };
  const typesToMatch = matchTypes[voucherType] || [voucherType];
  const allRows = vouchers.filter(v => typesToMatch.includes(v.type));

  // Tally Prime: Sales/Payment/Debit Note/Contra/Journal → Debit column only
  //              Purchase/Receipt/Credit Note → Credit column only
  const registerIsDebitSide = isDebitSideVoucher(voucherType);

  // Monthly totals — show amount in ONE column based on register type
  const monthlyData = FISCAL_MONTHS.map((mName, mi) => {
    const mNum = FISCAL_MONTH_NUMS[mi];
    const mvs = allRows.filter(v => { const d=parseVoucherDate(v.date); return d?.month===mNum; });
    const monthTotal = mvs.reduce((s,v)=>s+v.total,0);
    // Debit-side registers: amount goes to debit column; credit-side: to credit column
    const debit = registerIsDebitSide ? monthTotal : 0;
    const credit = registerIsDebitSide ? 0 : monthTotal;
    const total = monthTotal;
    const itemQty = getItemQtyMap(mvs);
    return {mName, mNum, vouchers:mvs, debit, credit, total, itemQty};
  });

  const grandDebit = monthlyData.reduce((s,m)=>s+m.debit,0);
  const grandCredit = monthlyData.reduce((s,m)=>s+m.credit,0);
  const grandTotal = monthlyData.reduce((s,m)=>s+m.total,0);

  // All unique item columns across all months (for column headers)
  const allMonthlyItemCols = getItemColumns(allRows);
  const allMonthlyItemQtyMap = getItemQtyMap(allRows);

  // Detail view rows
  const detailRows = monthlyData[selMonthIdx]?.vouchers || [];
  const detailTotal = detailRows.reduce((s,v)=>s+v.total,0);
  const detailDebit = registerIsDebitSide ? detailTotal : 0;
  const detailCredit = registerIsDebitSide ? 0 : detailTotal;

  // Bar graph max
  const maxVal = Math.max(...monthlyData.map(m=>m.total), 1);

  // Keyboard navigation
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if (document.querySelector('.modal-overlay')) return;
      if(view==='monthly'){
        if(e.key==='ArrowDown'){e.preventDefault();setSelMonthIdx(p=>Math.min(p+1,FISCAL_MONTHS.length-1));}
        else if(e.key==='ArrowUp'){e.preventDefault();setSelMonthIdx(p=>Math.max(p-1,0));}
        else if(e.key==='Enter'){e.preventDefault();setView('detail');setRowIdx(0);}
        else if(e.key==='Escape'){e.preventDefault();onBack();}
      } else {
        if(e.key==='ArrowDown'){e.preventDefault();setRowIdx(p=>Math.min(p+1,detailRows.length-1));}
        else if(e.key==='ArrowUp'){e.preventDefault();setRowIdx(p=>Math.max(p-1,0));}
        else if(e.key==='Enter'&&detailRows[rowIdx]&&onDrillDown){e.preventDefault();onDrillDown(detailRows[rowIdx]);}
        else if(e.key==='Escape'){e.preventDefault();setView('monthly');}
      }
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[view,selMonthIdx,rowIdx,detailRows,onBack,onDrillDown]);

  const selMonth = monthlyData[selMonthIdx];

  // ---- MONTHLY VIEW ----
  const monthlyTotalPages = Math.max(1, Math.ceil(allMonthlyItemCols.length / ITEM_COLS_PER_PAGE));
  const visibleMonthlyItemCols = allMonthlyItemCols.slice(monthlyItemPage * ITEM_COLS_PER_PAGE, (monthlyItemPage + 1) * ITEM_COLS_PER_PAGE);

  if(view==='monthly') return (
    <div style={{display:'flex',height:'100%',background:'#fff',flexDirection:'column'}}>
      {/* Header */}
      <div style={{background:color,color:'white',padding:'8px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <div style={{fontWeight:'bold',fontSize:15}}>{voucherType} Register</div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {allMonthlyItemCols.length > ITEM_COLS_PER_PAGE && (
            <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,255,255,0.15)',borderRadius:4,padding:'2px 8px'}}>
              <button onClick={()=>setMonthlyItemPage(p=>Math.max(0,p-1))} disabled={monthlyItemPage===0}
                style={{background:'none',border:'none',color:'white',cursor:monthlyItemPage===0?'default':'pointer',fontSize:16,opacity:monthlyItemPage===0?0.4:1,padding:'0 4px'}}>◀</button>
              <span style={{fontSize:11}}>Items {monthlyItemPage*ITEM_COLS_PER_PAGE+1}–{Math.min((monthlyItemPage+1)*ITEM_COLS_PER_PAGE,allMonthlyItemCols.length)} / {allMonthlyItemCols.length}</span>
              <button onClick={()=>setMonthlyItemPage(p=>Math.min(monthlyTotalPages-1,p+1))} disabled={monthlyItemPage===monthlyTotalPages-1}
                style={{background:'none',border:'none',color:'white',cursor:monthlyItemPage===monthlyTotalPages-1?'default':'pointer',fontSize:16,opacity:monthlyItemPage===monthlyTotalPages-1?0.4:1,padding:'0 4px'}}>▶</button>
            </div>
          )}
          <div style={{fontSize:11}}>{currentPeriod.start} to {currentPeriod.end}</div>
          <div style={{fontSize:11,opacity:0.8}}>↑↓: Navigate | Enter: Drill-down | Esc: Back</div>
        </div>
      </div>
      {/* Company sub-header */}
      <div style={{background:'#f0f4f8',borderBottom:'1px solid #ccc',padding:'4px 16px',fontSize:12,display:'flex',gap:20}}>
        <span style={{fontWeight:'bold',color:color}}>{voucherType} Register</span>
        <span>Transactions: {registerIsDebitSide ? 'Amount shown in Debit column' : 'Amount shown in Credit column'}</span>
      </div>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        {/* Main table */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{flex:1,overflowY:'auto'}}>
            <table className="report-table" style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr style={{background:'#e8eef4',borderBottom:'2px solid #aaa'}}>
                  <th style={{textAlign:'left',padding:'6px 16px',color:'#333',whiteSpace:'nowrap',minWidth:120}}>Particulars</th>
                  {visibleMonthlyItemCols.map(col => (
                    <th key={col.key} style={{textAlign:'center',padding:'6px 10px',color:'#1a7a4a',background:'#e8f4ec',whiteSpace:'nowrap',fontSize:11,verticalAlign:'top',lineHeight:1.3,minWidth:110}}>
                      <div style={{fontWeight:'bold',textAlign:'center'}}>Qty ({col.unit})</div>
                      <div style={{fontWeight:'normal',fontSize:10,color:'#2d7a50',fontStyle:'italic',textAlign:'center',maxWidth:140,margin:'2px auto 0 auto',overflow:'hidden',textOverflow:'ellipsis'}} title={col.itemName}>
                        {col.itemName}
                      </div>
                    </th>
                  ))}
                  <th style={{textAlign:'right',padding:'6px 12px',color:'#333',whiteSpace:'nowrap'}}>Debit</th>
                  <th style={{textAlign:'right',padding:'6px 12px',color:'#333',whiteSpace:'nowrap'}}>Credit</th>
                  <th style={{textAlign:'right',padding:'6px 16px',color:'#333',whiteSpace:'nowrap'}}>Closing Balance</th>
                </tr>
              </thead>
              <tbody>
                {(()=>{
                  let runningBalance = 0;
                  return monthlyData.map((m,i)=>{
                    const isSel = i===selMonthIdx;
                    if(registerIsDebitSide) runningBalance += m.total;
                    else runningBalance += m.total;
                    const closingLabel = runningBalance > 0
                      ? `${fmt(runningBalance)} ${registerIsDebitSide ? 'Dr' : 'Cr'}`
                      : '';
                    return (
                      <tr key={i}
                        style={{background:isSel?'#ffd700':i%2===0?'#fff':'#fafafa',cursor:'pointer',borderBottom:'1px solid #e0e0e0'}}
                        onClick={()=>{setSelMonthIdx(i);setView('detail');setRowIdx(0);setDetailItemPage(0);}}
                        onMouseEnter={()=>setSelMonthIdx(i)}>
                        <td style={{padding:'5px 16px',fontWeight:isSel?'bold':'normal',color:isSel?'#000':'#222',whiteSpace:'nowrap'}}>{m.mName}</td>
                        {visibleMonthlyItemCols.map(col => <td key={col.key} style={{textAlign:'center',padding:'5px 10px',color:'#1a7a4a',fontWeight:isSel?'bold':'normal',background:'#f5fbf7'}}>{m.itemQty[col.key] ? fmt(m.itemQty[col.key]) : ''}</td>)}
                        <td style={{textAlign:'right',padding:'5px 12px',fontWeight:isSel?'bold':'normal',color:'#8B0000',whiteSpace:'nowrap'}}>
                          {registerIsDebitSide && m.total>0 ? fmt(m.total) : ''}
                        </td>
                        <td style={{textAlign:'right',padding:'5px 12px',fontWeight:isSel?'bold':'normal',color:'#006600',whiteSpace:'nowrap'}}>
                          {!registerIsDebitSide && m.total>0 ? fmt(m.total) : ''}
                        </td>
                        <td style={{textAlign:'right',padding:'5px 16px',fontWeight:'bold',color:isSel?'#000':color,whiteSpace:'nowrap'}}>
                          {m.total>0 ? closingLabel : ''}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
              <tfoot>
                <tr style={{background:'#fff',borderTop:'2px solid #333'}}>
                  <td
                    colSpan={1 + visibleMonthlyItemCols.length}
                    style={{padding:'9px 16px',fontWeight:'bold',fontSize:13,letterSpacing:'3px',color:'#000',borderTop:'2px solid #333'}}
                  >
                    G r a n d &nbsp; T o t a l
                  </td>
                  <td style={{textAlign:'right',padding:'9px 12px',fontWeight:'bold',fontSize:13,color:'#8B0000',borderTop:'2px solid #333'}}>
                    {grandDebit>0 ? fmt(grandDebit) : ''}
                  </td>
                  <td style={{textAlign:'right',padding:'9px 12px',fontWeight:'bold',fontSize:13,color:'#006600',borderTop:'2px solid #333'}}>
                    {grandCredit>0 ? fmt(grandCredit) : ''}
                  </td>
                  <td style={{textAlign:'right',padding:'9px 16px',fontWeight:'bold',fontSize:13,color:color,borderTop:'2px solid #333'}}>
                    {grandTotal>0 ? `${fmt(grandTotal)} ${registerIsDebitSide ? 'Dr' : 'Cr'}` : ''}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Bar Graph */}
          <div style={{borderTop:'2px solid #ccc',padding:'16px',background:'#fff',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'flex-end',gap:2,height:100,paddingBottom:0}}>
              {monthlyData.map((m,i)=>{
                const h = maxVal>0 ? Math.round((m.total/maxVal)*90) : 0;
                return (
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',cursor:'pointer'}}
                    onClick={()=>{setSelMonthIdx(i);setView('detail');setRowIdx(0);setDetailItemPage(0);}}>
                    <div style={{
                      width:'100%',height:`${h}px`,
                      background:i===selMonthIdx?color:'#cc0000',
                      minHeight:m.total>0?2:0,
                      transition:'height 0.2s',
                      opacity:m.total>0?1:0.15,
                    }}/>
                  </div>
                );
              })}
            </div>
            <div style={{display:'flex',gap:2,marginTop:4}}>
              {FISCAL_MONTHS.map((m,i)=>(
                <div key={i} style={{flex:1,textAlign:'center',fontSize:9,color:i===selMonthIdx?color:'#555',fontWeight:i===selMonthIdx?'bold':'normal',overflow:'hidden'}}>
                  {m.slice(0,3)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{width:130,background:'#f0f0f0',borderLeft:'1px solid #ccc',display:'flex',flexDirection:'column',flexShrink:0,fontSize:11}}>
          <div style={{padding:'6px 8px',background:'#d8d8d8',fontWeight:'bold',fontSize:10,color:'#333',borderBottom:'1px solid #ccc'}}>OPTIONS</div>
          {[
            ['F2','Period'],['F3','Company'],['F4','Voucher Type'],['',''],
            ['F6','Monthly'],['',''],['H','Basis of Values'],['H','Change View'],
            ['J','Exception Reports'],['L','Save View'],['',''],
            ['Q','Quit'],
          ].map(([k,v],i)=>!k&&!v?<div key={i} style={{height:6,borderBottom:'1px solid #e0e0e0'}}/>:(
            <div key={i} style={{padding:'5px 8px',borderBottom:'1px solid #ddd',cursor:k?'pointer':'default',background:'transparent',display:'flex',gap:4}}
              onClick={()=>{if(k==='Q')onBack();}}>
              {k&&<span style={{fontWeight:'bold',color:color,minWidth:20}}>{k}:</span>}
              <span style={{color:'#222'}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ---- DETAIL VIEW ----
  const detailItemCols = getItemColumns(detailRows);
  const detailItemQtyMap = getItemQtyMap(detailRows);
  const detailTotalPages = Math.max(1, Math.ceil(detailItemCols.length / ITEM_COLS_PER_PAGE));
  const visibleDetailItemCols = detailItemCols.slice(detailItemPage * ITEM_COLS_PER_PAGE, (detailItemPage + 1) * ITEM_COLS_PER_PAGE);

  return (
    <div style={{display:'flex',height:'100%',background:'#fff',flexDirection:'column'}}>
      <div style={{background:color,color:'white',padding:'8px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <div style={{fontWeight:'bold',fontSize:15}}>Voucher Register</div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {detailItemCols.length > ITEM_COLS_PER_PAGE && (
            <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,255,255,0.15)',borderRadius:4,padding:'2px 8px'}}>
              <button onClick={()=>setDetailItemPage(p=>Math.max(0,p-1))} disabled={detailItemPage===0}
                style={{background:'none',border:'none',color:'white',cursor:detailItemPage===0?'default':'pointer',fontSize:16,opacity:detailItemPage===0?0.4:1,padding:'0 4px'}}>◀</button>
              <span style={{fontSize:11}}>Items {detailItemPage*ITEM_COLS_PER_PAGE+1}–{Math.min((detailItemPage+1)*ITEM_COLS_PER_PAGE,detailItemCols.length)} / {detailItemCols.length}</span>
              <button onClick={()=>setDetailItemPage(p=>Math.min(detailTotalPages-1,p+1))} disabled={detailItemPage===detailTotalPages-1}
                style={{background:'none',border:'none',color:'white',cursor:detailItemPage===detailTotalPages-1?'default':'pointer',fontSize:16,opacity:detailItemPage===detailTotalPages-1?0.4:1,padding:'0 4px'}}>▶</button>
            </div>
          )}
          <div style={{fontSize:11}}>List of {selMonth?.mName || ''} Vouchers</div>
          <div style={{fontSize:11,opacity:0.8}}>Esc: Back to Monthly</div>
        </div>
      </div>
      <div style={{background:'#f0f4f8',borderBottom:'1px solid #ccc',padding:'4px 16px',fontSize:11,display:'flex',justifyContent:'space-between'}}>
        <span>List of All {voucherType} Vouchers</span>
        <span style={{fontWeight:'bold'}}>{selMonth?.mName} — {detailRows.length} Voucher(s)</span>
      </div>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        <div style={{flex:1,overflowY:'auto'}}>
          <table className="report-table" style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead style={{position:'sticky',top:0,zIndex:1}}>
              <tr style={{background:'#e8eef4',borderBottom:'2px solid #aaa'}}>
                <th style={{textAlign:'left',padding:'6px 12px',whiteSpace:'nowrap',minWidth:80}}>Date</th>
                <th style={{textAlign:'left',padding:'6px 12px',minWidth:160}}>Particulars</th>
                <th style={{textAlign:'center',padding:'6px 8px',whiteSpace:'nowrap',width:90}}>Vch Type</th>
                <th style={{textAlign:'center',padding:'6px 8px',whiteSpace:'nowrap',width:70}}>Vch No.</th>
                {visibleDetailItemCols.map(col => (
                  <th key={col.key} style={{textAlign:'center',padding:'6px 10px',color:'#1a7a4a',background:'#e8f4ec',whiteSpace:'nowrap',fontSize:11,verticalAlign:'top',lineHeight:1.3,minWidth:110}}>
                    <div style={{fontWeight:'bold',textAlign:'center'}}>Qty ({col.unit})</div>
                    <div style={{fontWeight:'normal',fontSize:10,color:'#2d7a50',fontStyle:'italic',textAlign:'center',maxWidth:140,margin:'2px auto 0 auto',overflow:'hidden',textOverflow:'ellipsis'}} title={col.itemName}>
                      {col.itemName}
                    </div>
                  </th>
                ))}
                <th style={{textAlign:'right',padding:'6px 12px',width:110,whiteSpace:'nowrap'}}>Debit Amount</th>
                <th style={{textAlign:'right',padding:'6px 12px',width:110,whiteSpace:'nowrap'}}>Credit Amount</th>
              </tr>
            </thead>
            <tbody>
              {detailRows.length===0 && (
                <tr><td colSpan={4 + visibleDetailItemCols.length + 2} style={{textAlign:'center',padding:40,color:'#888',fontSize:13}}>No vouchers found for {selMonth?.mName}</td></tr>
              )}
              {detailRows.map((v,i)=>{
                const vAmt = v.total || 0;
                const drAmt = registerIsDebitSide ? vAmt : 0;
                const crAmt = registerIsDebitSide ? 0 : vAmt;
                const isSel = i===rowIdx;
                const vItemQty = getVoucherItemQty(v);
                return (
                  <tr key={i}
                    style={{background:isSel?'#ffd700':i%2===0?'#fff':'#fafafa',cursor:'pointer',borderBottom:'1px solid #e8e8e8'}}
                    onClick={()=>onDrillDown?.(v)}
                    onMouseEnter={()=>setRowIdx(i)}>
                    <td style={{padding:'5px 12px',fontWeight:isSel?'bold':'normal',whiteSpace:'nowrap'}}>{v.date}</td>
                    <td style={{padding:'5px 12px',fontWeight:'bold',color:'#1a1a1a'}}>{getVoucherPartyDisplayName(v)}</td>
                    <td style={{textAlign:'center',padding:'5px 8px'}}>
                      <span style={{padding:'1px 6px',background:color,color:'white',fontSize:10,fontWeight:'bold',borderRadius:2,whiteSpace:'nowrap'}}>{v.type}</span>
                    </td>
                    <td style={{textAlign:'center',padding:'5px 8px',color:'#555',whiteSpace:'nowrap'}}>{v.number}</td>
                    {visibleDetailItemCols.map(col => <td key={col.key} style={{textAlign:'center',padding:'5px 10px',color:'#1a7a4a',fontWeight:'bold',background:'#f5fbf7'}}>{vItemQty[col.key] ? fmt(vItemQty[col.key]) : ''}</td>)}
                    <td style={{textAlign:'right',padding:'5px 12px',color:'#8B0000',fontWeight:drAmt>0?'bold':'normal',whiteSpace:'nowrap'}}>{drAmt>0?fmt(drAmt):''}</td>
                    <td style={{textAlign:'right',padding:'5px 12px',color:'#006600',fontWeight:crAmt>0?'bold':'normal',whiteSpace:'nowrap'}}>{crAmt>0?fmt(crAmt):''}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{background:'#e8eef4',borderTop:'2px solid #aaa'}}>
                <td colSpan={4} style={{textAlign:'right',padding:'7px 12px',fontWeight:'bold',fontSize:13}}>Total:</td>
                {visibleDetailItemCols.map(col => <td key={col.key} style={{textAlign:'center',padding:'7px 10px',fontWeight:'bold',color:'#1a7a4a',background:'#e8f4ec',fontSize:13}}>{fmt(detailItemQtyMap[col.key] || 0)}</td>)}
                <td style={{textAlign:'right',padding:'7px 12px',fontWeight:'bold',color:'#8B0000',fontSize:13}}>{detailDebit>0?fmt(detailDebit):''}</td>
                <td style={{textAlign:'right',padding:'7px 12px',fontWeight:'bold',color:'#006600',fontSize:13}}>{detailCredit>0?fmt(detailCredit):''}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Right Sidebar */}
        <div style={{width:130,background:'#f0f0f0',borderLeft:'1px solid #ccc',display:'flex',flexDirection:'column',flexShrink:0,fontSize:11}}>
          <div style={{padding:'6px 8px',background:'#d8d8d8',fontWeight:'bold',fontSize:10,color:'#333',borderBottom:'1px solid #ccc'}}>OPTIONS</div>
          {[
            ['F2','Date'],['F3','Company'],['F4','Voucher Type'],['',''],
            ['F5',''],['F6','Columnar'],['F7','Show Profit'],['',''],
            ['H','Basis of Values'],['H','Change View'],
            ['J','Exception Reports'],['L','Save View'],['',''],
            ['A','Add Vch'],['D','Delete'],['',''],['Q','Quit'],
          ].map(([k,v],i)=>!k&&!v?<div key={i} style={{height:6,borderBottom:'1px solid #e0e0e0'}}/>:(
            <div key={i} style={{padding:'5px 8px',borderBottom:'1px solid #ddd',cursor:k?'pointer':'default',display:'flex',gap:4}}
              onClick={()=>{if(k==='Q'){setView('monthly');}}}>
              {k&&<span style={{fontWeight:'bold',color:color,minWidth:20}}>{k}:</span>}
              <span style={{color:'#222'}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Legacy stubs (kept for safety, no longer used in routing)
function SalesRegisterView({vouchers, currentPeriod, onBack, onDrillDown}:{vouchers:Voucher[]; currentPeriod?:{start:string;end:string}; onBack:()=>void; onDrillDown?:(v:Voucher)=>void}) {
  const [rowIdx, setRowIdx] = useState(0);
  const rows=vouchers.filter(v=>v.type==='Sales'||v.type==='Credit Note');
  const total=rows.reduce((s,v)=>s+(v.type==='Sales'?v.total:-v.total),0);

  useEffect(()=>{
    const onKey = (e:KeyboardEvent)=>{
      if (document.querySelector('.modal-overlay')) return;
      if(e.key==='ArrowDown') { e.preventDefault(); setRowIdx(p=>Math.min(p+1, rows.length-1)); }
      else if(e.key==='ArrowUp') { e.preventDefault(); setRowIdx(p=>Math.max(p-1, 0)); }
      else if(e.key==='Escape') { e.preventDefault(); onBack(); }
      else if(e.key==='Enter' && rows[rowIdx] && onDrillDown) { e.preventDefault(); onDrillDown(rows[rowIdx]); }
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, [rows, rowIdx, onDrillDown, onBack]);


  return (
    <div className="report-view" style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{background:'#1c5282',color:'white',padding:'10px 20px',display:'flex',justifyContent:'space-between'}}>
        <div style={{fontSize:16,fontWeight:'bold'}}>Sales Register</div>
        <div style={{fontSize:12}}>{currentPeriod ? `${currentPeriod.start} to ${currentPeriod.end}` : ''}</div>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        <table className="report-table" style={{width:'100%'}}>
          <thead>
            <tr>
              <th>Date</th><th>Party Name</th><th>Voucher No.</th><th>Type</th>
              <th style={{textAlign:'right'}}>Taxable Value</th>
              <th style={{textAlign:'right'}}>CGST</th>
              <th style={{textAlign:'right'}}>SGST</th>
              <th style={{textAlign:'right'}}>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v,i)=>{
              const taxable=v.inventoryEntries.reduce((s,e)=>s+e.amount,0);
              const cgst=v.entries.filter(e=>e.ledgerName==='CGST Payable').reduce((s,e)=>s+(v.type==='Sales'?e.amount:-e.amount),0);
              const sgst=v.entries.filter(e=>e.ledgerName==='SGST Payable').reduce((s,e)=>s+(v.type==='Sales'?e.amount:-e.amount),0);
              return <tr key={i} style={{cursor:'pointer', background: i===rowIdx ? '#cbe0ff' : (v.type==='Credit Note' ? '#fff5f5' : '')}}
                onClick={()=>onDrillDown?.(v)}
                onMouseEnter={()=>setRowIdx(i)}>
                <td style={{fontSize:12}}>{v.date}</td>
                <td style={{fontWeight:'bold'}}>{v.partyName}</td>
                <td style={{fontSize:12,color:'#555'}}>{v.refNo}</td>
                <td><span style={{padding:'1px 8px',background:v.type==='Sales'?'#1c5282':'#c00',color:'white',fontSize:11,fontWeight:'bold'}}>{v.type}</span></td>
                <td style={{textAlign:'right'}}>{fmt(taxable)}</td>
                <td style={{textAlign:'right',color:'#555'}}>{fmt(cgst)}</td>
                <td style={{textAlign:'right',color:'#555'}}>{fmt(sgst)}</td>
                <td style={{textAlign:'right',fontWeight:'bold',color:v.type==='Sales'?'#1c5282':'#c00'}}>₹ {fmt(v.total)}</td>
              </tr>;
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{textAlign:'right',fontWeight:'bold',padding:'8px 12px'}}>Total Net Sales:</td>
              <td colSpan={3}></td>
              <td style={{textAlign:'right',fontWeight:'bold',fontSize:15,color:'#1c5282',padding:'8px 12px'}}>₹ {fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function PurchaseRegisterView({vouchers, onBack, onDrillDown}:{vouchers:Voucher[]; onBack:()=>void; onDrillDown?:(v:Voucher)=>void}) {
  const [rowIdx, setRowIdx] = useState(0);
  const rows=vouchers.filter(v=>v.type==='Purchase'||v.type==='Debit Note');
  const total=rows.reduce((s,v)=>s+(v.type==='Purchase'?v.total:-v.total),0);

  useEffect(()=>{
    const onKey = (e:KeyboardEvent)=>{
      if (document.querySelector('.modal-overlay')) return;
      if(e.key==='ArrowDown') { e.preventDefault(); setRowIdx(p=>Math.min(p+1, rows.length-1)); }
      else if(e.key==='ArrowUp') { e.preventDefault(); setRowIdx(p=>Math.max(p-1, 0)); }
      else if(e.key==='Escape') { e.preventDefault(); onBack(); }
      else if(e.key==='Enter' && rows[rowIdx] && onDrillDown) { e.preventDefault(); onDrillDown(rows[rowIdx]); }
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, [rows, rowIdx, onDrillDown, onBack]);


  return (
    <div className="report-view" style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{background:'#5a2d82',color:'white',padding:'10px 20px',display:'flex',justifyContent:'space-between'}}>
        <div style={{fontSize:16,fontWeight:'bold'}}>Purchase Register</div>
        <div style={{fontSize:12}}>1-Apr-2026 to 14-Apr-2026</div>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        <table className="report-table" style={{width:'100%'}}>
          <thead>
            <tr>
              <th>Date</th><th>Supplier Name</th><th>Voucher No.</th><th>Type</th>
              <th style={{textAlign:'right'}}>Taxable Value</th>
              <th style={{textAlign:'right'}}>CGST</th>
              <th style={{textAlign:'right'}}>SGST</th>
              <th style={{textAlign:'right'}}>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v,i)=>{
              const taxable=v.inventoryEntries.reduce((s,e)=>s+e.amount,0);
              const cgst=v.entries.filter(e=>e.ledgerName==='CGST Payable').reduce((s,e)=>s+e.amount,0);
              const sgst=v.entries.filter(e=>e.ledgerName==='SGST Payable').reduce((s,e)=>s+e.amount,0);
              return <tr key={i} style={{cursor:'pointer', background: i===rowIdx ? '#cbe0ff' : (v.type==='Debit Note' ? '#fff5f5' : '')}}
                onClick={()=>onDrillDown?.(v)}
                onMouseEnter={()=>setRowIdx(i)}>
                <td style={{fontSize:12}}>{v.date}</td>
                <td style={{fontWeight:'bold'}}>{v.partyName}</td>
                <td style={{fontSize:12,color:'#555'}}>{v.refNo}</td>
                <td><span style={{padding:'1px 8px',background:v.type==='Purchase'?'#5a2d82':'#8B0000',color:'white',fontSize:11,fontWeight:'bold'}}>{v.type}</span></td>
                <td style={{textAlign:'right'}}>{fmt(taxable)}</td>
                <td style={{textAlign:'right',color:'#555'}}>{fmt(cgst)}</td>
                <td style={{textAlign:'right',color:'#555'}}>{fmt(sgst)}</td>
                <td style={{textAlign:'right',fontWeight:'bold',color:v.type==='Purchase'?'#5a2d82':'#8B0000'}}>₹ {fmt(v.total)}</td>
              </tr>;
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{textAlign:'right',fontWeight:'bold',padding:'8px 12px'}}>Total Net Purchase:</td>
              <td colSpan={3}></td>
              <td style={{textAlign:'right',fontWeight:'bold',fontSize:15,color:'#5a2d82',padding:'8px 12px'}}>₹ {fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function GroupSummaryView({ledgers, vouchers, groupName, onBack, onDrillDownLedger, onDrillDownGroup}:{ledgers:Ledger[]; vouchers:Voucher[]; groupName:string; onBack:()=>void; onDrillDownLedger:(id:number)=>void; onDrillDownGroup:(name:string)=>void;}) {
  const [rowIdx, setRowIdx] = useState(0);
  const filteredLedgers = ledgers.filter(l=>l.groupName===groupName);
  
  // In Tally, Group Summary shows subgroups too, but our data model uses flat groups.
  // We'll show ledgers for now.
  const rows = filteredLedgers.map(l=>({
    type: 'ledger' as const,
    id: l.id,
    name: l.name,
    balance: getLedgerClosingBalance(l, vouchers)
  }));

  useEffect(()=>{
    const onKey = (e:KeyboardEvent)=>{
      if (document.querySelector('.modal-overlay')) return;
      if(e.key==='ArrowDown') { e.preventDefault(); setRowIdx(p=>Math.min(p+1, rows.length-1)); }
      else if(e.key==='ArrowUp') { e.preventDefault(); setRowIdx(p=>Math.max(p-1, 0)); }
      else if(e.key==='Escape') { e.preventDefault(); onBack(); }
      else if(e.key==='Enter' && rows[rowIdx]) {
        e.preventDefault();
        onDrillDownLedger(rows[rowIdx].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, [rows, rowIdx, onBack, onDrillDownLedger]);

  return (
    <div className="report-view" style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{background:'#1c5282',color:'white',padding:'10px 20px',display:'flex',justifyContent:'space-between'}}>
        <div style={{fontSize:16,fontWeight:'bold'}}>Group Summary: {groupName}</div>
        <div style={{fontSize:12}}>1-Apr-2026 to {new Date().toLocaleDateString('en-GB')}</div>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        <table className="report-table" style={{width:'100%'}}>
          <thead>
            <tr>
              <th>Particulars</th>
              <th style={{textAlign:'right', width:200}}>Closing Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} style={{cursor:'pointer', background: i===rowIdx?'#ffd700':'', color:i===rowIdx?'#000':'inherit'}}
                onClick={()=>onDrillDownLedger(r.id)}
                onMouseEnter={()=>setRowIdx(i)}>
                <td style={{fontWeight:'bold'}}>{r.name}</td>
                <td style={{textAlign:'right', fontWeight:'bold', color: r.balance>=0?'#8B0000':'#006600'}}>
                  {fmt(Math.abs(r.balance))} {r.balance>=0?'Dr':'Cr'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{borderTop:'2px solid #ccc'}}>
              <td style={{textAlign:'right',fontWeight:'bold',padding:'8px 12px'}}>Grand Total:</td>
              <td style={{textAlign:'right',fontWeight:'bold',padding:'8px 12px'}}>
                {fmt(Math.abs(rows.reduce((s,r)=>s+r.balance,0)))} {rows.reduce((s,r)=>s+r.balance,0)>=0?'Dr':'Cr'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function LedgerReportView({ledgers,vouchers,preselectedId,onBack,onDrillDown}:{ledgers:Ledger[];vouchers:Voucher[];preselectedId:number|null;onBack:()=>void;onDrillDown?:(v:Voucher)=>void;}) {

  const [selId,setSelId]=useState<number|null>(preselectedId);

  useEffect(()=>{
    if(selId!==null) return;
    const onKey=(e:KeyboardEvent)=>{ if(e.key==='Escape'){ if(document.querySelector('.modal-overlay')) return; e.preventDefault(); onBack(); } };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, [selId, onBack]);

  const [search,setSearch]=useState('');
  const [selIdx,setSelIdx]=useState(0);
  const [rowIdx,setRowIdx]=useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredLedgers = ledgers.filter(l=>!search||l.name.toLowerCase().includes(search.toLowerCase()));
  const ledger=ledgers.find(l=>l.id===selId);
  const entries=useMemo(()=>getLedgerEntries(selId||-1,vouchers),[selId,vouchers]);

  useEffect(()=>{ if(selId===null) searchInputRef.current?.focus(); },[selId]);
  useEffect(()=>{ setSelIdx(0); },[search]);

  // Report mode keyboard handling
  useEffect(()=>{
    if(selId===null) return;
    const onKey = (e:KeyboardEvent)=>{
       if (document.querySelector('.modal-overlay')) return;
       if(e.key==='Escape') { e.preventDefault(); e.stopPropagation(); setSelId(null); setSearch(''); }
       else if(e.key==='ArrowDown') { e.preventDefault(); setRowIdx(p=>Math.min(p+1, entries.length-1)); }
       else if(e.key==='ArrowUp') { e.preventDefault(); setRowIdx(p=>Math.max(p-1, 0)); }
       else if(e.key==='Enter') {
          if (Date.now() - (window as any)._lastLedgerSelectTime < 50) return;
          e.preventDefault(); e.stopPropagation();
          const target = entries[rowIdx];
          if(target && onDrillDown) onDrillDown(target.voucher);
       }
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  }, [selId, entries, rowIdx, onDrillDown]);

  const opening=ledger?ledger.openingBalance*(ledger.balanceType==='Dr'?1:-1):0;
  let running=opening;
  let totDr=0;
  let totCr=0;

  if (selId===null) {
    return (
      <div className="report-view" style={{height:'100%',display:'flex',flexDirection:'column',background:'#f0f4f8',alignItems:'center',justifyContent:'center'}}>
        <div style={{background:'#fff',border:'2px solid #1c5282',width:400,boxShadow:'0 8px 30px rgba(0,0,0,0.2)'}}>
           <div style={{background:'#1c5282',color:'white',padding:'8px 15px',fontWeight:'bold',fontSize:13}}>Select Ledger</div>
           <div style={{padding:'12px 15px'}}>
              <input ref={searchInputRef} type="text" className="form-input" style={{width:'100%',fontWeight:'bold'}} placeholder="Name of Ledger"
                 value={search} onChange={e=>setSearch(e.target.value)}
                 onKeyDown={e=>{
                    if(e.key==='ArrowDown') { e.preventDefault(); setSelIdx(p=>(p+1)%filteredLedgers.length); }
                    else if(e.key==='ArrowUp') { e.preventDefault(); setSelIdx(p=>(p-1+filteredLedgers.length)%filteredLedgers.length); }
                     else if(e.key==='Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        onBack();
                     }
                    else if(e.key==='Enter' && filteredLedgers.length>0) {
                       e.preventDefault(); 
                       e.stopPropagation();
                       (window as any)._lastLedgerSelectTime = Date.now();
                       setSelId(filteredLedgers[selIdx].id); 
                       setRowIdx(0);
                    }
                 }}
              />
           </div>
           <div style={{background:'#eef',padding:'4px 15px',fontSize:11,borderTop:'1px solid #ccc',borderBottom:'1px solid #ccc'}}><b>List of Ledgers</b></div>
           <div style={{maxHeight:300,overflowY:'auto',background:'#fff'}}>
              {filteredLedgers.map((l,i)=>(
                 <div key={l.id} onMouseDown={e=>{e.preventDefault();setSelId(l.id);setRowIdx(0);}}
                    onMouseEnter={()=>setSelIdx(i)}
                    style={{padding:'6px 15px',fontSize:12,cursor:'pointer',color:i===selIdx?'#fff':'#000',background:i===selIdx?'#1c5282':'transparent'}}>
                    {l.name} <span style={{float:'right',opacity:0.7,fontSize:10}}>{l.groupName}</span>
                 </div>
              ))}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="report-view" style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{background:'#1c5282',color:'white',padding:'10px 20px',display:'flex',justifyContent:'space-between'}}>
        <div style={{fontSize:16,fontWeight:'bold'}}>Ledger Vouchers</div>
        <div style={{fontSize:12,background:'#2b579a',padding:'4px 12px',borderRadius:2,cursor:'pointer'}} onClick={()=>setSelId(null)}>Esc: Change Ledger</div>
      </div>
      {ledger&&<div style={{padding:'8px 15px',background:'#f0f4f8',borderBottom:'1px solid #ccc',fontSize:12,display:'flex',gap:20}}>
        <span><b>Ledger:</b> {ledger.name}</span>
        <span><b>Group:</b> {ledger.groupName}</span>
        <span><b>Opening Balance:</b> {fmt(ledger.openingBalance)} {ledger.balanceType}</span>
        <span style={{marginLeft:'auto'}}><b>Transactions:</b> {entries.length}</span>
      </div>}
      <div style={{flex:1,overflowY:'auto'}}>
        <table className="report-table" style={{width:'100%'}}>
          <thead>
            <tr>
              <th style={{width:90}}>Date</th><th>Particulars</th><th style={{width:100}}>Vch Type</th><th style={{width:100}}>Vch No.</th>
              <th style={{textAlign:'right',width:110}}>Debit</th>
              <th style={{textAlign:'right',width:110}}>Credit</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{background:'#f8f8f8'}}>
              <td colSpan={4} style={{fontWeight:'bold',color:'#555',fontSize:12,padding:'8px 12px',textAlign:'right'}}>Opening Balance</td>
              <td style={{textAlign:'right',fontWeight:'bold'}}>{opening>=0?fmt(Math.abs(opening)):''}</td>
              <td style={{textAlign:'right',fontWeight:'bold'}}>{opening<0?fmt(Math.abs(opening)):''}</td>
            </tr>
            {entries.map(({voucher,entry},i)=>{
              const isDr=entry.entryType==='Dr';
              if(isDr) totDr+=entry.amount; else totCr+=entry.amount;
              running+=isDr?entry.amount:-entry.amount;
              return <tr key={i} style={{cursor:'pointer',background:i===rowIdx?'#ffd700':'', color:i===rowIdx?'#000':'inherit'}} 
                onClick={()=>{if(onDrillDown)onDrillDown(voucher)}}
                onMouseEnter={()=>setRowIdx(i)}>
                <td style={{fontSize:12}}>{voucher.date}</td>
                <td>
                  <div style={{fontWeight:'bold',fontSize:13}}>{voucher.partyName}</div>
                  <div style={{fontSize:11,color:'#777'}}>{voucher.narration}</div>
                </td>
                <td><span style={{padding:'1px 8px',background:'#dde4f0',fontSize:11,fontWeight:'bold'}}>{voucher.type}</span></td>
                <td style={{fontSize:12,color:'#555'}}>{voucher.refNo}</td>
                <td style={{textAlign:'right',color:'#8B0000',fontWeight:'bold'}}>{isDr?fmt(entry.amount):''}</td>
                <td style={{textAlign:'right',color:'#006600',fontWeight:'bold'}}>{!isDr?fmt(entry.amount):''}</td>
              </tr>;
            })}
          </tbody>
          <tfoot>
            <tr style={{borderTop:'2px solid #ccc'}}>
              <td colSpan={4} style={{textAlign:'right',fontWeight:'bold',padding:'6px 12px',fontSize:12}}>Current Total:</td>
              <td style={{textAlign:'right',fontWeight:'bold',fontSize:12}}>{fmt(totDr)}</td>
              <td style={{textAlign:'right',fontWeight:'bold',fontSize:12}}>{fmt(totCr)}</td>
            </tr>
            <tr style={{borderBottom:'1px solid #ccc'}}>
              <td colSpan={4} style={{textAlign:'right',fontWeight:'bold',padding:'6px 12px',fontSize:12}}>Closing Balance:</td>
              <td style={{textAlign:'right',fontWeight:'bold',fontSize:12,color:'#8B0000'}}>{running>=0?fmt(Math.abs(running)):''}</td>
              <td style={{textAlign:'right',fontWeight:'bold',fontSize:12,color:'#006600'}}>{running<0?fmt(Math.abs(running)):''}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ==================== STOCK SUMMARY VIEW — FULLY FUNCTIONAL ====================
function StockSummaryView({
  stockItems, stockGroups = [], vouchers, currentPeriod, onBack, onDrillDown, onDrillDownVoucher, onSaveOpeningStock
}: {
  stockItems: StockItem[];
  stockGroups?: StockGroup[];
  vouchers: Voucher[];
  currentPeriod?: {start:string;end:string};
  onBack: ()=>void;
  onDrillDown?: (id:number)=>void;
  onDrillDownVoucher?: (v:Voucher)=>void;
  onSaveOpeningStock?: (itemId:number, qty:number, rate:number)=>Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string,boolean>>({});
  const [rowIdx, setRowIdx] = useState(0);
  const [editId, setEditId] = useState<number|null>(null);
  const [editQty, setEditQty] = useState<string>('');
  const [editRate, setEditRate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<StockItem|null>(null);

  // Helper for unit symbol
  const getUnitSymbol = (u: any) => typeof u === 'string' ? u : (u?.symbol || u?.name || 'Nos');

  // Compute stats for each item
  const itemStats = useMemo(()=>{
    const map = new Map<number, {
      item: StockItem;
      opQty: number; opRate: number; opVal: number;
      inQty: number; inVal: number;
      outQty: number; outVal: number;
      clQty: number; clRate: number; clVal: number;
      transactions: { voucher: Voucher; entry: InventoryEntry }[];
    }>();

    for (const it of stockItems) {
      const opQty = it.openingQty || 0;
      const opRate = it.openingRate || 0;
      const opVal = opQty * opRate;

      let inQty = 0, inVal = 0;
      let outQty = 0, outVal = 0;
      const txns: { voucher: Voucher; entry: InventoryEntry }[] = [];

      for (const v of vouchers) {
        if (!v || !v.inventoryEntries) continue;
        for (const ie of v.inventoryEntries) {
          if (ie.itemId === it.id || (ie.itemName && ie.itemName.trim().toLowerCase() === it.name.trim().toLowerCase())) {
            txns.push({ voucher: v, entry: ie });
            const q = ie.qty || 0;
            const amt = ie.amount || (q * (ie.rate || 0)) || 0;
            if (v.type === 'Purchase' || v.type === 'Credit Note') {
              inQty += q;
              inVal += amt;
            } else if (v.type === 'Sales' || v.type === 'Debit Note') {
              outQty += q;
              outVal += amt;
            }
          }
        }
      }

      // Sort transactions by date
      txns.sort((a,b)=>parseDate(a.voucher.date).getTime() - parseDate(b.voucher.date).getTime());

      const clQty = opQty + inQty - outQty;
      const totalAvailableQty = opQty + inQty;
      const totalAvailableVal = opVal + inVal;
      const avgRate = totalAvailableQty > 0 ? (totalAvailableVal / totalAvailableQty) : opRate;
      const clVal = clQty * avgRate;

      map.set(it.id, {
        item: it,
        opQty, opRate, opVal,
        inQty, inVal,
        outQty, outVal,
        clQty, clRate: avgRate, clVal,
        transactions: txns
      });
    }
    return map;
  }, [stockItems, vouchers]);

  // Group items by groupName (it.under)
  const groupedItems = useMemo(()=>{
    const map: Record<string, typeof stockItems> = {};
    for (const it of stockItems) {
      const gn = it.under || 'Primary';
      if (!map[gn]) map[gn] = [];
      map[gn].push(it);
    }
    return map;
  }, [stockItems]);

  // Expand all by default
  useEffect(()=>{
    const allGns = Object.keys(groupedItems);
    const init: Record<string,boolean> = {};
    for (const gn of allGns) init[gn] = true;
    setExpanded(init);
  }, [groupedItems]);

  const toggleAll = (expand: boolean) => {
    const next: Record<string,boolean> = {};
    for (const k of Object.keys(groupedItems)) next[k] = expand;
    setExpanded(next);
  };

  // Grand Totals
  const grandTotals = useMemo(()=>{
    let opVal = 0, inQty = 0, inVal = 0, outQty = 0, outVal = 0, clVal = 0;
    itemStats.forEach(st=>{
      opVal += st.opVal;
      inQty += st.inQty;
      inVal += st.inVal;
      outQty += st.outQty;
      outVal += st.outVal;
      clVal += st.clVal;
    });
    return { opVal, inQty, inVal, outQty, outVal, clVal };
  }, [itemStats]);

  // Inline editing handlers
  const handleStartEdit = (it: StockItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditId(it.id);
    setEditQty(String(it.openingQty || 0));
    setEditRate(String(it.openingRate || 0));
  };

  const handleSaveEdit = async (itemId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSaveOpeningStock) return;
    const q = Math.abs(parseFloat(editQty) || 0);
    const r = Math.abs(parseFloat(editRate) || 0);
    setIsSaving(true);
    try {
      await onSaveOpeningStock(itemId, q, r);
      setEditId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditId(null);
  };

  // Filter groups and items
  const filteredGroups = useMemo(()=>{
    if (!search.trim()) return Object.entries(groupedItems);
    const q = search.toLowerCase();
    const result: [string, StockItem[]][] = [];
    for (const [gn, items] of Object.entries(groupedItems)) {
      const match = items.filter(it => it.name.toLowerCase().includes(q) || gn.toLowerCase().includes(q));
      if (match.length) result.push([gn, match]);
    }
    return result;
  }, [groupedItems, search]);

  // Flattened for keyboard navigation
  const flatStockItems = useMemo(() => {
    const list: { type: 'group'|'item'; groupName: string; item?: StockItem; id?: number }[] = [];
    for (const [gn, items] of filteredGroups) {
      list.push({ type: 'group', groupName: gn });
      if (expanded[gn]) {
        for (const it of items) {
          list.push({ type: 'item', groupName: gn, item: it, id: it.id });
        }
      }
    }
    return list;
  }, [filteredGroups, expanded]);

  // Keyboard navigation
  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.modal-overlay')) return;
      if (editId !== null) return;

      if (selectedItemForMovement) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setSelectedItemForMovement(null);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setRowIdx(p => Math.min(p + 1, Math.max(0, flatStockItems.length - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setRowIdx(p => Math.max(p - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = flatStockItems[rowIdx];
        if (!target) return;
        if (target.type === 'group') {
          setExpanded(p => ({ ...p, [target.groupName]: !p[target.groupName] }));
        } else if (target.item) {
          setSelectedItemForMovement(target.item);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flatStockItems, rowIdx, editId, selectedItemForMovement, onBack]);

  const movementData = selectedItemForMovement ? itemStats.get(selectedItemForMovement.id) : null;
  let runningStockFlatIdx = 0;

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#f5f7fa',position:'relative'}}>
      {/* Title Bar */}
      <div style={{background:'linear-gradient(90deg,#1c5282,#2b6cb0)',color:'white',padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <div>
          <div style={{fontSize:16,fontWeight:'bold'}}>📦 Stock Summary</div>
          <div style={{fontSize:11,opacity:0.8}}>Period: {currentPeriod?.start || '01-Apr-2026'} to {currentPeriod?.end || '31-Mar-2027'}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input
            value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="Search stock item..."
            style={{padding:'4px 10px',fontSize:11,borderRadius:4,border:'1px solid rgba(255,255,255,0.4)',background:'rgba(255,255,255,0.15)',color:'white',outline:'none',width:160}}
          />
          <button onClick={()=>toggleAll(true)} style={{padding:'4px 10px',background:'rgba(255,255,255,0.2)',color:'white',border:'none',borderRadius:3,cursor:'pointer',fontSize:11}}>Expand All</button>
          <button onClick={()=>toggleAll(false)} style={{padding:'4px 10px',background:'rgba(255,255,255,0.2)',color:'white',border:'none',borderRadius:3,cursor:'pointer',fontSize:11}}>Collapse All</button>
          <button onClick={()=>window.print()} style={{padding:'4px 10px',background:'rgba(255,255,255,0.2)',color:'white',border:'none',borderRadius:3,cursor:'pointer',fontSize:11}}>🖨 Print</button>
          <button onClick={onBack} style={{padding:'4px 12px',background:'rgba(255,255,255,0.15)',color:'white',border:'1px solid rgba(255,255,255,0.4)',borderRadius:3,cursor:'pointer',fontSize:11}}>✕ Close</button>
        </div>
      </div>

      {/* Sub header */}
      <div style={{background:'#fff',borderBottom:'1px solid #dde',padding:'5px 20px',fontSize:11,display:'flex',gap:24,alignItems:'center'}}>
        <span>Items: <b style={{color:'#1c5282'}}>{stockItems.length}</b></span>
        <span>Total Opening Val: <b style={{color:'#555'}}>₹{fmt(grandTotals.opVal)}</b></span>
        <span>Total Inward Val: <b style={{color:'#006600'}}>₹{fmt(grandTotals.inVal)}</b></span>
        <span>Total Outward Val: <b style={{color:'#8B0000'}}>₹{fmt(grandTotals.outVal)}</b></span>
        <span>Total Closing Stock Value: <b style={{color:'#1c5282'}}>₹{fmt(grandTotals.clVal)}</b></span>
        <span style={{marginLeft:'auto',fontSize:10,color:'#888'}}>↑ ↓ Navigate | Enter: Item Movement &amp; Vouchers | Click ✏️ to update Opening Stock</span>
      </div>

      {/* Table */}
      <div style={{flex:1,overflowY:'auto',background:'#fff'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead style={{position:'sticky',top:0,zIndex:2}}>
            <tr style={{background:'#1c5282',color:'white',borderBottom:'2px solid #fff'}}>
              <th rowSpan={2} style={{padding:'6px 12px',textAlign:'left',minWidth:180}}>Item Name</th>
              <th rowSpan={2} style={{padding:'6px 8px',textAlign:'left',width:110}}>Group</th>
              <th rowSpan={2} style={{padding:'6px 8px',textAlign:'center',width:65}}>Unit</th>
              <th colSpan={3} style={{padding:'4px 8px',textAlign:'center',borderLeft:'1px solid rgba(255,255,255,0.3)',background:'#164268'}}>Opening Stock</th>
              <th colSpan={2} style={{padding:'4px 8px',textAlign:'center',borderLeft:'1px solid rgba(255,255,255,0.3)',background:'#1a507e'}}>Inwards</th>
              <th colSpan={2} style={{padding:'4px 8px',textAlign:'center',borderLeft:'1px solid rgba(255,255,255,0.3)',background:'#164268'}}>Outwards</th>
              <th colSpan={3} style={{padding:'4px 8px',textAlign:'center',borderLeft:'1px solid rgba(255,255,255,0.3)',background:'#1a507e'}}>Closing Stock</th>
            </tr>
            <tr style={{background:'#1c5282',color:'white'}}>
              <th style={{padding:'4px 8px',textAlign:'right',width:70,borderLeft:'1px solid rgba(255,255,255,0.3)',fontSize:11}}>Qty</th>
              <th style={{padding:'4px 8px',textAlign:'right',width:75,fontSize:11}}>Rate (₹)</th>
              <th style={{padding:'4px 8px',textAlign:'right',width:85,fontSize:11}}>Value (₹)</th>
              <th style={{padding:'4px 8px',textAlign:'right',width:70,borderLeft:'1px solid rgba(255,255,255,0.3)',fontSize:11}}>Qty</th>
              <th style={{padding:'4px 8px',textAlign:'right',width:85,fontSize:11}}>Value (₹)</th>
              <th style={{padding:'4px 8px',textAlign:'right',width:70,borderLeft:'1px solid rgba(255,255,255,0.3)',fontSize:11}}>Qty</th>
              <th style={{padding:'4px 8px',textAlign:'right',width:85,fontSize:11}}>Value (₹)</th>
              <th style={{padding:'4px 8px',textAlign:'right',width:75,borderLeft:'1px solid rgba(255,255,255,0.3)',fontSize:11}}>Qty</th>
              <th style={{padding:'4px 8px',textAlign:'right',width:80,fontSize:11}}>Avg Rate</th>
              <th style={{padding:'4px 8px',textAlign:'right',width:95,fontSize:11}}>Value (₹)</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.map(([gn, items]) => {
              const isExp = expanded[gn];
              const grpOpVal = items.reduce((s,it)=>s+(itemStats.get(it.id)?.opVal||0), 0);
              const grpInVal = items.reduce((s,it)=>s+(itemStats.get(it.id)?.inVal||0), 0);
              const grpOutVal = items.reduce((s,it)=>s+(itemStats.get(it.id)?.outVal||0), 0);
              const grpClVal = items.reduce((s,it)=>s+(itemStats.get(it.id)?.clVal||0), 0);

              const currentGroupIdx = runningStockFlatIdx++;
              const isGrpSelected = rowIdx === currentGroupIdx;

              return (
                <React.Fragment key={gn}>
                  {/* Stock Group Header */}
                  <tr style={{
                    background: isGrpSelected ? '#ffd700' : '#eef3f8',
                    color: isGrpSelected ? '#000' : 'inherit',
                    fontWeight:'bold',
                    cursor:'pointer',
                    borderBottom:'1px solid #dde'
                  }}
                    onClick={()=>{ setRowIdx(currentGroupIdx); setExpanded(p=>({...p,[gn]:!p[gn]})); }}
                    onMouseEnter={()=>setRowIdx(currentGroupIdx)}>
                    <td colSpan={3} style={{padding:'6px 12px',color: isGrpSelected ? '#000' : '#1c5282'}}>
                      <span style={{marginRight:6,fontSize:10,color: isGrpSelected ? '#000' : '#666'}}>{isExp ? '▼' : '▶'}</span>
                      {gn}
                      <span style={{fontSize:10,color: isGrpSelected ? '#333' : '#888',fontWeight:'normal',marginLeft:8}}>({items.length} items)</span>
                    </td>
                    <td colSpan={2} style={{borderLeft:'1px solid #dde'}}></td>
                    <td style={{textAlign:'right',padding:'6px 8px',fontSize:11}}>{grpOpVal>0?fmt(grpOpVal):'-'}</td>
                    <td></td>
                    <td style={{textAlign:'right',padding:'6px 8px',color: isGrpSelected ? '#000' : '#006600',borderLeft:'1px solid #dde',fontSize:11}}>{grpInVal>0?fmt(grpInVal):'-'}</td>
                    <td></td>
                    <td style={{textAlign:'right',padding:'6px 8px',color: isGrpSelected ? '#000' : '#8B0000',borderLeft:'1px solid #dde',fontSize:11}}>{grpOutVal>0?fmt(grpOutVal):'-'}</td>
                    <td colSpan={2} style={{borderLeft:'1px solid #dde'}}></td>
                    <td style={{textAlign:'right',padding:'6px 8px',fontWeight:'bold',color: isGrpSelected ? '#000' : '#1c5282',fontSize:11}}>₹ {fmt(grpClVal)}</td>
                  </tr>

                  {/* Stock Items Rows */}
                  {isExp && items.map(it => {
                    const currentItemIdx = runningStockFlatIdx++;
                    const isItemSelected = rowIdx === currentItemIdx;
                    const st = itemStats.get(it.id)!;
                    const isEditing = editId === it.id;
                    const isNegative = st.clQty < 0;

                    return (
                      <tr key={it.id}
                        style={{
                          borderBottom:'1px solid #f0f0f0',
                          cursor:'pointer',
                          background: isItemSelected ? '#ffd700' : '#fff',
                          color: isItemSelected ? '#000' : 'inherit'
                        }}
                        onClick={()=>{ setRowIdx(currentItemIdx); if (!isEditing) setSelectedItemForMovement(it); }}
                        onMouseEnter={()=>setRowIdx(currentItemIdx)}>
                        <td style={{padding:'5px 12px 5px 28px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{fontWeight:'bold'}}>{it.name}</span>
                          {!isEditing && onSaveOpeningStock && (
                            <button
                              onClick={e=>handleStartEdit(it, e)}
                              title="Update Opening Stock & Rate"
                              style={{padding:'1px 6px',fontSize:10,background: isItemSelected ? '#fff' : '#f0f4f8',border:'1px solid #ccd',borderRadius:3,cursor:'pointer',color:'#555'}}>
                              ✏️
                            </button>
                          )}
                        </td>
                        <td style={{padding:'5px 8px',fontSize:11,color: isItemSelected ? '#333' : '#666'}}>{it.under}</td>
                        <td style={{padding:'5px 8px',textAlign:'center',fontSize:11,color: isItemSelected ? '#333' : '#666'}}>{getUnitSymbol(it.unit)}</td>

                        {/* Opening Stock (with inline edit) */}
                        {isEditing ? (
                          <td colSpan={3} style={{padding:'2px 8px',borderLeft:'1px solid #eee',background:'#fff9e6'}} onClick={e=>e.stopPropagation()}>
                            <div style={{display:'flex',gap:4,alignItems:'center',justifyContent:'flex-end'}}>
                              <span style={{fontSize:10,color:'#777'}}>Qty:</span>
                              <input
                                type="number"
                                value={editQty}
                                onChange={e=>setEditQty(e.target.value)}
                                style={{width:55,padding:'2px 4px',fontSize:11,border:'1px solid #999',borderRadius:2}}
                              />
                              <span style={{fontSize:10,color:'#777'}}>Rate:</span>
                              <input
                                type="number"
                                value={editRate}
                                onChange={e=>setEditRate(e.target.value)}
                                style={{width:55,padding:'2px 4px',fontSize:11,border:'1px solid #999',borderRadius:2}}
                              />
                              <button onClick={e=>handleSaveEdit(it.id, e)} disabled={isSaving} style={{padding:'2px 6px',background:'#1a7a4a',color:'white',border:'none',borderRadius:2,fontSize:10,cursor:'pointer'}}>
                                {isSaving?'…':'✓'}
                              </button>
                              <button onClick={handleCancelEdit} style={{padding:'2px 6px',background:'#888',color:'white',border:'none',borderRadius:2,fontSize:10,cursor:'pointer'}}>✕</button>
                            </div>
                          </td>
                        ) : (
                          <>
                            <td style={{textAlign:'right',padding:'5px 8px',borderLeft:'1px solid #eee',fontSize:11}}>{st.opQty || '-'}</td>
                            <td style={{textAlign:'right',padding:'5px 8px',fontSize:11}}>{st.opRate > 0 ? fmt(st.opRate) : '-'}</td>
                            <td style={{textAlign:'right',padding:'5px 8px',fontSize:11}}>{st.opVal > 0 ? fmt(st.opVal) : '-'}</td>
                          </>
                        )}

                        {/* Inwards */}
                        <td style={{textAlign:'right',padding:'5px 8px',borderLeft:'1px solid #eee',color: isItemSelected ? '#000' : '#006600',fontSize:11}}>{st.inQty > 0 ? fmt(st.inQty) : '-'}</td>
                        <td style={{textAlign:'right',padding:'5px 8px',color: isItemSelected ? '#000' : '#006600',fontSize:11}}>{st.inVal > 0 ? fmt(st.inVal) : '-'}</td>

                        {/* Outwards */}
                        <td style={{textAlign:'right',padding:'5px 8px',borderLeft:'1px solid #eee',color: isItemSelected ? '#000' : '#8B0000',fontSize:11}}>{st.outQty > 0 ? fmt(st.outQty) : '-'}</td>
                        <td style={{textAlign:'right',padding:'5px 8px',color: isItemSelected ? '#000' : '#8B0000',fontSize:11}}>{st.outVal > 0 ? fmt(st.outVal) : '-'}</td>

                        {/* Closing Stock */}
                        <td style={{textAlign:'right',padding:'5px 8px',borderLeft:'1px solid #eee',fontWeight:'bold',color: isItemSelected ? '#000' : (isNegative?'#8B0000':'#1c5282'),fontSize:11}}>
                          {fmt(st.clQty)}
                        </td>
                        <td style={{textAlign:'right',padding:'5px 8px',fontSize:11}}>{st.clRate > 0 ? fmt(st.clRate) : '-'}</td>
                        <td style={{textAlign:'right',padding:'5px 8px',fontWeight:'bold',color: isItemSelected ? '#000' : (isNegative?'#8B0000':'#1c5282'),fontSize:11}}>
                          ₹ {fmt(st.clVal)}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{background:'#1c5282',color:'white',fontWeight:'bold',borderTop:'2px solid #333'}}>
              <td colSpan={3} style={{padding:'8px 12px',letterSpacing:2}}>T O T A L</td>
              <td colSpan={2} style={{borderLeft:'1px solid rgba(255,255,255,0.3)'}}></td>
              <td style={{textAlign:'right',padding:'8px 8px'}}>₹ {fmt(grandTotals.opVal)}</td>
              <td style={{textAlign:'right',padding:'8px 8px',borderLeft:'1px solid rgba(255,255,255,0.3)'}}>{fmt(grandTotals.inQty)}</td>
              <td style={{textAlign:'right',padding:'8px 8px'}}>₹ {fmt(grandTotals.inVal)}</td>
              <td style={{textAlign:'right',padding:'8px 8px',borderLeft:'1px solid rgba(255,255,255,0.3)'}}>{fmt(grandTotals.outQty)}</td>
              <td style={{textAlign:'right',padding:'8px 8px'}}>₹ {fmt(grandTotals.outVal)}</td>
              <td colSpan={2} style={{borderLeft:'1px solid rgba(255,255,255,0.3)'}}></td>
              <td style={{textAlign:'right',padding:'8px 8px',fontSize:13}}>₹ {fmt(grandTotals.clVal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* --- ITEM MOVEMENT MODAL / DRILL-DOWN --- */}
      {selectedItemForMovement && movementData && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:999,display:'flex',justifyContent:'center',alignItems:'center'}}>
          <div style={{background:'#fff',width:'80%',maxWidth:950,maxHeight:'85vh',borderRadius:6,boxShadow:'0 10px 40px rgba(0,0,0,0.3)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            {/* Modal Header */}
            <div style={{background:'#1c5282',color:'white',padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:15,fontWeight:'bold'}}>📊 Item Movement: {selectedItemForMovement.name}</div>
                <div style={{fontSize:11,opacity:0.8}}>Group: {selectedItemForMovement.under} | Unit: {getUnitSymbol(selectedItemForMovement.unit)} | GST: {selectedItemForMovement.gstRate}%</div>
              </div>
              <button onClick={()=>setSelectedItemForMovement(null)} style={{background:'rgba(255,255,255,0.2)',color:'white',border:'none',borderRadius:3,padding:'4px 12px',cursor:'pointer',fontSize:12}}>✕ Close</button>
            </div>

            {/* Modal Stats Summary */}
            <div style={{background:'#f0f4f8',padding:'8px 20px',display:'flex',gap:20,fontSize:11,borderBottom:'1px solid #dde'}}>
              <span>Opening: <b>{movementData.opQty}</b> @ ₹{fmt(movementData.opRate)}</span>
              <span>Total Inward: <b style={{color:'#006600'}}>{movementData.inQty}</b> (₹{fmt(movementData.inVal)})</span>
              <span>Total Outward: <b style={{color:'#8B0000'}}>{movementData.outQty}</b> (₹{fmt(movementData.outVal)})</span>
              <span>Closing: <b style={{color:'#1c5282'}}>{movementData.clQty}</b> @ ₹{fmt(movementData.clRate)} (<b>₹{fmt(movementData.clVal)}</b>)</span>
            </div>

            {/* Modal Transactions Table */}
            <div style={{flex:1,overflowY:'auto',padding:10}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{background:'#1c5282',color:'white'}}>
                    <th style={{padding:'6px 10px',textAlign:'left',width:85}}>Date</th>
                    <th style={{padding:'6px 10px',textAlign:'left'}}>Particulars (Party Name)</th>
                    <th style={{padding:'6px 8px',textAlign:'center',width:95}}>Vch Type</th>
                    <th style={{padding:'6px 8px',textAlign:'center',width:80}}>Vch No</th>
                    <th style={{padding:'6px 10px',textAlign:'right',width:80}}>Inward Qty</th>
                    <th style={{padding:'6px 10px',textAlign:'right',width:80}}>Outward Qty</th>
                    <th style={{padding:'6px 10px',textAlign:'right',width:85}}>Rate (₹)</th>
                    <th style={{padding:'6px 10px',textAlign:'right',width:95}}>Amount (₹)</th>
                    <th style={{padding:'6px 10px',textAlign:'right',width:85}}>Balance Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening Balance Row */}
                  <tr style={{background:'#fafafa',borderBottom:'1px solid #eee',fontStyle:'italic'}}>
                    <td style={{padding:'6px 10px',color:'#666'}}>—</td>
                    <td colSpan={3} style={{padding:'6px 10px',fontWeight:'bold',color:'#555'}}>Opening Balance</td>
                    <td style={{textAlign:'right',padding:'6px 10px'}}>{movementData.opQty}</td>
                    <td style={{textAlign:'right',padding:'6px 10px'}}>—</td>
                    <td style={{textAlign:'right',padding:'6px 10px'}}>{fmt(movementData.opRate)}</td>
                    <td style={{textAlign:'right',padding:'6px 10px'}}>₹ {fmt(movementData.opVal)}</td>
                    <td style={{textAlign:'right',padding:'6px 10px',fontWeight:'bold',color:'#1c5282'}}>{movementData.opQty}</td>
                  </tr>

                  {movementData.transactions.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{textAlign:'center',padding:30,color:'#888'}}>No transactions found for this item during the period.</td>
                    </tr>
                  )}

                  {(()=>{
                    let runningQty = movementData.opQty;
                    return movementData.transactions.map(({voucher: v, entry: ie}, i) => {
                      const isInward = v.type === 'Purchase' || v.type === 'Credit Note';
                      const q = ie.qty || 0;
                      if (isInward) runningQty += q; else runningQty -= q;
                      const amt = ie.amount || (q * (ie.rate || 0)) || 0;

                      return (
                        <tr key={i} style={{borderBottom:'1px solid #eee',cursor:'pointer'}}
                          onClick={()=>{ if (onDrillDownVoucher) { onDrillDownVoucher(v); setSelectedItemForMovement(null); } }}
                          onMouseEnter={e=>e.currentTarget.style.background='#fdfbee'}
                          onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                          <td style={{padding:'5px 10px'}}>{v.date}</td>
                          <td style={{padding:'5px 10px',fontWeight:'bold',color:'#1c5282'}}>{v.partyName || 'Party A/c'}</td>
                          <td style={{textAlign:'center',padding:'5px 8px'}}>
                            <span style={{padding:'2px 6px',background:'#e8edf5',color:'#1c5282',borderRadius:2,fontSize:10,fontWeight:'bold'}}>{v.type}</span>
                          </td>
                          <td style={{textAlign:'center',padding:'5px 8px',fontSize:11,color:'#555'}}>{v.voucherNo || v.number}</td>
                          <td style={{textAlign:'right',padding:'5px 10px',color:'#006600',fontWeight:'bold'}}>{isInward ? fmt(q) : ''}</td>
                          <td style={{textAlign:'right',padding:'5px 10px',color:'#8B0000',fontWeight:'bold'}}>{!isInward ? fmt(q) : ''}</td>
                          <td style={{textAlign:'right',padding:'5px 10px'}}>{fmt(ie.rate || 0)}</td>
                          <td style={{textAlign:'right',padding:'5px 10px',fontWeight:'bold'}}>₹ {fmt(amt)}</td>
                          <td style={{textAlign:'right',padding:'5px 10px',fontWeight:'bold',color:runningQty<0?'#8B0000':'#1c5282'}}>{fmt(runningQty)}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div style={{background:'#f0f4f8',padding:'8px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'1px solid #dde'}}>
              <span style={{fontSize:11,color:'#666'}}>💡 Click on any transaction voucher to open and edit the voucher directly</span>
              <button onClick={()=>setSelectedItemForMovement(null)} style={{padding:'5px 16px',background:'#1c5282',color:'white',border:'none',borderRadius:3,cursor:'pointer',fontSize:12}}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function OutstandingView({ledgers,vouchers,onBack,onDrillDown}:{ledgers:Ledger[];vouchers:Voucher[];onBack:()=>void;onDrillDown?:(id:number)=>void}) {
  const [rowIdx, setRowIdx] = useState(0);
  const [panel, setPanel] = useState<'debtors'|'creditors'>('debtors');
  const debtors=ledgers.filter(l=>l.groupName==='Sundry Debtors');
  const creditors=ledgers.filter(l=>l.groupName==='Sundry Creditors');
  const bal=(l:Ledger)=>getLedgerClosingBalance(l,vouchers);

  useEffect(()=>{
    const list = panel==='debtors'?debtors:creditors;
    const onKey = (e:KeyboardEvent)=>{
      if (document.querySelector('.modal-overlay')) return;
      if(e.key==='ArrowDown') { e.preventDefault(); setRowIdx(p=>Math.min(p+1, list.length-1)); }
      else if(e.key==='ArrowUp') { e.preventDefault(); setRowIdx(p=>Math.max(p-1, 0)); }
      else if(e.key==='ArrowRight' && panel==='debtors') { setPanel('creditors'); setRowIdx(0); }
      else if(e.key==='ArrowLeft' && panel==='creditors') { setPanel('debtors'); setRowIdx(0); }
      else if(e.key==='Escape') { e.preventDefault(); onBack(); }
      else if(e.key==='Enter' && list[rowIdx]) { e.preventDefault(); onDrillDown?.(list[rowIdx].id); }
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, [panel, debtors, creditors, rowIdx, onDrillDown, onBack]);


  return (
    <div className="report-view" style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{background:'#1c5282',color:'white',padding:'10px 20px',display:'flex',justifyContent:'space-between'}}>
        <div style={{fontSize:16,fontWeight:'bold'}}>Outstanding Report (Receivable & Payable)</div>
        <div style={{fontSize:12}}>As on 14-Apr-2026</div>
      </div>
      <div style={{flex:1,overflowY:'auto',display:'flex',gap:0}}>
        <div style={{flex:1,borderRight:'2px solid #1c5282', background:panel==='debtors'?'#fff':'#f0f0f0'}}>
          <div style={{background:'#1c5282',color:'white',padding:'6px 15px',fontWeight:'bold',textAlign:'center', opacity:panel==='debtors'?1:0.6}}>RECEIVABLE (Debtors)</div>
          <table className="report-table" style={{width:'100%'}}>
            <thead><tr><th>Party Name</th><th style={{textAlign:'right'}}>Amount</th><th style={{textAlign:'right'}}>Due (days)</th></tr></thead>
            <tbody>
              {debtors.map((l,i)=>{const b=bal(l);return b!==0?<tr key={i} style={{cursor:'pointer', background: panel==='debtors'&&i===rowIdx?'#ffd700':'', color: panel==='debtors'&&i===rowIdx?'#000':'inherit'}} onClick={()=>{setPanel('debtors');setRowIdx(i);onDrillDown?.(l.id);}} onMouseEnter={()=>{setPanel('debtors');setRowIdx(i);}}><td style={{fontWeight:'bold'}}>{l.name}</td><td style={{textAlign:'right',fontWeight:'bold',color:panel==='debtors'&&i===rowIdx?'#000':'#8B0000'}}>₹ {fmt(Math.abs(b))}</td><td style={{textAlign:'right',fontSize:12,color:panel==='debtors'&&i===rowIdx?'#000':'#555'}}>14 days</td></tr>:null;})}
            </tbody>
            <tfoot><tr><td style={{fontWeight:'bold'}}>Total Receivable</td><td style={{textAlign:'right',fontWeight:'bold',color:'#8B0000',fontSize:15}}>₹ {fmt(Math.abs(debtors.reduce((s,l)=>s+bal(l),0)))}</td><td></td></tr></tfoot>
          </table>
        </div>
        <div style={{flex:1, background:panel==='creditors'?'#fff':'#f0f0f0'}}>
          <div style={{background:'#8B0000',color:'white',padding:'6px 15px',fontWeight:'bold',textAlign:'center', opacity:panel==='creditors'?1:0.6}}>PAYABLE (Creditors)</div>
          <table className="report-table" style={{width:'100%'}}>
            <thead><tr><th>Party Name</th><th style={{textAlign:'right'}}>Amount</th><th style={{textAlign:'right'}}>Due (days)</th></tr></thead>
            <tbody>
              {creditors.map((l,i)=>{const b=bal(l);return b!==0?<tr key={i} style={{cursor:'pointer', background: panel==='creditors'&&i===rowIdx?'#ffd700':'', color: panel==='creditors'&&i===rowIdx?'#000':'inherit'}} onClick={()=>{setPanel('creditors');setRowIdx(i);onDrillDown?.(l.id);}} onMouseEnter={()=>{setPanel('creditors');setRowIdx(i);}}><td style={{fontWeight:'bold'}}>{l.name}</td><td style={{textAlign:'right',fontWeight:'bold',color:panel==='creditors'&&i===rowIdx?'#000':'#006600'}}>₹ {fmt(Math.abs(b))}</td><td style={{textAlign:'right',fontSize:12,color:panel==='creditors'&&i===rowIdx?'#000':'#555'}}>21 days</td></tr>:null;})}
            </tbody>
            <tfoot><tr><td style={{fontWeight:'bold'}}>Total Payable</td><td style={{textAlign:'right',fontWeight:'bold',color:'#006600',fontSize:15}}>₹ {fmt(Math.abs(creditors.reduce((s,l)=>s+bal(l),0)))}</td><td></td></tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== CHART OF ACCOUNTS — FULLY CALCULATED ====================
function ChartOfAccountsView({ledgers,vouchers,onBack}:{ledgers:Ledger[];vouchers:Voucher[];onBack:()=>void}) {
  const [search, setSearch] = useState('');
  const grp = useMemo(()=>groupLedgersByParent(ledgers,vouchers),[ledgers,vouchers]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onBack(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  // Section definitions with their groups
  const sections: {title:string;color:string;bg:string;groups:string[];side:'Dr'|'Cr'}[] = [
    {title:'ASSETS',        color:'#1a4f8a', bg:'#e8f0fb', groups:['Cash-in-hand','Bank Accounts','Bank OD A/c','Bank OCC A/c','Sundry Debtors','Loans & Advances (Asset)','Fixed Assets','Stock-in-hand','Investments','Current Assets','Deposits (Asset)','Misc. Expenses (ASSET)'], side:'Dr'},
    {title:'LIABILITIES',   color:'#8B0000', bg:'#fbeaea', groups:['Capital Account','Reserves & Surplus','Retained Earnings','Sundry Creditors','Secured Loans','Unsecured Loans','Current Liabilities','Duties & Taxes','Provisions','Branch / Divisions','Suspense A/c'], side:'Cr'},
    {title:'INCOME',        color:'#145214', bg:'#e8f5e8', groups:['Sales Accounts','Direct Incomes','Income (Direct)','Indirect Incomes','Income (Indirect)'], side:'Cr'},
    {title:'EXPENSES',      color:'#5a4000', bg:'#fdf6e3', groups:['Purchase Accounts','Direct Expenses','Expenses (Direct)','Indirect Expenses','Expenses (Indirect)'], side:'Dr'},
  ];

  // Helper: calculate group total (signed: positive = Dr balance)
  function groupTotal(groupNames: string[]): number {
    let total = 0;
    for (const gn of groupNames) {
      const items = grp[gn] || [];
      for (const {balance} of items) total += balance;
    }
    return total;
  }

  // Section totals
  const assetTotal   = groupTotal(sections[0].groups);
  const liabTotal    = groupTotal(sections[1].groups);
  const incomeTotal  = groupTotal(sections[2].groups);  // Cr = negative from getLedgerClosingBalance perspective
  const expenseTotal = groupTotal(sections[3].groups);  // Dr = positive

  // Net Profit = Income (Cr) - Expenses (Dr)
  // Income ledgers: Cr balances are negative in our sign convention (Credit = negative number from getLedgerClosingBalance)
  // Actually getLedgerClosingBalance returns: positive = net Dr, negative = net Cr
  // For income group: balance < 0 means Cr (income earned) which is good
  // Net income in Cr terms = -incomeTotal (negate to get Cr value)
  // Net expense in Dr terms = expenseTotal
  const netIncomeCr  = -incomeTotal;   // positive means net income (Cr)
  const netExpDr     = expenseTotal;   // positive means net expense (Dr)
  const netProfit    = netIncomeCr - netExpDr; // positive = profit (Cr)

  // Balance check: Assets (Dr) = Liabilities (Cr) + Net Profit
  // assetTotal > 0 means net Dr
  // liabTotal < 0 means net Cr (normal for liabilities)
  const assetsNet    = assetTotal;           // positive = Dr
  const liabsNet     = -liabTotal;           // positive = Cr (inverted)
  const totalLiabAndProfit = liabsNet + netProfit;
  const difference   = assetsNet - totalLiabAndProfit;
  const balanced     = Math.abs(difference) < 0.01;

  const searchLower = search.trim().toLowerCase();

  const renderSection = (sec: typeof sections[0]) => {
    const hasAnyLedger = sec.groups.some(gn => (grp[gn]||[]).length > 0);
    if (!hasAnyLedger && !search) return null;

    const secTotal = groupTotal(sec.groups);
    const secTotalCr = sec.side === 'Cr' ? -secTotal : secTotal; // positive = normal direction

    return (
      <div style={{border:`2px solid ${sec.color}`, overflow:'hidden', marginBottom:0, borderRadius:4}}>
        {/* Section Header */}
        <div style={{background:sec.color, color:'white', padding:'7px 14px', fontWeight:'bold', fontSize:13, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span>▪ {sec.title}</span>
          <span style={{fontSize:12, fontFamily:'monospace', opacity:0.95}}>
            {secTotalCr !== 0 ? `${fmt(Math.abs(secTotalCr))} ${secTotalCr > 0 ? sec.side : (sec.side==='Dr'?'Cr':'Dr')}` : '—'}
          </span>
        </div>

        {/* Groups */}
        {sec.groups.map(gn => {
          let items = grp[gn] || [];
          if (searchLower) items = items.filter(({ledger}) => ledger.name.toLowerCase().includes(searchLower));
          if (items.length === 0) return null;

          const groupBal = items.reduce((s,{balance})=>s+balance, 0);
          const groupBalDisp = sec.side==='Cr' ? -groupBal : groupBal; // positive = normal

          return (
            <div key={gn}>
              {/* Group Header Row */}
              <div style={{
                background: sec.bg, borderLeft:`4px solid ${sec.color}`,
                padding:'4px 12px', fontWeight:'bold', fontSize:12,
                display:'flex', justifyContent:'space-between', alignItems:'center',
                borderBottom:`1px solid ${sec.color}44`
              }}>
                <span style={{color:sec.color}}>▶ {gn}</span>
                <span style={{color: groupBalDisp>=0 ? sec.color : '#888', fontSize:11, fontFamily:'monospace'}}>
                  {groupBalDisp !== 0 ? `${fmt(Math.abs(groupBalDisp))} ${groupBalDisp>=0?sec.side:(sec.side==='Dr'?'Cr':'Dr')}` : '—'}
                </span>
              </div>

              {/* Individual Ledgers */}
              {items.map(({ledger,balance},i) => {
                const dispBal = sec.side==='Cr' ? -balance : balance;
                return (
                  <div key={i} style={{
                    padding:'3px 12px 3px 28px', fontSize:12,
                    borderBottom:'1px dotted #e0e0e0',
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    background: i%2===0?'#fff':'#fafafa'
                  }}>
                    <span style={{color:'#333'}}>{ledger.name}</span>
                    <span style={{
                      fontWeight:'bold',
                      color: balance===0?'#bbb': dispBal>=0?'#1a4f8a':'#8B0000',
                      fontSize:11, fontFamily:'monospace'
                    }}>
                      {balance!==0
                        ? `${fmt(Math.abs(balance))} ${balance>0?'Dr':'Cr'}`
                        : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Section Total Footer */}
        <div style={{
          background: sec.color, color:'white', padding:'5px 14px',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          fontWeight:'bold', fontSize:12, borderTop:`1px solid ${sec.color}88`
        }}>
          <span>Total {sec.title}</span>
          <span style={{fontFamily:'monospace'}}>
            {secTotalCr!==0 ? `${fmt(Math.abs(secTotalCr))} ${secTotalCr>0?sec.side:(sec.side==='Dr'?'Cr':'Dr')}` : '0.00'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{height:'100%', overflowY:'auto', background:'#f5f7fa'}}>
      {/* Title Bar */}
      <div style={{background:'linear-gradient(90deg,#1c3e5a,#2b6cb0)', color:'white', padding:'10px 20px', fontWeight:'bold', fontSize:15, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <span>📊 Chart of Accounts</span>
        <div style={{display:'flex', gap:10, alignItems:'center'}}>
          <input
            value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="Search ledger..."
            style={{padding:'3px 10px', borderRadius:3, border:'1px solid #aad', fontSize:12, background:'rgba(255,255,255,0.15)', color:'white', outline:'none', width:160}}
          />
          <button onClick={onBack} style={{padding:'3px 12px', background:'rgba(255,255,255,0.15)', color:'white', border:'1px solid rgba(255,255,255,0.4)', borderRadius:3, cursor:'pointer', fontSize:12}}>✕ Close</button>
        </div>
      </div>

      {/* Company Info Summary */}
      <div style={{background:'#fff', borderBottom:'1px solid #dde', padding:'6px 20px', display:'flex', gap:30, fontSize:12, color:'#555'}}>
        <span>📁 Total Ledgers: <b style={{color:'#1c5282'}}>{ledgers.length}</b></span>
        <span>📂 Groups Used: <b style={{color:'#1c5282'}}>{Object.keys(grp).length}</b></span>
        <span style={{marginLeft:'auto', fontWeight:'bold', color:balanced?'#1a7a4a':'#d9534f'}}>
          {balanced ? '✓ Books are Balanced' : `⚠ Difference: ${fmt(Math.abs(difference))}`}
        </span>
      </div>

      <div style={{padding:'12px 14px'}}>

        {/* === ROW 1: ASSETS | LIABILITIES === */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
          {renderSection(sections[0])}
          {renderSection(sections[1])}
        </div>

        {/* === NET PROFIT ROW (bridges P&L into Balance Sheet) === */}
        <div style={{background:'#fff', border:'2px solid #2c7a2c', borderRadius:4, padding:'8px 16px', marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <div style={{fontWeight:'bold', fontSize:13, color:'#145214'}}>Net {netProfit>=0?'Profit':'Loss'} (Income − Expenses)</div>
            <div style={{fontSize:11, color:'#666', marginTop:2}}>
              Income: {fmt(netIncomeCr)} Cr &nbsp;|&nbsp; Expenses: {fmt(netExpDr)} Dr
            </div>
          </div>
          <div style={{fontWeight:'bold', fontSize:16, color: netProfit>=0?'#145214':'#8B0000', fontFamily:'monospace'}}>
            {fmt(Math.abs(netProfit))} {netProfit>=0?'Cr (Profit)':'Dr (Loss)'}
          </div>
        </div>

        {/* === ROW 2: INCOME | EXPENSES === */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
          {renderSection(sections[2])}
          {renderSection(sections[3])}
        </div>

        {/* === GRAND TOTALS / BALANCE CHECK === */}
        <div style={{background:'#1c3e5a', color:'white', borderRadius:4, overflow:'hidden'}}>
          <div style={{background:'#1a2e40', padding:'6px 16px', fontWeight:'bold', fontSize:12, letterSpacing:1}}>
            BALANCE SHEET EQUATION CHECK
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:0}}>
            {[
              {label:'Total Assets (Dr)', value:assetsNet, side:'Dr' as const, color:'#2b6cb0'},
              {label:'Total Liabilities + Capital (Cr)', value:liabsNet, side:'Cr' as const, color:'#c0392b'},
              {label:'Net Profit (Cr)', value:netProfit, side:netProfit>=0?'Cr'as const:'Dr'as const, color:'#27ae60'},
            ].map((row,i)=>(
              <div key={i} style={{padding:'10px 16px', borderRight:i<2?'1px solid rgba(255,255,255,0.15)':undefined, textAlign:'center'}}>
                <div style={{fontSize:10, opacity:0.75, marginBottom:4}}>{row.label}</div>
                <div style={{fontSize:15, fontWeight:'bold', fontFamily:'monospace', color:row.color}}>
                  {fmt(Math.abs(row.value))}
                </div>
                <div style={{fontSize:10, opacity:0.7}}>{row.side}</div>
              </div>
            ))}
          </div>
          <div style={{
            padding:'8px 16px', textAlign:'center', fontSize:13, fontWeight:'bold',
            background: balanced?'#145214':'#7B0000',
            borderTop:'1px solid rgba(255,255,255,0.2)'
          }}>
            {balanced
              ? `✓ Assets (${fmt(assetsNet)}) = Liabilities (${fmt(liabsNet)}) + Net Profit (${fmt(netProfit)}) — BALANCED`
              : `⚠ Difference of ${fmt(Math.abs(difference))} — UNBALANCED (check entries)`
            }
          </div>
        </div>

      </div>
    </div>
  );
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10?' '+ones[n%10]:'');
    if (n < 1000) return ones[Math.floor(n/100)]+' Hundred'+(n%100?' '+convert(n%100):'');
    if (n < 100000) return convert(Math.floor(n/1000))+' Thousand'+(n%1000?' '+convert(n%1000):'');
    if (n < 10000000) return convert(Math.floor(n/100000))+' Lakh'+(n%100000?' '+convert(n%100000):'');
    return convert(Math.floor(n/10000000))+' Crore'+(n%10000000?' '+convert(n%10000000):'');
  };
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  let result = 'INR ' + convert(intPart);
  if (decPart > 0) result += ' and ' + convert(decPart) + ' Paise';
  result += ' Only';
  return result;
}

function PrintPreview({vouchers,company,companies,printVoucher,ledgers,onSelectVoucher}:{
  vouchers:Voucher[];company:Company | null;companies?:Company[];printVoucher:Voucher|null;ledgers:Ledger[];onSelectVoucher:(v:Voucher)=>void;
}) {
  const [numCopies, setNumCopies] = useState(1);
  const [showOptions, setShowOptions] = useState(true);
  const [tempCopies, setTempCopies] = useState(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p' && !showOptions) {
        e.preventDefault();
        setShowOptions(true);
      }
      if (e.key === 'Enter' && showOptions) {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showOptions, tempCopies]);

  const allPrintableVouchers = vouchers.filter(v=>['Sales','Purchase','Credit Note','Debit Note','Payment','Receipt','Contra','Journal','Sales Quotation'].includes(v.type));
  const v = printVoucher || allPrintableVouchers[0] || null;
  const currentCompany = (companies || []).find(c => Number(c.id) === Number(v?.companyId)) || company;
  const getEntryLedgerName = (e: any) => {
    if (!e) return '';
    return e.ledgerName || e.ledger?.name || ledgers.find(l => Number(l.id) === Number(e.ledgerId))?.name || '';
  };

  const igst = v ? v.entries.find(e => getEntryLedgerName(e) === 'IGST Payable')?.amount || 0 : 0;
  const isInterState = igst > 0;

  if (!v) return (
    <div style={{padding:40,textAlign:'center',color:'#888',fontSize:15}}>
      <div style={{fontSize:40,marginBottom:15}}>🖨️</div>
      <div>No voucher found to print.</div>
      <div style={{fontSize:12,marginTop:8}}>Create a voucher first, then click P: Print</div>
    </div>
  );


  const hsnMap = new Map<string,{hsnCode:string;taxable:number;cgst:number;sgst:number;igst:number;total:number;rate:number}>();
  v.inventoryEntries.forEach(e=>{
    const r = e.gstRate;
    const hsnKey = (e.hsnCode||'—') + '_' + r;
    const existing = hsnMap.get(hsnKey)||{hsnCode:e.hsnCode||'—',taxable:0,cgst:0,sgst:0,igst:0,total:0,rate:r};
    const taxable = e.amount;
    const c = isInterState?0:Math.round(taxable*r/200*100)/100;
    const s = isInterState?0:Math.round(taxable*r/200*100)/100;
    const ig = isInterState?Math.round(taxable*r/100*100)/100:0;
    hsnMap.set(hsnKey,{...existing,taxable:existing.taxable+taxable,cgst:existing.cgst+c,sgst:existing.sgst+s,igst:existing.igst+ig,total:existing.total+c+s+ig});
  });
  const hsnRows = Array.from(hsnMap.values());

  const tdB:React.CSSProperties = {border:'1px solid #555',padding:'4px 6px',fontSize:11,verticalAlign:'top'};
  const tdH:React.CSSProperties = {...tdB,fontWeight:'bold',background:'#f2f2f2',textAlign:'center'};

  const handlePrint = () => {
    setNumCopies(tempCopies);
    setTimeout(() => { window.print(); setShowOptions(false); }, 100);
  };

  // ===== ACCOUNTING VOUCHER PRINT (Payment, Receipt, Contra, Journal) =====
  const renderAccountingVoucher = (copyIdx: number) => {
    const copyLabels = ["ORIGINAL", "DUPLICATE", "TRIPLICATE", "EXTRA COPY"];
    const vColors: Record<string, string> = {
      'Payment': '#8B0000', 'Receipt': '#1a7a4a', 'Contra': '#4a4a00', 'Journal': '#1c5282'
    };
    const vc = vColors[v.type] || '#1c5282';
    const partyLedger = ledgers.find(l => l.name === v.partyName);
    const totalDr = v.entries.filter(e => e.entryType === 'Dr').reduce((s,e) => s + e.amount, 0);
    const totalCr = v.entries.filter(e => e.entryType === 'Cr').reduce((s,e) => s + e.amount, 0);
    const printTotal = Math.max(totalDr, totalCr);

    const tdB: React.CSSProperties = {border:'1px solid #555',padding:'5px 8px',fontSize:11};
    const tdH: React.CSSProperties = {...tdB,fontWeight:'bold',background:'#f2f2f2',textAlign:'center'};

    return (
      <div key={copyIdx} className="invoice-copy" style={{width:'210mm',minHeight:'297mm',margin:'0 auto 30px auto',background:'white',border:'1.5px solid #000',fontFamily:'"Arial Narrow",Arial,sans-serif',fontSize:11,position:'relative',boxSizing:'border-box',padding:0}}>
        {/* Top Label */}
        <div style={{position:'absolute',top:5,right:10,fontSize:9,fontWeight:'bold'}}>{copyLabels[copyIdx]||copyLabels[3]}</div>
        {/* Title */}
        <div style={{textAlign:'center',fontWeight:'bold',fontSize:16,padding:'10px 0 5px',borderBottom:`2px solid ${vc}`,color:vc}}>{v.type.toUpperCase()} VOUCHER</div>
        {/* Company Header */}
        <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',borderBottom:'1px solid #000'}}>
          <div style={{padding:'8px 10px',borderRight:'1px solid #000'}}>
            {company?.showLogo && company?.logo && (
              <img src={company.logo} alt="Logo" style={{height:48,objectFit:'contain',display:'block',marginBottom:4}}/>
            )}
            <div style={{fontWeight:'bold',fontSize:14}}>{company?.name}</div>
            <div style={{fontSize:10,whiteSpace:'pre-wrap'}}>{company?.address}{company?.pinCode?' - '+company.pinCode:''}</div>
            <div style={{fontSize:10}}>GSTIN/UIN : <b>{company?.gstin}</b></div>
            <div style={{fontSize:10}}>State : {company?.state}</div>
            {company?.telephone && <div style={{fontSize:10}}>Ph: <b>{company.telephone}</b></div>}
          </div>
          <div style={{display:'grid',gridTemplateRows:'1fr 1fr',padding:0}}>
            <div style={{padding:'6px 10px',borderBottom:'1px solid #000'}}>
              <div style={{fontSize:9}}>Voucher No.</div>
              <div style={{fontWeight:'bold',fontSize:13}}>{v.voucherNo}</div>
            </div>
            <div style={{padding:'6px 10px'}}>
              <div style={{fontSize:9}}>Dated</div>
              <div style={{fontWeight:'bold',fontSize:13}}>{v.date}</div>
            </div>
          </div>
        </div>
        {/* Party Info */}
        {v.partyName && (
          <div style={{padding:'6px 10px',borderBottom:'1px solid #000',background:'#fafafa'}}>
            <span style={{fontSize:9,color:'#555'}}>{v.type==='Payment'?'To (Payee)':v.type==='Receipt'?'Received From':'Party A/c'} :</span>
            <span style={{fontWeight:'bold',fontSize:13,marginLeft:8}}>{v.partyName}</span>
            {partyLedger?.address && <span style={{fontSize:10,color:'#444',marginLeft:10}}>{partyLedger.address}</span>}
            {partyLedger?.gstin && <span style={{fontSize:10,color:'#444',marginLeft:10}}>GSTIN: <b>{partyLedger.gstin}</b></span>}
          </div>
        )}
        {/* Ledger Entries Table */}
        <table style={{width:'100%',borderCollapse:'collapse',borderBottom:'1px solid #000'}}>
          <thead>
            <tr>
              <th style={{...tdH,textAlign:'left'}}>Account</th>
              <th style={{...tdH,width:120,textAlign:'right'}}>Dr Amount (₹)</th>
              <th style={{...tdH,width:120,textAlign:'right'}}>Cr Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {v.entries.filter(e => getEntryLedgerName(e)).map((e,i)=>(
              <tr key={i}>
                <td style={tdB}>{getEntryLedgerName(e)}</td>
                <td style={{...tdB,textAlign:'right'}}>{e.entryType==='Dr'?fmt(e.amount):'—'}</td>
                <td style={{...tdB,textAlign:'right'}}>{e.entryType==='Cr'?fmt(e.amount):'—'}</td>
              </tr>
            ))}
            {Array.from({length:Math.max(0,5-v.entries.length)}).map((_,i)=>(
              <tr key={'b'+i} style={{height:22}}><td style={{...tdB,borderTop:'none',borderBottom:'none'}}/><td style={{...tdB,borderTop:'none',borderBottom:'none'}}/><td style={{...tdB,borderTop:'none',borderBottom:'none'}}/></tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{fontWeight:'bold',borderTop:'1px solid #000'}}>
              <td style={{...tdB,textAlign:'right'}}>Total</td>
              <td style={{...tdB,textAlign:'right',fontSize:13}}>₹ {fmt(totalDr)}</td>
              <td style={{...tdB,textAlign:'right',fontSize:13}}>₹ {fmt(totalCr)}</td>
            </tr>
          </tfoot>
        </table>
        {/* Amount in Words */}
        <div style={{padding:'6px 10px',borderBottom:'1px solid #000'}}>
          <div style={{fontSize:9}}>Amount (in words)</div>
          <div style={{fontWeight:'bold',fontSize:11}}>{numberToWords(printTotal)}</div>
        </div>
        {/* Narration */}
        {v.narration && (
          <div style={{padding:'6px 10px',borderBottom:'1px solid #000',fontSize:10}}>
            <b>Narration:</b> {v.narration}
          </div>
        )}
        {/* Signature */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',minHeight:80,marginTop:'auto'}}>
          <div style={{padding:'10px',borderRight:'1px solid #000',fontSize:9}}>
            {(company?.bankName||company?.accountNo) && (
              <><b>Bank Details</b><br/>
              {company?.bankName && <span>Bank: <b>{company.bankName}</b><br/></span>}
              {company?.accountNo && <span>A/c No: <b>{company.accountNo}</b><br/></span>}
              {company?.ifsc && <span>IFSC: <b>{company.ifsc}</b></span>}</>
            )}
          </div>
          <div style={{padding:'10px',textAlign:'right',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
            <div style={{fontSize:9}}>for <b>{company?.name}</b></div>
            <div style={{fontSize:9}}>Authorised Signatory</div>
          </div>
        </div>
        <div style={{textAlign:'center',fontSize:8,borderTop:'1px solid #000',padding:'2px 0'}}>This is a Computer Generated Voucher</div>
      </div>
    );
  };

  const renderInvoice = (copyIdx: number) => {
    const pd = v.partyDetails;
    const dd = v.dispatchDetails;
    const copyLabels = ["ORIGINAL FOR RECIPIENT", "DUPLICATE FOR TRANSPORTER", "TRIPLICATE FOR SUPPLIER", "EXTRA COPY"];

    // Column visibility - strictly based on stock item showInclTax/showAmtInclTax/showDiscount flags
    // If user sets these to "No" during item creation, columns will NOT appear in print preview
    const showDiscount = !!company?.showDiscount;
    const showInclRate = v.inventoryEntries.some((e: any) => e.showInclTax === true);
    const showAmtIncl = v.inventoryEntries.some((e: any) => e.showAmtInclTax === true);

    const stateCode = (s: string) => {
      const codes: Record<string, string> = {
        'jammu & kashmir': '01', 'himachal pradesh': '02', 'punjab': '03', 'chandigarh': '04', 'uttarakhand': '05',
        'haryana': '06', 'delhi': '07', 'rajasthan': '08', 'uttar pradesh': '09', 'bihar': '10', 'sikkim': '11',
        'arunachal pradesh': '12', 'assam': '13', 'nagaland': '14', 'manipur': '15', 'mizoram': '16', 'tripura': '17',
        'meghalaya': '18', 'assam_old': '19', 'west bengal': '19', 'jharkhand': '20', 'odisha': '21', 'chhattisgarh': '22',
        'madhya pradesh': '23', 'gujarat': '24', 'daman & diu': '25', 'dadra & nagar haveli': '26', 'maharashtra': '27',
        'andhra pradesh_old': '28', 'karnataka': '29', 'goa': '30', 'lakshadweep': '31', 'kerala': '32', 'tamil nadu': '33',
        'puducherry': '34', 'andaman & nicobar islands': '35', 'telangana': '36', 'andhra pradesh': '37', 'ladakh': '38'
      };
      return codes[s.toLowerCase().trim()] || '—';
    };
    
    // Calculations
    const taxEntries = (v?.entries || []).filter((e: any) => {
      const lname = getEntryLedgerName(e);
      return lname.includes('GST Payable');
    });
    const addlEntries = (v?.entries || []).filter((e: any) => {
      const lname = getEntryLedgerName(e);
      return lname !== v.partyName && lname !== 'Sales A/c' && lname !== 'Purchase A/c' && !lname.includes('GST Payable') && lname !== 'Round Off' && e.amount > 0;
    });
    const roundOffEntry = (v?.entries || []).find((e: any) => getEntryLedgerName(e) === 'Round Off');
    const roundOffAmt = roundOffEntry?.amount || 0;
    // Purchase-specific: lookup party ledger for supplier info
    const isPurchaseType = v.type === 'Purchase' || v.type === 'Debit Note';
    const partyLedger = ledgers.find(l => l.name === v.partyName);
    const invoiceTitle = v.type === 'Credit Note' ? 'CREDIT NOTE' : v.type === 'Debit Note' ? 'DEBIT NOTE' : 'TAX INVOICE';
    const supplierInvNo = pd?.supplierInvNo || '';
    const supplierInvDate = pd?.supplierInvDate || '';

    return (
      <div key={copyIdx} className="invoice-copy" style={{width:'210mm', minHeight:'297mm', margin:'0 auto 30px auto', background:'white', border:'1.5px solid #000', fontFamily:'"Arial Narrow", Arial, sans-serif', fontSize:11, position:'relative', boxSizing:'border-box', padding:0}}>
        {/* TOP LABEL */}
        <div style={{position:'absolute', top:5, right:10, fontSize:9, fontWeight:'bold'}}>{copyLabels[copyIdx] || copyLabels[3]}</div>
        
        {/* TITLE */}
        <div style={{textAlign:'center', fontWeight:'bold', fontSize:15, padding:'10px 0 5px', borderBottom:'1px solid #000'}}>{invoiceTitle}</div>
        
        {/* HEADER SECTION: Company/Supplier Info & Invoice Info */}
        <div style={{display:'grid', gridTemplateColumns:'1.2fr 1fr', borderBottom:'1px solid #000'}}>
          <div style={{padding:'5px 10px', borderRight:'1px solid #000', display:'flex', flexDirection:'row', alignItems:'flex-start', gap:8}}>
            {/* For Purchase: show Supplier (Party Ledger) info; For Sales: show Company info */}
            {!isPurchaseType && company?.showLogo && company?.logo && (
              <div style={{flexShrink:0, width:'1in', height:'1in', display:'flex', alignItems:'center', justifyContent:'center', marginRight:6}}>
                <img src={company.logo} alt="Logo" style={{width:'1in', height:'1in', objectFit:'contain'}} />
              </div>
            )}
            <div style={{flex:1}}>
              {isPurchaseType ? (
                // Purchase: Supplier info at top-left
                <>
                  <div style={{fontWeight:'bold', fontSize:14}}>{v.partyName}</div>
                  {partyLedger?.address && <div style={{fontSize:10, whiteSpace:'pre-wrap'}}>{partyLedger.address}</div>}
                  {partyLedger?.gstin && <div style={{marginTop:2, fontSize:10}}>GSTIN/UIN : <b>{partyLedger.gstin}</b></div>}
                  {partyLedger?.state && <div style={{fontSize:10}}>State Name : {partyLedger.state}, Code : {stateCode(partyLedger.state)}</div>}
                  {partyLedger?.phone && <div style={{fontSize:10}}>Ph: <b>{partyLedger.phone}</b></div>}
                </>
              ) : (
                // Sales: Our Company info at top-left
                <>
                  <div style={{fontWeight:'bold', fontSize:14}}>{company?.name || 'Company Name'}</div>
                  <div style={{fontSize:10, whiteSpace:'pre-wrap'}}>{company?.address}{company?.pinCode ? ' - ' + company.pinCode : ''}</div>
                  <div style={{marginTop:2, fontSize:10}}>GSTIN/UIN : <b>{company?.gstin}</b></div>
                  <div style={{fontSize:10}}>State Name : {company?.state}, Code : {stateCode(company?.state||'')}</div>
                  {company?.telephone && <div style={{fontSize:10}}>Ph: <b>{company.telephone}</b></div>}
                  {company?.showMobile && company?.mobile && <div style={{fontSize:10}}>Mob: <b>{company.mobile}</b></div>}
                  {company?.showEmail && company?.email && <div style={{fontSize:10}}>Email: <b>{company.email}</b></div>}
                  {company?.showWebsite && company?.website && <div style={{fontSize:10}}>Web: <b>{company.website}</b></div>}
                </>
              )}
            </div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr'}}>
            <div style={{padding:'5px 10px', borderRight:'1px solid #000', borderBottom:'1px solid #000'}}>Invoice No.<br/><b>{v.voucherNo}</b></div>
            <div style={{padding:'5px 10px', borderBottom:'1px solid #000'}}>Dated<br/><b>{v.date}</b></div>
            {isPurchaseType ? (
              <>
                <div style={{padding:'5px 10px', borderRight:'1px solid #000', borderBottom:'1px solid #000'}}>Supplier Invoice No. &amp; Date<br/><b>{supplierInvNo||'—'}</b>{supplierInvDate?<span style={{fontSize:9}}> dt. {supplierInvDate}</span>:''}</div>
                <div style={{padding:'5px 10px', borderBottom:'1px solid #000'}}>Other References<br/><b>{v.refNo||'—'}</b></div>
              </>
            ) : (
              <>
                <div style={{padding:'5px 10px', borderRight:'1px solid #000', borderBottom:'1px solid #000'}}>Delivery Note<br/><b>{dd?.deliveryNoteNo||'—'}</b></div>
                <div style={{padding:'5px 10px', borderBottom:'1px solid #000'}}>Mode/Terms of Payment<br/><b>{pd?.termsOfDelivery||'—'}</b></div>
              </>
            )}
            <div style={{padding:'5px 10px', borderRight:'1px solid #000'}}>Reference No. &amp; Date.<br/><b>{v.refNo||'—'}</b></div>
            <div style={{padding:'5px 10px'}}>Bill of Lading/LR-RR No.<br/><b>{dd?.billOfLadingNo||'—'}</b></div>
          </div>
        </div>

        {/* PARTY SECTION: Consignee & Buyer (Sales) / Consignee & Supplier (Purchase) */}
        <div style={{display:'grid', gridTemplateColumns:'1.2fr 1fr', borderBottom:'1px solid #000'}}>
          <div style={{display:'flex', flexDirection:'column'}}>
            <div style={{padding:'4px 10px', borderBottom:'1px solid #000', borderRight:'1px solid #000'}}>
              <div style={{fontSize:9, fontWeight:'bold', color:'#333'}}>Consignee (Ship to)</div>
              {isPurchaseType ? (
                // Purchase: Consignee = Our Company
                <>
                  <div style={{fontWeight:'bold', fontSize:12}}>{company?.name}</div>
                  <div style={{fontSize:10, whiteSpace:'pre-wrap'}}>{company?.address}{company?.pinCode?' - '+company.pinCode:''}</div>
                  {company?.gstin && <div style={{marginTop:2, fontSize:10}}>GSTIN/UIN : <b>{company.gstin}</b></div>}
                  {company?.state && <div style={{fontSize:10}}>State Name : {company.state}, Code : {stateCode(company.state||'')}</div>}
                </>
              ) : (
                // Sales: Consignee = Ship-to party
                <>
                  <div style={{fontWeight:'bold', fontSize:12}}>{pd?.shipName || v.partyName}</div>
                  <div style={{fontSize:10, whiteSpace:'pre-wrap'}}>{pd?.shipAddress || pd?.buyerAddress || partyLedger?.address || '—'}</div>
                  <div style={{marginTop:2, fontSize:10}}>GSTIN/UIN : <b>{pd?.shipGstin || pd?.buyerGstin || partyLedger?.gstin || '—'}</b></div>
                  <div style={{fontSize:10}}>State Name : {pd?.shipState || pd?.buyerState || partyLedger?.state || '—'}, Code : {stateCode(pd?.shipState || pd?.buyerState || partyLedger?.state || '')}</div>
                </>
              )}
            </div>
            <div style={{padding:'4px 10px', borderRight:'1px solid #000', flex:1}}>
              {isPurchaseType ? (
                // Purchase: Supplier (Bill from) = Party Ledger
                <>
                  <div style={{fontSize:9, fontWeight:'bold', color:'#333'}}>Supplier (Bill from)</div>
                  <div style={{fontWeight:'bold', fontSize:12}}>{v.partyName}</div>
                  <div style={{fontSize:10, whiteSpace:'pre-wrap'}}>{pd?.buyerAddress || partyLedger?.address || '—'}</div>
                  <div style={{marginTop:2, fontSize:10}}>GSTIN/UIN : <b>{pd?.buyerGstin || partyLedger?.gstin || '—'}</b></div>
                  <div style={{fontSize:10}}>State Name : {pd?.buyerState || partyLedger?.state || '—'}, Code : {stateCode(pd?.buyerState || partyLedger?.state || '')}</div>
                </>
              ) : (
                // Sales: Buyer (Bill to) = Party
                <>
                  <div style={{fontSize:9, fontWeight:'bold', color:'#333'}}>Buyer (Bill to)</div>
                  <div style={{fontWeight:'bold', fontSize:12}}>{v.partyName}</div>
                  <div style={{fontSize:10, whiteSpace:'pre-wrap'}}>{pd?.buyerAddress || partyLedger?.address || '—'}</div>
                  <div style={{marginTop:2, fontSize:10}}>GSTIN/UIN : <b>{pd?.buyerGstin || partyLedger?.gstin || '—'}</b></div>
                  <div style={{fontSize:10}}>State Name : {pd?.buyerState || partyLedger?.state || '—'}, Code : {stateCode(pd?.buyerState || partyLedger?.state || '')}</div>
                </>
              )}
            </div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr'}}>
            <div style={{padding:'5px 10px', borderRight:'1px solid #000', borderBottom:'1px solid #000'}}>{isPurchaseType?'Purchase Order No.':'Buyer\'s Order No.'}<br/><b>{pd?.buyerOrderNo || '—'}</b></div>
            <div style={{padding:'5px 10px', borderBottom:'1px solid #000'}}>Dated<br/><b>{pd?.buyerOrderDate || '—'}</b></div>
            <div style={{padding:'5px 10px', borderRight:'1px solid #000', borderBottom:'1px solid #000'}}>Dispatch Doc No.<br/><b>{dd?.dispatchDocNo || '—'}</b></div>
            <div style={{padding:'5px 10px', borderBottom:'1px solid #000'}}>Motor Vehicle No.<br/><b>{dd?.motorVehicleNo || '—'}</b></div>
            <div style={{padding:'5px 10px', borderRight:'1px solid #000', borderBottom:'1px solid #000'}}>Dispatched through<br/><b>{dd?.dispatchedThrough || '—'}</b></div>
            <div style={{padding:'5px 10px', borderBottom:'1px solid #000'}}>Destination<br/><b>{dd?.destination || '—'}</b></div>
            <div style={{padding:'5px 10px', borderRight:'1px solid #000', gridColumn:'span 2', minHeight:60}}>Carrier Name/Agent<br/><b>{dd?.carrierNameAgent || '—'}</b> &nbsp;&nbsp; Terms of Delivery: <b>{pd?.termsOfDelivery || '—'}</b></div>
          </div>

        </div>

        {/* ITEMS TABLE */}
        <table style={{width:'100%', borderCollapse:'collapse', borderBottom:'1px solid #000'}}>
          <thead>
            <tr>
              <th style={{...tdH, width:30}}>Sl No.</th>
              <th style={{...tdH, textAlign:'left'}}>Description of Goods</th>
              <th style={{...tdH, width:60}}>HSN/SAC</th>
              <th style={{...tdH, width:80, textAlign:'right'}}>Quantity</th>
              {showInclRate && <th style={{...tdH, width:80, textAlign:'right'}}>Rate (Incl.)</th>}
              <th style={{...tdH, width:70, textAlign:'right'}}>Rate</th>
              <th style={{...tdH, width:40}}>per</th>
              {showDiscount && <th style={{...tdH, width:50, textAlign:'right'}}>Disc%</th>}
              <th style={{...tdH, width:100, textAlign:'right'}}>Amount</th>
              {showAmtIncl && <th style={{...tdH, width:100, textAlign:'right'}}>Amt (Incl.)</th>}
            </tr>
          </thead>
          <tbody style={{minHeight:'400px'}}>
            {(v?.inventoryEntries || []).map((e: any, idx: number) => (
              <tr key={idx} style={{fontSize:11}}>
                <td style={{...tdB, textAlign:'center', borderTop:'none', borderBottom:'none'}}>{idx+1}</td>
                <td style={{...tdB, borderTop:'none', borderBottom:'none'}}>
                  <div style={{fontWeight:'bold'}}>{e.itemName || (e as any).stockItem?.name}</div>
                  {e.desc1 && <div style={{fontSize:10, color:'#444', fontStyle:'italic', paddingLeft:6}}>{e.desc1}</div>}
                  {e.desc2 && <div style={{fontSize:10, color:'#444', fontStyle:'italic', paddingLeft:6}}>{e.desc2}</div>}
                  {e.desc3 && <div style={{fontSize:10, color:'#444', fontStyle:'italic', paddingLeft:6}}>{e.desc3}</div>}
                </td>
                <td style={{...tdB, textAlign:'center', borderTop:'none', borderBottom:'none'}}>{e.hsnCode}</td>
                <td style={{...tdB, textAlign:'right', borderTop:'none', borderBottom:'none', fontWeight:'bold'}}>{fmt(e.qty)} {e.unit}</td>
                {showInclRate && <td style={{...tdB, textAlign:'right', borderTop:'none', borderBottom:'none'}}>{fmt(e.rateInclTax)}</td>}
                <td style={{...tdB, textAlign:'right', borderTop:'none', borderBottom:'none'}}>{fmt(e.rate)}</td>
                <td style={{...tdB, textAlign:'center', borderTop:'none', borderBottom:'none'}}>{e.unit}</td>
                {showDiscount && <td style={{...tdB, textAlign:'right', borderTop:'none', borderBottom:'none'}}>{e.discountPerc > 0 ? e.discountPerc + '%' : '—'}</td>}
                <td style={{...tdB, textAlign:'right', borderTop:'none', borderBottom:'none', fontWeight:'bold'}}>{fmt(e.amount)}</td>
                {showAmtIncl && <td style={{...tdB, textAlign:'right', borderTop:'none', borderBottom:'none'}}>{fmt(e.amountInclTax)}</td>}
              </tr>
            ))}
            {/* Blank Space filling */}
            {Array.from({length: Math.max(0, 10 - (v?.inventoryEntries?.length || 0))}).map((_, i) => (
              <tr key={'blank-'+i} style={{height:20}}><td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/><td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/><td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/><td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>{showInclRate&&<td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>}<td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/><td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>{showDiscount&&<td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>}<td style={{...tdB, border:'none', borderLeft:'1px solid #000', ...(showAmtIncl?{borderRight:'1px solid #000'}:{})}}/>{showAmtIncl&&<td style={{...tdB, border:'none'}}/>}</tr>
            ))}
            
            {/* Additional Ledgers in Table */}
            {addlEntries.map((ae, idx) => (
               <tr key={'addl-'+idx} style={{fontSize:11}}>
                 <td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>
                 <td style={{...tdB, border:'none', borderRight:'1px solid #000', textAlign:'right'}}>{getEntryLedgerName(ae)}</td>
                 <td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>
                 <td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>
                 {showInclRate&&<td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>}
                 <td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>
                 <td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>
                 {showDiscount&&<td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>}
                 <td style={{...tdB, border:'none', borderLeft:'1px solid #000', ...(showAmtIncl?{borderRight:'1px solid #000'}:{}), textAlign:'right', fontWeight:'bold'}}>{fmt(ae.amount)}</td>
                 {showAmtIncl&&<td style={{...tdB, border:'none'}}/>}
               </tr>
            ))}

            {/* GST Breakdown in Table */}
            {taxEntries.map((te, idx) => (
               <tr key={'tax-'+idx} style={{fontSize:11, fontStyle:'italic'}}>
                 <td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>
                 <td style={{...tdB, border:'none', borderRight:'1px solid #000', textAlign:'right', paddingRight:20}}>{getEntryLedgerName(te)}</td>
                 <td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>
                 <td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>
                 {showInclRate&&<td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>}
                 <td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>
                 <td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>
                 {showDiscount&&<td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>}
                 <td style={{...tdB, border:'none', borderLeft:'1px solid #000', ...(showAmtIncl?{borderRight:'1px solid #000'}:{}), textAlign:'right'}}>{fmt(te.amount)}</td>
                 {showAmtIncl&&<td style={{...tdB, border:'none'}}/>}
               </tr>
            ))}

            {/* Round Off in Table */}
            {roundOffAmt !== 0 && (
               <tr style={{fontSize:11}}>
                 <td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>
                 <td style={{...tdB, border:'none', borderRight:'1px solid #000', textAlign:'right'}}>Round Off</td>
                 <td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>
                 <td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>
                 {showInclRate&&<td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>}
                 <td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>
                 <td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>
                 {showDiscount&&<td style={{...tdB, border:'none', borderRight:'1px solid #000'}}/>}
                 <td style={{...tdB, border:'none', borderLeft:'1px solid #000', ...(showAmtIncl?{borderRight:'1px solid #000'}:{}), textAlign:'right'}}>{fmt(Math.abs(roundOffAmt))}</td>
                 {showAmtIncl&&<td style={{...tdB, border:'none'}}/>}
               </tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{borderTop:'1px solid #000', fontWeight:'bold'}}>
              <td style={{...tdB, textAlign:'right'}} colSpan={2}>Total</td>
              <td style={tdB}/>
              <td style={{...tdB, textAlign:'right'}}>{fmt((v?.inventoryEntries || []).reduce((s,e)=>s+e.qty,0))}</td>
              {showInclRate&&<td style={tdB}/>}
              <td style={tdB}/>
              <td style={tdB}/>
              {showDiscount&&<td style={tdB}/>}
              <td style={{...tdB, textAlign:'right', fontSize:13}}>₹ {fmt(v.total)}</td>
              {showAmtIncl&&<td style={{...tdB, textAlign:'right', fontSize:13}}>₹ {fmt((v?.inventoryEntries||[]).reduce((s:number,e:any)=>s+(e.amountInclTax||0),0))}</td>}
            </tr>
          </tfoot>
        </table>

        {/* FOOTER SECTION */}
        <div style={{padding:'5px 10px', borderBottom:'1px solid #000'}}>
          <div style={{fontSize:9}}>Amount Chargeable (in words)</div>
          <div style={{fontWeight:'bold', fontSize:11}}>{numberToWords(v.total)}</div>
        </div>

        {/* HSN SUMMARY TABLE (Professional Logic) */}
        <div style={{borderBottom:'1px solid #000'}}>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:9}}>
            <thead>
              <tr>
                <th style={{...tdH, fontSize:9}} rowSpan={2}>HSN/SAC</th>
                <th style={{...tdH, fontSize:9}} rowSpan={2}>Taxable<br/>Value</th>
                <th style={{...tdH, fontSize:9}} colSpan={2}>Central Tax</th>
                <th style={{...tdH, fontSize:9}} colSpan={2}>State Tax</th>
                <th style={{...tdH, fontSize:9}} colSpan={2}>Integrated Tax</th>
                <th style={{...tdH, fontSize:9}} rowSpan={2}>Total<br/>Tax Amount</th>
              </tr>
              <tr>
                <th style={{...tdH, fontSize:9}}>Rate</th>
                <th style={{...tdH, fontSize:9}}>Amount</th>
                <th style={{...tdH, fontSize:9}}>Rate</th>
                <th style={{...tdH, fontSize:9}}>Amount</th>
                <th style={{...tdH, fontSize:9}}>Rate</th>
                <th style={{...tdH, fontSize:9}}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {hsnRows.map((hr, idx) => (
                <tr key={idx}>
                  <td style={{...tdB, textAlign:'center'}}>{hr.hsnCode}</td>
                  <td style={{...tdB, textAlign:'right'}}>{fmt(hr.taxable)}</td>
                  <td style={{...tdB, textAlign:'center'}}>{hr.cgst > 0 ? (hr.rate/2 + '%') : (isInterState ? '—' : '0%')}</td>
                  <td style={{...tdB, textAlign:'right'}}>{fmt(hr.cgst)}</td>
                  <td style={{...tdB, textAlign:'center'}}>{hr.sgst > 0 ? (hr.rate/2 + '%') : (isInterState ? '—' : '0%')}</td>
                  <td style={{...tdB, textAlign:'right'}}>{fmt(hr.sgst)}</td>
                  <td style={{...tdB, textAlign:'center'}}>{hr.igst > 0 ? (hr.rate + '%') : (isInterState ? hr.rate + '%' : '0%')}</td>
                  <td style={{...tdB, textAlign:'right'}}>{fmt(hr.igst)}</td>
                  <td style={{...tdB, textAlign:'right'}}>{fmt(hr.cgst + hr.sgst + hr.igst)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{fontWeight:'bold'}}>
                <td style={{...tdB, textAlign:'right'}}>Total</td>
                <td style={{...tdB, textAlign:'right'}}>{fmt(hsnRows.reduce((s,r)=>s+r.taxable,0))}</td>
                <td style={tdB}/>
                <td style={{...tdB, textAlign:'right'}}>{fmt(hsnRows.reduce((s,r)=>s+r.cgst,0))}</td>
                <td style={tdB}/>
                <td style={{...tdB, textAlign:'right'}}>{fmt(hsnRows.reduce((s,r)=>s+r.sgst,0))}</td>
                <td style={tdB}/>
                <td style={{...tdB, textAlign:'right'}}>{fmt(hsnRows.reduce((s,r)=>s+r.igst,0))}</td>
                <td style={{...tdB, textAlign:'right'}}>{fmt(hsnRows.reduce((s,r)=>s+r.cgst+r.sgst+r.igst,0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{padding:'5px 10px', borderBottom:'1px solid #000', fontSize:9}}>
          Tax Amount (in words) : <b>{numberToWords(hsnRows.reduce((s,r)=>s+r.cgst+r.sgst+r.igst,0))}</b>
        </div>

        {/* BANK DETAILS & SIGNATURE */}
        <div style={{display:'grid', gridTemplateColumns:'1.2fr 1fr', minHeight:120}}>
          <div style={{padding:'10px', borderRight:'1px solid #000', display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
             {isPurchaseType ? (
               // Purchase: Show Supplier (party ledger) bank details
               (partyLedger?.bankName || partyLedger?.accountNo || partyLedger?.ifsc) ? (
                 <div style={{fontSize:9}}>
                   <b>Supplier's Bank Details</b><br/>
                   {partyLedger?.bankName && <span>Bank Name : <b>{partyLedger.bankName}</b><br/></span>}
                   {partyLedger?.bankHolderName && <span>A/c Holder : <b>{partyLedger.bankHolderName}</b><br/></span>}
                   {partyLedger?.accountNo && <span>A/c No. : <b>{partyLedger.accountNo}</b><br/></span>}
                   {partyLedger?.ifsc && <span>IFS Code : <b>{partyLedger.ifsc}</b><br/></span>}
                 </div>
               ) : (
                 <div style={{fontSize:9, color:'#888', fontStyle:'italic'}}>Supplier bank details not available in ledger.</div>
               )
             ) : (
               // Sales: Show Company bank details
               (company?.bankName || company?.accountNo || company?.ifsc) ? (
                 <div style={{fontSize:9}}>
                   <b>Company's Bank Details</b><br/>
                   {company?.bankName && <span>Bank Name : <b>{company.bankName}</b><br/></span>}
                   {company?.bankHolderName && <span>A/c Holder : <b>{company.bankHolderName}</b><br/></span>}
                   {company?.accountNo && <span>A/c No. : <b>{company.accountNo}</b><br/></span>}
                   {company?.ifsc && <span>IFS Code : <b>{company.ifsc}</b><br/></span>}
                 </div>
               ) : (
                 <div style={{fontSize:9, color:'#888', fontStyle:'italic'}}>Bank details not configured in company.</div>
               )
             )}
             <div style={{fontSize:8, marginTop:10}}>
                <u>Declaration:</u><br/>
                We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
             </div>
          </div>
          <div style={{padding:'10px', textAlign:'right', display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
             {isPurchaseType && company?.gstin && (
               <div style={{fontSize:9, textAlign:'left'}}>Company's GSTIN/UIN : <b>{company.gstin}</b></div>
             )}
             <div style={{fontSize:9}}>for <b>{isPurchaseType ? v.partyName : company?.name}</b></div>
             <div style={{fontSize:9, marginBottom:10}}>Authorised Signatory</div>
          </div>
        </div>
        <div style={{textAlign:'center', fontSize:8, borderTop:'1px solid #000', padding:'2px 0'}}>This is a Computer Generated Invoice</div>
      </div>
    );
  };

  const renderQuotationInvoice = (copyIdx: number) => {
    const pd = v.partyDetails;
    const dd = v.dispatchDetails;
    const isSalesAc = (s?: string) => !s || ['sales a/c', 'sales a/c.', 'sales ac', 'sales'].includes(s.trim().toLowerCase());

    const realPartyLedger = (pd?.buyerGstin ? ledgers.find(l => l.gstin === pd.buyerGstin) : null)
      || (!isSalesAc(pd?.buyerName) ? ledgers.find(l => l.name.toLowerCase() === pd!.buyerName.toLowerCase()) : null)
      || (!isSalesAc(v.partyName) ? ledgers.find(l => l.name.toLowerCase() === v.partyName.toLowerCase()) : null)
      || null;

    const partyDisplayName = (!isSalesAc(pd?.buyerName) ? pd!.buyerName : '')
      || (!isSalesAc(pd?.buyerMailingName) ? pd!.buyerMailingName : '')
      || (!isSalesAc(v.partyName) ? v.partyName : '')
      || (realPartyLedger?.name || '');

    const partyDisplayAddress = pd?.buyerAddress || realPartyLedger?.address || '';
    const partyDisplayGstin = pd?.buyerGstin || realPartyLedger?.gstin || '';

    const itemSubtotal = (v.inventoryEntries || []).reduce((s: number, e: any) => s + (e.amount || 0), 0);
    const totalQty = (v.inventoryEntries || []).reduce((s: number, e: any) => s + (e.qty || 0), 0);
    const primaryUnit = v.inventoryEntries?.[0]?.unit || 'Kg';

    // Group items strictly by GST Rate (e.g. 18%, 12%, 5%)
    const gstRateMap = new Map<number, { rate: number; taxable: number; cgst: number; sgst: number; igst: number; totalTax: number }>();
    (v.inventoryEntries || []).forEach((e: any) => {
      const r = Number(e.gstRate) || 18;
      const existing = gstRateMap.get(r) || { rate: r, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
      existing.taxable += (Number(e.amount) || 0);
      gstRateMap.set(r, existing);
    });

    const gstRateRows = Array.from(gstRateMap.values()).map(g => {
      const taxable = g.taxable;
      const c = isInterState ? 0 : Math.round(taxable * g.rate / 200 * 100) / 100;
      const s = isInterState ? 0 : Math.round(taxable * g.rate / 200 * 100) / 100;
      const ig = isInterState ? Math.round(taxable * g.rate / 100 * 100) / 100 : 0;
      return {
        ...g,
        cgst: c,
        sgst: s,
        igst: ig,
        totalTax: c + s + ig
      };
    });

    const totalCgst = gstRateRows.reduce((sum, r) => sum + r.cgst, 0);
    const totalSgst = gstRateRows.reduce((sum, r) => sum + r.sgst, 0);
    const totalIgst = gstRateRows.reduce((sum, r) => sum + r.igst, 0);
    const grandTotalAmt = Math.round((itemSubtotal + totalCgst + totalSgst + totalIgst) * 100) / 100;

    const wordsClean = (num: number) => {
      const w = numberToWords(num);
      const text = w.replace(/^INR\s*/i, '').replace(/\s*Only$/i, '').trim();
      return `Rupees ${text} Only`;
    };

    const tdB: React.CSSProperties = { border: '1px solid #555', padding: '4px 6px', fontSize: 11, verticalAlign: 'top', fontWeight: 600 };
    const tdH: React.CSSProperties = { ...tdB, fontWeight: 'bold', background: '#f9f9f9', textAlign: 'center' };

    return (
      <div key={copyIdx} className="invoice-copy" style={{
        width: '210mm', minHeight: '297mm', margin: '0 auto 30px auto', background: 'white',
        border: '1.5px solid #000', fontFamily: '"Arial Narrow", Arial, sans-serif', fontSize: 11,
        position: 'relative', boxSizing: 'border-box', padding: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-start'
      }}>
        {/* HEADER SECTION */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #000', position: 'relative' }}>
          {/* Top-Left GSTIN */}
          {currentCompany?.gstin && (
            <div style={{ fontSize: 11, fontWeight: 'bold' }}>
              GSTIN : {currentCompany.gstin}
            </div>
          )}
          {/* Top-Right Logo */}
          {currentCompany?.showLogo && currentCompany?.logo && (
            <div style={{ position: 'absolute', top: 8, right: 12 }}>
              <img src={currentCompany.logo} alt="Logo" style={{ height: 45, objectFit: 'contain' }} />
            </div>
          )}
          {/* Top Center Title & Company Details */}
          <div style={{ textAlign: 'center', marginTop: currentCompany?.gstin ? -15 : 0 }}>
            <div style={{ fontSize: 13, textDecoration: 'underline', fontWeight: 'bold', marginBottom: 2 }}>
              Sales Quotation
            </div>
            <div style={{ fontSize: 20, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {currentCompany?.name || ''}
            </div>
            {(currentCompany?.address || currentCompany?.pinCode) && (
              <div style={{ fontSize: 10, marginTop: 2 }}>
                {currentCompany?.address}{currentCompany?.pinCode ? '-' + currentCompany.pinCode : ''}
              </div>
            )}
            <div style={{ fontSize: 10, marginTop: 2 }}>
              {[
                currentCompany?.state ? `State: ${currentCompany.state}` : '',
                currentCompany?.telephone ? `Tel. : ${currentCompany.telephone}` : '',
                (currentCompany?.showMobile !== false && currentCompany?.mobile) ? `Mobile : ${currentCompany.mobile}` : '',
                (currentCompany?.showEmail !== false && currentCompany?.email) ? `Email : ${currentCompany.email}` : '',
                (currentCompany?.showWebsite !== false && currentCompany?.website) ? `Website : ${currentCompany.website}` : ''
              ].filter(Boolean).join(' | ')}
            </div>
          </div>
        </div>

        {/* TWO-COLUMN DETAILS SECTION */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', borderBottom: '1px solid #000' }}>
          {/* LEFT: Party Details */}
          <div style={{ padding: '6px 10px', borderRight: '1px solid #000' }}>
            <div style={{ fontStyle: 'italic', fontSize: 11, fontWeight: '500', color: '#111', marginBottom: 2 }}>
              Party Details :
            </div>
            <div style={{ fontWeight: 'bold', fontSize: 13, textTransform: 'uppercase' }}>
              {partyDisplayName}
            </div>
            <div style={{ fontSize: 10, whiteSpace: 'pre-wrap', textTransform: 'uppercase' }}>
              {partyDisplayAddress}
            </div>
            <div style={{ fontSize: 10, marginTop: 12, display: 'flex', gap: 6 }}>
              <span style={{ width: 110 }}>GSTIN / UIN</span>
              <span>: &nbsp;<b>{partyDisplayGstin}</b></span>
            </div>
            <div style={{ fontSize: 10, marginTop: 2, display: 'flex', gap: 6 }}>
              <span style={{ width: 110 }}>Customer P.O. N</span>
              <span>: &nbsp;<b>{pd?.buyerOrderNo || dd?.customerPoNo || 'Verbal'}</b></span>
            </div>
          </div>

          {/* RIGHT: Quotation Meta Info */}
          <div style={{ padding: '6px 10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 10px 1fr', rowGap: 3, fontSize: 10 }}>
              <span>Quotation No.</span><span>:</span><span><b>{v.voucherNo}</b></span>
              <span>Dated</span><span>:</span><span><b>{v.date}</b></span>
              <span>GR/RR No.</span><span>:</span><span><b>{dd?.billOfLadingNo || dd?.grNo || ''}</b></span>
              <span>Transport</span><span>:</span><span><b>{dd?.dispatchedThrough || dd?.transport || "By Party's Vehicle"}</b></span>
              <span>Vehicle No.</span><span>:</span><span><b>{dd?.motorVehicleNo || ''}</b></span>
              <span>Station</span><span>:</span><span><b>{dd?.destination || dd?.station || pd?.buyerPlace || ''}</b></span>
              <span>E-Way Bill No.</span><span>:</span><span><b>{dd?.ewayBillNo || ''}</b></span>
            </div>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #000' }}>
          <thead>
            <tr>
              <th style={{ ...tdH, width: 35 }}>S.N.</th>
              <th style={{ ...tdH, textAlign: 'left' }}>Description of Goods</th>
              <th style={{ ...tdH, width: 80 }}>HSN/ SAC<br/>Code</th>
              <th style={{ ...tdH, width: 90, textAlign: 'right' }}>Qty. Unit</th>
              <th style={{ ...tdH, width: 70, textAlign: 'right' }}>Price</th>
              <th style={{ ...tdH, width: 100, textAlign: 'right' }}>Amount( ` )</th>
            </tr>
          </thead>
          <tbody>
            {(v?.inventoryEntries || []).map((e: any, idx: number) => (
              <tr key={idx} style={{ fontSize: 11 }}>
                <td style={{ ...tdB, textAlign: 'center', borderTop: 'none', borderBottom: 'none' }}>{idx + 1}.</td>
                <td style={{ ...tdB, borderTop: 'none', borderBottom: 'none' }}>
                  <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{e.itemName || e.stockItem?.name}</div>
                  {e.desc1 && <div style={{ fontSize: 10, fontStyle: 'italic', paddingLeft: 12 }}>{e.desc1}</div>}
                  {e.desc2 && <div style={{ fontSize: 10, fontStyle: 'italic', paddingLeft: 12 }}>{e.desc2}</div>}
                  {e.desc3 && <div style={{ fontSize: 10, fontStyle: 'italic', paddingLeft: 12 }}>{e.desc3}</div>}
                </td>
                <td style={{ ...tdB, textAlign: 'center', borderTop: 'none', borderBottom: 'none' }}>{e.hsnCode}</td>
                <td style={{ ...tdB, textAlign: 'right', borderTop: 'none', borderBottom: 'none' }}>{fmt(e.qty)} {e.unit}</td>
                <td style={{ ...tdB, textAlign: 'right', borderTop: 'none', borderBottom: 'none' }}>{fmt(e.rate)}</td>
                <td style={{ ...tdB, textAlign: 'right', borderTop: 'none', borderBottom: 'none' }}>{fmt(e.amount)}</td>
              </tr>
            ))}
            {/* Blank row filler */}
            {Array.from({ length: Math.max(0, 8 - (v?.inventoryEntries?.length || 0)) }).map((_, i) => (
              <tr key={'blank-' + i} style={{ height: 22 }}>
                <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
                <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
                <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
                <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
                <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
                <td style={{ ...tdB, border: 'none' }} />
              </tr>
            ))}

            {/* Subtotal row */}
            <tr style={{ fontSize: 11, borderTop: '1px solid #000' }}>
              <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
              <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
              <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
              <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
              <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
              <td style={{ ...tdB, textAlign: 'right', borderTop: '1px solid #000', fontWeight: 'bold' }}>{fmt(itemSubtotal)}</td>
            </tr>

            {/* Tax rows grouped strictly by GST Rate */}
            {gstRateRows.map((hr, idx) => {
              if (isInterState) {
                return (
                  <tr key={'igst-' + idx} style={{ fontSize: 11, fontStyle: 'italic' }}>
                    <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
                    <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Add : IGST</span>
                      <span>@ &nbsp;&nbsp;{hr.rate.toFixed(2)} %</span>
                    </td>
                    <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
                    <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
                    <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
                    <td style={{ ...tdB, textAlign: 'right', border: 'none' }}>{fmt(hr.igst)}</td>
                  </tr>
                );
              } else {
                return (
                  <React.Fragment key={'tax-' + idx}>
                    <tr style={{ fontSize: 11, fontStyle: 'italic' }}>
                      <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
                      <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000', paddingLeft: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: 40 }}>
                          <span>Add : CGST</span>
                          <span>@ &nbsp;&nbsp;&nbsp;&nbsp;{(hr.rate / 2).toFixed(2)} %</span>
                        </div>
                      </td>
                      <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
                      <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
                      <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
                      <td style={{ ...tdB, textAlign: 'right', border: 'none' }}>{fmt(hr.cgst)}</td>
                    </tr>
                    <tr style={{ fontSize: 11, fontStyle: 'italic' }}>
                      <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
                      <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000', paddingLeft: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: 40 }}>
                          <span>Add : SGST</span>
                          <span>@ &nbsp;&nbsp;&nbsp;&nbsp;{(hr.rate / 2).toFixed(2)} %</span>
                        </div>
                      </td>
                      <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
                      <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
                      <td style={{ ...tdB, border: 'none', borderRight: '1px solid #000' }} />
                      <td style={{ ...tdB, textAlign: 'right', border: 'none' }}>{fmt(hr.sgst)}</td>
                    </tr>
                  </React.Fragment>
                );
              }
            })}
          </tbody>

          {/* GRAND TOTAL BAR */}
          <tfoot>
            <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', fontWeight: 'bold' }}>
              <td style={{ ...tdB, borderRight: 'none' }} colSpan={2}>Grand Total</td>
              <td style={{ ...tdB, borderLeft: 'none', borderRight: 'none' }} />
              <td style={{ ...tdB, textAlign: 'right', borderLeft: 'none' }}>{fmt(totalQty)} {primaryUnit}</td>
              <td style={{ ...tdB }} />
              <td style={{ ...tdB, textAlign: 'right', fontSize: 12 }}>{fmt(grandTotalAmt || v.total)}</td>
            </tr>
          </tfoot>
        </table>

        {/* TAX ANALYSIS BREAKDOWN TABLE */}
        <div style={{ borderBottom: '1px solid #000' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <th style={{ ...tdH, width: 80, textDecoration: 'underline' }}>Tax Rate</th>
                <th style={{ ...tdH, textDecoration: 'underline' }}>Taxable Amt.</th>
                <th style={{ ...tdH, textDecoration: 'underline' }}>CGST Amt.</th>
                <th style={{ ...tdH, textDecoration: 'underline' }}>SGST Amt.</th>
                <th style={{ ...tdH, textDecoration: 'underline' }}>IGST Amt.</th>
                <th style={{ ...tdH, textDecoration: 'underline' }}>Total Tax</th>
              </tr>
            </thead>
            <tbody>
              {gstRateRows.map((hr, idx) => (
                <tr key={idx}>
                  <td style={{ ...tdB, textAlign: 'left' }}>{hr.rate}%</td>
                  <td style={{ ...tdB, textAlign: 'right' }}>{fmt(hr.taxable)}</td>
                  <td style={{ ...tdB, textAlign: 'right' }}>{fmt(hr.cgst)}</td>
                  <td style={{ ...tdB, textAlign: 'right' }}>{fmt(hr.sgst)}</td>
                  <td style={{ ...tdB, textAlign: 'right' }}>{fmt(hr.igst)}</td>
                  <td style={{ ...tdB, textAlign: 'right' }}>{fmt(hr.totalTax)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 'bold' }}>
                <td style={{ ...tdB, textAlign: 'left' }}>Total</td>
                <td style={{ ...tdB, textAlign: 'right' }}>{fmt(gstRateRows.reduce((s, r) => s + r.taxable, 0))}</td>
                <td style={{ ...tdB, textAlign: 'right' }}>{fmt(gstRateRows.reduce((s, r) => s + r.cgst, 0))}</td>
                <td style={{ ...tdB, textAlign: 'right' }}>{fmt(gstRateRows.reduce((s, r) => s + r.sgst, 0))}</td>
                <td style={{ ...tdB, textAlign: 'right' }}>{fmt(gstRateRows.reduce((s, r) => s + r.igst, 0))}</td>
                <td style={{ ...tdB, textAlign: 'right' }}>{fmt(gstRateRows.reduce((s, r) => s + r.totalTax, 0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* AMOUNT IN WORDS */}
        <div style={{ padding: '6px 10px', borderBottom: '1px solid #000', fontSize: 11 }}>
          <b>{numberToWords(grandTotalAmt || v.total)}</b>
        </div>

        {/* FOOTER SECTION: BANK DETAILS & SIGNATURE */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', minHeight: 110, borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
          {/* LEFT: Our Bank Details */}
          <div style={{ padding: '8px 10px', borderRight: '1px solid #000', fontSize: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontStyle: 'italic', fontWeight: 'bold', marginBottom: 4 }}>Our Bank Detail :</div>
              <div style={{ display: 'grid', gridTemplateColumns: '85px 10px 1fr', rowGap: 2 }}>
                <span>A/c Name</span><span>:</span><span><b>{currentCompany?.bankHolderName || currentCompany?.name || ''}</b></span>
                <span>A/c No</span><span>:</span><span><b>{currentCompany?.accountNo || ''}</b></span>
                <span>Bank Name</span><span>:</span><span><b>{currentCompany?.bankName || ''}</b></span>
                <span>Branch</span><span>:</span><span><b>{currentCompany?.branch || ''}</b></span>
                <span>IFS Code</span><span>:</span><span><b>{currentCompany?.ifsc || ''}</b></span>
              </div>
            </div>
          </div>

          {/* RIGHT: Signatures */}
          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10 }}>
              Receiver's Signature :
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 'bold', textAlign: 'right', marginBottom: 25 }}>
                For {currentCompany?.name || ''}
              </div>
              <div style={{ fontSize: 11, fontWeight: 'bold', textAlign: 'right' }}>
                Authorised Signatory
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  };

  return (
    <>
    <div className="print-preview-main" style={{display:'flex',height:'100%',overflow:'hidden',background:'#eef2f6'}}>
      <div className="no-print" style={{width:240,borderRight:'2px solid #1c5282',display:'flex',flexDirection:'column',background:'#fff'}}>
        <div style={{background:'#1c5282',color:'white',padding:'10px 15px',fontWeight:'bold'}}>Print Dashboard</div>
        <div style={{padding:'10px'}}><button onClick={()=>setShowOptions(true)} style={{width:'100%',background:'#1a7a4a',color:'white',padding:'10px',cursor:'pointer'}}>🖨️ Print Invoice (P)</button></div>
        <div style={{flex:1,overflowY:'auto'}}>
          {allPrintableVouchers.map((sv,i)=>(
            <div key={i} onClick={()=>onSelectVoucher(sv)} style={{padding:'10px',cursor:'pointer',borderBottom:'1px solid #eee',background:v.id===sv.id?'#e3efff':'transparent'}}>
              <div style={{fontWeight:'bold',fontSize:12}}>{sv.type} #{sv.voucherNo}</div>
              <div style={{fontSize:11,color:'#888'}}>{sv.date}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="print-invoice-container" style={{flex:1,overflowY:'auto',padding:'20px',background:'#e2eaf2'}}>
        {Array.from({length: numCopies}).map((_, i) =>
          ['Payment','Receipt','Contra','Journal'].includes(v.type)
            ? renderAccountingVoucher(i)
            : (v.type === 'Sales Quotation' || v.type === 'Quotation' ? renderQuotationInvoice(i) : renderInvoice(i))
        )}
      </div>
    </div>


      {/* Print Options Modal */}
      {showOptions && (
        <div className="modal-overlay no-print" style={{zIndex:5000}}>
           <div className="modal-box" style={{width:350}}>
              <div className="modal-header">Print Configuration</div>
              <div style={{padding:'20px'}}>
                 <div className="form-row">
                    <label style={{width:150}}>Number of Copies</label><span className="colon">:</span>
                    <input autoFocus type="number" className="form-input" style={{width:60,textAlign:'center',fontWeight:'bold'}} 
                           value={tempCopies} onChange={e=>setTempCopies(parseInt(e.target.value)||1)}
                           onKeyDown={e=>{if(e.key==='Enter')handlePrint();}} />
                 </div>
                 <div style={{fontSize:11,color:'#666',marginTop:15,lineHeight:1.4}}>
                   1 Copy: Original<br/>
                   2 Copies: Original + Duplicate<br/>
                   3 Copies: Original + Duplicate + Triplicate
                 </div>
              </div>
              <div style={{background:'#f9f9f9',padding:'12px',display:'flex',justifyContent:'flex-end',gap:10,borderTop:'1px solid #eee'}}>
                 <button onClick={handlePrint} style={{background:'#1c5282',color:'white',padding:'6px 20px',border:'none',fontWeight:'bold',cursor:'pointer'}}>Print (Enter)</button>
                 <button onClick={()=>setShowOptions(false)} style={{padding:'6px 15px',cursor:'pointer',border:'1px solid #ccc'}}>Cancel</button>
              </div>
           </div>
        </div>
      )}
    </>
  );
}

function AlterListView({type,ledgers,companies,groups,stockGroups,units,voucherTypes,currencies,stockItems,stockCategories,godowns,onSelect}:{
  type:string;ledgers:Ledger[];companies:Company[];groups:StockGroup[];stockGroups:StockGroup[];units:UnitData[];voucherTypes:VoucherTypeData[];currencies:CurrencyData[];stockItems:StockItem[];stockCategories:StockCategory[];godowns:GodownData[];onSelect:(item:any)=>void;
}) {
  const [search,setSearch]=useState('');
  const [selIdx, setSelIdx] = useState(0);
  const ref=useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ref.current?.focus();},[]);

  const allItems=()=>{
    if(type==='Company') return companies;
    if(type==='Ledger') return ledgers;
    if(type==='Group') return groups;
    if(type==='Stock Group') return stockGroups;
    if(type==='Unit') return units.map(u=>({...u,name:u.symbol || u.name}));
    if(type==='Voucher Type') return voucherTypes;
    if(type==='Currency') return currencies.map(c=>({...c,name:`${c.symbol} ${c.name}`}));
    if(type==='Stock Item') return stockItems;
    if(type==='Stock Category') return stockCategories;
    if(type==='Godown') return godowns;
    return [];
  };

  const items=allItems();
  const filtered=search?items.filter(it=>(it.name||'').toLowerCase().includes(search.toLowerCase())):items;

  useEffect(() => {
    if (search) {
      setSelIdx(0);
    } else {
      // Find item matching current alter name if available
      const idx = items.findIndex(it => {
        const name = typeof it === 'string' ? it : (it as any)?.name || (it as any)?.symbol || '';
        return (name || '').toLowerCase().includes((search || '').toLowerCase());
      });
      setSelIdx(idx >= 0 ? idx : 0);
    }
  }, [search, filtered.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelIdx(p => (filtered.length > 0 ? (p + 1) % filtered.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelIdx(p => (filtered.length > 0 ? (p - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === 'Enter') {
        if (filtered[selIdx]) {
          e.preventDefault();
          onSelect(filtered[selIdx]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, selIdx, onSelect]);

  useEffect(() => {
    const el = listRef.current?.children[selIdx] as HTMLElement;
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selIdx]);

  return (
    <div style={{display:'flex',justifyContent:'center',paddingTop:'4vh',height:'100%',background:'var(--tally-bg)',width:'100%'}}>
      <div className="tally-menu-box" style={{width:440,maxHeight:'82vh',display:'flex',flexDirection:'column',background:'#eef4fa'}}>
        <div className="tally-menu-title" style={{fontSize:15,padding:'8px 15px'}}>List of {type}s</div>
        <div style={{padding:'8px 15px',borderBottom:'1px solid #dde',background:'#eef4fa',display:'flex',alignItems:'center',gap:10}}>
          <label style={{fontSize:12,fontWeight:'bold'}}>Search:</label>
          <input ref={ref} type="text" className="form-input" style={{flex:1}} placeholder={`Filter ${type}s...`} value={search} onChange={e=>setSearch(e.target.value)} autoFocus/>
        </div>
        <div ref={listRef} className="modal-list" style={{flex:1,overflowY:'auto',padding:'4px 0'}}>
          {filtered.map((it,i)=>(
            <div key={i} className={`modal-list-item ${i===selIdx?'selected':''}`} onClick={()=>onSelect(it)} style={{display:'flex',justifyContent:'space-between',padding:'6px 20px',background:i===selIdx?'#f6af3d':'transparent',color:i===selIdx?'black':'inherit'}}>
              <span style={{fontWeight:'bold'}}>{typeof it === 'string' ? it : (it as any).name || (it as any).symbol || ''}</span>
              <span style={{opacity:0.6,fontSize:11}}>{(it && typeof it === 'object' && 'groupName' in it) ? it.groupName as string : ''}</span>
            </div>
          ))}
          {filtered.length===0&&<div style={{padding:25,textAlign:'center',color:'#888'}}>No {type}s found.</div>}
        </div>
        <div style={{background:'#e2eaf2',padding:'6px 12px',fontSize:11,color:'#555',borderTop:'1px solid #ccc',textAlign:'center'}}>
          ↑/↓: Navigate | Enter: Select | Esc: Back
        </div>
      </div>
    </div>
  );
}

// ==================== ALT+C MODAL ====================
function AltCModal({ctx,ledgers,stockGroups,units,voucherTypes,groups,stockItems,stockCategories,godowns,currencies,onClose,onSaveMaster,onDeleteMaster,activeCompany,setActiveCompany,setCompanies}:{
  ctx:AltCContext;ledgers:Ledger[];stockGroups:StockGroup[];units:UnitData[];voucherTypes:VoucherTypeData[];groups:StockGroup[];
  stockItems:StockItem[];stockCategories:StockCategory[];godowns:GodownData[];currencies:CurrencyData[];
  onClose:()=>void;onSaveMaster:(type:string,data:any,existingItem?:any)=>Promise<any>;onDeleteMaster:(type:string,id:number)=>void;
  activeCompany:Company|null;setActiveCompany:React.Dispatch<React.SetStateAction<Company|null>>;setCompanies:React.Dispatch<React.SetStateAction<Company[]>>;
}) {
  const titles:Record<string,string>={ledger:'Ledger',group:'Group',stockItem:'Stock Item',stockGroup:'Stock Group',unit:'Unit',currency:'Currency',voucherType:'Voucher Type',godown:'Godown',stockCategory:'Stock Category'};
  const isLarge = ['ledger','stockItem','company'].includes(ctx.fieldType);

  return (
    <div className="modal-overlay" style={{zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center'}} onClick={onClose}>
      <div className="modal-box" style={{
        width: isLarge ? 1000 : 600, 
        height: '90vh', 
        maxHeight: 700,
        display:'flex', 
        flexDirection:'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        border: '2px solid #1c5282',
        position: 'relative'
      }} onClick={e=>e.stopPropagation()}>
        <div className="modal-header" style={{background:'#1c5282', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0}}>
          <span>⚡ Quick {titles[ctx.fieldType] || 'Master'} {ctx.activeAlterItem ? 'Alteration' : 'Creation'}</span>
          <button onClick={onClose} style={{background:'transparent', border:'none', color:'white', cursor:'pointer', fontSize:18}}>✕</button>
        </div>
        
        <div style={{flex:1, overflowY:'auto', background:'#fff'}}>
          {ctx.fieldType==='ledger' && (
            <LedgerCreationForm 
              activeAlterItem={ctx.activeAlterItem} 
              onSave={async d => { const ok = await onSaveMaster('ledger', d, ctx.activeAlterItem); if(ok) ctx.onCreated(ok); onClose(); }} 
              onDelete={onDeleteMaster} 
              ledgers={ledgers} 
              groups={groups} 
              onAltC={() => {}} 
            />
          )}
          {ctx.fieldType==='stockItem' && (
            <StockItemCreationForm 
              activeAlterItem={ctx.activeAlterItem} 
              stockGroups={stockGroups} 
              stockCategories={stockCategories} 
              units={units} 
              stockItems={stockItems} 
              onSave={async d => { const ok = await onSaveMaster('stockItem', d, ctx.activeAlterItem); if(ok) ctx.onCreated(ok); onClose(); }} 
              onDelete={onDeleteMaster} 
              onAltC={() => {}} 
              activeCompany={activeCompany}
              setActiveCompany={setActiveCompany}
              setCompanies={setCompanies}
            />
          )}
          {ctx.fieldType==='group' && (
            <GroupCreationForm 
              activeAlterItem={ctx.activeAlterItem} 
              onSave={async d => { const ok = await onSaveMaster('group', d, ctx.activeAlterItem); if(ok) ctx.onCreated(ok); onClose(); }} 
              onDelete={onDeleteMaster} 
              ledgers={ledgers} 
              groups={groups} 
              onAltC={() => {}} 
            />
          )}
          {ctx.fieldType==='stockGroup' && (
            <StockGroupCreationForm 
              activeAlterItem={ctx.activeAlterItem} 
              stockGroups={stockGroups} 
              onSave={async d => { const ok = await onSaveMaster('stockGroup', d, ctx.activeAlterItem); if(ok) ctx.onCreated(ok); onClose(); }} 
              onDelete={onDeleteMaster} 
              onAltC={() => {}} 
            />
          )}
          {ctx.fieldType==='unit' && (
            <UnitCreationForm 
              activeAlterItem={ctx.activeAlterItem} 
              units={units} 
              onSave={async d => { const ok = await onSaveMaster('unit', d, ctx.activeAlterItem); if(ok) ctx.onCreated(ok); onClose(); }} 
              onDelete={onDeleteMaster} 
            />
          )}
          {ctx.fieldType==='godown' && (
            <GodownCreationForm 
              activeAlterItem={ctx.activeAlterItem} 
              godowns={godowns} 
              onSave={async d => { const ok = await onSaveMaster('godown', d, ctx.activeAlterItem); if(ok) ctx.onCreated(ok); onClose(); }} 
              onDelete={onDeleteMaster} 
            />
          )}
          {ctx.fieldType==='voucherType' && (
            <VoucherTypeCreationForm 
              activeAlterItem={ctx.activeAlterItem} 
              voucherTypes={voucherTypes} 
              onSave={async d => { const ok = await onSaveMaster('voucherType', d, ctx.activeAlterItem); if(ok) ctx.onCreated(ok); onClose(); }} 
              onDelete={onDeleteMaster} 
            />
          )}
          {ctx.fieldType==='currency' && (
            <CurrencyCreationForm 
              activeAlterItem={ctx.activeAlterItem} 
              currencies={currencies} 
              onSave={async d => { const ok = await onSaveMaster('currency', d, ctx.activeAlterItem); if(ok) ctx.onCreated(ok); onClose(); }} 
              onDelete={onDeleteMaster} 
            />
          )}
          {ctx.fieldType==='stockCategory' && (
            <StockCategoryCreationForm 
              activeAlterItem={ctx.activeAlterItem} 
              stockCategories={stockCategories} 
              onSave={async d => { const ok = await onSaveMaster('stockCategory', d, ctx.activeAlterItem); if(ok) ctx.onCreated(ok); onClose(); }} 
              onDelete={onDeleteMaster} 
            />
          )}
        </div>
        
        <div style={{background:'#f0f4f8', padding:'5px 15px', fontSize:10, color:'#666', borderTop:'1px solid #ccc', flexShrink:0}}>
          Press Esc to close modal without saving
        </div>
      </div>
    </div>
  );
}
// ==================== GSTR-1 REPORT VIEW (TALLY PRIME STYLE) ====================
function GSTR1ReportView({
  vouchers, activeCompany, ledgers, currentPeriod, allUnits, goBack, onDrillDownVoucher,
  drillDown, setDrillDown,
  drillDownParty, setDrillDownParty,
  selectedRow, setSelectedRow,
  selectedVchIdx, setSelectedVchIdx
}: {
  vouchers: Voucher[], activeCompany: Company | null, ledgers: Ledger[], currentPeriod: {start:string, end:string}, allUnits: UnitData[], goBack: () => void, onDrillDownVoucher: (v:Voucher)=>void,
  drillDown: string | null, setDrillDown: React.Dispatch<React.SetStateAction<string | null>>,
  drillDownParty: number | null, setDrillDownParty: React.Dispatch<React.SetStateAction<number | null>>,
  selectedRow: number, setSelectedRow: React.Dispatch<React.SetStateAction<number>>,
  selectedVchIdx: number, setSelectedVchIdx: React.Dispatch<React.SetStateAction<number>>
}) {

  const fmt = (n: number) => n.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
  
  // Tax calculation helper with fallback to Ledger Master for State/GSTIN
  const getVchGstin = (v: Voucher) => {
    if (v.partyDetails?.buyerGstin?.trim()) return v.partyDetails.buyerGstin.trim();
    const ledger = ledgers.find(l => l.id === v.partyId);
    return ledger?.gstin?.trim() || "";
  };

  const getVchState = (v: Voucher) => {
    if (v.partyDetails?.buyerState?.trim()) return v.partyDetails.buyerState.trim();
    const ledger = ledgers.find(l => l.id === v.partyId);
    return ledger?.state?.trim() || activeCompany?.state || "";
  };

  const getTaxBreakdown = (v: Voucher) => {
    const vState = getVchState(v);
    const isInterState = vState && activeCompany?.state && vState !== activeCompany.state;
    let taxable = 0, igst = 0, cgst = 0, sgst = 0, totalTax = 0;
    v.inventoryEntries.forEach(item => {
      const rate = item.gstRate || 18;
      // item.amount is already the TAXABLE value (exclusive of GST)
      const txVal = item.taxableAmount || item.amount;
      const tax = txVal * rate / 100;
      taxable += txVal; totalTax += tax;
      if (isInterState) igst += tax; else { cgst += tax / 2; sgst += tax / 2; }
    });
    const invoiceTotal = taxable + totalTax;
    return { taxable, igst, cgst, sgst, totalTax, invoiceTotal };
  };

  // Basic Logic: Get Sales and Credit/Debit Notes
  const salesVouchers = useMemo(() => vouchers.filter(v => v.type === 'Sales'), [vouchers]);
  const noteVouchers = useMemo(() => vouchers.filter(v => v.type === 'Credit Note' || v.type === 'Debit Note'), [vouchers]);

  // Table 4: B2B Invoices (Registered)
  const b2bList = useMemo(() => salesVouchers.filter(v => getVchGstin(v) !== ""), [salesVouchers, ledgers]);

  // Table 5: B2C Large (Unregistered + Inter-state + > 2.5L)
  const b2cLarge = useMemo(() => salesVouchers.filter(v => {
    const gstin = getVchGstin(v);
    const vState = getVchState(v);
    const isInter = vState !== activeCompany?.state;
    return !gstin && isInter && v.total > 250000;
  }), [salesVouchers, ledgers, activeCompany]);

  // Table 7: B2C Small (Unregistered + (Intra-state OR (Inter-state <= 2.5L)))
  const b2cSmall = useMemo(() => salesVouchers.filter(v => {
    const gstin = getVchGstin(v);
    const vState = getVchState(v);
    const isInter = vState !== activeCompany?.state;
    return !gstin && (!isInter || v.total <= 250000);
  }), [salesVouchers, ledgers, activeCompany]);

  // Table 9B: Credit/Debit Notes (Registered)
  const cdnrList = useMemo(() => noteVouchers.filter(v => getVchGstin(v) !== ""), [noteVouchers, ledgers]);

  // Table 9B: Credit/Debit Notes (Unregistered - only for B2CL)
  const cdnurList = useMemo(() => noteVouchers.filter(v => {
    const gstin = getVchGstin(v);
    const vState = getVchState(v);
    const isInter = vState !== activeCompany?.state;
    return !gstin && isInter && v.total > 250000;
  }), [noteVouchers, ledgers, activeCompany]);

  const sections = [
    { id: 'b2b',   label: 'B2B Invoices - 4A, 4B, 4C, 6B, 6C', vouchers: b2bList },
    { id: 'b2cl',  label: 'B2C(Large) Invoices - 5A, 5B',      vouchers: b2cLarge },
    { id: 'b2cs',  label: 'B2C(Small) Invoices - 7',           vouchers: b2cSmall },
    { id: 'cdnr',  label: 'CDNR (Reg) - 9B',                   vouchers: cdnrList },
    { id: 'cdnur', label: 'CDNUR (Unreg) - 9B',                vouchers: cdnurList },
    { id: 'hsn',   label: 'HSN/SAC Summary - 12',              vouchers: salesVouchers },
    { id: 'docs',  label: 'Document Summary - 13',             vouchers: salesVouchers },
  ];

  // DRILL DOWN CALCULATIONS (B2B Party-wise)
  const partyGroups = useMemo(() => {
    const groups: Record<number, {id:number, name:string, gstin:string, count:number, taxable:number, igst:number, cgst:number, sgst:number, total:number, vouchers:Voucher[]}> = {};
    b2bList.forEach(v => {
      const {taxable, igst, cgst, sgst, invoiceTotal} = getTaxBreakdown(v);
      const gstin = getVchGstin(v);
      if (!groups[v.partyId]) groups[v.partyId] = {id:v.partyId, name: v.partyName, gstin: gstin, count:0, taxable:0, igst:0, cgst:0, sgst:0, total:0, vouchers:[]};
      groups[v.partyId].count++;
      groups[v.partyId].taxable += taxable;
      groups[v.partyId].igst += igst;
      groups[v.partyId].cgst += cgst;
      groups[v.partyId].sgst += sgst;
      groups[v.partyId].total += invoiceTotal;
      groups[v.partyId].vouchers.push(v);
    });
    return Object.values(groups);
  }, [b2bList, ledgers]);

  const partyRows = partyGroups;
  const currentPartyVouchers = drillDownParty ? (partyGroups.find(p=>p.id===drillDownParty)?.vouchers || []) : [];

  // Generic voucher list for non-B2B drill-downs (B2CL, B2CS, CDNR, CDNUR)
  const currentDrillVouchers = useMemo(() => {
    if (drillDown === 'b2cl') return b2cLarge;
    if (drillDown === 'b2cs') return b2cSmall;
    if (drillDown === 'cdnr') return cdnrList;
    if (drillDown === 'cdnur') return cdnurList;
    return [];
  }, [drillDown, b2cLarge, b2cSmall, cdnrList, cdnurList]);

  // KEYBOARD HANDLING
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (drillDownParty) setDrillDownParty(null);
        else if (drillDown) setDrillDown(null);
        else goBack();
      } else if (drillDownParty) {
        // B2B Party -> Invoice level
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedVchIdx(p => Math.min(p+1, currentPartyVouchers.length-1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedVchIdx(p => Math.max(p-1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); if (currentPartyVouchers[selectedVchIdx]) onDrillDownVoucher(currentPartyVouchers[selectedVchIdx]); }
      } else if (drillDown === 'b2b') {
        // B2B Party list
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedRow(p => Math.min(p+1, partyRows.length-1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedRow(p => Math.max(p-1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); setDrillDownParty(partyRows[selectedRow].id); setSelectedVchIdx(0); }
      } else if (['b2cl','b2cs','cdnr','cdnur'].includes(drillDown || '')) {
        // Voucher list drill-downs
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedVchIdx(p => Math.min(p+1, currentDrillVouchers.length-1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedVchIdx(p => Math.max(p-1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); if (currentDrillVouchers[selectedVchIdx]) onDrillDownVoucher(currentDrillVouchers[selectedVchIdx]); }
      } else if (!drillDown) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedRow(p => Math.min(p+1, sections.length-1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedRow(p => Math.max(p-1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); setDrillDown(sections[selectedRow].id); setSelectedRow(0); setSelectedVchIdx(0); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drillDown, drillDownParty, selectedRow, selectedVchIdx, sections, partyRows, currentPartyVouchers, currentDrillVouchers, goBack]);

  // EXPORT HANDLERS
  const [showExportGstModal, setShowExportGstModal] = useState(false);

  // EXPORT HANDLERS
  const handleActualExport = (exportType: 'combined' | 'separate') => {
    const stateCodeMap: Record<string, string> = {
      'Andaman and Nicobar Islands': '35', 'Andhra Pradesh': '37', 'Arunachal Pradesh': '12', 'Assam': '18', 'Bihar': '10',
      'Chandigarh': '04', 'Chhattisgarh': '22', 'Dadra and Nagar Haveli and Daman and Diu': '26', 'Delhi': '07', 'Goa': '30',
      'Gujarat': '24', 'Haryana': '06', 'Himachal Pradesh': '02', 'Jammu and Kashmir': '01', 'Jharkhand': '20',
      'Karnataka': '29', 'Kerala': '32', 'Ladakh': '38', 'Lakshadweep': '31', 'Madhya Pradesh': '23',
      'Maharashtra': '27', 'Manipur': '14', 'Meghalaya': '17', 'Mizoram': '15', 'Nagaland': '13',
      'Odisha': '21', 'Puducherry': '34', 'Punjab': '03', 'Rajasthan': '08', 'Sikkim': '11',
      'Tamil Nadu': '33', 'Telangana': '36', 'Tripura': '16', 'Uttar Pradesh': '09', 'Uttarakhand': '05', 'West Bengal': '19'
    };

    const formatGstDate = (d: string) => {
      const months: Record<string, string> = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      const parts = d.split('-');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        let month = months[parts[1]] || parts[1];
        if (month.length === 1) month = '0' + month;
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        return `${day}-${month}-${year}`;
      }
      return d;
    };

    // 1. Prepare HSN Data
    const hsnMap: any = {};
    salesVouchers.forEach(v => {
      if (v.type !== 'Sales') return;
      const isInterState = v.partyDetails?.buyerState && activeCompany?.state && v.partyDetails.buyerState !== activeCompany.state;
      v.inventoryEntries.forEach(item => {
        const hsn = item.hsnCode || 'N/A';
        const rate = item.gstRate || 18;
        const key = `${hsn}_${rate}`;
        const unitObj = allUnits.find(u => u.name === item.unit || u.symbol === item.unit);
        const uqc = (unitObj?.uqc || 'NOS').toUpperCase();
        if(!hsnMap[key]) hsnMap[key] = { hsn_sc: hsn, uqc: uqc, qty: 0, txval: 0, iamt: 0, camt: 0, samt: 0, rt: rate, csamt: 0 };
        
        // item.amount is already exclusive (taxable)
        const txval = item.taxableAmount || item.amount;
        const tax = txval * rate / 100;
        
        hsnMap[key].qty += item.qty; 
        hsnMap[key].txval += txval;
        if (isInterState) hsnMap[key].iamt += tax;
        else { hsnMap[key].camt += tax/2; hsnMap[key].samt += tax/2; }
      });
    });

    // 2. Prepare B2B Data
    const b2bGrouped: Record<string, any> = {};
    b2bList.filter(v => v.type === 'Sales').forEach(v => {
      const ctin = v.partyDetails?.buyerGstin?.trim();
      if (!ctin) return;
      if (!b2bGrouped[ctin]) b2bGrouped[ctin] = { ctin, inv: [] };
      
      const isInterState = v.partyDetails?.buyerState && activeCompany?.state && v.partyDetails.buyerState !== activeCompany.state;
      const itemsByRate: Record<number, any> = {};
      
      v.inventoryEntries.forEach(item => {
         const rate = item.gstRate || 18;
         if (!itemsByRate[rate]) itemsByRate[rate] = { txval: 0, iamt: 0, camt: 0, samt: 0 };
         
         const txval = item.taxableAmount || item.amount;
         const tax = txval * rate / 100;
         
         itemsByRate[rate].txval += txval;
         if (isInterState) itemsByRate[rate].iamt += tax;
         else { itemsByRate[rate].camt += tax/2; itemsByRate[rate].samt += tax/2; }
      });

      const itms = Object.entries(itemsByRate).map(([rate, det], idx) => {
         const itmDet: any = { txval: det.txval, rt: Number(rate) };
         if (isInterState) itmDet.iamt = det.iamt;
         else { itmDet.camt = det.camt; itmDet.samt = det.samt; }
         itmDet.csamt = 0.0;
         return { num: idx + 1, itm_det: itmDet };
      });

      b2bGrouped[ctin].inv.push({
        inum: v.voucherNo || v.number.toString(), 
        idt: formatGstDate(v.date), 
        val: getTaxBreakdown(v).invoiceTotal,
        pos: stateCodeMap[v.partyDetails?.buyerState||''] || '05', 
        rchrg: "N", 
        itms: itms, 
        inv_typ: "R"
      });
    });

    const endParts = currentPeriod.end.split('-');
    const months: Record<string, string> = { 'jan':'01','feb':'02','mar':'03','apr':'04','may':'05','jun':'06','jul':'07','aug':'08','sep':'09','oct':'10','nov':'11','dec':'12' };
    let mStr = (endParts[1]) ? (months[endParts[1].toLowerCase().slice(0,3)] || endParts[1].padStart(2, '0')) : '01';
    let yr = endParts[2] || '2026';
    if(yr.length === 2) yr = '20' + yr;
    const fp = mStr + yr;
    
    const salesOnly = salesVouchers.filter(v => v.type === 'Sales');
    const fromNo = salesOnly.length > 0 ? Math.min(...salesOnly.map(v => v.number)) : 0;
    const toNo = salesOnly.length > 0 ? Math.max(...salesOnly.map(v => v.number)) : 0;
    const baseData = { gstin: activeCompany?.gstin || "05ABFFA1795E1ZN", fp, gt: 0.00, cur_gt: 0.00 };

    const download = (obj: any, fileName: string) => {
      const jsonStr = JSON.stringify(obj, (key, value) => {
        // String fields that should keep quotes
        const stringFields = ['inum', 'idt', 'ctin', 'fp', 'gstin', 'rchrg', 'inv_typ', 'doc_typ', 'hsn_sc', 'uqc', 'from', 'to', 'pos'];
        // Integer fields that should not have decimals
        const integerFields = ['num', 'rt', 'doc_num', 'totnum', 'cancel', 'net_issue'];

        if (stringFields.includes(key)) return value;
        if (integerFields.includes(key)) return parseInt(value);
        
        // Special handling for qty: integer if whole, else decimal
        if (key === 'qty' && typeof value === 'number') {
          return Number.isInteger(value) ? value : parseFloat(value.toFixed(3));
        }

        // For all other numeric fields (amounts), force 2 decimal places as a string
        // We will then strip the quotes using regex
        if (typeof value === 'number') {
          return value.toFixed(2);
        }
        return value;
      });
      
      // Strict regex to strip quotes from numeric strings with 2 decimals to match Tally format
      const formattedJson = jsonStr.replace(/"(-?\d+\.\d{2})"/g, '$1');
      
      const blob = new Blob([formattedJson], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
    };

    if (exportType === 'combined') {
      const data = { 
        ...baseData, 
        b2b: Object.values(b2bGrouped),
        hsn: { 
          data: Object.values(hsnMap).map((item: any, idx: number) => ({ 
            num: idx + 1, 
            hsn_sc: item.hsn_sc, 
            uqc: item.uqc, 
            qty: item.qty, 
            rt: item.rt, 
            txval: item.txval, 
            iamt: item.iamt, 
            camt: item.camt, 
            samt: item.samt, 
            csamt: item.csamt 
          })) 
        },
        doc_issue: { doc_det: [{ doc_num: 1, doc_typ: "Invoices for outward supply", docs: [{ num: 1, from: fromNo.toString(), to: toNo.toString(), totnum: salesOnly.length, cancel: 0, net_issue: salesOnly.length }] }] }
      };
      download(data, `GSTR1_Full_${fp}.json`);
    } else {
      download({ ...baseData, b2b: Object.values(b2bGrouped) }, `B2B_${baseData.gstin}_${fp}.json`);
      setTimeout(() => download({ 
        ...baseData, 
        hsn: { 
          data: Object.values(hsnMap).map((item: any, idx: number) => ({ 
            num: idx + 1, 
            hsn_sc: item.hsn_sc, 
            uqc: item.uqc, 
            qty: item.qty, 
            rt: item.rt, 
            txval: item.txval, 
            iamt: item.iamt, 
            camt: item.camt, 
            samt: item.samt, 
            csamt: item.csamt 
          })) 
        } 
      }, `HSN_${baseData.gstin}_${fp}.json`), 500);
      setTimeout(() => download({ ...baseData, doc_issue: { doc_det: [{ doc_num: 1, doc_typ: "Invoices for outward supply", docs: [{ num: 1, from: fromNo.toString(), to: toNo.toString(), totnum: salesOnly.length, cancel: 0, net_issue: salesOnly.length }] }] } }, `Docs_${baseData.gstin}_${fp}.json`), 1000);
    }
    setShowExportGstModal(false);
  };

    const exportExcel = () => {
    let html = `<html><head><meta charset="utf-8"></head><body><h2>GSTR-1 Report - ${activeCompany?.name}</h2><table border="1">`;
    html += `<tr><th>Section</th><th>Count</th><th>Taxable</th><th>Tax</th><th>Total</th></tr>`;
    sections.forEach(s => {
      const tx = s.vouchers.reduce((sum, v) => sum + getTaxBreakdown(v).taxable, 0);
      const tax = s.vouchers.reduce((sum, v) => sum + getTaxBreakdown(v).totalTax, 0);
      const tot = s.vouchers.reduce((sum, v) => sum + getTaxBreakdown(v).invoiceTotal, 0);
      html += `<tr><td>${s.label}</td><td>${s.vouchers.length}</td><td>${tx.toFixed(2)}</td><td>${tax.toFixed(2)}</td><td>${tot.toFixed(2)}</td></tr>`;
    });
    html += `</table></body></html>`;
    const blob = new Blob([html], {type: 'application/vnd.ms-excel'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `GSTR1_Report.xls`; a.click();
  };

  const exportCsv = () => {
    let csv = "Section,Count,Taxable,Tax,Total\n";
    sections.forEach(s => {
      const tx = s.vouchers.reduce((sum, v) => sum + getTaxBreakdown(v).taxable, 0);
      const tax = s.vouchers.reduce((sum, v) => sum + getTaxBreakdown(v).totalTax, 0);
      const tot = s.vouchers.reduce((sum, v) => sum + getTaxBreakdown(v).invoiceTotal, 0);
      csv += `"${s.label}",${s.vouchers.length},${tx.toFixed(2)},${tax.toFixed(2)},${tot.toFixed(2)}\n`;
    });
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `GSTR1_Report.csv`; a.click();
  };

  // RENDER LAYERS
  if (drillDownParty) {
    const party = partyGroups.find(p=>p.id===drillDownParty);
    return (
      <div className="report-workspace" style={{background:'#fff',height:'100%',display:'flex',flexDirection:'column'}}>
        <div style={{background:'#1c5282',color:'white',padding:'8px 15px',fontWeight:'bold',display:'flex',justifyContent:'space-between'}}>
          <span>B2B Vouchers: {party?.name} ({party?.gstin})</span>
          <button onClick={()=>setDrillDownParty(null)} className="tally-btn-sm">Esc: Back</button>
        </div>
        <div style={{flex:1, overflowY:'auto'}}>
          <table className="report-table" style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead style={{position:'sticky',top:0,background:'#e8eef4'}}>
              <tr>
                <th style={{padding:8,textAlign:'left'}}>Date</th>
                <th style={{padding:8,textAlign:'left'}}>Voucher No.</th>
                <th style={{padding:8,textAlign:'right'}}>Taxable Value</th>
                <th style={{padding:8,textAlign:'right'}}>Tax Amount</th>
                <th style={{padding:8,textAlign:'right'}}>Invoice Amount</th>
              </tr>
            </thead>
            <tbody>
              {currentPartyVouchers.map((v,i)=>(
                <tr key={i} onClick={()=>onDrillDownVoucher(v)} onMouseEnter={()=>setSelectedVchIdx(i)}
                  style={{borderBottom:'1px solid #eee', cursor:'pointer', background: i===selectedVchIdx?'#f6af3d':'transparent'}}>
                  <td style={{padding:8}}>{v.date}</td>
                  <td style={{padding:8}}>{v.voucherNo}</td>
                  <td style={{padding:8,textAlign:'right'}}>{fmt(getTaxBreakdown(v).taxable)}</td>
                  <td style={{padding:8,textAlign:'right'}}>{fmt(getTaxBreakdown(v).totalTax)}</td>
                  <td style={{padding:8,textAlign:'right',fontWeight:'bold'}}>{fmt(getTaxBreakdown(v).invoiceTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{background:'#1c5282',color:'white',padding:'5px 15px',fontSize:11,textAlign:'center'}}>Enter: Alter Voucher | Esc: Back</div>
      </div>
    );
  }

  if (drillDown === 'b2b') {
    return (
      <div className="report-workspace" style={{background:'#fff',height:'100%',display:'flex',flexDirection:'column'}}>
        <div style={{background:'#1c5282',color:'white',padding:'8px 15px',fontWeight:'bold',display:'flex',justifyContent:'space-between'}}>
          <span>GSTR-1 - B2B Invoices (Party-wise)</span>
          <button onClick={()=>setDrillDown(null)} className="tally-btn-sm">Esc: Back</button>
        </div>
        <div style={{flex:1, overflowY:'auto'}}>
          <table className="report-table" style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead style={{position:'sticky',top:0,background:'#e8eef4'}}>
              <tr>
                <th style={{padding:8,textAlign:'left'}}>Particulars (Party Name)</th>
                <th style={{padding:8,textAlign:'left'}}>GSTIN/UIN</th>
                <th style={{padding:8,textAlign:'center'}}>Vch Count</th>
                <th style={{padding:8,textAlign:'right'}}>Taxable</th>
                <th style={{padding:8,textAlign:'right'}}>Integrated</th>
                <th style={{padding:8,textAlign:'right'}}>Central</th>
                <th style={{padding:8,textAlign:'right'}}>State</th>
                <th style={{padding:8,textAlign:'right'}}>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {partyRows.map((p,i)=>(
                <tr key={i} onClick={()=>{setDrillDownParty(p.id); setSelectedVchIdx(0);}} onMouseEnter={()=>setSelectedRow(i)}
                  style={{borderBottom:'1px solid #eee', cursor:'pointer', background: i===selectedRow?'#f6af3d':'transparent'}}>
                  <td style={{padding:8,fontWeight:'bold',color: i===selectedRow ? '#000' : '#1c5282'}}>{p.name}</td>
                  <td style={{padding:8}}>{p.gstin}</td>
                  <td style={{padding:8,textAlign:'center'}}>{p.count}</td>
                  <td style={{padding:8,textAlign:'right'}}>{fmt(p.taxable)}</td>
                  <td style={{padding:8,textAlign:'right'}}>{fmt(p.igst)}</td>
                  <td style={{padding:8,textAlign:'right'}}>{fmt(p.cgst)}</td>
                  <td style={{padding:8,textAlign:'right'}}>{fmt(p.sgst)}</td>
                  <td style={{padding:8,textAlign:'right',fontWeight:'bold'}}>{fmt(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // GENERIC VOUCHER DRILL-DOWN for B2CL, B2CS, CDNR, CDNUR
  if (['b2cl','b2cs','cdnr','cdnur'].includes(drillDown || '')) {
    const sectionLabels: Record<string,string> = {
      'b2cl': 'B2C (Large) Invoices - Unregistered Inter-State > ₹2.5L',
      'b2cs': 'B2C (Small) Invoices - Unregistered Intra-State / ≤ ₹2.5L',
      'cdnr': 'Credit/Debit Notes (Registered)',
      'cdnur': 'Credit/Debit Notes (Unregistered)',
    };
    const vcList = currentDrillVouchers;
    return (
      <div className="report-workspace" style={{background:'#fff',height:'100%',display:'flex',flexDirection:'column'}}>
        <div style={{background:'#1c5282',color:'white',padding:'8px 15px',fontWeight:'bold',display:'flex',justifyContent:'space-between'}}>
          <span>GSTR-1 - {sectionLabels[drillDown!] || drillDown}</span>
          <button onClick={()=>setDrillDown(null)} className="tally-btn-sm">Esc: Back</button>
        </div>
        <div style={{flex:1, overflowY:'auto'}}>
          {vcList.length === 0 ? (
            <div style={{padding:40,textAlign:'center',color:'#888',fontSize:14}}>
              <div style={{fontSize:36,marginBottom:10}}>📋</div>
              No vouchers found in this category.
            </div>
          ) : (
          <table className="report-table" style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead style={{position:'sticky',top:0,background:'#e8eef4'}}>
              <tr>
                <th style={{padding:8,textAlign:'left'}}>Date</th>
                <th style={{padding:8,textAlign:'left'}}>Voucher No.</th>
                <th style={{padding:8,textAlign:'left'}}>Party Name</th>
                <th style={{padding:8,textAlign:'right'}}>Taxable Value</th>
                <th style={{padding:8,textAlign:'right'}}>Tax Amount</th>
                <th style={{padding:8,textAlign:'right'}}>Invoice Amount</th>
              </tr>
            </thead>
            <tbody>
              {vcList.map((v,i)=>{
                const tb = getTaxBreakdown(v);
                return (
                <tr key={i} onClick={()=>onDrillDownVoucher(v)} onMouseEnter={()=>setSelectedVchIdx(i)}
                  style={{borderBottom:'1px solid #eee', cursor:'pointer', background: i===selectedVchIdx?'#f6af3d':'transparent'}}>
                  <td style={{padding:8}}>{v.date}</td>
                  <td style={{padding:8}}>{v.voucherNo}</td>
                  <td style={{padding:8,fontWeight:'bold',color: i===selectedVchIdx ? '#000' : '#1c5282'}}>{v.partyName}</td>
                  <td style={{padding:8,textAlign:'right'}}>{fmt(tb.taxable)}</td>
                  <td style={{padding:8,textAlign:'right'}}>{fmt(tb.totalTax)}</td>
                  <td style={{padding:8,textAlign:'right',fontWeight:'bold'}}>{fmt(tb.invoiceTotal)}</td>
                </tr>
              );})}
            </tbody>
            <tfoot>
              <tr style={{background:'#f0f4f8',fontWeight:'bold',borderTop:'2px solid #1c5282'}}>
                <td colSpan={3} style={{padding:8,textAlign:'right'}}>Total ({vcList.length} vouchers)</td>
                <td style={{padding:8,textAlign:'right'}}>{fmt(vcList.reduce((s,v)=>s+getTaxBreakdown(v).taxable,0))}</td>
                <td style={{padding:8,textAlign:'right'}}>{fmt(vcList.reduce((s,v)=>s+getTaxBreakdown(v).totalTax,0))}</td>
                <td style={{padding:8,textAlign:'right'}}>{fmt(vcList.reduce((s,v)=>s+getTaxBreakdown(v).invoiceTotal,0))}</td>
              </tr>
            </tfoot>
          </table>
          )}
        </div>
        <div style={{background:'#1c5282',color:'white',padding:'5px 15px',fontSize:11,textAlign:'center'}}>Enter: Alter Voucher | Esc: Back</div>
      </div>
    );
  }

  if (drillDown === 'hsn') {
    const hsnMap: Record<string, any> = {};
    salesVouchers.forEach(v => {
      const isInter = v.partyDetails?.buyerState && activeCompany?.state && v.partyDetails.buyerState !== activeCompany.state;
      v.inventoryEntries.forEach(item => {
        const key = item.hsnCode || 'N/A';
        const rate = item.gstRate || 18;
        if (!hsnMap[key]) hsnMap[key] = {hsn:key, desc:'', uqc:item.unit||'NOS', qty:0, val:0, txval:0, igst:0, cgst:0, sgst:0, totalTax:0, rate};
        // item.amount is already TAXABLE (exclusive of GST)
        const txval = item.taxableAmount || item.amount;
        const tax = txval * rate / 100;
        hsnMap[key].qty += item.qty; hsnMap[key].val += (txval + tax); hsnMap[key].txval += txval;
        if (isInter) hsnMap[key].igst += tax; else { hsnMap[key].cgst += tax/2; hsnMap[key].sgst += tax/2; }
        hsnMap[key].totalTax += tax;
      });
    });
    return (
      <div className="report-workspace" style={{background:'#fff',height:'100%',display:'flex',flexDirection:'column'}}>
        <div style={{background:'#1c5282',color:'white',padding:'8px 15px',fontWeight:'bold',display:'flex',justifyContent:'space-between'}}>
          <span>GSTR-1 - HSN/SAC Summary</span>
          <button onClick={()=>setDrillDown(null)} className="tally-btn-sm">Esc: Back</button>
        </div>
        <div style={{flex:1, overflow:'auto'}}>
          <table className="report-table" style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead>
              <tr style={{background:'#f0f4f8', borderBottom:'1px solid #333'}}>
                <th style={{padding:6,textAlign:'left'}}>HSN/SAC</th><th style={{padding:6,textAlign:'left'}}>UQC</th>
                <th style={{padding:6,textAlign:'right'}}>Qty</th><th style={{padding:6,textAlign:'right'}}>Value</th>
                <th style={{padding:6,textAlign:'center'}}>Rate</th><th style={{padding:6,textAlign:'right'}}>Taxable</th>
                <th style={{padding:6,textAlign:'right'}}>IGST</th><th style={{padding:6,textAlign:'right'}}>CGST</th><th style={{padding:6,textAlign:'right'}}>SGST</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(hsnMap).map((r,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                  <td style={{padding:6}}>{r.hsn}</td><td style={{padding:6}}>{r.uqc}</td>
                  <td style={{padding:6,textAlign:'right'}}>{r.qty}</td><td style={{padding:6,textAlign:'right'}}>{fmt(r.val)}</td>
                  <td style={{padding:6,textAlign:'center'}}>{r.rate}%</td><td style={{padding:6,textAlign:'right'}}>{fmt(r.txval)}</td>
                  <td style={{padding:6,textAlign:'right'}}>{fmt(r.igst)}</td><td style={{padding:6,textAlign:'right'}}>{fmt(r.cgst)}</td><td style={{padding:6,textAlign:'right'}}>{fmt(r.sgst)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (drillDown === 'docs') {
    const nums = salesVouchers.map(v => v.number).filter(n => !isNaN(n));
    const min = nums.length ? Math.min(...nums) : 0;
    const max = nums.length ? Math.max(...nums) : 0;
    return (
      <div className="report-workspace" style={{background:'#fff',height:'100%',display:'flex',flexDirection:'column'}}>
        <div style={{background:'#1c5282',color:'white',padding:'8px 15px',fontWeight:'bold',display:'flex',justifyContent:'space-between'}}>
          <span>GSTR-1 - Document Summary</span>
          <button onClick={()=>setDrillDown(null)} className="tally-btn-sm">Esc: Back</button>
        </div>
        <div style={{padding:15}}>
          <table className="report-table" style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{background:'#f0f4f8'}}><th>Nature</th><th>From</th><th>To</th><th>Total</th><th>Cancelled</th><th>Net</th></tr></thead>
            <tbody><tr><td>Outward Supply</td><td>{min}</td><td>{max}</td><td>{salesVouchers.length}</td><td>0</td><td>{salesVouchers.length}</td></tr></tbody>
          </table>
        </div>
      </div>
    );
  }

  // MAIN SUMMARY
  return (
    <div className="report-workspace" style={{background:'#fff',height:'100%',display:'flex',flexDirection:'column',position:'relative'}}>
      {/* Header */}
      <div style={{background:'#1c5282',color:'white',padding:'10px 15px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontWeight:'bold',fontSize:16}}>GSTR-1 - Return Summary</div>
        <div style={{fontSize:12,opacity:0.9}}>{activeCompany?.name} | {currentPeriod.start} to {currentPeriod.end}</div>
      </div>

      {/* Stats */}
      <div style={{padding:10, background:'#f9f9f9', borderBottom:'1px solid #ccc', display:'flex', gap:30}}>
        <div><span style={{fontSize:11,color:'#666'}}>Total Vouchers:</span> <span style={{fontWeight:'bold'}}>{vouchers.length}</span></div>
        <div><span style={{fontSize:11,color:'#666'}}>Included:</span> <span style={{fontWeight:'bold',color:'#1a7a4a'}}>{salesVouchers.length}</span></div>
        <div><span style={{fontSize:11,color:'#666'}}>Incomplete:</span> <span style={{fontWeight:'bold',color:'#d93025'}}>0</span></div>
      </div>

      {/* Sections */}
      <div style={{flex:1, overflowY:'auto'}}>
        <table className="report-table" style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead>
            <tr style={{background:'#e8eef4',borderBottom:'2px solid #ccc'}}>
              <th style={{padding:10,textAlign:'left'}}>SI No.</th><th style={{padding:10,textAlign:'left'}}>Particulars</th>
              <th style={{padding:10,textAlign:'right'}}>Count</th><th style={{padding:10,textAlign:'right'}}>Taxable</th>
              <th style={{padding:10,textAlign:'right'}}>Tax Amount</th><th style={{padding:10,textAlign:'right'}}>Invoice Amount</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s,i)=>(
              <tr key={s.id} onClick={()=>setDrillDown(s.id)} onMouseEnter={()=>setSelectedRow(i)}
                style={{borderBottom:'1px solid #eee', cursor:'pointer', background: i===selectedRow?'#f6af3d':'transparent'}}>
                <td style={{padding:10}}>{i+1}</td>
                <td style={{padding:10,fontWeight:'bold',color: i===selectedRow ? '#000' : '#1c5282'}}>{s.label}</td>
                <td style={{padding:10,textAlign:'right'}}>{s.vouchers.length}</td>
                <td style={{padding:10,textAlign:'right'}}>{fmt(s.vouchers.reduce((sum,v)=>sum+getTaxBreakdown(v).taxable,0))}</td>
                <td style={{padding:10,textAlign:'right'}}>{fmt(s.vouchers.reduce((sum,v)=>sum+getTaxBreakdown(v).totalTax,0))}</td>
                <td style={{padding:10,textAlign:'right',fontWeight:'bold'}}>{fmt(s.vouchers.reduce((sum,v)=>sum+getTaxBreakdown(v).invoiceTotal,0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Bar */}
      <div style={{background:'#1c5282',color:'white',padding:'8px 20px',display:'flex',justifyContent:'flex-end',gap:25,fontSize:12,borderTop:'1px solid #fff'}}>
        <div style={{cursor:'pointer'}} onClick={goBack}><u>Q</u>: Quit</div>
        <div style={{cursor:'pointer'}} onClick={exportExcel}><u>X</u>: Excel</div>
        <div style={{cursor:'pointer'}} onClick={exportCsv}><u>C</u>: CSV</div>
        <div style={{cursor:'pointer'}} onClick={()=>setShowExportGstModal(true)}><u>E</u>: Export JSON</div>
      </div>

      {showExportGstModal && (
        <div className="modal-overlay" style={{zIndex:10000}} onClick={()=>setShowExportGstModal(false)}>
          <div className="modal-box" style={{width:400}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">Export GSTR-1 Configuration</div>
            <div style={{padding:20}}>
              <div style={{marginBottom:15, fontWeight:'bold', color:'#1c5282'}}>Export Data:</div>
              <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <button className="tally-btn" style={{textAlign:'left', justifyContent:'flex-start'}} onClick={()=>handleActualExport('combined')}>
                  1. Combined JSON (Single File)
                </button>
                <button className="tally-btn" style={{textAlign:'left', justifyContent:'flex-start'}} onClick={()=>handleActualExport('separate')}>
                  2. Separate JSON Files (B2B, HSN, Docs)
                </button>
              </div>
            </div>
            <div style={{background:'#f0f4f8', padding:'8px 15px', textAlign:'right', borderTop:'1px solid #ddd'}}>
              <button className="tally-btn" style={{background:'#eee', color:'#333', border:'1px solid #ccc'}} onClick={()=>setShowExportGstModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== GSTR-3B REPORT VIEW ====================
function GSTR3BReportView({vouchers, goBack}: {vouchers: Voucher[], goBack: () => void}) {
  const [drillDown, setDrillDown] = useState<string|null>(null);
  
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (drillDown) setDrillDown(null);
        else goBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drillDown, goBack]);

  const salesTax = vouchers.filter(v=>v.type==='Sales').reduce((s,v)=>s+v.total - (v.total/1.18),0);
  const purchaseTax = vouchers.filter(v=>v.type==='Purchase').reduce((s,v)=>s+v.total - (v.total/1.18),0);

  if (drillDown === 'outward') {
    return (
      <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#fff'}}>
        <div style={{background:'#5a2d82',color:'white',padding:'10px 15px',fontWeight:'bold',display:'flex',justifyContent:'space-between'}}>
          <span>GSTR-3B: Outward Taxable Supplies</span>
          <button onClick={()=>setDrillDown(null)} className="tally-btn-sm">Esc: Back</button>
        </div>
        <div style={{padding:20}}>
          <p>Total Outward Tax (GST Payable): ₹ {salesTax.toLocaleString('en-IN')}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#fff'}}>
      <div style={{background:'#5a2d82',color:'white',padding:'10px 15px',fontWeight:'bold'}}>GSTR-3B Summary</div>
      <div style={{padding:20}}>
        <div style={{display:'flex',justifyContent:'space-between',padding:10,borderBottom:'1px solid #eee',cursor:'pointer'}} onClick={()=>setDrillDown('outward')}>
          <span>3.1 Outward Taxable Supplies</span>
          <span style={{fontWeight:'bold'}}>₹ {salesTax.toLocaleString('en-IN')}</span>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',padding:10,borderBottom:'1px solid #eee'}}>
          <span>4. Eligible ITC (Inward)</span>
          <span style={{fontWeight:'bold'}}>₹ {purchaseTax.toLocaleString('en-IN')}</span>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',padding:10,background:'#f9f9f9',marginTop:10}}>
          <span style={{fontWeight:'bold'}}>Net GST Payable</span>
          <span style={{fontWeight:'bold',color:'#d93025'}}>₹ {(salesTax - purchaseTax).toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
}

// ==================== ROLE MANAGEMENT VIEW ====================
function RoleManagementView({goBack}: {goBack: () => void}) {
  const users: AppUser[] = [
    { id: 1, username: 'admin', role: 'Admin', email: 'admin@ledgerx.com' },
    { id: 2, username: 'accountant_1', role: 'Accountant', email: 'acc@ledgerx.com' },
    { id: 3, username: 'data_entry', role: 'Data Entry' }
  ];

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#fff'}}>
      <div style={{background:'#1a7a4a',color:'white',padding:'10px 15px',fontWeight:'bold'}}>User & Role Management</div>
      <div style={{padding:15}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead>
            <tr style={{background:'#f0f4f8',borderBottom:'2px solid #ccc'}}>
              <th style={{padding:10,textAlign:'left'}}>Username</th>
              <th style={{padding:10,textAlign:'left'}}>Email</th>
              <th style={{padding:10,textAlign:'left'}}>Role</th>
              <th style={{padding:10,textAlign:'center'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{borderBottom:'1px solid #eee'}}>
                <td style={{padding:10}}>{u.username}</td>
                <td style={{padding:10}}>{u.email || '—'}</td>
                <td style={{padding:10}}><span style={{background:'#e8f5e9',padding:'2px 8px',borderRadius:10,fontSize:11,color:'#2e7d32'}}>{u.role}</span></td>
                <td style={{padding:10,textAlign:'center'}}><button style={{fontSize:11,color:'#1c5282',border:'none',background:'transparent',cursor:'pointer'}}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button style={{marginTop:20,padding:'8px 20px',background:'#1a7a4a',color:'white',border:'none',cursor:'pointer',fontWeight:'bold'}}>+ Add New User</button>
      </div>
    </div>
  );
}

// ==================== DATA EXCHANGE VIEW — FULLY FUNCTIONAL ====================
function DataExchangeView({
  goBack, ledgers, vouchers, stockItems, activeCompany, onDataImported
}: {
  goBack: () => void;
  ledgers: Ledger[];
  vouchers: Voucher[];
  stockItems: StockItem[];
  activeCompany: Company | null;
  onDataImported: () => void;
}) {
  const [tab, setTab] = useState<'export'|'import'>('export');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<{type:'info'|'ok'|'warn'|'err'; msg:string}[]>([]);
  const [importFile, setImportFile] = useState<File|null>(null);
  const [importType, setImportType] = useState<'ledgers-csv'|'vouchers-csv'|'json-backup'>('ledgers-csv');
  const fileRef = useRef<HTMLInputElement>(null);

  const addLog = (type: 'info'|'ok'|'warn'|'err', msg: string) =>
    setLog(prev => [...prev, {type, msg}]);

  const clearLog = () => setLog([]);

  // ——— CSV / JSON helpers ———
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const escCsv = (v: any) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g,'""')}"` : s;
  };

  const toCsv = (rows: Record<string,any>[], headers: string[]) => {
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map(h => escCsv(row[h])).join(','));
    }
    return lines.join('\n');
  };

  const parseCsvLines = (text: string): string[][] => {
    const lines: string[][] = [];
    let cur: string[] = [], field = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"' && text[i+1] === '"') { field += '"'; i++; }
        else if (c === '"') inQ = false;
        else field += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ',') { cur.push(field); field = ''; }
        else if (c === '\n') { cur.push(field); lines.push(cur); cur = []; field = ''; }
        else if (c === '\r') {}
        else field += c;
      }
    }
    if (field || cur.length) { cur.push(field); lines.push(cur); }
    return lines.filter(r => r.some(c => c.trim()));
  };

  const getToken = () => {
    try { return authClient.getToken() || ''; } catch { return ''; }
  };

  // ——— EXPORTS ———
  const exportLedgersCSV = () => {
    if (!ledgers.length) { addLog('warn','No ledgers to export.'); return; }
    const headers = ['Name','GroupName','Alias','OpeningBalance','BalanceType','Address','State','PinCode','GSTIN','PAN','Phone','Email','BankName','AccountNo','IFSC'];
    const rows = ledgers.map(l => ({
      Name: l.name, GroupName: l.groupName, Alias: l.alias||'',
      OpeningBalance: l.openingBalance||0, BalanceType: l.balanceType||'Dr',
      Address: l.address||'', State: l.state||'', PinCode: l.pinCode||'',
      GSTIN: l.gstin||'', PAN: l.pan||'', Phone: l.phone||'', Email: l.email||'',
      BankName: l.bankName||'', AccountNo: l.accountNo||'', IFSC: l.ifsc||''
    }));
    const csv = toCsv(rows, headers);
    downloadBlob(new Blob([csv], {type:'text/csv'}), `Ledgers_${activeCompany?.name||'Company'}_${new Date().toISOString().slice(0,10)}.csv`);
    addLog('ok', `✓ Exported ${ledgers.length} ledgers to CSV.`);
  };

  const exportVouchersCSV = () => {
    if (!vouchers.length) { addLog('warn','No vouchers to export.'); return; }
    const headers = ['Date','Type','VoucherNo','PartyName','Narration','LedgerName','EntryType','Amount'];
    const rows: Record<string,any>[] = [];
    for (const v of vouchers) {
      if (!v.entries?.length) continue;
      for (const e of v.entries) {
        rows.push({
          Date: v.date, Type: v.type, VoucherNo: v.voucherNo,
          PartyName: v.partyName||'', Narration: v.narration||'',
          LedgerName: e.ledgerName||'', EntryType: e.entryType, Amount: e.amount
        });
      }
    }
    const csv = toCsv(rows, headers);
    downloadBlob(new Blob([csv], {type:'text/csv'}), `Vouchers_${activeCompany?.name||'Company'}_${new Date().toISOString().slice(0,10)}.csv`);
    addLog('ok', `✓ Exported ${vouchers.length} vouchers (${rows.length} entries) to CSV.`);
  };

  const exportFullJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      company: activeCompany,
      ledgers,
      vouchers,
      stockItems,
      version: '1.0'
    };
    const json = JSON.stringify(data, null, 2);
    downloadBlob(new Blob([json], {type:'application/json'}), `FullBackup_${activeCompany?.name||'Company'}_${new Date().toISOString().slice(0,10)}.json`);
    addLog('ok', `✓ Full backup exported: ${ledgers.length} ledgers, ${vouchers.length} vouchers, ${stockItems.length} stock items.`);
  };

  const exportLedgersJSON = () => {
    const data = { exportedAt: new Date().toISOString(), company: activeCompany?.name, ledgers };
    downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}), `Ledgers_${activeCompany?.name||'Company'}.json`);
    addLog('ok', `✓ Exported ${ledgers.length} ledgers to JSON.`);
  };

  // ——— IMPORTS ———
  const handleImport = async () => {
    if (!importFile) { addLog('err','Please select a file first.'); return; }
    if (!activeCompany?.id) { addLog('err','No active company. Please open a company first.'); return; }
    clearLog();
    setBusy(true);
    addLog('info', `Starting import from: ${importFile.name}`);

    try {
      const text = await importFile.text();

      if (importType === 'ledgers-csv') {
        await importLedgersFromCSV(text);
      } else if (importType === 'vouchers-csv') {
        await importVouchersFromCSV(text);
      } else if (importType === 'json-backup') {
        await importFromJSON(text);
      }
    } catch (err: any) {
      addLog('err', `Import failed: ${err.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  const importLedgersFromCSV = async (text: string) => {
    const lines = parseCsvLines(text);
    if (lines.length < 2) { addLog('err','CSV is empty or has no data rows.'); return; }

    const headers = lines[0].map(h => h.trim());
    const nameIdx     = headers.findIndex(h => h.toLowerCase() === 'name');
    const groupIdx    = headers.findIndex(h => h.toLowerCase() === 'groupname');
    const opBalIdx    = headers.findIndex(h => h.toLowerCase() === 'openingbalance');
    const balTypeIdx  = headers.findIndex(h => h.toLowerCase() === 'balancetype');
    const aliasIdx    = headers.findIndex(h => h.toLowerCase() === 'alias');
    const addrIdx     = headers.findIndex(h => h.toLowerCase() === 'address');
    const stateIdx    = headers.findIndex(h => h.toLowerCase() === 'state');
    const gstinIdx    = headers.findIndex(h => h.toLowerCase() === 'gstin');
    const panIdx      = headers.findIndex(h => h.toLowerCase() === 'pan');
    const phoneIdx    = headers.findIndex(h => h.toLowerCase() === 'phone');
    const emailIdx    = headers.findIndex(h => h.toLowerCase() === 'email');
    const bankIdx     = headers.findIndex(h => h.toLowerCase() === 'bankname');
    const accIdx      = headers.findIndex(h => h.toLowerCase() === 'accountno');
    const ifscIdx     = headers.findIndex(h => h.toLowerCase() === 'ifsc');
    const pinIdx      = headers.findIndex(h => h.toLowerCase() === 'pincode');

    if (nameIdx === -1 || groupIdx === -1) {
      addLog('err', 'CSV must have "Name" and "GroupName" columns.'); return;
    }

    const dataRows = lines.slice(1);
    let created = 0, skipped = 0, failed = 0;
    const token = getToken();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const name = row[nameIdx]?.trim();
      if (!name) { skipped++; continue; }

      const payload = {
        companyId: activeCompany!.id,
        name,
        groupName: row[groupIdx]?.trim() || 'Primary',
        alias:     aliasIdx > -1 ? row[aliasIdx]?.trim() : undefined,
        openingBalance: opBalIdx > -1 ? parseFloat(row[opBalIdx]) || 0 : 0,
        balanceType:    balTypeIdx > -1 ? (row[balTypeIdx]?.trim() || 'Dr') : 'Dr',
        address:  addrIdx  > -1 ? row[addrIdx]?.trim()  : undefined,
        state:    stateIdx > -1 ? row[stateIdx]?.trim()  : undefined,
        pinCode:  pinIdx   > -1 ? row[pinIdx]?.trim()   : undefined,
        gstin:    gstinIdx > -1 ? row[gstinIdx]?.trim() : undefined,
        pan:      panIdx   > -1 ? row[panIdx]?.trim()   : undefined,
        phone:    phoneIdx > -1 ? row[phoneIdx]?.trim() : undefined,
        email:    emailIdx > -1 ? row[emailIdx]?.trim() : undefined,
        bankName: bankIdx  > -1 ? row[bankIdx]?.trim()  : undefined,
        accountNo:accIdx   > -1 ? row[accIdx]?.trim()   : undefined,
        ifsc:     ifscIdx  > -1 ? row[ifscIdx]?.trim()  : undefined,
      };

      try {
        const res = await fetch('/api/ledgers', {
          method: 'POST',
          headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          created++;
          if (created % 10 === 0) addLog('info', `  ... ${created} ledgers created so far`);
        } else if (data.error?.includes('already exists')) {
          skipped++;
          addLog('warn', `  Skipped (duplicate): ${name}`);
        } else {
          failed++;
          addLog('err', `  Failed "${name}": ${data.error}`);
        }
      } catch (e: any) {
        failed++;
        addLog('err', `  Error "${name}": ${e.message}`);
      }
    }

    addLog('ok', `✓ Import complete: ${created} created, ${skipped} skipped (duplicates), ${failed} failed.`);
    if (created > 0) {
      addLog('info', 'Reloading data...');
      setTimeout(() => onDataImported(), 1500);
    }
  };

  const importVouchersFromCSV = async (text: string) => {
    addLog('info', 'Parsing vouchers CSV...');
    const lines = parseCsvLines(text);
    if (lines.length < 2) { addLog('err','CSV is empty.'); return; }

    const headers = lines[0].map(h => h.trim().toLowerCase());
    const dateIdx   = headers.indexOf('date');
    const typeIdx   = headers.indexOf('type');
    const vNoIdx    = headers.indexOf('voucherno');
    const partyIdx  = headers.indexOf('partyname');
    const narrIdx   = headers.indexOf('narration');
    const lNameIdx  = headers.indexOf('ledgername');
    const etIdx     = headers.indexOf('entrytype');
    const amtIdx    = headers.indexOf('amount');

    if ([dateIdx,typeIdx,vNoIdx,lNameIdx,etIdx,amtIdx].some(x=>x===-1)) {
      addLog('err','CSV must have: Date, Type, VoucherNo, LedgerName, EntryType, Amount columns.');
      return;
    }

    // Group rows by voucherNo
    const vMap = new Map<string, any[]>();
    for (const row of lines.slice(1)) {
      const vNo = row[vNoIdx]?.trim() || '';
      if (!vMap.has(vNo)) vMap.set(vNo, []);
      vMap.get(vNo)!.push(row);
    }

    const token = getToken();
    let created = 0, failed = 0;
    const vMapEntries = Array.from(vMap.entries());
    for (const [vNo, rows] of vMapEntries) {
      const firstRow = rows[0];
      const date = firstRow[dateIdx]?.trim() || new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).replace(/ /g,'-');
      const type = firstRow[typeIdx]?.trim() || 'Journal';
      const narration = narrIdx > -1 ? (firstRow[narrIdx]?.trim() || '') : '';
      const partyName = partyIdx > -1 ? (firstRow[partyIdx]?.trim() || '') : '';

      // Find party ledger id
      const partyLedger = ledgers.find(l => l.name.trim().toLowerCase() === partyName.trim().toLowerCase());

      const entries: any[] = [];
      for (const row of rows) {
        const lName = row[lNameIdx]?.trim() || '';
        if (!lName) continue;
        const ledger = ledgers.find(l => l.name.trim().toLowerCase() === lName.trim().toLowerCase());
        if (!ledger) { addLog('warn', `  Ledger not found: "${lName}" in voucher ${vNo}`); }
        entries.push({
          ledgerId: ledger?.id || 0,
          ledgerName: lName,
          amount: Math.abs(parseFloat(row[amtIdx]) || 0),
          entryType: (row[etIdx]?.trim() || 'Dr') as 'Dr'|'Cr'
        });
      }

      const validEntries = entries.filter(e => e.ledgerId > 0);
      if (validEntries.length < 2) {
        failed++;
        addLog('err', `  Voucher ${vNo}: need at least 2 valid ledger entries (found ${validEntries.length})`);
        continue;
      }

      // Validate Dr = Cr
      const totalDr = validEntries.filter(e=>e.entryType==='Dr').reduce((s,e)=>s+e.amount,0);
      const totalCr = validEntries.filter(e=>e.entryType==='Cr').reduce((s,e)=>s+e.amount,0);
      if (Math.abs(totalDr - totalCr) > 0.01) {
        addLog('warn', `  Voucher ${vNo}: Dr(${totalDr}) ≠ Cr(${totalCr}) — still importing`);
      }

      try {
        const res = await fetch('/api/vouchers', {
          method: 'POST',
          headers: {'Content-Type':'application/json','Authorization':`Bearer ${token}`},
          body: JSON.stringify({
            companyId: activeCompany!.id,
            type, date, voucherNo: vNo, narration,
            partyName, partyId: partyLedger?.id || 0,
            entries: validEntries, inventoryEntries: []
          })
        });
        const data = await res.json();
        if (data.success) created++;
        else { failed++; addLog('err', `  Voucher ${vNo} failed: ${data.error}`); }
      } catch (e: any) {
        failed++;
        addLog('err', `  Voucher ${vNo} error: ${e.message}`);
      }
    }

    addLog('ok', `✓ Voucher import complete: ${created} created, ${failed} failed.`);
    if (created > 0) setTimeout(() => onDataImported(), 1500);
  };

  const importFromJSON = async (text: string) => {
    let data: any;
    try { data = JSON.parse(text); } catch (e) { addLog('err','Invalid JSON file.'); return; }

    if (!data.ledgers && !data.vouchers) {
      addLog('err', 'JSON file does not appear to be a valid LedgerX backup. Expected "ledgers" or "vouchers" fields.');
      return;
    }

    const token = getToken();
    let lCreated = 0, lSkipped = 0, vCreated = 0;

    // Import Ledgers
    if (data.ledgers?.length) {
      addLog('info', `Importing ${data.ledgers.length} ledgers...`);
      for (const l of data.ledgers) {
        try {
          const res = await fetch('/api/ledgers', {
            method: 'POST',
            headers: {'Content-Type':'application/json','Authorization':`Bearer ${token}`},
            body: JSON.stringify({
              ...l,
              companyId: activeCompany!.id,
              id: undefined
            })
          });
          const d = await res.json();
          if (d.success) lCreated++;
          else if (d.error?.includes('already exists')) lSkipped++;
          else addLog('warn', `  Ledger "${l.name}": ${d.error}`);
        } catch (e: any) { addLog('err', `  Ledger "${l.name}": ${e.message}`); }
      }
      addLog('ok', `  Ledgers: ${lCreated} created, ${lSkipped} skipped`);
    }

    // Re-fetch ledgers to get IDs for voucher import
    let freshLedgers: Ledger[] = [...ledgers];
    if (lCreated > 0) {
      try {
        const res = await fetch(`/api/ledgers?companyId=${activeCompany!.id}`, {
          headers: {'Authorization': `Bearer ${token}`}
        });
        const d = await res.json();
        if (d.ledgers) freshLedgers = d.ledgers.map((l: any) => ({...l, openingBalance: l.openingBal ?? 0, pan: l.panItNo || ''}));
      } catch {}
    }

    // Import Vouchers
    if (data.vouchers?.length) {
      addLog('info', `Importing ${data.vouchers.length} vouchers...`);
      for (const v of data.vouchers) {
        const mappedEntries = (v.entries || []).map((e: any) => {
          const lName = e.ledgerName || '';
          const found = freshLedgers.find(l => l.name.trim().toLowerCase() === lName.trim().toLowerCase());
          return {
            ledgerId: found?.id || e.ledgerId || 0,
            ledgerName: lName,
            amount: Math.abs(e.amount || 0),
            entryType: e.entryType || 'Dr'
          };
        }).filter((e: any) => e.ledgerId > 0);

        if (mappedEntries.length < 2) { addLog('warn', `  Skipping voucher ${v.voucherNo}: insufficient mapped entries`); continue; }

        try {
          const res = await fetch('/api/vouchers', {
            method: 'POST',
            headers: {'Content-Type':'application/json','Authorization':`Bearer ${token}`},
            body: JSON.stringify({
              companyId: activeCompany!.id,
              type: v.type, date: v.date, voucherNo: v.voucherNo,
              narration: v.narration || '',
              entries: mappedEntries, inventoryEntries: []
            })
          });
          const d = await res.json();
          if (d.success) vCreated++;
          else addLog('warn', `  Voucher ${v.voucherNo}: ${d.error}`);
        } catch (e: any) { addLog('err', `  Voucher error: ${e.message}`); }
      }
      addLog('ok', `  Vouchers: ${vCreated} created`);
    }

    addLog('ok', `✓ JSON import complete: ${lCreated} ledgers + ${vCreated} vouchers imported.`);
    if (lCreated + vCreated > 0) {
      addLog('info', 'Reloading application data...');
      setTimeout(() => onDataImported(), 1500);
    }
  };

  // ——— UI COLORS ———
  const C = { blue:'#1c5282', green:'#1a7a4a', red:'#8B0000', orange:'#b35900', bg:'#f5f7fa' };

  const btnStyle = (color: string): React.CSSProperties => ({
    padding:'8px 18px', background:color, color:'white', border:'none',
    cursor:busy?'not-allowed':'pointer', borderRadius:4, fontSize:12,
    fontWeight:'bold', opacity:busy?0.6:1, transition:'opacity 0.2s'
  });

  const logColor: Record<string,string> = {info:'#555', ok:'#145214', warn:'#7a4a00', err:'#8B0000'};
  const logBg:    Record<string,string> = {info:'#f0f4ff', ok:'#e8f5e8', warn:'#fdf6e3', err:'#fff0f0'};
  const logIcon:  Record<string,string> = {info:'ℹ', ok:'✓', warn:'⚠', err:'✗'};

  return (
    <div style={{height:'100%', overflowY:'auto', background:C.bg, display:'flex', flexDirection:'column'}}>
      {/* Header */}
      <div style={{background:'linear-gradient(90deg,#1c3e5a,#2b6cb0)', color:'white', padding:'10px 20px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <span style={{fontWeight:'bold', fontSize:15}}>🔄 Data Exchange</span>
        <button onClick={goBack} style={{padding:'3px 14px', background:'rgba(255,255,255,0.15)', color:'white', border:'1px solid rgba(255,255,255,0.4)', borderRadius:3, cursor:'pointer', fontSize:12}}>✕ Close</button>
      </div>

      {/* Company Context Bar */}
      <div style={{background:'#fff', borderBottom:'1px solid #dde', padding:'5px 20px', fontSize:12, color:'#555', display:'flex', gap:20}}>
        <span>🏢 Company: <b style={{color:C.blue}}>{activeCompany?.name || '— No company selected —'}</b></span>
        <span>📁 Ledgers: <b>{ledgers.length}</b></span>
        <span>📄 Vouchers: <b>{vouchers.length}</b></span>
        <span>📦 Stock Items: <b>{stockItems.length}</b></span>
      </div>

      {/* Tabs */}
      <div style={{display:'flex', background:'#e8edf5', padding:'8px 20px', gap:8}}>
        {(['export','import'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:'6px 24px', border:'none', borderRadius:4,
            background: tab===t ? C.blue : 'rgba(0,0,0,0.08)',
            color: tab===t ? 'white' : '#555',
            fontWeight: tab===t ? 'bold' : 'normal',
            cursor:'pointer', fontSize:13, textTransform:'capitalize'
          }}>
            {t === 'export' ? '📤 Export Data' : '📥 Import Data'}
          </button>
        ))}
      </div>

      <div style={{flex:1, padding:'16px 20px', display:'grid', gridTemplateColumns:'1fr 340px', gap:16}}>

        {/* LEFT PANEL */}
        <div>
          {tab === 'export' ? (
            <div style={{display:'flex', flexDirection:'column', gap:14}}>
              {/* Export Cards */}
              {[
                {
                  icon:'📋', title:'Export Ledgers (CSV)',
                  desc:'Download all ledgers with group, opening balance, GST details, and contact information. Compatible with Excel / Google Sheets.',
                  action: exportLedgersCSV, color: C.blue, count: `${ledgers.length} ledgers`
                },
                {
                  icon:'📊', title:'Export Vouchers (CSV)',
                  desc:'Download all voucher entries with date, type, party name, ledger name, Dr/Cr, and amount. Each entry on a separate row.',
                  action: exportVouchersCSV, color: '#5a2d82', count: `${vouchers.length} vouchers`
                },
                {
                  icon:'💾', title:'Export Ledgers (JSON)',
                  desc:'Download ledgers in JSON format for structured data exchange or custom integration.',
                  action: exportLedgersJSON, color: C.orange, count: `${ledgers.length} ledgers`
                },
                {
                  icon:'🗄️', title:'Full Backup (JSON)',
                  desc:'Export complete data backup including all ledgers, vouchers, and stock items. Use this for migration or full data restore.',
                  action: exportFullJSON, color: C.green, count: `${ledgers.length} ledgers + ${vouchers.length} vouchers + ${stockItems.length} items`
                },
              ].map((card, i) => (
                <div key={i} style={{background:'#fff', border:'1px solid #dde', borderRadius:6, padding:'14px 16px', display:'flex', gap:14, alignItems:'flex-start', boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
                  <span style={{fontSize:28, lineHeight:1}}>{card.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:'bold', fontSize:14, color:'#1c3e5a', marginBottom:4}}>{card.title}</div>
                    <div style={{fontSize:12, color:'#666', marginBottom:8, lineHeight:1.5}}>{card.desc}</div>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <span style={{fontSize:11, color:'#888', background:'#f0f4ff', padding:'2px 8px', borderRadius:3}}>{card.count}</span>
                      <button style={btnStyle(card.color)} onClick={()=>{clearLog(); card.action();}}>⬇ Download</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{background:'#fff', border:'1px solid #dde', borderRadius:6, padding:'16px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
              <div style={{fontWeight:'bold', fontSize:14, color:'#1c3e5a', marginBottom:12}}>📥 Import Configuration</div>

              {/* Import Type */}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12, fontWeight:'bold', color:'#444', display:'block', marginBottom:6}}>Import Type</label>
                <div style={{display:'flex', flexDirection:'column', gap:6}}>
                  {[
                    {val:'ledgers-csv',    label:'Ledgers from CSV',       hint:'Name, GroupName, OpeningBalance, BalanceType, Address, GSTIN, ...'},
                    {val:'vouchers-csv',   label:'Vouchers from CSV',      hint:'Date, Type, VoucherNo, LedgerName, EntryType, Amount (one entry per row)'},
                    {val:'json-backup',    label:'Full Restore from JSON',  hint:'Complete backup exported from this app'},
                  ].map(opt => (
                    <label key={opt.val} style={{display:'flex', alignItems:'flex-start', gap:8, cursor:'pointer', padding:'8px 10px', borderRadius:4, background: importType===opt.val?'#e8f0fb':'#fafafa', border:`1px solid ${importType===opt.val?C.blue:'#dde'}`}}>
                      <input type="radio" name="importType" value={opt.val} checked={importType===opt.val as any} onChange={e=>setImportType(e.target.value as any)} style={{marginTop:2}}/>
                      <div>
                        <div style={{fontSize:13, fontWeight:'bold', color: importType===opt.val?C.blue:'#333'}}>{opt.label}</div>
                        <div style={{fontSize:11, color:'#777', marginTop:2}}>{opt.hint}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* File Picker */}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12, fontWeight:'bold', color:'#444', display:'block', marginBottom:6}}>Select File</label>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={importType==='json-backup'?'.json':'.csv'}
                    onChange={e=>setImportFile(e.target.files?.[0]||null)}
                    style={{display:'none'}}
                  />
                  <button style={{...btnStyle(C.blue), flex:1}} onClick={()=>fileRef.current?.click()}>📁 Choose File...</button>
                  {importFile && <span style={{fontSize:11, color:'#555', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{importFile.name}</span>}
                </div>
                {importFile && <div style={{fontSize:11, color:'#1a7a4a', marginTop:4}}>✓ {importFile.name} ({(importFile.size/1024).toFixed(1)} KB)</div>}
              </div>

              {/* Warnings */}
              <div style={{background:'#fff9e6', border:'1px solid #f5c518', borderRadius:4, padding:'8px 12px', fontSize:11, color:'#7a5c00', marginBottom:14}}>
                <b>⚠ Notes:</b><br/>
                • Existing ledgers with the same name will be skipped (no duplicates)<br/>
                • Vouchers require all ledger names to exist in the company<br/>
                • JSON restore will reload the page after completion
              </div>

              <button
                style={{...btnStyle(C.green), width:'100%', padding:'10px'}}
                onClick={handleImport}
                disabled={busy || !importFile || !activeCompany}
              >
                {busy ? '⏳ Importing...' : '⬆ Start Import'}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — Activity Log */}
        <div style={{display:'flex', flexDirection:'column', gap:0}}>
          <div style={{background:'#1c3e5a', color:'white', padding:'7px 12px', fontSize:12, fontWeight:'bold', borderRadius:'6px 6px 0 0', display:'flex', justifyContent:'space-between'}}>
            <span>📋 Activity Log</span>
            {log.length > 0 && <button onClick={clearLog} style={{background:'none',border:'none',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:10}}>Clear</button>}
          </div>
          <div style={{flex:1, background:'#fff', border:'1px solid #dde', borderTop:'none', borderRadius:'0 0 6px 6px', minHeight:300, padding:8, overflowY:'auto', display:'flex', flexDirection:'column', gap:4}}>
            {log.length === 0 ? (
              <div style={{textAlign:'center', color:'#aaa', fontSize:12, paddingTop:40}}>
                {tab==='export' ? '⬇ Click Download to start export' : '⬆ Select file and click Import'}
              </div>
            ) : log.map((entry, i) => (
              <div key={i} style={{fontSize:11, padding:'3px 8px', borderRadius:3, background:logBg[entry.type], color:logColor[entry.type], display:'flex', gap:6, alignItems:'flex-start'}}>
                <span style={{fontWeight:'bold', flexShrink:0}}>{logIcon[entry.type]}</span>
                <span style={{wordBreak:'break-all'}}>{entry.msg}</span>
              </div>
            ))}
            {busy && (
              <div style={{textAlign:'center', padding:'10px', color:'#555', fontSize:12}}>
                <span style={{display:'inline-block', animation:'spin 1s linear infinite'}}>⏳</span> Processing...
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

