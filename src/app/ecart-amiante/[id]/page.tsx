import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { STATUT_FICHE_COLORS, STATUT_FICHE_LABELS } from "@/lib/labels";
import { EcartAmianteFields } from "@/components/ecart-amiante-fields";
import {
  mettreAJourEcartAmiante,
  cloturerEcartAmiante,
  creerFicheSSEDepuisAmiante,
} from "@/app/ecart-amiante/actions";

export default async function EcartAmianteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ecartAmiante = await prisma.ecartAmiante.findUnique({
    where: { id },
    include: { fichesSSE: { orderBy: { createdAt: "desc" } } },
  });

  if (!ecartAmiante) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{ecartAmiante.reference}</h1>
            <Badge
              label={ecartAmiante.clotureEcartAmiante ? "Clôturé" : "Ouvert"}
              colorClass={
                ecartAmiante.clotureEcartAmiante
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }
            />
          </div>
          <p className="text-sm text-slate-500">
            {ecartAmiante.nomChantier} ({ecartAmiante.numeroChantier}) — {ecartAmiante.date.toLocaleDateString("fr-FR")}
          </p>
        </div>
        <div className="flex gap-2">
          {ecartAmiante.evenementSSE && (
            <form action={creerFicheSSEDepuisAmiante}>
              <input type="hidden" name="ecartAmianteId" value={ecartAmiante.id} />
              <button
                type="submit"
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                + Évènement SSE
              </button>
            </form>
          )}
          <form action={cloturerEcartAmiante}>
            <input type="hidden" name="id" value={ecartAmiante.id} />
            <input type="hidden" name="cloture" value={(!ecartAmiante.clotureEcartAmiante).toString()} />
            <button
              type="submit"
              className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                ecartAmiante.clotureEcartAmiante
                  ? "bg-slate-500 hover:bg-slate-600"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {ecartAmiante.clotureEcartAmiante ? "Rouvrir" : "Clôturer"}
            </button>
          </form>
        </div>
      </div>

      {ecartAmiante.fichesSSE.length > 0 && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Évènements SSE liés</h2>
          <ul className="space-y-1">
            {ecartAmiante.fichesSSE.map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-sm">
                <Link href={`/fiches-sse/${f.id}`} className="font-medium text-blue-700 hover:underline">
                  {f.reference}
                </Link>
                <Badge label={STATUT_FICHE_LABELS[f.statutFiche]} colorClass={STATUT_FICHE_COLORS[f.statutFiche]} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        action={mettreAJourEcartAmiante}
        className="space-y-6 rounded-lg border border-slate-200 bg-white p-6"
      >
        <input type="hidden" name="id" value={ecartAmiante.id} />
        <EcartAmianteFields v={ecartAmiante} disabled={ecartAmiante.clotureEcartAmiante} />

        {!ecartAmiante.clotureEcartAmiante && (
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Enregistrer
            </button>
          </div>
        )}
        {ecartAmiante.clotureEcartAmiante && (
          <p className="text-xs text-slate-400">
            Cet écart est clôturé et n&apos;est plus modifiable — clique sur &quot;Rouvrir&quot; pour le modifier.
          </p>
        )}
      </form>
    </div>
  );
}
