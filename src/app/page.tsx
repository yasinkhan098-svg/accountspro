"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AuthUI from '@/components/AuthUI';
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
  | 'LEDGER_REPORT' | 'GROUP_SUMMARY' | 'STOCK_SUMMARY'
  | 'OUTSTANDING_REPORT' | 'CHART_OF_ACCOUNTS' | 'PRINT_PREVIEW'
  | 'GSTR1_REPORT' | 'GSTR3B_REPORT' | 'USER_ROLES' | 'DATA_EXCHANGE';

type VoucherTypeKey = 'Contra' | 'Payment' | 'Receipt' | 'Journal' | 'Sales' | 'Purchase' | 'Credit Note' | 'Debit Note';

// ==================== DATA INTERFACES ====================
interface Ledger {
  id: number; companyId: number; name: string; alias?: string; groupName: string;
  openingBalance: number; balanceType: 'Dr' | 'Cr';
  mailingName?: string; address?: string; state?: string; country?: string;
  gstin?: string; pan?: string; phone?: string; email?: string;
  registrationType?: string; bankName?: string; accountNo?: string; ifsc?: string; pinCode?: string;
  bankHolderName?: string; setAlterGstDetails?: string;
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
}
interface UnitData { id: number; companyId: number; name: string; symbol: string; formalName: string; uqc: string; decimalPlaces: number; }
interface GodownData { id: number; companyId: number; name: string; alias?: string; under: string; address?: string; }
interface VoucherTypeData { id: number; companyId: number; name: string; type: string; abbreviation: string; numberingMethod: string; startNumber: number; prefix?: string; suffix?: string; width?: number; prefillWithZero?: boolean; }
interface CurrencyData { id: number; companyId: number; name: string; symbol: string; isoCode: string; decimalPlaces: number; }
interface Company { 
  id: number; name: string; mailingName?: string; address?: string; state?: string; country?: string; gstin?: string; 
  telephone?: string; mobile?: string; email?: string; website?: string; 
  registrationType?: string; bankName?: string; bankHolderName?: string; accountNo?: string; ifsc?: string; swiftCode?: string; 
  financialYearStart?: string; booksBeginFrom?: string; securityControl?: boolean; password?: string;
  showMobile?: boolean; showEmail?: boolean; showWebsite?: boolean;
  logo?: string; showLogo?: boolean; pinCode?: string;
  showDiscount?: boolean;
}
type UserRole = 'Admin' | 'Accountant' | 'Data Entry' | 'Viewer';
interface AppUser { id: number; username: string; role: UserRole; email?: string; }

