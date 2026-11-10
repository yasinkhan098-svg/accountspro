const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();
  console.log('Companies in DB:', companies.map(c => ({ id: c.id, name: c.name, companyCode: c.companyCode })));
  const items = await prisma.stockItem.findMany();
  console.log('Stock items in DB:', items.length);
  if (items.length > 0) {
    console.log('Sample items:', items.map(i => ({ id: i.id, name: i.name, companyId: i.companyId, openingBalance: i.openingBalance })));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
