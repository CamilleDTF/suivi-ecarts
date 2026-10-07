import type { Prisma } from "@/generated/prisma/client";

/**
 * Ordre d'affichage des actions : curative, corrective, préventive, puis par
 * référence. L'ordre de TypeAction est celui de la déclaration de l'enum, que
 * PostgreSQL respecte pour trier : un simple `type: "asc"` suffit.
 */
export const ORDRE_ACTIONS: Prisma.ActionOrderByWithRelationInput[] = [{ type: "asc" }, { reference: "asc" }];
