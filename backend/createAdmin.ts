import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'carlosvoudemoto@gmail.com';
const ADMIN_PASSWORD = 'voudemoto26';
const ADMIN_ROLE = 'ADMIN';

async function main(): Promise<void> {
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existingAdmin) {
    console.log('Admin ja existe');
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await prisma.admin.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      role: ADMIN_ROLE,
    },
  });

  console.log('Admin criado com sucesso');
}

main()
  .catch((error) => {
    console.error('Erro ao criar admin', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