interface VoucherEntry { id: number; ledgerId: number; ledgerName: string; amount: number; entryType: 'Dr' | 'Cr'; narration?: string; }
interface InventoryEntry { id: number; itemId: number; itemName: string; qty: number; rate: number; rateInclTax: number; amountInclTax: number; unit: string; amount: number; discountPerc?: number; discountAmt?: number; taxableAmount?: number; gstRate: number; hsnCode?: string; altQty?: string; stockItem?: StockItem; }

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
}
interface DispatchDetails {
  deliveryNoteNo: string; dispatchDocNo: string; dispatchedThrough: string;
  destination: string; carrierNameAgent: string; billOfLadingNo: string;
  billOfLadingDate: string; motorVehicleNo: string;
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
const VOUCHER_TYPES_DEFAULT = ['Contra','Payment','Receipt','Journal','Sales','Purchase','Credit Note','Debit Note','Reversing Journal','Memorandum'];

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

function getLedgerClosingBalance(ledger: Ledger, vouchers: Voucher[]): number {
  let bal = ledger.balanceType === 'Dr' ? ledger.openingBalance : -ledger.openingBalance;
  for (const v of vouchers) {
    for (const e of v.entries) {
      if (e.ledgerId === ledger.id) {
        bal += e.entryType === 'Dr' ? e.amount : -e.amount;
      }
    }
  }
  return bal;
}

function getLedgerEntries(ledgerId: number, vouchers: Voucher[]): { voucher: Voucher; entry: VoucherEntry }[] {
  const result: { voucher: Voucher; entry: VoucherEntry }[] = [];
  for (const v of vouchers) {
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

// ==================== MAIN APP ====================
const parseDate = (d: string): Date => {
  if (!d) return new Date();
  const months: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  const parts = d.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = months[parts[1]] ?? 0;
    const year = parseInt(parts[2]);
    return new Date(year, month, day);
  }
  const date = new Date(d);
  return isNaN(date.getTime()) ? new Date() : date;
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
  const [isMounted, setIsMounted] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{type:string, id:number, name:string}|null>(null);
  const [pwdPrompt, setPwdPrompt] = useState<{company: Company, action: 'open' | 'alter'} | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    const authStatus = authClient.isAuthenticated();
    setIsAuthenticated(authStatus);
    if (authStatus) {
      setCurrentUser(authClient.getUser());
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
            const mapped = vData.vouchers.map((v: any) => ({
              ...v,
              date: new Date(v.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
            }));
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

  // Ensure Cash and Profit & Loss A/c exist for active company
  useEffect(() => {
    if (!isAuthenticated || !activeCompany) return;
    const cid = activeCompany.id;
    const hasCash = allLedgers.some(l => Number(l.companyId) === Number(cid) && l.name === 'Cash');
    if (!hasCash && allLedgers.length > 0) {
      // Auto-create Cash ledger if company has other ledgers but no Cash
      const newCash: Ledger = {
        id: Date.now(),
        companyId: cid,
        name: 'Cash',
        groupName: 'Cash-in-hand',
        openingBalance: 0,
        balanceType: 'Dr'
      };
      setAllLedgers(prev => [...prev, newCash]);
      saveMaster('ledger', newCash);
    }
  }, [activeCompany, allLedgers.length]);
  const currencies     = useMemo(() => activeCompany ? allCurrencies.filter(c => Number(c.companyId) === Number(activeCompany.id)) : [], [allCurrencies, activeCompany]);
  const vouchers       = useMemo(() => activeCompany ? allVouchers.filter(v => Number(v.companyId) === Number(activeCompany.id)) : [], [allVouchers, activeCompany]);
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      const vd = parseDate(v.date);
      const ps = parseDate(currentPeriod.start);
      const pe = parseDate(currentPeriod.end);
      return vd >= ps && vd <= pe;
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
            const updated = { ...targetItem, ...data, id: targetItem.id };
            setAllLedgers(p => p.map(x => x.id === targetItem.id ? { ...x, ...updated } : x));
            return updated;
          }
        } catch (e) {
          const updated = { ...targetItem, ...data, id: targetItem.id };
          setAllLedgers(p => p.map(x => x.id === targetItem.id ? { ...x, ...updated } : x));
          return updated;
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
              const errText = await res.text();
              console.error('Save failed:', errText);
              alert('Failed to save changes to server: ' + errText);
              return null;
            }
          } catch (e: any) {
            console.error('Save error:', e);
            alert('Error connecting to server: ' + e.message);
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
          } else throw new Error(await res.text());
        } catch (e) { console.error("Stock Group update failed", e); }
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
          } else throw new Error(await res.text());
        } catch (e) { console.error("Unit update failed", e); }
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
          if (!res.ok) return false;
        } catch (e) { return false; }
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
          } else throw new Error(await res.text());
        } catch (e) { const newItem = { id, companyId: cid, ...data }; setAllLedgers(p => [...p, newItem]); return newItem; }
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
          } else throw new Error(await res.text());
        } catch (e) { const newItem = { id, companyId: cid, ...data }; setAllStockItems(p => [...p, newItem]); return newItem; }
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
          } else throw new Error(await res.text());
        } catch (e) { const newItem = { id, companyId: cid, ...data }; setAllUnits(p => [...p, newItem]); return newItem; }
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
          } else throw new Error(await res.text());
        } catch (e) { setAllStockGroups(p => [...p, { id, companyId: cid, ...data }]); }
      }
      else if (type === 'company') {
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
          }
        } catch (e) { return false; }
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

    const isEdit = v.id && String(v.id).length < 12; // DB IDs are small, timestamp IDs are large

    try {
      const res = await fetch('/api/vouchers', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...v, companyId })
      });
      if (res.ok) {
        const resData = await res.json();
        const savedV = {
          ...resData.voucher,
          date: new Date(resData.voucher.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
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
            name, address: fv('c-addr'), state: fv('c-state'), country: fv('c-country'), gstin: fv('c-gstin'), mobile: fv('c-mob'), telephone: fv('c-telephone'), email: fv('c-email'), website: fv('c-web'),
            registrationType: fsv('c-reg-type'), bankName: fv('c-bank-name'), bankHolderName: fv('c-bank-holder'), accountNo: fv('c-acc-no'), ifsc: fv('c-ifsc'), swiftCode: fv('c-swift'),
            financialYearStart: fv('c-fy-start'), booksBeginFrom: fv('c-books-start'),
            securityControl: fsv('c-sec-ctrl') === 'Yes', password: fv('c-pwd'),
            showMobile: (document.querySelector('input[type="checkbox"][id*="mob"]') as HTMLInputElement)?.checked ?? true,
            showEmail: (document.querySelector('input[type="checkbox"][id*="email"]') as HTMLInputElement)?.checked ?? true,
            showWebsite: (document.querySelector('input[type="checkbox"][id*="web"]') as HTMLInputElement)?.checked ?? true,
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
        // Report screens that handle Escape internally for step-by-step
        const internalReports = ['LEDGER_REPORT','GSTR1_REPORT','GSTR3B_REPORT','BALANCE_SHEET','PROFIT_LOSS','TRIAL_BALANCE','DAY_BOOK','STOCK_SUMMARY','OUTSTANDING_REPORT','SALES_REGISTER','PURCHASE_REGISTER'];
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
        if (e.key === 'F8') { e.preventDefault(); setActiveVoucher('Sales'); }
        if (e.key === 'F9') { e.preventDefault(); setActiveVoucher('Purchase'); }
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
        if (formScreens.includes(screen)) { doFormSave(); }
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
          if (activeId === 'sg-name' && allStockGroups.some(g => Number(g.companyId) === Number(cid) && g.name.toLowerCase() === activeVal.toLowerCase() && (!alterItem || g.id !== alterItem.id))) { alert(`Stock Group "${activeVal}" already exists!`); e.preventDefault(); return; }
          if (activeId === 'sc-name' && allStockCategories.some(c => Number(c.companyId) === Number(cid) && c.name.toLowerCase() === activeVal.toLowerCase() && (!alterItem || c.id !== alterItem.id))) { alert(`Stock Category "${activeVal}" already exists!`); e.preventDefault(); return; }
          if (activeId === 'item-name' && stockItems.some(it => it.name.toLowerCase() === activeVal.toLowerCase() && (!alterItem || it.id !== alterItem.id))) { alert(`Stock Item "${activeVal}" already exists!`); e.preventDefault(); return; }
          if (activeId === 'unit-sym' && allUnits.some(u => Number(u.companyId) === Number(cid) && u.symbol.toLowerCase() === activeVal.toLowerCase() && (!alterItem || u.id !== alterItem.id))) { alert(`Unit "${activeVal}" already exists!`); e.preventDefault(); return; }
          if (activeId === 'gd-name' && godowns.some(g => g.name.toLowerCase() === activeVal.toLowerCase() && (!alterItem || g.id !== alterItem.id))) { alert(`Godown "${activeVal}" already exists!`); e.preventDefault(); return; }
          if (activeId === 'cur-sym' && currencies.some(c => c.symbol.toLowerCase() === activeVal.toLowerCase() && (!alterItem || c.id !== alterItem.id))) { alert(`Currency "${activeVal}" already exists!`); e.preventDefault(); return; }
          if (activeId === 'vt-name' && voucherTypes.some(v => v.name.toLowerCase() === activeVal.toLowerCase() && (!alterItem || v.id !== alterItem.id))) { alert(`Voucher Type "${activeVal}" already exists!`); e.preventDefault(); return; }
          if (activeId === 'c-name' && companies.some(c => c.name.toLowerCase() === activeVal.toLowerCase() && (!alterItem || c.id !== alterItem.id))) { alert(`Company "${activeVal}" already exists!`); e.preventDefault(); return; }

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
  }, [screen, history, altCCtx, showGST, showFeatures, showCompanySelect, showDate, activeVoucher, showExportModal, showEmailModal, allUnits, activeCompany, alterItem, allLedgers, allStockItems, companies, allGroups, allStockGroups, allStockCategories, allGodowns, allVoucherTypes, allCurrencies, ledgers, stockItems, godowns, voucherTypes, currencies]);

  // Menu keyboard navigation
  useEffect(() => {
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

  const vColor: Record<string,string> = {Sales:'#1c5282',Purchase:'#5a2d82',Receipt:'#1a7a4a',Payment:'#8B0000',Contra:'#4a4a00',Journal:'#00555a','Credit Note':'#7a3d00','Debit Note':'#00407a'};

  if (!isMounted) return <div style={{background:'#1e2d3d', height:'100vh'}} />;

  if (!isAuthenticated) {
    return <AuthUI onLoginSuccess={handleLoginSuccess} />;
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
           </div>
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
                  <div className="tally-menu-box submenu-popup">
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
            {screen==='VOUCHER_ENTRY'        && <VoucherEntryForm key={formKey} activeAlterItem={alterItem} activeVoucher={activeVoucher} ledgers={ledgers} stockItems={stockItems} units={units} vouchers={vouchers} activeCompany={activeCompany} onAltC={handleOpenAltC} onSave={saveVoucher} onDelete={deleteVoucher} onChangeType={setActiveVoucher} currentDate={currentDate} onF2={handleShowDate} onCancel={goBack} onPrintPreview={v=>{setPrintVoucher(v);nav('PRINT_PREVIEW');}} voucherTypes={voucherTypes} altCReturnContext={altCReturnContext} onAltCReturnHandled={()=>setAltCReturnContext(null)} setAltCReturnContext={setAltCReturnContext} onNav={nav} setSaveToast={setSaveToast} />}
            {screen==='DAY_BOOK'             && <DayBookView vouchers={filteredVouchers} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='BALANCE_SHEET'        && <BalanceSheetView ledgers={ledgers} vouchers={filteredVouchers} onBack={goBack} onDrillDownLedger={id=>{setReportLedgerId(id); nav('LEDGER_REPORT');}} onDrillDownGroup={gn=>{setReportGroupName(gn); nav('GROUP_SUMMARY');}} />}
            {screen==='PROFIT_LOSS'          && <ProfitLossView ledgers={ledgers} vouchers={filteredVouchers} onBack={goBack} onDrillDownLedger={id=>{setReportLedgerId(id); nav('LEDGER_REPORT');}} onDrillDownGroup={gn=>{setReportGroupName(gn); nav('GROUP_SUMMARY');}} />}
            {screen==='TRIAL_BALANCE'        && <TrialBalanceView ledgers={ledgers} vouchers={filteredVouchers} onBack={goBack} onDrillDownLedger={id=>{setReportLedgerId(id); nav('LEDGER_REPORT');}} onDrillDownGroup={gn=>{setReportGroupName(gn); nav('GROUP_SUMMARY');}} />}
            {screen==='SALES_REGISTER'       && <UniversalRegisterView voucherType='Sales'       vouchers={filteredVouchers} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='PURCHASE_REGISTER'    && <UniversalRegisterView voucherType='Purchase'    vouchers={filteredVouchers} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='CONTRA_REGISTER'      && <UniversalRegisterView voucherType='Contra'      vouchers={filteredVouchers} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='PAYMENT_REGISTER'     && <UniversalRegisterView voucherType='Payment'     vouchers={filteredVouchers} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='RECEIPT_REGISTER'     && <UniversalRegisterView voucherType='Receipt'     vouchers={filteredVouchers} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='JOURNAL_REGISTER'     && <UniversalRegisterView voucherType='Journal'     vouchers={filteredVouchers} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='DEBIT_NOTE_REGISTER'  && <UniversalRegisterView voucherType='Debit Note'  vouchers={filteredVouchers} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='CREDIT_NOTE_REGISTER' && <UniversalRegisterView voucherType='Credit Note' vouchers={filteredVouchers} currentPeriod={currentPeriod} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='LEDGER_REPORT'        && <LedgerReportView ledgers={ledgers} vouchers={filteredVouchers} preselectedId={reportLedgerId} onBack={goBack} onDrillDown={v=>{ nav('VOUCHER_ENTRY', v); setActiveVoucher(v.type as VoucherTypeKey); }} />}
            {screen==='GROUP_SUMMARY'        && <GroupSummaryView ledgers={ledgers} vouchers={filteredVouchers} groupName={reportGroupName} onBack={goBack} onDrillDownLedger={id=>{setReportLedgerId(id); nav('LEDGER_REPORT');}} onDrillDownGroup={gn=>{setReportGroupName(gn); nav('GROUP_SUMMARY');}} />}
            {screen==='STOCK_SUMMARY'        && <StockSummaryView stockItems={stockItems} vouchers={filteredVouchers} onBack={goBack} onDrillDown={item=>{ /* Maybe later item drilldown */ }} />}
            {screen==='OUTSTANDING_REPORT'   && <OutstandingView ledgers={ledgers} vouchers={filteredVouchers} onBack={goBack} onDrillDown={ledgerId=>{ setReportLedgerId(ledgerId); nav('LEDGER_REPORT'); }} />}
            {screen==='CHART_OF_ACCOUNTS'    && <ChartOfAccountsView ledgers={ledgers} vouchers={filteredVouchers} onBack={goBack} />}
            {screen==='PRINT_PREVIEW'        && <PrintPreview vouchers={allVouchers} company={activeCompany} printVoucher={printVoucher} ledgers={ledgers} onSelectVoucher={setPrintVoucher} />}
            {screen==='GSTR1_REPORT'         && <GSTR1ReportView vouchers={filteredVouchers} activeCompany={activeCompany} ledgers={ledgers} currentPeriod={currentPeriod} allUnits={allUnits} goBack={goBack} onDrillDownVoucher={(v)=>nav('VOUCHER_ENTRY',v)} />}
            {screen==='GSTR3B_REPORT'        && <GSTR3BReportView vouchers={vouchers} goBack={goBack} />}
            {screen==='USER_ROLES'           && <RoleManagementView goBack={goBack} />}
            {screen==='DATA_EXCHANGE'        && <DataExchangeView goBack={goBack} />}
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
          <div className="sidebar-btn" onClick={()=>{nav('VOUCHER_ENTRY');setActiveVoucher('Purchase');}}>F9: Purchase</div>
          <div className="sidebar-btn">F10: Others</div>
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
                  onFocus={e => e.currentTarget.setSelectionRange(0, 2)}
                  onKeyDown={e => {
                    if(e.key === 'Enter') (document.getElementById('period-to') as HTMLElement)?.focus();
                  }}
                />
              </div>
              <div className="form-row">
                <label style={{width:100}}>To</label><span className="colon">:</span>
                <input id="period-to" type="text" className="form-input" 
                  defaultValue={currentPeriod.end} 
                  onFocus={e => e.currentTarget.setSelectionRange(0, 2)}
                  onKeyDown={e => {
                    if(e.key === 'Enter') {
                      const start=(document.getElementById('period-from') as HTMLInputElement).value;
                      const end=(document.getElementById('period-to') as HTMLInputElement).value;
                      setCurrentPeriod({start,end});
                      setShowPeriod(false);
                    }
                  }}
                />
              </div>
              <div style={{marginTop:20,display:'flex',justifyContent:'flex-end', gap:10}}>
                <button className="tally-btn" onClick={()=>{
                  const start=(document.getElementById('period-from') as HTMLInputElement).value;
                  const end=(document.getElementById('period-to') as HTMLInputElement).value;
                  setCurrentPeriod({start,end});
                  setShowPeriod(false);
                }}>Accept</button>
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
                <input autoFocus type="text" className="form-input" style={{width:160}}
                  defaultValue={currentDate}
                  placeholder="DD/MM/YYYY"
                  onKeyDown={e=>{
                    if(e.key==='Enter') {
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
                    if(e.key==='Escape') handleCloseDate();
                  }}
                />
              </div>
              <div style={{fontSize:11, color:'#666', marginTop:5}}>Format: DD/MM/YYYY (e.g. 18/04/2026)</div>
              <button 
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

  useEffect(()=>{ setSelIdx(0); }, [list.length, focusedField]);

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
        {([['Pincode','c-pin',100],['Telephone','c-telephone',200]] as const).map(([label,id,w],i)=>(
          <div key={i} className="form-row"><label style={{width:160}}>{label}</label><span className="colon">:</span><input id={id} type="text" className="form-input" style={{width:w}} defaultValue={activeAlterItem?.[(id as string).replace('c-','')]||''}/></div>
        ))}
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
        <div className="form-row"><label style={{width:220}}>GSTIN</label><span className="colon">:</span><input id="c-gstin" type="text" className="form-input" style={{width:200}} defaultValue={activeAlterItem?.gstin||''} onInput={e => e.currentTarget.value = e.currentTarget.value.toUpperCase()}/></div>
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
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{ ref.current?.focus(); },[]);

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
  useEffect(()=>{
    if(focus==='country'){
      const idx = ALL_COUNTRIES.indexOf(selCo);
      setSelIdx(idx>=0?idx:0);
    } else if(focus==='state'){
      const states = COUNTRY_DATA[selCo]||[];
      const curState = (document.getElementById('l-state') as HTMLInputElement)?.value || '';
      const idx = states.indexOf(curState);
      setSelIdx(idx>=0?idx:0);
    } else {
      setSelIdx(0);
    }
  },[focus]);

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
    if(inp){inp.value=v;if(focus==='country'){setSelCo(v);}}
    setFocus(null);
    setTimeout(() => {
      if (inp) {
        const inputs = Array.from(document.querySelectorAll(
          '.form-workspace input:not([disabled]),.form-workspace select:not([disabled]),.form-workspace textarea:not([disabled])'
        )) as HTMLElement[];
        const idx = inputs.indexOf(inp);
        if (idx >= 0 && idx < inputs.length - 1) (inputs[idx + 1]).focus();
      }
    }, 50);
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

  const ledgerFields = [
    'l-name', 'l-alias', 'l-under', 'l-mail', 'l-addr', 'l-state', 'l-country', 
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
            onInput={e=>{setFilter((e.target as HTMLInputElement).value);setSelIdx(0);}}
            onKeyDown={handleFieldKey('under')}
            onBlur={()=>setTimeout(()=>setFocus(p=>p==='under'?null:p),200)}
            defaultValue={activeAlterItem?.groupName||'Sundry Debtors'} autoComplete="off"/>
          <span style={{marginLeft:8,fontSize:11,color:'#888'}}>Alt+C to create</span>
        </div>
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
              openingBalance: parseFloat(fv('l-ob')) || 0, balanceType: fsv('l-ob-type') || 'Dr' 
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
    setFocus(null);
    setTimeout(()=>{
      const inputs=Array.from(document.querySelectorAll('.form-workspace input:not([disabled]),.form-workspace select:not([disabled]),.form-workspace textarea:not([disabled])')) as HTMLElement[];
      const nameIdx=inputs.indexOf(nameEl);
      if(nameIdx>=0&&nameIdx<inputs.length-1)(inputs[nameIdx+1]).focus();
    },50);
  };

  const stockItemFields = [
    'item-name', 'item-alias', 'item-under', 'item-cat', 'item-units', 'item-altunit',
    'item-hsn', 'item-gst', 'item-show-incl-tax', 'item-show-amt-incl-tax',
    'item-gst-app', 'item-supply-type', 'item-costing', 'item-market',
    'item-oqty', 'item-orate', 'btn-save-item'
  ];

  const moveToNext = (currentId: string) => {
    const idx = stockItemFields.indexOf(currentId);
    if (idx >= 0 && idx < stockItemFields.length - 1) {
      const next = document.getElementById(stockItemFields[idx + 1]);
      if (next) next.focus();
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
        <button id="btn-save-item" style={{background:'#1c5282',color:'white',border:'none',padding:'8px 35px',cursor:'pointer',fontWeight:'bold',fontSize:13}}
          onClick={()=>{
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
            onSave(data);
          }}>
          ✓ Accept (Ctrl+A)
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

// ==================== VOUCHER ENTRY FORM ====================
function VoucherEntryForm({activeAlterItem,activeVoucher,ledgers,stockItems,units,vouchers,activeCompany,onAltC,onSave,onDelete,onChangeType,currentDate,onF2,onPrintPreview,onCancel,voucherTypes,altCReturnContext,onAltCReturnHandled,setAltCReturnContext,onNav,setSaveToast}:{
  activeAlterItem?:any; activeVoucher:VoucherTypeKey; ledgers:Ledger[]; stockItems:StockItem[]; units:UnitData[]; vouchers:Voucher[]; activeCompany:Company | null; currentDate:string; onF2:()=>void; onPrintPreview:(v:Voucher)=>void; onCancel:()=>void;
  onAltC:(ctx:AltCContext)=>void; onSave:(v:any)=>Promise<Voucher>; onDelete:(id:number)=>void; onChangeType:(t:VoucherTypeKey)=>void; voucherTypes:VoucherTypeData[];
  altCReturnContext?: any; onAltCReturnHandled:()=>void; setAltCReturnContext:(ctx:any)=>void; onNav:(s:any,item?:any,type?:string)=>void;
  setSaveToast: (msg: string | null) => void;
}) {
  const isInventory = ['Sales','Purchase','Credit Note','Debit Note'].includes(activeVoucher);
  // Party side: Sales, Payment, and Debit Note (Purchase Return) debit the party.
  // Purchase, Receipt, and Credit Note (Sales Return) credit the party.
  const partySide: 'Dr' | 'Cr' = ['Sales', 'Payment', 'Debit Note'].includes(activeVoucher) ? 'Dr' : 'Cr';
  const otherSide: 'Dr' | 'Cr' = partySide === 'Dr' ? 'Cr' : 'Dr';
  const isPurchaseSide = activeVoucher === 'Purchase' || activeVoucher === 'Debit Note'; // Used for some legacy checks

  const [partyName, setPartyName] = useState(activeAlterItem?.partyName || '');
  const [partyBalance, setPartyBalance] = useState<number|null>(null);
  const [refNo, setRefNo] = useState('');
  const [rows, setRows] = useState<VoucherRow[]>([{itemId:0,itemName:'',qty:0,rate:0,rateInclTax:0,amountInclTax:0,unit:'Nos',amount:0,discountPerc:0,discountAmt:0,taxableAmount:0,gstRate:18,hsnCode:''}]);
  const [additionalLedgers, setAdditionalLedgers] = useState<AccountEntry[]>([]);
  const [accEntries, setAccEntries] = useState<AccountEntry[]>([{ledgerId:0,ledgerName:'',amount:0,entryType:'Dr'},{ledgerId:0,ledgerName:'',amount:0,entryType:'Cr'}]);
  const [narration, setNarration] = useState(activeAlterItem?.narration || '');
  const [focus, setFocus] = useState<{field:string;rowIdx?:number}|null>(null);
  const [filter, setFilter] = useState('');
  const [listSel, setListSel] = useState(0);

  // Reset list selection when filter changes (typing)
  useEffect(() => {
    if (filter) setListSel(0);
  }, [filter]);
  const ref = useRef<HTMLInputElement>(null);

  // Party Details & Dispatch Details modals
  const [showPartyDetails, setShowPartyDetails] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmSel, setDeleteConfirmSel] = useState<'yes'|'no'>('yes');
  const [partyDetails, setPartyDetails] = useState<PartyDetails|null>(null);
  const [dispatchDetails, setDispatchDetails] = useState<DispatchDetails|null>(null);
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
          setListSel(idx);
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
      if (idx >= 0) setListSel(idx);
      else setListSel(0);
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
       const pName = activeAlterItem.partyName;
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
       
       // Filter additional ledgers: everything that is not Party, Sales/Purchase A/c or GST
       // Note: 'Round Off' is intentionally included so it appears in Day Book/Register drill-down
       const addl = activeAlterItem.entries?.filter((e:any) => 
         e.ledgerName !== pName && 
         e.ledgerName !== 'Sales A/c' && 
         e.ledgerName !== 'Purchase A/c' &&
         !['CGST Payable', 'SGST Payable', 'IGST Payable'].includes(e.ledgerName)
       ) || [];
       setAdditionalLedgers(addl.map((a:any, i:number) => ({ ...a, id: i })));
       
       setNarration(activeAlterItem.narration || '');
       setPartyDetails(activeAlterItem.partyDetails||null);
       setDispatchDetails(activeAlterItem.dispatchDetails||null);
       const l = ledgers.find(lx=>lx.id===activeAlterItem.partyId);
       if(l) setPartyBalance(getLedgerClosingBalance(l,vouchers));
     } else {
       setPartyName('');
       setRefNo('');
       setRows([{itemId:0,itemName:'',qty:0,rate:0,rateInclTax:0,amountInclTax:0,unit:'Nos',amount:0,discountPerc:0,discountAmt:0,taxableAmount:0,gstRate:18,hsnCode:''}]);
       setAccEntries([{ledgerId:0,ledgerName:'',amount:0,entryType:'Dr'},{ledgerId:0,ledgerName:'',amount:0,entryType:'Cr'}]);
       setAdditionalLedgers([]);
       setNarration('');
       setPartyBalance(null);
       setPartyDetails(null);
       setDispatchDetails(null);
     }
     // Reset localNumberingMode when switching voucher type
     setLocalNumberingMode(numberingMethod === 'Manual' ? 'Manual' : 'Auto');
     if (!activeAlterItem) {
        const nextAuto = vouchers.filter(v => v.type === activeVoucher).length + 1;
        setManualVoucherNo(String(nextAuto));
     }
  },[activeVoucher, activeAlterItem, numberingMethod]);

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
  const itemSubtotal = rows.reduce((s: number, r: any) => s + r.amount, 0);

  // ===== TALLY PRIME GST LOGIC: CGST+SGST (same state) vs IGST (different state) =====
  const companyState = (activeCompany?.state || '').toLowerCase().trim();
  const partyLedger = ledgers.find(l => l.name === partyName);
  const partyState = (partyLedger?.state || '').toLowerCase().trim();
  const isInterState = partyState !== '' && companyState !== '' && partyState !== companyState;

  // Item-wise GST breakdown (grouped by gstRate)
  const gstBreakdown = useMemo(() => {
    const map = new Map<number, { taxableAmt: number; gstRate: number }>();
    rows.filter(r => r.itemName && r.amount > 0).forEach(r => {
      const existing = map.get(r.gstRate) || { taxableAmt: 0, gstRate: r.gstRate };
      existing.taxableAmt += r.amount;
      map.set(r.gstRate, existing);
    });
    return Array.from(map.values()).map(g => ({
      ...g,
      cgst: isInterState ? 0 : round2(g.taxableAmt * g.gstRate / 200),
      sgst: isInterState ? 0 : round2(g.taxableAmt * g.gstRate / 200),
      igst: isInterState ? round2(g.taxableAmt * g.gstRate / 100) : 0,
    }));
  }, [rows, isInterState]);

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
  const vNum = activeAlterItem ? activeAlterItem.number : (isManualMode ? (parseInt(manualVoucherNo) || 1) : (vouchers.filter(v=>v.type===activeVoucher).length + (vt?.startNumber||1)));
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

  const pickLedger=(l:Ledger)=>{
    if(focus?.field==='party'){
      setPartyName(l.name);
      const bal=getLedgerClosingBalance(l,vouchers);
      setPartyBalance(bal);
    } else if(focus?.field==='accledger'&&focus.rowIdx!==undefined){
      const idx = focus.rowIdx;
      const ne=[...accEntries];ne[idx]={...ne[idx],ledgerId:l.id,ledgerName:l.name};
      setAccEntries(ne);
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
    if(focus?.field==='item'&&focus.rowIdx!==undefined){
      const idx = focus.rowIdx;
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

  const vColors:Record<string,string>={Sales:'#1c5282',Purchase:'#5a2d82',Receipt:'#1a7a4a',Payment:'#8B0000',Contra:'#4a4a00',Journal:'#00555a','Credit Note':'#7a3d00','Debit Note':'#00407a'};
  const vc=vColors[activeVoucher]||'#1c5282';

  // For item list: End of Item is default (listSel=99999 means End of Item)
  const isEndOfItem = (focus?.field==='item' || focus?.field==='addl-ledger') && listSel >= currentList.length;

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
      if(focus?.field==='item' || focus?.field==='addl-ledger'){
        // End of List → wrap to first real item
        if(isEndOfItem) setListSel(0);
        // Last real item → End of List
        else if(listSel >= currentList.length - 1) setListSel(currentList.length);
        else setListSel(p=>p+1);
      } else setListSel(p=>(p+1)%Math.max(1,currentList.length));
    }
    else if(e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();
      if(focus?.field==='item' || focus?.field==='addl-ledger'){
        // First real item → End of List
        if(listSel === 0) setListSel(currentList.length);
        // End of List → last real item
        else if(isEndOfItem) setListSel(Math.max(0, currentList.length - 1));
        else setListSel(p=>p-1);
      } else setListSel(p=>(p-1+Math.max(1,currentList.length))%Math.max(1,currentList.length));
    }
    else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();
      if(focus?.field==='item'){
        if(isEndOfItem) goToAdditionalLedgers();
        else if(currentList.length>0) pickItem(currentList[listSel] as StockItem);
      } else if(focus?.field==='addl-ledger'){
        if(isEndOfItem || currentList.length === 0) goToNarration();
        else if(currentList.length>0) {
          const ridx = focus.rowIdx;
          pickLedger(currentList[listSel] as Ledger);
          setTimeout(() => {
            const el = document.getElementById(`addl-amt-${ridx}`);
            if (el) el.focus();
          }, 150);
        }
      } else if(currentList.length>0) pickLedger(currentList[listSel] as Ledger);
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

    return {
      ...(activeAlterItem ? {id: activeAlterItem.id} : {}),
      companyId: activeCompany?.id || 0,
      type:activeVoucher, date:currentDate, number:vNum, voucherNo:formattedNo, refNo:refNo||`${activeVoucher.slice(0,3).toUpperCase()}/${vNum}`,
      partyName, partyId: findL(partyName),
      inventoryEntries: isInventory ? rows.filter(r=>r.itemName).map((r,i)=>({id:i+1,...r})) : [],
      entries: isInventory ? [
        {id:1,ledgerId:findL(partyName),ledgerName:partyName,amount:grandTotal,entryType: partySide},
        ...rows.filter(r=>r.itemName).map((r,i)=>({id:i+2,ledgerId:findL(salesPurchaseLedger),ledgerName:salesPurchaseLedger,amount:r.amount,entryType: otherSide} as VoucherEntry)),
        ...taxEntries,
        ...additionalLedgers.filter(al=>al.ledgerName && al.amount > 0).map((al, i) => ({id: entryId++, ...al} as VoucherEntry)),
        ...(Math.abs(roundOff) > 0.001 && !hasManualRoundOff ? [{id: entryId++, ledgerId: findL('Round Off'), ledgerName: 'Round Off', amount: Math.abs(roundOff), entryType: roundOff > 0 ? otherSide : partySide} as VoucherEntry] : []),
      ] : accEntries.filter(e=>e.ledgerName).map((e,i)=>({id:i+1,...e})),
      narration, total: isInventory ? grandTotal : accDr,
      partyDetails: partyDetails||undefined,
      dispatchDetails: dispatchDetails||undefined,
    };
  };

  const handleSave= async ()=>{
    if(!partyName){alert('Party name is required');return;}
    // Validate manual voucher number
    if (isManualMode && !manualVoucherNo.trim()) {
      alert('Please enter a Voucher Number in Manual mode.');
      return;
    }
    const voucherData = getVoucherData();
    
    // Sanitize and Validate stock items
    if (isInventory && (voucherData.inventoryEntries.length === 0 || voucherData.inventoryEntries.some((i:any) => !i.stockItemId || isNaN(i.stockItemId)))) {
       alert("Please select at least one valid stock item.");
       return;
    }

    // Duplicate Check
    const isDup = vouchers.some(v => v.type === activeVoucher && v.voucherNo === formattedNo && (!activeAlterItem || v.id !== activeAlterItem.id));
    if (isDup) {
      alert(`Duplicate Error: ${activeVoucher} No. ${formattedNo} already exists!\nPlease enter a different Voucher Number.`);
      return;
    }

    try {
      setSaveToast("Saving...");
      const savedV = await onSave(voucherData);
      setSaveToast(null);
      setPrintPromptSel('yes');
      setShowPrintPrompt({
        voucher: savedV,
        msg: `${activeVoucher} No. ${formattedNo} Saved!\n${isInterState ? 'IGST (Inter-State)' : 'CGST+SGST (Intra-State)'} applied.`
      });
      // Important: The form reset happens after print prompt selection or close
    } catch (err: any) {
      console.error("Save Error:", err);
      setSaveToast(null);
      alert("Failed to save voucher: " + (err.message || "Network Error"));
    }
  };

  const clearVoucherForm = () => {
    if(activeAlterItem) { onCancel(); return; }
    setPartyName('');
    setRows([{itemId:0,itemName:'',qty:0,rate:0,rateInclTax:0,amountInclTax:0,unit:'Nos',amount:0,discountPerc:0,discountAmt:0,taxableAmount:0,gstRate:18,hsnCode:''}]);
    setAccEntries([{ledgerId:0,ledgerName:'',amount:0,entryType:'Dr'},{ledgerId:0,ledgerName:'',amount:0,entryType:'Cr'}]);
    setAdditionalLedgers([]);
    setNarration('');
    setPartyBalance(null);
    setPartyDetails(null);
    setDispatchDetails(null);
    setRefNo('');
    setShowPrintPrompt(null);
    setTimeout(() => ref.current?.focus(), 80);
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
        {(['Contra','Payment','Receipt','Journal','Sales','Purchase','Credit Note','Debit Note'] as VoucherTypeKey[]).map((v,i)=>(
          <div key={i} style={{padding:'5px 10px',cursor:'pointer',fontWeight:'bold',background:activeVoucher===v?vc:'transparent',color:activeVoucher===v?'white':'#aaa',borderRight:'1px solid #333'}}
            onClick={()=>onChangeType(v)}>F{i+4}: {v}</div>
        ))}
        <div style={{marginLeft:'auto',padding:'5px 12px',color:'#888',fontSize:10}}>Alt+C: Inline Create | Ctrl+A: Save | Esc: Back</div>
      </div>

      {/* Header */}
      <div style={{background:'#fafafa',padding:'10px 15px',borderBottom:`2px solid ${vc}`}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <span style={{background:vc,color:'white',padding:'3px 14px',fontWeight:'bold',fontSize:14}}>{activeVoucher}</span>
            <span style={{color:'#444',display:'flex',alignItems:'center',gap:6}}>
              No.
              {/* Numbering Mode Toggle */}
              {!activeAlterItem && (
                <select
                  value={localNumberingMode}
                  onChange={e => {
                    const mode = e.target.value as 'Auto'|'Manual';
                    setLocalNumberingMode(mode);
                    if (mode === 'Manual') {
                      // Pre-fill with next auto number as suggestion
                      const nextAuto = vouchers.filter(v=>v.type===activeVoucher).length + (vt?.startNumber||1);
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
          <div style={{color:'#444'}}>{currentDate} <span onClick={onF2} style={{cursor:'pointer',marginLeft:10,fontSize:11,background:'#fffbe6',padding:'2px 8px',border:'1px solid #f0d060'}}>F2: Change Date</span></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <div className="form-row" style={{marginBottom:0,alignItems:'center'}}>
            <label style={{width:130}}>Party A/c Name</label><span className="colon">:</span>
            <input ref={ref} type="text" className="form-input" style={{width:350,fontWeight:'bold'}}
              value={partyName} onChange={e=>{setPartyName(e.target.value);setFilter(e.target.value);}}
              onFocus={()=>{setFocus({field:'party'});setFilter('');setListSel(0);}}
              onKeyDown={e=>{
                if((e.ctrlKey && e.key === 'Enter') || (e.ctrlKey && e.key.toLowerCase() === 'c')){
                  e.preventDefault(); e.stopPropagation();
                  const l = ledgers.find(lx => lx.name === partyName);
                  if (l) {
                    onAltC({
                      fieldType: 'ledger',
                      activeAlterItem: l,
                      onCreated: (newItem) => {
                        setPartyName(newItem.name);
                        const bal = getLedgerClosingBalance(newItem, vouchers);
                        setPartyBalance(bal);
                        setTimeout(() => document.getElementById('v-ref')?.focus(), 100);
                      }
                    });
                  }
                  return;
                }
                if(e.altKey&&e.key.toLowerCase()==='c'){
                  e.preventDefault(); e.stopPropagation();
                  onAltC({
                    fieldType: 'ledger',
                    onCreated: (newItem) => {
                      setPartyName(newItem.name);
                      const bal = getLedgerClosingBalance(newItem, vouchers);
                      setPartyBalance(bal);
                      setTimeout(() => document.getElementById('v-ref')?.focus(), 100);
                    }
                  });
                  return;
                }
                if(e.key==='Enter'){
                  e.preventDefault(); e.stopPropagation();
                  if(focus?.field==='party') {
                    listKeyDown(e);
                  } else {
                    if(isInventory && partyName){
                      const l = ledgers.find(lx=>lx.name===partyName);
                      if (l) {
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
                        setTimeout(()=>document.getElementById('v-ref')?.focus(), 50);
                      }
                    } else {
                      setTimeout(()=>document.getElementById('v-ref')?.focus(), 50);
                    }
                  }
                } else {
                  listKeyDown(e);
                }
              }}
              onBlur={()=>setTimeout(()=>setFocus(null),200)}
              placeholder="Select party ledger (Alt+C to create new)"
            />
            {partyBalance!==null && <span style={{marginLeft:10,fontSize:12,color:partyBalance>=0?'#006600':'#c00',fontWeight:'bold'}}>{fmt(partyBalance)} {partyBalance>=0?'Dr':'Cr'}</span>}
          </div>
          <div className="form-row" style={{marginBottom:0}}>
            <label style={{width:80}}>Ref No.</label><span className="colon">:</span>
            <input id="v-ref" type="text" className="form-input" style={{width:160}} value={refNo} onChange={e=>setRefNo(e.target.value)} placeholder="Auto"
              onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault(); e.stopPropagation();
                const target = isInventory ? 'item-name-0' : 'acc-ledger-0';
                setTimeout(()=>document.getElementById(target)?.focus(), 50);
              }}}/>
          </div>
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
            {activeCompany?.showDiscount && <div style={{width:65,textAlign:'right'}}>Disc %</div>}
            <div style={{width:110,textAlign:'right'}}>Amount</div>
            {rows.some(r => stockItems.find(it => it.id === r.itemId)?.showAmtInclTax) && (
              <div style={{width:110,textAlign:'right'}}>Amount (Incl. Tax)</div>
            )}
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {rows.map((row,idx)=>{
              const item = stockItems.find(it => it.id === row.itemId);
              const showIncl = item?.showInclTax || false;
              const anyShowIncl = rows.some(r => stockItems.find(it => it.id === r.itemId)?.showInclTax);
              const showAmtIncl = item?.showAmtInclTax || false;
              const anyShowAmtIncl = rows.some(r => stockItems.find(it => it.id === r.itemId)?.showAmtInclTax);

              const calculateVoucherRow = (row: VoucherRow, field: string, value: number): Partial<VoucherRow> => {
                const gst = row.gstRate || 18;
                const factor = 1 + gst / 100;
                const updates: Partial<VoucherRow> = {};
                let q = field === 'qty' ? value : (row.qty || 0);
                let r = field === 'rate' ? value : (row.rate || 0);
                let dP = field === 'discountPerc' ? value : (row.discountPerc || 0);
                
                if (field === 'rateInclTax') r = value / factor;
                if (field === 'amount') {
                   const taxable = value;
                   // If amount is edited, we calculate rate back
                   if (q > 0) r = (taxable / (1 - dP/100)) / q;
                }

                const gross = round2(q * r);
                const discAmt = round2(gross * (dP / 100));
                const taxable = round2(gross - discAmt);
                const amtInclTax = round2(taxable * factor);
                const rateInclTax = round2(r * factor);

                updates.qty = round2(q);
                updates.rate = round2(r);
                updates.discountPerc = round2(dP);
                updates.discountAmt = round2(discAmt);
                updates.taxableAmount = round2(taxable);
                updates.amount = round2(taxable);
                updates.amountInclTax = round2(amtInclTax);
                updates.rateInclTax = round2(rateInclTax);

                return updates;
              };

              const updateRow = (idx: number, updates: Partial<VoucherRow>) => {
                const nr = [...rows];
                nr[idx] = { ...nr[idx], ...updates };
                setRows(nr);
              };

              return (
              <div key={idx} style={{display:'flex',padding:'4px 10px',alignItems:'center',borderBottom:'1px solid #f5f5f5',background:idx%2===0?'#fff':'#fafafa'}}>
                <div style={{flex:4}}>
                  <input id={`item-name-${idx}`} type="text" className="form-input" style={{width:'97%',border:focus?.field==='item'&&focus.rowIdx===idx?'1px solid #ffc436':'1px solid transparent'}}
                    value={row.itemName}
                    onFocus={()=>{setFocus({field:'item',rowIdx:idx});setFilter('');setListSel(99999);}}
                    onChange={e=>{const nr=[...rows];nr[idx].itemName=e.target.value;setRows(nr);setFilter(e.target.value);}}
                    onKeyDown={e=>{
                      if ((e.ctrlKey && e.key === 'Enter') || (e.ctrlKey && e.key.toLowerCase() === 'c')) {
                        e.preventDefault(); e.stopPropagation();
                        const it = stockItems.find(x => x.name === row.itemName);
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
                              setTimeout(() => document.getElementById(`item-qty-${idx}`)?.focus(), 100);
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
                            setTimeout(() => document.getElementById(`item-qty-${idx}`)?.focus(), 100);
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
                          else setTimeout(()=>document.getElementById(`item-qty-${idx}`)?.focus(), 50);
                        }
                      } else {
                        listKeyDown(e);
                      }
                    }}
                    onBlur={()=>setTimeout(()=>setFocus(f=>f?.field==='item'&&f.rowIdx===idx?null:f),200)}
                    placeholder="Select item (Alt+C to create)"
                  />
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
                        onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault(); e.stopPropagation(); setTimeout(()=>document.getElementById(`item-rate-${idx}`)?.focus(), 80);}}}
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
                     const nextId = activeCompany?.showDiscount ? `item-disc-${idx}` : `item-amt-${idx}`;
                     setTimeout(()=>document.getElementById(nextId)?.focus(), 80);
                   }}} /> : null}</div>
                <div style={{width:55,textAlign:'center',fontSize:11,color:'#666'}}>{row.itemName ? (typeof row.unit === 'string' ? row.unit : (row.unit as any)?.name || (row.unit as any)?.symbol || 'Nos') : ''}</div>
                {activeCompany?.showDiscount && (
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
            {gstBreakdown.map((g, gi) => (
              <div key={gi} style={{marginBottom:4}}>
                {isInterState ? (
                  <div style={{display:'flex',justifyContent:'flex-end',gap:20,marginBottom:2}}>
                    <span style={{fontSize:12,color:'#555'}}>IGST @ {g.gstRate}% on ₹{fmt(g.taxableAmt)}:</span>
                    <span style={{width:130,textAlign:'right',fontSize:12}}>₹ {fmt(g.igst)}</span>
                  </div>
                ) : (
                  <>
                    <div style={{display:'flex',justifyContent:'flex-end',gap:20,marginBottom:2}}>
                      <span style={{fontSize:12,color:'#555'}}>CGST @ {g.gstRate/2}% on ₹{fmt(g.taxableAmt)}:</span>
                      <span style={{width:130,textAlign:'right',fontSize:12}}>₹ {fmt(g.cgst)}</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'flex-end',gap:20,marginBottom:2}}>
                      <span style={{fontSize:12,color:'#555'}}>SGST @ {g.gstRate/2}% on ₹{fmt(g.taxableAmt)}:</span>
                      <span style={{width:130,textAlign:'right',fontSize:12}}>₹ {fmt(g.sgst)}</span>
                    </div>
                  </>
                )}
              </div>
            ))}
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
        <div style={{flex:1,padding:'10px 15px',overflowY:'auto'}}>
          <div style={{fontSize:12,fontWeight:'bold',color:vc,marginBottom:8,borderBottom:`1px solid ${vc}`,paddingBottom:4}}>
            Accounting Entries ({activeVoucher})
          </div>
          <div style={{display:'flex',fontWeight:'bold',fontSize:11,color:'#666',marginBottom:5,padding:'0 5px'}}>
            <div style={{flex:4}}>Particulars (Ledger Name)</div>
            <div style={{width:140,textAlign:'right'}}>Debit (Dr)</div>
            <div style={{width:140,textAlign:'right'}}>Credit (Cr)</div>
          </div>
          {accEntries.map((entry,idx)=>(
            <div key={idx} style={{display:'flex',marginBottom:5,alignItems:'center',padding:'3px 5px',background:idx%2===0?'#fff':'#fafafa',borderBottom:'1px solid #f0f0f0'}}>
              <div style={{flex:4}}>
                <input id={`acc-ledger-${idx}`} type="text" className="form-input" style={{width:'96%'}}
                  value={entry.ledgerName}
                  placeholder={idx===0?`${activeVoucher==='Payment'||activeVoucher==='Contra'?'Account Dr (who pays)':'Account Dr'}...`:`Account Cr...`}
                  onFocus={()=>{setFocus({field:'accledger',rowIdx:idx});setFilter('');setListSel(0);}}
                  onChange={e=>{const ne=[...accEntries];ne[idx].ledgerName=e.target.value;setAccEntries(ne);setFilter(e.target.value);}}
                  onKeyDown={e=>{
                    if ((e.ctrlKey && e.key === 'Enter') || (e.ctrlKey && e.key.toLowerCase() === 'c')) {
                      e.preventDefault(); e.stopPropagation();
                      const l = ledgers.find(lx => lx.name === entry.ledgerName);
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
                    if(e.altKey&&e.key.toLowerCase()==='c'){
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
                    } else if (e.key === 'Enter') {
                      e.preventDefault(); e.stopPropagation();
                      if(focus?.field==='accledger') {
                        listKeyDown(e);
                      } else {
                        setTimeout(() => document.getElementById(`acc-amt-${idx}-${entry.entryType}`)?.focus(), 50);
                      }
                    } else {
                      listKeyDown(e);
                    }
                  }}
                  onBlur={()=>setTimeout(()=>setFocus(f=>f?.field==='accledger'&&f.rowIdx===idx?null:f),200)}
                />
              </div>
              <div style={{width:140}}>
                {entry.entryType==='Dr'?
                  <input id={`acc-amt-${idx}-Dr`} type="number" className="form-input" style={{width:'90%',textAlign:'right',fontWeight:'bold'}} value={entry.amount||''}
                    onChange={e=>{const ne=[...accEntries];ne[idx].amount=parseFloat(e.target.value)||0;setAccEntries(ne);}}
                    onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();
                      if(idx === accEntries.length-1){ setAccEntries(p=>[...p,{ledgerId:0,ledgerName:'',amount:0,entryType:'Cr'}]); setTimeout(()=>document.getElementById(`acc-ledger-${idx+1}`)?.focus(),50); }
                      else document.getElementById(`acc-ledger-${idx+1}`)?.focus();
                    }}} /> : <div style={{width:'90%',textAlign:'right',color:'#aaa',fontSize:12,padding:'2px 5px'}}>—</div>}
              </div>
              <div style={{width:140}}>
                {entry.entryType==='Cr'?
                  <input id={`acc-amt-${idx}-Cr`} type="number" className="form-input" style={{width:'90%',textAlign:'right',fontWeight:'bold'}} value={entry.amount||''}
                    onChange={e=>{const ne=[...accEntries];ne[idx].amount=parseFloat(e.target.value)||0;setAccEntries(ne);}}
                    onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();
                      if(idx === accEntries.length-1){ setAccEntries(p=>[...p,{ledgerId:0,ledgerName:'',amount:0,entryType:'Cr'}]); setTimeout(()=>document.getElementById(`acc-ledger-${idx+1}`)?.focus(),50); }
                      else document.getElementById(`acc-ledger-${idx+1}`)?.focus();
                    }}} /> : <div style={{width:'90%',textAlign:'right',color:'#aaa',fontSize:12,padding:'2px 5px'}}>—</div>}
              </div>
              <select value={entry.entryType} className="form-input" style={{width:45,marginLeft:5,fontSize:11}}
                onChange={e=>{const ne=[...accEntries];ne[idx].entryType=e.target.value as any;setAccEntries(ne);}}>
                <option>Dr</option><option>Cr</option>
              </select>
            </div>
          ))}
          <div style={{padding:'5px 5px',color:'#888',fontSize:11,cursor:'pointer',borderTop:'1px dashed #ddd'}}
            onClick={()=>setAccEntries(p=>[...p,{ledgerId:0,ledgerName:'',amount:0,entryType:'Cr'}])}>
            + Add ledger entry
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:20,marginTop:10,padding:'8px 10px',background:balanced?'#e8f8e8':'#fff0f0',border:`1px solid ${balanced?'#4CAF50':'#f44336'}`,borderRadius:2}}>
            <span>Total Dr: <b style={{color:'#8B0000'}}>₹ {fmt(accDr)}</b></span>
            <span>Total Cr: <b style={{color:'#006600'}}>₹ {fmt(accCr)}</b></span>
            {balanced?<span style={{color:'#006600',fontWeight:'bold'}}>✓ Balanced</span>:<span style={{color:'#c00',fontWeight:'bold'}}>✗ Difference: ₹ {fmt(Math.abs(accDr-accCr))}</span>}
          </div>
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
            {/* End of List — ALWAYS FIRST, highlighted by default */}
            {(focus.field==='item' || focus.field==='addl-ledger') && (
              <div
                onMouseDown={e=>{e.preventDefault(); focus.field==='item' ? goToAdditionalLedgers() : goToNarration();}}
                style={{
                  padding:'5px 18px',cursor:'pointer',
                  background:isEndOfItem?'#ffc436':'transparent',
                  fontWeight:isEndOfItem?'bold':'normal',
                  fontSize:13, color:'#8B0000',
                  borderBottom:'1px solid #ddd',
                }}
              >
                End of List
              </div>
            )}
            {(currentList as any[]).map((it,i)=>(
              <div key={i} onMouseDown={e=>{e.preventDefault();if(focus.field==='item')pickItem(it as StockItem);else pickLedger(it as Ledger);}}
                style={{padding:'5px 18px',cursor:'pointer',background:(!isEndOfItem&&i===listSel)?'#ffc436':'transparent',fontWeight:(!isEndOfItem&&i===listSel)?'bold':'normal',fontSize:13}}>
                {it && 'name' in (it as any) ? (it as any).name : 'Unknown Item'}
                {focus.field==='item' && (
                  <span style={{float:'right',fontSize:11,opacity:0.6}}>{typeof (it as any).unit === 'string' ? (it as any).unit : (it as any).unit?.symbol || (it as any).unit?.name || 'Nos'}</span>
                )}
                {focus.field!=='item' && 'openingBalance' in (it as any) && (
                  <span style={{float:'right',fontSize:11,opacity:0.6}}>{fmt(getLedgerClosingBalance(it as Ledger,[]))} {(it as Ledger).balanceType}</span>
                )}
              </div>
            ))}
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
    </div>
  );
}

