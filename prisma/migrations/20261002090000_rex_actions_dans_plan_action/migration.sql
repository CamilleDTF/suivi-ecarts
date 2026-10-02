-- Les actions préventives d'un REX deviennent de vraies actions du plan
-- d'action (rattachées au REX via Action.rexId) ; la table ActionRex, séparée,
-- disparaît. Aucun REX n'existait en production au moment de cette migration :
-- il n'y a donc aucune ligne ActionRex à reprendre.

-- DropForeignKey
ALTER TABLE "ActionRex" DROP CONSTRAINT "ActionRex_rexId_fkey";

-- DropTable
DROP TABLE "ActionRex";

-- AlterTable
ALTER TABLE "Action" ADD COLUMN     "rexId" TEXT;

-- CreateIndex
CREATE INDEX "Action_rexId_idx" ON "Action"("rexId");

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_rexId_fkey" FOREIGN KEY ("rexId") REFERENCES "Rex"("id") ON DELETE SET NULL ON UPDATE CASCADE;
