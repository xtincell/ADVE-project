import type { Meta, StoryObj } from "@storybook/react";
import { AnubisCostPerSuperfanBadge } from "./anubis-cost-per-superfan-badge";

const meta: Meta<typeof AnubisCostPerSuperfanBadge> = {
  title: "Neteru/Anubis CostPerSuperfan Badge",
  component: AnubisCostPerSuperfanBadge,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof AnubisCostPerSuperfanBadge>;

export const Healthy: Story = { args: { projected: 8500, benchmark: 12000, currency: "XAF" } };
export const Warning: Story = { args: { projected: 18000, benchmark: 12000, currency: "XAF" } };
export const Veto: Story = { args: { projected: 32000, benchmark: 12000, currency: "XAF" } };
export const NoBenchmark: Story = { args: { projected: 8500, benchmark: null, currency: "XAF" } };
