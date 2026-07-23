-- CreateTable
CREATE TABLE "CauseArbre" (
    "id" TEXT NOT NULL,
    "ficheSSEId" TEXT NOT NULL,
    "parentId" TEXT,
    "libelle" TEXT NOT NULL,
    "estCauseRacine" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CauseArbre_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CauseArbre" ADD CONSTRAINT "CauseArbre_ficheSSEId_fkey" FOREIGN KEY ("ficheSSEId") REFERENCES "FicheSSE"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CauseArbre" ADD CONSTRAINT "CauseArbre_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CauseArbre"("id") ON DELETE SET NULL ON UPDATE CASCADE;
