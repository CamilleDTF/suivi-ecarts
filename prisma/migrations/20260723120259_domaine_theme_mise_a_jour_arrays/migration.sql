/*
  Warnings:

  - The `miseAJourNecessaire` column on the `FicheSSE` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `domaine` column on the `FicheSSE` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `theme` column on the `FicheSSE` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "FicheSSE" DROP COLUMN "miseAJourNecessaire",
ADD COLUMN     "miseAJourNecessaire" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "domaine",
ADD COLUMN     "domaine" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "theme",
ADD COLUMN     "theme" TEXT[] DEFAULT ARRAY[]::TEXT[];
