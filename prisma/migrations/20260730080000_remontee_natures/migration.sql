-- Nature d'une remontée : remontée terrain, point sensible, opportunité
-- d'amélioration, bonne pratique, veille réglementaire. Ces qualifications
-- décrivent une information signalée, pas un manquement constaté : elles
-- quittent la nature des écarts pour rejoindre les remontées.
ALTER TABLE "RemonteeInfo" ADD COLUMN "natures" TEXT[] DEFAULT ARRAY[]::TEXT[];
