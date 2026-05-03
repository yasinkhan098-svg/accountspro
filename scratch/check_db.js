const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      include: {
        companies: {
          include: {
            vouchers: true
          }
        }
      }
    });

    console.log('--- DATABASE SUMMARY ---');
    for (const user of users) {
      console.log(`User: ${user.name} (${user.email}) - ID: ${user.id}`);
      for (const company of user.companies) {
        console.log(`  Company: ${company.name} - ID: ${company.id}`);
        console.log(`    Vouchers: ${company.vouchers.length}`);
      }
    }
    
    const allVouchers = await prisma.voucher.count();
    console.log(`\nTotal Vouchers in DB: ${allVouchers}`);
  } catch (err) {
    console.error('Error querying database:', err);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
