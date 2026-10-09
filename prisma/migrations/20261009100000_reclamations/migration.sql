-- Les plaintes et réclamations sortent des écarts : elles deviennent une entité
-- à part (Reclamation), avec ses points soulevés, son plan d'action et ses
-- évènements SSE. L'origine « Réclamation / plainte » disparaît des écarts.
--
-- Reprise des données : un dossier dont les écarts sont d'origine réclamation
-- correspondait à un courrier, ses écarts aux points de ce courrier. Il devient
-- une réclamation, ses écarts en deviennent les points. Un écart d'origine
-- réclamation hors dossier devient une réclamation à un seul point. Actions et
-- évènements SSE suivent ; les écarts repris, puis les dossiers vidés, sont
-- supprimés.

BEGIN;

-- CreateEnum
CREATE TYPE "StatutReclamation" AS ENUM ('OUVERTE', 'EN_COURS', 'CLOTUREE');
CREATE TYPE "TypeReclamation" AS ENUM ('RECLAMATION', 'PLAINTE');

-- AlterTable
ALTER TABLE "Action" ADD COLUMN "reclamationId" TEXT;
ALTER TABLE "FicheSSE" ADD COLUMN "reclamationId" TEXT;

-- CreateTable
CREATE TABLE "Reclamation" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "TypeReclamation" NOT NULL DEFAULT 'RECLAMATION',
    "dateReception" TIMESTAMP(3) NOT NULL,
    "emetteur" TEXT NOT NULL,
    "canal" TEXT,
    "chantier" TEXT,
    "typeActivite" "TypeActivite",
    "objet" TEXT NOT NULL,
    "description" TEXT,
    "domaines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "theme" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "analyse" TEXT,
    "reponse" TEXT,
    "dateReponse" TIMESTAMP(3),
    "statut" "StatutReclamation" NOT NULL DEFAULT 'OUVERTE',
    "personneSaisie" TEXT,
    "enregistrement" TEXT,
    "enregistrementNom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "modifiePar" TEXT,
    "modifieLe" TIMESTAMP(3),
    "archiveLe" TIMESTAMP(3),

    CONSTRAINT "Reclamation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReclamationPoint" (
    "id" TEXT NOT NULL,
    "reclamationId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "gravite" TEXT,
    "frequence" TEXT,
    "criticite" TEXT,
    "cause" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReclamationPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reclamation_reference_key" ON "Reclamation"("reference");
CREATE INDEX "ReclamationPoint_reclamationId_idx" ON "ReclamationPoint"("reclamationId");
CREATE INDEX "Action_reclamationId_idx" ON "Action"("reclamationId");

-- AddForeignKey
ALTER TABLE "FicheSSE" ADD CONSTRAINT "FicheSSE_reclamationId_fkey" FOREIGN KEY ("reclamationId") REFERENCES "Reclamation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Action" ADD CONSTRAINT "Action_reclamationId_fkey" FOREIGN KEY ("reclamationId") REFERENCES "Reclamation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReclamationPoint" ADD CONSTRAINT "ReclamationPoint_reclamationId_fkey" FOREIGN KEY ("reclamationId") REFERENCES "Reclamation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise des écarts d'origine réclamation.
DO $$
DECLARE
  annee_courante INT := EXTRACT(YEAR FROM now())::INT;
  numero INT := 0;
  groupe RECORD;
  rec_id TEXT;
BEGIN
  -- Un groupe par dossier, un par écart hors dossier ; numérotés dans l'ordre
  -- des dates de réception.
  FOR groupe IN
    SELECT
      d."id" AS dossier_id,
      NULL::TEXT AS ecart_id,
      d."dateDetection" AS date_reception,
      d."declarant" AS emetteur,
      d."chantier" AS chantier,
      'Réclamation — ' || d."chantier" AS objet,
      d."enregistrement",
      d."enregistrementNom",
      d."archiveLe"
    FROM "Dossier" d
    WHERE EXISTS (SELECT 1 FROM "Ecart" e WHERE e."dossierId" = d."id" AND e."origine" = 'RECLAMATION_PLAINTE')
    UNION ALL
    SELECT
      NULL,
      e."id",
      e."dateDetection",
      e."declarant",
      NULL,
      CASE WHEN length(coalesce(e."description", '')) > 120
        THEN left(e."description", 117) || '…'
        ELSE coalesce(nullif(trim(e."description"), ''), 'Réclamation ' || e."reference") END,
      NULL,
      NULL,
      e."archiveLe"
    FROM "Ecart" e
    WHERE e."origine" = 'RECLAMATION_PLAINTE' AND e."dossierId" IS NULL
    ORDER BY 3, 1, 2
  LOOP
    numero := numero + 1;
    rec_id := 'rc' || replace(gen_random_uuid()::text, '-', '');

    -- Les écarts de ce groupe.
    CREATE TEMP TABLE IF NOT EXISTS groupe_ecarts ("id" TEXT) ON COMMIT DROP;
    TRUNCATE groupe_ecarts;
    INSERT INTO groupe_ecarts
      SELECT e."id" FROM "Ecart" e
      WHERE e."origine" = 'RECLAMATION_PLAINTE'
        AND (e."dossierId" = groupe.dossier_id OR e."id" = groupe.ecart_id);

    INSERT INTO "Reclamation" (
      "id", "reference", "type", "dateReception", "emetteur", "chantier", "typeActivite", "objet",
      "domaines", "theme", "statut", "enregistrement", "enregistrementNom",
      "createdAt", "updatedAt", "modifiePar", "modifieLe", "archiveLe"
    )
    SELECT
      rec_id,
      'RC-' || annee_courante || '-' || lpad(numero::text, 4, '0'),
      'RECLAMATION',
      groupe.date_reception,
      groupe.emetteur,
      groupe.chantier,
      (SELECT e."typeActivite" FROM "Ecart" e JOIN groupe_ecarts g ON g."id" = e."id"
        WHERE e."typeActivite" IS NOT NULL ORDER BY e."reference" LIMIT 1),
      groupe.objet,
      coalesce((SELECT array_agg(DISTINCT x) FROM "Ecart" e JOIN groupe_ecarts g ON g."id" = e."id",
        unnest(e."domaines") x), ARRAY[]::TEXT[]),
      coalesce((SELECT array_agg(DISTINCT x) FROM "Ecart" e JOIN groupe_ecarts g ON g."id" = e."id",
        unnest(e."theme") x), ARRAY[]::TEXT[]),
      -- Tous les points clôturés : la réclamation l'est. Un point en cours ou
      -- une action posée : elle est en cours. Sinon elle reste ouverte.
      CASE
        WHEN NOT EXISTS (SELECT 1 FROM "Ecart" e JOIN groupe_ecarts g ON g."id" = e."id" WHERE e."statut" <> 'CLOTURE')
          THEN 'CLOTUREE'::"StatutReclamation"
        WHEN EXISTS (SELECT 1 FROM "Ecart" e JOIN groupe_ecarts g ON g."id" = e."id" WHERE e."statut" = 'EN_COURS')
          OR EXISTS (SELECT 1 FROM "_ActionToEcart" ae JOIN groupe_ecarts g ON g."id" = ae."B")
          THEN 'EN_COURS'::"StatutReclamation"
        ELSE 'OUVERTE'::"StatutReclamation"
      END,
      groupe."enregistrement",
      groupe."enregistrementNom",
      (SELECT min(e."createdAt") FROM "Ecart" e JOIN groupe_ecarts g ON g."id" = e."id"),
      now(),
      (SELECT e."modifiePar" FROM "Ecart" e JOIN groupe_ecarts g ON g."id" = e."id"
        WHERE e."modifieLe" IS NOT NULL ORDER BY e."modifieLe" DESC LIMIT 1),
      (SELECT max(e."modifieLe") FROM "Ecart" e JOIN groupe_ecarts g ON g."id" = e."id"),
      groupe."archiveLe";

    INSERT INTO "ReclamationPoint" ("id", "reclamationId", "ordre", "description", "gravite", "frequence", "criticite", "cause", "createdAt")
    SELECT
      'rp' || replace(gen_random_uuid()::text, '-', ''),
      rec_id,
      row_number() OVER (ORDER BY e."reference"),
      coalesce(nullif(trim(e."description"), ''), 'Point repris de l''écart ' || e."reference"),
      e."gravite",
      e."frequence",
      e."criticite",
      e."cause",
      e."createdAt"
    FROM "Ecart" e JOIN groupe_ecarts g ON g."id" = e."id";

    -- Les actions de ces écarts passent à la réclamation (une action partagée
    -- entre plusieurs points n'en fait plus qu'une).
    UPDATE "Action" a SET "reclamationId" = rec_id
    WHERE EXISTS (SELECT 1 FROM "_ActionToEcart" ae JOIN groupe_ecarts g ON g."id" = ae."B" WHERE ae."A" = a."id");

    UPDATE "FicheSSE" f SET "reclamationId" = rec_id, "ecartId" = NULL
    WHERE f."ecartId" IN (SELECT "id" FROM groupe_ecarts);
  END LOOP;

  IF numero > 0 THEN
    INSERT INTO "ReferenceCounter" ("entite", "annee", "valeur")
    VALUES ('Reclamation', annee_courante, numero)
    ON CONFLICT ("entite", "annee") DO UPDATE SET "valeur" = GREATEST("ReferenceCounter"."valeur", EXCLUDED."valeur");
  END IF;
END $$;

-- Les écarts repris disparaissent. Une action reprise perd ses liens d'écart ;
-- une remontée qui en était l'origine n'a plus d'écart né d'elle.
DELETE FROM "_ActionToEcart" ae USING "Ecart" e WHERE e."id" = ae."B" AND e."origine" = 'RECLAMATION_PLAINTE';
UPDATE "RemonteeInfo" r SET "ecartOrigineId" = NULL, "statut" = 'A_TRAITER'
  FROM "Ecart" e WHERE e."id" = r."ecartOrigineId" AND e."origine" = 'RECLAMATION_PLAINTE';
DELETE FROM "_RemonteeEcarts" re USING "Ecart" e WHERE e."id" = re."A" AND e."origine" = 'RECLAMATION_PLAINTE';
DELETE FROM "_EcartToRex" er USING "Ecart" e WHERE e."id" = er."A" AND e."origine" = 'RECLAMATION_PLAINTE';
DELETE FROM "Ecart" WHERE "origine" = 'RECLAMATION_PLAINTE';

-- Un dossier vidé par la reprise n'a plus d'objet : c'était le courrier.
DELETE FROM "Dossier" d
WHERE d."origine" = 'RECLAMATION_PLAINTE'
  AND NOT EXISTS (SELECT 1 FROM "Ecart" e WHERE e."dossierId" = d."id");
-- Un dossier d'origine réclamation qui garde d'autres écarts reste, en « Autre ».
UPDATE "Dossier" SET "origine" = 'AUTRE' WHERE "origine" = 'RECLAMATION_PLAINTE';

-- Retire la valeur de l'enum (PostgreSQL ne sait pas supprimer une valeur : on recrée le type).
ALTER TYPE "Origine" RENAME TO "Origine_old";
CREATE TYPE "Origine" AS ENUM ('REMONTEE_TERRAIN', 'AUDIT_INTERNE', 'AUDIT_EXTERNE', 'VISITE_CHANTIER', 'CONTROLE_TERRAIN', 'RONDE_SECURITE', 'INCIDENT_ACCIDENT', 'AUTRE');
ALTER TABLE "Dossier" ALTER COLUMN "origine" TYPE "Origine" USING ("origine"::text::"Origine");
ALTER TABLE "Ecart" ALTER COLUMN "origine" TYPE "Origine" USING ("origine"::text::"Origine");
DROP TYPE "Origine_old";

COMMIT;
