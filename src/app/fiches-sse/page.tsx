import { FichesSSEListePane, type FichesSSEListeSearchParams } from "@/components/fiches-sse-liste-pane";
import { SplitView, PanneauVide } from "@/components/split-view";

export default async function FichesSSEPage({
  searchParams,
}: {
  searchParams: Promise<FichesSSEListeSearchParams>;
}) {
  const resolved = await searchParams;

  return (
    <SplitView liste={<FichesSSEListePane searchParams={resolved} />} detailOuvert={false}>
      <PanneauVide>
        <p className="py-16 text-center text-sm text-slate-400">
          Sélectionnez un évènement dans la liste pour afficher sa fiche.
        </p>
      </PanneauVide>
    </SplitView>
  );
}
