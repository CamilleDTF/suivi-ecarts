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
  gravite: Gravite;
  ouvert: boolean;
  /** Clé du fait dont celui-ci est le prolongement (évènement créé depuis un écart, remontée transformée en écart). */
  lieA: string | null;
};

export type Proposition = {
  cle: string;
  genre: "grave" | "motif" | "sujet";
  titre: string;
  /** Pour un motif : les mots voisins regroupés avec lui. */
  motsAssocies: string[];
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
    "elles notre votre sera seront serait etant avoir quand lorsque afin elle ils lieu etre rien tres bien"
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
    "environnement protection protections dispositif dispositifs"
  ).split(/\s+/),
);

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
  for (const m of texte.toLowerCase().matchAll(/[a-zà-öø-ÿ]{5,}/g)) {
    const brut = m[0];
    const sansAccent = normaliser(brut);
    if (MOTS_VIDES.has(sansAccent)) continue;
    const cle = racine(sansAccent);
    if (cle.length < 5 || MOTS_VIDES.has(cle) || MOTS_GENERIQUES.has(cle) || MOTS_GENERIQUES.has(sansAccent)) continue;
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
  libelles: Map<string, Sujet>;
  stats: { total: number; parType: Record<TypeFait, number>; nbCouverts: number };
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

export async function analyserPropositions(periode: PeriodeProposition): Promise<Analyse> {
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
      gravite: Math.max(graviteCriticite(e.criticite), e.natures.includes("Non-conformité critique") ? 2 : 0) as Gravite,
      ouvert: e.statut !== "CLOTURE",
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
      gravite: Math.max(graviteCriticite(f.criticite), /accident/i.test(f.typeEvenement ?? "") ? 2 : 0) as Gravite,
      ouvert: f.statutFiche !== "FINALISEE",
      lieA: f.ecartId ? `ecart:${f.ecartId}` : f.ecartAmianteId ? `amiante:${f.ecartAmianteId}` : null,
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
      // Une exposition accidentelle ou une FIE est grave ; tout autre dépassement
      // reste au moins à noter.
      gravite: a.expositionAccidentelle || a.fie ? 2 : 1,
      ouvert: a.statut !== "CLOTURE",
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
      gravite: r.natures.includes("Point sensible") ? 1 : 0,
      ouvert: r.statut === "A_TRAITER" || r.statut === "EN_COURS",
      lieA: r.ecartOrigineId ? `ecart:${r.ecartOrigineId}` : null,
    })),
  ];

  const parTypeVide = (): Record<TypeFait, number> => ({ ecart: 0, evenement: 0, amiante: 0, remontee: 0 });
  const stats = { total: faits.length, parType: parTypeVide(), nbCouverts: 0 };
  for (const f of faits) stats.parType[f.type]++;

  const limiteRecent = maintenant.getTime() - 90 * JOUR;
  const cleFait = (f: Fait) => `${f.type}:${f.id}`;
  const rexDe = (f: Fait) => [...(couverture.get(cleFait(f)) ?? []), ...(f.lieA ? (couverture.get(f.lieA) ?? []) : [])];
  const estCouvert = (f: Fait) => rexDe(f).length > 0;
  stats.nbCouverts = faits.filter(estCouvert).length;
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
    // Un évènement créé depuis un écart, une remontée devenue écart : le même fait, compté une fois.
    const dansLot = new Set(lot.map(cleFait));
    const distincts = lot.filter((f) => !(f.lieA && dansLot.has(f.lieA)));
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
    // Haute : un fait grave, un motif dont au moins un quart des faits sont graves, ou un
    // motif qui touche à la fois beaucoup de faits, de chantiers et de sources. Sinon, le
    // simple volume ou l'étendue le placent en moyenne (un seul fait grave noyé dans vingt
    // autres ne fait pas un motif prioritaire : il est déjà proposé seul).
    const priorite: Proposition["priorite"] =
      genre === "grave" || (nbGraves >= 1 && nbGraves * 4 >= n) || (n >= 10 && chantiers.length >= 4 && nbTypes >= 3)
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
          `${nbDoublons} évènement${nbDoublons > 1 ? "s ou remontées liés" : " ou remontée lié"} à un écart de la liste, compté${nbDoublons > 1 ? "s" : ""} avec lui.`,
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
  const graves: Proposition[] = [];
  const gravesParCle = new Set(faits.filter((f) => f.gravite === 2).map(cleFait));
  for (const f of faits) {
    if (f.gravite < 2 || estCouvert(f)) continue;
    if (f.lieA && gravesParCle.has(f.lieA)) continue;
    graves.push(
      construire(`grave:${f.type}:${f.id}`, "grave", `${TYPES_FAIT[f.type].label} ${f.reference}`, [f], `/rex/nouveau?${parametreCreation[f.type]}=${f.id}`),
    );
  }
  graves.sort((a, b) => b.au.getTime() - a.au.getTime());

  // 2. Motifs : un mot qui revient dans les descriptions et les causes. On garde les
  //    mots portés par au moins 3 faits mais pas par plus d'un cinquième du corpus
  //    (au-delà, ce n'est plus un motif mais du vocabulaire courant), puis on
  //    regroupe les mots qui désignent les mêmes faits (« filtre » et « umd »).
  const parTerme = new Map<string, { affichage: string; faits: Fait[] }>();
  for (const f of faits) {
    for (const [cle, affichage] of f.termes) {
      const courant = parTerme.get(cle) ?? { affichage, faits: [] };
      courant.faits.push(f);
      parTerme.set(cle, courant);
    }
  }
  const plafondTerme = Math.max(MIN_FAITS + 1, Math.floor(faits.length * 0.2));
  const candidats = [...parTerme.entries()]
    .filter(([, t]) => t.faits.length >= MIN_FAITS && t.faits.length <= plafondTerme)
    .sort((a, b) => b[1].faits.length - a[1].faits.length);
  const groupes: { cle: string; affichage: string; ids: Set<string>; associes: string[] }[] = [];
  for (const [cle, t] of candidats) {
    const ids = new Set(t.faits.map((f) => `${f.type}:${f.id}`));
    const voisin = groupes.find((g) => {
      const commun = [...ids].filter((i) => g.ids.has(i)).length;
      return commun / (ids.size + g.ids.size - commun) >= 0.5;
    });
    if (voisin) {
      voisin.associes.push(t.affichage);
      for (const i of ids) voisin.ids.add(i);
    } else {
      groupes.push({ cle, affichage: t.affichage, ids, associes: [] });
    }
  }
  const parId = new Map(faits.map((f) => [`${f.type}:${f.id}`, f]));
  const motifs = groupes
    .map((g) =>
      construire(
        `motif:${g.cle}`,
        "motif",
        `« ${g.affichage} »`,
        [...g.ids].map((i) => parId.get(i)!),
        lienProposition(`motif:${g.cle}`),
        g.associes.slice(0, 5),
      ),
    )
    .filter(suffisant)
    .sort((a, b) => rang[a.priorite] - rang[b.priorite] || b.score - a.score)
    .slice(0, MAX_MOTIFS);

  // 3. Vue d'ensemble par sujet.
  const parSujet = new Map<string, Fait[]>();
  for (const f of faits) for (const s of f.sujets) parSujet.set(s, [...(parSujet.get(s) ?? []), f]);
  const sujets = [...parSujet.entries()]
    .map(([cle, lot]) => construire(`sujet:${cle}`, "sujet", libelles.get(cle)?.label ?? cle, lot, lienProposition(`sujet:${cle}`)))
    .filter(suffisant)
    .sort((a, b) => b.faits.length - a.faits.length);

  return { propositions: [...graves, ...motifs, ...sujets], libelles, stats, du: depuis, au: maintenant };
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
  const { propositions, libelles } = await analyserPropositions(periode);
  const p = propositions.find((x) => x.cle === cle && x.genre !== "grave");
  if (!p) return null;

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
