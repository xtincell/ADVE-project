// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DeliverySettingsView } from "@/domain/delivery-settings";

const state = vi.hoisted(() => ({
  role: "ADMIN", sessionStatus: "authenticated", loading: false, pending: false, error: null as Error | null,
  view: undefined as DeliverySettingsView | undefined,
  query: vi.fn(), save: vi.fn(), setData: vi.fn(), refetch: vi.fn(),
}));
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: state.sessionStatus, data: { user: { role: state.role } } }) }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  useUtils: () => ({ systemConfig: { getDeliverySettings: { setData: state.setData } } }),
  systemConfig: {
    getDeliverySettings: { useQuery: (...args: unknown[]) => {
      state.query(...args);
      return { data: state.view, isLoading: state.loading, error: state.error, refetch: state.refetch };
    } },
    saveDeliverySettings: { useMutation: () => ({ mutateAsync: state.save, isPending: state.pending }) },
  },
} }));
import { DeliverySettingsPanel } from "@/components/config/delivery-settings-panel";

function fixture(): DeliverySettingsView {
  const absent = { configured: false, source: "NONE" as const, overridden: false, readable: true };
  const fromEnv = { configured: true, source: "ENV" as const, overridden: false, readable: true };
  return { vaultAvailable: true,
    email: { provider: "ENV", from: null, mailgunDomain: null, mailgunRegion: "us", apiKey: absent, status: "MISSING", verified: false },
    cinetpay: { mode: "LIVE", apiKey: fromEnv, apiPassword: fromEnv, status: "CONFIGURED", verified: false, environmentValid: true },
  };
}
beforeEach(() => {
  vi.clearAllMocks(); state.role = "ADMIN"; state.sessionStatus = "authenticated";
  state.loading = false; state.pending = false; state.error = null; state.view = fixture();
  state.save.mockImplementation(async () => state.view);
});
afterEach(cleanup);

