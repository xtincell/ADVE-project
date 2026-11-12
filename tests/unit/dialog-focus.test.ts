// @vitest-environment jsdom
import React, { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Dialog } from "@/components/primitives/dialog";

afterEach(() => { cleanup(); vi.useRealTimers(); });

it("keeps focus through controlled typing with an inline close callback, then restores the trigger", async () => {
  vi.useFakeTimers();
  function Form() {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState("");
    return React.createElement(React.Fragment, null,
      React.createElement("button", { onClick: () => setOpen(true) }, "Retour"),
      React.createElement(Dialog, { open, onOpenChange: (next) => setOpen(next), title: "Votre retour" },
        React.createElement("textarea", { "aria-label": "Message", value, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value) })));
  }
  render(React.createElement(Form));
  const trigger = screen.getByRole("button", { name: "Retour" });
  trigger.focus(); fireEvent.click(trigger);
  await act(() => vi.runAllTimersAsync());
  const input = screen.getByRole("textbox"); input.focus();
  for (const value of ["B", "Bo", "Bonjour"]) {
    fireEvent.change(input, { target: { value } });
    await act(() => vi.runAllTimersAsync());
    expect(document.activeElement).toBe(input);
  }
  fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
