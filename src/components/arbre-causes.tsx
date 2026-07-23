import { ajouterCause, supprimerCause } from "@/app/fiches-sse/actions";

type Cause = {
  id: string;
  libelle: string;
  parentId: string | null;
  estCauseRacine: boolean;
};

function buildTree(causes: Cause[], parentId: string | null = null): (Cause & { enfants: Cause[] })[] {
  return causes
    .filter((c) => c.parentId === parentId)
    .map((c) => ({ ...c, enfants: buildTree(causes, c.id) as Cause[] }));
}

function CauseNode({
  cause,
  ficheSSEId,
  disabled,
  depth,
}: {
  cause: Cause & { enfants: Cause[] };
  ficheSSEId: string;
  disabled: boolean;
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
        {!disabled && (
          <form action={supprimerCause}>
            <input type="hidden" name="id" value={cause.id} />
            <input type="hidden" name="ficheSSEId" value={ficheSSEId} />
            <button type="submit" className="text-xs text-slate-400 hover:text-red-600">
              supprimer
            </button>
          </form>
        )}
      </div>
      {cause.enfants.length > 0 && (
        <ul>
          {cause.enfants.map((enfant) => (
            // @ts-expect-error enfants récursifs déjà construits par buildTree
            <CauseNode key={enfant.id} cause={enfant} ficheSSEId={ficheSSEId} disabled={disabled} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ArbreCauses({
  ficheSSEId,
  causes,
  disabled,
}: {
  ficheSSEId: string;
  causes: Cause[];
  disabled: boolean;
}) {
  const arbre = buildTree(causes);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Arbre des causes</h2>

      {causes.length === 0 && <p className="text-sm text-slate-400">Aucune cause renseignée.</p>}

      <ul>
        {arbre.map((cause) => (
          <CauseNode key={cause.id} cause={cause} ficheSSEId={ficheSSEId} disabled={disabled} depth={0} />
        ))}
      </ul>

      {!disabled && (
        <form action={ajouterCause} className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <input type="hidden" name="ficheSSEId" value={ficheSSEId} />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Nouvelle cause</label>
            <input
              name="libelle"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Description de la cause"
            />
          </div>
          <div className="flex items-center gap-4">
            <select name="parentId" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">— Cause de premier niveau —</option>
              {causes.map((c) => (
                <option key={c.id} value={c.id}>
                  Sous-cause de : {c.libelle}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="estCauseRacine" />
              Cause racine
            </label>
            <button
              type="submit"
              className="ml-auto rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Ajouter
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
