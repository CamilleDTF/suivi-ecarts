import { prisma } from "@/lib/prisma";
import { creerFicheSSE } from "@/app/fiches-sse/actions";

export default async function NouvelleFicheSSEPage({
  searchParams,
}: {
  searchParams: Promise<{ ecartId?: string }>;
}) {
  const { ecartId } = await searchParams;
  const ecart = ecartId
    ? await prisma.ecart.findUnique({ where: { id: ecartId }, include: { dossier: true } })
    : null;
  const now = new Date().toISOString().slice(0, 16);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Nouvelle fiche SSE</h1>
      {ecart && (
        <p className="mb-6 text-sm text-slate-500">
          Rattachée à l&apos;écart {ecart.reference} ({ecart.dossier.chantier})
        </p>
      )}

      <form action={creerFicheSSE} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        {ecartId && <input type="hidden" name="ecartId" value={ecartId} />}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Émetteur</label>
            <input name="emetteur" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nom du chantier</label>
            <input
              name="nomChantier"
              defaultValue={ecart?.dossier.chantier ?? ""}
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
              defaultValue={now}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Lieu / zone</label>
            <input name="lieuZone" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Personnes impliquées</label>
          <input name="personnesImpliquees" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Témoins</label>
          <input name="temoins" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description factuelle</label>
          <textarea
            name="descriptionFactuelle"
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Mesures immédiates prises</label>
          <textarea
            name="mesuresImmediatesPrises"
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Gravité</label>
            <input name="gravite" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fréquence</label>
            <input name="frequence" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Criticité</label>
            <input name="criticite" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <p className="text-xs text-slate-400">
          La fiche est créée en brouillon. Tu pourras la finaliser depuis sa page de détail.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Enregistrer le brouillon
          </button>
        </div>
      </form>
    </div>
  );
}
