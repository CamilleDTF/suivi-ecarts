"use client";

import { useState } from "react";
import type { Option } from "@/components/changer-rattachement";

type TypeRattachement = { cle: string; libelle: string; champ: string; options: Option[] };

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

/**
 * Choix du rattachement d'une nouvelle action.
 *
 * Une action naît d'un écart, d'un évènement SSE, d'un écart amiante ou d'une
 * remontée d'information. Le formulaire n'offrait que les écarts : créer une
 * action pour une remontée traitée sans écart était impossible depuis le plan
 * d'action.
 *
 * Un seul rattachement à la fois : seul le champ du type retenu est présent
 * dans le formulaire, les autres ne sont pas rendus.
 */
export function ChoixRattachementAction({ types, defaut }: { types: TypeRattachement[]; defaut?: string }) {
  const [choisi, setChoisi] = useState(defaut ?? types[0].cle);
  const actif = types.find((t) => t.cle === choisi) ?? types[0];

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">Rattachée à</label>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-sm text-slate-700">
        {types.map((t) => (
          <label key={t.cle} className="flex items-center gap-1.5">
            <input
              type="radio"
              name="typeRattachement"
              value={t.cle}
              checked={choisi === t.cle}
              onChange={() => setChoisi(t.cle)}
            />
            {t.libelle}
          </label>
        ))}
      </div>

      <select key={actif.champ} name={actif.champ} required defaultValue="" className={inputCls}>
        <option value="" disabled>
          Sélectionner {actif.libelle.toLowerCase()}
        </option>
        {actif.options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.libelle}
          </option>
        ))}
      </select>
      {actif.options.length === 0 && (
        <p className="mt-1 text-xs text-slate-400">Aucun élément de ce type pour l&apos;instant.</p>
      )}
    </div>
  );
}
