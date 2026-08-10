type Cause = {
  id: string;
  libelle: string;
  parentId: string | null;
  estCauseRacine: boolean;
};

type Noeud = Cause & { enfants: Noeud[] };

function arbre(causes: Cause[], parentId: string | null = null): Noeud[] {
  return causes
    .filter((c) => c.parentId === parentId)
    .map((c) => ({ ...c, enfants: arbre(causes, c.id) }));
}

/**
 * Arbre des causes en lecture seule, pour le rapport imprimé.
 *
 * Liste indentée et non logigramme SVG : un libellé de cause est une phrase
 * entière, que les nœuds d'un schéma tronqueraient. La hiérarchie se lit très
 * bien par l'indentation, et le texte reste sélectionnable dans le PDF.
 */
function Branche({ noeud, profondeur }: { noeud: Noeud; profondeur: number }) {
  return (
    <li style={{ marginLeft: profondeur * 18 }} className="mt-1.5 break-inside-avoid">
      <div className="flex flex-wrap items-baseline gap-2">
        <span aria-hidden className="text-slate-300">
          {profondeur === 0 ? "▪" : "↳"}
        </span>
        <span className="text-sm text-slate-800">{noeud.libelle}</span>
        {noeud.estCauseRacine && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            Cause racine
          </span>
        )}
      </div>
      {noeud.enfants.length > 0 && (
        <ul>
          {noeud.enfants.map((e) => (
            <Branche key={e.id} noeud={e} profondeur={profondeur + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ArbreCausesLecture({ causes }: { causes: Cause[] }) {
  if (causes.length === 0) return null;
  // Une cause dont le parent a disparu resterait invisible : on la remonte à la
  // racine plutôt que de la perdre silencieusement du rapport.
  const connus = new Set(causes.map((c) => c.id));
  const normalisees = causes.map((c) => ({
    ...c,
    parentId: c.parentId && connus.has(c.parentId) ? c.parentId : null,
  }));

  return (
    <ul>
      {arbre(normalisees).map((n) => (
        <Branche key={n.id} noeud={n} profondeur={0} />
      ))}
    </ul>
  );
}
