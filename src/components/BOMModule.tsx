"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { authClient } from "@/lib/auth-client";

interface StockItem {
  id: number; companyId: number; name: string; unit: string; unitName?: string;
  openingQty: number; openingRate: number; gstRate: number; hsnCode?: string; under?: string;
}
interface Ledger { id: number; name: string; groupName: string; }
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
type WastageType = "None" | "Vaporised" | "Burnt" | "Drainage" | "Washed" | "Scrap";
interface DirectExpense {
  ledgerId: number | null; ledgerName: string; method: "Amount" | "Percentage";
  percentage: number | string; amount: number | string;
}
interface ManufacturingJournal {
  id?: number; companyId: number; journalNo: string; date: string;
  bomId?: number | null; bomName?: string; finishedItemId: number; finishedItemName: string;
  outputQty: number | string; outputUnit: string; outputRate: number;
  totalRawCost: number; totalDirectExpenses: number; totalCost: number; costPerUnit: number;
  wastageType: WastageType; wastageQty: number | string; wastageUnit: string; wastageValue: number;
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
}

const WASTAGE_TYPES: WastageType[] = ["None", "Vaporised", "Burnt", "Drainage", "Washed", "Scrap"];
const WASTAGE_ICONS: Record<WastageType, string> = {
  None: "✓", Vaporised: "💨", Burnt: "🔥", Drainage: "🚿", Washed: "💧", Scrap: "🗑️"
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
// GOLDEN YELLOW AUTOCOMPLETE INPUT WITH ARROW KEY NAVIGATION
// ============================================================
function AutocompleteInput({
  value, options, onSelect, placeholder, style, onTab, inputRef: extRef
}: {
  value: string; options: string[]; onSelect: (v: string) => void;
  placeholder?: string; style?: React.CSSProperties;
  onTab?: () => void; inputRef?: React.RefObject<HTMLInputElement>;
}) {
  const [show, setShow] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = extRef || internalRef;
  const listRef = useRef<HTMLDivElement>(null);
  const filtered = options.filter(o => o.toLowerCase().includes(value.toLowerCase())).slice(0,15);

  useEffect(() => { setActiveIdx(-1); }, [value, show]);

  const scrollToActive = (idx: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-item]");
    if (items[idx]) (items[idx] as HTMLElement).scrollIntoView({ block:"nearest" });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!show || filtered.length === 0) {
      if (e.key === "Tab" && onTab) { e.preventDefault(); onTab(); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(activeIdx+1, filtered.length-1);
      setActiveIdx(next); scrollToActive(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(activeIdx-1, -1);
      setActiveIdx(prev); if (prev >= 0) scrollToActive(prev);
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (activeIdx >= 0) {
        e.preventDefault();
        onSelect(filtered[activeIdx]);
        setShow(false);
        if (e.key === "Tab" && onTab) setTimeout(onTab, 10);
      } else if (e.key === "Tab" && onTab) {
        setShow(false); e.preventDefault(); onTab();
      }
    } else if (e.key === "Escape") { setShow(false); }
  };

  return (
    <div style={{ position:"relative" }}>
      <input ref={inputRef} type="text" value={value}
        onChange={e => { onSelect(e.target.value); setShow(true); setActiveIdx(-1); }}
        onFocus={() => { setShow(true); setActiveIdx(-1); }}
        onBlur={() => setTimeout(() => setShow(false), 180)}
        onKeyDown={handleKeyDown} placeholder={placeholder}
        style={{ width:"100%", padding:"5px 8px", border:"1px solid #cbd5e1", borderRadius:3, fontSize:12, boxSizing:"border-box", ...style }}
      />
      {show && filtered.length > 0 && (
        <div ref={listRef} style={{
          position:"absolute", top:"100%", left:0, right:0, zIndex:9999,
          background:"#fff", border:"1px solid #fbbf24", borderRadius:3,
          boxShadow:"0 4px 16px rgba(0,0,0,0.18)", maxHeight:220, overflowY:"auto"
        }}>
          {filtered.map((o,i) => (
            <div key={i} data-item
              onMouseDown={() => { onSelect(o); setShow(false); }}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                padding:"6px 10px", fontSize:12, cursor:"pointer", borderBottom:"1px solid #f1f5f9",
                background: i===activeIdx ? "#fef08a" : "white",
                color: i===activeIdx ? "#78350f" : "#1e293b",
                fontWeight: i===activeIdx ? "bold" : "normal",
                transition:"background 0.08s"
              }}>{o}</div>
          ))}
        </div>
      )}
    </div>
  );
}
// ============================================================
// BOM TEMPLATE FORM
// ============================================================
function BOMForm({
  company, stockItems, editingBOM, onSave, onCancel
}: {
  company: Company|null; stockItems: StockItem[]; editingBOM: BOM|null;
  onSave: ()=>void; onCancel: ()=>void;
}) {
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
  const itemNames = stockItems.map(s => s.name);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key==="Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); }
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
        const si = stockItems.find(s=>s.name.toLowerCase()===val.toLowerCase());
        if (si) {
          items[idx].stockItemId=si.id;
          items[idx].unit=si.unit||si.unitName||"Nos";
          items[idx].rate=si.openingRate||0;
          items[idx].amount=(parseFloat(String(items[idx].qty))||0)*(si.openingRate||0);
        }
      }
      return {...f, items};
    });
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

  const handleRateTab = (idx: number) => {
    if (idx===form.items.length-1) { addRowAndFocus(idx); }
    else { rowRefs.current[idx+1]?.itemRef?.current?.focus(); }
  };

  const totalRawCost = form.items.reduce((s,i)=>s+(parseFloat(String(i.rate))||0)*(parseFloat(String(i.qty))||0),0);

  const handleSave = async () => {
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
      if (d.success) onSave(); else setError(d.error||"Save failed");
    } catch(e:any) { setError(e.message); }
    setSaving(false);
  };

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#1c3a5f",color:"white",padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:18}}>🏭</span>
        <div>
          <div style={{fontWeight:"bold",fontSize:14}}>{form.id?"Edit BOM Template":"New BOM Template"}</div>
          <div style={{fontSize:11,opacity:0.8}}>Bill of Materials — Define raw materials for a finished product</div>
        </div>
        <button onClick={onCancel} style={{marginLeft:"auto",background:"rgba(255,255,255,0.15)",border:"none",color:"white",padding:"5px 14px",borderRadius:3,cursor:"pointer"}}>✕ Cancel</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:20}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:16,background:"#f8fafc",padding:14,borderRadius:6,border:"1px solid #e2e8f0"}}>
          <div>
            <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:"bold"}}>BOM NAME *</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
              placeholder="e.g. Malham1" style={{width:"100%",padding:"7px 10px",border:"2px solid #1c5282",borderRadius:4,fontSize:13,fontWeight:"bold",boxSizing:"border-box"}}/>
          </div>
          <div>
            <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:"bold"}}>FINISHED PRODUCT *</label>
            <AutocompleteInput value={form.finishedItemName} options={itemNames} placeholder="Select Item..."
              onSelect={v=>{const si=stockItems.find(s=>s.name.toLowerCase()===v.toLowerCase());setForm(f=>({...f,finishedItemName:v,finishedItemId:si?.id||0,outputUnit:si?.unit||si?.unitName||f.outputUnit}));}}/>
          </div>
          <div>
            <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:"bold"}}>OUTPUT QUANTITY</label>
            <input type="number" min={0} step="any" value={form.outputQty} onChange={e=>setForm(f=>({...f,outputQty:e.target.value}))}
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
                return (
                  <tr key={idx} style={{borderBottom:"1px solid #f1f5f9"}}>
                    <td style={{textAlign:"center",color:"#94a3b8",fontSize:11,padding:"4px 6px"}}>{idx+1}</td>
                    <td style={{padding:"4px 6px"}}>
                      <AutocompleteInput inputRef={refs.itemRef} value={row.itemName} options={itemNames}
                        placeholder="Select raw material..." onSelect={v=>updateRow(idx,"itemName",v)}
                        onTab={()=>refs.qtyRef.current?.focus()}/>
                    </td>
                    <td style={{padding:"4px 6px"}}>
                      <input ref={refs.qtyRef} type="number" min={0} step="any" value={row.qty}
                        onChange={e=>updateRow(idx,"qty",e.target.value)}
                        onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();refs.unitRef.current?.focus();}}}
                        style={{width:"100%",padding:"5px",border:"1px solid #cbd5e1",borderRadius:3,textAlign:"right",fontSize:12}}/>
                    </td>
                    <td style={{padding:"4px 6px"}}>
                      <input ref={refs.unitRef} value={row.unit} onChange={e=>updateRow(idx,"unit",e.target.value)}
                        onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();refs.rateRef.current?.focus();}}}
                        style={{width:"100%",padding:"5px",border:"1px solid #cbd5e1",borderRadius:3,textAlign:"center",fontSize:12}}/>
                    </td>
                    <td style={{padding:"4px 6px"}}>
                      <input ref={refs.rateRef} type="number" min={0} step="any" value={row.rate}
                        onChange={e=>updateRow(idx,"rate",e.target.value)}
                        onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();handleRateTab(idx);}}}
                        style={{width:"100%",padding:"5px",border:"1px solid #cbd5e1",borderRadius:3,textAlign:"right",fontSize:12}}/>
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
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:"bold"}}>NARRATION</label>
          <textarea value={form.narration} onChange={e=>setForm(f=>({...f,narration:e.target.value}))} rows={2}
            placeholder="Optional notes about this BOM..."
            style={{width:"100%",padding:"8px",border:"1px solid #cbd5e1",borderRadius:4,fontSize:12,resize:"vertical",boxSizing:"border-box"}}/>
        </div>
        {error&&<div style={{background:"#fee2e2",color:"#dc2626",padding:"8px 12px",borderRadius:4,marginBottom:12,fontSize:12}}>{error}</div>}
        <div style={{display:"flex",gap:10}}>
          <button onClick={handleSave} disabled={saving}
            style={{background:saving?"#94a3b8":"#1c3a5f",color:"white",border:"none",borderRadius:4,padding:"10px 28px",cursor:saving?"not-allowed":"pointer",fontWeight:"bold",fontSize:13}}>
            {saving?"Saving...":"✓ Save BOM Template (Ctrl+A)"}
          </button>
          <button onClick={onCancel} style={{background:"#f1f5f9",color:"#475569",border:"1px solid #cbd5e1",borderRadius:4,padding:"10px 20px",cursor:"pointer",fontSize:13}}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
