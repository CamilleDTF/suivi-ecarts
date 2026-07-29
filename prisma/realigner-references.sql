-- ===================================================================
--  Réaligner les références sur la numérotation du classeur Excel
-- ===================================================================
--  À coller dans le SQL Editor de Neon, en une seule fois.
--
--  À l'import, chaque ligne a conservé l'identifiant du classeur mais a reçu
--  une référence attribuée par le compteur de l'application, dans l'ordre de
--  lecture du fichier. Les deux ne coïncident donc pas : la fiche affichée
--  « EV-2026-0054 » est la ligne « EV-2026-063 » du classeur.
--
--  Ce script recopie l'identifiant d'origine dans la référence affichée.
--
--  Les fiches créées dans l'application (identifiant aléatoire) gardent leur
--  référence, sauf si elle est justement celle que réclame une fiche importée :
--  dans ce cas elles reçoivent le premier numéro libre. Sans ça, la base refuse
--  l'opération — deux fiches ne peuvent pas porter la même référence.
--
--  Les dossiers ne sont pas touchés : leur identifiant (DOS-2026-0001) et leur
--  référence (D-2026-0001) portent déjà le même numéro.
--
--  Tout est dans une transaction : à la moindre erreur, rien n'est modifié.
--  Faire malgré tout une sauvegarde Neon avant de lancer.
-- ===================================================================

BEGIN;

-- --- 1. Écarts -----------------------------------------------
-- a) Les lignes issues de l'import qui doivent changer sont garées sous un nom
--    temporaire : la référence est unique, on ne peut pas permuter en place.
UPDATE "Ecart" SET reference = 'tmp-import-' || id
 WHERE id ~ '^EC-[0-9]{4}-[0-9]+$' AND reference <> split_part(id,'-',1)||'-'||split_part(id,'-',2)||'-'||lpad(split_part(id,'-',3),4,'0');

-- b) Une fiche créée dans l'application peut occuper la référence visée par une
--    fiche importée. On la gare aussi, elle sera renumérotée en (d).
UPDATE "Ecart" SET reference = 'tmp-appli-' || id
 WHERE id !~ '^EC-[0-9]{4}-[0-9]+$'
   AND reference IN (SELECT split_part(id,'-',1)||'-'||split_part(id,'-',2)||'-'||lpad(split_part(id,'-',3),4,'0') FROM "Ecart" WHERE id ~ '^EC-[0-9]{4}-[0-9]+$');

-- c) Les lignes importées prennent le numéro du classeur.
UPDATE "Ecart" SET reference = split_part(id,'-',1)||'-'||split_part(id,'-',2)||'-'||lpad(split_part(id,'-',3),4,'0') WHERE reference LIKE 'tmp-import-%';

-- d) Les lignes déplacées en (b) reçoivent le premier numéro libre de leur année.
WITH aplacer AS (
  SELECT id, to_char("createdAt", 'YYYY') AS annee,
         ROW_NUMBER() OVER (PARTITION BY to_char("createdAt", 'YYYY') ORDER BY "createdAt", id) AS n
    FROM "Ecart" WHERE reference LIKE 'tmp-appli-%'
), maxi AS (
  SELECT split_part(reference, '-', 2) AS annee, MAX(split_part(reference, '-', 3)::int) AS m
    FROM "Ecart" WHERE reference ~ '^EC-[0-9]{4}-[0-9]+$' GROUP BY 1
)
UPDATE "Ecart" SET reference = 'EC-' || a.annee || '-' || lpad((COALESCE(m.m, 0) + a.n)::text, 4, '0')
  FROM aplacer a LEFT JOIN maxi m ON m.annee = a.annee
 WHERE "Ecart".id = a.id;

-- --- 2. Évènements SSE -----------------------------------------------
-- a) Les lignes issues de l'import qui doivent changer sont garées sous un nom
--    temporaire : la référence est unique, on ne peut pas permuter en place.
UPDATE "FicheSSE" SET reference = 'tmp-import-' || id
 WHERE id ~ '^EV-[0-9]{4}-[0-9]+$' AND reference <> split_part(id,'-',1)||'-'||split_part(id,'-',2)||'-'||lpad(split_part(id,'-',3),4,'0');

-- b) Une fiche créée dans l'application peut occuper la référence visée par une
--    fiche importée. On la gare aussi, elle sera renumérotée en (d).
UPDATE "FicheSSE" SET reference = 'tmp-appli-' || id
 WHERE id !~ '^EV-[0-9]{4}-[0-9]+$'
   AND reference IN (SELECT split_part(id,'-',1)||'-'||split_part(id,'-',2)||'-'||lpad(split_part(id,'-',3),4,'0') FROM "FicheSSE" WHERE id ~ '^EV-[0-9]{4}-[0-9]+$');

-- c) Les lignes importées prennent le numéro du classeur.
UPDATE "FicheSSE" SET reference = split_part(id,'-',1)||'-'||split_part(id,'-',2)||'-'||lpad(split_part(id,'-',3),4,'0') WHERE reference LIKE 'tmp-import-%';

