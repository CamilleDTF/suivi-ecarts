export type Sens = "asc" | "desc";

export function lireSens(valeur?: string): Sens {
  return valeur === "asc" ? "asc" : "desc";
}

/**
 * Traduit les paramètres d'URL en tri Prisma.
 *
 * La colonne est validée contre une liste blanche plutôt que passée
 * directement : `tri` vient de l'URL, donc de l'utilisateur, et un nom de champ
 * arbitraire ferait échouer la requête. Une colonne inconnue retombe sur le tri
 * par défaut de l'écran.
 *
 * `colonnes` associe un nom d'URL au chemin Prisma correspondant, ce qui permet
 * de trier sur une relation ("dossier.reference") sans exposer le schéma dans
 * les liens.
 */
export function construireTri<T>(
  tri: string | undefined,
  sens: string | undefined,
  colonnes: Record<string, string>,
  parDefaut: T,
  /**
   * Colonnes pouvant être vides. Elles seules reçoivent `nulls: "last"` :
   * sans cela, trier par échéance décroissante remonterait d'abord toutes les
   * actions sans échéance. L'option est en revanche refusée par Prisma sur un
   * champ obligatoire — l'appliquer partout faisait échouer la requête, et la
   * liste s'affichait vide.
   */
  colonnesNullables: string[] = [],
): T {
  if (!tri || !(tri in colonnes)) return parDefaut;
  const chemin = colonnes[tri].split(".");
  const sensLu = lireSens(sens);
  const direction = colonnesNullables.includes(tri) ? { sort: sensLu, nulls: "last" as const } : sensLu;
  return chemin.reduceRight<unknown>((acc, cle) => ({ [cle]: acc }), direction) as T;
}
