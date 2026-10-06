"use client";

import { useState } from "react";
import type { Option } from "@/components/changer-rattachement";
import { ChoixEcarts } from "@/components/choix-ecarts";

type TypeRattachement = {
  cle: string;
  libelle: string;
  champ: string;
  options: Option[];
  /** Le type accepte plusieurs cibles (les écarts). */
  multiple?: boolean;
};

const inputCls =
  "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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
export function ChoixRattachementAction({
  types,
  defaut,
  preselection,
}: {
  types: TypeRattachement[];
  defaut?: string;
  /** Cibles déjà retenues, quand l'URL désigne un parent (« + Action » depuis un écart). */
  preselection?: string[];
}) {
  const [choisi, setChoisi] = useState(defaut ?? types[0].cle);
  const actif = types.find((t) => t.cle === choisi) ?? types[0];

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">Rattachée à</label>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {types.map((t) => (
          <label key={t.cle} className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name="typeRattachement"
              className="accent-primary"
              value={t.cle}
              checked={choisi === t.cle}
              onChange={() => setChoisi(t.cle)}
            />
            {t.libelle}
          </label>
        ))}
      </div>

      {actif.multiple ? (
        <ChoixEcarts
          key={actif.champ}
          name={actif.champ}
          options={actif.options}
          valeurInitiale={defaut === actif.cle ? preselection : undefined}
        />
      ) : (
        <>
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
            <p className="mt-1 text-xs text-muted-foreground">Aucun élément de ce type pour l&apos;instant.</p>
          )}
        </>
      )}
    </div>
  );
}
