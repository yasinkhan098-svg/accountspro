import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // ✅ ADMIN BYPASS: Check if credentials match env variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      // Admin login - no database registration needed
      const adminToken = "admin_" + crypto.randomBytes(32).toString("hex");

      // Admin ki expiry 100 saal baad set karo
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 100);

      return NextResponse.json({
        message: "Admin login successful",
        token: adminToken,
        user: {
          id: "admin",
          name: "Administrator",
          email: adminEmail,
          organizationName: "Admin Panel",
          plan: "YEARLY",
          subscriptionExpiry: farFuture.toISOString(),
          isAdmin: true,
        }
      });
    }

    // Normal user login
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Generate a secure random session token
    const sessionToken = crypto.randomBytes(32).toString("hex");

    // Update user with new session token
    await prisma.user.update({
      where: { id: user.id },
      data: { sessionToken },
    });

    return NextResponse.json({
      message: "Login successful",
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organizationName: user.organizationName,
        plan: user.plan,
        subscriptionExpiry: user.subscriptionExpiry
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
