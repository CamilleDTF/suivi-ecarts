"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ENTITES_ARCHIVABLES, type EntiteArchivable } from "@/lib/archivage";

const CHEMINS: Record<EntiteArchivable, string> = {
  dossier: "/dossiers",
  ecart: "/ecarts",
  ficheSSE: "/fiches-sse",
  ecartAmiante: "/ecart-amiante",
  action: "/plan-action",
  remontee: "/remontees",
};

function lireEntite(valeur: FormDataEntryValue | null): EntiteArchivable {
  const nom = String(valeur ?? "");
  if (!(nom in ENTITES_ARCHIVABLES)) throw new Error(`Type inconnu : ${nom}`);
  return nom as EntiteArchivable;
}

/** Retire l'enregistrement des listes de travail sans le détruire. */
export async function archiver(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const entite = lireEntite(formData.get("entite"));
  const id = String(formData.get("id"));

  // @ts-expect-error — les six délégués partagent ce champ, mais leur union
  // n'expose pas de signature commune côté types.
  await ENTITES_ARCHIVABLES[entite].update({ where: { id }, data: { archiveLe: new Date() } });

  revalidatePath(CHEMINS[entite]);
  revalidatePath(`${CHEMINS[entite]}/${id}`);
  redirect(CHEMINS[entite]);
}

export async function desarchiver(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const entite = lireEntite(formData.get("entite"));
  const id = String(formData.get("id"));

  // @ts-expect-error — voir archiver().
  await ENTITES_ARCHIVABLES[entite].update({ where: { id }, data: { archiveLe: null } });

  revalidatePath(CHEMINS[entite]);
  revalidatePath(`${CHEMINS[entite]}/${id}`);
}
