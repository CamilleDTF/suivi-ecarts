import { prisma } from "@/lib/prisma";
import { creerEcart } from "@/app/ecarts/actions";
import { ChoixDossier } from "@/components/choix-dossier";
import { EcartFields } from "@/components/ecart-fields";
import { BoutonCreer } from "@/components/bouton-creer";
import { BoutonRetour } from "@/components/bouton-retour";
import { ConteneurPage, EntetePage } from "@/components/page-liste";

export default async function NouvelEcartPage({
  searchParams,
}: {
  searchParams: Promise<{ dossierId?: string; remonteeId?: string }>;
}) {
  const { dossierId, remonteeId } = await searchParams;
  const [dossiers, remontee] = await Promise.all([
    prisma.dossier.findMany({ orderBy: { createdAt: "desc" } }),
    remonteeId ? prisma.remonteeInfo.findUnique({ where: { id: remonteeId } }) : null,
  ]);
  const dossierSelectionne = dossierId ? dossiers.find((d) => d.id === dossierId) : undefined;

  return (
    <ConteneurPage largeur="formulaire">
      <BoutonRetour href="/ecarts" label="Écarts" />
      <EntetePage
        titre="Nouvel écart"
        sousTitre={
          remontee
            ? `Créé à partir de la remontée ${remontee.reference} — ${remontee.objet}. La remontée passera en « Transformée en écart ».`
            : undefined
        }
      />

      <form action={creerEcart} className="space-y-4 rounded-xl border bg-card p-6">
        {remonteeId && <input type="hidden" name="remonteeId" value={remonteeId} />}
        <ChoixDossier
          dossiers={dossiers}
          dossierId={dossierId}
          chantierPropose={remontee?.chantierService}
        />

        {/* Les mêmes champs que la fiche : thèmes, gravité × fréquence = criticité, cause. */}
        <EcartFields
          v={{
            dateDetection: remontee ? remontee.dateRemontee : new Date(),
            origine: dossierSelectionne?.origine ?? "",
            declarant: remontee?.personneRemontant ?? "",
            description: remontee ? [remontee.objet, remontee.description].filter(Boolean).join("\n\n") : "",
          }}
        />

        <div className="flex justify-end gap-3 pt-2">
          <BoutonCreer>Créer l&apos;écart</BoutonCreer>
        </div>
      </form>
    </ConteneurPage>
  );
}
