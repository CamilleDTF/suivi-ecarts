"use client";

import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

// Par défaut (hors FormulaireEditable, ex. pages de création), les champs
// restent éditables — seul un Provider explicite active le mode lecture seule.
const EditModeContext = createContext(true);

export function useEditMode() {
  return useContext(EditModeContext);
}

// Doit être un enfant du <form> pour lire useFormStatus. Détecte la fin de
// soumission (pending: true -> false) de façon asynchrone, après le commit,
// pour ne pas interférer avec la soumission native du formulaire.
function BoutonEnregistrer({ label, onDone }: { label: string; onDone: () => void }) {
  const { pending } = useFormStatus();
  const etaitEnCours = useRef(false);

  useEffect(() => {
    if (etaitEnCours.current && !pending) onDone();
    etaitEnCours.current = pending;
  }, [pending, onDone]);

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
    >
      {pending ? "Enregistrement..." : label}
    </button>
  );
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
  const [version, setVersion] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (!toastVisible) return;
    const timer = setTimeout(() => setToastVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [toastVisible]);

  function onSaved() {
    setEditMode(false);
    // Force le remontage des champs pour qu'ils reprennent les valeurs
    // fraîchement enregistrées (defaultValue ne se met pas à jour seul).
    setVersion((v) => v + 1);
    setToastVisible(true);
  }

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

      <EditModeContext.Provider value={editMode}>
        <div key={version}>{children}</div>
      </EditModeContext.Provider>

      {editMode && (
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setEditMode(false)}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Annuler
          </button>
          <BoutonEnregistrer label={labelBouton} onDone={onSaved} />
        </div>
      )}

      {toastVisible && (
        <div className="fixed bottom-6 right-6 z-50 rounded-md bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">
          Modifications enregistrées
        </div>
      )}
    </form>
  );
}
