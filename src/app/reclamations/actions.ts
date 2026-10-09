"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { auth } from "@/auth";
import { TypeActivite, TypeReclamation } from "@/generated/prisma/enums";
import { nomAuteur } from "@/lib/audit";
import { lireStatutReclamation, dateObligatoire, dateFacultative } from "@/lib/validation";
import { calculerCriticite } from "@/lib/labels";
import { recalculerStatutReclamation } from "@/lib/statut-auto";
import { supprimerReclamationCascade } from "@/lib/suppression";
import { texte } from "@/lib/formulaire";

const reclamationSchema = z.object({
  type: z.enum(Object.values(TypeReclamation) as [string, ...string[]]),
  dateReception: dateObligatoire,
  emetteur: z.string().min(1, "Émetteur requis"),
  canal: z.string().nullable(),
  chantier: z.string().nullable(),
  typeActivite: z.enum(Object.values(TypeActivite) as [string, ...string[]]).nullable(),
  objet: z.string().min(1, "Objet requis"),
  description: z.string().nullable(),
  analyse: z.string().nullable(),
  reponse: z.string().nullable(),
  dateReponse: dateFacultative,
  enregistrement: z.string().nullable(),
  enregistrementNom: z.string().nullable(),
});

function lireFormulaire(formData: FormData) {
  const parsed = reclamationSchema.parse({
    type: formData.get("type"),
    dateReception: formData.get("dateReception"),
    emetteur: texte(formData.get("emetteur")) ?? "",
    canal: texte(formData.get("canal")),
    chantier: texte(formData.get("chantier")),
    typeActivite: texte(formData.get("typeActivite")),
    objet: texte(formData.get("objet")) ?? "",
    description: texte(formData.get("description")),
    analyse: texte(formData.get("analyse")),
    reponse: texte(formData.get("reponse")),
    dateReponse: texte(formData.get("dateReponse")) ?? undefined,
    enregistrement: texte(formData.get("enregistrement")),
    enregistrementNom: texte(formData.get("enregistrementNom")),
  });

  // Les points arrivent en colonnes parallèles, dans l'ordre du formulaire :
  // la n-ième description va avec la n-ième gravité. Un point sans
  // description est une ligne laissée vide, pas un point.
  const descriptions = formData.getAll("pointDescription").map(String);
  const gravites = formData.getAll("pointGravite").map(String);
  const frequences = formData.getAll("pointFrequence").map(String);
  const causes = formData.getAll("pointCause").map(String);
  const points = descriptions
    .map((d, i) => ({
      description: d.trim(),
      gravite: gravites[i] || null,
      frequence: frequences[i] || null,
      // Recalculée ici plutôt que reçue : elle reste cohérente avec gravité ×
      // fréquence, quoi qu'envoie le client.
      criticite: calculerCriticite(gravites[i] ?? "", frequences[i] ?? "") || null,
      cause: causes[i]?.trim() || null,
    }))
    .filter((p) => p.description)
    .map((p, i) => ({ ...p, ordre: i + 1 }));

  return {
    donnees: {
      type: parsed.type as TypeReclamation,
      dateReception: new Date(parsed.dateReception),
      emetteur: parsed.emetteur,
      canal: parsed.canal,
      chantier: parsed.chantier,
      typeActivite: parsed.typeActivite as TypeActivite | null,
      objet: parsed.objet,
      description: parsed.description,
      domaines: formData.getAll("domaines").map(String),
      theme: formData.getAll("theme").map(String),
      analyse: parsed.analyse,
      reponse: parsed.reponse,
      dateReponse: parsed.dateReponse ? new Date(parsed.dateReponse) : null,
      enregistrement: parsed.enregistrement,
      enregistrementNom: parsed.enregistrementNom,
    },
    points,
  };
}

export async function creerReclamation(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const { donnees, points } = lireFormulaire(formData);
  const reference = await generateReference("Reclamation", "RC");

  const reclamation = await prisma.reclamation.create({
    data: {
      reference,
      ...donnees,
      // Donnée d'audit : vient de la session, jamais du formulaire.
      personneSaisie: nomAuteur(session),
      points: { create: points },
    },
  });

  revalidatePath("/reclamations");
  redirect(`/reclamations/${reclamation.id}`);
}

export async function mettreAJourReclamation(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const { donnees, points } = lireFormulaire(formData);

  // Les points sont remplacés d'un bloc : le formulaire les renvoie tous, dans
  // leur nouvel ordre, et aucune autre table ne pointe vers eux.
  await prisma.$transaction([
    prisma.reclamationPoint.deleteMany({ where: { reclamationId: id } }),
    prisma.reclamation.update({
      where: { id },
      data: {
        ...donnees,
        points: { create: points },
        modifiePar: nomAuteur(session),
        modifieLe: new Date(),
      },
    }),
  ]);

  // Une date de réponse peut suffire à clore une réclamation dont les actions
  // sont soldées.
  await recalculerStatutReclamation(id);
  revalidatePath(`/reclamations/${id}`);
  revalidatePath("/reclamations");
}

export async function mettreAJourStatutReclamation(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const statut = lireStatutReclamation(formData.get("statut"));

  await prisma.reclamation.update({ where: { id }, data: { statut } });
  revalidatePath(`/reclamations/${id}`);
  revalidatePath("/reclamations");
}

export async function supprimerReclamation(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  await supprimerReclamationCascade(id);

  revalidatePath("/reclamations");
  redirect("/reclamations");
}
