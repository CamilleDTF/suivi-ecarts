import { prisma } from "@/lib/prisma";
import { creerActionDU } from "@/app/plan-action-du/actions";
import { ActionDUFields } from "@/components/action-du-fields";
import { BoutonCreer } from "@/components/bouton-creer";
import { PlanActionDUListePane, type PlanActionDUListeSearchParams } from "@/components/plan-action-du-liste-pane";
import { SplitView, RetourListe } from "@/components/split-view";

export default async function NouvelleActionDUPage({
  searchParams,
}: {
  searchParams: Promise<PlanActionDUListeSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  // Les responsables déjà saisis complètent les suggestions : le DU nomme des
  // fonctions qui varient d'une entreprise à l'autre.
  const responsables = await prisma.actionDU.findMany({
    where: { responsable: { not: null } },
    distinct: ["responsable"],
    select: { responsable: true },
    orderBy: { responsable: "asc" },
  });

  return (
    <SplitView liste={<PlanActionDUListePane searchParams={resolvedSearchParams} />} detailOuvert>
      <div className="max-w-2xl px-6 py-8">
      <RetourListe href="/plan-action-du" label="Plan d'action DU" />
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Nouvelle action du DU</h1>
      <p className="mb-6 text-sm text-slate-500">
        Le numéro PA est attribué automatiquement, à la suite du dernier.
      </p>

      <form action={creerActionDU} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <ActionDUFields v={{}} responsablesConnus={responsables.map((r) => r.responsable!)} />
        <div className="flex justify-end gap-3 pt-2">
          <BoutonCreer>Créer l&apos;action</BoutonCreer>
        </div>
      </form>
      </div>
    </SplitView>
  );
}
