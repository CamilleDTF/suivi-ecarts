import { EcartsListePane, type EcartsListeSearchParams } from "@/components/ecarts-liste-pane";
import { SplitView, PanneauVide } from "@/components/split-view";

export default async function EcartsPage({
  searchParams,
}: {
  searchParams: Promise<EcartsListeSearchParams>;
}) {
  const resolved = await searchParams;

  return (
    <SplitView liste={<EcartsListePane searchParams={resolved} />} detailOuvert={false}>
      <PanneauVide>
        <p className="py-16 text-center text-sm text-slate-400">
          Sélectionnez un écart dans la liste pour afficher sa fiche.
        </p>
      </PanneauVide>
    </SplitView>
  );
}
