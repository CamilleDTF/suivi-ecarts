"use client";

import { useState } from "react";

// Type défini ici plutôt qu'importé de changer-rattachement : celui-ci importe
// désormais ce composant, et un import de valeur croisé créerait un cycle.
type Option = { id: string; libelle: string };

/**
 * Choix d'un ou plusieurs écarts.
 *
 * Une liste déroulante à sélection multiple native est pénible à l'usage —
 * il faut maintenir Ctrl, et un clic maladroit efface tout le choix. Ici on
 * ajoute les écarts un par un, et les écarts retenus restent affichés en
 * entier : avec une soixantaine d'écarts se ressemblant par leur référence,
 * pouvoir relire ce qu'on a coché est ce qui évite l'erreur.
 */
export function ChoixEcarts({
  options,
  valeurInitiale = [],
  name = "ecartIds",
}: {
  options: Option[];
  valeurInitiale?: string[];
  name?: string;
}) {
  const [choisis, setChoisis] = useState<string[]>(valeurInitiale);
  const restants = options.filter((o) => !choisis.includes(o.id));
  const libelle = (id: string) => options.find((o) => o.id === id)?.libelle ?? id;

  return (
    <div>
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) setChoisis([...choisis, e.target.value]);
        }}
        disabled={restants.length === 0}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
      >
        <option value="">
          {restants.length === 0
            ? "Tous les écarts sont déjà sélectionnés"
            : choisis.length === 0
              ? "Sélectionner un écart"
              : "Ajouter un autre écart"}
        </option>
        {restants.map((o) => (
          <option key={o.id} value={o.id}>
            {o.libelle}
          </option>
        ))}
      </select>

      {choisis.length > 0 && (
        <ul className="mt-2 space-y-1">
          {choisis.map((id) => (
            <li
              key={id}
              className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm"
            >
              <span className="min-w-0 flex-1 text-slate-700">{libelle(id)}</span>
              <button
                type="button"
                onClick={() => setChoisis(choisis.filter((c) => c !== id))}
                aria-label={`Retirer ${libelle(id)}`}
                className="shrink-0 text-sm font-medium text-red-600 hover:underline"
              >
                Retirer
              </button>
              <input type="hidden" name={name} value={id} />
            </li>
          ))}
        </ul>
      )}

      {choisis.length === 0 && (
        <p className="mt-1 text-xs text-slate-400">
          {options.length === 0 ? "Aucun écart pour l'instant." : "Au moins un écart est requis."}
        </p>
      )}
    </div>
  );
}
