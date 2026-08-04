import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Crée un compte, ou réinitialise le mot de passe d'un compte existant.
 *
 *   UTILISATEUR_IDENTIFIANT=Amine \
 *   UTILISATEUR_NOM="Amine Daoudi" \
 *   UTILISATEUR_MOT_DE_PASSE="…" \
 *   npm run db:utilisateur
 *
 * Le mot de passe passe par l'environnement et jamais par un argument de ligne
 * de commande : les arguments sont visibles dans la liste des processus et
 * restent dans l'historique du shell.
 */
async function main() {
  const identifiant = process.env.UTILISATEUR_IDENTIFIANT?.trim();
  const name = process.env.UTILISATEUR_NOM?.trim();
  const password = process.env.UTILISATEUR_MOT_DE_PASSE;
  const role = process.env.UTILISATEUR_ROLE === "ADMIN" ? "ADMIN" : "UTILISATEUR";

  if (!identifiant || !name || !password) {
    throw new Error(
      "Renseignez UTILISATEUR_IDENTIFIANT, UTILISATEUR_NOM et UTILISATEUR_MOT_DE_PASSE.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const existant = await prisma.user.findUnique({ where: { identifiant } });
  await prisma.user.upsert({
    where: { identifiant },
    // Contrairement au seed, ce script est lancé à la main dans le but explicite
    // de poser un mot de passe : il écrase donc celui du compte existant.
    update: { name, passwordHash, role },
    create: { identifiant, name, passwordHash, role },
  });

  console.log(
    existant
      ? `Mot de passe réinitialisé pour ${identifiant} (${name}, ${role}).`
      : `Compte créé : ${identifiant} (${name}, ${role}).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
