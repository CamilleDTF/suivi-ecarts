import "dotenv/config";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Relit un fichier produit par `db:sauvegarder` et le recharge dans une base
 * vide — celle d'un nouvel hébergeur, par exemple, si Neon devenait
 * indisponible.
 *
 *   FICHIER=sauvegardes/sauvegarde-2026-08-10.json npm run db:restaurer
 *
 * Refuse de tourner sur une base qui contient déjà des données : une
 * restauration par-dessus l'existant produirait des doublons ou des conflits
 * de références, et c'est exactement le moment où on ne veut pas de surprise.
 * Ajouter VIDER_AVANT=oui pour effacer d'abord.
 */
async function main() {
  const fichier = process.env.FICHIER;
  if (!fichier) throw new Error("Renseignez FICHIER=chemin/vers/sauvegarde.json");

  const brut = JSON.parse(await readFile(fichier, "utf8"));
  if (brut.schema !== 1) {
    throw new Error(`Version de sauvegarde inconnue : ${brut.schema}. Ce script lit la version 1.`);
  }
  const d = brut.donnees;

  const dejaLa = await prisma.dossier.count();
  if (dejaLa > 0 && process.env.VIDER_AVANT !== "oui") {
    throw new Error(
      `La base contient déjà ${dejaLa} dossier(s). Relancez avec VIDER_AVANT=oui pour l'écraser.`,
    );
  }

  if (process.env.VIDER_AVANT === "oui") {
    // Ordre inverse des dépendances : on ne supprime pas un parent avant ses
    // enfants.
    await prisma.causeArbre.deleteMany();
    await prisma.action.deleteMany();
    await prisma.remonteeInfo.deleteMany();
    await prisma.ficheSSE.deleteMany();
    await prisma.ecartAmiante.deleteMany();
    await prisma.ecart.deleteMany();
    await prisma.dossier.deleteMany();
    await prisma.referenceCounter.deleteMany();
  }

  // Ordre des dépendances : un enfant ne peut pas être inséré avant son parent.
  await prisma.dossier.createMany({ data: d.dossiers });
  await prisma.ecart.createMany({ data: d.ecarts });
  await prisma.ecartAmiante.createMany({ data: d.ecartsAmiante });
  await prisma.ficheSSE.createMany({ data: d.fichesSSE });
  await prisma.remonteeInfo.createMany({ data: d.remontees });
  await prisma.action.createMany({ data: d.actions });
  await prisma.referenceCounter.createMany({ data: d.compteurs });

  // L'arbre des causes se référence lui-même : on pose d'abord les nœuds sans
  // leur parent, puis on rebranche les liens, sinon l'ordre d'insertion
  // déciderait de ce qui passe ou non.
  await prisma.causeArbre.createMany({
    data: d.causes.map((c: { parentId: string | null }) => ({ ...c, parentId: null })),
  });
  for (const cause of d.causes as { id: string; parentId: string | null }[]) {
    if (cause.parentId) {
      await prisma.causeArbre.update({ where: { id: cause.id }, data: { parentId: cause.parentId } });
    }
  }

  // Les empreintes de mots de passe ne sont pas dans la sauvegarde : les
  // comptes reviennent avec un mot de passe inutilisable, à réattribuer avec
  // `db:utilisateur`.
  const utilisateurs = d.utilisateurs as {
    id: string;
    identifiant: string;
    email: string | null;
    name: string;
    role: "ADMIN" | "UTILISATEUR";
    createdAt: string;
  }[];
  for (const u of utilisateurs) {
    await prisma.user.upsert({
      where: { identifiant: u.identifiant },
      update: {},
      create: { ...u, passwordHash: `!restauration!${randomBytes(24).toString("hex")}` },
    });
  }

  console.log(`Restauré depuis ${fichier} (export du ${brut.exporteLe}) :`);
  for (const [nom, table] of Object.entries(d)) {
    console.log(`  ${nom} : ${(table as unknown[]).length}`);
  }
  console.log(
    `\n${utilisateurs.length} compte(s) restauré(s) SANS mot de passe utilisable.\n` +
      "Réattribuez-les un par un avec npm run db:utilisateur.",
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
