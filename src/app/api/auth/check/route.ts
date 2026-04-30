import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    return NextResponse.json({ 
      valid: true, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organizationName: user.organizationName
      } 
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
