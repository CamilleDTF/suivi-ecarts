import { prisma } from "@/lib/prisma";

/**
 * Outil interne de propositions de REX.
 *
 * Il croise les écarts, évènements SSE, écarts amiante et remontées, et en tire
 * trois sortes de propositions :
 *  - les faits graves, assez sérieux pour mériter un REX à eux seuls ;
 *  - les motifs précis qui reviennent (un mot qui revient dans les descriptions et
 *    les causes, sur plusieurs chantiers ou plusieurs sources) ;
 *  - une vue d'ensemble par sujet (thème des écarts et évènements, catégorie des
 *    remontées), trop large pour devenir un REX telle quelle mais utile pour situer.
 * Tout ce qui est déjà rattaché à un REX est écarté. Les règles sont simples et
 * lisibles : aucun service externe, aucune donnée ne quitte l'application.
 */

export type TypeFait = "ecart" | "evenement" | "amiante" | "remontee";

export const TYPES_FAIT: Record<TypeFait, { label: string; singulier: string; pluriel: string }> = {
  ecart: { label: "Écart", singulier: "écart", pluriel: "écarts" },
  evenement: { label: "Évènement SSE", singulier: "évènement SSE", pluriel: "évènements SSE" },
  amiante: { label: "Écart amiante", singulier: "écart amiante", pluriel: "écarts amiante" },
  remontee: { label: "Remontée", singulier: "remontée", pluriel: "remontées" },
};

export const PERIODES_PROPOSITION = [
  { cle: "6m", label: "6 mois", mois: 6 },
  { cle: "12m", label: "12 mois", mois: 12 },
  { cle: "24m", label: "24 mois", mois: 24 },
  { cle: "tout", label: "Tout", mois: null },
] as const;
export type PeriodeProposition = (typeof PERIODES_PROPOSITION)[number]["cle"];
export const PERIODE_PAR_DEFAUT: PeriodeProposition = "12m";

export function lirePeriodeProposition(valeur: string | undefined): PeriodeProposition {
  return PERIODES_PROPOSITION.find((p) => p.cle === valeur)?.cle ?? PERIODE_PAR_DEFAUT;
}

/** 0 : rien de particulier, 1 : à noter, 2 : grave. */
type Gravite = 0 | 1 | 2;

export type Fait = {
  type: TypeFait;
  id: string;
  reference: string;
  href: string;
  date: Date;
  chantier: string | null;
  /** Identifiant stable du chantier : « 25-102-A » et « 25-102-A LYCEE JOLIOT CURIE » sont le même. */
  chantierCle: string | null;
  libelle: string;
  sujets: string[];
  /** Mots significatifs du texte : racine → forme affichée. */
  termes: Map<string, string>;
  /** Texte complet, sans accents ni majuscules : sert à la recherche libre. */
  texte: string;
  gravite: Gravite;
  ouvert: boolean;
  /**
   * Faits dont celui-ci est le prolongement, du plus au moins fiable : écart d'origine, écarts rattachés,
   * évènement rattaché (évènement créé depuis un écart, remontée transformée en écart ou rattachée).
   * C'est le même constat saisi à plusieurs endroits : il ne compte qu'une fois.
   */
  liens: string[];
  /** Le premier de ces faits présent dans l'analyse : le parent qui absorbe celui-ci. */
  lieA: string | null;
};

export type Proposition = {
  cle: string;
  genre: "grave" | "motif" | "sujet";
  titre: string;
  /** Pour un motif : les mots voisins regroupés avec lui. */
  motsAssocies: string[];
  /** Nombre de mots du motif (1 = mot seul, trop vague pour un REX précis ; 0 hors motif). */
  nbMots: number;
  /** Pour un mot seul : les mots qui l'accompagnent le plus souvent, avec le nombre de faits où ils apparaissent. */
  compagnons: { mot: string; n: number }[];
  /** Sujets les plus présents parmi les faits, du plus au moins fréquent. */
  sujetCles: string[];
  /** Faits non encore couverts par un REX, les plus graves puis les plus récents d'abord. */
  faits: Fait[];
  /** REX qui couvrent déjà une partie des faits (exclus de `faits`). */
  rexCouvrants: string[];
  nbCouverts: number;
  chantiers: { nom: string; n: number }[];
  parType: Record<TypeFait, number>;
  nbGraves: number;
  nbOuverts: number;
  nbRecents: number;
  du: Date;
  au: Date;
  score: number;
  priorite: "haute" | "moyenne" | "a_surveiller";
  raisons: string[];
  lienCreation: string;
};

type Sujet = { label: string; pointCommun?: string; theme?: string };

