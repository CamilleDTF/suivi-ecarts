import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatTile } from "@/components/stat-tile";
import { IconFileText, IconAlertTriangle, IconFolder } from "@/components/icons";
import { RemonteesListePane, type RemonteesListeSearchParams } from "@/components/remontees-liste-pane";
import { SplitView, PanneauVide } from "@/components/split-view";
import { compterOccurrences } from "@/lib/statistiques";

export default async function RemonteesPage({
  searchParams,
}: {
  searchParams: Promise<RemonteesListeSearchParams>;
}) {
  const resolved = await searchParams;

  const [parStatut, toutesCategories] = await Promise.all([
    prisma.remonteeInfo.groupBy({ by: ["statut"], _count: { _all: true } }),
    prisma.remonteeInfo.findMany({ select: { categories: true } }),
  ]);

  const compte = Object.fromEntries(parStatut.map((s) => [s.statut, s._count._all]));

  // Catégories apparaissant sur au moins deux remontées : un signal qu'un
  // même sujet revient, à examiner pour un éventuel REX. Une seule occurrence
  // ne dit rien — ce n'est pas une répétition.
  const repetitions = compterOccurrences(toutesCategories.flatMap((r) => r.categories)).filter((c) => c.valeur >= 2);

  return (
    <SplitView liste={<RemonteesListePane searchParams={resolved} />} detailOuvert={false}>
      <PanneauVide>
        <div className="mb-2">
          <h1 className="text-2xl font-semibold text-slate-900">Remontées d&apos;informations</h1>
          <p className="mt-1 text-sm text-slate-500">
            Saisie et suivi des informations remontées par les chantiers et le bureau.
          </p>
        </div>

        <div className="mb-6 mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="À traiter" value={compte.A_TRAITER ?? 0} icon={<IconAlertTriangle className="h-5 w-5" />} couleur="orange" />
          <StatTile label="En cours" value={compte.EN_COURS ?? 0} icon={<IconFileText className="h-5 w-5" />} couleur="bleu" />
          <StatTile label="Traitées" value={compte.TRAITEE ?? 0} icon={<IconFileText className="h-5 w-5" />} couleur="vert" />
          <StatTile
            label="Transformées en écart"
            value={compte.TRANSFORMEE_EN_ECART ?? 0}
            icon={<IconFolder className="h-5 w-5" />}
            couleur="violet"
          />
        </div>

        {repetitions.length > 0 && (
          <div data-no-print className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="mb-2 text-sm font-medium text-amber-900">
              Répétitions à surveiller — un sujet qui revient est un candidat au REX.
            </p>
            <div className="flex flex-wrap gap-2">
              {repetitions.map((r) => (
                <Link
                  key={r.label}
                  href={{ pathname: "/remontees", query: { categorie: r.label } }}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1 text-sm text-amber-900 hover:bg-amber-100"
                >
                  {r.label} · {r.valeur}
                </Link>
              ))}
            </div>
          </div>
        )}

        <p className="py-8 text-center text-sm text-slate-400">
          Sélectionnez une remontée dans la liste pour afficher sa fiche.
        </p>
      </PanneauVide>
    </SplitView>
  );
}
