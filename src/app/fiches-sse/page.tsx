import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { Pagination } from "@/components/pagination";
import { StatutFiche } from "@/generated/prisma/enums";
import {
  STATUT_FICHE_COLORS,
  STATUT_FICHE_LABELS,
  THEME_OPTIONS,
  DOMAINES_OPTIONS,
  TYPE_EVENEMENT_OPTIONS,
  avecValeursExistantes,
} from "@/lib/labels";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";
import { LienArchives } from "@/components/lien-archives";
import { construireTri } from "@/lib/tri";
import { EnteteTriable } from "@/components/entete-triable";
import { DateAutoSubmit } from "@/components/date-auto-submit";

const COLONNES_TRI = {
  reference: "reference",
  date: "dateHeure",
  type: "typeEvenement",
  chantier: "nomChantier",
  emetteur: "emetteur",
  statut: "statutFiche",
};

// Colonnes pouvant être vides : sans `nulls: "last"`, trier par date
// décroissante remonterait d'abord les évènements dont la date n'est pas
// saisie.
const COLONNES_NULLABLES = ["date", "type", "chantier", "emetteur"];

export default async function FichesSSEPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    statut?: string;
    type?: string;
    du?: string;
    au?: string;
    page?: string;
    taille?: string;
    tri?: string;
    sens?: string;
    archives?: string;
  }>;
}) {
  const { q, statut, type, du, au, page: pageParam, taille, tri, sens, archives } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);

  // Une date d'URL invalide ("2026-13-45", un paramètre bricolé à la main)
  // donnerait un Invalid Date, que Prisma refuse : le filtre est alors ignoré
  // plutôt que de faire échouer la page.
  const jour = (valeur: string | undefined, fin: boolean) => {
    if (!valeur) return undefined;
    const d = new Date(`${valeur}T${fin ? "23:59:59.999" : "00:00:00.000"}Z`);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };
  const depuis = jour(du, false);
  const jusqua = jour(au, true);

  const optionsCorrespondantes = (options: string[]) =>
    q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : [];
  const themesTrouves = optionsCorrespondantes(THEME_OPTIONS);
  const domainesTrouves = optionsCorrespondantes(DOMAINES_OPTIONS);

  const contient = { contains: q, mode: "insensitive" as const };
  const where = {
    ...filtreArchive(archives),
    statutFiche: statut ? (statut as StatutFiche) : undefined,
    typeEvenement: type || undefined,
    // Une seule des deux bornes suffit : « depuis le… » et « jusqu'au… » sont
    // des filtres à part entière.
    dateHeure: depuis || jusqua ? { gte: depuis, lte: jusqua } : undefined,
    OR: q
      ? [
          { reference: contient },
          { nomChantier: contient },
          { emetteur: contient },
          { numeroInterne: contient },
          { typeEvenement: contient },
          { lieuZone: contient },
          { personnesImpliquees: contient },
          { temoins: contient },
          { descriptionFactuelle: contient },
          { mesuresImmediatesPrises: contient },
          { typeAnalyse: contient },
          { criticite: contient },
          { declarationExterneA: contient },
          { referencePreuve: contient },
          { procedureLaquelle: contient },
          { referenceDUERP: contient },
          { miseAJourAutrePrecision: contient },
          { referenceNouveauRisque: contient },
          { typeCommunication: contient },
          { validationNom: contient },
          { validationFonction: contient },
          { causes: { some: { libelle: contient } } },
          // Chercher la référence du parent ramène ses évènements, quel que
          // soit le type de rattachement.
          { ecart: { reference: contient } },
          { ecartAmiante: { reference: contient } },
          { ecartAmiante: { nomChantier: contient } },
          ...(themesTrouves.length ? [{ theme: { hasSome: themesTrouves } }] : []),
          ...(domainesTrouves.length ? [{ domaine: { hasSome: domainesTrouves } }] : []),
        ]
      : undefined,
  };

  const [total, fiches, typesEnBase] = await Promise.all([
    prisma.ficheSSE.count({ where }),
    prisma.ficheSSE.findMany({
      where,
      orderBy: construireTri(tri, sens, COLONNES_TRI, { createdAt: "desc" as const }, COLONNES_NULLABLES),
      include: { ecart: { include: { dossier: true } }, ecartAmiante: true },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
    // Les types repris de l'Excel ne figurent pas tous dans la liste de saisie :
    // sans eux, les évènements concernés seraient introuvables au filtre.
    prisma.ficheSSE.findMany({ distinct: ["typeEvenement"], select: { typeEvenement: true } }),
  ]);

  const typesProposes = avecValeursExistantes(
    TYPE_EVENEMENT_OPTIONS,
    typesEnBase.map((f) => f.typeEvenement).filter((t): t is string => !!t),
  );

  const filtreActif = !!q || !!statut || !!type || !!du || !!au;
  // Les entêtes de tri et la pagination doivent reconduire les filtres en
  // cours, sinon trier une liste filtrée la déferait.
  const paramsListe = { q, statut, type, du, au, taille, archives };

  return (
    <div className="mx-auto max-w-[100rem] px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Évènements SSE</h1>
        <Link
          href="/fiches-sse/nouveau"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nouvel évènement SSE
        </Link>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher un évènement…"
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <SelectAutoSubmit
          name="statut"
          defaultValue={statut ?? ""}
          options={[
            { value: "", label: "Statut : Tous" },
            ...Object.values(StatutFiche).map((s) => ({ value: s, label: STATUT_FICHE_LABELS[s] })),
          ]}
        />
        <SelectAutoSubmit
          name="type"
          defaultValue={type ?? ""}
          options={[
            { value: "", label: "Type : Tous" },
            ...typesProposes.map((t) => ({ value: t, label: t })),
          ]}
        />
        <DateAutoSubmit name="du" defaultValue={du ?? ""} label="Du" />
        <DateAutoSubmit name="au" defaultValue={au ?? ""} label="au" />
        {/* Le tri, la taille de page et la vue archives ne sont pas des champs
            du formulaire : sans ces champs cachés, filtrer les remettrait à
            zéro. */}
        {tri && <input type="hidden" name="tri" value={tri} />}
        {sens && <input type="hidden" name="sens" value={sens} />}
        {taille && <input type="hidden" name="taille" value={taille} />}
        {archives && <input type="hidden" name="archives" value={archives} />}
        {filtreActif && (
          <Link href="/fiches-sse" className="text-sm text-slate-500 hover:underline">
            Réinitialiser
          </Link>
        )}
        <LienArchives archives={archives} params={{ q, statut, type, du, au, taille, tri, sens }} />
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <EnteteTriable
                colonne="reference"
                libelle="Référence"
                triActuel={tri}
                sensActuel={sens}
                params={paramsListe}
              />
              <EnteteTriable
                colonne="date"
                libelle="Date"
                triActuel={tri}
                sensActuel={sens}
                params={paramsListe}
              />
              <EnteteTriable
                colonne="type"
                libelle="Type d'évènement"
                triActuel={tri}
                sensActuel={sens}
                params={paramsListe}
              />
              <th className="px-4 py-3 font-medium">Rattaché à</th>
              <EnteteTriable
                colonne="chantier"
                libelle="Chantier"
                triActuel={tri}
                sensActuel={sens}
                params={paramsListe}
              />
              <EnteteTriable
                colonne="emetteur"
                libelle="Émetteur"
                triActuel={tri}
                sensActuel={sens}
                params={paramsListe}
              />
              <EnteteTriable
                colonne="statut"
                libelle="Statut"
                triActuel={tri}
                sensActuel={sens}
                params={paramsListe}
              />
            </tr>
          </thead>
          <tbody>
            {fiches.map((f) => (
              <tr key={f.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/fiches-sse/${f.id}`} className="font-medium text-blue-700 hover:underline">
                    {f.reference}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                  {f.dateHeure ? f.dateHeure.toLocaleDateString("fr-FR") : "—"}
                </td>
                <td className="px-4 py-3 text-slate-700">{f.typeEvenement || "—"}</td>
                <td className="px-4 py-3">
                  {/* Un évènement peut naître d'un écart ou d'un écart amiante :
                      la colonne montrait le premier cas et affichait "Aucun"
                      pour le second, alors que le rattachement existe. */}
                  {f.ecart ? (
                    <Link href={`/ecarts/${f.ecart.id}`} className="text-slate-600 hover:underline">
                      {f.ecart.reference}
                    </Link>
                  ) : f.ecartAmiante ? (
                    <Link href={`/ecart-amiante/${f.ecartAmiante.id}`} className="text-slate-600 hover:underline">
                      {f.ecartAmiante.reference}
                      <span className="ml-1 text-xs text-slate-400">(amiante)</span>
                    </Link>
                  ) : (
                    <span className="text-slate-400">Aucun</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">{f.nomChantier || "—"}</td>
                <td className="px-4 py-3 text-slate-700">{f.emetteur || "—"}</td>
                <td className="px-4 py-3">
                  <Badge label={STATUT_FICHE_LABELS[f.statutFiche]} colorClass={STATUT_FICHE_COLORS[f.statutFiche]} />
                </td>
              </tr>
            ))}
            {fiches.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  {filtreActif ? "Aucun évènement ne correspond à ce filtre." : "Aucun évènement SSE pour l'instant."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {total > 0 && (
          <Pagination
            total={total}
            page={page}
            pageSize={taillePage}
            baseParams={{ ...paramsListe, tri, sens }}
          />
        )}
      </div>
    </div>
  );
}
