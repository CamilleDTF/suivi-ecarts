import Link from "next/link";
import type { ReactNode } from "react";
import { LightbulbIcon, PlusIcon, SearchIcon } from "lucide-react";
import { BoutonRetour } from "@/components/bouton-retour";
import { EtatVide } from "@/components/fiche";
import { ConteneurPage, EntetePage } from "@/components/page-liste";
import { buttonVariants } from "@/components/ui/button";
import { dateParis } from "@/lib/date-paris";
import {
  analyserPropositions,
  lirePeriodeProposition,
  PERIODE_PAR_DEFAUT,
  PERIODES_PROPOSITION,
  TYPES_FAIT,
  type Fait,
  type Proposition,
  type TypeFait,
} from "@/lib/propositions-rex";
import { cn } from "@/lib/utils";

const PRIORITE = {
  haute: { label: "Priorité haute", classe: "bg-red-100 text-red-800" },
  moyenne: { label: "Priorité moyenne", classe: "bg-amber-100 text-amber-800" },
  a_surveiller: { label: "À surveiller", classe: "bg-muted text-muted-foreground" },
} as const;

const PUCE_TYPE: Record<TypeFait, { court: string; classe: string }> = {
  ecart: { court: "Écart", classe: "bg-orange-100 text-orange-800" },
  evenement: { court: "SSE", classe: "bg-blue-100 text-blue-800" },
  amiante: { court: "Amiante", classe: "bg-teal-100 text-teal-800" },
  remontee: { court: "Remontée", classe: "bg-violet-100 text-violet-800" },
};

const FAITS_AFFICHES = 40;

function Puce({ type }: { type: TypeFait }) {
  const p = PUCE_TYPE[type];
  return <span className={cn("inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium", p.classe)}>{p.court}</span>;
}

function BoutonCreer({ href, compact }: { href: string; compact?: boolean }) {
  return (
    <Link href={href} className={buttonVariants({ size: compact ? "default" : "lg", variant: compact ? "outline" : "default" })}>
      <PlusIcon /> Créer le REX
    </Link>
  );
}

function LigneFait({ fait }: { fait: Fait }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
      <Puce type={fait.type} />
      <Link href={fait.href} className="w-28 shrink-0 font-medium underline-offset-4 hover:underline">
        {fait.reference}
      </Link>
      <span className="w-20 shrink-0 tabular-nums text-muted-foreground">{dateParis(fait.date)}</span>
      <span className="min-w-0 flex-1 basis-64 truncate" title={fait.libelle}>
        {fait.libelle}
      </span>
      <span className="max-w-48 truncate text-xs text-muted-foreground" title={fait.chantier ?? undefined}>
        {fait.chantier ?? "Chantier non renseigné"}
      </span>
      <span className="flex gap-1">
        {fait.gravite === 2 && <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-800">Grave</span>}
        {fait.ouvert && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">Ouvert</span>}
      </span>
    </li>
  );
}

function Section({ titre, aide, children }: { titre: string; aide: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{titre}</h2>
      <p className="mb-4 mt-1 max-w-3xl text-sm text-muted-foreground">{aide}</p>
      {children}
    </section>
  );
}

/** Fait grave : une ligne, un bouton. */
function LigneGrave({ p }: { p: Proposition }) {
  const f = p.faits[0];
  if (!f) return null;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-sm">
      <Puce type={f.type} />
      <Link href={f.href} className="w-28 shrink-0 font-medium underline-offset-4 hover:underline">
        {f.reference}
      </Link>
      <span className="w-20 shrink-0 tabular-nums text-muted-foreground">{dateParis(f.date)}</span>
      <span className="min-w-0 flex-1 basis-72 truncate" title={f.libelle}>
        {f.libelle}
      </span>
      <span className="max-w-48 truncate text-xs text-muted-foreground" title={f.chantier ?? undefined}>
        {f.chantier ?? "Chantier non renseigné"}
      </span>
      {f.ouvert && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">Ouvert</span>}
      <BoutonCreer href={p.lienCreation} compact />
    </li>
  );
}

/** Mot seul : trop vague pour un REX précis, présenté avec les mots qui l'accompagnent pour en faire un groupe. */
function LigneMotSeul({ p, lienRecherche }: { p: Proposition; lienRecherche: (mots: string[]) => string }) {
  const priorite = PRIORITE[p.priorite];
  const mot = p.titre.replace(/[«»]/g, "").trim();
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
      <span className="font-display text-lg font-semibold tracking-tight">{p.titre}</span>
      <span className="tabular-nums text-muted-foreground">
        {p.faits.length} faits · {p.chantiers.length} chantier{p.chantiers.length > 1 ? "s" : ""}
      </span>
      <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", priorite.classe)}>{priorite.label}</span>
      <span className="flex min-w-0 flex-1 basis-72 flex-wrap items-center gap-1.5">
        {p.compagnons.length > 0 && <span className="text-xs text-muted-foreground">Souvent avec :</span>}
        {p.compagnons.map((c) => (
          <Link
            key={c.mot}
            href={lienRecherche([mot, c.mot])}
            title={`Chercher les faits qui contiennent « ${mot} » et « ${c.mot} »`}
            className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-muted"
          >
            {c.mot} <span className="tabular-nums text-muted-foreground">{c.n}</span>
          </Link>
        ))}
        <Link href={lienRecherche([mot])} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
          Voir les faits
        </Link>
      </span>
      <BoutonCreer href={p.lienCreation} compact />
    </li>
  );
}

