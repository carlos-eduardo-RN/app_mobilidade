import bcrypt from 'bcryptjs';
import prisma from '../src/db/prisma';

const email = process.env.ADMIN_SEED_EMAIL || 'carlos83eduardo@gmail.com';
const password = process.env.ADMIN_SEED_PASSWORD || '123456';
const role = process.env.ADMIN_SEED_ROLE || 'SUPER_ADMIN';

async function main() {
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { email },
    update: {
      passwordHash,
      role,
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      role,
      isActive: true,
    },
  });

  console.log(`Admin seed ready for ${email}`);
}

main()
  .catch((error) => {
    console.error('Admin seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
