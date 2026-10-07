-- Fiche de diffusion apportée par l'utilisateur (document externe), une par REX.

-- CreateTable
CREATE TABLE "RexDocument" (
    "id" TEXT NOT NULL,
    "rexId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "contenu" BYTEA NOT NULL,
    "ajoutePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RexDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RexDocument_rexId_key" ON "RexDocument"("rexId");

-- AddForeignKey
ALTER TABLE "RexDocument" ADD CONSTRAINT "RexDocument_rexId_fkey" FOREIGN KEY ("rexId") REFERENCES "Rex"("id") ON DELETE CASCADE ON UPDATE CASCADE;
