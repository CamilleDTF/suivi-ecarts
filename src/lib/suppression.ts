import { prisma } from "@/lib/prisma";

// Client transactionnel : dérivé du type attendu par $transaction, pour rester
// juste quelle que soit la version de Prisma.
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// Une suppression touche plusieurs tables (causes, actions, fiches, écarts).
// Sans transaction, un échec en cours de route laisserait la base à moitié
// nettoyée : les enfants supprimés, le parent toujours là. Tout passe donc par
// $transaction, qui annule l'ensemble si une seule requête échoue.
const OPTIONS_TX = { timeout: 20000 };

async function ficheSSEDans(tx: TxClient, ficheSSEId: string) {
  // Les causes sont auto-référencées (parentId) : on casse d'abord la
  // hiérarchie, sinon la contrainte de clé étrangère bloque la suppression.
  await tx.causeArbre.updateMany({ where: { ficheSSEId }, data: { parentId: null } });
  await tx.causeArbre.deleteMany({ where: { ficheSSEId } });
  await tx.action.deleteMany({ where: { ficheSSEId } });
  await tx.ficheSSE.delete({ where: { id: ficheSSEId } });
}

async function ecartAmianteDans(tx: TxClient, ecartAmianteId: string) {
  const fiches = await tx.ficheSSE.findMany({ where: { ecartAmianteId }, select: { id: true } });
  for (const f of fiches) await ficheSSEDans(tx, f.id);
  await tx.action.deleteMany({ where: { ecartAmianteId } });
  await tx.ecartAmiante.delete({ where: { id: ecartAmianteId } });
}

async function ecartDans(tx: TxClient, ecartId: string) {
  const fiches = await tx.ficheSSE.findMany({ where: { ecartId }, select: { id: true } });
  for (const f of fiches) await ficheSSEDans(tx, f.id);
  await tx.action.deleteMany({ where: { ecartId } });
  await tx.ecart.delete({ where: { id: ecartId } });
}

export async function supprimerFicheSSECascade(ficheSSEId: string) {
  await prisma.$transaction((tx) => ficheSSEDans(tx, ficheSSEId), OPTIONS_TX);
}

export async function supprimerEcartAmianteCascade(ecartAmianteId: string) {
  await prisma.$transaction((tx) => ecartAmianteDans(tx, ecartAmianteId), OPTIONS_TX);
}

export async function supprimerEcartCascade(ecartId: string) {
  await prisma.$transaction((tx) => ecartDans(tx, ecartId), OPTIONS_TX);
}

export async function supprimerDossierCascade(dossierId: string) {
  await prisma.$transaction(async (tx) => {
    const ecarts = await tx.ecart.findMany({ where: { dossierId }, select: { id: true } });
    for (const e of ecarts) await ecartDans(tx, e.id);
    await tx.dossier.delete({ where: { id: dossierId } });
  }, OPTIONS_TX);
}

// Compte ce qui serait supprimé, pour informer l'utilisateur avant confirmation.
// Les actions rattachées aux évènements SSE comptent aussi : elles disparaissent
// avec eux, même si elles ne sont pas rattachées directement à l'écart.
async function compterActions(ecartIds: string[], ecartAmianteIds: string[], ficheIds: string[]) {
  const conditions = [];
  if (ecartIds.length > 0) conditions.push({ ecartId: { in: ecartIds } });
  if (ecartAmianteIds.length > 0) conditions.push({ ecartAmianteId: { in: ecartAmianteIds } });
  if (ficheIds.length > 0) conditions.push({ ficheSSEId: { in: ficheIds } });
  if (conditions.length === 0) return 0;
  // OR plutôt qu'une somme de comptages : une action rattachée à la fois à
  // l'écart et à sa fiche ne doit être comptée qu'une seule fois.
  return prisma.action.count({ where: { OR: conditions } });
}

export async function compterImpactSuppressionDossier(dossierId: string) {
  const ecarts = await prisma.ecart.findMany({ where: { dossierId }, select: { id: true } });
  const ecartIds = ecarts.map((e) => e.id);
  const fiches = await prisma.ficheSSE.findMany({
    where: { ecartId: { in: ecartIds } },
    select: { id: true },
  });
  const actions = await compterActions(ecartIds, [], fiches.map((f) => f.id));
  return { ecarts: ecarts.length, fiches: fiches.length, actions };
}

export async function compterImpactSuppressionEcart(ecartId: string) {
  const fiches = await prisma.ficheSSE.findMany({ where: { ecartId }, select: { id: true } });
  const actions = await compterActions([ecartId], [], fiches.map((f) => f.id));
  return { fiches: fiches.length, actions };
}

export async function compterImpactSuppressionEcartAmiante(ecartAmianteId: string) {
  const fiches = await prisma.ficheSSE.findMany({ where: { ecartAmianteId }, select: { id: true } });
  const actions = await compterActions([], [ecartAmianteId], fiches.map((f) => f.id));
  return { fiches: fiches.length, actions };
}
