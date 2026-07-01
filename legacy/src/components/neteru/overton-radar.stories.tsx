import type { Meta, StoryObj } from "@storybook/react";
import { OvertonRadar, type OvertonRadarSignal } from "./overton-radar";
import type { ConnectorResult } from "@/domain";

const liveData: OvertonRadarSignal = {
  sectorAxis: { tags: { premium: 0.7, authentique: 0.55, audacieux: 0.4, traditionnel: 0.3 }, confidence: 0.8, samples: 24 },
  brandTags: { premium: 0.5, authentique: 0.8, audacieux: 0.75, traditionnel: 0.15 },
  vocabularyOverlap: 0.42,
  embeddingDelta: 0.31,
  claimImitations: [
    { competitorId: "comp-a", phrase: "le luxe qui a du sens", observedAt: "2026-05-20T10:00:00Z" },
    { competitorId: "comp-b", phrase: "fabriqué ici, pour les nôtres", observedAt: "2026-05-12T10:00:00Z" },
  ],
  unpaidPress: [
    { publication: "Jeune Afrique", headline: "La marque qui redéfinit le premium local", publishedAt: "2026-05-18T10:00:00Z" },
  ],
  emergedNarratives: ["luxe local", "fierté assumée"],
  fadedNarratives: ["import = qualité"],
};

const live: ConnectorResult<OvertonRadarSignal> = { state: "LIVE", data: liveData, observedAt: "2026-05-25T08:00:00Z" };
const deferred: ConnectorResult<OvertonRadarSignal> = { state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: "tarsis-monitoring" };
const degraded: ConnectorResult<OvertonRadarSignal> = { state: "DEGRADED", reason: "VENDOR_OUTAGE", lastObservedAt: "2026-05-24T08:00:00Z" };
const partial: ConnectorResult<OvertonRadarSignal> = {
  state: "LIVE",
  data: { ...liveData, vocabularyOverlap: undefined, embeddingDelta: undefined, claimImitations: [], unpaidPress: [] },
  observedAt: "2026-05-25T08:00:00Z",
};

const meta: Meta<typeof OvertonRadar> = {
  title: "Neteru/OvertonRadar",
  component: OvertonRadar,
  tags: ["autodocs"],
  argTypes: {
    instance: { control: "select", options: ["full", "teaser"] },
    density: { control: "select", options: ["comfortable", "compact"] },
  },
};
export default meta;
type Story = StoryObj<typeof OvertonRadar>;

export const FullLive: Story = { args: { signal: live, instance: "full" } };
export const TeaserLive: Story = { args: { signal: live, instance: "teaser" } };
export const Deferred: Story = { args: { signal: deferred, instance: "full" } };
export const Degraded: Story = { args: { signal: degraded, instance: "full" } };
export const PerAxisPartial: Story = { args: { signal: partial, instance: "full" } };
export const TeaserDeferred: Story = { args: { signal: deferred, instance: "teaser" } };
