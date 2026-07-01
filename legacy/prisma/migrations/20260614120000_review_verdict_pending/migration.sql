-- QC : verdict PENDING réel (fin du placeholder "ACCEPTED" qui faussait firstPassRate).
-- Additif, non destructif. PG 12+ autorise ADD VALUE hors usage immédiat.
ALTER TYPE "ReviewVerdict" ADD VALUE IF NOT EXISTS 'PENDING';
