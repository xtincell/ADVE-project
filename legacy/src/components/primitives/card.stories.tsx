import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from "./card";
import { Button } from "./button";

const meta: Meta<typeof Card> = {
  title: "Primitives/Card",
  component: Card,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof Card>;

const Sample = (
  <>
    <CardHeader>
      <CardTitle>Mission KV — Luxor Hotels</CardTitle>
      <CardDescription>Brief Artemis · Pillar D · Distinction</CardDescription>
    </CardHeader>
    <CardBody>
      Diagnostiquez votre marque sur 8 dimensions. Score /200, radar, recommandations actionnables.
    </CardBody>
    <CardFooter>
      <Button variant="primary" size="sm">Lancer</Button>
      <Button variant="ghost" size="sm">Reporter</Button>
    </CardFooter>
  </>
);

export const Raised: Story = { args: { surface: "raised", children: Sample } };
export const Elevated: Story = { args: { surface: "elevated", children: Sample } };
export const Overlay: Story = { args: { surface: "overlay", children: Sample } };
export const Outlined: Story = { args: { surface: "outlined", children: Sample } };
export const Flat: Story = { args: { surface: "flat", children: Sample } };
export const Interactive: Story = { args: { surface: "raised", interactive: true, children: Sample } };
