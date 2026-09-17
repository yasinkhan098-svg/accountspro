"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

export interface POItem {
  id?: number;
  slNo: number;
  hsnCode: string;
  description: string;
  partNo: string;
  gstRate: number | string;
  requiredBy: string;
  uom: string;
  qty: number | string;
  rate: number | string;
  discountPerc: number | string;
  discountAmt: number;
  amount: number;
  receivedQty?: number;
  balanceQty?: number;
  stockItemId?: number | null;
}

export interface PurchaseOrderData {
  id?: number;
  companyId: number;
  poNumber: string;
  poDate: string;
  amendmentNo: string;
  amendmentDate: string;
  internalIndentNo: string;
  internalIndentDate: string;
  yourQuotationNo: string;
  vendorCode: string;
  vendorName: string;
  vendorAddress: string;
  vendorGstin: string;
  currency: string;
  termsOfDelivery: string;
  termsOfPayment: string;
  contactPurchaseRep: string;
  pan: string;
  gstin: string;
  iecNo: string;
  invoiceFromName: string;
  invoiceFromAddress: string;
  invoiceFromGstin: string;
  deliverToName: string;
  deliverToAddress: string;
  deliverToGstin: string;
  specificTerms: string[];
  enableTnC: boolean;
  status: string;
  totalValue: number;
  grossAmount: number;
  narration: string;
  preparedBy: string;
  approvedBy: string;
  financeCheck: string;
  items: POItem[];
}

export interface Company {
  id: number;
  name: string;
  mailingName?: string;
  address?: string;
  state?: string;
  gstin?: string;
  pan?: string;
  telephone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  logo?: string;
  showLogo?: boolean;
  pinCode?: string;
}

export interface Ledger {
  id: number;
  name: string;
  groupName: string;
  alias?: string;
  address?: string;
  gstin?: string;
  panItNo?: string;
}

export interface StockItem {
  id: number;
  name: string;
  hsnCode?: string;
  gstRate: number;
  unit: any;
  unitName?: string;
  openingRate?: number;
  rate?: number;
  alias?: string;
  partNo?: string;
  groupName?: string;
}

const fmt = (n: number | string) =>
  (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const todayStr = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const formatDate = (d: string | null | undefined): string => {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
  } catch {
    return d;
  }
};

function numberToWords(num: number): string {
  if (num === 0) return "Zero Rupees Only";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const tw = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100) return tens[Math.floor(n / 10)] + " " + ones[n % 10] + " ";
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred " + tw(n % 100);
    if (n < 100000) return tw(Math.floor(n / 1000)) + "Thousand " + tw(n % 1000);
    if (n < 10000000) return tw(Math.floor(n / 100000)) + "Lakh " + tw(n % 100000);
    return tw(Math.floor(n / 10000000)) + "Crore " + tw(n % 10000000);
  };
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let r = "**** " + tw(rupees).trim() + " Rupees";
  if (paise > 0) r += " and " + tw(paise).trim() + " Paise";
  return r + " Only";
}

const emptyPO = (company: Company | null, nextNo: string): PurchaseOrderData => ({
  companyId: company?.id || 0,
  poNumber: nextNo,
  poDate: todayStr(),
  amendmentNo: "",
  amendmentDate: "",
  internalIndentNo: "",
  internalIndentDate: "",
  yourQuotationNo: "",
  vendorCode: "",
  vendorName: "",
  vendorAddress: "",
  vendorGstin: "",
  currency: "INR",
  termsOfDelivery: "",
  termsOfPayment: ":30 days",
  contactPurchaseRep: "",
  pan: company?.pan || "",
  gstin: company?.gstin || "",
  iecNo: "",
  invoiceFromName: "",
  invoiceFromAddress: "",
  invoiceFromGstin: "",
  deliverToName: company?.mailingName || company?.name || "",
  deliverToAddress: company?.address || "",
  deliverToGstin: company?.gstin || "",
  specificTerms: [
    "GST Amount will be paid after reflecting in GSTR Portal",
    "COA Reports Required Along With Material",
    "FREIGHT UNDER SUPPLIER ESCOPE",
    "DELIVERY TO PLANT UNIT-1"
  ],
  enableTnC: false,
  status: "Open",
  totalValue: 0,
  grossAmount: 0,
  narration: "",
  preparedBy: "",
  approvedBy: "",
  financeCheck: "",
  items: []
});

const emptyItem = (slNo: number = 1): POItem => ({
  slNo,
  hsnCode: "",
  description: "",
  partNo: "",
  gstRate: 18,
  requiredBy: "",
  uom: "Nos",
  qty: 1,
  rate: 0,
  discountPerc: 0,
  discountAmt: 0,
  amount: 0,
  receivedQty: 0,
  balanceQty: 1,
  stockItemId: null
});

const TNC_SECTIONS = [
  {
    title: "1. Price and Payment Terms",
    clauses: [
      "1.1 The price mentioned in the purchase order shall remain firm, fixed and binding till the completion of supplies and services and shall not be subject to escalation.",
      "1.2 The purchase order shall comprise of but not be limited to: (i) the terms and conditions of the purchase order, (ii) the technical terms and conditions or the specifications of the purchase order.",
      "1.3 The supplier / service provider shall accept the purchase order issued by the Company within 48 hours of receipt of such purchase order.",
      "1.4 The price indicated in the purchase order shall be for the scope of supply and services detailed and agreed.",
      "1.5 The payment against invoices corresponding to a particular purchase order will be paid according to the currency mentioned in the purchase order.",
      "1.6 The payment of the contract price shall be paid as per purchase order value.",
      "1.7 Payment shall be as per the terms mentioned in the purchase order. Commercial Invoice and other documents prescribed for the scope of supply and services to be submitted to the relevant Company plant.",
      "1.8 All the invoices shall be accompanied by a set of original documents such as packing list, e-way bill, COA etc.",
      "1.9 The supplier / service provider shall comply with and submit the documents desired by the Company at different stages before the payment is processed.",
      "1.10 Payment by the Company towards an invoice does not mean acceptance of the products in bulk.",
      "1.11 In the event an advance is provided, the supplier / service provider shall ensure that the invoice submitted makes adjustment of the advance monies.",
      "1.12 Unless otherwise agreed, the supplier shall bear all risks of loss of or damage to the products until received at the delivery location."
    ]
  },
  {
    title: "2. Delivery Terms",
    clauses: [
      "2.1 The supplier / service provider shall strictly adhere to the time schedule indicated in the purchase order and complete the supply of products / services within the delivery date.",
      "2.2 Deliveries of products / services deviating from the schedule set out in purchase orders are acceptable with prior written approval.",
      "2.3 In the event the supplier fails to deliver, the Company shall have the right to seek Liquidated Damages from the supplier.",
      "2.4 The parties agree that Liquidated Damages constitute a genuine pre-estimate of the losses likely to be suffered by the Company.",
      "2.5 Confirmation for inspection schedule shall be obtained by the supplier from the plant in advance.",
      "2.6 If the supplier anticipates any difficulties, they must immediately notify the Company within 1 week of receipt of purchase agreement.",
      "2.7 In the event the product / service supplied faces a quality issue, the supplier / service provider shall rectify or replace such product / service at its own cost.",
      "2.8 For any delay attributable to the Company, the time of completion and delivery shall be extended by a reasonable period.",
      "2.9 The occurrence of a delay does not constitute a waiver of any claims to which the Company is entitled.",
      "2.10 If the supplier / service provider is responsible for set-up or installation, the supplier / service provider shall bear all necessary incidental costs.",
      "2.11 Partial delivery of products / services is inadmissible unless otherwise expressly agreed by the Company in writing.",
      "2.12 The values established by the Company during the incoming product inspection shall determine the quantities, weights and measurements.",
      "2.13 In case of procurement of any software, the Company shall have the implied right to use such software."
    ]
  },
  {
    title: "3. Taxes and Duties",
    clauses: [
      "3.1 All invoices shall include applicable taxes as per rules of the land at the time of delivery.",
      "3.2 Goods and services tax (GST) applicable shall be reimbursed at actuals subject to the scope of supply of products and services mentioned in purchase order post uploading of invoices on the GST portal.",
      "3.3 Any statutory variation on account of GST arising between the date of submission of offer and scheduled date of completion of supplies and associated services, can be allowed for supplies / services made within the scheduled delivery period.",
      "3.4 Where the delivery schedule of product / service is extended for reasons not directly attributable to the supplier / service provider, variation in taxes and duties shall be reimbursed."
    ]
  },
  {
    title: "4. Advice of Dispatch and Invoice",
    clauses: [
      "4.1 The details in the purchase orders and order releases shall be included in the invoice / dispatch advise. An invoice showing the invoice number and other allocation references (PO No.) shall accompany the shipment along with other necessary documents like packing list, transport LR, E-way bill, COA etc.",
      "4.2 Relevant documents shall be presented to the check post / octroi authorities, port authorities and excise / GST authorities as and when needed and should be handed over to the Company while delivering the product. The supplier is accountable for any liabilities arising due to mistakes or errors in the transport documentation."
    ]
  },
  {
    title: "5. Warranty Period, Claim Handling and Complaint Resolution",
    clauses: [
      "5.1 The supplier warrants that the products shall be fit for the stated use / application.",
      "5.2 In case of rejection of the products, the supplier undertakes to rectify / replace such defective products, free of cost in accordance with the supplier's Product Data Sheet & Warranty Statement.",
      "5.3 The supplier undertakes to comply with and be bound by Company warranty terms as agreed and represented by the Company to its customers.",
      "5.4 The supplier shall be liable for defects in the products as mentioned in purchase order and shall provide minimum 12 months workmanship warranty.",
      "5.5 For materials which are shelf life sensitive, the supplier is obligated to mention the shelf life of such materials in any one of the transit documents.",
      "5.6 In the event of complaint, the supplier shall conduct without delay all examinations appearing necessary and notify the Company.",
      "5.7 The Company shall not be bound to accept the products which do not conform to the standards, Specifications, instructions given by the Company."
    ]
  },
  {
    title: "6. Supplier / Service Provider Compliance with Statutory Requirement",
    clauses: [
      "6.1 The supplier / service provider shall comply with all applicable labour laws and regulations, including the payment of Minimum Wages Act.",
      "6.2 The supplier / service provider shall, at all times, be in compliance with applicable laws for providing services.",
      "6.3 The supplier / service provider was / is responsible for paying salaries to all its employees or workmen deputed through sub-contractor.",
      "6.4 The supplier / service provider shall ensure that during the period it was associated with the Company, its employees or workmen are paid minimum wages.",
      "6.5 Any violation of labour laws shall be viewed seriously by the Company and the supplier / service provider shall be solely liable for the consequences.",
      "6.6 In the event of loss arising out of any labour law non-compliance, the Company shall be entitled to deduct from any compensation or other dues payable."
    ]
  },
  {
    title: "7. EHS Requirement Specification",
    clauses: [
      "7.1 The supplier / service provider shall comply with all statutory provisions on health and safety and shall use its best efforts to eliminate hazards.",
      "7.2 Before the commencement of the works, the supplier / service provider shall provide the Company with a written risk assessment.",
      "7.3 The supplier / service provider shall ensure that all of its Personnel take part in site-specific safety training.",
      "7.4 The supplier / service provider shall promptly grant the Company access to all documents relating to health and safety.",
      "7.5 In case of any Incident leading to the death of any Personnel or a severe injury, the supplier / service provider shall immediately Inform the Company.",
      "7.6 The supplier / service provider shall regularly monitor compliance with statutory and contractual health and safety provisions.",
      "7.7 Upon Company request, the supplier / service provider shall promptly grant the Company access to all relevant documents.",
      "7.8 In any event of non-compliance of the EHS Plan, Company may levy a penalty as per the discretion of the project manager.",
      "7.9 Service provider must comply with Company safety standards of Contractor and Subcontractor Health and Safety Manual."
    ]
  },
  {
    title: "8. Packing",
    clauses: [
      "8.1 The products delivered by the supplier shall be adequately packed and protected against loss, damage, handling or corrosion in transit. The packing of the goods shall conform to Specifications. Any breakage, damage and/or pilferage in transit arising from faulty packing shall be borne by the supplier. Each box / packing / bundle must be plainly marked with Company purchase order number and address along with position of the products and accessories wherever necessary."
    ]
  }
];

