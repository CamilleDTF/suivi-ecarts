import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { StatutAction } from "@/generated/prisma/enums";
import { STATUT_ACTION_COLORS, STATUT_ACTION_LABELS, TYPE_ACTION_LABELS, RESPONSABLES } from "@/lib/labels";
import { Pagination } from "@/components/pagination";
import { filtreStatutAction } from "@/lib/validation";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";
import { LienArchives } from "@/components/lien-archives";
import { construireTri } from "@/lib/tri";
import { EnteteTriable } from "@/components/entete-triable";

const COLONNES_TRI = {
  reference: "reference",
  type: "type",
  action: "action",
  responsable: "responsable",
  echeance: "echeance",
  statut: "statut",
};

export default async function PlanActionPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    statut?: string;
    responsable?: string;
    page?: string;
    taille?: string;
    tri?: string;
    sens?: string;
    archives?: string;
  }>;
}) {
  const { q, statut, responsable, page: pageParam, taille, tri, sens, archives } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);

  const contient = { contains: q, mode: "insensitive" as const };
  const where = {
    ...filtreArchive(archives),
    statut: filtreStatutAction(statut),
    responsable: responsable || undefined,
    OR: q
      ? [
          { reference: contient },
          { action: contient },
          { responsable: contient },
          { origine: contient },
          { ecart: { reference: contient } },
          { ecart: { description: contient } },
          { ecart: { dossier: { chantier: contient } } },
          { ficheSSE: { reference: contient } },
          { ecartAmiante: { reference: contient } },
          { ecartAmiante: { nomChantier: contient } },
        ]
      : undefined,
  };

  const [total, actions] = await Promise.all([
    prisma.action.count({ where }),
    prisma.action.findMany({
      where,
      orderBy: construireTri(tri, sens, COLONNES_TRI, { echeance: "asc" as const }, ["echeance"]),
      include: { ecart: { include: { dossier: true } }, ficheSSE: true, ecartAmiante: true },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
  ]);

  const filtreActif = !!q || !!statut || !!responsable;

  const paramsExport = new URLSearchParams();
  if (statut) paramsExport.set("statut", statut);
  if (responsable) paramsExport.set("responsable", responsable);
  const hrefExport = `/plan-action/export${paramsExport.toString() ? `?${paramsExport.toString()}` : ""}`;

  return (
    <div className="mx-auto max-w-[100rem] px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Plan d&apos;action</h1>
        <div className="flex gap-2">
          <a
            href={hrefExport}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Exporter
          </a>
          <Link
            href="/plan-action/nouveau"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Nouvelle action
          </Link>
        </div>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher une action…"
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <SelectAutoSubmit
          name="statut"
          defaultValue={statut ?? ""}
          options={[
            { value: "", label: "Statut : Tous" },
            ...Object.values(StatutAction).map((s) => ({ value: s, label: STATUT_ACTION_LABELS[s] })),
          ]}
        />
        <SelectAutoSubmit
          name="responsable"
          defaultValue={responsable ?? ""}
          options={[
            { value: "", label: "Responsable : Tous" },
            ...RESPONSABLES.map((r) => ({ value: r, label: r })),
          ]}
        />
        {filtreActif && (
          <Link href="/plan-action" className="text-sm text-slate-500 hover:underline">
            Réinitialiser
          </Link>
        )}
        <LienArchives archives={archives} params={{ q, statut, responsable, taille, tri, sens }} />
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <EnteteTriable
                colonne="reference"
                libelle="Référence"
                triActuel={tri}
                sensActuel={sens}
                params={{ q, statut, responsable, taille }}
              />
              <th className="px-4 py-3 font-medium">Rattaché à</th>
              <EnteteTriable
                colonne="type"
                libelle="Type"
                triActuel={tri}
                sensActuel={sens}
                params={{ q, statut, responsable, taille }}
              />
              <EnteteTriable
                colonne="action"
                libelle="Action"
                triActuel={tri}
                sensActuel={sens}
                params={{ q, statut, responsable, taille }}
              />
              <EnteteTriable
                colonne="responsable"
                libelle="Responsable"
                triActuel={tri}
                sensActuel={sens}
                params={{ q, statut, responsable, taille }}
              />
              <EnteteTriable
                colonne="echeance"
                libelle="Échéance"
                triActuel={tri}
                sensActuel={sens}
                params={{ q, statut, responsable, taille }}
              />
              <EnteteTriable
                colonne="statut"
                libelle="Statut"
                triActuel={tri}
                sensActuel={sens}
                params={{ q, statut, responsable, taille }}
              />
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3">
                  <Link href={`/plan-action/${a.id}`} className="font-medium text-blue-700 hover:underline">
                    {a.reference}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {a.ecart ? (
                    <Link href={`/ecarts/${a.ecart.id}`} className="text-slate-600 hover:underline">
                      {a.ecart.reference}
                    </Link>
                  ) : a.ficheSSE ? (
                    <Link href={`/fiches-sse/${a.ficheSSE.id}`} className="text-slate-600 hover:underline">
                      {a.ficheSSE.reference}
                    </Link>
                  ) : a.ecartAmiante ? (
                    <Link href={`/ecart-amiante/${a.ecartAmiante.id}`} className="text-slate-600 hover:underline">
                      {a.ecartAmiante.reference}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">{TYPE_ACTION_LABELS[a.type]}</td>
                <td className="max-w-xs truncate px-4 py-3 text-slate-700">{a.action}</td>
                <td className="px-4 py-3 text-slate-700">{a.responsable}</td>
                <td className="px-4 py-3 text-slate-500">
                  {a.echeance ? a.echeance.toLocaleDateString("fr-FR") : "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge label={STATUT_ACTION_LABELS[a.statut]} colorClass={STATUT_ACTION_COLORS[a.statut]} />
                </td>
              </tr>
            ))}
            {actions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  {filtreActif ? "Aucune action ne correspond à ce filtre." : "Aucune action pour l'instant."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {total > 0 && (
          <Pagination
            total={total}
            page={page}
            pageSize={taillePage}
            baseParams={{ q, statut, responsable, taille }}
          />
        )}
      </div>
    </div>
  );
}
