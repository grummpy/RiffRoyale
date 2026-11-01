import assert from "node:assert/strict";
import test from "node:test";
import { defaultBindings } from "../src/core/input.js";
import { defaultSettings, sanitizeSettings } from "../src/ui/storage.js";

test("settings fall back when storage is junk, and keep a valid remap", () => {
  const fresh = defaultSettings();
  assert.equal(fresh.rounds, 3);
  assert.equal(fresh.volume, 0.8);
  assert.deepEqual(fresh.bindings, defaultBindings());
  assert.deepEqual(sanitizeSettings(null), fresh);
  assert.equal(sanitizeSettings({ volume: 4, rounds: 9, muted: 1 }).volume, 1);
  assert.equal(sanitizeSettings({ rounds: 2 }).rounds, 3);
  assert.equal(sanitizeSettings({ rounds: 5 }).rounds, 5);
  assert.equal(sanitizeSettings({ muted: true }).muted, true);

  const bindings = defaultBindings();
  bindings[0].action = "KeyQ";
  const saved = sanitizeSettings({ volume: 0.2, rounds: 1, bindings });
  assert.equal(saved.bindings[0].action, "KeyQ");
  assert.equal(saved.rounds, 1);

  bindings[1].action = "KeyQ";
  assert.equal(sanitizeSettings({ bindings }).bindings[0].action, "KeyF");
});
