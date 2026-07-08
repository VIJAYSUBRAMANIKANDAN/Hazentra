import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

const databaseUrl = process.env.DATABASE_URL;

const createSafePrismaClient = (): PrismaClient => {
  if (!databaseUrl) {
    return {
      dehazeJob: {
        findMany: async () => [],
        create: async () => null,
      },
    } as unknown as PrismaClient;
  }

  try {
    return new PrismaClient();
  } catch {
    return {
      dehazeJob: {
        findMany: async () => [],
        create: async () => null,
      },
    } as unknown as PrismaClient;
  }
};

export const prisma = globalForPrisma.prisma ?? createSafePrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
