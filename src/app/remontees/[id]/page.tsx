import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import {
  STATUT_REMONTEE_COLORS,
  STATUT_REMONTEE_LABELS,
  TYPE_ACTION_LABELS,
  STATUT_ACTION_COLORS,
  STATUT_ACTION_LABELS,
} from "@/lib/labels";
import {
  mettreAJourRemontee,
  mettreAJourStatutRemontee,
  marquerRemonteeTraitee,
  supprimerRemontee,
} from "@/app/remontees/actions";
import { StatutRemontee } from "@/generated/prisma/enums";
import { StatutSelectForm } from "@/components/statut-select-form";
import { FormulaireEditable } from "@/components/formulaire-editable";
import { RemonteeFields } from "@/components/remontee-fields";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { BoutonArchiver } from "@/components/bouton-archiver";
import { archiver, desarchiver } from "@/app/archivage/actions";
import { BoutonRetour } from "@/components/bouton-retour";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";

// Le navigateur nomme le PDF d’après le titre du document : sans titre
// propre à la fiche, tous les exports s’enregistreraient sous le même nom.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fiche = await prisma.remonteeInfo.findUnique({ where: { id }, select: { reference: true } });
  return { title: fiche ? `Remontée ${fiche.reference}` : "Remontée" };
}

export default async function RemonteeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const remontee = await prisma.remonteeInfo.findUnique({
    where: { id },
    include: {
      ecart: { include: { dossier: true } },
      actions: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!remontee) notFound();

  const [dossiers, autresRemontees] = await Promise.all([
    prisma.dossier.findMany({ distinct: ["chantier"], select: { chantier: true } }),
    prisma.remonteeInfo.findMany({ distinct: ["chantierService"], select: { chantierService: true } }),
  ]);
  const chantiersConnus = [
    ...new Set([...dossiers.map((d) => d.chantier), ...autresRemontees.map((r) => r.chantierService)]),
  ].sort();

  const dejaTransformee = !!remontee.ecart;

  return (
    <div className="mx-auto max-w-[100rem] px-6 py-8">
      <BoutonRetour href="/remontees" label="Retour aux remontées" />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{remontee.reference}</h1>
            <Badge
              label={STATUT_REMONTEE_LABELS[remontee.statut]}
              colorClass={STATUT_REMONTEE_COLORS[remontee.statut]}
            />
          </div>
          <p className="text-sm text-slate-500">{remontee.objet}</p>
        </div>
        <div data-no-print className="flex shrink-0 flex-wrap justify-end gap-2">
          <BoutonExportPDF />
          <Link
            href={`/plan-action/nouveau?remonteeId=${remontee.id}`}
            className="whitespace-nowrap rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            + Action
          </Link>
          <BoutonArchiver
            action={remontee.archiveLe ? desarchiver : archiver}
            entite="remontee"
            id={remontee.id}
            archive={!!remontee.archiveLe}
          />
          {/* Supprimer une remontée transformée effacerait l'origine d'un écart
              qui, lui, reste au registre : seul l'archivage est proposé. */}
          {!dejaTransformee && (
            <BoutonSupprimer
              action={supprimerRemontee}
              hiddenFields={{ id: remontee.id }}
              message="Supprimer cette remontée d'information ? Cette action est irréversible."
            />
          )}
        </div>
      </div>

      <p className="mb-6 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
        Une remontée d&apos;information peut rester une simple information, ou être transformée en écart
        si nécessaire.
      </p>

      {dejaTransformee && (
        <div className="mb-6 rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm">
          <p className="font-medium text-purple-900">Transformée en écart</p>
          <Link href={`/ecarts/${remontee.ecart!.id}`} className="text-purple-800 hover:underline">
            {remontee.ecart!.reference}
            {remontee.ecart!.dossier ? ` — ${remontee.ecart!.dossier.chantier}` : ""}
          </Link>
        </div>
      )}

      {/* Une fois l'écart créé, le statut décrit un fait acquis : on retire le
          sélecteur plutôt que de laisser proposer un choix qui sera refusé. */}
      {dejaTransformee ? (
        <div data-no-print className="mb-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Statut figé : cette remontée a été transformée en écart.
        </div>
      ) : (
        <div data-no-print className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <StatutSelectForm
            action={mettreAJourStatutRemontee}
            hiddenName="id"
            hiddenValue={remontee.id}
            selectName="statut"
            defaultValue={remontee.statut}
            options={Object.values(StatutRemontee)
              // Ce statut découle de la transformation, il ne se choisit pas.
              .filter((s) => s !== "TRANSFORMEE_EN_ECART")
              .map((s) => ({ value: s, label: STATUT_REMONTEE_LABELS[s] }))}
          />
        </div>
      )}

      <FormulaireEditable
        action={mettreAJourRemontee}
        hiddenFields={{ id: remontee.id }}
        modifiePar={remontee.modifiePar}
        modifieLe={remontee.modifieLe}
      >
        <RemonteeFields v={remontee} chantiersConnus={chantiersConnus} />
      </FormulaireEditable>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Plan d&apos;action ({remontee.actions.length})
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
              {remontee.actions.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3">
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
              {remontee.actions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Aucune action.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-3">
        {remontee.statut !== "TRAITEE" && !dejaTransformee && (
          <form action={marquerRemonteeTraitee}>
            <input type="hidden" name="id" value={remontee.id} />
            <button
              type="submit"
              className="whitespace-nowrap rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Marquer comme traitée
            </button>
          </form>
        )}
        {!dejaTransformee && (
          <Link
            href={`/ecarts/nouveau?remonteeId=${remontee.id}`}
            className="whitespace-nowrap rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            Transformer en écart
          </Link>
        )}
      </div>
    </div>
  );
}
