import Link from "next/link";

/**
 * Bascule entre la liste de travail et les enregistrements archivés. Les
 * filtres en cours sont conservés : on cherche souvent l'archive d'un chantier
 * précis, pas toutes les archives.
 */
export function LienArchives({
  archives,
  params,
}: {
  archives?: string;
  params: Record<string, string | undefined>;
}) {
  const query: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(params)) {
    if (valeur && cle !== "page" && cle !== "archives") query[cle] = valeur;
  }
  if (archives !== "1") query.archives = "1";

  return (
    <Link href={{ query }} className="text-sm text-slate-500 hover:underline">
      {archives === "1" ? "← Revenir à la liste" : "Voir les archives"}
    </Link>
  );
}