// ============================================================
// MANUFACTURING JOURNAL FORM
// ============================================================
function ManufacturingJournalForm({
  company, stockItems, ledgers, boms, onSave, onCancel
}: {
  company: Company|null; stockItems: StockItem[]; ledgers: Ledger[];
  boms: any[]; onSave: ()=>void; onCancel: ()=>void;
}) {
  const [form, setForm] = useState<ManufacturingJournal>(emptyJournal(company?.id||0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingBOM, setLoadingBOM] = useState(false);
  const loadedBOMRef = useRef<LoadedBOM|null>(null);

  const rmRefs = useRef<Array<{
    itemRef:React.RefObject<HTMLInputElement>; reqRef:React.RefObject<HTMLInputElement>;
    actRef:React.RefObject<HTMLInputElement>; unitRef:React.RefObject<HTMLInputElement>;
    rateRef:React.RefObject<HTMLInputElement>;
  }>>([]);
  const deRefs = useRef<Array<{ledgerRef:React.RefObject<HTMLInputElement>;amtRef:React.RefObject<HTMLInputElement>}>>([]);

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();onCancel();}};
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[onCancel]);

  const itemNames = stockItems.map(s=>s.name);
  const expenseLedgers = ledgers.filter(l=>EXPENSE_LEDGER_GROUPS.includes(l.groupName));
  const expenseLedgerNames = expenseLedgers.map(l=>l.name);

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
      deRefs.current.push({ledgerRef:React.createRef<HTMLInputElement>(),amtRef:React.createRef<HTMLInputElement>()});
    }
  };
  ensureDERefs(form.directExpenses.length);

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
            rawMaterials:(d.items||[]).map((it:any)=>{
              const bq=parseFloat(String(it.qty||0));
              const r=parseFloat(String(it.rate||0));
              const calcQty=bq*ratio;
              return {stockItemId:it.stockItemId,itemName:it.itemName,requiredQty:parseFloat(calcQty.toFixed(4)),
                actualQty:parseFloat(calcQty.toFixed(4)),unit:it.unit,rate:r,amount:parseFloat((calcQty*r).toFixed(2))};
            }).concat([emptyRawMaterial()])
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
      const newRMs:RawMaterial[]=bom.items.map(it=>{
        const bq=parseFloat(String(it.qty))||0;
        const r=parseFloat(String(it.rate))||0;
        const cq=bq*ratio;
        return {stockItemId:it.stockItemId,itemName:it.itemName,
          requiredQty:parseFloat(cq.toFixed(4)),actualQty:parseFloat(cq.toFixed(4)),
          unit:it.unit,rate:r,amount:parseFloat((cq*r).toFixed(2))};
      });
      newRMs.push(emptyRawMaterial());
      return {...f,outputQty:newQtyStr,rawMaterials:newRMs};
    });
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
        const si=stockItems.find(s=>s.name.toLowerCase()===val.toLowerCase());
        if(si){rms[idx].stockItemId=si.id;rms[idx].unit=si.unit||si.unitName||"Nos";rms[idx].rate=si.openingRate||0;rms[idx].amount=(parseFloat(String(rms[idx].actualQty))||0)*(si.openingRate||0);}
      }
      return {...f,rawMaterials:rms};
    });
  };

  const handleRMRateTab = (idx:number) => {
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
      if(key==="ledgerName"){const led=expenseLedgers.find(l=>l.name.toLowerCase()===val.toLowerCase());if(led)des[idx].ledgerId=led.id;}
      if(des[idx].method==="Percentage"&&(key==="percentage"||key==="method")){
        const pct=parseFloat(key==="percentage"?val:String(des[idx].percentage))||0;
        des[idx].amount=(totalRawCost*pct)/100;
      }
      return {...f,directExpenses:des};
    });
  };

  const handleDEAmtTab = (idx:number) => {
    if(idx===form.directExpenses.length-1){
      setForm(f=>({...f,directExpenses:[...f.directExpenses,emptyDirectExpense()]}));
      ensureDERefs(idx+2);
      setTimeout(()=>{deRefs.current[idx+1]?.ledgerRef?.current?.focus();},50);
    } else { deRefs.current[idx+1]?.ledgerRef?.current?.focus(); }
  };

  const handleSave = async () => {
    if(!form.finishedItemName.trim()){setError("Finished Item is required");return;}
    if(!outputQtyN){setError("Output Quantity is required");return;}
    if(form.rawMaterials.filter(r=>r.itemName.trim()).length===0){setError("Add at least one Raw Material");return;}
    setSaving(true); setError("");
    try {
      const token=authClient.getToken();
      const payload:ManufacturingJournal={
        ...form, totalRawCost, totalDirectExpenses:totalDirectExp, totalCost, costPerUnit,
        rawMaterials:form.rawMaterials.filter(r=>r.itemName.trim()),
        directExpenses:form.directExpenses.filter(d=>d.ledgerName.trim()),
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
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)",color:"white",padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:20}}>⚙️</span>
        <div>
          <div style={{fontWeight:"bold",fontSize:14}}>Manufacturing Journal</div>
          <div style={{fontSize:11,opacity:0.85}}>Convert raw materials into finished goods — auto stock update</div>
        </div>
        <button onClick={onCancel} style={{marginLeft:"auto",background:"rgba(255,255,255,0.2)",border:"none",color:"white",padding:"5px 14px",borderRadius:3,cursor:"pointer"}}>✕ Cancel</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:20,background:"#f8fafc"}}>
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
            <AutocompleteInput value={form.finishedItemName} options={itemNames} placeholder="Select Item..."
              onSelect={v=>{const si=stockItems.find(s=>s.name.toLowerCase()===v.toLowerCase());setForm(f=>({...f,finishedItemName:v,finishedItemId:si?.id||0,outputUnit:si?.unit||si?.unitName||f.outputUnit}));}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            <div>
              <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:4,fontWeight:"bold"}}>OUTPUT QTY *</label>
              <input type="number" min={0} step="any" value={form.outputQty}
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
                  return (
                    <tr key={idx} style={{borderBottom:"1px solid #f8fafc"}}>
                      <td style={{textAlign:"center",color:"#94a3b8",padding:"3px 4px"}}>{idx+1}</td>
                      <td style={{padding:"3px 4px"}}>
                        <AutocompleteInput inputRef={refs.itemRef} value={rm.itemName} options={itemNames} placeholder="Item..."
                          onSelect={v=>updateRM(idx,"itemName",v)} onTab={()=>refs.reqRef.current?.focus()}/>
                      </td>
                      <td style={{padding:"3px 4px"}}>
                        <input ref={refs.reqRef} type="number" min={0} step="any" value={rm.requiredQty}
                          onChange={e=>setForm(f=>{const rms=[...f.rawMaterials];rms[idx]={...rms[idx],requiredQty:e.target.value};return{...f,rawMaterials:rms};})}
                          onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();refs.actRef.current?.focus();}}}
                          style={{width:"100%",padding:"4px",border:"1px solid #e2e8f0",borderRadius:3,textAlign:"right",fontSize:11,background:"#f0f9ff"}}/>
                      </td>
                      <td style={{padding:"3px 4px"}}>
                        <input ref={refs.actRef} type="number" min={0} step="any" value={rm.actualQty}
                          onChange={e=>updateRM(idx,"actualQty",e.target.value)}
                          onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();refs.unitRef.current?.focus();}}}
                          style={{width:"100%",padding:"4px",border:"1px solid #cbd5e1",borderRadius:3,textAlign:"right",fontSize:11,fontWeight:"bold"}}/>
                      </td>
                      <td style={{padding:"3px 4px"}}>
                        <input ref={refs.unitRef} value={rm.unit}
                          onChange={e=>setForm(f=>{const rms=[...f.rawMaterials];rms[idx].unit=e.target.value;return{...f,rawMaterials:rms};})}
                          onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();refs.rateRef.current?.focus();}}}
                          style={{width:"100%",padding:"4px",border:"1px solid #e2e8f0",borderRadius:3,textAlign:"center",fontSize:11}}/>
                      </td>
                      <td style={{padding:"3px 4px"}}>
                        <input ref={refs.rateRef} type="number" min={0} step="any" value={rm.rate}
                          onChange={e=>updateRM(idx,"rate",e.target.value)}
                          onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();handleRMRateTab(idx);}}}
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
                    <th style={{padding:"6px 5px",textAlign:"right",borderBottom:"1px solid #fde68a",width:80}}>Amount (₹)</th>
                    <th style={{width:26,borderBottom:"1px solid #fde68a"}}/>
                  </tr>
                </thead>
                <tbody>
                  {form.directExpenses.map((de,idx)=>{
                    ensureDERefs(idx+1);
                    const refs=deRefs.current[idx];
                    return (
                      <tr key={idx} style={{borderBottom:"1px solid #fef9c3"}}>
                        <td style={{padding:"3px 5px"}}>
                          <AutocompleteInput inputRef={refs.ledgerRef} value={de.ledgerName} options={expenseLedgerNames}
                            placeholder="Wages, Electricity..." onSelect={v=>updateDE(idx,"ledgerName",v)}
                            onTab={()=>refs.amtRef.current?.focus()}/>
                        </td>
                        <td style={{padding:"3px 4px"}}>
                          <select value={de.method} onChange={e=>updateDE(idx,"method",e.target.value as "Amount"|"Percentage")}
                            style={{width:"100%",padding:"4px",border:"1px solid #e2e8f0",borderRadius:3,fontSize:11}}>
                            <option value="Amount">₹ Amt</option>
                            <option value="Percentage">% Pct</option>
                          </select>
                        </td>
                        <td style={{padding:"3px 4px"}}>
                          {de.method==="Percentage"?(
                            <div style={{display:"flex",gap:3,alignItems:"center"}}>
                              <input type="number" min={0} step="any" value={de.percentage}
                                onChange={e=>updateDE(idx,"percentage",e.target.value)}
                                style={{width:50,padding:"4px",border:"1px solid #cbd5e1",borderRadius:3,textAlign:"right",fontSize:11}}/>
                              <span style={{fontSize:10,color:"#64748b"}}>% = ₹{fmt2(Number(de.amount))}</span>
                            </div>
                          ):(
                            <input ref={refs.amtRef} type="number" min={0} step="any" value={de.amount}
                              onChange={e=>updateDE(idx,"amount",e.target.value)}
                              onKeyDown={e=>{if(e.key==="Tab"){e.preventDefault();handleDEAmtTab(idx);}}}
                              style={{width:"100%",padding:"4px",border:"1px solid #cbd5e1",borderRadius:3,textAlign:"right",fontSize:11}}/>
                          )}
                        </td>
                        <td style={{padding:"3px 4px",textAlign:"center"}}>
                          {form.directExpenses.length>1&&(
                            <button onClick={()=>setForm(f=>({...f,directExpenses:f.directExpenses.filter((_,i)=>i!==idx)}))}
                              style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:12}}>✕</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:6,overflow:"hidden"}}>
              <div style={{background:"#dc2626",color:"white",padding:"8px 14px",fontWeight:"bold",fontSize:12}}>♻️ Wastage / Loss Details</div>
              <div style={{padding:12}}>
                <div style={{marginBottom:8}}>
                  <label style={{fontSize:10,color:"#64748b",fontWeight:"bold"}}>WASTAGE TYPE</label>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
                    {WASTAGE_TYPES.map(t=>(
                      <button key={t} onClick={()=>setForm(f=>({...f,wastageType:t}))}
                        style={{padding:"4px 10px",fontSize:11,borderRadius:3,cursor:"pointer",fontWeight:"bold",
                          background:form.wastageType===t?"#dc2626":"#f1f5f9",
                          color:form.wastageType===t?"white":"#475569",
                          border:form.wastageType===t?"none":"1px solid #e2e8f0"}}>
                        {WASTAGE_ICONS[t]} {t}
                      </button>
                    ))}
                  </div>
                </div>
                {form.wastageType!=="None"&&(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8,background:"#fff5f5",padding:8,borderRadius:4}}>
                    <div>
                      <label style={{fontSize:10,color:"#64748b"}}>Auto Wastage Qty</label>
                      <div style={{fontWeight:"bold",fontSize:14,color:"#dc2626"}}>{Math.max(0,wastageQtyAuto).toFixed(3)} {form.outputUnit}</div>
                      <div style={{fontSize:9,color:"#94a3b8"}}>Raw: {totalRawQty.toFixed(3)} − Out: {outputQtyN.toFixed(3)}</div>
                    </div>
                    <div>
                      <label style={{fontSize:10,color:"#64748b",display:"block"}}>Override Qty</label>
                      <input type="number" min={0} step="any" value={form.wastageQty}
                        onChange={e=>setForm(f=>({...f,wastageQty:e.target.value}))}
                        placeholder={String(Math.max(0,wastageQtyAuto).toFixed(3))}
                        style={{width:"100%",padding:"5px",border:"1px solid #fca5a5",borderRadius:3,fontSize:11,boxSizing:"border-box"}}/>
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
          <textarea value={form.narration} onChange={e=>setForm(f=>({...f,narration:e.target.value}))} rows={2}
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
    </div>
  );
}
// ============================================================
// MAIN BOM MODULE
// ============================================================
export function BOMModule({ company, stockItems, ledgers, onBack, initialTab="journal" }: BOMModuleProps) {
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
  };

  if(showBOMForm) {
    return (
      <BOMForm company={company} stockItems={stockItems} editingBOM={editBOM}
        onSave={async()=>{ await loadBOMs(); setShowBOMForm(false); setEditBOM(null); showToast("BOM saved!"); }}
        onCancel={()=>{ setShowBOMForm(false); setEditBOM(null); }}/>
    );
  }

  if(showJournalForm) {
    return (
      <ManufacturingJournalForm company={company} stockItems={stockItems} ledgers={ledgers} boms={boms}
        onSave={async()=>{ await loadJournals(); setShowJournalForm(false); showToast("Manufacturing Journal posted! Stock updated ✓"); }}
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