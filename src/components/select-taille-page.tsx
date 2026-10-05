"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TAILLES_PAGE } from "@/lib/pagination";

export function SelectTaillePage({ taille }: { taille: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function changer(valeur: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("taille", valeur);
    // Le nombre de pages change : on revient au début pour ne pas atterrir sur
    // une page qui n'existe plus.
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2">
      Lignes par page
      <select
        value={String(taille)}
        onChange={(e) => changer(e.target.value)}
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {TAILLES_PAGE.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}
