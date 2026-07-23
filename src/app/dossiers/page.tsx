import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import {
  ORIGINE_LABELS,
  STATUT_DOSSIER_ECART_COLORS,
  STATUT_DOSSIER_ECART_LABELS,
} from "@/lib/labels";

export default async function DossiersPage() {
  const dossiers = await prisma.dossier.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { ecarts: true } } },
  });

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
                  Aucun dossier pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
