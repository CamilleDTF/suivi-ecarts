-- Une remontée peut être rattachée à plusieurs écarts, ou à un évènement SSE.

-- Table de liaison, créée et raccordée avant la reprise : une donnée
-- incohérente ferait alors échouer la migration au lieu de passer inaperçue.
CREATE TABLE "_RemonteeEcarts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RemonteeEcarts_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_RemonteeEcarts_B_index" ON "_RemonteeEcarts"("B");

ALTER TABLE "_RemonteeEcarts" ADD CONSTRAINT "_RemonteeEcarts_A_fkey"
  FOREIGN KEY ("A") REFERENCES "Ecart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_RemonteeEcarts" ADD CONSTRAINT "_RemonteeEcarts_B_fkey"
  FOREIGN KEY ("B") REFERENCES "RemonteeInfo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise des liens existants : chaque remontée déjà reliée à un écart le reste.
INSERT INTO "_RemonteeEcarts" ("A", "B")
SELECT "ecartId", "id" FROM "RemonteeInfo" WHERE "ecartId" IS NOT NULL;

-- La filiation est conservée à part du rattachement : jusqu'ici, un écart ne
-- pouvait être relié à une remontée que par une transformation, donc toutes les
-- lignes concernées portent le statut correspondant.
ALTER TABLE "RemonteeInfo" ADD COLUMN "ecartOrigineId" TEXT;

UPDATE "RemonteeInfo"
   SET "ecartOrigineId" = "ecartId"
 WHERE "ecartId" IS NOT NULL AND "statut" = 'TRANSFORMEE_EN_ECART';

ALTER TABLE "RemonteeInfo" ADD CONSTRAINT "RemonteeInfo_ecartOrigineId_fkey"
  FOREIGN KEY ("ecartOrigineId") REFERENCES "Ecart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- L'unicité disparaît avec la colonne : deux personnes signalant le même fait
-- produisent deux remontées, qui pointent légitimement vers le même écart.
ALTER TABLE "RemonteeInfo" DROP CONSTRAINT "RemonteeInfo_ecartId_fkey";
ALTER TABLE "RemonteeInfo" DROP COLUMN "ecartId";

-- Rattachement à un évènement SSE.
ALTER TABLE "RemonteeInfo" ADD COLUMN "ficheSSEId" TEXT;

ALTER TABLE "RemonteeInfo" ADD CONSTRAINT "RemonteeInfo_ficheSSEId_fkey"
  FOREIGN KEY ("ficheSSEId") REFERENCES "FicheSSE"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "RemonteeInfo_ficheSSEId_idx" ON "RemonteeInfo"("ficheSSEId");
