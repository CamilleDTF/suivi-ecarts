import { creerEcartAmiante } from "@/app/ecart-amiante/actions";
import { EcartAmianteFields } from "@/components/ecart-amiante-fields";
import { BoutonCreer } from "@/components/bouton-creer";
import { EcartAmianteListePane, type EcartAmianteListeSearchParams } from "@/components/ecart-amiante-liste-pane";
import { SplitView, RetourListe } from "@/components/split-view";

export default async function NouvelEcartAmiantePage({
  searchParams,
}: {
  searchParams: Promise<EcartAmianteListeSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <SplitView liste={<EcartAmianteListePane searchParams={resolvedSearchParams} />} detailOuvert>
      <div className="max-w-3xl px-6 py-8">
      <RetourListe href="/ecart-amiante" label="Écart amiante" />
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Nouvel écart amiante</h1>

      <form action={creerEcartAmiante} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6">
        <EcartAmianteFields />

        <div className="flex justify-end gap-3 pt-2">
          <BoutonCreer>Créer l&apos;écart amiante</BoutonCreer>
        </div>
      </form>
      </div>
    </SplitView>
  );
}
