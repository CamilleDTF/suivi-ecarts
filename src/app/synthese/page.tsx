import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/badge";
import {
  STATUT_DOSSIER_ECART_COLORS,
  STATUT_DOSSIER_ECART_LABELS,
  STATUT_ACTION_COLORS,
  STATUT_ACTION_LABELS,
  TYPE_ACTION_LABELS,
} from "@/lib/labels";

export default async function SynthesePage() {
  const now = new Date();

  const [
    dossiersOuverts,
    ecartsOuverts,
    fichesBrouillon,
    ecartAmianteOuverts,
    actionsEnRetard,
    dossiersParStatut,
  ] = await Promise.all([
    prisma.dossier.count({ where: { statut: { not: "CLOTURE" } } }),
    prisma.ecart.count({ where: { statut: { not: "CLOTURE" } } }),
    prisma.ficheSSE.count({ where: { statutFiche: "BROUILLON" } }),
    prisma.ecartAmiante.count({ where: { clotureEcartAmiante: false } }),
    prisma.action.findMany({
      where: {
        echeance: { lt: now },
        statut: { notIn: ["REALISEE", "VERIFIEE_EFFICACE", "ANNULEE"] },
      },
      include: { ecart: { include: { dossier: true } } },
      orderBy: { echeance: "asc" },
    }),
    prisma.dossier.groupBy({ by: ["statut"], _count: { _all: true } }),
  ]);

  const statutOrder = ["A_QUALIFIER", "OUVERT", "EN_COURS", "CLOTURE"] as const;
  const statutCounts = Object.fromEntries(dossiersParStatut.map((d) => [d.statut, d._count._all]));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Synthèse</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Dossiers ouverts" value={dossiersOuverts} />
        <StatTile label="Écarts ouverts" value={ecartsOuverts} />
        <StatTile label="Évènements SSE en brouillon" value={fichesBrouillon} />
        <StatTile label="Écarts amiante ouverts" value={ecartAmianteOuverts} />
        <StatTile
          label="Actions en retard"
          value={actionsEnRetard.length}
          tone={actionsEnRetard.length > 0 ? "critical" : "good"}
        />
      </div>

      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Dossiers par statut</h2>
        <div className="flex flex-wrap gap-3">
          {statutOrder.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <Badge label={STATUT_DOSSIER_ECART_LABELS[s]} colorClass={STATUT_DOSSIER_ECART_COLORS[s]} />
              <span className="text-sm font-medium text-slate-700">{statutCounts[s] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Actions en retard ({actionsEnRetard.length})
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Référence</th>
                <th className="px-4 py-3 font-medium">Écart</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Responsable</th>
                <th className="px-4 py-3 font-medium">Échéance</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {actionsEnRetard.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/plan-action/${a.id}`} className="font-medium text-blue-700 hover:underline">
                      {a.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/ecarts/${a.ecart.id}`} className="text-slate-600 hover:underline">
                      {a.ecart.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{TYPE_ACTION_LABELS[a.type]}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-700">{a.action}</td>
                  <td className="px-4 py-3 text-slate-700">{a.responsable}</td>
                  <td className="px-4 py-3 text-[#d03b3b]">{a.echeance?.toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3">
                    <Badge label={STATUT_ACTION_LABELS[a.statut]} colorClass={STATUT_ACTION_COLORS[a.statut]} />
                  </td>
                </tr>
              ))}
              {actionsEnRetard.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Aucune action en retard
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
