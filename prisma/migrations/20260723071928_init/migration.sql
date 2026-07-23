-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'UTILISATEUR');

-- CreateEnum
CREATE TYPE "Origine" AS ENUM ('REMONTEE_TERRAIN', 'AUDIT_INTERNE', 'AUDIT_EXTERNE', 'VISITE_CHANTIER', 'CONTROLE_TERRAIN', 'RONDE_SECURITE', 'INCIDENT_ACCIDENT', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutDossierEcart" AS ENUM ('A_QUALIFIER', 'OUVERT', 'EN_COURS', 'CLOTURE');

-- CreateEnum
CREATE TYPE "TypeActivite" AS ENUM ('SS3_RETRAIT_ENCAPSULAGE', 'SS4_INTERVENTION', 'PREPARATION_CHANTIER', 'REPLI_RESTITUTION', 'GESTION_DECHETS', 'MATERIEL', 'ACTIVITE_SUPPORT', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutFiche" AS ENUM ('BROUILLON', 'FINALISEE');

-- CreateEnum
CREATE TYPE "TypeAction" AS ENUM ('CURATIVE', 'CORRECTIVE', 'PREVENTIVE');

-- CreateEnum
CREATE TYPE "StatutAction" AS ENUM ('A_FAIRE', 'EN_COURS', 'EN_RETARD', 'REALISEE', 'VERIFIEE_EFFICACE', 'ANNULEE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'UTILISATEUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceCounter" (
    "entite" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "valeur" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReferenceCounter_pkey" PRIMARY KEY ("entite","annee")
);

-- CreateTable
CREATE TABLE "Dossier" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "dateDetection" TIMESTAMP(3) NOT NULL,
    "origine" "Origine" NOT NULL,
    "statut" "StatutDossierEcart" NOT NULL DEFAULT 'A_QUALIFIER',
    "declarant" TEXT NOT NULL,
    "chantier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ecart" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "dateDetection" TIMESTAMP(3) NOT NULL,
    "origine" "Origine" NOT NULL,
    "statut" "StatutDossierEcart" NOT NULL DEFAULT 'A_QUALIFIER',
    "declarant" TEXT NOT NULL,
    "typeActivite" "TypeActivite",
    "natures" TEXT[],
    "domaines" TEXT[],
    "pointsSensibles" TEXT,
    "graviteReelle" TEXT,
    "gravitePotentielle" TEXT,
    "frequence" TEXT,
    "description" TEXT,
    "mesureImmediate" TEXT,
    "cause" TEXT,
    "critereEfficacite" TEXT,
    "ficheSSECreee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ecart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FicheSSE" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "ecartId" TEXT,
    "typeEvenement" TEXT,
    "numeroInterne" TEXT,
    "statutFiche" "StatutFiche" NOT NULL DEFAULT 'BROUILLON',
    "emetteur" TEXT,
    "nomChantier" TEXT,
    "dateHeure" TIMESTAMP(3),
    "lieuZone" TEXT,
    "personnesImpliquees" TEXT,
    "temoins" TEXT,
    "declarationExterneNecessaire" BOOLEAN,
    "declarationExterneA" TEXT,
    "descriptionFactuelle" TEXT,
    "gravite" TEXT,
    "frequence" TEXT,
    "criticite" TEXT,
    "typeAnalyse" TEXT,
    "toutesActionsCloturees" BOOLEAN,
    "miseAJourNecessaire" BOOLEAN,
    "procedureLaquelle" TEXT,
    "referenceDUERP" TEXT,
    "nouveauRisqueNecessaire" BOOLEAN,
    "referenceNouveauRisque" TEXT,
    "communicationInterne" BOOLEAN,
    "typeCommunication" TEXT,
    "validationNom" TEXT,
    "validationFonction" TEXT,
    "validationDate" TIMESTAMP(3),
    "mesuresImmediatesPrises" TEXT,
    "dateEnvoi" TIMESTAMP(3),
    "domaine" TEXT,
    "theme" TEXT,
    "referencePreuve" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FicheSSE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Action" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "ecartId" TEXT NOT NULL,
    "type" "TypeAction" NOT NULL,
    "action" TEXT NOT NULL,
    "responsable" TEXT NOT NULL,
    "echeance" TIMESTAMP(3),
    "statut" "StatutAction" NOT NULL DEFAULT 'A_FAIRE',
    "obligatoire" BOOLEAN NOT NULL DEFAULT false,
    "preuve" TEXT,
    "verifEfficacite" TEXT,
    "origine" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Dossier_reference_key" ON "Dossier"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Ecart_reference_key" ON "Ecart"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "FicheSSE_reference_key" ON "FicheSSE"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Action_reference_key" ON "Action"("reference");

-- AddForeignKey
ALTER TABLE "Ecart" ADD CONSTRAINT "Ecart_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FicheSSE" ADD CONSTRAINT "FicheSSE_ecartId_fkey" FOREIGN KEY ("ecartId") REFERENCES "Ecart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_ecartId_fkey" FOREIGN KEY ("ecartId") REFERENCES "Ecart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
