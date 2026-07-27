"use client";

import { useState, useTransition } from "react";
import { ajouterCause, supprimerCause } from "@/app/fiches-sse/actions";
import { useEditMode } from "@/components/formulaire-editable";

type Cause = {
  id: string;
  libelle: string;
  parentId: string | null;
  estCauseRacine: boolean;
};

type CauseAvecEnfants = Cause & { enfants: CauseAvecEnfants[] };

function buildTree(causes: Cause[], parentId: string | null = null): CauseAvecEnfants[] {
  return causes
    .filter((c) => c.parentId === parentId)
    .map((c) => ({ ...c, enfants: buildTree(causes, c.id) }));
}

function CauseNode({
  cause,
  ficheSSEId,
  disabled,
  depth,
  onSupprimer,
}: {
  cause: CauseAvecEnfants;
  ficheSSEId: string;
  disabled: boolean;
  depth: number;
  onSupprimer: (causeId: string) => void;
}) {
  return (
    <li style={{ marginLeft: depth * 20 }} className="mt-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-800">{cause.libelle}</span>
        {cause.estCauseRacine && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            Cause racine
          </span>
        )}
        {!disabled && (
          <button
            type="button"
            onClick={() => onSupprimer(cause.id)}
            className="text-xs text-slate-400 hover:text-red-600"
          >
            supprimer
          </button>
        )}
      </div>
      {cause.enfants.length > 0 && (
        <ul>
          {cause.enfants.map((enfant) => (
            <CauseNode
              key={enfant.id}
              cause={enfant}
              ficheSSEId={ficheSSEId}
              disabled={disabled}
              depth={depth + 1}
              onSupprimer={onSupprimer}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ArbreCauses({
  ficheSSEId,
  causes,
}: {
  ficheSSEId: string;
  causes: Cause[];
}) {
  const disabled = !useEditMode();
  const arbre = buildTree(causes);

  const [libelle, setLibelle] = useState("");
  const [parentId, setParentId] = useState("");
  const [estCauseRacine, setEstCauseRacine] = useState(false);
  const [enCours, startTransition] = useTransition();

  // Ce bloc est rendu à l'intérieur du formulaire d'édition de la fiche, et un
  // formulaire HTML ne peut pas en contenir un autre. Les Server Actions sont
  // donc appelées directement dans une transition, sans soumettre le formulaire
  // parent : ajouter ou supprimer une cause ne fait plus perdre les
  // modifications non enregistrées du reste de la fiche. Les champs ci-dessous
  // n'ont volontairement pas d'attribut "name", pour ne pas partir avec elle.
  function handleAjouter() {
    if (!libelle.trim()) return;
    const formData = new FormData();
    formData.set("libelle", libelle);
    if (parentId) formData.set("parentId", parentId);
    if (estCauseRacine) formData.set("estCauseRacine", "on");

    startTransition(async () => {
      await ajouterCause(ficheSSEId, formData);
      setLibelle("");
      setParentId("");
      setEstCauseRacine(false);
    });
  }

  function handleSupprimer(causeId: string) {
    startTransition(async () => {
      await supprimerCause(causeId, ficheSSEId);
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Arbre des causes</h2>

      {causes.length === 0 && <p className="text-sm text-slate-400">Aucune cause renseignée.</p>}

      <ul>
        {arbre.map((cause) => (
          <CauseNode
            key={cause.id}
            cause={cause}
            ficheSSEId={ficheSSEId}
            disabled={disabled}
            depth={0}
            onSupprimer={handleSupprimer}
          />
        ))}
      </ul>

      {!disabled && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Nouvelle cause</label>
            <input
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Description de la cause"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="max-w-full flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm sm:max-w-xs"
            >
              <option value="">— Cause de premier niveau —</option>
              {causes.map((c) => (
                <option key={c.id} value={c.id}>
                  Sous-cause de : {c.libelle}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={estCauseRacine}
                onChange={(e) => setEstCauseRacine(e.target.checked)}
              />
              Cause racine
            </label>
            <button
              type="button"
              onClick={handleAjouter}
              disabled={enCours || !libelle.trim()}
              className="ml-auto rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {enCours ? "..." : "Ajouter"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
