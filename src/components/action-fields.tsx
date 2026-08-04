"use client";

import { TYPE_ACTION_LABELS, RESPONSABLES } from "@/lib/labels";
import { TypeAction } from "@/generated/prisma/enums";
import { useEditMode } from "@/components/formulaire-editable";
import { ChampPhoto } from "@/components/champ-photo";

type ActionValues = {
  type: string;
  action: string;
  responsable: string;
  echeance?: Date | null;
  realiseeLe?: Date | null;
  preuve?: string | null;
  verifiePar?: string | null;
  verifieLe?: Date | null;
};

function toDateInput(d?: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "";
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

      <div className="grid grid-cols-3 gap-4">
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
          <input type="date" name="echeance" defaultValue={toDateInput(v.echeance)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Réalisé le</label>
          <input type="date" name="realiseeLe" defaultValue={toDateInput(v.realiseeLe)} className={inputCls} />
          <p className="mt-1 text-xs text-slate-400">Une date fait passer l&apos;action à « Réalisée ».</p>
        </div>
      </div>

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

        <ChampPhoto
          name="preuve"
          label="Preuve"
          valeurInitiale={v.preuve}
          disabled={disabled}
          libelleRetirer="Retirer la preuve"
          libelleVide="Aucune preuve"
          texteExistantNote="texte repris de l'Excel"
        />
      </div>
    </fieldset>
  );
}
