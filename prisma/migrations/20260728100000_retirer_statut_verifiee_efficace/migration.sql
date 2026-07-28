-- Statut inutilisé (0 action sur 161) : la vérification est portée par la
-- section Validation de l'action, pas par un statut à part.
ALTER TYPE "StatutAction" RENAME TO "StatutAction_ancien";
CREATE TYPE "StatutAction" AS ENUM ('A_FAIRE', 'EN_COURS', 'EN_RETARD', 'REALISEE', 'ANNULEE');
ALTER TABLE "Action" ALTER COLUMN "statut" DROP DEFAULT;
ALTER TABLE "Action" ALTER COLUMN "statut" TYPE "StatutAction" USING ("statut"::text::"StatutAction");
ALTER TABLE "Action" ALTER COLUMN "statut" SET DEFAULT 'A_FAIRE';
DROP TYPE "StatutAction_ancien";
