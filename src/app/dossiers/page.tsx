import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { Pagination } from "@/components/pagination";
import { Origine, StatutDossierEcart } from "@/generated/prisma/enums";
import { ORIGINE_LABELS, STATUT_DOSSIER_ECART_COLORS, STATUT_DOSSIER_ECART_LABELS } from "@/lib/labels";

const TAILLE_PAGE = 10;

export default async function DossiersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; origine?: string; page?: string }>;
}) {
  const { q, statut, origine, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where = {
    statut: statut ? (statut as StatutDossierEcart) : undefined,
    origine: origine ? (origine as Origine) : undefined,
    OR: q
      ? [
          { reference: { contains: q, mode: "insensitive" as const } },
          { chantier: { contains: q, mode: "insensitive" as const } },
          { declarant: { contains: q, mode: "insensitive" as const } },
        ]
      : undefined,
  };

  const [total, dossiers] = await Promise.all([
    prisma.dossier.count({ where }),
    prisma.dossier.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { ecarts: true } } },
      skip: (page - 1) * TAILLE_PAGE,
      take: TAILLE_PAGE,
    }),
  ]);

  const filtreActif = !!q || !!statut || !!origine;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Dossiers</h1>
        <Link
          href="/dossiers/nouveau"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nouveau dossier
        </Link>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher un dossier…"
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <SelectAutoSubmit
          name="statut"
          defaultValue={statut ?? ""}
          options={[
            { value: "", label: "Statut : Tous" },
            ...Object.values(StatutDossierEcart).map((s) => ({ value: s, label: STATUT_DOSSIER_ECART_LABELS[s] })),
          ]}
        />
        <SelectAutoSubmit
          name="origine"
          defaultValue={origine ?? ""}
          options={[
            { value: "", label: "Origine : Toutes" },
            ...Object.values(Origine).map((o) => ({ value: o, label: ORIGINE_LABELS[o] })),
          ]}
        />
        {filtreActif && (
          <Link href="/dossiers" className="text-sm text-slate-500 hover:underline">
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
              <th className="px-4 py-3 font-medium">Déclarant</th>
              <th className="px-4 py-3 font-medium">Origine</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Écarts</th>
              <th className="px-4 py-3 font-medium">Détecté le</th>
            </tr>
          </thead>
          <tbody>
            {dossiers.map((d) => (
              <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/dossiers/${d.id}`} className="font-medium text-blue-700 hover:underline">
                    {d.reference}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">{d.chantier}</td>
                <td className="px-4 py-3 text-slate-700">{d.declarant}</td>
                <td className="px-4 py-3 text-slate-700">{ORIGINE_LABELS[d.origine]}</td>
                <td className="px-4 py-3">
                  <Badge
                    label={STATUT_DOSSIER_ECART_LABELS[d.statut]}
                    colorClass={STATUT_DOSSIER_ECART_COLORS[d.statut]}
                  />
                </td>
                <td className="px-4 py-3 text-slate-700">{d._count.ecarts}</td>
                <td className="px-4 py-3 text-slate-500">
                  {d.dateDetection.toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
            {dossiers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  {filtreActif ? "Aucun dossier ne correspond à ce filtre." : "Aucun dossier pour l'instant."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {total > 0 && <Pagination total={total} page={page} pageSize={TAILLE_PAGE} baseParams={{ q, statut, origine }} />}
      </div>
    </div>
  );
}
