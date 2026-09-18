import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { Pagination } from "@/components/pagination";
import { StatTile } from "@/components/stat-tile";
import { IconFileText, IconAlertTriangle } from "@/components/icons";
import { OrigineREX, StatutREX } from "@/generated/prisma/enums";
import { ORIGINE_REX_LABELS, STATUT_REX_COLORS, STATUT_REX_LABELS } from "@/lib/labels";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";
import { LienArchives } from "@/components/lien-archives";
import { construireTri } from "@/lib/tri";
import { EnteteTriable } from "@/components/entete-triable";

const COLONNES_TRI = {
  date: "createdAt",
};

export default async function RexPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    statut?: string;
    origine?: string;
    page?: string;
    taille?: string;
    archives?: string;
    tri?: string;
    sens?: string;
  }>;
}) {
  const { q, statut, origine, page: pageParam, taille, archives, tri, sens } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);

  const where = {
    ...filtreArchive(archives),
    statut: statut && statut in StatutREX ? (statut as StatutREX) : undefined,
    origine: origine && origine in OrigineREX ? (origine as OrigineREX) : undefined,
    OR: q
      ? [
          { reference: { contains: q, mode: "insensitive" as const } },
          { titre: { contains: q, mode: "insensitive" as const } },
          { causeRacine: { contains: q, mode: "insensitive" as const } },
          { enseignementsTires: { contains: q, mode: "insensitive" as const } },
        ]
      : undefined,
  };

  const [total, rex, parStatut, diffusions] = await Promise.all([
    prisma.rex.count({ where }),
    prisma.rex.findMany({
      where,
      orderBy: construireTri(tri, sens, COLONNES_TRI, { createdAt: "desc" as const }),
      include: {
        ecarts: { select: { id: true, reference: true } },
        ficheSSE: { select: { id: true, reference: true } },
        ecartAmiante: { select: { id: true, reference: true } },
        remontee: { select: { id: true, reference: true } },
      },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
    prisma.rex.groupBy({ by: ["statut"], _count: { _all: true } }),
    prisma.rexDiffusion.groupBy({ by: ["statutLecture"], _count: { _all: true } }),
  ]);

  const compte = Object.fromEntries(parStatut.map((s) => [s.statut, s._count._all]));
  const totalDiffusions = diffusions.reduce((s, d) => s + d._count._all, 0);
  const totalLues = diffusions.find((d) => d.statutLecture === "LU")?._count._all ?? 0;
  const filtreActif = !!q || !!statut || !!origine;
  const baseParams = { q, statut, origine, taille, tri, sens };

  return (
    <div className="mx-auto max-w-[100rem] px-6 py-8">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Retours d&apos;expérience</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enseignements capitalisés à partir des écarts, évènements SSE, écarts amiante et remontées.
          </p>
        </div>
        <Link
          href="/rex/nouveau"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nouveau REX
        </Link>
      </div>

      <div className="mb-6 mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Rédigés" value={compte.REDIGE ?? 0} icon={<IconFileText className="h-5 w-5" />} couleur="bleu" />
        <StatTile label="Diffusés" value={compte.DIFFUSE ?? 0} icon={<IconFileText className="h-5 w-5" />} couleur="violet" />
        <StatTile
          label="Efficacité vérifiée"
          value={compte.EFFICACITE_VERIFIEE ?? 0}
          icon={<IconFileText className="h-5 w-5" />}
          couleur="vert"
        />
        <StatTile
          label="Accusés de lecture"
          value={totalDiffusions ? `${totalLues}/${totalDiffusions}` : "—"}
          icon={<IconAlertTriangle className="h-5 w-5" />}
          couleur="orange"
        />
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher un REX…"
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <SelectAutoSubmit
          name="statut"
          defaultValue={statut ?? ""}
          options={[
            { value: "", label: "Statut : Tous" },
            ...Object.values(StatutREX).map((s) => ({ value: s, label: STATUT_REX_LABELS[s] })),
          ]}
        />
        <SelectAutoSubmit
          name="origine"
          defaultValue={origine ?? ""}
          options={[
            { value: "", label: "Origine : Toutes" },
            ...Object.values(OrigineREX).map((o) => ({ value: o, label: ORIGINE_REX_LABELS[o] })),
          ]}
        />
        {filtreActif && (
          <Link href="/rex" className="text-sm text-slate-500 hover:underline">
            Réinitialiser
          </Link>
        )}
        <LienArchives archives={archives} params={{ q, statut, origine, taille, tri, sens }} />
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Référence</th>
              <EnteteTriable
                colonne="date"
                libelle="Date"
                triActuel={tri}
                sensActuel={sens}
                params={{ q, statut, origine, taille }}
              />
              <th className="px-4 py-3 font-medium">Titre</th>
              <th className="px-4 py-3 font-medium">Origine</th>
              <th className="px-4 py-3 font-medium">Rattaché à</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {rex.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/rex/${r.id}`} className="font-medium text-blue-700 hover:underline">
                    {r.reference}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{r.createdAt.toLocaleDateString("fr-FR")}</td>
                <td className="max-w-xs truncate px-4 py-3 text-slate-700">{r.titre}</td>
                <td className="px-4 py-3 text-slate-700">{ORIGINE_REX_LABELS[r.origine]}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  {r.ecarts.length > 0 ? (
                    <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {r.ecarts.map((e) => (
                        <Link key={e.id} href={`/ecarts/${e.id}`} className="text-slate-600 hover:underline">
                          {e.reference}
                        </Link>
                      ))}
                    </span>
                  ) : r.ficheSSE ? (
                    <Link href={`/fiches-sse/${r.ficheSSE.id}`} className="text-slate-600 hover:underline">
                      {r.ficheSSE.reference}
                    </Link>
                  ) : r.ecartAmiante ? (
                    <Link href={`/ecart-amiante/${r.ecartAmiante.id}`} className="text-slate-600 hover:underline">
                      {r.ecartAmiante.reference}
                    </Link>
                  ) : r.remontee ? (
                    <Link href={`/remontees/${r.remontee.id}`} className="text-slate-600 hover:underline">
                      {r.remontee.reference}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge label={STATUT_REX_LABELS[r.statut]} colorClass={STATUT_REX_COLORS[r.statut]} />
                </td>
              </tr>
            ))}
            {rex.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {filtreActif ? "Aucun REX ne correspond à ce filtre." : "Aucun REX pour l'instant."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {total > 0 && <Pagination total={total} page={page} pageSize={taillePage} baseParams={baseParams} />}
      </div>
    </div>
  );
}
