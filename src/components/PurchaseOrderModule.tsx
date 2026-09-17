"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

export interface POItem {
  id?: number;
  slNo: number;
  hsnCode: string;
  description: string;
  partNo: string;
  gstRate: number;
  requiredBy: string;
  uom: string;
  qty: number;
  rate: number;
  discountPerc: number;
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

const fmt = (n: number) =>
  (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

  // Vendor selection state
  const [showVendorDrop, setShowVendorDrop] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");

  // Stock item selection state (active row index)
  const [activeItemPickerIndex, setActiveItemPickerIndex] = useState<number | null>(null);
  const [itemSearch, setItemSearch] = useState("");

  const vendorDropRef = useRef<HTMLDivElement>(null);
  const itemDropRef = useRef<HTMLDivElement>(null);

  // Ledgers sorted with Sundry Creditors first
  const supplierLedgers = useMemo(() => {
    const creditors = ledgers.filter((l) => l.groupName === "Sundry Creditors");
    const others = ledgers.filter((l) => l.groupName !== "Sundry Creditors");
    return [...creditors, ...others];
  }, [ledgers]);

  // Filtered vendor suggestions
  const filteredVendors = useMemo(() => {
    const term = (vendorSearch || po.vendorName || "").toLowerCase().trim();
    if (!term) return supplierLedgers.slice(0, 15);
    return supplierLedgers
      .filter(
        (l) =>
          l.name.toLowerCase().includes(term) ||
          (l.alias && l.alias.toLowerCase().includes(term)) ||
          (l.gstin && l.gstin.toLowerCase().includes(term)) ||
          l.groupName.toLowerCase().includes(term)
      )
      .slice(0, 20);
  }, [supplierLedgers, vendorSearch, po.vendorName]);

  // Filtered stock items
  const filteredStockItems = useMemo(() => {
    const term = itemSearch.toLowerCase().trim();
    if (!term) return stockItems.slice(0, 20);
    return stockItems
      .filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          (s.hsnCode && s.hsnCode.toLowerCase().includes(term)) ||
          (s.alias && s.alias.toLowerCase().includes(term)) ||
          (s.groupName && s.groupName.toLowerCase().includes(term))
      )
      .slice(0, 25);
  }, [stockItems, itemSearch]);

