import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

import { ensureLicenseTables, generateLicenseKey } from "@/lib/ensureLicenseTables";

export async function POST(req: Request) {
  try {
    await ensureLicenseTables();
    const body = await req.json();
    const { name, organizationName, mobile, address, profession, email, password, plan, country } = body;
    const userCountry = (country || 'India').trim();

    if (!name || !organizationName || !email || !password || !plan) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    const hashedPassword = await bcrypt.hash(password, 10);
    
    if (existingUser) {
      // If payment was incomplete, allow them to retry with the same email
      if (existingUser.paymentStatus === 'PENDING') {
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: { plan, password: hashedPassword }
        });
        return NextResponse.json({ message: "Resuming registration", userId: updatedUser.id }, { status: 200 });
      }
      
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    let subscriptionExpiry = null;
    let paymentStatus = 'PENDING';

    if (plan === 'TRIAL') {
      const now = new Date();
      now.setDate(now.getDate() + 7); // 7 days free trial
      subscriptionExpiry = now;
      paymentStatus = 'SUCCESS';
    } else if (plan === 'MONTHLY') {
      const now = new Date();
      now.setDate(now.getDate() + 30); // 30 days monthly subscription
      subscriptionExpiry = now;
      paymentStatus = 'SUCCESS';
    } else if (plan === 'YEARLY') {
      const now = new Date();
      now.setDate(now.getDate() + 365); // 365 days yearly subscription
      subscriptionExpiry = now;
      paymentStatus = 'SUCCESS';
    } else if (plan === 'LIFETIME') {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 20); // 20 years lifetime
      subscriptionExpiry = farFuture;
      paymentStatus = 'SUCCESS';
    }

    let user: any = null;
    const lKey = generateLicenseKey(Date.now().toString().slice(-4));
    try {
      user = await prisma.user.create({
        data: {
          name,
          organizationName,
          mobile,
          address,
          profession,
          email,
          password: hashedPassword,
          plan,
          paymentStatus,
          subscriptionExpiry,
          licenseKey: lKey,
        },
      });
    } catch (createErr) {
      user = await prisma.user.create({
        data: {
          name,
          organizationName,
          mobile,
          address,
          profession,
          email,
          password: hashedPassword,
          plan,
          paymentStatus,
          subscriptionExpiry,
        },
      });
    }

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "country" = ? WHERE "id" = ?`,
        userCountry,
        user.id
      );
    } catch (_) {}

    return NextResponse.json({ message: "User registered successfully", userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Signup Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
