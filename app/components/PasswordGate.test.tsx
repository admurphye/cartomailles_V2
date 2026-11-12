// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listener: undefined as undefined | ((user: { uid: string; getIdToken: () => Promise<string> } | null) => void),
  unsubscribe: vi.fn(), login: vi.fn(), logout: vi.fn(), reset: vi.fn(), signup: vi.fn(), token: vi.fn(), fetch: vi.fn(),
}));
vi.mock("../lib/firebase", () => ({ auth: { name: "mock-auth" }, isFirebaseConfigured: true }));
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth: unknown, listener: typeof mocks.listener) => {
    mocks.listener = listener;
    return mocks.unsubscribe;
  },
  signInWithEmailAndPassword: mocks.login,
  createUserWithEmailAndPassword: mocks.signup,
  signOut: mocks.logout,
  sendPasswordResetEmail: mocks.reset,
}));
import PasswordGate from "./PasswordGate";

let container: HTMLDivElement;
let root: Root;
async function session(user: { uid: string } | null) {
  await act(async () => { mocks.listener!(user ? { ...user, getIdToken: mocks.token } : null); });
}
async function input(id: string, value: string) {
  await act(async () => {
    const element = container.querySelector<HTMLInputElement>(`#${id}`)!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
beforeEach(async () => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("React", React);
  mocks.login.mockResolvedValue({});
  mocks.logout.mockResolvedValue(undefined);
  mocks.reset.mockResolvedValue(undefined);
  mocks.signup.mockResolvedValue({}); mocks.token.mockResolvedValue("firebase-test-token");
  mocks.fetch.mockImplementation(async () => new Response(JSON.stringify({ authorized: false, status: "subscription_required" }), { status: 403 }));
  vi.stubGlobal("fetch", mocks.fetch);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root.render(<PasswordGate><div data-editor>Editor</div></PasswordGate>); });
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Firebase login independently of retired routes", () => {
  it("waits for Firebase and hides the editor when signed out", async () => {
    expect(container.querySelector("[data-editor]")).toBeNull();
    await session(null);
    expect(container.querySelector("form")).not.toBeNull();
    expect(container.querySelector("[data-editor]")).toBeNull();
  });
  it("signs in with Firebase and opens the editor only after the server grants access", async () => {
    mocks.fetch.mockImplementation(async () => new Response(JSON.stringify({ authorized: true, validUntil: Date.now() + 3600000 })));
    await session(null);
    await input("email", "member@example.invalid");
    await input("password", "test-password");
    await act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(mocks.login).toHaveBeenCalledWith(expect.anything(), "member@example.invalid", "test-password");
    expect(container.querySelector("[data-editor]")).toBeNull();
    await session({ uid: "test-user" });
    expect(container.querySelector("[data-editor]")).not.toBeNull();
    expect(mocks.fetch).toHaveBeenCalledWith("/api/billing/access", expect.objectContaining({ cache: "no-store", headers: { Authorization: "Bearer firebase-test-token" } }));
    await act(async () => { container.querySelector<HTMLButtonElement>("button")!.click(); });
    expect(mocks.logout).toHaveBeenCalledOnce();
    await session(null);
    expect(container.querySelector("[data-editor]")).toBeNull();
  });
  it("keeps the editor closed after a rejected login", async () => {
    mocks.login.mockRejectedValue(new Error("rejected"));
    await session(null);
    await act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(container.querySelector("[role=alert]")).not.toBeNull();
    expect(container.querySelector("[data-editor]")).toBeNull();
  });
  it("uses Firebase password reset without the retired Supabase page", async () => {
    await session(null);
    await input("email", "member@example.invalid");
    await act(async () => { container.querySelector<HTMLButtonElement>('button[type="button"]')!.click(); });
    expect(mocks.reset).toHaveBeenCalledWith(expect.anything(), "member@example.invalid");
    expect(container.querySelector("[role=status]")).not.toBeNull();
  });
  it("creates an account without granting subscription access", async () => {
    await session(null);
    await act(async () => { [...container.querySelectorAll("button")].find((button) => button.textContent === "Créer un compte")!.click(); });
    await input("email", "new@example.invalid"); await input("password", "test-password");
    expect(container.querySelector<HTMLInputElement>("#password")!.autocomplete).toBe("new-password");
    await act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(mocks.signup).toHaveBeenCalledWith(expect.anything(), "new@example.invalid", "test-password");
    expect(mocks.login).not.toHaveBeenCalled();
    await session({ uid: "new-user" });
    expect(container.querySelector("[data-editor]")).toBeNull();
    expect(container.textContent).toContain("Un abonnement est nécessaire");
    expect([...container.querySelectorAll("button")].find((button) => button.textContent?.includes("S’abonner"))!.disabled).toBe(true);
  });
  it("shows a technical failure instead of claiming a subscription is missing", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ authorized: false, status: "unavailable" }), { status: 503 }));
    await session({ uid: "member" });
    expect(container.querySelector("[data-editor]")).toBeNull();
    expect(container.textContent).toContain("Vérification indisponible");
    expect(container.querySelector("[role=alert]")).not.toBeNull();
  });
  it("does not accept stale access responses after logout or a user change", async () => {
    let resolve!: (response: Response) => void;
    mocks.fetch.mockReturnValueOnce(new Promise((finish) => { resolve = finish; }));
    await session({ uid: "previous-user" });
    await session({ uid: "other-user" });
    await act(async () => { resolve(new Response(JSON.stringify({ authorized: true, validUntil: Date.now() + 3600000 }))); });
    expect(container.querySelector("[data-editor]")).toBeNull();
    expect(container.textContent).toContain("Un abonnement est nécessaire");
    await session(null);
    expect(container.querySelector("form")).not.toBeNull();
  });
  it("ignores a Checkout success parameter and fails closed on malformed responses", async () => {
    window.history.replaceState({}, "", "/?checkout=success");
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ authorized: true })));
    await session({ uid: "member" });
    expect(container.querySelector("[data-editor]")).toBeNull();
    window.history.replaceState({}, "", "/");
  });
  it("closes the editor at expiry even while the renewal check is pending", async () => {
    vi.useFakeTimers();
    mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ authorized: true, validUntil: Date.now() + 1000 })));
    mocks.fetch.mockImplementationOnce(() => new Promise(() => {}));
    await session({ uid: "member" });
    expect(container.querySelector("[data-editor]")).not.toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(container.querySelector("[data-editor]")).toBeNull();
    expect(container.textContent).toContain("Chargement de Cartomailles");
  });
  it("bounds a stalled token request and permits retry", async () => {
    vi.useFakeTimers();
    mocks.token.mockReturnValueOnce(new Promise(() => {}));
    await session({ uid: "member" });
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(container.querySelector("[role=alert]")).not.toBeNull();
    expect(container.querySelector("[data-editor]")).toBeNull();
    await act(async () => { [...container.querySelectorAll("button")].find((button) => button.textContent === "Vérifier à nouveau")!.click(); });
    expect(container.textContent).toContain("Un abonnement est nécessaire");
  });

  it("explains an expired or revoked session without showing subscription checkout", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ authorized: false, status: "unauthenticated" }), { status: 401 }));
    await session({ uid: "member" });
    expect(container.querySelector("[data-editor]")).toBeNull();
    expect(container.querySelector("[role=alert]")?.textContent).toContain("session a expiré ou a été révoquée");
    expect(container.textContent).not.toContain("S’abonner");
  });

  it("revokes access on the periodic server check", async () => {
    vi.useFakeTimers();
    mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ authorized: true, validUntil: Date.now() + 3600000 })));
    await session({ uid: "member" });
    expect(container.querySelector("[data-editor]")).not.toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60_000); });
    expect(container.querySelector("[data-editor]")).toBeNull();
    expect(container.textContent).toContain("Un abonnement est nécessaire");
  });

  it("recovers from a network failure only after a fresh server grant", async () => {
    mocks.fetch.mockRejectedValueOnce(new TypeError("network unavailable"));
    await session({ uid: "member" });
    expect(container.querySelector("[data-editor]")).toBeNull();
    expect(container.querySelector("[role=alert]")).not.toBeNull();
    mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ authorized: true, validUntil: Date.now() + 3600000 })));
    await act(async () => { [...container.querySelectorAll("button")].find((button) => button.textContent === "Vérifier à nouveau")!.click(); });
    expect(container.querySelector("[data-editor]")).not.toBeNull();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
});
