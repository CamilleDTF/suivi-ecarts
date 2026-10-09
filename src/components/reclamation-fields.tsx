"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { ChampFichier } from "@/components/champ-fichier";
import {
  TYPE_RECLAMATION_LABELS,
  TYPE_ACTIVITE_LABELS,
  CANAUX_RECLAMATION,
  DOMAINES_OPTIONS,
  THEME_OPTIONS,
  GRAVITE_FREQUENCE_OPTIONS,
  CRITICITE_COLORS,
  calculerCriticite,
  avecValeursExistantes,
} from "@/lib/labels";
import { TypeActivite, TypeReclamation } from "@/generated/prisma/enums";
import { useEditMode } from "@/components/formulaire-editable";

type Point = {
  description?: string | null;
  gravite?: string | null;
  frequence?: string | null;
  cause?: string | null;
};

type ReclamationValues = {
  type?: string | null;
  dateReception?: Date | null;
  emetteur?: string | null;
  canal?: string | null;
  chantier?: string | null;
  typeActivite?: string | null;
  objet?: string | null;
  description?: string | null;
  domaines?: string[] | null;
  theme?: string[] | null;
  analyse?: string | null;
  reponse?: string | null;
  dateReponse?: Date | null;
  personneSaisie?: string | null;
  enregistrement?: string | null;
  enregistrementNom?: string | null;
  points?: Point[] | null;
};

const inputCls =
  "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60";
const labelCls = "mb-1.5 block text-sm font-medium";

function toDateInput(d?: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "";
}

// Chaque point a une clé stable : sans elle, retirer le deuxième point ferait
// glisser les valeurs saisies du troisième dans le deuxième.
let prochaineCle = 0;
const avecCle = (p: Point) => ({ ...p, cle: prochaineCle++ });

