const fs = require('fs');
const path = require('path');

const dataDir = path.join(process.env.LOCALAPPDATA || 'C:\\Users\\yasin\\AppData\\Local', 'LedgerX', 'data');
const dir10001 = path.join(dataDir, '10001');

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

const hardwareStockItems = hardwareItems.map(it => ({
  id: it.id,
  companyId: 5,
  companyCode: "10001",
  name: it.name,
  alias: it.barcode,
  partNumber: it.barcode,
  barcode: it.barcode,
  groupName: it.variant,
  categoryName: "Primary",
  unit: it.unit,
  unitName: it.unit,
  gstRate: it.gstRate,
  cessRate: 0,
  mrp: it.mrp,
  retailSalePrice: it.retailSalePrice,
  rateInclTax: it.retailSalePrice,
  openingQty: it.openingStock,
  openingRate: it.purchasePrice,
  openingValue: it.openingStock * it.purchasePrice,
  variant: it.variant,
  variants: it.variants,
  expiryDate: it.expiryDate,
  under: it.variant,
  category: "Primary"
}));

if (!fs.existsSync(dir10001)) fs.mkdirSync(dir10001, { recursive: true });

fs.writeFileSync(path.join(dir10001, 'pos_purchase_list.json'), JSON.stringify(hardwareItems, null, 2), 'utf8');
fs.writeFileSync(path.join(dir10001, 'stock_items.json'), JSON.stringify(hardwareStockItems, null, 2), 'utf8');

console.log('Restored hardware items to 10001/pos_purchase_list.json and 10001/stock_items.json');