// ==================== PURCHASE ORDER FORM ====================
export function PurchaseOrderForm({
  company,
  ledgers,
  stockItems,
  onBack,
  onSave,
  editPO,
  existingPOs
}: {
  company: Company | null;
  ledgers: Ledger[];
  stockItems: StockItem[];
  onBack: () => void;
  onSave: (po: PurchaseOrderData) => void;
  editPO?: PurchaseOrderData | null;
  existingPOs: PurchaseOrderData[];
}) {
  const nextPONo = () => {
    const year = new Date().getFullYear();
    const short = String(year).slice(-2);
    const nextShort = String(year + 1).slice(-2);
    const prefix = `PO-FY${short}${nextShort}-`;
    const existing = existingPOs.filter((p) => p.poNumber.startsWith(prefix));
    const maxNo = existing.reduce((max, p) => {
      const n = parseInt(p.poNumber.replace(prefix, "")) || 0;
      return Math.max(max, n);
    }, 0);
    return `${prefix}${String(maxNo + 1).padStart(4, "0")}`;
  };

  // Pre-fill Company PAN, GSTIN, Deliver To automatically
  const [po, setPO] = useState<PurchaseOrderData>(() => {
    if (editPO) {
      return {
        ...editPO,
        pan: editPO.pan || company?.pan || "",
        gstin: editPO.gstin || company?.gstin || "",
        deliverToName: editPO.deliverToName || company?.mailingName || company?.name || "",
        deliverToAddress: editPO.deliverToAddress || company?.address || "",
        deliverToGstin: editPO.deliverToGstin || company?.gstin || ""
      };
    }
    return emptyPO(company, nextPONo());
  });

  const [saving, setSaving] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  // Live collections fetched directly to guarantee data is available
  const [liveStockItems, setLiveStockItems] = useState<StockItem[]>(stockItems || []);
  const [liveLedgers, setLiveLedgers] = useState<Ledger[]>(ledgers || []);

  useEffect(() => {
    if (stockItems && stockItems.length > 0) setLiveStockItems(stockItems);
  }, [stockItems]);

  useEffect(() => {
    if (ledgers && ledgers.length > 0) setLiveLedgers(ledgers);
  }, [ledgers]);

  // Direct fetch fallback for stock items & ledgers (both company and general)
  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const itemUrl = company?.id ? `/api/stock-items?companyId=${company.id}` : `/api/stock-items`;
        const res = await fetch(itemUrl);
        const d = await res.json();
        if (d.success && Array.isArray(d.items) && d.items.length > 0) {
          setLiveStockItems(d.items);
        } else {
          // Fallback to fetch all stock items
          const rAll = await fetch('/api/stock-items');
          const dAll = await rAll.json();
          if (dAll.success && Array.isArray(dAll.items) && dAll.items.length > 0) {
            setLiveStockItems(dAll.items);
          }
        }
      } catch (e) {
        console.error("Failed to load stock items:", e);
      }

      try {
        const ledgerUrl = company?.id ? `/api/ledgers?companyId=${company.id}` : `/api/ledgers`;
        const res = await fetch(ledgerUrl);
        const d = await res.json();
        if (d.success && Array.isArray(d.ledgers) && d.ledgers.length > 0) {
          setLiveLedgers(d.ledgers);
        } else {
          // Fallback to fetch all ledgers
          const rAll = await fetch('/api/ledgers');
          const dAll = await rAll.json();
          if (dAll.success && Array.isArray(dAll.ledgers) && dAll.ledgers.length > 0) {
            setLiveLedgers(dAll.ledgers);
          }
        }
      } catch (e) {
        console.error("Failed to load ledgers:", e);
      }
    };
    fetchMasters();
  }, [company?.id]);

  // Vendor selection state (Right Side Panel + In-place Dropdown)
  const [showVendorPanel, setShowVendorPanel] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorDropdownPos, setVendorDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Stock item selection state (Right Side Panel + In-place Dropdown)
  const [activeItemPickerIndex, setActiveItemPickerIndex] = useState<number | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [itemDropdownPos, setItemDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Quick item creation modal inside stock item list if none exist
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickItemName, setQuickItemName] = useState("");
  const [quickItemHsn, setQuickItemHsn] = useState("");
  const [quickItemUnit, setQuickItemUnit] = useState("Nos");
  const [quickItemGst, setQuickItemGst] = useState(18);
  const [quickItemRate, setQuickItemRate] = useState(0);
  const [quickItemCreating, setQuickItemCreating] = useState(false);

  // Ledgers sorted with Sundry Creditors first
  const supplierLedgers = useMemo(() => {
    const creditors = liveLedgers.filter((l) => l.groupName === "Sundry Creditors");
    const others = liveLedgers.filter((l) => l.groupName !== "Sundry Creditors");
    return [...creditors, ...others];
  }, [liveLedgers]);

  // Filtered vendor suggestions
  const filteredVendors = useMemo(() => {
    const term = (vendorSearch || "").toLowerCase().trim();
    if (!term) return supplierLedgers;
    return supplierLedgers.filter(
      (l) =>
        l.name.toLowerCase().includes(term) ||
        (l.alias && l.alias.toLowerCase().includes(term)) ||
        (l.gstin && l.gstin.toLowerCase().includes(term)) ||
        l.groupName.toLowerCase().includes(term)
    );
  }, [supplierLedgers, vendorSearch]);

  // Filtered stock items
  const filteredStockItems = useMemo(() => {
    const term = itemSearch.toLowerCase().trim();
    if (!term) return liveStockItems;
    return liveStockItems.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        (s.hsnCode && s.hsnCode.toLowerCase().includes(term)) ||
        (s.alias && s.alias.toLowerCase().includes(term)) ||
        (s.groupName && s.groupName.toLowerCase().includes(term))
    );
  }, [liveStockItems, itemSearch]);

  const updatePO = (field: keyof PurchaseOrderData, val: any) =>
    setPO((p) => ({ ...p, [field]: val }));

  const openVendorPicker = (el?: HTMLElement | null) => {
    setShowVendorPanel(true);
    setVendorSearch("");
    if (el) {
      const rect = el.getBoundingClientRect();
      setVendorDropdownPos({
        top: rect.bottom + 2,
        left: rect.left,
        width: Math.max(380, rect.width)
      });
    }
  };

  const closeVendorPicker = () => {
    setShowVendorPanel(false);
    setVendorDropdownPos(null);
  };

  // Auto-fill all vendor details when a ledger is selected
  const selectVendor = (l: Ledger) => {
    const code = l.alias || String(l.id);
    setPO((p) => ({
      ...p,
      vendorCode: code,
      vendorName: l.name,
      vendorAddress: l.address || "",
      vendorGstin: l.gstin || "",
      invoiceFromName: l.name,
      invoiceFromAddress: l.address || "",
      invoiceFromGstin: l.gstin || ""
    }));
    closeVendorPicker();
  };

  // When user types in Vendor Code, auto-fill if matched
  const handleVendorCodeChange = (codeVal: string) => {
    updatePO("vendorCode", codeVal);
    const clean = codeVal.trim().toLowerCase();
    if (clean) {
      const match = liveLedgers.find(
        (l) =>
          String(l.id) === clean ||
          ((l as any).alias && String((l as any).alias).toLowerCase() === clean) ||
          l.name.toLowerCase() === clean
      );
      if (match) {
        selectVendor(match);
      }
    }
  };

  const openItemPicker = (idx: number, el?: HTMLElement | null) => {
    setActiveItemPickerIndex(idx);
    setItemSearch(""); // Show ALL items by default so list is never blank!
    if (el) {
      const rect = el.getBoundingClientRect();
      setItemDropdownPos({
        top: rect.bottom + 2,
        left: rect.left,
        width: Math.max(440, rect.width)
      });
    }
  };

  const closeItemPicker = () => {
    setActiveItemPickerIndex(null);
    setItemDropdownPos(null);
  };

  // Update item field and recalculate amounts
  const updateItem = (idx: number, field: keyof POItem, val: any) =>
    setPO((p) => {
      const items = [...p.items];
      const item = { ...items[idx], [field]: val };
      if (["qty", "rate", "discountPerc", "gstRate"].includes(field as string)) {
        const qty = parseFloat(String(item.qty)) || 0;
        const rate = parseFloat(String(item.rate)) || 0;
        const discP = parseFloat(String(item.discountPerc)) || 0;
        const gross = qty * rate;
        const discAmt = Math.round(((gross * discP) / 100) * 100) / 100;
        item.discountAmt = discAmt;
        item.amount = Math.round((gross - discAmt) * 100) / 100;
        item.balanceQty = Math.max(0, qty - (item.receivedQty || 0));
      }
      items[idx] = item;
      return { ...p, items };
    });

  // Select stock item from list for a specific row
  const selectStockItem = (rowIdx: number, item: StockItem) => {
    const uomName =
      (item as any).unitName ||
      (typeof item.unit === "string" ? item.unit : item.unit?.symbol || item.unit?.name) ||
      "Nos";
    const defaultRate = (item as any).openingRate || (item as any).rate || 0;
    const currentQty = parseFloat(String(po.items[rowIdx]?.qty)) || 1;
    const gross = currentQty * defaultRate;
    const discPerc = parseFloat(String(po.items[rowIdx]?.discountPerc)) || 0;
    const discAmt = Math.round(((gross * discPerc) / 100) * 100) / 100;
    const amount = Math.round((gross - discAmt) * 100) / 100;

    setPO((p) => {
      const items = [...p.items];
      items[rowIdx] = {
        ...items[rowIdx],
        stockItemId: item.id,
        description: item.name,
        hsnCode: item.hsnCode || "",
        partNo: (item as any).alias || (item as any).partNo || "",
        gstRate: item.gstRate ?? 18,
        uom: uomName,
        qty: currentQty,
        rate: defaultRate,
        discountPerc: discPerc,
        discountAmt: discAmt,
        amount: amount,
        receivedQty: 0,
        balanceQty: currentQty
      };
      return { ...p, items };
    });
    closeItemPicker();
    setTimeout(() => {
      document.getElementById(`po-item-qty-${rowIdx}`)?.focus();
    }, 50);
  };

  // Quick add stock item if none exists
  const handleQuickAddStockItem = async () => {
    if (!quickItemName.trim()) {
      alert("Item name is required");
      return;
    }
    if (!company?.id) return;
    setQuickItemCreating(true);
    try {
      const res = await fetch("/api/stock-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickItemName.trim(),
          hsnCode: quickItemHsn.trim(),
          unit: quickItemUnit,
          gstRate: quickItemGst,
          openingRate: quickItemRate,
          companyId: company.id
        })
      });
      const d = await res.json();
      if (d.success && d.item) {
        setLiveStockItems((prev) => [...prev, d.item]);
        if (activeItemPickerIndex !== null) {
          selectStockItem(activeItemPickerIndex, d.item);
        }
        setShowQuickAddModal(false);
        setQuickItemName("");
        setQuickItemHsn("");
        setQuickItemRate(0);
      } else {
        alert("Failed to create item: " + (d.error || "Unknown error"));
      }
    } finally {
      setQuickItemCreating(false);
    }
  };

  const addItem = () => {
    const newIdx = po.items.length;
    setPO((p) => ({
      ...p,
      items: [...p.items, emptyItem(p.items.length + 1)]
    }));
    setTimeout(() => {
      const el = document.getElementById(`po-item-desc-${newIdx}`);
      openItemPicker(newIdx, el);
      el?.focus();
    }, 60);
  };

  const removeItem = (idx: number) => {
    setPO((p) => ({
      ...p,
      items: p.items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, slNo: i + 1 }))
    }));
    if (activeItemPickerIndex === idx) closeItemPicker();
  };

  // Calculations
  const totalValue = useMemo(() => {
    return po.items.reduce((s, i) => s + (i.amount || 0), 0);
  }, [po.items]);

  // Determine inter-state (IGST) vs intra-state (CGST + SGST) based on GSTIN state codes
  const compGstin2 = company?.gstin ? company.gstin.trim().slice(0, 2) : "";
  const vendGstin2 = po.vendorGstin ? po.vendorGstin.trim().slice(0, 2) : "";
  const isInterState = Boolean(compGstin2 && vendGstin2 && compGstin2 !== vendGstin2);

  const totalTax = useMemo(() => {
    return po.items.reduce((sum, it) => {
      const rate = (parseFloat(String(it.gstRate)) || 18) / 100;
      return sum + (it.amount || 0) * rate;
    }, 0);
  }, [po.items]);

  const cgstAmt = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const sgstAmt = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const igstAmt = isInterState ? Math.round(totalTax * 100) / 100 : 0;
  const totalTaxAmt = isInterState ? igstAmt : cgstAmt + sgstAmt;

  const grossBeforeRound = totalValue + totalTaxAmt;
  const roundOff = Math.round(grossBeforeRound) - grossBeforeRound;
  const grossAmount = Math.round(grossBeforeRound);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!po.vendorName.trim()) {
      alert("Please select or enter Vendor Name");
      return;
    }
    if (po.items.length === 0) {
      alert("Please add at least one item");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...po,
        totalValue,
        grossAmount,
        items: po.items.map((i) => {
          const q = parseFloat(String(i.qty)) || 0;
          const r = parseFloat(String(i.rate)) || 0;
          const dP = parseFloat(String(i.discountPerc)) || 0;
          const gst = parseFloat(String(i.gstRate)) || 0;
          const gross = q * r;
          const discAmt = Math.round(((gross * dP) / 100) * 100) / 100;
          const amount = Math.round((gross - discAmt) * 100) / 100;
          return {
            ...i,
            qty: q,
            rate: r,
            discountPerc: dP,
            discountAmt: discAmt,
            amount,
            gstRate: gst,
            balanceQty: Math.max(0, q - (i.receivedQty || 0))
          };
        })
      });
    } finally {
      setSaving(false);
    }
  }, [po, totalValue, grossAmount, onSave]);

  // Shortcut Ctrl + A to Save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
      } else if (e.key === "Escape") {
        if (activeItemPickerIndex !== null) {
          e.preventDefault();
          setActiveItemPickerIndex(null);
        } else if (showVendorPanel) {
          e.preventDefault();
          setShowVendorPanel(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, showVendorPanel, activeItemPickerIndex]);

  const inp: React.CSSProperties = {
    border: "1px solid #cbd5e1",
    borderRadius: 3,
    padding: "4px 8px",
    fontSize: 12,
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
    background: "white"
  };
  const lbl: React.CSSProperties = {
    fontSize: 11,
    color: "#475569",
    fontWeight: 600,
    marginBottom: 2,
    display: "block"
  };
  const cel: React.CSSProperties = {
    border: "1px solid #cbd5e1",
    padding: "4px 6px",
    fontSize: 11,
    verticalAlign: "middle"
  };
  const hdr: React.CSSProperties = {
    ...cel,
    background: "#f1f5f9",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 10,
    color: "#1e293b"
  };

  if (showPrint) {
    return (
      <PurchaseOrderPrint
        po={{ ...po, totalValue, grossAmount }}
        company={company}
        onBack={() => setShowPrint(false)}
      />
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#f8fafc", position: "relative" }}>
      {/* Header Toolbar */}
      <div
        style={{
          background: "#1e293b",
          color: "white",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: 4,
            padding: "5px 12px",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: "bold"
          }}
        >
          &#8592; Back (Esc)
        </button>
        <span style={{ fontSize: 15, fontWeight: "bold", letterSpacing: 0.5 }}>
          Purchase Order Entry
        </span>
        <span
          style={{
            fontSize: 11,
            background: "#334155",
            padding: "2px 8px",
            borderRadius: 3,
            color: "#94a3b8"
          }}
        >
          Shortcut: <strong>Ctrl + A</strong> to Save
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowPrint(true)}
            style={{
              background: "#8b5cf6",
              color: "white",
              border: "none",
              borderRadius: 4,
              padding: "5px 14px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: "bold"
            }}
          >
            🖨️ Print Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saving ? "#94a3b8" : "#10b981",
              color: "white",
              border: "none",
              borderRadius: 4,
              padding: "5px 18px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: "bold",
              boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
            }}
          >
            {saving ? "Saving..." : "Save PO (Ctrl+A)"}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            background: "white",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            border: "1px solid #e2e8f0",
            padding: 24
          }}
        >
          {/* Order Info Row 1 */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 14, marginBottom: 12 }}>
            <div>
              <span style={lbl}>Purchase Order No. *</span>
              <input
                style={{ ...inp, fontWeight: "bold", color: "#1e3a8a", background: "#f8fafc" }}
                value={po.poNumber}
                onChange={(e) => updatePO("poNumber", e.target.value)}
              />
            </div>
            <div>
              <span style={lbl}>PO Date *</span>
              <input
                style={inp}
                value={po.poDate}
                onChange={(e) => updatePO("poDate", e.target.value)}
                placeholder="DD-MM-YYYY"
              />
            </div>
            <div>
              <span style={lbl}>Currency</span>
              <select
                style={inp}
                value={po.currency}
                onChange={(e) => updatePO("currency", e.target.value)}
              >
                {["INR", "USD", "EUR", "GBP", "AED"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Order Info Row 2 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 12,
              marginBottom: 12
            }}
          >
            <div>
              <span style={lbl}>Amendment No.</span>
              <input
                style={inp}
                value={po.amendmentNo}
                onChange={(e) => updatePO("amendmentNo", e.target.value)}
              />
            </div>
            <div>
              <span style={lbl}>Amendment Date</span>
              <input
                style={inp}
                value={po.amendmentDate}
                onChange={(e) => updatePO("amendmentDate", e.target.value)}
                placeholder="DD-MM-YYYY"
              />
            </div>
            <div>
              <span style={lbl}>Internal Indent No.</span>
              <input
                style={inp}
                value={po.internalIndentNo}
                onChange={(e) => updatePO("internalIndentNo", e.target.value)}
              />
            </div>
            <div>
              <span style={lbl}>Indent Date</span>
              <input
                style={inp}
                value={po.internalIndentDate}
                onChange={(e) => updatePO("internalIndentDate", e.target.value)}
                placeholder="DD-MM-YYYY"
              />
            </div>
          </div>

          {/* Order Info Row 3 - Auto-filled Company Tax Info */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 12,
              marginBottom: 16,
              background: "#f8fafc",
              padding: 10,
              borderRadius: 6,
              border: "1px solid #e2e8f0"
            }}
          >
            <div>
              <span style={lbl}>Your Quotation No.</span>
              <input
                style={inp}
                value={po.yourQuotationNo}
                onChange={(e) => updatePO("yourQuotationNo", e.target.value)}
              />
            </div>
            <div>
              <span style={lbl}>Company PAN (Auto)</span>
              <input
                style={{ ...inp, background: "#f1f5f9", color: "#334155" }}
                value={po.pan}
                onChange={(e) => updatePO("pan", e.target.value)}
                placeholder="Auto from company"
              />
            </div>
            <div>
              <span style={lbl}>IEC No.</span>
              <input
                style={inp}
                value={po.iecNo}
                onChange={(e) => updatePO("iecNo", e.target.value)}
              />
            </div>
            <div>
              <span style={lbl}>Company GSTIN (Auto)</span>
              <input
                style={{ ...inp, background: "#f1f5f9", color: "#334155", fontWeight: 600 }}
                value={po.gstin}
                onChange={(e) => updatePO("gstin", e.target.value)}
                placeholder="Auto from company"
              />
            </div>
          </div>

          <hr style={{ margin: "16px 0", borderColor: "#e2e8f0" }} />

          {/* VENDOR DETAILS & ORDER TERMS */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, marginBottom: 16 }}>
            {/* Vendor Details */}
            <div
              style={{
                background: "#fdfefe",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: 14
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: 12,
                  marginBottom: 10,
                  color: "#1e3a8a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <span>VENDOR DETAILS</span>
                <span style={{ fontSize: 10, fontWeight: "normal", color: "#64748b" }}>
                  (Enter code or select ledger to auto-fill)
                </span>
              </div>

              {/* Vendor Code with Auto-match */}
              <div style={{ marginBottom: 8 }}>
                <span style={lbl}>Vendor Code</span>
                <input
                  style={inp}
                  value={po.vendorCode}
                  onChange={(e) => handleVendorCodeChange(e.target.value)}
                  placeholder="Type code/alias (e.g. 1, SUP01)..."
                />
              </div>

              {/* Vendor Name with interactive Picker */}
              <div style={{ marginBottom: 8 }}>
                <span style={lbl}>Vendor Name *</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    id="po-vendor-name-input"
                    style={{ ...inp, flex: 1, fontWeight: "bold", background: "#fff" }}
                    value={po.vendorName}
                    onChange={(e) => {
                      updatePO("vendorName", e.target.value);
                      setVendorSearch(e.target.value);
                    }}
                    onClick={(e) => openVendorPicker(e.currentTarget)}
                    onFocus={(e) => openVendorPicker(e.currentTarget)}
                    placeholder="👉 Click to select vendor from ledger list..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const inputEl = document.getElementById("po-vendor-name-input");
                      openVendorPicker(inputEl);
                    }}
                    style={{
                      background: "#0284c7",
                      color: "white",
                      border: "none",
                      borderRadius: 3,
                      padding: "0 12px",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: "bold",
                      whiteSpace: "nowrap"
                    }}
                  >
                    👥 Pick Ledger
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <span style={lbl}>Vendor Address</span>
                <textarea
                  style={{ ...inp, height: 48, resize: "vertical" }}
                  value={po.vendorAddress}
                  onChange={(e) => updatePO("vendorAddress", e.target.value)}
                />
              </div>
              <div>
                <span style={lbl}>Vendor GSTIN</span>
                <input
                  style={inp}
                  value={po.vendorGstin}
                  onChange={(e) => updatePO("vendorGstin", e.target.value)}
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
            </div>

            {/* Order Terms */}
            <div
              style={{
                background: "#fdfefe",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: 14
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: 12,
                  marginBottom: 10,
                  color: "#1e3a8a"
                }}
              >
                ORDER TERMS
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={lbl}>Terms of Delivery</span>
                <input
                  style={inp}
                  value={po.termsOfDelivery}
                  onChange={(e) => updatePO("termsOfDelivery", e.target.value)}
                  placeholder="Ex-Works / FOR Destination"
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={lbl}>Terms of Payment</span>
                <input
                  style={inp}
                  value={po.termsOfPayment}
                  onChange={(e) => updatePO("termsOfPayment", e.target.value)}
                  placeholder=":30 days"
                />
              </div>
              <div>
                <span style={lbl}>Contact Purchase Representatives</span>
                <input
                  style={inp}
                  value={po.contactPurchaseRep}
                  onChange={(e) => updatePO("contactPurchaseRep", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* INVOICE FROM & DELIVER TO (Auto-populated) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div
              style={{
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                borderRadius: 6,
                padding: 12
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: 11,
                  marginBottom: 6,
                  color: "#334155",
                  display: "flex",
                  justifyContent: "space-between"
                }}
              >
                <span>Invoice From: (Vendor)</span>
                <span style={{ fontSize: 10, color: "#64748b" }}>Auto-filled from vendor</span>
              </div>
              <input
                style={{ ...inp, marginBottom: 4 }}
                value={po.invoiceFromName}
                onChange={(e) => updatePO("invoiceFromName", e.target.value)}
                placeholder="Vendor / Invoice From Name"
              />
              <textarea
                style={{ ...inp, height: 44, resize: "none", marginBottom: 4 }}
                value={po.invoiceFromAddress}
                onChange={(e) => updatePO("invoiceFromAddress", e.target.value)}
                placeholder="Vendor Address"
              />
              <input
                style={inp}
                value={po.invoiceFromGstin}
                onChange={(e) => updatePO("invoiceFromGstin", e.target.value)}
                placeholder="Vendor GSTIN"
              />
            </div>

            <div
              style={{
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                borderRadius: 6,
                padding: 12
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: 11,
                  marginBottom: 6,
                  color: "#334155",
                  display: "flex",
                  justifyContent: "space-between"
                }}
              >
                <span>Deliver To: (Company)</span>
                <span style={{ fontSize: 10, color: "#64748b" }}>Auto-filled from company</span>
              </div>
              <input
                style={{ ...inp, marginBottom: 4 }}
                value={po.deliverToName}
                onChange={(e) => updatePO("deliverToName", e.target.value)}
                placeholder="Company Name"
              />
              <textarea
                style={{ ...inp, height: 44, resize: "none", marginBottom: 4 }}
                value={po.deliverToAddress}
                onChange={(e) => updatePO("deliverToAddress", e.target.value)}
                placeholder="Company Delivery Address"
              />
              <input
                style={inp}
                value={po.deliverToGstin}
                onChange={(e) => updatePO("deliverToGstin", e.target.value)}
                placeholder="Company GSTIN"
              />
            </div>
          </div>

          <hr style={{ margin: "16px 0", borderColor: "#e2e8f0" }} />

          {/* ITEMS / MATERIALS TABLE */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8
            }}
          >
            <div style={{ fontWeight: "bold", fontSize: 13, color: "#1e293b" }}>
              Items / Materials Details
            </div>
            <div style={{ fontSize: 11, color: "#0369a1", fontWeight: "bold" }}>
              👉 Click on <strong>Description / Item Name</strong> or <strong>📦 Pick</strong> to choose stock item
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  {[
                    "SL",
                    "HSN CODE",
                    "DESCRIPTION / ITEM NAME",
                    "PART NO.",
                    "GST%",
                    "REQUIRED BY",
                    "UOM",
                    "QTY",
                    "RATE",
                    "DISC%",
                    "AMOUNT",
                    ""
                  ].map((h, i) => (
                    <th key={i} style={hdr}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {po.items.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                      No items added yet. Click <strong>&quot;+ Add Item&quot;</strong> below to select stock item.
                    </td>
                  </tr>
                ) : (
                  po.items.map((item, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? "white" : "#fcfcfc" }}>
                      <td style={{ ...cel, textAlign: "center", width: 28, color: "#64748b" }}>
                        {item.slNo}
                      </td>
                      <td style={{ ...cel, width: 75 }}>
                        <input
                          style={{ ...inp, border: "none", padding: "2px 4px" }}
                          value={item.hsnCode}
                          onChange={(e) => updateItem(idx, "hsnCode", e.target.value)}
                          placeholder="HSN"
                        />
                      </td>
                      {/* Description input with Prominent Pick Button */}
                      <td style={{ ...cel, minWidth: 240 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <input
                            id={`po-item-desc-${idx}`}
                            style={{
                              ...inp,
                              border: activeItemPickerIndex === idx ? "2px solid #0284c7" : "1px solid #cbd5e1",
                              padding: "4px 6px",
                              fontWeight: item.description ? "bold" : "normal",
                              color: item.description ? "#0f172a" : "#64748b",
                              background: "#fff",
                              flex: 1
                            }}
                            value={item.description}
                            onChange={(e) => {
                              updateItem(idx, "description", e.target.value);
                              setItemSearch(e.target.value);
                            }}
                            onClick={(e) => openItemPicker(idx, e.currentTarget)}
                            onFocus={(e) => openItemPicker(idx, e.currentTarget)}
                            onKeyDown={(e) => {
                              if (e.key === "ArrowDown" || e.key === "Enter") {
                                openItemPicker(idx, e.currentTarget);
                              }
                            }}
                            placeholder="👉 Click to select stock item..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById(`po-item-desc-${idx}`);
                              openItemPicker(idx, el);
                            }}
                            style={{
                              background: "#0284c7",
                              color: "white",
                              border: "none",
                              borderRadius: 3,
                              padding: "4px 8px",
                              cursor: "pointer",
                              fontSize: 11,
                              fontWeight: "bold",
                              whiteSpace: "nowrap"
                            }}
                            title="Click to open Stock Items List"
                          >
                            📦 Pick
                          </button>
                        </div>
                      </td>
                      <td style={{ ...cel, width: 70 }}>
                        <input
                          style={{ ...inp, border: "none", padding: "2px 4px" }}
                          value={item.partNo}
                          onChange={(e) => updateItem(idx, "partNo", e.target.value)}
                          placeholder="Part No"
                        />
                      </td>
                      <td style={{ ...cel, width: 45, textAlign: "center" }}>
                        <input
                          style={{
                            ...inp,
                            border: "none",
                            padding: "2px 4px",
                            textAlign: "center"
                          }}
                          value={item.gstRate ?? ""}
                          onChange={(e) => updateItem(idx, "gstRate", e.target.value)}
                          placeholder="18"
                        />
                      </td>
                      <td style={{ ...cel, width: 85 }}>
                        <input
                          style={{ ...inp, border: "none", padding: "2px 4px" }}
                          value={item.requiredBy}
                          onChange={(e) => updateItem(idx, "requiredBy", e.target.value)}
                          placeholder="DD-MM-YYYY"
                        />
                      </td>
                      <td style={{ ...cel, width: 55 }}>
                        <input
                          style={{
                            ...inp,
                            border: "none",
                            padding: "2px 4px",
                            textAlign: "center"
                          }}
                          value={item.uom}
                          onChange={(e) => updateItem(idx, "uom", e.target.value)}
                        />
                      </td>
                      <td style={{ ...cel, width: 65 }}>
                        <input
                          id={`po-item-qty-${idx}`}
                          style={{
                            ...inp,
                            border: "none",
                            padding: "2px 4px",
                            textAlign: "right",
                            fontWeight: "bold",
                            background: "#eff6ff"
                          }}
                          value={item.qty ?? ""}
                          onChange={(e) => updateItem(idx, "qty", e.target.value)}
                          placeholder="0"
                        />
                      </td>
                      <td style={{ ...cel, width: 80 }}>
                        <input
                          id={`po-item-rate-${idx}`}
                          style={{
                            ...inp,
                            border: "none",
                            padding: "2px 4px",
                            textAlign: "right",
                            fontWeight: "bold",
                            background: "#eff6ff"
                          }}
                          value={item.rate ?? ""}
                          onChange={(e) => updateItem(idx, "rate", e.target.value)}
                          placeholder="0.00"
                        />
                      </td>
                      <td style={{ ...cel, width: 50 }}>
                        <input
                          style={{
                            ...inp,
                            border: "none",
                            padding: "2px 4px",
                            textAlign: "right"
                          }}
                          value={item.discountPerc ?? ""}
                          onChange={(e) => updateItem(idx, "discountPerc", e.target.value)}
                          placeholder="0"
                        />
                      </td>
                      <td style={{ ...cel, width: 90, textAlign: "right", fontWeight: "bold" }}>
                        {fmt(item.amount || 0)}
                      </td>
                      <td style={{ ...cel, width: 28, textAlign: "center" }}>
                        <button
                          onClick={() => removeItem(idx)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: 16,
                            lineHeight: 1
                          }}
                          title="Remove row"
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              onClick={addItem}
              style={{
                background: "#0284c7",
                color: "white",
                border: "none",
                borderRadius: 4,
                padding: "7px 18px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: "bold",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}
            >
              + Add Item (Auto-opens Stock Item List)
            </button>
            <span style={{ fontSize: 11, color: "#64748b" }}>
              Total items: <strong>{po.items.length}</strong>
            </span>
          </div>

          {/* TOTALS & TAX CALCULATION PANEL */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, marginTop: 24 }}>
            {/* Specific Terms */}
            <div>
              <div style={{ fontWeight: "bold", fontSize: 12, marginBottom: 8, color: "#1e293b" }}>
                Specific Terms and Conditions
              </div>
              {po.specificTerms.map((term, ti) => (
                <div
                  key={ti}
                  style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "flex-start" }}
                >
                  <span style={{ fontSize: 11, minWidth: 16, fontWeight: "bold", paddingTop: 4 }}>
                    {ti + 1}.
                  </span>
                  <input
                    style={{ ...inp, flex: 1 }}
                    value={term}
                    onChange={(e) => {
                      const t = [...po.specificTerms];
                      t[ti] = e.target.value;
                      updatePO("specificTerms", t);
                    }}
                  />
                  <button
                    onClick={() => {
                      const t = po.specificTerms.filter((_, i) => i !== ti);
                      updatePO("specificTerms", t);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: 14
                    }}
                  >
                    &times;
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => updatePO("specificTerms", [...po.specificTerms, ""])}
                style={{
                  marginTop: 4,
                  background: "#64748b",
                  color: "white",
                  border: "none",
                  borderRadius: 3,
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontSize: 11
                }}
              >
                + Add Term
              </button>
            </div>

            {/* Fully Calculated Summary */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: 16
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: "bold",
                  color: "#1e293b",
                  marginBottom: 8,
                  borderBottom: "1px solid #e2e8f0",
                  paddingBottom: 4
                }}
              >
                ORDER SUMMARY
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  fontSize: 11
                }}
              >
                <span>TOTAL VALUE (Taxable)</span>
                <strong>{fmt(totalValue)}</strong>
              </div>

              {isInterState ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "4px 0",
                    fontSize: 11,
                    color: "#0369a1"
                  }}
                >
                  <span>IGST (Inter-State)</span>
                  <strong>{fmt(igstAmt)}</strong>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 0",
                      fontSize: 11
                    }}
                  >
                    <span>CGST</span>
                    <span>{fmt(cgstAmt)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 0",
                      fontSize: 11
                    }}
                  >
                    <span>SGST</span>
                    <span>{fmt(sgstAmt)}</span>
                  </div>
                </>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  fontSize: 11,
                  color: "#64748b"
                }}
              >
                <span>Rounding Off</span>
                <span>{fmt(Math.abs(roundOff))}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  borderTop: "2px solid #0f172a",
                  fontWeight: "bold",
                  fontSize: 13,
                  marginTop: 6
                }}
              >
                <span>GROSS AMOUNT</span>
                <span style={{ color: "#1e3a8a" }}>₹ {fmt(grossAmount)}</span>
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 10,
                  fontStyle: "italic",
                  color: "#475569",
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: 8
                }}
              >
                <strong>AMOUNT IN WORDS:</strong>
                <br />
                {numberToWords(grossAmount)}
              </div>
            </div>
          </div>

          <hr style={{ margin: "16px 0", borderColor: "#e2e8f0" }} />

          {/* Signatories */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              marginBottom: 12
            }}
          >
            <div>
              <span style={lbl}>Prepared By</span>
              <input
                style={inp}
                value={po.preparedBy}
                onChange={(e) => updatePO("preparedBy", e.target.value)}
              />
            </div>
            <div>
              <span style={lbl}>Approved By</span>
              <input
                style={inp}
                value={po.approvedBy}
                onChange={(e) => updatePO("approvedBy", e.target.value)}
              />
            </div>
            <div>
              <span style={lbl}>Finance Check</span>
              <input
                style={inp}
                value={po.financeCheck}
                onChange={(e) => updatePO("financeCheck", e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <span style={lbl}>Narration</span>
            <input
              style={inp}
              value={po.narration}
              onChange={(e) => updatePO("narration", e.target.value)}
            />
          </div>

          {/* T&C Checkbox */}
          <div
            style={{
              marginTop: 14,
              padding: 12,
              background: "#fffbeb",
              borderRadius: 6,
              border: "1px solid #fde68a",
              display: "flex",
              alignItems: "center",
              gap: 10
            }}
          >
            <input
              type="checkbox"
              id="enableTnC"
              checked={po.enableTnC}
              onChange={(e) => updatePO("enableTnC", e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <label
              htmlFor="enableTnC"
              style={{ fontSize: 12, cursor: "pointer", fontWeight: "bold", color: "#92400e" }}
            >
              Enable Terms &amp; Conditions Pages in Print
            </label>
            <span style={{ fontSize: 11, color: "#b45309", marginLeft: 4 }}>
              ({TNC_SECTIONS.length} pages will print after Page 1 when enabled)
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🚀 IN-PLACE FLOATING DROPDOWN: STOCK ITEMS (NICHE DROPDOWN) */}
      {/* ========================================================= */}
      {activeItemPickerIndex !== null && itemDropdownPos && (
        <>
          <div
            onClick={closeItemPicker}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99998
            }}
          />
          <div
            style={{
              position: "fixed",
              top: Math.min(itemDropdownPos.top, window.innerHeight - 340),
              left: Math.max(10, Math.min(itemDropdownPos.left, window.innerWidth - 480)),
              width: 460,
              maxWidth: "94vw",
              maxHeight: 330,
              background: "white",
              borderRadius: 6,
              boxShadow: "0 12px 36px rgba(0,0,0,0.25), 0 0 0 1px #94a3b8",
              zIndex: 99999,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                background: "#0f172a",
                color: "white",
                padding: "8px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div style={{ fontSize: 12, fontWeight: "bold", display: "flex", alignItems: "center", gap: 6 }}>
                <span>📦</span> Select Stock Item (Row #{activeItemPickerIndex + 1})
              </div>
              <button
                type="button"
                onClick={closeItemPicker}
                style={{
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: 3,
                  width: 22,
                  height: 22,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: "bold"
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "6px 10px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 8, alignItems: "center" }}>
              <input
                autoFocus
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="🔍 Type item name, HSN, alias..."
                style={{
                  flex: 1,
                  padding: "5px 8px",
                  border: "1px solid #0284c7",
                  borderRadius: 4,
                  fontSize: 12,
                  outline: "none"
                }}
              />
              <button
                type="button"
                onClick={() => setShowQuickAddModal(true)}
                style={{
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  padding: "5px 10px",
                  fontSize: 11,
                  cursor: "pointer",
                  fontWeight: "bold",
                  whiteSpace: "nowrap"
                }}
              >
                + New Item
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", maxHeight: 240, padding: 4 }}>
              {filteredStockItems.length === 0 ? (
                <div style={{ padding: "18px 12px", textAlign: "center", color: "#64748b", fontSize: 12 }}>
                  <div>No stock items found {itemSearch ? `matching "${itemSearch}"` : ""}.</div>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddModal(true)}
                    style={{
                      marginTop: 8,
                      background: "#0284c7",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      padding: "5px 12px",
                      fontSize: 11,
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    + Create New Stock Item
                  </button>
                </div>
              ) : (
                filteredStockItems.map((stk) => (
                  <div
                    key={stk.id}
                    onClick={() => selectStockItem(activeItemPickerIndex, stk)}
                    style={{
                      padding: "8px 10px",
                      borderBottom: "1px solid #f1f5f9",
                      borderRadius: 4,
                      cursor: "pointer",
                      transition: "background 0.1s"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: 12, color: "#0f172a" }}>{stk.name}</strong>
                      <span style={{ fontSize: 12, fontWeight: "bold", color: "#059669" }}>
                        ₹ {fmt((stk as any).openingRate || (stk as any).rate || 0)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 2, fontSize: 10, color: "#64748b", flexWrap: "wrap" }}>
                      {stk.hsnCode && <span style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 2 }}>HSN: {stk.hsnCode}</span>}
                      <span style={{ background: "#f0fdf4", color: "#166534", padding: "1px 5px", borderRadius: 2 }}>GST: {stk.gstRate ?? 18}%</span>
                      <span style={{ background: "#fef3c7", color: "#92400e", padding: "1px 5px", borderRadius: 2 }}>Unit: {(stk as any).unitName || (typeof stk.unit === "string" ? stk.unit : stk.unit?.symbol || stk.unit?.name) || "Nos"}</span>
                      {(stk as any).alias && <span style={{ background: "#ede9fe", color: "#6d28d9", padding: "1px 5px", borderRadius: 2 }}>Alias: {(stk as any).alias}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: "4px 8px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", fontSize: 10, color: "#64748b", display: "flex", justifyContent: "space-between" }}>
              <span>{filteredStockItems.length} items available</span>
              <span>Click to select &amp; auto-fill</span>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* 🚀 IN-PLACE FLOATING DROPDOWN: VENDORS / LEDGERS */}
      {/* ========================================================= */}
      {showVendorPanel && vendorDropdownPos && (
        <>
          <div
            onClick={closeVendorPicker}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99998
            }}
          />
          <div
            style={{
              position: "fixed",
              top: Math.min(vendorDropdownPos.top, window.innerHeight - 340),
              left: Math.max(10, Math.min(vendorDropdownPos.left, window.innerWidth - 440)),
              width: 420,
              maxWidth: "94vw",
              maxHeight: 320,
              background: "white",
              borderRadius: 6,
              boxShadow: "0 12px 36px rgba(0,0,0,0.25), 0 0 0 1px #94a3b8",
              zIndex: 99999,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                background: "#0f172a",
                color: "white",
                padding: "8px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div style={{ fontSize: 12, fontWeight: "bold", display: "flex", alignItems: "center", gap: 6 }}>
                <span>👥</span> Select Vendor / Supplier Ledger
              </div>
              <button
                type="button"
                onClick={closeVendorPicker}
                style={{
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: 3,
                  width: 22,
                  height: 22,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: "bold"
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "6px 10px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <input
                autoFocus
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                placeholder="🔍 Type vendor name, GSTIN, alias..."
                style={{
                  width: "100%",
                  padding: "5px 8px",
                  border: "1px solid #1e3a8a",
                  borderRadius: 4,
                  fontSize: 12,
                  boxSizing: "border-box",
                  outline: "none"
                }}
              />
            </div>

            <div style={{ flex: 1, overflowY: "auto", maxHeight: 240, padding: 4 }}>
              {filteredVendors.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontSize: 12 }}>
                  No matching ledgers found
                </div>
              ) : (
                filteredVendors.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => selectVendor(l)}
                    style={{
                      padding: "8px 10px",
                      borderBottom: "1px solid #f1f5f9",
                      borderRadius: 4,
                      cursor: "pointer",
                      transition: "background 0.1s"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: 12, color: "#0f172a" }}>{l.name}</strong>
                        {l.alias && (
                          <span style={{ color: "#0284c7", marginLeft: 4, fontSize: 10 }}>({l.alias})</span>
                        )}
                      </div>
                      <span
                        style={{
                          background: l.groupName === "Sundry Creditors" ? "#e0f2fe" : "#f1f5f9",
                          color: l.groupName === "Sundry Creditors" ? "#0369a1" : "#475569",
                          padding: "1px 6px",
                          borderRadius: 3,
                          fontSize: 9,
                          fontWeight: "bold"
                        }}
                      >
                        {l.groupName}
                      </span>
                    </div>
                    {l.gstin && (
                      <div style={{ fontSize: 10, color: "#059669", marginTop: 2 }}>
                        GSTIN: <strong>{l.gstin}</strong>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: "4px 8px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", fontSize: 10, color: "#64748b", textAlign: "right" }}>
              {filteredVendors.length} ledgers • Click to auto-fill
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* 🚀 RIGHT-SIDE FIXED PANEL: LIST OF STOCK ITEMS (TALLY STYLE) */}
      {/* ========================================================= */}
      {activeItemPickerIndex !== null && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: 440,
            maxWidth: "92vw",
            background: "white",
            boxShadow: "-6px 0 30px rgba(0,0,0,0.28)",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            borderLeft: "3px solid #0284c7"
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "#0f172a",
              color: "white",
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div>
              <div style={{ fontWeight: "bold", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <span>📦</span> List of Stock Items
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                Selecting for Row #{activeItemPickerIndex + 1}
              </div>
            </div>
            <button
              type="button"
              onClick={closeItemPicker}
              style={{
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: 4,
                width: 28,
                height: 28,
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: 14
              }}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Search Box */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <input
              autoFocus
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="🔍 Type to search item name, HSN, alias..."
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "2px solid #0284c7",
                borderRadius: 6,
                fontSize: 13,
                boxSizing: "border-box",
                outline: "none"
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#64748b" }}>
                Click an item to auto-fill HSN, Unit, GST &amp; Rate
              </span>
              <button
                type="button"
                onClick={() => setShowQuickAddModal(true)}
                style={{
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: 3,
                  padding: "2px 8px",
                  fontSize: 10,
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                + New Item
              </button>
            </div>
          </div>

          {/* Items List */}
          <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
            {filteredStockItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
                <div style={{ fontWeight: "bold", fontSize: 14, color: "#1e293b" }}>No Stock Items Found</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                  {itemSearch ? `No item matches "${itemSearch}"` : "No stock items created in this company yet"}
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(true)}
                  style={{
                    marginTop: 16,
                    background: "#0284c7",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    padding: "8px 16px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: "bold"
                  }}
                >
                  + Create New Stock Item Now
                </button>
              </div>
            ) : (
              filteredStockItems.map((stk) => (
                <div
                  key={stk.id}
                  onClick={() => selectStockItem(activeItemPickerIndex, stk)}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    cursor: "pointer",
                    marginBottom: 6,
                    background: "white",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#eff6ff";
                    e.currentTarget.style.borderColor = "#0284c7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontWeight: "bold", fontSize: 13, color: "#0f172a" }}>
                      {stk.name}
                    </div>
                    <div style={{ fontWeight: "bold", color: "#059669", fontSize: 13 }}>
                      ₹ {fmt((stk as any).openingRate || (stk as any).rate || 0)}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 4,
                      fontSize: 10,
                      color: "#64748b",
                      flexWrap: "wrap"
                    }}
                  >
                    <span style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 3 }}>
                      HSN: <strong>{stk.hsnCode || "-"}</strong>
                    </span>
                    <span style={{ background: "#f0fdf4", color: "#166534", padding: "2px 6px", borderRadius: 3 }}>
                      GST: <strong>{stk.gstRate ?? 18}%</strong>
                    </span>
                    <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 3 }}>
                      Unit: <strong>{(stk as any).unitName || (typeof stk.unit === "string" ? stk.unit : stk.unit?.name) || "Nos"}</strong>
                    </span>
                    {(stk as any).alias && (
                      <span style={{ background: "#ede9fe", color: "#6d28d9", padding: "2px 6px", borderRadius: 3 }}>
                        Part/Alias: {(stk as any).alias}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "10px 16px",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 11,
              color: "#64748b"
            }}
          >
            <span>{filteredStockItems.length} items available</span>
            <button
              type="button"
              onClick={closeItemPicker}
              style={{
                background: "#64748b",
                color: "white",
                border: "none",
                borderRadius: 4,
                padding: "4px 12px",
                cursor: "pointer",
                fontSize: 11
              }}
            >
              Close (Esc)
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🚀 RIGHT-SIDE FIXED PANEL: LIST OF LEDGERS / VENDORS */}
      {/* ========================================================= */}
      {showVendorPanel && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: 440,
            maxWidth: "92vw",
            background: "white",
            boxShadow: "-6px 0 30px rgba(0,0,0,0.28)",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            borderLeft: "3px solid #1e3a8a"
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "#0f172a",
              color: "white",
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div>
              <div style={{ fontWeight: "bold", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <span>👥</span> List of Ledger Accounts
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                Select Vendor / Supplier to Auto-Fill
              </div>
            </div>
            <button
              type="button"
              onClick={closeVendorPicker}
              style={{
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: 4,
                width: 28,
                height: 28,
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: 14
              }}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Search Box */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <input
              autoFocus
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              placeholder="🔍 Type vendor name, GSTIN, alias..."
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "2px solid #1e3a8a",
                borderRadius: 6,
                fontSize: 13,
                boxSizing: "border-box",
                outline: "none"
              }}
            />
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
              Click a ledger to auto-fill Vendor Code, Name, GSTIN &amp; Address
            </div>
          </div>

          {/* Ledgers List */}
          <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
            {filteredVendors.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
                <div style={{ fontWeight: "bold", fontSize: 14 }}>No Matching Ledgers</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                  Try a different search term
                </div>
              </div>
            ) : (
              filteredVendors.map((l) => (
                <div
                  key={l.id}
                  onClick={() => selectVendor(l)}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    cursor: "pointer",
                    marginBottom: 6,
                    background: "white",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#eff6ff";
                    e.currentTarget.style.borderColor = "#1e3a8a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <strong style={{ fontSize: 13, color: "#0f172a" }}>{l.name}</strong>
                      {l.alias && (
                        <span style={{ color: "#0284c7", marginLeft: 6, fontSize: 11 }}>
                          ({l.alias})
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        background: l.groupName === "Sundry Creditors" ? "#e0f2fe" : "#f1f5f9",
                        color: l.groupName === "Sundry Creditors" ? "#0369a1" : "#475569",
                        padding: "2px 8px",
                        borderRadius: 3,
                        fontSize: 9,
                        fontWeight: "bold"
                      }}
                    >
                      {l.groupName}
                    </span>
                  </div>
                  {l.gstin && (
                    <div style={{ fontSize: 11, color: "#059669", marginTop: 3 }}>
                      GSTIN: <strong>{l.gstin}</strong>
                    </div>
                  )}
                  {l.address && (
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                      {l.address.slice(0, 60)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "10px 16px",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 11,
              color: "#64748b"
            }}
          >
            <span>{filteredVendors.length} ledgers found</span>
            <button
              type="button"
              onClick={closeVendorPicker}
              style={{
                background: "#64748b",
                color: "white",
                border: "none",
                borderRadius: 4,
                padding: "4px 12px",
                cursor: "pointer",
                fontSize: 11
              }}
            >
              Close (Esc)
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🚀 QUICK ADD STOCK ITEM MODAL */}
      {/* ========================================================= */}
      {showQuickAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100000
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 8,
              padding: 20,
              width: 400,
              maxWidth: "90vw",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)"
            }}
          >
            <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 12, color: "#1e293b" }}>
              📦 Create New Stock Item
            </div>
            <div style={{ marginBottom: 10 }}>
              <span style={lbl}>Item Name *</span>
              <input
                autoFocus
                style={inp}
                value={quickItemName}
                onChange={(e) => setQuickItemName(e.target.value)}
                placeholder="e.g. Copper Wire 2.5mm"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <span style={lbl}>HSN Code</span>
                <input
                  style={inp}
                  value={quickItemHsn}
                  onChange={(e) => setQuickItemHsn(e.target.value)}
                  placeholder="e.g. 7408"
                />
              </div>
              <div>
                <span style={lbl}>Unit / UOM</span>
                <input
                  style={inp}
                  value={quickItemUnit}
                  onChange={(e) => setQuickItemUnit(e.target.value)}
                  placeholder="Nos / Kg / Mtr"
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div>
                <span style={lbl}>GST Rate %</span>
                <input
                  type="number"
                  style={inp}
                  value={quickItemGst}
                  onChange={(e) => setQuickItemGst(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <span style={lbl}>Default Rate (₹)</span>
                <input
                  type="number"
                  style={inp}
                  value={quickItemRate || ""}
                  onChange={(e) => setQuickItemRate(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowQuickAddModal(false)}
                style={{
                  background: "#64748b",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontSize: 12
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickAddStockItem}
                disabled={quickItemCreating}
                style={{
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  padding: "6px 16px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: "bold"
                }}
              >
                {quickItemCreating ? "Creating..." : "Save & Select"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== PURCHASE ORDER REGISTER ====================
export function PurchaseOrderRegister({
  company,
  onBack,
  onNewPO,
  onEditPO,
  onPrintPO
}: {
  company: Company | null;
  onBack: () => void;
  onNewPO: () => void;
  onEditPO: (po: PurchaseOrderData) => void;
  onPrintPO: (po: PurchaseOrderData) => void;
}) {
  const [pos, setPOs] = useState<PurchaseOrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchPOs = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders?companyId=${company.id}`);
      const data = await res.json();
      if (data.success) setPOs(data.purchaseOrders || []);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchPOs();
  }, [fetchPOs]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this Purchase Order?")) return;
    setDeleting(id);
    try {
      await fetch("/api/purchase-orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      setPOs((p) => p.filter((po) => po.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const sc = (s: string) => (s === "Closed" ? "#27ae60" : s === "PartiallyReceived" ? "#f39c12" : "#2980b9");
  const sb = (s: string) => (s === "Closed" ? "#eafaf1" : s === "PartiallyReceived" ? "#fef9e7" : "#ebf5fb");

  const filtered = pos.filter(
    (p) =>
      (!search ||
        p.poNumber.toLowerCase().includes(search.toLowerCase()) ||
        p.vendorName.toLowerCase().includes(search.toLowerCase())) &&
      (statusFilter === "All" || p.status === statusFilter)
  );

  const th: React.CSSProperties = {
    padding: "8px 10px",
    background: "#1a1a2e",
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
    whiteSpace: "nowrap"
  };
  const td: React.CSSProperties = {
    padding: "7px 10px",
    borderBottom: "1px solid #eee",
    fontSize: 11,
    verticalAlign: "middle"
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#f0f2f5" }}>
      <div
        style={{
          background: "#1a1a2e",
          color: "white",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "#e74c3c",
            color: "white",
            border: "none",
            borderRadius: 4,
            padding: "4px 12px",
            cursor: "pointer",
            fontSize: 12
          }}
        >
          &#8592; Back
        </button>
        <span style={{ fontSize: 15, fontWeight: "bold" }}>Purchase Order Register</span>
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={onNewPO}
            style={{
              background: "#27ae60",
              color: "white",
              border: "none",
              borderRadius: 4,
              padding: "4px 14px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: "bold"
            }}
          >
            + New PO (Ctrl+F9)
          </button>
        </div>
      </div>
      <div
        style={{
          background: "white",
          padding: "8px 16px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          borderBottom: "1px solid #e0e0e0",
          flexShrink: 0
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by PO No or Vendor..."
          style={{ border: "1px solid #ccc", borderRadius: 4, padding: "4px 10px", fontSize: 12, width: 220 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ border: "1px solid #ccc", borderRadius: 4, padding: "4px 8px", fontSize: 12 }}
        >
          {["All", "Open", "PartiallyReceived", "Closed"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: "#666", marginLeft: "auto" }}>{filtered.length} orders</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#888" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: "bold" }}>No Purchase Orders Found</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>Click &quot;+ New PO&quot; to create one</div>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[
                    "PO Number",
                    "Date",
                    "Vendor",
                    "Items",
                    "Total Qty",
                    "Recv Qty",
                    "Balance Qty",
                    "Amount",
                    "Status",
                    "Actions"
                  ].map((h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((po, i) => {
                  const tq = po.items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
                  const rq = po.items.reduce((s, it) => s + (Number(it.receivedQty) || 0), 0);
                  const bq = po.items.reduce((s, it) => s + (Number(it.balanceQty) || 0), 0);
                  return (
                    <tr key={po.id || i} style={{ background: i % 2 === 0 ? "white" : "#fafafa" }}>
                      <td style={{ ...td, fontWeight: "bold", color: "#1a1a2e" }}>{po.poNumber}</td>
                      <td style={td}>{formatDate(po.poDate)}</td>
                      <td style={{ ...td, maxWidth: 180 }}>
                        <div style={{ fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {po.vendorName}
                        </div>
                        {po.vendorGstin && <div style={{ fontSize: 10, color: "#888" }}>{po.vendorGstin}</div>}
                      </td>
                      <td style={{ ...td, textAlign: "center" }}>{po.items.length}</td>
                      <td style={{ ...td, textAlign: "right" }}>{fmt(tq)}</td>
                      <td style={{ ...td, textAlign: "right", color: "#27ae60" }}>{fmt(rq)}</td>
                      <td style={{ ...td, textAlign: "right", color: bq > 0 ? "#e74c3c" : "#27ae60", fontWeight: "bold" }}>
                        {fmt(bq)}
                      </td>
                      <td style={{ ...td, textAlign: "right", fontWeight: "bold" }}>
                        ₹ {fmt(po.grossAmount || po.totalValue || 0)}
                      </td>
                      <td style={td}>
                        <span
                          style={{
                            background: sb(po.status || "Open"),
                            color: sc(po.status || "Open"),
                            padding: "2px 8px",
                            borderRadius: 10,
                            fontSize: 10,
                            fontWeight: "bold",
                            border: `1px solid ${sc(po.status || "Open")}`,
                            whiteSpace: "nowrap"
                          }}
                        >
                          {po.status || "Open"}
                        </span>
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            onClick={() => onEditPO(po)}
                            style={{
                              background: "#2980b9",
                              color: "white",
                              border: "none",
                              borderRadius: 3,
                              padding: "2px 8px",
                              cursor: "pointer",
                              fontSize: 10
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onPrintPO(po)}
                            style={{
                              background: "#8e44ad",
                              color: "white",
                              border: "none",
                              borderRadius: 3,
                              padding: "2px 8px",
                              cursor: "pointer",
                              fontSize: 10
                            }}
                          >
                            Print
                          </button>
                          <button
                            onClick={() => po.id && handleDelete(po.id)}
                            disabled={deleting === po.id}
                            style={{
                              background: "#e74c3c",
                              color: "white",
                              border: "none",
                              borderRadius: 3,
                              padding: "2px 8px",
                              cursor: "pointer",
                              fontSize: 10
                            }}
                          >
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== PURCHASE ORDER PRINT ====================
export function PurchaseOrderPrint({
  po,
  company,
  onBack
}: {
  po: PurchaseOrderData;
  company: Company | null;
  onBack: () => void;
}) {
  const totalPages = po.enableTnC ? 1 + TNC_SECTIONS.length : 1;
  const ISODoc = "AL-PUR-F-01";
  const bdr = "1px solid #222";
  const tdB: React.CSSProperties = { border: bdr, padding: "3.5px 5px", fontSize: 9.5, verticalAlign: "middle", color: "#000" };
  const tdH: React.CSSProperties = {
    ...tdB,
    background: "#e8e8e8",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 9.5
  };

  const totalValue = po.items.reduce((s, i) => s + (i.amount || 0), 0);

  // Check inter-state vs intra-state
  const compGstin2 = company?.gstin ? company.gstin.trim().slice(0, 2) : "";
  const vendGstin2 = po.vendorGstin ? po.vendorGstin.trim().slice(0, 2) : "";
  const isInterState = Boolean(compGstin2 && vendGstin2 && compGstin2 !== vendGstin2);

  const totalTax = po.items.reduce((sum, it) => {
    const rate = (Number(it.gstRate) || 18) / 100;
    return sum + (it.amount || 0) * rate;
  }, 0);

  const cgstAmt = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const sgstAmt = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const igstAmt = isInterState ? Math.round(totalTax * 100) / 100 : 0;
  const totalTaxAmt = isInterState ? igstAmt : cgstAmt + sgstAmt;

  const grossBeforeRound = totalValue + totalTaxAmt;
  const roundOff = Math.round(grossBeforeRound) - grossBeforeRound;
  const grossAmount = po.grossAmount || Math.round(grossBeforeRound);

  // Minimum rows so that PO fills the A4 page proportionately without empty gaps
  const minRows = 8;
  const blankRowsCount = Math.max(0, minRows - po.items.length);

  const MainPage = () => (
    <div
      className="po-page po-main-page"
      style={{
        width: "210mm",
        minHeight: "297mm",
        margin: "0 auto 30px auto",
        background: "white",
        fontFamily: '"Arial Narrow",Arial,sans-serif',
        fontSize: 10,
        padding: 0,
        boxSizing: "border-box",
        position: "relative",
        border: "1.5px solid #222",
        boxShadow: "0 4px 15px rgba(0,0,0,0.25)"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: bdr,
          padding: "8px 10px 6px 10px",
          marginBottom: 0
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: "bold", letterSpacing: 1, color: "#000" }}>PURCHASE ORDER</div>
          <div style={{ fontSize: 13, fontWeight: "bold", marginTop: 2 }}>{company?.mailingName || company?.name}</div>
          {company?.mailingName && (
            <div style={{ fontSize: 9.5, fontStyle: "italic" }}>(formerly {company?.name})</div>
          )}
          <div style={{ marginTop: 3, fontSize: 9.5, whiteSpace: "pre-wrap", lineHeight: 1.35 }}>{company?.address}</div>
          <div style={{ fontSize: 9.5, marginTop: 2 }}>
            {company?.telephone ? `T - ${company.telephone}` : "T -"} &nbsp;&nbsp; {company?.mobile ? `Mob - ${company.mobile}` : "F -"}
          </div>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
          <div style={{ fontSize: 12, fontWeight: "bold", border: bdr, padding: "3px 14px", letterSpacing: 2, background: "#f8f8f8" }}>
            Original
          </div>
          <div style={{ fontSize: 8.5, color: "#444", fontWeight: "bold" }}>ISO Document No.: {ISODoc}</div>
          {company?.showLogo && company?.logo ? (
            <img src={company.logo} alt="Logo" style={{ height: 46, objectFit: "contain", marginTop: 4 }} />
          ) : (
            <div style={{ fontSize: 11, fontWeight: "bold", color: "#1a1a2e", border: bdr, padding: "4px 10px", marginTop: 4 }}>
              {company?.name}
            </div>
          )}
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0 }}>
        <tbody>
          <tr>
            <td style={{ ...tdB, fontWeight: "bold", width: "20%" }}>Purchase Order No.</td>
            <td style={{ ...tdB, width: "20%", fontWeight: "bold", color: "#000", fontSize: 10.5 }}>{po.poNumber}</td>
            <td style={{ ...tdB, width: "8%" }}>Dated</td>
            <td style={{ ...tdB, width: "15%", fontWeight: "bold" }}>{formatDate(po.poDate)}</td>
            <td style={{ ...tdB, width: "8%" }}>PAN</td>
            <td style={{ ...tdB, fontWeight: "bold" }}>{po.pan || company?.pan}</td>
          </tr>
          <tr>
            <td style={tdB}>Amendment No.</td>
            <td style={tdB}>{po.amendmentNo || "—"}</td>
            <td style={tdB}>Dated</td>
            <td style={tdB}>{formatDate(po.amendmentDate) || "—"}</td>
            <td style={tdB}>GSTIN</td>
            <td style={{ ...tdB, fontWeight: "bold" }}>{po.gstin || company?.gstin}</td>
          </tr>
          <tr>
            <td style={tdB}>Internal Indent No.</td>
            <td style={tdB}>{po.internalIndentNo || "—"}</td>
            <td style={tdB}>Dated</td>
            <td style={tdB}>{formatDate(po.internalIndentDate) || "—"}</td>
            <td style={tdB}>IEC No.</td>
            <td style={tdB}>{po.iecNo || "—"}</td>
          </tr>
          <tr>
            <td style={tdB}>Your Quotation No.</td>
            <td style={tdB}>{po.yourQuotationNo || "—"}</td>
            <td colSpan={4} style={tdB}></td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0 }}>
        <tbody>
          <tr>
            <td style={{ ...tdB, width: "50%", verticalAlign: "top", padding: "6px 8px" }}>
              {po.vendorCode && <div style={{ fontSize: 9, color: "#555" }}>VEND: {po.vendorCode}</div>}
              <div style={{ fontWeight: "bold", fontSize: 11, color: "#000" }}>{po.vendorName}</div>
              <div style={{ fontSize: 9.5, whiteSpace: "pre-wrap", lineHeight: 1.35, marginTop: 2 }}>{po.vendorAddress}</div>
              {po.vendorGstin && <div style={{ fontSize: 9.5, marginTop: 3 }}>GSTIN: <strong>{po.vendorGstin}</strong></div>}
            </td>
            <td style={{ ...tdB, verticalAlign: "top", padding: "6px 8px", fontSize: 9.5 }}>
              <div>
                <strong>Currency :</strong> {po.currency || "INR"}
              </div>
              <div style={{ marginTop: 3 }}>
                <strong>Terms of Delivery :</strong> {po.termsOfDelivery || "—"}
              </div>
              <div style={{ marginTop: 3 }}>
                <strong>Terms of Payment :</strong> {po.termsOfPayment || "—"}
              </div>
              <div style={{ marginTop: 3 }}>
                <strong>Contact Purchase Representatives :</strong> {po.contactPurchaseRep || "—"}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0 }}>
        <tbody>
          <tr>
            <td style={{ ...tdB, width: "50%", verticalAlign: "top", padding: "6px 8px" }}>
              <div style={{ fontWeight: "bold", fontSize: 9.5, textDecoration: "underline" }}>Invoice from:</div>
              <div style={{ fontWeight: "bold", fontSize: 10.5, marginTop: 2 }}>{po.invoiceFromName || po.vendorName}</div>
              <div style={{ fontSize: 9.5, whiteSpace: "pre-wrap", lineHeight: 1.35, marginTop: 2 }}>
                {po.invoiceFromAddress || po.vendorAddress}
              </div>
              {(po.invoiceFromGstin || po.vendorGstin) && (
                <div style={{ fontSize: 9.5, marginTop: 3 }}>GSTIN: <strong>{po.invoiceFromGstin || po.vendorGstin}</strong></div>
              )}
            </td>
            <td style={{ ...tdB, verticalAlign: "top", padding: "6px 8px" }}>
              <div style={{ fontWeight: "bold", fontSize: 9.5, textDecoration: "underline" }}>Deliver to:</div>
              <div style={{ fontWeight: "bold", fontSize: 10.5, marginTop: 2 }}>{po.deliverToName || company?.mailingName || company?.name}</div>
              <div style={{ fontSize: 9.5, whiteSpace: "pre-wrap", lineHeight: 1.35, marginTop: 2 }}>
                {po.deliverToAddress || company?.address}
              </div>
              {(po.deliverToGstin || company?.gstin) && (
                <div style={{ fontSize: 9.5, marginTop: 3 }}>GSTIN: <strong>{po.deliverToGstin || company?.gstin}</strong></div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0 }}>
        <thead>
          <tr>
            <th style={{ ...tdH, width: 30 }}>SL. NO.</th>
            <th style={{ ...tdH, width: 65 }}>HSN CODE</th>
            <th style={{ ...tdH, textAlign: "left", paddingLeft: 8 }}>DESCRIPTION</th>
            <th style={{ ...tdH, width: 60 }}>PART NO.</th>
            <th style={{ ...tdH, width: 42 }}>GST %</th>
            <th style={{ ...tdH, width: 75 }}>REQUIRED BY</th>
            <th style={{ ...tdH, width: 38 }}>UOM</th>
            <th style={{ ...tdH, width: 50, textAlign: "right" }}>QTY</th>
            <th style={{ ...tdH, width: 75, textAlign: "right" }}>RATE Rs. Ps.</th>
            <th style={{ ...tdH, width: 42, textAlign: "right" }}>Disc %</th>
            <th style={{ ...tdH, width: 90, textAlign: "right" }}>AMOUNT Rs. Ps.</th>
          </tr>
        </thead>
        <tbody>
          {po.items.map((item, i) => (
            <tr key={i} style={{ height: 24 }}>
              <td style={{ ...tdB, textAlign: "center" }}>{item.slNo || i + 1}</td>
              <td style={{ ...tdB, textAlign: "center" }}>{item.hsnCode}</td>
              <td style={{ ...tdB, paddingLeft: 8, fontWeight: "bold" }}>{item.description}</td>
              <td style={{ ...tdB, textAlign: "center" }}>{item.partNo || "—"}</td>
              <td style={{ ...tdB, textAlign: "center" }}>{item.gstRate}%</td>
              <td style={{ ...tdB, textAlign: "center" }}>{formatDate(item.requiredBy)}</td>
              <td style={{ ...tdB, textAlign: "center" }}>{item.uom}</td>
              <td style={{ ...tdB, textAlign: "right", fontWeight: "bold" }}>{item.qty}</td>
              <td style={{ ...tdB, textAlign: "right" }}>{fmt(item.rate)}</td>
              <td style={{ ...tdB, textAlign: "right" }}>{item.discountPerc || 0}</td>
              <td style={{ ...tdB, textAlign: "right", fontWeight: "bold" }}>{fmt(item.amount)}</td>
            </tr>
          ))}
          {Array.from({ length: blankRowsCount }).map((_, i) => (
            <tr key={"blank-" + i} style={{ height: 24 }}>
              <td style={tdB}>&nbsp;</td>
              <td style={tdB}>&nbsp;</td>
              <td style={tdB}>&nbsp;</td>
              <td style={tdB}>&nbsp;</td>
              <td style={tdB}>&nbsp;</td>
              <td style={tdB}>&nbsp;</td>
              <td style={tdB}>&nbsp;</td>
              <td style={tdB}>&nbsp;</td>
              <td style={tdB}>&nbsp;</td>
              <td style={tdB}>&nbsp;</td>
              <td style={tdB}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0 }}>
        <tbody>
          <tr>
            <td style={{ ...tdB, width: "50%", verticalAlign: "top", padding: "6px 8px" }}>
              <div style={{ fontWeight: "bold", fontSize: 9.5, textDecoration: "underline", marginBottom: 4 }}>
                Specific Terms and Conditions
              </div>
              {(po.specificTerms && po.specificTerms.length > 0) ? (
                po.specificTerms.map((term, i) => (
                  <div key={i} style={{ fontSize: 9.5, marginBottom: 3, lineHeight: 1.35 }}>
                    {i + 1}.&nbsp; {term}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 9, color: "#777", fontStyle: "italic" }}>Standard terms applicable as per purchase agreement.</div>
              )}
            </td>
            <td style={{ ...tdB, verticalAlign: "top", padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ ...tdB, textAlign: "right", fontSize: 9.5, borderTop: "none", borderLeft: "none" }}>TOTAL VALUE</td>
                    <td style={{ ...tdB, textAlign: "right", fontSize: 9.5, width: 90, borderTop: "none", borderRight: "none", fontWeight: "bold" }}>{fmt(totalValue)}</td>
                  </tr>
                  <tr>
                    <td style={{ ...tdB, textAlign: "right", fontSize: 9.5, borderLeft: "none" }}>Discount</td>
                    <td style={{ ...tdB, textAlign: "right", fontSize: 9.5, width: 90, borderRight: "none" }}>0.00</td>
                  </tr>
                  {isInterState ? (
                    <tr>
                      <td style={{ ...tdB, textAlign: "right", fontSize: 9.5, borderLeft: "none" }}>IGST</td>
                      <td style={{ ...tdB, textAlign: "right", fontSize: 9.5, width: 90, borderRight: "none" }}>{fmt(igstAmt)}</td>
                    </tr>
                  ) : (
                    <>
                      <tr>
                        <td style={{ ...tdB, textAlign: "right", fontSize: 9.5, borderLeft: "none" }}>CGST</td>
                        <td style={{ ...tdB, textAlign: "right", fontSize: 9.5, width: 90, borderRight: "none" }}>{fmt(cgstAmt)}</td>
                      </tr>
                      <tr>
                        <td style={{ ...tdB, textAlign: "right", fontSize: 9.5, borderLeft: "none" }}>SGST</td>
                        <td style={{ ...tdB, textAlign: "right", fontSize: 9.5, width: 90, borderRight: "none" }}>{fmt(sgstAmt)}</td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td style={{ ...tdB, textAlign: "right", fontSize: 9.5, borderLeft: "none" }}>Rounding Off</td>
                    <td style={{ ...tdB, textAlign: "right", fontSize: 9.5, width: 90, borderRight: "none" }}>
                      {fmt(Math.abs(roundOff))}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: "bold" }}>
                    <td style={{ ...tdB, textAlign: "right", fontSize: 11, background: "#e8e8e8", borderLeft: "none" }}>
                      GROSS AMOUNT
                    </td>
                    <td style={{ ...tdB, textAlign: "right", fontSize: 11, background: "#e8e8e8", borderRight: "none", fontWeight: "bold" }}>
                      ₹ {fmt(grossAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ ...tdB, fontSize: 9.5, borderLeft: "none", borderRight: "none", borderBottom: "none", padding: "5px 8px" }}>
                      <strong>TOTAL VALUE IN WORDS :</strong>
                      <br />
                      <span style={{ fontSize: 9.5, fontStyle: "italic", fontWeight: "bold" }}>
                        {numberToWords(grossAmount)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0, borderTop: bdr }}>
        {["Prepared By :", "Approved By :", "Finance Check", `For ${company?.mailingName || company?.name || "Company"}`].map((label, i) => (
          <div key={i} style={{ padding: "6px 8px", borderRight: i < 3 ? bdr : "none", minHeight: 60, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ fontSize: 9, color: "#444" }}>{label}</div>
            <div style={{ marginTop: 24, fontSize: 10, fontWeight: "bold" }}>
              {i === 0 ? po.preparedBy : i === 1 ? po.approvedBy : i === 2 ? po.financeCheck : ""}
            </div>
            {i === 3 && <div style={{ fontSize: 9, color: "#444" }}>Authorised Signatory</div>}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 8.5, color: "#444", borderTop: bdr, padding: "3px 8px", textAlign: "center", fontStyle: "italic" }}>
        This purchase order is digitally approved hence seal and signature is not required.
      </div>
      {company?.address && (
        <div style={{ fontSize: 8, color: "#333", borderTop: "1px dashed #999", padding: "3px 8px", lineHeight: 1.35, textAlign: "center" }}>
          REGISTERED OFFICE : {company.address}
          {company.pinCode ? ", Pin: " + company.pinCode : ""}
          {company.email ? " | E: " + company.email : ""}
          {company.website ? " | W: " + company.website : ""}
        </div>
      )}
      {po.enableTnC && (
        <div style={{ fontSize: 7.5, color: "#333", lineHeight: 1.4, borderTop: bdr, padding: "3px 8px" }}>
          Purchase Order General Terms and Conditions (&quot;GTC&quot;) shall be unequivocally applicable to the suppliers and or service providers to {company?.mailingName || company?.name || "the Company"} for the sourcing of products and services. No modifications, whether in writing or verbal, to this GTCs shall be accepted by {company?.mailingName || company?.name || "the Company"} unless expressly agreed between the parties in writing.<br />
          Any failure or delay in exercising any right or remedy under the GTC or by law shall not be deemed as a waiver by {company?.mailingName || company?.name || "the Company"} of any subsequent breach or default. Similarly, it shall not constitute a restriction to further exercise that right or remedy or any other right or remedy.
        </div>
      )}
    </div>
  );

  const TnCPage = ({ sIdx, pageNo }: { sIdx: number; pageNo: number }) => {
    const section = TNC_SECTIONS[sIdx];
    return (
      <div
        className="po-page po-tnc-page"
        style={{
          width: "210mm",
          minHeight: "297mm",
          margin: "10mm auto 0",
          background: "white",
          fontFamily: '"Arial Narrow",Arial,sans-serif',
          fontSize: 9.5,
          padding: "12mm 14mm",
          boxSizing: "border-box",
          position: "relative",
          border: "1.5px solid #222",
          boxShadow: "0 4px 15px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid #222",
              paddingBottom: 4,
              marginBottom: 8
            }}
          >
            <div style={{ fontSize: 13, fontWeight: "bold" }}>
              PURCHASE ORDER GENERAL TERMS AND CONDITIONS
            </div>
            <div style={{ fontSize: 9, color: "#555" }}>
              PO No.: <strong>{po.poNumber}</strong>
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: "bold", color: "#1a1a2e", marginBottom: 8 }}>
            {section.title}
          </div>
          <div style={{ lineHeight: 1.5 }}>
            {section.clauses.map((cl, ci) => (
              <p key={ci} style={{ margin: "0 0 6px 0", textAlign: "justify", fontSize: 9 }}>
                {cl}
              </p>
            ))}
          </div>
        </div>
        <div
          style={{
            borderTop: "1px solid #999",
            paddingTop: 4,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 8,
            color: "#666"
          }}
        >
          <span>{company?.name} — Purchase Order Terms &amp; Conditions</span>
          <span>
            Page: {pageNo} / {totalPages}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className="po-print-toolbar"
        style={{
          background: "#1a1a2e",
          color: "white",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "#e74c3c",
            color: "white",
            border: "none",
            borderRadius: 4,
            padding: "4px 12px",
            cursor: "pointer",
            fontSize: 12
          }}
        >
          &#8592; Back
        </button>
        <span style={{ fontSize: 14, fontWeight: "bold" }}>
          Print Preview - {po.poNumber}
        </span>
        <div style={{ background: "#2a2d3d", padding: "3px 10px", borderRadius: 4, fontSize: 11, color: "#cbd5e1" }}>
          🖨️ For Best Print: In Print Dialog, set <strong>Scale: 100% (Default)</strong> | <strong>Margins: Default</strong>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: po.enableTnC ? "#2ecc71" : "#f39c12" }}>
            {po.enableTnC ? `T&C Enabled (${totalPages} pages)` : `T&C Disabled (1 page only)`}
          </span>
          <button
            onClick={() => window.print()}
            style={{
              background: "#27ae60",
              color: "white",
              border: "none",
              borderRadius: 4,
              padding: "5px 18px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: "bold",
              boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
            }}
          >
            Print
          </button>
        </div>
      </div>
      <div
        className="po-print-content"
        style={{ overflowY: "auto", padding: 20, background: "#808080", flex: 1 }}
      >
        <MainPage />
        {po.enableTnC &&
          TNC_SECTIONS.map((_, idx) => <TnCPage key={idx} sIdx={idx} pageNo={idx + 2} />)}
      </div>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 8mm 8mm 8mm 8mm !important;
        }
        @media print {
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .po-print-toolbar,
          .top-nav, .sub-nav, .sidebar, .left-panel, .voucher-header, .no-print, .tally-sidebar,
          .mobile-bottom-nav, .mobile-company-bar, .mobile-ham-btn, .mobile-nav-drawer,
          .mobile-nav-overlay, .mobile-dashboard-cards, .mobile-quick-actions,
          .mobile-menu-screen, .report-app-bar {
            display: none !important;
          }
          .po-print-content {
            display: block !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            width: 100% !important;
          }
          .po-page {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: 1.5px solid #111 !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }
          .po-main-page {
            page-break-after: ${po.enableTnC ? "always" : "auto"} !important;
            page-break-inside: avoid !important;
          }
          .po-tnc-page {
            page-break-before: always !important;
            page-break-inside: avoid !important;
            padding: 8mm 10mm !important;
            border: 1.5px solid #111 !important;
          }
          .po-page table {
            border-collapse: collapse !important;
          }
          .po-page th, .po-page td {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
}

// ==================== MAIN MODULE WRAPPER ====================
type POScreen = "register" | "form" | "edit" | "print";

export function PurchaseOrderModule({
  company,
  ledgers,
  stockItems,
  onBack,
  initialTab = "form"
}: {
  company: Company | null;
  ledgers: Ledger[];
  stockItems: StockItem[];
  stockGroups?: any[];
  units?: any[];
  onBack: () => void;
  initialTab?: "form" | "register";
}) {
  const [screen, setScreen] = useState<POScreen>(initialTab === "register" ? "register" : "form");
  const [editPO, setEditPO] = useState<PurchaseOrderData | null>(null);
  const [printPO, setPrintPO] = useState<PurchaseOrderData | null>(null);
  const [existingPOs, setExistingPOs] = useState<PurchaseOrderData[]>([]);

  const fetchPOs = useCallback(async () => {
    if (!company?.id) return;
    const res = await fetch(`/api/purchase-orders?companyId=${company.id}`);
    const data = await res.json();
    if (data.success) setExistingPOs(data.purchaseOrders || []);
  }, [company?.id]);

  useEffect(() => {
    fetchPOs();
  }, [fetchPOs]);

  const handleSavePO = async (poData: PurchaseOrderData) => {
    const method = poData.id ? "PUT" : "POST";
    const res = await fetch("/api/purchase-orders", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(poData)
    });
    const data = await res.json();
    if (!data.success) {
      alert("Save failed: " + data.error);
      return;
    }
    alert(
      `Purchase Order ${poData.poNumber} ${poData.id ? "updated" : "created"} successfully!`
    );
    await fetchPOs();
    setScreen("register");
    setEditPO(null);
  };

  if (screen === "print" && printPO) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <PurchaseOrderPrint
          po={printPO}
          company={company}
          onBack={() => {
            setScreen("register");
            setPrintPO(null);
          }}
        />
      </div>
    );
  }

  if (screen === "form" || screen === "edit") {
    return (
      <PurchaseOrderForm
        company={company}
        ledgers={ledgers}
        stockItems={stockItems}
        onBack={() => {
          setScreen("register");
          setEditPO(null);
        }}
        onSave={handleSavePO}
        editPO={editPO}
        existingPOs={existingPOs}
      />
    );
  }

  return (
    <PurchaseOrderRegister
      company={company}
      onBack={onBack}
      onNewPO={() => {
        setEditPO(null);
        setScreen("form");
      }}
      onEditPO={(p) => {
        setEditPO(p);
        setScreen("edit");
      }}
      onPrintPO={(p) => {
        setPrintPO(p);
        setScreen("print");
      }}
    />
  );
}
