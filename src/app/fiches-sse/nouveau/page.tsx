import { prisma } from "@/lib/prisma";
import { creerFicheSSE } from "@/app/fiches-sse/actions";
import { FicheSSEFields } from "@/components/fiche-sse-fields";
import { ArbreCausesEditeur } from "@/components/arbre-causes-editeur";
import { AvertissementNonEnregistre } from "@/components/avertissement-non-enregistre";
import { calculerCriticite, CRITICITE_VERS_TYPE_ANALYSE } from "@/lib/labels";

export default async function NouvelleFicheSSEPage({
  searchParams,
}: {
  searchParams: Promise<{ ecartId?: string }>;
}) {
  const { ecartId } = await searchParams;
  const ecart = ecartId
    ? await prisma.ecart.findUnique({ where: { id: ecartId }, include: { dossier: true } })
    : null;

  // La cotation de l'écart est reprise telle quelle : c'est le même fait, coté
  // une fois. La criticité qui en découle pré-sélectionne le type d'analyse —
  // un écart élevé impose de remonter aux causes, un écart faible se corrige
  // sur place. Tout reste modifiable avant enregistrement.
  const criticiteHeritee = calculerCriticite(ecart?.gravite ?? "", ecart?.frequence ?? "");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Nouvel évènement SSE</h1>
      {ecart && (
        <p className="mb-6 text-sm text-slate-500">
          Rattaché à l&apos;écart {ecart.reference}
          {ecart.dossier ? ` (${ecart.dossier.chantier})` : ""}
        </p>
      )}

      <form action={creerFicheSSE} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6">
        <AvertissementNonEnregistre />
        {ecartId && <input type="hidden" name="ecartId" value={ecartId} />}

        {/* Un évènement rattaché à un écart hérite de ses domaines et thèmes :
            c'est le même fait qualifié deux fois, et les deux listes d'options
            sont identiques. Les cases restent modifiables. */}
        <FicheSSEFields
          v={{
            dateHeure: new Date(),
            domaine: ecart?.domaines,
            theme: ecart?.theme,
            gravite: ecart?.gravite,
            frequence: ecart?.frequence,
            criticite: criticiteHeritee || undefined,
            typeAnalyse: CRITICITE_VERS_TYPE_ANALYSE[criticiteHeritee],
          }}
          defaultNomChantier={ecart?.dossier?.chantier}
          apresTypeAnalyse={<ArbreCausesEditeur />}
          nouveau
        />

        <p className="text-xs text-slate-400">
          L&apos;évènement est créé en brouillon. Tu pourras le finaliser depuis sa page de détail.
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
