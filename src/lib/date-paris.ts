// Le serveur (Vercel) tourne en UTC : sans fuseau explicite, une heure enregistrée
// à 10:53 à Paris s'afficherait 08:53. Tout instant réel (création, modification)
// s'affiche donc en heure de Paris, côté serveur comme côté navigateur.
const FUSEAU = "Europe/Paris";

export function dateParis(date: Date) {
  return date.toLocaleDateString("fr-FR", { timeZone: FUSEAU });
}

export function heureParis(date: Date) {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: FUSEAU });
}

export function dateHeureParis(date: Date) {
  return date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: FUSEAU });
}

/** Vrai si les deux instants tombent le même jour à Paris. */
export function memeJourParis(a: Date, b: Date) {
  return dateParis(a) === dateParis(b);
}
