import { BadgeStatut, type TonStatut } from "@/components/badge-statut";
import { NATURE_REX_LABELS, STATUT_REX_LABELS } from "@/lib/labels";

// Mêmes teintes que les anciennes pastilles colorées : gris tant que le REX
// n'est que rédigé, bleu une fois diffusé, vert quand l'efficacité est vérifiée.
export const TON_STATUT_REX: Record<string, TonStatut> = {
  REDIGE: "neutre",
  DIFFUSE: "bleu",
  EFFICACITE_VERIFIEE: "vert",
};

const TON_NATURE: Record<string, TonStatut> = {
  BONNE_PRATIQUE: "vert",
  PRATIQUE_A_EVITER: "rouge",
  EVOLUTION_METHODE: "ambre",
};

export function BadgeStatutRex({ statut }: { statut: string }) {
  return <BadgeStatut label={STATUT_REX_LABELS[statut]} ton={TON_STATUT_REX[statut]} />;
}

export function BadgeNatureRex({ nature }: { nature: string }) {
  return <BadgeStatut label={NATURE_REX_LABELS[nature]} ton={TON_NATURE[nature]} />;
}

export function BadgeBrouillon() {
  return <BadgeStatut label="Brouillon" ton="ambre" />;
}
