-- Aligne Ecart sur le nommage déjà utilisé par FicheSSE (gravite / frequence /
-- criticite).
--
-- Contexte : le formulaire affichait "Fréquence" sur la colonne
-- "gravitePotentielle", pendant que la vraie fréquence importée d'Excel dormait
-- dans "frequence" sans jamais être ni lue ni écrite. Les écarts importés
-- affichaient donc une fréquence fausse (en réalité leur gravité potentielle),
-- une gravité vide, et une criticité incalculable.
--
-- Le fichier Excel d'origine ne renseigne aucune "gravité réelle" : la seule
-- note de gravité disponible est "gravité potentielle". C'est donc elle qui
-- devient "gravite". "frequence" est déjà correcte et reste inchangée.

-- 1. graviteReelle (vide partout) devient la colonne "gravite"
ALTER TABLE "Ecart" RENAME COLUMN "graviteReelle" TO "gravite";

-- 2. On y bascule la gravité potentielle issue d'Excel
UPDATE "Ecart" SET "gravite" = "gravitePotentielle" WHERE "gravite" IS NULL;

-- 3. L'ancienne colonne n'a plus de raison d'être
ALTER TABLE "Ecart" DROP COLUMN "gravitePotentielle";

-- 4. Recalcul de la criticité (mêmes seuils que calculerCriticite dans
--    src/lib/labels.ts : produit >= 9 Élevée, >= 4 Moyenne, sinon Faible)
UPDATE "Ecart"
SET "criticite" = CASE
  WHEN "gravite" ~ '^[0-9]+$' AND "frequence" ~ '^[0-9]+$'
       AND "gravite"::int > 0 AND "frequence"::int > 0
  THEN CASE
    WHEN "gravite"::int * "frequence"::int >= 9 THEN 'Élevée'
    WHEN "gravite"::int * "frequence"::int >= 4 THEN 'Moyenne'
    ELSE 'Faible'
  END
  ELSE NULL
END;
