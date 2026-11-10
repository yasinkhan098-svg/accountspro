const fs = require('fs');
const path = require('path');

const dataDir = path.join(process.env.LOCALAPPDATA || 'C:\\Users\\yasin\\AppData\\Local', 'LedgerX', 'data');
const dir10000 = path.join(dataDir, '10000');

const aimanPolymersRealItems = [
  {
    id: 1, sNo: 1, name: "LOCAL ITEM",
    purchasePrice: 0, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 10,
    barcode: "1000101", mrp: 0, discountPerc: 0, discountAmt: 0, retailSalePrice: 0,
    unit: "PCS", gstRate: 18, variant: "General", variants: ["General"],
    companyCode: "10000", companyId: 4
  },
  {
    id: 2, sNo: 2, name: "Item 4",
    purchasePrice: 0, newPurchasePrice: 0, expiryDate: "02/05/2028", cessPerc: 0, openingStock: 10,
    barcode: "1000104", mrp: 120, discountPerc: 0, discountAmt: 0, retailSalePrice: 100,
    unit: "NOS", gstRate: 18, variant: "General", variants: ["General"],
    companyCode: "10000", companyId: 4
  },
  {
    id: 3, sNo: 3, name: "Test Item 1",
    purchasePrice: 0, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 20,
    barcode: "1000105", mrp: 0, discountPerc: 0, discountAmt: 0, retailSalePrice: 0,
    unit: "NOS", gstRate: 18, variant: "General", variants: ["General"],
    companyCode: "10000", companyId: 4
  },
  {
    id: 4, sNo: 4, name: "Test Item 2",
    purchasePrice: 0, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 18,
    barcode: "1000106", mrp: 0, discountPerc: 0, discountAmt: 0, retailSalePrice: 0,
    unit: "NOS", gstRate: 18, variant: "General", variants: ["General"],
    companyCode: "10000", companyId: 4
  },
  {
    id: 5, sNo: 5, name: "CEMENT",
    purchasePrice: 0, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 23557,
    barcode: "1000107", mrp: 350, discountPerc: 0, discountAmt: 0, retailSalePrice: 270,
    unit: "BAG", gstRate: 28, variant: "Construction", variants: ["Construction"],
    companyCode: "10000", companyId: 4
  },
  {
    id: 6, sNo: 6, name: "ALUMINUIM SACTION",
    purchasePrice: 0, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 52088,
    barcode: "1000108", mrp: 220, discountPerc: 0, discountAmt: 0, retailSalePrice: 180,
    unit: "KG", gstRate: 18, variant: "Metals", variants: ["Metals"],
    companyCode: "10000", companyId: 4
  },
  {
    id: 7, sNo: 7, name: "TMT BAR",
    purchasePrice: 0, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 134000,
    barcode: "35262", mrp: 65, discountPerc: 0, discountAmt: 0, retailSalePrice: 54,
    unit: "KG", gstRate: 18, variant: "Steel", variants: ["Steel"],
    companyCode: "10000", companyId: 4
  },
  {
    id: 8, sNo: 8, name: "Cabinet",
    purchasePrice: 0, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 3,
    barcode: "1000110", mrp: 1500, discountPerc: 0, discountAmt: 0, retailSalePrice: 0,
    unit: "PCS", gstRate: 18, variant: "Computer Hardware", variants: ["Computer Hardware"],
    companyCode: "10000", companyId: 4
  },
  {
    id: 9, sNo: 9, name: "Smps",
    purchasePrice: 0, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 3,
    barcode: "1000111", mrp: 800, discountPerc: 0, discountAmt: 0, retailSalePrice: 0,
    unit: "PCS", gstRate: 18, variant: "Computer Hardware", variants: ["Computer Hardware"],
    companyCode: "10000", companyId: 4
  },
  {
    id: 10, sNo: 10, name: "Mather Board",
    purchasePrice: 0, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 3,
    barcode: "1000112", mrp: 4500, discountPerc: 0, discountAmt: 0, retailSalePrice: 0,
    unit: "PCS", gstRate: 18, variant: "Computer Hardware", variants: ["Computer Hardware"],
    companyCode: "10000", companyId: 4
  },
  {
    id: 11, sNo: 11, name: "Cpu",
    purchasePrice: 0, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 10,
    barcode: "1000113", mrp: 8500, discountPerc: 0, discountAmt: 0, retailSalePrice: 0,
    unit: "PCS", gstRate: 18, variant: "Computer Hardware", variants: ["Computer Hardware"],
    companyCode: "10000", companyId: 4
  },
  {
    id: 12, sNo: 12, name: "M Fan",
    purchasePrice: 0, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 3,
    barcode: "1000114", mrp: 350, discountPerc: 0, discountAmt: 0, retailSalePrice: 0,
    unit: "PCS", gstRate: 18, variant: "Computer Hardware", variants: ["Computer Hardware"],
    companyCode: "10000", companyId: 4
  },
  {
    id: 13, sNo: 13, name: "Ram",
    purchasePrice: 0, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 3,
    barcode: "1000115", mrp: 1800, discountPerc: 0, discountAmt: 0, retailSalePrice: 0,
    unit: "PCS", gstRate: 18, variant: "Computer Hardware", variants: ["Computer Hardware"],
    companyCode: "10000", companyId: 4
  },
  {
    id: 14, sNo: 14, name: "Hdd",
    purchasePrice: 0, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 3,
    barcode: "1000116", mrp: 3200, discountPerc: 0, discountAmt: 0, retailSalePrice: 0,
    unit: "PCS", gstRate: 18, variant: "Computer Hardware", variants: ["Computer Hardware"],
    companyCode: "10000", companyId: 4
  },
  {
    id: 15, sNo: 15, name: "Dvd Writer",
    purchasePrice: 0, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 3,
    barcode: "1000117", mrp: 1100, discountPerc: 0, discountAmt: 0, retailSalePrice: 0,
    unit: "PCS", gstRate: 18, variant: "Computer Hardware", variants: ["Computer Hardware"],
    companyCode: "10000", companyId: 4
  },
  {
    id: 16, sNo: 16, name: "PP RAFFIA WASTAGE",
    purchasePrice: 0, newPurchasePrice: 0, expiryDate: "", cessPerc: 0, openingStock: 500,
    barcode: "1000256", mrp: 80, discountPerc: 0, discountAmt: 0, retailSalePrice: 65,
    unit: "KG", gstRate: 18, variant: "Recycled Polymers", variants: ["Recycled Polymers"],
    companyCode: "10000", companyId: 4
  }
];

