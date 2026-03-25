import prisma from '../db/prisma';

export type AdminSessionCheck = {
  adminId: string;
  isActive: boolean;
};

export async function loadValidAdminSession(sessionId: string): Promise<AdminSessionCheck | null> {
  const session = await prisma.adminSession.findUnique({
    where: { id: sessionId },
    include: { admin: true },
  });

  if (!session) return null;
  if (session.revoked) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  if (!session.admin.isActive) return null;

  return { adminId: session.adminId, isActive: session.admin.isActive };
}

export async function revokeAdminSession(sessionId: string): Promise<void> {
  await prisma.adminSession.update({
    where: { id: sessionId },
    data: { revoked: true },
  });
}
