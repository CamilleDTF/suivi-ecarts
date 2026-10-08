import { prisma } from "@/lib/prisma";
import { creerFicheSSE } from "@/app/fiches-sse/actions";
import { FicheSSEFields } from "@/components/fiche-sse-fields";
import { ArbreCausesEditeur } from "@/components/arbre-causes-editeur";
import { AvertissementNonEnregistre } from "@/components/avertissement-non-enregistre";
import { calculerCriticite, CRITICITE_VERS_TYPE_ANALYSE } from "@/lib/labels";
import { BoutonCreer } from "@/components/bouton-creer";
import { BoutonRetour } from "@/components/bouton-retour";
import { ConteneurPage, EntetePage } from "@/components/page-liste";

export default async function NouvelleFicheSSEPage({
  searchParams,
}: {
  searchParams: Promise<{ ecartId?: string }>;
}) {
  const { ecartId } = await searchParams;
  const ecart = ecartId
    ? await prisma.ecart.findUnique({
        where: { id: ecartId },
        select: {
          reference: true,
          gravite: true,
          frequence: true,
          domaines: true,
          theme: true,
          description: true,
          dossier: { select: { chantier: true } },
        },
      })
    : null;

  // La cotation de l'écart est reprise telle quelle : c'est le même fait, coté
  // une fois. La criticité qui en découle pré-sélectionne le type d'analyse —
  // un écart élevé impose de remonter aux causes, un écart faible se corrige
  // sur place. Tout reste modifiable avant enregistrement.
  const criticiteHeritee = calculerCriticite(ecart?.gravite ?? "", ecart?.frequence ?? "");

  return (
    <ConteneurPage largeur="formulaire">
      <BoutonRetour
        href={ecartId && ecart ? `/ecarts/${ecartId}` : "/fiches-sse"}
        label={ecartId && ecart ? `Écart ${ecart.reference}` : "Évènements SSE"}
      />
      <EntetePage
        titre="Nouvel évènement SSE"
        sousTitre={
          ecart
            ? `Rattaché à l'écart ${ecart.reference}${ecart.dossier ? ` (${ecart.dossier.chantier})` : ""}`
            : undefined
        }
      />

      <form action={creerFicheSSE} className="space-y-6 rounded-xl border bg-card p-6">
        <AvertissementNonEnregistre />
        {ecartId && <input type="hidden" name="ecartId" value={ecartId} />}

        {/* Un évènement rattaché à un écart décrit le même fait : il reprend la
            description, les domaines, les thèmes et la
            cotation de l'écart. Tout reste modifiable avant enregistrement. */}
        <FicheSSEFields
          v={{
            dateHeure: new Date(),
            domaine: ecart?.domaines,
            theme: ecart?.theme,
            descriptionFactuelle: ecart?.description,
            gravite: ecart?.gravite,
            frequence: ecart?.frequence,
            criticite: criticiteHeritee || undefined,
            typeAnalyse: CRITICITE_VERS_TYPE_ANALYSE[criticiteHeritee],
          }}
          defaultNomChantier={ecart?.dossier?.chantier}
          apresTypeAnalyse={<ArbreCausesEditeur />}
          nouveau
        />

        <div className="flex justify-end gap-3 pt-2">
          <BoutonCreer>Enregistrer l&apos;évènement</BoutonCreer>
        </div>
      </form>
    </ConteneurPage>
  );
}
