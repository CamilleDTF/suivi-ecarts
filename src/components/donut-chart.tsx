// Les classes de couleur doivent être écrites en toutes lettres (voir la
// même remarque dans graphique-barres.tsx) : Tailwind ne génère le CSS que
// pour les noms de classe trouvés tels quels dans le code source.
const COULEUR_TEXTE: Record<string, string> = {
  "bg-slate-100 text-slate-700": "text-slate-300",
  "bg-slate-200 text-slate-500": "text-slate-300",
  "bg-amber-100 text-amber-800": "text-amber-400",
  "bg-blue-100 text-blue-800": "text-blue-500",
  "bg-green-100 text-green-800": "text-green-500",
  "bg-red-100 text-red-800": "text-red-400",
  "bg-emerald-100 text-emerald-800": "text-emerald-400",
};

function couleurTexte(badgeColorClass: string) {
  return COULEUR_TEXTE[badgeColorClass] ?? "text-slate-300";
}

export function DonutChart({
  titre,
  segments,
}: {
  titre: string;
  segments: { label: string; valeur: number; colorClass: string }[];
}) {
  const total = segments.reduce((somme, s) => somme + s.valeur, 0);
  const rayon = 60;
  const circonference = 2 * Math.PI * rayon;

  const arcs: { label: string; colorClass: string; dash: number; dashoffset: number }[] = [];
  let cumule = 0;
  for (const s of segments) {
    if (s.valeur === 0 || total === 0) continue;
    const fraction = s.valeur / total;
    arcs.push({ label: s.label, colorClass: s.colorClass, dash: fraction * circonference, dashoffset: -cumule * circonference });
    cumule += fraction;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">{titre}</h2>
      <div className="flex items-center gap-6">
        <div className="relative h-40 w-40 shrink-0">
          <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
            <circle cx="80" cy="80" r={rayon} fill="none" stroke="currentColor" strokeWidth="20" className="text-slate-100" />
            {arcs.map((arc) => (
              <circle
                key={arc.label}
                cx="80"
                cy="80"
                r={rayon}
                fill="none"
                stroke="currentColor"
                strokeWidth="20"
                strokeDasharray={`${arc.dash} ${circonference - arc.dash}`}
                strokeDashoffset={arc.dashoffset}
                className={couleurTexte(arc.colorClass)}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-900">{total}</span>
            <span className="text-xs text-slate-400">Total</span>
          </div>
        </div>
        <ul className="space-y-2">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-sm">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full bg-current ${couleurTexte(s.colorClass)}`} />
              <span className="text-slate-600">{s.label}</span>
              <span className="font-medium text-slate-900">{s.valeur}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
