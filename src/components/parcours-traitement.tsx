import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type EtapeParcours = {
  label: string;
  legende: string;
  fait: boolean;
};

/**
 * Avancement du traitement d'une fiche : chaque étape est cochée d'après ce
 * qui est réellement renseigné, la première étape non faite est mise en
 * avant. Montre d'un coup d'œil ce qui manque avant de clôturer.
 */
export function ParcoursTraitement({ etapes }: { etapes: EtapeParcours[] }) {
  const courante = etapes.findIndex((e) => !e.fait);
  return (
    <ol className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-5 sm:gap-2">
      {etapes.map((e, i) => {
        const enCours = i === courante;
        return (
          <li key={e.label} className="relative flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
            <div className="flex w-full items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  e.fait && "bg-emerald-500 text-white",
                  enCours && "bg-sidebar-primary text-sidebar-primary-foreground ring-4 ring-sidebar-primary/25",
                  !e.fait && !enCours && "bg-muted text-muted-foreground",
                )}
              >
                {e.fait ? <CheckIcon className="size-4" aria-hidden /> : i + 1}
              </span>
              {i < etapes.length - 1 && (
                <span className={cn("hidden h-0.5 flex-1 rounded-full sm:block", e.fait ? "bg-emerald-500" : "bg-border")} aria-hidden />
              )}
            </div>
            <div className="min-w-0">
              <p className={cn("text-sm font-medium", !e.fait && !enCours && "text-muted-foreground")}>{e.label}</p>
              <p className={cn("text-xs", enCours ? "font-medium text-foreground" : "text-muted-foreground")}>{e.legende}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
