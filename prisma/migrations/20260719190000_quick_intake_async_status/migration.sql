-- F1 async (fix prod 2026-07-19, RESIDUAL-DEBT « Intake processIngest
-- synchrone → Load failed ») : le travail lourd des chemins courts/import
-- sort de la requête tRPC. Statuts additifs backfill-safe : PROCESSING
-- (travail de fond en cours) + FAILED (échec honnête, retry autorisé) +
-- colonne failureReason nullable. Aucune row existante n'est touchée.

-- AlterEnum
ALTER TYPE "QuickIntakeStatus" ADD VALUE 'PROCESSING' AFTER 'IN_PROGRESS';
ALTER TYPE "QuickIntakeStatus" ADD VALUE 'FAILED' AFTER 'EXPIRED';

-- AlterTable
ALTER TABLE "QuickIntake" ADD COLUMN "failureReason" TEXT;
