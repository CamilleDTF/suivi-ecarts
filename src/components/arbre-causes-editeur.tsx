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
        <span className="text-sm text-slate-800">{cause.libelle}</span>
        {cause.estCauseRacine && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            Cause racine
          </span>
        )}
        <button
          type="button"
          onClick={() => onSupprimer(cause.id)}
          className="text-xs text-slate-400 hover:text-red-600"
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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Arbre des causes</h2>
      <input type="hidden" name={name} value={JSON.stringify(causes)} />

      {causes.length === 0 && <p className="text-sm text-slate-400">Aucune cause renseignée.</p>}

      <ul>
        {arbre.map((cause) => (
          <NoeudLocal key={cause.id} cause={cause} onSupprimer={supprimer} depth={0} />
        ))}
      </ul>

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
        <div className="flex items-center gap-4">
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
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
            onClick={ajouter}
            className="ml-auto rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
