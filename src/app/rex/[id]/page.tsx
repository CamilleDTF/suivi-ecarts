import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import {
  ORIGINE_REX_LABELS,
  STATUT_REX_COLORS,
  STATUT_REX_LABELS,
  NATURE_REX_LABELS,
  NATURE_REX_COLORS,
  TYPE_ACTION_LABELS,
  STATUT_ACTION_COLORS,
  STATUT_ACTION_LABELS,
} from "@/lib/labels";
import {
  mettreAJourRex,
  changerStatutRex,
  publierRex,
  supprimerRex,
} from "@/app/rex/actions";
import { StatutREX } from "@/generated/prisma/enums";
import { StatutSelectForm } from "@/components/statut-select-form";
import { FormulaireEditable } from "@/components/formulaire-editable";
import { RexFields } from "@/components/rex-fields";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { BoutonArchiver } from "@/components/bouton-archiver";
import { archiver, desarchiver } from "@/app/archivage/actions";
import { BoutonRetour } from "@/components/bouton-retour";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rex = await prisma.rex.findUnique({ where: { id }, select: { reference: true } });
  return { title: rex ? `REX ${rex.reference}` : "REX" };
}

export default async function RexDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rex = await prisma.rex.findUnique({
    where: { id },
    include: {
      // Chantier seulement, jamais `enregistrement` (photo/PDF en data URL).
      ecarts: { orderBy: { reference: "asc" }, include: { dossier: { select: { chantier: true } } } },
      ficheSSE: { select: { id: true, reference: true, nomChantier: true } },
      ecartAmiante: { select: { id: true, reference: true, nomChantier: true } },
      remontee: { select: { id: true, reference: true, objet: true } },
      // `select` : jamais `preuve` (photo/PDF en data URL), inutile ici.
      actions: {
        orderBy: { createdAt: "desc" },
        select: { id: true, reference: true, type: true, action: true, responsable: true, echeance: true, statut: true },
      },
    },
  });

  if (!rex) notFound();

  return (
    <div className="mx-auto max-w-[100rem] px-6 py-8">
      <BoutonRetour href="/rex" label="Retour aux REX" />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{rex.reference}</h1>
            {rex.brouillon && <Badge label="Brouillon" colorClass="bg-slate-200 text-slate-700" />}
            <Badge label={STATUT_REX_LABELS[rex.statut]} colorClass={STATUT_REX_COLORS[rex.statut]} />
            <Badge label={NATURE_REX_LABELS[rex.nature]} colorClass={NATURE_REX_COLORS[rex.nature]} />
          </div>
          <p className="text-sm text-slate-500">{rex.titre}</p>
        </div>
        <div data-no-print className="flex shrink-0 flex-wrap justify-end gap-2">
          {rex.brouillon && (
            <form action={publierRex}>
              <input type="hidden" name="id" value={rex.id} />
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Publier le REX
              </button>
            </form>
          )}
          <Link
            href={`/plan-action/nouveau?rexId=${rex.id}`}
            className="whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Action
          </Link>
          <Link
            href={`/rex/${rex.id}/diffusion`}
            className="whitespace-nowrap flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Fiche de diffusion
          </Link>
          <BoutonExportPDF />
          <BoutonArchiver
            action={rex.archiveLe ? desarchiver : archiver}
            entite="rex"
            id={rex.id}
            archive={!!rex.archiveLe}
          />
          <BoutonSupprimer
            action={supprimerRex}
            hiddenFields={{ id: rex.id }}
            message={`Supprimer ce REX supprimera aussi ${rex.actions.length} action(s) du plan d'action. Les écarts, évènements ou remontées rattachés ne sont pas touchés. Cette action est irréversible. Continuer ?`}
          />
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">
          Origine — {ORIGINE_REX_LABELS[rex.origine]}
        </p>
        {rex.ecarts.length > 0 ? (
          <ul>
            {rex.ecarts.map((e) => (
              <li key={e.id}>
                <Link href={`/ecarts/${e.id}`} className="text-blue-700 hover:underline">
                  Écart {e.reference}
                  {e.dossier ? ` — ${e.dossier.chantier}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        ) : rex.ficheSSE ? (
          <Link href={`/fiches-sse/${rex.ficheSSE.id}`} className="text-blue-700 hover:underline">
            Évènement SSE {rex.ficheSSE.reference}
            {rex.ficheSSE.nomChantier ? ` — ${rex.ficheSSE.nomChantier}` : ""}
          </Link>
        ) : rex.ecartAmiante ? (
          <Link href={`/ecart-amiante/${rex.ecartAmiante.id}`} className="text-blue-700 hover:underline">
            Écart amiante {rex.ecartAmiante.reference} — {rex.ecartAmiante.nomChantier}
          </Link>
        ) : rex.remontee ? (
          <Link href={`/remontees/${rex.remontee.id}`} className="text-blue-700 hover:underline">
            Remontée {rex.remontee.reference} — {rex.remontee.objet}
          </Link>
        ) : (
          <span className="text-slate-400">Aucun rattachement — REX spontané / bonne pratique</span>
        )}
      </div>

      {rex.brouillon ? (
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Ce REX est encore en brouillon : il n&apos;a pas été diffusé et n&apos;est pas compté dans les
          indicateurs du tableau de bord. Cliquez sur « Publier le REX » quand il est prêt.
        </div>
      ) : (
        <div data-no-print className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <StatutSelectForm
            action={changerStatutRex}
            hiddenName="id"
            hiddenValue={rex.id}
            selectName="statut"
            defaultValue={rex.statut}
            options={Object.values(StatutREX).map((s) => ({ value: s, label: STATUT_REX_LABELS[s] }))}
          />
          <p className="mt-2 text-xs text-slate-400">
            {rex.dateDiffusion && `Diffusé le ${rex.dateDiffusion.toLocaleDateString("fr-FR")}`}
            {rex.dateDiffusion && rex.dateVerificationEfficacite && " · "}
            {rex.dateVerificationEfficacite &&
              `Efficacité vérifiée le ${rex.dateVerificationEfficacite.toLocaleDateString("fr-FR")}`}
            {!rex.dateDiffusion && rex.dateDiffusionPlanifiee &&
              `Diffusion planifiée le ${rex.dateDiffusionPlanifiee.toLocaleDateString("fr-FR")}`}
          </p>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <div className="min-w-[180px]">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Thèmes</p>
          <div className="flex flex-wrap gap-1.5">
            {rex.themes.length > 0
              ? rex.themes.map((t) => (
                  <span key={t} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{t}</span>
                ))
              : <span className="text-slate-400">—</span>}
          </div>
        </div>
        <div className="min-w-[180px]">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Destinataires</p>
          <div className="flex flex-wrap gap-1.5">
            {rex.destinatairesRoles.length > 0
              ? rex.destinatairesRoles.map((d) => (
                  <span key={d} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">{d}</span>
                ))
              : <span className="text-slate-400">—</span>}
          </div>
        </div>
        <div className="min-w-[180px]">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Canaux de diffusion</p>
          <div className="flex flex-wrap gap-1.5">
            {rex.canaux.length > 0
              ? rex.canaux.map((c) => (
                  <span key={c} className="rounded-full bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">{c}</span>
                ))
              : <span className="text-slate-400">—</span>}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <FormulaireEditable
          action={mettreAJourRex}
          hiddenFields={{ id: rex.id }}
          modifiePar={rex.modifiePar}
          modifieLe={rex.modifieLe}
        >
          <RexFields v={rex} />
        </FormulaireEditable>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Plan d&apos;action ({rex.actions.length})
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
              {rex.actions.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link href={`/plan-action/${a.id}`} className="font-medium text-blue-700 hover:underline">
                      {a.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{TYPE_ACTION_LABELS[a.type]}</td>
                  <td className="max-w-md px-4 py-3 text-slate-700">{a.action}</td>
                  <td className="px-4 py-3 text-slate-700">{a.responsable}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {a.echeance ? a.echeance.toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={STATUT_ACTION_LABELS[a.statut]} colorClass={STATUT_ACTION_COLORS[a.statut]} />
                  </td>
                </tr>
              ))}
              {rex.actions.length === 0 && (
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
