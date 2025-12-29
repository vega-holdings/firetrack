import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton
 * This is the ONLY place where PrismaClient should be instantiated
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Re-export for backward compatibility during migration
// TODO: Remove this after all imports are updated to use repositories
export const db = prisma;