  const updatePO = (field: keyof PurchaseOrderData, val: any) =>
    setPO((p) => ({ ...p, [field]: val }));

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
    setShowVendorDrop(false);
  };

  // When user types in Vendor Code, auto-fill if matched
  const handleVendorCodeChange = (codeVal: string) => {
    updatePO("vendorCode", codeVal);
    const clean = codeVal.trim().toLowerCase();
    if (clean) {
      const match = ledgers.find(
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

  // Update item field and recalculate amounts
  const updateItem = (idx: number, field: keyof POItem, val: any) =>
    setPO((p) => {
      const items = [...p.items];
      const item = { ...items[idx], [field]: val };
      if (["qty", "rate", "discountPerc"].includes(field as string)) {
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

  // Select stock item from dropdown for a specific row
  const selectStockItem = (rowIdx: number, item: StockItem) => {
    const uomName =
      (item as any).unitName ||
      (typeof item.unit === "string" ? item.unit : item.unit?.name) ||
      "Nos";
    const defaultRate = (item as any).openingRate || (item as any).rate || 0;
    const currentQty = po.items[rowIdx]?.qty || 1;
    const gross = currentQty * defaultRate;
    const discPerc = po.items[rowIdx]?.discountPerc || 0;
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
    setActiveItemPickerIndex(null);
  };

  const addItem = () => {
    const newIdx = po.items.length;
    setPO((p) => ({
      ...p,
      items: [...p.items, emptyItem(p.items.length + 1)]
    }));
    setActiveItemPickerIndex(newIdx);
    setItemSearch("");
  };

  const removeItem = (idx: number) => {
    setPO((p) => ({
      ...p,
      items: p.items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, slNo: i + 1 }))
    }));
    if (activeItemPickerIndex === idx) setActiveItemPickerIndex(null);
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
      const rate = (it.gstRate ?? 18) / 100;
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
        items: po.items.map((i) => ({
          ...i,
          balanceQty: Math.max(0, (i.qty || 0) - (i.receivedQty || 0))
        }))
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
        if (showVendorDrop) setShowVendorDrop(false);
        else if (activeItemPickerIndex !== null) setActiveItemPickerIndex(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, showVendorDrop, activeItemPickerIndex]);

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
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
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
                  (Type code or select ledger to auto-fill)
                </span>
              </div>

              {/* Vendor Code with Auto-match */}
              <div style={{ marginBottom: 8 }}>
                <span style={lbl}>Vendor Code</span>
                <input
                  style={inp}
                  value={po.vendorCode}
                  onChange={(e) => handleVendorCodeChange(e.target.value)}
                  placeholder="Enter Vendor ID or Alias..."
                />
              </div>

              {/* Vendor Name with Interactive Ledger Dropdown */}
              <div style={{ marginBottom: 8, position: "relative" }} ref={vendorDropRef}>
                <span style={lbl}>Vendor Name *</span>
                <div style={{ display: "flex", gap: 4 }}>
                  <input
                    style={{ ...inp, flex: 1, fontWeight: "bold" }}
                    value={po.vendorName}
                    onChange={(e) => {
                      updatePO("vendorName", e.target.value);
                      setVendorSearch(e.target.value);
                      setShowVendorDrop(true);
                    }}
                    onFocus={() => setShowVendorDrop(true)}
                    placeholder="Click to select or type vendor name..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowVendorDrop((v) => !v)}
                    style={{
                      background: "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: 3,
                      padding: "0 10px",
                      cursor: "pointer",
                      fontSize: 11
                    }}
                  >
                    ▼ List
                  </button>
                </div>

                {/* Ledger Dropdown Popup */}
                {showVendorDrop && (
                  <div
                    style={{
                      position: "absolute",
                      zIndex: 1000,
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "white",
                      border: "1px solid #3b82f6",
                      borderRadius: 4,
                      maxHeight: 220,
                      overflowY: "auto",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.18)"
                    }}
                  >
                    <div
                      style={{
                        padding: "6px 10px",
                        background: "#eff6ff",
                        fontSize: 10,
                        fontWeight: "bold",
                        color: "#1e40af",
                        borderBottom: "1px solid #dbeafe"
                      }}
                    >
                      SELECT VENDOR / SUPPLIER LEDGER
                    </div>
                    {filteredVendors.length === 0 ? (
                      <div style={{ padding: "10px", fontSize: 11, color: "#94a3b8" }}>
                        No matching ledger found
                      </div>
                    ) : (
                      filteredVendors.map((l) => (
                        <div
                          key={l.id}
                          onClick={() => selectVendor(l)}
                          style={{
                            padding: "8px 10px",
                            cursor: "pointer",
                            fontSize: 11,
                            borderBottom: "1px solid #f1f5f9",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f9ff")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                        >
                          <div>
                            <strong style={{ color: "#0f172a" }}>{l.name}</strong>
                            {l.alias && (
                              <span style={{ color: "#3b82f6", marginLeft: 6, fontSize: 10 }}>
                                ({l.alias})
                              </span>
                            )}
                            {l.address && (
                              <div style={{ color: "#64748b", fontSize: 10, marginTop: 1 }}>
                                {l.address.slice(0, 45)}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span
                              style={{
                                background:
                                  l.groupName === "Sundry Creditors" ? "#e0f2fe" : "#f1f5f9",
                                color:
                                  l.groupName === "Sundry Creditors" ? "#0369a1" : "#475569",
                                padding: "2px 6px",
                                borderRadius: 3,
                                fontSize: 9,
                                fontWeight: "bold"
                              }}
                            >
                              {l.groupName}
                            </span>
                            {l.gstin && (
                              <div style={{ color: "#059669", fontSize: 10, marginTop: 2 }}>
                                {l.gstin}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 8 }}>
                <span style={lbl}>Vendor Address</span>
                <textarea
                  style={{ ...inp, height: 50, resize: "vertical" }}
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

          {/* ITEMS / MATERIALS TABLE WITH STOCK ITEM LIST DROPDOWN */}
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
            <span style={{ fontSize: 11, color: "#64748b" }}>
              Click on <strong>Description</strong> to pick from Stock Items list
            </span>
          </div>

          <div style={{ overflowX: "auto", position: "relative" }}>
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
                {po.items.map((item, idx) => (
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
                    {/* Description input with interactive Stock Item dropdown */}
                    <td style={{ ...cel, minWidth: 220, position: "relative" }}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <input
                          style={{
                            ...inp,
                            border: "none",
                            padding: "2px 4px",
                            fontWeight: item.description ? "bold" : "normal",
                            color: item.description ? "#0f172a" : "#94a3b8"
                          }}
                          value={item.description}
                          onChange={(e) => {
                            updateItem(idx, "description", e.target.value);
                            setItemSearch(e.target.value);
                            setActiveItemPickerIndex(idx);
                          }}
                          onFocus={() => {
                            setActiveItemPickerIndex(idx);
                            setItemSearch(item.description);
                          }}
                          placeholder="Click to pick stock item..."
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setActiveItemPickerIndex(activeItemPickerIndex === idx ? null : idx);
                            setItemSearch(item.description);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#3b82f6",
                            cursor: "pointer",
                            fontSize: 10,
                            padding: "0 4px"
                          }}
                        >
                          ▼
                        </button>
                      </div>

                      {/* Floating Stock Item Picker */}
                      {activeItemPickerIndex === idx && (
                        <div
                          ref={itemDropRef}
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            zIndex: 1000,
                            minWidth: 380,
                            maxWidth: 450,
                            background: "white",
                            border: "1px solid #3b82f6",
                            borderRadius: 4,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                            maxHeight: 220,
                            overflowY: "auto"
                          }}
                        >
                          <div
                            style={{
                              padding: "6px 10px",
                              background: "#eff6ff",
                              fontSize: 10,
                              fontWeight: "bold",
                              color: "#1e40af",
                              borderBottom: "1px solid #dbeafe"
                            }}
                          >
                            SELECT STOCK ITEM (Auto-fills HSN, GST, UOM &amp; Rate)
                          </div>
                          {filteredStockItems.length === 0 ? (
                            <div style={{ padding: "10px", fontSize: 11, color: "#94a3b8" }}>
                              No matching items found
                            </div>
                          ) : (
                            filteredStockItems.map((stk) => (
                              <div
                                key={stk.id}
                                onClick={() => selectStockItem(idx, stk)}
                                style={{
                                  padding: "6px 10px",
                                  cursor: "pointer",
                                  fontSize: 11,
                                  borderBottom: "1px solid #f1f5f9",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center"
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background = "#f0fdf4")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background = "white")
                                }
                              >
                                <div>
                                  <strong style={{ color: "#0f172a" }}>{stk.name}</strong>
                                  <div style={{ fontSize: 9, color: "#64748b" }}>
                                    HSN: {stk.hsnCode || "-"} | GST: {stk.gstRate ?? 18}%
                                  </div>
                                </div>
                                <div style={{ textAlign: "right", fontSize: 10 }}>
                                  <span style={{ color: "#059669", fontWeight: "bold" }}>
                                    ₹ {fmt((stk as any).openingRate || (stk as any).rate || 0)}
                                  </span>
                                  <div style={{ color: "#64748b", fontSize: 9 }}>
                                    {(stk as any).unitName || "Nos"}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
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
                        value={item.gstRate}
                        onChange={(e) =>
                          updateItem(idx, "gstRate", parseFloat(e.target.value) || 0)
                        }
                        type="number"
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
                        style={{
                          ...inp,
                          border: "none",
                          padding: "2px 4px",
                          textAlign: "right",
                          fontWeight: "bold"
                        }}
                        value={item.qty || ""}
                        onChange={(e) =>
                          updateItem(idx, "qty", parseFloat(e.target.value) || 0)
                        }
                        type="number"
                        placeholder="Qty"
                      />
                    </td>
                    <td style={{ ...cel, width: 80 }}>
                      <input
                        style={{
                          ...inp,
                          border: "none",
                          padding: "2px 4px",
                          textAlign: "right"
                        }}
                        value={item.rate || ""}
                        onChange={(e) =>
                          updateItem(idx, "rate", parseFloat(e.target.value) || 0)
                        }
                        type="number"
                        placeholder="Rate"
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
                        value={item.discountPerc || ""}
                        onChange={(e) =>
                          updateItem(idx, "discountPerc", parseFloat(e.target.value) || 0)
                        }
                        type="number"
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
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={addItem}
              style={{
                background: "#0284c7",
                color: "white",
                border: "none",
                borderRadius: 4,
                padding: "6px 16px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: "bold"
              }}
            >
              + Add Item (Auto-pick)
            </button>
          </div>

          {/* TOTALS & TAX CALCULATION PANEL */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, marginTop: 20 }}>
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
                  const tq = po.items.reduce((s, it) => s + (it.qty || 0), 0);
                  const rq = po.items.reduce((s, it) => s + (it.receivedQty || 0), 0);
                  const bq = po.items.reduce((s, it) => s + (it.balanceQty || 0), 0);
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
  const tdB: React.CSSProperties = { border: bdr, padding: "2px 4px", fontSize: 8.5, verticalAlign: "middle" };
  const tdH: React.CSSProperties = {
    ...tdB,
    background: "#e0e0e0",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 8
  };

  const totalValue = po.items.reduce((s, i) => s + (i.amount || 0), 0);

  // Check inter-state vs intra-state
  const compGstin2 = company?.gstin ? company.gstin.trim().slice(0, 2) : "";
  const vendGstin2 = po.vendorGstin ? po.vendorGstin.trim().slice(0, 2) : "";
  const isInterState = Boolean(compGstin2 && vendGstin2 && compGstin2 !== vendGstin2);

  const totalTax = po.items.reduce((sum, it) => {
    const rate = (it.gstRate ?? 18) / 100;
    return sum + (it.amount || 0) * rate;
  }, 0);

  const cgstAmt = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const sgstAmt = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const igstAmt = isInterState ? Math.round(totalTax * 100) / 100 : 0;
  const totalTaxAmt = isInterState ? igstAmt : cgstAmt + sgstAmt;

  const grossBeforeRound = totalValue + totalTaxAmt;
  const roundOff = Math.round(grossBeforeRound) - grossBeforeRound;
  const grossAmount = po.grossAmount || Math.round(grossBeforeRound);

  const MainPage = () => (
    <div
      className="po-page po-main-page"
      style={{
        width: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
        background: "white",
        fontFamily: '"Arial Narrow",Arial,sans-serif',
        fontSize: 10,
        padding: "10mm",
        boxSizing: "border-box",
        position: "relative",
        border: "1px solid #bbb"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: bdr,
          paddingBottom: 6,
          marginBottom: 6
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: "bold", letterSpacing: 1 }}>PURCHASE ORDER</div>
          <div style={{ fontSize: 12, fontWeight: "bold" }}>{company?.mailingName || company?.name}</div>
          {company?.mailingName && (
            <div style={{ fontSize: 9, fontStyle: "italic" }}>(formerly {company?.name})</div>
          )}
          <div style={{ marginTop: 4, fontSize: 9, whiteSpace: "pre-wrap" }}>{company?.address}</div>
          <div style={{ fontSize: 9 }}>T - &nbsp;&nbsp; F -</div>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
          <div style={{ fontSize: 13, fontWeight: "bold", border: bdr, padding: "3px 14px", letterSpacing: 2 }}>
            Original
          </div>
          <div style={{ fontSize: 8, color: "#555" }}>ISO Document No.: {ISODoc}</div>
          {company?.showLogo && company?.logo ? (
            <img src={company.logo} alt="Logo" style={{ height: 45, objectFit: "contain", marginTop: 4 }} />
          ) : (
            <div style={{ fontSize: 11, fontWeight: "bold", color: "#1a1a2e", border: bdr, padding: "4px 10px", marginTop: 4 }}>
              {company?.name}
            </div>
          )}
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
        <tbody>
          <tr>
            <td style={{ ...tdB, fontWeight: "bold", width: "20%" }}>Purchase Order No.</td>
            <td style={{ ...tdB, width: "20%", fontWeight: "bold", color: "#1a3a6e" }}>{po.poNumber}</td>
            <td style={{ ...tdB, width: "8%" }}>Dated</td>
            <td style={{ ...tdB, width: "15%" }}>{formatDate(po.poDate)}</td>
            <td style={{ ...tdB, width: "8%" }}>PAN</td>
            <td style={tdB}>{po.pan || company?.pan}</td>
          </tr>
          <tr>
            <td style={tdB}>Amendment No.</td>
            <td style={tdB}>{po.amendmentNo}</td>
            <td style={tdB}>Dated</td>
            <td style={tdB}>{formatDate(po.amendmentDate)}</td>
            <td style={tdB}>GSTIN</td>
            <td style={tdB}>{po.gstin || company?.gstin}</td>
          </tr>
          <tr>
            <td style={tdB}>Internal Indent No.</td>
            <td style={tdB}>{po.internalIndentNo}</td>
            <td style={tdB}>Dated</td>
            <td style={tdB}>{formatDate(po.internalIndentDate)}</td>
            <td style={tdB}>IEC No.</td>
            <td style={tdB}>{po.iecNo}</td>
          </tr>
          <tr>
            <td style={tdB}>Your Quotation No.</td>
            <td style={tdB}>{po.yourQuotationNo}</td>
            <td colSpan={4} style={tdB}></td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
        <tbody>
          <tr>
            <td style={{ ...tdB, width: "50%", verticalAlign: "top" }}>
              {po.vendorCode && <div style={{ fontSize: 9, color: "#555" }}>VEND{po.vendorCode}</div>}
              <div style={{ fontWeight: "bold", fontSize: 10 }}>{po.vendorName}</div>
              <div style={{ fontSize: 9, whiteSpace: "pre-wrap" }}>{po.vendorAddress}</div>
              {po.vendorGstin && <div style={{ fontSize: 9 }}>GSTIN: {po.vendorGstin}</div>}
            </td>
            <td style={{ ...tdB, verticalAlign: "top" }}>
              <div>
                <strong>Currency :</strong> {po.currency}
              </div>
              <div style={{ marginTop: 3 }}>
                <strong>Terms of Delivery :</strong> {po.termsOfDelivery}
              </div>
              <div style={{ marginTop: 3 }}>
                <strong>Terms of Payment</strong> {po.termsOfPayment}
              </div>
              <div style={{ marginTop: 3 }}>
                <strong>Contact Purchase Representatives :</strong> {po.contactPurchaseRep}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
        <tbody>
          <tr>
            <td style={{ ...tdB, width: "50%", verticalAlign: "top" }}>
              <div style={{ fontWeight: "bold", fontSize: 9, textDecoration: "underline" }}>Invoice from:</div>
              <div style={{ fontWeight: "bold" }}>{po.invoiceFromName || po.vendorName}</div>
              <div style={{ fontSize: 9, whiteSpace: "pre-wrap" }}>
                {po.invoiceFromAddress || po.vendorAddress}
              </div>
              {(po.invoiceFromGstin || po.vendorGstin) && (
                <div style={{ fontSize: 9 }}>GSTIN: {po.invoiceFromGstin || po.vendorGstin}</div>
              )}
            </td>
            <td style={{ ...tdB, verticalAlign: "top" }}>
              <div style={{ fontWeight: "bold", fontSize: 9, textDecoration: "underline" }}>Deliver to:</div>
              <div style={{ fontWeight: "bold" }}>{po.deliverToName || company?.mailingName || company?.name}</div>
              <div style={{ fontSize: 9, whiteSpace: "pre-wrap" }}>
                {po.deliverToAddress || company?.address}
              </div>
              {(po.deliverToGstin || company?.gstin) && (
                <div style={{ fontSize: 9 }}>GSTIN: {po.deliverToGstin || company?.gstin}</div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0 }}>
        <thead>
          <tr>
            <th style={{ ...tdH, width: 25 }}>SL. NO.</th>
            <th style={{ ...tdH, width: 55 }}>HSN CODE</th>
            <th style={tdH}>DESCRIPTION</th>
            <th style={{ ...tdH, width: 55 }}>PART NO.</th>
            <th style={{ ...tdH, width: 30 }}>GST %</th>
            <th style={{ ...tdH, width: 58 }}>REQUIRED BY</th>
            <th style={{ ...tdH, width: 35 }}>UOM</th>
            <th style={{ ...tdH, width: 35 }}>QTY</th>
            <th style={{ ...tdH, width: 58 }}>RATE Rs. Ps.</th>
            <th style={{ ...tdH, width: 30 }}>Disc ount %</th>
            <th style={{ ...tdH, width: 62 }}>AMOUNT Rs. Ps.</th>
          </tr>
        </thead>
        <tbody>
          {po.items.map((item, i) => (
            <tr key={i}>
              <td style={{ ...tdB, textAlign: "center" }}>{item.slNo}</td>
              <td style={{ ...tdB, textAlign: "center" }}>{item.hsnCode}</td>
              <td style={tdB}>{item.description}</td>
              <td style={{ ...tdB, textAlign: "center" }}>{item.partNo}</td>
              <td style={{ ...tdB, textAlign: "center" }}>{item.gstRate}%</td>
              <td style={{ ...tdB, textAlign: "center" }}>{formatDate(item.requiredBy)}</td>
              <td style={{ ...tdB, textAlign: "center" }}>{item.uom}</td>
              <td style={{ ...tdB, textAlign: "right" }}>{item.qty}</td>
              <td style={{ ...tdB, textAlign: "right" }}>{fmt(item.rate)}</td>
              <td style={{ ...tdB, textAlign: "right" }}>{item.discountPerc || 0}</td>
              <td style={{ ...tdB, textAlign: "right", fontWeight: "bold" }}>{fmt(item.amount)}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 3 - po.items.length) }).map((_, i) => (
            <tr key={"p" + i} style={{ height: 20 }}>
              {Array.from({ length: 11 }).map((_, j) => (
                <td key={j} style={tdB}>
                  &nbsp;
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ ...tdB, width: "50%", verticalAlign: "top" }}>
              <div style={{ fontWeight: "bold", fontSize: 9, textDecoration: "underline", marginBottom: 4 }}>
                Specific Terms and Conditions
              </div>
              {(po.specificTerms || []).map((term, i) => (
                <div key={i} style={{ fontSize: 9, marginBottom: 2 }}>
                  {i + 1}&nbsp; {term}
                </div>
              ))}
            </td>
            <td style={{ ...tdB, verticalAlign: "top" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ ...tdB, textAlign: "right", fontSize: 9 }}>TOTAL VALUE</td>
                    <td style={{ ...tdB, textAlign: "right", fontSize: 9, width: 70 }}>{fmt(totalValue)}</td>
                  </tr>
                  <tr>
                    <td style={{ ...tdB, textAlign: "right", fontSize: 9 }}>Discount</td>
                    <td style={{ ...tdB, textAlign: "right", fontSize: 9, width: 70 }}>0.00</td>
                  </tr>
                  {isInterState ? (
                    <tr>
                      <td style={{ ...tdB, textAlign: "right", fontSize: 9 }}>IGST</td>
                      <td style={{ ...tdB, textAlign: "right", fontSize: 9, width: 70 }}>{fmt(igstAmt)}</td>
                    </tr>
                  ) : (
                    <>
                      <tr>
                        <td style={{ ...tdB, textAlign: "right", fontSize: 9 }}>CGST</td>
                        <td style={{ ...tdB, textAlign: "right", fontSize: 9, width: 70 }}>{fmt(cgstAmt)}</td>
                      </tr>
                      <tr>
                        <td style={{ ...tdB, textAlign: "right", fontSize: 9 }}>SGST</td>
                        <td style={{ ...tdB, textAlign: "right", fontSize: 9, width: 70 }}>{fmt(sgstAmt)}</td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td style={{ ...tdB, textAlign: "right", fontSize: 9 }}>Rounding Off</td>
                    <td style={{ ...tdB, textAlign: "right", fontSize: 9, width: 70 }}>
                      {fmt(Math.abs(roundOff))}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: "bold" }}>
                    <td style={{ ...tdB, textAlign: "right", fontSize: 10, background: "#e8e8e8" }}>
                      GROSS AMOUNT
                    </td>
                    <td style={{ ...tdB, textAlign: "right", fontSize: 10, background: "#e8e8e8" }}>
                      {fmt(grossAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ ...tdB, fontSize: 9 }}>
                      <strong>TOTAL VALUE IN WORDS :</strong>
                      <br />
                      <span style={{ fontSize: 9, fontStyle: "italic" }}>
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
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0, borderTop: bdr }}>
        {["Prepared By :", "Approved By :", "Finance Check", `For ${company?.mailingName || company?.name || "Company"}`].map((label, i) => (
          <div key={i} style={{ padding: "6px 8px", borderRight: i < 3 ? bdr : "none" }}>
            <div style={{ fontSize: 9, color: "#555" }}>{label}</div>
            <div style={{ marginTop: 18, fontSize: 10, fontWeight: "bold" }}>
              {i === 0 ? po.preparedBy : i === 1 ? po.approvedBy : i === 2 ? po.financeCheck : ""}
            </div>
            {i === 3 && <div style={{ fontSize: 9, color: "#555", marginTop: 4 }}>Authorised Signatory</div>}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 6, fontSize: 8, color: "#555", borderTop: bdr, paddingTop: 4, textAlign: "center" }}>
        This purchase order is digital approved hence seal and signature is not required.
      </div>
      {company?.address && (
        <div style={{ fontSize: 7.5, color: "#444", marginTop: 4, lineHeight: 1.4 }}>
          REGISTERED OFFICE : {company.address}
          {company.pinCode ? ", Pin: " + company.pinCode : ""}
          {company.email ? " E: " + company.email : ""}
          {company.website ? " W: " + company.website : ""}
        </div>
      )}
      {po.enableTnC && (
        <div style={{ marginTop: 6, fontSize: 7.5, color: "#333", lineHeight: 1.5, borderTop: bdr, paddingTop: 4 }}>
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
          border: "1px solid #bbb",
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
              padding: "4px 16px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: "bold"
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
        @media print {
          .po-print-toolbar { display: none !important; }
          body > * { display: none !important; }
          .po-print-content { display: block !important; overflow: visible !important; padding: 0 !important; background: white !important; }
          .po-page { border: none !important; margin: 0 !important; box-shadow: none !important; }
          .po-main-page { page-break-after: ${po.enableTnC ? "always" : "auto"}; }
          .po-tnc-page { page-break-before: always; }
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
