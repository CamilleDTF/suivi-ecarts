import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";
import { DateAutoSubmit } from "@/components/date-auto-submit";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { filtreArchive } from "@/lib/archivage";
import {
  StatutAction,
  StatutDossierEcart,
  StatutFiche,
  StatutRemontee,
} from "@/generated/prisma/enums";
import {
  filtreStatutAction,
  filtreStatutDossierEcart,
  filtreStatutFiche,
  filtreStatutRemontee,
} from "@/lib/validation";
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

// Les deux valeurs de filtre qui ne désignent pas un état précis. Chacune garde
// le même sens quel que soit l'écran : sans ça, « tous » voudrait dire une
// chose en mode période et une autre en mode historique complet, et on ne
// saurait plus lire l'URL.
const TOUS = "tous";
const NON_CLOTURES = "non-clotures";
const ORDRE_DU_JOUR = "ordre-du-jour";

// Le formulaire de filtre vit dans l'entête, mais les listes déroulantes d'état
// sont posées dans l'entête de leur section. L'attribut `form` les y rattache.
const FORM = "filtres-reunion";

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

function optionsEtat(
  entetes: { value: string; label: string }[],
  valeurs: string[],
  libelles: Record<string, string>,
) {
  return [...entetes, ...valeurs.map((v) => ({ value: v, label: libelles[v] }))];
}

function Section({
  titre,
  compte,
  filtre,
  children,
}: {
  titre: string;
  compte: number;
  filtre: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 break-inside-avoid">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">
          {titre} <span className="font-normal text-slate-400">({compte})</span>
        </h2>
        <div data-no-print className="shrink-0">
          {filtre}
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">{children}</div>
    </section>
  );
}

