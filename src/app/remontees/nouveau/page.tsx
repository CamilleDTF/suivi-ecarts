import { prisma } from "@/lib/prisma";
import { creerRemontee } from "@/app/remontees/actions";
import { RemonteeFields } from "@/components/remontee-fields";
import { AvertissementNonEnregistre } from "@/components/avertissement-non-enregistre";
import { BoutonRetour } from "@/components/bouton-retour";
import { BoutonCreer } from "@/components/bouton-creer";
import { ConteneurPage, EntetePage } from "@/components/page-liste";

export default async function NouvelleRemonteePage() {
  // Suggestions : chantiers déjà connus des dossiers et des remontées.
  const [dossiers, remontees] = await Promise.all([
    prisma.dossier.findMany({ distinct: ["chantier"], select: { chantier: true } }),
    prisma.remonteeInfo.findMany({ distinct: ["chantierService"], select: { chantierService: true } }),
  ]);
  const chantiersConnus = [
    ...new Set([...dossiers.map((d) => d.chantier), ...remontees.map((r) => r.chantierService)]),
  ].sort();

  return (
    <ConteneurPage largeur="formulaire">
      <BoutonRetour href="/remontees" label="Retour aux remontées" />
      <EntetePage
        titre="Nouvelle remontée d’information"
        sousTitre="Une remontée d’information peut rester une simple information, ou être transformée en écart si nécessaire."
      />

      <form action={creerRemontee} className="space-y-6 rounded-xl border bg-card p-6">
        <AvertissementNonEnregistre />

        <RemonteeFields chantiersConnus={chantiersConnus} />

        <div className="flex justify-end gap-3 pt-2">
          <BoutonCreer>Enregistrer la remontée</BoutonCreer>
        </div>
      </form>
    </ConteneurPage>
  );
}
