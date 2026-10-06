import { prisma } from '../src/lib/prisma';
import { generateLicenseKey } from '../src/lib/ensureLicenseTables';

async function main() {
  try {
    const users: any[] = await prisma.$queryRawUnsafe(`SELECT id, email, licenseKey FROM "User"`);
    for (const u of users) {
      if (!u.licenseKey) {
        const key = generateLicenseKey(u.id);
        await prisma.$executeRawUnsafe(`UPDATE "User" SET "licenseKey" = ? WHERE "id" = ?`, key, u.id);
        console.log(`Updated user ${u.email} (id ${u.id}) with key ${key}`);
      } else {
        console.log(`User ${u.email} already has key ${u.licenseKey}`);
      }
    }
    console.log('Backfill completed successfully!');
  } catch (err: any) {
    console.error('Error in backfill:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
