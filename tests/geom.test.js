import assert from "node:assert/strict";
import test from "node:test";
import { highwayLayout, moveLane, noteBox, noteHitsReceptor, receptorBox, rectsOverlap } from "../src/core/geom.js";

const layout = highwayLayout(0);

function player(lane, extra = {}) {
  return { lane, laneShift: 0, speedMul: 1, ...extra };
}

function note(lane, timeMs, kind = "note") {
  return { lane, timeMs, kind, player: 0, judged: null };
}

test("lane movement clamps inside the highway", () => {
  assert.equal(moveLane(1, -1), 0);
  assert.equal(moveLane(0, -1), 0);
  assert.equal(moveLane(1, 1), 2);
  assert.equal(moveLane(2, 1), 2);
});

test("a note on the hit line collides only with the matching receptor", () => {
  const onTime = note(1, 1000);
  const who = player(1);
  assert.equal(noteHitsReceptor(onTime, who, 1000, layout), true);
  assert.equal(rectsOverlap(noteBox(onTime, who, 1000, layout), receptorBox(who, layout)), true);
  assert.equal(noteHitsReceptor(onTime, player(0), 1000, layout), false);
  assert.equal(noteHitsReceptor(onTime, who, 1000 - layout.approachMs, layout), false);
});

test("scramble shifts the lane a note occupies", () => {
  const onTime = note(0, 1000);
  const shifted = player(1, { laneShift: 1 });
  const box = noteBox(onTime, shifted, 1000, layout);
  assert.equal(box.visualLane, 1);
  assert.equal(noteHitsReceptor(onTime, shifted, 1000, layout), true);
  assert.equal(noteHitsReceptor(onTime, player(0, { laneShift: 1 }), 1000, layout), false);
});

test("a faster highway covers more pixels per millisecond", () => {
  const falling = note(1, 2000);
  const songMs = 1200;
  const slowA = noteBox(falling, player(1, { speedMul: 1 }), songMs, layout);
  const slowB = noteBox(falling, player(1, { speedMul: 1 }), songMs + 100, layout);
  const fastA = noteBox(falling, player(1, { speedMul: 2 }), songMs, layout);
  const fastB = noteBox(falling, player(1, { speedMul: 2 }), songMs + 100, layout);
  const slowDy = slowB.y - slowA.y;
  const fastDy = fastB.y - fastA.y;
  assert.ok(fastDy > slowDy);
  assert.ok(fastA.y < slowA.y);
});

test("separated rectangles do not overlap", () => {
  assert.equal(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }), false);
  assert.equal(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 4, h: 4 }), true);
});
