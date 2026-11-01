import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_BINDINGS,
  applyGamepadOverride,
  edgesFrom,
  emptySlot,
  findBinding,
  formatCode,
  keyboardHeld,
  readStandardGamepad,
} from "../src/core/input.js";

const SPEC = [
  ["KeyA", 0, "left"],
  ["KeyD", 0, "right"],
  ["KeyW", 0, "up"],
  ["KeyS", 0, "down"],
  ["KeyF", 0, "action"],
  ["KeyG", 0, "secondary"],
  ["ArrowLeft", 1, "left"],
  ["ArrowRight", 1, "right"],
  ["ArrowUp", 1, "up"],
  ["ArrowDown", 1, "down"],
  ["Slash", 1, "action"],
  ["Period", 1, "secondary"],
  ["KeyJ", 2, "left"],
  ["KeyL", 2, "right"],
  ["KeyI", 2, "up"],
  ["KeyK", 2, "down"],
  ["Semicolon", 2, "action"],
  ["Quote", 2, "secondary"],
  ["Numpad4", 3, "left"],
  ["Numpad6", 3, "right"],
  ["Numpad8", 3, "up"],
  ["Numpad5", 3, "down"],
  ["Numpad0", 3, "action"],
  ["NumpadEnter", 3, "secondary"],
];

test("default keyboard bindings match the four-player split", () => {
  for (const [code, player, action] of SPEC) {
    assert.deepEqual(findBinding(DEFAULT_BINDINGS, code), { player, action });
  }
  const held = keyboardHeld(DEFAULT_BINDINGS, new Set(["KeyF", "ArrowLeft", "Quote"]));
  assert.equal(held[0].action, true);
  assert.equal(held[0].left, false);
  assert.equal(held[1].left, true);
  assert.equal(held[2].secondary, true);
  assert.equal(held[3].action, false);
});

test("formatCode prints the keys players see", () => {
  assert.equal(formatCode("Slash"), "/");
  assert.equal(formatCode("Period"), ".");
  assert.equal(formatCode("Semicolon"), ";");
  assert.equal(formatCode("Quote"), "'");
  assert.equal(formatCode("Numpad0"), "Num 0");
  assert.equal(formatCode("NumpadEnter"), "Num Enter");
  assert.equal(formatCode("KeyF"), "F");
});

test("a connected pad overrides that player and leaves the others on keys", () => {
  const pad = readStandardGamepad({
    axes: [-0.9, 0.1],
    buttons: {
      0: { pressed: true },
      1: { pressed: false },
      9: { pressed: true },
      12: { pressed: false },
      13: { pressed: false },
      14: { pressed: false },
      15: { pressed: false },
    },
  });
  assert.equal(pad.buttons.a, true);
  assert.equal(pad.buttons.start, true);
  const keyboard = keyboardHeld(DEFAULT_BINDINGS, new Set(["KeyD", "ArrowUp"]));
  const merged = applyGamepadOverride(keyboard, [pad, null, null, null]);
  assert.equal(merged[0].gamepad, true);
  assert.equal(merged[0].left, true);
  assert.equal(merged[0].right, false);
  assert.equal(merged[0].action, true);
  assert.equal(merged[0].secondary, false);
  assert.equal(merged[0].start, true);
  assert.equal(merged[1].up, true);
  assert.equal(merged[1].gamepad, false);
});

test("dpad and rising edges map to a single action press", () => {
  const pad = readStandardGamepad({
    axes: [0, 0],
    buttons: [{ pressed: false }, { pressed: true }, {}, {}, {}, {}, {}, {}, {}, { pressed: false }, {}, {}, { pressed: true }],
  });
  const held = applyGamepadOverride([emptySlot(), emptySlot(), emptySlot(), emptySlot()], [pad, null, null, null]);
  assert.equal(held[0].up, true);
  assert.equal(held[0].secondary, true);
  const idle = [emptySlot(), emptySlot(), emptySlot(), emptySlot()];
  const edges = edgesFrom(idle, held);
  assert.equal(edges[0].up, true);
  assert.equal(edges[0].secondary, true);
  assert.equal(edgesFrom(held, held)[0].up, false);
});
