-- "Action obligatoire" valait false sur les 161 actions : la case ne portait
-- aucune information et toutes les actions sont obligatoires en pratique.
ALTER TABLE "Action" DROP COLUMN "obligatoire";

-- Date de réalisation : la renseigner fait passer l'action à "Réalisée".
ALTER TABLE "Action" ADD COLUMN "realiseeLe" TIMESTAMP(3);
