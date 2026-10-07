import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ensureLicenseTables, generateLicenseKey } from "@/lib/ensureLicenseTables";

export async function POST(req: Request) {
  try {
    await ensureLicenseTables();
    const { email, password, machineId } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    console.log('[AUTH_LOGIN_REQUEST]', { email: cleanEmail });

    // ✅ ADMIN BYPASS: Check if credentials match env variables or default master admin
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@ledgerx.com").toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (
      (cleanEmail === adminEmail && password === adminPassword) ||
      (cleanEmail === "admin@demo.com" && (password === adminPassword || password === "123456")) ||
      (cleanEmail === "yasin.khan098@gmail.com" && (password === adminPassword || password === "123456" || password === "admin123"))
    ) {
      // Admin login - no database registration needed
      const adminToken = "admin_" + crypto.randomBytes(32).toString("hex");

      // Admin expiry far future
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 20);

      const targetMachineId = (machineId || 'DESKTOP-APP').trim();
      let adminOfflineToken: string | null = null;
      try {
        const { createSignedLicenseToken } = await import('@/lib/licenseEngine');
        adminOfflineToken = createSignedLicenseToken({
          userId: 0,
          email: cleanEmail,
          licenseKey: "LX-ADMIN-MASTER-2027",
          machineId: targetMachineId,
          deviceName: 'Windows Desktop PC',
          plan: "YEARLY",
          validUntil: farFuture.toISOString(),
          features: ['ALL_MODULES', 'MFG_JOURNAL', 'PRINT_ENGINE', 'OFFLINE_MODE'],
          issuedAt: new Date().toISOString(),
        });
      } catch (e) {}

      return NextResponse.json({
        message: "Admin login successful",
        token: adminToken,
        offlineToken: adminOfflineToken,
        user: {
          id: "admin",
          name: "Administrator",
          email: cleanEmail,
          organizationName: "Admin Panel",
          plan: "YEARLY",
          subscriptionExpiry: farFuture.toISOString(),
          isAdmin: true,
          licenseKey: "LX-ADMIN-MASTER-2027",
        }
      });
    }

    // Normal user login
    let user: any = null;
    try {
      user = await prisma.user.findFirst({
        where: { email: { equals: cleanEmail } }
      });
    } catch (fetchErr) {
      const users: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "User" WHERE LOWER("email") = ? LIMIT 1`,
        cleanEmail
      );
      if (users && users.length > 0) user = users[0];
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Generate a secure random session token
    const sessionToken = crypto.randomBytes(32).toString("hex");

    let userLicenseKey = (user as any).licenseKey;
    if (!userLicenseKey) {
      userLicenseKey = generateLicenseKey(user.id);
    }

    // Update user with new session token (safe fallback if column doesn't exist yet)
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { sessionToken, licenseKey: userLicenseKey },
      });
    } catch (updateErr) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { sessionToken },
        });
      } catch (fallbackErr) {
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET "sessionToken" = ? WHERE "id" = ?`,
          sessionToken,
          user.id
        );
      }
    }

    // Generate signed offline token for desktop use
    const validUntilStr = user.subscriptionExpiry
      ? new Date(user.subscriptionExpiry).toISOString()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    let offlineToken: string | null = null;
    try {
      const { createSignedLicenseToken } = await import('@/lib/licenseEngine');
      offlineToken = createSignedLicenseToken({
        userId: user.id,
        email: user.email,
        licenseKey: userLicenseKey,
        machineId: (machineId || 'DESKTOP-APP').trim(),
        deviceName: 'Windows Desktop',
        plan: user.plan || 'PRO',
        validUntil: validUntilStr,
        features: ['ALL_MODULES', 'MFG_JOURNAL', 'PRINT_ENGINE', 'OFFLINE_MODE'],
        issuedAt: new Date().toISOString(),
      });
    } catch (e) {}

    return NextResponse.json({
      message: "Login successful",
      token: sessionToken,
      offlineToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organizationName: user.organizationName,
        plan: user.plan,
        subscriptionExpiry: user.subscriptionExpiry,
        licenseKey: userLicenseKey,
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
