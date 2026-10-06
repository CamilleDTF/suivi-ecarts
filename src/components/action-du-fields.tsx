"use client";

import { RESPONSABLES_DU, TYPES_ACTION_DU, avecValeursExistantes } from "@/lib/labels";
import { useEditMode } from "@/components/formulaire-editable";

type ActionDUValues = {
  action?: string | null;
  risquesConcernes?: string | null;
  typeAction?: string | null;
  responsable?: string | null;
  preuveRealisation?: string | null;
};

const inputCls =
  "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";
const labelCls = "mb-1.5 block text-sm font-medium";
const aideCls = "mt-1.5 text-xs text-muted-foreground";

export function ActionDUFields({
  v,
  responsablesConnus = [],
}: {
  v: ActionDUValues;
  /** Responsables déjà saisis ailleurs, ajoutés aux suggestions. */
  responsablesConnus?: string[];
}) {
  const disabled = !useEditMode();
  const responsables = avecValeursExistantes(RESPONSABLES_DU, [
    ...responsablesConnus,
    ...(v.responsable ? [v.responsable] : []),
  ]);
  const types = avecValeursExistantes(TYPES_ACTION_DU, v.typeAction ? [v.typeAction] : []);

  return (
    <fieldset disabled={disabled} className="space-y-5 disabled:opacity-60">
      <div>
        <label className={labelCls}>Action</label>
        <textarea name="action" defaultValue={v.action ?? ""} required rows={3} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Risques concernés</label>
        <input
          name="risquesConcernes"
          defaultValue={v.risquesConcernes ?? ""}
          placeholder="A1, A2, B1, E3 à E15…"
          className={inputCls}
        />
        {/* Saisie libre assumée : le DU écrit des plages ("E3 à E15") et des
            listes mêlées qu'une sélection de risques cochés ne rendrait pas. */}
        <p className={aideCls}>
          Codes du Document Unique, séparés par des virgules. Les plages s&apos;écrivent telles
          quelles.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Type d&apos;action</label>
          <select name="typeAction" defaultValue={v.typeAction ?? ""} className={inputCls}>
            <option value="">—</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Responsable</label>
          {/* Champ libre avec suggestions plutôt qu'une liste fermée : le DU
              désigne des fonctions, et leur libellé varie ("Conducteur de
              travaux / Chef de chantier"). */}
          <input
            name="responsable"
            defaultValue={v.responsable ?? ""}
            list="responsables-du"
            className={inputCls}
          />
          <datalist id="responsables-du">
            {responsables.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <label className={labelCls}>Preuve de réalisation</label>
        <textarea
          name="preuveRealisation"
          defaultValue={v.preuveRealisation ?? ""}
          rows={4}
          placeholder={"Causerie\nMail\nQuiz mensuel\nAudit interne chantier"}
          className={inputCls}
        />
        <p className={aideCls}>Un moyen de preuve par ligne.</p>
      </div>
    </fieldset>
  );
}
