import { CHARGE, TIMING } from "./constants.js";
import { visualLane } from "./geom.js";
import { livingRivals } from "./player.js";

/**
 * Simple rival AI. Decides once per note whether it will attempt the hit,
 * steps one lane per call, and fires lightning at the weakest living rival
 * as soon as the meter is full. Uses the player's seeded RNG.
 */
export function botEdge(player, match) {
  const edge = {
    left: false,
    right: false,
    up: false,
    down: false,
    action: false,
    secondary: false,
  };
  if (!player.alive) return edge;

  const upcoming = match.notes
    .filter((note) => note.player === player.index && !note.judged && note.timeMs >= match.songMs - TIMING.goodMs)
    .sort((a, b) => a.timeMs - b.timeMs)[0];

  if (player.charge >= CHARGE.max) {
    const rivals = livingRivals(player, match.players).sort((a, b) => a.hp - b.hp || a.index - b.index);
    if (rivals.length) {
      player.target = rivals[0].index;
      edge.secondary = true;
      return edge;
    }
  }

  if (!upcoming) return edge;

  if (!player.plan.has(upcoming.id)) {
    player.plan.set(upcoming.id, player.rng.next() > 0.14);
  }
  const visual = visualLane(upcoming, player);
  if (player.lane < visual) {
    edge.right = true;
    return edge;
  }
  if (player.lane > visual) {
    edge.left = true;
    return edge;
  }
  const until = upcoming.timeMs - match.songMs;
  const willHit = player.plan.get(upcoming.id);
  if (willHit && until <= TIMING.perfectMs && until >= -TIMING.goodMs) {
    edge.action = true;
  }
  return edge;
}
