-- On se connecte désormais avec son prénom et non son adresse e-mail.

-- Le prénom est le premier mot du nom complet ("Camille Martinez" -> "Camille").
-- Backfill générique plutôt qu'une liste de comptes en dur.
ALTER TABLE "User" ADD COLUMN "identifiant" TEXT;
UPDATE "User" SET "identifiant" = split_part("name", ' ', 1) WHERE "identifiant" IS NULL;

-- Un compte sans nom exploitable retomberait sur une chaîne vide : on repart
-- de la partie locale de son adresse plutôt que de faire échouer la migration.
UPDATE "User" SET "identifiant" = split_part("email", '@', 1) WHERE "identifiant" = '' OR "identifiant" IS NULL;

ALTER TABLE "User" ALTER COLUMN "identifiant" SET NOT NULL;
CREATE UNIQUE INDEX "User_identifiant_key" ON "User"("identifiant");

-- L'adresse est conservée pour les comptes qui en ont une, mais elle n'est
-- plus l'identifiant de connexion : ni unique, ni obligatoire.
DROP INDEX "User_email_key";
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