-- d) Les lignes déplacées en (b) reçoivent le premier numéro libre de leur année.
WITH aplacer AS (
  SELECT id, to_char("createdAt", 'YYYY') AS annee,
         ROW_NUMBER() OVER (PARTITION BY to_char("createdAt", 'YYYY') ORDER BY "createdAt", id) AS n
    FROM "FicheSSE" WHERE reference LIKE 'tmp-appli-%'
), maxi AS (
  SELECT split_part(reference, '-', 2) AS annee, MAX(split_part(reference, '-', 3)::int) AS m
    FROM "FicheSSE" WHERE reference ~ '^EV-[0-9]{4}-[0-9]+$' GROUP BY 1
)
UPDATE "FicheSSE" SET reference = 'EV-' || a.annee || '-' || lpad((COALESCE(m.m, 0) + a.n)::text, 4, '0')
  FROM aplacer a LEFT JOIN maxi m ON m.annee = a.annee
 WHERE "FicheSSE".id = a.id;

-- --- 3. Actions -----------------------------------------------
-- a) Les lignes issues de l'import qui doivent changer sont garées sous un nom
--    temporaire : la référence est unique, on ne peut pas permuter en place.
UPDATE "Action" SET reference = 'tmp-import-' || id
 WHERE id ~ '^ACT-[0-9]{4}-[0-9]+$' AND reference <> split_part(id,'-',1)||'-'||split_part(id,'-',2)||'-'||lpad(split_part(id,'-',3),4,'0');

-- b) Une fiche créée dans l'application peut occuper la référence visée par une
--    fiche importée. On la gare aussi, elle sera renumérotée en (d).
UPDATE "Action" SET reference = 'tmp-appli-' || id
 WHERE id !~ '^ACT-[0-9]{4}-[0-9]+$'
   AND reference IN (SELECT split_part(id,'-',1)||'-'||split_part(id,'-',2)||'-'||lpad(split_part(id,'-',3),4,'0') FROM "Action" WHERE id ~ '^ACT-[0-9]{4}-[0-9]+$');

-- c) Les lignes importées prennent le numéro du classeur.
UPDATE "Action" SET reference = split_part(id,'-',1)||'-'||split_part(id,'-',2)||'-'||lpad(split_part(id,'-',3),4,'0') WHERE reference LIKE 'tmp-import-%';

-- d) Les lignes déplacées en (b) reçoivent le premier numéro libre de leur année.
WITH aplacer AS (
  SELECT id, to_char("createdAt", 'YYYY') AS annee,
         ROW_NUMBER() OVER (PARTITION BY to_char("createdAt", 'YYYY') ORDER BY "createdAt", id) AS n
    FROM "Action" WHERE reference LIKE 'tmp-appli-%'
), maxi AS (
  SELECT split_part(reference, '-', 2) AS annee, MAX(split_part(reference, '-', 3)::int) AS m
    FROM "Action" WHERE reference ~ '^ACT-[0-9]{4}-[0-9]+$' GROUP BY 1
)
UPDATE "Action" SET reference = 'ACT-' || a.annee || '-' || lpad((COALESCE(m.m, 0) + a.n)::text, 4, '0')
  FROM aplacer a LEFT JOIN maxi m ON m.annee = a.annee
 WHERE "Action".id = a.id;

-- --- 4. Écarts amiante -----------------------------------------------
-- a) Les lignes issues de l'import qui doivent changer sont garées sous un nom
--    temporaire : la référence est unique, on ne peut pas permuter en place.
UPDATE "EcartAmiante" SET reference = 'tmp-import-' || id
 WHERE id ~ '^EA-[0-9]{4}-[0-9]+$' AND reference <> split_part(id,'-',1)||'-'||split_part(id,'-',2)||'-'||lpad(split_part(id,'-',3),4,'0');

-- b) Une fiche créée dans l'application peut occuper la référence visée par une
--    fiche importée. On la gare aussi, elle sera renumérotée en (d).
UPDATE "EcartAmiante" SET reference = 'tmp-appli-' || id
 WHERE id !~ '^EA-[0-9]{4}-[0-9]+$'
   AND reference IN (SELECT split_part(id,'-',1)||'-'||split_part(id,'-',2)||'-'||lpad(split_part(id,'-',3),4,'0') FROM "EcartAmiante" WHERE id ~ '^EA-[0-9]{4}-[0-9]+$');

-- c) Les lignes importées prennent le numéro du classeur.
UPDATE "EcartAmiante" SET reference = split_part(id,'-',1)||'-'||split_part(id,'-',2)||'-'||lpad(split_part(id,'-',3),4,'0') WHERE reference LIKE 'tmp-import-%';

