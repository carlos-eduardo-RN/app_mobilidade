import prisma from '../db/prisma';

export type AdminAuditInput = {
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  ipAddress?: string;
  userAgent?: string;
};

export async function recordAdminAudit(input: AdminAuditInput): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      adminId: input.adminId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeJson: input.beforeJson as any,
      afterJson: input.afterJson as any,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}
