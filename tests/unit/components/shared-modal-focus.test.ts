// @vitest-environment jsdom
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Modal } from "@/components/shared/modal";

beforeEach(() => { vi.stubGlobal("React", React); vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

function Form() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  return React.createElement(React.Fragment, null,
    React.createElement("button", {
      onClick: () => setOpen(true),
      onKeyDown: (event: React.KeyboardEvent) => { if (event.key === "Enter") setOpen(true); },
    }, "Lire"),
    React.createElement(Modal, { open, onClose: () => setOpen(false), title: "Lecture",
      children: React.createElement("textarea", { "aria-label": "Note", value,
        onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setValue(event.target.value) }),
    }));
}

async function openFromKeyboard() {
  const trigger = screen.getByRole("button", { name: "Lire" });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "Enter" });
  await act(() => vi.runAllTimersAsync());
  return trigger;
}

describe("shared Modal focus lifecycle", () => {
  it("opens from the focused trigger, traps Tab, and restores focus after Escape", async () => {
    render(React.createElement(Form));
    const trigger = await openFromKeyboard();
    const close = screen.getByRole("button", { name: "Fermer" });
    const note = screen.getByRole("textbox", { name: "Note" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(note);
    fireEvent.keyDown(note, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("keeps typing focus when the parent rerenders with a new inline close callback", async () => {
    render(React.createElement(Form));
    const trigger = await openFromKeyboard();
    const note = screen.getByRole("textbox", { name: "Note" });
    note.focus();
    for (const value of ["B", "Bo", "Bonjour"]) {
      fireEvent.change(note, { target: { value } });
      await act(() => vi.runAllTimersAsync());
      expect(document.activeElement).toBe(note);
    }
    fireEvent.keyDown(note, { key: "Escape" });
    expect(document.activeElement).toBe(trigger);
  });

  it("cancels pending initial focus when unmounted before the animation frame", async () => {
    const request = vi.spyOn(window, "requestAnimationFrame");
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    const view = render(React.createElement(Form));
    const trigger = screen.getByRole("button", { name: "Lire" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(request).toHaveBeenCalledOnce();
    const frame = request.mock.results[0]?.value;
    view.unmount();
    expect(cancel).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledWith(frame);
    await act(() => vi.runAllTimersAsync());
    expect(document.body.style.overflow).not.toBe("hidden");
    request.mockRestore();
    cancel.mockRestore();
  });
});
