"use client";

import { useState } from "react";
import { TYPE_ACTION_LABELS, RESPONSABLES } from "@/lib/labels";
import { TypeAction } from "@/generated/prisma/enums";
import { useEditMode, useTraitementEnCours } from "@/components/formulaire-editable";

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
  const signalerTraitement = useTraitementEnCours();
  const responsables = RESPONSABLES.includes(v.responsable) ? RESPONSABLES : [v.responsable, ...RESPONSABLES];
  // Conserve un vérificateur déjà enregistré qui ne figurerait plus dans la
  // liste, pour ne pas l'effacer au prochain enregistrement.
  const verificateurs =
    v.verifiePar && !RESPONSABLES.includes(v.verifiePar) ? [v.verifiePar, ...RESPONSABLES] : RESPONSABLES;
  const [preuve, setPreuve] = useState(v.preuve ?? "");
  const [conversion, setConversion] = useState(false);
  const [erreurPhoto, setErreurPhoto] = useState("");

  // Les preuves reprises de l'Excel d'origine sont du texte ("Feuille
  // d'émargement"), pas des images : les passer à <img> n'afficherait qu'une
  // vignette cassée.
  const estPhoto = preuve.startsWith("data:image/");

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErreurPhoto("");
    // La conversion est asynchrone : sans ce verrou, enregistrer juste après
    // avoir choisi la photo soumet le formulaire avant qu'elle soit prête —
    // rien n'est enregistré, alors que l'émetteur voit son aperçu apparaître
    // et croit que c'est fait.
    setConversion(true);
    signalerTraitement(true);
    try {
      setPreuve(await fichierVersDataUrl(file));
    } catch {
      setErreurPhoto("Photo illisible par le navigateur. Réessaie avec un JPEG ou un PNG.");
    } finally {
      setConversion(false);
      signalerTraitement(false);
    }
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

        <label className={labelCls}>Preuve</label>
        {estPhoto && (
          <img
            src={preuve}
            alt="Preuve"
            className="mb-2 max-h-64 rounded-md border border-slate-200 object-contain"
          />
        )}
        {preuve && !estPhoto && (
          <p className="mb-2 text-sm text-slate-700">
            {preuve}
            <span className="ml-2 text-xs text-slate-400">(texte repris de l&apos;Excel)</span>
          </p>
        )}
        {!preuve && disabled && <p className="text-sm text-slate-400">Aucune preuve</p>}
        {!disabled && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {estPhoto ? "Remplacer la photo" : "Ajouter une photo"}
              <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
            </label>
            {preuve && (
              <button
                type="button"
                onClick={() => {
                  setPreuve("");
                  setErreurPhoto("");
                }}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Retirer la preuve
              </button>
            )}
          </div>
        )}
        {conversion && <p className="mt-1 text-sm text-slate-500">Préparation de la photo…</p>}
        {erreurPhoto && <p className="mt-1 text-sm text-red-600">{erreurPhoto}</p>}
        <input type="hidden" name="preuve" value={preuve} />
      </div>
    </fieldset>
  );
}
