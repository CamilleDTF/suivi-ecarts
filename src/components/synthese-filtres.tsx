"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERIODES } from "@/lib/synthese-periodes";

/** Période (liens) et chantier (liste) : tout passe par l'URL, la page serveur relit ses paramètres. */
export function SyntheseFiltres({
  periode,
  dossier,
  dossiers,
}: {
  periode: string;
  dossier: string;
  dossiers: { id: string; libelle: string }[];
}) {
  const router = useRouter();
  const options = [{ value: "", label: "Tous les chantiers" }, ...dossiers.map((d) => ({ value: d.id, label: d.libelle }))];

  function lien(p: string) {
    const params = new URLSearchParams();
    if (p !== "12m") params.set("periode", p);
    if (dossier) params.set("dossier", dossier);
    const qs = params.toString();
    return qs ? `/synthese?${qs}` : "/synthese";
  }

  function changerDossier(valeur: string | null) {
    const params = new URLSearchParams();
    if (periode !== "12m") params.set("periode", periode);
    if (valeur) params.set("dossier", valeur);
    const qs = params.toString();
    router.push(qs ? `/synthese?${qs}` : "/synthese");
  }

  return (
    <div data-no-print className="flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-lg bg-muted p-0.5" role="group" aria-label="Période">
        {PERIODES.map((p) => (
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
      <Select value={dossier} items={options} onValueChange={changerDossier}>
        <SelectTrigger className="h-9 min-w-52 max-w-72" aria-label="Chantier">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
