-- Nouvelle origine d'écart.
ALTER TYPE "Origine" ADD VALUE IF NOT EXISTS 'RECLAMATION_PLAINTE' BEFORE 'AUTRE';

-- Archivage : alternative non destructive à la suppression. Un registre QSE se
-- relit des années plus tard ; effacer une ligne efface aussi la trace de ce
-- qui a été décidé. La date sert à la fois de marqueur et d'horodatage.
ALTER TABLE "Dossier" ADD COLUMN "archiveLe" TIMESTAMP(3);
ALTER TABLE "Ecart" ADD COLUMN "archiveLe" TIMESTAMP(3);
ALTER TABLE "RemonteeInfo" ADD COLUMN "archiveLe" TIMESTAMP(3);
ALTER TABLE "FicheSSE" ADD COLUMN "archiveLe" TIMESTAMP(3);
ALTER TABLE "EcartAmiante" ADD COLUMN "archiveLe" TIMESTAMP(3);
ALTER TABLE "Action" ADD COLUMN "archiveLe" TIMESTAMP(3);
