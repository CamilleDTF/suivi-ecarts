import { prisma } from "@/lib/prisma";
import { creerAction } from "@/app/plan-action/actions";
import { TYPE_ACTION_LABELS, RESPONSABLES } from "@/lib/labels";
import { TypeAction } from "@/generated/prisma/enums";
import { BoutonCreer } from "@/components/bouton-creer";
import { BoutonRetour } from "@/components/bouton-retour";
import { ChoixRattachementAction } from "@/components/choix-rattachement-action";
import { ConteneurPage, EntetePage } from "@/components/page-liste";
import { libelleRattachement } from "@/lib/labels";

const inputCls =
  "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const labelCls = "mb-1.5 block text-sm font-medium";
// Parent imposé par l'URL : lu, pas choisi.
const parentCls = "rounded-lg border bg-muted/40 px-2.5 py-1.5 text-sm";

export default async function NouvelleActionPage({
  searchParams,
}: {
  searchParams: Promise<{
    ecartId?: string;
    ficheSSEId?: string;
    ecartAmianteId?: string;
    remonteeId?: string;
    rexId?: string;
  }>;
}) {
  const { ecartId, ficheSSEId, ecartAmianteId, remonteeId, rexId } = await searchParams;

  const fiche = ficheSSEId
    ? await prisma.ficheSSE.findUnique({ where: { id: ficheSSEId } })
    : null;
  const ecartAmiante = !fiche && ecartAmianteId
    ? await prisma.ecartAmiante.findUnique({ where: { id: ecartAmianteId } })
    : null;

  const remontee = !fiche && !ecartAmiante && remonteeId
    ? await prisma.remonteeInfo.findUnique({ where: { id: remonteeId } })
    : null;

  const rex = !fiche && !ecartAmiante && !remontee && rexId
    ? await prisma.rex.findUnique({ where: { id: rexId }, select: { id: true, reference: true, titre: true } })
    : null;

  // Sans parent imposé par l'URL, les cinq rattachements possibles sont
  // proposés : l'écran n'offrait que les écarts.
  const parentImpose = fiche || ecartAmiante || remontee || rex;
  const [ecarts, evenements, amiantes, remontees, rexListe] = parentImpose
    ? [[], [], [], [], []]
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
        prisma.rex.findMany({
          orderBy: { reference: "asc" },
          select: { id: true, reference: true, titre: true },
        }),
      ]);

  // Le retour mène au parent quand l'URL en désigne un (« + Action » depuis sa
  // fiche), au plan d'action sinon.
  const retour = fiche
    ? { href: `/fiches-sse/${fiche.id}`, label: "Retour à l'évènement SSE" }
    : ecartAmiante
      ? { href: `/ecart-amiante/${ecartAmiante.id}`, label: "Retour à l'écart amiante" }
      : remontee
        ? { href: `/remontees/${remontee.id}`, label: "Retour à la remontée" }
        : rex
          ? { href: `/rex/${rex.id}`, label: "Retour au REX" }
          : ecartId
            ? { href: `/ecarts/${ecartId}`, label: "Retour à l'écart" }
            : { href: "/plan-action", label: "Retour au plan d'action" };

  return (
    <ConteneurPage largeur="formulaire">
      <BoutonRetour href={retour.href} label={retour.label} />
      <EntetePage titre="Nouvelle action" />

      <form action={creerAction} className="space-y-4 rounded-xl border bg-card p-6">
        {fiche ? (
          <div>
            <input type="hidden" name="ficheSSEId" value={fiche.id} />
            <label className={labelCls}>Rattachée à</label>
            <p className={parentCls}>Évènement {fiche.reference}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cette action sera rattachée uniquement à l&apos;évènement, pas à l&apos;écart ou l&apos;écart amiante lié.
            </p>
          </div>
        ) : ecartAmiante ? (
          <div>
            <input type="hidden" name="ecartAmianteId" value={ecartAmiante.id} />
            <label className={labelCls}>Rattachée à</label>
            <p className={parentCls}>Écart amiante {ecartAmiante.reference}</p>
          </div>
        ) : remontee ? (
          <div>
            <input type="hidden" name="remonteeId" value={remontee.id} />
            <label className={labelCls}>Rattachée à</label>
            <p className={parentCls}>
              Remontée {remontee.reference} — {remontee.objet}
            </p>
          </div>
        ) : rex ? (
          <div>
            <input type="hidden" name="rexId" value={rex.id} />
            <label className={labelCls}>Rattachée à</label>
            <p className={parentCls}>
              REX {rex.reference} — {rex.titre}
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
              {
                cle: "rex",
                libelle: "REX",
                champ: "rexId",
                options: rexListe.map((r) => ({
                  id: r.id,
                  libelle: libelleRattachement(r.reference, null, r.titre),
                })),
              },
            ]}
          />
        )}

        <div>
          <label className={labelCls}>Type</label>
          <select name="type" required className={inputCls}>
            {Object.values(TypeAction).map((t) => (
              <option key={t} value={t}>
                {TYPE_ACTION_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Action</label>
          <textarea name="action" required rows={3} className={inputCls} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Responsable</label>
            <select name="responsable" required className={inputCls}>
              {RESPONSABLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Échéance</label>
            <input type="date" name="echeance" className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Réalisé le</label>
          <input type="date" name="realiseeLe" className={inputCls} />
          <p className="mt-1 text-xs text-muted-foreground">Une date fait passer l&apos;action à « Réalisée ».</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <BoutonCreer>Créer l&apos;action</BoutonCreer>
        </div>
      </form>
    </ConteneurPage>
  );
}
