// @vitest-environment jsdom
import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OvertonEntry } from "@/components/shared/overton-entry";
beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("optional entry positioning", () => {
  it("keeps all six zones visible and emits a declared frame only after the four choices", () => {
    const onChange = vi.fn();
    render(React.createElement(OvertonEntry, { brand: "Marque de recette", onChange }));
    expect(screen.getByRole("list", { name: "Les six zones d’acceptation" }).children).toHaveLength(6);
    fireEvent.change(screen.getByLabelText("Quelle idée voulez-vous rendre évidente ?"), { target: { value: "Une expérience crédible" } });
    fireEvent.change(screen.getByLabelText("Auprès de quel public ?"), { target: { value: "Mangeurs de recette" } });
    fireEvent.change(screen.getByLabelText("Votre point de départ"), { target: { value: "RADICAL" } });
    expect(onChange).toHaveBeenLastCalledWith(null);
    fireEvent.change(screen.getByLabelText("Votre cible"), { target: { value: "POPULAR" } });
    expect(onChange).toHaveBeenLastCalledWith({ statement: "Une expérience crédible", audience: "Mangeurs de recette", baselineZone: "RADICAL", targetZone: "POPULAR" });
    expect(screen.getByText("Radical · postulat déclaré")).toBeTruthy();
    expect(screen.queryByText(/soutien mesuré|score amélioré/)).toBeNull();
  });
});
