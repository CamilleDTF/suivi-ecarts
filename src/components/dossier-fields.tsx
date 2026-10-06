"use client";

import { ORIGINE_LABELS } from "@/lib/labels";
import { Origine } from "@/generated/prisma/enums";
import { useEditMode } from "@/components/formulaire-editable";
import { ChampFichier } from "@/components/champ-fichier";

type DossierValues = {
  dateDetection: Date;
  origine: string;
  declarant: string;
  chantier: string;
  enregistrement?: string | null;
  enregistrementNom?: string | null;
};

const inputCls =
  "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50";
const labelCls = "mb-1.5 block text-sm font-medium";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function DossierFields({ v }: { v: DossierValues }) {
  const disabled = !useEditMode();
  return (
    <div className="space-y-4">
      <fieldset disabled={disabled} className="grid grid-cols-2 gap-4 disabled:opacity-60">
        <div>
          <label className={labelCls}>Chantier</label>
          <input name="chantier" defaultValue={v.chantier} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Déclarant</label>
          <input name="declarant" defaultValue={v.declarant} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Date de détection</label>
          <input type="date" name="dateDetection" defaultValue={toDateInput(v.dateDetection)} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Origine</label>
          <select name="origine" defaultValue={v.origine} required className={inputCls}>
            {Object.values(Origine).map((o) => (
              <option key={o} value={o}>
                {ORIGINE_LABELS[o]}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* Hors du fieldset : son `disabled:opacity-60` grise les champs en
          lecture seule, ce qui délaverait aussi l'aperçu — or c'est du
          contenu, pas une commande de saisie. */}
      <ChampFichier
        name="enregistrement"
        nomFichierName="enregistrementNom"
        label="Enregistrement"
        valeurInitiale={v.enregistrement}
        nomFichierInitial={v.enregistrementNom}
        disabled={disabled}
        accepteDocuments
        libelleAjouter="Ajouter un enregistrement"
        libelleRemplacer="Remplacer l'enregistrement"
        libelleRetirer="Retirer l'enregistrement"
        libelleVide="Aucun enregistrement"
      />
    </div>
  );
}