/** Motif ou sujet : un titre, ce qui le justifie, les faits à l'appui. */
function CarteProposition({ p, libelleSujet }: { p: Proposition; libelleSujet: (cle: string) => string }) {
  const priorite = PRIORITE[p.priorite];
  const sujets = p.genre === "motif" ? p.sujetCles.slice(0, 3).map(libelleSujet) : [];
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {p.genre === "motif" ? (
              <span className={cn("rounded-full px-2.5 py-1 font-medium", priorite.classe)}>{priorite.label}</span>
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">Vue d&apos;ensemble</span>
            )}
          </div>
          <h3 className="mt-2 font-display text-xl font-semibold tracking-tight">{p.titre}</h3>
          {p.genre === "motif" && (sujets.length > 0 || p.motsAssocies.length > 0) && (
            <p className="mt-1 text-sm text-muted-foreground">
              {sujets.length > 0 && <>Sujets : {sujets.join(", ")}</>}
              {sujets.length > 0 && p.motsAssocies.length > 0 && " · "}
              {p.motsAssocies.length > 0 && <>mots voisins : {p.motsAssocies.join(", ")}</>}
            </p>
          )}
        </div>
        <BoutonCreer href={p.lienCreation} />
      </div>

      <ul className="mt-4 space-y-1 text-sm">
        {p.raisons.map((r) => (
          <li key={r} className="flex gap-2">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" aria-hidden />
            <span>{r}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        {(Object.keys(p.parType) as TypeFait[])
          .filter((t) => p.parType[t] > 0)
          .map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <Puce type={t} />
              <span className="tabular-nums text-muted-foreground">{p.parType[t]}</span>
            </span>
          ))}
        {p.chantiers.length > 0 && (
          <span className="text-muted-foreground">
            ·{" "}
            {p.chantiers
              .slice(0, 3)
              .map((c) => `${c.nom} (${c.n})`)
              .join(", ")}
            {p.chantiers.length > 3 ? ` et ${p.chantiers.length - 3} autre${p.chantiers.length - 3 > 1 ? "s" : ""}` : ""}
          </span>
        )}
      </div>

      <details className="mt-4 border-t pt-3">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          Voir les {p.faits.length} faits ({dateParis(p.du)} → {dateParis(p.au)})
        </summary>
        <ul className="mt-2 divide-y">
          {p.faits.slice(0, FAITS_AFFICHES).map((f) => (
            <LigneFait key={`${f.type}-${f.id}`} fait={f} />
          ))}
        </ul>
        {p.faits.length > FAITS_AFFICHES && (
          <p className="pt-2 text-xs text-muted-foreground">
            Les {FAITS_AFFICHES} plus graves puis plus récents sont listés ; {p.faits.length - FAITS_AFFICHES} autres sont comptés dans la proposition.
          </p>
        )}
      </details>
    </section>
  );
}