const th = "px-4 py-3 text-left font-medium";
const td = "px-4 py-3 align-top";
// Une référence coupée en deux lignes et une pastille d'état repliée se lisent
// mal, surtout projetées en réunion : ces deux colonnes restent d'un bloc.
const tdCompact = "px-4 py-3 align-top whitespace-nowrap";
const selectFiltre = "rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600";

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
  searchParams: Promise<{
    du?: string;
    au?: string;
    tout?: string;
    etatEvenement?: string;
    etatAction?: string;
    etatAmiante?: string;
    etatEcart?: string;
    etatRemontee?: string;
  }>;
}) {
  const params = await searchParams;

  // « Tout l'historique » : plus aucune borne de date. Les défauts d'état
  // basculent eux aussi sur « tous », sinon l'écran annoncerait tout en
  // continuant de masquer les écarts clôturés et les actions soldées.
  const tout = params.tout === "1";

  const defauts = periodeParDefaut();
  const du = params.du ?? defauts.du;
  const au = params.au ?? defauts.au;
  const depuis = tout ? undefined : jour(du, false);
  const jusqua = tout ? undefined : jour(au, true);
  const periode = depuis || jusqua ? { gte: depuis, lte: jusqua } : undefined;

  const etatEvenement = params.etatEvenement ?? TOUS;
  const etatAction = params.etatAction ?? (tout ? TOUS : ORDRE_DU_JOUR);
  const etatAmiante = params.etatAmiante ?? (tout ? TOUS : NON_CLOTURES);
  const etatEcart = params.etatEcart ?? (tout ? TOUS : NON_CLOTURES);
  const etatRemontee = params.etatRemontee ?? TOUS;

  /** Écarts et écarts amiante partagent le même jeu d'états. */
  function whereEcart(choix: string) {
    const exact = filtreStatutDossierEcart(choix);
    if (exact) return { statut: exact };
    if (choix === NON_CLOTURES) return { statut: { not: StatutDossierEcart.CLOTURE } };
    return {};
  }

  /**
   * « À l'ordre du jour » : ce qui est encore ouvert, plus ce qui vient d'être
   * soldé pendant la période — dans les deux cas il y a quelque chose à dire.
   * Sans période (historique complet), il ne reste que ce qui est ouvert, d'où
   * le défaut sur « tous » dans ce mode.
   */
  function whereAction(choix: string) {
    const exact = filtreStatutAction(choix);
    if (exact) return { statut: exact };
    if (choix === ORDRE_DU_JOUR) {
      return {
        OR: [
          { statut: { notIn: CLOSES } },
          ...(periode ? [{ realiseeLe: periode }, { modifieLe: periode }] : []),
        ],
      };
    }
    return {};
  }

  /**
   * Même filtre, pour les actions listées dans la ligne d'un écart. La clause
   * imbriquée ne peut pas porter le « ou close pendant la période » sans
   * alourdir la requête pour un gain nul : dans cette colonne on veut ce qui
   * reste à faire.
   */
  function whereActionImbriquee(choix: string) {
    const exact = filtreStatutAction(choix);
    if (exact) return { statut: exact };
    if (choix === ORDRE_DU_JOUR) return { statut: { notIn: CLOSES } };
    return {};
  }

  const [evenements, actionsEvenements, ecarts, ecartsAmiante, remontees] = await Promise.all([
    prisma.ficheSSE.findMany({
      where: {
        ...filtreArchive(undefined),
        ...(periode ? { dateHeure: periode } : {}),
        statutFiche: filtreStatutFiche(etatEvenement),
      },
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
      where: { ...filtreArchive(undefined), ...whereAction(etatAction), ficheSSEId: { not: null } },
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
      where: { ...filtreArchive(undefined), ...whereEcart(etatEcart) },
      orderBy: { reference: "asc" },
      select: {
        id: true,
        reference: true,
        description: true,
        statut: true,
        dossier: { select: { chantier: true } },
        actions: {
          where: whereActionImbriquee(etatAction),
          orderBy: { reference: "asc" },
          select: { id: true, reference: true, action: true, responsable: true, statut: true },
        },
      },
    }),
    prisma.ecartAmiante.findMany({
      where: { ...filtreArchive(undefined), ...whereEcart(etatAmiante) },
      orderBy: { reference: "asc" },
      select: {
        id: true,
        reference: true,
        nomChantier: true,
        description: true,
        typeEcart: true,
        statut: true,
        actions: {
          where: whereActionImbriquee(etatAction),
          orderBy: { reference: "asc" },
          select: { id: true, reference: true, action: true, responsable: true, statut: true },
        },
      },
    }),
    prisma.remonteeInfo.findMany({
      where: {
        ...filtreArchive(undefined),
        ...(periode ? { dateRemontee: periode } : {}),
        statut: filtreStatutRemontee(etatRemontee),
      },
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

  // Les liens de bascule repartent d'une URL nue : entrer dans l'historique
  // complet remet les filtres d'état à « tous », en sortir les remet au réglage
  // d'ordre du jour. Conserver les anciennes valeurs donnerait un « tout
  // l'historique » qui continue de masquer la moitié du registre.
  const filtresPosees =
    !!params.etatEvenement ||
    !!params.etatAction ||
    !!params.etatAmiante ||
    !!params.etatEcart ||
    !!params.etatRemontee ||
    !!params.du ||
    !!params.au;

  return (
    <div className="mx-auto max-w-[100rem] px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Réunion QHSE</h1>
          <p className="mt-1 text-sm text-slate-500">
            {tout ? "Tout l'historique, toutes dates" : `Période du ${fr(depuis)} au ${fr(jusqua)}`}
          </p>
        </div>
        <div data-no-print className="flex shrink-0 flex-wrap items-center gap-3">
          <form method="get" id={FORM} className="flex flex-wrap items-center gap-3">
            {/* En mode historique complet, les champs de date disparaissent au
                lieu d'être affichés sans effet : un « du 1er au 16 » inerte à
                côté de « toutes dates » ne peut que tromper. Le paramètre est
                repris en champ caché pour que changer un filtre d'état ne
                fasse pas retomber dans la période. */}
            {tout ? (
              <input type="hidden" name="tout" value="1" />
            ) : (
              <>
                <DateAutoSubmit name="du" defaultValue={du} label="Du" />
                <DateAutoSubmit name="au" defaultValue={au} label="au" />
              </>
            )}
          </form>
          <Link
            href={tout ? "/reunion" : "/reunion?tout=1"}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {tout ? "Revenir à une période" : "Tout l'historique"}
          </Link>
          {filtresPosees && (
            <Link
              href={tout ? "/reunion?tout=1" : "/reunion"}
              className="text-sm text-slate-500 hover:underline"
            >
              Réinitialiser
            </Link>
          )}
          <BoutonExportPDF />
        </div>
      </div>

      {/* Les évènements, les remontées : ce qui s'est produit pendant la
          période. Les écarts et leurs actions : ce qui reste ouvert, quelle que
          soit la date — un écart de mars non soldé se represente en juillet. */}
      <Section
        titre={tout ? "Évènements SSE" : "Évènements SSE de la période"}
        compte={evenements.length}
        filtre={
          <SelectAutoSubmit
            name="etatEvenement"
            form={FORM}
            defaultValue={etatEvenement}
            className={selectFiltre}
            options={optionsEtat(
              [{ value: TOUS, label: "Tous les états" }],
              Object.values(StatutFiche),
              STATUT_FICHE_LABELS,
            )}
          />
        }
      >
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
            {evenements.length === 0 && (
              <Vide colonnes={6} texte={tout ? "Aucun évènement." : "Aucun évènement sur la période."} />
            )}
          </tbody>
        </table>
      </Section>

      <Section
        titre="Suivi des évènements — actions"
        compte={actionsEvenements.length}
        filtre={
          // Ce filtre commande aussi la colonne « Actions » des deux sections
          // d'écarts : une action est une action, et deux réglages séparés pour
          // la même notion se contrediraient à l'écran.
          <SelectAutoSubmit
            name="etatAction"
            form={FORM}
            defaultValue={etatAction}
            className={selectFiltre}
            options={optionsEtat(
              [
                { value: ORDRE_DU_JOUR, label: "À l'ordre du jour" },
                { value: TOUS, label: "Tous les états" },
              ],
              Object.values(StatutAction),
              STATUT_ACTION_LABELS,
            )}
          />
        }
      >
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

      <Section
        titre="Suivi des écarts amiante"
        compte={ecartsAmiante.length}
        filtre={
          <SelectAutoSubmit
            name="etatAmiante"
            form={FORM}
            defaultValue={etatAmiante}
            className={selectFiltre}
            options={optionsEtat(
              [
                { value: NON_CLOTURES, label: "Non clôturés" },
                { value: TOUS, label: "Tous les états" },
              ],
              Object.values(StatutDossierEcart),
              STATUT_DOSSIER_ECART_LABELS,
            )}
          />
        }
      >
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className={th}>Référence</th>
              <th className={th}>Chantier</th>
              <th className={th}>Type / description</th>
              <th className={th}>Actions</th>
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
            {ecartsAmiante.length === 0 && <Vide colonnes={5} texte="Aucun écart amiante." />}
          </tbody>
        </table>
      </Section>

      <Section
        titre="Suivi des écarts"
        compte={ecarts.length}
        filtre={
          <SelectAutoSubmit
            name="etatEcart"
            form={FORM}
            defaultValue={etatEcart}
            className={selectFiltre}
            options={optionsEtat(
              [
                { value: NON_CLOTURES, label: "Non clôturés" },
                { value: TOUS, label: "Tous les états" },
              ],
              Object.values(StatutDossierEcart),
              STATUT_DOSSIER_ECART_LABELS,
            )}
          />
        }
      >
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className={th}>Référence</th>
              <th className={th}>Chantier</th>
              <th className={th}>Description</th>
              <th className={th}>Actions</th>
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
            {ecarts.length === 0 && <Vide colonnes={5} texte="Aucun écart." />}
          </tbody>
        </table>
      </Section>

      <Section
        titre={tout ? "Remontées d'information" : "Remontées d'information de la période"}
        compte={remontees.length}
        filtre={
          <SelectAutoSubmit
            name="etatRemontee"
            form={FORM}
            defaultValue={etatRemontee}
            className={selectFiltre}
            options={optionsEtat(
              [{ value: TOUS, label: "Tous les états" }],
              Object.values(StatutRemontee),
              STATUT_REMONTEE_LABELS,
            )}
          />
        }
      >
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
            {remontees.length === 0 && (
              <Vide colonnes={6} texte={tout ? "Aucune remontée." : "Aucune remontée sur la période."} />
            )}
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
  if (actions.length === 0) return <span className="text-slate-400">Aucune action</span>;
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
