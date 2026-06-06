const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const intake = await prisma.quickIntake.findUnique({
    where: { shareToken: "cmq1tgo0q004erc017jttssev" },
    include: {
      strategy: true,
      diagnostic: true
    }
  });
  console.log(JSON.stringify(intake, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
