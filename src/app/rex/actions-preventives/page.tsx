import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { Pagination } from "@/components/pagination";
import { StatutAction } from "@/generated/prisma/enums";
import { STATUT_ACTION_COLORS, STATUT_ACTION_LABELS, NATURE_REX_LABELS, NATURE_REX_COLORS, RESPONSABLES } from "@/lib/labels";
import { lireTaillePage } from "@/lib/pagination";
import { construireTri } from "@/lib/tri";
import { EnteteTriable } from "@/components/entete-triable";

const COLONNES_TRI = {
  echeance: "echeance",
  statut: "statut",
};

export default async function ActionsPreventivesRexPage({
  searchParams,
}: {
  searchParams: Promise<{
    statut?: string;
    responsable?: string;
    page?: string;
    taille?: string;
    tri?: string;
    sens?: string;
  }>;
}) {
  const { statut, responsable, page: pageParam, taille, tri, sens } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);

  const where = {
    statut: statut && statut in StatutAction ? (statut as StatutAction) : undefined,
    responsable: responsable || undefined,
  };

  const [total, actionsRex] = await Promise.all([
    prisma.actionRex.count({ where }),
    prisma.actionRex.findMany({
      where,
      orderBy: construireTri(tri, sens, COLONNES_TRI, { echeance: "asc" as const }, ["echeance"]),
      select: {
        id: true,
        action: true,
        responsable: true,
        echeance: true,
        statut: true,
        rex: { select: { id: true, reference: true, titre: true, nature: true } },
      },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
  ]);

  const filtreActif = !!statut || !!responsable;
  const baseParams = { statut, responsable, taille, tri, sens };
  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);

  return (
    <div className="mx-auto max-w-[100rem] px-6 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Actions préventives des REX</h1>
          <p className="mt-1 text-sm text-slate-500">
            Toutes les actions préventives exigées par les REX, tous rattachements confondus.
          </p>
        </div>
        <Link href="/rex" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Retour aux REX
        </Link>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
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
          <Link href="/rex/actions-preventives" className="text-sm text-slate-500 hover:underline">
            Réinitialiser
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">REX</th>
              <th className="px-4 py-3 font-medium">Nature</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Responsable</th>
              <EnteteTriable
                colonne="echeance"
                libelle="Échéance"
                triActuel={tri}
                sensActuel={sens}
                params={{ statut, responsable, taille }}
              />
              <EnteteTriable
                colonne="statut"
                libelle="Statut"
                triActuel={tri}
                sensActuel={sens}
                params={{ statut, responsable, taille }}
              />
            </tr>
          </thead>
          <tbody>
            {actionsRex.map((a) => {
              const enRetard =
                !!a.echeance && a.echeance < aujourdHui && a.statut !== "REALISEE" && a.statut !== "ANNULEE";
              return (
                <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link href={`/rex/${a.rex.id}`} className="font-medium text-blue-700 hover:underline">
                      {a.rex.reference}
                    </Link>
                    <p className="max-w-[220px] truncate text-xs text-slate-400">{a.rex.titre}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={NATURE_REX_LABELS[a.rex.nature]} colorClass={NATURE_REX_COLORS[a.rex.nature]} />
                  </td>
                  <td className="max-w-sm truncate px-4 py-3 text-slate-700">{a.action}</td>
                  <td className="px-4 py-3 text-slate-700">{a.responsable}</td>
                  <td className={`px-4 py-3 ${enRetard ? "font-medium text-red-600" : "text-slate-500"}`}>
                    {a.echeance ? a.echeance.toLocaleDateString("fr-FR") : "—"}
                    {enRetard && " · en retard"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={STATUT_ACTION_LABELS[a.statut]} colorClass={STATUT_ACTION_COLORS[a.statut]} />
                  </td>
                </tr>
              );
            })}
            {actionsRex.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {filtreActif ? "Aucune action ne correspond à ce filtre." : "Aucune action préventive pour l'instant."}
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
