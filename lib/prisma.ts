import { PrismaClient } from "@prisma/client";

// Prevents exhausting the connection pool by reusing a single PrismaClient
// instance across hot reloads in development, and across warm serverless
// invocations on Vercel.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
