import { creerEcartAmiante } from "@/app/ecart-amiante/actions";
import { EcartAmianteFields } from "@/components/ecart-amiante-fields";
import { BoutonCreer } from "@/components/bouton-creer";
import { BoutonRetour } from "@/components/bouton-retour";
import { ConteneurPage, EntetePage } from "@/components/page-liste";

export default function NouvelEcartAmiantePage() {
  return (
    <ConteneurPage largeur="formulaire">
      <BoutonRetour href="/ecart-amiante" label="Retour aux écarts amiante" />
      <EntetePage titre="Nouvel écart amiante" />

      <form action={creerEcartAmiante} className="space-y-6 rounded-xl border bg-card p-6">
        <EcartAmianteFields />

        <div className="flex justify-end gap-3 pt-2">
          <BoutonCreer>Créer l&apos;écart amiante</BoutonCreer>
        </div>
      </form>
    </ConteneurPage>
  );
}
