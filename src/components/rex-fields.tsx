"use client";

import {
  SOUS_TYPE_SSE_REX_OPTIONS,
  NATURE_REX_LABELS,
  THEMES_REX_OPTIONS,
  DESTINATAIRES_ROLES_REX_OPTIONS,
  CANAUX_DIFFUSION_REX_OPTIONS,
  POINTS_COMMUNS_REX_OPTIONS,
  avecValeursExistantes,
} from "@/lib/labels";
import { useEditMode } from "@/components/formulaire-editable";

type RexValues = {
  titre?: string | null;
  sousTypeSSE?: string | null;
  nature?: string | null;
  pratiqueDescription?: string | null;
  causeRacine?: string | null;
  pointsCommuns?: string[] | null;
  enseignementsTires?: string | null;
  raisonDiffusion?: string | null;
  themes?: string[] | null;
  destinatairesRoles?: string[] | null;
  canaux?: string[] | null;
  noteInterne?: string | null;
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
  const themes = avecValeursExistantes(THEMES_REX_OPTIONS, v.themes);
  const destinataires = avecValeursExistantes(DESTINATAIRES_ROLES_REX_OPTIONS, v.destinatairesRoles);
  const canaux = avecValeursExistantes(CANAUX_DIFFUSION_REX_OPTIONS, v.canaux);
  const pointsCommuns = avecValeursExistantes(POINTS_COMMUNS_REX_OPTIONS, v.pointsCommuns);

  return (
    <fieldset disabled={disabled} className="space-y-4 disabled:opacity-60">
      <div>
        <label className={labelCls}>Titre</label>
        <input name="titre" defaultValue={v.titre ?? ""} required className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Nature du REX</label>
        <select name="nature" defaultValue={v.nature ?? ""} required className={inputCls}>
          {Object.entries(NATURE_REX_LABELS).map(([valeur, libelle]) => (
            <option key={valeur} value={valeur}>{libelle}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Bonne pratique / pratique observée</label>
        <textarea name="pratiqueDescription" defaultValue={v.pratiqueDescription ?? ""} rows={2} className={inputCls} />
        <p className="mt-1 text-xs text-slate-400">
          La bonne pratique à généraliser, ou la pratique observée à ne pas reproduire selon la nature choisie.
        </p>
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
        <label className={labelCls}>Cause racine / facteurs communs</label>
        <textarea name="causeRacine" defaultValue={v.causeRacine ?? ""} rows={2} className={inputCls} />
      </div>

      <fieldset>
        <legend className={labelCls}>Points communs observés</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {pointsCommuns.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="pointsCommuns" value={p} defaultChecked={(v.pointsCommuns ?? []).includes(p)} />
              {p}
            </label>
          ))}
        </div>
      </fieldset>

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
        <label className={labelCls}>Pourquoi ce REX mérite diffusion</label>
        <textarea name="raisonDiffusion" defaultValue={v.raisonDiffusion ?? ""} rows={2} className={inputCls} />
      </div>

      <fieldset>
        <legend className={labelCls}>Thèmes concernés</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {themes.map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="themes" value={t} defaultChecked={(v.themes ?? []).includes(t)} />
              {t}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={labelCls}>Qui doit recevoir ce REX</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {destinataires.map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="destinatairesRoles"
                value={d}
                defaultChecked={(v.destinatairesRoles ?? []).includes(d)}
              />
              {d}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={labelCls}>Canaux de diffusion</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {canaux.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="canaux" value={c} defaultChecked={(v.canaux ?? []).includes(c)} />
              {c}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className={labelCls}>Note interne / QHSE</label>
        <textarea name="noteInterne" defaultValue={v.noteInterne ?? ""} rows={2} className={inputCls} />
      </div>
    </fieldset>
  );
}
