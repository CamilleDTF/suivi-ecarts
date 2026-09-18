import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import {
  ORIGINE_REX_LABELS,
  STATUT_REX_COLORS,
  STATUT_REX_LABELS,
  STATUT_LECTURE_REX_COLORS,
  STATUT_LECTURE_REX_LABELS,
  STATUT_ACTION_LABELS,
  RESPONSABLES,
} from "@/lib/labels";
import {
  mettreAJourRex,
  changerStatutRex,
  supprimerRex,
  creerActionRex,
  mettreAJourStatutActionRex,
  ajouterDestinataireDiffusion,
  marquerDiffusionLue,
} from "@/app/rex/actions";
import { StatutREX, StatutAction } from "@/generated/prisma/enums";
import { StatutSelectForm } from "@/components/statut-select-form";
import { FormulaireEditable } from "@/components/formulaire-editable";
import { RexFields } from "@/components/rex-fields";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { BoutonArchiver } from "@/components/bouton-archiver";
import { archiver, desarchiver } from "@/app/archivage/actions";
import { BoutonRetour } from "@/components/bouton-retour";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rex = await prisma.rex.findUnique({ where: { id }, select: { reference: true } });
  return { title: rex ? `REX ${rex.reference}` : "REX" };
}

export default async function RexDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rex = await prisma.rex.findUnique({
    where: { id },
    include: {
      ecarts: { orderBy: { reference: "asc" }, include: { dossier: true } },
      ficheSSE: { select: { id: true, reference: true, nomChantier: true } },
      ecartAmiante: { select: { id: true, reference: true, nomChantier: true } },
      remontee: { select: { id: true, reference: true, objet: true } },
      actionsPreventives: { orderBy: { createdAt: "desc" } },
      diffusions: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!rex) notFound();

  return (
    <div className="mx-auto max-w-[100rem] px-6 py-8">
      <BoutonRetour href="/rex" label="Retour aux REX" />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{rex.reference}</h1>
            <Badge label={STATUT_REX_LABELS[rex.statut]} colorClass={STATUT_REX_COLORS[rex.statut]} />
          </div>
          <p className="text-sm text-slate-500">{rex.titre}</p>
        </div>
        <div data-no-print className="flex shrink-0 flex-wrap justify-end gap-2">
          <BoutonExportPDF />
          <BoutonArchiver
            action={rex.archiveLe ? desarchiver : archiver}
            entite="rex"
            id={rex.id}
            archive={!!rex.archiveLe}
          />
          <BoutonSupprimer
            action={supprimerRex}
            hiddenFields={{ id: rex.id }}
            message={`Supprimer ce REX supprimera aussi ${rex.actionsPreventives.length} action(s) préventive(s) et ${rex.diffusions.length} diffusion(s). Les écarts, évènements ou remontées rattachés ne sont pas touchés. Cette action est irréversible. Continuer ?`}
          />
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">
          Origine — {ORIGINE_REX_LABELS[rex.origine]}
        </p>
        {rex.ecarts.length > 0 ? (
          <ul>
            {rex.ecarts.map((e) => (
              <li key={e.id}>
                <Link href={`/ecarts/${e.id}`} className="text-blue-700 hover:underline">
                  Écart {e.reference}
                  {e.dossier ? ` — ${e.dossier.chantier}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        ) : rex.ficheSSE ? (
          <Link href={`/fiches-sse/${rex.ficheSSE.id}`} className="text-blue-700 hover:underline">
            Évènement SSE {rex.ficheSSE.reference}
            {rex.ficheSSE.nomChantier ? ` — ${rex.ficheSSE.nomChantier}` : ""}
          </Link>
        ) : rex.ecartAmiante ? (
          <Link href={`/ecart-amiante/${rex.ecartAmiante.id}`} className="text-blue-700 hover:underline">
            Écart amiante {rex.ecartAmiante.reference} — {rex.ecartAmiante.nomChantier}
          </Link>
        ) : rex.remontee ? (
          <Link href={`/remontees/${rex.remontee.id}`} className="text-blue-700 hover:underline">
            Remontée {rex.remontee.reference} — {rex.remontee.objet}
          </Link>
        ) : (
          <span className="text-slate-400">Aucun rattachement</span>
        )}
      </div>

      <div data-no-print className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <StatutSelectForm
          action={changerStatutRex}
          hiddenName="id"
          hiddenValue={rex.id}
          selectName="statut"
          defaultValue={rex.statut}
          options={Object.values(StatutREX).map((s) => ({ value: s, label: STATUT_REX_LABELS[s] }))}
        />
        <p className="mt-2 text-xs text-slate-400">
          {rex.dateDiffusion && `Diffusé le ${rex.dateDiffusion.toLocaleDateString("fr-FR")}`}
          {rex.dateDiffusion && rex.dateVerificationEfficacite && " · "}
          {rex.dateVerificationEfficacite &&
            `Efficacité vérifiée le ${rex.dateVerificationEfficacite.toLocaleDateString("fr-FR")}`}
        </p>
      </div>

      <div className="mb-8">
        <FormulaireEditable
          action={mettreAJourRex}
          hiddenFields={{ id: rex.id }}
          modifiePar={rex.modifiePar}
          modifieLe={rex.modifieLe}
        >
          <RexFields v={rex} />
        </FormulaireEditable>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Actions préventives ({rex.actionsPreventives.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Responsable</th>
                <th className="px-4 py-3 font-medium">Échéance</th>
                <th data-no-print className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rex.actionsPreventives.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="max-w-md px-4 py-3 text-slate-700">{a.action}</td>
                  <td className="px-4 py-3 text-slate-700">{a.responsable}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {a.echeance ? a.echeance.toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td data-no-print className="px-4 py-3">
                    <StatutSelectForm
                      action={mettreAJourStatutActionRex}
                      hiddenName="id"
                      hiddenValue={a.id}
                      selectName="statut"
                      defaultValue={a.statut}
                      options={Object.values(StatutAction).map((s) => ({ value: s, label: STATUT_ACTION_LABELS[s] }))}
                    />
                  </td>
                </tr>
              ))}
              {rex.actionsPreventives.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    Aucune action préventive.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <form
          action={creerActionRex}
          data-no-print
          className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[2fr_1fr_1fr_auto]"
        >
          <input type="hidden" name="rexId" value={rex.id} />
          <input
            name="action"
            required
            placeholder="Nouvelle action préventive"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select name="responsable" required defaultValue="" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="" disabled>
              Responsable
            </option>
            {RESPONSABLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input type="date" name="echeance" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button
            type="submit"
            className="whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Ajouter
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Diffusion ({rex.diffusions.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Destinataire</th>
                <th className="px-4 py-3 font-medium">Chantier</th>
                <th className="px-4 py-3 font-medium">Statut de lecture</th>
                <th className="px-4 py-3 font-medium">Lu le</th>
                <th data-no-print className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rex.diffusions.map((d) => (
                <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{d.destinataire}</td>
                  <td className="px-4 py-3 text-slate-700">{d.chantier || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge
                      label={STATUT_LECTURE_REX_LABELS[d.statutLecture]}
                      colorClass={STATUT_LECTURE_REX_COLORS[d.statutLecture]}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {d.dateLecture ? d.dateLecture.toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td data-no-print className="px-4 py-3 text-right">
                    {d.statutLecture === "EN_ATTENTE" && (
                      <form action={marquerDiffusionLue}>
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="rexId" value={rex.id} />
                        <button
                          type="submit"
                          className="whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Marquer lu
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {rex.diffusions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Aucun destinataire pour l&apos;instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <form
          action={ajouterDestinataireDiffusion}
          data-no-print
          className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]"
        >
          <input type="hidden" name="rexId" value={rex.id} />
          <input
            name="destinataire"
            required
            placeholder="Destinataire (nom)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="chantier"
            placeholder="Chantier (optionnel)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Ajouter
          </button>
        </form>
      </div>
    </div>
  );
}
