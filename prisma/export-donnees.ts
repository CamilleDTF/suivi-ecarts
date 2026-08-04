import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Copie complète de la base dans un fichier JSON.
 *
 * Format JSON plutôt qu'un pg_dump : pg_dump refuse de tourner si sa version
 * ne correspond pas à celle du serveur, ce qui casserait la sauvegarde
 * automatique le jour où Neon met à jour PostgreSQL. Ici rien ne dépend d'un
 * binaire externe, et `db:restaurer` sait relire ce fichier.
 *
 * Les mots de passe (empreintes bcrypt) sont exclus : une sauvegarde circule,
 * se copie et se stocke ailleurs — elle n'a pas à emporter de quoi tenter des
 * mots de passe hors ligne. Les comptes se recréent avec `db:utilisateur`.
 */
async function main() {
  const dossierSortie = process.env.EXPORT_DIR ?? "sauvegardes";
  await mkdir(dossierSortie, { recursive: true });

  const [
    dossiers,
    ecarts,
    fichesSSE,
    ecartsAmiante,
    actions,
    remontees,
    causes,
    compteurs,
    utilisateurs,
  ] = await Promise.all([
    prisma.dossier.findMany({ orderBy: { reference: "asc" } }),
    prisma.ecart.findMany({ orderBy: { reference: "asc" } }),
    prisma.ficheSSE.findMany({ orderBy: { reference: "asc" } }),
    prisma.ecartAmiante.findMany({ orderBy: { reference: "asc" } }),
    prisma.action.findMany({ orderBy: { reference: "asc" } }),
    prisma.remonteeInfo.findMany({ orderBy: { reference: "asc" } }),
    prisma.causeArbre.findMany(),
    prisma.referenceCounter.findMany(),
    prisma.user.findMany({
      orderBy: { identifiant: "asc" },
      select: { id: true, identifiant: true, email: true, name: true, role: true, createdAt: true },
    }),
  ]);

  const contenu = {
    exporteLe: new Date().toISOString(),
    // Le fichier doit rester relisible dans dix ans, y compris si le schéma a
    // changé entre-temps : la version dit à quoi il correspond.
    schema: 1,
    donnees: {
      dossiers,
      ecarts,
      fichesSSE,
      ecartsAmiante,
      actions,
      remontees,
      causes,
      compteurs,
      utilisateurs,
    },
  };

  const jour = new Date().toISOString().slice(0, 10);
  const chemin = join(dossierSortie, `sauvegarde-${jour}.json`);
  await writeFile(chemin, JSON.stringify(contenu, null, 2), "utf8");

  const total = Object.values(contenu.donnees).reduce((n, t) => n + t.length, 0);
  console.log(`Sauvegarde écrite : ${chemin}`);
  for (const [nom, table] of Object.entries(contenu.donnees)) {
    console.log(`  ${nom} : ${table.length}`);
  }
  console.log(`  total : ${total} enregistrements`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
