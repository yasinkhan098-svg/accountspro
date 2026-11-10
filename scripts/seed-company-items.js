const fs = require('fs');
const path = require('path');

const hardwareItems = [
  {
    id: 101, sNo: 1, name: "UltraTech Cement 50kg",
    purchasePrice: 320, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 250,
    barcode: "8901000101", mrp: 380, discountPerc: 5, discountAmt: 20, retailSalePrice: 360,
    unit: "BAG", gstRate: 28, variant: "Cement & Aggregates", variants: ["Cement & Aggregates"],
    companyCode: "10001", companyId: 5
  },
  {
    id: 102, sNo: 2, name: "Kamdhenu TMT Steel Bar 12mm",
    purchasePrice: 52, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 1200,
    barcode: "8901000102", mrp: 65, discountPerc: 0, discountAmt: 7, retailSalePrice: 58,
    unit: "KG", gstRate: 18, variant: "Steel & Iron", variants: ["Steel & Iron"],
    companyCode: "10001", companyId: 5
  },
  {
    id: 103, sNo: 3, name: "Supreme PVC Pipe 4 Inch 10ft",
    purchasePrice: 420, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 80,
    barcode: "8901000103", mrp: 550, discountPerc: 10, discountAmt: 60, retailSalePrice: 490,
    unit: "PCS", gstRate: 18, variant: "Plumbing & Pipes", variants: ["Plumbing & Pipes"],
    companyCode: "10001", companyId: 5
  },
  {
    id: 104, sNo: 4, name: "Asian Paints Apex White 20L",
    purchasePrice: 3100, newPurchasePrice: 0, expiryDate: "31/12/2028", cessPerc: 0, openingStock: 35,
    barcode: "8901000104", mrp: 3850, discountPerc: 10, discountAmt: 400, retailSalePrice: 3450,
    unit: "BUCKET", gstRate: 18, variant: "Paints & Chemicals", variants: ["Paints & Chemicals"],
    companyCode: "10001", companyId: 5
  },
  {
    id: 105, sNo: 5, name: "Bosch Impact Drill 550W",
    purchasePrice: 1950, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 15,
    barcode: "8901000105", mrp: 2600, discountPerc: 13, discountAmt: 350, retailSalePrice: 2250,
    unit: "PCS", gstRate: 18, variant: "Power Tools", variants: ["Power Tools"],
    companyCode: "10001", companyId: 5
  },
  {
    id: 106, sNo: 6, name: "Hex Bolt with Nut 1/2 x 3 Inch",
    purchasePrice: 85, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 300,
    barcode: "8901000106", mrp: 130, discountPerc: 15, discountAmt: 20, retailSalePrice: 110,
    unit: "KG", gstRate: 18, variant: "Fasteners & Hardware", variants: ["Fasteners & Hardware"],
    companyCode: "10001", companyId: 5
  },
  {
    id: 107, sNo: 7, name: "Havells Copper Wire 2.5 sq mm",
    purchasePrice: 1450, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 45,
    barcode: "8901000107", mrp: 1850, discountPerc: 10, discountAmt: 200, retailSalePrice: 1650,
    unit: "ROLL", gstRate: 18, variant: "Electrical Goods", variants: ["Electrical Goods"],
    companyCode: "10001", companyId: 5
  },
  {
    id: 108, sNo: 8, name: "Stainless Steel Hinges 4 Inch",
    purchasePrice: 65, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 150,
    barcode: "8901000108", mrp: 110, discountPerc: 18, discountAmt: 20, retailSalePrice: 90,
    unit: "PAIR", gstRate: 18, variant: "Fasteners & Hardware", variants: ["Fasteners & Hardware"],
    companyCode: "10001", companyId: 5
  }
];

