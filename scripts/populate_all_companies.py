import os
import json

base_dir = r"C:\Users\yasin\AppData\Local\LedgerX\data"

items = [
    {
        "id": 1,
        "name": "LOCAL ITEM",
        "partNumber": "1000101",
        "variant": "Vegetables",
        "group": "General",
        "under": "Primary",
        "groupName": "Primary",
        "unit": "PCS",
        "unitName": "PCS",
        "category": "Not Applicable",
        "categoryName": "Not Applicable",
        "mrp": 0,
        "retailSalePrice": 0,
        "purchasePrice": 0,
        "openingQty": 10,
        "stock": 10,
        "barcode": "1000101",
        "gstRate": 0,
        "cessRate": 0
    },
    {
        "id": 4,
        "name": "Item 4",
        "partNumber": "1000104",
        "variant": "General",
        "group": "General",
        "under": "Primary",
        "groupName": "Primary",
        "unit": "NOS",
        "unitName": "NOS",
        "category": "Not Applicable",
        "categoryName": "Not Applicable",
        "mrp": 120,
        "retailSalePrice": 100,
        "purchasePrice": 90,
        "openingQty": 10,
        "stock": 10,
        "barcode": "1000104",
        "expiryDate": "02/05/2029",
        "gstRate": 5,
        "cessRate": 0
    },
    {
        "id": 5,
        "name": "Test Item 1",
        "partNumber": "1000105",
        "variant": "General",
        "group": "General",
        "under": "Primary",
        "groupName": "Primary",
        "unit": "NOS",
        "unitName": "NOS",
        "category": "Not Applicable",
        "categoryName": "Not Applicable",
        "mrp": 0,
        "retailSalePrice": 0,
        "purchasePrice": 0,
        "openingQty": 20,
        "stock": 20,
        "barcode": "1000105",
        "gstRate": 0,
        "cessRate": 0
    },
    {
        "id": 6,
        "name": "Test Item 2",
        "partNumber": "1000106",
        "variant": "General",
        "group": "General",
        "under": "Primary",
        "groupName": "Primary",
        "unit": "NOS",
        "unitName": "NOS",
        "category": "Not Applicable",
        "categoryName": "Not Applicable",
        "mrp": 0,
        "retailSalePrice": 0,
        "purchasePrice": 0,
        "openingQty": 18,
        "stock": 18,
        "barcode": "1000106",
        "gstRate": 0,
        "cessRate": 0
    },
    {
        "id": 7,
        "name": "CEMENT",
        "partNumber": "1000107",
        "variant": "Building Materials",
        "group": "Hardware",
        "under": "Hardware",
        "groupName": "Hardware",
        "unit": "BAG",
        "unitName": "BAG",
        "category": "Not Applicable",
        "categoryName": "Not Applicable",
        "mrp": 350,
        "retailSalePrice": 270,
        "purchasePrice": 240,
        "openingQty": 23557,
        "stock": 23557,
        "barcode": "1000107",
        "gstRate": 28,
        "cessRate": 0
    },
    {
        "id": 8,
        "name": "ALUMINUIM SACTION",
        "partNumber": "1000108",
        "variant": "Building Materials",
        "group": "Hardware",
        "under": "Hardware",
        "groupName": "Hardware",
        "unit": "KG",
        "unitName": "KG",
        "category": "Not Applicable",
        "categoryName": "Not Applicable",
        "mrp": 220,
        "retailSalePrice": 180,
        "purchasePrice": 160,
        "openingQty": 52088,
        "stock": 52088,
        "barcode": "1000108",
        "gstRate": 18,
        "cessRate": 0
    },
    {
        "id": 9,
        "name": "TMT BAR",
        "partNumber": "35262",
        "variant": "Building Materials",
        "group": "Hardware",
        "under": "Hardware",
        "groupName": "Hardware",
        "unit": "KG",
        "unitName": "KG",
        "category": "Not Applicable",
        "categoryName": "Not Applicable",
        "mrp": 65,
        "retailSalePrice": 54,
        "purchasePrice": 50,
        "openingQty": 134000,
        "stock": 134000,
        "barcode": "35262",
        "gstRate": 18,
        "cessRate": 0
    },
    {
        "id": 10,
        "name": "Cabinet",
        "partNumber": "1000110",
        "variant": "Computer Hardware",
        "group": "Electronics",
        "under": "Electronics",
        "groupName": "Electronics",
        "unit": "PCS",
        "unitName": "PCS",
        "category": "Not Applicable",
        "categoryName": "Not Applicable",
        "mrp": 1500,
        "retailSalePrice": 0,
        "purchasePrice": 1200,
        "openingQty": 3,
        "stock": 3,
        "barcode": "1000110",
        "gstRate": 18,
        "cessRate": 0
    },
    {
        "id": 11,
        "name": "Smps",
        "partNumber": "1000111",
        "variant": "Computer Hardware",
        "group": "Electronics",
        "under": "Electronics",
        "groupName": "Electronics",
        "unit": "PCS",
        "unitName": "PCS",
        "category": "Not Applicable",
        "categoryName": "Not Applicable",
        "mrp": 800,
        "retailSalePrice": 0,
        "purchasePrice": 600,
        "openingQty": 3,
        "stock": 3,
        "barcode": "1000111",
        "gstRate": 18,
        "cessRate": 0
    },
    {
        "id": 12,
        "name": "Mather Board",
        "partNumber": "1000112",
        "variant": "Computer Hardware",
        "group": "Electronics",
        "under": "Electronics",
        "groupName": "Electronics",
        "unit": "PCS",
        "unitName": "PCS",
        "category": "Not Applicable",
        "categoryName": "Not Applicable",
        "mrp": 4500,
        "retailSalePrice": 0,
        "purchasePrice": 3800,
        "openingQty": 3,
        "stock": 3,
        "barcode": "1000112",
        "gstRate": 18,
        "cessRate": 0
    },
    {
        "id": 13,
        "name": "Cpu",
        "partNumber": "1000113",
        "variant": "Computer Hardware",
        "group": "Electronics",
        "under": "Electronics",
        "groupName": "Electronics",
        "unit": "PCS",
        "unitName": "PCS",
        "category": "Not Applicable",
        "categoryName": "Not Applicable",
        "mrp": 8500,
        "retailSalePrice": 0,
        "purchasePrice": 7200,
        "openingQty": 10,
        "stock": 10,
        "barcode": "1000113",
        "gstRate": 18,
        "cessRate": 0
    },
    {
        "id": 14,
        "name": "M Fan",
        "partNumber": "1000114",
        "variant": "Computer Hardware",
        "group": "Electronics",
        "under": "Electronics",
        "groupName": "Electronics",
        "unit": "PCS",
        "unitName": "PCS",
        "category": "Not Applicable",
        "categoryName": "Not Applicable",
        "mrp": 350,
        "retailSalePrice": 0,
        "purchasePrice": 250,
        "openingQty": 3,
        "stock": 3,
        "barcode": "1000114",
        "gstRate": 18,
        "cessRate": 0
    },
    {
        "id": 15,
        "name": "Ram",
        "partNumber": "1000115",
        "variant": "Computer Hardware",
        "group": "Electronics",
        "under": "Electronics",
        "groupName": "Electronics",
        "unit": "PCS",
        "unitName": "PCS",
        "category": "Not Applicable",
        "categoryName": "Not Applicable",
        "mrp": 1800,
        "retailSalePrice": 0,
        "purchasePrice": 1400,
        "openingQty": 3,
        "stock": 3,
        "barcode": "1000115",
        "gstRate": 18,
        "cessRate": 0
    },
    {
        "id": 16,
        "name": "Hdd",
        "partNumber": "1000116",
        "variant": "Computer Hardware",
        "group": "Electronics",
        "under": "Electronics",
        "groupName": "Electronics",
        "unit": "PCS",
        "unitName": "PCS",
        "category": "Not Applicable",
        "categoryName": "Not Applicable",
        "mrp": 3200,
        "retailSalePrice": 0,
        "purchasePrice": 2600,
        "openingQty": 3,
        "stock": 3,
        "barcode": "1000116",
        "gstRate": 18,
        "cessRate": 0
    },
    {
        "id": 17,
        "name": "Dvd Writer",
        "partNumber": "1000117",
        "variant": "Computer Hardware",
        "group": "Electronics",
        "under": "Electronics",
        "groupName": "Electronics",
        "unit": "PCS",
        "unitName": "PCS",
        "category": "Not Applicable",
        "categoryName": "Not Applicable",
        "mrp": 1100,
        "retailSalePrice": 0,
        "purchasePrice": 900,
        "openingQty": 3,
        "stock": 3,
        "barcode": "1000117",
        "gstRate": 18,
        "cessRate": 0
    },
    {
        "id": 48,
        "name": "PP RAFFIA WASTAGE",
        "partNumber": "1000256",
        "variant": "Fruit",
        "group": "Polymers",
        "under": "Primary",
        "groupName": "Primary",
        "unit": "KG",
        "unitName": "KG",
        "category": "Not Applicable",
        "categoryName": "Not Applicable",
        "mrp": 80,
        "retailSalePrice": 65,
        "purchasePrice": 55,
        "openingQty": 500,
        "stock": 500,
        "barcode": "1000256",
        "gstRate": 18,
        "cessRate": 0
    }
]

