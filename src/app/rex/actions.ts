"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { auth } from "@/auth";
import { OrigineREX, StatutREX, StatutAction, StatutLectureREX } from "@/generated/prisma/enums";
import { nomAuteur } from "@/lib/audit";
import { texte } from "@/lib/formulaire";

const rexSchema = z
  .object({
    ecartIds: z.array(z.string()).default([]),
    ficheSSEId: z.string().optional(),
    ecartAmianteId: z.string().optional(),
    remonteeId: z.string().optional(),
    titre: z.string().min(1, "Titre requis"),
    sousTypeSSE: z.string().optional(),
    causeRacine: z.string().optional(),
    enseignementsTires: z.string().optional(),
    canalDiffusion: z.string().optional(),
  })
  // Un seul type de rattachement à la fois, comme pour Action : ça évite
  // toute ambiguïté sur l'origine, qui en est directement déduite.
  .refine(
    (v) =>
      [v.ecartIds.length > 0, !!v.ficheSSEId, !!v.ecartAmianteId, !!v.remonteeId].filter(Boolean)
        .length === 1,
    {
      message:
        "Un REX doit être rattaché soit à un ou plusieurs écarts, soit à un évènement SSE, soit à un écart amiante, soit à une remontée",
    },
  );

function deduireOrigine(parsed: { ecartIds: string[]; ficheSSEId?: string; ecartAmianteId?: string }): OrigineREX {
  if (parsed.ecartIds.length > 0) return "ECART_TERRAIN";
  if (parsed.ficheSSEId) return "EVENEMENT_SSE";
  if (parsed.ecartAmianteId) return "ECART_AMIANTE";
  return "REMONTEE";
}

function cheminsParents(p: { ecartIds: string[]; ficheSSEId?: string | null; ecartAmianteId?: string | null; remonteeId?: string | null }) {
  return [
    ...p.ecartIds.map((id) => `/ecarts/${id}`),
    p.ficheSSEId && `/fiches-sse/${p.ficheSSEId}`,
    p.ecartAmianteId && `/ecart-amiante/${p.ecartAmianteId}`,
    p.remonteeId && `/remontees/${p.remonteeId}`,
  ].filter((c): c is string => !!c);
}

export async function creerRex(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const parsed = rexSchema.parse({
    ecartIds: formData.getAll("ecartIds").map(String).filter(Boolean),
    ficheSSEId: formData.get("ficheSSEId") || undefined,
    ecartAmianteId: formData.get("ecartAmianteId") || undefined,
    remonteeId: formData.get("remonteeId") || undefined,
    titre: formData.get("titre"),
    sousTypeSSE: formData.get("sousTypeSSE") || undefined,
    causeRacine: formData.get("causeRacine") || undefined,
    enseignementsTires: formData.get("enseignementsTires") || undefined,
    canalDiffusion: formData.get("canalDiffusion") || undefined,
  });

  const reference = await generateReference("Rex", "REX");
  const origine = deduireOrigine(parsed);

  const rex = await prisma.rex.create({
    data: {
      reference,
      titre: parsed.titre,
      origine,
      // Le sous-type n'a de sens que pour un évènement SSE : on ne le
      // conserve pas si le rattachement retenu est un autre type.
      sousTypeSSE: origine === "EVENEMENT_SSE" ? parsed.sousTypeSSE : undefined,
      causeRacine: parsed.causeRacine,
      enseignementsTires: parsed.enseignementsTires,
      canalDiffusion: parsed.canalDiffusion,
      ecarts: { connect: parsed.ecartIds.map((id) => ({ id })) },
      ficheSSEId: parsed.ficheSSEId,
      ecartAmianteId: parsed.ecartAmianteId,
      remonteeId: parsed.remonteeId,
    },
  });

  for (const chemin of cheminsParents(parsed)) revalidatePath(chemin);
  revalidatePath("/rex");
  redirect(`/rex/${rex.id}`);
}

const rexEditSchema = z.object({
  titre: z.string().min(1, "Titre requis"),
  sousTypeSSE: z.string().optional(),
  causeRacine: z.string().optional(),
  enseignementsTires: z.string().optional(),
  canalDiffusion: z.string().optional(),
});

export async function mettreAJourRex(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const parsed = rexEditSchema.parse({
    titre: formData.get("titre"),
    sousTypeSSE: formData.get("sousTypeSSE") || undefined,
    causeRacine: formData.get("causeRacine") || undefined,
    enseignementsTires: formData.get("enseignementsTires") || undefined,
    canalDiffusion: formData.get("canalDiffusion") || undefined,
  });

  await prisma.rex.update({
    where: { id },
    data: {
      titre: parsed.titre,
      sousTypeSSE: parsed.sousTypeSSE ?? null,
      causeRacine: parsed.causeRacine ?? null,
      enseignementsTires: parsed.enseignementsTires ?? null,
      canalDiffusion: parsed.canalDiffusion ?? null,
      modifiePar: nomAuteur(session),
      modifieLe: new Date(),
    },
  });

  revalidatePath(`/rex/${id}`);
  revalidatePath("/rex");
}

