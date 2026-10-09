import { prisma } from "@/lib/prisma";

// La criticité d'une réclamation est celle de son point le plus grave : c'est
// lui qui décide de l'urgence de la réponse.
const RANG_CRITICITE: Record<string, number> = { Faible: 1, Moyenne: 2, Élevée: 3 };

export function criticiteMax(points: { criticite: string | null }[]): string | null {
  let max: string | null = null;
  for (const p of points) {
    if (p.criticite && (RANG_CRITICITE[p.criticite] ?? 0) > (max ? RANG_CRITICITE[max] : 0)) max = p.criticite;
  }
  return max;
}

/** Chantiers et émetteurs déjà connus, proposés en suggestion dans le formulaire. */
export async function suggestionsReclamation() {
  const [dossiers, reclamations] = await Promise.all([
    prisma.dossier.findMany({ distinct: ["chantier"], select: { chantier: true } }),
    prisma.reclamation.findMany({ select: { chantier: true, emetteur: true } }),
  ]);
  return {
    chantiersConnus: [
      ...new Set([...dossiers.map((d) => d.chantier), ...reclamations.flatMap((r) => (r.chantier ? [r.chantier] : []))]),
    ].sort(),
    emetteursConnus: [...new Set(reclamations.map((r) => r.emetteur))].sort(),
  };
}
