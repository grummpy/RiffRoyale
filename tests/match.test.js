import assert from "node:assert/strict";
import test from "node:test";
import { CHARGE, COUNTDOWN_MS, HP, LIGHTNING, ROUND_BANNER_MS, SCORE, TIMING } from "../src/core/constants.js";
import { emptyEdges, createMatch, matchWinner, pickRoundWinner, stepMatch } from "../src/core/match.js";
import { cycleTarget, shiftLane } from "../src/core/player.js";

const DT = 1000 / 60;

function duel(extra = {}) {
  const match = createMatch({
    seed: 3,
    slots: ["human", "human", "off", "off"],
    rounds: 1,
    beats: 16,
    density: 0,
    ...extra,
  });
  match.phase = "play";
  match.countdownMs = 0;
  match.songMs = 0;
  match.notes = [];
  return match;
}

function snapshot(match) {
  return {
    phase: match.phase,
    songMs: match.songMs,
    winner: match.winner,
    roundWinner: match.roundWinner,
    roundWins: [...match.roundWins],
    totals: [...match.totals],
    players: match.players.map((player) => ({
      hp: player.hp,
      score: player.score,
      streak: player.streak,
      charge: player.charge,
      lane: player.lane,
      alive: player.alive,
      speedMul: player.speedMul,
      laneShift: player.laneShift,
    })),
    judged: match.notes.map((note) => note.judged),
  };
}

test("countdown holds, then the song starts", () => {
  const match = createMatch({ slots: ["human", "off", "off", "off"], beats: 8, density: 0, rounds: 1 });
  assert.equal(match.phase, "countdown");
  stepMatch(match, emptyEdges(), COUNTDOWN_MS - 1);
  assert.equal(match.phase, "countdown");
  const { events } = stepMatch(match, emptyEdges(), 1);
  assert.equal(match.phase, "play");
  assert.equal(match.songMs, 0);
  assert.ok(events.some((event) => event.type === "go"));
});

test("movement changes lanes and cycles the lightning target", () => {
  const match = duel({ slots: ["human", "human", "human", "off"] });
  assert.equal(shiftLane(match.players[0], -1), 0);
  assert.equal(shiftLane(match.players[0], -1), 0);
  assert.equal(shiftLane(match.players[0], 1), 1);
  const edges = emptyEdges();
  edges[0].right = true;
  stepMatch(match, edges, DT);
  assert.equal(match.players[0].lane, 2);
  stepMatch(match, edges, DT);
  assert.equal(match.players[0].lane, 2);
  const before = match.players[0].target;
  cycleTarget(match.players[0], match.players, 1);
  assert.notEqual(match.players[0].target, match.players[0].index);
  assert.notEqual(match.players[0].target, before);
  cycleTarget(match.players[0], match.players, 1);
  assert.equal(match.players[0].target, before);
});

test("perfect, good, spark pickup, and miss scoring", () => {
  assert.equal(SCORE.perfect, 100);
  assert.equal(SCORE.good, 50);
  assert.equal(SCORE.spark, 25);
  assert.equal(HP.miss, 8);
  assert.equal(TIMING.perfectMs, 50);
  assert.equal(TIMING.goodMs, 110);

  const match = duel({ slots: ["human", "human", "human", "off"] });
  match.players[0].lane = 1;
  match.songMs = 1000 - DT;
  match.notes.push({ id: 1, player: 0, lane: 1, timeMs: 1000, kind: "note", judged: null });
  const perfect = emptyEdges();
  perfect[0].action = true;
  stepMatch(match, perfect, DT);
  assert.equal(match.notes[0].judged, "perfect");
  assert.equal(match.players[0].score, 100);
  assert.equal(match.players[0].streak, 1);
  assert.equal(match.players[0].charge, CHARGE.perfect);

  match.songMs = 2000 - 80 - DT;
  match.notes.push({ id: 2, player: 0, lane: 1, timeMs: 2000, kind: "spark", judged: null });
  match.players[0].hp = 90;
  const good = emptyEdges();
  good[0].action = true;
  stepMatch(match, good, DT);
  assert.equal(match.notes[1].judged, "good");
  assert.equal(match.players[0].score, 175);
  assert.equal(match.players[0].hp, 96);
  assert.equal(match.players[0].streak, 2);
  assert.equal(match.players[0].charge, CHARGE.perfect + CHARGE.good + CHARGE.spark);

  match.notes.push({ id: 3, player: 0, lane: 0, timeMs: 0, kind: "note", judged: null });
  match.songMs = 0;
  stepMatch(match, emptyEdges(), TIMING.goodMs + 30);
  assert.equal(match.notes[2].judged, "miss");
  assert.equal(match.players[0].streak, 0);
  assert.equal(match.players[0].hp, 96 - HP.miss);
  assert.equal(match.players[0].misses, 1);
  assert.equal(match.phase, "play");
});

