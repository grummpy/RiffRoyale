import assert from "node:assert/strict";
import test from "node:test";
import { generateChart } from "../src/core/chart.js";

const base = { seed: 7, bpm: 120, beats: 16, density: 1, startBeat: 4, sparkChance: 0 };

test("charts are deterministic and sit on the BPM grid", () => {
  const a = generateChart(base);
  const b = generateChart(base);
  assert.deepEqual(a, b);
  assert.equal(a.beatMs, 500);
  assert.equal(a.durationMs, 8000);
  assert.ok(a.notes.length > 0);
  assert.equal(a.notes[0].timeMs, 4 * a.beatMs);
  for (let i = 0; i < a.notes.length; i++) {
    const note = a.notes[i];
    assert.ok(note.lane >= 0 && note.lane <= 2);
    assert.equal(note.kind, "note");
    assert.equal(note.judged, null);
    const steps = note.timeMs / a.beatMs;
    assert.ok(Math.abs(steps * 2 - Math.round(steps * 2)) < 1e-9);
    if (i > 0) assert.ok(note.timeMs >= a.notes[i - 1].timeMs);
  }
});

test("each player gets a different part and spark chance is honored", () => {
  const parts = [0, 1, 2, 3].map((playerIndex) =>
    generateChart({ ...base, beats: 32, playerIndex }).notes.map((note) => note.lane).join(""),
  );
  assert.equal(new Set(parts).size, 4);
  const sparks = generateChart({ ...base, sparkChance: 1 });
  assert.ok(sparks.notes.every((note) => note.kind === "spark"));
  const empty = generateChart({ ...base, density: 0 });
  assert.equal(empty.notes.length, 0);
});
