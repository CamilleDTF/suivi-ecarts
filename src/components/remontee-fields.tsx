"use client";

import {
  ORIGINE_REMONTEE_LABELS,
  CATEGORIES_REMONTEE,
  RESPONSABLES,
  NATURES_REMONTEE,
  avecValeursExistantes,
} from "@/lib/labels";
import { OrigineRemontee } from "@/generated/prisma/enums";
import { useEditMode } from "@/components/formulaire-editable";

type RemonteeValues = {
  dateRemontee?: Date | null;
  origine?: string | null;
  chantierService?: string | null;
  personneRemontant?: string | null;
  personneSaisie?: string | null;
  objet?: string | null;
  natures?: string[] | null;
  categorie?: string | null;
  description?: string | null;
  suiteDonnee?: string | null;
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

function toDateInput(d?: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "";
}

// Reprend la liste des responsables connus, en y ajoutant toute valeur déjà
// enregistrée qui n'y figure pas, pour ne pas la perdre à l'enregistrement.
function avecValeurExistante(options: string[], valeur?: string | null) {
  return valeur && !options.includes(valeur) ? [valeur, ...options] : options;
}

export function RemonteeFields({
  v = {},
  chantiersConnus = [],
}: {
  v?: RemonteeValues;
  /** Chantiers déjà utilisés dans l'application, proposés en suggestion. */
  chantiersConnus?: string[];
}) {
  const disabled = !useEditMode();
  const personnes = avecValeurExistante(RESPONSABLES, v.personneRemontant);
  const categories = avecValeurExistante(CATEGORIES_REMONTEE, v.categorie);
  const natures = avecValeursExistantes(NATURES_REMONTEE, v.natures);

  return (
    <fieldset disabled={disabled} className="space-y-4 disabled:opacity-60">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Date de remontée</label>
          <input
            type="date"
            name="dateRemontee"
            defaultValue={toDateInput(v.dateRemontee) || new Date().toISOString().slice(0, 10)}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Origine</label>
          <select name="origine" defaultValue={v.origine ?? "CHANTIER"} required className={inputCls}>
            {Object.values(OrigineRemontee).map((o) => (
              <option key={o} value={o}>
                {ORIGINE_REMONTEE_LABELS[o]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Chantier / Service</label>
        <input
          name="chantierService"
          defaultValue={v.chantierService ?? ""}
          required
          list="chantiers-connus"
          placeholder="Nom du chantier, ou service (QHSE, Achats…)"
          className={inputCls}
        />
        <datalist id="chantiers-connus">
          {chantiersConnus.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Personne ayant remonté l&apos;information</label>
          <input
            name="personneRemontant"
            defaultValue={v.personneRemontant ?? ""}
            list="personnes-connues"
            className={inputCls}
          />
          <datalist id="personnes-connues">
            {personnes.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={labelCls}>Enregistrée par</label>
          {/* Donnée d'audit : renseignée depuis la session, jamais saisie —
              sinon n'importe qui peut attribuer sa saisie à un collègue. */}
          <p className="px-3 py-2 text-sm text-slate-500">{v.personneSaisie ?? "—"}</p>
        </div>
      </div>

      <div>
        <label className={labelCls}>Objet</label>
        <input name="objet" defaultValue={v.objet ?? ""} required className={inputCls} />
      </div>

      <fieldset>
        <legend className={labelCls}>Nature</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {natures.map((n) => (
            <label key={n} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="natures" value={n} defaultChecked={(v.natures ?? []).includes(n)} />
              {n}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className={labelCls}>Catégorie</label>
        <select name="categorie" defaultValue={v.categorie ?? ""} className={inputCls}>
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea name="description" rows={3} defaultValue={v.description ?? ""} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Suite donnée</label>
        <textarea name="suiteDonnee" rows={2} defaultValue={v.suiteDonnee ?? ""} className={inputCls} />
      </div>
    </fieldset>
  );
}
