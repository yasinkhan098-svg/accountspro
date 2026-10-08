import { prisma } from "./prisma";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  organizationName: string;
  plan: string;
  paymentStatus: string;
  subscriptionExpiry: Date;
  sessionToken: string;
  isAdmin: boolean;
  mobile: string | null;
  address: string | null;
  profession: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
};

export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null; // Not authenticated
  }

  const token = authHeader.split(" ")[1];

  // ✅ Admin token bypass - database mein dhundne ki zaroorat nahi
  if (token && token.startsWith("admin_")) {
    const adminEmail = process.env.ADMIN_EMAIL || "admin";
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 100);

    const adminUser: AdminUser = {
      id: -1, // Special admin ID (number type maintain karna)
      name: "Administrator",
      email: adminEmail,
      organizationName: "Admin Panel",
      plan: "YEARLY",
      paymentStatus: "SUCCESS",
      subscriptionExpiry: farFuture,
      sessionToken: token,
      isAdmin: true,
      mobile: null,
      address: null,
      profession: null,
      razorpayOrderId: null,
      razorpayPaymentId: null,
    };
    return adminUser;
  }

  // Normal user - check sessionToken
  try {
    const user = await prisma.user.findFirst({
      where: { sessionToken: token },
    });
    if (user) return user;
  } catch (err) {
    try {
      const users: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "User" WHERE "sessionToken" = ? LIMIT 1`,
        token
      );
      if (users && users.length > 0) return users[0];
    } catch (rawErr) {}
  }

  // Cryptographic License Token check (For Desktop App API requests)
  try {
    const { verifyLicenseToken } = await import("./licenseEngine");
    const check = verifyLicenseToken(token);
    if (check.valid && check.payload && check.payload.userId) {
      const user = await prisma.user.findUnique({
        where: { id: check.payload.userId },
      });
      if (user) return user;
    }
  } catch (licErr) {}

  // Header x-license-token check fallback
  const xLic = req.headers.get("x-license-token");
  if (xLic) {
    try {
      const { verifyLicenseToken } = await import("./licenseEngine");
      const check = verifyLicenseToken(xLic);
      if (check.valid && check.payload && check.payload.userId) {
        const user = await prisma.user.findUnique({
          where: { id: check.payload.userId },
        });
        if (user) return user;
      }
    } catch (e) {}
  }

  return null;
}
