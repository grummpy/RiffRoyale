import { botEdge } from "./bot.js";
import { generateChart } from "./chart.js";
import {
  CHART,
  COUNTDOWN_MS,
  LIGHTNING,
  PLAYER_COUNT,
  ROUND_BANNER_MS,
  TIMING,
} from "./constants.js";
import { emptyEdges } from "./input.js";
import {
  applyJudgement,
  applyZap,
  clearScramble,
  createPlayer,
  cycleTarget,
  ensureTarget,
  shiftLane,
} from "./player.js";
import { createRng, mixSeed } from "./rng.js";
import { visualLane } from "./geom.js";

export { emptyEdges } from "./input.js";

function normalizeSlots(slots) {
  const source = Array.isArray(slots) ? slots : [];
  const next = [];
  for (let i = 0; i < PLAYER_COUNT; i++) {
    const kind = source[i];
    next.push(kind === "human" || kind === "bot" || kind === "off" ? kind : "bot");
  }
  if (next.every((kind) => kind === "off")) next[0] = "bot";
  return next;
}

export function createMatch(options = {}) {
  const seed = (options.seed ?? 1) >>> 0;
  const match = {
    seed,
    roundsToPlay: options.rounds ?? 3,
    slots: normalizeSlots(options.slots ?? ["human", "bot", "bot", "bot"]),
    bpm: options.bpm ?? CHART.bpm,
    beats: options.beats ?? CHART.beats,
    density: options.density ?? CHART.density,
    sparkChance: options.sparkChance ?? CHART.sparkChance,
    roundIndex: 0,
    roundWins: [0, 0, 0, 0],
    totals: [0, 0, 0, 0],
    phase: "countdown",
    players: [],
    notes: [],
    bolts: [],
    songMs: 0,
    countdownMs: COUNTDOWN_MS,
    bannerMs: 0,
    winner: null,
    roundWinner: null,
    durationMs: 0,
    rng: createRng(seed),
  };
  beginRound(match);
  return match;
}

export function beginRound(match) {
  const roundSeed = mixSeed(match.seed, 1000 + match.roundIndex);
  match.phase = "countdown";
  match.countdownMs = COUNTDOWN_MS;
  match.songMs = 0;
  match.bolts = [];
  match.roundWinner = null;
  match.bannerMs = 0;
  match.notes = [];
  match.players = match.slots.map((kind, index) => {
    const player = createPlayer(index, kind);
    player.rng = createRng(mixSeed(roundSeed, 50 + index));
    return player;
  });
  for (let index = 0; index < PLAYER_COUNT; index++) {
    if (match.slots[index] === "off") continue;
    const chart = generateChart({
      seed: roundSeed,
      bpm: match.bpm,
      beats: match.beats,
      density: match.density,
      playerIndex: index,
      sparkChance: match.sparkChance,
    });
    match.durationMs = chart.durationMs;
    for (const note of chart.notes) match.notes.push(note);
  }
  for (const player of match.players) ensureTarget(player, match.players);
}

function judgeWindow(deltaMs) {
  const distance = Math.abs(deltaMs);
  if (distance <= TIMING.perfectMs) return "perfect";
  if (distance <= TIMING.goodMs) return "good";
  return null;
}

function tryHit(match, player, events) {
  if (!player.alive) return;
  let best = null;
  let bestAbs = Infinity;
  for (const note of match.notes) {
    if (note.player !== player.index || note.judged) continue;
    if (visualLane(note, player) !== player.lane) continue;
    const distance = Math.abs(match.songMs - note.timeMs);
    if (distance < bestAbs) {
      bestAbs = distance;
      best = note;
    }
  }
  if (!best) return;
  const judgment = judgeWindow(match.songMs - best.timeMs);
  if (!judgment) return;
  best.judged = judgment;
  events.push(...applyJudgement(player, judgment, match.songMs, best.kind));
}

function tryZap(match, player, events) {
  if (!player.alive || player.charge < 100) return;
  const target = match.players[player.target];
  if (!target || !target.alive || target.index === player.index || target.kind === "off") return;
  player.charge = 0;
  match.bolts.push({
    from: player.index,
    to: target.index,
    t: 0,
    alive: true,
  });
  events.push({ type: "lightning", from: player.index, to: target.index });
}

function applyEdge(match, player, edge, events) {
  if (!edge) return;
  if (edge.left && !edge.right) shiftLane(player, -1);
  else if (edge.right && !edge.left) shiftLane(player, 1);
  if (edge.up && !edge.down) cycleTarget(player, match.players, -1);
  else if (edge.down && !edge.up) cycleTarget(player, match.players, 1);
  if (edge.action) tryHit(match, player, events);
  if (edge.secondary) tryZap(match, player, events);
}

function autoMiss(match, events) {
  for (const note of match.notes) {
    if (note.judged) continue;
    const player = match.players[note.player];
    if (!player.alive) {
      note.judged = "gone";
      continue;
    }
    if (match.songMs - note.timeMs > TIMING.goodMs) {
      note.judged = "miss";
      events.push(...applyJudgement(player, "miss", match.songMs, note.kind));
    }
  }
}

