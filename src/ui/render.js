import { PLAYER_COLORS, PLAYER_LABELS, VIEW_H, VIEW_W } from "../core/constants.js";
import { highwayLayout, noteBox, receptorBox } from "../core/geom.js";
import { ACTION_LABELS, ACTIONS, formatCode } from "../core/input.js";

const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

function roundPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fillRound(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  roundPath(ctx, x, y, w, h, r);
  ctx.fill();
}

function strokeRound(ctx, x, y, w, h, r, color, width = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  roundPath(ctx, x, y, w, h, r);
  ctx.stroke();
}

function coverImage(ctx, image, x, y, w, h) {
  if (!image || !image.complete || !image.naturalWidth) return false;
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const destRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = image.naturalWidth;
  let sh = image.naturalHeight;
  if (sourceRatio > destRatio) {
    sw = sh * destRatio;
    sx = (image.naturalWidth - sw) / 2;
  } else {
    sh = sw / destRatio;
    sy = (image.naturalHeight - sh) / 2;
  }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  return true;
}

function drawBackground(ctx, view, dim) {
  const painted = coverImage(ctx, view.cover, 0, 0, VIEW_W, VIEW_H);
  if (!painted) {
    const gradient = ctx.createLinearGradient(0, 0, VIEW_W, VIEW_H);
    gradient.addColorStop(0, "#1a1030");
    gradient.addColorStop(1, "#07060d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  ctx.fillStyle = `rgba(7, 6, 13, ${dim})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function pulse(now, speed = 500) {
  return 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(now / speed));
}

function drawLogo(ctx, y) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff6d8";
  ctx.font = `800 84px ${FONT}`;
  ctx.shadowColor = "#ff3b4e";
  ctx.shadowBlur = 24;
  ctx.fillText("RIFF ROYALE", VIEW_W / 2, y);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawPadIcon(ctx, x, y, connected) {
  fillRound(ctx, x, y, 28, 18, 4, connected ? "#f4f0ff" : "rgba(255,255,255,0.12)");
  ctx.fillStyle = connected ? "#241433" : "rgba(255,255,255,0.35)";
  ctx.fillRect(x + 6, y + 7, 4, 4);
  ctx.fillRect(x + 16, y + 5, 3, 8);
  ctx.fillRect(x + 13, y + 8, 9, 3);
}

function panel(ctx, x, y, w, h, accent, selected) {
  fillRound(ctx, x, y, w, h, 16, "rgba(10, 8, 20, 0.82)");
  strokeRound(ctx, x, y, w, h, 16, selected ? accent : "rgba(255,255,255,0.16)", selected ? 3 : 1.5);
}

function menuList(ctx, items, index, x, y, width) {
  items.forEach((item, i) => {
    const selected = i === index;
    fillRound(ctx, x, y + i * 58, width, 48, 10, selected ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)");
    ctx.fillStyle = selected ? "#fff6d8" : "#d9d0ea";
    ctx.font = `700 24px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(item, x + 22, y + i * 58 + 32);
  });
}

function drawTitle(ctx, view) {
  drawBackground(ctx, view, 0.28);
  const gradient = ctx.createLinearGradient(0, 380, 0, VIEW_H);
  gradient.addColorStop(0, "rgba(7,6,13,0)");
  gradient.addColorStop(0.45, "rgba(7,6,13,0.72)");
  gradient.addColorStop(1, "rgba(7,6,13,0.92)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 360, VIEW_W, 360);
  drawLogo(ctx, 470);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd56a";
  ctx.font = `600 26px ${FONT}`;
  ctx.fillText("Hit the beat. Blast your rivals.", VIEW_W / 2, 520);
  ctx.fillStyle = `rgba(255,246,216,${pulse(view.now)})`;
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText("Press Enter / Start", VIEW_W / 2, 590);
  ctx.fillStyle = "#b9aecb";
  ctx.font = `500 18px ${FONT}`;
  const settingsKey = formatCode(view.settings.bindings[0].secondary);
  ctx.fillText(`4 local players  ·  ${settingsKey} settings  ·  M mute`, VIEW_W / 2, 650);
}

function slotStatus(kind) {
  if (kind === "human") return "HUMAN";
  if (kind === "bot") return "BOT";
  return "OFF";
}

function drawJoin(ctx, view) {
  drawBackground(ctx, view, 0.72);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff6d8";
  ctx.font = `800 48px ${FONT}`;
  ctx.fillText("WHO'S PLAYING?", VIEW_W / 2, 78);
  ctx.fillStyle = "#cbbfe0";
  ctx.font = `500 18px ${FONT}`;
  ctx.fillText("Action joins as human. Secondary cycles human, bot, and off.", VIEW_W / 2, 112);

  const labels = view.settings.bindings.map((row) => ({
    action: formatCode(row.action),
    secondary: formatCode(row.secondary),
  }));
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = (i / 2) | 0;
    const x = 90 + col * 560;
    const y = 150 + row * 230;
    const color = PLAYER_COLORS[i];
    const kind = view.joinSlots[i];
    panel(ctx, x, y, 520, 200, color, kind === "human");
    ctx.fillStyle = color;
    ctx.font = `800 28px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(PLAYER_LABELS[i], x + 24, y + 42);
    drawPadIcon(ctx, x + 470, y + 22, view.pads[i]);
    ctx.textAlign = "left";
    ctx.fillStyle = kind === "off" ? "#8d849c" : "#fff6d8";
    ctx.font = `800 40px ${FONT}`;
    ctx.fillText(slotStatus(kind), x + 24, y + 100);
    ctx.fillStyle = "#cbbfe0";
    ctx.font = `500 18px ${FONT}`;
    ctx.fillText(`${labels[i].action}  join`, x + 24, y + 146);
    ctx.fillText(`${labels[i].secondary}  cycle`, x + 180, y + 146);
  }
  ctx.textAlign = "center";
  ctx.fillStyle = `rgba(255,246,216,${pulse(view.now)})`;
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText("Enter / Start to begin", VIEW_W / 2, 680);
}

function drawHighway(ctx, view, index) {
  const match = view.match;
  const player = match.players[index];
  const layout = highwayLayout(index);
  const color = PLAYER_COLORS[index];
  fillRound(ctx, layout.x, layout.y, layout.w, layout.h, 16, "rgba(8, 6, 16, 0.88)");
  strokeRound(ctx, layout.x, layout.y, layout.w, layout.h, 16, player.alive ? color : "#5c5568", player.alive ? 2.5 : 1.5);

  ctx.save();
  ctx.beginPath();
  ctx.rect(layout.x + 8, layout.y + 8, layout.w - 16, layout.header - 12);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.font = `800 22px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillText(PLAYER_LABELS[index], layout.x + 16, layout.y + 28);
  if (player.kind === "bot") {
    ctx.fillStyle = "#cbbfe0";
    ctx.font = `700 14px ${FONT}`;
    ctx.fillText("BOT", layout.x + 58, layout.y + 26);
  }
  drawPadIcon(ctx, layout.x + layout.w - 44, layout.y + 12, !!view.pads[index]);

  const barX = layout.x + 16;
  const barY = layout.y + 36;
  const barW = layout.w - 70;
  fillRound(ctx, barX, barY, barW, 8, 4, "rgba(255,255,255,0.08)");
  fillRound(ctx, barX, barY, barW * (player.hp / 100), 8, 4, player.hp > 30 ? color : "#ff5a6a");
  ctx.fillStyle = "#fff6d8";
  ctx.font = `700 12px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText(String(player.score), layout.x + layout.w - 16, layout.y + 28);
  ctx.restore();

  const laneW = layout.w / 3;
  ctx.save();
  ctx.beginPath();
  ctx.rect(layout.x, layout.innerTop, layout.w, layout.h - layout.header);
  ctx.clip();

  for (let lane = 0; lane < 3; lane++) {
    const x = layout.x + lane * laneW;
    ctx.fillStyle = lane === player.lane ? hexAlpha(color, 0.16) : "rgba(255,255,255,0.03)";
    ctx.fillRect(x + 8, layout.innerTop, laneW - 16, layout.hitY - layout.innerTop - 4);
  }

  if (player.speedMul > 1) {
    ctx.strokeStyle = hexAlpha(color, 0.35);
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const y = layout.innerTop + ((view.now / 8 + i * 40) % (layout.h - layout.header));
      ctx.beginPath();
      ctx.moveTo(layout.x + 12, y);
      ctx.lineTo(layout.x + layout.w - 12, y + 10);
      ctx.stroke();
    }
  }

  for (const note of match.notes) {
    if (note.player !== index || note.judged) continue;
    const box = noteBox(note, player, match.songMs, layout);
    if (box.y > layout.y + layout.h || box.y + box.h < layout.innerTop) continue;
    if (note.kind === "spark") {
      drawSpark(ctx, box, color);
    } else {
      fillRound(ctx, box.x, box.y, box.w, box.h, 6, color);
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillRect(box.x + 4, box.y + 3, box.w - 8, 3);
    }
  }

  const receptor = receptorBox(player, layout);
  const flash = view.hitFlash[index] || 0;
  ctx.fillStyle = flash > 0.05 ? "#ffffff" : color;
  ctx.globalAlpha = player.alive ? 1 : 0.35;
  fillRound(ctx, receptor.x, receptor.y, receptor.w, receptor.h, 6, ctx.fillStyle);
  ctx.globalAlpha = 1;
  ctx.restore();

  const target = match.players[player.target];
  const targetLabel = target && target.index !== player.index && target.kind !== "off" ? PLAYER_LABELS[target.index] : "—";
  ctx.textAlign = "left";
  ctx.font = `700 13px ${FONT}`;
  ctx.fillStyle = "#cbbfe0";
  ctx.fillText(`x${player.streak}`, layout.x + 16, layout.y + layout.h - 12);
  const charge = Math.max(0, Math.min(1, player.charge / 100));
  const chargeLabel = charge >= 1 ? "ZAP" : "charge";
  ctx.fillStyle = charge >= 1 ? "#fff6d8" : "#8d849c";
  ctx.textAlign = "right";
  ctx.fillText(`${chargeLabel} ${targetLabel}`, layout.x + layout.w - 16, layout.y + layout.h - 12);
  const meterW = 70;
  fillRound(ctx, layout.x + layout.w / 2 - meterW / 2, layout.y + layout.h - 20, meterW, 6, 3, "rgba(255,255,255,0.1)");
  fillRound(
    ctx,
    layout.x + layout.w / 2 - meterW / 2,
    layout.y + layout.h - 20,
    meterW * charge,
    6,
    3,
    charge >= 1 ? "#fff6d8" : color,
  );

  if (!player.alive && player.kind !== "off") {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(layout.x, layout.y, layout.w, layout.h);
    ctx.fillStyle = "#ff5a6a";
    ctx.font = `800 42px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("KO", layout.x + layout.w / 2, layout.y + layout.h / 2);
  } else if (player.scrambleUntil > match.songMs) {
    ctx.fillStyle = hexAlpha(color, 0.85);
    ctx.font = `800 16px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("SCRAMBLED", layout.x + layout.w / 2, layout.innerTop + 18);
  }

  for (const floater of view.floaters) {
    if (floater.player !== index || floater.until < view.now) continue;
    const age = 1 - (floater.until - view.now) / 650;
    ctx.globalAlpha = 1 - age;
    ctx.fillStyle = floater.text === "MISS" ? "#ff5a6a" : "#fff6d8";
    ctx.font = `800 22px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(floater.text, layout.x + layout.w / 2, layout.hitY - 28 - age * 24);
    ctx.globalAlpha = 1;
  }
}

function drawSpark(ctx, box, color) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  ctx.beginPath();
  ctx.moveTo(cx, box.y);
  ctx.lineTo(box.x + box.w, cy);
  ctx.lineTo(cx, box.y + box.h);
  ctx.lineTo(box.x, cy);
  ctx.closePath();
  ctx.fillStyle = "#fff6d8";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawBolts(ctx, match) {
  for (const bolt of match.bolts) {
    if (!bolt.alive) continue;
    const from = centerOf(bolt.from);
    const to = centerOf(bolt.to);
    const color = PLAYER_COLORS[bolt.from];
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    const steps = 7;
    for (let step = 1; step <= steps; step++) {
      const p = (step / steps) * Math.min(1, bolt.t * 1.05);
      const x = from.x + (to.x - from.x) * p;
      const y = from.y + (to.y - from.y) * p;
      const wobble = ((bolt.from * 13 + bolt.to * 7 + step * 5) % 9) - 4;
      ctx.lineTo(x + wobble * 4, y + (step % 2 === 0 ? 8 : -8));
    }
    ctx.stroke();
    ctx.restore();
  }
}

function centerOf(index) {
  const layout = highwayLayout(index);
  return { x: layout.x + layout.w / 2, y: layout.y + layout.h / 2 };
}

function drawPlay(ctx, view) {
  drawBackground(ctx, view, 0.78);
  const match = view.match;
  for (let i = 0; i < 4; i++) {
    if (match.slots[i] === "off") drawOff(ctx, i);
    else drawHighway(ctx, view, i);
  }
  drawBolts(ctx, match);
  drawSongBar(ctx, match);
  if (match.phase === "countdown") drawCountdown(ctx, match, view);
  if (view.goUntil > view.now) drawBanner(ctx, "GO", "Hit the highway");
  if (match.phase === "roundend") {
    const winner = match.roundWinner;
    const title = winner == null ? "NOBODY TAKES IT" : `${PLAYER_LABELS[winner]} TAKES THE ROUND`;
    drawBanner(ctx, title, "Enter to continue");
  }
  ctx.fillStyle = "#fff6d8";
  ctx.font = `700 16px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`ROUND ${match.roundIndex + 1} / ${match.roundsToPlay}`, VIEW_W / 2, 16);
}

function drawOff(ctx, index) {
  const layout = highwayLayout(index);
  fillRound(ctx, layout.x, layout.y, layout.w, layout.h, 16, "rgba(8,6,16,0.55)");
  strokeRound(ctx, layout.x, layout.y, layout.w, layout.h, 16, "rgba(255,255,255,0.08)", 1.5);
  ctx.fillStyle = "#8d849c";
  ctx.font = `700 28px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`${PLAYER_LABELS[index]} OFF`, layout.x + layout.w / 2, layout.y + layout.h / 2);
}

function drawSongBar(ctx, match) {
  const progress = match.durationMs > 0 ? Math.max(0, Math.min(1, match.songMs / match.durationMs)) : 0;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(0, VIEW_H - 6, VIEW_W, 6);
  ctx.fillStyle = "#fff6d8";
  ctx.fillRect(0, VIEW_H - 6, VIEW_W * progress, 6);
}

function drawCountdown(ctx, match) {
  const value = Math.max(1, Math.ceil(match.countdownMs / 1000));
  drawBanner(ctx, String(value), "Get ready");
}

function drawBanner(ctx, title, subtitle) {
  ctx.fillStyle = "rgba(7,6,13,0.55)";
  ctx.fillRect(0, VIEW_H / 2 - 90, VIEW_W, 180);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff6d8";
  ctx.font = `800 64px ${FONT}`;
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 6);
  ctx.fillStyle = "#cbbfe0";
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText(subtitle, VIEW_W / 2, VIEW_H / 2 + 36);
}

function drawPause(ctx, view) {
  drawPlay(ctx, view);
  dimOverlay(ctx);
  card(ctx, "PAUSED", ["Resume", "Settings", "Quit to title"], view.menu);
}

function drawSettings(ctx, view) {
  if (view.returnTo === "pause") drawPlay(ctx, view);
  else drawBackground(ctx, view, 0.55);
  dimOverlay(ctx);
  const volume = `${Math.round(view.settings.volume * 100)}%`;
  const mute = view.settings.muted ? "ON" : "OFF";
  card(ctx, "SETTINGS", [
    `Volume  ${volume}`,
    `Rounds  ${view.settings.rounds}`,
    `Mute  ${mute}`,
    "Controls",
    "Back",
  ], view.menu);
}

function drawControls(ctx, view) {
  drawBackground(ctx, view, 0.72);
  const player = view.remapPlayer;
  const color = PLAYER_COLORS[player];
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff6d8";
  ctx.font = `800 42px ${FONT}`;
  ctx.fillText("CONTROLS", VIEW_W / 2, 78);
  ctx.fillStyle = color;
  ctx.font = `800 28px ${FONT}`;
  ctx.fillText(PLAYER_LABELS[player], VIEW_W / 2, 120);
  ctx.fillStyle = "#cbbfe0";
  ctx.font = `500 18px ${FONT}`;
  ctx.fillText("Left / right change player. Enter rebinds the highlighted key.", VIEW_W / 2, 152);
  const bindings = view.settings.bindings[player];
  ACTIONS.forEach((action, index) => {
    const y = 190 + index * 64;
    const selected = index === view.remapAction;
    fillRound(ctx, 340, y, 600, 52, 10, selected ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)");
    if (selected) strokeRound(ctx, 340, y, 600, 52, 10, color, 2);
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff6d8";
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText(ACTION_LABELS[action], 366, y + 34);
    ctx.textAlign = "right";
    ctx.fillStyle = view.remapWaiting && selected ? "#ffd56a" : color;
    const label = view.remapWaiting && selected ? "PRESS A KEY" : formatCode(bindings[action]);
    ctx.fillText(label, 910, y + 34);
  });
  ctx.textAlign = "center";
  ctx.fillStyle = "#cbbfe0";
  ctx.font = `500 18px ${FONT}`;
  ctx.fillText("Gamepads use the standard layout and override that player's keys while plugged in.", VIEW_W / 2, 600);
  ctx.fillText("Esc back    ·    Enter, Esc, and M stay reserved", VIEW_W / 2, 634);
  if (view.notice && view.noticeUntil > view.now) {
    ctx.fillStyle = "#ff5a6a";
    ctx.font = `700 18px ${FONT}`;
    ctx.fillText(view.notice, VIEW_W / 2, 668);
  }
}

function drawMatch(ctx, view) {
  drawBackground(ctx, view, 0.78);
  const match = view.match;
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff6d8";
  ctx.font = `800 56px ${FONT}`;
  const winner = match.winner;
  ctx.fillText(winner == null ? "DRAW" : `${PLAYER_LABELS[winner]} WINS THE MATCH`, VIEW_W / 2, 110);
  const rows = [0, 1, 2, 3].filter((index) => match.slots[index] !== "off");
  rows.sort((a, b) => match.roundWins[b] - match.roundWins[a] || match.totals[b] - match.totals[a] || a - b);
  rows.forEach((index, place) => {
    const y = 170 + place * 78;
    const color = PLAYER_COLORS[index];
    panel(ctx, 280, y, 720, 66, color, index === winner);
    ctx.textAlign = "left";
    ctx.fillStyle = color;
    ctx.font = `800 26px ${FONT}`;
    ctx.fillText(`${place + 1}   ${PLAYER_LABELS[index]}`, 310, y + 42);
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff6d8";
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText(`${match.roundWins[index]} rounds    ${match.totals[index]} pts`, 970, y + 42);
  });
  menuList(ctx, ["Rematch", "Back to title"], view.menu, 390, 520, 500);
}

function dimOverlay(ctx) {
  ctx.fillStyle = "rgba(7,6,13,0.62)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function card(ctx, title, items, index) {
  const height = 120 + items.length * 58;
  const y = (VIEW_H - height) / 2;
  fillRound(ctx, 340, y, 600, height, 18, "rgba(12, 9, 22, 0.94)");
  strokeRound(ctx, 340, y, 600, height, 18, "rgba(255,246,216,0.35)", 2);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff6d8";
  ctx.font = `800 36px ${FONT}`;
  ctx.fillText(title, VIEW_W / 2, y + 54);
  menuList(ctx, items, index, 380, y + 84, 520);
}

function hexAlpha(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function render(canvas, view) {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const width = canvas.clientWidth || VIEW_W;
  const height = canvas.clientHeight || VIEW_H;
  const pixelW = Math.max(1, Math.floor(width * dpr));
  const pixelH = Math.max(1, Math.floor(height * dpr));
  if (canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas.width = pixelW;
    canvas.height = pixelH;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#07060d";
  ctx.fillRect(0, 0, width, height);
  const scale = Math.min(width / VIEW_W, height / VIEW_H);
  ctx.save();
  ctx.translate((width - VIEW_W * scale) / 2, (height - VIEW_H * scale) / 2);
  ctx.scale(scale, scale);
  ctx.font = `16px ${FONT}`;
  ctx.textBaseline = "alphabetic";
  switch (view.screen) {
    case "title":
      drawTitle(ctx, view);
      break;
    case "join":
      drawJoin(ctx, view);
      break;
    case "play":
      drawPlay(ctx, view);
      break;
    case "pause":
      drawPause(ctx, view);
      break;
    case "settings":
      drawSettings(ctx, view);
      break;
    case "controls":
      drawControls(ctx, view);
      break;
    case "match":
      drawMatch(ctx, view);
      break;
    default:
      drawTitle(ctx, view);
  }
  if (view.settings.muted) {
    ctx.fillStyle = "#fff6d8";
    ctx.font = `700 16px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText("MUTE", 24, VIEW_H - 18);
  }
  ctx.restore();
}
