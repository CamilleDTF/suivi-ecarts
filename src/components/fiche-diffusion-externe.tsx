"use client";

import { useRef, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { DownloadIcon, ExternalLinkIcon, FileTextIcon, PaperclipIcon, Trash2Icon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { joindreFicheDiffusion, retirerFicheDiffusion } from "@/app/rex/actions";
import { documentVersDataUrl, imageVersDataUrl } from "@/components/champ-fichier";
import { dateParis } from "@/lib/date-paris";
import {
  ACCEPT_FICHE_EXTERNE,
  FORMATS_FICHE_EXTERNE,
  TAILLE_MAX_FICHE_EXTERNE,
  formaterTaille,
  typeParExtension,
} from "@/lib/fiche-externe";

export type FicheExterne = { nom: string; taille: number; ajoutePar: string | null; ajouteLe: string };

const estRedirection = (e: unknown) =>
  !!e && typeof e === "object" && "digest" in e && String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");

/**
 * Fiche de diffusion apportée par l'utilisateur : un document externe joint au REX, en plus de la
 * fiche générée. Le fichier part tel quel (une image est réduite d'abord) ; il est servi ensuite par
 * /rex/[id]/fiche-externe, jamais embarqué dans la page.
 */
export function FicheDiffusionExterne({ rexId, fiche }: { rexId: string; fiche: FicheExterne | null }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [preparation, setPreparation] = useState(false);
  const [erreur, setErreur] = useState("");
  const champ = useRef<HTMLInputElement>(null);
  const occupe = preparation || enCours;

  async function choisir(e: ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    // Sans ça, resélectionner le même fichier après une erreur ne déclenche rien.
    e.target.value = "";
    if (!fichier) return;
    setErreur("");

    const type = typeParExtension(fichier.name) ?? fichier.type;
    const estImage = type.startsWith("image/");
    if (!estImage && fichier.size > TAILLE_MAX_FICHE_EXTERNE) {
      setErreur(
        `Fichier trop lourd (${formaterTaille(fichier.size)}). Maximum ${formaterTaille(TAILLE_MAX_FICHE_EXTERNE)} : ` +
          "enregistre-le dans une qualité plus basse, ou en PDF.",
      );
      return;
    }

    setPreparation(true);
    let nom = fichier.name;
    let contenu: string;
    try {
      if (estImage) {
        contenu = await imageVersDataUrl(fichier);
        nom = `${nom.replace(/\.[^.]+$/, "")}.jpg`;
      } else {
        const brut = await documentVersDataUrl(fichier);
        // Le navigateur ne donne pas toujours le type (« .docx » arrive parfois sans) : on le pose d'après l'extension.
        contenu = `data:${type};base64,${brut.slice(brut.indexOf(",") + 1)}`;
      }
    } catch {
      setErreur(estImage ? "Photo illisible par le navigateur. Réessaie avec un JPEG ou un PNG." : "Fichier illisible par le navigateur.");
      return;
    } finally {
      setPreparation(false);
    }

    demarrer(async () => {
      try {
        const resultat = await joindreFicheDiffusion({ rexId, nom, contenu });
        if (resultat.erreur) setErreur(resultat.erreur);
        else router.refresh();
      } catch (err) {
        if (estRedirection(err)) throw err;
        setErreur("Impossible d'enregistrer le document. Réessaie.");
      }
    });
  }

  function retirer() {
    if (!window.confirm("Retirer ce document de la fiche de diffusion ? Le fichier sera supprimé.")) return;
    setErreur("");
    demarrer(async () => {
      try {
        await retirerFicheDiffusion(rexId);
        router.refresh();
      } catch (err) {
        if (estRedirection(err)) throw err;
        setErreur("Impossible de retirer le document. Réessaie.");
      }
    });
  }

  const lien = `/rex/${rexId}/fiche-externe`;

  return (
    <section data-no-print className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">Votre propre fiche de diffusion</h3>
      <p className="mb-3 mt-1 text-sm text-slate-600">
        Joignez un document que vous avez préparé ({FORMATS_FICHE_EXTERNE}, {formaterTaille(TAILLE_MAX_FICHE_EXTERNE)} maximum). Il reste
        disponible depuis la fiche du REX, en plus de la fiche générée ci-dessous.
      </p>

      {fiche && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <FileTextIcon className="size-5 shrink-0 text-slate-500" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{fiche.nom}</p>
            <p className="text-xs text-slate-500">
              {formaterTaille(fiche.taille)} · ajouté{fiche.ajoutePar ? ` par ${fiche.ajoutePar}` : ""} le {dateParis(new Date(fiche.ajouteLe))}
            </p>
          </div>
          <a href={lien} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ExternalLinkIcon /> Ouvrir
          </a>
          <a href={`${lien}?telecharger=1`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <DownloadIcon /> Télécharger
          </a>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input ref={champ} type="file" accept={ACCEPT_FICHE_EXTERNE} onChange={choisir} className="hidden" />
        <Button type="button" variant={fiche ? "outline" : "default"} disabled={occupe} onClick={() => champ.current?.click()}>
          <PaperclipIcon /> {fiche ? "Remplacer le document" : "Joindre mon document"}
        </Button>
        {fiche && (
          <Button type="button" variant="ghost" disabled={occupe} onClick={retirer}>
            <Trash2Icon /> Retirer
          </Button>
        )}
        {preparation && <span className="text-sm text-slate-500">Préparation du fichier…</span>}
        {enCours && <span className="text-sm text-slate-500">Enregistrement…</span>}
      </div>

      {erreur && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {erreur}
        </p>
      )}
    </section>
  );
}
