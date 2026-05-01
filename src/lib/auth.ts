import { prisma } from "./prisma";

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
