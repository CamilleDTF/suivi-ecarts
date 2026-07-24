// Script ponctuel : recalcule le statut de chaque Fiche SSE non-brouillon en
// fonction de ses actions rattachées (repasse "Finalisée" -> "En cours" si au
// moins une action n'est pas terminée). À exécuter une fois après déploiement
// avec : npx tsx prisma/recheck-statuts-fiches.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const STATUTS_ACTION_OUVERTS = ["A_FAIRE", "EN_COURS", "EN_RETARD"];

async function main() {
  const fiches = await prisma.ficheSSE.findMany({
    where: { statutFiche: { not: "BROUILLON" } },
    select: { id: true, reference: true, statutFiche: true },
  });

  let corrigees = 0;
  for (const fiche of fiches) {
    const actions = await prisma.action.findMany({
      where: { ficheSSEId: fiche.id },
      select: { statut: true },
    });
    if (actions.length === 0) continue;

    const aUneActionOuverte = actions.some((a) => STATUTS_ACTION_OUVERTS.includes(a.statut));
    const nouveauStatut = aUneActionOuverte ? "EN_COURS" : "FINALISEE";
    if (nouveauStatut === fiche.statutFiche) continue;

    await prisma.ficheSSE.update({ where: { id: fiche.id }, data: { statutFiche: nouveauStatut } });
    console.log(`${fiche.reference}: ${fiche.statutFiche} -> ${nouveauStatut}`);
    corrigees++;
  }

  console.log(`${corrigees} fiche(s) corrigée(s) sur ${fiches.length} vérifiée(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