export default async function PropositionsRexPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; mots?: string }>;
}) {
  const { periode: periodeDemandee, mots: motsDemandes } = await searchParams;
  const periode = lirePeriodeProposition(periodeDemandee);
  const mots = (motsDemandes ?? "").split(/[\s,;+]+/).filter(Boolean).slice(0, 6);
  const { propositions, recherche, libelles, stats } = await analyserPropositions(periode, mots);
  const lien = (p: string, avecMots = true) => {
    const params = new URLSearchParams();
    if (p !== PERIODE_PAR_DEFAUT) params.set("periode", p);
    if (avecMots && mots.length > 0) params.set("mots", mots.join(" "));
    const qs = params.toString();
    return qs ? `/rex/propositions?${qs}` : "/rex/propositions";
  };
  const graves = propositions.filter((p) => p.genre === "grave");
  const motifs = propositions.filter((p) => p.genre === "motif" && p.nbMots >= 2);
  const motsSeuls = propositions.filter((p) => p.genre === "motif" && p.nbMots === 1);
  const lienRecherche = (liste: string[]) => {
    const params = new URLSearchParams();
    if (periode !== PERIODE_PAR_DEFAUT) params.set("periode", periode);
    params.set("mots", liste.join(" "));
    return `/rex/propositions?${params}`;
  };
  const sujets = propositions.filter((p) => p.genre === "sujet");
  const libelleSujet = (cle: string) => libelles.get(cle)?.label ?? cle;
  const nbActionnables = graves.length + motifs.length + motsSeuls.length;

  return (
    <ConteneurPage>
      <BoutonRetour href="/rex" label="Retour aux REX" />
      <EntetePage
        titre="Propositions de REX"
        sousTitre="Faits graves et motifs qui reviennent dans les écarts, évènements SSE, écarts amiante et remontées, et qui n'ont pas encore de REX."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-lg bg-muted p-0.5" role="group" aria-label="Période analysée">
        {PERIODES_PROPOSITION.map((p) => (
          <Link
            key={p.cle}
            href={lien(p.cle)}
            aria-pressed={p.cle === periode}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              p.cle === periode ? "bg-background font-medium text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <form action="/rex/propositions" method="get" className="flex min-w-0 flex-1 basis-96 items-center gap-2" role="search">
        {periode !== PERIODE_PAR_DEFAUT && <input type="hidden" name="periode" value={periode} />}
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            name="mots"
            defaultValue={mots.join(" ")}
            placeholder="Chercher avec plusieurs mots : filtre sale, balisage zone…"
            aria-label="Chercher des faits contenant tous ces mots"
            className="h-9 w-full rounded-lg border border-input bg-transparent pl-8 pr-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <button type="submit" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Chercher
        </button>
        {mots.length > 0 && (
          <Link href={lien(periode, false)} className={buttonVariants({ variant: "ghost", size: "lg" })}>
            Effacer
          </Link>
        )}
      </form>
      </div>

      {mots.length > 0 && recherche && (
        <Section
          titre="Résultat de votre recherche"
          aide={`Les faits qui contiennent tous les mots saisis (début de mot, sans tenir compte des accents) : ${mots.join(", ")}.`}
        >
          {recherche.faits.length === 0 ? (
            <EtatVide>
              Aucun fait de la période ne contient tous ces mots{recherche.nbCouverts > 0 ? " qui ne soit déjà couvert par un REX" : ""}. Essayez avec moins de mots ou une période plus longue.
            </EtatVide>
          ) : (
            <CarteProposition p={recherche} libelleSujet={libelleSujet} />
          )}
        </Section>
      )}

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Constats analysés</p>
          <p className="mt-2 font-display text-4xl font-semibold tabular-nums leading-none">{stats.total}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {(Object.keys(stats.parType) as TypeFait[]).map((t) => `${stats.parType[t]} ${TYPES_FAIT[t].pluriel}`).join(" · ")}
          </p>
          {stats.nbLies > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.nbLies} évènement{stats.nbLies > 1 ? "s" : ""} ou remontée{stats.nbLies > 1 ? "s" : ""} liés à un autre fait : même constat, compté une seule fois.
            </p>
          )}
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Propositions</p>
          <p className="mt-2 font-display text-4xl font-semibold tabular-nums leading-none">{nbActionnables}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {graves.length} fait{graves.length > 1 ? "s" : ""} grave{graves.length > 1 ? "s" : ""} · {motifs.length} groupe{motifs.length > 1 ? "s" : ""} de mots · {motsSeuls.length} mot{motsSeuls.length > 1 ? "s" : ""} seul{motsSeuls.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Déjà couverts par un REX</p>
          <p className="mt-2 font-display text-4xl font-semibold tabular-nums leading-none">{stats.nbCouverts}</p>
          <p className="mt-3 text-xs text-muted-foreground">constats exclus des propositions</p>
        </div>
      </div>

      {nbActionnables === 0 && (
        <div className="mt-8">
          <EtatVide>
            Aucune proposition sur cette période : aucun fait grave n&apos;attend de REX et aucun motif ne revient assez souvent.
          </EtatVide>
        </div>
      )}

      {graves.length > 0 && (
        <Section
          titre="Faits graves"
          aide="Criticité élevée, accident ou presqu'accident, exposition amiante : chacun mérite un REX à lui seul, même sans récurrence."
        >
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {graves.map((p) => (
              <LigneGrave key={p.cle} p={p} />
            ))}
          </ul>
        </Section>
      )}

      {motifs.length > 0 && (
        <Section
          titre="Groupes de mots qui reviennent"
          aide="Des groupes de mots qui reviennent ensemble dans les descriptions et les causes de plusieurs faits, sur plusieurs chantiers ou plusieurs sources : un bon candidat pour un REX précis."
        >
          <div className="space-y-4">
            {motifs.map((p) => (
              <CarteProposition key={p.cle} p={p} libelleSujet={libelleSujet} />
            ))}
          </div>
        </Section>
      )}

      {motsSeuls.length > 0 && (
        <Section
          titre="Mots seuls fréquents"
          aide="Un mot seul est rarement assez précis pour un REX. Cliquez sur un mot qui l'accompagne pour chercher les faits qui contiennent les deux et créer un REX plus ciblé."
        >
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {motsSeuls.map((p) => (
              <LigneMotSeul key={p.cle} p={p} lienRecherche={lienRecherche} />
            ))}
          </ul>
        </Section>
      )}

      {sujets.length > 0 && (
        <details className="mt-10 rounded-xl border bg-card p-5">
          <summary className="cursor-pointer font-display text-xl font-semibold tracking-tight">
            Vue d&apos;ensemble par sujet <span className="ml-1 text-base font-normal text-muted-foreground">{sujets.length}</span>
          </summary>
          <p className="mb-4 mt-2 max-w-3xl text-sm text-muted-foreground">
            Les grands thèmes (organisation, matériel, EPI…) : trop larges pour devenir un REX tels quels, mais utiles pour situer où se concentrent
            les faits. Préférez un motif précis ci-dessus.
          </p>
          <div className="space-y-4">
            {sujets.map((p) => (
              <CarteProposition key={p.cle} p={p} libelleSujet={libelleSujet} />
            ))}
          </div>
        </details>
      )}

      <details className="mt-10 rounded-xl border bg-card p-5 text-sm">
        <summary className="flex cursor-pointer items-center gap-2 font-medium">
          <LightbulbIcon className="size-4 text-primary" aria-hidden />
          Comment sont calculées les propositions ?
        </summary>
        <div className="mt-4 space-y-3 text-muted-foreground">
          <p>
            L&apos;outil lit les écarts, les évènements SSE, les écarts amiante et les remontées de la période, et écarte tout ce qui est déjà
            rattaché à un REX, brouillons compris. Rien n&apos;est envoyé à l&apos;extérieur : le calcul se fait dans l&apos;application.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-foreground">Fait grave</strong> : écart ou évènement de criticité élevée, accident ou presqu&apos;accident,
              exposition accidentelle ou FIE en amiante, écart « non-conformité critique ». Proposé seul, même sans récurrence.
            </li>
            <li>
              <strong className="text-foreground">Groupe de mots</strong> : une combinaison de mots significatifs (jusqu&apos;à 4) qui reviennent ensemble dans au moins 3
              faits (descriptions et causes), sans être du vocabulaire courant, sur au moins 2 chantiers ou 2 sources, ou avec un fait grave. Les
              groupes qui désignent presque les mêmes faits sont regroupés. Un mot qui revient seul, sans compagnon constant, est présenté à part
              avec les mots qui l&apos;accompagnent le plus souvent : un clic cherche les faits qui contiennent les deux.
            </li>
            <li>
              <strong className="text-foreground">Même constat, compté une fois</strong> : un évènement créé depuis un écart, une remontée transformée en
              écart ou rattachée à un écart ou à un évènement forment un seul constat. Il ne pèse qu&apos;une fois dans les effectifs et les priorités,
              et un REX sur l&apos;un d&apos;eux couvre les autres. Deux saisies identiques sans lien ne sont pas reconnues : rattachez-les l&apos;une à l&apos;autre.
            </li>
            <li>
              <strong className="text-foreground">Recherche libre</strong> : saisissez vos propres mots (par exemple « filtre sale ») pour voir tous les
              faits qui les contiennent, quel que soit le nombre, et créer un REX à partir du résultat.
            </li>
            <li>
              <strong className="text-foreground">Priorité</strong> : haute si le motif compte au moins 2 faits graves, au moins 20 faits, ou
              au moins 10 faits sur 4 chantiers et 3 sources ; moyenne à partir de 5 faits ou 3 chantiers ; sinon à surveiller. Un fait grave isolé
              est déjà proposé seul, il ne rend pas à lui seul un motif prioritaire. À priorité égale, le classement tient compte du nombre de faits, de chantiers et de
              sources, de la gravité, des faits ouverts et récents.
            </li>
            <li>
              <strong className="text-foreground">Vue par sujet</strong> : même calcul sur le thème des écarts et évènements, la catégorie des remontées
              et le sujet amiante.
            </li>
            <li>
              <strong className="text-foreground">Créer le REX</strong> ouvre le parcours habituel, déjà pré-rempli : écarts sélectionnés, titre, raison de
              diffusion, point commun et thème. L&apos;enseignement, la nature et la diffusion restent à renseigner.
            </li>
          </ul>
          <p>
            Ce sont des pistes, pas des décisions : l&apos;outil repère des mots, pas du sens. Consultez toujours les faits listés avant de rédiger le REX.
          </p>
        </div>
      </details>
    </ConteneurPage>
  );
}