function stepBolts(match, dtMs, events) {
  for (const bolt of match.bolts) {
    if (!bolt.alive) continue;
    bolt.t += dtMs / LIGHTNING.travelMs;
    if (bolt.t < 1) continue;
    bolt.t = 1;
    bolt.alive = false;
    events.push(...applyZap(match.players[bolt.to], match.songMs));
  }
}

function activePlayers(match) {
  return match.players.filter((player) => player.kind !== "off");
}

export function pickRoundWinner(players) {
  const active = players.filter((player) => player.kind !== "off");
  const living = active.filter((player) => player.alive);
  const pool = living.length ? living : active;
  pool.sort((a, b) => {
    if (!living.length && (a.diedAt ?? 0) !== (b.diedAt ?? 0)) {
      return (b.diedAt ?? 0) - (a.diedAt ?? 0);
    }
    if (living.length && b.hp !== a.hp) return b.hp - a.hp;
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });
  return pool[0]?.index ?? null;
}

export function matchWinner(match) {
  const active = [];
  for (let i = 0; i < PLAYER_COUNT; i++) {
    if (match.slots[i] !== "off") active.push(i);
  }
  active.sort((a, b) => {
    const wins = match.roundWins[b] - match.roundWins[a];
    if (wins) return wins;
    const score = match.totals[b] - match.totals[a];
    if (score) return score;
    return a - b;
  });
  return active[0] ?? null;
}

function closeRound(match, winner, events) {
  if (match.phase !== "play") return;
  match.roundWinner = winner;
  if (winner != null) match.roundWins[winner] += 1;
  for (let i = 0; i < PLAYER_COUNT; i++) {
    if (match.slots[i] !== "off") match.totals[i] += match.players[i].score;
  }
  match.phase = "roundend";
  match.bannerMs = ROUND_BANNER_MS;
  events.push({ type: "round", winner });
}

function maybeEnd(match, events) {
  if (match.phase !== "play") return;
  const active = activePlayers(match);
  const living = active.filter((player) => player.alive);
  const songOver = match.songMs >= match.durationMs + TIMING.goodMs;
  if (active.length >= 2 && living.length <= 1) {
    closeRound(match, living.length === 1 ? living[0].index : pickRoundWinner(match.players), events);
    return;
  }
  if (active.length === 1 && living.length === 0) {
    closeRound(match, null, events);
    return;
  }
  if (songOver) {
    closeRound(match, living.length ? pickRoundWinner(match.players) : null, events);
  }
}

function advance(match, events) {
  const next = match.roundIndex + 1;
  if (next >= match.roundsToPlay) {
    match.phase = "matchend";
    match.winner = matchWinner(match);
    events.push({ type: "match", winner: match.winner });
    return;
  }
  match.roundIndex = next;
  beginRound(match);
  events.push({ type: "roundstart", round: match.roundIndex });
}

/**
 * Advance the simulation by one fixed step.
 * `edges` are rising edges for this tick (already de-bounced by the UI).
 * Bots ignore the supplied edges and decide from the seeded RNG.
 */
export function stepMatch(match, edges = emptyEdges(), dtMs = 1000 / 60) {
  const events = [];
  if (match.phase === "countdown") {
    const before = match.countdownMs;
    match.countdownMs -= dtMs;
    for (const mark of [2000, 1000]) {
      if (before > mark && match.countdownMs <= mark) {
        events.push({ type: "countdown", value: mark / 1000 });
      }
    }
    if (match.countdownMs <= 0) {
      match.countdownMs = 0;
      match.phase = "play";
      match.songMs = 0;
      events.push({ type: "go" });
    }
    return { events };
  }

  if (match.phase === "roundend") {
    match.bannerMs -= dtMs;
    if (match.bannerMs <= 0) advance(match, events);
    return { events };
  }

  if (match.phase !== "play") return { events };

  match.songMs += dtMs;
  for (const player of match.players) {
    if (player.kind === "off" || !player.alive) continue;
    ensureTarget(player, match.players);
    const edge = player.kind === "bot" ? botEdge(player, match) : edges[player.index];
    applyEdge(match, player, edge, events);
  }
  autoMiss(match, events);
  stepBolts(match, dtMs, events);
  for (const player of match.players) clearScramble(player, match.songMs);
  maybeEnd(match, events);
  return { events };
}

export function skipBanner(match) {
  if (match.phase !== "roundend") return false;
  match.bannerMs = 0;
  return true;
}

export function playerSnapshot(player) {
  return {
    index: player.index,
    kind: player.kind,
    hp: player.hp,
    score: player.score,
    streak: player.streak,
    charge: player.charge,
    lane: player.lane,
    target: player.target,
    alive: player.alive,
    speedMul: player.speedMul,
    laneShift: player.laneShift,
    misses: player.misses,
    perfects: player.perfects,
    goods: player.goods,
  };
}
