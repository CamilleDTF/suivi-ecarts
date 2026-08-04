import { creerDossier } from "@/app/dossiers/actions";
import { ORIGINE_LABELS } from "@/lib/labels";
import { Origine } from "@/generated/prisma/enums";
import { BoutonCreer } from "@/components/bouton-creer";
import { ChampPhoto } from "@/components/champ-photo";
import { ZoneTraitement } from "@/components/formulaire-editable";

export default function NouveauDossierPage() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Nouveau dossier</h1>

      <form action={creerDossier} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        {/* ZoneTraitement ne rend aucun élément : elle relaie « photo en cours
            de conversion » au bouton de création, qui doit attendre — sinon le
            dossier est créé sans la photo. */}
        <ZoneTraitement>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Date de détection
            </label>
            <input
              type="date"
              name="dateDetection"
              defaultValue={today}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Origine</label>
            <select name="origine" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              {Object.values(Origine).map((o) => (
                <option key={o} value={o}>
                  {ORIGINE_LABELS[o]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Déclarant</label>
            <input
              type="text"
              name="declarant"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Chantier</label>
            <input
              type="text"
              name="chantier"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <ChampPhoto
            name="photo"
            label="Enregistrement"
            libelleAjouter="Ajouter un enregistrement"
            libelleRemplacer="Remplacer l'enregistrement"
            libelleRetirer="Retirer l'enregistrement"
            libelleVide="Aucun enregistrement"
          />

          <div className="flex justify-end gap-3 pt-2">
            <BoutonCreer>Créer le dossier</BoutonCreer>
          </div>
        </ZoneTraitement>
      </form>
    </div>
  );
}
