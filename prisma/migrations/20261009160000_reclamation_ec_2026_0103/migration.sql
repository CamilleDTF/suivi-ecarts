-- EC-2026-0103 (faux-plafond abîmé sur OCEANOX, signalé par SILOSUN) est une
-- réclamation : sa nature le disait, mais son origine était « Remontée
-- terrain », si bien que la reprise du 2026-10-09, qui s'appuyait sur
-- l'origine, l'a laissé parmi les écarts. Il devient une réclamation à un
-- point, avec son action.
--
-- Il était né de la remontée RI-2026-0051 (« Transformer en écart ») ; une
-- réclamation n'a pas de lien vers une remontée : celle-ci passe « Traitée »
-- et sa suite donnée renvoie à la réclamation.

BEGIN;

DO $$
DECLARE
  e RECORD;
  rem RECORD;
  annee_courante INT := EXTRACT(YEAR FROM now())::INT;
  numero INT;
  ref TEXT;
  rec_id TEXT := 'rc' || replace(gen_random_uuid()::text, '-', '');
BEGIN
  SELECT * INTO e FROM "Ecart" WHERE "reference" = 'EC-2026-0103';
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT r.* INTO rem FROM "RemonteeInfo" r WHERE r."ecartOrigineId" = e."id";

  INSERT INTO "ReferenceCounter" ("entite", "annee", "valeur")
  VALUES ('Reclamation', annee_courante, 1)
  ON CONFLICT ("entite", "annee") DO UPDATE SET "valeur" = "ReferenceCounter"."valeur" + 1
  RETURNING "valeur" INTO numero;
  ref := 'RC-' || annee_courante || '-' || lpad(numero::text, 4, '0');

  INSERT INTO "Reclamation" (
    "id", "reference", "type", "dateReception", "emetteur", "chantier", "typeActivite", "objet",
    "domaines", "theme", "statut", "createdAt", "updatedAt", "modifiePar", "modifieLe", "archiveLe"
  ) VALUES (
    rec_id,
    ref,
    'RECLAMATION',
    e."dateDetection",
    e."declarant",
    rem."chantierService",
    e."typeActivite",
    coalesce(rem."objet", left(coalesce(nullif(trim(e."description"), ''), 'Réclamation ' || e."reference"), 120)),
    e."domaines",
    e."theme",
    CASE e."statut"
      WHEN 'CLOTURE' THEN 'CLOTUREE'::"StatutReclamation"
      WHEN 'EN_COURS' THEN 'EN_COURS'::"StatutReclamation"
      ELSE 'OUVERTE'::"StatutReclamation"
    END,
    e."createdAt",
    now(),
    e."modifiePar",
    e."modifieLe",
    e."archiveLe"
  );

  INSERT INTO "ReclamationPoint" ("id", "reclamationId", "ordre", "description", "gravite", "frequence", "criticite", "cause", "createdAt")
  VALUES (
    'rp' || replace(gen_random_uuid()::text, '-', ''),
    rec_id,
    1,
    coalesce(nullif(trim(e."description"), ''), 'Point repris de l''écart ' || e."reference"),
    e."gravite",
    e."frequence",
    e."criticite",
    e."cause",
    e."createdAt"
  );

  UPDATE "Action" a SET "reclamationId" = rec_id
  WHERE EXISTS (SELECT 1 FROM "_ActionToEcart" ae WHERE ae."A" = a."id" AND ae."B" = e."id");
  UPDATE "FicheSSE" SET "reclamationId" = rec_id, "ecartId" = NULL WHERE "ecartId" = e."id";

  UPDATE "RemonteeInfo"
  SET "ecartOrigineId" = NULL,
      "statut" = 'TRAITEE',
      "suiteDonnee" = concat_ws(E'\n\n', nullif(trim("suiteDonnee"), ''), 'Traitée comme réclamation ' || ref || '.')
  WHERE "ecartOrigineId" = e."id";

  DELETE FROM "_ActionToEcart" WHERE "B" = e."id";
  DELETE FROM "_RemonteeEcarts" WHERE "A" = e."id";
  DELETE FROM "_EcartToRex" WHERE "A" = e."id";
  DELETE FROM "Ecart" WHERE "id" = e."id";
END $$;

COMMIT;
