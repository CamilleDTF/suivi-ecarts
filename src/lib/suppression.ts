import { prisma } from "@/lib/prisma";

export async function supprimerFicheSSECascade(ficheSSEId: string) {
  await prisma.causeArbre.updateMany({ where: { ficheSSEId }, data: { parentId: null } });
  await prisma.causeArbre.deleteMany({ where: { ficheSSEId } });
  await prisma.action.deleteMany({ where: { ficheSSEId } });
  await prisma.ficheSSE.delete({ where: { id: ficheSSEId } });
}

export async function supprimerEcartAmianteCascade(ecartAmianteId: string) {
  const fiches = await prisma.ficheSSE.findMany({ where: { ecartAmianteId }, select: { id: true } });
  for (const f of fiches) await supprimerFicheSSECascade(f.id);
  await prisma.action.deleteMany({ where: { ecartAmianteId } });
  await prisma.ecartAmiante.delete({ where: { id: ecartAmianteId } });
}

export async function supprimerEcartCascade(ecartId: string) {
  const fiches = await prisma.ficheSSE.findMany({ where: { ecartId }, select: { id: true } });
  for (const f of fiches) await supprimerFicheSSECascade(f.id);
  await prisma.action.deleteMany({ where: { ecartId } });
  await prisma.ecart.delete({ where: { id: ecartId } });
}

export async function supprimerDossierCascade(dossierId: string) {
  const ecarts = await prisma.ecart.findMany({ where: { dossierId }, select: { id: true } });
  for (const e of ecarts) await supprimerEcartCascade(e.id);
  await prisma.dossier.delete({ where: { id: dossierId } });
}

// Compte ce qui serait supprimé, pour informer l'utilisateur avant confirmation.
export async function compterImpactSuppressionDossier(dossierId: string) {
  const ecarts = await prisma.ecart.findMany({ where: { dossierId }, select: { id: true } });
  const ecartIds = ecarts.map((e) => e.id);
  const [fiches, actions] = await Promise.all([
    prisma.ficheSSE.count({ where: { ecartId: { in: ecartIds } } }),
    prisma.action.count({ where: { ecartId: { in: ecartIds } } }),
  ]);
  return { ecarts: ecarts.length, fiches, actions };
}

export async function compterImpactSuppressionEcart(ecartId: string) {
  const [fiches, actions] = await Promise.all([
    prisma.ficheSSE.count({ where: { ecartId } }),
    prisma.action.count({ where: { ecartId } }),
  ]);
  return { fiches, actions };
}

export async function compterImpactSuppressionEcartAmiante(ecartAmianteId: string) {
  const [fiches, actions] = await Promise.all([
    prisma.ficheSSE.count({ where: { ecartAmianteId } }),
    prisma.action.count({ where: { ecartAmianteId } }),
  ]);
  return { fiches, actions };
}
