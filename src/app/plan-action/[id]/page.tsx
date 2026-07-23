import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { STATUT_ACTION_COLORS, STATUT_ACTION_LABELS, TYPE_ACTION_LABELS } from "@/lib/labels";
import { mettreAJourStatutAction } from "@/app/plan-action/actions";
import { StatutAction } from "@/generated/prisma/enums";
import { StatutSelectForm } from "@/components/statut-select-form";

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

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6">
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

      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <div className="text-xs font-medium uppercase text-slate-400">Type</div>
          <div className="text-sm text-slate-800">{TYPE_ACTION_LABELS[action.type]}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-slate-400">Action</div>
          <div className="text-sm text-slate-800">{action.action}</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-medium uppercase text-slate-400">Responsable</div>
            <div className="text-sm text-slate-800">{action.responsable}</div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase text-slate-400">Échéance</div>
            <div className="text-sm text-slate-800">
              {action.echeance ? action.echeance.toLocaleDateString("fr-FR") : "—"}
            </div>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-slate-400">Obligatoire</div>
          <div className="text-sm text-slate-800">{action.obligatoire ? "Oui" : "Non"}</div>
        </div>

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
    </div>
  );
}
