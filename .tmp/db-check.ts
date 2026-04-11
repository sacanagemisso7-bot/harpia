import { prisma } from "../lib/prisma/client";
import { verifyPassword } from "../lib/auth/password";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "founder@hireflow.ai" },
    select: {
      id: true,
      email: true,
      name: true,
      organizationId: true,
      role: true,
      passwordHash: true
    }
  });

  const passwordMatches = user ? await verifyPassword("ChangeMe123!", user.passwordHash) : false;

  console.log(
    JSON.stringify(
      {
        user,
        passwordMatches
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
