import Link from "next/link";

/**
 * Entête de colonne cliquable. Un clic trie sur la colonne, un second inverse
 * le sens.
 *
 * Les paramètres courants sont réinjectés dans le lien pour que le tri ne
 * remette pas à zéro la recherche et les filtres en cours. La page repart à 1 :
 * rester page 3 après un changement de tri afficherait des lignes sans rapport
 * avec ce qu'on regardait.
 */
export function EnteteTriable({
  colonne,
  libelle,
  triActuel,
  sensActuel,
  params,
}: {
  colonne: string;
  libelle: string;
  triActuel?: string;
  sensActuel?: string;
  params: Record<string, string | undefined>;
}) {
  const actif = triActuel === colonne;
  const sens = actif && sensActuel === "asc" ? "desc" : "asc";

  const query: Record<string, string> = { tri: colonne, sens };
  for (const [cle, valeur] of Object.entries(params)) {
    if (valeur && cle !== "tri" && cle !== "sens" && cle !== "page") query[cle] = valeur;
  }

  return (
    <th className="px-4 py-3 font-medium">
      <Link
        href={{ query }}
        className="inline-flex items-center gap-1 hover:text-slate-900"
        aria-sort={actif ? (sensActuel === "asc" ? "ascending" : "descending") : "none"}
      >
        {libelle}
        <span className={actif ? "text-slate-900" : "text-slate-300"} aria-hidden>
          {actif && sensActuel === "asc" ? "▲" : "▼"}
        </span>
      </Link>
    </th>
  );
}
