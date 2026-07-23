import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { Pagination } from "@/components/pagination";

const TAILLE_PAGE = 10;

const ONGLETS = [
  { valeur: "tous", label: "Tous" },
  { valeur: "ouverts", label: "Ouverts" },
  { valeur: "clotures", label: "Clôturés" },
] as const;

const PERIODE_OPTIONS = [
  { value: "", label: "Période : Toutes" },
  { value: "7j", label: "7 derniers jours" },
  { value: "30j", label: "30 derniers jours" },
  { value: "annee", label: "Cette année" },
];

function dateDebutPeriode(periode: string | undefined): Date | undefined {
  const maintenant = new Date();
  if (periode === "7j") return new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (periode === "30j") return new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (periode === "annee") return new Date(maintenant.getFullYear(), 0, 1);
  return undefined;
}

export default async function EcartAmiantePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; onglet?: string; periode?: string; page?: string }>;
}) {
  const { q, onglet, periode, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const debutPeriode = dateDebutPeriode(periode);

  const whereBase = {
    date: debutPeriode ? { gte: debutPeriode } : undefined,
    OR: q
      ? [
          { reference: { contains: q, mode: "insensitive" as const } },
          { nomChantier: { contains: q, mode: "insensitive" as const } },
          { conducteur: { contains: q, mode: "insensitive" as const } },
          { chef: { contains: q, mode: "insensitive" as const } },
        ]
      : undefined,
  };

  const whereOnglet =
    onglet === "ouverts"
      ? { clotureEcartAmiante: false }
      : onglet === "clotures"
        ? { clotureEcartAmiante: true }
        : {};

  const where = { ...whereBase, ...whereOnglet };

  const [total, ecarts, totalTous, totalOuverts, totalClotures] = await Promise.all([
    prisma.ecartAmiante.count({ where }),
    prisma.ecartAmiante.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * TAILLE_PAGE,
      take: TAILLE_PAGE,
    }),
    prisma.ecartAmiante.count({ where: whereBase }),
    prisma.ecartAmiante.count({ where: { ...whereBase, clotureEcartAmiante: false } }),
    prisma.ecartAmiante.count({ where: { ...whereBase, clotureEcartAmiante: true } }),
  ]);

  const compteurs: Record<string, number> = { tous: totalTous, ouverts: totalOuverts, clotures: totalClotures };
  const ongletActif = onglet ?? "tous";
  const filtreActif = !!q || !!periode;

  function hrefOnglet(valeur: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (periode) params.set("periode", periode);
    if (valeur !== "tous") params.set("onglet", valeur);
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Écarts amiante</h1>
        <Link
          href="/ecart-amiante/nouveau"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nouvel écart amiante
        </Link>
      </div>

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {ONGLETS.map((o) => {
          const actif = ongletActif === o.valeur;
          return (
            <Link
              key={o.valeur}
              href={hrefOnglet(o.valeur)}
              className={
                actif
                  ? "border-b-2 border-blue-600 px-3 pb-2 text-sm font-semibold text-blue-700"
                  : "border-b-2 border-transparent px-3 pb-2 text-sm text-slate-500 hover:text-slate-800"
              }
            >
              {o.label} ({compteurs[o.valeur]})
            </Link>
          );
        })}
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
        {onglet && <input type="hidden" name="onglet" value={onglet} />}
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher un écart amiante…"
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <SelectAutoSubmit name="periode" defaultValue={periode ?? ""} options={PERIODE_OPTIONS} />
        {filtreActif && (
          <Link href={onglet ? `?onglet=${onglet}` : "/ecart-amiante"} className="text-sm text-slate-500 hover:underline">
            Réinitialiser
          </Link>
        )}
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Référence</th>
              <th className="px-4 py-3 font-medium">Chantier</th>
              <th className="px-4 py-3 font-medium">Conducteur</th>
              <th className="px-4 py-3 font-medium">Chef</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {ecarts.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/ecart-amiante/${e.id}`} className="font-medium text-blue-700 hover:underline">
                    {e.reference}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {e.nomChantier} <span className="text-slate-400">({e.numeroChantier})</span>
                </td>
                <td className="px-4 py-3 text-slate-700">{e.conducteur}</td>
                <td className="px-4 py-3 text-slate-700">{e.chef}</td>
                <td className="px-4 py-3">
                  <Badge
                    label={e.clotureEcartAmiante ? "Clôturé" : "Ouvert"}
                    colorClass={e.clotureEcartAmiante ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}
                  />
                </td>
                <td className="px-4 py-3 text-slate-500">{e.date.toLocaleDateString("fr-FR")}</td>
              </tr>
            ))}
            {ecarts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {filtreActif || onglet ? "Aucun écart amiante ne correspond à ce filtre." : "Aucun écart amiante pour l'instant."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {total > 0 && (
          <Pagination total={total} page={page} pageSize={TAILLE_PAGE} baseParams={{ q, onglet, periode }} />
        )}
      </div>
    </div>
  );
}
