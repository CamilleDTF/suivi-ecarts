import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { STATUT_ACTION_COLORS, STATUT_ACTION_LABELS } from "@/lib/labels";
import { mettreAJourStatutAction, mettreAJourAction, supprimerAction } from "@/app/plan-action/actions";
import { StatutAction } from "@/generated/prisma/enums";
import { StatutSelectForm } from "@/components/statut-select-form";
import { FormulaireEditable } from "@/components/formulaire-editable";
import { ActionFields } from "@/components/action-fields";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { BoutonRetour } from "@/components/bouton-retour";

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
    <div className="mx-auto max-w-2xl px-6 py-8">
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
        </div>
        <BoutonSupprimer
          action={supprimerAction}
          hiddenFields={{ id: action.id }}
          message="Supprimer cette action ? Cette action est irréversible."
        />
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
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
