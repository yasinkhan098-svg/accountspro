import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const normalizeDate = (d: any): Date => {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  const s = String(d).trim();
  if (!s) return new Date();
  const normalized = s.replace(/[\.\/\s]+/g, '-').trim();
  const months: Record<string, number> = {
    jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,sept:8,oct:9,nov:10,dec:11,
    january:0,february:1,march:2,april:3,june:5,july:6,august:7,september:8,october:9,november:10,december:11
  };
  const parts = normalized.split('-');
  if (parts.length === 3) {
    const p1=parts[0].trim(), p2=parts[1].trim(), p3=parts[2].trim();
    if (p1.length===4 && !isNaN(parseInt(p1))) return new Date(parseInt(p1),(parseInt(p2)||1)-1,parseInt(p3)||1,12,0,0);
    const day=parseInt(p1)||1;
    const p2l=p2.toLowerCase();
    let month=months[p2l]??-1;
    if (month===-1) { for (const [k,v] of Object.entries(months)) { if (p2l.startsWith(k)){month=v;break;} } }
    if (month===-1) { const m=parseInt(p2); if(!isNaN(m)&&m>=1&&m<=12) month=m-1; }
    if (month===-1) month=0;
    let year=parseInt(p3)||new Date().getFullYear();
    if (year<100) year+=2000;
    return new Date(year,month,day,12,0,0);
  }
  const date=new Date(s);
  return isNaN(date.getTime())?new Date():date;
};

const parsePO=(po:any)=>({...po,specificTerms:po.specificTerms?JSON.parse(po.specificTerms):[]});

export async function GET(req:Request){
  try{
    const {searchParams}=new URL(req.url);
    const companyId=searchParams.get('companyId');
    const poNumber=searchParams.get('poNumber');
    const id=searchParams.get('id');
    if(!companyId) return NextResponse.json({success:false,error:'Missing companyId'},{status:400});
    const cid=parseInt(companyId);
    if(id){
      const po=await prisma.purchaseOrder.findFirst({where:{id:parseInt(id),companyId:cid},include:{items:{orderBy:{slNo:'asc'}}}});
      if(!po) return NextResponse.json({success:false,error:'Not found'},{status:404});
      return NextResponse.json({success:true,po:parsePO(po)});
    }
    if(poNumber){
      const po=await prisma.purchaseOrder.findFirst({where:{poNumber:poNumber.trim(),companyId:cid},include:{items:{orderBy:{slNo:'asc'}}}});
      if(!po) return NextResponse.json({success:false,po:null});
      return NextResponse.json({success:true,po:parsePO(po)});
    }
    const pos=await prisma.purchaseOrder.findMany({where:{companyId:cid},include:{items:{orderBy:{slNo:'asc'}}},orderBy:{createdAt:'desc'}});
    return NextResponse.json({success:true,purchaseOrders:pos.map(parsePO)});
  }catch(err:any){return NextResponse.json({success:false,error:err.message},{status:500});}
}

