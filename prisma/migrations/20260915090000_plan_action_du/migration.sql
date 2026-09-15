-- Plan d'action du Document Unique : table autonome, avec sa propre
-- numérotation PA1, PA2… à laquelle les fiches de risques du DU renvoient.

-- CreateTable
CREATE TABLE "ActionDU" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "risquesConcernes" TEXT,
    "typeAction" TEXT,
    "responsable" TEXT,
    "preuveRealisation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "modifiePar" TEXT,
    "modifieLe" TIMESTAMP(3),
    "archiveLe" TIMESTAMP(3),

    CONSTRAINT "ActionDU_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActionDU_numero_key" ON "ActionDU"("numero");

