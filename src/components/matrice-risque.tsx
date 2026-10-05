import { calculerCriticite } from "@/lib/labels";
import { cn } from "@/lib/utils";

const NIVEAUX = ["1", "2", "3", "4"];

const FOND: Record<string, string> = {
  Faible: "bg-emerald-500/15",
  Moyenne: "bg-amber-500/20",
  Élevée: "bg-red-500/20",
};
const PLEIN: Record<string, string> = {
  Faible: "bg-emerald-600 text-white",
  Moyenne: "bg-amber-500 text-white",
  Élevée: "bg-red-600 text-white",
};

/**
 * Grille gravité × fréquence : la case de l'écart est pleine, les autres
 * montrent d'un coup d'œil quelle criticité chaque combinaison donnerait.
 */
export function MatriceRisque({ gravite, frequence }: { gravite?: string | null; frequence?: string | null }) {
  return (
    <div>
      <div className="flex gap-2">
        <div className="flex w-5 items-center justify-center">
          <span className="-rotate-90 whitespace-nowrap text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Gravité
          </span>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-4 gap-1">
            {[...NIVEAUX].reverse().map((g) =>
              NIVEAUX.map((f) => {
                const criticite = calculerCriticite(g, f);
                const choisie = g === gravite && f === frequence;
                return (
                  <div
                    key={`${g}-${f}`}
                    title={`Gravité ${g}, fréquence ${f} : ${criticite || "—"}`}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-[5px] text-xs font-semibold tabular-nums",
                      choisie ? PLEIN[criticite] ?? "bg-foreground text-background" : FOND[criticite] ?? "bg-muted",
                      choisie && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
                    )}
                  >
                    {choisie ? "●" : ""}
                  </div>
                );
              }),
            )}
          </div>
          <div className="mt-1.5 grid grid-cols-4 gap-1 text-center text-[11px] tabular-nums text-muted-foreground">
            {NIVEAUX.map((f) => (
              <span key={f}>{f}</span>
            ))}
          </div>
          <p className="mt-1 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Fréquence
          </p>
        </div>
      </div>
    </div>
  );
}