export async function POST(req:Request){
  try{
    const data=await req.json();
    const {companyId,poNumber,poDate,amendmentNo,amendmentDate,internalIndentNo,internalIndentDate,yourQuotationNo,vendorCode,vendorName,vendorAddress,vendorGstin,currency,termsOfDelivery,termsOfPayment,contactPurchaseRep,pan,gstin,iecNo,invoiceFromName,invoiceFromAddress,invoiceFromGstin,deliverToName,deliverToAddress,deliverToGstin,specificTerms,enableTnC,totalValue,grossAmount,narration,preparedBy,approvedBy,financeCheck,items=[]}=data;
    if(!companyId||!poNumber||!vendorName) return NextResponse.json({success:false,error:'Missing required fields'},{status:400});
    const cid=parseInt(String(companyId));
    const po=await prisma.purchaseOrder.create({
      data:{
        companyId:cid,poNumber:String(poNumber),poDate:normalizeDate(poDate),
        amendmentNo:amendmentNo||null,amendmentDate:amendmentDate?normalizeDate(amendmentDate):null,
        internalIndentNo:internalIndentNo||null,internalIndentDate:internalIndentDate?normalizeDate(internalIndentDate):null,
        yourQuotationNo:yourQuotationNo||null,vendorCode:vendorCode||null,
        vendorName:String(vendorName),vendorAddress:vendorAddress||null,vendorGstin:vendorGstin||null,
        currency:currency||'INR',termsOfDelivery:termsOfDelivery||null,termsOfPayment:termsOfPayment||null,
        contactPurchaseRep:contactPurchaseRep||null,pan:pan||null,gstin:gstin||null,iecNo:iecNo||null,
        invoiceFromName:invoiceFromName||null,invoiceFromAddress:invoiceFromAddress||null,invoiceFromGstin:invoiceFromGstin||null,
        deliverToName:deliverToName||null,deliverToAddress:deliverToAddress||null,deliverToGstin:deliverToGstin||null,
        specificTerms:specificTerms?JSON.stringify(specificTerms):null,enableTnC:!!enableTnC,
        status:'Open',totalValue:parseFloat(String(totalValue||0)),grossAmount:parseFloat(String(grossAmount||0)),
        narration:narration||null,preparedBy:preparedBy||null,approvedBy:approvedBy||null,financeCheck:financeCheck||null,
        items:{create:items.map((item:any,idx:number)=>({
          slNo:item.slNo||(idx+1),hsnCode:item.hsnCode||null,description:String(item.description||''),
          partNo:item.partNo||null,gstRate:parseFloat(String(item.gstRate||18)),
          requiredBy:item.requiredBy?normalizeDate(item.requiredBy):null,
          uom:String(item.uom||'Nos'),qty:parseFloat(String(item.qty||0)),rate:parseFloat(String(item.rate||0)),
          discountPerc:parseFloat(String(item.discountPerc||0)),discountAmt:parseFloat(String(item.discountAmt||0)),
          amount:parseFloat(String(item.amount||0)),receivedQty:0,balanceQty:parseFloat(String(item.qty||0)),
          stockItemId:item.stockItemId?parseInt(String(item.stockItemId)):null,
        }))}
      },
      include:{items:{orderBy:{slNo:'asc'}}}
    });
    return NextResponse.json({success:true,po:parsePO(po)});
  }catch(err:any){console.error('PO Create Error:',err);return NextResponse.json({success:false,error:err.message},{status:500});}
}

