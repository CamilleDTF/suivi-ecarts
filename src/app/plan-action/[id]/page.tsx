import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { STATUT_ACTION_COLORS, STATUT_ACTION_LABELS, TYPE_ACTION_LABELS, RESPONSABLES } from "@/lib/labels";
import { mettreAJourStatutAction, mettreAJourAction } from "@/app/plan-action/actions";
import { StatutAction, TypeAction } from "@/generated/prisma/enums";
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

  const responsables = RESPONSABLES.includes(action.responsable)
    ? RESPONSABLES
    : [action.responsable, ...RESPONSABLES];

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

      <form action={mettreAJourAction} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <input type="hidden" name="id" value={action.id} />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
          <select
            name="type"
            defaultValue={action.type}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
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
            defaultValue={action.action}
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
              defaultValue={action.responsable}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {responsables.map((r) => (
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
              defaultValue={action.echeance ? action.echeance.toISOString().slice(0, 10) : ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="obligatoire" defaultChecked={action.obligatoire} />
          Action obligatoire
        </label>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Preuve</label>
          <input
            name="preuve"
            defaultValue={action.preuve ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Vérification d&apos;efficacité</label>
          <input
            name="verifEfficacite"
            defaultValue={action.verifEfficacite ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
