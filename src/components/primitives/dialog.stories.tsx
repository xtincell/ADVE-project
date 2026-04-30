import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Dialog, DialogFooter } from "./dialog";
import { Button } from "./button";

const meta: Meta<typeof Dialog> = {
  title: "Primitives/Dialog",
  component: Dialog,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof Dialog>;

export const Confirm: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open dialog</Button>
        <Dialog
          open={open}
          onOpenChange={setOpen}
          size="sm"
          title="Compenser cet Intent ?"
          description="Action irréversible — un COMPENSATING_INTENT sera émis."
        >
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={() => setOpen(false)}>Compenser</Button>
          </DialogFooter>
        </Dialog>
      </>
    );
  },
};
