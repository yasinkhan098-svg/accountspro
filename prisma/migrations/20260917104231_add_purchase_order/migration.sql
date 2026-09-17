-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "profession" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "sessionToken" TEXT,
    "plan" TEXT,
    "subscriptionExpiry" DATETIME,
    "paymentStatus" TEXT,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Company" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "name" TEXT NOT NULL,
    "mailingName" TEXT,
    "address" TEXT,
    "state" TEXT,
    "pinCode" TEXT,
    "telephone" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "website" TEXT,
    "showMobile" BOOLEAN NOT NULL DEFAULT true,
    "showEmail" BOOLEAN NOT NULL DEFAULT true,
    "showWebsite" BOOLEAN NOT NULL DEFAULT true,
    "logo" TEXT,
    "showLogo" BOOLEAN NOT NULL DEFAULT false,
    "currencySymbol" TEXT,
    "currencyName" TEXT,
    "gstin" TEXT,
    "bankName" TEXT,
    "bankHolderName" TEXT,
    "accountNo" TEXT,
    "ifsc" TEXT,
    "swiftCode" TEXT,
    "financialYearStart" DATETIME NOT NULL,
    "booksBeginFrom" DATETIME NOT NULL,
    "securityControl" BOOLEAN NOT NULL DEFAULT false,
    "registrationType" TEXT,
    "pan" TEXT,
    "password" TEXT,
    "showDiscount" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ledger" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "alias" TEXT,
    "mailingName" TEXT,
    "address" TEXT,
    "state" TEXT,
    "pinCode" TEXT,
    "panItNo" TEXT,
    "gstin" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "registrationType" TEXT,
    "bankName" TEXT,
    "accountNo" TEXT,
    "ifsc" TEXT,
    "bankHolderName" TEXT,
    "setAlterGstDetails" TEXT,
    "openingBal" REAL NOT NULL DEFAULT 0.0,
    "balanceType" TEXT NOT NULL DEFAULT 'Dr',
    "odLimit" REAL,
    "companyId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ledger_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "narration" TEXT,
    "partyDetails" TEXT,
    "dispatchDetails" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Voucher_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VoucherEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "voucherId" INTEGER NOT NULL,
    "ledgerId" INTEGER NOT NULL,
    "ledgerName" TEXT,
    "amount" REAL NOT NULL,
    "entryType" TEXT NOT NULL,
    CONSTRAINT "VoucherEntry_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VoucherEntry_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    CONSTRAINT "StockGroup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "formalName" TEXT,
    "decimalPlaces" INTEGER NOT NULL DEFAULT 0,
    "companyId" INTEGER NOT NULL,
    CONSTRAINT "Unit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "groupId" INTEGER,
    "unitId" INTEGER,
    "openingQty" REAL NOT NULL DEFAULT 0,
    "openingVal" REAL NOT NULL DEFAULT 0,
    "openingRate" REAL NOT NULL DEFAULT 0,
    "groupName" TEXT,
    "categoryName" TEXT,
    "unitName" TEXT,
    "gstApplicable" TEXT NOT NULL DEFAULT 'Applicable',
    "gstRate" REAL NOT NULL DEFAULT 18,
    "hsnCode" TEXT,
    "showInclTax" BOOLEAN NOT NULL DEFAULT false,
    "alias" TEXT,
    "category" TEXT,
    "altUnit" TEXT,
    "typeOfSupply" TEXT,
    "costingMethod" TEXT,
    "marketValuationMethod" TEXT,
    "showAmtInclTax" BOOLEAN NOT NULL DEFAULT false,
    "defaultDiscount" REAL NOT NULL DEFAULT 0.0,
    "enableDescription" BOOLEAN DEFAULT false,
    "descLine1" BOOLEAN DEFAULT false,
    "descLine2" BOOLEAN DEFAULT false,
    "descLine3" BOOLEAN DEFAULT false,
    "companyId" INTEGER NOT NULL,
    CONSTRAINT "StockItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "StockGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "voucherId" INTEGER NOT NULL,
    "stockItemId" INTEGER NOT NULL,
    "qty" REAL NOT NULL,
    "rate" REAL NOT NULL,
    "rateInclTax" REAL NOT NULL DEFAULT 0,
    "amountInclTax" REAL NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "discountPerc" REAL NOT NULL DEFAULT 0.0,
    "discountAmt" REAL NOT NULL DEFAULT 0.0,
    "taxableAmount" REAL NOT NULL DEFAULT 0.0,
    "gstRate" REAL NOT NULL DEFAULT 18,
    "hsnCode" TEXT,
    "desc1" TEXT,
    "desc2" TEXT,
    "desc3" TEXT,
    CONSTRAINT "InventoryEntry_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryEntry_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyId" INTEGER NOT NULL,
    "poNumber" TEXT NOT NULL,
    "poDate" DATETIME NOT NULL,
    "amendmentNo" TEXT,
    "amendmentDate" DATETIME,
    "internalIndentNo" TEXT,
    "internalIndentDate" DATETIME,
    "yourQuotationNo" TEXT,
    "vendorCode" TEXT,
    "vendorName" TEXT NOT NULL,
    "vendorAddress" TEXT,
    "vendorGstin" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "termsOfDelivery" TEXT,
    "termsOfPayment" TEXT,
    "contactPurchaseRep" TEXT,
    "pan" TEXT,
    "gstin" TEXT,
    "iecNo" TEXT,
    "invoiceFromName" TEXT,
    "invoiceFromAddress" TEXT,
    "invoiceFromGstin" TEXT,
    "deliverToName" TEXT,
    "deliverToAddress" TEXT,
    "deliverToGstin" TEXT,
    "specificTerms" TEXT,
    "enableTnC" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "totalValue" REAL NOT NULL DEFAULT 0,
    "grossAmount" REAL NOT NULL DEFAULT 0,
    "narration" TEXT,
    "preparedBy" TEXT,
    "approvedBy" TEXT,
    "financeCheck" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "purchaseOrderId" INTEGER NOT NULL,
    "slNo" INTEGER NOT NULL,
    "hsnCode" TEXT,
    "description" TEXT NOT NULL,
    "partNo" TEXT,
    "gstRate" REAL NOT NULL DEFAULT 18,
    "requiredBy" DATETIME,
    "uom" TEXT NOT NULL DEFAULT 'Nos',
    "qty" REAL NOT NULL,
    "rate" REAL NOT NULL,
    "discountPerc" REAL NOT NULL DEFAULT 0,
    "discountAmt" REAL NOT NULL DEFAULT 0,
    "amount" REAL NOT NULL,
    "receivedQty" REAL NOT NULL DEFAULT 0,
    "balanceQty" REAL NOT NULL DEFAULT 0,
    "stockItemId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
