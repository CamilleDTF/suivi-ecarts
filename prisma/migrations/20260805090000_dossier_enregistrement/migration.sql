-- Le champ accepte désormais un PDF en plus d'une photo : « photo » ne décrit
-- plus ce qu'il contient. RENAME plutôt que DROP + ADD : les enregistrements
-- déjà déposés sont conservés.
ALTER TABLE "Dossier" RENAME COLUMN "photo" TO "enregistrement";

-- Un PDF ne s'affiche pas en vignette : c'est son nom qui dit ce que c'est.
ALTER TABLE "Dossier" ADD COLUMN "enregistrementNom" TEXT;
