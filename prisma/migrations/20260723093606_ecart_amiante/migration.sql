-- AlterTable
ALTER TABLE "FicheSSE" ADD COLUMN     "ecartAmianteId" TEXT;

-- CreateTable
CREATE TABLE "EcartAmiante" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "nomChantier" TEXT NOT NULL,
    "numeroChantier" TEXT NOT NULL,
    "conducteur" TEXT NOT NULL,
    "chef" TEXT NOT NULL,
    "zone" TEXT,
    "processus" TEXT,
    "typeAnalyse" TEXT,
    "referenceAnalyse" TEXT,
    "typeEcart" TEXT,
    "resultatAttendu" TEXT,
    "resultatObtenu" TEXT,
    "description" TEXT,
    "expositionAccidentelle" BOOLEAN,
    "personneConcernee" TEXT,
    "fie" BOOLEAN,
    "medecinTravail" TEXT,
    "besoinNouvelleAnalyse" BOOLEAN,
    "pasNouvelleAnalyse" TEXT,
    "dateNouvelleAnalyse" TIMESTAMP(3),
    "laboratoireNouvelleAnalyse" TEXT,
    "chantierNouvelleAnalyse" TEXT,
    "resultatAttenduNouvelleAnalyse" TEXT,
    "resultatObtenuNouvelleAnalyse" TEXT,
    "actionCloture" TEXT,
    "clotureEcartAmiante" BOOLEAN NOT NULL DEFAULT false,
    "dateCloture" TIMESTAMP(3),
    "evenementSSE" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcartAmiante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EcartAmiante_reference_key" ON "EcartAmiante"("reference");

-- AddForeignKey
ALTER TABLE "FicheSSE" ADD CONSTRAINT "FicheSSE_ecartAmianteId_fkey" FOREIGN KEY ("ecartAmianteId") REFERENCES "EcartAmiante"("id") ON DELETE SET NULL ON UPDATE CASCADE;
