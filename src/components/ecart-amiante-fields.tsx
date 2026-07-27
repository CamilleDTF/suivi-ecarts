"use client";

import { useEditMode } from "@/components/formulaire-editable";
import { TYPES_ECART_AMIANTE, CAUSES_ECART_AMIANTE } from "@/lib/labels";

type EcartAmianteValues = {
  nomChantier?: string | null;
  numeroChantier?: string | null;
  conducteur?: string | null;
  chef?: string | null;
  zone?: string | null;
  processus?: string | null;
  typeAnalyse?: string | null;
  referenceAnalyse?: string | null;
  typeEcart?: string | null;
  cause?: string | null;
  resultatAttendu?: string | null;
  resultatObtenu?: string | null;
  description?: string | null;
  expositionAccidentelle?: boolean | null;
  personneConcernee?: string | null;
  fie?: boolean | null;
  besoinNouvelleAnalyse?: boolean | null;
  pasNouvelleAnalyse?: string | null;
  dateNouvelleAnalyse?: Date | null;
  laboratoireNouvelleAnalyse?: string | null;
  chantierNouvelleAnalyse?: string | null;
  resultatAttenduNouvelleAnalyse?: string | null;
  resultatObtenuNouvelleAnalyse?: string | null;
  dateCloture?: Date | null;
  evenementSSE?: boolean | null;
};

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

function toDateInput(d?: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "";
}

// Conserve une valeur déjà enregistrée qui ne figure pas dans la liste (ancienne
// saisie libre), pour ne pas la faire disparaître au prochain enregistrement.
function avecValeurExistante(options: string[], valeur?: string | null) {
  return valeur && !options.includes(valeur) ? [...options, valeur] : options;
}

// Oui / Non explicites plutôt qu'une case à cocher : une case décochée ne
// distingue pas "non" de "pas encore renseigné", ce qui compte sur une fiche
// d'exposition. Aucun bouton coché tant que la question n'a pas été tranchée.
function OuiNon({ name, valeur }: { name: string; valeur?: boolean | null }) {
  return (
    <div className="flex items-center gap-4">
      <label className="flex items-center gap-1.5 text-sm text-slate-700">
        <input type="radio" name={name} value="oui" defaultChecked={valeur === true} />
        Oui
      </label>
      <label className="flex items-center gap-1.5 text-sm text-slate-700">
        <input type="radio" name={name} value="non" defaultChecked={valeur === false} />
        Non
      </label>
    </div>
  );
}

export function EcartAmianteFields({ v = {} }: { v?: EcartAmianteValues }) {
  const disabled = !useEditMode();
  return (
    <fieldset disabled={disabled} className="space-y-6 disabled:opacity-60">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Identification</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nom du chantier</label>
            <input name="nomChantier" defaultValue={v.nomChantier ?? ""} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Numéro de chantier</label>
            <input name="numeroChantier" defaultValue={v.numeroChantier ?? ""} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Conducteur</label>
            <input name="conducteur" defaultValue={v.conducteur ?? ""} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Chef</label>
            <input name="chef" defaultValue={v.chef ?? ""} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Zone</label>
            <input name="zone" defaultValue={v.zone ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Processus</label>
            <input name="processus" defaultValue={v.processus ?? ""} className={inputCls} />
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Analyse</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Type d&apos;analyse</label>
            <input name="typeAnalyse" defaultValue={v.typeAnalyse ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Référence analyse</label>
            <input name="referenceAnalyse" defaultValue={v.referenceAnalyse ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Type d&apos;écart</label>
            <select name="typeEcart" defaultValue={v.typeEcart ?? ""} className={inputCls}>
              <option value="">—</option>
              {avecValeurExistante(TYPES_ECART_AMIANTE, v.typeEcart).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Ces deux champs reçoivent des valeurs courtes (un seuil, un nombre de
            fibres) : une ligne suffit, et les mettre côte à côte facilite la
            comparaison attendu / obtenu. */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Résultat attendu</label>
            <input name="resultatAttendu" defaultValue={v.resultatAttendu ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Résultat obtenu</label>
            <input name="resultatObtenu" defaultValue={v.resultatObtenu ?? ""} className={inputCls} />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelCls}>Description</label>
          <textarea name="description" defaultValue={v.description ?? ""} rows={2} className={inputCls} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Cause</h2>
        <select name="cause" defaultValue={v.cause ?? ""} className={inputCls}>
          <option value="">Choisissez un élément.</option>
          {avecValeurExistante(CAUSES_ECART_AMIANTE, v.cause).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Exposition</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Exposition accidentelle</label>
            <OuiNon name="expositionAccidentelle" valeur={v.expositionAccidentelle} />
          </div>
          <div>
            <label className={labelCls}>Besoin de créer une FIE ?</label>
            <OuiNon name="fie" valeur={v.fie} />
          </div>
          <div>
            <label className={labelCls}>Personne concernée</label>
            <input name="personneConcernee" defaultValue={v.personneConcernee ?? ""} className={inputCls} />
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Nouvelle analyse</h2>
        <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="besoinNouvelleAnalyse" defaultChecked={!!v.besoinNouvelleAnalyse} />
          Besoin d&apos;une nouvelle analyse
        </label>
        <div>
          <label className={labelCls}>Si non, pourquoi</label>
          <input name="pasNouvelleAnalyse" defaultValue={v.pasNouvelleAnalyse ?? ""} className={inputCls} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Date de la nouvelle analyse</label>
            <input
              type="date"
              name="dateNouvelleAnalyse"
              defaultValue={toDateInput(v.dateNouvelleAnalyse)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Laboratoire</label>
            <input
              name="laboratoireNouvelleAnalyse"
              defaultValue={v.laboratoireNouvelleAnalyse ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Chantier (nouvelle analyse)</label>
            <input
              name="chantierNouvelleAnalyse"
              defaultValue={v.chantierNouvelleAnalyse ?? ""}
              className={inputCls}
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Résultat attendu (nouvelle analyse)</label>
            <input name="resultatAttenduNouvelleAnalyse" defaultValue={v.resultatAttenduNouvelleAnalyse ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Résultat obtenu (nouvelle analyse)</label>
            <input name="resultatObtenuNouvelleAnalyse" defaultValue={v.resultatObtenuNouvelleAnalyse ?? ""} className={inputCls} />
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Clôture</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Date de clôture</label>
            <input
              type="date"
              name="dateCloture"
              defaultValue={toDateInput(v.dateCloture)}
              className={inputCls}
            />
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="evenementSSE" defaultChecked={!!v.evenementSSE} />
          Événement SSE associé
        </label>
      </div>
    </fieldset>
  );
}