// Sujets reconnus, avec ce que le parcours de création sait en faire (point commun
// et thème proposés). Les valeurs inconnues deviennent leur propre sujet plutôt que
// d'être perdues : le vocabulaire des thèmes évolue.
const SUJETS: Record<string, Sujet> = {
  organisation: { label: "Organisation / coordination de chantier", pointCommun: "Organisation", theme: "Organisation" },
  documentaire: { label: "Documentaire / procédures", theme: "Méthode de travail" },
  materiel: { label: "Matériel / équipements", pointCommun: "Matériel / équipements", theme: "Sécurité sur chantier" },
  epi: { label: "EPI / protection individuelle", theme: "Sécurité sur chantier" },
  amiante: { label: "Risque amiante", theme: "Amiante" },
  dechets: { label: "Gestion des déchets", theme: "Environnement" },
  comportement: { label: "Comportement / respect des consignes", theme: "Sécurité sur chantier" },
  hauteur: { label: "Travaux en hauteur", theme: "Sécurité sur chantier" },
  formation: { label: "Compétences / formation", theme: "Compétences / formation" },
  balisage: { label: "Balisage / signalisation", pointCommun: "Balisage", theme: "Balisage / signalisation" },
  environnement: { label: "Environnement", pointCommun: "Conditions environnementales", theme: "Environnement" },
  routier: { label: "Circulation / risque routier", theme: "Sécurité sur chantier" },
  chimique: { label: "Produits chimiques", theme: "Sécurité sur chantier" },
  proprete: { label: "Propreté / rangement de zone", theme: "Sécurité sur chantier" },
  relations: { label: "Relations client / fournisseur", pointCommun: "Communication", theme: "Communication" },
};

// Thèmes des écarts et évènements SSE d'un côté, catégories des remontées de
// l'autre : deux vocabulaires qui désignent les mêmes sujets.
const ALIAS: Record<string, string> = {
  organisation: "organisation",
  "organisation / coordination chantier": "organisation",
  documentaire: "documentaire",
  "documentaire / procedure": "documentaire",
  materiel: "materiel",
  "materiel / equipement": "materiel",
  "epi / mpc": "epi",
  "epi / protection individuelle": "epi",
  "risque amiante": "amiante",
  "confinement / decontamination": "amiante",
  dechet: "dechets",
  "gestion des dechets": "dechets",
  comportement: "comportement",
  "comportement / non-respect de consigne": "comportement",
  "travaux en hauteur": "hauteur",
  "competence / formation": "formation",
  "balisage / signalisation": "balisage",
  environnement: "environnement",
  "risque routier": "routier",
  "circulation / risque routier": "routier",
  "produit chimique": "chimique",
  "proprete / rangement de zone": "proprete",
  client: "relations",
  fournisseur: "relations",
  "relation client / fournisseur": "relations",
};
const IGNORES = new Set(["", "autre"]);

// Mots de liaison, sans portée pour repérer un motif.
const MOTS_VIDES = new Set(
  (
    "dans pour avec sans sont etre etait etaient avait avaient cette cettes leur leurs plus tout tous toute toutes comme mais donc ainsi alors " +
    "lors apres avant entre vers chez sous quoi dont fait faire font ont peut peuvent doit doivent faut aussi encore deja notamment egalement " +
    "concernant suite selon pendant depuis jusqu autre autres meme memes quelque quelques plusieurs chaque ceux celui celle ceci cela nous vous " +
    "elles notre votre sera seront serait etant avoir quand lorsque afin elle ils lieu etre rien tres bien trop"
  ).split(/\s+/),
);
// Mots fréquents mais trop généraux pour désigner un sujet précis.
const MOTS_GENERIQUES = new Set(
  (
    "absence absent absente chantier chantiers mesure mesures risque risques travail travau securite sante present presente conforme conformite " +
    "conformement mauvaise mauvais manque respect suivi realise realisee realises place utilise utilisee utilisation directement concerne ensemble " +
    "niveau objectif action actions compte certain retour exigence exigences terrain personnel personne personnes entreprise operateur operateurs " +
    "approche mise adapter completer evaluer evaluation bilan defini rapport prise ecart constate constat observe observee verifier verification " +
    "controle controles necessaire autour actuel suivant rigueur poste intervention operation resultat resultats processu processus procedure " +
    "disponible disponibles " +
    // Les mots qui nomment déjà un grand sujet : ils recoupent la vue par sujet sans rien apprendre de plus.
    "dechet dechets materiel materiels equipement equipements analyse analyses amiante amiantes amiant organisation documentaire formation " +
    "environnement enviro protection protections dispositif dispositifs"
  ).split(/\s+/),
);

// Mots utiles pour préciser une combinaison (« zone · stockage ») mais trop vagues pour former un motif seuls.
const MOTS_CONNECTEURS = new Set(["zone"]);

const normaliser = (texte: string) =>
  texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/** Racine très légère : on retire le pluriel, sauf pour « processus », « fois »… */
const racine = (mot: string) => (/(us|ss|is|os)$/.test(mot) ? mot : mot.replace(/[sx]$/, ""));

function extraireTermes(texte: string): Map<string, string> {
  const termes = new Map<string, string>();
  for (const m of texte.toLowerCase().matchAll(/[a-zà-öø-ÿ]{4,}/g)) {
    const brut = m[0];
    const sansAccent = normaliser(brut);
    if (MOTS_VIDES.has(sansAccent)) continue;
    const cle = racine(sansAccent);
    if (cle.length < 4 || MOTS_VIDES.has(cle) || MOTS_GENERIQUES.has(cle) || MOTS_GENERIQUES.has(sansAccent)) continue;
    if (!termes.has(cle)) termes.set(cle, racine(brut));
  }
  return termes;
}

