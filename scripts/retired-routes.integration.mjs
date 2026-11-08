// Run after npm run build: node --test scripts/retired-routes.integration.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";

test("retired public routes return 404 in the production server", { timeout: 60_000 }, async (t) => {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "0"], {
    cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NO_COLOR: "1" },
  });
  const exited = once(child, "exit");
  t.after(async () => {
    if (child.exitCode === null) child.kill();
    await exited;
  });
  let output = "";
  child.stdout.on("data", (data) => { output += data.toString(); });
  child.stderr.on("data", (data) => { output += data.toString(); });
  const deadline = Date.now() + 45_000;
  let base;
  while (Date.now() < deadline) {
    assert.equal(child.exitCode, null, "Production server exited before readiness");
    base = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
    if (base && /Ready in/.test(output)) break;
    await delay(100);
  }
  assert.ok(base && /Ready in/.test(output), "Production server did not become ready");
  for (const path of ["/firebase-test", "/firebase-test/", "/set-password", "/set-password/"]) {
    await t.test(path, async () => {
      const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(10_000) });
      assert.equal(response.status, 404);
    });
  }
  const home = await fetch(base, { signal: AbortSignal.timeout(10_000) });
  assert.equal(home.status, 200, "The application entry point remains available");
});
