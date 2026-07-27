-- Remontées d'informations : saisie et suivi de ce que le terrain et le bureau
-- font remonter. Une remontée peut rester une simple information, ou être
-- transformée en écart — la relation vers Ecart conserve alors l'origine.

-- CreateEnum
CREATE TYPE "OrigineRemontee" AS ENUM ('CHANTIER', 'BUREAU');

-- CreateEnum
CREATE TYPE "StatutRemontee" AS ENUM ('A_TRAITER', 'EN_COURS', 'TRAITEE', 'TRANSFORMEE_EN_ECART');

-- CreateTable
CREATE TABLE "RemonteeInfo" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "dateRemontee" TIMESTAMP(3) NOT NULL,
    "origine" "OrigineRemontee" NOT NULL,
    "chantierService" TEXT NOT NULL,
    "personneRemontant" TEXT,
    "personneSaisie" TEXT,
    "objet" TEXT NOT NULL,
    "categorie" TEXT,
    "description" TEXT,
    "suiteDonnee" TEXT,
    "statut" "StatutRemontee" NOT NULL DEFAULT 'A_TRAITER',
    "ecartId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "modifiePar" TEXT,
    "modifieLe" TIMESTAMP(3),

    CONSTRAINT "RemonteeInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RemonteeInfo_reference_key" ON "RemonteeInfo"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "RemonteeInfo_ecartId_key" ON "RemonteeInfo"("ecartId");

-- AddForeignKey
ALTER TABLE "RemonteeInfo" ADD CONSTRAINT "RemonteeInfo_ecartId_fkey" FOREIGN KEY ("ecartId") REFERENCES "Ecart"("id") ON DELETE SET NULL ON UPDATE CASCADE;
