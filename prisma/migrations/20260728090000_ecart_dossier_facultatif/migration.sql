-- Un écart peut être détaché de son dossier, comme une action ou un évènement
-- peut être détaché du sien : le rattachement devient facultatif.
ALTER TABLE "Ecart" ALTER COLUMN "dossierId" DROP NOT NULL;
