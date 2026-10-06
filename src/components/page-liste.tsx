import Link from "next/link";
import type { ReactNode } from "react";
import { ArchiveIcon, ArrowLeftIcon, PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Largeurs de contenu : liste/tableau, fiche, formulaire de création. */
const LARGEURS = {
  liste: "max-w-[80rem]",
  fiche: "max-w-[80rem]",
  formulaire: "max-w-3xl",
} as const;

export function ConteneurPage({
  largeur = "liste",
  children,
}: {
  largeur?: keyof typeof LARGEURS;
  children: ReactNode;
}) {
  return <div className={cn("mx-auto px-4 py-10 lg:px-8", LARGEURS[largeur])}>{children}</div>;
}

/** Titre de page : titre en police d'affichage, sous-titre, actions à droite. */
export function EntetePage({
  titre,
  sousTitre,
  children,
}: {
  titre: string;
  sousTitre?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-4xl font-semibold tracking-tight">{titre}</h1>
        {sousTitre && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{sousTitre}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** Bouton principal de création : « + Nouvel écart ». */
export function BoutonNouveau({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonVariants({ size: "lg" })}>
      <PlusIcon /> {children}
    </Link>
  );
}

/** Bascule entre la liste de travail et les archives, filtres conservés. */
export function BoutonArchives({
  basePath,
  archives,
  params = {},
}: {
  basePath: string;
  archives?: string;
  params?: Record<string, string | undefined>;
}) {
  const query: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(params)) {
    if (valeur && cle !== "page" && cle !== "archives") query[cle] = valeur;
  }
  if (archives !== "1") query.archives = "1";
  const enArchives = archives === "1";
  return (
    <Link href={{ pathname: basePath, query }} className={buttonVariants({ variant: "ghost", size: "lg" })}>
      {enArchives ? <ArrowLeftIcon /> : <ArchiveIcon />}
      {enArchives ? "Revenir à la liste" : "Archives"}
    </Link>
  );
}

/** Cadre d'un tableau : contour fin, coins arrondis, pied pour la pagination. */
export function CadreTableau({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-xl border bg-card">{children}</div>;
}
