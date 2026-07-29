import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Réaligne les références affichées sur la numérotation du classeur Excel.
 *
 * À l'import, l'identifiant de chaque ligne a été repris du classeur, mais sa
 * référence a été attribuée par le compteur de l'application, dans l'ordre de
 * parcours du fichier. Les deux numéros ne coïncident donc pas : la fiche
 * affichée « EV-2026-0054 » est la ligne « EV-2026-063 » du classeur. Tant que
 * l'équipe travaille avec l'Excel à côté, chaque numéro lu à l'écran renvoie au
 * mauvais enregistrement.
 *
 * Ce script recopie l'identifiant d'origine dans la référence, pour les seuls
 * enregistrements issus de l'import (ceux dont l'identifiant a la forme d'une
 * référence). Les enregistrements créés dans l'application ont un identifiant
 * cuid : ils sont laissés tels quels.
 *
 * Deux passes, car `reference` est unique : renommer directement provoquerait
 * une collision avec la référence que porte encore un autre enregistrement. La
 * première passe déplace tout le monde vers un nom temporaire.
 *
 *   npm run db:realigner-references            # simulation, n'écrit rien
 *   npm run db:realigner-references -- --appliquer
 */
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const APPLIQUER = process.argv.includes("--appliquer");

type Table = {
  nom: string;
  prefixe: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delegue: any;
  entiteCompteur: string;
};

const TABLES: Table[] = [
  { nom: "Dossier", prefixe: "D", delegue: prisma.dossier, entiteCompteur: "Dossier" },
  { nom: "Ecart", prefixe: "EC", delegue: prisma.ecart, entiteCompteur: "Ecart" },
  { nom: "FicheSSE", prefixe: "EV", delegue: prisma.ficheSSE, entiteCompteur: "FicheSSE" },
  { nom: "Action", prefixe: "ACT", delegue: prisma.action, entiteCompteur: "Action" },
  { nom: "EcartAmiante", prefixe: "EA", delegue: prisma.ecartAmiante, entiteCompteur: "EcartAmiante" },
];

/** "EV-2026-063" -> "EV-2026-0063" : le classeur ne padde pas toujours pareil. */
function normaliser(id: string, prefixe: string): string | null {
  const m = new RegExp(`^${prefixe}-(\\d{4})-(\\d+)$`).exec(id);
  if (!m) return null;
  return `${prefixe}-${m[1]}-${String(Number(m[2])).padStart(4, "0")}`;
}

async function main() {
  console.log(APPLIQUER ? "Mode : APPLICATION" : "Mode : simulation (ajoutez --appliquer pour écrire)");

  for (const table of TABLES) {
    const lignes: { id: string; reference: string }[] = await table.delegue.findMany({
      select: { id: true, reference: true },
    });

    const aChanger = lignes
      .map((l) => ({ ...l, cible: normaliser(l.id, table.prefixe) }))
      .filter((l): l is { id: string; reference: string; cible: string } => !!l.cible && l.cible !== l.reference);

    if (aChanger.length === 0) {
      console.log(`${table.nom} : rien à faire (${lignes.length} ligne(s))`);
      continue;
    }

    const cibles = new Set(aChanger.map((l) => l.cible));
    if (cibles.size !== aChanger.length) {
      throw new Error(`${table.nom} : deux lignes viseraient la même référence, réalignement interrompu.`);
    }

    console.log(`${table.nom} : ${aChanger.length} référence(s) à réaligner`);
    for (const l of aChanger.slice(0, 3)) console.log(`   ${l.reference} -> ${l.cible}`);
    if (aChanger.length > 3) console.log(`   … et ${aChanger.length - 3} autre(s)`);

    if (!APPLIQUER) continue;

    await prisma.$transaction(
      async (tx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = (tx as any)[table.nom[0].toLowerCase() + table.nom.slice(1)];
        for (const l of aChanger) {
          await t.update({ where: { id: l.id }, data: { reference: `tmp-${l.id}` } });
        }
        for (const l of aChanger) {
          await t.update({ where: { id: l.id }, data: { reference: l.cible } });
        }

        // Le compteur doit repartir au-dessus du plus grand numéro, sinon la
        // prochaine création réutiliserait une référence existante.
        const annee = new Date().getFullYear();
        const max = Math.max(
          ...lignes
            .map((l) => normaliser(l.id, table.prefixe) ?? l.reference)
            .map((r) => Number(r.split("-").at(-1)))
            .filter((n) => Number.isFinite(n)),
        );
        await tx.referenceCounter.upsert({
          where: { entite_annee: { entite: table.entiteCompteur, annee } },
          update: { valeur: max },
          create: { entite: table.entiteCompteur, annee, valeur: max },
        });
      },
      { timeout: 60000 },
    );
    console.log(`${table.nom} : réaligné, compteur remis à jour`);
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
