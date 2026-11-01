/** Shared rules for the rhythm duel. Pure data — no DOM, no canvas. */

export const PLAYER_COUNT = 4;
export const LANES = 3;
export const TICK_HZ = 60;
export const TICK_MS = 1000 / 60;

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const GAP = 18;

export const PLAYER_COLORS = ["#ff3b4e", "#3ec5ff", "#ffc014", "#39e07a"];
export const PLAYER_LABELS = ["P1", "P2", "P3", "P4"];

/** Timing windows around a note's hit time, in milliseconds. */
export const TIMING = {
  perfectMs: 50,
  goodMs: 110,
};

export const SCORE = {
  perfect: 100,
  good: 50,
  spark: 25,
};

export const HP = {
  max: 100,
  miss: 8,
  lightning: 18,
  spark: 6,
};

/** Streak hits fill this meter. At max, secondary fires lightning. */
export const CHARGE = {
  max: 100,
  perfect: 14,
  good: 8,
  spark: 10,
  missLeak: 12,
};

export const LIGHTNING = {
  travelMs: 420,
  scrambleMs: 2200,
  speedMul: 1.55,
};

export const CHART = {
  bpm: 128,
  beats: 48,
  density: 0.72,
  startBeat: 4,
  sparkChance: 0.08,
  approachMs: 1500,
};

export const COUNTDOWN_MS = 3000;
export const ROUND_BANNER_MS = 3200;

export const ROUND_CHOICES = [1, 3, 5];
