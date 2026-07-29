"use client";

import { useState } from "react";

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

/**
 * Rattachement d'un nouvel écart.
 *
 * Trois cas plutôt qu'une liste seule : quand aucun dossier ne convient — le
 * cas courant en transformant une remontée — il fallait quitter l'écran, créer
 * le dossier, puis tout reprendre. Le dossier se crée donc ici, et l'écart peut
 * aussi n'être rattaché à rien pour être classé plus tard.
 */
export function ChoixDossier({
  dossiers,
  dossierId,
  chantierPropose,
}: {
  dossiers: { id: string; reference: string; chantier: string }[];
  dossierId?: string;
  chantierPropose?: string;
}) {
  const [mode, setMode] = useState<"existant" | "nouveau" | "aucun">("existant");

  return (
    <div>
      <label className={labelCls}>Dossier de rattachement</label>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-sm text-slate-700">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="modeDossier"
            value="existant"
            checked={mode === "existant"}
            onChange={() => setMode("existant")}
          />
          Un dossier existant
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="modeDossier"
            value="nouveau"
            checked={mode === "nouveau"}
            onChange={() => setMode("nouveau")}
          />
          Un nouveau dossier
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="modeDossier"
            value="aucun"
            checked={mode === "aucun"}
            onChange={() => setMode("aucun")}
          />
          Aucun pour l&apos;instant
        </label>
      </div>

      {mode === "existant" && (
        <select name="dossierId" required defaultValue={dossierId ?? ""} className={inputCls}>
          <option value="" disabled>
            Sélectionner un dossier
          </option>
          {dossiers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.reference} — {d.chantier}
            </option>
          ))}
        </select>
      )}

      {mode === "nouveau" && (
        <div>
          <label className={labelCls}>Chantier du nouveau dossier</label>
          <input
            name="nouveauDossierChantier"
            required
            defaultValue={chantierPropose ?? ""}
            placeholder="Ex. 25-102-A Lycée Joliot Curie"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-slate-400">
            Le dossier reprendra la date de détection, le déclarant et l&apos;origine saisis ci-dessous.
          </p>
        </div>
      )}

      {mode === "aucun" && (
        <p className="text-sm text-slate-500">
          L&apos;écart sera créé sans dossier. Tu pourras le rattacher depuis sa fiche.
        </p>
      )}
    </div>
  );
}
