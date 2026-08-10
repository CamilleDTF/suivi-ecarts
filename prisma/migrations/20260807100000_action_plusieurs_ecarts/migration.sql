-- Une action peut désormais couvrir plusieurs écarts : une même correction
-- répond souvent à plusieurs constats (même cause, même chantier), et la
-- dupliquer obligerait à la clôturer plusieurs fois.

-- Table de liaison, créée et raccordée AVANT la copie : une donnée incohérente
-- ferait alors échouer la migration au lieu de passer inaperçue.
CREATE TABLE "_ActionToEcart" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ActionToEcart_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_ActionToEcart_B_index" ON "_ActionToEcart"("B");

ALTER TABLE "_ActionToEcart" ADD CONSTRAINT "_ActionToEcart_A_fkey"
  FOREIGN KEY ("A") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ActionToEcart" ADD CONSTRAINT "_ActionToEcart_B_fkey"
  FOREIGN KEY ("B") REFERENCES "Ecart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise des rattachements existants : chaque action liée à un écart le reste,
-- avec exactement un écart.
INSERT INTO "_ActionToEcart" ("A", "B")
SELECT "id", "ecartId" FROM "Action" WHERE "ecartId" IS NOT NULL;

ALTER TABLE "Action" DROP CONSTRAINT "Action_ecartId_fkey";
ALTER TABLE "Action" DROP COLUMN "ecartId";

-- Dérive corrigée au passage : la contrainte était restée en RESTRICT depuis que
-- le dossier d'un écart est devenu facultatif, alors que le schéma demande
-- SET NULL. Sans effet aujourd'hui (la suppression d'un dossier retire ses
-- écarts d'abord), mais la base et le schéma cessent de diverger.
ALTER TABLE "Ecart" DROP CONSTRAINT "Ecart_dossierId_fkey";
ALTER TABLE "Ecart" ADD CONSTRAINT "Ecart_dossierId_fkey"
  FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
