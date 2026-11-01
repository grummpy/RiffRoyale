import {
  ACTIONS,
  applyGamepadOverride,
  edgesFrom,
  emptyEdges,
  emptySlot,
  findBinding,
  keyboardHeld,
  readStandardGamepad,
} from "../core/input.js";

const MOVE = ["left", "right", "up", "down"];

/**
 * Keyboard + Gamepad API. A connected pad (index 0-3) overrides that
 * player's keys until it disconnects. Movement keys repeat after a short hold.
 */
export function createInput(getBindings) {
  const down = new Set();
  let prevHeld = [emptySlot(), emptySlot(), emptySlot(), emptySlot()];
  let prevConfirm = false;
  let prevEscape = false;
  let prevMute = false;
  let prevPadStart = false;
  let capture = null;
  const heldSince = new Map();
  // Rising edges are recorded on keydown so a tap that ends before the
  // next 60 Hz poll is not lost.
  let latched = emptyEdges();
  let latchedConfirm = false;
  let latchedEscape = false;
  let latchedMute = false;

  function latch(code) {
    if (code === "Enter" || code === "Space") latchedConfirm = true;
    else if (code === "Escape") latchedEscape = true;
    else if (code === "KeyM") latchedMute = true;
    const hit = findBinding(getBindings(), code);
    if (hit) latched[hit.player][hit.action] = true;
  }

  function takeLatched() {
    const edges = latched;
    const flags = { confirm: latchedConfirm, escape: latchedEscape, mute: latchedMute };
    latched = emptyEdges();
    latchedConfirm = false;
    latchedEscape = false;
    latchedMute = false;
    return { edges, flags };
  }

  function onKeyDown(event) {
    if (capture) {
      const fn = capture;
      capture = null;
      event.preventDefault();
      fn(event.code);
      return;
    }
    if (!down.has(event.code)) latch(event.code);
    down.add(event.code);
    if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.code.startsWith("F")) {
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    down.delete(event.code);
  }

  function onBlur() {
    down.clear();
    heldSince.clear();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  function readPads() {
    const pads = [null, null, null, null];
    if (typeof navigator === "undefined" || !navigator.getGamepads) return pads;
    const live = navigator.getGamepads();
    for (let i = 0; i < 4; i++) {
      const pad = live?.[i];
      if (pad && pad.connected) pads[i] = readStandardGamepad(pad);
    }
    return pads;
  }

  function poll() {
    const pads = readPads();
    const held = applyGamepadOverride(keyboardHeld(getBindings(), down), pads);
    const now = performance.now();
    for (let player = 0; player < 4; player++) {
      for (const action of MOVE) {
        const key = `${player}:${action}`;
        if (!held[player][action]) {
          heldSince.delete(key);
          continue;
        }
        const state = heldSince.get(key);
        if (!state) {
          heldSince.set(key, { at: now, fired: now });
        } else if (now - state.at > 200 && now - state.fired > 130) {
          prevHeld[player][action] = false;
          state.fired = now;
        }
      }
    }

    const pressed = takeLatched();
    const edges = edgesFrom(prevHeld, held);
    for (let player = 0; player < 4; player++) {
      if (held[player].gamepad) continue;
      for (const action of ACTIONS) {
        if (pressed.edges[player][action]) edges[player][action] = true;
      }
    }
    const confirmHeld = down.has("Enter") || down.has("Space");
    const escapeHeld = down.has("Escape");
    const muteHeld = down.has("KeyM");
    const padStart = held.some((slot) => slot.start);
    const sample = {
      held,
      edges,
      pads,
      confirmEdge: (confirmHeld && !prevConfirm) || pressed.flags.confirm,
      escapeEdge: (escapeHeld && !prevEscape) || pressed.flags.escape,
      muteEdge: (muteHeld && !prevMute) || pressed.flags.mute,
      padStartEdge: padStart && !prevPadStart,
    };
    prevHeld = held.map((slot) => ({ ...slot }));
    prevConfirm = confirmHeld;
    prevEscape = escapeHeld;
    prevMute = muteHeld;
    prevPadStart = padStart;
    return sample;
  }

  return {
    poll,
    setCapture(fn) {
      capture = fn;
      down.clear();
    },
    cancelCapture() {
      capture = null;
    },
  };
}