/** « 25-102-A LYCEE JOLIOT CURIE » et « 25-102-A » désignent le même chantier ; « 25-102-A-7 » est un autre site. */
function cleChantier(nom: string | null | undefined): string | null {
  const propre = (nom ?? "").trim();
  if (!propre) return null;
  const code = /^(\d{2}-\d{3}(?:-[A-Za-z])?(?:-\d+)?)/.exec(propre);
  return code ? code[1].toUpperCase() : normaliser(propre);
}

const JOUR = 86_400_000;

function graviteCriticite(criticite: string | null | undefined): Gravite {
  return criticite === "Élevée" ? 2 : criticite === "Moyenne" ? 1 : 0;
}

const resume = (texte: string | null | undefined, max = 120) => {
  const propre = (texte ?? "").replace(/\s+/g, " ").trim();
  return propre.length > max ? `${propre.slice(0, max - 1)}…` : propre || "—";
};

type Analyse = {
  propositions: Proposition[];
  /** Résultat de la recherche libre (les mots saisis), si elle a été demandée. */
  recherche: Proposition | null;
  libelles: Map<string, Sujet>;
  /** `total` et `parType` comptent les constats distincts ; `nbLies` : faits absorbés par un autre (même constat). */
  stats: { total: number; parType: Record<TypeFait, number>; nbCouverts: number; nbLies: number };
  du: Date | null;
  au: Date;
};

/** Début de période : premier du mois, comme la synthèse. */
function debutPeriode(periode: PeriodeProposition, maintenant: Date) {
  const mois = PERIODES_PROPOSITION.find((p) => p.cle === periode)?.mois ?? null;
  return mois === null ? null : new Date(maintenant.getFullYear(), maintenant.getMonth() - (mois - 1), 1);
}

const parametreCreation = { ecart: "ecartId", evenement: "ficheSSEId", amiante: "ecartAmianteId", remontee: "remonteeId" } as const;

const MIN_FAITS = 3;
const MAX_MOTIFS = 12;
/** Nombre maximal de mots d'une combinaison, et de mots montrés dans le titre d'un motif. */
const MAX_MOTS_MOTIF = 4;
/** Mots seuls montrés à part : trop vagues pour un REX précis, mais parfois très fréquents. */
const MAX_MOTS_SEULS = 6;
const MAX_ENSEMBLES = 20000;

