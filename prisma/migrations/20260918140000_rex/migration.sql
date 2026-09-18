-- Retour d'expérience (REX) : enseignement transverse capitalisé à partir d'une
-- remontée, d'un évènement SSE, d'un écart amiante ou d'un écart terrain,
-- diffusé nominativement et dont l'efficacité est vérifiée dans le temps.

-- CreateEnum
CREATE TYPE "OrigineREX" AS ENUM ('REMONTEE', 'EVENEMENT_SSE', 'ECART_AMIANTE', 'ECART_TERRAIN');

-- CreateEnum
CREATE TYPE "StatutREX" AS ENUM ('REDIGE', 'DIFFUSE', 'EFFICACITE_VERIFIEE');

-- CreateEnum
CREATE TYPE "StatutLectureREX" AS ENUM ('EN_ATTENTE', 'LU');

-- CreateTable
CREATE TABLE "Rex" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "origine" "OrigineREX" NOT NULL,
    "sousTypeSSE" TEXT,
    "causeRacine" TEXT,
    "enseignementsTires" TEXT,
    "statut" "StatutREX" NOT NULL DEFAULT 'REDIGE',
    "dateDiffusion" TIMESTAMP(3),
    "dateVerificationEfficacite" TIMESTAMP(3),
    "canalDiffusion" TEXT,
    "ficheSSEId" TEXT,
    "ecartAmianteId" TEXT,
    "remonteeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "modifiePar" TEXT,
    "modifieLe" TIMESTAMP(3),
    "archiveLe" TIMESTAMP(3),

    CONSTRAINT "Rex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionRex" (
    "id" TEXT NOT NULL,
    "rexId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "responsable" TEXT NOT NULL,
    "echeance" TIMESTAMP(3),
    "statut" "StatutAction" NOT NULL DEFAULT 'A_FAIRE',
    "realiseeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archiveLe" TIMESTAMP(3),

    CONSTRAINT "ActionRex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RexDiffusion" (
    "id" TEXT NOT NULL,
    "rexId" TEXT NOT NULL,
    "destinataire" TEXT NOT NULL,
    "chantier" TEXT,
    "statutLecture" "StatutLectureREX" NOT NULL DEFAULT 'EN_ATTENTE',
    "dateLecture" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RexDiffusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EcartToRex" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EcartToRex_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rex_reference_key" ON "Rex"("reference");

-- CreateIndex
CREATE INDEX "ActionRex_rexId_idx" ON "ActionRex"("rexId");

-- CreateIndex
CREATE INDEX "RexDiffusion_rexId_idx" ON "RexDiffusion"("rexId");

-- CreateIndex
CREATE INDEX "_EcartToRex_B_index" ON "_EcartToRex"("B");

-- AddForeignKey
ALTER TABLE "Rex" ADD CONSTRAINT "Rex_ficheSSEId_fkey" FOREIGN KEY ("ficheSSEId") REFERENCES "FicheSSE"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rex" ADD CONSTRAINT "Rex_ecartAmianteId_fkey" FOREIGN KEY ("ecartAmianteId") REFERENCES "EcartAmiante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rex" ADD CONSTRAINT "Rex_remonteeId_fkey" FOREIGN KEY ("remonteeId") REFERENCES "RemonteeInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionRex" ADD CONSTRAINT "ActionRex_rexId_fkey" FOREIGN KEY ("rexId") REFERENCES "Rex"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RexDiffusion" ADD CONSTRAINT "RexDiffusion_rexId_fkey" FOREIGN KEY ("rexId") REFERENCES "Rex"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EcartToRex" ADD CONSTRAINT "_EcartToRex_A_fkey" FOREIGN KEY ("A") REFERENCES "Ecart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EcartToRex" ADD CONSTRAINT "_EcartToRex_B_fkey" FOREIGN KEY ("B") REFERENCES "Rex"("id") ON DELETE CASCADE ON UPDATE CASCADE;

