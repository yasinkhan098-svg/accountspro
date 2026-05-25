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

  // Normal user - database se check karo
  const user = await prisma.user.findFirst({
    where: { sessionToken: token },
  });

  return user; // returns user object or null if token is invalid
}
