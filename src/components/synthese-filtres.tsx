"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERIODES } from "@/lib/synthese-periodes";

/**
 * Période (liens, ou deux dates en « Personnalisée ») et chantier (liste) : tout passe
 * par l'URL, la page serveur relit ses paramètres. `du` et `au` sont les dates de la
 * période affichée : « Personnalisée » part de ce qu'on regarde déjà.
 */
export function SyntheseFiltres({
  periode,
  du,
  au,
  dossier,
  dossiers,
}: {
  periode: string;
  du: string;
  au: string;
  dossier: string;
  dossiers: { id: string; libelle: string }[];
}) {
  const router = useRouter();
  const options = [{ value: "", label: "Tous les chantiers" }, ...dossiers.map((d) => ({ value: d.id, label: d.libelle }))];

  function adresse(p: string, d: string, debut?: string, fin?: string) {
    const params = new URLSearchParams();
    if (p !== "12m") params.set("periode", p);
    if (p === "perso" && debut && fin) {
      params.set("du", debut);
      params.set("au", fin);
    }
    if (d) params.set("dossier", d);
    const qs = params.toString();
    return qs ? `/synthese?${qs}` : "/synthese";
  }

  function appliquerDates(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const donnees = new FormData(e.currentTarget);
    const debut = String(donnees.get("du") ?? "");
    const fin = String(donnees.get("au") ?? "");
    if (debut && fin) router.push(adresse("perso", dossier, debut, fin));
  }

  return (
    <div data-no-print className="flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-lg bg-muted p-0.5" role="group" aria-label="Période">
        {PERIODES.map((p) => (
          <Link
            key={p.cle}
            href={adresse(p.cle, dossier, du, au)}
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
      {periode === "perso" && (
        <form key={`${du}_${au}`} onSubmit={appliquerDates} className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1.5 text-muted-foreground">
            Du
            <Input type="date" name="du" defaultValue={du} required min="2000-01-01" max="2100-12-31" className="h-9 w-40" />
          </label>
          <label className="flex items-center gap-1.5 text-muted-foreground">
            au
            <Input type="date" name="au" defaultValue={au} required min="2000-01-01" max="2100-12-31" className="h-9 w-40" />
          </label>
          <Button type="submit" size="lg">
            Appliquer
          </Button>
        </form>
      )}
      <Select value={dossier} items={options} onValueChange={(v) => router.push(adresse(periode, v ?? "", du, au))}>
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
