import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Aucun identifiant en dur : un mot de passe écrit dans le dépôt est un mot de
// passe compromis, y compris dans un dépôt privé — il traîne ensuite dans
// l'historique Git, les archives et les copies locales.
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const name = process.env.SEED_ADMIN_NAME;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !name || !password) {
    throw new Error(
      "Renseignez SEED_ADMIN_EMAIL, SEED_ADMIN_NAME et SEED_ADMIN_PASSWORD avant de lancer le seed.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // update: {} — relancer le seed ne réinitialise pas le mot de passe d'un
  // compte existant, sinon un redéploiement écraserait un mot de passe changé
  // depuis.
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, passwordHash, role: "ADMIN" },
  });

  console.log(`Compte administrateur prêt : ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
