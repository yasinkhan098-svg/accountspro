import { PrismaClient } from "@prisma/client";

// In Next.js App Router, it's best practice to instantiate PrismaClient 
// globally to avoid connection exhaustion in development.
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null; // Not authenticated
  }

  const token = authHeader.split(" ")[1];

  const user = await prisma.user.findFirst({
    where: { sessionToken: token },
  });

  return user; // returns user object or null if token is invalid
}
