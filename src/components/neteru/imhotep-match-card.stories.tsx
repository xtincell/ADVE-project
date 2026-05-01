import type { Meta, StoryObj } from "@storybook/react";
import { ImhotepMatchCard } from "./imhotep-match-card";

const meta: Meta<typeof ImhotepMatchCard> = {
  title: "Neteru/Imhotep MatchCard",
  component: ImhotepMatchCard,
  tags: ["autodocs"],
  argTypes: {
    matchScore: { control: { type: "range", min: 0, max: 100 } },
    devotionInSector: { control: { type: "number", min: 0, max: 5000 } },
    manipulationFit: { control: "boolean" },
    tier: { control: "select", options: ["APPRENTI", "COMPAGNON", "MAITRE", "ASSOCIE"] },
  },
};
export default meta;
type Story = StoryObj<typeof ImhotepMatchCard>;

export const StrongMatch: Story = {
  args: {
    displayName: "Kofi Asante",
    tier: "MAITRE",
    matchScore: 92,
    devotionInSector: 1200,
    manipulationFit: true,
    reasons: ["tier=MAITRE", "Specialite OOH", "Taux acceptation >80%", "devotion footprint sector=1200", "manipulation strength: facilitator"],
  },
};

export const WeakMatch: Story = {
  args: {
    displayName: "Issa Ndiaye",
    tier: "APPRENTI",
    matchScore: 48,
    devotionInSector: 0,
    manipulationFit: false,
    reasons: ["tier=APPRENTI", "⚠ manipulation gap: peddler not in strengths"],
  },
};

export const NoFootprint: Story = {
  args: {
    displayName: "Zuri Afolabi",
    tier: "MAITRE",
    matchScore: 70,
    devotionInSector: 0,
    manipulationFit: true,
    reasons: ["tier=MAITRE", "manipulation strength: facilitator"],
  },
};
