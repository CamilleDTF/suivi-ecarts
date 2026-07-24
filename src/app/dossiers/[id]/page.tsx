import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { STATUT_DOSSIER_ECART_COLORS, STATUT_DOSSIER_ECART_LABELS } from "@/lib/labels";
import { mettreAJourStatutDossier, mettreAJourDossier, supprimerDossier } from "@/app/dossiers/actions";
import { StatutDossierEcart } from "@/generated/prisma/enums";
import { StatutSelectForm } from "@/components/statut-select-form";
import { FormulaireEditable } from "@/components/formulaire-editable";
import { DossierFields } from "@/components/dossier-fields";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { BoutonRetour } from "@/components/bouton-retour";
import { compterImpactSuppressionDossier } from "@/lib/suppression";

export default async function DossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dossier = await prisma.dossier.findUnique({
    where: { id },
    include: { ecarts: { orderBy: { createdAt: "desc" } } },
  });

  if (!dossier) notFound();

  const impact = await compterImpactSuppressionDossier(dossier.id);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <BoutonRetour href="/dossiers" label="Retour aux dossiers" />
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{dossier.reference}</h1>
            <Badge
              label={STATUT_DOSSIER_ECART_LABELS[dossier.statut]}
              colorClass={STATUT_DOSSIER_ECART_COLORS[dossier.statut]}
            />
          </div>
          <p className="text-sm text-slate-500">{dossier.chantier}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/ecarts/nouveau?dossierId=${dossier.id}`}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Nouvel écart
          </Link>
          <BoutonSupprimer
            action={supprimerDossier}
            hiddenFields={{ id: dossier.id }}
            message={`Supprimer ce dossier supprimera aussi ses ${impact.ecarts} écart(s), ${impact.fiches} évènement(s) SSE et ${impact.actions} action(s) lié(s). Cette action est irréversible. Continuer ?`}
          />
        </div>
      </div>

      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-4">
        <StatutSelectForm
          action={mettreAJourStatutDossier}
          hiddenName="id"
          hiddenValue={dossier.id}
          selectName="statut"
          defaultValue={dossier.statut}
          options={Object.values(StatutDossierEcart)
            .filter((s) => s !== "A_QUALIFIER")
            .map((s) => ({
            value: s,
            label: STATUT_DOSSIER_ECART_LABELS[s],
          }))}
        />
      </div>

      <div className="mb-8">
        <FormulaireEditable
          action={mettreAJourDossier}
          hiddenFields={{ id: dossier.id }}
          modifiePar={dossier.modifiePar}
          modifieLe={dossier.modifieLe}
        >
          <DossierFields v={dossier} />
        </FormulaireEditable>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        Écarts ({dossier.ecarts.length})
      </h2>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Référence</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Détecté le</th>
            </tr>
          </thead>
          <tbody>
            {dossier.ecarts.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/ecarts/${e.id}`} className="font-medium text-blue-700 hover:underline">
                    {e.reference}
                  </Link>
                </td>
                <td className="max-w-md truncate px-4 py-3 text-slate-700">{e.description}</td>
                <td className="px-4 py-3">
                  <Badge
                    label={STATUT_DOSSIER_ECART_LABELS[e.statut]}
                    colorClass={STATUT_DOSSIER_ECART_COLORS[e.statut]}
                  />
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {e.dateDetection.toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
            {dossier.ecarts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Aucun écart pour ce dossier.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
