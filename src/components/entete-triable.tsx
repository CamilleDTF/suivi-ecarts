import Link from "next/link";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { TableHead } from "@/components/ui/table";

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

  const Icone = !actif ? ChevronsUpDownIcon : sensActuel === "asc" ? ArrowUpIcon : ArrowDownIcon;

  return (
    <TableHead aria-sort={actif ? (sensActuel === "asc" ? "ascending" : "descending") : "none"}>
      <Link
        href={{ query }}
        className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground"
      >
        {libelle}
        <Icone className={actif ? "size-3.5 text-foreground" : "size-3.5 opacity-40"} aria-hidden />
      </Link>
    </TableHead>
  );
}
