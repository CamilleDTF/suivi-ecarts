import { prisma } from "@/lib/prisma";
import { creerActionDU } from "@/app/plan-action-du/actions";
import { ActionDUFields } from "@/components/action-du-fields";
import { BoutonCreer } from "@/components/bouton-creer";
import { BoutonRetour } from "@/components/bouton-retour";
import { ConteneurPage, EntetePage } from "@/components/page-liste";

export default async function NouvelleActionDUPage() {
  // Les responsables déjà saisis complètent les suggestions : le DU nomme des
  // fonctions qui varient d'une entreprise à l'autre.
  const responsables = await prisma.actionDU.findMany({
    where: { responsable: { not: null } },
    distinct: ["responsable"],
    select: { responsable: true },
    orderBy: { responsable: "asc" },
  });

  return (
    <ConteneurPage largeur="formulaire">
      <BoutonRetour href="/plan-action-du" label="Plan d'action DU" />
      <EntetePage
        titre="Nouvelle action du DU"
        sousTitre="Le numéro PA est attribué automatiquement, à la suite du dernier."
      />

      <form action={creerActionDU} className="space-y-4 rounded-xl border bg-card p-6">
        <ActionDUFields v={{}} responsablesConnus={responsables.map((r) => r.responsable!)} />
        <div className="flex justify-end gap-3 pt-2">
          <BoutonCreer>Créer l&apos;action</BoutonCreer>
        </div>
      </form>
    </ConteneurPage>
  );
}
