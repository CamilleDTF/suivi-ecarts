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
        <span className="text-sm">{cause.libelle}</span>
        {cause.estCauseRacine && (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
            Cause racine
          </span>
        )}
        {!disabled && (
          <button
            type="button"
            onClick={() => onSupprimer(cause.id)}
            className="text-xs text-muted-foreground hover:text-destructive"
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
    <div className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Arbre des causes</h2>

      {causes.length === 0 && <p className="text-sm text-muted-foreground">Aucune cause renseignée.</p>}

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
        <div className="mt-4 space-y-2 border-t pt-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nouvelle cause</label>
            <input
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Description de la cause"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="max-w-full flex-1 rounded-lg border border-input bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:max-w-xs"
            >
              <option value="">— Cause de premier niveau —</option>
              {causes.map((c) => (
                <option key={c.id} value={c.id}>
                  Sous-cause de : {c.libelle}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
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
              className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
            >
              {enCours ? "..." : "Ajouter"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