const aimanPolymersStockItems = aimanPolymersRealItems.map(it => ({
  id: it.id,
  companyId: 4,
  companyCode: "10000",
  name: it.name,
  alias: it.barcode,
  partNumber: it.barcode,
  barcode: it.barcode,
  groupName: it.variant || "General",
  categoryName: "Primary",
  unit: it.unit || "NOS",
  unitName: it.unit || "NOS",
  gstRate: it.gstRate || 18,
  cessRate: it.cessPerc || 0,
  mrp: it.mrp || 0,
  retailSalePrice: it.retailSalePrice || 0,
  rateInclTax: it.retailSalePrice || 0,
  openingQty: it.openingStock || 0,
  openingRate: it.purchasePrice || 0,
  openingValue: (it.openingStock || 0) * (it.purchasePrice || 0),
  variant: it.variant || "General",
  variants: it.variants || ["General"],
  expiryDate: it.expiryDate || "",
  under: it.variant || "General",
  category: "Primary"
}));

if (!fs.existsSync(dir10000)) fs.mkdirSync(dir10000, { recursive: true });

fs.writeFileSync(path.join(dir10000, 'pos_purchase_list.json'), JSON.stringify(aimanPolymersRealItems, null, 2), 'utf8');
fs.writeFileSync(path.join(dir10000, 'stock_items.json'), JSON.stringify(aimanPolymersStockItems, null, 2), 'utf8');

console.log('Restored 16 real items to 10000/pos_purchase_list.json and 10000/stock_items.json');
