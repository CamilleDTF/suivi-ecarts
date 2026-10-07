-- Un REX peut désormais lier plusieurs éléments de chaque type (écarts, évènements SSE, écarts
-- amiante, remontées), en mélange libre : les trois clés étrangères uniques de Rex deviennent des
-- tables de liaison, comme l'était déjà celle des écarts. Les rattachements existants sont repris.

-- AlterEnum
ALTER TYPE "OrigineREX" ADD VALUE 'PLUSIEURS_SOURCES';

-- CreateTable
CREATE TABLE "_RemonteeInfoToRex" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RemonteeInfoToRex_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_FicheSSEToRex" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FicheSSEToRex_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EcartAmianteToRex" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EcartAmianteToRex_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_RemonteeInfoToRex_B_index" ON "_RemonteeInfoToRex"("B");

-- CreateIndex
CREATE INDEX "_FicheSSEToRex_B_index" ON "_FicheSSEToRex"("B");

-- CreateIndex
CREATE INDEX "_EcartAmianteToRex_B_index" ON "_EcartAmianteToRex"("B");

-- AddForeignKey
ALTER TABLE "_RemonteeInfoToRex" ADD CONSTRAINT "_RemonteeInfoToRex_A_fkey" FOREIGN KEY ("A") REFERENCES "RemonteeInfo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RemonteeInfoToRex" ADD CONSTRAINT "_RemonteeInfoToRex_B_fkey" FOREIGN KEY ("B") REFERENCES "Rex"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FicheSSEToRex" ADD CONSTRAINT "_FicheSSEToRex_A_fkey" FOREIGN KEY ("A") REFERENCES "FicheSSE"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FicheSSEToRex" ADD CONSTRAINT "_FicheSSEToRex_B_fkey" FOREIGN KEY ("B") REFERENCES "Rex"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EcartAmianteToRex" ADD CONSTRAINT "_EcartAmianteToRex_A_fkey" FOREIGN KEY ("A") REFERENCES "EcartAmiante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EcartAmianteToRex" ADD CONSTRAINT "_EcartAmianteToRex_B_fkey" FOREIGN KEY ("B") REFERENCES "Rex"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise des rattachements existants (A = élément source, B = REX, comme Prisma les lit).
INSERT INTO "_FicheSSEToRex" ("A", "B") SELECT "ficheSSEId", "id" FROM "Rex" WHERE "ficheSSEId" IS NOT NULL;
INSERT INTO "_EcartAmianteToRex" ("A", "B") SELECT "ecartAmianteId", "id" FROM "Rex" WHERE "ecartAmianteId" IS NOT NULL;
INSERT INTO "_RemonteeInfoToRex" ("A", "B") SELECT "remonteeId", "id" FROM "Rex" WHERE "remonteeId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Rex" DROP CONSTRAINT "Rex_ecartAmianteId_fkey";

-- DropForeignKey
ALTER TABLE "Rex" DROP CONSTRAINT "Rex_ficheSSEId_fkey";

-- DropForeignKey
ALTER TABLE "Rex" DROP CONSTRAINT "Rex_remonteeId_fkey";

-- AlterTable
ALTER TABLE "Rex" DROP COLUMN "ecartAmianteId",
DROP COLUMN "ficheSSEId",
DROP COLUMN "remonteeId";
