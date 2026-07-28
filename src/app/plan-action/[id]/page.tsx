import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { STATUT_ACTION_COLORS, STATUT_ACTION_LABELS, libelleRattachement } from "@/lib/labels";
import {
  mettreAJourStatutAction,
  mettreAJourAction,
  supprimerAction,
  changerRattachementAction,
} from "@/app/plan-action/actions";
import { ChangerRattachement } from "@/components/changer-rattachement";
import { StatutAction } from "@/generated/prisma/enums";
import { StatutSelectForm } from "@/components/statut-select-form";
import { FormulaireEditable } from "@/components/formulaire-editable";
import { ActionFields } from "@/components/action-fields";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { BoutonRetour } from "@/components/bouton-retour";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";

// Le navigateur nomme le PDF d’après le titre du document : sans titre
// propre à la fiche, tous les exports s’enregistreraient sous le même nom.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fiche = await prisma.action.findUnique({ where: { id }, select: { reference: true } });
  return { title: fiche ? `Action ${fiche.reference}` : "Action" };
}

export default async function ActionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const action = await prisma.action.findUnique({
    where: { id },
    include: { ecart: { include: { dossier: true } }, ficheSSE: true, ecartAmiante: true },
  });

  if (!action) notFound();

  // Listes proposées pour corriger un rattachement erroné.
  const [ecartsChoix, evenementsChoix, amianteChoix] = await Promise.all([
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
      select: { id: true, reference: true, nomChantier: true, numeroChantier: true, description: true },
    }),
  ]);

  const retourHref = action.ecart
    ? `/ecarts/${action.ecart.id}`
    : action.ficheSSE
      ? `/fiches-sse/${action.ficheSSE.id}`
      : action.ecartAmiante
        ? `/ecart-amiante/${action.ecartAmiante.id}`
        : "/plan-action";
  const retourLabel = action.ecart
    ? "Retour à l'écart"
    : action.ficheSSE
      ? "Retour à l'évènement SSE"
      : action.ecartAmiante
        ? "Retour à l'écart amiante"
        : "Retour au plan d'action";

  return (
    <div className="mx-auto max-w-[100rem] px-6 py-8">
      <BoutonRetour href={retourHref} label={retourLabel} />
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{action.reference}</h1>
            <Badge label={STATUT_ACTION_LABELS[action.statut]} colorClass={STATUT_ACTION_COLORS[action.statut]} />
          </div>
          {action.ecart ? (
            <Link href={`/ecarts/${action.ecart.id}`} className="text-sm text-slate-500 hover:underline">
              Écart {action.ecart.reference} — {action.ecart.dossier.chantier}
            </Link>
          ) : action.ficheSSE ? (
            <Link href={`/fiches-sse/${action.ficheSSE.id}`} className="text-sm text-slate-500 hover:underline">
              Évènement SSE {action.ficheSSE.reference}
            </Link>
          ) : action.ecartAmiante ? (
            <Link href={`/ecart-amiante/${action.ecartAmiante.id}`} className="text-sm text-slate-500 hover:underline">
              Écart amiante {action.ecartAmiante.reference}
            </Link>
          ) : null}
          <div data-no-print className="mt-1">
            <ChangerRattachement
              action={changerRattachementAction}
              hiddenFields={{ id: action.id }}
              autoriserAucun={false}
              types={[
                {
                  cle: "ecart",
                  libelle: "Écart",
                  champ: "ecartId",
                  valeurActuelle: action.ecartId,
                  options: ecartsChoix.map((e) => ({
                    id: e.id,
                    libelle: libelleRattachement(e.reference, e.dossier.chantier, e.description),
                  })),
                },
                {
                  cle: "evenement",
                  libelle: "Évènement SSE",
                  champ: "ficheSSEId",
                  valeurActuelle: action.ficheSSEId,
                  options: evenementsChoix.map((e) => ({
                    id: e.id,
                    libelle: libelleRattachement(e.reference, e.nomChantier, e.descriptionFactuelle),
                  })),
                },
                {
                  cle: "amiante",
                  libelle: "Écart amiante",
                  champ: "ecartAmianteId",
                  valeurActuelle: action.ecartAmianteId,
                  options: amianteChoix.map((e) => ({
                    id: e.id,
                    libelle: libelleRattachement(e.reference, `${e.nomChantier} (${e.numeroChantier})`, e.description),
                  })),
                },
              ]}
            />
          </div>
        </div>
        <div data-no-print className="flex shrink-0 flex-wrap justify-end gap-2">
          <BoutonExportPDF />
          <BoutonSupprimer
            action={supprimerAction}
            hiddenFields={{ id: action.id }}
            message="Supprimer cette action ? Cette action est irréversible."
          />
        </div>
      </div>

      <div data-no-print className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <StatutSelectForm
          action={mettreAJourStatutAction}
          hiddenName="id"
          hiddenValue={action.id}
          selectName="statut"
          defaultValue={action.statut}
          options={Object.values(StatutAction).map((s) => ({
            value: s,
            label: STATUT_ACTION_LABELS[s],
          }))}
        />
      </div>

      <FormulaireEditable
        action={mettreAJourAction}
        hiddenFields={{ id: action.id }}
        modifiePar={action.modifiePar}
        modifieLe={action.modifieLe}
      >
        <ActionFields v={action} />
      </FormulaireEditable>
    </div>
  );
}
