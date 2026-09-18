import { prisma } from "@/lib/prisma";
import { creerRex } from "@/app/rex/actions";
import { RexFields } from "@/components/rex-fields";
import { ChoixRattachementAction } from "@/components/choix-rattachement-action";
import { libelleRattachement } from "@/lib/labels";
import { AvertissementNonEnregistre } from "@/components/avertissement-non-enregistre";
import { BoutonRetour } from "@/components/bouton-retour";
import { BoutonCreer } from "@/components/bouton-creer";

export default async function NouveauRexPage({
  searchParams,
}: {
  searchParams: Promise<{
    ecartId?: string;
    ficheSSEId?: string;
    ecartAmianteId?: string;
    remonteeId?: string;
  }>;
}) {
  const { ecartId, ficheSSEId, ecartAmianteId, remonteeId } = await searchParams;

  const fiche = ficheSSEId ? await prisma.ficheSSE.findUnique({ where: { id: ficheSSEId } }) : null;
  const ecartAmiante = !fiche && ecartAmianteId
    ? await prisma.ecartAmiante.findUnique({ where: { id: ecartAmianteId } })
    : null;
  const remontee = !fiche && !ecartAmiante && remonteeId
    ? await prisma.remonteeInfo.findUnique({ where: { id: remonteeId } })
    : null;

  const parentImpose = fiche || ecartAmiante || remontee;
  const [ecarts, evenements, amiantes, remontees] = parentImpose
    ? [[], [], [], []]
    : await Promise.all([
        prisma.ecart.findMany({
          orderBy: { reference: "asc" },
          select: { id: true, reference: true, description: true, dossier: { select: { chantier: true } } },
        }),
        prisma.ficheSSE.findMany({
          orderBy: { reference: "asc" },
          select: { id: true, reference: true, nomChantier: true, descriptionFactuelle: true },
        }),
        prisma.ecartAmiante.findMany({
          orderBy: { reference: "asc" },
          select: { id: true, reference: true, nomChantier: true, description: true },
        }),
        prisma.remonteeInfo.findMany({
          orderBy: { reference: "asc" },
          select: { id: true, reference: true, chantierService: true, objet: true },
        }),
      ]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <BoutonRetour href="/rex" label="Retour aux REX" />
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Nouveau retour d&apos;expérience</h1>

      <form action={creerRex} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6">
        <AvertissementNonEnregistre />

        {fiche ? (
          <div>
            <input type="hidden" name="ficheSSEId" value={fiche.id} />
            <label className="mb-1 block text-sm font-medium text-slate-700">Rattaché à</label>
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Évènement {fiche.reference}
            </p>
          </div>
        ) : ecartAmiante ? (
          <div>
            <input type="hidden" name="ecartAmianteId" value={ecartAmiante.id} />
            <label className="mb-1 block text-sm font-medium text-slate-700">Rattaché à</label>
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Écart amiante {ecartAmiante.reference}
            </p>
          </div>
        ) : remontee ? (
          <div>
            <input type="hidden" name="remonteeId" value={remontee.id} />
            <label className="mb-1 block text-sm font-medium text-slate-700">Rattaché à</label>
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Remontée {remontee.reference} — {remontee.objet}
            </p>
          </div>
        ) : (
          <ChoixRattachementAction
            defaut={ecartId ? "ecart" : undefined}
            preselection={ecartId ? [ecartId] : undefined}
            types={[
              {
                cle: "ecart",
                libelle: "Écart",
                champ: "ecartIds",
                multiple: true,
                options: ecarts.map((e) => ({
                  id: e.id,
                  libelle: libelleRattachement(e.reference, e.dossier?.chantier ?? null, e.description),
                })),
              },
              {
                cle: "evenement",
                libelle: "Évènement SSE",
                champ: "ficheSSEId",
                options: evenements.map((e) => ({
                  id: e.id,
                  libelle: libelleRattachement(e.reference, e.nomChantier, e.descriptionFactuelle),
                })),
              },
              {
                cle: "amiante",
                libelle: "Écart amiante",
                champ: "ecartAmianteId",
                options: amiantes.map((e) => ({
                  id: e.id,
                  libelle: libelleRattachement(e.reference, e.nomChantier, e.description),
                })),
              },
              {
                cle: "remontee",
                libelle: "Remontée",
                champ: "remonteeId",
                options: remontees.map((r) => ({
                  id: r.id,
                  libelle: libelleRattachement(r.reference, r.chantierService, r.objet),
                })),
              },
            ]}
          />
        )}

        <RexFields />

        <div className="flex justify-end gap-3 pt-2">
          <BoutonCreer>Créer le REX</BoutonCreer>
        </div>
      </form>
    </div>
  );
}
