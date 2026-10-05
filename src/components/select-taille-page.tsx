"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TAILLES_PAGE } from "@/lib/pagination";

export function SelectTaillePage({ taille, basePath }: { taille: number; basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function changer(valeur: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("taille", valeur);
    // Le nombre de pages change : on revient au début pour ne pas atterrir sur
    // une page qui n'existe plus.
    params.delete("page");
    // Depuis un panneau liste+détail, l'URL courante peut être celle d'un
    // détail (/ecarts/xyz) : sans basePath, le changement s'appliquerait à
    // cette page-là plutôt qu'à la liste.
    router.push(`${basePath ?? ""}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-slate-500">
      Afficher
      <select
        value={String(taille)}
        onChange={(e) => changer(e.target.value)}
        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
      >
        {TAILLES_PAGE.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      par page
    </label>
  );
}
