import prisma from "@/lib/prisma";

export interface AuditEntry {
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
}

/** Fire-and-forget, same philosophy as publishKitchenEvent — the action
 * being logged has already succeeded by the time this runs, so a logging
 * failure should never roll back or fail the actual mutation. Called from
 * the API route right after the underlying write succeeds. */
export async function logAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({ data: entry });
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}

export interface AuditLogFilters {
  actorId?: string;
  entityType?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export async function getAuditLog(filters: AuditLogFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 30));

  const where = {
    ...(filters.actorId && { actorId: filters.actorId }),
    ...(filters.entityType && { entityType: filters.entityType }),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from && { gte: filters.from }),
            ...(filters.to && { lte: filters.to }),
          },
        }
      : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { entries, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
