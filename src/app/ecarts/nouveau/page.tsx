import { prisma } from "@/lib/prisma";
import { creerEcart } from "@/app/ecarts/actions";
import { ORIGINE_LABELS, TYPE_ACTIVITE_LABELS, NATURES_OPTIONS, DOMAINES_OPTIONS } from "@/lib/labels";
import { Origine, TypeActivite } from "@/generated/prisma/enums";

export default async function NouvelEcartPage({
  searchParams,
}: {
  searchParams: Promise<{ dossierId?: string }>;
}) {
  const { dossierId } = await searchParams;
  const dossiers = await prisma.dossier.findMany({ orderBy: { createdAt: "desc" } });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Nouvel écart</h1>

      <form action={creerEcart} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
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
            defaultValue={today}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Origine</label>
          <select name="origine" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Gravité potentielle</label>
            <input
              type="text"
              name="gravitePotentielle"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fréquence</label>
            <input
              type="text"
              name="frequence"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
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
