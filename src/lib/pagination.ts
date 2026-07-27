export const TAILLES_PAGE = [25, 50, 100, 200];
export const TAILLE_PAGE_DEFAUT = 25;

/** Taille de page demandée dans l'URL, ramenée à une valeur autorisée. */
export function lireTaillePage(v: string | undefined): number {
  const n = Number(v);
  return TAILLES_PAGE.includes(n) ? n : TAILLE_PAGE_DEFAUT;
}
