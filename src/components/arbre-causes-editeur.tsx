"use client";

import { useState } from "react";

type CauseLocale = {
  id: string;
  libelle: string;
  parentId: string | null;
  estCauseRacine: boolean;
};

function buildTree(causes: CauseLocale[], parentId: string | null = null): (CauseLocale & { enfants: CauseLocale[] })[] {
  return causes
    .filter((c) => c.parentId === parentId)
    .map((c) => ({ ...c, enfants: buildTree(causes, c.id) as CauseLocale[] }));
}

function genererId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c${Date.now()}${Math.random().toString(36).slice(2)}`;
}

function NoeudLocal({
  cause,
  onSupprimer,
  depth,
}: {
  cause: CauseLocale & { enfants: CauseLocale[] };
  onSupprimer: (id: string) => void;
  depth: number;
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
        <button
          type="button"
          onClick={() => onSupprimer(cause.id)}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          supprimer
        </button>
      </div>
      {cause.enfants.length > 0 && (
        <ul>
          {cause.enfants.map((enfant) => (
            <NoeudLocal
              key={enfant.id}
              cause={enfant as CauseLocale & { enfants: CauseLocale[] }}
              onSupprimer={onSupprimer}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ArbreCausesEditeur({ name = "causesJson" }: { name?: string }) {
  const [causes, setCauses] = useState<CauseLocale[]>([]);
  const [libelle, setLibelle] = useState("");
  const [parentId, setParentId] = useState("");
  const [estCauseRacine, setEstCauseRacine] = useState(false);

  function ajouter() {
    const texte = libelle.trim();
    if (!texte) return;
    setCauses([...causes, { id: genererId(), libelle: texte, parentId: parentId || null, estCauseRacine }]);
    setLibelle("");
    setParentId("");
    setEstCauseRacine(false);
  }

  function supprimer(id: string) {
    setCauses(causes.filter((c) => c.id !== id && c.parentId !== id));
  }

  const arbre = buildTree(causes);

  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Arbre des causes</h2>
      <input type="hidden" name={name} value={JSON.stringify(causes)} />

      {causes.length === 0 && <p className="text-sm text-muted-foreground">Aucune cause renseignée.</p>}

      <ul>
        {arbre.map((cause) => (
          <NoeudLocal key={cause.id} cause={cause} onSupprimer={supprimer} depth={0} />
        ))}
      </ul>

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
        <div className="flex items-center gap-4">
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="rounded-lg border border-input bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
            onClick={ajouter}
            className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
