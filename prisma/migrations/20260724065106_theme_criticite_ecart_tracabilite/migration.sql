-- AlterTable
ALTER TABLE "Ecart" ADD COLUMN     "criticite" TEXT,
ADD COLUMN     "theme" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "modifiePar" TEXT;

-- AlterTable
ALTER TABLE "Dossier" ADD COLUMN     "modifiePar" TEXT;

-- AlterTable
ALTER TABLE "FicheSSE" ADD COLUMN     "modifiePar" TEXT;

-- AlterTable
ALTER TABLE "EcartAmiante" ADD COLUMN     "modifiePar" TEXT;

-- AlterTable
ALTER TABLE "Action" ADD COLUMN     "modifiePar" TEXT;
