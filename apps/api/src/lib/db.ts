import { PrismaD1 } from '@prisma/adapter-d1';
import { PrismaClient } from '@/prisma/client';

/**
 * Initialize Prisma client with Neon adapter for Cloudflare Workers.
 * Creates a new client per request to avoid I/O context issues.
 */
export function initializePrisma(env: CloudflareBindings): PrismaClient {
  const adapter = new PrismaD1(env.DB);
  return new PrismaClient({ adapter });
}
