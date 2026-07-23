import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { STATUT_FICHE_COLORS, STATUT_FICHE_LABELS } from "@/lib/labels";
import { mettreAJourFicheSSE, finaliserFicheSSE } from "@/app/fiches-sse/actions";
import { ArbreCauses } from "@/components/arbre-causes";
import { FicheSSEFields } from "@/components/fiche-sse-fields";

export default async function FicheSSEDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fiche = await prisma.ficheSSE.findUnique({
    where: { id },
    include: {
      ecart: { include: { dossier: true } },
      causes: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!fiche) notFound();
  const lecture = fiche.statutFiche === "FINALISEE";

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{fiche.reference}</h1>
            <Badge label={STATUT_FICHE_LABELS[fiche.statutFiche]} colorClass={STATUT_FICHE_COLORS[fiche.statutFiche]} />
          </div>
          {fiche.ecart && (
            <Link href={`/ecarts/${fiche.ecart.id}`} className="text-sm text-slate-500 hover:underline">
              Écart {fiche.ecart.reference} — {fiche.ecart.dossier.chantier}
            </Link>
          )}
        </div>
        {!lecture && (
          <form action={finaliserFicheSSE}>
            <input type="hidden" name="id" value={fiche.id} />
            <button
              type="submit"
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Finaliser l&apos;évènement
            </button>
          </form>
        )}
      </div>

      <form
        action={mettreAJourFicheSSE}
        className="space-y-6 rounded-lg border border-slate-200 bg-white p-6"
      >
        <input type="hidden" name="id" value={fiche.id} />
        <FicheSSEFields
          v={fiche}
          disabled={lecture}
          apresTypeAnalyse={<ArbreCauses ficheSSEId={fiche.id} causes={fiche.causes} disabled={lecture} />}
        />

        {!lecture && (
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Enregistrer le brouillon
            </button>
          </div>
        )}
        {lecture && (
          <p className="text-xs text-slate-400">
            Cet évènement est finalisé et n&apos;est plus modifiable.
          </p>
        )}
      </form>
    </div>
  );
}
