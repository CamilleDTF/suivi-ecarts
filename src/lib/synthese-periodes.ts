// Dans un module à part : exportée depuis un composant client, la liste ne serait
// pas utilisable par la page serveur (elle n'y arriverait que comme référence).
export const PERIODES = [
  { cle: "3m", label: "3 mois" },
  { cle: "6m", label: "6 mois" },
  { cle: "12m", label: "12 mois" },
  { cle: "annee", label: "Année en cours" },
  { cle: "tout", label: "Tout" },
] as const;
