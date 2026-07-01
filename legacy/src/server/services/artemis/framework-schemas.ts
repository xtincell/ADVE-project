import { z } from "zod";

export const Fw01BrandArcheologySchema = z.object({
  brand_dna: z.string(),
  founding_myth: z.string(),
  cultural_anchors: z.array(z.string()),
  identity_tensions: z.array(z.string()),
});

export const Fw02PersonaConstellationSchema = z.object({
  persona_map: z.array(z.object({
    name: z.string(),
    description: z.string(),
    primary_motivation: z.string()
  })),
  motivation_matrix: z.string(),
  segment_priorities: z.array(z.string()),
  engagement_potential: z.number().min(0).max(10),
});

export const Fw03HeroJourneyAuditSchema = z.object({
  journey_completeness: z.number().min(0).max(100),
  narrative_gaps: z.array(z.string()),
  story_strength: z.string(),
  recommendations: z.array(z.string()),
});

export const Fw04ValueArchitectureSchema = z.object({
  value_map: z.record(z.string(), z.string()),
  pricing_coherence: z.string(),
  differentiation_score: z.number().min(0).max(10),
  optimization_paths: z.array(z.string()),
});

export const Fw05PricingPsychologySchema = z.object({
  price_perception_map: z.record(z.string(), z.string()),
  anchor_strategy: z.string(),
  bundle_opportunities: z.array(z.string()),
  premium_indicators: z.array(z.string()),
});

export const Fw06UnitEconomicsSchema = z.object({
  ltv_cac_ratio: z.number().nullable(),
  margin_analysis: z.string(),
  viability_score: z.number().min(0).max(10),
  improvement_levers: z.array(z.string()),
});

export const Fw07TouchpointMappingSchema = z.object({
  touchpoint_map: z.array(z.object({
    touchpoint: z.string(),
    quality: z.string(),
    friction: z.string().nullable()
  })),
  experience_gaps: z.array(z.string()),
  consistency_score: z.number().min(0).max(10),
  priority_fixes: z.array(z.string()),
});

export const Fw08RitualDesignSchema = z.object({
  ritual_portfolio: z.array(z.object({
    name: z.string(),
    description: z.string(),
    frequency: z.string()
  })),
  adoption_potential: z.number().min(0).max(10),
  gamification_hooks: z.array(z.string()),
  ritual_calendar: z.string(),
});

export const Fw09DevotionPathwaySchema = z.object({
  pathway_design: z.string(),
  conversion_triggers: z.array(z.string()),
  barrier_analysis: z.array(z.string()),
  acceleration_strategy: z.string(),
});

export const Fw10AttributionModelSchema = z.object({
  attribution_model: z.string(),
  channel_weights: z.record(z.string(), z.number()),
  roi_by_channel: z.record(z.string(), z.string()),
  optimization_recommendations: z.array(z.string()),
});

export const Fw11BrandMarketFitSchema = z.object({
  fit_score: z.number().min(0).max(100),
  gap_analysis: z.array(z.string()),
  market_opportunity: z.string(),
  repositioning_options: z.array(z.string()),
});

export const Fw12TamSamSomSchema = z.object({
  tam: z.string(),
  sam: z.string(),
  som: z.string(),
  market_share_trajectory: z.string(),
  scaling_strategy: z.string(),
});

export const Fw13Roadmap90DaySchema = z.object({
  weekly_plan: z.array(z.object({
    week: z.number(),
    focus: z.string(),
    deliverables: z.array(z.string())
  })),
  milestones: z.array(z.string()),
  resource_allocation: z.string(),
  risk_mitigations: z.array(z.string()),
});

export const Fw14CampaignArchitectureSchema = z.object({
  campaign_plan: z.string(),
  channel_mix: z.record(z.string(), z.number()),
  content_calendar: z.string(),
  budget_allocation: z.record(z.string(), z.string()),
});

export const Fw15TeamBlueprintSchema = z.object({
  team_structure: z.string(),
  role_definitions: z.array(z.string()),
  hiring_priorities: z.array(z.string()),
  outsourcing_strategy: z.string(),
});

export const Fw16KpiFrameworkSchema = z.object({
  kpi_tree: z.record(z.string(), z.array(z.string())),
  targets: z.record(z.string(), z.string()),
  measurement_cadence: z.string(),
  dashboard_specs: z.string(),
});

export const Fw17CohortAnalysisSchema = z.object({
  cohort_tables: z.string(),
  retention_curves: z.string(),
  ltv_by_cohort: z.string(),
  insights: z.array(z.string()),
});

export const Fw18GrowthLoopsSchema = z.object({
  loop_designs: z.array(z.string()),
  viral_potential: z.number().min(0).max(10),
  activation_plan: z.string(),
  expected_impact: z.string(),
});

export const Fw19ExpansionStrategySchema = z.object({
  expansion_priority: z.array(z.string()),
  market_entry_plan: z.record(z.string(), z.string()),
  resource_needs: z.array(z.string()),
  risk_assessment: z.string(),
});

export const Fw20BrandEvolutionSchema = z.object({
  evolution_roadmap: z.string(),
  pivot_scenarios: z.array(z.string()),
  brand_extension_options: z.array(z.string()),
  legacy_plan: z.string(),
});

export const Fw21InnovationPipelineSchema = z.object({
  innovation_pipeline: z.array(z.string()),
  priority_matrix: z.string(),
  resource_plan: z.string(),
  time_to_market: z.string(),
});

export const Fw22RiskMatrixSchema = z.object({
  risk_matrix: z.array(z.object({
    risk: z.string(),
    impact: z.string(),
    probability: z.string()
  })),
  mitigation_plans: z.array(z.string()),
  early_warnings: z.array(z.string()),
  contingencies: z.string(),
});

export const Fw23CrisisPlaybookSchema = z.object({
  crisis_protocols: z.array(z.string()),
  response_templates: z.array(z.string()),
  escalation_matrix: z.string(),
  recovery_plan: z.string(),
});

export const Fw24CompetitiveDefenseSchema = z.object({
  defense_strategy: z.string(),
  moat_strengthening: z.array(z.string()),
  counter_moves: z.array(z.string()),
  early_warning_system: z.string(),
});

export const Fw25BerkusTeamSchema = z.object({
  team_profiles: z.array(z.string()),
  complementarity_score: z.number().min(0).max(10),
  execution_capacity: z.string(),
  skill_gaps: z.array(z.string()),
  berkus_team_score: z.number().min(0).max(10),
});

export const Fw26BerkusTractionSchema = z.object({
  traction_score: z.number().min(0).max(10),
  traction_evidence: z.array(z.string()),
  growth_trajectory: z.string(),
  risk_factors: z.array(z.string()),
  berkus_traction_score: z.number().min(0).max(10),
});

export const Fw27BerkusProductSchema = z.object({
  product_maturity: z.string(),
  pmf_indicators: z.array(z.string()),
  iteration_velocity: z.string(),
  berkus_product_score: z.number().min(0).max(10),
});

export const Fw28BerkusIpSchema = z.object({
  ip_strength: z.string(),
  barrier_assessment: z.string(),
  defensibility: z.string(),
  berkus_ip_score: z.number().min(0).max(10),
});
