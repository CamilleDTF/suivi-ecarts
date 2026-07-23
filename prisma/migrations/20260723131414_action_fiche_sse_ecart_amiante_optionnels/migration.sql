-- DropForeignKey
ALTER TABLE "Action" DROP CONSTRAINT "Action_ecartId_fkey";

-- AlterTable
ALTER TABLE "Action" ADD COLUMN     "ecartAmianteId" TEXT,
ADD COLUMN     "ficheSSEId" TEXT,
ALTER COLUMN "ecartId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_ecartId_fkey" FOREIGN KEY ("ecartId") REFERENCES "Ecart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_ficheSSEId_fkey" FOREIGN KEY ("ficheSSEId") REFERENCES "FicheSSE"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_ecartAmianteId_fkey" FOREIGN KEY ("ecartAmianteId") REFERENCES "EcartAmiante"("id") ON DELETE SET NULL ON UPDATE CASCADE;
