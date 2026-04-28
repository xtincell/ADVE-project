/**
 * Ingestion Pipeline — Types
 */

export interface ExtractionResult {
  text: string;
  structured?: Record<string, unknown>;
  metadata: {
    pages?: number;
    sheets?: string[];
    dimensions?: string;
    wordCount?: number;
  };
}

export interface SourceProvenance {
  sourceId: string;
  sourceType: string;
  field: string;
  excerpt: string;
  confidence: number;
}

export interface GloryToolUsage {
  slug: string;
  outputId: string;
  fieldsEnriched: string[];
}

export interface PillarFillResult {
  pillarKey: string;
  content: Record<string, unknown>;
  confidence: number;
  sources: SourceProvenance[];
  gloryToolsUsed: GloryToolUsage[];
  validationErrors: Array<{ path: string; message: string }>;
  completionPercentage: number;
}

export interface IngestionStatus {
  strategyId: string;
  phase: "IDLE" | "EXTRACTING" | "ANALYZING" | "FILLING_ADVE" | "FILLING_RTIS" | "COMPLETE" | "FAILED";
  currentPillar: string | null;
  progress: number; // 0-1
  results: PillarFillResult[];
  errors: string[];
}

// Re-export from src/domain — single source of truth (Phase 1 refonte).
export { ADVE_KEYS, RTIS_KEYS, PILLAR_KEYS as ALL_PILLAR_KEYS } from "@/domain";
