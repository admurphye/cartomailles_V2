// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listener: undefined as undefined | ((user: { uid: string } | null) => void),
  unsubscribe: vi.fn(), login: vi.fn(), logout: vi.fn(), reset: vi.fn(),
}));
vi.mock("../lib/firebase", () => ({ auth: { name: "mock-auth" }, isFirebaseConfigured: true }));
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth: unknown, listener: typeof mocks.listener) => {
    mocks.listener = listener;
    return mocks.unsubscribe;
  },
  signInWithEmailAndPassword: mocks.login,
  signOut: mocks.logout,
  sendPasswordResetEmail: mocks.reset,
}));
import PasswordGate from "./PasswordGate";

let container: HTMLDivElement;
let root: Root;
async function session(user: { uid: string } | null) {
  await act(async () => { mocks.listener!(user); });
}
async function input(id: string, value: string) {
  await act(async () => {
    const element = container.querySelector<HTMLInputElement>(`#${id}`)!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("React", React);
  mocks.login.mockResolvedValue({});
  mocks.logout.mockResolvedValue(undefined);
  mocks.reset.mockResolvedValue(undefined);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root.render(<PasswordGate><div data-editor>Editor</div></PasswordGate>); });
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove();
  vi.unstubAllGlobals();
});

describe("Firebase login independently of retired routes", () => {
  it("waits for Firebase and hides the editor when signed out", async () => {
    expect(container.querySelector("[data-editor]")).toBeNull();
    await session(null);
    expect(container.querySelector("form")).not.toBeNull();
    expect(container.querySelector("[data-editor]")).toBeNull();
  });
  it("signs in with Firebase and opens the editor only after the auth callback", async () => {
    await session(null);
    await input("email", "member@example.invalid");
    await input("password", "test-password");
    await act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(mocks.login).toHaveBeenCalledWith(expect.anything(), "member@example.invalid", "test-password");
    expect(container.querySelector("[data-editor]")).toBeNull();
    await session({ uid: "test-user" });
    expect(container.querySelector("[data-editor]")).not.toBeNull();
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
});