export async function PUT(req:Request){
  try{
    const data=await req.json();
    const {id,poNumber,poDate,amendmentNo,amendmentDate,internalIndentNo,internalIndentDate,yourQuotationNo,vendorCode,vendorName,vendorAddress,vendorGstin,currency,termsOfDelivery,termsOfPayment,contactPurchaseRep,pan,gstin,iecNo,invoiceFromName,invoiceFromAddress,invoiceFromGstin,deliverToName,deliverToAddress,deliverToGstin,specificTerms,enableTnC,totalValue,grossAmount,narration,preparedBy,approvedBy,financeCheck,items=[]}=data;
    if(!id) return NextResponse.json({success:false,error:'Missing PO ID'},{status:400});
    await prisma.purchaseOrderItem.deleteMany({where:{purchaseOrderId:parseInt(id)}});
    const po=await prisma.purchaseOrder.update({
      where:{id:parseInt(id)},
      data:{
        poNumber:String(poNumber),poDate:normalizeDate(poDate),
        amendmentNo:amendmentNo||null,amendmentDate:amendmentDate?normalizeDate(amendmentDate):null,
        internalIndentNo:internalIndentNo||null,internalIndentDate:internalIndentDate?normalizeDate(internalIndentDate):null,
        yourQuotationNo:yourQuotationNo||null,vendorCode:vendorCode||null,
        vendorName:String(vendorName),vendorAddress:vendorAddress||null,vendorGstin:vendorGstin||null,
        currency:currency||'INR',termsOfDelivery:termsOfDelivery||null,termsOfPayment:termsOfPayment||null,
        contactPurchaseRep:contactPurchaseRep||null,pan:pan||null,gstin:gstin||null,iecNo:iecNo||null,
        invoiceFromName:invoiceFromName||null,invoiceFromAddress:invoiceFromAddress||null,invoiceFromGstin:invoiceFromGstin||null,
        deliverToName:deliverToName||null,deliverToAddress:deliverToAddress||null,deliverToGstin:deliverToGstin||null,
        specificTerms:specificTerms?JSON.stringify(specificTerms):null,enableTnC:!!enableTnC,
        totalValue:parseFloat(String(totalValue||0)),grossAmount:parseFloat(String(grossAmount||0)),
        narration:narration||null,preparedBy:preparedBy||null,approvedBy:approvedBy||null,financeCheck:financeCheck||null,
        items:{create:items.map((item:any,idx:number)=>({
          slNo:item.slNo||(idx+1),hsnCode:item.hsnCode||null,description:String(item.description||''),
          partNo:item.partNo||null,gstRate:parseFloat(String(item.gstRate||18)),
          requiredBy:item.requiredBy?normalizeDate(item.requiredBy):null,
          uom:String(item.uom||'Nos'),qty:parseFloat(String(item.qty||0)),rate:parseFloat(String(item.rate||0)),
          discountPerc:parseFloat(String(item.discountPerc||0)),discountAmt:parseFloat(String(item.discountAmt||0)),
          amount:parseFloat(String(item.amount||0)),
          receivedQty:parseFloat(String(item.receivedQty||0)),
          balanceQty:parseFloat(String(item.qty||0))-parseFloat(String(item.receivedQty||0)),
          stockItemId:item.stockItemId?parseInt(String(item.stockItemId)):null,
        }))}
      },
      include:{items:{orderBy:{slNo:'asc'}}}
    });
    return NextResponse.json({success:true,po:parsePO(po)});
  }catch(err:any){console.error('PO Update Error:',err);return NextResponse.json({success:false,error:err.message},{status:500});}
}

export async function PATCH(req:Request){
  try{
    const data=await req.json();
    const {poId,receivedItems}=data;
    if(!poId||!receivedItems) return NextResponse.json({success:false,error:'Missing poId or receivedItems'},{status:400});
    const po=await prisma.purchaseOrder.findFirst({where:{id:parseInt(poId)},include:{items:true}});
    if(!po) return NextResponse.json({success:false,error:'PO not found'},{status:404});
    for(const received of receivedItems){
      const poItem=po.items.find(i=>i.description.toLowerCase().trim()===String(received.description||'').toLowerCase().trim());
      if(!poItem) continue;
      const newReceived=Math.min(poItem.receivedQty+parseFloat(String(received.qty||0)),poItem.qty);
      const newBalance=Math.max(poItem.qty-newReceived,0);
      await prisma.purchaseOrderItem.update({where:{id:poItem.id},data:{receivedQty:newReceived,balanceQty:newBalance}});
    }
    const updatedPO=await prisma.purchaseOrder.findFirst({where:{id:parseInt(poId)},include:{items:true}});
    if(!updatedPO) return NextResponse.json({success:false,error:'PO not found'},{status:404});
    const allClosed=updatedPO.items.every(i=>i.balanceQty<=0);
    const anyReceived=updatedPO.items.some(i=>i.receivedQty>0);
    const newStatus=allClosed?'Closed':anyReceived?'PartiallyReceived':'Open';
    const finalPO=await prisma.purchaseOrder.update({where:{id:parseInt(poId)},data:{status:newStatus},include:{items:{orderBy:{slNo:'asc'}}}});
    return NextResponse.json({success:true,po:parsePO(finalPO)});
  }catch(err:any){console.error('PO Receive Error:',err);return NextResponse.json({success:false,error:err.message},{status:500});}
}

export async function DELETE(req:Request){
  try{
    const data=await req.json();
    if(!data.id) return NextResponse.json({success:false,error:'Missing PO ID'},{status:400});
    await prisma.purchaseOrder.delete({where:{id:parseInt(data.id)}});
    return NextResponse.json({success:true});
  }catch(err:any){return NextResponse.json({success:false,error:err.message},{status:500});}
}
