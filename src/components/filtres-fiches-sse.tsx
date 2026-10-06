"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { value: string; label: string };

/**
 * Recherche et filtres de la liste des évènements SSE : même principe que
 * FiltresListe (chaque changement met à jour l'URL, le tri, la taille de page
 * et la vue archives sont conservés, la page repart à 1), avec en plus la
 * période « du … au … » que FiltresListe, limité aux listes déroulantes, ne
 * sait pas porter.
 */
export function FiltresFichesSSE({
  recherche,
  statut,
  type,
  du,
  au,
  statuts,
  types,
  conserves,
}: {
  recherche: string;
  statut: string;
  type: string;
  du: string;
  au: string;
  statuts: Option[];
  types: Option[];
  conserves: Record<string, string | undefined>;
}) {
  const basePath = "/fiches-sse";
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [texte, setTexte] = useState(recherche);
  const [debut, setDebut] = useState(du);
  const [fin, setFin] = useState(au);
  const sauterProchainEffet = useRef(false);

  function naviguer(changements: Record<string, string>) {
    const params = new URLSearchParams();
    for (const [cle, valeur] of Object.entries(conserves)) if (valeur) params.set(cle, valeur);
    const courants: Record<string, string> = { q: texte, statut, type, du: debut, au: fin, ...changements };
    for (const [cle, valeur] of Object.entries(courants)) if (valeur) params.set(cle, valeur);
    const qs = params.toString();
    demarrer(() => router.push(qs ? `${basePath}?${qs}` : basePath));
  }

  // La saisie de texte et de date attend une courte pause : le champ date natif
  // renvoie une valeur valide dès le premier chiffre de l'année (« 0002-… »),
  // ce qui déclencherait une navigation à chaque frappe.
  useEffect(() => {
    if (sauterProchainEffet.current) {
      sauterProchainEffet.current = false;
      return;
    }
    // Rien à reporter dans l'URL : au montage, ou quand la saisie vient de
    // rejoindre ce que l'URL contient déjà.
    if (texte === recherche && debut === du && fin === au) return;
    const minuteur = setTimeout(() => naviguer({}), 450);
    return () => clearTimeout(minuteur);
    // naviguer est recréée à chaque rendu : seules les saisies doivent relancer la pause.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texte, debut, fin]);

  const actif = !!recherche || !!statut || !!type || !!du || !!au;

  const listes = [
    { name: "statut", valeur: statut, options: statuts },
    { name: "type", valeur: type, options: types },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={enCours}>
      <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Rechercher un évènement, un chantier, un émetteur…"
          className="h-9 pl-8"
        />
      </div>
      {listes.map((f) => (
        <Select
          key={`${f.name}-${f.valeur}`}
          value={f.valeur}
          items={f.options}
          onValueChange={(v) => naviguer({ [f.name]: v ?? "" })}
        >
          <SelectTrigger size="default" className="h-9 min-w-40 max-w-64" aria-label={f.options[0]?.label}>
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
      <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
        Du
        <Input
          type="date"
          value={debut}
          onChange={(e) => setDebut(e.target.value)}
          className="h-9 w-auto"
        />
      </label>
      <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
        au
        <Input
          type="date"
          value={fin}
          onChange={(e) => setFin(e.target.value)}
          className="h-9 w-auto"
        />
      </label>
      {actif && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Vider les saisies relancerait sinon une navigation avec les anciens
            // filtres, qui annulerait la réinitialisation.
            if (texte || debut || fin) sauterProchainEffet.current = true;
            setTexte("");
            setDebut("");
            setFin("");
            router.push(basePath);
          }}
        >
          <XIcon /> Réinitialiser
        </Button>
      )}
    </div>
  );
}
