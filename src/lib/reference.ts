import { prisma } from "@/lib/prisma";

/**
 * Génère une référence humaine du type "EC-2026-0007" de façon atomique.
 *
 * L'application Power Apps d'origine calculait ces références avec
 * Max(Filter(...))+1, sans verrou : deux créations simultanées pouvaient
 * produire la même référence. Ici, l'incrément et la lecture se font dans
 * une seule requête SQL (INSERT ... ON CONFLICT DO UPDATE), donc deux
 * appels concurrents ne peuvent jamais obtenir le même numéro.
 */
export async function generateReference(
  entite: string,
  prefixe: string,
): Promise<string> {
  const annee = new Date().getFullYear();
  const rows = await prisma.$queryRaw<{ valeur: number }[]>`
    INSERT INTO "ReferenceCounter" ("entite", "annee", "valeur")
    VALUES (${entite}, ${annee}, 1)
    ON CONFLICT ("entite", "annee")
    DO UPDATE SET "valeur" = "ReferenceCounter"."valeur" + 1
    RETURNING "valeur"
  `;
  const valeur = rows[0].valeur;
  return `${prefixe}-${annee}-${String(valeur).padStart(4, "0")}`;
}
