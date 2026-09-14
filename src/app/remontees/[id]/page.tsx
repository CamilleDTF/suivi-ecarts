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
  changerRattachementRemontee,
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
import { ChangerRattachement } from "@/components/changer-rattachement";
import { libelleRattachement } from "@/lib/labels";

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
      ecarts: { orderBy: { reference: "asc" }, include: { dossier: true } },
      ecartOrigine: { include: { dossier: true } },
      ficheSSE: { select: { id: true, reference: true, nomChantier: true, ecartId: true, ecartAmianteId: true } },
    },
  });

  if (!remontee) notFound();

  // Le plan d'action d'une remontée reprend celui de ce à quoi elle est
  // rattachée, comme un évènement reprend celui de son écart : le constat
  // préexiste au signalement qu'on y raccroche, et ses actions valent pour lui.
  // L'inverse n'est pas vrai — une action propre à la remontée ne devient pas
  // celle de l'écart.
  //
  // La chaîne est suivie jusqu'au bout : une remontée rattachée à un évènement
  // voit aussi les actions de l'écart de cet évènement, puisque l'évènement
  // lui-même les affiche.
  const idsEcartsHerites = [
    ...remontee.ecarts.map((e) => e.id),
    ...(remontee.ficheSSE?.ecartId ? [remontee.ficheSSE.ecartId] : []),
  ];
  const idsAmianteHerites = remontee.ficheSSE?.ecartAmianteId
    ? [remontee.ficheSSE.ecartAmianteId]
    : [];

  const actions = await prisma.action.findMany({
    where: {
      OR: [
        { remonteeId: remontee.id },
        ...(remontee.ficheSSE ? [{ ficheSSEId: remontee.ficheSSE.id }] : []),
        ...(idsEcartsHerites.length ? [{ ecarts: { some: { id: { in: idsEcartsHerites } } } }] : []),
        ...(idsAmianteHerites.length ? [{ ecartAmianteId: { in: idsAmianteHerites } }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    include: { ecarts: { select: { id: true } } },
  });

  // Seules les actions propres à la remontée disparaissent avec elle : celles
  // héritées appartiennent à l'écart ou à l'évènement, qui restent.
  const actionsPropres = actions.filter((a) => a.remonteeId === remontee.id).length;

  function origineAction(a: (typeof actions)[number]) {
    if (a.remonteeId === remontee!.id) return "Remontée";
    if (a.ficheSSEId) return "Évènement";
    if (a.ecarts.length > 0) return "Écart";
    if (a.ecartAmianteId) return "Écart amiante";
    return "—";
  }

  const [dossiers, autresRemontees, ecartsChoix, evenementsChoix] = await Promise.all([
    prisma.dossier.findMany({ distinct: ["chantier"], select: { chantier: true } }),
    prisma.remonteeInfo.findMany({ distinct: ["chantierService"], select: { chantierService: true } }),
    prisma.ecart.findMany({
      orderBy: { reference: "asc" },
      select: { id: true, reference: true, description: true, dossier: { select: { chantier: true } } },
    }),
    prisma.ficheSSE.findMany({
      orderBy: { reference: "asc" },
      select: { id: true, reference: true, nomChantier: true, descriptionFactuelle: true },
    }),
  ]);
  const chantiersConnus = [
    ...new Set([...dossiers.map((d) => d.chantier), ...autresRemontees.map((r) => r.chantierService)]),
  ].sort();

  // Transformée = un écart est né de cette remontée. Un simple rattachement à
  // un écart existant ne fige rien : c'est le statut qui fait foi.
  const dejaTransformee = remontee.statut === "TRANSFORMEE_EN_ECART";

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
              message={
                actionsPropres > 0
                  ? `Supprimer cette remontée supprimera aussi ses ${actionsPropres} action(s) propre(s). Les actions héritées de l'écart ou de l'évènement rattaché ne sont pas touchées. Cette action est irréversible. Continuer ?`
                  : "Supprimer cette remontée d'information ? Cette action est irréversible."
              }
            />
          )}
        </div>
      </div>

      <p className="mb-6 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
        Une remontée d&apos;information peut rester une simple information, ou être transformée en écart
        si nécessaire.
      </p>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">
          {dejaTransformee ? "Transformée en écart" : "Rattachée à"}
        </p>
        {remontee.ecarts.length > 0 ? (
          <ul>
            {remontee.ecarts.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/ecarts/${e.id}`}
                  className={
                    e.id === remontee.ecartOrigineId
                      ? "font-medium text-purple-800 hover:underline"
                      : "text-blue-700 hover:underline"
                  }
                >
                  Écart {e.reference}
                  {e.dossier ? ` — ${e.dossier.chantier}` : ""}
                </Link>
                {/* Parmi plusieurs écarts rattachés, celui qui est né de cette
                    remontée doit rester identifiable. */}
                {e.id === remontee.ecartOrigineId && (
                  <span className="ml-2 text-xs text-purple-700">issu de cette remontée</span>
                )}
              </li>
            ))}
          </ul>
        ) : remontee.ficheSSE ? (
          <Link href={`/fiches-sse/${remontee.ficheSSE.id}`} className="text-blue-700 hover:underline">
            Évènement SSE {remontee.ficheSSE.reference}
            {remontee.ficheSSE.nomChantier ? ` — ${remontee.ficheSSE.nomChantier}` : ""}
          </Link>
        ) : (
          <span className="text-slate-400">Aucun rattachement</span>
        )}

        {/* Une remontée transformée garde son rattachement : le détacher
            laisserait un écart sans origine traçable. */}
        {!dejaTransformee && (
          <div data-no-print className="mt-2">
            <ChangerRattachement
              action={changerRattachementRemontee}
              hiddenFields={{ id: remontee.id }}
              types={[
                {
                  cle: "ecart",
                  libelle: "Écart",
                  champ: "ecartIds",
                  multiple: true,
                  valeurActuelle: remontee.ecarts[0]?.id ?? null,
                  valeursActuelles: remontee.ecarts.map((e) => e.id),
                  options: ecartsChoix.map((e) => ({
                    id: e.id,
                    libelle: libelleRattachement(e.reference, e.dossier?.chantier ?? null, e.description),
                  })),
                },
                {
                  cle: "evenement",
                  libelle: "Évènement SSE",
                  champ: "ficheSSEId",
                  valeurActuelle: remontee.ficheSSEId,
                  options: evenementsChoix.map((e) => ({
                    id: e.id,
                    libelle: libelleRattachement(e.reference, e.nomChantier, e.descriptionFactuelle),
                  })),
                },
              ]}
            />
          </div>
        )}
      </div>

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
          Plan d&apos;action ({actions.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Référence</th>
                <th className="px-4 py-3 font-medium">Origine</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Responsable</th>
                <th className="px-4 py-3 font-medium">Échéance</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link href={`/plan-action/${a.id}`} className="font-medium text-blue-700 hover:underline">
                      {a.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{origineAction(a)}</td>
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
              {actions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
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
