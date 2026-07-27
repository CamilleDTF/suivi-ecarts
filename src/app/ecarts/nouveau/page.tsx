import { prisma } from "@/lib/prisma";
import { creerEcart } from "@/app/ecarts/actions";
import {
  ORIGINE_LABELS,
  TYPE_ACTIVITE_LABELS,
  NATURES_OPTIONS,
  DOMAINES_OPTIONS,
  GRAVITE_FREQUENCE_OPTIONS,
} from "@/lib/labels";
import { Origine, TypeActivite } from "@/generated/prisma/enums";

export default async function NouvelEcartPage({
  searchParams,
}: {
  searchParams: Promise<{ dossierId?: string; remonteeId?: string }>;
}) {
  const { dossierId, remonteeId } = await searchParams;
  const [dossiers, remontee] = await Promise.all([
    prisma.dossier.findMany({ orderBy: { createdAt: "desc" } }),
    remonteeId ? prisma.remonteeInfo.findUnique({ where: { id: remonteeId } }) : null,
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const dossierSelectionne = dossierId ? dossiers.find((d) => d.id === dossierId) : undefined;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Nouvel écart</h1>
      {remontee && (
        <p className="mb-6 text-sm text-slate-500">
          Créé à partir de la remontée {remontee.reference} — {remontee.objet}. Choisissez le dossier
          de rattachement : la remontée passera ensuite en « Transformée en écart ».
        </p>
      )}

      <form action={creerEcart} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        {remonteeId && <input type="hidden" name="remonteeId" value={remonteeId} />}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Dossier</label>
          <select
            name="dossierId"
            required
            defaultValue={dossierId ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Sélectionner un dossier
            </option>
            {dossiers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.reference} — {d.chantier}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Date de détection
          </label>
          <input
            type="date"
            name="dateDetection"
            defaultValue={remontee ? remontee.dateRemontee.toISOString().slice(0, 10) : today}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Origine</label>
          <select
            name="origine"
            required
            defaultValue={dossierSelectionne?.origine ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {Object.values(Origine).map((o) => (
              <option key={o} value={o}>
                {ORIGINE_LABELS[o]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Déclarant</label>
          <input
            type="text"
            name="declarant"
            defaultValue={remontee?.personneRemontant ?? ""}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Type d&apos;activité</label>
          <select name="typeActivite" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {Object.values(TypeActivite).map((t) => (
              <option key={t} value={t}>
                {TYPE_ACTIVITE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="mb-1 text-sm font-medium text-slate-700">Nature(s)</legend>
          <div className="grid grid-cols-2 gap-1">
            {NATURES_OPTIONS.map((n) => (
              <label key={n} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="natures" value={n} />
                {n}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm font-medium text-slate-700">Domaine(s)</legend>
          <div className="grid grid-cols-2 gap-1">
            {DOMAINES_OPTIONS.map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="domaines" value={d} />
                {d}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={remontee ? [remontee.objet, remontee.description].filter(Boolean).join("\n\n") : ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Mesure immédiate</label>
          <textarea
            name="mesureImmediate"
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Gravité</label>
            <select name="gravite" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">—</option>
              {GRAVITE_FREQUENCE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fréquence</label>
            <select name="frequence" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">—</option>
              {GRAVITE_FREQUENCE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Créer l&apos;écart
          </button>
        </div>
      </form>
    </div>
  );
}