describe("email and payment configuration", () => {
  it("shows existing environment credentials without exposing or pre-filling secrets", () => {
    render(createElement(DeliverySettingsPanel));
    expect(screen.getByText("Renseigné · non vérifié")).toBeDefined();
    expect((screen.getByRole("option", { name: "Sélection automatique" }) as HTMLOptionElement).value).toBe("ENV");
    expect(screen.getAllByText("Secret présent dans la configuration du serveur.")).toHaveLength(2);
    for (const label of ["Clé API email", "Clé API CinetPay", "Mot de passe API CinetPay"]) {
      const input = screen.getByLabelText(label) as HTMLInputElement;
      expect(input.type).toBe("password"); expect(input.value).toBe("");
    }
    expect(screen.queryByText(/Site ID/i)).toBeNull();
  });
  it.each(["OPERATOR", "USER"])("does not query or expose the admin form to %s", role => {
    state.role = role; render(createElement(DeliverySettingsPanel));
    expect(state.query).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: false }));
    expect(screen.queryByRole("form")).toBeNull();
    expect(screen.getByText("Ces paramètres sont réservés aux administrateurs.")).toBeDefined();
  });
  it("waits for session and configuration loading before editing", () => {
    state.sessionStatus = "loading";
    const { rerender } = render(createElement(DeliverySettingsPanel));
    expect(state.query).toHaveBeenLastCalledWith(undefined, expect.objectContaining({ enabled: false }));
    expect(screen.queryByRole("form")).toBeNull();
    state.sessionStatus = "authenticated"; state.loading = true; rerender(createElement(DeliverySettingsPanel));
    expect(screen.getByRole("status").textContent).toContain("Chargement des paramètres");
    expect(screen.queryByRole("form")).toBeNull();
  });
  it("offers retry after a read error without rendering empty settings as saved state", () => {
    state.error = new Error("Lecture indisponible"); render(createElement(DeliverySettingsPanel));
    expect(screen.getByRole("alert").textContent).toContain("Lecture indisponible");
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(state.refetch).toHaveBeenCalledOnce();
    expect(screen.queryByRole("form")).toBeNull();
  });
  it("saves an incomplete email draft without touching active CinetPay settings", async () => {
    render(createElement(DeliverySettingsPanel));
    fireEvent.change(screen.getByLabelText("Fournisseur email"), { target: { value: "RESEND" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer l’email" }));
    await waitFor(() => expect(state.save).toHaveBeenCalledOnce());
    expect(state.save).toHaveBeenCalledWith({ email: { provider: "RESEND", from: null, mailgunDomain: null, mailgunRegion: "us", apiKey: { action: "KEEP" } } });
    expect(screen.getByText("Brouillon email enregistré. Vous pourrez le compléter plus tard.")).toBeDefined();
  });
  it("keeps both payment secrets and the active mode when fields are blank", async () => {
    render(createElement(DeliverySettingsPanel));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer CinetPay" }));
    await waitFor(() => expect(state.save).toHaveBeenCalledWith({ cinetpay: {
      mode: "LIVE", apiKey: { action: "KEEP" }, apiPassword: { action: "KEEP" },
    } }));
  });
  it("validates the sender inline while retaining the draft", async () => {
    render(createElement(DeliverySettingsPanel));
    fireEvent.change(screen.getByLabelText("Expéditeur"), { target: { value: "adresse-invalide" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer l’email" }));
    expect(state.save).not.toHaveBeenCalled();
    expect(screen.getByText("Adresse expéditeur invalide.")).toBeDefined();
    expect(screen.getByLabelText("Expéditeur").getAttribute("aria-invalid")).toBe("true");
    expect((screen.getByLabelText("Expéditeur") as HTMLInputElement).value).toBe("adresse-invalide");
  });
  it("replaces a typed key only and clears its local input after success", async () => {
    render(createElement(DeliverySettingsPanel));
    fireEvent.change(screen.getByLabelText("Clé API CinetPay"), { target: { value: " new-fixture-key " } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer CinetPay" }));
    await waitFor(() => expect((screen.getByLabelText("Clé API CinetPay") as HTMLInputElement).value).toBe(""));
    expect(state.save).toHaveBeenCalledWith({ cinetpay: { mode: "LIVE", apiKey: { action: "REPLACE", value: "new-fixture-key" }, apiPassword: { action: "KEEP" } } });
    expect(screen.queryByText("new-fixture-key")).toBeNull();
  });
  it("requires an explicit pending removal and supports cancelling it before save", async () => {
    render(createElement(DeliverySettingsPanel));
    const payment = within(screen.getByRole("form", { name: "Paiements CinetPay" }));
    fireEvent.click(payment.getAllByRole("button", { name: "Effacer ce secret" })[0]!);
    expect(state.save).not.toHaveBeenCalled();
    expect(payment.getByText(/Ce secret sera effacé/)).toBeDefined();
    fireEvent.click(payment.getByRole("button", { name: "Annuler ce changement" }));
    fireEvent.click(payment.getAllByRole("button", { name: "Effacer ce secret" })[0]!);
    fireEvent.click(payment.getByRole("button", { name: "Enregistrer CinetPay" }));
    await waitFor(() => expect(state.save).toHaveBeenCalledWith({ cinetpay: { mode: "LIVE", apiKey: { action: "CLEAR" }, apiPassword: { action: "KEEP" } } }));
  });
  it("can explicitly restore the server configuration for an overridden secret", async () => {
    state.view!.cinetpay.apiKey = { configured: true, source: "DATABASE", overridden: true, readable: true };
    render(createElement(DeliverySettingsPanel));
    fireEvent.click(screen.getByRole("button", { name: "Utiliser la configuration du serveur" }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer CinetPay" }));
    await waitFor(() => expect(state.save).toHaveBeenCalledWith({ cinetpay: { mode: "LIVE", apiKey: { action: "USE_ENV" }, apiPassword: { action: "KEEP" } } }));
  });
  it("preserves editable non-secret drafts when secure storage is unavailable", () => {
    state.view!.vaultAvailable = false; render(createElement(DeliverySettingsPanel));
    expect((screen.getByLabelText("Clé API CinetPay") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Expéditeur") as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Enregistrer l’email" }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("distinguishes an unreadable saved secret from a cleared or missing one", () => {
    state.view!.cinetpay.apiKey = { configured: false, source: "DATABASE", overridden: true, readable: false };
    render(createElement(DeliverySettingsPanel));
    expect(screen.getByText("Secret enregistré, mais sa lecture est indisponible.")).toBeDefined();
    expect(screen.queryByText("Secret désactivé dans la console.")).toBeNull();
  });
  it("does not attribute the current provider's saved key to a different draft provider", () => {
    state.view!.email.provider = "RESEND";
    state.view!.email.apiKey = { configured: true, source: "ENV", overridden: false, readable: true };
    render(createElement(DeliverySettingsPanel));
    fireEvent.change(screen.getByLabelText("Fournisseur email"), { target: { value: "BREVO" } });
    expect(screen.getByText("Le statut de cette clé sera actualisé après l’enregistrement du fournisseur.")).toBeDefined();
    const emailForm = within(screen.getByRole("form", { name: "Emails transactionnels" }));
    expect(emailForm.queryByText("Secret présent dans la configuration du serveur.")).toBeNull();
  });
  it("keeps user input after a save error and reports the failure inline", async () => {
    state.save.mockRejectedValue(new Error("Enregistrement indisponible")); render(createElement(DeliverySettingsPanel));
    fireEvent.change(screen.getByLabelText("Clé API CinetPay"), { target: { value: "local-fixture-secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer CinetPay" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Enregistrement indisponible"));
    expect((screen.getByLabelText("Clé API CinetPay") as HTMLInputElement).value).toBe("local-fixture-secret");
    expect(screen.queryByText("local-fixture-secret")).toBeNull();
  });
  it("disables repeated writes while the request is pending", () => {
    state.pending = true; render(createElement(DeliverySettingsPanel));
    const buttons = screen.getAllByRole("button", { name: "Enregistrement…" });
    for (const button of buttons) expect((button as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("Clé API CinetPay") as HTMLInputElement).disabled).toBe(true);
  });
});
