import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import {
  STATUT_FICHE_COLORS,
  STATUT_FICHE_LABELS,
  TYPE_ACTION_LABELS,
  STATUT_ACTION_COLORS,
  STATUT_ACTION_LABELS,
} from "@/lib/labels";
import { mettreAJourFicheSSE, finaliserFicheSSE, supprimerFicheSSE } from "@/app/fiches-sse/actions";
import { ArbreCauses } from "@/components/arbre-causes";
import { FicheSSEFields } from "@/components/fiche-sse-fields";
import { FormulaireEditable } from "@/components/formulaire-editable";
import { BoutonSupprimer } from "@/components/bouton-supprimer";

export default async function FicheSSEDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fiche = await prisma.ficheSSE.findUnique({
    where: { id },
    include: {
      ecart: { include: { dossier: true } },
      ecartAmiante: true,
      causes: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!fiche) notFound();
  const estBrouillon = fiche.statutFiche === "BROUILLON";

  const rattachements: { ficheSSEId?: string; ecartId?: string; ecartAmianteId?: string }[] = [
    { ficheSSEId: fiche.id },
  ];
  if (fiche.ecartId) rattachements.push({ ecartId: fiche.ecartId });
  if (fiche.ecartAmianteId) rattachements.push({ ecartAmianteId: fiche.ecartAmianteId });

  const actions = await prisma.action.findMany({
    where: { OR: rattachements },
    orderBy: { createdAt: "desc" },
  });

  const ficheId = fiche.id;
  const actionsDirectes = actions.filter((a) => a.ficheSSEId === ficheId).length;
  function origineAction(a: (typeof actions)[number]) {
    if (a.ficheSSEId === ficheId) return "Évènement";
    if (a.ecartId) return "Écart";
    if (a.ecartAmianteId) return "Écart amiante";
    return "—";
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{fiche.reference}</h1>
            <Badge label={STATUT_FICHE_LABELS[fiche.statutFiche]} colorClass={STATUT_FICHE_COLORS[fiche.statutFiche]} />
          </div>
          {fiche.ecart && (
            <Link href={`/ecarts/${fiche.ecart.id}`} className="block text-sm text-slate-500 hover:underline">
              Écart {fiche.ecart.reference} — {fiche.ecart.dossier.chantier}
            </Link>
          )}
          {fiche.ecartAmiante && (
            <Link href={`/ecart-amiante/${fiche.ecartAmiante.id}`} className="block text-sm text-slate-500 hover:underline">
              Écart amiante {fiche.ecartAmiante.reference} — {fiche.ecartAmiante.nomChantier}
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/plan-action/nouveau?ficheSSEId=${fiche.id}`}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            + Action
          </Link>
          {estBrouillon && (
            <form action={finaliserFicheSSE}>
              <input type="hidden" name="id" value={fiche.id} />
              <button
                type="submit"
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Finaliser l&apos;évènement
              </button>
            </form>
          )}
          <BoutonSupprimer
            action={supprimerFicheSSE}
            hiddenFields={{ id: fiche.id }}
            message={`Supprimer cet évènement supprimera aussi ${fiche.causes.length} cause(s) et ${actionsDirectes} action(s) rattachée(s) directement à l'évènement. Cette action est irréversible. Continuer ?`}
          />
        </div>
      </div>

      <FormulaireEditable
        action={mettreAJourFicheSSE}
        hiddenFields={{ id: fiche.id }}
        modifiePar={fiche.modifiePar}
        modifieLe={fiche.modifieLe}
        labelBouton={estBrouillon ? "Enregistrer le brouillon" : "Enregistrer les modifications"}
      >
        <FicheSSEFields v={fiche} apresTypeAnalyse={<ArbreCauses ficheSSEId={fiche.id} causes={fiche.causes} />} />
      </FormulaireEditable>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Plan d&apos;action ({actions.length})
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          Actions rattachées à l&apos;évènement, ainsi qu&apos;à l&apos;écart ou l&apos;écart amiante lié.
        </p>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Référence</th>
                <th className="px-4 py-3 font-medium">Rattachée à</th>
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
                  <td className="px-4 py-3">
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
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
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