export async function analyserPropositions(periode: PeriodeProposition, motsRecherche: string[] = []): Promise<Analyse> {
  const maintenant = new Date();
  const depuis = debutPeriode(periode, maintenant);

  // `select` partout : jamais les pièces jointes ni les champs lourds.
  const [ecarts, fiches, amiantes, remontees, rex] = await Promise.all([
    prisma.ecart.findMany({
      where: { archiveLe: null, ...(depuis ? { dateDetection: { gte: depuis } } : {}) },
      select: {
        id: true,
        reference: true,
        dateDetection: true,
        statut: true,
        criticite: true,
        natures: true,
        theme: true,
        description: true,
        cause: true,
        dossier: { select: { chantier: true } },
      },
    }),
    prisma.ficheSSE.findMany({
      where: {
        archiveLe: null,
        ...(depuis ? { OR: [{ dateHeure: { gte: depuis } }, { dateHeure: null, createdAt: { gte: depuis } }] } : {}),
      },
      select: {
        id: true,
        reference: true,
        dateHeure: true,
        createdAt: true,
        statutFiche: true,
        criticite: true,
        typeEvenement: true,
        theme: true,
        nomChantier: true,
        descriptionFactuelle: true,
        ecartId: true,
        ecartAmianteId: true,
      },
    }),
    prisma.ecartAmiante.findMany({
      where: { archiveLe: null, ...(depuis ? { date: { gte: depuis } } : {}) },
      select: {
        id: true,
        reference: true,
        date: true,
        statut: true,
        nomChantier: true,
        typeEcart: true,
        cause: true,
        description: true,
        expositionAccidentelle: true,
        fie: true,
      },
    }),
    prisma.remonteeInfo.findMany({
      where: { archiveLe: null, ...(depuis ? { dateRemontee: { gte: depuis } } : {}) },
      select: {
        id: true,
        reference: true,
        dateRemontee: true,
        statut: true,
        chantierService: true,
        objet: true,
        description: true,
        natures: true,
        categories: true,
        ecartOrigineId: true,
        ficheSSEId: true,
        ecarts: { select: { id: true }, orderBy: { reference: "asc" } },
      },
    }),
    prisma.rex.findMany({
      where: { archiveLe: null },
      select: { reference: true, ficheSSEId: true, ecartAmianteId: true, remonteeId: true, ecarts: { select: { id: true } } },
    }),
  ]);

  // Ce qui a déjà un REX (brouillons compris) ne se propose pas une seconde fois.
  const couverture = new Map<string, string[]>();
  const couvrir = (type: TypeFait, id: string | null, reference: string) => {
    if (!id) return;
    const cle = `${type}:${id}`;
    couverture.set(cle, [...(couverture.get(cle) ?? []), reference]);
  };
  for (const r of rex) {
    for (const e of r.ecarts) couvrir("ecart", e.id, r.reference);
    couvrir("evenement", r.ficheSSEId, r.reference);
    couvrir("amiante", r.ecartAmianteId, r.reference);
    couvrir("remontee", r.remonteeId, r.reference);
  }

  const libelles = new Map<string, Sujet>(Object.entries(SUJETS));
  const sujetsDe = (valeurs: string[]) => {
    const cles = new Set<string>();
    for (const valeur of valeurs) {
      const n = normaliser(valeur);
      if (IGNORES.has(n)) continue;
      const cle = ALIAS[n] ?? `autre:${n}`;
      if (!libelles.has(cle)) libelles.set(cle, { label: valeur.trim() });
      cles.add(cle);
    }
    return [...cles];
  };

  const faits: Fait[] = [
    ...ecarts.map<Fait>((e) => ({
      type: "ecart",
      id: e.id,
      reference: e.reference,
      href: `/ecarts/${e.id}`,
      date: e.dateDetection,
      chantier: e.dossier?.chantier ?? null,
      chantierCle: cleChantier(e.dossier?.chantier),
      libelle: resume(e.description),
      sujets: sujetsDe(e.theme),
      termes: extraireTermes(`${e.description ?? ""} ${e.cause ?? ""}`),
      texte: normaliser(`${e.description ?? ""} ${e.cause ?? ""}`),
      gravite: Math.max(graviteCriticite(e.criticite), e.natures.includes("Non-conformité critique") ? 2 : 0) as Gravite,
      ouvert: e.statut !== "CLOTURE",
      liens: [],
      lieA: null,
    })),
    ...fiches.map<Fait>((f) => ({
      type: "evenement",
      id: f.id,
      reference: f.reference,
      href: `/fiches-sse/${f.id}`,
      date: f.dateHeure ?? f.createdAt,
      chantier: f.nomChantier?.trim() || null,
      chantierCle: cleChantier(f.nomChantier),
      libelle: resume(f.descriptionFactuelle),
      sujets: sujetsDe(f.theme),
      termes: extraireTermes(f.descriptionFactuelle ?? ""),
      texte: normaliser(f.descriptionFactuelle ?? ""),
      gravite: Math.max(graviteCriticite(f.criticite), /accident/i.test(f.typeEvenement ?? "") ? 2 : 0) as Gravite,
      ouvert: f.statutFiche !== "FINALISEE",
      liens: [f.ecartId && `ecart:${f.ecartId}`, f.ecartAmianteId && `amiante:${f.ecartAmianteId}`].filter((k): k is string => !!k),
      lieA: null,
    })),
    ...amiantes.map<Fait>((a) => ({
      type: "amiante",
      id: a.id,
      reference: a.reference,
      href: `/ecart-amiante/${a.id}`,
      date: a.date,
      chantier: a.nomChantier?.trim() || null,
      chantierCle: cleChantier(a.nomChantier),
      libelle: resume(a.description ?? a.cause ?? a.typeEcart),
      // Un écart amiante relève toujours du sujet amiante ; une cause « filtres »
      // pointe aussi vers le matériel.
      sujets: [...new Set(["amiante", ...(/filtre/i.test(a.cause ?? "") ? ["materiel"] : [])])],
      termes: extraireTermes(`${a.description ?? ""} ${a.cause ?? ""}`),
      texte: normaliser(`${a.description ?? ""} ${a.cause ?? ""}`),
      // Une exposition accidentelle ou une FIE est grave ; tout autre dépassement
      // reste au moins à noter.
      gravite: a.expositionAccidentelle || a.fie ? 2 : 1,
      ouvert: a.statut !== "CLOTURE",
      liens: [],
      lieA: null,
    })),
    ...remontees.map<Fait>((r) => ({
      type: "remontee",
      id: r.id,
      reference: r.reference,
      href: `/remontees/${r.id}`,
      date: r.dateRemontee,
      chantier: r.chantierService?.trim() || null,
      chantierCle: cleChantier(r.chantierService),
      libelle: resume(r.objet),
      sujets: sujetsDe(r.categories),
      termes: extraireTermes(`${r.objet} ${r.description ?? ""}`),
      texte: normaliser(`${r.objet} ${r.description ?? ""}`),
      gravite: r.natures.includes("Point sensible") ? 1 : 0,
      ouvert: r.statut === "A_TRAITER" || r.statut === "EN_COURS",
      // L'écart né de la remontée d'abord, puis les écarts auxquels elle se rapporte, puis l'évènement.
      liens: [
        ...(r.ecartOrigineId ? [`ecart:${r.ecartOrigineId}`] : []),
        ...r.ecarts.map((e) => `ecart:${e.id}`),
        ...(r.ficheSSEId ? [`evenement:${r.ficheSSEId}`] : []),
      ],
      lieA: null,
    })),
  ];

  const parTypeVide = (): Record<TypeFait, number> => ({ ecart: 0, evenement: 0, amiante: 0, remontee: 0 });
  const cleFait = (f: Fait) => `${f.type}:${f.id}`;

  // Un même constat peut être saisi à plusieurs endroits : un évènement créé depuis un écart, une
  // remontée transformée en écart ou rattachée à un écart ou à un évènement. Ces faits forment une
  // famille, comptée une seule fois : sans cela, un incident saisi trois fois pèserait trois fois
  // dans les effectifs, les priorités et les REX déjà couverts.
  const indexFait = new Map(faits.map((f) => [cleFait(f), f]));
  for (const f of faits) f.lieA = f.liens.find((k) => k !== cleFait(f) && indexFait.has(k)) ?? null;
  const racineDe = new Map<string, string>();
  for (const f of faits) {
    let courant = f;
    for (let profondeur = 0; courant.lieA && profondeur < 5; profondeur++) courant = indexFait.get(courant.lieA) ?? courant;
    racineDe.set(cleFait(f), cleFait(courant));
  }
  const racine = (f: Fait) => racineDe.get(cleFait(f)) ?? cleFait(f);
  const familles = new Map<string, Fait[]>();
  for (const f of faits) familles.set(racine(f), [...(familles.get(racine(f)) ?? []), f]);

  const stats = { total: familles.size, parType: parTypeVide(), nbCouverts: 0, nbLies: faits.length - familles.size };
  for (const [cle] of familles) stats.parType[indexFait.get(cle)!.type]++;

  const limiteRecent = maintenant.getTime() - 90 * JOUR;
  // Un REX sur un membre de la famille couvre tout le constat, même si le fait lié est hors période.
  const rexParFamille = new Map<string, string[]>();
  for (const f of faits) {
    const refs = [...(couverture.get(cleFait(f)) ?? []), ...f.liens.flatMap((k) => couverture.get(k) ?? [])];
    if (refs.length > 0) rexParFamille.set(racine(f), [...new Set([...(rexParFamille.get(racine(f)) ?? []), ...refs])]);
  }
  const rexDe = (f: Fait) => rexParFamille.get(racine(f)) ?? [];
  const estCouvert = (f: Fait) => rexDe(f).length > 0;
  stats.nbCouverts = [...familles.keys()].filter((cle) => rexParFamille.has(cle)).length;
  const trier = (liste: Fait[]) =>
    [...liste].sort((a, b) => b.gravite - a.gravite || b.date.getTime() - a.date.getTime());

  function construire(
    cle: string,
    genre: Proposition["genre"],
    titre: string,
    lot: Fait[],
    lienCreation: string,
    motsAssocies: string[] = [],
  ): Proposition {
    // Le même constat saisi plusieurs fois (écart, évènement, remontée liés) ne compte qu'une fois : on
    // garde le fait racine de la famille s'il est dans le lot, sinon le premier.
    const groupes = new Map<string, Fait[]>();
    for (const f of lot) groupes.set(racine(f), [...(groupes.get(racine(f)) ?? []), f]);
    const distincts = [...groupes.entries()].map(([cle, membres]) => membres.find((f) => cleFait(f) === cle) ?? membres[0]);
    const nbDoublons = lot.length - distincts.length;
    const nonCouverts = trier(distincts.filter((f) => !estCouvert(f)));
    const couverts = distincts.filter(estCouvert);
    const rexCouvrants = [...new Set(couverts.flatMap(rexDe))];
    const parType = parTypeVide();
    for (const f of nonCouverts) parType[f.type]++;

    const compteChantiers = new Map<string, { nom: string; n: number }>();
    for (const f of nonCouverts) {
      if (!f.chantierCle || !f.chantier) continue;
      const courant = compteChantiers.get(f.chantierCle) ?? { nom: f.chantier, n: 0 };
      courant.n++;
      compteChantiers.set(f.chantierCle, courant);
    }
    const chantiers = [...compteChantiers.values()].sort((a, b) => b.n - a.n);

    const compteSujets = new Map<string, number>();
    for (const f of nonCouverts) for (const s of f.sujets) compteSujets.set(s, (compteSujets.get(s) ?? 0) + 1);
    const sujetCles = [...compteSujets.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);

    const nbTypes = Object.values(parType).filter((n) => n > 0).length;
    const nbGraves = nonCouverts.filter((f) => f.gravite === 2).length;
    const nbOuverts = nonCouverts.filter((f) => f.ouvert).length;
    const nbRecents = nonCouverts.filter((f) => f.date.getTime() >= limiteRecent).length;
    const n = nonCouverts.length;

    const score =
      n + 2 * Math.max(0, chantiers.length - 1) + 1.5 * Math.max(0, nbTypes - 1) + 4 * nbGraves + 0.5 * nbRecents + 0.3 * nbOuverts;
    // Haute : un fait grave, un motif qui compte au moins deux faits graves, une très grande
    // ampleur (20 faits), ou beaucoup de faits à la fois sur plusieurs chantiers et sources.
    // Un seul fait grave dans un petit motif ne le rend pas prioritaire : ce fait est déjà
    // proposé seul. Moyenne : un volume ou une étendue notables.
    const priorite: Proposition["priorite"] =
      genre === "grave" || nbGraves >= 2 || n >= 20 || (n >= 10 && chantiers.length >= 4 && nbTypes >= 3)
        ? "haute"
        : n >= 5 || chantiers.length >= 3
          ? "moyenne"
          : "a_surveiller";

    const raisons: string[] = [];
    if (genre !== "grave") {
      raisons.push(`${n} faits sur la période : ${detail(parType)}.`);
      if (chantiers.length >= 2) {
        const premier = chantiers[0];
        raisons.push(
          premier.n / n >= 0.6 && n >= 4
            ? `Concentré à ${Math.round((premier.n / n) * 100)} % sur « ${premier.nom} ».`
            : `Présent sur ${chantiers.length} chantiers : le problème n'est pas propre à un site.`,
        );
      }
      if (nbTypes >= 2) raisons.push(`Signalé par ${nbTypes} sources différentes.`);
      if (nbDoublons > 0) {
        raisons.push(
          `${nbDoublons} fait${nbDoublons > 1 ? "s liés" : " lié"} (évènement ou remontée du même constat), compté${nbDoublons > 1 ? "s" : ""} une seule fois.`,
        );
      }
    }
    if (nbGraves > 0) {
      raisons.push(
        genre === "grave"
          ? "Gravité élevée : criticité élevée, accident ou presqu'accident, ou exposition amiante."
          : `Dont ${nbGraves} de gravité élevée (criticité élevée, accident ou presqu'accident, exposition amiante).`,
      );
    }
    if (genre !== "grave") {
      if (nbOuverts > 0) raisons.push(`${nbOuverts} encore ouvert${nbOuverts > 1 ? "s" : ""}.`);
      if (nbRecents > 0) raisons.push(`${nbRecents} dans les 90 derniers jours.`);
    }
    if (rexCouvrants.length > 0) {
      raisons.push(
        `${couverts.length} autre${couverts.length > 1 ? "s" : ""} fait${couverts.length > 1 ? "s" : ""} déjà couvert${couverts.length > 1 ? "s" : ""} par ${rexCouvrants.join(", ")} (non compté${couverts.length > 1 ? "s" : ""}).`,
      );
    }

    const dates = nonCouverts.map((f) => f.date.getTime());
    return {
      cle,
      genre,
      titre,
      motsAssocies,
      nbMots: 0,
      compagnons: [],
      sujetCles,
      faits: nonCouverts,
      rexCouvrants,
      nbCouverts: couverts.length,
      chantiers,
      parType,
      nbGraves,
      nbOuverts,
      nbRecents,
      du: new Date(dates.length ? Math.min(...dates) : maintenant.getTime()),
      au: new Date(dates.length ? Math.max(...dates) : maintenant.getTime()),
      score,
      priorite,
      raisons,
      lienCreation,
    };
  }

  const lienProposition = (cle: string) => `/rex/nouveau?proposition=${encodeURIComponent(cle)}&periode=${periode}`;
  const suffisant = (p: Proposition) => {
    const nbTypes = Object.values(p.parType).filter((n) => n > 0).length;
    return p.faits.length >= MIN_FAITS && (p.chantiers.length >= 2 || nbTypes >= 2 || p.nbGraves >= 1);
  };
  const rang = { haute: 0, moyenne: 1, a_surveiller: 2 } as const;

  // 1. Faits graves : un REX à eux seuls, même isolés.
  // Un seul par constat : l'écart racine s'il est grave, sinon le premier fait grave de la famille.
  const graves: Proposition[] = [];
  const graveDeFamille = new Map<string, Fait>();
  for (const f of faits) {
    if (f.gravite < 2 || estCouvert(f)) continue;
    const dejaChoisi = graveDeFamille.get(racine(f));
    if (!dejaChoisi || cleFait(f) === racine(f)) graveDeFamille.set(racine(f), f);
  }
  for (const f of graveDeFamille.values()) {
    graves.push(
      construire(`grave:${f.type}:${f.id}`, "grave", `${TYPES_FAIT[f.type].label} ${f.reference}`, [f], `/rex/nouveau?${parametreCreation[f.type]}=${f.id}`),
    );
  }
  graves.sort((a, b) => b.au.getTime() - a.au.getTime());

  // 2. Motifs : des mots qui reviennent ENSEMBLE dans les descriptions et les causes.
  //    On cherche les combinaisons de 1 à 4 mots portées par au moins 3 faits (un mot ne
  //    compte pas s'il est dans plus d'un cinquième du corpus : c'est du vocabulaire
  //    courant), puis on ne garde que les combinaisons « fermées » : celles auxquelles on
  //    ne peut ajouter aucun mot sans perdre un fait. Un motif à plusieurs mots est plus
  //    parlant qu'un mot seul (« stockage · déchets · clé » plutôt que « stockage »).
  //    Les faits jumeaux (évènement créé depuis un écart) sont écartés du calcul puis
  //    rattachés à leur écart, pour ne pas gonfler les effectifs.
  const distinctsGlobaux = [...familles.keys()].map((cle) => indexFait.get(cle)!);
  const jumeauxDe = new Map<string, Fait[]>();
  for (const [cle, membres] of familles) jumeauxDe.set(cle, membres.filter((f) => cleFait(f) !== cle));
  const parTerme = new Map<string, { affichage: string; ids: number[] }>();
  distinctsGlobaux.forEach((f, i) => {
    for (const [cle, affichage] of f.termes) {
      const courant = parTerme.get(cle) ?? { affichage, ids: [] };
      courant.ids.push(i);
      parTerme.set(cle, courant);
    }
  });
  const plafondTerme = Math.max(MIN_FAITS + 1, Math.floor(distinctsGlobaux.length * 0.2));
  const eligibles = [...parTerme.entries()]
    .filter(([, t]) => t.ids.length >= MIN_FAITS && t.ids.length <= plafondTerme)
    .sort(([a], [b]) => a.localeCompare(b));
  const intersection = (a: number[], b: number[]) => {
    const dans = new Set(b);
    return a.filter((x) => dans.has(x));
  };
  type Ensemble = { termes: string[]; ids: number[]; dernier: number };
  let niveau: Ensemble[] = eligibles.map(([cle, t], i) => ({ termes: [cle], ids: t.ids, dernier: i }));
  const ensembles: Ensemble[] = [...niveau];
  for (let k = 2; k <= MAX_MOTS_MOTIF && niveau.length > 0 && ensembles.length < MAX_ENSEMBLES; k++) {
    const suivant: Ensemble[] = [];
    for (const e of niveau) {
      for (let i = e.dernier + 1; i < eligibles.length; i++) {
        const ids = intersection(e.ids, eligibles[i][1].ids);
        if (ids.length >= MIN_FAITS) suivant.push({ termes: [...e.termes, eligibles[i][0]], ids, dernier: i });
      }
    }
    ensembles.push(...suivant);
    niveau = suivant;
  }
  // Combinaisons fermées : tous les ensembles qui portent exactement les mêmes faits se
  // réunissent en un seul, dont les mots sont l'ensemble de leurs mots.
  const fermes = new Map<string, { ids: number[]; termes: Set<string> }>();
  for (const e of ensembles) {
    const cle = e.ids.join(",");
    const courant = fermes.get(cle) ?? { ids: e.ids, termes: new Set<string>() };
    for (const t of e.termes) courant.termes.add(t);
    fermes.set(cle, courant);
  }
  const tousCandidats = [...fermes.values()].sort((a, b) => b.ids.length - a.ids.length);
  // Les combinaisons de plusieurs mots passent en premier ; un mot seul ne vient qu'en complément.
  const candidats = tousCandidats.filter((g) => g.termes.size >= 2).slice(0, 600);
  const candidatsMotSeul = tousCandidats
    .filter((g) => g.termes.size === 1 && !MOTS_CONNECTEURS.has([...g.termes][0]))
    .slice(0, 200);
  const motsDe = (g: { termes: Set<string> }) =>
    [...g.termes].sort((a, b) => (parTerme.get(b)?.ids.length ?? 0) - (parTerme.get(a)?.ids.length ?? 0));
  const affichage = (cle: string) => parTerme.get(cle)?.affichage ?? cle;
  // Les mots qui accompagnent le plus souvent un mot seul : de quoi en faire un groupe en un clic.
  const compagnonsDe = (p: Proposition, exclus: Set<string>) => {
    const compte = new Map<string, { mot: string; n: number }>();
    for (const f of p.faits) {
      for (const [cle, mot] of f.termes) {
        if (exclus.has(cle)) continue;
        const courant = compte.get(cle) ?? { mot, n: 0 };
        courant.n++;
        compte.set(cle, courant);
      }
    }
    const seuil = Math.max(2, Math.ceil(p.faits.length * 0.2));
    return [...compte.values()]
      .filter((c) => c.n >= seuil)
      .sort((a, b) => b.n - a.n || a.mot.localeCompare(b.mot))
      .slice(0, 5);
  };
  const construireMotif = (g: { ids: number[]; termes: Set<string> }) => {
    const mots = motsDe(g);
    const lot = g.ids.flatMap((i) => {
      const fait = distinctsGlobaux[i];
      return [fait, ...(jumeauxDe.get(cleFait(fait)) ?? [])];
    });
    const cle = `motif:${[...g.termes].sort().join("+")}`;
    const p = construire(
      cle,
      "motif",
      `« ${mots.slice(0, MAX_MOTS_MOTIF).map(affichage).join(" · ")} »`,
      lot,
      lienProposition(cle),
      mots.slice(MAX_MOTS_MOTIF, MAX_MOTS_MOTIF + 6).map(affichage),
    );
    // À effectif voisin, une combinaison de plusieurs mots est plus parlante qu'un mot seul.
    p.score += 3 * (mots.length - 1);
    p.nbMots = mots.length;
    if (mots.length === 1) p.compagnons = compagnonsDe(p, g.termes);
    return p;
  };
  const classer = (liste: Proposition[]) =>
    liste.filter(suffisant).sort((a, b) => rang[a.priorite] - rang[b.priorite] || b.score - a.score);
  // Deux motifs qui désignent en gros les mêmes faits n'en font qu'un : le mieux classé garde la
  // place et reprend les mots de l'autre.
  const voisinDe = (p: Proposition, liste: Proposition[]) => {
    const cles = new Set(p.faits.map(cleFait));
    return liste.find((m) => {
      const commun = m.faits.filter((x) => cles.has(cleFait(x))).length;
      return commun / (cles.size + m.faits.length - commun) >= 0.5;
    });
  };
  // Les groupes de mots occupent toute la liste : c'est ce qui est proposé en priorité.
  const motifs: Proposition[] = [];
  for (const p of classer(candidats.map(construireMotif))) {
    const voisin = voisinDe(p, motifs);
    if (voisin) {
      const motsVoisin = p.titre.replace(/[«»]/g, "").split("·").map((x) => x.trim());
      const nouveaux = motsVoisin.filter((x) => x && !voisin.titre.includes(x) && !voisin.motsAssocies.includes(x));
      voisin.motsAssocies = [...voisin.motsAssocies, ...nouveaux].slice(0, 6);
    } else if (motifs.length < MAX_MOTIFS) {
      motifs.push(p);
    }
  }
  motifs.sort((a, b) => rang[a.priorite] - rang[b.priorite] || b.score - a.score);
  // Un mot seul est présenté à part, avec les mots qui l'accompagnent, et seulement s'il ne recoupe
  // pas un groupe déjà proposé.
  const motsSeuls: Proposition[] = [];
  for (const p of classer(candidatsMotSeul.map(construireMotif))) {
    if (motsSeuls.length >= MAX_MOTS_SEULS) break;
    if (!voisinDe(p, motifs) && !voisinDe(p, motsSeuls)) motsSeuls.push(p);
  }

  // Recherche libre : les faits dont le texte contient tous les mots saisis (début de mot, sans
  // tenir compte des accents ni des majuscules : « filtre » trouve « filtres »).
  const motsCherches = motsRecherche.map(normaliser).filter((m) => m.length >= 3).slice(0, 6);
  let recherche: Proposition | null = null;
  if (motsCherches.length > 0) {
    const expressions = motsCherches.map((m) => new RegExp(`\\b${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    const cle = `recherche:${motsCherches.join("+")}`;
    recherche = construire(
      cle,
      "motif",
      `« ${motsCherches.join(" · ")} »`,
      faits.filter((fait) => expressions.every((re) => re.test(fait.texte))),
      lienProposition(cle),
    );
    recherche.nbMots = motsCherches.length;
  }

  // 3. Vue d'ensemble par sujet.
  const parSujet = new Map<string, Fait[]>();
  for (const f of faits) for (const s of f.sujets) parSujet.set(s, [...(parSujet.get(s) ?? []), f]);
  const sujets = [...parSujet.entries()]
    .map(([cle, lot]) => construire(`sujet:${cle}`, "sujet", libelles.get(cle)?.label ?? cle, lot, lienProposition(`sujet:${cle}`)))
    .filter(suffisant)
    .sort((a, b) => b.faits.length - a.faits.length);

  return { propositions: [...graves, ...motifs, ...motsSeuls, ...sujets], recherche, libelles, stats, du: depuis, au: maintenant };
}

/** Ce que le parcours de création reçoit pour une proposition de motif ou de sujet. */
export type PrefillProposition = {
  mode: "unique" | "recurrents";
  ecartIds: string[];
  titre: string;
  raisonDiffusion: string;
  pointsCommuns: string[];
  themes: string[];
  noteInterne: string;
  /** Source unique à fixer quand il n'y a pas assez d'écarts pour un REX « récurrent ». */
  parent: { parametre: "ecartId" | "ficheSSEId" | "ecartAmianteId" | "remonteeId"; id: string } | null;
};

const PLAFOND_ECARTS_PREREMPLIS = 15;

export async function prefillDepuisProposition(
  cle: string,
  periode: PeriodeProposition,
): Promise<PrefillProposition | null> {
  const mots = cle.startsWith("recherche:") ? cle.slice("recherche:".length).split("+") : [];
  const { propositions, recherche, libelles } = await analyserPropositions(periode, mots);
  const p = mots.length > 0 ? recherche : propositions.find((x) => x.cle === cle && x.genre !== "grave");
  if (!p || p.faits.length === 0) return null;

  // Point commun et thème : ceux du sujet dominant qui en propose un.
  const info = p.sujetCles.map((s) => libelles.get(s)).find((s) => s?.pointCommun || s?.theme);
  const ecarts = p.faits.filter((f) => f.type === "ecart");
  const references = p.faits.map((f) => f.reference).join(", ");
  const nature = p.genre === "motif" ? `Motif ${p.titre}` : `Sujet « ${p.titre} »`;
  const raison = `${nature} récurrent : ${p.faits.length} faits (${detail(p.parType)})${
    p.chantiers.length > 1 ? ` sur ${p.chantiers.length} chantiers` : ""
  }.`.slice(0, 500);
  const note = `Proposition automatique — faits analysés : ${references}.`;

  const recurrents = ecarts.length >= 2;
  const principal = p.faits[0];
  return {
    mode: recurrents ? "recurrents" : "unique",
    ecartIds: recurrents ? ecarts.slice(0, PLAFOND_ECARTS_PREREMPLIS).map((f) => f.id) : [],
    titre: `${p.genre === "motif" ? "Motif récurrent" : "Sujet récurrent"} : ${p.titre}`,
    raisonDiffusion: raison,
    pointsCommuns: info?.pointCommun ? [info.pointCommun] : [],
    themes: info?.theme ? [info.theme] : [],
    noteInterne:
      recurrents && ecarts.length > PLAFOND_ECARTS_PREREMPLIS
        ? `${note} Seuls les ${PLAFOND_ECARTS_PREREMPLIS} écarts les plus graves puis les plus récents sont pré-sélectionnés.`
        : recurrents
          ? note
          : `${note} ${raison}`,
    parent: recurrents || !principal ? null : { parametre: parametreCreation[principal.type], id: principal.id },
  };
}

function detail(parType: Record<TypeFait, number>) {
  return (Object.keys(parType) as TypeFait[])
    .filter((t) => parType[t] > 0)
    .map((t) => `${parType[t]} ${parType[t] > 1 ? TYPES_FAIT[t].pluriel : TYPES_FAIT[t].singulier}`)
    .join(", ");
}
