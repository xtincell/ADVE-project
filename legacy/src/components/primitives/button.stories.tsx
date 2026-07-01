import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "Primitives/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["primary", "ghost", "outline", "subtle", "destructive", "link"] },
    size: { control: "select", options: ["sm", "md", "lg", "icon"] },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { variant: "primary", size: "md", children: "Diagnostiquer" } };
export const Ghost: Story = { args: { variant: "ghost", size: "md", children: "Lire le manifeste" } };
export const Outline: Story = { args: { variant: "outline", size: "md", children: "Voir détails" } };
export const Subtle: Story = { args: { variant: "subtle", size: "md", children: "Annuler" } };
export const Destructive: Story = { args: { variant: "destructive", size: "md", children: "Supprimer" } };
export const Link: Story = { args: { variant: "link", size: "md", children: "Voir plus →" } };
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
export const Loading: Story = { args: { loading: true, children: "Diagnostiquer" } };
export const Disabled: Story = { args: { disabled: true, children: "Disabled" } };
