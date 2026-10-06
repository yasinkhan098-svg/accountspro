"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { authClient } from "@/lib/auth-client";

interface StockItem {
  id: number; companyId: number; name: string; unit: string; unitName?: string;
  openingQty: number; openingRate: number; gstRate: number; hsnCode?: string; under?: string;
}
interface Ledger { id: number; name: string; groupName: string; openingBalance?: number; balanceType?: string; }
interface Company { id: number; name: string; }
interface BOMItem {
  id?: number; stockItemId: number; itemName: string; qty: number | string;
  unit: string; rate: number | string; amount: number;
}
interface BOM {
  id?: number; companyId: number; name: string; finishedItemId: number;
  finishedItemName: string; outputQty: number | string; outputUnit: string;
  narration: string; items: BOMItem[];
}
interface RawMaterial {
  stockItemId: number; itemName: string; requiredQty: number | string;
  actualQty: number | string; unit: string; rate: number | string; amount: number;
}
export interface WastageDetailItem {
  type: string;
  qty: number | string;
  unit: string;
  rate: number | string;
  value: number;
}
type WastageType = string;
interface DirectExpense {
  ledgerId: number | null; ledgerName: string; method: "Amount" | "Percentage";
  percentage: number | string; amount: number | string;
}
interface ManufacturingJournal {
  id?: number; companyId: number; journalNo: string; date: string;
  bomId?: number | null; bomName?: string; finishedItemId: number; finishedItemName: string;
  outputQty: number | string; outputUnit: string; outputRate: number;
  totalRawCost: number; totalDirectExpenses: number; totalCost: number; costPerUnit: number;
  wastageType: string; wastageQty: number | string; wastageUnit: string; wastageValue: number;
  wastageDetails?: WastageDetailItem[];
  narration: string; rawMaterials: RawMaterial[]; directExpenses: DirectExpense[];
}
interface SavedJournal {
  id: number; journalNo: string; date: string; finishedItemName: string;
  outputQty: number; outputUnit: string; totalCost: number; costPerUnit: number; status: string;
}
interface LoadedBOM {
  id: number; name: string; finishedItemId: number; finishedItemName: string;
  outputQty: number; outputUnit: string; items: BOMItem[];
}
interface BOMModuleProps {
  company: Company | null; stockItems: StockItem[]; ledgers: Ledger[];
  onBack: () => void; initialTab?: "bom" | "journal" | "register";
  onAltC?: (ctx: { fieldType: 'stockItem' | 'ledger' | 'group' | 'stockGroup' | 'unit'; onCreated: (newItem: any) => void }) => void;
  onStockUpdated?: () => void;
}

