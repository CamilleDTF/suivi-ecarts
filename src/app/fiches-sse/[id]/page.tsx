import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { STATUT_FICHE_COLORS, STATUT_FICHE_LABELS } from "@/lib/labels";
import { mettreAJourFicheSSE, finaliserFicheSSE } from "@/app/fiches-sse/actions";

function toDatetimeLocal(d: Date | null) {
  if (!d) return "";
  return d.toISOString().slice(0, 16);
}

export default async function FicheSSEDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fiche = await prisma.ficheSSE.findUnique({
    where: { id },
    include: { ecart: { include: { dossier: true } } },
  });

  if (!fiche) notFound();
  const lecture = fiche.statutFiche === "FINALISEE";

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
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
              Finaliser la fiche
            </button>
          </form>
        )}
      </div>

      <form
        action={mettreAJourFicheSSE}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6"
      >
        <input type="hidden" name="id" value={fiche.id} />
        <fieldset disabled={lecture} className="space-y-4 disabled:opacity-60">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Émetteur</label>
              <input
                name="emetteur"
                defaultValue={fiche.emetteur ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nom du chantier</label>
              <input
                name="nomChantier"
                defaultValue={fiche.nomChantier ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date et heure</label>
              <input
                type="datetime-local"
                name="dateHeure"
                defaultValue={toDatetimeLocal(fiche.dateHeure)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Lieu / zone</label>
              <input
                name="lieuZone"
                defaultValue={fiche.lieuZone ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Personnes impliquées</label>
            <input
              name="personnesImpliquees"
              defaultValue={fiche.personnesImpliquees ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Témoins</label>
            <input
              name="temoins"
              defaultValue={fiche.temoins ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description factuelle</label>
            <textarea
              name="descriptionFactuelle"
              rows={3}
              defaultValue={fiche.descriptionFactuelle ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mesures immédiates prises</label>
            <textarea
              name="mesuresImmediatesPrises"
              rows={2}
              defaultValue={fiche.mesuresImmediatesPrises ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Gravité</label>
              <input
                name="gravite"
                defaultValue={fiche.gravite ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Fréquence</label>
              <input
                name="frequence"
                defaultValue={fiche.frequence ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Criticité</label>
              <input
                name="criticite"
                defaultValue={fiche.criticite ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </fieldset>

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
            Cette fiche est finalisée et n&apos;est plus modifiable.
          </p>
        )}
      </form>
    </div>
  );
}
