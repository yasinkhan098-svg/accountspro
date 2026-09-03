import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const dbUrl = process.env.TURSO_DATABASE_URL || 'file:prisma/dev.db'
const authToken = process.env.TURSO_AUTH_TOKEN

const libsql = createClient({
  url: dbUrl,
  ...(authToken ? { authToken } : {}),
})

const adapter = new PrismaLibSQL(libsql)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
