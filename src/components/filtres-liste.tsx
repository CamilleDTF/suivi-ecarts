"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type FiltreListe = {
  name: string;
  valeur: string;
  options: { value: string; label: string }[];
};

/**
 * Recherche et filtres d'une liste. Chaque changement met à jour l'URL (la
 * page serveur relit alors ses searchParams) ; la recherche attend une courte
 * pause de frappe. Les paramètres de tri, de taille de page et d'archives sont
 * conservés, la page repart à 1.
 */
export function FiltresListe({
  basePath,
  placeholder,
  recherche,
  filtres,
  conserves,
}: {
  basePath: string;
  placeholder: string;
  recherche: string;
  filtres: FiltreListe[];
  conserves: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [texte, setTexte] = useState(recherche);
  const premiereFrappe = useRef(true);

  function naviguer(changements: Record<string, string>) {
    const params = new URLSearchParams();
    for (const [cle, valeur] of Object.entries(conserves)) if (valeur) params.set(cle, valeur);
    const courants: Record<string, string> = {
      q: texte,
      ...Object.fromEntries(filtres.map((f) => [f.name, f.valeur])),
      ...changements,
    };
    for (const [cle, valeur] of Object.entries(courants)) if (valeur) params.set(cle, valeur);
    const qs = params.toString();
    demarrer(() => router.push(qs ? `${basePath}?${qs}` : basePath));
  }

  useEffect(() => {
    if (premiereFrappe.current) {
      premiereFrappe.current = false;
      return;
    }
    const minuteur = setTimeout(() => naviguer({ q: texte }), 350);
    return () => clearTimeout(minuteur);
    // naviguer est recréée à chaque rendu : seule la frappe doit relancer la pause.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texte]);

  const actif = !!recherche || filtres.some((f) => f.valeur);

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={enCours}>
      <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder={placeholder}
          className="h-9 pl-8"
        />
      </div>
      {filtres.map((f) => (
        <Select
          key={`${f.name}-${f.valeur}`}
          value={f.valeur}
          items={f.options}
          onValueChange={(v) => naviguer({ [f.name]: v ?? "" })}
        >
          <SelectTrigger size="default" className="h-9 min-w-40" aria-label={f.options[0]?.label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {f.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {actif && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setTexte("");
            router.push(basePath);
          }}
        >
          <XIcon /> Réinitialiser
        </Button>
      )}
    </div>
  );
}
