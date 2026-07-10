-- Attribution funnel (vague E) : UTM structurés + referrer + click ids
-- capturés au start de l'intake. Colonne nullable — backfill-safe.
ALTER TABLE "QuickIntake" ADD COLUMN "attribution" JSONB;
