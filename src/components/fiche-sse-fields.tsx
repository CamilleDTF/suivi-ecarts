"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { Badge } from "@/components/badge";

const TYPE_ANALYSE_OPTIONS = [
  "Correction immédiate",
  "Action corrective à réaliser",
  "Analyse des causes",
  "Arbre des causes + analyse collective",
];

const CRITICITE_VERS_TYPE_ANALYSE: Record<string, string> = {
  Faible: "Correction immédiate",
  Moyenne: "Action corrective à réaliser",
  Élevée: "Analyse des causes",
};

const CRITICITE_COLORS: Record<string, string> = {
  Faible: "bg-green-100 text-green-800",
  Moyenne: "bg-amber-100 text-amber-800",
  Élevée: "bg-red-100 text-red-800",
};

function calculerCriticite(gravite: string, frequence: string): string {
  const g = Number(gravite);
  const f = Number(frequence);
  if (!g || !f) return "";
  const produit = g * f;
  if (produit >= 9) return "Élevée";
  if (produit >= 4) return "Moyenne";
  return "Faible";
}

const TYPE_EVENEMENT_OPTIONS = [
  "Accident",
  "Presqu'accident",
  "Situation dangereuse",
  "Comportement à risque",
  "Impact environnemental",
  "Impact environnemental & situation dangereuse",
  "Impact environnemental & comportement à risque",
  "Situation dangereuse & comportement à risque",
  "Comportement à risque & presqu'accident",
  "Presqu'accident & situation dangereuse",
];

const GRAVITE_FREQUENCE_OPTIONS = ["1", "2", "3", "4"];

const DOMAINE_OPTIONS = ["Sécurité", "Santé", "Environnement"];

const THEME_OPTIONS = [
  "EPI / MPC",
  "Risque Amiante",
  "Matériel",
  "Risque routier",
  "Travaux en hauteur",
  "Déchet",
  "Produit chimique",
  "Compétence / Formation",
  "Comportement",
  "Analyse",
  "Environnement",
];

const MISE_A_JOUR_OPTIONS = ["Non", "DUERP", "Procédure", "Autres"];

const TYPE_COMMUNICATION_OPTIONS = [
  "Non applicable",
  "Affichage",
  "Réunion",
  "Causerie",
  "Flash sécurité",
  "Email",
];

