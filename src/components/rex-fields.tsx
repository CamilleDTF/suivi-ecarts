"use client";

import { SOUS_TYPE_SSE_REX_OPTIONS } from "@/lib/labels";
import { useEditMode } from "@/components/formulaire-editable";

type RexValues = {
  titre?: string | null;
  sousTypeSSE?: string | null;
  causeRacine?: string | null;
  enseignementsTires?: string | null;
  canalDiffusion?: string | null;
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

// Reprend la liste des sous-types connus, en y ajoutant toute valeur déjà
// enregistrée qui n'y figure pas, pour ne pas la perdre à l'enregistrement.
function avecValeurExistante(options: string[], valeur?: string | null) {
  return valeur && !options.includes(valeur) ? [valeur, ...options] : options;
}

export function RexFields({ v = {} }: { v?: RexValues }) {
  const disabled = !useEditMode();
  const sousTypes = avecValeurExistante(SOUS_TYPE_SSE_REX_OPTIONS, v.sousTypeSSE);

  return (
    <fieldset disabled={disabled} className="space-y-4 disabled:opacity-60">
      <div>
        <label className={labelCls}>Titre</label>
        <input name="titre" defaultValue={v.titre ?? ""} required className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Sous-type évènement SSE</label>
        <select name="sousTypeSSE" defaultValue={v.sousTypeSSE ?? ""} className={inputCls}>
          <option value="">—</option>
          {sousTypes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">
          Renseigné seulement si ce REX vient d&apos;un évènement SSE.
        </p>
      </div>

      <div>
        <label className={labelCls}>Cause racine</label>
        <textarea name="causeRacine" defaultValue={v.causeRacine ?? ""} rows={2} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Enseignements tirés</label>
        <textarea
          name="enseignementsTires"
          defaultValue={v.enseignementsTires ?? ""}
          rows={4}
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Canal de diffusion</label>
        <input
          name="canalDiffusion"
          defaultValue={v.canalDiffusion ?? ""}
          placeholder="Ex. Réunion SSE + affichage"
          className={inputCls}
        />
      </div>
    </fieldset>
  );
}