function LignePoint({
  point,
  numero,
  retirer,
  disabled,
}: {
  point: Point;
  numero: number;
  retirer?: () => void;
  disabled: boolean;
}) {
  const [gravite, setGravite] = useState(point.gravite ?? "");
  const [frequence, setFrequence] = useState(point.frequence ?? "");
  const criticite = calculerCriticite(gravite, frequence);

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Point {numero}</p>
        {retirer && !disabled && (
          <Button type="button" variant="ghost" size="sm" onClick={retirer}>
            <Trash2Icon /> Retirer
          </Button>
        )}
      </div>
      <textarea
        name="pointDescription"
        defaultValue={point.description ?? ""}
        required
        rows={2}
        placeholder="Ce que le plaignant reproche"
        className={inputCls}
      />
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Gravité</label>
          <select name="pointGravite" value={gravite} onChange={(e) => setGravite(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {GRAVITE_FREQUENCE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Fréquence</label>
          <select
            name="pointFrequence"
            value={frequence}
            onChange={(e) => setFrequence(e.target.value)}
            className={inputCls}
          >
            <option value="">—</option>
            {GRAVITE_FREQUENCE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Criticité</label>
          <div className={inputCls}>
            {criticite ? <Badge label={criticite} colorClass={CRITICITE_COLORS[criticite]} /> : "—"}
          </div>
        </div>
      </div>
      <div>
        <label className={labelCls}>Cause</label>
        <textarea name="pointCause" defaultValue={point.cause ?? ""} rows={1} className={inputCls} />
      </div>
    </div>
  );
}

export function ReclamationFields({
  v = {},
  chantiersConnus = [],
  emetteursConnus = [],
}: {
  v?: ReclamationValues;
  /** Chantiers déjà utilisés dans l'application, proposés en suggestion. */
  chantiersConnus?: string[];
  emetteursConnus?: string[];
}) {
  const disabled = !useEditMode();
  const [points, setPoints] = useState(() => (v.points?.length ? v.points : [{}]).map(avecCle));
  const domaines = avecValeursExistantes(DOMAINES_OPTIONS, v.domaines);
  const themes = avecValeursExistantes(THEME_OPTIONS, v.theme);

  return (
    <div className="space-y-6">
      <fieldset disabled={disabled} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Type</label>
            <select name="type" defaultValue={v.type ?? "RECLAMATION"} required className={inputCls}>
              {Object.values(TypeReclamation).map((t) => (
                <option key={t} value={t}>
                  {TYPE_RECLAMATION_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Date de réception</label>
            <input
              type="date"
              name="dateReception"
              defaultValue={toDateInput(v.dateReception) || new Date().toISOString().slice(0, 10)}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Émetteur</label>
            <input
              name="emetteur"
              defaultValue={v.emetteur ?? ""}
              required
              list="emetteurs-connus"
              placeholder="Client, maître d'ouvrage, riverain…"
              className={inputCls}
            />
            <datalist id="emetteurs-connus">
              {emetteursConnus.map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelCls}>Canal</label>
            <input name="canal" defaultValue={v.canal ?? ""} list="canaux-reclamation" className={inputCls} />
            <datalist id="canaux-reclamation">
              {CANAUX_RECLAMATION.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelCls}>Chantier</label>
            <input name="chantier" defaultValue={v.chantier ?? ""} list="chantiers-connus" className={inputCls} />
            <datalist id="chantiers-connus">
              {chantiersConnus.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelCls}>Type d&apos;activité</label>
            <select name="typeActivite" defaultValue={v.typeActivite ?? ""} className={inputCls}>
              <option value="">—</option>
              {Object.values(TypeActivite).map((t) => (
                <option key={t} value={t}>
                  {TYPE_ACTIVITE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Objet</label>
          <input name="objet" defaultValue={v.objet ?? ""} required className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea name="description" defaultValue={v.description ?? ""} rows={3} className={inputCls} />
        </div>

        <fieldset className="space-y-3">
          <legend className={labelCls}>Points soulevés</legend>
          {points.map((p, i) => (
            <LignePoint
              key={p.cle}
              point={p}
              numero={i + 1}
              disabled={disabled}
              retirer={points.length > 1 ? () => setPoints(points.filter((x) => x.cle !== p.cle)) : undefined}
            />
          ))}
          {!disabled && (
            <Button type="button" variant="outline" size="sm" onClick={() => setPoints([...points, avecCle({})])}>
              <PlusIcon /> Ajouter un point
            </Button>
          )}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className={labelCls}>Domaine(s)</legend>
            <div className="grid grid-cols-1 gap-y-1.5">
              {domaines.map((d) => (
                <label key={d} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="domaines" value={d} defaultChecked={(v.domaines ?? []).includes(d)} />
                  {d}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className={labelCls}>Thème(s)</legend>
            <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
              {themes.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="theme" value={t} defaultChecked={(v.theme ?? []).includes(t)} />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div>
          <label className={labelCls}>Analyse</label>
          <textarea
            name="analyse"
            defaultValue={v.analyse ?? ""}
            rows={3}
            placeholder="La réclamation est-elle fondée ? Pourquoi est-ce arrivé ?"
            className={inputCls}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <div>
            <label className={labelCls}>Réponse apportée</label>
            <textarea name="reponse" defaultValue={v.reponse ?? ""} rows={3} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Date de réponse</label>
            <input type="date" name="dateReponse" defaultValue={toDateInput(v.dateReponse)} className={inputCls} />
          </div>
        </div>
      </fieldset>

      {/* Hors du fieldset, comme pour un dossier : l'aperçu est du contenu,
          pas une commande de saisie, et ne doit pas être grisé. */}
      <ChampFichier
        name="enregistrement"
        nomFichierName="enregistrementNom"
        label="Courrier du plaignant"
        valeurInitiale={v.enregistrement}
        nomFichierInitial={v.enregistrementNom}
        disabled={disabled}
        accepteDocuments
        libelleAjouter="Joindre le courrier"
        libelleRemplacer="Remplacer le courrier"
        libelleRetirer="Retirer le courrier"
        libelleVide="Aucun courrier joint"
      />
    </div>
  );
}
