import { PlanActionListePane, type PlanActionListeSearchParams } from "@/components/plan-action-liste-pane";
import { SplitView, PanneauVide } from "@/components/split-view";

export default async function PlanActionPage({
  searchParams,
}: {
  searchParams: Promise<PlanActionListeSearchParams>;
}) {
  const resolved = await searchParams;

  return (
    <SplitView liste={<PlanActionListePane searchParams={resolved} />} detailOuvert={false}>
      <PanneauVide>
        <p className="py-16 text-center text-sm text-slate-400">
          Sélectionnez une action dans la liste pour afficher sa fiche.
        </p>
      </PanneauVide>
    </SplitView>
  );
}
