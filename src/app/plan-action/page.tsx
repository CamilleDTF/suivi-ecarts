import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { StatutAction } from "@/generated/prisma/enums";
import { STATUT_ACTION_COLORS, STATUT_ACTION_LABELS, TYPE_ACTION_LABELS, RESPONSABLES } from "@/lib/labels";

export default async function PlanActionPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; responsable?: string }>;
}) {
  const { statut, responsable } = await searchParams;

  const actions = await prisma.action.findMany({
    where: {
      statut: statut ? (statut as StatutAction) : undefined,
      responsable: responsable || undefined,
    },
    orderBy: { echeance: "asc" },
    include: { ecart: { include: { dossier: true } }, ficheSSE: true, ecartAmiante: true },
  });

  const filtreActif = !!statut || !!responsable;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Plan d&apos;action</h1>
        <Link
          href="/plan-action/nouveau"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nouvelle action
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
          <Link href="/plan-action" className="text-sm text-slate-500 hover:underline">
            Réinitialiser
          </Link>
        )}
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Référence</th>
              <th className="px-4 py-3 font-medium">Rattaché à</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Responsable</th>
              <th className="px-4 py-3 font-medium">Échéance</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
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
      </div>
    </div>
  );
}
