import { prisma } from "@/lib/prisma";
import { StatTile } from "@/components/stat-tile";
import { IconFileText, IconSend } from "@/components/icons";
import { RexListePane, type RexListeSearchParams } from "@/components/rex-liste-pane";
import { SplitView, PanneauVide } from "@/components/split-view";

export default async function RexPage({
  searchParams,
}: {
  searchParams: Promise<RexListeSearchParams>;
}) {
  const resolved = await searchParams;

  // Les indicateurs vivent dans le volet de droite, affiché quand aucun REX
  // n'est ouvert : le panneau de liste, lui, est rendu aussi sur chaque fiche
  // et n'a pas à les recalculer.
  const [parStatut, brouillonsCount] = await Promise.all([
    prisma.rex.groupBy({ by: ["statut"], _count: { _all: true }, where: { brouillon: false } }),
    prisma.rex.count({ where: { brouillon: true } }),
  ]);

  const compte = Object.fromEntries(parStatut.map((s) => [s.statut, s._count._all]));
  const totalPublies = Object.values(compte).reduce((s: number, v) => s + (v as number), 0);
  const totalDiffuses = (compte.DIFFUSE ?? 0) + (compte.EFFICACITE_VERIFIEE ?? 0);
  const tauxDiffusion = totalPublies > 0 ? Math.round((totalDiffuses / totalPublies) * 100) : 0;

  return (
    <SplitView liste={<RexListePane searchParams={resolved} />} detailOuvert={false}>
      <PanneauVide>
        <h1 className="text-2xl font-semibold text-slate-900">Retours d&apos;expérience</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enseignements capitalisés à partir des écarts, évènements SSE, écarts amiante et remontées.
        </p>

        <div className="mb-6 mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatTile label="Rédigés" value={compte.REDIGE ?? 0} icon={<IconFileText className="h-5 w-5" />} couleur="bleu" />
          <StatTile label="Diffusés" value={compte.DIFFUSE ?? 0} icon={<IconSend className="h-5 w-5" />} couleur="violet" />
          <StatTile
            label="Efficacité vérifiée"
            value={compte.EFFICACITE_VERIFIEE ?? 0}
            icon={<IconFileText className="h-5 w-5" />}
            couleur="vert"
          />
          <StatTile
            label="Taux de diffusion"
            value={totalPublies > 0 ? `${tauxDiffusion}%` : "—"}
            icon={<IconSend className="h-5 w-5" />}
            couleur="orange"
          />
        </div>

        {brouillonsCount > 0 && (
          <p className="mb-6 text-sm text-slate-500">
            {brouillonsCount} brouillon{brouillonsCount > 1 ? "s" : ""} non publié{brouillonsCount > 1 ? "s" : ""}.
          </p>
        )}

        <p className="py-8 text-center text-sm text-slate-400">
          Sélectionnez un REX dans la liste pour afficher sa fiche.
        </p>
      </PanneauVide>
    </SplitView>
  );
}