# For each company folder (10000, 10001, 10002, 10003, 10004, 10005, 10006)
folders = [f for f in os.listdir(base_dir) if f.startswith('1000')]
for f in folders:
    cdir = os.path.join(base_dir, f)
    if not os.path.isdir(cdir):
        continue
    
    # Read company id if available
    cjson_path = os.path.join(cdir, "company.json")
    cid = 1
    if os.path.exists(cjson_path):
        try:
            with open(cjson_path, 'r', encoding='utf-8') as cf:
                cdata = json.load(cf)
                # handle nesting
                co = cdata.get('company', {})
                if 'company' in co: co = co['company']
                if 'company' in co: co = co['company']
                cid = co.get('id', 1)
        except:
            pass

    company_items = []
    pos_items = []
    for it in items:
        cit = dict(it)
        cit["companyId"] = cid
        cit["companyCode"] = f
        company_items.append(cit)
        pos_items.append(cit)

    # Write stock_items.json
    s_path = os.path.join(cdir, "stock_items.json")
    with open(s_path, 'w', encoding='utf-8') as sf:
        json.dump(company_items, sf, indent=2)
    print(f"Wrote {len(company_items)} stock items to {s_path} (companyId: {cid})")

    # Write pos_purchase_list.json
    p_path = os.path.join(cdir, "pos_purchase_list.json")
    with open(p_path, 'w', encoding='utf-8') as pf:
        json.dump(pos_items, pf, indent=2)
    print(f"Wrote {len(pos_items)} pos items to {p_path} (companyId: {cid})")

print("\nAll company folders populated successfully!")

