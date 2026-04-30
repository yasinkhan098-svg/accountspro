import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "No active session" }, { status: 200 });
    }

    const token = authHeader.split(" ")[1];

    // Find the user with this token and clear it
    const user = await prisma.user.findFirst({ where: { sessionToken: token } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { sessionToken: null },
      });
    }

    return NextResponse.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
