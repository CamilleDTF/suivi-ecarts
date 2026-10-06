import { creerDossier } from "@/app/dossiers/actions";
import { ORIGINE_LABELS } from "@/lib/labels";
import { Origine } from "@/generated/prisma/enums";
import { BoutonCreer } from "@/components/bouton-creer";
import { BoutonRetour } from "@/components/bouton-retour";
import { ChampFichier } from "@/components/champ-fichier";
import { ZoneTraitement } from "@/components/formulaire-editable";
import { ConteneurPage, EntetePage } from "@/components/page-liste";

const inputCls =
  "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const labelCls = "mb-1.5 block text-sm font-medium";

export default function NouveauDossierPage() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ConteneurPage largeur="formulaire">
      <BoutonRetour href="/dossiers" label="Retour aux dossiers" />
      <EntetePage
        titre="Nouveau dossier"
        sousTitre="Un dossier regroupe les écarts détectés sur un même chantier."
      />

      <form action={creerDossier} className="rounded-xl border bg-card p-6">
        {/* ZoneTraitement ne rend aucun élément : elle relaie « photo en cours
            de conversion » au bouton de création, qui doit attendre — sinon le
            dossier est créé sans la photo. */}
        <ZoneTraitement>
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="dateDetection" className={labelCls}>
                  Date de détection
                </label>
                <input
                  id="dateDetection"
                  type="date"
                  name="dateDetection"
                  defaultValue={today}
                  required
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="origine" className={labelCls}>
                  Origine
                </label>
                <select id="origine" name="origine" required className={inputCls}>
                  {Object.values(Origine).map((o) => (
                    <option key={o} value={o}>
                      {ORIGINE_LABELS[o]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="declarant" className={labelCls}>
                  Déclarant
                </label>
                <input id="declarant" type="text" name="declarant" required className={inputCls} />
              </div>

              <div>
                <label htmlFor="chantier" className={labelCls}>
                  Chantier
                </label>
                <input id="chantier" type="text" name="chantier" required className={inputCls} />
              </div>
            </div>

            <ChampFichier
              name="enregistrement"
              nomFichierName="enregistrementNom"
              label="Enregistrement"
              accepteDocuments
              libelleAjouter="Ajouter un enregistrement"
              libelleRemplacer="Remplacer l'enregistrement"
              libelleRetirer="Retirer l'enregistrement"
              libelleVide="Aucun enregistrement"
            />

            <div className="flex justify-end gap-3 border-t pt-5">
              <BoutonCreer>Créer le dossier</BoutonCreer>
            </div>
          </div>
        </ZoneTraitement>
      </form>
    </ConteneurPage>
  );
}
