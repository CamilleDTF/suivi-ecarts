-- Description propre à la nature du REX : la bonne pratique elle-même
-- (nature BONNE_PRATIQUE) ou la pratique observée à ne pas reproduire
-- (nature PRATIQUE_A_EVITER). Écrite à la main : la base Neon est
-- inaccessible (quota de transfert dépassé), `prisma migrate diff` ne peut
-- donc pas s'y connecter pour la générer automatiquement.

-- AlterTable
ALTER TABLE "Rex" ADD COLUMN "pratiqueDescription" TEXT;