const tradersItems = [
  {
    id: 201, sNo: 1, name: "India Gate Basmati Rice 5kg",
    purchasePrice: 480, newPurchasePrice: 0, expiryDate: "30/06/2028", cessPerc: 0, openingStock: 120,
    barcode: "8902000201", mrp: 620, discountPerc: 9, discountAmt: 60, retailSalePrice: 560,
    unit: "BAG", gstRate: 5, variant: "Rice & Grains", variants: ["Rice & Grains"],
    companyCode: "10002", companyId: 6
  },
  {
    id: 202, sNo: 2, name: "Fortune Refined Sunflower Oil 5L",
    purchasePrice: 560, newPurchasePrice: 0, expiryDate: "31/12/2027", cessPerc: 0, openingStock: 90,
    barcode: "8902000202", mrp: 690, discountPerc: 8, discountAmt: 60, retailSalePrice: 630,
    unit: "JAR", gstRate: 5, variant: "Edible Oils", variants: ["Edible Oils"],
    companyCode: "10002", companyId: 6
  },
  {
    id: 203, sNo: 3, name: "Aashirvaad Shudh Chakki Atta 10kg",
    purchasePrice: 380, newPurchasePrice: 0, expiryDate: "15/09/2027", cessPerc: 0, openingStock: 150,
    barcode: "8902000203", mrp: 465, discountPerc: 8, discountAmt: 40, retailSalePrice: 425,
    unit: "BAG", gstRate: 5, variant: "Flour & Atta", variants: ["Flour & Atta"],
    companyCode: "10002", companyId: 6
  },
  {
    id: 204, sNo: 4, name: "Tata Salt Vacuum Evaporated 1kg",
    purchasePrice: 21, newPurchasePrice: 0, expiryDate: "31/12/2028", cessPerc: 0, openingStock: 400,
    barcode: "8902000204", mrp: 28, discountPerc: 10, discountAmt: 3, retailSalePrice: 25,
    unit: "PKT", gstRate: 0, variant: "Salt & Sugar", variants: ["Salt & Sugar"],
    companyCode: "10002", companyId: 6
  },
  {
    id: 205, sNo: 5, name: "Madhur Pure & Hygienic Sugar 5kg",
    purchasePrice: 210, newPurchasePrice: 0, expiryDate: "31/03/2028", cessPerc: 0, openingStock: 80,
    barcode: "8902000205", mrp: 260, discountPerc: 9, discountAmt: 25, retailSalePrice: 235,
    unit: "BAG", gstRate: 5, variant: "Salt & Sugar", variants: ["Salt & Sugar"],
    companyCode: "10002", companyId: 6
  },
  {
    id: 206, sNo: 6, name: "Tata Tea Gold 500g",
    purchasePrice: 260, newPurchasePrice: 0, expiryDate: "31/08/2028", cessPerc: 0, openingStock: 60,
    barcode: "8902000206", mrp: 330, discountPerc: 10, discountAmt: 35, retailSalePrice: 295,
    unit: "PKT", gstRate: 5, variant: "Tea & Beverages", variants: ["Tea & Beverages"],
    companyCode: "10002", companyId: 6
  },
  {
    id: 207, sNo: 7, name: "Catch Red Chilli Powder 200g",
    purchasePrice: 72, newPurchasePrice: 0, expiryDate: "31/12/2027", cessPerc: 0, openingStock: 110,
    barcode: "8902000207", mrp: 98, discountPerc: 13, discountAmt: 13, retailSalePrice: 85,
    unit: "PKT", gstRate: 5, variant: "Spices & Masala", variants: ["Spices & Masala"],
    companyCode: "10002", companyId: 6
  },
  {
    id: 208, sNo: 8, name: "Catch Turmeric Powder 200g",
    purchasePrice: 48, newPurchasePrice: 0, expiryDate: "31/12/2027", cessPerc: 0, openingStock: 130,
    barcode: "8902000208", mrp: 65, discountPerc: 10, discountAmt: 7, retailSalePrice: 58,
    unit: "PKT", gstRate: 5, variant: "Spices & Masala", variants: ["Spices & Masala"],
    companyCode: "10002", companyId: 6
  },
  {
    id: 209, sNo: 9, name: "Surf Excel Easy Wash 1kg",
    purchasePrice: 115, newPurchasePrice: 0, expiryDate: "31/12/2028", cessPerc: 0, openingStock: 85,
    barcode: "8902000209", mrp: 145, discountPerc: 9, discountAmt: 13, retailSalePrice: 132,
    unit: "PKT", gstRate: 18, variant: "Cleaning & Detergents", variants: ["Cleaning & Detergents"],
    companyCode: "10002", companyId: 6
  },
  {
    id: 210, sNo: 10, name: "Dettol Original Handwash Refill 750ml",
    purchasePrice: 95, newPurchasePrice: 0, expiryDate: "31/10/2028", cessPerc: 0, openingStock: 70,
    barcode: "8902000210", mrp: 129, discountPerc: 10, discountAmt: 14, retailSalePrice: 115,
    unit: "POUCH", gstRate: 18, variant: "Personal Care & Hygiene", variants: ["Personal Care & Hygiene"],
    companyCode: "10002", companyId: 6
  }
];

function toStockItem(p) {
  return {
    id: p.id,
    companyId: p.companyId,
    companyCode: p.companyCode,
    name: p.name,
    alias: p.barcode,
    partNumber: p.barcode,
    barcode: p.barcode,
    groupName: p.variant || "Primary",
    categoryName: "Primary",
    unit: p.unit,
    unitName: p.unit,
    gstRate: p.gstRate,
    cessRate: p.cessPerc,
    mrp: p.mrp,
    retailSalePrice: p.retailSalePrice,
    rateInclTax: p.retailSalePrice,
    openingQty: p.openingStock,
    openingRate: p.purchasePrice,
    openingValue: Math.round(p.openingStock * p.purchasePrice * 100) / 100,
    variant: p.variant,
    variants: p.variants,
    expiryDate: p.expiryDate,
    showInclTax: false,
    showAmtInclTax: false,
    enableDescription: false,
    descLine1: false,
    descLine2: false
  };
}

const localApp = process.env.LOCALAPPDATA;
const dataDirs = [
  path.join(localApp, 'LedgerX', 'data'),
  path.join(__dirname, '..', 'data')
];

for (const base of dataDirs) {
  // 10001: Aiman Hardware
  const d10001 = path.join(base, '10001');
  if (fs.existsSync(d10001)) {
    fs.writeFileSync(path.join(d10001, 'pos_purchase_list.json'), JSON.stringify(hardwareItems, null, 2), 'utf-8');
    fs.writeFileSync(path.join(d10001, 'stock_items.json'), JSON.stringify(hardwareItems.map(toStockItem), null, 2), 'utf-8');
    console.log("Updated 10001 at", d10001);
  }

  // 10002: Aiman Traders
  const d10002 = path.join(base, '10002');
  if (fs.existsSync(d10002)) {
    fs.writeFileSync(path.join(d10002, 'pos_purchase_list.json'), JSON.stringify(tradersItems, null, 2), 'utf-8');
    fs.writeFileSync(path.join(d10002, 'stock_items.json'), JSON.stringify(tradersItems.map(toStockItem), null, 2), 'utf-8');
    console.log("Updated 10002 at", d10002);
  }
}

console.log("Done seeding authentic real data for 10001 and 10002.");
