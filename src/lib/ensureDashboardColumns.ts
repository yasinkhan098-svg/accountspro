import { prisma } from './prisma';

let columnsEnsured = false;

export async function ensureDashboardColumns() {
  if (columnsEnsured) return;

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN "dashboardToken" TEXT;`);
  } catch (e) {
    // Column already exists or table locked - ignore
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN "dashboardPin" TEXT;`);
  } catch (e) {
    // Column already exists - ignore
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ADD COLUMN "dashboardEnabled" BOOLEAN DEFAULT 1;`);
  } catch (e) {
    // Column already exists - ignore
  }

  try {
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Company_dashboardToken_key" ON "Company"("dashboardToken");`);
  } catch (e) {
    // Index already exists - ignore
  }

  columnsEnsured = true;
}
