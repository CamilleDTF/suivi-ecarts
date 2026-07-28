"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type Option = { id: string; libelle: string };

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

// Corriger un rattachement erroné se faisait jusqu'ici en base : ce panneau
// permet de le faire depuis la fiche. Un évènement est rattaché à un écart, à
// un écart amiante, ou à rien — jamais aux deux, sinon le calcul des statuts et
// les suppressions en cascade deviennent ambigus.
export function ChangerRattachement({
  action,
  ficheSSEId,
  ecartIdActuel,
  ecartAmianteIdActuel,
  ecarts,
  ecartsAmiante,
}: {
  action: (formData: FormData) => void | Promise<void>;
  ficheSSEId: string;
  ecartIdActuel: string | null;
  ecartAmianteIdActuel: string | null;
  ecarts: Option[];
  ecartsAmiante: Option[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const [type, setType] = useState<"aucun" | "ecart" | "amiante">(
    ecartAmianteIdActuel ? "amiante" : ecartIdActuel ? "ecart" : "aucun",
  );

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

  return (
    <form action={action} className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      <input type="hidden" name="id" value={ficheSSEId} />
      <div className="mb-2 flex flex-wrap items-center gap-4 text-sm text-slate-700">
        <label className="flex items-center gap-1.5">
          <input type="radio" name="typeRattachement" value="ecart" checked={type === "ecart"} onChange={() => setType("ecart")} />
          Écart
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" name="typeRattachement" value="amiante" checked={type === "amiante"} onChange={() => setType("amiante")} />
          Écart amiante
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" name="typeRattachement" value="aucun" checked={type === "aucun"} onChange={() => setType("aucun")} />
          Aucun
        </label>
      </div>

      {type === "ecart" && (
        <select
          name="ecartId"
          defaultValue={ecartIdActuel ?? ""}
          className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">— Choisir un écart —</option>
          {ecarts.map((o) => (
            <option key={o.id} value={o.id}>
              {o.libelle}
            </option>
          ))}
        </select>
      )}

      {type === "amiante" && (
        <select
          name="ecartAmianteId"
          defaultValue={ecartAmianteIdActuel ?? ""}
          className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">— Choisir un écart amiante —</option>
          {ecartsAmiante.map((o) => (
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
