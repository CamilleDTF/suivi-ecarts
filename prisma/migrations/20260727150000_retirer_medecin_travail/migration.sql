-- Le champ "Médecin du travail" n'était renseigné sur aucun écart amiante et la
-- section a été retirée du formulaire : on supprime la colonne devenue morte.
ALTER TABLE "EcartAmiante" DROP COLUMN "medecinTravail";
