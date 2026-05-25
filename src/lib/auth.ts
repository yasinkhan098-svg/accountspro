import { prisma } from "./prisma";

export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null; // Not authenticated
  }

  const token = authHeader.split(" ")[1];

  // ✅ Admin token bypass - database mein dhundne ki zaroorat nahi
  if (token && token.startsWith("admin_")) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 100);

    return {
      id: "admin",
      name: "Administrator",
      email: adminEmail || "admin",
      organizationName: "Admin Panel",
      plan: "YEARLY",
      paymentStatus: "SUCCESS",
      subscriptionExpiry: farFuture,
      sessionToken: token,
      isAdmin: true,
    };
  }

  // Normal user - database se check karo
  const user = await prisma.user.findFirst({
    where: { sessionToken: token },
  });

  return user; // returns user object or null if token is invalid
}
