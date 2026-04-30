import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

const meta: Meta<typeof Badge> = {
  title: "Primitives/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    tone: { control: "select", options: ["neutral", "accent", "success", "warning", "error", "info"] },
    variant: { control: "select", options: ["soft", "solid", "outline"] },
  },
};
export default meta;
type Story = StoryObj<typeof Badge>;

export const Neutral: Story = { args: { tone: "neutral", children: "ZOMBIE" } };
export const Accent: Story = { args: { tone: "accent", children: "CULTE" } };
export const Success: Story = { args: { tone: "success", children: "OK" } };
export const Warning: Story = { args: { tone: "warning", children: "PENDING" } };
export const Error: Story = { args: { tone: "error", children: "VETOED" } };
export const Info: Story = { args: { tone: "info", children: "EXECUTING" } };
export const AllTones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge tone="neutral">ZOMBIE</Badge>
      <Badge tone="info">FRAGILE</Badge>
      <Badge tone="warning">ORDINAIRE</Badge>
      <Badge tone="success">FORTE</Badge>
      <Badge tone="accent">CULTE</Badge>
      <Badge tone="warning" variant="outline">ICONE</Badge>
    </div>
  ),
};
