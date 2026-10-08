-- Les évènements SSE n'ont plus de statut "Brouillon" : ils naissent "En cours".
-- Les brouillons existants passent "En cours" ; ceux dont toutes les actions
-- sont soldées passent directement "Finalisée", comme le faisait le bouton
-- "Finaliser l'évènement".
UPDATE "FicheSSE" f SET "statutFiche" = 'FINALISEE'
WHERE f."statutFiche" = 'BROUILLON'
  AND EXISTS (SELECT 1 FROM "Action" a WHERE a."ficheSSEId" = f."id")
  AND NOT EXISTS (
    SELECT 1 FROM "Action" a
    WHERE a."ficheSSEId" = f."id" AND a."statut" IN ('A_FAIRE', 'EN_COURS', 'EN_RETARD')
  );
UPDATE "FicheSSE" SET "statutFiche" = 'EN_COURS' WHERE "statutFiche" = 'BROUILLON';

-- Retire la valeur de l'enum (PostgreSQL ne sait pas supprimer une valeur : on recrée le type).
ALTER TABLE "FicheSSE" ALTER COLUMN "statutFiche" DROP DEFAULT;
ALTER TYPE "StatutFiche" RENAME TO "StatutFiche_old";
CREATE TYPE "StatutFiche" AS ENUM ('EN_COURS', 'FINALISEE');
ALTER TABLE "FicheSSE" ALTER COLUMN "statutFiche" TYPE "StatutFiche" USING ("statutFiche"::text::"StatutFiche");
ALTER TABLE "FicheSSE" ALTER COLUMN "statutFiche" SET DEFAULT 'EN_COURS';
DROP TYPE "StatutFiche_old";