test("lightning damages, scrambles, and speeds the rival, and will not hit yourself", () => {
  const match = duel();
  match.players[0].charge = 100;
  match.players[0].target = 1;
  const fire = emptyEdges();
  fire[0].secondary = true;
  stepMatch(match, fire, 16);
  assert.equal(match.players[0].charge, 0);
  assert.equal(match.bolts.filter((bolt) => bolt.alive).length, 1);
  stepMatch(match, emptyEdges(), LIGHTNING.travelMs + 40);
  assert.equal(match.players[1].hp, HP.max - HP.lightning);
  assert.equal(match.players[1].speedMul, LIGHTNING.speedMul);
  assert.equal(match.players[1].laneShift, 1);
  assert.ok(match.players[1].scrambleUntil > match.songMs);

  const solo = duel({ slots: ["human", "off", "off", "off"] });
  solo.players[0].charge = 100;
  solo.players[0].target = 0;
  const selfish = emptyEdges();
  selfish[0].secondary = true;
  stepMatch(solo, selfish, 16);
  assert.equal(solo.players[0].charge, 100);
  assert.equal(solo.bolts.length, 0);
  assert.equal(solo.players[0].hp, HP.max);

  match.players[1].scrambleUntil = match.songMs + 10;
  stepMatch(match, emptyEdges(), 40);
  assert.equal(match.players[1].speedMul, 1);
  assert.equal(match.players[1].laneShift, 0);
});

test("uncharged lightning does nothing", () => {
  const match = duel();
  match.players[0].charge = 40;
  match.players[0].target = 1;
  const fire = emptyEdges();
  fire[0].secondary = true;
  stepMatch(match, fire, 16);
  assert.equal(match.players[0].charge, 40);
  assert.equal(match.bolts.length, 0);
  assert.equal(match.players[1].hp, HP.max);
});

test("misses eliminate a player and the last one standing wins the round", () => {
  const match = duel({ slots: ["human", "human", "human", "off"] });
  match.players[0].hp = HP.miss;
  match.notes.push({ id: 9, player: 0, lane: 0, timeMs: 0, kind: "note", judged: null });
  stepMatch(match, emptyEdges(), TIMING.goodMs + 40);
  assert.equal(match.players[0].alive, false);
  assert.equal(match.players[0].hp, 0);
  assert.equal(match.phase, "play");

  match.players[1].hp = HP.miss;
  match.notes.push({ id: 10, player: 1, lane: 0, timeMs: 0, kind: "note", judged: null });
  match.songMs = 0;
  stepMatch(match, emptyEdges(), TIMING.goodMs + 40);
  assert.equal(match.players[1].alive, false);
  assert.equal(match.phase, "roundend");
  assert.equal(match.roundWinner, 2);
  assert.equal(match.roundWins[2], 1);
});

test("when the song ends, the highest HP wins the round and the match", () => {
  const match = duel();
  match.players[0].hp = 80;
  match.players[1].hp = 40;
  match.players[0].score = 20;
  match.songMs = match.durationMs;
  const { events } = stepMatch(match, emptyEdges(), TIMING.goodMs + 5);
  assert.equal(match.phase, "roundend");
  assert.equal(match.roundWinner, 0);
  assert.ok(events.some((event) => event.type === "round" && event.winner === 0));
  stepMatch(match, emptyEdges(), ROUND_BANNER_MS);
  assert.equal(match.phase, "matchend");
  assert.equal(match.winner, 0);
});

test("match winner uses rounds, then points, then seat order", () => {
  const match = createMatch({ slots: ["human", "human", "human", "off"], rounds: 3, density: 0 });
  match.roundWins = [1, 1, 0, 0];
  match.totals = [100, 250, 0, 0];
  assert.equal(matchWinner(match), 1);
  match.totals = [400, 250, 0, 0];
  assert.equal(matchWinner(match), 0);
  match.roundWins = [0, 2, 1, 0];
  assert.equal(matchWinner(match), 1);
  const fallen = [
    { index: 0, kind: "human", alive: false, diedAt: 10, hp: 0, score: 5 },
    { index: 1, kind: "human", alive: false, diedAt: 30, hp: 0, score: 1 },
  ];
  assert.equal(pickRoundWinner(fallen), 1);
});

test("an all-off lobby still has someone to play, and replays match", () => {
  const match = createMatch({ slots: ["off", "off", "off", "off"], density: 0, beats: 4 });
  assert.equal(match.slots[0], "bot");
  assert.ok(match.slots.slice(1).every((kind) => kind === "off"));

  const options = { seed: 11, slots: ["human", "human", "bot", "off"], rounds: 1, beats: 8, density: 0.5 };
  const left = createMatch(options);
  const right = createMatch(options);
  const frames = [];
  for (let i = 0; i < 240; i++) {
    const edges = emptyEdges();
    if (i % 11 === 0) edges[0].action = true;
    if (i % 13 === 0) edges[0].left = true;
    if (i % 17 === 0) edges[0].secondary = true;
    if (i % 19 === 0) edges[1].right = true;
    frames.push(edges);
    stepMatch(left, edges, DT);
  }
  for (const edges of frames) stepMatch(right, edges, DT);
  assert.deepEqual(snapshot(left), snapshot(right));
});

test("bots are deterministic and can finish a round", () => {
  const options = { seed: 42, slots: ["bot", "bot", "bot", "bot"], rounds: 1, beats: 8, density: 0.8 };
  const left = createMatch(options);
  const right = createMatch(options);
  for (let i = 0; i < 60 * 30; i++) {
    stepMatch(left, emptyEdges(), DT);
    stepMatch(right, emptyEdges(), DT);
  }
  assert.deepEqual(snapshot(left), snapshot(right));
  assert.equal(left.phase, "matchend");
  assert.ok(left.winner >= 0 && left.winner < 4);
  assert.ok(left.players.some((player) => player.score > 0 || player.misses > 0));
});
