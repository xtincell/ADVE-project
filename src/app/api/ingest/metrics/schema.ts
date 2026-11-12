/**
 * Contrat d'entrée de l'ingestion de métriques externes (ADR-0146).
 *
 * Isolé de `route.ts` pour être testable sans tirer la chaîne d'auth
 * (NextAuth / next-server) dans le graphe du test.
 */
export { MetricCell, IngestSchema, type IngestPayload } from "@/domain/external-metric";