// ==================== REPORTS ====================

function BalanceSheetView({ledgers,vouchers,onBack,onDrillDownLedger,onDrillDownGroup}:{ledgers:Ledger[];vouchers:Voucher[];onBack:()=>void;onDrillDownLedger:(id:number)=>void;onDrillDownGroup:(name:string)=>void;}) {
  const [rowIdx, setRowIdx] = useState(0);
  const [col, setCol] = useState<'left'|'right'>('left');
  const grp = useMemo(()=>groupLedgersByParent(ledgers,vouchers),[ledgers,vouchers]);
  const assetGroups=['Cash-in-hand','Bank Accounts','Bank OD A/c','Sundry Debtors','Loans & Advances (Asset)','Stock-in-hand','Deposits (Asset)','Investments','Fixed Assets','Current Assets','Misc. Expenses (ASSET)'];
  const liabGroups=['Capital Account','Reserves & Surplus','Retained Earnings','Secured Loans','Unsecured Loans','Loans (Liability)','Sundry Creditors','Current Liabilities','Provisions','Duties & Taxes','Branch / Divisions'];

  // Flatten for keyboard nav
  const allItems = useMemo(()=>{
    const left: any[] = [];
    liabGroups.forEach(gn=>{
      const items=grp[gn];
      if(!items||!items.some(x=>x.balance!==0)) return;
      left.push({type:'group', name:gn, balance: items.reduce((s,x)=>s+x.balance,0)});
      items.filter(x=>x.balance!==0).forEach(x=>left.push({type:'ledger', name:x.ledger.name, id:x.ledger.id, balance:x.balance}));
    });
    const right: any[] = [];
    assetGroups.forEach(gn=>{
      const items=grp[gn];
      if(!items||!items.some(x=>x.balance!==0)) return;
      right.push({type:'group', name:gn, balance: items.reduce((s,x)=>s+x.balance,0)});
      items.filter(x=>x.balance!==0).forEach(x=>right.push({type:'ledger', name:x.ledger.name, id:x.ledger.id, balance:x.balance}));
    });
    return {left, right, max: Math.max(left.length, right.length)};
  }, [grp]);

  useEffect(()=>{
    const onKey = (e:KeyboardEvent)=>{
      if(e.key==='Escape'){ if(document.querySelector('.modal-overlay')) return; e.preventDefault(); onBack(); }
      else if(e.key==='ArrowDown') { e.preventDefault(); setRowIdx(p=>Math.min(p+1, col==='left'?allItems.left.length-1:allItems.right.length-1)); }
      else if(e.key==='ArrowUp') { e.preventDefault(); setRowIdx(p=>Math.max(p-1, 0)); }
      else if(e.key==='ArrowLeft') { if(col==='right'){setCol('left');setRowIdx(0);} }
      else if(e.key==='ArrowRight') { if(col==='left'){setCol('right');setRowIdx(0);} }
      else if(e.key==='Enter') {
        e.preventDefault();
        const target = col==='left' ? allItems.left[rowIdx] : allItems.right[rowIdx];
        if(!target) return;
        if(target.type==='group') onDrillDownGroup(target.name);
        else onDrillDownLedger(target.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, [onBack, allItems, rowIdx, col, onDrillDownGroup, onDrillDownLedger]);

  const totalAssets=allItems.right.reduce((s,x)=>s+x.balance,0);
  const totalLiab=allItems.left.reduce((s,x)=>s+x.balance,0);

  return (
    <div className="report-view" style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{background:'#1c5282',color:'white',padding:'10px 20px',display:'flex',justifyContent:'space-between'}}>
        <div style={{fontSize:16,fontWeight:'bold'}}>Balance Sheet</div>
        <div style={{fontSize:12}}>As on 14-Apr-2026</div>
      </div>
      <div style={{flex:1,overflowY:'auto', background:'#fff'}}>
        <table className="report-table" style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
          <thead>
            <tr style={{background:'#1c5282', color:'white'}}>
              <th style={{padding:'8px 15px', textAlign:'left', borderRight:'2px solid #fff'}}>LIABILITIES</th>
              <th style={{padding:'8px 15px', textAlign:'right', width:140, borderRight:'2px solid #fff'}}>Amount</th>
              <th style={{padding:'8px 15px', textAlign:'left', borderRight:'2px solid #fff'}}>ASSETS</th>
              <th style={{padding:'8px 15px', textAlign:'right', width:140}}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({length: allItems.max}).map((_, i) => {
              const l = allItems.left[i];
              const r = allItems.right[i];
              const isSelL = col==='left' && i===rowIdx;
              const isSelR = col==='right' && i===rowIdx;

              return (
                <tr key={i} style={{fontSize:12, borderBottom:'1px solid #eee'}}>
                  {/* Liability side */}
                  <td style={{
                    padding:l?.type==='group'?'6px 10px':'3px 25px', 
                    fontWeight:l?.type==='group'?'bold':'normal',
                    background:isSelL?'#ffd700':(l?.type==='group'?'#f8f8f8':'transparent'),
                    color:isSelL?'#000':'inherit',
                    cursor:'pointer',
                    borderRight:'1px solid #ddd'
                  }} onClick={()=>{setCol('left');setRowIdx(i); if(l?.type==='group')onDrillDownGroup(l.name); else if(l?.id)onDrillDownLedger(l.id);}}>
                    {l?.name || ''}
                  </td>
                  <td style={{
                    textAlign:'right', padding:'6px 10px', fontWeight:'bold', borderRight:'2px solid #1c5282',
                    background:isSelL?'#ffd700':(l?.type==='group'?'#f8f8f8':'transparent'),
                    color:isSelL?'#000':(l? '#000' : 'transparent')
                  }}>
                    {l ? fmt(Math.abs(l.balance)) : ''}
                  </td>
                  
                  {/* Asset side */}
                  <td style={{
                    padding:r?.type==='group'?'6px 10px':'3px 25px', 
                    fontWeight:r?.type==='group'?'bold':'normal',
                    background:isSelR?'#ffd700':(r?.type==='group'?'#f8f8f8':'transparent'),
                    color:isSelR?'#000':'inherit',
                    cursor:'pointer',
                    borderRight:'1px solid #ddd'
                  }} onClick={()=>{setCol('right');setRowIdx(i); if(r?.type==='group')onDrillDownGroup(r.name); else if(r?.id)onDrillDownLedger(r.id);}}>
                    {r?.name || ''}
                  </td>
                  <td style={{
                    textAlign:'right', padding:'6px 10px', fontWeight:'bold',
                    background:isSelR?'#ffd700':(r?.type==='group'?'#f8f8f8':'transparent'),
                    color:isSelR?'#000':(r? '#000' : 'transparent')
                  }}>
                    {r ? fmt(Math.abs(r.balance)) : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{background:'#1c5282', color:'white', fontWeight:'bold'}}>
              <td style={{padding:'8px 15px'}}>Total</td>
              <td style={{textAlign:'right', padding:'8px 10px', borderRight:'2px solid #fff'}}>₹ {fmt(Math.abs(totalLiab))}</td>
              <td style={{padding:'8px 15px'}}>Total</td>
              <td style={{textAlign:'right', padding:'8px 10px'}}>₹ {fmt(Math.abs(totalAssets))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}


function ProfitLossView({ledgers,vouchers,onBack,onDrillDownLedger,onDrillDownGroup}:{ledgers:Ledger[];vouchers:Voucher[];onBack:()=>void;onDrillDownLedger:(id:number)=>void;onDrillDownGroup:(name:string)=>void;}) {
  const [rowIdx, setRowIdx] = useState(0);
  const [col, setCol] = useState<'left'|'right'>('left');
  const grp = useMemo(()=>groupLedgersByParent(ledgers,vouchers),[ledgers,vouchers]);
  
  const expGroups=['Purchase Accounts','Direct Expenses','Indirect Expenses','Expenses (Direct)','Expenses (Indirect)'];
  const incGroups=['Sales Accounts','Direct Incomes','Indirect Incomes','Income (Direct)','Income (Indirect)'];

  const allItems = useMemo(()=>{
    const left: any[] = [];
    expGroups.forEach(gn=>{
      const items=grp[gn];
      if(!items||!items.some(x=>x.balance!==0)) return;
      left.push({type:'group', name:gn, balance: items.reduce((s,x)=>s+x.balance,0)});
      items.filter(x=>x.balance!==0).forEach(x=>left.push({type:'ledger', name:x.ledger.name, id:x.ledger.id, balance:x.balance}));
    });
    const right: any[] = [];
    incGroups.forEach(gn=>{
      const items=grp[gn];
      if(!items||!items.some(x=>x.balance!==0)) return;
      right.push({type:'group', name:gn, balance: items.reduce((s,x)=>s+x.balance,0)});
      items.filter(x=>x.balance!==0).forEach(x=>right.push({type:'ledger', name:x.ledger.name, id:x.ledger.id, balance:x.balance}));
    });
    return {left, right, max: Math.max(left.length, right.length)};
  }, [grp]);

  useEffect(()=>{
    const onKey = (e:KeyboardEvent)=>{
      if(e.key==='Escape'){ if(document.querySelector('.modal-overlay')) return; e.preventDefault(); onBack(); }
      else if(e.key==='ArrowDown') { e.preventDefault(); setRowIdx(p=>Math.min(p+1, col==='left'?allItems.left.length-1:allItems.right.length-1)); }
      else if(e.key==='ArrowUp') { e.preventDefault(); setRowIdx(p=>Math.max(p-1, 0)); }
      else if(e.key==='ArrowLeft') { if(col==='right'){setCol('left');setRowIdx(0);} }
      else if(e.key==='ArrowRight') { if(col==='left'){setCol('right');setRowIdx(0);} }
      else if(e.key==='Enter') {
        e.preventDefault();
        const target = col==='left' ? allItems.left[rowIdx] : allItems.right[rowIdx];
        if(!target) return;
        if(target.type==='group') onDrillDownGroup(target.name);
        else onDrillDownLedger(target.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, [onBack, allItems, rowIdx, col, onDrillDownGroup, onDrillDownLedger]);

  const sales = Math.abs(allItems.right.filter(x=>x.name.includes('Sales')).reduce((s,x)=>s+x.balance,0));
  const purchases = Math.abs(allItems.left.filter(x=>x.name.includes('Purchase')).reduce((s,x)=>s+x.balance,0));
  const netProfit = sales - purchases; // Simplified for demo

  return (
    <div className="report-view" style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{background:'#1c5282',color:'white',padding:'10px 20px',display:'flex',justifyContent:'space-between'}}>
        <div style={{fontSize:16,fontWeight:'bold'}}>Profit & Loss Account</div>
        <div style={{fontSize:12}}>1-Apr-2026 to 14-Apr-2026</div>
      </div>
      <div style={{flex:1,overflowY:'auto', background:'#fff'}}>
        <table className="report-table" style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
          <thead>
            <tr style={{background:'#8B0000', color:'white'}}>
              <th style={{padding:'8px 15px', textAlign:'left', borderRight:'2px solid #fff'}}>EXPENDITURE</th>
              <th style={{padding:'8px 15px', textAlign:'right', width:140, borderRight:'2px solid #fff'}}>Amount</th>
              <th style={{padding:'8px 15px', textAlign:'left', borderRight:'2px solid #fff', background:'#006600'}}>INCOME</th>
              <th style={{padding:'8px 15px', textAlign:'right', width:140, background:'#006600'}}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({length: allItems.max}).map((_, i) => {
              const l = allItems.left[i];
              const r = allItems.right[i];
              const isSelL = col==='left' && i===rowIdx;
              const isSelR = col==='right' && i===rowIdx;

              return (
                <tr key={i} style={{fontSize:12, borderBottom:'1px solid #eee'}}>
                  {/* Expenditure side */}
                  <td style={{
                    padding:l?.type==='group'?'6px 10px':'3px 25px', 
                    fontWeight:l?.type==='group'?'bold':'normal',
                    background:isSelL?'#ffd700':(l?.type==='group'?'#f5dede':'transparent'),
                    color:isSelL?'#000':'inherit',
                    cursor:'pointer',
                    borderRight:'1px solid #ddd'
                  }} onClick={()=>{setCol('left');setRowIdx(i); if(l?.type==='group')onDrillDownGroup(l.name); else if(l?.id)onDrillDownLedger(l.id);}}>
                    {l?.name || ''}
                  </td>
                  <td style={{
                    textAlign:'right', padding:'6px 10px', fontWeight:'bold', borderRight:'2px solid #8B0000',
                    background:isSelL?'#ffd700':(l?.type==='group'?'#f5dede':'transparent'),
                    color:isSelL?'#000':(l? '#000' : 'transparent')
                  }}>
                    {l ? fmt(Math.abs(l.balance)) : ''}
                  </td>
                  
                  {/* Income side */}
                  <td style={{
                    padding:r?.type==='group'?'6px 10px':'3px 25px', 
                    fontWeight:r?.type==='group'?'bold':'normal',
                    background:isSelR?'#ffd700':(r?.type==='group'?'#e8f5e8':'transparent'),
                    color:isSelR?'#000':'inherit',
                    cursor:'pointer',
                    borderRight:'1px solid #ddd'
                  }} onClick={()=>{setCol('right');setRowIdx(i); if(r?.type==='group')onDrillDownGroup(r.name); else if(r?.id)onDrillDownLedger(r.id);}}>
                    {r?.name || ''}
                  </td>
                  <td style={{
                    textAlign:'right', padding:'6px 10px', fontWeight:'bold',
                    background:isSelR?'#ffd700':(r?.type==='group'?'#e8f5e8':'transparent'),
                    color:isSelR?'#000':(r? '#000' : 'transparent')
                  }}>
                    {r ? fmt(Math.abs(r.balance)) : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{background:'#1c5282', color:'white', fontWeight:'bold'}}>
              <td colSpan={3} style={{padding:'8px 20px'}}>Net Profit:</td>
              <td style={{textAlign:'right', padding:'8px 10px'}}>₹ {fmt(netProfit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}


function TrialBalanceView({ledgers,vouchers,onBack,onDrillDownLedger,onDrillDownGroup}:{ledgers:Ledger[];vouchers:Voucher[];onBack:()=>void;onDrillDownLedger:(id:number)=>void;onDrillDownGroup:(name:string)=>void;}) {
  const [rowIdx, setRowIdx] = useState(0);
  const rows=useMemo(()=>ledgers.map(l=>{const bal=getLedgerClosingBalance(l,vouchers);return{l,bal};}),[ledgers,vouchers]);
  const totDr=rows.filter(r=>r.bal>0).reduce((s,r)=>s+r.bal,0);
  const totCr=rows.filter(r=>r.bal<0).reduce((s,r)=>s+r.bal,0);

  useEffect(()=>{
    const onKey = (e:KeyboardEvent)=>{
      if(e.key==='Escape'){ if(document.querySelector('.modal-overlay')) return; e.preventDefault(); onBack(); }
      else if(e.key==='ArrowDown') { e.preventDefault(); setRowIdx(p=>Math.min(p+1, rows.length-1)); }
      else if(e.key==='ArrowUp') { e.preventDefault(); setRowIdx(p=>Math.max(p-1, 0)); }
      else if(e.key==='Enter') {
        e.preventDefault();
        const target = rows[rowIdx];
        if(target) onDrillDownLedger(target.l.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, [rows, rowIdx, onBack, onDrillDownLedger]);

  return (

    <div className="report-view" style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{background:'#1c5282',color:'white',padding:'10px 20px',display:'flex',justifyContent:'space-between'}}>
        <div style={{fontSize:16,fontWeight:'bold'}}>Trial Balance</div>
        <div style={{fontSize:12}}>As on 14-Apr-2026</div>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        <table className="report-table" style={{width:'100%'}}>
          <thead>
            <tr>
              <th>Ledger Name</th>
              <th>Group</th>
              <th style={{textAlign:'right',width:150}}>Opening Balance</th>
              <th style={{textAlign:'right',width:150}}>Debit (Dr)</th>
              <th style={{textAlign:'right',width:150}}>Credit (Cr)</th>
              <th style={{textAlign:'right',width:150}}>Closing Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({l,bal},i)=>{
              const vEntries=getLedgerEntries(l.id,vouchers);
              const drAmt=vEntries.filter(e=>e.entry.entryType==='Dr').reduce((s,e)=>s+e.entry.amount,0);
              const crAmt=vEntries.filter(e=>e.entry.entryType==='Cr').reduce((s,e)=>s+e.entry.amount,0);
              return (
                <tr key={i} style={{cursor:'pointer', background: i===rowIdx?'#ffd700':'', color:i===rowIdx?'#000':'inherit'}}
                  onClick={()=>onDrillDownLedger(l.id)}
                  onMouseEnter={()=>setRowIdx(i)}>
                  <td style={{fontWeight:'bold'}}>{l.name}</td>

                  <td style={{fontSize:11,color:'#555'}}>{l.groupName}</td>
                  <td style={{textAlign:'right',fontSize:12}}>{l.openingBalance?`${fmt(l.openingBalance)} ${l.balanceType}`:'-'}</td>
                  <td style={{textAlign:'right',color:'#8B0000',fontSize:12}}>{drAmt?fmt(drAmt):'-'}</td>
                  <td style={{textAlign:'right',color:'#006600',fontSize:12}}>{crAmt?fmt(crAmt):'-'}</td>
                  <td style={{textAlign:'right',fontWeight:'bold',color:bal>0?'#8B0000':bal<0?'#006600':'#999'}}>{bal!==0?`${fmt(Math.abs(bal))} ${bal>0?'Dr':'Cr'}`:'-'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={{textAlign:'right',padding:'8px 12px',fontWeight:'bold'}}>Total:</td>
              <td style={{textAlign:'right',padding:'8px 12px',fontWeight:'bold',color:'#8B0000'}}>₹ {fmt(totDr)}</td>
              <td style={{textAlign:'right',padding:'8px 12px',fontWeight:'bold',color:'#006600'}}>₹ {fmt(Math.abs(totCr))}</td>
              <td style={{textAlign:'right',padding:'8px 12px',fontWeight:'bold',color:Math.abs(totDr+totCr)<1?'#006600':'#c00'}}>
                {Math.abs(totDr+totCr)<1?'✓ Balanced':'Diff: '+fmt(Math.abs(totDr+totCr))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function DayBookView({vouchers, onBack, onDrillDown}:{vouchers:Voucher[]; onBack:()=>void; onDrillDown?:(v:Voucher)=>void}) {
  const [rowIdx, setRowIdx] = useState(0);
  const rows = [...vouchers].sort((a,b)=>new Date(b.date).getTime() - new Date(a.date).getTime());

  useEffect(()=>{
    const onKey = (e:KeyboardEvent)=>{
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
        <div style={{fontSize:16,fontWeight:'bold'}}>Day Book</div>
        <div style={{fontSize:12}}>1-Apr-2026 to 14-Apr-2026</div>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        <table className="report-table" style={{width:'100%'}}>
          <thead>
            <tr>
              <th>Date</th><th>Particulars</th><th>Voucher Type</th><th>Ref No.</th>
              <th style={{textAlign:'right'}}>Debit Amount</th>
              <th style={{textAlign:'right'}}>Credit Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v,i)=>{
              const dr=v.entries.filter(e=>e.entryType==='Dr').reduce((s,e)=>s+e.amount,0);
              const cr=v.entries.filter(e=>e.entryType==='Cr').reduce((s,e)=>s+e.amount,0);
              return <tr key={i} style={{cursor:'pointer', background: i===rowIdx?'#ffd700':'', color:i===rowIdx?'#000':'inherit'}} 
                onClick={()=>onDrillDown?.(v)}
                onMouseEnter={()=>setRowIdx(i)}>
                <td style={{fontSize:12}}>{v.date}</td>
                <td>
                  <div style={{fontWeight:'bold',fontSize:13}}>{v.partyName}</div>
                  <div style={{fontSize:11,color:'#777'}}>{v.narration}</div>
                </td>
                <td><span style={{padding:'2px 8px',background:'#dde4f0',fontWeight:'bold',fontSize:11}}>{v.type}</span></td>
                <td style={{fontSize:12}}>{v.refNo}</td>
                <td style={{textAlign:'right',color:'#8B0000',fontWeight:'bold'}}>{dr?'₹'+fmt(dr):''}</td>
                <td style={{textAlign:'right',color:'#006600',fontWeight:'bold'}}>{cr?'₹'+fmt(cr):''}</td>
              </tr>;
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{textAlign:'right',fontWeight:'bold',padding:'8px 12px'}}>Total:</td>
              <td style={{textAlign:'right',fontWeight:'bold',color:'#8B0000',padding:'8px 12px'}}>₹ {fmt(rows.reduce((s,v)=>s+v.entries.filter(e=>e.entryType==='Dr').reduce((ss,e)=>ss+e.amount,0),0))}</td>
              <td style={{textAlign:'right',fontWeight:'bold',color:'#006600',padding:'8px 12px'}}>₹ {fmt(rows.reduce((s,v)=>s+v.entries.filter(e=>e.entryType==='Cr').reduce((ss,e)=>ss+e.amount,0),0))}</td>
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

  // Monthly totals
  const monthlyData = FISCAL_MONTHS.map((mName, mi) => {
    const mNum = FISCAL_MONTH_NUMS[mi];
    const mvs = allRows.filter(v => { const d=parseVoucherDate(v.date); return d?.month===mNum; });
    const debit = mvs.reduce((s,v)=>s+v.entries.filter(e=>e.entryType==='Dr').reduce((ss,e)=>ss+e.amount,0),0);
    const credit = mvs.reduce((s,v)=>s+v.entries.filter(e=>e.entryType==='Cr').reduce((ss,e)=>ss+e.amount,0),0);
    const total = mvs.reduce((s,v)=>s+v.total,0);
    return {mName, mNum, vouchers:mvs, debit, credit, total};
  });

  const grandDebit = monthlyData.reduce((s,m)=>s+m.debit,0);
  const grandCredit = monthlyData.reduce((s,m)=>s+m.credit,0);
  const grandTotal = monthlyData.reduce((s,m)=>s+m.total,0);

  // Detail view rows
  const detailRows = monthlyData[selMonthIdx]?.vouchers || [];
  const detailDebit = detailRows.reduce((s,v)=>s+v.entries.filter(e=>e.entryType==='Dr').reduce((ss,e)=>ss+e.amount,0),0);
  const detailCredit = detailRows.reduce((s,v)=>s+v.entries.filter(e=>e.entryType==='Cr').reduce((ss,e)=>ss+e.amount,0),0);

  // Bar graph max
  const maxVal = Math.max(...monthlyData.map(m=>m.total), 1);

  // Keyboard navigation
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==='Escape' && document.querySelector('.modal-overlay')) return;
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
  if(view==='monthly') return (
    <div style={{display:'flex',height:'100%',background:'#fff',flexDirection:'column'}}>
      {/* Header */}
      <div style={{background:color,color:'white',padding:'8px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <div style={{fontWeight:'bold',fontSize:15}}>{voucherType} Register</div>
        <div style={{fontSize:11}}>{currentPeriod.start} to {currentPeriod.end}</div>
        <div style={{fontSize:11,opacity:0.8}}>↑↓: Navigate | Enter: Drill-down | Esc: Back</div>
      </div>
      {/* Company sub-header */}
      <div style={{background:'#f0f4f8',borderBottom:'1px solid #ccc',padding:'4px 16px',fontSize:12,display:'flex',gap:20}}>
        <span style={{fontWeight:'bold',color:color}}>{voucherType} Register</span>
        <span>Transactions: Debit | Credit | Closing Balance</span>
      </div>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        {/* Main table */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{flex:1,overflowY:'auto'}}>
            <table className="report-table" style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr style={{background:'#e8eef4',borderBottom:'2px solid #aaa'}}>
                  <th style={{textAlign:'left',padding:'6px 16px',width:'40%',color:'#333'}}>Particulars</th>
                  <th style={{textAlign:'right',padding:'6px 12px',width:'20%',color:'#333'}}>Debit</th>
                  <th style={{textAlign:'right',padding:'6px 12px',width:'20%',color:'#333'}}>Credit</th>
                  <th style={{textAlign:'right',padding:'6px 16px',width:'20%',color:'#333'}}>Closing Balance</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m,i)=>{
                  const isSel = i===selMonthIdx;
                  return (
                    <tr key={i}
                      style={{background:isSel?'#ffd700':i%2===0?'#fff':'#fafafa',cursor:'pointer',borderBottom:'1px solid #e0e0e0'}}
                      onClick={()=>{setSelMonthIdx(i);setView('detail');setRowIdx(0);}}
                      onMouseEnter={()=>setSelMonthIdx(i)}>
                      <td style={{padding:'5px 16px',fontWeight:isSel?'bold':'normal',color:isSel?'#000':'#222'}}>{m.mName}</td>
                      <td style={{textAlign:'right',padding:'5px 12px',fontWeight:isSel?'bold':'normal',color:'#8B0000'}}>
                        {m.debit>0?fmt(m.debit):''}
                      </td>
                      <td style={{textAlign:'right',padding:'5px 12px',fontWeight:isSel?'bold':'normal',color:'#006600'}}>
                        {m.credit>0?fmt(m.credit):''}
                      </td>
                      <td style={{textAlign:'right',padding:'5px 16px',fontWeight:'bold',color:isSel?'#000':color}}>
                        {m.total>0?`${fmt(m.total)} Dr`:''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{background:'#1c3a5e',color:'white',borderTop:'2px solid #999'}}>
                  <td style={{padding:'7px 16px',fontWeight:'bold',fontSize:13}}>Grand Total</td>
                  <td style={{textAlign:'right',padding:'7px 12px',fontWeight:'bold'}}>{grandDebit>0?fmt(grandDebit):''}</td>
                  <td style={{textAlign:'right',padding:'7px 12px',fontWeight:'bold'}}>{grandCredit>0?fmt(grandCredit):''}</td>
                  <td style={{textAlign:'right',padding:'7px 16px',fontWeight:'bold'}}>{grandTotal>0?`${fmt(grandTotal)} Dr`:''}</td>
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
                    onClick={()=>{setSelMonthIdx(i);setView('detail');setRowIdx(0);}}>
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
  return (
    <div style={{display:'flex',height:'100%',background:'#fff',flexDirection:'column'}}>
      <div style={{background:color,color:'white',padding:'8px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <div style={{fontWeight:'bold',fontSize:15}}>Voucher Register</div>
        <div style={{fontSize:11}}>List of {selMonth?.mName || ''} Vouchers</div>
        <div style={{fontSize:11,opacity:0.8}}>Esc: Back to Monthly</div>
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
                <th style={{textAlign:'left',padding:'6px 12px',width:90}}>Date</th>
                <th style={{textAlign:'left',padding:'6px 12px'}}>Particulars</th>
                <th style={{textAlign:'center',padding:'6px 8px',width:90}}>Vch Type</th>
                <th style={{textAlign:'center',padding:'6px 8px',width:70}}>Vch No.</th>
                <th style={{textAlign:'right',padding:'6px 12px',width:110}}>Debit Amount</th>
                <th style={{textAlign:'right',padding:'6px 12px',width:110}}>Credit Amount</th>
              </tr>
            </thead>
            <tbody>
              {detailRows.length===0 && (
                <tr><td colSpan={6} style={{textAlign:'center',padding:40,color:'#888',fontSize:13}}>No vouchers found for {selMonth?.mName}</td></tr>
              )}
              {detailRows.map((v,i)=>{
                const dr = v.entries.filter(e=>e.entryType==='Dr').reduce((s,e)=>s+e.amount,0);
                const cr = v.entries.filter(e=>e.entryType==='Cr').reduce((s,e)=>s+e.amount,0);
                const isSel = i===rowIdx;
                return (
                  <tr key={i}
                    style={{background:isSel?'#ffd700':i%2===0?'#fff':'#fafafa',cursor:'pointer',borderBottom:'1px solid #e8e8e8'}}
                    onClick={()=>onDrillDown?.(v)}
                    onMouseEnter={()=>setRowIdx(i)}>
                    <td style={{padding:'5px 12px',fontWeight:isSel?'bold':'normal'}}>{v.date}</td>
                    <td style={{padding:'5px 12px',fontWeight:'bold',color:'#1a1a1a'}}>{v.partyName||v.narration||'-'}</td>
                    <td style={{textAlign:'center',padding:'5px 8px'}}>
                      <span style={{padding:'1px 6px',background:color,color:'white',fontSize:10,fontWeight:'bold',borderRadius:2}}>{v.type}</span>
                    </td>
                    <td style={{textAlign:'center',padding:'5px 8px',color:'#555'}}>{v.number}</td>
                    <td style={{textAlign:'right',padding:'5px 12px',color:'#8B0000',fontWeight:dr>0?'bold':'normal'}}>{dr>0?fmt(dr):''}</td>
                    <td style={{textAlign:'right',padding:'5px 12px',color:'#006600',fontWeight:cr>0?'bold':'normal'}}>{cr>0?fmt(cr):''}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{background:'#e8eef4',borderTop:'2px solid #aaa'}}>
                <td colSpan={4} style={{textAlign:'right',padding:'7px 12px',fontWeight:'bold',fontSize:13}}>Total:</td>
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
function SalesRegisterView({vouchers, onBack, onDrillDown}:{vouchers:Voucher[]; onBack:()=>void; onDrillDown?:(v:Voucher)=>void}) {
  const [rowIdx, setRowIdx] = useState(0);
  const rows=vouchers.filter(v=>v.type==='Sales'||v.type==='Credit Note');
  const total=rows.reduce((s,v)=>s+(v.type==='Sales'?v.total:-v.total),0);

  useEffect(()=>{
    const onKey = (e:KeyboardEvent)=>{
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
        <div style={{fontSize:12}}>1-Apr-2026 to 14-Apr-2026</div>
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

function StockSummaryView({stockItems,vouchers,onBack,onDrillDown}:{stockItems:StockItem[];vouchers:Voucher[];onBack:()=>void;onDrillDown?:(id:number)=>void}) {
  const [rowIdx, setRowIdx] = useState(0);

  useEffect(()=>{
    const onKey = (e:KeyboardEvent)=>{
      if(e.key==='ArrowDown') { e.preventDefault(); setRowIdx(p=>Math.min(p+1, stockItems.length-1)); }
      else if(e.key==='ArrowUp') { e.preventDefault(); setRowIdx(p=>Math.max(p-1, 0)); }
      else if(e.key==='Escape') { e.preventDefault(); onBack(); }
      else if(e.key==='Enter' && stockItems[rowIdx]) { e.preventDefault(); onDrillDown?.(stockItems[rowIdx].id); }
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, [stockItems, rowIdx, onDrillDown, onBack]);


  const getClosingQty=(item:StockItem)=>{
    let qty=item.openingQty;
    for(const v of vouchers){
      for(const e of v.inventoryEntries){
        if(e.itemId===item.id){
          if(v.type==='Sales'||v.type==='Debit Note') qty-=e.qty;
          else if(v.type==='Purchase'||v.type==='Credit Note') qty+=e.qty;
        }
      }
    }
    return qty;
  };
  return (
    <div className="report-view" style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{background:'#1c5282',color:'white',padding:'10px 20px',display:'flex',justifyContent:'space-between'}}>
        <div style={{fontSize:16,fontWeight:'bold'}}>Stock Summary</div>
        <div style={{fontSize:12}}>As on 14-Apr-2026</div>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        <table className="report-table" style={{width:'100%'}}>
          <thead>
            <tr>
              <th>Item Name</th><th>Stock Group</th><th>Unit</th><th>GST %</th>
              <th style={{textAlign:'right'}}>Opening Qty</th>
              <th style={{textAlign:'right'}}>Purchased</th>
              <th style={{textAlign:'right'}}>Sold</th>
              <th style={{textAlign:'right'}}>Closing Qty</th>
              <th style={{textAlign:'right'}}>Rate</th>
              <th style={{textAlign:'right'}}>Closing Value</th>
            </tr>
          </thead>
          <tbody>
            {stockItems.map((it,i)=>{
              const closQty=getClosingQty(it);
              const bought=vouchers.filter(v=>v.type==='Purchase'||v.type==='Credit Note').flatMap(v=>v.inventoryEntries.filter(e=>e.itemId===it.id)).reduce((s,e)=>s+e.qty,0);
              const sold=vouchers.filter(v=>v.type==='Sales'||v.type==='Debit Note').flatMap(v=>v.inventoryEntries.filter(e=>e.itemId===it.id)).reduce((s,e)=>s+e.qty,0);
              const val=closQty*it.openingRate;
              return <tr key={i} style={{cursor:'pointer', background: i===rowIdx?'#ffd700':'', color:i===rowIdx?'#000':'inherit'}} onClick={()=>onDrillDown?.(it.id)} onMouseEnter={()=>setRowIdx(i)}>
                <td style={{fontWeight:'bold'}}>{it.name}</td>
                <td style={{fontSize:12,color:'#555'}}>{it.under}</td>
                <td style={{fontSize:12}}>{typeof it.unit === 'string' ? it.unit : (it.unit as any)?.symbol || (it.unit as any)?.name || 'Nos'}</td>
                <td style={{textAlign:'center',fontSize:12}}>{it.gstRate}%</td>
                <td style={{textAlign:'right'}}>{it.openingQty}</td>
                <td style={{textAlign:'right',color:'#006600'}}>{bought||'-'}</td>
                <td style={{textAlign:'right',color:'#8B0000'}}>{sold||'-'}</td>
                <td style={{textAlign:'right',fontWeight:'bold',color:closQty<0?'#c00':'#1c5282'}}>{closQty}</td>
                <td style={{textAlign:'right',fontSize:12}}>₹{fmt(it.openingRate)}</td>
                <td style={{textAlign:'right',fontWeight:'bold'}}>₹{fmt(val)}</td>
              </tr>;
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={9} style={{textAlign:'right',fontWeight:'bold',padding:'8px 12px'}}>Total Stock Value:</td>
              <td style={{textAlign:'right',fontWeight:'bold',fontSize:15,padding:'8px 12px',color:'#1c5282'}}>₹ {fmt(stockItems.reduce((s,it)=>s+getClosingQty(it)*it.openingRate,0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
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

function ChartOfAccountsView({ledgers,vouchers,onBack}:{ledgers:Ledger[];vouchers:Voucher[];onBack:()=>void}) {
  const grp=useMemo(()=>groupLedgersByParent(ledgers,vouchers),[ledgers,vouchers]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onBack(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const sides:{title:string;color:string;groups:string[]}[]=[
    {title:'ASSETS',color:'#2b579a',groups:['Cash-in-hand','Bank Accounts','Sundry Debtors','Loans & Advances (Asset)','Fixed Assets','Stock-in-hand','Investments','Current Assets']},
    {title:'LIABILITIES',color:'#8B0000',groups:['Capital Account','Sundry Creditors','Secured Loans','Unsecured Loans','Current Liabilities','Duties & Taxes','Provisions','Reserves & Surplus']},
    {title:'INCOME',color:'#006600',groups:['Sales Accounts','Direct Incomes','Indirect Incomes']},
    {title:'EXPENSES',color:'#555500',groups:['Purchase Accounts','Direct Expenses','Indirect Expenses']},
  ];
  return (
    <div style={{height:'100%',overflowY:'auto',padding:10}}>
      <div style={{background:'#1c5282',color:'white',padding:'10px 20px',marginBottom:10,fontWeight:'bold',fontSize:16}}>Chart of Accounts</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {sides.map((side,si)=>(
          <div key={si} style={{border:`2px solid ${side.color}`,overflow:'hidden'}}>
            <div style={{background:side.color,color:'white',padding:'6px 12px',fontWeight:'bold',fontSize:13}}>{side.title}</div>
            {side.groups.map(gn=>{
              const items=grp[gn];
              if(!items||items.length===0) return null;
              return <div key={gn}>
                <div style={{background:side.color+'22',padding:'3px 10px',fontWeight:'bold',fontSize:12,borderLeft:`4px solid ${side.color}`}}>▶ {gn} ({items.length})</div>
                {items.map(({ledger,balance},i)=><div key={i} style={{padding:'2px 10px 2px 24px',fontSize:12,borderBottom:'1px dotted #eee',display:'flex',justifyContent:'space-between'}}>
                  <span>{ledger.name}</span>
                  <span style={{fontWeight:'bold',color:balance>0?'#8B0000':balance<0?'#006600':'#999',fontSize:11}}>{balance!==0?`${fmt(Math.abs(balance))} ${balance>0?'Dr':'Cr'}`:'-'}</span>
                </div>)}
              </div>;
            })}
          </div>
        ))}
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

function PrintPreview({vouchers,company,printVoucher,ledgers,onSelectVoucher}:{
  vouchers:Voucher[];company:Company | null;printVoucher:Voucher|null;ledgers:Ledger[];onSelectVoucher:(v:Voucher)=>void;
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

  const salesVouchers = vouchers.filter(v=>['Sales','Purchase','Credit Note','Debit Note'].includes(v.type));
  const v = printVoucher || salesVouchers[0] || null;
  if (!v) return (
    <div style={{padding:40,textAlign:'center',color:'#888',fontSize:15}}>
      <div style={{fontSize:40,marginBottom:15}}>🖨️</div>
      <div>No Sales/Purchase voucher found.</div>
      <div style={{fontSize:12,marginTop:8}}>Create a Sales voucher first, then click P: Print</div>
    </div>
  );

  const partySide: 'Dr' | 'Cr' = ['Sales', 'Payment', 'Debit Note'].includes(v.type) ? 'Dr' : 'Cr';
  const otherSide: 'Dr' | 'Cr' = partySide === 'Dr' ? 'Cr' : 'Dr';

  const itemSubtotal = v.inventoryEntries.reduce((s: number, e: any) => s + e.amount, 0);
  const cgst = v.entries.find(e=>e.ledgerName==='CGST Payable')?.amount||0;
  const sgst = v.entries.find(e=>e.ledgerName==='SGST Payable')?.amount||0;
  const igst = v.entries.find(e=>e.ledgerName==='IGST Payable')?.amount||0;
  const isInterState = igst > 0;

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

  const anyShowIncl = v.inventoryEntries.some((e:any) => e.stockItem?.showInclTax || (e.rateInclTax > 0 && Math.abs(e.rateInclTax - e.rate) > 0.1));
  const anyShowAmtIncl = v.inventoryEntries.some((e:any) => e.stockItem?.showAmtInclTax || (e.amountInclTax > 0 && Math.abs(e.amountInclTax - e.amount) > 0.1));
  const showDiscount = company?.showDiscount || v.inventoryEntries.some((e:any) => (e.discountPerc || 0) > 0);

  const pd = v.partyDetails;
  const dd = v.dispatchDetails;

  const stateCode = (s:string) => {
    const map:Record<string,string>={'Uttarakhand':'05','Uttar Pradesh':'09','Delhi':'07','Maharashtra':'27','Gujarat':'24','Rajasthan':'08','Punjab':'03','Haryana':'06','Karnataka':'29','Tamil Nadu':'33','West Bengal':'19','Bihar':'10','Madhya Pradesh':'23','Andhra Pradesh':'28','Telangana':'36','Odisha':'21','Kerala':'32','Assam':'18','Jharkhand':'20','Chhattisgarh':'22','Himachal Pradesh':'02','Jammu and Kashmir':'01','Goa':'30'};
    return map[s]||'00';
  };
  const companyState = company?.state||'';
  const buyerState = pd?.buyerState||v.partyName;

  const tdB:React.CSSProperties = {border:'1px solid #555',padding:'4px 6px',fontSize:11,verticalAlign:'top'};
  const tdH:React.CSSProperties = {...tdB,fontWeight:'bold',background:'#f2f2f2',textAlign:'center'};

  const copyLabels = ["ORIGINAL FOR RECIPIENT", "DUPLICATE FOR TRANSPORTER", "TRIPLICATE FOR SUPPLIER", "EXTRA COPY"];

  const handlePrint = () => {
    setNumCopies(tempCopies);
    setTimeout(() => {
      window.print();
      setShowOptions(false);
    }, 100);
  };

  const renderInvoice = (copyIdx: number) => (
    <div key={copyIdx} className="invoice-copy" style={{
      width:'100%', maxWidth:800, margin:'0 auto 30px auto', background:'white',
      border:'1px solid #555', fontFamily:'Arial,sans-serif', fontSize:12,
      position:'relative', boxSizing:'border-box'
    }}>
      {/* ===== COPY LABEL ===== */}
      <div style={{position:'absolute', top:5, right:10, fontSize:10, fontWeight:'bold', color:'#333'}}>
        {copyLabels[copyIdx] || copyLabels[3]}
      </div>

      {/* ===== TITLE ===== */}
      <div style={{textAlign:'center', fontWeight:'bold', fontSize:16, padding:'12px 0 2px', borderBottom:'1px solid #555'}}>
        Tax Invoice
      </div>

      {/* ===== TOP: Company | Invoice details ===== */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',borderBottom:'1px solid #555'}}>
        <div style={{padding:'8px 12px',borderRight:'1px solid #555', display:'flex', gap: 15}}>
          {company?.showLogo && company?.logo && (
            <div style={{width: '1in', height: '1in', flexShrink: 0, border: '1px solid #eee', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <img src={company.logo} alt="Logo" style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}} />
            </div>
          )}
          <div style={{flex: 1}}>
            <div style={{fontWeight:'bold',fontSize:14}}>{company?.mailingName || company?.name || 'Unknown Company'}</div>
            <div style={{fontSize:11, marginTop:2}}>{company?.address||'—'}</div>
            <div style={{marginTop:4}}>GSTIN/UIN : <b>{company?.gstin||'—'}</b></div>
            <div>State Name : {companyState}{companyState?`, Code : ${stateCode(companyState)}`:''}</div>
            {company?.telephone && <div>Telephone: {company.telephone}</div>}
            {company?.showMobile && company?.mobile && <div>Mobile: {company.mobile}</div>}
            {company?.showEmail && company?.email && <div>E-Mail : {company.email}</div>}
            {company?.showWebsite && company?.website && <div>Website: {company.website}</div>}
          </div>
        </div>
        <div style={{padding:'0'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <tbody>
              <tr><td style={{...tdB,width:'50%'}}>Invoice No.<br/><b>{v.refNo||v.number}</b></td><td style={tdB}>Dated<br/><b>{v.date}</b></td></tr>
              <tr><td style={tdB}>Delivery Note<br/>{dd?.deliveryNoteNo||'—'}</td><td style={tdB}>Mode/Terms of Payment<br/>{pd?.termsOfDelivery||'—'}</td></tr>
              <tr><td style={tdB}>Reference No. & Date.</td><td style={tdB}>Other References</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Consignee + Buyer ===== */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',borderBottom:'1px solid #555'}}>
        <div style={{padding:'8px 12px',borderRight:'1px solid #555'}}>
          <div style={{fontSize:10,color:'#555',fontWeight:'bold',marginBottom:2}}>Consignee (Ship to)</div>
          <div style={{fontWeight:'bold',fontSize:12}}>{pd?.shipName||v.partyName}</div>
          <div style={{fontSize:11}}>{pd?.shipAddress||'—'}</div>
          <div style={{marginTop:2}}>State Name : {pd?.shipState||'—'}{pd?.shipState?`, Code : ${stateCode(pd.shipState)}`:''}</div>
          <div>GSTIN/UIN : <b>{pd?.shipGstin||'—'}</b></div>
        </div>
        <div style={{padding:'0'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <tbody>
              <tr><td style={{...tdB,width:'50%'}}>Buyer's Order No.<br/>{pd?.buyerOrderNo||'—'}</td><td style={tdB}>Dated<br/>{pd?.buyerOrderDate||'—'}</td></tr>
              <tr><td style={tdB}>Dispatch Doc No.<br/>{dd?.dispatchDocNo||'—'}</td><td style={tdB}>Delivery Note Date<br/>—</td></tr>
              <tr><td style={tdB}>Dispatched through<br/>{dd?.dispatchedThrough||'—'}</td><td style={tdB}>Destination<br/>{dd?.destination||'—'}</td></tr>
              <tr><td style={tdB} colSpan={2}>Motor Vehicle No.<br/>{dd?.motorVehicleNo||'—'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Buyer (Bill to) ===== */}
      <div style={{borderBottom:'1px solid #555',padding:'0',display:'grid',gridTemplateColumns:'1fr 1fr'}}>
        <div style={{padding:'8px 12px', borderRight:'1px solid #555'}}>
          <div style={{fontSize:10,color:'#555',fontWeight:'bold',marginBottom:2}}>Buyer (Bill to)</div>
          <div style={{fontWeight:'bold',fontSize:12}}>{pd?.buyerName||v.partyName}</div>
          <div style={{fontSize:11}}>{pd?.buyerAddress||'—'}</div>
          <div style={{marginTop:2}}>State Name : {pd?.buyerState||buyerState}{pd?.buyerState?`, Code : ${stateCode(pd.buyerState)}`:''}</div>
          <div>GSTIN/UIN : <b>{pd?.buyerGstin||'—'}</b></div>
        </div>
        <div style={{padding:'8px 12px'}}>
          <div style={{fontSize:10,color:'#555',fontWeight:'bold',marginBottom:2}}>Terms of Delivery</div>
          <div style={{fontSize:11}}>{pd?.termsOfDelivery||'—'}</div>
        </div>
      </div>

      {/* ===== ITEMS TABLE ===== */}
      <table style={{width:'100%',borderCollapse:'collapse',borderBottom:'1px solid #555'}}>
        <thead>
          <tr>
            <th style={{...tdH,width:30}}>Sl No.</th>
            <th style={{...tdH}}>Description of Goods</th>
            <th style={{...tdH,width:60}}>HSN/SAC</th>
            <th style={{...tdH,width:80}}>Quantity</th>
            {anyShowIncl && (
              <th style={{...tdH,width:80,textAlign:'right'}}>Rate (Incl. Tax)</th>
            )}
            <th style={{...tdH,width:80,textAlign:'right'}}>Rate</th>
            <th style={{...tdH,width:45}}>per</th>
            {showDiscount && (
              <th style={{...tdH,width:50,textAlign:'right'}}>Disc %</th>
            )}
            <th style={{...tdH,width:100,textAlign:'right'}}>Amount</th>
            {anyShowAmtIncl && (
              <th style={{...tdH,width:100,textAlign:'right'}}>Amount (Incl. Tax)</th>
            )}
          </tr>
        </thead>
        <tbody>
          {v.inventoryEntries.map((e,i)=>(
            <tr key={i} style={{minHeight:24}}>
              <td style={{...tdB,textAlign:'center'}}>{i+1}</td>
              <td style={{...tdB}}><b>{e.itemName || (e as any).stockItem?.name || '—'}</b></td>
              <td style={{...tdB,textAlign:'center'}}>{e.hsnCode || (e as any).stockItem?.hsnCode || '—'}</td>
              <td style={{...tdB,textAlign:'right'}}><b>{e.qty} {typeof e.unit === 'string' ? e.unit : (e.unit as any)?.symbol || (e.unit as any)?.name || 'Nos'}</b></td>
              {anyShowIncl && (
                <td style={{...tdB,textAlign:'right'}}>{(e.rateInclTax || 0) > 0 ? fmt(e.rateInclTax) : '—'}</td>
              )}
              <td style={{...tdB,textAlign:'right'}}>{fmt(e.rate)}</td>
              <td style={{...tdB,textAlign:'center'}}>{typeof e.unit === 'string' ? e.unit : (e.unit as any)?.symbol || (e.unit as any)?.name || 'Nos'}</td>
              {showDiscount && (
                <td style={{...tdB,textAlign:'right'}}>{(e.discountPerc || 0) > 0 ? `${e.discountPerc}%` : '—'}</td>
              )}
              <td style={{...tdB,textAlign:'right'}}><b>{fmt(e.amount)}</b></td>
              {anyShowAmtIncl && (
                <td style={{...tdB,textAlign:'right'}}>{(e.amountInclTax || 0) > 0 ? <b>{fmt(e.amountInclTax)}</b> : '—'}</td>
              )}
            </tr>
          ))}
          {/* Spacer rows to maintain height */}
          {[...Array(Math.max(0, 8 - v.inventoryEntries.length))].map((_, i) => {
            return (
              <tr key={'sp-'+i} style={{height:20}}>
                <td style={tdB}/><td style={tdB}/><td style={tdB}/><td style={tdB}/>
                {anyShowIncl && <td style={tdB}/>}
                <td style={tdB}/><td style={tdB}/>
                {showDiscount && <td style={tdB}/>}
                <td style={tdB}/>
                {anyShowAmtIncl && <td style={tdB}/>}
              </tr>
            );
          })}
          {v.entries.filter(e => 
            e.ledgerName !== v.partyName && 
            e.ledgerName !== 'Sales A/c' && 
            e.ledgerName !== 'Purchase A/c'
          ).map((e, ei) => {
            return (
              <tr key={'addl-' + ei}>
                <td style={tdB}/>
                <td style={tdB}><div style={{textAlign:'right'}}>{e.ledgerName}</div></td>
                <td style={tdB}/>
                <td style={tdB}/>
                {anyShowIncl && <td style={tdB}/>}
                <td style={tdB}/>
                <td style={tdB}/>
                {showDiscount && <td style={tdB}/>}
                <td style={{...tdB, textAlign:'right'}}><b>{fmt(e.amount)}</b> {e.entryType === (['Sales', 'Payment', 'Debit Note'].includes(v.type) ? 'Dr' : 'Cr') ? 'Dr' : 'Cr'}</td>
                {anyShowAmtIncl && <td style={tdB}/>}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{borderTop:'2px solid #555'}}>
            <td style={{...tdB,fontWeight:'bold'}} colSpan={2}><div style={{textAlign:'right'}}>Total</div></td>
            <td style={tdB}></td>
            <td style={{...tdB,fontWeight:'bold',textAlign:'right'}}>{v.inventoryEntries.reduce((s:number,e:any)=>s+(e.qty||0),0)} {typeof v.inventoryEntries[0]?.unit === 'string' ? v.inventoryEntries[0]?.unit : (v.inventoryEntries[0]?.unit as any)?.symbol || ''}</td>
            {anyShowIncl && <td style={tdB}/>}
            <td style={tdB}></td>
            <td style={tdB}></td>
            {showDiscount && <td style={tdB}/>}
            <td style={{...tdB,fontWeight:'bold',textAlign:'right',fontSize:13}}>₹ {fmt(v.total)}</td>
            {anyShowAmtIncl && <td style={tdB}/>}
          </tr>
        </tfoot>
      </table>

      {/* ===== Amount in words ===== */}
      <div style={{borderBottom:'1px solid #555',padding:'8px 12px'}}>
        <div style={{fontSize:10}}>Amount Chargeable (in words)</div>
        <div style={{fontWeight:'bold',fontSize:12}}><b>{numberToWords(v.total)}</b></div>
      </div>

      {/* ===== HSN Summary ===== */}
      <div style={{borderBottom:'1px solid #555'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <th style={tdH} rowSpan={2}>HSN/SAC</th>
              <th style={tdH} rowSpan={2}>Taxable Value</th>
              {isInterState ? <th style={tdH} colSpan={2}>Integrated Tax</th> : <><th style={tdH} colSpan={2}>Central Tax</th><th style={tdH} colSpan={2}>State Tax</th></>}
              <th style={tdH} rowSpan={2}>Total Tax Amount</th>
            </tr>
            <tr>
              {isInterState ? <><th style={tdH}>Rate</th><th style={tdH}>Amount</th></> : <><th style={tdH}>Rate</th><th style={tdH}>Amount</th><th style={tdH}>Rate</th><th style={tdH}>Amount</th></>}
            </tr>
          </thead>
          <tbody>
            {hsnRows.map((row,i)=>(
              <tr key={i}>
                <td style={{...tdB,textAlign:'center'}}>{row.hsnCode}</td>
                <td style={{...tdB,textAlign:'right'}}>{fmt(row.taxable)}</td>
                {isInterState ? (
                  <><td style={{...tdB,textAlign:'right'}}>{row.rate}%</td><td style={{...tdB,textAlign:'right'}}>{fmt(row.igst)}</td></>
                ) : (
                  <><td style={{...tdB,textAlign:'right'}}>{row.rate/2}%</td><td style={{...tdB,textAlign:'right'}}>{fmt(row.cgst)}</td><td style={{...tdB,textAlign:'right'}}>{row.rate/2}%</td><td style={{...tdB,textAlign:'right'}}>{fmt(row.sgst)}</td></>
                )}
                <td style={{...tdB,textAlign:'right'}}><b>{fmt(row.total)}</b></td>
              </tr>
            ))}
            <tr style={{fontWeight:'bold'}}>
              <td style={{...tdB,textAlign:'right'}}>Total</td>
              <td style={{...tdB,textAlign:'right'}}>{fmt(itemSubtotal)}</td>
              {isInterState ? <><td style={tdB}/><td style={{...tdB,textAlign:'right'}}>{fmt(igst)}</td></> : <><td style={tdB}/><td style={{...tdB,textAlign:'right'}}>{fmt(cgst)}</td><td style={tdB}/><td style={{...tdB,textAlign:'right'}}>{fmt(sgst)}</td></>}
              <td style={{...tdB,textAlign:'right'}}>{fmt(cgst+sgst+igst)}</td>
            </tr>
          </tbody>
        </table>
        <div style={{padding:'4px 12px',fontSize:11}}>Tax Amount (in words) : <b>{numberToWords(cgst+sgst+igst)}</b></div>
      </div>

      {/* ===== Footer ===== */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',minHeight:100}}>
        <div style={{padding:'8px 12px',borderRight:'1px solid #555',fontSize:10}}>
          {(company?.bankName || company?.accountNo || company?.ifsc) && (
            <div style={{marginBottom:10, paddingBottom:6, borderBottom:'1px solid #eee'}}>
              <div style={{fontWeight:'bold',textDecoration:'underline',marginBottom:2}}>Company's Bank Details:</div>
              <div>Bank Name : <b>{company?.bankName}</b></div>
              <div>A/c Holder Name : <b>{company?.bankHolderName || company?.name}</b></div>
              <div>A/c No. : <b>{company?.accountNo}</b></div>
              <div>IFSC Code : <b>{company?.ifsc}</b></div>
            </div>
          )}
          <div style={{fontWeight:'bold',textDecoration:'underline'}}>Declaration:</div>
          <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
        </div>
        <div style={{padding:'8px 12px',textAlign:'right',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
          <div style={{fontSize:11}}>for <b>{company?.name}</b></div>
          <div style={{marginTop:40}}><div style={{borderTop:'1px solid #555', display:'inline-block', paddingTop:4, width:150, textAlign:'center'}}>Authorised Signatory</div></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="print-preview-main" style={{display:'flex',height:'100%',overflow:'hidden',background:'#eef2f6'}}>
      {/* Sidebar Navigation */}
      <div className="no-print" style={{width:240,borderRight:'2px solid #1c5282',display:'flex',flexDirection:'column',background:'#fff',flexShrink:0}}>
        <div style={{background:'#1c5282',color:'white',padding:'10px 15px',fontWeight:'bold',fontSize:13}}>Print Dashboard</div>
        <div style={{padding:'10px',background:'#f0f4f8',borderBottom:'1px solid #ccc'}}>
           <button onClick={()=>setShowOptions(true)} style={{width:'100%',background:'#1a7a4a',color:'white',border:'none',padding:'10px',cursor:'pointer',fontWeight:'bold',fontSize:13,borderRadius:4,boxShadow:'0 2px 5px rgba(0,0,0,0.2)'}}>
             🖨️ Print Invoice (P)
           </button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'5px 0'}}>
          <div style={{padding:'5px 15px',fontSize:11,color:'#888',fontWeight:'bold'}}>Recent Vouchers</div>
          {salesVouchers.map((sv,i)=>(
            <div key={i} onClick={()=>onSelectVoucher(sv)}
              style={{padding:'8px 15px',cursor:'pointer',borderBottom:'1px solid #eee',background:v.id===sv.id?'#e3efff':'transparent',borderLeft:v.id===sv.id?'4px solid #1c5282':'none'}}>
              <div style={{fontWeight:'bold',fontSize:12}}>{sv.type} #{sv.number}</div>
              <div style={{fontSize:11,color:'#555'}}>{sv.partyName}</div>
              <div style={{fontSize:10,color:'#888'}}>{sv.date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="print-invoice-container" style={{flex:1,overflowY:'auto',padding:'20px',background:'#e2eaf2'}} id="tax-invoice-print-container">
        {/* On screen preview always shows 1 copy */}
        <div className="no-print" style={{marginBottom:15,textAlign:'center',fontSize:12,color:'#666'}}>
          Preview of <b>{v.type} #{v.number}</b> - {v.partyName}
        </div>
        
        {/* Render for printing - hidden on screen if showOptions, but actually we use CSS to hide everything else */}
        {Array.from({length: numCopies}).map((_, i) => renderInvoice(i))}
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
    </div>
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
    <div className="form-content" style={{padding:0,height:'100%',display:'flex',flexDirection:'column'}}>
      <div className="modal-header" style={{fontSize:15,padding:'8px 15px'}}>List of {type}s ({filtered.length} records)</div>
      <div style={{padding:'8px 15px',borderBottom:'1px solid #dde',background:'#f8f8f8',display:'flex',alignItems:'center',gap:10}}>
        <label style={{fontSize:12,fontWeight:'bold'}}>Search:</label>
        <input ref={ref} type="text" className="form-input" style={{width:320}} placeholder={`Filter ${type}s...`} value={search} onChange={e=>setSearch(e.target.value)} autoFocus/>
        <span style={{fontSize:11,color:'#888',marginLeft:'auto'}}>Arrow Keys to Navigate | Click or Enter to Select | Esc: Back</span>
      </div>
      <div ref={listRef} className="modal-list" style={{flex:1,overflowY:'auto'}}>
        {filtered.map((it,i)=>(
          <div key={i} className={`modal-list-item ${i===selIdx?'selected':''}`} onClick={()=>onSelect(it)} style={{display:'flex',justifyContent:'space-between'}}>
            <span style={{fontWeight:'bold'}}>{typeof it === 'string' ? it : (it as any).name || (it as any).symbol || ''}</span>
            <span style={{opacity:0.45,fontSize:11}}>{(it && typeof it === 'object' && 'groupName' in it) ? it.groupName as string : ''}</span>
          </div>
        ))}
        {filtered.length===0&&<div style={{padding:25,textAlign:'center',color:'#888'}}>No {type}s found.</div>}
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
function GSTR1ReportView({vouchers, activeCompany, ledgers, currentPeriod, allUnits, goBack, onDrillDownVoucher}: {vouchers: Voucher[], activeCompany: Company | null, ledgers: Ledger[], currentPeriod: {start:string, end:string}, allUnits: UnitData[], goBack: () => void, onDrillDownVoucher: (v:Voucher)=>void}) {
  const [drillDown, setDrillDown] = useState<string | null>(null);
  const [drillDownParty, setDrillDownParty] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [selectedVchIdx, setSelectedVchIdx] = useState<number>(0);

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
      const txVal = item.amount / (1 + (rate / 100));
      const tax = item.amount - txVal;
      taxable += txVal; totalTax += tax;
      if (isInterState) igst += tax; else { cgst += tax / 2; sgst += tax / 2; }
    });
    return { taxable, igst, cgst, sgst, totalTax };
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
      const {taxable, igst, cgst, sgst} = getTaxBreakdown(v);
      const gstin = getVchGstin(v);
      if (!groups[v.partyId]) groups[v.partyId] = {id:v.partyId, name: v.partyName, gstin: gstin, count:0, taxable:0, igst:0, cgst:0, sgst:0, total:0, vouchers:[]};
      groups[v.partyId].count++;
      groups[v.partyId].taxable += taxable;
      groups[v.partyId].igst += igst;
      groups[v.partyId].cgst += cgst;
      groups[v.partyId].sgst += sgst;
      groups[v.partyId].total += v.total;
      groups[v.partyId].vouchers.push(v);
    });
    return Object.values(groups);
  }, [b2bList, ledgers]);

  const partyRows = partyGroups;
  const currentPartyVouchers = drillDownParty ? (partyGroups.find(p=>p.id===drillDownParty)?.vouchers || []) : [];

  // KEYBOARD HANDLING
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (drillDownParty) setDrillDownParty(null);
        else if (drillDown) setDrillDown(null);
        else goBack();
      } else if (drillDownParty) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedVchIdx(p => Math.min(p+1, currentPartyVouchers.length-1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedVchIdx(p => Math.max(p-1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); onDrillDownVoucher(currentPartyVouchers[selectedVchIdx]); }
      } else if (drillDown === 'b2b') {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedRow(p => Math.min(p+1, partyRows.length-1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedRow(p => Math.max(p-1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); setDrillDownParty(partyRows[selectedRow].id); setSelectedVchIdx(0); }
      } else if (!drillDown) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedRow(p => Math.min(p+1, sections.length-1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedRow(p => Math.max(p-1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); setDrillDown(sections[selectedRow].id); setSelectedRow(0); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drillDown, drillDownParty, selectedRow, selectedVchIdx, sections, partyRows, currentPartyVouchers, goBack]);

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
        
        // Fix: Tally-like app stores inclusive amount, so calculate taxable (txval) and tax
        const txval = item.amount / (1 + (rate / 100));
        const tax = item.amount - txval;
        
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
         
         const txval = item.amount / (1 + (rate / 100));
         const tax = item.amount - txval;
         
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
        val: v.total,
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
      const tot = s.vouchers.reduce((sum, v) => sum + v.total, 0);
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
      const tot = s.vouchers.reduce((sum, v) => sum + v.total, 0);
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
                  style={{borderBottom:'1px solid #eee', cursor:'pointer', background: i===selectedVchIdx?'#fffbe6':'transparent'}}>
                  <td style={{padding:8}}>{v.date}</td>
                  <td style={{padding:8}}>{v.voucherNo}</td>
                  <td style={{padding:8,textAlign:'right'}}>{fmt(getTaxBreakdown(v).taxable)}</td>
                  <td style={{padding:8,textAlign:'right'}}>{fmt(getTaxBreakdown(v).totalTax)}</td>
                  <td style={{padding:8,textAlign:'right',fontWeight:'bold'}}>{fmt(v.total)}</td>
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
                  style={{borderBottom:'1px solid #eee', cursor:'pointer', background: i===selectedRow?'#fffbe6':'transparent'}}>
                  <td style={{padding:8,fontWeight:'bold',color:'#1c5282'}}>{p.name}</td>
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

  if (drillDown === 'hsn') {
    const hsnMap: Record<string, any> = {};
    salesVouchers.forEach(v => {
      const isInter = v.partyDetails?.buyerState && activeCompany?.state && v.partyDetails.buyerState !== activeCompany.state;
      v.inventoryEntries.forEach(item => {
        const key = item.hsnCode || 'N/A';
        const rate = item.gstRate || 18;
        if (!hsnMap[key]) hsnMap[key] = {hsn:key, desc:'', uqc:item.unit||'NOS', qty:0, val:0, txval:0, igst:0, cgst:0, sgst:0, totalTax:0, rate};
        const txval = item.amount / (1 + (rate / 100));
        const tax = item.amount - txval;
        hsnMap[key].qty += item.qty; hsnMap[key].val += item.amount; hsnMap[key].txval += txval;
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
                style={{borderBottom:'1px solid #eee', cursor:'pointer', background: i===selectedRow?'#fffbe6':'transparent'}}>
                <td style={{padding:10}}>{i+1}</td>
                <td style={{padding:10,fontWeight:'bold',color:'#1c5282'}}>{s.label}</td>
                <td style={{padding:10,textAlign:'right'}}>{s.vouchers.length}</td>
                <td style={{padding:10,textAlign:'right'}}>{fmt(s.vouchers.reduce((sum,v)=>sum+getTaxBreakdown(v).taxable,0))}</td>
                <td style={{padding:10,textAlign:'right'}}>{fmt(s.vouchers.reduce((sum,v)=>sum+getTaxBreakdown(v).totalTax,0))}</td>
                <td style={{padding:10,textAlign:'right'}}>{fmt(s.vouchers.reduce((sum,v)=>sum+v.total,0))}</td>
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

// ==================== DATA EXCHANGE VIEW ====================
function DataExchangeView({goBack}: {goBack: () => void}) {
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:'#fff'}}>
      <div style={{background:'#1c5282',color:'white',padding:'10px 15px',fontWeight:'bold'}}>Data Import / Export (Tally Style)</div>
      <div style={{padding:20,display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div style={{border:'1px solid #ccc',padding:15,borderRadius:4}}>
          <h3 style={{marginTop:0}}>Import Data</h3>
          <p style={{fontSize:12,color:'#666'}}>Import Masters or Vouchers from XML/Excel files.</p>
          <button style={{padding:'8px 20px',background:'#1c5282',color:'white',border:'none',cursor:'pointer'}}>Select File...</button>
        </div>
        <div style={{border:'1px solid #ccc',padding:15,borderRadius:4}}>
          <h3 style={{marginTop:0}}>Export Data</h3>
          <p style={{fontSize:12,color:'#666'}}>Export Masters or Vouchers for backup or migration.</p>
          <button style={{padding:'8px 20px',background:'#1a7a4a',color:'white',border:'none',cursor:'pointer'}}>Export to XML/Excel</button>
        </div>
      </div>
    </div>
  );
}
