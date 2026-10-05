import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONS = {
  neutre: "bg-slate-400",
  ambre: "bg-amber-500",
  bleu: "bg-blue-500",
  vert: "bg-emerald-500",
  rouge: "bg-red-500",
  violet: "bg-violet-500",
} as const;

export type TonStatut = keyof typeof TONS;

/** Statut d'un enregistrement : pastille de couleur + libellé, sur fond neutre. */
export function BadgeStatut({ label, ton = "neutre" }: { label: string; ton?: TonStatut }) {
  return (
    <Badge variant="outline" className="h-6 gap-1.5 px-2.5 font-normal text-foreground">
      <span className={cn("size-1.5 rounded-full", TONS[ton])} aria-hidden />
      {label}
    </Badge>
  );
}
