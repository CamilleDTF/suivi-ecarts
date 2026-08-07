import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";
import { DateAutoSubmit } from "@/components/date-auto-submit";
import { filtreArchive } from "@/lib/archivage";
import { StatutAction } from "@/generated/prisma/enums";
import {
  STATUT_ACTION_COLORS,
  STATUT_ACTION_LABELS,
  STATUT_DOSSIER_ECART_COLORS,
  STATUT_DOSSIER_ECART_LABELS,
  STATUT_FICHE_COLORS,
  STATUT_FICHE_LABELS,
  STATUT_REMONTEE_COLORS,
  STATUT_REMONTEE_LABELS,
} from "@/lib/labels";

export const metadata = { title: "Réunion QHSE" };

// Une action close n'a plus sa place dans un ordre du jour, sauf si elle a été
// close pendant la période — c'est justement ce qu'on annonce en réunion.
const CLOSES: StatutAction[] = [StatutAction.REALISEE, StatutAction.ANNULEE];

const jour = (valeur: string | undefined, fin: boolean) => {
  if (!valeur) return undefined;
  const d = new Date(`${valeur}T${fin ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const fr = (d: Date | null | undefined) => (d ? d.toLocaleDateString("fr-FR") : "—");

/** Mois en cours par défaut : c'est la période d'une réunion mensuelle. */
function periodeParDefaut() {
  const maintenant = new Date();
  const debut = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1));
  return { du: debut.toISOString().slice(0, 10), au: maintenant.toISOString().slice(0, 10) };
}

function Section({
  titre,
  compte,
  children,
}: {
  titre: string;
  compte: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 break-inside-avoid">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        {titre} <span className="font-normal text-slate-400">({compte})</span>
      </h2>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">{children}</div>
    </section>
  );
}

const th = "px-4 py-3 text-left font-medium";
const td = "px-4 py-3 align-top";
// Une référence coupée en deux lignes et une pastille d'état repliée se lisent
// mal, surtout projetées en réunion : ces deux colonnes restent d'un bloc.
const tdCompact = "px-4 py-3 align-top whitespace-nowrap";

function Vide({ colonnes, texte }: { colonnes: number; texte: string }) {
  return (
    <tr>
      <td colSpan={colonnes} className="px-4 py-6 text-center text-slate-400">
        {texte}
      </td>
    </tr>
  );
}

export default async function ReunionPage({
  searchParams,
}: {
  searchParams: Promise<{ du?: string; au?: string }>;
}) {
  const params = await searchParams;
  const defauts = periodeParDefaut();
  const du = params.du ?? defauts.du;
  const au = params.au ?? defauts.au;
  const depuis = jour(du, false);
  const jusqua = jour(au, true);
  const periode = depuis || jusqua ? { gte: depuis, lte: jusqua } : undefined;

  // Une action est à l'ordre du jour si elle est encore ouverte, ou si elle
  // vient d'être close pendant la période : dans les deux cas il y a quelque
  // chose à dire.
  const actionsAOrdreDuJour = {
    ...filtreArchive(undefined),
    OR: [
      { statut: { notIn: CLOSES } },
      ...(periode ? [{ realiseeLe: periode }, { modifieLe: periode }] : []),
    ],
  };

  const [evenements, actionsEvenements, ecarts, ecartsAmiante, remontees] = await Promise.all([
    prisma.ficheSSE.findMany({
      where: { ...filtreArchive(undefined), ...(periode ? { dateHeure: periode } : {}) },
      orderBy: { dateHeure: "asc" },
      select: {
        id: true,
        reference: true,
        typeEvenement: true,
        dateHeure: true,
        descriptionFactuelle: true,
        nomChantier: true,
        statutFiche: true,
      },
    }),
    prisma.action.findMany({
      where: { ...actionsAOrdreDuJour, ficheSSEId: { not: null } },
      orderBy: [{ ficheSSE: { reference: "asc" } }, { reference: "asc" }],
      select: {
        id: true,
        reference: true,
        action: true,
        responsable: true,
        echeance: true,
        statut: true,
        ficheSSE: { select: { id: true, reference: true, nomChantier: true } },
      },
    }),
    prisma.ecart.findMany({
      where: { ...filtreArchive(undefined), statut: { not: "CLOTURE" } },
      orderBy: { reference: "asc" },
      select: {
        id: true,
        reference: true,
        description: true,
        statut: true,
        dossier: { select: { chantier: true } },
        actions: {
          where: { statut: { notIn: CLOSES } },
          orderBy: { reference: "asc" },
          select: { id: true, reference: true, action: true, responsable: true, statut: true },
        },
      },
    }),
    prisma.ecartAmiante.findMany({
      where: { ...filtreArchive(undefined), statut: { not: "CLOTURE" } },
      orderBy: { reference: "asc" },
      select: {
        id: true,
        reference: true,
        nomChantier: true,
        description: true,
        typeEcart: true,
        statut: true,
        actions: {
          where: { statut: { notIn: CLOSES } },
          orderBy: { reference: "asc" },
          select: { id: true, reference: true, action: true, responsable: true, statut: true },
        },
      },
    }),
    prisma.remonteeInfo.findMany({
      where: { ...filtreArchive(undefined), ...(periode ? { dateRemontee: periode } : {}) },
      orderBy: { dateRemontee: "asc" },
      select: {
        id: true,
        reference: true,
        dateRemontee: true,
        objet: true,
        chantierService: true,
        suiteDonnee: true,
        statut: true,
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[100rem] px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Réunion QHSE</h1>
          <p className="mt-1 text-sm text-slate-500">
            Période du {fr(depuis)} au {fr(jusqua)}
          </p>
        </div>
        <div data-no-print className="flex shrink-0 flex-wrap items-center gap-3">
          <form method="get" className="flex flex-wrap items-center gap-3">
            <DateAutoSubmit name="du" defaultValue={du} label="Du" />
            <DateAutoSubmit name="au" defaultValue={au} label="au" />
          </form>
          <BoutonExportPDF />
        </div>
      </div>

      {/* Les évènements, les remontées : ce qui s'est produit pendant la
          période. Les écarts et leurs actions : ce qui reste ouvert, quelle que
          soit la date — un écart de mars non soldé se represente en juillet. */}
      <Section titre="Évènements SSE de la période" compte={evenements.length}>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className={th}>Référence</th>
              <th className={th}>Type</th>
              <th className={th}>Date</th>
              <th className={th}>Détail</th>
              <th className={th}>Chantier</th>
              <th className={th}>État</th>
            </tr>
          </thead>
          <tbody>
            {evenements.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 last:border-0">
                <td className={tdCompact}>
                  <Link href={`/fiches-sse/${e.id}`} className="font-medium text-blue-700 hover:underline">
                    {e.reference}
                  </Link>
                </td>
                <td className={`${td} text-slate-700`}>{e.typeEvenement || "—"}</td>
                <td className={`${td} whitespace-nowrap text-slate-700`}>{fr(e.dateHeure)}</td>
                <td className={`${td} max-w-md text-slate-700`}>{e.descriptionFactuelle || "—"}</td>
                <td className={`${td} text-slate-700`}>{e.nomChantier || "—"}</td>
                <td className={tdCompact}>
                  <Badge
                    label={STATUT_FICHE_LABELS[e.statutFiche]}
                    colorClass={STATUT_FICHE_COLORS[e.statutFiche]}
                  />
                </td>
              </tr>
            ))}
            {evenements.length === 0 && <Vide colonnes={6} texte="Aucun évènement sur la période." />}
          </tbody>
        </table>
      </Section>

      <Section titre="Suivi des évènements — actions" compte={actionsEvenements.length}>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className={th}>Évènement</th>
              <th className={th}>Action</th>
              <th className={th}>Responsable</th>
              <th className={th}>Échéance</th>
              <th className={th}>État</th>
            </tr>
          </thead>
          <tbody>
            {actionsEvenements.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 last:border-0">
                <td className={`${td} whitespace-nowrap`}>
                  <Link
                    href={`/fiches-sse/${a.ficheSSE!.id}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {a.ficheSSE!.reference}
                  </Link>
                  {a.ficheSSE!.nomChantier && (
                    <span className="ml-2 text-xs text-slate-400">{a.ficheSSE!.nomChantier}</span>
                  )}
                </td>
                <td className={`${td} max-w-md text-slate-700`}>
                  <Link href={`/plan-action/${a.id}`} className="hover:underline">
                    {a.action}
                  </Link>
                </td>
                <td className={`${td} text-slate-700`}>{a.responsable}</td>
                <td className={`${td} whitespace-nowrap text-slate-700`}>{fr(a.echeance)}</td>
                <td className={tdCompact}>
                  <Badge
                    label={STATUT_ACTION_LABELS[a.statut]}
                    colorClass={STATUT_ACTION_COLORS[a.statut]}
                  />
                </td>
              </tr>
            ))}
            {actionsEvenements.length === 0 && (
              <Vide colonnes={5} texte="Aucune action d'évènement à suivre." />
            )}
          </tbody>
        </table>
      </Section>

      <Section titre="Suivi des écarts amiante" compte={ecartsAmiante.length}>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className={th}>Référence</th>
              <th className={th}>Chantier</th>
              <th className={th}>Type / description</th>
              <th className={th}>Actions en cours</th>
              <th className={th}>État</th>
            </tr>
          </thead>
          <tbody>
            {ecartsAmiante.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 last:border-0">
                <td className={tdCompact}>
                  <Link href={`/ecart-amiante/${e.id}`} className="font-medium text-blue-700 hover:underline">
                    {e.reference}
                  </Link>
                </td>
                <td className={`${td} text-slate-700`}>{e.nomChantier}</td>
                <td className={`${td} max-w-sm text-slate-700`}>
                  {[e.typeEcart, e.description].filter(Boolean).join(" — ") || "—"}
                </td>
                <td className={td}>
                  <ListeActions actions={e.actions} />
                </td>
                <td className={tdCompact}>
                  <Badge
                    label={STATUT_DOSSIER_ECART_LABELS[e.statut]}
                    colorClass={STATUT_DOSSIER_ECART_COLORS[e.statut]}
                  />
                </td>
              </tr>
            ))}
            {ecartsAmiante.length === 0 && <Vide colonnes={5} texte="Aucun écart amiante ouvert." />}
          </tbody>
        </table>
      </Section>

      <Section titre="Suivi des écarts" compte={ecarts.length}>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className={th}>Référence</th>
              <th className={th}>Chantier</th>
              <th className={th}>Description</th>
              <th className={th}>Actions en cours</th>
              <th className={th}>État</th>
            </tr>
          </thead>
          <tbody>
            {ecarts.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 last:border-0">
                <td className={tdCompact}>
                  <Link href={`/ecarts/${e.id}`} className="font-medium text-blue-700 hover:underline">
                    {e.reference}
                  </Link>
                </td>
                <td className={`${td} text-slate-700`}>{e.dossier?.chantier || "—"}</td>
                <td className={`${td} max-w-sm text-slate-700`}>{e.description || "—"}</td>
                <td className={td}>
                  <ListeActions actions={e.actions} />
                </td>
                <td className={tdCompact}>
                  <Badge
                    label={STATUT_DOSSIER_ECART_LABELS[e.statut]}
                    colorClass={STATUT_DOSSIER_ECART_COLORS[e.statut]}
                  />
                </td>
              </tr>
            ))}
            {ecarts.length === 0 && <Vide colonnes={5} texte="Aucun écart ouvert." />}
          </tbody>
        </table>
      </Section>

      <Section titre="Remontées d'information de la période" compte={remontees.length}>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className={th}>Référence</th>
              <th className={th}>Date</th>
              <th className={th}>Objet</th>
              <th className={th}>Chantier / service</th>
              <th className={th}>Suite donnée</th>
              <th className={th}>État</th>
            </tr>
          </thead>
          <tbody>
            {remontees.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className={tdCompact}>
                  <Link href={`/remontees/${r.id}`} className="font-medium text-blue-700 hover:underline">
                    {r.reference}
                  </Link>
                </td>
                <td className={`${td} whitespace-nowrap text-slate-700`}>{fr(r.dateRemontee)}</td>
                <td className={`${td} max-w-sm text-slate-700`}>{r.objet}</td>
                <td className={`${td} text-slate-700`}>{r.chantierService}</td>
                <td className={`${td} max-w-sm text-slate-700`}>{r.suiteDonnee || "—"}</td>
                <td className={tdCompact}>
                  <Badge
                    label={STATUT_REMONTEE_LABELS[r.statut]}
                    colorClass={STATUT_REMONTEE_COLORS[r.statut]}
                  />
                </td>
              </tr>
            ))}
            {remontees.length === 0 && <Vide colonnes={6} texte="Aucune remontée sur la période." />}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function ListeActions({
  actions,
}: {
  actions: { id: string; reference: string; action: string; responsable: string; statut: StatutAction }[];
}) {
  if (actions.length === 0) return <span className="text-slate-400">Aucune action en cours</span>;
  return (
    <ul className="space-y-1">
      {actions.map((a) => (
        <li key={a.id} className="text-slate-700">
          <Link href={`/plan-action/${a.id}`} className="hover:underline">
            {a.action}
          </Link>
          <span className="text-slate-400"> — {a.responsable}</span>
          <span className="ml-2 text-xs text-slate-400">({STATUT_ACTION_LABELS[a.statut]})</span>
        </li>
      ))}
    </ul>
  );
}
