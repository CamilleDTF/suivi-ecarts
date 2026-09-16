"use client";

import { useState } from "react";

/**
 * Les lignes d'une section en mode bilan, avec de quoi les récupérer d'un
 * bloc.
 *
 * Le bouton copie les lignes en texte brut, séparées par des retours à la
 * ligne : c'est ce que colle une diapositive ou un mail. Les lignes restent
 * sélectionnables à la main, car l'accès au presse-papier peut être refusé par
 * le navigateur — dans ce cas le bouton le dit au lieu de faire semblant.
 */
export function BlocBilan({ lignes, vide }: { lignes: string[]; vide: string }) {
  const [etat, setEtat] = useState<"repos" | "copie" | "echec">("repos");

  async function copier() {
    try {
      await navigator.clipboard.writeText(lignes.join("\n"));
      setEtat("copie");
    } catch {
      setEtat("echec");
    }
    setTimeout(() => setEtat("repos"), 2500);
  }

  if (lignes.length === 0) {
    return <p className="px-4 py-6 text-center text-slate-400">{vide}</p>;
  }

  return (
    <div>
      <div data-no-print className="flex justify-end border-b border-slate-100 px-3 py-2">
        <button
          type="button"
          onClick={copier}
          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {etat === "copie"
            ? `${lignes.length} ligne${lignes.length > 1 ? "s" : ""} copiée${lignes.length > 1 ? "s" : ""}`
            : etat === "echec"
              ? "Copie refusée — sélectionne les lignes"
              : "Copier les lignes"}
        </button>
      </div>
      {/* Une ligne par point, sans puce ni retrait : ce qui est à l'écran est
          exactement ce qui se colle ailleurs. */}
      <ul className="divide-y divide-slate-100">
        {lignes.map((l, i) => (
          <li key={i} className="px-4 py-2 text-sm text-slate-800">
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}
