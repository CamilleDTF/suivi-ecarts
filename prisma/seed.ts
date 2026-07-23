import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("123456789", 10);
  await prisma.user.upsert({
    where: { email: "martinez.camille@dtffrance.com" },
    update: {},
    create: {
      email: "martinez.camille@dtffrance.com",
      name: "Camille Martinez",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log("Utilisateur admin prêt : martinez.camille@dtffrance.com");

  await prisma.user.deleteMany({ where: { email: "admin@example.com" } });

  const iliasPasswordHash = await bcrypt.hash("DanielleCasanova13014", 10);
  await prisma.user.upsert({
    where: { email: "hammadi.ilias@dtffrance.com" },
    update: {},
    create: {
      email: "hammadi.ilias@dtffrance.com",
      name: "Ilias Hammadi",
      passwordHash: iliasPasswordHash,
      role: "UTILISATEUR",
    },
  });
  console.log("Utilisateur prêt : hammadi.ilias@dtffrance.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
