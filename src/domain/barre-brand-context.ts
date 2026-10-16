import type { FieldProvenance } from "./field-provenance";

/** A reader projection, never persisted as another brand platform. */
export type BarreBrandContext = {
  generatedAt: string;
  sharingMode: "DOCUMENT_V2";
  brands: Record<string, {
    nodeId: string;
    strategyId: string;
    name: string;
    url: string;
    fields: Record<string, {
      value: unknown;
      provenance: FieldProvenance;
      sourceId: string | null;
      sourceVersion: number | null;
      lastWrittenAt: string | null;
    }>;
  }>;
  issues: string[];
};
