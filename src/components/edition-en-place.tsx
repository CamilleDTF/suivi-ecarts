"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOccupe, ZoneTraitement } from "@/components/formulaire-editable";

/**
 * Édition d'une fiche sur la page elle-même, sans panneau ni fenêtre.
 *
 * Le fournisseur enveloppe la page. « Modifier » (BoutonModifier) fait passer la page en
 * mode édition : la zone de lecture (ZoneLecture) laisse la place au formulaire
 * (ZoneEdition), au même endroit, avec Annuler et Enregistrer. L'en-tête, le parcours
 * et le statut restent en place. À l'enregistrement, ou à l'annulation, la fiche
 * redevient une page de lecture.
 */
type Etat = {
  edition: boolean;
  ouvrir: () => void;
  fermer: () => void;
  termine: () => void;
};

const EtatContext = createContext<Etat | null>(null);

function useEtat(): Etat {
  const etat = useContext(EtatContext);
  if (!etat) throw new Error("À utiliser dans <EditionEnPlace>.");
  return etat;
}

export function EditionEnPlace({ children }: { children: ReactNode }) {
  const [edition, setEdition] = useState(false);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const minuteur = setTimeout(() => setToast(false), 3000);
    return () => clearTimeout(minuteur);
  }, [toast]);

  const ouvrir = useCallback(() => setEdition(true), []);
  const fermer = useCallback(() => setEdition(false), []);
  const termine = useCallback(() => {
    setEdition(false);
    setToast(true);
  }, []);
  const etat = useMemo(() => ({ edition, ouvrir, fermer, termine }), [edition, ouvrir, fermer, termine]);

  return (
    <EtatContext.Provider value={etat}>
      {children}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg">
          Modifications enregistrées
        </div>
      )}
    </EtatContext.Provider>
  );
}

/** Le bouton de l'en-tête : passe la fiche en édition. */
export function BoutonModifier() {
  const { edition, ouvrir } = useEtat();
  return (
    <Button type="button" variant="outline" size="lg" onClick={ouvrir} disabled={edition}>
      <PencilIcon /> Modifier
    </Button>
  );
}

/** Ce qui se lit : visible tant qu'on ne modifie pas. */
export function ZoneLecture({ children }: { children: ReactNode }) {
  const { edition } = useEtat();
  return edition ? null : <>{children}</>;
}

// Doit être un enfant du <form> pour lire useFormStatus. La fin d'une soumission
// (pending: true -> false) referme l'édition.
function Enregistrer({ onDone }: { onDone: () => void }) {
  const { pending } = useFormStatus();
  // Un champ pas encore prêt (une photo en cours de conversion) retient
  // l'enregistrement : sans cela, on enregistrerait la fiche sans elle.
  const occupe = useOccupe();
  const etaitEnCours = useRef(false);

  useEffect(() => {
    if (etaitEnCours.current && !pending) onDone();
    etaitEnCours.current = pending;
  }, [pending, onDone]);

  return (
    <Button type="submit" size="lg" disabled={pending || occupe}>
      {pending ? "Enregistrement…" : "Enregistrer"}
    </Button>
  );
}

/** Le formulaire, à la place de la zone de lecture. Les champs repartent des valeurs enregistrées à chaque ouverture. */
export function ZoneEdition({
  titre,
  description,
  action,
  hiddenFields,
  children,
}: {
  titre: string;
  description?: string;
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string>;
  children: ReactNode;
}) {
  const { edition, fermer, termine } = useEtat();
  const zone = useRef<HTMLElement>(null);

  // La fiche peut être longue : on amène le formulaire à l'écran à l'ouverture.
  useEffect(() => {
    if (edition) zone.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [edition]);

  if (!edition) return null;

  return (
    <section ref={zone} data-no-print aria-label={titre} className="mb-8 max-w-4xl rounded-xl border bg-card shadow-sm">
      <ZoneTraitement>
        <form action={action}>
          {Object.entries(hiddenFields).map(([nom, valeur]) => (
            <input key={nom} type="hidden" name={nom} value={valeur} />
          ))}
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold">{titre}</h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          <div className="px-6 py-5">{children}</div>
          <div className="sticky bottom-0 flex justify-end gap-2 rounded-b-xl border-t bg-card px-6 py-4">
            <Button type="button" variant="outline" size="lg" onClick={fermer}>
              Annuler
            </Button>
            <Enregistrer onDone={termine} />
          </div>
        </form>
      </ZoneTraitement>
    </section>
  );
}
