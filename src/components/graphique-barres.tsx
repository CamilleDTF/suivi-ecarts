// Les classes doivent être écrites en toutes lettres ici : Tailwind ne scanne
// que les chaînes littérales du code source, pas des noms de classe composés
// dynamiquement (ex. via .replace()), sinon la couleur ne serait jamais générée.
const COULEUR_PLEINE: Record<string, string> = {
  "bg-slate-100 text-slate-700": "bg-slate-400",
  "bg-slate-200 text-slate-500": "bg-slate-400",
  "bg-amber-100 text-amber-800": "bg-amber-400",
  "bg-blue-100 text-blue-800": "bg-blue-400",
  "bg-green-100 text-green-800": "bg-green-400",
  "bg-red-100 text-red-800": "bg-red-400",
  "bg-emerald-100 text-emerald-800": "bg-emerald-400",
};

function couleurPleine(badgeColorClass: string) {
  return COULEUR_PLEINE[badgeColorClass] ?? "bg-slate-400";
}

export function GraphiqueBarres({
  titre,
  donnees,
  couleurUnique,
}: {
  titre: string;
  donnees: { label: string; valeur: number; colorClass?: string }[];
  /** Couleur (classe Tailwind littérale, ex. "bg-blue-400") utilisée pour toutes
   * les barres quand la couleur n'a pas de sens par catégorie (ex. répartition
   * par domaine/thème), contrairement à un statut où chaque valeur a sa couleur. */
  couleurUnique?: string;
}) {
  const max = Math.max(...donnees.map((d) => d.valeur), 1);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">{titre}</h2>
      <div className="space-y-2">
        {donnees.map((d) => (
          <div key={d.label} className="flex items-center gap-3">
            <div className="w-32 shrink-0 truncate text-sm text-slate-600" title={d.label}>
              {d.label}
            </div>
            <div className="h-4 flex-1 rounded bg-slate-100">
              <div
                className={`h-4 rounded ${d.colorClass ? couleurPleine(d.colorClass) : couleurUnique ?? "bg-blue-400"}`}
                style={{ width: `${(d.valeur / max) * 100}%` }}
              />
            </div>
            <div className="w-8 shrink-0 text-right text-sm font-medium text-slate-700">{d.valeur}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
