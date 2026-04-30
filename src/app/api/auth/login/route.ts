import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

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
        organizationName: user.organizationName
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
