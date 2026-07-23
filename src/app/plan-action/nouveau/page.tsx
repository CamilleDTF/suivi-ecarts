import { prisma } from "@/lib/prisma";
import { creerAction } from "@/app/plan-action/actions";
import { TYPE_ACTION_LABELS, RESPONSABLES } from "@/lib/labels";
import { TypeAction } from "@/generated/prisma/enums";

export default async function NouvelleActionPage({
  searchParams,
}: {
  searchParams: Promise<{ ecartId?: string; ficheSSEId?: string; ecartAmianteId?: string }>;
}) {
  const { ecartId, ficheSSEId, ecartAmianteId } = await searchParams;

  const fiche = ficheSSEId
    ? await prisma.ficheSSE.findUnique({ where: { id: ficheSSEId } })
    : null;
  const ecartAmiante = !fiche && ecartAmianteId
    ? await prisma.ecartAmiante.findUnique({ where: { id: ecartAmianteId } })
    : null;

  const ecarts = fiche || ecartAmiante
    ? []
    : await prisma.ecart.findMany({
        orderBy: { createdAt: "desc" },
        include: { dossier: true },
      });

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
        ) : (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Écart</label>
            <select
              name="ecartId"
              required
              defaultValue={ecartId ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Sélectionner un écart
              </option>
              {ecarts.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.reference} — {e.dossier.chantier}
                </option>
              ))}
            </select>
          </div>
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

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="obligatoire" />
          Action obligatoire
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Créer l&apos;action
          </button>
        </div>
      </form>
    </div>
  );
}
