/** Keyboard codes and Gamepad API snapshots → per-player actions. */

export const ACTIONS = ["left", "right", "up", "down", "action", "secondary"];

export const ACTION_LABELS = {
  left: "Left",
  right: "Right",
  up: "Up",
  down: "Down",
  action: "Hit",
  secondary: "Zap",
};

/** Keys that stay global: confirm, pause, mute. */
export const RESERVED_CODES = new Set(["Enter", "Escape", "KeyM"]);

/**
 * P1 WASD + F/G, P2 arrows + / ., P3 IJKL + ; ', P4 numpad 8456 + 0 / Enter.
 * `event.code` values, so the layout is physical-key based.
 */
export const DEFAULT_BINDINGS = [
  { left: "KeyA", right: "KeyD", up: "KeyW", down: "KeyS", action: "KeyF", secondary: "KeyG" },
  { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown", action: "Slash", secondary: "Period" },
  { left: "KeyJ", right: "KeyL", up: "KeyI", down: "KeyK", action: "Semicolon", secondary: "Quote" },
  { left: "Numpad4", right: "Numpad6", up: "Numpad8", down: "Numpad5", action: "Numpad0", secondary: "NumpadEnter" },
];

export function defaultBindings() {
  return DEFAULT_BINDINGS.map((row) => ({ ...row }));
}

export function emptySlot() {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    action: false,
    secondary: false,
    gamepad: false,
    start: false,
  };
}

export function emptyEdges() {
  return [0, 1, 2, 3].map(() => ({
    left: false,
    right: false,
    up: false,
    down: false,
    action: false,
    secondary: false,
  }));
}

function hasCode(codes, code) {
  if (!code) return false;
  if (typeof codes.has === "function") return codes.has(code);
  return !!codes[code];
}

export function keyboardHeld(bindings, codes) {
  return bindings.map((binding) => {
    const slot = emptySlot();
    for (const action of ACTIONS) {
      if (hasCode(codes, binding[action])) slot[action] = true;
    }
    return slot;
  });
}

/**
 * Standard gamepad: button 0 A, 1 B, 9 Start, 12-15 D-pad.
 * Axes 0 and 1 are the left stick. Accepts a real Gamepad or a plain mock.
 */
export function readStandardGamepad(gamepad) {
  const pressed = (index) => {
    const button = gamepad.buttons?.[index];
    if (!button) return false;
    return typeof button === "object" ? !!button.pressed : !!button;
  };
  return {
    axes: [gamepad.axes?.[0] ?? 0, gamepad.axes?.[1] ?? 0],
    buttons: {
      a: pressed(0),
      b: pressed(1),
      start: pressed(9),
      dpadUp: pressed(12),
      dpadDown: pressed(13),
      dpadLeft: pressed(14),
      dpadRight: pressed(15),
    },
  };
}

/**
 * A connected pad replaces that player's keyboard slot entirely,
 * including when the pad is idle (hot-plug / hot-unplug).
 */
export function applyGamepadOverride(held, pads) {
  return held.map((slot, index) => {
    const pad = pads?.[index];
    if (!pad) return { ...slot, gamepad: false, start: false };
    const x = pad.axes?.[0] ?? 0;
    const y = pad.axes?.[1] ?? 0;
    const buttons = pad.buttons || {};
    return {
      left: !!(buttons.dpadLeft || x < -0.5),
      right: !!(buttons.dpadRight || x > 0.5),
      up: !!(buttons.dpadUp || y < -0.5),
      down: !!(buttons.dpadDown || y > 0.5),
      action: !!buttons.a,
      secondary: !!buttons.b,
      gamepad: true,
      start: !!buttons.start,
    };
  });
}

export function edgesFrom(prev, next) {
  return next.map((slot, index) => {
    const before = prev?.[index] || emptySlot();
    const edge = {};
    for (const action of ACTIONS) edge[action] = !!slot[action] && !before[action];
    return edge;
  });
}

export function findBinding(bindings, code) {
  for (let player = 0; player < bindings.length; player++) {
    const row = bindings[player];
    for (const action of ACTIONS) {
      if (row[action] === code) return { player, action };
    }
  }
  return null;
}

const CODE_LABELS = {
  Slash: "/",
  Period: ".",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Backquote: "`",
  Space: "Space",
  NumpadEnter: "Num Enter",
  NumpadAdd: "Num +",
  NumpadSubtract: "Num -",
  NumpadMultiply: "Num *",
  NumpadDivide: "Num /",
  NumpadDecimal: "Num .",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ShiftLeft: "L Shift",
  ShiftRight: "R Shift",
  ControlLeft: "L Ctrl",
  ControlRight: "R Ctrl",
  AltLeft: "L Alt",
  AltRight: "R Alt",
};

export function formatCode(code) {
  if (!code) return "—";
  if (CODE_LABELS[code]) return CODE_LABELS[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  return code;
}