const AVAILABLE_WASTAGE_TYPES: { type: string; icon: string; label: string }[] = [
  { type: "Scrap", icon: "🗑️", label: "Scrap" },
  { type: "Burnt", icon: "🔥", label: "Burnt" },
  { type: "Vaporised", icon: "💨", label: "Vaporised" },
  { type: "Drainage", icon: "🚿", label: "Drainage" },
  { type: "Washed", icon: "💧", label: "Washed" }
];
const WASTAGE_TYPES = ["None", "Scrap", "Burnt", "Vaporised", "Drainage", "Washed"];
const WASTAGE_ICONS: Record<string, string> = {
  None: "✓", Scrap: "🗑️", Burnt: "🔥", Vaporised: "💨", Drainage: "🚿", Washed: "💧"
};
const EXPENSE_LEDGER_GROUPS = ["Direct Expenses","Indirect Expenses","Expenses (Direct)","Expenses (Indirect)"];
const fmt2 = (n: number | string) =>
  (Number(n)||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
const emptyRawMaterial = (): RawMaterial => ({
  stockItemId:0, itemName:"", requiredQty:"", actualQty:"", unit:"Nos", rate:"", amount:0
});
const emptyDirectExpense = (): DirectExpense => ({
  ledgerId:null, ledgerName:"", method:"Amount", percentage:"", amount:""
});
const emptyJournal = (companyId: number): ManufacturingJournal => ({
  companyId, journalNo:"", date: new Date().toISOString().slice(0,10), bomId:null, bomName:"",
  finishedItemId:0, finishedItemName:"", outputQty:"", outputUnit:"Nos", outputRate:0,
  totalRawCost:0, totalDirectExpenses:0, totalCost:0, costPerUnit:0, wastageType:"None",
  wastageQty:"", wastageUnit:"Nos", wastageValue:0, narration:"",
  rawMaterials:[emptyRawMaterial()], directExpenses:[emptyDirectExpense()],
});
// ============================================================
// TALLY-STYLE RIGHT SIDE LIST PANEL (MATCHES SALES & PURCHASE VOUCHER)
// ============================================================
interface TallySideListItem {
  id?: number;
  name: string;
  subText?: string;
  rightText?: string;
  isNegative?: boolean;
  raw?: any;
}

function TallySideListPanel({
  title,
  themeColor = "#1c3a5f",
  items,
  selectedIndex,
  showEndOfList,
  filterText = "",
  onSelect,
  onSelectEndOfList,
  onAltC,
  altCLabel,
  onClose,
  emptyText = "No matching items found"
}: {
  title: string;
  themeColor?: string;
  items: TallySideListItem[];
  selectedIndex: number;
  showEndOfList?: boolean;
  filterText?: string;
  onSelect: (item: any) => void;
  onSelectEndOfList?: () => void;
  onAltC?: () => void;
  altCLabel?: string;
  onClose?: () => void;
  emptyText?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const hasFilter = (filterText || "").trim().length > 0;
  const shouldShowEol = Boolean(showEndOfList && !hasFilter);

  useEffect(() => {
    if (!listRef.current) return;
    const elements = listRef.current.querySelectorAll("[data-side-item]");
    if (elements[selectedIndex]) {
      (elements[selectedIndex] as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  return (
    <div style={{
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      width: 320,
      background: "#dde4f0",
      zIndex: 100,
      borderLeft: `2px solid ${themeColor}`,
      display: "flex",
      flexDirection: "column",
      boxShadow: "-4px 0 16px rgba(0,0,0,0.18)",
      fontFamily: "inherit"
    }}>
      {/* Header */}
      <div style={{
        background: themeColor,
        color: "#fff",
        padding: "8px 14px",
        fontWeight: "bold",
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <span>{title} ({items.length})</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: 14,
              opacity: 0.8
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Alt+C Banner */}
      {onAltC && (
        <div
          onMouseDown={e => {
            e.preventDefault();
            onAltC();
          }}
          style={{
            padding: "5px 14px",
            color: "#8B4000",
            fontSize: 11,
            fontWeight: "bold",
            cursor: "pointer",
            background: "#fffbe6",
            borderBottom: "1px solid #f0d060",
            userSelect: "none"
          }}
        >
          ⚡ {altCLabel || "Alt+C: Create New"}
        </div>
      )}

      {/* List items */}
      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {shouldShowEol && (
          <div
            data-side-item
            onMouseDown={e => {
              e.preventDefault();
              onSelectEndOfList?.();
            }}
            style={{
              padding: "6px 16px",
              cursor: "pointer",
              background: selectedIndex === 0 ? "#ffc436" : "transparent",
              fontWeight: selectedIndex === 0 ? "bold" : "normal",
              fontSize: 12,
              color: "#8B0000",
              borderBottom: "1px solid #cbd5e1"
            }}
          >
            End of List
          </div>
        )}

        {items.length === 0 ? (
          <div style={{ padding: "16px 14px", fontSize: 12, color: "#64748b", fontStyle: "italic", textAlign: "center" }}>
            {emptyText}
          </div>
        ) : (
          items.map((it, idx) => {
            const itemIndex = shouldShowEol ? idx + 1 : idx;
            const isSelected = selectedIndex === itemIndex;
            return (
              <div
                key={idx}
                data-side-item
                onMouseDown={e => {
                  e.preventDefault();
                  onSelect(it.raw || it.name);
                }}
                style={{
                  padding: "6px 16px",
                  cursor: "pointer",
                  background: isSelected ? "#ffc436" : "transparent",
                  fontWeight: isSelected ? "bold" : "normal",
                  fontSize: 12,
                  color: "#1e293b",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid rgba(0,0,0,0.03)"
                }}
              >
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>
                  <span>{it.name}</span>
                  {it.subText && (
                    <div style={{ fontSize: 10, color: "#64748b", fontWeight: "normal" }}>{it.subText}</div>
                  )}
                </div>
                {it.rightText && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: "bold",
                    color: it.isNegative ? "#dc2626" : "#0f766e",
                    whiteSpace: "nowrap"
                  }}>
                    {it.rightText}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
// ============================================================
// BOM TEMPLATE FORM
// ============================================================
function BOMForm({
  company, stockItems, editingBOM, onSave, onCancel, onAltC
}: {
  company: Company|null; stockItems: StockItem[]; editingBOM: BOM|null;
  onSave: ()=>void; onCancel: ()=>void;
  onAltC?: (ctx: { fieldType: 'stockItem' | 'ledger' | 'group' | 'stockGroup' | 'unit'; onCreated: (newItem: any) => void }) => void;
}) {
  // Track which rows are loading their purchase rate
  const [rateLoadingRows, setRateLoadingRows] = useState<Record<number, boolean>>({});
  const narrationRef = useRef<HTMLTextAreaElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const outputQtyRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false); // prevent double-save
  const [form, setForm] = useState<BOM>(editingBOM || {
    companyId: company?.id||0, name:"", finishedItemId:0, finishedItemName:"",
    outputQty:1, outputUnit:"Nos", narration:"",
    items:[{stockItemId:0, itemName:"", qty:"", unit:"Nos", rate:"", amount:0}]
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const rowRefs = useRef<Array<{
    itemRef: React.RefObject<HTMLInputElement>; qtyRef: React.RefObject<HTMLInputElement>;
    unitRef: React.RefObject<HTMLInputElement>; rateRef: React.RefObject<HTMLInputElement>;
  }>>([]);

  // Side List Drawer State
  const [activeSideField, setActiveSideField] = useState<
    { type: 'finishedProduct' } | { type: 'rawMaterial'; idx: number } | null
  >(null);
  const [sideFilter, setSideFilter] = useState("");
  const [sideSelectedIndex, setSideSelectedIndex] = useState(0);

  const filteredStockItems = stockItems.filter(s =>
    s.name.toLowerCase().includes(sideFilter.toLowerCase().trim())
  );

  const finishedSideItems: TallySideListItem[] = filteredStockItems.map(s => ({
    id: s.id,
    name: s.name,
    subText: s.under || undefined,
    rightText: `${s.openingQty || 0} ${s.unit || s.unitName || 'Nos'}`,
    raw: s
  }));

  const rawSideItems: TallySideListItem[] = filteredStockItems.map(s => ({
    id: s.id,
    name: s.name,
    subText: s.under || undefined,
    rightText: `${s.openingQty || 0} ${s.unit || s.unitName || 'Nos'}`,
    raw: s
  }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key==="Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); return; }
      // Ctrl+A = Save BOM Template
      if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="a") {
        e.preventDefault(); e.stopPropagation(); saveButtonRef.current?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const ensureRefs = (len: number) => {
    while (rowRefs.current.length < len) {
      rowRefs.current.push({
        itemRef: React.createRef<HTMLInputElement>(),
        qtyRef: React.createRef<HTMLInputElement>(),
        unitRef: React.createRef<HTMLInputElement>(),
        rateRef: React.createRef<HTMLInputElement>(),
      });
    }
  };
  ensureRefs(form.items.length);

  const fetchPurchaseRate = async (stockItemId: number, idx: number) => {
    if (!company?.id || !stockItemId) return;
    setRateLoadingRows(prev => ({...prev, [idx]: true}));
    try {
      const token = authClient.getToken();
      const res = await fetch(
        `/api/stock-items?purchaseRate=1&stockItemId=${stockItemId}&companyId=${company.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const d = await res.json();
      if (d.success && (d.rate !== undefined)) {
        setForm(f => {
          const items = [...f.items];
          if (!items[idx]) return f;
          const rate = parseFloat(d.rate) || 0;
          items[idx] = {...items[idx], rate, amount: (parseFloat(String(items[idx].qty))||0) * rate};
          return {...f, items};
        });
      }
    } catch(e) { /* silent */ }
    setRateLoadingRows(prev => ({...prev, [idx]: false}));
  };

  const updateRow = (idx: number, key: keyof BOMItem, val: any) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = {...items[idx], [key]:val};
      if (key==="qty"||key==="rate") {
        const q = parseFloat(key==="qty"?val:String(items[idx].qty))||0;
        const r = parseFloat(key==="rate"?val:String(items[idx].rate))||0;
        items[idx].amount = q*r;
      }
      if (key==="itemName") {
        const si = stockItems.find(s=>s.name.toLowerCase()===String(val).toLowerCase());
        if (si) {
          items[idx].stockItemId = si.id;
          items[idx].unit = si.unit||si.unitName||"Nos";
          // Temporarily set openingRate; purchase rate will be fetched async below
          items[idx].rate = si.openingRate||0;
          items[idx].amount = (parseFloat(String(items[idx].qty))||0) * (si.openingRate||0);
        }
      }
      return {...f, items};
    });
    // After state update, fetch the real purchase rate
    if (key==="itemName") {
      const si = stockItems.find(s=>s.name.toLowerCase()===String(val).toLowerCase());
      if (si) fetchPurchaseRate(si.id, idx);
    }
  };

  const selectFinishedItem = (item: any) => {
    const si = typeof item === 'string'
      ? stockItems.find(s => s.name.toLowerCase() === item.toLowerCase())
      : item;
    if (si) {
      setForm(f => ({
        ...f,
        finishedItemName: si.name,
        finishedItemId: si.id || 0,
        outputUnit: si.unit || si.unitName || f.outputUnit
      }));
    } else if (typeof item === 'string') {
      setForm(f => ({ ...f, finishedItemName: item }));
    }
    setActiveSideField(null);
    setTimeout(() => outputQtyRef.current?.focus(), 30);
  };

  const handleFinishedKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      e.stopPropagation();
      onAltC?.({
        fieldType: 'stockItem',
        onCreated: (newItem: any) => {
          if (newItem?.name) {
            const unit = newItem.unit || newItem.unitName || form.outputUnit;
            setForm(f => ({
              ...f,
              finishedItemName: newItem.name,
              finishedItemId: newItem.id || 0,
              outputUnit: unit
            }));
            setActiveSideField(null);
            setTimeout(() => outputQtyRef.current?.focus(), 30);
          }
        }
      });
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSideSelectedIndex(prev => Math.min(prev + 1, Math.max(0, filteredStockItems.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSideSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const picked = filteredStockItems[sideSelectedIndex];
      if (picked) {
        selectFinishedItem(picked);
      } else {
        setActiveSideField(null);
        outputQtyRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      setActiveSideField(null);
    }
  };

  const selectRawItem = (idx: number, item: any) => {
    const itemName = typeof item === 'string' ? item : item?.name;
    if (itemName) {
      updateRow(idx, "itemName", itemName);
      setActiveSideField(null);
      setTimeout(() => rowRefs.current[idx]?.qtyRef?.current?.focus(), 30);
    }
  };

  const handleSelectEndOfList = () => {
    cleanupBlankRows();
    setActiveSideField(null);
    setTimeout(() => narrationRef.current?.focus(), 30);
  };

  const handleRawItemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      e.stopPropagation();
      onAltC?.({
        fieldType: 'stockItem',
        onCreated: (newItem: any) => {
          if (newItem?.name) {
            updateRow(idx, "itemName", newItem.name);
            setActiveSideField(null);
            setTimeout(() => rowRefs.current[idx]?.qtyRef?.current?.focus(), 30);
          }
        }
      });
      return;
    }
    const hasFilter = sideFilter.trim().length > 0;
    const hasEol = !hasFilter;
    const maxIndex = hasEol ? filteredStockItems.length : Math.max(0, filteredStockItems.length - 1);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSideSelectedIndex(prev => Math.min(prev + 1, maxIndex));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSideSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hasEol) {
        if (sideSelectedIndex === 0) {
          handleSelectEndOfList();
        } else {
          const picked = filteredStockItems[sideSelectedIndex - 1];
          if (picked) {
            selectRawItem(idx, picked);
          } else if (form.items[idx]?.itemName.trim()) {
            setActiveSideField(null);
            rowRefs.current[idx]?.qtyRef?.current?.focus();
          } else {
            handleSelectEndOfList();
          }
        }
      } else {
        const picked = filteredStockItems[sideSelectedIndex];
        if (picked) {
          selectRawItem(idx, picked);
        } else if (form.items[idx]?.itemName.trim()) {
          setActiveSideField(null);
          rowRefs.current[idx]?.qtyRef?.current?.focus();
        } else {
          handleSelectEndOfList();
        }
      }
    } else if (e.key === "Tab") {
      if (!form.items[idx]?.itemName.trim()) {
        e.preventDefault();
        handleSelectEndOfList();
      } else {
        setActiveSideField(null);
        e.preventDefault();
        rowRefs.current[idx]?.qtyRef?.current?.focus();
      }
    } else if (e.key === "Escape") {
      setActiveSideField(null);
    }
  };

  const addRowAndFocus = (afterIdx: number) => {
    const newIdx = afterIdx + 1;
    setForm(f => {
      const newItems = [...f.items];
      newItems.splice(newIdx, 0, {stockItemId:0,itemName:"",qty:"",unit:"Nos",rate:"",amount:0});
      return {...f, items:newItems};
    });
    ensureRefs(form.items.length + 1);
    setTimeout(() => {
      rowRefs.current[newIdx]?.itemRef?.current?.focus();
    }, 50);
  };

  const removeRow = (idx: number) => setForm(f => ({...f, items:f.items.filter((_,i)=>i!==idx)}));

  const cleanupBlankRows = () => {
    setForm(f => {
      const filled = f.items.filter(i => i.itemName.trim());
      return {
        ...f,
        items: filled.length > 0 ? filled : [{stockItemId:0,itemName:"",qty:"",unit:"Nos",rate:"",amount:0}]
      };
    });
  };

  const addNewRow = () => {
    setForm(f => ({
      ...f,
      items: [...f.items, {stockItemId:0,itemName:"",qty:"",unit:"Nos",rate:"",amount:0}]
    }));
    ensureRefs(form.items.length + 1);
    setTimeout(() => {
      rowRefs.current[form.items.length]?.itemRef?.current?.focus();
    }, 50);
  };

  const handleRateTab = (idx: number) => {
    // If current row's item is blank → clean up blank rows and go to Narration
    if (!form.items[idx]?.itemName.trim()) {
      cleanupBlankRows();
      setActiveSideField(null);
      setTimeout(() => narrationRef.current?.focus(), 30);
      return;
    }
    if (idx===form.items.length-1) { addRowAndFocus(idx); }
    else { rowRefs.current[idx+1]?.itemRef?.current?.focus(); }
  };

  const totalRawCost = form.items.reduce((s,i)=>s+(parseFloat(String(i.rate))||0)*(parseFloat(String(i.qty))||0),0);

  const handleSave = async () => {
    if (saved || saving) return; // prevent double-save
    if (!form.name.trim()) { setError("BOM Name required"); return; }
    if (!form.finishedItemName.trim()) { setError("Finished Item required"); return; }
    if (form.items.filter(i=>i.itemName.trim()).length===0) { setError("Add at least one Raw Material"); return; }
    setSaving(true); setError("");
    try {
      const token = authClient.getToken();
      const method = form.id ? "PUT" : "POST";
      const res = await fetch("/api/bom", {
        method,
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({...form, saveType:"bom", items:form.items.filter(i=>i.itemName.trim())})
      });
      const d = await res.json();
      if (d.success) { setSaved(true); onSave(); } else setError(d.error||"Save failed");
    } catch(e:any) { setError(e.message); }
    setSaving(false);
  };

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"}}>
      <div style={{background:"#1c3a5f",color:"white",padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:18}}>🏭</span>
        <div>
          <div style={{fontWeight:"bold",fontSize:14}}>{form.id?"Edit BOM Template":"New BOM Template"}</div>
          <div style={{fontSize:11,opacity:0.8}}>Bill of Materials — Define raw materials for a finished product</div>
        </div>
        <button onClick={onCancel} style={{marginLeft:"auto",background:"rgba(255,255,255,0.15)",border:"none",color:"white",padding:"5px 14px",borderRadius:3,cursor:"pointer"}}>✕ Cancel</button>
      </div>
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: 20,
        marginRight: activeSideField ? 320 : 0,
        transition: "margin-right 0.15s ease"
      }}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:16,background:"#f8fafc",padding:14,borderRadius:6,border:"1px solid #e2e8f0"}}>
          <div>
            <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:"bold"}}>BOM NAME *</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
              placeholder="e.g. Malham1" style={{width:"100%",padding:"7px 10px",border:"2px solid #1c5282",borderRadius:4,fontSize:13,fontWeight:"bold",boxSizing:"border-box"}}/>
          </div>
          <div>
            <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:"bold"}}>FINISHED PRODUCT *</label>
            <input
              value={form.finishedItemName}
              onChange={e => {
                setForm(f => ({ ...f, finishedItemName: e.target.value }));
                setSideFilter(e.target.value);
                setSideSelectedIndex(0);
              }}
              onFocus={() => {
                setActiveSideField({ type: 'finishedProduct' });
                setSideFilter(form.finishedItemName);
                setSideSelectedIndex(0);
              }}
              onClick={() => {
                setActiveSideField({ type: 'finishedProduct' });
                setSideFilter(form.finishedItemName);
                setSideSelectedIndex(0);
              }}
              onKeyDown={handleFinishedKeyDown}
              placeholder="Select Item..."
              style={{
                width: "100%",
                padding: "7px 10px",
                border: activeSideField?.type === 'finishedProduct' ? "2px solid #1c3a5f" : "1px solid #cbd5e1",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: "bold",
                boxSizing: "border-box",
                background: "#fff"
              }}
            />
          </div>
          <div>
            <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:"bold"}}>OUTPUT QUANTITY</label>
            <input ref={outputQtyRef} type="number" min={0} step="any" value={form.outputQty} onChange={e=>setForm(f=>({...f,outputQty:e.target.value}))}
              style={{width:"100%",padding:"7px 10px",border:"1px solid #cbd5e1",borderRadius:4,fontSize:13,boxSizing:"border-box"}}/>
          </div>
          <div>
            <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:"bold"}}>OUTPUT UNIT</label>
            <input value={form.outputUnit} onChange={e=>setForm(f=>({...f,outputUnit:e.target.value}))}
              style={{width:"100%",padding:"7px 10px",border:"1px solid #cbd5e1",borderRadius:4,fontSize:13,boxSizing:"border-box"}}/>
          </div>
        </div>
        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:6,overflow:"hidden",marginBottom:16}}>
          <div style={{background:"#1c3a5f",color:"white",padding:"8px 14px",fontWeight:"bold",fontSize:12,display:"flex",alignItems:"center",gap:8}}>
            🧪 Raw Materials List
            <span style={{fontSize:10,opacity:0.8,marginLeft:4}}>— Items required to manufacture {form.finishedItemName||"the finished product"}</span>
            <span style={{marginLeft:"auto",background:"rgba(255,255,255,0.2)",padding:"2px 10px",borderRadius:10,fontSize:11}}>Total: ₹{fmt2(totalRawCost)}</span>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#f1f5f9"}}>
                <th style={{padding:"8px 6px",textAlign:"center",borderBottom:"1px solid #e2e8f0",width:36}}>#</th>
                <th style={{padding:"8px 6px",textAlign:"left",borderBottom:"1px solid #e2e8f0"}}>Item Name</th>
                <th style={{padding:"8px 6px",textAlign:"right",borderBottom:"1px solid #e2e8f0",width:100}}>Quantity</th>
                <th style={{padding:"8px 6px",textAlign:"center",borderBottom:"1px solid #e2e8f0",width:80}}>Unit</th>
                <th style={{padding:"8px 6px",textAlign:"right",borderBottom:"1px solid #e2e8f0",width:100}}>Rate (₹)</th>
                <th style={{padding:"8px 6px",textAlign:"right",borderBottom:"1px solid #e2e8f0",width:110}}>Amount (₹)</th>
                <th style={{width:36,borderBottom:"1px solid #e2e8f0"}}/>
              </tr>
            </thead>
            <tbody>
              {form.items.map((row,idx)=>{
                ensureRefs(idx+1);
                const refs = rowRefs.current[idx];
                const isItemActive = activeSideField?.type === 'rawMaterial' && activeSideField.idx === idx;
                return (
                  <tr key={idx} style={{borderBottom:"1px solid #f1f5f9"}}>
                    <td style={{textAlign:"center",color:"#94a3b8",fontSize:11,padding:"4px 6px"}}>{idx+1}</td>
                    <td style={{padding:"4px 6px"}}>
                      <input
                        ref={refs.itemRef}
                        value={row.itemName}
                        onChange={e => {
                          updateRow(idx, "itemName", e.target.value);
                          setSideFilter(e.target.value);
                          setSideSelectedIndex(0);
                        }}
                        onFocus={() => {
                          setActiveSideField({ type: 'rawMaterial', idx });
                          setSideFilter(row.itemName);
                          setSideSelectedIndex(0);
                        }}
                        onClick={() => {
                          setActiveSideField({ type: 'rawMaterial', idx });
                          setSideFilter(row.itemName);
                          setSideSelectedIndex(0);
                        }}
                        onKeyDown={e => handleRawItemKeyDown(e, idx)}
                        placeholder="Select raw material..."
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          border: isItemActive ? "2px solid #1c3a5f" : "1px solid #cbd5e1",
                          borderRadius: 3,
                          fontSize: 12,
                          boxSizing: "border-box",
                          background: "#fff"
                        }}
                      />
                    </td>
                    <td style={{padding:"4px 6px"}}>
                      <input ref={refs.qtyRef} type="number" min={0} step="any" value={row.qty}
                        onChange={e=>updateRow(idx,"qty",e.target.value)}
                        onKeyDown={e=>{if(e.key==="Tab"||e.key==="Enter"){e.preventDefault();refs.unitRef.current?.focus();}}}
                        style={{width:"100%",padding:"5px",border:"1px solid #cbd5e1",borderRadius:3,textAlign:"right",fontSize:12}}/>
                    </td>
                    <td style={{padding:"4px 6px"}}>
                      <input ref={refs.unitRef} value={row.unit} onChange={e=>updateRow(idx,"unit",e.target.value)}
                        onKeyDown={e=>{if(e.key==="Tab"||e.key==="Enter"){e.preventDefault();refs.rateRef.current?.focus();}}}
                        style={{width:"100%",padding:"5px",border:"1px solid #cbd5e1",borderRadius:3,textAlign:"center",fontSize:12}}/>
                    </td>
                    <td style={{padding:"4px 6px",position:"relative"}}>
                      <input ref={refs.rateRef} type="number" min={0} step="any" value={row.rate}
                        onChange={e=>updateRow(idx,"rate",e.target.value)}
                        onKeyDown={e=>{if(e.key==="Tab"||e.key==="Enter"){e.preventDefault();handleRateTab(idx);}}}
                        style={{width:"100%",padding:"5px",border:rateLoadingRows[idx]?"1px solid #7c3aed":"1px solid #cbd5e1",borderRadius:3,textAlign:"right",fontSize:12,background:rateLoadingRows[idx]?"#ede9fe":undefined}}/>
                      {rateLoadingRows[idx]&&<span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:9,color:"#7c3aed"}}>⏳</span>}
                    </td>
                    <td style={{padding:"4px 6px",textAlign:"right",fontWeight:"bold",color:"#0f766e"}}>₹{fmt2(row.amount)}</td>
                    <td style={{padding:"4px 6px",textAlign:"center"}}>
                      {form.items.length>1&&(
                        <button onClick={()=>removeRow(idx)} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:3,padding:"2px 8px",cursor:"pointer",fontSize:11}}>✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{background:"#f0fdf4",borderTop:"2px solid #16a34a"}}>
                <td colSpan={2} style={{padding:"8px 12px",fontWeight:"bold",fontSize:12}}>TOTAL</td>
                <td style={{padding:"8px 6px",textAlign:"right",fontWeight:"bold",fontSize:12}}>
                  {form.items.reduce((s,i)=>s+(parseFloat(String(i.qty))||0),0).toFixed(3)}
                </td>
                <td/><td/>
                <td style={{padding:"8px 6px",textAlign:"right",fontWeight:"bold",fontSize:13,color:"#16a34a"}}>₹{fmt2(totalRawCost)}</td>
                <td/>
              </tr>
            </tfoot>
          </table>
          <div style={{padding:"6px 12px",background:"#f8fafc",borderTop:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <button type="button" onClick={addNewRow} style={{background:"#fff",border:"1px solid #cbd5e1",color:"#1e293b",padding:"4px 12px",borderRadius:4,fontSize:11,cursor:"pointer",fontWeight:"600",display:"inline-flex",alignItems:"center",gap:4}}>
              + Add Raw Material
            </button>
            <span style={{fontSize:11,color:"#64748b"}}>💡 Enter on blank item or &apos;End of List&apos; jumps to Narration</span>
          </div>
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:"bold"}}>NARRATION</label>
          <textarea ref={narrationRef} value={form.narration} onChange={e=>setForm(f=>({...f,narration:e.target.value}))} rows={2}
            placeholder="Optional notes about this BOM..."
            onKeyDown={e=>{
              // Tab or Enter from Narration → focus Save button
              if (e.key==="Tab"||e.key==="Enter") { e.preventDefault(); saveButtonRef.current?.focus(); }
            }}
            style={{width:"100%",padding:"8px",border:"1px solid #cbd5e1",borderRadius:4,fontSize:12,resize:"vertical",boxSizing:"border-box"}}/>
        </div>
        {error&&<div style={{background:"#fee2e2",color:"#dc2626",padding:"8px 12px",borderRadius:4,marginBottom:12,fontSize:12}}>{error}</div>}
        <div style={{display:"flex",gap:10}}>
          <button ref={saveButtonRef} onClick={handleSave} disabled={saving||saved}
            style={{background:(saving||saved)?"#94a3b8":"#1c3a5f",color:"white",border:"none",borderRadius:4,padding:"10px 28px",cursor:(saving||saved)?"not-allowed":"pointer",fontWeight:"bold",fontSize:13}}>
            {saving?"Saving...":saved?"✓ Saved!":"✓ Save BOM Template (Ctrl+A)"}
          </button>
          <button onClick={onCancel} style={{background:"#f1f5f9",color:"#475569",border:"1px solid #cbd5e1",borderRadius:4,padding:"10px 20px",cursor:"pointer",fontSize:13}}>Cancel</button>
        </div>
      </div>

      {/* Tally Right-Side Drawer Panel for BOM Form */}
      {activeSideField && (
        <TallySideListPanel
          title="List of Stock Items"
          themeColor="#1c3a5f"
          items={activeSideField.type === 'finishedProduct' ? finishedSideItems : rawSideItems}
          selectedIndex={sideSelectedIndex}
          showEndOfList={activeSideField.type === 'rawMaterial'}
          filterText={sideFilter}
          onSelect={item => {
            if (activeSideField.type === 'finishedProduct') {
              selectFinishedItem(item);
            } else {
              selectRawItem(activeSideField.idx, item);
            }
          }}
          onSelectEndOfList={handleSelectEndOfList}
          onAltC={() => {
            onAltC?.({
              fieldType: 'stockItem',
              onCreated: (newItem: any) => {
                if (newItem?.name) {
                  if (activeSideField.type === 'finishedProduct') {
                    const unit = newItem.unit || newItem.unitName || form.outputUnit;
                    setForm(f => ({
                      ...f,
                      finishedItemName: newItem.name,
                      finishedItemId: newItem.id || 0,
                      outputUnit: unit
                    }));
                    setActiveSideField(null);
                    setTimeout(() => outputQtyRef.current?.focus(), 30);
                  } else {
                    updateRow(activeSideField.idx, "itemName", newItem.name);
                    setActiveSideField(null);
                    setTimeout(() => rowRefs.current[activeSideField.idx]?.qtyRef?.current?.focus(), 30);
                  }
                }
              }
            });
          }}
          altCLabel="Alt+C: Create New Stock Item"
          onClose={() => setActiveSideField(null)}
          emptyText="No matching stock items found"
        />
      )}
    </div>
  );
}
// ============================================================
// MANUFACTURING JOURNAL FORM
// ============================================================
function ManufacturingJournalForm({
  company, stockItems, ledgers, boms, onSave, onCancel, onAltC
}: {
  company: Company|null; stockItems: StockItem[]; ledgers: Ledger[];
  boms: any[]; onSave: ()=>void; onCancel: ()=>void;
  onAltC?: (ctx: { fieldType: 'stockItem' | 'ledger' | 'group' | 'stockGroup' | 'unit'; onCreated: (newItem: any) => void }) => void;
}) {
  const [form, setForm] = useState<ManufacturingJournal>(emptyJournal(company?.id||0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingBOM, setLoadingBOM] = useState(false);
  const loadedBOMRef = useRef<LoadedBOM|null>(null);
  const mjNarrationRef = useRef<HTMLTextAreaElement>(null);
  const mjOutputQtyRef = useRef<HTMLInputElement>(null);

  const rmRefs = useRef<Array<{
    itemRef:React.RefObject<HTMLInputElement>; reqRef:React.RefObject<HTMLInputElement>;
    actRef:React.RefObject<HTMLInputElement>; unitRef:React.RefObject<HTMLInputElement>;
    rateRef:React.RefObject<HTMLInputElement>;
  }>>([]);
  const deRefs = useRef<Array<{
    ledgerRef: React.RefObject<HTMLInputElement>;
    amtRef: React.RefObject<HTMLInputElement>;
    methodRef: React.RefObject<HTMLSelectElement>;
    pctRef: React.RefObject<HTMLInputElement>;
  }>>([]);

  // Wastage multi-selection & breakdown state
  const [selectedWastageTypes, setSelectedWastageTypes] = useState<string[]>([]);
  const [wastageItems, setWastageItems] = useState<Record<string, { qty: string; unit: string; rate: string; value: number }>>({});

  // Side drawer state
  const [activeSideField, setActiveSideField] = useState<
    { type: 'finishedProduct' } | { type: 'rawMaterial'; idx: number } | { type: 'expenseLedger'; idx: number } | null
  >(null);
  const [sideFilter, setSideFilter] = useState("");
  const [sideSelectedIndex, setSideSelectedIndex] = useState(0);

  const filteredStockItems = stockItems.filter(s =>
    s.name.toLowerCase().includes(sideFilter.toLowerCase().trim())
  );
  const expenseLedgers = ledgers.filter(l => EXPENSE_LEDGER_GROUPS.includes(l.groupName));
  const otherLedgers = ledgers.filter(l => !EXPENSE_LEDGER_GROUPS.includes(l.groupName));
  const availableLedgers = expenseLedgers.length > 0 ? expenseLedgers : ledgers;
  const filteredLedgers = (
    expenseLedgers.length > 0
      ? [
          ...expenseLedgers.filter(l => l.name.toLowerCase().includes(sideFilter.toLowerCase().trim())),
          ...(sideFilter.trim() ? otherLedgers.filter(l => l.name.toLowerCase().includes(sideFilter.toLowerCase().trim())) : [])
        ]
      : ledgers.filter(l => l.name.toLowerCase().includes(sideFilter.toLowerCase().trim()))
  );

  const mjFinishedSideItems: TallySideListItem[] = filteredStockItems.map(s => ({
    id: s.id,
    name: s.name,
    subText: s.under || undefined,
    rightText: `${s.openingQty || 0} ${s.unit || s.unitName || 'Nos'}`,
    raw: s
  }));

  const mjRawSideItems: TallySideListItem[] = filteredStockItems.map(s => ({
    id: s.id,
    name: s.name,
    subText: s.under || undefined,
    rightText: `${s.openingQty || 0} ${s.unit || s.unitName || 'Nos'}`,
    raw: s
  }));

  const deSideItems: TallySideListItem[] = filteredLedgers.map(l => ({
    id: l.id,
    name: l.name,
    subText: l.groupName,
    rightText: l.openingBalance !== undefined
      ? `${Math.abs(l.openingBalance).toFixed(2)} ${l.balanceType || (l.openingBalance >= 0 ? 'Dr' : 'Cr')}`
      : undefined,
    raw: l
  }));

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();onCancel();}};
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[onCancel]);

  const totalRawCost = form.rawMaterials.reduce((s,r)=>s+(parseFloat(String(r.rate))||0)*(parseFloat(String(r.actualQty))||0),0);
  const totalDirectExp = form.directExpenses.reduce((s,d)=>s+(parseFloat(String(d.amount))||0),0);
  const totalCost = totalRawCost+totalDirectExp;
  const outputQtyN = parseFloat(String(form.outputQty))||0;
  const costPerUnit = outputQtyN>0?totalCost/outputQtyN:0;
  const totalRawQty = form.rawMaterials.reduce((s,r)=>s+(parseFloat(String(r.actualQty))||0),0);
  const wastageQtyAuto = totalRawQty - outputQtyN;

  const ensureRMRefs = (len:number) => {
    while(rmRefs.current.length<len) {
      rmRefs.current.push({
        itemRef:React.createRef<HTMLInputElement>(),reqRef:React.createRef<HTMLInputElement>(),
        actRef:React.createRef<HTMLInputElement>(),unitRef:React.createRef<HTMLInputElement>(),
        rateRef:React.createRef<HTMLInputElement>(),
      });
    }
  };
  ensureRMRefs(form.rawMaterials.length);

  const ensureDERefs = (len:number) => {
    while(deRefs.current.length<len) {
      deRefs.current.push({
        ledgerRef: React.createRef<HTMLInputElement>(),
        amtRef: React.createRef<HTMLInputElement>(),
        methodRef: React.createRef<HTMLSelectElement>(),
        pctRef: React.createRef<HTMLInputElement>()
      });
    }
  };
  ensureDERefs(form.directExpenses.length + 2);

  const loadBOM = async (bomId:number) => {
    if(!bomId) return;
    setLoadingBOM(true);
    try {
      const token=authClient.getToken();
      const res=await fetch(`/api/bom?id=${bomId}`,{headers:{Authorization:`Bearer ${token}`}});
      const d=await res.json();
      if(d.success&&d.bom) {
        const bomOutputQty=parseFloat(d.bom.outputQty)||1;
        loadedBOMRef.current={
          id:d.bom.id, name:d.bom.name, finishedItemId:d.bom.finishedItemId,
          finishedItemName:d.bom.finishedItemName, outputQty:bomOutputQty,
          outputUnit:d.bom.outputUnit, items:d.items||[]
        };
        setForm(f=>{
          const currentOut=parseFloat(String(f.outputQty))||bomOutputQty;
          const ratio=currentOut/bomOutputQty;
          return {
            ...f, bomId, bomName:d.bom.name, finishedItemId:d.bom.finishedItemId,
            finishedItemName:d.bom.finishedItemName, outputQty:currentOut, outputUnit:d.bom.outputUnit,
            rawMaterials:(d.items||[]).filter((it:any)=>it.itemName?.trim()).map((it:any)=>{
              const bq=parseFloat(String(it.qty||0));
              const r=parseFloat(String(it.rate||0));
              const calcQty=bq*ratio;
              return {stockItemId:it.stockItemId,itemName:it.itemName,requiredQty:parseFloat(calcQty.toFixed(4)),
                actualQty:parseFloat(calcQty.toFixed(4)),unit:it.unit,rate:r,amount:parseFloat((calcQty*r).toFixed(2))};
            })
          };
        });
      }
    } catch(e){}
    setLoadingBOM(false);
  };

  const handleOutputQtyChange = (newQtyStr:string) => {
    setForm(f=>{
      const newQty=parseFloat(newQtyStr)||0;
      const bom=loadedBOMRef.current;
      if(!bom||bom.items.length===0) return {...f,outputQty:newQtyStr};
      const bomOutQty=bom.outputQty||1;
      const ratio=newQty/bomOutQty;
      const newRMs:RawMaterial[]=bom.items.filter(it=>String(it.itemName||'').trim()).map(it=>{
        const bq=parseFloat(String(it.qty))||0;
        const r=parseFloat(String(it.rate))||0;
        const cq=bq*ratio;
        return {stockItemId:it.stockItemId,itemName:it.itemName,
          requiredQty:parseFloat(cq.toFixed(4)),actualQty:parseFloat(cq.toFixed(4)),
          unit:it.unit,rate:r,amount:parseFloat((cq*r).toFixed(2))};
      });
      return {...f,outputQty:newQtyStr,rawMaterials:newRMs.length>0?newRMs:[emptyRawMaterial()]};
    });
  };

  const fetchRMPurchaseRate = async (stockItemId:number, idx:number) => {
    if(!company?.id||!stockItemId) return;
    try {
      const token=authClient.getToken();
      const res=await fetch(`/api/stock-items?purchaseRate=1&stockItemId=${stockItemId}&companyId=${company.id}`,
        {headers:{Authorization:`Bearer ${token}`}});
      const d=await res.json();
      if(d.success&&d.rate!==undefined){
        setForm(f=>{
          const rms=[...f.rawMaterials];
          if(!rms[idx]) return f;
          const rate=parseFloat(d.rate)||0;
          rms[idx]={...rms[idx],rate,amount:(parseFloat(String(rms[idx].actualQty))||0)*rate};
          return {...f,rawMaterials:rms};
        });
      }
    } catch(e){}
  };

  const updateRM = (idx:number, key:keyof RawMaterial, val:any) => {
    setForm(f=>{
      const rms=[...f.rawMaterials];
      rms[idx]={...rms[idx],[key]:val};
      if(key==="actualQty"||key==="rate"){
        const q=parseFloat(key==="actualQty"?val:String(rms[idx].actualQty))||0;
        const r=parseFloat(key==="rate"?val:String(rms[idx].rate))||0;
        rms[idx].amount=q*r;
      }
      if(key==="itemName"){
        const si=stockItems.find(s=>s.name.toLowerCase()===String(val).toLowerCase());
        if(si){
          rms[idx].stockItemId=si.id;
          rms[idx].unit=si.unit||si.unitName||"Nos";
          // Temporarily set openingRate; purchase rate fetched async below
          rms[idx].rate=si.openingRate||0;
          rms[idx].amount=(parseFloat(String(rms[idx].actualQty))||0)*(si.openingRate||0);
        }
      }
      return {...f,rawMaterials:rms};
    });
    // Fetch real purchase rate after state update
    if(key==="itemName"){
      const si=stockItems.find(s=>s.name.toLowerCase()===String(val).toLowerCase());
      if(si) fetchRMPurchaseRate(si.id, idx);
    }
  };

  const selectMJFinishedItem = (item: any) => {
    const si = typeof item === 'string'
      ? stockItems.find(s => s.name.toLowerCase() === item.toLowerCase())
      : item;
    if (si) {
      setForm(f => ({
        ...f,
        finishedItemName: si.name,
        finishedItemId: si.id || 0,
        outputUnit: si.unit || si.unitName || f.outputUnit
      }));
    } else if (typeof item === 'string') {
      setForm(f => ({ ...f, finishedItemName: item }));
    }
    setActiveSideField(null);
    setTimeout(() => mjOutputQtyRef.current?.focus(), 30);
  };

  const handleMJFinishedKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      e.stopPropagation();
      onAltC?.({
        fieldType: 'stockItem',
        onCreated: (newItem: any) => {
          if (newItem?.name) {
            const unit = newItem.unit || newItem.unitName || form.outputUnit;
            setForm(f => ({
              ...f,
              finishedItemName: newItem.name,
              finishedItemId: newItem.id || 0,
              outputUnit: unit
            }));
            setActiveSideField(null);
            setTimeout(() => mjOutputQtyRef.current?.focus(), 30);
          }
        }
      });
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSideSelectedIndex(prev => Math.min(prev + 1, Math.max(0, filteredStockItems.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSideSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const picked = filteredStockItems[sideSelectedIndex];
      if (picked) {
        selectMJFinishedItem(picked);
      } else {
        setActiveSideField(null);
        mjOutputQtyRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      setActiveSideField(null);
    }
  };

  const selectMJRawItem = (idx: number, item: any) => {
    const itemName = typeof item === 'string' ? item : item?.name;
    if (itemName) {
      updateRM(idx, "itemName", itemName);
      setActiveSideField(null);
      setTimeout(() => rmRefs.current[idx]?.reqRef?.current?.focus(), 30);
    }
  };

  const cleanupRMBlankRows = () => {
    setForm(f => {
      const filled = f.rawMaterials.filter(r => r.itemName.trim());
      return {
        ...f,
        rawMaterials: filled.length > 0 ? filled : [emptyRawMaterial()]
      };
    });
  };

  const handleMJRawEndOfList = () => {
    cleanupRMBlankRows();
    setActiveSideField(null);
    setTimeout(() => {
      if (deRefs.current[0]?.ledgerRef?.current) {
        deRefs.current[0].ledgerRef.current.focus();
      } else {
        mjNarrationRef.current?.focus();
      }
    }, 30);
  };

  const handleMJRawKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      e.stopPropagation();
      onAltC?.({
        fieldType: 'stockItem',
        onCreated: (newItem: any) => {
          if (newItem?.name) {
            updateRM(idx, "itemName", newItem.name);
            setActiveSideField(null);
            setTimeout(() => rmRefs.current[idx]?.reqRef?.current?.focus(), 30);
          }
        }
      });
      return;
    }
    const hasFilter = sideFilter.trim().length > 0;
    const hasEol = !hasFilter;
    const maxIndex = hasEol ? filteredStockItems.length : Math.max(0, filteredStockItems.length - 1);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSideSelectedIndex(prev => Math.min(prev + 1, maxIndex));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSideSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hasEol) {
        if (sideSelectedIndex === 0) {
          handleMJRawEndOfList();
        } else {
          const picked = filteredStockItems[sideSelectedIndex - 1];
          if (picked) {
            selectMJRawItem(idx, picked);
          } else if (form.rawMaterials[idx]?.itemName.trim()) {
            setActiveSideField(null);
            rmRefs.current[idx]?.reqRef?.current?.focus();
          } else {
            handleMJRawEndOfList();
          }
        }
      } else {
        const picked = filteredStockItems[sideSelectedIndex];
        if (picked) {
          selectMJRawItem(idx, picked);
        } else if (form.rawMaterials[idx]?.itemName.trim()) {
          setActiveSideField(null);
          rmRefs.current[idx]?.reqRef?.current?.focus();
        } else {
          handleMJRawEndOfList();
        }
      }
    } else if (e.key === "Tab") {
      if (!form.rawMaterials[idx]?.itemName.trim()) {
        e.preventDefault();
        handleMJRawEndOfList();
      } else {
        setActiveSideField(null);
        e.preventDefault();
        rmRefs.current[idx]?.reqRef?.current?.focus();
      }
    } else if (e.key === "Escape") {
      setActiveSideField(null);
    }
  };

  const handleRMRateTab = (idx:number) => {
    // If current row's item is blank → clean up blank rows and go to Direct Expenses or Narration
    if (!form.rawMaterials[idx]?.itemName.trim()) {
      handleMJRawEndOfList();
      return;
    }
    if(idx===form.rawMaterials.length-1){
      setForm(f=>({...f,rawMaterials:[...f.rawMaterials,emptyRawMaterial()]}));
      ensureRMRefs(idx+2);
      setTimeout(()=>{rmRefs.current[idx+1]?.itemRef?.current?.focus();},50);
    } else { rmRefs.current[idx+1]?.itemRef?.current?.focus(); }
  };

  const updateDE = (idx:number, key:keyof DirectExpense, val:any) => {
    setForm(f=>{
      const des=[...f.directExpenses];
      des[idx]={...des[idx],[key]:val};
      if(key==="ledgerName"){const led=availableLedgers.find(l=>l.name.toLowerCase()===String(val).toLowerCase());if(led)des[idx].ledgerId=led.id;}
      if(des[idx].method==="Percentage"&&(key==="percentage"||key==="method")){
        const pct=parseFloat(key==="percentage"?val:String(des[idx].percentage))||0;
        des[idx].amount=(totalRawCost*pct)/100;
      }
      return {...f,directExpenses:des};
    });
  };

  const selectMJExpenseLedger = (idx: number, item: any) => {
    const lName = typeof item === 'string' ? item : item?.name;
    const matchedLedger = typeof item === 'object' && item?.id ? item : (availableLedgers.find(l=>l.name.toLowerCase()===lName?.toLowerCase()) || ledgers.find(l=>l.name.toLowerCase()===lName?.toLowerCase()));
    const lId = matchedLedger?.id || null;
    if (lName) {
      setForm(f => {
        const des = [...f.directExpenses];
        if (des[idx]) {
          des[idx] = { ...des[idx], ledgerName: lName, ledgerId: lId };
        }
        return { ...f, directExpenses: des };
      });
      setActiveSideField(null);
      setSideFilter("");
      setSideSelectedIndex(0);
      setTimeout(() => {
        const currentMethod = form.directExpenses[idx]?.method || "Amount";
        if (currentMethod === "Percentage") {
          deRefs.current[idx]?.pctRef?.current?.focus();
        } else {
          deRefs.current[idx]?.amtRef?.current?.focus();
        }
      }, 50);
    }
  };

  const handleMJExpenseEndOfList = (blankIdx?: number) => {
    setForm(f => {
      let filled = f.directExpenses.filter((d, i) => {
        if (blankIdx !== undefined && i === blankIdx && !d.ledgerName.trim()) return false;
        return d.ledgerName.trim().length > 0;
      });
      if (filled.length === 0) filled = [emptyDirectExpense()];
      return {
        ...f,
        directExpenses: filled
      };
    });
    setActiveSideField(null);
    setSideFilter("");
    setSideSelectedIndex(0);
    setTimeout(() => mjNarrationRef.current?.focus(), 30);
  };

  const handleMJExpenseKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      e.stopPropagation();
      onAltC?.({
        fieldType: 'ledger',
        onCreated: (newItem: any) => {
          if (newItem?.name) {
            selectMJExpenseLedger(idx, newItem);
          }
        }
      });
      return;
    }
    const hasFilter = sideFilter.trim().length > 0;
    const hasEol = !hasFilter; // End of List only shown at top when no search query
    const maxIndex = hasEol ? filteredLedgers.length : Math.max(0, filteredLedgers.length - 1);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSideSelectedIndex(prev => Math.min(prev + 1, maxIndex));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSideSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hasEol) {
        if (sideSelectedIndex === 0) {
          handleMJExpenseEndOfList(idx);
        } else {
          const picked = filteredLedgers[sideSelectedIndex - 1];
          if (picked) {
            selectMJExpenseLedger(idx, picked);
          } else if (form.directExpenses[idx]?.ledgerName.trim()) {
            setActiveSideField(null);
            if (form.directExpenses[idx]?.method === "Percentage") {
              deRefs.current[idx]?.pctRef?.current?.focus();
            } else {
              deRefs.current[idx]?.amtRef?.current?.focus();
            }
          } else {
            handleMJExpenseEndOfList(idx);
          }
        }
      } else {
        const picked = filteredLedgers[sideSelectedIndex];
        if (picked) {
          selectMJExpenseLedger(idx, picked);
        } else if (form.directExpenses[idx]?.ledgerName.trim()) {
          setActiveSideField(null);
          if (form.directExpenses[idx]?.method === "Percentage") {
            deRefs.current[idx]?.pctRef?.current?.focus();
          } else {
            deRefs.current[idx]?.amtRef?.current?.focus();
          }
        } else {
          handleMJExpenseEndOfList(idx);
        }
      }
    } else if (e.key === "Tab") {
      if (!form.directExpenses[idx]?.ledgerName.trim()) {
        e.preventDefault();
        handleMJExpenseEndOfList(idx);
      } else {
        setActiveSideField(null);
        e.preventDefault();
        if (form.directExpenses[idx]?.method === "Percentage") {
          deRefs.current[idx]?.pctRef?.current?.focus();
        } else {
          deRefs.current[idx]?.amtRef?.current?.focus();
        }
      }
    } else if (e.key === "Escape") {
      setActiveSideField(null);
    }
  };

  const handleDEAmountEnter = (idx: number) => {
    if (idx === form.directExpenses.length - 1) {
      setForm(f => ({
        ...f,
        directExpenses: [...f.directExpenses, emptyDirectExpense()]
      }));
      ensureDERefs(idx + 3);
      setTimeout(() => {
        deRefs.current[idx + 1]?.ledgerRef?.current?.focus();
        setActiveSideField({ type: 'expenseLedger', idx: idx + 1 });
        setSideFilter('');
        setSideSelectedIndex(0);
      }, 50);
    } else {
      deRefs.current[idx + 1]?.ledgerRef?.current?.focus();
      setActiveSideField({ type: 'expenseLedger', idx: idx + 1 });
      setSideFilter(form.directExpenses[idx + 1]?.ledgerName || '');
      setSideSelectedIndex(0);
    }
  };

  const removeDERow = (idx: number) => {
    setForm(f => {
      const updated = f.directExpenses.filter((_, i) => i !== idx);
      return {
        ...f,
        directExpenses: updated.length > 0 ? updated : [emptyDirectExpense()]
      };
    });
    if (activeSideField?.type === 'expenseLedger' && activeSideField.idx === idx) {
      setActiveSideField(null);
    }
  };

  const toggleWastageType = (t: string) => {
    setSelectedWastageTypes(prev => {
      const exists = prev.includes(t);
      const next = exists ? prev.filter(x => x !== t) : [...prev, t];

      setWastageItems(curItems => {
        const updated = { ...curItems };
        if (exists) {
          delete updated[t];
          if (next.length > 0) {
            const splitQty = (Math.max(0, wastageQtyAuto) / next.length).toFixed(3);
            for (const remType of next) {
              if (!updated[remType]?.qty || parseFloat(updated[remType].qty) === 0) {
                const r = updated[remType]?.rate || "0";
                updated[remType] = {
                  qty: splitQty,
                  unit: updated[remType]?.unit || form.outputUnit || "Nos",
                  rate: r,
                  value: (parseFloat(splitQty) || 0) * (parseFloat(r) || 0)
                };
              }
            }
          }
        } else {
          const splitQty = next.length > 0 ? (Math.max(0, wastageQtyAuto) / next.length).toFixed(3) : "0";
          updated[t] = {
            qty: splitQty,
            unit: form.outputUnit || "Nos",
            rate: "0",
            value: 0
          };
          if (next.length > 1) {
            for (const ot of next) {
              if (parseFloat(updated[ot]?.qty || "0") === Math.max(0, wastageQtyAuto)) {
                const r = updated[ot]?.rate || "0";
                updated[ot] = {
                  ...updated[ot],
                  qty: splitQty,
                  value: (parseFloat(splitQty) || 0) * (parseFloat(r) || 0)
                };
              }
            }
          }
        }
        return updated;
      });
      return next;
    });
  };

  const selectNoneWastage = () => {
    setSelectedWastageTypes([]);
    setWastageItems({});
  };

  const autoSplitWastage = () => {
    if (selectedWastageTypes.length === 0) return;
    const splitQty = (Math.max(0, wastageQtyAuto) / selectedWastageTypes.length).toFixed(3);
    setWastageItems(prev => {
      const next: Record<string, { qty: string; unit: string; rate: string; value: number }> = {};
      for (const t of selectedWastageTypes) {
        const r = prev[t]?.rate || "0";
        next[t] = {
          qty: splitQty,
          unit: prev[t]?.unit || form.outputUnit || "Nos",
          rate: r,
          value: (parseFloat(splitQty) || 0) * (parseFloat(r) || 0)
        };
      }
      return next;
    });
  };

  const updateWastageItemField = (t: string, field: 'qty' | 'rate' | 'unit', val: string) => {
    setWastageItems(prev => {
      const cur = prev[t] || { qty: "0", unit: form.outputUnit || "Nos", rate: "0", value: 0 };
      const q = field === 'qty' ? val : cur.qty;
      const r = field === 'rate' ? val : cur.rate;
      const u = field === 'unit' ? val : cur.unit;
      const numQ = parseFloat(q) || 0;
      const numR = parseFloat(r) || 0;
      return {
        ...prev,
        [t]: {
          qty: q,
          rate: r,
          unit: u,
          value: numQ * numR
        }
      };
    });
  };

  const totalWastageSelectedQty = selectedWastageTypes.reduce((s, t) => s + (parseFloat(wastageItems[t]?.qty || "0") || 0), 0);
  const totalWastageSelectedVal = selectedWastageTypes.reduce((s, t) => s + (wastageItems[t]?.value || 0), 0);

  const handleSave = async () => {
    if(!form.finishedItemName.trim()){setError("Finished Item is required");return;}
    if(!outputQtyN){setError("Output Quantity is required");return;}
    if(form.rawMaterials.filter(r=>r.itemName.trim()).length===0){setError("Add at least one Raw Material");return;}
    setSaving(true); setError("");
    try {
      const token=authClient.getToken();
      const wastageDetailsArray: WastageDetailItem[] = selectedWastageTypes.map(t => {
        const it = wastageItems[t] || { qty: "0", unit: form.outputUnit || "Nos", rate: "0", value: 0 };
        return {
          type: t,
          qty: parseFloat(it.qty) || 0,
          unit: it.unit || form.outputUnit || "Nos",
          rate: parseFloat(it.rate) || 0,
          value: it.value || 0
        };
      });

      const payload = {
        ...form,
        totalRawCost,
        totalDirectExpenses: totalDirectExp,
        totalCost,
        costPerUnit,
        wastageType: selectedWastageTypes.length > 0 ? selectedWastageTypes.join(", ") : "None",
        wastageQty: totalWastageSelectedQty,
        wastageUnit: form.outputUnit,
        wastageValue: totalWastageSelectedVal,
        wastageDetails: wastageDetailsArray,
        rawMaterials: form.rawMaterials.filter(r=>r.itemName.trim()),
        directExpenses: form.directExpenses.filter(d=>d.ledgerName.trim()),
      };
      const res=await fetch("/api/bom",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body:JSON.stringify({...payload,saveType:"journal"})
      });
      const d=await res.json();
      if(d.success) onSave(); else setError(d.error||"Save failed");
    } catch(e:any){setError(e.message);}
    setSaving(false);
  };

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"}}>
      <div style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)",color:"white",padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:20}}>⚙️</span>
        <div>
          <div style={{fontWeight:"bold",fontSize:14}}>Manufacturing Journal</div>
          <div style={{fontSize:11,opacity:0.85}}>Convert raw materials into finished goods — auto stock update</div>
        </div>
        <button onClick={onCancel} style={{marginLeft:"auto",background:"rgba(255,255,255,0.2)",border:"none",color:"white",padding:"5px 14px",borderRadius:3,cursor:"pointer"}}>✕ Cancel</button>
      </div>
      <div style={{
        flex:1,
        overflowY:"auto",
        padding:20,
        background:"#f8fafc",
        marginRight: activeSideField ? 320 : 0,
        transition: "margin-right 0.15s ease"
      }}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:16,background:"#fff",padding:14,borderRadius:6,border:"1px solid #e2e8f0"}}>
          <div>
            <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:"bold"}}>DATE</label>
            <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
              style={{width:"100%",padding:"7px 10px",border:"1px solid #cbd5e1",borderRadius:4,fontSize:12,boxSizing:"border-box"}}/>
          </div>
          <div>
            <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:"bold"}}>LOAD FROM BOM (Optional)</label>
            <select value={form.bomId||""} onChange={e=>{const v=parseInt(e.target.value);setForm(f=>({...f,bomId:v||null}));if(v)loadBOM(v);}}
              style={{width:"100%",padding:"7px 10px",border:"1px solid #cbd5e1",borderRadius:4,fontSize:12,boxSizing:"border-box"}}>
              <option value="">-- Select BOM Template --</option>
              {boms.map((b:any)=><option key={b.id} value={b.id}>{b.name} ({b.finishedItemName})</option>)}
            </select>
            {loadingBOM&&<span style={{fontSize:10,color:"#7c3aed"}}>Loading BOM...</span>}
          </div>
          <div>
            <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:"bold"}}>FINISHED PRODUCT *</label>
            <input
              value={form.finishedItemName}
              onChange={e => {
                setForm(f => ({ ...f, finishedItemName: e.target.value }));
                setSideFilter(e.target.value);
                setSideSelectedIndex(0);
              }}
              onFocus={() => {
                setActiveSideField({ type: 'finishedProduct' });
                setSideFilter(form.finishedItemName);
                setSideSelectedIndex(0);
              }}
              onClick={() => {
                setActiveSideField({ type: 'finishedProduct' });
                setSideFilter(form.finishedItemName);
                setSideSelectedIndex(0);
              }}
              onKeyDown={handleMJFinishedKeyDown}
              placeholder="Select Item..."
              style={{
                width: "100%",
                padding: "7px 10px",
                border: activeSideField?.type === 'finishedProduct' ? "2px solid #7c3aed" : "1px solid #cbd5e1",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: "bold",
                boxSizing: "border-box",
                background: "#fff"
              }}
            />
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            <div>
              <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:"bold"}}>OUTPUT QTY *</label>
              <input ref={mjOutputQtyRef} type="number" min={0} step="any" value={form.outputQty}
                onChange={e=>handleOutputQtyChange(e.target.value)}
                style={{width:"100%",padding:"7px 10px",border:"2px solid #7c3aed",borderRadius:4,fontSize:13,fontWeight:"bold",boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:"bold"}}>UNIT</label>
              <input value={form.outputUnit} onChange={e=>setForm(f=>({...f,outputUnit:e.target.value}))}
                style={{width:"100%",padding:"7px 10px",border:"1px solid #cbd5e1",borderRadius:4,fontSize:12,boxSizing:"border-box"}}/>
            </div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:16,marginBottom:16}}>
          <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:6,overflow:"hidden"}}>
            <div style={{background:"#1c3a5f",color:"white",padding:"8px 14px",fontWeight:"bold",fontSize:12,display:"flex",alignItems:"center"}}>
              🧪 Raw Materials Consumed
              <span style={{marginLeft:"auto",background:"rgba(255,255,255,0.2)",padding:"2px 8px",borderRadius:10,fontSize:11}}>₹{fmt2(totalRawCost)}</span>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{background:"#f1f5f9"}}>
                  <th style={{padding:"7px 5px",textAlign:"center",borderBottom:"1px solid #e2e8f0",width:28}}>#</th>
                  <th style={{padding:"7px 5px",textAlign:"left",borderBottom:"1px solid #e2e8f0"}}>Item</th>
                  <th style={{padding:"7px 5px",textAlign:"right",borderBottom:"1px solid #e2e8f0",width:80}}>Req. Qty</th>
                  <th style={{padding:"7px 5px",textAlign:"right",borderBottom:"1px solid #e2e8f0",width:80}}>Actual Qty</th>
                  <th style={{padding:"7px 5px",textAlign:"center",borderBottom:"1px solid #e2e8f0",width:55}}>Unit</th>
                  <th style={{padding:"7px 5px",textAlign:"right",borderBottom:"1px solid #e2e8f0",width:75}}>Rate</th>
                  <th style={{padding:"7px 5px",textAlign:"right",borderBottom:"1px solid #e2e8f0",width:90}}>Amount</th>
                  <th style={{width:30,borderBottom:"1px solid #e2e8f0"}}/>
                </tr>
              </thead>
              <tbody>
                {form.rawMaterials.map((rm,idx)=>{
                  ensureRMRefs(idx+1);
                  const refs=rmRefs.current[idx];
                  const isItemActive = activeSideField?.type === 'rawMaterial' && activeSideField.idx === idx;
                  return (
                    <tr key={idx} style={{borderBottom:"1px solid #f8fafc"}}>
                      <td style={{textAlign:"center",color:"#94a3b8",padding:"3px 4px"}}>{idx+1}</td>
                      <td style={{padding:"3px 4px"}}>
                        <input
                          ref={refs.itemRef}
                          value={rm.itemName}
                          onChange={e => {
                            updateRM(idx, "itemName", e.target.value);
                            setSideFilter(e.target.value);
                            setSideSelectedIndex(0);
                          }}
                          onFocus={() => {
                            setActiveSideField({ type: 'rawMaterial', idx });
                            setSideFilter(rm.itemName);
                            setSideSelectedIndex(0);
                          }}
                          onClick={() => {
                            setActiveSideField({ type: 'rawMaterial', idx });
                            setSideFilter(rm.itemName);
                            setSideSelectedIndex(0);
                          }}
                          onKeyDown={e => handleMJRawKeyDown(e, idx)}
                          placeholder="Item..."
                          style={{
                            width: "100%",
                            padding: "5px 6px",
                            border: isItemActive ? "2px solid #7c3aed" : "1px solid #cbd5e1",
                            borderRadius: 3,
                            fontSize: 11,
                            boxSizing: "border-box",
                            background: "#fff"
                          }}
                        />
                      </td>
                      <td style={{padding:"3px 4px"}}>
                        <input ref={refs.reqRef} type="number" min={0} step="any" value={rm.requiredQty}
                          onChange={e=>setForm(f=>{const rms=[...f.rawMaterials];rms[idx]={...rms[idx],requiredQty:e.target.value};return{...f,rawMaterials:rms};})}
                          onKeyDown={e=>{if(e.key==="Tab"||e.key==="Enter"){e.preventDefault();refs.actRef.current?.focus();}}}
                          style={{width:"100%",padding:"4px",border:"1px solid #e2e8f0",borderRadius:3,textAlign:"right",fontSize:11,background:"#f0f9ff"}}/>
                      </td>
                      <td style={{padding:"3px 4px"}}>
                        <input ref={refs.actRef} type="number" min={0} step="any" value={rm.actualQty}
                          onChange={e=>updateRM(idx,"actualQty",e.target.value)}
                          onKeyDown={e=>{if(e.key==="Tab"||e.key==="Enter"){e.preventDefault();refs.unitRef.current?.focus();}}}
                          style={{width:"100%",padding:"4px",border:"1px solid #cbd5e1",borderRadius:3,textAlign:"right",fontSize:11,fontWeight:"bold"}}/>
                      </td>
                      <td style={{padding:"3px 4px"}}>
                        <input ref={refs.unitRef} value={rm.unit}
                          onChange={e=>setForm(f=>{const rms=[...f.rawMaterials];rms[idx].unit=e.target.value;return{...f,rawMaterials:rms};})}
                          onKeyDown={e=>{if(e.key==="Tab"||e.key==="Enter"){e.preventDefault();refs.rateRef.current?.focus();}}}
                          style={{width:"100%",padding:"4px",border:"1px solid #e2e8f0",borderRadius:3,textAlign:"center",fontSize:11}}/>
                      </td>
                      <td style={{padding:"3px 4px"}}>
                        <input ref={refs.rateRef} type="number" min={0} step="any" value={rm.rate}
                          onChange={e=>updateRM(idx,"rate",e.target.value)}
                          onKeyDown={e=>{if(e.key==="Tab"||e.key==="Enter"){e.preventDefault();handleRMRateTab(idx);}}}
                          style={{width:"100%",padding:"4px",border:"1px solid #cbd5e1",borderRadius:3,textAlign:"right",fontSize:11}}/>
                      </td>
                      <td style={{padding:"3px 4px",textAlign:"right",fontWeight:"bold",color:"#0f766e",fontSize:11}}>₹{fmt2(rm.amount)}</td>
                      <td style={{padding:"3px 4px",textAlign:"center"}}>
                        {form.rawMaterials.length>1&&(
                          <button onClick={()=>setForm(f=>({...f,rawMaterials:f.rawMaterials.filter((_,i)=>i!==idx)}))}
                            style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:12}}>✕</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{background:"#f0fdf4",borderTop:"2px solid #16a34a"}}>
                  <td colSpan={3} style={{padding:"7px 6px",fontWeight:"bold",fontSize:11}}>TOTAL RAW QTY: {totalRawQty.toFixed(3)} {form.outputUnit}</td>
                  <td colSpan={3}/>
                  <td style={{padding:"7px 5px",textAlign:"right",fontWeight:"bold",fontSize:12,color:"#16a34a"}}>₹{fmt2(totalRawCost)}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:6,overflow:"hidden"}}>
              <div style={{background:"#b45309",color:"white",padding:"8px 14px",fontWeight:"bold",fontSize:12,display:"flex",alignItems:"center"}}>
                💰 Direct Expenses
                <span style={{marginLeft:"auto",background:"rgba(255,255,255,0.2)",padding:"2px 8px",borderRadius:10,fontSize:11}}>₹{fmt2(totalDirectExp)}</span>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{background:"#fffbeb"}}>
                    <th style={{padding:"6px 5px",textAlign:"left",borderBottom:"1px solid #fde68a"}}>Expense Ledger</th>
                    <th style={{padding:"6px 5px",textAlign:"center",borderBottom:"1px solid #fde68a",width:80}}>Method</th>
                    <th style={{padding:"6px 5px",textAlign:"right",borderBottom:"1px solid #fde68a",width:85}}>Amount (₹)</th>
                    <th style={{width:26,borderBottom:"1px solid #fde68a"}}/>
                  </tr>
                </thead>
                <tbody>
                  {form.directExpenses.map((de,idx)=>{
                    ensureDERefs(idx+2);
                    const refs=deRefs.current[idx];
                    const isLedgerActive = activeSideField?.type === 'expenseLedger' && activeSideField.idx === idx;
                    return (
                      <tr key={idx} style={{borderBottom:"1px solid #fef9c3"}}>
                        <td style={{padding:"3px 5px"}}>
                          <input
                            ref={refs?.ledgerRef}
                            value={de.ledgerName}
                            onChange={e => {
                              updateDE(idx, "ledgerName", e.target.value);
                              setSideFilter(e.target.value);
                              setSideSelectedIndex(0);
                            }}
                            onFocus={() => {
                              setActiveSideField({ type: 'expenseLedger', idx });
                              setSideFilter("");
                              setSideSelectedIndex(0);
                            }}
                            onClick={() => {
                              setActiveSideField({ type: 'expenseLedger', idx });
                              setSideFilter("");
                              setSideSelectedIndex(0);
                            }}
                            onKeyDown={e => handleMJExpenseKeyDown(e, idx)}
                            placeholder="Expense Ledger (Enter on blank to finish)..."
                            style={{
                              width: "100%",
                              padding: "5px 6px",
                              border: isLedgerActive ? "2px solid #b45309" : "1px solid #cbd5e1",
                              borderRadius: 3,
                              fontSize: 11,
                              boxSizing: "border-box",
                              background: "#fff"
                            }}
                          />
                        </td>
                        <td style={{padding:"3px 4px"}}>
                          <select
                            ref={refs?.methodRef}
                            value={de.method}
                            onChange={e=>updateDE(idx,"method",e.target.value as "Amount"|"Percentage")}
                            onKeyDown={e => {
                              if (e.key === "Enter" || e.key === "Tab") {
                                e.preventDefault();
                                if (de.method === "Percentage") {
                                  refs?.pctRef?.current?.focus();
                                } else {
                                  refs?.amtRef?.current?.focus();
                                }
                              }
                            }}
                            style={{width:"100%",padding:"4px",border:"1px solid #e2e8f0",borderRadius:3,fontSize:11}}>
                            <option value="Amount">₹ Amt</option>
                            <option value="Percentage">% Pct</option>
                          </select>
                        </td>
                        <td style={{padding:"3px 4px"}}>
                          {de.method==="Percentage"?(
                            <div style={{display:"flex",gap:3,alignItems:"center"}}>
                              <input
                                ref={refs?.pctRef}
                                type="number" min={0} step="any" value={de.percentage}
                                onChange={e=>updateDE(idx,"percentage",e.target.value)}
                                onKeyDown={e=>{if(e.key==="Enter"||e.key==="Tab"){e.preventDefault();handleDEAmountEnter(idx);}}}
                                style={{width:50,padding:"4px",border:"1px solid #cbd5e1",borderRadius:3,textAlign:"right",fontSize:11}}/>
                              <span style={{fontSize:10,color:"#64748b"}}>% = ₹{fmt2(Number(de.amount))}</span>
                            </div>
                          ):(
                            <input
                              ref={refs?.amtRef}
                              type="number" min={0} step="any" value={de.amount}
                              onChange={e=>updateDE(idx,"amount",e.target.value)}
                              onKeyDown={e=>{if(e.key==="Enter"||e.key==="Tab"){e.preventDefault();handleDEAmountEnter(idx);}}}
                              placeholder="0.00"
                              style={{width:"100%",padding:"4px",border:"1px solid #cbd5e1",borderRadius:3,textAlign:"right",fontSize:11}}/>
                          )}
                        </td>
                        <td style={{padding:"3px 4px",textAlign:"center"}}>
                          {form.directExpenses.length>1&&(
                            <button onClick={()=>removeDERow(idx)}
                              style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:12}}>✕</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:"#fef3c7",borderTop:"1px solid #fde68a"}}>
                    <td colSpan={2} style={{padding:"5px 8px",fontWeight:"bold",fontSize:11,color:"#92400e"}}>
                      Total Direct Expenses ({form.directExpenses.filter(d=>d.ledgerName.trim()).length} ledgers)
                    </td>
                    <td style={{padding:"5px 8px",textAlign:"right",fontWeight:"bold",fontSize:11,color:"#b45309"}}>
                      ₹{fmt2(totalDirectExp)}
                    </td>
                    <td/>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* WASTAGE / LOSS DETAILS WITH MULTI-SELECT CHECKBOXES & AUTO-CALCULATION */}
            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:6,overflow:"hidden"}}>
              <div style={{background:"#dc2626",color:"white",padding:"8px 14px",fontWeight:"bold",fontSize:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span>♻️ Wastage / Loss Details</span>
                {selectedWastageTypes.length > 0 && (
                  <span style={{background:"rgba(255,255,255,0.25)",padding:"2px 8px",borderRadius:10,fontSize:10}}>
                    {totalWastageSelectedQty.toFixed(3)} {form.outputUnit} | ₹{fmt2(totalWastageSelectedVal)}
                  </span>
                )}
              </div>
              <div style={{padding:12}}>
                <div style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <label style={{fontSize:10,color:"#64748b",fontWeight:"bold",letterSpacing:0.5}}>SELECT WASTAGE TYPES (Check all that apply)</label>
                    {selectedWastageTypes.length > 1 && (
                      <button
                        type="button"
                        onClick={autoSplitWastage}
                        title="Distribute auto wastage difference equally across all selected types"
                        style={{background:"#fee2e2",border:"1px solid #fca5a5",color:"#b91c1c",borderRadius:3,padding:"2px 8px",fontSize:10,cursor:"pointer",fontWeight:"bold"}}>
                        ⚡ Auto-Split Evenly
                      </button>
                    )}
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                    <button
                      type="button"
                      onClick={selectNoneWastage}
                      style={{
                        padding:"5px 10px",fontSize:11,borderRadius:4,cursor:"pointer",fontWeight:"bold",
                        background:selectedWastageTypes.length===0?"#dc2626":"#f1f5f9",
                        color:selectedWastageTypes.length===0?"white":"#475569",
                        border:selectedWastageTypes.length===0?"none":"1px solid #e2e8f0"
                      }}>
                      ✓ None
                    </button>
                    {AVAILABLE_WASTAGE_TYPES.map(t=>(
                      <label
                        key={t.type}
                        style={{
                          display:"inline-flex",alignItems:"center",gap:6,padding:"5px 10px",
                          fontSize:11,borderRadius:4,cursor:"pointer",fontWeight:"bold",
                          background:selectedWastageTypes.includes(t.type)?"#fee2e2":"#f8fafc",
                          color:selectedWastageTypes.includes(t.type)?"#b91c1c":"#334155",
                          border:selectedWastageTypes.includes(t.type)?"1.5px solid #dc2626":"1px solid #cbd5e1",
                          userSelect:"none"
                        }}>
                        <input
                          type="checkbox"
                          checked={selectedWastageTypes.includes(t.type)}
                          onChange={()=>toggleWastageType(t.type)}
                          style={{cursor:"pointer",accentColor:"#dc2626"}}
                        />
                        <span>{t.icon} {t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Auto Difference Banner */}
                <div style={{background:"#fff5f5",border:"1px solid #fecaca",padding:"6px 10px",borderRadius:4,marginBottom:10,fontSize:11,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <span style={{color:"#64748b"}}>Auto Wastage Difference: </span>
                    <b style={{color:"#dc2626",fontSize:12}}>{Math.max(0,wastageQtyAuto).toFixed(3)} {form.outputUnit}</b>
                  </div>
                  <div style={{fontSize:10,color:"#94a3b8"}}>
                    Raw Consumed: {totalRawQty.toFixed(3)} − Output: {outputQtyN.toFixed(3)}
                  </div>
                </div>

                {/* Multi-type Breakdown Table */}
                {selectedWastageTypes.length > 0 && (
                  <div style={{background:"#fff",border:"1px solid #fecaca",borderRadius:4,overflow:"hidden"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                      <thead>
                        <tr style={{background:"#fef2f2",color:"#991b1b"}}>
                          <th style={{padding:"5px 8px",textAlign:"left",borderBottom:"1px solid #fee2e2"}}>Wastage Type</th>
                          <th style={{padding:"5px 6px",textAlign:"right",borderBottom:"1px solid #fee2e2",width:80}}>Qty</th>
                          <th style={{padding:"5px 4px",textAlign:"center",borderBottom:"1px solid #fee2e2",width:45}}>Unit</th>
                          <th style={{padding:"5px 6px",textAlign:"right",borderBottom:"1px solid #fee2e2",width:70}}>Rate (₹)</th>
                          <th style={{padding:"5px 8px",textAlign:"right",borderBottom:"1px solid #fee2e2",width:85}}>Scrap Val (₹)</th>
                          <th style={{width:24,borderBottom:"1px solid #fee2e2"}}/>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedWastageTypes.map(t=>{
                          const it = wastageItems[t] || { qty: "0", unit: form.outputUnit || "Nos", rate: "0", value: 0 };
                          const icon = AVAILABLE_WASTAGE_TYPES.find(x => x.type === t)?.icon || "♻️";
                          return (
                            <tr key={t} style={{borderBottom:"1px solid #fef2f2"}}>
                              <td style={{padding:"4px 8px",fontWeight:"bold",color:"#991b1b"}}>
                                {icon} {t}
                              </td>
                              <td style={{padding:"3px 6px"}}>
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={it.qty}
                                  onChange={e=>updateWastageItemField(t, 'qty', e.target.value)}
                                  placeholder="0.00"
                                  style={{width:"100%",padding:"3px 5px",border:"1px solid #fca5a5",borderRadius:3,fontSize:11,textAlign:"right",fontWeight:"bold"}}
                                />
                              </td>
                              <td style={{padding:"3px 4px"}}>
                                <input
                                  value={it.unit || form.outputUnit}
                                  onChange={e=>updateWastageItemField(t, 'unit', e.target.value)}
                                  style={{width:"100%",padding:"3px 2px",border:"1px solid #cbd5e1",borderRadius:3,fontSize:11,textAlign:"center"}}
                                />
                              </td>
                              <td style={{padding:"3px 6px"}}>
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={it.rate}
                                  onChange={e=>updateWastageItemField(t, 'rate', e.target.value)}
                                  placeholder="0.00"
                                  style={{width:"100%",padding:"3px 5px",border:"1px solid #cbd5e1",borderRadius:3,fontSize:11,textAlign:"right"}}
                                />
                              </td>
                              <td style={{padding:"4px 8px",textAlign:"right",fontWeight:"bold",color:"#0f766e"}}>
                                ₹{fmt2(it.value)}
                              </td>
                              <td style={{padding:"3px 4px",textAlign:"center"}}>
                                <button
                                  type="button"
                                  onClick={()=>toggleWastageType(t)}
                                  title={`Remove ${t}`}
                                  style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:12}}>
                                  ✕
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{background:"#fef2f2",borderTop:"1px solid #fca5a5",fontWeight:"bold"}}>
                          <td style={{padding:"5px 8px",color:"#991b1b"}}>TOTAL WASTAGE</td>
                          <td style={{padding:"5px 6px",textAlign:"right",color:"#b91c1c"}}>
                            {totalWastageSelectedQty.toFixed(3)}
                          </td>
                          <td style={{padding:"5px 4px",textAlign:"center",fontSize:10,color:"#64748b"}}>
                            {form.outputUnit}
                          </td>
                          <td/>
                          <td style={{padding:"5px 8px",textAlign:"right",color:"#0f766e"}}>
                            ₹{fmt2(totalWastageSelectedVal)}
                          </td>
                          <td/>
                        </tr>
                      </tfoot>
                    </table>
                    <div style={{padding:"6px 10px",background:"#f8fafc",borderTop:"1px solid #f1f5f9",fontSize:10,color:"#64748b"}}>
                      📦 Each selected wastage item will be auto-recorded in Opening Stock under <b>&apos;Wastage &amp; Scrap&apos;</b> upon posting.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{background:"linear-gradient(135deg,#1c3a5f,#2d5282)",color:"white",borderRadius:8,padding:16,marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:"bold",marginBottom:12,opacity:0.9,letterSpacing:1}}>📊 MANUFACTURING COST SUMMARY</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
            {[
              {label:"Raw Material Cost",val:totalRawCost,color:"#93c5fd"},
              {label:"Direct Expenses",val:totalDirectExp,color:"#fcd34d"},
              {label:"Total Cost",val:totalCost,color:"#86efac",big:true},
              {label:`Cost per ${form.outputUnit||"Unit"}`,val:costPerUnit,color:"#f9a8d4",big:true},
              {label:`Output Qty (${form.outputUnit})`,val:outputQtyN,color:"#a5f3fc",isQty:true},
            ].map((item,i)=>(
              <div key={i} style={{textAlign:"center",background:"rgba(255,255,255,0.1)",borderRadius:6,padding:"10px 6px"}}>
                <div style={{fontSize:9,opacity:0.75,marginBottom:4}}>{item.label}</div>
                <div style={{fontSize:item.big?16:14,fontWeight:"bold",color:item.color}}>
                  {item.isQty?(item.val).toFixed(3):`₹${fmt2(item.val)}`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{marginBottom:16}}>
          <textarea ref={mjNarrationRef} value={form.narration} onChange={e=>setForm(f=>({...f,narration:e.target.value}))} rows={2}
            placeholder="Narration (optional)..."
            style={{width:"100%",padding:"8px",border:"1px solid #cbd5e1",borderRadius:4,fontSize:12,resize:"vertical",boxSizing:"border-box"}}/>
        </div>

        {error&&<div style={{background:"#fee2e2",color:"#dc2626",padding:"8px 12px",borderRadius:4,marginBottom:12,fontSize:12}}>⚠ {error}</div>}

        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <button onClick={handleSave} disabled={saving}
            style={{background:saving?"#94a3b8":"linear-gradient(135deg,#7c3aed,#4f46e5)",color:"white",border:"none",borderRadius:4,padding:"11px 28px",cursor:saving?"not-allowed":"pointer",fontWeight:"bold",fontSize:13}}>
            {saving?"⏳ Processing...":"✓ Post Manufacturing Journal"}
          </button>
          <button onClick={onCancel} style={{background:"#f1f5f9",color:"#475569",border:"1px solid #cbd5e1",borderRadius:4,padding:"11px 20px",cursor:"pointer",fontSize:13}}>Cancel</button>
          <div style={{marginLeft:"auto",fontSize:11,color:"#94a3b8"}}>
            📦 After posting, {outputQtyN} {form.outputUnit} of <b>{form.finishedItemName||"product"}</b> will be added to stock at ₹{fmt2(costPerUnit)}/{form.outputUnit}
          </div>
        </div>
      </div>

      {/* Tally Right-Side Drawer Panel for Manufacturing Journal */}
      {activeSideField && (
        <TallySideListPanel
          title={
            activeSideField.type === 'expenseLedger'
              ? "List of Expense Ledgers"
              : "List of Stock Items"
          }
          themeColor={activeSideField.type === 'expenseLedger' ? "#b45309" : "#7c3aed"}
          items={
            activeSideField.type === 'expenseLedger'
              ? deSideItems
              : activeSideField.type === 'finishedProduct'
              ? mjFinishedSideItems
              : mjRawSideItems
          }
          selectedIndex={sideSelectedIndex}
          showEndOfList={activeSideField.type === 'rawMaterial' || activeSideField.type === 'expenseLedger'}
          filterText={sideFilter}
          onSelect={item => {
            if (activeSideField.type === 'finishedProduct') {
              selectMJFinishedItem(item);
            } else if (activeSideField.type === 'rawMaterial') {
              selectMJRawItem(activeSideField.idx, item);
            } else if (activeSideField.type === 'expenseLedger') {
              selectMJExpenseLedger(activeSideField.idx, item);
            }
          }}
          onSelectEndOfList={() => {
            if (activeSideField.type === 'rawMaterial') {
              handleMJRawEndOfList();
            } else if (activeSideField.type === 'expenseLedger') {
              handleMJExpenseEndOfList(activeSideField.idx);
            }
          }}
          onAltC={() => {
            if (activeSideField.type === 'expenseLedger') {
              const idx = activeSideField.idx;
              onAltC?.({
                fieldType: 'ledger',
                onCreated: (newItem: any) => {
                  if (newItem?.name) {
                    setForm(f => {
                      const des = [...f.directExpenses];
                      des[idx] = { ...des[idx], ledgerName: newItem.name, ledgerId: newItem.id || null };
                      return { ...f, directExpenses: des };
                    });
                    setActiveSideField(null);
                    setTimeout(() => deRefs.current[idx]?.amtRef?.current?.focus(), 30);
                  }
                }
              });
            } else {
              onAltC?.({
                fieldType: 'stockItem',
                onCreated: (newItem: any) => {
                  if (newItem?.name) {
                    if (activeSideField.type === 'finishedProduct') {
                      const unit = newItem.unit || newItem.unitName || form.outputUnit;
                      setForm(f => ({
                        ...f,
                        finishedItemName: newItem.name,
                        finishedItemId: newItem.id || 0,
                        outputUnit: unit
                      }));
                      setActiveSideField(null);
                      setTimeout(() => mjOutputQtyRef.current?.focus(), 30);
                    } else if (activeSideField.type === 'rawMaterial') {
                      const idx = activeSideField.idx;
                      updateRM(idx, "itemName", newItem.name);
                      setActiveSideField(null);
                      setTimeout(() => rmRefs.current[idx]?.reqRef?.current?.focus(), 30);
                    }
                  }
                }
              });
            }
          }}
          altCLabel={activeSideField.type === 'expenseLedger' ? "Alt+C: Create New Ledger" : "Alt+C: Create New Stock Item"}
          onClose={() => setActiveSideField(null)}
          emptyText={activeSideField.type === 'expenseLedger' ? "No matching expense ledgers found" : "No matching stock items found"}
        />
      )}
    </div>
  );
}
// ============================================================
// MAIN BOM MODULE
// ============================================================
export function BOMModule({ company, stockItems, ledgers, onBack, initialTab="journal", onAltC, onStockUpdated }: BOMModuleProps) {
  const [tab, setTab] = useState<"bom"|"journal"|"register">(initialTab);
  const [boms, setBOMs] = useState<any[]>([]);
  const [journals, setJournals] = useState<SavedJournal[]>([]);
  const [editBOM, setEditBOM] = useState<BOM|null>(null);
  const [showBOMForm, setShowBOMForm] = useState(false);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const companyId = company?.id;

  useEffect(()=>{
    if(showBOMForm||showJournalForm) return;
    const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();onBack();}};
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[showBOMForm,showJournalForm,onBack]);

  const loadBOMs = useCallback(async()=>{
    if(!companyId) return;
    try {
      const token=authClient.getToken();
      const res=await fetch(`/api/bom?companyId=${companyId}`,{headers:{Authorization:`Bearer ${token}`}});
      const d=await res.json();
      if(d.success) setBOMs(d.boms||[]);
    } catch(e){}
  },[companyId]);

  const loadJournals = useCallback(async()=>{
    if(!companyId) return;
    setLoading(true);
    try {
      const token=authClient.getToken();
      const res=await fetch(`/api/bom?companyId=${companyId}&type=journals`,{headers:{Authorization:`Bearer ${token}`}});
      const d=await res.json();
      if(d.success) setJournals(d.journals||[]);
    } catch(e){}
    setLoading(false);
  },[companyId]);

  useEffect(()=>{ loadBOMs(); loadJournals(); },[loadBOMs,loadJournals]);

  const showToast=(msg:string)=>{ setToast(msg); setTimeout(()=>setToast(""),3000); };

  // FIX: Load BOM with items from API before editing
  const handleEditBOM = async (b:any) => {
    try {
      const token=authClient.getToken();
      const res=await fetch(`/api/bom?id=${b.id}`,{headers:{Authorization:`Bearer ${token}`}});
      const d=await res.json();
      if(d.success&&d.bom) {
        setEditBOM({
          ...d.bom,
          items:(d.items||[]).map((it:any)=>({
            id:it.id, stockItemId:it.stockItemId, itemName:it.itemName,
            qty:it.qty, unit:it.unit, rate:it.rate, amount:it.amount
          }))
        });
        setShowBOMForm(true);
      }
    } catch(e) {
      setEditBOM({...b,items:[]});
      setShowBOMForm(true);
    }
  };

  const deleteBOM = async (id:number) => {
    if(!confirm("Delete this BOM template?")) return;
    const token=authClient.getToken();
    await fetch("/api/bom",{method:"DELETE",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({id,type:"bom"})});
    await loadBOMs();
    showToast("BOM deleted");
  };

  const deleteJournal = async (id:number) => {
    if(!confirm("Delete this manufacturing journal?")) return;
    const token=authClient.getToken();
    await fetch("/api/bom",{method:"DELETE",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({id,type:"journal"})});
    await loadJournals();
    showToast("Journal deleted");
    if (onStockUpdated) onStockUpdated();
  };

  if(showBOMForm) {
    return (
      <BOMForm company={company} stockItems={stockItems} editingBOM={editBOM}
        onAltC={onAltC}
        onSave={async()=>{ await loadBOMs(); setShowBOMForm(false); setEditBOM(null); showToast("BOM saved!"); }}
        onCancel={()=>{ setShowBOMForm(false); setEditBOM(null); }}/>
    );
  }

  if(showJournalForm) {
    return (
      <ManufacturingJournalForm company={company} stockItems={stockItems} ledgers={ledgers} boms={boms}
        onAltC={onAltC}
        onSave={async()=>{
          await loadJournals();
          setShowJournalForm(false);
          showToast("Manufacturing Journal posted! Stock updated ✓");
          if (onStockUpdated) onStockUpdated();
        }}
        onCancel={()=>setShowJournalForm(false)}/>
    );
  }

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:"#f8fafc"}}>
      {toast&&(
        <div style={{position:"fixed",top:16,right:16,zIndex:9999,background:"#16a34a",color:"white",padding:"10px 20px",borderRadius:6,fontWeight:"bold",fontSize:13,boxShadow:"0 4px 12px rgba(0,0,0,0.2)"}}>
          ✓ {toast}
        </div>
      )}
      <div style={{background:"linear-gradient(135deg,#1c3a5f,#7c3aed)",color:"white",padding:"12px 18px",display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:36,height:36,background:"rgba(255,255,255,0.2)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🏭</div>
        <div>
          <div style={{fontWeight:"bold",fontSize:15}}>Bill of Materials (BOM)</div>
          <div style={{fontSize:11,opacity:0.85}}>{company?.name} — Manufacturing & Production Management</div>
        </div>
        <button onClick={onBack} style={{marginLeft:"auto",background:"rgba(255,255,255,0.2)",border:"none",color:"white",padding:"6px 16px",borderRadius:4,cursor:"pointer",fontWeight:"bold"}}>← Back (Esc)</button>
      </div>

      <div style={{background:"#fff",borderBottom:"2px solid #e2e8f0",display:"flex",gap:0}}>
        {[
          {key:"journal",label:"⚙️ New Manufacturing Journal",color:"#7c3aed"},
          {key:"bom",label:"🧪 BOM Templates",color:"#1c3a5f"},
          {key:"register",label:"📋 Journal Register",color:"#0f766e"},
        ].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key as any)}
            style={{padding:"11px 20px",border:"none",cursor:"pointer",fontWeight:"bold",fontSize:12,
              borderBottom:tab===t.key?`3px solid ${t.color}`:"3px solid transparent",
              color:tab===t.key?t.color:"#64748b",background:tab===t.key?"#f8fafc":"transparent"}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
        {tab==="journal"&&(
          <div>
            <div style={{textAlign:"center",padding:"40px 20px",background:"#fff",borderRadius:8,border:"2px dashed #7c3aed"}}>
              <div style={{fontSize:48,marginBottom:16}}>⚙️</div>
              <div style={{fontSize:18,fontWeight:"bold",color:"#1c3a5f",marginBottom:8}}>Create Manufacturing Journal</div>
              <div style={{fontSize:13,color:"#64748b",marginBottom:24,maxWidth:500,margin:"0 auto 24px"}}>
                Convert raw materials into finished products. Specify actual quantities consumed, direct expenses, and wastage. Stock auto-updates after posting.
              </div>
              <button onClick={()=>setShowJournalForm(true)}
                style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)",color:"white",border:"none",borderRadius:6,padding:"13px 36px",cursor:"pointer",fontWeight:"bold",fontSize:14,boxShadow:"0 4px 14px rgba(124,58,237,0.4)"}}>
                ⚙️ Create New Manufacturing Journal
              </button>
              {boms.length>0&&(
                <div style={{marginTop:16,fontSize:12,color:"#94a3b8"}}>
                  💡 You have {boms.length} BOM template{boms.length>1?"s":""} — they auto-fill raw materials when creating a journal
                </div>
              )}
            </div>
          </div>
        )}

        {tab==="bom"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <div style={{fontWeight:"bold",fontSize:15,color:"#1c3a5f"}}>BOM Templates</div>
                <div style={{fontSize:12,color:"#64748b"}}>Define standard raw material compositions for finished products</div>
              </div>
              <button onClick={()=>{setEditBOM(null);setShowBOMForm(true);}}
                style={{background:"#1c3a5f",color:"white",border:"none",borderRadius:4,padding:"9px 20px",cursor:"pointer",fontWeight:"bold",fontSize:12}}>
                + New BOM Template
              </button>
            </div>
            {boms.length===0?(
              <div style={{textAlign:"center",padding:"60px 20px",background:"#fff",borderRadius:8,border:"1px solid #e2e8f0"}}>
                <div style={{fontSize:40,marginBottom:12}}>🧪</div>
                <div style={{fontSize:15,fontWeight:"bold",color:"#334155",marginBottom:8}}>No BOM Templates yet</div>
                <div style={{fontSize:12,color:"#94a3b8",marginBottom:20}}>Create BOM templates to quickly pre-fill raw materials when creating manufacturing journals</div>
                <button onClick={()=>setShowBOMForm(true)} style={{background:"#1c3a5f",color:"white",border:"none",borderRadius:4,padding:"9px 20px",cursor:"pointer",fontWeight:"bold",fontSize:12}}>Create First BOM</button>
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
                {boms.map((b:any)=>(
                  <div key={b.id} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:8,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
                    <div style={{background:"#1c3a5f",color:"white",padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontWeight:"bold",fontSize:13}}>🏭 {b.name}</span>
                      <span style={{marginLeft:"auto",fontSize:10,opacity:0.8}}>BOM</span>
                    </div>
                    <div style={{padding:"12px 14px"}}>
                      <div style={{fontSize:12,color:"#334155",marginBottom:4}}><b>Finished Product:</b> {b.finishedItemName}</div>
                      <div style={{fontSize:12,color:"#64748b"}}><b>Output:</b> {b.outputQty} {b.outputUnit}</div>
                      {b.narration&&<div style={{fontSize:11,color:"#94a3b8",marginTop:4,fontStyle:"italic"}}>{b.narration}</div>}
                    </div>
                    <div style={{padding:"8px 14px",borderTop:"1px solid #f1f5f9",display:"flex",gap:8}}>
                      <button onClick={()=>setShowJournalForm(true)}
                        style={{flex:1,background:"#7c3aed",color:"white",border:"none",borderRadius:3,padding:"6px",cursor:"pointer",fontSize:11,fontWeight:"bold"}}>
                        ⚙️ Use in Journal
                      </button>
                      <button onClick={()=>handleEditBOM(b)}
                        style={{background:"#e0f2fe",color:"#0369a1",border:"none",borderRadius:3,padding:"6px 12px",cursor:"pointer",fontSize:11,fontWeight:"bold"}}>
                        ✏️ Edit
                      </button>
                      <button onClick={()=>deleteBOM(b.id)}
                        style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:3,padding:"6px 12px",cursor:"pointer",fontSize:11}}>
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==="register"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <div style={{fontWeight:"bold",fontSize:15,color:"#0f766e"}}>Manufacturing Journal Register</div>
                <div style={{fontSize:12,color:"#64748b"}}>{journals.length} manufacturing records</div>
              </div>
              <button onClick={()=>setShowJournalForm(true)}
                style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)",color:"white",border:"none",borderRadius:4,padding:"9px 20px",cursor:"pointer",fontWeight:"bold",fontSize:12}}>
                + New Journal
              </button>
            </div>
            {loading?(
              <div style={{textAlign:"center",padding:40,color:"#94a3b8"}}>Loading...</div>
            ):journals.length===0?(
              <div style={{textAlign:"center",padding:"60px 20px",background:"#fff",borderRadius:8,border:"1px solid #e2e8f0"}}>
                <div style={{fontSize:40,marginBottom:12}}>📋</div>
                <div style={{fontSize:15,fontWeight:"bold",color:"#334155",marginBottom:8}}>No Manufacturing Journals yet</div>
                <div style={{fontSize:12,color:"#94a3b8"}}>Post a manufacturing journal to see it here</div>
              </div>
            ):(
              <div style={{background:"#fff",borderRadius:8,border:"1px solid #e2e8f0",overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:"#0f766e",color:"white"}}>
                      <th style={{padding:"10px 12px",textAlign:"left"}}>Journal No.</th>
                      <th style={{padding:"10px 12px",textAlign:"left"}}>Date</th>
                      <th style={{padding:"10px 12px",textAlign:"left"}}>Finished Product</th>
                      <th style={{padding:"10px 12px",textAlign:"right"}}>Output Qty</th>
                      <th style={{padding:"10px 12px",textAlign:"right"}}>Total Cost (₹)</th>
                      <th style={{padding:"10px 12px",textAlign:"right"}}>Cost/Unit (₹)</th>
                      <th style={{padding:"10px 12px",textAlign:"center"}}>Status</th>
                      <th style={{padding:"10px 12px",textAlign:"center"}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {journals.map((j,i)=>(
                      <tr key={j.id} style={{borderBottom:"1px solid #f1f5f9",background:i%2===0?"#fff":"#f8fafc"}}>
                        <td style={{padding:"9px 12px",fontWeight:"bold",color:"#0f766e"}}>{j.journalNo}</td>
                        <td style={{padding:"9px 12px",color:"#64748b"}}>{j.date?new Date(j.date).toLocaleDateString("en-IN"):"-"}</td>
                        <td style={{padding:"9px 12px",fontWeight:"500"}}>{j.finishedItemName}</td>
                        <td style={{padding:"9px 12px",textAlign:"right",fontWeight:"bold"}}>{j.outputQty} {j.outputUnit}</td>
                        <td style={{padding:"9px 12px",textAlign:"right",fontWeight:"bold",color:"#1c3a5f"}}>₹{fmt2(j.totalCost)}</td>
                        <td style={{padding:"9px 12px",textAlign:"right",color:"#7c3aed"}}>₹{fmt2(j.costPerUnit)}</td>
                        <td style={{padding:"9px 12px",textAlign:"center"}}>
                          <span style={{background:"#dcfce7",color:"#16a34a",padding:"2px 10px",borderRadius:10,fontSize:10,fontWeight:"bold"}}>{j.status||"Posted"}</span>
                        </td>
                        <td style={{padding:"9px 12px",textAlign:"center"}}>
                          <button onClick={()=>deleteJournal(j.id)}
                            style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:3,padding:"4px 10px",cursor:"pointer",fontSize:11}}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{background:"#f0fdf4",borderTop:"2px solid #16a34a"}}>
                      <td colSpan={4} style={{padding:"9px 12px",fontWeight:"bold",fontSize:13}}>TOTAL ({journals.length} journals)</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontWeight:"bold",fontSize:13,color:"#16a34a"}}>
                        ₹{fmt2(journals.reduce((s,j)=>s+(j.totalCost||0),0))}
                      </td>
                      <td colSpan={3}/>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BOMModule;