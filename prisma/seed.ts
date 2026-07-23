import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function generateReference(entite: string, prefixe: string) {
  const annee = new Date().getFullYear();
  const rows = await prisma.$queryRaw<{ valeur: number }[]>`
    INSERT INTO "ReferenceCounter" ("entite", "annee", "valeur")
    VALUES (${entite}, ${annee}, 1)
    ON CONFLICT ("entite", "annee")
    DO UPDATE SET "valeur" = "ReferenceCounter"."valeur" + 1
    RETURNING "valeur"
  `;
  return `${prefixe}-${annee}-${String(rows[0].valeur).padStart(4, "0")}`;
}

async function main() {
  const passwordHash = await bcrypt.hash("admin1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Administrateur",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log("Utilisateur admin prêt : admin@example.com / admin1234");

  const dossierCount = await prisma.dossier.count();
  if (dossierCount === 0) {
    const dossier = await prisma.dossier.create({
      data: {
        reference: await generateReference("Dossier", "D"),
        dateDetection: new Date(),
        origine: "VISITE_CHANTIER",
        statut: "EN_COURS",
        declarant: "Camille Martinez",
        chantier: "Chantier Nord — Lot 3",
      },
    });

    const ecart = await prisma.ecart.create({
      data: {
        reference: await generateReference("Ecart", "EC"),
        dossierId: dossier.id,
        dateDetection: new Date(),
        origine: "RONDE_SECURITE",
        statut: "OUVERT",
        declarant: "Camille Martinez",
        typeActivite: "PREPARATION_CHANTIER",
        natures: ["Non-conformité"],
        domaines: ["Sécurité"],
        description: "Absence de garde-corps sur la plateforme de niveau 2.",
        mesureImmediate: "Zone balisée et accès interdit dans l'attente de la pose des garde-corps.",
        gravitePotentielle: "Élevée",
        frequence: "Occasionnelle",
      },
    });

    await prisma.ficheSSE.create({
      data: {
        reference: await generateReference("FicheSSE", "EV"),
        ecartId: ecart.id,
        statutFiche: "BROUILLON",
        emetteur: "Camille Martinez",
        nomChantier: dossier.chantier,
        dateHeure: new Date(),
        lieuZone: "Niveau 2 — plateforme Est",
        descriptionFactuelle: "Garde-corps manquant constaté lors de la ronde sécurité hebdomadaire.",
      },
    });

    await prisma.action.create({
      data: {
        reference: await generateReference("Action", "PA"),
        ecartId: ecart.id,
        type: "CURATIVE",
        action: "Poser les garde-corps manquants niveau 2",
        responsable: "Mohamed",
        echeance: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        statut: "A_FAIRE",
        obligatoire: true,
      },
    });

    console.log("Données de démonstration créées.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
