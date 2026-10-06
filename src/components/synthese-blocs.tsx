import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TonSynthese = "ambre" | "bleu" | "vert" | "rouge" | "violet" | "neutre" | "primaire";

const FOND: Record<TonSynthese, string> = {
  ambre: "bg-amber-500",
  bleu: "bg-blue-500",
  vert: "bg-emerald-500",
  rouge: "bg-red-500",
  violet: "bg-violet-500",
  neutre: "bg-slate-400",
  primaire: "bg-primary",
};

// Le dégradé conique de l'anneau a besoin de vraies couleurs, pas de classes.
const COULEUR: Record<TonSynthese, string> = {
  ambre: "#f59e0b",
  bleu: "#3b82f6",
  vert: "#10b981",
  rouge: "#ef4444",
  violet: "#8b5cf6",
  neutre: "#94a3b8",
  primaire: "oklch(0.58 0.185 42)",
};

/** Bloc de la page : titre, complément, contenu. */
export function Bloc({
  titre,
  complement,
  children,
  className,
}: {
  titre: string;
  complement?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-5", className)}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{titre}</h2>
        {complement && <span className="text-xs text-muted-foreground">{complement}</span>}
      </div>
      {children}
    </section>
  );
}

export function TitreSection({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 mt-10 font-display text-2xl font-semibold tracking-tight">{children}</h2>;
}

/**
 * Chiffre clé. `variation` compare à la période précédente de même durée ;
 * `bonne` dit dans quel sens c'est une bonne nouvelle (null : sans jugement).
 */
export function Indicateur({
  label,
  valeur,
  detail,
  variation,
  ton,
  href,
}: {
  label: string;
  valeur: string | number;
  detail?: string;
  variation?: { ecart: number; bonne: "baisse" | "hausse" | null };
  ton?: TonSynthese;
  href?: string;
}) {
  const contenu = (
    <>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {ton && <span className={cn("size-2 rounded-full", FOND[ton])} aria-hidden />}
        {label}
      </p>
      <p className="mt-2 font-display text-4xl font-semibold tabular-nums leading-none">{valeur}</p>
      <div className="mt-3 flex min-h-5 flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        {variation && <Variation {...variation} />}
        {detail && <span>{detail}</span>}
      </div>
    </>
  );
  const classes = "block rounded-xl border bg-card p-4";
  return href ? (
    <Link href={href} className={cn(classes, "transition-colors hover:border-primary/40")}>
      {contenu}
    </Link>
  ) : (
    <div className={classes}>{contenu}</div>
  );
}

function Variation({ ecart, bonne }: { ecart: number; bonne: "baisse" | "hausse" | null }) {
  if (ecart === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 font-medium">
        <MinusIcon className="size-3" aria-hidden /> stable
      </span>
    );
  }
  const hausse = ecart > 0;
  const favorable = bonne === null ? null : (bonne === "hausse") === hausse;
  const Icone = hausse ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium",
        favorable === true && "text-emerald-700",
        favorable === false && "text-red-700",
      )}
      title="Par rapport à la période précédente de même durée"
    >
      <Icone className="size-3" aria-hidden />
      {hausse ? "+" : ""}
      {ecart} vs préc.
    </span>
  );
}

/** Classement en barres horizontales, la plus longue = le maximum affiché. */
export function BarresClassees({
  donnees,
  ton = "primaire",
  vide = "Aucune donnée sur la période.",
}: {
  donnees: { label: string; valeur: number; ton?: TonSynthese }[];
  ton?: TonSynthese;
  vide?: string;
}) {
  const max = Math.max(1, ...donnees.map((d) => d.valeur));
  if (donnees.length === 0 || donnees.every((d) => d.valeur === 0)) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{vide}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {donnees.map((d) => (
        <li key={d.label} className="grid grid-cols-[minmax(0,9rem)_1fr_2rem] items-center gap-3 text-sm">
          <span className="truncate text-muted-foreground" title={d.label}>
            {d.label}
          </span>
          <span className="h-2.5 overflow-hidden rounded-full bg-muted">
            <span
              className={cn("block h-full rounded-full", FOND[d.ton ?? ton])}
              style={{ width: `${(d.valeur / max) * 100}%` }}
            />
          </span>
          <span className="text-right font-medium tabular-nums">{d.valeur}</span>
        </li>
      ))}
    </ul>
  );
}

