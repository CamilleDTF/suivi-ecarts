-- "Points sensibles" et "Critère d'efficacité" n'étaient renseignés sur aucun
-- des écarts importés et les champs ont été retirés du formulaire : on
-- supprime les colonnes plutôt que de les laisser mortes dans le schéma.
ALTER TABLE "Ecart" DROP COLUMN "pointsSensibles";
ALTER TABLE "Ecart" DROP COLUMN "critereEfficacite";
