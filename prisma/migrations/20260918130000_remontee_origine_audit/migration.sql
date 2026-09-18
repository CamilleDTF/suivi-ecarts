-- Une remontée issue d'un audit MASE n'est ni un signalement chantier ni une
-- saisie bureau ordinaire : deux origines dédiées évitent de forcer ce choix.
ALTER TYPE "OrigineRemontee" ADD VALUE 'AUDIT_BLANC';
ALTER TYPE "OrigineRemontee" ADD VALUE 'AUDIT';
