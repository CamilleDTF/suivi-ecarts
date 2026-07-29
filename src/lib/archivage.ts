import { prisma } from "@/lib/prisma";

/**
 * Archivage : alternative non destructive à la suppression.
 *
 * Un registre QSE se relit des années plus tard, parfois devant un inspecteur.
 * Effacer une ligne efface aussi la trace de ce qui avait été constaté et
 * décidé. Archiver retire l'enregistrement des listes de travail sans le
 * détruire : il reste consultable, et réactivable.
 *
 * Les deux gestes coexistent volontairement — la suppression garde son sens
 * pour une saisie erronée créée le matin même.
 */
export const ENTITES_ARCHIVABLES = {
  dossier: prisma.dossier,
  ecart: prisma.ecart,
  ficheSSE: prisma.ficheSSE,
  ecartAmiante: prisma.ecartAmiante,
  action: prisma.action,
  remontee: prisma.remonteeInfo,
} as const;

export type EntiteArchivable = keyof typeof ENTITES_ARCHIVABLES;

/** Filtre à ajouter à une liste pour n'afficher que l'un ou l'autre. */
export function filtreArchive(voirArchives?: string) {
  return voirArchives === "1" ? { NOT: { archiveLe: null } } : { archiveLe: null };
}
