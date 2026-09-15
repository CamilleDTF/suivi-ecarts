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

/**
 * Numéro du plan d'action du Document Unique : PA1, PA2…
 *
 * Contrairement aux autres références, il ne repart pas à zéro chaque année :
 * le DU est un document continu, et ses fiches de risques renvoient à ces
 * numéros. L'année 0 sert de ligne unique dans le compteur, qui reste partagé
 * et garde la même garantie d'atomicité.
 */
export async function prochainNumeroActionDU(): Promise<number> {
  const rows = await prisma.$queryRaw<{ valeur: number }[]>`
    INSERT INTO "ReferenceCounter" ("entite", "annee", "valeur")
    VALUES ('ActionDU', 0, 1)
    ON CONFLICT ("entite", "annee")
    DO UPDATE SET "valeur" = "ReferenceCounter"."valeur" + 1
    RETURNING "valeur"
  `;
  return rows[0].valeur;
}
