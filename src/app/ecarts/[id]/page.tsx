import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import {
  STATUT_DOSSIER_ECART_COLORS,
  STATUT_DOSSIER_ECART_LABELS,
  STATUT_FICHE_COLORS,
  STATUT_FICHE_LABELS,
  TYPE_ACTION_LABELS,
  STATUT_ACTION_COLORS,
  STATUT_ACTION_LABELS,
} from "@/lib/labels";
import {
  mettreAJourStatutEcart,
  mettreAJourEcart,
  supprimerEcart,
  changerRattachementEcart,
} from "@/app/ecarts/actions";
import { ChangerRattachement } from "@/components/changer-rattachement";
import { StatutDossierEcart } from "@/generated/prisma/enums";
import { StatutSelectForm } from "@/components/statut-select-form";
import { EcartFields } from "@/components/ecart-fields";
import { FormulaireEditable } from "@/components/formulaire-editable";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { BoutonArchiver } from "@/components/bouton-archiver";
import { archiver, desarchiver } from "@/app/archivage/actions";
import { BoutonRetour } from "@/components/bouton-retour";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";
import { compterImpactSuppressionEcart } from "@/lib/suppression";
import { STATUT_REX_COLORS, STATUT_REX_LABELS } from "@/lib/labels";

// Le navigateur nomme le PDF d’après le titre du document : sans titre
// propre à la fiche, tous les exports s’enregistreraient sous le même nom.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fiche = await prisma.ecart.findUnique({ where: { id }, select: { reference: true } });
  return { title: fiche ? `Écart ${fiche.reference}` : "Écart" };
}

export default async function EcartDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ecart = await prisma.ecart.findUnique({
    where: { id },
    include: {
      dossier: true,
      remontees: {
        orderBy: { reference: "asc" },
        select: { id: true, reference: true, objet: true },
      },
      remonteesOrigine: { select: { id: true } },
      fichesSSE: { orderBy: { createdAt: "desc" } },
      actions: { orderBy: { createdAt: "desc" } },
      rex: { orderBy: { createdAt: "desc" }, select: { id: true, reference: true, titre: true, statut: true } },
    },
  });

  if (!ecart) notFound();

  const impact = await compterImpactSuppressionEcart(ecart.id);
  // Une remontée peut être rattachée à cet écart sans en être l'origine : le
  // libellé distingue les deux, et le statut ne suffit plus à les départager.
  const idsRemonteesOrigine = new Set(ecart.remonteesOrigine.map((r) => r.id));

  // Dossiers proposés pour corriger un rattachement erroné.
  const dossiersChoix = await prisma.dossier.findMany({
    orderBy: { reference: "asc" },
    select: { id: true, reference: true, chantier: true },
  });

  return (
    <div className="mx-auto max-w-[100rem] px-6 py-8">
      <BoutonRetour
        href={ecart.dossier ? `/dossiers/${ecart.dossier.id}` : "/ecarts"}
        label={ecart.dossier ? "Retour au dossier" : "Retour aux écarts"}
      />
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{ecart.reference}</h1>
            <Badge
              label={STATUT_DOSSIER_ECART_LABELS[ecart.statut]}
              colorClass={STATUT_DOSSIER_ECART_COLORS[ecart.statut]}
            />
          </div>
          {ecart.dossier ? (
            <Link href={`/dossiers/${ecart.dossier.id}`} className="block text-sm text-slate-500 hover:underline">
              Dossier {ecart.dossier.reference} — {ecart.dossier.chantier}
            </Link>
          ) : (
            <p className="text-sm text-slate-400">Rattaché à aucun dossier</p>
          )}
          <div data-no-print className="mt-1">
            <ChangerRattachement
              action={changerRattachementEcart}
              hiddenFields={{ id: ecart.id }}
              types={[
                {
                  cle: "dossier",
                  libelle: "Dossier",
                  champ: "dossierId",
                  valeurActuelle: ecart.dossierId,
                  options: dossiersChoix.map((d) => ({
                    id: d.id,
                    libelle: `${d.reference} — ${d.chantier}`,
                  })),
                },
              ]}
            />
          </div>
          {/* Plusieurs remontées peuvent viser le même écart : celle qui lui a
              donné naissance, et celles qu'on y rattache ensuite. Le libellé
              distingue les deux cas. */}
          {ecart.remontees.map((r) => (
            <Link
              key={r.id}
              href={`/remontees/${r.id}`}
              className="block text-sm text-purple-700 hover:underline"
            >
              {idsRemonteesOrigine.has(r.id) ? "Issu de la remontée" : "Remontée rattachée"}{" "}
              {r.reference} — {r.objet}
            </Link>
          ))}
        </div>
        <div data-no-print className="flex shrink-0 flex-wrap justify-end gap-2">
          <BoutonExportPDF />
          <Link
            href={`/fiches-sse/nouveau?ecartId=${ecart.id}`}
            className="whitespace-nowrap rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            + Évènement SSE
          </Link>
          <Link
            href={`/plan-action/nouveau?ecartId=${ecart.id}`}
            className="whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Action
          </Link>
          {ecart.rex.length === 0 && (
            <Link
              href={`/rex/nouveau?ecartId=${ecart.id}`}
              className="whitespace-nowrap rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              + REX
            </Link>
          )}
          <BoutonArchiver
            action={ecart.archiveLe ? desarchiver : archiver}
            entite="ecart"
            id={ecart.id}
            archive={!!ecart.archiveLe}
          />
          <BoutonSupprimer
            action={supprimerEcart}
            hiddenFields={{ id: ecart.id }}
            message={`Supprimer cet écart supprimera aussi ${impact.fiches} évènement(s) SSE et ${impact.actions} action(s) lié(s). Cette action est irréversible. Continuer ?`}
          />
        </div>
      </div>

      <div data-no-print className="mb-8 rounded-lg border border-slate-200 bg-white p-4">
        <StatutSelectForm
          action={mettreAJourStatutEcart}
          hiddenName="id"
          hiddenValue={ecart.id}
          selectName="statut"
          defaultValue={ecart.statut}
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
          action={mettreAJourEcart}
          hiddenFields={{ id: ecart.id }}
          modifiePar={ecart.modifiePar}
          modifieLe={ecart.modifieLe}
        >
          <EcartFields v={ecart} />
        </FormulaireEditable>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Évènements SSE ({ecart.fichesSSE.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Référence</th>
                <th className="px-4 py-3 font-medium">Émetteur</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {ecart.fichesSSE.map((f) => (
                <tr key={f.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/fiches-sse/${f.id}`} className="font-medium text-blue-700 hover:underline">
                      {f.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{f.emetteur || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge label={STATUT_FICHE_LABELS[f.statutFiche]} colorClass={STATUT_FICHE_COLORS[f.statutFiche]} />
                  </td>
                </tr>
              ))}
              {ecart.fichesSSE.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                    Aucun évènement SSE.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Plan d&apos;action ({ecart.actions.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
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
              {ecart.actions.map((a) => (
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
              {ecart.actions.length === 0 && (
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

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Retour d&apos;expérience</h2>
        {ecart.rex.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
            Aucun REX pour cet écart.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {ecart.rex.map((r) => (
              <Link
                key={r.id}
                href={`/rex/${r.id}`}
                className="flex min-w-[220px] items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-blue-700">{r.reference}</p>
                  <p className="text-xs text-slate-500">{r.titre}</p>
                </div>
                <Badge label={STATUT_REX_LABELS[r.statut]} colorClass={STATUT_REX_COLORS[r.statut]} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
