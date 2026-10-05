import { PlanActionDUListePane, type PlanActionDUListeSearchParams } from "@/components/plan-action-du-liste-pane";
import { SplitView, PanneauVide } from "@/components/split-view";

export default async function PlanActionDUPage({
  searchParams,
}: {
  searchParams: Promise<PlanActionDUListeSearchParams>;
}) {
  const resolved = await searchParams;

  return (
    <SplitView liste={<PlanActionDUListePane searchParams={resolved} />} detailOuvert={false}>
      <PanneauVide>
        <h1 className="text-2xl font-semibold text-slate-900">Plan d&apos;action DU</h1>
        <p className="mt-1 text-sm text-slate-500">
          Mesures de prévention du Document Unique. Les numéros PA sont ceux auxquels renvoient les
          fiches de risques.
        </p>
        <p className="py-16 text-center text-sm text-slate-400">
          Sélectionnez une action dans la liste pour afficher sa fiche.
        </p>
      </PanneauVide>
    </SplitView>
  );
}
