import { z } from "zod";
import {
  StatutAction,
  StatutDossierEcart,
  StatutFiche,
  StatutRemontee,
} from "@/generated/prisma/enums";

// Un `as StatutAction` ne vérifie rien à l'exécution : une valeur absente de
// l'enum passe le compilateur puis fait planter Prisma en page 500. Ces schémas
// valident réellement ce qui arrive d'un formulaire ou d'une URL.
function schemaEnum<T extends Record<string, string>>(valeurs: T) {
  return z.enum(Object.values(valeurs) as [string, ...string[]]);
}

export const statutDossierEcartSchema = schemaEnum(StatutDossierEcart);
export const statutActionSchema = schemaEnum(StatutAction);
export const statutFicheSchema = schemaEnum(StatutFiche);
export const statutRemonteeSchema = schemaEnum(StatutRemontee);

/** Valide une valeur de formulaire, en levant une erreur si elle est invalide. */
export function lireStatutDossierEcart(v: FormDataEntryValue | null): StatutDossierEcart {
  return statutDossierEcartSchema.parse(String(v ?? "")) as StatutDossierEcart;
}

export function lireStatutAction(v: FormDataEntryValue | null): StatutAction {
  return statutActionSchema.parse(String(v ?? "")) as StatutAction;
}

export function lireStatutRemontee(v: FormDataEntryValue | null): StatutRemontee {
  return statutRemonteeSchema.parse(String(v ?? "")) as StatutRemontee;
}

export function filtreStatutRemontee(v: string | undefined): StatutRemontee | undefined {
  if (!v) return undefined;
  const r = statutRemonteeSchema.safeParse(v);
  return r.success ? (r.data as StatutRemontee) : undefined;
}

/**
 * Valide un paramètre d'URL optionnel (filtre de liste). Contrairement aux
 * champs de formulaire, une valeur invalide dans une URL bricolée ne doit pas
 * casser la page : on l'ignore et on retourne undefined, ce qui revient à ne
 * pas filtrer.
 */
export function filtreStatutAction(v: string | undefined): StatutAction | undefined {
  if (!v) return undefined;
  const r = statutActionSchema.safeParse(v);
  return r.success ? (r.data as StatutAction) : undefined;
}

export function filtreStatutDossierEcart(v: string | undefined): StatutDossierEcart | undefined {
  if (!v) return undefined;
  const r = statutDossierEcartSchema.safeParse(v);
  return r.success ? (r.data as StatutDossierEcart) : undefined;
}
