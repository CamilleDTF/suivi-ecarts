// Colonnes verticales : forme adaptée à une évolution dans le temps, là où les
// barres horizontales conviennent à un classement de catégories.
//
// Une seule série par graphique : pas de légende nécessaire, le titre suffit à
// nommer la mesure, et aucune palette catégorielle n'est introduite.
export function GraphiqueColonnes({
  titre,
  donnees,
  couleur = "bg-blue-500",
}: {
  titre: string;
  donnees: { label: string; valeur: number }[];
  /** Classe Tailwind littérale (Tailwind ne scanne que les chaînes du source). */
  couleur?: string;
}) {
  const max = Math.max(...donnees.map((d) => d.valeur), 1);
  const total = donnees.reduce((s, d) => s + d.valeur, 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase text-slate-500">{titre}</h2>
        {/* Ce total ne porte que sur les mois affichés, pas sur tout
            l'historique : le préciser évite de le lire comme un total global. */}
        <span className="text-sm text-slate-400">{total} sur 12 mois</span>
      </div>

      {total === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Aucune donnée sur la période.</p>
      ) : (
        <div className="flex h-40 items-end gap-1.5">
          {donnees.map((d) => (
            <div key={d.label} className="flex h-full flex-1 flex-col justify-end gap-1">
              {/* La valeur n'est affichée que si la colonne n'est pas vide :
                  un chiffre sur chaque point surchargerait la lecture. */}
              <div className="h-4 text-center text-[11px] font-medium text-slate-600">
                {d.valeur > 0 ? d.valeur : ""}
              </div>
              <div
                className={`${couleur} w-full rounded-t`}
                style={{ height: `${Math.max((d.valeur / max) * 100, d.valeur > 0 ? 3 : 0)}%` }}
                title={`${d.label} : ${d.valeur}`}
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex gap-1.5 border-t border-slate-100 pt-2">
        {donnees.map((d) => (
          <div key={d.label} className="flex-1 text-center text-[11px] text-slate-400">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
