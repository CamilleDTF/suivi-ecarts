import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/badge";
import { GraphiqueBarres } from "@/components/graphique-barres";
import {
  STATUT_DOSSIER_ECART_COLORS,
  STATUT_DOSSIER_ECART_LABELS,
  STATUT_FICHE_COLORS,
  STATUT_FICHE_LABELS,
  STATUT_ACTION_COLORS,
  STATUT_ACTION_LABELS,
  TYPE_ACTION_LABELS,
} from "@/lib/labels";

const STATUT_ORDER = ["A_QUALIFIER", "OUVERT", "EN_COURS", "CLOTURE"] as const;
const STATUT_FICHE_ORDER = ["BROUILLON", "FINALISEE"] as const;

const ECART_AMIANTE_LABELS: Record<string, string> = {
  ouvert: "Ouvert",
  cloture: "Clôturé",
};
const ECART_AMIANTE_COLORS: Record<string, string> = {
  ouvert: "bg-amber-100 text-amber-800",
  cloture: "bg-green-100 text-green-800",
};

export default async function SynthesePage() {
  const now = new Date();

  const [
    dossiersOuverts,
    ecartsOuverts,
    fichesBrouillon,
    ecartAmianteOuverts,
    actionsEnRetard,
    dossiersParStatut,
    ecartsParStatut,
    fichesParStatut,
    ecartAmianteParCloture,
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
    prisma.ecart.groupBy({ by: ["statut"], _count: { _all: true } }),
    prisma.ficheSSE.groupBy({ by: ["statutFiche"], _count: { _all: true } }),
    prisma.ecartAmiante.groupBy({ by: ["clotureEcartAmiante"], _count: { _all: true } }),
  ]);

  const statutCounts = Object.fromEntries(dossiersParStatut.map((d) => [d.statut, d._count._all]));
  const ecartsStatutCounts = Object.fromEntries(ecartsParStatut.map((d) => [d.statut, d._count._all]));
  const fichesStatutCounts = Object.fromEntries(fichesParStatut.map((d) => [d.statutFiche, d._count._all]));
  const ecartAmianteCounts = Object.fromEntries(
    ecartAmianteParCloture.map((d) => [d.clotureEcartAmiante ? "cloture" : "ouvert", d._count._all]),
  );

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

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GraphiqueBarres
          titre="Dossiers par statut"
          donnees={STATUT_ORDER.map((s) => ({
            label: STATUT_DOSSIER_ECART_LABELS[s],
            valeur: statutCounts[s] ?? 0,
            colorClass: STATUT_DOSSIER_ECART_COLORS[s],
          }))}
        />
        <GraphiqueBarres
          titre="Écarts par statut"
          donnees={STATUT_ORDER.map((s) => ({
            label: STATUT_DOSSIER_ECART_LABELS[s],
            valeur: ecartsStatutCounts[s] ?? 0,
            colorClass: STATUT_DOSSIER_ECART_COLORS[s],
          }))}
        />
        <GraphiqueBarres
          titre="Évènements SSE par statut"
          donnees={STATUT_FICHE_ORDER.map((s) => ({
            label: STATUT_FICHE_LABELS[s],
            valeur: fichesStatutCounts[s] ?? 0,
            colorClass: STATUT_FICHE_COLORS[s],
          }))}
        />
        <GraphiqueBarres
          titre="Écarts amiante par état"
          donnees={["ouvert", "cloture"].map((s) => ({
            label: ECART_AMIANTE_LABELS[s],
            valeur: ecartAmianteCounts[s] ?? 0,
            colorClass: ECART_AMIANTE_COLORS[s],
          }))}
        />
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
