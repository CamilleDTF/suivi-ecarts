-- Refonte du REX : parcours de création en assistant (mode élément unique /
-- éléments récurrents / spontané), nature du REX, diffusion par groupes de
-- rôles + canaux (abandon du suivi de lecture nominatif RexDiffusion), et
-- statut brouillon avant publication.

-- CreateEnum
CREATE TYPE "NatureREX" AS ENUM ('BONNE_PRATIQUE', 'PRATIQUE_A_EVITER', 'EVOLUTION_METHODE', 'ACTION_A_METTRE_EN_OEUVRE');

-- AlterEnum
ALTER TYPE "OrigineREX" ADD VALUE 'SPONTANE';

-- DropForeignKey
ALTER TABLE "RexDiffusion" DROP CONSTRAINT "RexDiffusion_rexId_fkey";

-- AlterTable
ALTER TABLE "Rex" DROP COLUMN "canalDiffusion",
ADD COLUMN     "brouillon" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canaux" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dateDiffusionPlanifiee" TIMESTAMP(3),
ADD COLUMN     "destinatairesRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "nature" "NatureREX" NOT NULL,
ADD COLUMN     "pointsCommuns" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "raisonDiffusion" TEXT,
ADD COLUMN     "themes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropTable
DROP TABLE "RexDiffusion";

-- DropEnum
DROP TYPE "StatutLectureREX";
