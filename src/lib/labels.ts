export const ORIGINE_LABELS: Record<string, string> = {
  REMONTEE_TERRAIN: "Remontée terrain",
  AUDIT_INTERNE: "Audit interne",
  AUDIT_EXTERNE: "Audit externe",
  VISITE_CHANTIER: "Visite chantier",
  CONTROLE_TERRAIN: "Contrôle terrain",
  RONDE_SECURITE: "Ronde sécurité",
  INCIDENT_ACCIDENT: "Incident / accident",
  AUTRE: "Autre",
};

export const STATUT_DOSSIER_ECART_LABELS: Record<string, string> = {
  A_QUALIFIER: "À qualifier",
  OUVERT: "Ouvert",
  EN_COURS: "En cours",
  CLOTURE: "Clôturé",
};

export const STATUT_DOSSIER_ECART_COLORS: Record<string, string> = {
  A_QUALIFIER: "bg-slate-100 text-slate-700",
  OUVERT: "bg-amber-100 text-amber-800",
  EN_COURS: "bg-blue-100 text-blue-800",
  CLOTURE: "bg-green-100 text-green-800",
};

export const TYPE_ACTIVITE_LABELS: Record<string, string> = {
  SS3_RETRAIT_ENCAPSULAGE: "SS3 - retrait / encapsulage",
  SS4_INTERVENTION: "SS4 - intervention",
  PREPARATION_CHANTIER: "Préparation chantier",
  REPLI_RESTITUTION: "Repli / restitution",
  GESTION_DECHETS: "Gestion déchets",
  MATERIEL: "Matériel",
  ACTIVITE_SUPPORT: "Activité support",
  AUTRE: "Autre",
};

export const NATURES_OPTIONS = [
  "Remarque",
  "Non-conformité",
  "Non-conformité critique",
  "Événement SSE",
  "Point sensible",
  "Réclamation",
  "Remontée terrain",
  "Opportunité d'amélioration",
  "Bonne pratique",
];

export const DOMAINES_OPTIONS = ["Santé", "Sécurité", "Environnement"];

export const THEME_OPTIONS = [
  "EPI / MPC",
  "Risque Amiante",
  "Matériel",
  "Risque routier",
  "Travaux en hauteur",
  "Déchet",
  "Produit chimique",
  "Compétence / Formation",
  "Comportement",
  "Analyse",
  "Environnement",
  "Client",
  "Documentaire",
  "Fournisseur",
  "Organisation",
];

export const GRAVITE_FREQUENCE_OPTIONS = ["1", "2", "3", "4"];

export function calculerCriticite(gravite: string, frequence: string): string {
  const g = Number(gravite);
  const f = Number(frequence);
  if (!g || !f) return "";
  const produit = g * f;
  if (produit >= 9) return "Élevée";
  if (produit >= 4) return "Moyenne";
  return "Faible";
}

export const CRITICITE_COLORS: Record<string, string> = {
  Faible: "bg-green-100 text-green-800",
  Moyenne: "bg-amber-100 text-amber-800",
  Élevée: "bg-red-100 text-red-800",
};

export const STATUT_FICHE_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  EN_COURS: "En cours",
  FINALISEE: "Finalisée",
};

export const STATUT_FICHE_COLORS: Record<string, string> = {
  BROUILLON: "bg-slate-100 text-slate-700",
  EN_COURS: "bg-blue-100 text-blue-800",
  FINALISEE: "bg-green-100 text-green-800",
};

export const TYPE_ACTION_LABELS: Record<string, string> = {
  CURATIVE: "Action curative",
  CORRECTIVE: "Action corrective",
  PREVENTIVE: "Action préventive",
};

export const STATUT_ACTION_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  EN_RETARD: "En retard",
  REALISEE: "Réalisée",
  ANNULEE: "Annulée",
};

export const STATUT_ACTION_COLORS: Record<string, string> = {
  A_FAIRE: "bg-slate-100 text-slate-700",
  EN_COURS: "bg-blue-100 text-blue-800",
  EN_RETARD: "bg-red-100 text-red-800",
  REALISEE: "bg-green-100 text-green-800",
  ANNULEE: "bg-slate-200 text-slate-500",
};

export const TYPES_ECART_AMIANTE = ["Non COFRAC", "Résultat élevé", "Non exploitable"];

export const CAUSES_ECART_AMIANTE = [
  "Saturation en poussières des filtres",
  "Répartition de la poussière non homogène",
  "Filtre(s) cassé(s)",
  "Filtre(s) mouillé(s)",
  "Temps de pause non respecté",
  "Nettoyage de finition non ou mal réalisé",
  "Confinement déchiré",
  "Mauvaise décontamination des opérateurs",
  "Aspiration à la source qui n'a pas fonctionné",
  "Humidification non réalisée",
  "Non-respect des processus",
  "Propreté de la zone",
  "Baisse du flux d'air en zone",
  "Baisse de la dépression en zone",
  "MCA dégradé (non prévu)",
  "Mauvaise décontamination du matériel / déchets",
  "Autre",
];

export const ORIGINE_REMONTEE_LABELS: Record<string, string> = {
  CHANTIER: "Chantier",
  BUREAU: "Bureau",
};

export const STATUT_REMONTEE_LABELS: Record<string, string> = {
  A_TRAITER: "À traiter",
  EN_COURS: "En cours",
  TRAITEE: "Traitée",
  TRANSFORMEE_EN_ECART: "Transformée en écart",
};

export const STATUT_REMONTEE_COLORS: Record<string, string> = {
  A_TRAITER: "bg-amber-100 text-amber-800",
  EN_COURS: "bg-blue-100 text-blue-800",
  TRAITEE: "bg-green-100 text-green-800",
  TRANSFORMEE_EN_ECART: "bg-purple-100 text-purple-800",
};

export const CATEGORIES_REMONTEE = [
  "Organisation",
  "Personnel",
  "Matériel",
  "Sécurité",
  "Santé",
  "Environnement",
  "Documentaire",
  "Client",
  "Fournisseur",
  "Autre",
];

export const RESPONSABLES = [
  "Brahim", "Mohamed", "Said", "Amine", "Kasso", "Ayoub", "Ahmed", "Ilias",
  "Jallal", "Alexandre", "Khan", "Zakariae", "Camille", "Nassim", "Mamadou",
  "Ibrahim", "Halim", "Jalal", "Youssef", "Soufiane", "Direction",
];

// Ajoute à une liste d'options toute valeur déjà enregistrée qui n'y figure
// plus (anciennes valeurs reprises de l'Excel, par exemple) : sans ça, la case
// n'est pas affichée et la valeur disparaît au prochain enregistrement.
export function avecValeursExistantes(options: string[], valeurs: string[] | null | undefined) {
  const extra = (valeurs ?? []).filter((v) => !options.includes(v));
  return [...options, ...extra];
}

// Libellé d'une option de rattachement. La référence et le chantier ne
// suffisent pas à distinguer quinze écarts du même chantier : le début de la
// description est ce qui permet de reconnaître le bon.
export function libelleRattachement(reference: string, contexte: string | null, description: string | null) {
  const debut = description?.trim().replace(/\s+/g, " ");
  return [reference, contexte, debut && debut.length > 70 ? `${debut.slice(0, 70)}…` : debut]
    .filter(Boolean)
    .join(" — ");
}