/** Anneau de répartition avec sa légende. */
export function Anneau({
  segments,
  centre,
}: {
  segments: { label: string; valeur: number; ton: TonSynthese }[];
  centre?: string;
}) {
  const total = segments.reduce((s, x) => s + x.valeur, 0);
  let cumul = 0;
  const degrade =
    total === 0
      ? "var(--muted)"
      : `conic-gradient(${segments
          .filter((s) => s.valeur > 0)
          .map((s) => {
            const debut = (cumul / total) * 360;
            cumul += s.valeur;
            return `${COULEUR[s.ton]} ${debut}deg ${(cumul / total) * 360}deg`;
          })
          .join(", ")})`;
  return (
    <div className="flex items-center gap-6">
      <div className="relative size-32 shrink-0 rounded-full" style={{ background: degrade }}>
        <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-card">
          <span className="font-display text-2xl font-semibold tabular-nums leading-none">{total}</span>
          <span className="mt-1 text-[11px] text-muted-foreground">{centre ?? "Total"}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className={cn("size-2.5 shrink-0 rounded-full", FOND[s.ton])} aria-hidden />
            <span className="truncate text-muted-foreground">{s.label}</span>
            <span className="ml-auto font-medium tabular-nums">{s.valeur}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Colonnes groupées par mois : plusieurs séries côte à côte, échelle commune. */
export function ColonnesGroupees({
  mois,
  series,
}: {
  mois: { label: string; annee?: string; valeurs: number[] }[];
  series: { nom: string; ton: TonSynthese }[];
}) {
  const max = Math.max(1, ...mois.flatMap((m) => m.valeurs));
  return (
    <div>
      <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        {series.map((s, i) => (
          <li key={s.nom} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", FOND[s.ton])} aria-hidden />
            {s.nom}
            <span className="font-medium tabular-nums text-foreground">
              {mois.reduce((t, m) => t + m.valeurs[i], 0)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex h-48 items-end gap-1.5 border-b sm:gap-3">
        {mois.map((m, i) => (
          <div
            key={i}
            className="flex h-full min-w-0 flex-1 items-end justify-center gap-0.5"
            title={`${m.label}${m.annee ? ` ${m.annee}` : ""} :${series.map((s, i) => `${m.valeurs[i]} ${s.nom.toLowerCase()}`).join(", ")}`}
          >
            {m.valeurs.map((v, i) => (
              <div key={series[i].nom} className="flex h-full w-full max-w-5 flex-col justify-end">
                {v > 0 && <span className="mb-0.5 text-center text-[10px] tabular-nums text-muted-foreground">{v}</span>}
                <div
                  className={cn("w-full rounded-t-sm", FOND[series[i].ton])}
                  style={{ height: `${(v / max) * 82}%`, minHeight: v > 0 ? 3 : 0 }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-3">
        {mois.map((m, i) => (
          <span key={i} className="min-w-0 flex-1 text-center text-[11px] leading-tight text-muted-foreground">
            <span className="block truncate">{m.label}</span>
            <span className="block h-3 font-medium text-foreground">{m.annee}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Ligne cliquable d'une liste de points d'attention. */
export function LignePoint({
  href,
  reference,
  texte,
  droite,
  ton,
}: {
  href: string;
  reference: string;
  texte: string;
  droite: ReactNode;
  ton: TonSynthese;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 py-2.5 transition-colors hover:bg-muted/50 sm:-mx-2 sm:px-2 sm:rounded-lg">
        <span className={cn("size-2 shrink-0 rounded-full", FOND[ton])} aria-hidden />
        <span className="w-28 shrink-0 text-sm font-medium">{reference}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{texte}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{droite}</span>
      </Link>
    </li>
  );
}
