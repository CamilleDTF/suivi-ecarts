"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export type Option = { id: string; libelle: string };

/** Un rattachement possible : le champ visé et les cibles proposées. */
export type TypeRattachement = {
  cle: string;
  libelle: string;
  /** Nom du champ envoyé au serveur (ecartId, ficheSSEId, ecartAmianteId). */
  champ: string;
  options: Option[];
  valeurActuelle: string | null;
};

function BoutonEnregistrer() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
    >
      {pending ? "Enregistrement..." : "Enregistrer le rattachement"}
    </button>
  );
}

// Corriger un rattachement erroné se faisait jusqu'ici en base. Un seul parent
// à la fois : deux rattachements simultanés rendraient le calcul des statuts et
// les suppressions en cascade ambigus.
export function ChangerRattachement({
  action,
  hiddenFields,
  types,
  autoriserAucun = true,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string>;
  types: TypeRattachement[];
  autoriserAucun?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [choisi, setChoisi] = useState(types.find((t) => t.valeurActuelle)?.cle ?? "aucun");

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="text-xs font-medium text-blue-700 hover:underline"
      >
        Changer le rattachement
      </button>
    );
  }

  const actif = types.find((t) => t.cle === choisi);

  return (
    <form action={action} className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

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
        {autoriserAucun && (
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="typeRattachement"
              value="aucun"
              checked={choisi === "aucun"}
              onChange={() => setChoisi("aucun")}
            />
            Aucun
          </label>
        )}
      </div>

      {actif && (
        <select
          name={actif.champ}
          defaultValue={actif.valeurActuelle ?? ""}
          className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">— Choisir —</option>
          {actif.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.libelle}
            </option>
          ))}
        </select>
      )}

      <div className="flex gap-2">
        <BoutonEnregistrer />
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
