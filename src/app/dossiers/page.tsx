import { DossiersListePane, type DossiersListeSearchParams } from "@/components/dossiers-liste-pane";
import { SplitView, PanneauVide } from "@/components/split-view";

export default async function DossiersPage({
  searchParams,
}: {
  searchParams: Promise<DossiersListeSearchParams>;
}) {
  const resolved = await searchParams;

  return (
    <SplitView liste={<DossiersListePane searchParams={resolved} />} detailOuvert={false}>
      <PanneauVide>
        <p className="py-16 text-center text-sm text-slate-400">
          Sélectionnez un dossier dans la liste pour afficher sa fiche.
        </p>
      </PanneauVide>
    </SplitView>
  );
}
