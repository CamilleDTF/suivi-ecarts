"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOccupe, ZoneTraitement } from "@/components/formulaire-editable";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Doit être un enfant du <form> pour lire useFormStatus. La fin d'une
// soumission (pending: true -> false) referme le panneau.
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

/**
 * Édition d'une fiche dans un panneau latéral. La fiche reste une page de
 * lecture ; le formulaire n'apparaît que sur demande, avec ses champs prêts à
 * saisir (pas de cadre grisé à débloquer d'abord).
 */
export function EditionPanneau({
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
  const [ouvert, setOuvert] = useState(false);
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const minuteur = setTimeout(() => setToast(false), 3000);
    return () => clearTimeout(minuteur);
  }, [toast]);

  function termine() {
    setOuvert(false);
    // Remonte les champs pour qu'ils reprennent les valeurs enregistrées.
    setVersion((v) => v + 1);
    setToast(true);
  }

  return (
    <>
      <Sheet open={ouvert} onOpenChange={setOuvert}>
        <SheetTrigger render={<Button variant="outline" size="lg" />}>
          <PencilIcon /> Modifier
        </SheetTrigger>
        <SheetContent className="data-[side=right]:sm:max-w-xl">
          <ZoneTraitement>
          <form action={action} className="flex min-h-0 flex-1 flex-col">
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle className="text-lg">{titre}</SheetTitle>
              {description && <SheetDescription>{description}</SheetDescription>}
            </SheetHeader>
            {Object.entries(hiddenFields).map(([nom, valeur]) => (
              <input key={nom} type="hidden" name={nom} value={valeur} />
            ))}
            <div key={version} className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {children}
            </div>
            <SheetFooter className="flex-row justify-end gap-2 border-t px-6 py-4">
              <SheetClose render={<Button type="button" variant="outline" size="lg" />}>Annuler</SheetClose>
              <Enregistrer onDone={termine} />
            </SheetFooter>
          </form>
          </ZoneTraitement>
        </SheetContent>
      </Sheet>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg">
          Modifications enregistrées
        </div>
      )}
    </>
  );
}
