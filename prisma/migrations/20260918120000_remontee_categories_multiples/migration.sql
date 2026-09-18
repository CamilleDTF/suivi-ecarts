-- Une remontée peut désormais porter plusieurs catégories, avec un référentiel
-- plus précis (voir CATEGORIES_REMONTEE). Les valeurs déjà saisies sont
-- reprises telles quelles dans le nouveau tableau plutôt que perdues : elles
-- pourront être reclassées au fil de l'eau.
ALTER TABLE "RemonteeInfo" ADD COLUMN "categories" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "RemonteeInfo" SET "categories" = ARRAY["categorie"] WHERE "categorie" IS NOT NULL;

ALTER TABLE "RemonteeInfo" DROP COLUMN "categorie";
