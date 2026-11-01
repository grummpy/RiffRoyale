import { CHARGE, HP, LIGHTNING, SCORE } from "./constants.js";
import { moveLane } from "./geom.js";

export function createPlayer(index, kind) {
  return {
    index,
    kind,
    hp: HP.max,
    score: 0,
    streak: 0,
    maxStreak: 0,
    charge: 0,
    lane: 1,
    target: (index + 1) % 4,
    alive: kind !== "off",
    scrambleUntil: 0,
    speedMul: 1,
    laneShift: 0,
    diedAt: null,
    perfects: 0,
    goods: 0,
    misses: 0,
    plan: new Map(),
  };
}

export function shiftLane(player, direction) {
  player.lane = moveLane(player.lane, direction);
  return player.lane;
}

export function livingRivals(player, players) {
  return players.filter((other) => other.kind !== "off" && other.alive && other.index !== player.index);
}

export function ensureTarget(player, players) {
  const current = players[player.target];
  const valid = current && current.kind !== "off" && current.alive && current.index !== player.index;
  if (valid) return;
  const rivals = livingRivals(player, players);
  player.target = rivals.length ? rivals[0].index : player.index;
}

export function cycleTarget(player, players, direction) {
  const rivals = livingRivals(player, players);
  if (!rivals.length) {
    player.target = player.index;
    return player.target;
  }
  let index = rivals.findIndex((other) => other.index === player.target);
  if (index < 0) {
    player.target = rivals[0].index;
    return player.target;
  }
  const step = direction >= 0 ? 1 : rivals.length - 1;
  player.target = rivals[(index + step) % rivals.length].index;
  return player.target;
}

function markKo(player, songMs, events) {
  if (player.hp > 0 || !player.alive) return;
  player.alive = false;
  player.hp = 0;
  player.diedAt = songMs;
  events.push({ type: "ko", player: player.index });
}

/**
 * Perfect / good / miss, plus spark pickups.
 * Mutates the player and returns events for audio and the HUD.
 */
export function applyJudgement(player, judgment, songMs, kind = "note") {
  const events = [];
  if (!player.alive || player.kind === "off") return events;

  if (judgment === "miss") {
    player.streak = 0;
    player.misses += 1;
    player.hp = Math.max(0, player.hp - HP.miss);
    player.charge = Math.max(0, player.charge - CHARGE.missLeak);
    events.push({ type: "judge", player: player.index, judgment: "miss" });
    markKo(player, songMs, events);
    return events;
  }

  player.streak += 1;
  if (player.streak > player.maxStreak) player.maxStreak = player.streak;
  if (judgment === "perfect") {
    player.score += SCORE.perfect;
    player.perfects += 1;
    player.charge = Math.min(CHARGE.max, player.charge + CHARGE.perfect);
  } else {
    player.score += SCORE.good;
    player.goods += 1;
    player.charge = Math.min(CHARGE.max, player.charge + CHARGE.good);
  }
  if (kind === "spark") {
    player.score += SCORE.spark;
    player.hp = Math.min(HP.max, player.hp + HP.spark);
    player.charge = Math.min(CHARGE.max, player.charge + CHARGE.spark);
    events.push({ type: "pickup", player: player.index });
  }
  events.push({ type: "judge", player: player.index, judgment, kind });
  return events;
}

/** Lightning strike: damage, brief scramble, and a faster highway. */
export function applyZap(player, songMs) {
  const events = [];
  if (!player.alive || player.kind === "off") return events;
  player.hp = Math.max(0, player.hp - HP.lightning);
  player.scrambleUntil = songMs + LIGHTNING.scrambleMs;
  player.speedMul = LIGHTNING.speedMul;
  player.laneShift = (player.laneShift + 1) % 3;
  events.push({ type: "zap", player: player.index, fromSpeed: LIGHTNING.speedMul });
  markKo(player, songMs, events);
  return events;
}

export function clearScramble(player, songMs) {
  if (!player.scrambleUntil) return false;
  if (songMs < player.scrambleUntil) return false;
  player.scrambleUntil = 0;
  player.speedMul = 1;
  player.laneShift = 0;
  return true;
}
