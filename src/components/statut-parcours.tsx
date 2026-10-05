import { cn } from "@/lib/utils";
import type { TonStatut } from "@/components/badge-statut";

const POINTS: Record<TonStatut, string> = {
  neutre: "bg-slate-400",
  ambre: "bg-amber-500",
  bleu: "bg-blue-500",
  vert: "bg-emerald-500",
  rouge: "bg-red-500",
  violet: "bg-violet-500",
};

/**
 * Statut d'une fiche sous forme de parcours : l'étape en cours est mise en
 * avant, un clic sur une autre étape change le statut. Remplace la liste
 * déroulante, qui cachait les autres états possibles.
 */
export function StatutParcours({
  action,
  id,
  etapes,
  courant,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  etapes: { value: string; label: string; ton: TonStatut }[];
  courant: string;
}) {
  return (
    <div data-no-print className="inline-flex rounded-lg bg-muted p-0.5" role="group" aria-label="Statut">
      {etapes.map((e) => {
        const actif = e.value === courant;
        return (
          <form key={e.value} action={action}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="statut" value={e.value} />
            <button
              type="submit"
              aria-pressed={actif}
              disabled={actif}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                actif
                  ? "bg-background font-medium text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={cn("size-1.5 rounded-full", actif ? POINTS[e.ton] : "bg-muted-foreground/40")} aria-hidden />
              {e.label}
            </button>
          </form>
        );
      })}
    </div>
  );
}
