import { createMatch, skipBanner, stepMatch } from "./core/match.js";
import { PLAYER_COUNT, ROUND_CHOICES } from "./core/constants.js";
import { ACTIONS, RESERVED_CODES, formatCode } from "./core/input.js";
import { createAudio } from "./ui/audio.js";
import { createInput } from "./ui/input.js";
import { createLoop } from "./ui/loop.js";
import { render } from "./ui/render.js";
import { loadSettings, saveSettings } from "./ui/storage.js";

const canvas = document.querySelector("#game");
const settings = loadSettings();
const audio = createAudio();
audio.setVolume(settings.volume);
audio.setMuted(settings.muted);

const input = createInput(() => settings.bindings);
const cover = new Image();
cover.src = "assets/cover.jpg";

const view = {
  screen: "title",
  settings,
  joinSlots: ["bot", "bot", "bot", "bot"],
  menu: 0,
  match: null,
  floaters: [],
  hitFlash: [0, 0, 0, 0],
  pads: [false, false, false, false],
  now: 0,
  cover,
  notice: "",
  noticeUntil: 0,
  remapPlayer: 0,
  remapAction: 0,
  remapWaiting: false,
  returnTo: "title",
  goUntil: 0,
};

function persist() {
  saveSettings(settings);
}

function notice(text) {
  view.notice = text;
  view.noticeUntil = performance.now() + 1600;
}

function handleEvents(events) {
  for (const event of events) {
    if (event.type === "judge") {
      const text = event.judgment === "perfect" ? "PERFECT" : event.judgment === "good" ? "GOOD" : "MISS";
      view.floaters.push({ player: event.player, text, until: performance.now() + 650 });
      view.hitFlash[event.player] = 1;
      if (event.judgment === "perfect") audio.perfect();
      else if (event.judgment === "good") audio.good();
      else audio.miss();
    } else if (event.type === "pickup") {
      audio.pickup();
    } else if (event.type === "lightning") {
      audio.lightning();
    } else if (event.type === "zap") {
      audio.zap();
    } else if (event.type === "ko") {
      audio.ko();
    } else if (event.type === "countdown") {
      audio.countdown(event.value);
    } else if (event.type === "go") {
      view.goUntil = performance.now() + 450;
      audio.countdown(0);
    } else if (event.type === "round") {
      audio.round();
    } else if (event.type === "match") {
      audio.match();
      view.screen = "match";
      view.menu = 0;
    }
  }
}

function startMatch(slots) {
  const active = slots.filter((kind) => kind !== "off").length;
  if (active < 1) {
    notice("Turn at least one slot into a human or a bot");
    return;
  }
  const seed = (Date.now() ^ ((Math.random() * 0x100000000) >>> 0)) >>> 0;
  view.match = createMatch({
    seed,
    rounds: settings.rounds,
    slots: slots.slice(0, PLAYER_COUNT),
  });
  view.floaters = [];
  view.hitFlash = [0, 0, 0, 0];
  view.screen = "play";
  view.menu = 0;
  audio.unlock();
}

function cycleSlot(index) {
  const order = ["human", "bot", "off"];
  const current = view.joinSlots[index];
  const next = order[(order.indexOf(current) + 1) % order.length];
  view.joinSlots[index] = next;
  audio.ui();
}

function joinHuman(index) {
  view.joinSlots[index] = "human";
  audio.ui();
}

function openSettings(returnTo) {
  view.returnTo = returnTo;
  view.screen = "settings";
  view.menu = 0;
}

function moveMenu(count, direction) {
  view.menu = (view.menu + direction + count) % count;
  audio.ui();
}

function adjustSettings(direction) {
  const item = view.menu;
  if (item === 0) {
    settings.volume = Math.max(0, Math.min(1, Math.round((settings.volume + direction * 0.05) * 100) / 100));
    audio.setVolume(settings.volume);
    persist();
    audio.ui();
  } else if (item === 1) {
    let index = ROUND_CHOICES.indexOf(settings.rounds);
    if (index < 0) index = 1;
    settings.rounds = ROUND_CHOICES[(index + direction + ROUND_CHOICES.length) % ROUND_CHOICES.length];
    persist();
    audio.ui();
  }
}

function confirmSettings() {
  if (view.menu === 2) {
    settings.muted = audio.toggleMute();
    persist();
    return;
  }
  if (view.menu === 3) {
    view.screen = "controls";
    view.remapPlayer = 0;
    view.remapAction = 0;
    view.remapWaiting = false;
    audio.ui();
    return;
  }
  if (view.menu === 4) {
    view.screen = view.returnTo;
    audio.ui();
  }
}

function tryBind(code) {
  const current = settings.bindings[view.remapPlayer][ACTIONS[view.remapAction]];
  if (code === current) {
    view.remapWaiting = false;
    return;
  }
  if (RESERVED_CODES.has(code)) {
    notice(`${formatCode(code)} stays reserved`);
    view.remapWaiting = false;
    return;
  }
  for (let player = 0; player < PLAYER_COUNT; player++) {
    for (const action of ACTIONS) {
      if (settings.bindings[player][action] === code) {
        notice(`${formatCode(code)} is already bound`);
        view.remapWaiting = false;
        return;
      }
    }
  }
  settings.bindings[view.remapPlayer][ACTIONS[view.remapAction]] = code;
  view.remapWaiting = false;
  persist();
  audio.ui();
}

