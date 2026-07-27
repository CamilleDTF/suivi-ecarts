-- Écart amiante : ajout de la cause, retrait de l'action de clôture.
--
-- "actionCloture" était un champ texte libre qui ne contenait en pratique que
-- "Oui" ou "Non" sur les 5 enregistrements renseignés — aucune information
-- rédigée n'est perdue. La clôture se résume désormais à sa date.

-- AlterTable
ALTER TABLE "EcartAmiante" ADD COLUMN "cause" TEXT;

-- AlterTable
ALTER TABLE "EcartAmiante" DROP COLUMN "actionCloture";
