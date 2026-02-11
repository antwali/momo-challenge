import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.merchantCategory.upsert({
    where: { code: 'GROCERIES' },
    create: {
      code: 'GROCERIES',
      name: 'Groceries',
      description: 'Supermarkets, food',
    },
    update: {},
  });
  await prisma.merchantCategory.upsert({
    where: { code: 'FUEL' },
    create: { code: 'FUEL', name: 'Fuel', description: 'Gas stations' },
    update: {},
  });
  await prisma.merchantCategory.upsert({
    where: { code: 'CLOTHES' },
    create: {
      code: 'CLOTHES',
      name: 'Clothes',
      description: 'Boutiques, fashion',
    },
    update: {},
  });
  await prisma.merchantCategory.upsert({
    where: { code: 'UTILITIES' },
    create: {
      code: 'UTILITIES',
      name: 'Utilities',
      description: 'Bills, electricity',
    },
    update: {},
  });

  await prisma.agent.upsert({
    where: { code: 'AGENT001' },
    create: { code: 'AGENT001', name: 'Main Street Agent', status: 'ACTIVE' },
    update: {},
  });

  console.log('Seed done: merchant categories and sample agent AGENT001.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
