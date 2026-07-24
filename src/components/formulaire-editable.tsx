"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// Par défaut (hors FormulaireEditable, ex. pages de création), les champs
// restent éditables — seul un Provider explicite active le mode lecture seule.
const EditModeContext = createContext(true);

export function useEditMode() {
  return useContext(EditModeContext);
}

export function FormulaireEditable({
  action,
  hiddenFields,
  children,
  modifiePar,
  modifieLe,
  labelBouton = "Enregistrer",
}: {
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string>;
  children: ReactNode;
  modifiePar?: string | null;
  modifieLe?: Date | null;
  labelBouton?: string;
}) {
  const [editMode, setEditMode] = useState(false);

  return (
    <form action={action} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6">
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">
          {modifieLe
            ? `Modifié le ${modifieLe.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}${modifiePar ? ` par ${modifiePar}` : ""}`
            : "Aucune modification enregistrée."}
        </p>
        {!editMode && (
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Modifier
          </button>
        )}
      </div>

      <EditModeContext.Provider value={editMode}>{children}</EditModeContext.Provider>

      {editMode && (
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setEditMode(false)}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {labelBouton}
          </button>
        </div>
      )}
    </form>
  );
}