-- d) Les lignes déplacées en (b) reçoivent le premier numéro libre de leur année.
WITH aplacer AS (
  SELECT id, to_char("createdAt", 'YYYY') AS annee,
         ROW_NUMBER() OVER (PARTITION BY to_char("createdAt", 'YYYY') ORDER BY "createdAt", id) AS n
    FROM "EcartAmiante" WHERE reference LIKE 'tmp-appli-%'
), maxi AS (
  SELECT split_part(reference, '-', 2) AS annee, MAX(split_part(reference, '-', 3)::int) AS m
    FROM "EcartAmiante" WHERE reference ~ '^EA-[0-9]{4}-[0-9]+$' GROUP BY 1
)
UPDATE "EcartAmiante" SET reference = 'EA-' || a.annee || '-' || lpad((COALESCE(m.m, 0) + a.n)::text, 4, '0')
  FROM aplacer a LEFT JOIN maxi m ON m.annee = a.annee
 WHERE "EcartAmiante".id = a.id;

-- --- 5. Compteurs de références ------------------------------------
-- Sans cela, la prochaine création réutiliserait une référence déjà prise.
INSERT INTO "ReferenceCounter" (entite, annee, valeur)
SELECT 'Ecart', split_part(reference, '-', 2)::int, MAX(split_part(reference, '-', 3)::int)
  FROM "Ecart" WHERE reference ~ '^EC-[0-9]{4}-[0-9]+$' GROUP BY 2
ON CONFLICT (entite, annee) DO UPDATE SET valeur = GREATEST("ReferenceCounter".valeur, EXCLUDED.valeur);

INSERT INTO "ReferenceCounter" (entite, annee, valeur)
SELECT 'FicheSSE', split_part(reference, '-', 2)::int, MAX(split_part(reference, '-', 3)::int)
  FROM "FicheSSE" WHERE reference ~ '^EV-[0-9]{4}-[0-9]+$' GROUP BY 2
ON CONFLICT (entite, annee) DO UPDATE SET valeur = GREATEST("ReferenceCounter".valeur, EXCLUDED.valeur);

INSERT INTO "ReferenceCounter" (entite, annee, valeur)
SELECT 'Action', split_part(reference, '-', 2)::int, MAX(split_part(reference, '-', 3)::int)
  FROM "Action" WHERE reference ~ '^ACT-[0-9]{4}-[0-9]+$' GROUP BY 2
ON CONFLICT (entite, annee) DO UPDATE SET valeur = GREATEST("ReferenceCounter".valeur, EXCLUDED.valeur);

INSERT INTO "ReferenceCounter" (entite, annee, valeur)
SELECT 'EcartAmiante', split_part(reference, '-', 2)::int, MAX(split_part(reference, '-', 3)::int)
  FROM "EcartAmiante" WHERE reference ~ '^EA-[0-9]{4}-[0-9]+$' GROUP BY 2
ON CONFLICT (entite, annee) DO UPDATE SET valeur = GREATEST("ReferenceCounter".valeur, EXCLUDED.valeur);

-- --- 6. Contrôle ----------------------------------------------------
-- Les huit lignes doivent afficher 0. Sinon : ROLLBACK; au lieu de COMMIT;
SELECT 'Ecart — encore désaligné' AS controle, COUNT(*) AS doit_etre_zero FROM "Ecart"
  WHERE id ~ '^EC-[0-9]{4}-[0-9]+$' AND reference <> split_part(id,'-',1)||'-'||split_part(id,'-',2)||'-'||lpad(split_part(id,'-',3),4,'0')
UNION ALL
SELECT 'Ecart — référence temporaire restante', COUNT(*) FROM "Ecart" WHERE reference LIKE 'tmp-%'
UNION ALL
SELECT 'FicheSSE — encore désaligné' AS controle, COUNT(*) AS doit_etre_zero FROM "FicheSSE"
  WHERE id ~ '^EV-[0-9]{4}-[0-9]+$' AND reference <> split_part(id,'-',1)||'-'||split_part(id,'-',2)||'-'||lpad(split_part(id,'-',3),4,'0')
UNION ALL
SELECT 'FicheSSE — référence temporaire restante', COUNT(*) FROM "FicheSSE" WHERE reference LIKE 'tmp-%'
UNION ALL
SELECT 'Action — encore désaligné' AS controle, COUNT(*) AS doit_etre_zero FROM "Action"
  WHERE id ~ '^ACT-[0-9]{4}-[0-9]+$' AND reference <> split_part(id,'-',1)||'-'||split_part(id,'-',2)||'-'||lpad(split_part(id,'-',3),4,'0')
UNION ALL
SELECT 'Action — référence temporaire restante', COUNT(*) FROM "Action" WHERE reference LIKE 'tmp-%'
UNION ALL
SELECT 'EcartAmiante — encore désaligné' AS controle, COUNT(*) AS doit_etre_zero FROM "EcartAmiante"
  WHERE id ~ '^EA-[0-9]{4}-[0-9]+$' AND reference <> split_part(id,'-',1)||'-'||split_part(id,'-',2)||'-'||lpad(split_part(id,'-',3),4,'0')
UNION ALL
SELECT 'EcartAmiante — référence temporaire restante', COUNT(*) FROM "EcartAmiante" WHERE reference LIKE 'tmp-%';

COMMIT;
