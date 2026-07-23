-- AlterEnum
ALTER TYPE "StatutFiche" ADD VALUE 'EN_COURS';

-- AlterTable: remplace le booléen clotureEcartAmiante par un statut à 3 états
-- (réutilise l'enum StatutDossierEcart pour rester cohérent avec Écart/Dossier)
ALTER TABLE "EcartAmiante" ADD COLUMN     "statut" "StatutDossierEcart" NOT NULL DEFAULT 'OUVERT';

-- Backfill à partir de l'ancien booléen avant de le supprimer
UPDATE "EcartAmiante" SET "statut" = 'CLOTURE' WHERE "clotureEcartAmiante" = true;

-- AlterTable
ALTER TABLE "EcartAmiante" DROP COLUMN "clotureEcartAmiante";