function update(dt) {
  view.now = performance.now();
  const sample = input.poll();
  view.pads = sample.pads.map((pad) => !!pad);

  if (sample.muteEdge && !view.remapWaiting) {
    settings.muted = audio.toggleMute();
    persist();
  }

  const menuScreen = view.screen === "title" || view.screen === "join";
  audio.menu(menuScreen);
  const match = view.match;
  const songActive = view.screen === "play" && match && match.phase === "play";
  audio.syncSong(match ? match.songMs : 0, match ? match.bpm : 128, songActive);

  for (let i = 0; i < 4; i++) view.hitFlash[i] = Math.max(0, view.hitFlash[i] - dt / 180);
  view.floaters = view.floaters.filter((floater) => floater.until > view.now);

  if (view.screen === "title") {
    if (sample.confirmEdge || sample.padStartEdge) {
      audio.unlock();
      view.screen = "join";
      audio.ui();
    } else if (sample.edges[0].secondary) {
      audio.unlock();
      openSettings("title");
    }
    return;
  }

  if (view.screen === "join") {
    for (let i = 0; i < PLAYER_COUNT; i++) {
      if (sample.edges[i].action) joinHuman(i);
      else if (sample.edges[i].secondary) cycleSlot(i);
    }
    if (sample.confirmEdge || sample.padStartEdge) startMatch(view.joinSlots);
    else if (sample.escapeEdge) view.screen = "title";
    return;
  }

  if (view.screen === "play" && match) {
    if (sample.escapeEdge || sample.padStartEdge) {
      view.screen = "pause";
      view.menu = 0;
      audio.ui();
      return;
    }
    if (match.phase === "roundend" && (sample.confirmEdge || sample.edges.some((edge) => edge.action))) {
      skipBanner(match);
    }
    const { events } = stepMatch(match, sample.edges, dt);
    handleEvents(events);
    return;
  }

  if (view.screen === "pause") {
    const count = 3;
    if (sample.edges[0].up || sample.edges[1].up) moveMenu(count, -1);
    else if (sample.edges[0].down || sample.edges[1].down) moveMenu(count, 1);
    else if (sample.escapeEdge || sample.padStartEdge) view.screen = "play";
    else if (sample.confirmEdge || sample.edges[0].action) {
      if (view.menu === 0) view.screen = "play";
      else if (view.menu === 1) openSettings("pause");
      else {
        view.match = null;
        view.screen = "title";
      }
      audio.ui();
    }
    return;
  }

  if (view.screen === "settings") {
    const count = 5;
    if (sample.edges[0].up || sample.edges[1].up) moveMenu(count, -1);
    else if (sample.edges[0].down || sample.edges[1].down) moveMenu(count, 1);
    else if (sample.edges[0].left || sample.edges[1].left) adjustSettings(-1);
    else if (sample.edges[0].right || sample.edges[1].right) adjustSettings(1);
    else if (sample.confirmEdge || sample.edges[0].action || sample.padStartEdge) confirmSettings();
    else if (sample.escapeEdge) view.screen = view.returnTo;
    return;
  }

  if (view.screen === "controls") {
    if (view.remapWaiting) return;
    if (sample.edges[0].up || sample.edges[1].up) {
      view.remapAction = (view.remapAction + ACTIONS.length - 1) % ACTIONS.length;
      audio.ui();
    } else if (sample.edges[0].down || sample.edges[1].down) {
      view.remapAction = (view.remapAction + 1) % ACTIONS.length;
      audio.ui();
    } else if (sample.edges[0].left || sample.edges[1].left) {
      view.remapPlayer = (view.remapPlayer + PLAYER_COUNT - 1) % PLAYER_COUNT;
      audio.ui();
    } else if (sample.edges[0].right || sample.edges[1].right) {
      view.remapPlayer = (view.remapPlayer + 1) % PLAYER_COUNT;
      audio.ui();
    } else if (sample.confirmEdge || sample.edges[0].action) {
      view.remapWaiting = true;
      input.setCapture((code) => tryBind(code));
    } else if (sample.escapeEdge) {
      view.screen = "settings";
      audio.ui();
    }
    return;
  }

  if (view.screen === "match") {
    const count = 2;
    if (sample.edges[0].up || sample.edges[1].up) moveMenu(count, -1);
    else if (sample.edges[0].down || sample.edges[1].down) moveMenu(count, 1);
    else if (sample.confirmEdge || sample.edges[0].action || sample.padStartEdge) {
      if (view.menu === 0) startMatch(view.match.slots);
      else {
        view.match = null;
        view.screen = "title";
      }
    } else if (sample.escapeEdge) {
      view.match = null;
      view.screen = "title";
    }
  }
}

const loop = createLoop(update, () => render(canvas, view));
loop.start();

window.addEventListener("pointerdown", () => audio.unlock());
