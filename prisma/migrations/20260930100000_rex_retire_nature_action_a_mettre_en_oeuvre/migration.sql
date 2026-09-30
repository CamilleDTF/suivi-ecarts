-- Rédigée à la main : Neon était en quota réseau dépassé au moment de ce
-- changement, `prisma migrate diff` (qui exige une connexion à la base) était
-- inutilisable.
--
-- Retire la nature "ACTION_A_METTRE_EN_OEUVRE" de NatureREX, jugée redondante
-- avec EVOLUTION_METHODE (les deux produisaient en pratique le même contenu).
-- Postgres ne permet pas de retirer une valeur d'un type enum directement :
-- on recrée le type sans cette valeur, après avoir reclassé les éventuels
-- REX existants sur EVOLUTION_METHODE.
UPDATE "Rex" SET "nature" = 'EVOLUTION_METHODE' WHERE "nature" = 'ACTION_A_METTRE_EN_OEUVRE';

ALTER TYPE "NatureREX" RENAME TO "NatureREX_old";
CREATE TYPE "NatureREX" AS ENUM ('BONNE_PRATIQUE', 'PRATIQUE_A_EVITER', 'EVOLUTION_METHODE');
ALTER TABLE "Rex" ALTER COLUMN "nature" TYPE "NatureREX" USING ("nature"::text::"NatureREX");
DROP TYPE "NatureREX_old";
