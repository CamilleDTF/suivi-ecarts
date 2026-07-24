import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import {
  STATUT_FICHE_COLORS,
  STATUT_FICHE_LABELS,
  STATUT_DOSSIER_ECART_COLORS,
  STATUT_DOSSIER_ECART_LABELS,
  TYPE_ACTION_LABELS,
  STATUT_ACTION_COLORS,
  STATUT_ACTION_LABELS,
} from "@/lib/labels";
import { EcartAmianteFields } from "@/components/ecart-amiante-fields";
import {
  mettreAJourEcartAmiante,
  mettreAJourStatutEcartAmiante,
  creerFicheSSEDepuisAmiante,
  supprimerEcartAmiante,
} from "@/app/ecart-amiante/actions";
import { StatutDossierEcart } from "@/generated/prisma/enums";
import { StatutSelectForm } from "@/components/statut-select-form";
import { FormulaireEditable } from "@/components/formulaire-editable";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { BoutonRetour } from "@/components/bouton-retour";
import { compterImpactSuppressionEcartAmiante } from "@/lib/suppression";

export default async function EcartAmianteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ecartAmiante = await prisma.ecartAmiante.findUnique({
    where: { id },
    include: {
      fichesSSE: { orderBy: { createdAt: "desc" } },
      actions: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!ecartAmiante) notFound();

  const impact = await compterImpactSuppressionEcartAmiante(ecartAmiante.id);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <BoutonRetour href="/ecart-amiante" label="Retour aux écarts amiante" />
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{ecartAmiante.reference}</h1>
            <Badge
              label={STATUT_DOSSIER_ECART_LABELS[ecartAmiante.statut]}
              colorClass={STATUT_DOSSIER_ECART_COLORS[ecartAmiante.statut]}
            />
          </div>
          <p className="text-sm text-slate-500">
            {ecartAmiante.nomChantier} ({ecartAmiante.numeroChantier}) — {ecartAmiante.date.toLocaleDateString("fr-FR")}
          </p>
        </div>
        <div className="flex gap-2">
          {ecartAmiante.evenementSSE && (
            <form action={creerFicheSSEDepuisAmiante}>
              <input type="hidden" name="ecartAmianteId" value={ecartAmiante.id} />
              <button
                type="submit"
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                + Évènement SSE
              </button>
            </form>
          )}
          <Link
            href={`/plan-action/nouveau?ecartAmianteId=${ecartAmiante.id}`}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Action
          </Link>
          <BoutonSupprimer
            action={supprimerEcartAmiante}
            hiddenFields={{ id: ecartAmiante.id }}
            message={`Supprimer cet écart amiante supprimera aussi ${impact.fiches} évènement(s) SSE et ${impact.actions} action(s) lié(s). Cette action est irréversible. Continuer ?`}
          />
        </div>
      </div>

      {ecartAmiante.fichesSSE.length > 0 && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Évènements SSE liés</h2>
          <ul className="space-y-1">
            {ecartAmiante.fichesSSE.map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-sm">
                <Link href={`/fiches-sse/${f.id}`} className="font-medium text-blue-700 hover:underline">
                  {f.reference}
                </Link>
                <Badge label={STATUT_FICHE_LABELS[f.statutFiche]} colorClass={STATUT_FICHE_COLORS[f.statutFiche]} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <StatutSelectForm
          action={mettreAJourStatutEcartAmiante}
          hiddenName="id"
          hiddenValue={ecartAmiante.id}
          selectName="statut"
          defaultValue={ecartAmiante.statut}
          options={Object.values(StatutDossierEcart)
            .filter((s) => s !== "A_QUALIFIER")
            .map((s) => ({ value: s, label: STATUT_DOSSIER_ECART_LABELS[s] }))}
        />
      </div>

      <FormulaireEditable
        action={mettreAJourEcartAmiante}
        hiddenFields={{ id: ecartAmiante.id }}
        modifiePar={ecartAmiante.modifiePar}
        modifieLe={ecartAmiante.modifieLe}
      >
        <EcartAmianteFields v={ecartAmiante} />
      </FormulaireEditable>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Plan d&apos;action ({ecartAmiante.actions.length})
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Référence</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Responsable</th>
                <th className="px-4 py-3 font-medium">Échéance</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {ecartAmiante.actions.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/plan-action/${a.id}`} className="font-medium text-blue-700 hover:underline">
                      {a.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{TYPE_ACTION_LABELS[a.type]}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-700">{a.action}</td>
                  <td className="px-4 py-3 text-slate-700">{a.responsable}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {a.echeance ? a.echeance.toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={STATUT_ACTION_LABELS[a.statut]} colorClass={STATUT_ACTION_COLORS[a.statut]} />
                  </td>
                </tr>
              ))}
              {ecartAmiante.actions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    Aucune action.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
