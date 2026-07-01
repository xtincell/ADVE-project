import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta: Meta<typeof Input> = {
  title: "Primitives/Input",
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    state: { control: "select", options: ["default", "invalid", "valid"] },
    placeholder: { control: "text" },
  },
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { placeholder: "https://luxorhotels.ci" } };
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-2 w-80">
      <Input size="sm" placeholder="Small" />
      <Input size="md" placeholder="Medium" />
      <Input size="lg" placeholder="Large" />
    </div>
  ),
};
export const Invalid: Story = { args: { state: "invalid", placeholder: "URL incorrecte" } };
export const Valid: Story = { args: { state: "valid", defaultValue: "verified@brand.com" } };
export const Disabled: Story = { args: { disabled: true, defaultValue: "Read only" } };
