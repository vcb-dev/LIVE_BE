import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_PASSWORD = '123456';

async function main(): Promise<void> {
  const passwordHash = await hash(SEED_PASSWORD, 12);

  const users = [
    { email: 'admin@live.vcb', role: UserRole.ADMIN },
    { email: 'leader@live.vcb', role: UserRole.LEADER },
    { email: 'member@live.vcb', role: UserRole.MEMBER },
  ] as const;

  for (const { email, role } of users) {
    await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash, role },
      update: { passwordHash, role, isActive: true },
    });
  }

  console.log('Seed xong. Password chung:', SEED_PASSWORD);
  console.log('  admin@live.vcb  → ADMIN');
  console.log('  leader@live.vcb → LEADER');
  console.log('  member@live.vcb → MEMBER');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
