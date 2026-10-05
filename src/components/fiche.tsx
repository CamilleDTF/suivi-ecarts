import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Bloc de contenu d'une fiche : titre, compteur et action contextuelle. */
export function FicheSection({
  titre,
  compteur,
  action,
  children,
  className,
}: {
  titre: string;
  compteur?: number;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">
          {titre}
          {compteur !== undefined && <span className="ml-2 font-normal text-muted-foreground">{compteur}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Carte neutre : contour fin, pas d'ombre. */
export function Carte({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border bg-card", className)}>{children}</div>;
}

/** Liste « étiquette / valeur » : lecture, pas saisie. */
export function Proprietes({ children }: { children: ReactNode }) {
  return <dl className="divide-y text-sm">{children}</dl>;
}

export function Propriete({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{children}</dd>
    </div>
  );
}

/** Texte libre d'une fiche : un champ vide se lit « Non renseigné », il ne laisse pas un cadre vide. */
export function TexteLong({ label, valeur }: { label: string; valeur?: string | null }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {valeur?.trim() ? (
        <p className="whitespace-pre-line text-sm leading-relaxed">{valeur}</p>
      ) : (
        <p className="text-sm italic text-muted-foreground">Non renseigné</p>
      )}
    </div>
  );
}

/** Étiquettes d'une liste à choix : seules les valeurs retenues apparaissent. */
export function Pastilles({ label, valeurs }: { label: string; valeurs?: string[] | null }) {
  if (!valeurs || valeurs.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {valeurs.map((v) => (
          <span key={v} className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

export function EtatVide({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{children}</div>
  );
}
