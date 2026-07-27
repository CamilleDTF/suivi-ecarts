"use client";

import { useState, type ChangeEvent } from "react";
import { Badge } from "@/components/badge";
import {
  ORIGINE_LABELS,
  TYPE_ACTIVITE_LABELS,
  NATURES_OPTIONS,
  DOMAINES_OPTIONS,
  THEME_OPTIONS,
  GRAVITE_FREQUENCE_OPTIONS,
  CRITICITE_COLORS,
  calculerCriticite,
  avecValeursExistantes,
} from "@/lib/labels";
import { Origine, TypeActivite } from "@/generated/prisma/enums";
import { useEditMode } from "@/components/formulaire-editable";

type EcartValues = {
  dateDetection?: Date | null;
  origine?: string | null;
  declarant?: string | null;
  typeActivite?: string | null;
  natures?: string[] | null;
  domaines?: string[] | null;
  theme?: string[] | null;
  gravite?: string | null;
  frequence?: string | null;
  criticite?: string | null;
  description?: string | null;
  mesureImmediate?: string | null;
  cause?: string | null;
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

function toDateInput(d?: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function EcartFields({ v = {} }: { v?: EcartValues }) {
  const disabled = !useEditMode();
  const [criticite, setCriticite] = useState(v.criticite ?? "");

  function handleGraviteOuFrequenceChange(form: HTMLFormElement | null) {
    if (!form) return;
    const gravite = (form.elements.namedItem("gravite") as HTMLSelectElement | null)?.value ?? "";
    const frequence = (form.elements.namedItem("frequence") as HTMLSelectElement | null)?.value ?? "";
    setCriticite(calculerCriticite(gravite, frequence));
  }

  const natures = avecValeursExistantes(NATURES_OPTIONS, v.natures);
  const domaines = avecValeursExistantes(DOMAINES_OPTIONS, v.domaines);

  return (
    <fieldset disabled={disabled} className="space-y-6 disabled:opacity-60">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Date de détection</label>
          <input
            type="date"
            name="dateDetection"
            defaultValue={toDateInput(v.dateDetection)}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Origine</label>
          <select name="origine" defaultValue={v.origine ?? ""} required className={inputCls}>
            {Object.values(Origine).map((o) => (
              <option key={o} value={o}>
                {ORIGINE_LABELS[o]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Déclarant</label>
          <input name="declarant" defaultValue={v.declarant ?? ""} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Type d&apos;activité</label>
          <select name="typeActivite" defaultValue={v.typeActivite ?? ""} className={inputCls}>
            <option value="">—</option>
            {Object.values(TypeActivite).map((t) => (
              <option key={t} value={t}>
                {TYPE_ACTIVITE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className={labelCls}>Nature(s)</legend>
        <div className="grid grid-cols-2 gap-1">
          {natures.map((n) => (
            <label key={n} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="natures" value={n} defaultChecked={(v.natures ?? []).includes(n)} />
              {n}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={labelCls}>Domaine(s)</legend>
        <div className="grid grid-cols-2 gap-1">
          {domaines.map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="domaines" value={d} defaultChecked={(v.domaines ?? []).includes(d)} />
              {d}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={labelCls}>Thème(s)</legend>
        <div className="grid grid-cols-2 gap-1">
          {THEME_OPTIONS.map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="theme" value={t} defaultChecked={(v.theme ?? []).includes(t)} />
              {t}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Gravité</label>
          <select
            name="gravite"
            defaultValue={v.gravite ?? ""}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleGraviteOuFrequenceChange(e.target.form)}
            className={inputCls}
          >
            <option value="">—</option>
            {GRAVITE_FREQUENCE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Fréquence</label>
          <select
            name="frequence"
            defaultValue={v.frequence ?? ""}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleGraviteOuFrequenceChange(e.target.form)}
            className={inputCls}
          >
            <option value="">—</option>
            {GRAVITE_FREQUENCE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Criticité</label>
          <input type="hidden" name="criticite" value={criticite} />
          <div className={inputCls}>
            {criticite ? <Badge label={criticite} colorClass={CRITICITE_COLORS[criticite]} /> : "—"}
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea name="description" defaultValue={v.description ?? ""} rows={3} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Mesure immédiate</label>
        <textarea name="mesureImmediate" defaultValue={v.mesureImmediate ?? ""} rows={2} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Cause</label>
        <textarea name="cause" defaultValue={v.cause ?? ""} rows={2} className={inputCls} />
      </div>
    </fieldset>
  );
}
