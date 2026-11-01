import assert from "node:assert/strict";
import test from "node:test";
import { createRng, mixSeed } from "../src/core/rng.js";

test("same seed replays the same stream", () => {
  const a = createRng(1);
  const b = createRng(1);
  const first = [0.627073940588, 0.00273572118, 0.52744703996, 0.981050967472, 0.968377898214];
  for (let i = 0; i < first.length; i++) {
    const av = a.next();
    const bv = b.next();
    assert.equal(av, bv);
    assert.ok(Math.abs(av - first[i]) < 1e-9);
    assert.ok(av >= 0 && av < 1);
  }
});

test("different seeds diverge and nextInt stays in range", () => {
  const a = createRng(1);
  const b = createRng(2);
  assert.notEqual(a.next(), b.next());
  const rng = createRng(99);
  for (let i = 0; i < 40; i++) {
    const value = rng.nextInt(3);
    assert.ok(value >= 0 && value < 3);
    assert.equal(value, Math.floor(value));
  }
});

test("mixSeed is stable and changes with the salt", () => {
  assert.equal(mixSeed(5, 1), mixSeed(5, 1));
  assert.notEqual(mixSeed(5, 1), mixSeed(5, 2));
  assert.equal(typeof mixSeed(5, 1), "number");
});
