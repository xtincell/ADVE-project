import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const intake = await prisma.quickIntake.findFirst({
    where: { companyName: "The North Face", status: "COMPLETED" },
    orderBy: { createdAt: "desc" }
  });
  console.log(intake?.shareToken);
  console.log(intake?.id);
}

main().finally(() => prisma.$disconnect());
