import { ACTIONS, defaultBindings } from "../core/input.js";
import { ROUND_CHOICES } from "../core/constants.js";

export const SETTINGS_KEY = "riffroyale-settings";

export function defaultSettings() {
  return {
    volume: 0.8,
    muted: false,
    rounds: 3,
    bindings: defaultBindings(),
  };
}

/** Drop anything that isn't a full, unique binding set. */
export function sanitizeSettings(raw) {
  const settings = defaultSettings();
  if (!raw || typeof raw !== "object") return settings;
  const volume = Number(raw.volume);
  if (Number.isFinite(volume)) settings.volume = Math.min(1, Math.max(0, volume));
  settings.muted = !!raw.muted;
  if (ROUND_CHOICES.includes(raw.rounds)) settings.rounds = raw.rounds;
  if (!Array.isArray(raw.bindings) || raw.bindings.length !== 4) return settings;

  const bindings = defaultBindings();
  const used = new Set();
  for (let player = 0; player < 4; player++) {
    const row = raw.bindings[player];
    if (!row || typeof row !== "object") return settings;
    for (const action of ACTIONS) {
      const code = row[action];
      if (typeof code !== "string" || code.length === 0 || used.has(code)) return settings;
      used.add(code);
      bindings[player][action] = code;
    }
  }
  settings.bindings = bindings;
  return settings;
}

export function loadSettings() {
  try {
    const store = globalThis.localStorage;
    if (!store) return defaultSettings();
    const raw = store.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings) {
  try {
    globalThis.localStorage?.setItem(SETTINGS_KEY, JSON.stringify(sanitizeSettings(settings)));
  } catch {
    /* Storage can be blocked; the match still runs with the in-memory copy. */
  }
}
