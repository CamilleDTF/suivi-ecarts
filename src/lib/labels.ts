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
  "Opportunité d'amélioration",
  "Bonne pratique",
];

export const DOMAINES_OPTIONS = [
  "Qualité",
  "Santé",
  "Sécurité",
  "Environnement",
  "Amiante / technique",
  "Déchets",
  "Client",
  "Fournisseur",
  "Organisation",
  "Documentaire",
  "Matériel",
  "Formation / habilitation",
  "Réglementaire",
  "Comportement",
];

export const STATUT_FICHE_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  FINALISEE: "Finalisée",
};

export const STATUT_FICHE_COLORS: Record<string, string> = {
  BROUILLON: "bg-slate-100 text-slate-700",
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
  VERIFIEE_EFFICACE: "Vérifiée efficace",
  ANNULEE: "Annulée",
};

export const STATUT_ACTION_COLORS: Record<string, string> = {
  A_FAIRE: "bg-slate-100 text-slate-700",
  EN_COURS: "bg-blue-100 text-blue-800",
  EN_RETARD: "bg-red-100 text-red-800",
  REALISEE: "bg-green-100 text-green-800",
  VERIFIEE_EFFICACE: "bg-emerald-100 text-emerald-800",
  ANNULEE: "bg-slate-200 text-slate-500",
};

export const RESPONSABLES = [
  "Brahim", "Mohamed", "Said", "Amine", "Kasso", "Ayoub", "Ahmed", "Ilias",
  "Jallal", "Alexandre", "Khan", "Zakariae", "Camille", "Nassim", "Mamadou",
  "Ibrahim", "Halim", "Jalal", "Youssef", "Direction",
];
