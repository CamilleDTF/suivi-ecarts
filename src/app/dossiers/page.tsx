import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { Pagination } from "@/components/pagination";
import { Origine, StatutDossierEcart } from "@/generated/prisma/enums";
import { ORIGINE_LABELS, STATUT_DOSSIER_ECART_COLORS, STATUT_DOSSIER_ECART_LABELS } from "@/lib/labels";
import { filtreStatutDossierEcart } from "@/lib/validation";
import { lireTaillePage } from "@/lib/pagination";

export default async function DossiersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; origine?: string; page?: string; taille?: string }>;
}) {
  const { q, statut, origine, page: pageParam, taille } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);

  const where = {
    statut: filtreStatutDossierEcart(statut),
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
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
  ]);

  // Écarts restant à traiter par dossier. Prisma ne sait pas renvoyer dans le
  // même _count le total et un sous-total filtré : on compte à part.
  // "Ouvert" au sens du suivi = pas encore clôturé, donc "Ouvert" comme
  // "En cours".
  const ouvertsParDossier = new Map(
    (
      await prisma.ecart.groupBy({
        by: ["dossierId"],
        where: { dossierId: { in: dossiers.map((d) => d.id) }, statut: { not: "CLOTURE" } },
        _count: { _all: true },
      })
    ).map((r) => [r.dossierId, r._count._all]),
  );

  const filtreActif = !!q || !!statut || !!origine;

  return (
    <div className="mx-auto max-w-[100rem] px-6 py-8">
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
            ...Object.values(StatutDossierEcart)
              .filter((s) => s !== "A_QUALIFIER")
              .map((s) => ({ value: s, label: STATUT_DOSSIER_ECART_LABELS[s] })),
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

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Référence</th>
              <th className="px-4 py-3 font-medium">Chantier</th>
              <th className="px-4 py-3 font-medium">Déclarant</th>
              <th className="px-4 py-3 font-medium">Origine</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Écarts</th>
              <th className="px-4 py-3 font-medium">Écarts ouverts</th>
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
                <td className="px-4 py-3">
                  {(ouvertsParDossier.get(d.id) ?? 0) > 0 ? (
                    <span className="font-medium text-slate-900">{ouvertsParDossier.get(d.id)}</span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {d.dateDetection.toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
            {dossiers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  {filtreActif ? "Aucun dossier ne correspond à ce filtre." : "Aucun dossier pour l'instant."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {total > 0 && <Pagination total={total} page={page} pageSize={taillePage} baseParams={{ q, statut, origine, taille }} />}
      </div>
    </div>
  );
}
