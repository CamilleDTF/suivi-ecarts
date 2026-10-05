import { prisma } from "@/lib/prisma";
import { creerRemontee } from "@/app/remontees/actions";
import { RemonteeFields } from "@/components/remontee-fields";
import { AvertissementNonEnregistre } from "@/components/avertissement-non-enregistre";
import { BoutonCreer } from "@/components/bouton-creer";
import { RemonteesListePane, type RemonteesListeSearchParams } from "@/components/remontees-liste-pane";
import { SplitView, RetourListe } from "@/components/split-view";

export default async function NouvelleRemonteePage({
  searchParams,
}: {
  searchParams: Promise<RemonteesListeSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  // Suggestions : chantiers déjà connus des dossiers et des remontées.
  const [dossiers, remontees] = await Promise.all([
    prisma.dossier.findMany({ distinct: ["chantier"], select: { chantier: true } }),
    prisma.remonteeInfo.findMany({ distinct: ["chantierService"], select: { chantierService: true } }),
  ]);
  const chantiersConnus = [
    ...new Set([...dossiers.map((d) => d.chantier), ...remontees.map((r) => r.chantierService)]),
  ].sort();

  return (
    <SplitView liste={<RemonteesListePane searchParams={resolvedSearchParams} />} detailOuvert>
      <div className="max-w-2xl px-6 py-8">
        <RetourListe href="/remontees" label="Remontées" />
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">Nouvelle remontée d&apos;information</h1>

        <form action={creerRemontee} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6">
          <AvertissementNonEnregistre />

          <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Une remontée d&apos;information peut rester une simple information, ou être transformée en
            écart si nécessaire.
          </p>

          <RemonteeFields chantiersConnus={chantiersConnus} />

          <div className="flex justify-end gap-3 pt-2">
            <BoutonCreer>Enregistrer la remontée</BoutonCreer>
          </div>
        </form>
      </div>
    </SplitView>
  );
}
