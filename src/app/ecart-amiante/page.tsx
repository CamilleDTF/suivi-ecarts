import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";

export default async function EcartAmiantePage() {
  const ecarts = await prisma.ecartAmiante.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Écarts amiante</h1>
        <Link
          href="/ecart-amiante/nouveau"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nouvel écart amiante
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Référence</th>
              <th className="px-4 py-3 font-medium">Chantier</th>
              <th className="px-4 py-3 font-medium">Conducteur</th>
              <th className="px-4 py-3 font-medium">Chef</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {ecarts.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/ecart-amiante/${e.id}`} className="font-medium text-blue-700 hover:underline">
                    {e.reference}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {e.nomChantier} <span className="text-slate-400">({e.numeroChantier})</span>
                </td>
                <td className="px-4 py-3 text-slate-700">{e.conducteur}</td>
                <td className="px-4 py-3 text-slate-700">{e.chef}</td>
                <td className="px-4 py-3">
                  <Badge
                    label={e.clotureEcartAmiante ? "Clôturé" : "Ouvert"}
                    colorClass={e.clotureEcartAmiante ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}
                  />
                </td>
                <td className="px-4 py-3 text-slate-500">{e.date.toLocaleDateString("fr-FR")}</td>
              </tr>
            ))}
            {ecarts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Aucun écart amiante pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
