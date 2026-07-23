import { ORIGINE_LABELS, TYPE_ACTIVITE_LABELS, NATURES_OPTIONS, DOMAINES_OPTIONS } from "@/lib/labels";
import { Origine, TypeActivite } from "@/generated/prisma/enums";

type EcartValues = {
  dateDetection?: Date | null;
  origine?: string | null;
  declarant?: string | null;
  typeActivite?: string | null;
  natures?: string[] | null;
  domaines?: string[] | null;
  pointsSensibles?: string | null;
  graviteReelle?: string | null;
  gravitePotentielle?: string | null;
  frequence?: string | null;
  description?: string | null;
  mesureImmediate?: string | null;
  cause?: string | null;
  critereEfficacite?: string | null;
};

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

function toDateInput(d?: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function EcartFields({ v = {} }: { v?: EcartValues }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Date de détection</label>
          <input
            type="date"
            name="dateDetection"
            defaultValue={toDateInput(v.dateDetection)}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Origine</label>
          <select name="origine" defaultValue={v.origine ?? ""} required className={inputCls}>
            {Object.values(Origine).map((o) => (
              <option key={o} value={o}>
                {ORIGINE_LABELS[o]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Déclarant</label>
          <input name="declarant" defaultValue={v.declarant ?? ""} required className={inputCls} />
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

      <fieldset>
        <legend className={labelCls}>Nature(s)</legend>
        <div className="grid grid-cols-2 gap-1">
          {NATURES_OPTIONS.map((n) => (
            <label key={n} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="natures" value={n} defaultChecked={(v.natures ?? []).includes(n)} />
              {n}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={labelCls}>Domaine(s)</legend>
        <div className="grid grid-cols-2 gap-1">
          {DOMAINES_OPTIONS.map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="domaines" value={d} defaultChecked={(v.domaines ?? []).includes(d)} />
              {d}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className={labelCls}>Points sensibles</label>
        <textarea name="pointsSensibles" defaultValue={v.pointsSensibles ?? ""} rows={2} className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Gravité réelle</label>
          <input name="graviteReelle" defaultValue={v.graviteReelle ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Gravité potentielle</label>
          <input name="gravitePotentielle" defaultValue={v.gravitePotentielle ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Fréquence</label>
          <input name="frequence" defaultValue={v.frequence ?? ""} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea name="description" defaultValue={v.description ?? ""} rows={3} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Mesure immédiate</label>
        <textarea name="mesureImmediate" defaultValue={v.mesureImmediate ?? ""} rows={2} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Cause</label>
        <textarea name="cause" defaultValue={v.cause ?? ""} rows={2} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Critère d&apos;efficacité</label>
        <textarea name="critereEfficacite" defaultValue={v.critereEfficacite ?? ""} rows={2} className={inputCls} />
      </div>
    </div>
  );
}
