import Link from "next/link";
import { cn } from "@/lib/utils";

export type EvenementChrono = {
  date: Date;
  titre: string;
  detail?: string;
  href?: string;
  /** Départage deux évènements du même jour : le plus avancé dans la vie de la fiche passe en premier. */
  rang?: number;
  ton: "ambre" | "bleu" | "vert" | "rouge" | "violet" | "neutre";
};

const POINTS: Record<EvenementChrono["ton"], string> = {
  ambre: "bg-amber-500",
  bleu: "bg-blue-500",
  vert: "bg-emerald-500",
  rouge: "bg-red-500",
  violet: "bg-violet-500",
  neutre: "bg-slate-400",
};

/** Fil des évènements d'une fiche, du plus récent au plus ancien. */
export function Chronologie({ evenements }: { evenements: EvenementChrono[] }) {
  const jour = (d: Date) => Math.floor(d.getTime() / 86_400_000);
  const tries = [...evenements].sort(
    (a, b) =>
      jour(b.date) - jour(a.date) || (b.rang ?? 0) - (a.rang ?? 0) || b.date.getTime() - a.date.getTime(),
  );
  return (
    <ol className="relative ml-2 space-y-6 border-l-2 border-border pl-6">
      {tries.map((e, i) => (
        <li key={i} className="relative">
          <span
            className={cn("absolute -left-[33px] top-1 size-3 rounded-full ring-4 ring-background", POINTS[e.ton])}
            aria-hidden
          />
          <p className="text-xs tabular-nums text-muted-foreground">
            {e.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <p className="mt-0.5 text-sm font-medium">
            {e.href ? (
              <Link href={e.href} className="underline-offset-4 hover:underline">
                {e.titre}
              </Link>
            ) : (
              e.titre
            )}
          </p>
          {e.detail && <p className="mt-0.5 text-sm text-muted-foreground">{e.detail}</p>}
        </li>
      ))}
    </ol>
  );
}
