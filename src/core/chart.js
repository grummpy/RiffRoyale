import { CHART, LANES } from "./constants.js";
import { createRng, mixSeed } from "./rng.js";

/**
 * Build a note chart on a BPM grid. `playerIndex` salts the seed so each
 * highway is its own part of the same song, and the same arguments always
 * rebuild the same chart.
 */
export function generateChart({
  seed,
  bpm = CHART.bpm,
  beats = CHART.beats,
  density = CHART.density,
  playerIndex = 0,
  startBeat = CHART.startBeat,
  sparkChance = CHART.sparkChance,
}) {
  const rng = createRng(mixSeed(seed >>> 0, 0xC0FFEE + playerIndex * 131));
  const beatMs = 60000 / bpm;
  const notes = [];
  let id = 0;
  const first = Math.round(startBeat * 2);
  const last = Math.round(beats * 2);
  for (let step = first; step < last; step++) {
    if (rng.next() > density) continue;
    const lane = rng.nextInt(LANES);
    const spark = rng.next() < sparkChance;
    notes.push({
      id: playerIndex * 100000 + id,
      lane,
      timeMs: (step / 2) * beatMs,
      kind: spark ? "spark" : "note",
      player: playerIndex,
      judged: null,
    });
    id += 1;
  }
  return {
    bpm,
    beatMs,
    durationMs: beats * beatMs,
    playerIndex,
    notes,
  };
}
