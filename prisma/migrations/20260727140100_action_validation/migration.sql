-- Action : section Validation (qui a vérifié, quand). La preuve, déjà
-- présente, rejoint cette section dans le formulaire.

-- AlterTable
ALTER TABLE "Action" ADD COLUMN "verifiePar" TEXT;

-- AlterTable
ALTER TABLE "Action" ADD COLUMN "verifieLe" TIMESTAMP(3);
