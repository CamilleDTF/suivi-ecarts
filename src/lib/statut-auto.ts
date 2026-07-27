import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { StatutAction, StatutDossierEcart, StatutFiche } from "@/generated/prisma/enums";

const STATUTS_ACTION_OUVERTS: StatutAction[] = ["A_FAIRE", "EN_COURS", "EN_RETARD"];

function aUneActionOuverte(actions: { statut: StatutAction }[]): boolean {
  return actions.some((a) => STATUTS_ACTION_OUVERTS.includes(a.statut));
}

// Quand il ne reste plus aucune action, "En cours" n'a plus de sens : le statut
// redevient "Ouvert". On ne touche en revanche jamais à un "Clôturé" — supprimer
// des actions ne doit pas rouvrir ce qui a été fermé volontairement.
function statutSansAction(statutActuel: StatutDossierEcart): StatutDossierEcart | null {
  return statutActuel === "EN_COURS" ? "OUVERT" : null;
}

export async function recalculerStatutEcart(ecartId: string) {
  const [actions, ecart] = await Promise.all([
    prisma.action.findMany({ where: { ecartId }, select: { statut: true } }),
    prisma.ecart.findUnique({ where: { id: ecartId }, select: { statut: true, dossierId: true } }),
  ]);
  if (!ecart) return;

  const nouveauStatut: StatutDossierEcart | null =
    actions.length === 0
      ? statutSansAction(ecart.statut)
      : aUneActionOuverte(actions)
        ? "EN_COURS"
        : "CLOTURE";
  if (!nouveauStatut || ecart.statut === nouveauStatut) return;

  await prisma.ecart.update({ where: { id: ecartId }, data: { statut: nouveauStatut } });
  revalidatePath(`/ecarts/${ecartId}`);
  revalidatePath("/ecarts");
  revalidatePath(`/dossiers/${ecart.dossierId}`);
}

export async function recalculerStatutEcartAmiante(ecartAmianteId: string) {
  const [actions, ecartAmiante] = await Promise.all([
    prisma.action.findMany({ where: { ecartAmianteId }, select: { statut: true } }),
    prisma.ecartAmiante.findUnique({ where: { id: ecartAmianteId }, select: { statut: true } }),
  ]);
  if (!ecartAmiante) return;

  const nouveauStatut: StatutDossierEcart | null =
    actions.length === 0
      ? statutSansAction(ecartAmiante.statut)
      : aUneActionOuverte(actions)
        ? "EN_COURS"
        : "CLOTURE";
  if (!nouveauStatut || ecartAmiante.statut === nouveauStatut) return;

  await prisma.ecartAmiante.update({
    where: { id: ecartAmianteId },
    data: { statut: nouveauStatut, dateCloture: nouveauStatut === "CLOTURE" ? new Date() : null },
  });
  revalidatePath(`/ecart-amiante/${ecartAmianteId}`);
  revalidatePath("/ecart-amiante");
}

// Le brouillon reste une étape manuelle (bouton "Finaliser l'évènement") ;
// une fois la fiche sortie du brouillon, son statut suit ensuite ses actions.
export async function recalculerStatutFicheSSE(ficheSSEId: string) {
  const fiche = await prisma.ficheSSE.findUnique({
    where: { id: ficheSSEId },
    select: { statutFiche: true, ecartId: true },
  });
  if (!fiche || fiche.statutFiche === "BROUILLON") return;

  // Sans action rattachée, plus rien ne bloque : la fiche retrouve l'état
  // "Finalisée" voulu par l'utilisateur quand il a cliqué sur "Finaliser".
  const actions = await prisma.action.findMany({ where: { ficheSSEId }, select: { statut: true } });

  const nouveauStatut: StatutFiche = aUneActionOuverte(actions) ? "EN_COURS" : "FINALISEE";
  if (fiche.statutFiche === nouveauStatut) return;

  await prisma.ficheSSE.update({ where: { id: ficheSSEId }, data: { statutFiche: nouveauStatut } });
  revalidatePath(`/fiches-sse/${ficheSSEId}`);
  if (fiche.ecartId) revalidatePath(`/ecarts/${fiche.ecartId}`);
}

export async function recalculerStatutsParents(parents: {
  ecartId?: string | null;
  ficheSSEId?: string | null;
  ecartAmianteId?: string | null;
}) {
  await Promise.all([
    parents.ecartId ? recalculerStatutEcart(parents.ecartId) : Promise.resolve(),
    parents.ficheSSEId ? recalculerStatutFicheSSE(parents.ficheSSEId) : Promise.resolve(),
    parents.ecartAmianteId ? recalculerStatutEcartAmiante(parents.ecartAmianteId) : Promise.resolve(),
  ]);
}

export { aUneActionOuverte };
