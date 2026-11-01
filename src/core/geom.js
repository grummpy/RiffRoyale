import { GAP, LANES, VIEW_H, VIEW_W } from "./constants.js";

export function clamp(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

export function moveLane(lane, direction) {
  return clamp(lane + direction, 0, LANES - 1);
}

/** Axis-aligned overlap. Notes collide with the receptor on the hit line. */
export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * One quadrant of the shared screen. Hit line sits near the bottom;
 * notes travel from innerTop down to hitY.
 */
export function highwayLayout(playerIndex, viewW = VIEW_W, viewH = VIEW_H) {
  const col = playerIndex % 2;
  const row = (playerIndex / 2) | 0;
  const w = (viewW - GAP * 3) / 2;
  const h = (viewH - GAP * 3) / 2;
  const x = GAP + col * (w + GAP);
  const y = GAP + row * (h + GAP);
  const header = 58;
  return {
    x,
    y,
    w,
    h,
    header,
    innerTop: y + header,
    hitY: y + h - 34,
    approachMs: 1500,
  };
}

export function visualLane(note, player) {
  const shift = player.laneShift || 0;
  return (note.lane + shift) % LANES;
}

export function noteBox(note, player, songMs, layout) {
  const lane = visualLane(note, player);
  const laneW = layout.w / LANES;
  const noteW = laneW * 0.46;
  const noteH = note.kind === "spark" ? 22 : 16;
  const speed = player.speedMul || 1;
  const approach = layout.approachMs / speed;
  const dt = note.timeMs - songMs;
  const top = layout.innerTop + 10;
  const travel = layout.hitY - top;
  const centerY = layout.hitY - (dt / approach) * travel;
  const x = layout.x + lane * laneW + (laneW - noteW) / 2;
  return {
    x,
    y: centerY - noteH / 2,
    w: noteW,
    h: noteH,
    visualLane: lane,
    dt,
  };
}

export function receptorBox(player, layout) {
  const laneW = layout.w / LANES;
  const w = laneW * 0.7;
  const h = 18;
  const x = layout.x + player.lane * laneW + (laneW - w) / 2;
  return {
    x,
    y: layout.hitY - h / 2,
    w,
    h,
  };
}

/** True when the note occupies the receptor's lane and overlaps its pad. */
export function noteHitsReceptor(note, player, songMs, layout) {
  const noteRect = noteBox(note, player, songMs, layout);
  if (noteRect.visualLane !== player.lane) return false;
  return rectsOverlap(noteRect, receptorBox(player, layout));
}
