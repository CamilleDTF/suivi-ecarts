import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { STATUT_FICHE_COLORS, STATUT_FICHE_LABELS } from "@/lib/labels";

export default async function FichesSSEPage() {
  const fiches = await prisma.ficheSSE.findMany({
    orderBy: { createdAt: "desc" },
    include: { ecart: { include: { dossier: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Fiches SSE</h1>
        <Link
          href="/fiches-sse/nouveau"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nouvelle fiche SSE
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Référence</th>
              <th className="px-4 py-3 font-medium">Écart lié</th>
              <th className="px-4 py-3 font-medium">Chantier</th>
              <th className="px-4 py-3 font-medium">Émetteur</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {fiches.map((f) => (
              <tr key={f.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/fiches-sse/${f.id}`} className="font-medium text-blue-700 hover:underline">
                    {f.reference}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {f.ecart ? (
                    <Link href={`/ecarts/${f.ecart.id}`} className="text-slate-600 hover:underline">
                      {f.ecart.reference}
                    </Link>
                  ) : (
                    <span className="text-slate-400">Aucun</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">{f.nomChantier || "—"}</td>
                <td className="px-4 py-3 text-slate-700">{f.emetteur || "—"}</td>
                <td className="px-4 py-3">
                  <Badge label={STATUT_FICHE_LABELS[f.statutFiche]} colorClass={STATUT_FICHE_COLORS[f.statutFiche]} />
                </td>
              </tr>
            ))}
            {fiches.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Aucune fiche SSE pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
