import { creerReclamation } from "@/app/reclamations/actions";
import { ReclamationFields } from "@/components/reclamation-fields";
import { AvertissementNonEnregistre } from "@/components/avertissement-non-enregistre";
import { BoutonRetour } from "@/components/bouton-retour";
import { BoutonCreer } from "@/components/bouton-creer";
import { ZoneTraitement } from "@/components/formulaire-editable";
import { ConteneurPage, EntetePage } from "@/components/page-liste";
import { suggestionsReclamation } from "@/lib/reclamations";

export default async function NouvelleReclamationPage() {
  const { chantiersConnus, emetteursConnus } = await suggestionsReclamation();

  return (
    <ConteneurPage largeur="formulaire">
      <BoutonRetour href="/reclamations" label="Retour aux réclamations" />
      <EntetePage
        titre="Nouvelle réclamation"
        sousTitre="Un courrier, un mail ou un appel d’un client, d’un maître d’ouvrage ou d’un riverain. Chaque point reproché se liste à part."
      />

      <form action={creerReclamation} className="space-y-6 rounded-xl border bg-card p-6">
        {/* ZoneTraitement relaie « courrier en cours de conversion » au bouton
            de création, qui doit attendre. */}
        <ZoneTraitement>
          <AvertissementNonEnregistre />
          <ReclamationFields chantiersConnus={chantiersConnus} emetteursConnus={emetteursConnus} />
          <div className="flex justify-end gap-3 pt-2">
            <BoutonCreer>Enregistrer la réclamation</BoutonCreer>
          </div>
        </ZoneTraitement>
      </form>
    </ConteneurPage>
  );
}
