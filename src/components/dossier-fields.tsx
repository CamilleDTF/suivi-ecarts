"use client";

import { ORIGINE_LABELS } from "@/lib/labels";
import { Origine } from "@/generated/prisma/enums";
import { useEditMode } from "@/components/formulaire-editable";

type DossierValues = {
  dateDetection: Date;
  origine: string;
  declarant: string;
  chantier: string;
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function DossierFields({ v }: { v: DossierValues }) {
  const disabled = !useEditMode();
  return (
    <fieldset disabled={disabled} className="grid grid-cols-2 gap-4 disabled:opacity-60">
      <div>
        <label className={labelCls}>Chantier</label>
        <input name="chantier" defaultValue={v.chantier} required className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Déclarant</label>
        <input name="declarant" defaultValue={v.declarant} required className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Date de détection</label>
        <input type="date" name="dateDetection" defaultValue={toDateInput(v.dateDetection)} required className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Origine</label>
        <select name="origine" defaultValue={v.origine} required className={inputCls}>
          {Object.values(Origine).map((o) => (
            <option key={o} value={o}>
              {ORIGINE_LABELS[o]}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
