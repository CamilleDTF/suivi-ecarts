import { prisma } from "@/lib/prisma";
import { creerAction } from "@/app/plan-action/actions";
import { TYPE_ACTION_LABELS, RESPONSABLES } from "@/lib/labels";
import { TypeAction } from "@/generated/prisma/enums";
import { BoutonCreer } from "@/components/bouton-creer";
import { ChoixRattachementAction } from "@/components/choix-rattachement-action";
import { libelleRattachement } from "@/lib/labels";

export default async function NouvelleActionPage({
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

  const fiche = ficheSSEId
    ? await prisma.ficheSSE.findUnique({ where: { id: ficheSSEId } })
    : null;
  const ecartAmiante = !fiche && ecartAmianteId
    ? await prisma.ecartAmiante.findUnique({ where: { id: ecartAmianteId } })
    : null;

  const remontee = !fiche && !ecartAmiante && remonteeId
    ? await prisma.remonteeInfo.findUnique({ where: { id: remonteeId } })
    : null;

  // Sans parent imposé par l'URL, les quatre rattachements possibles sont
  // proposés : l'écran n'offrait que les écarts.
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
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Nouvelle action</h1>

      <form action={creerAction} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        {fiche ? (
          <div>
            <input type="hidden" name="ficheSSEId" value={fiche.id} />
            <label className="mb-1 block text-sm font-medium text-slate-700">Rattachée à</label>
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Évènement {fiche.reference}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Cette action sera rattachée uniquement à l&apos;évènement, pas à l&apos;écart ou l&apos;écart amiante lié.
            </p>
          </div>
        ) : ecartAmiante ? (
          <div>
            <input type="hidden" name="ecartAmianteId" value={ecartAmiante.id} />
            <label className="mb-1 block text-sm font-medium text-slate-700">Rattachée à</label>
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Écart amiante {ecartAmiante.reference}
            </p>
          </div>
        ) : remontee ? (
          <div>
            <input type="hidden" name="remonteeId" value={remontee.id} />
            <label className="mb-1 block text-sm font-medium text-slate-700">Rattachée à</label>
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Remontée {remontee.reference} — {remontee.objet}
            </p>
          </div>
        ) : (
          <ChoixRattachementAction
            defaut={ecartId ? "ecart" : undefined}
            types={[
              {
                cle: "ecart",
                libelle: "Écart",
                champ: "ecartId",
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

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
          <select name="type" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {Object.values(TypeAction).map((t) => (
              <option key={t} value={t}>
                {TYPE_ACTION_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Action</label>
          <textarea
            name="action"
            required
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Responsable</label>
            <select
              name="responsable"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {RESPONSABLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Échéance</label>
            <input
              type="date"
              name="echeance"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Réalisé le</label>
          <input
            type="date"
            name="realiseeLe"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate-400">Une date fait passer l&apos;action à « Réalisée ».</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <BoutonCreer>Créer l&apos;action</BoutonCreer>
        </div>
      </form>
    </div>
  );
}