export async function changerStatutRex(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const statut = z.enum(Object.values(StatutREX) as [string, ...string[]]).parse(formData.get("statut")) as StatutREX;

  const actuel = await prisma.rex.findUniqueOrThrow({
    where: { id },
    select: { dateDiffusion: true, dateVerificationEfficacite: true },
  });

  await prisma.rex.update({
    where: { id },
    data: {
      statut,
      // La date se pose la première fois qu'on atteint l'étape, jamais
      // écrasée par un aller-retour du stepper.
      dateDiffusion: statut !== "REDIGE" && !actuel.dateDiffusion ? new Date() : undefined,
      dateVerificationEfficacite:
        statut === "EFFICACITE_VERIFIEE" && !actuel.dateVerificationEfficacite ? new Date() : undefined,
      modifiePar: nomAuteur(session),
      modifieLe: new Date(),
    },
  });

  revalidatePath(`/rex/${id}`);
  revalidatePath("/rex");
}

export async function supprimerRex(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const avant = await prisma.rex.findUniqueOrThrow({
    where: { id },
    select: {
      ecarts: { select: { id: true } },
      ficheSSEId: true,
      ecartAmianteId: true,
      remonteeId: true,
    },
  });

  await prisma.$transaction([
    prisma.actionRex.deleteMany({ where: { rexId: id } }),
    prisma.rexDiffusion.deleteMany({ where: { rexId: id } }),
    prisma.rex.delete({ where: { id } }),
  ]);

  for (const chemin of cheminsParents({ ecartIds: avant.ecarts.map((e) => e.id), ...avant })) {
    revalidatePath(chemin);
  }
  revalidatePath("/rex");
  redirect("/rex");
}

// Actions préventives du REX.

const actionRexSchema = z.object({
  action: z.string().min(1, "Description requise"),
  responsable: z.string().min(1, "Responsable requis"),
  echeance: z.string().optional(),
});

export async function creerActionRex(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const rexId = String(formData.get("rexId"));
  const parsed = actionRexSchema.parse({
    action: formData.get("action"),
    responsable: formData.get("responsable"),
    echeance: formData.get("echeance") || undefined,
  });

  await prisma.actionRex.create({
    data: {
      rexId,
      action: parsed.action,
      responsable: parsed.responsable,
      echeance: parsed.echeance ? new Date(parsed.echeance) : undefined,
    },
  });

  revalidatePath(`/rex/${rexId}`);
}

export async function mettreAJourStatutActionRex(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const rexId = String(formData.get("rexId"));
  const statut = z.enum(Object.values(StatutAction) as [string, ...string[]]).parse(formData.get("statut")) as StatutAction;

  await prisma.actionRex.update({
    where: { id },
    data: {
      statut,
      // Une action marquée réalisée sans date déjà posée se voit attribuer
      // celle du jour : la date de réalisation vaut déclaration, comme sur le
      // plan d'action.
      realiseeLe: statut === "REALISEE" ? new Date() : undefined,
    },
  });

  revalidatePath(`/rex/${rexId}`);
}

// Diffusion nominative.

const diffusionSchema = z.object({
  destinataire: z.string().min(1, "Destinataire requis"),
  chantier: z.string().optional(),
});

export async function ajouterDestinataireDiffusion(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const rexId = String(formData.get("rexId"));
  const parsed = diffusionSchema.parse({
    destinataire: formData.get("destinataire"),
    chantier: texte(formData.get("chantier")),
  });

  await prisma.rexDiffusion.create({
    data: { rexId, destinataire: parsed.destinataire, chantier: parsed.chantier },
  });

  // Un premier destinataire vaut diffusion : le statut avance de lui-même,
  // comme une date de réalisation fait passer une action à « Réalisée ».
  const rex = await prisma.rex.findUniqueOrThrow({ where: { id: rexId }, select: { statut: true, dateDiffusion: true } });
  if (rex.statut === "REDIGE") {
    await prisma.rex.update({
      where: { id: rexId },
      data: { statut: "DIFFUSE", dateDiffusion: rex.dateDiffusion ?? new Date() },
    });
  }

  revalidatePath(`/rex/${rexId}`);
}

export async function marquerDiffusionLue(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const rexId = String(formData.get("rexId"));

  await prisma.rexDiffusion.update({
    where: { id },
    data: { statutLecture: "LU" as StatutLectureREX, dateLecture: new Date() },
  });

  revalidatePath(`/rex/${rexId}`);
}
