"use client";

import { useState } from "react";
import { TYPE_ACTION_LABELS, RESPONSABLES } from "@/lib/labels";
import { TypeAction } from "@/generated/prisma/enums";
import { useEditMode } from "@/components/formulaire-editable";

type ActionValues = {
  type: string;
  action: string;
  responsable: string;
  echeance?: Date | null;
  obligatoire: boolean;
  preuve?: string | null;
  verifiePar?: string | null;
  verifieLe?: Date | null;
};

function toDateInput(d?: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "";
}

async function fichierVersDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxDim = 1600;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

export function ActionFields({ v }: { v: ActionValues }) {
  const disabled = !useEditMode();
  const responsables = RESPONSABLES.includes(v.responsable) ? RESPONSABLES : [v.responsable, ...RESPONSABLES];
  // Conserve un vérificateur déjà enregistré qui ne figurerait plus dans la
  // liste, pour ne pas l'effacer au prochain enregistrement.
  const verificateurs =
    v.verifiePar && !RESPONSABLES.includes(v.verifiePar) ? [v.verifiePar, ...RESPONSABLES] : RESPONSABLES;
  const [preuve, setPreuve] = useState(v.preuve ?? "");

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreuve(await fichierVersDataUrl(file));
  }

  return (
    <fieldset disabled={disabled} className="space-y-4 disabled:opacity-60">
      <div>
        <label className={labelCls}>Type</label>
        <select name="type" defaultValue={v.type} required className={inputCls}>
          {Object.values(TypeAction).map((t) => (
            <option key={t} value={t}>
              {TYPE_ACTION_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Action</label>
        <textarea name="action" defaultValue={v.action} required rows={3} className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Responsable</label>
          <select name="responsable" defaultValue={v.responsable} required className={inputCls}>
            {responsables.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Échéance</label>
          <input
            type="date"
            name="echeance"
            defaultValue={v.echeance ? v.echeance.toISOString().slice(0, 10) : ""}
            className={inputCls}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="obligatoire" defaultChecked={v.obligatoire} />
        Action obligatoire
      </label>

      <div className="border-t border-slate-100 pt-4">
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Validation</h2>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Vérifié par</label>
            <select name="verifiePar" defaultValue={v.verifiePar ?? ""} className={inputCls}>
              <option value="">—</option>
              {verificateurs.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Le</label>
            <input type="date" name="verifieLe" defaultValue={toDateInput(v.verifieLe)} className={inputCls} />
          </div>
        </div>

        <label className={labelCls}>Preuve</label>
        {preuve && (
          <img
            src={preuve}
            alt="Preuve"
            className="mb-2 max-h-64 rounded-md border border-slate-200 object-contain"
          />
        )}
        {!preuve && disabled && <p className="text-sm text-slate-400">Aucune photo</p>}
        {!disabled && (
          <input type="file" accept="image/*" onChange={onFileChange} className="block text-sm text-slate-600" />
        )}
        <input type="hidden" name="preuve" value={preuve} />
      </div>
    </fieldset>
  );
}
