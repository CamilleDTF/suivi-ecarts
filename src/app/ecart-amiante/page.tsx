import { EcartAmianteListePane, type EcartAmianteListeSearchParams } from "@/components/ecart-amiante-liste-pane";
import { SplitView, PanneauVide } from "@/components/split-view";

export default async function EcartAmiantePage({
  searchParams,
}: {
  searchParams: Promise<EcartAmianteListeSearchParams>;
}) {
  const resolved = await searchParams;

  return (
    <SplitView liste={<EcartAmianteListePane searchParams={resolved} />} detailOuvert={false}>
      <PanneauVide>
        <p className="py-16 text-center text-sm text-slate-400">
          Sélectionnez un écart amiante dans la liste pour afficher sa fiche.
        </p>
      </PanneauVide>
    </SplitView>
  );
}