type FicheSSEValues = {
  typeEvenement?: string | null;
  numeroInterne?: string | null;
  emetteur?: string | null;
  nomChantier?: string | null;
  dateHeure?: Date | null;
  lieuZone?: string | null;
  personnesImpliquees?: string | null;
  temoins?: string | null;
  descriptionFactuelle?: string | null;
  mesuresImmediatesPrises?: string | null;
  gravite?: string | null;
  frequence?: string | null;
  criticite?: string | null;
  declarationExterneNecessaire?: boolean | null;
  declarationExterneA?: string | null;
  typeAnalyse?: string | null;
  domaine?: string[] | null;
  theme?: string[] | null;
  referencePreuve?: string | null;
  miseAJourNecessaire?: string[] | null;
  procedureLaquelle?: string | null;
  referenceDUERP?: string | null;
  nouveauRisqueNecessaire?: boolean | null;
  referenceNouveauRisque?: string | null;
  communicationInterne?: boolean | null;
  typeCommunication?: string | null;
  toutesActionsCloturees?: boolean | null;
  validationNom?: string | null;
  validationFonction?: string | null;
  validationDate?: Date | null;
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

function toDatetimeLocal(d?: Date | null) {
  return d ? d.toISOString().slice(0, 16) : "";
}
function toDateInput(d?: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "";
}

function Select({
  name,
  value,
  options,
  className,
  onChange,
  disabled,
}: {
  name: string;
  value?: string | null;
  options: string[];
  className?: string;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? ""}
      className={className ?? inputCls}
      onChange={onChange}
      disabled={disabled}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function CasesACocher({
  name,
  options,
  valeurs,
}: {
  name: string;
  options: string[];
  valeurs?: string[] | null;
}) {
  const v = valeurs ?? [];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {options.map((o) => (
        <label key={o} className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name={name} value={o} defaultChecked={v.includes(o)} />
          {o}
        </label>
      ))}
    </div>
  );
}

export function FicheSSEFields({
  v = {},
  defaultNomChantier,
  disabled = false,
  apresTypeAnalyse,
}: {
  v?: FicheSSEValues;
  defaultNomChantier?: string;
  disabled?: boolean;
  apresTypeAnalyse?: ReactNode;
}) {
  const [criticite, setCriticite] = useState(v.criticite ?? "");
  const [miseAJour, setMiseAJour] = useState<string[]>(v.miseAJourNecessaire ?? []);
  const [communicationInterneCoche, setCommunicationInterneCoche] = useState(!!v.communicationInterne);

  function toggleMiseAJour(option: string, coche: boolean) {
    setMiseAJour((prev) => (coche ? [...prev, option] : prev.filter((o) => o !== option)));
  }

  function handleGraviteOuFrequenceChange(form: HTMLFormElement | null) {
    if (!form) return;
    const gravite = (form.elements.namedItem("gravite") as HTMLSelectElement | null)?.value ?? "";
    const frequence = (form.elements.namedItem("frequence") as HTMLSelectElement | null)?.value ?? "";
    const nouvelleCriticite = calculerCriticite(gravite, frequence);
    setCriticite(nouvelleCriticite);

    const suggestion = CRITICITE_VERS_TYPE_ANALYSE[nouvelleCriticite];
    const typeAnalyseSelect = form.elements.namedItem("typeAnalyse");
    if (suggestion && typeAnalyseSelect instanceof HTMLSelectElement) {
      typeAnalyseSelect.value = suggestion;
    }
  }

  return (
    <fieldset disabled={disabled} className="space-y-6 disabled:opacity-60">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">1. Déclaration</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Numéro interne</label>
            <input name="numeroInterne" defaultValue={v.numeroInterne ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Émetteur</label>
            <input name="emetteur" defaultValue={v.emetteur ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Date et heure</label>
            <input
              type="datetime-local"
              name="dateHeure"
              defaultValue={toDatetimeLocal(v.dateHeure)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Nom du chantier</label>
            <input
              name="nomChantier"
              defaultValue={v.nomChantier ?? defaultNomChantier ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Lieu / zone</label>
            <input name="lieuZone" defaultValue={v.lieuZone ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Personnes impliquées</label>
            <input name="personnesImpliquees" defaultValue={v.personnesImpliquees ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Témoins</label>
            <input name="temoins" defaultValue={v.temoins ?? ""} className={inputCls} />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelCls}>Domaine</label>
          <CasesACocher name="domaine" options={DOMAINE_OPTIONS} valeurs={v.domaine} />
        </div>
        <div className="mt-4">
          <label className={labelCls}>Thème</label>
          <CasesACocher name="theme" options={THEME_OPTIONS} valeurs={v.theme} />
        </div>
        <div className="mt-4">
          <label className={labelCls}>Description factuelle</label>
          <textarea
            name="descriptionFactuelle"
            rows={3}
            defaultValue={v.descriptionFactuelle ?? ""}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">2. Mesures immédiates</h2>
        <textarea
          name="mesuresImmediatesPrises"
          rows={2}
          defaultValue={v.mesuresImmediatesPrises ?? ""}
          className={inputCls}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">3. Évaluation du risque</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Type d&apos;événement</label>
            <Select name="typeEvenement" value={v.typeEvenement} options={TYPE_EVENEMENT_OPTIONS} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Gravité</label>
            <Select
              name="gravite"
              value={v.gravite}
              options={GRAVITE_FREQUENCE_OPTIONS}
              onChange={(e) => handleGraviteOuFrequenceChange(e.target.form)}
            />
          </div>
          <div>
            <label className={labelCls}>Fréquence</label>
            <Select
              name="frequence"
              value={v.frequence}
              options={GRAVITE_FREQUENCE_OPTIONS}
              onChange={(e) => handleGraviteOuFrequenceChange(e.target.form)}
            />
          </div>
          <div>
            <label className={labelCls}>Criticité</label>
            <input type="hidden" name="criticite" value={criticite} />
            <div className={inputCls}>
              {criticite ? <Badge label={criticite} colorClass={CRITICITE_COLORS[criticite]} /> : "—"}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">4. Communication (déclaration externe)</h2>
        <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="declarationExterneNecessaire"
            defaultChecked={!!v.declarationExterneNecessaire}
          />
          Déclaration externe nécessaire
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Déclaration externe à</label>
            <input name="declarationExterneA" defaultValue={v.declarationExterneA ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Référence preuve</label>
            <input name="referencePreuve" defaultValue={v.referencePreuve ?? ""} className={inputCls} />
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">5. Type d&apos;analyse des causes</h2>
        <select name="typeAnalyse" defaultValue={v.typeAnalyse ?? ""} className={inputCls}>
          <option value="">—</option>
          {TYPE_ANALYSE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      {apresTypeAnalyse}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">
          Documentation et communication
        </h2>
        <div className="mb-3">
          <label className={labelCls}>Mise à jour nécessaire ?</label>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {MISE_A_JOUR_OPTIONS.map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="miseAJourNecessaire"
                  value={o}
                  checked={miseAJour.includes(o)}
                  onChange={(e) => toggleMiseAJour(o, e.target.checked)}
                />
                {o}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Procédure — laquelle</label>
            <input
              name="procedureLaquelle"
              defaultValue={v.procedureLaquelle ?? ""}
              disabled={!miseAJour.includes("Procédure")}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Référence DUERP</label>
            <input
              name="referenceDUERP"
              defaultValue={v.referenceDUERP ?? ""}
              disabled={!miseAJour.includes("DUERP")}
              className={inputCls}
            />
          </div>
        </div>

        <label className="mt-4 mb-3 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="communicationInterne"
            checked={communicationInterneCoche}
            onChange={(e) => setCommunicationInterneCoche(e.target.checked)}
          />
          Communication interne réalisée
        </label>
        <div>
          <label className={labelCls}>Type de communication</label>
          <Select
            name="typeCommunication"
            value={v.typeCommunication}
            options={TYPE_COMMUNICATION_OPTIONS}
            disabled={!communicationInterneCoche}
          />
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="nouveauRisqueNecessaire" defaultChecked={!!v.nouveauRisqueNecessaire} />
          Nouveau risque à ajouter
        </label>
        <div className="mt-3">
          <label className={labelCls}>Référence nouveau risque</label>
          <input
            name="referenceNouveauRisque"
            defaultValue={v.referenceNouveauRisque ?? ""}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">8. Validation &amp; clôture</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nom (validation)</label>
            <input name="validationNom" defaultValue={v.validationNom ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Fonction (validation)</label>
            <input name="validationFonction" defaultValue={v.validationFonction ?? ""} className={inputCls} />
          </div>
        </div>
        <label className="mt-4 mb-3 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="toutesActionsCloturees" defaultChecked={!!v.toutesActionsCloturees} />
          Toutes les actions sont clôturées
        </label>
        <div>
          <label className={labelCls}>Date de validation</label>
          <input
            type="date"
            name="validationDate"
            defaultValue={toDateInput(v.validationDate)}
            className={inputCls}
          />
        </div>
      </div>
    </fieldset>
  );
}
