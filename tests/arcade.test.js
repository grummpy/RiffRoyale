import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("arcade.json points at real launch files", () => {
  const arcade = JSON.parse(read("arcade.json"));
  assert.equal(arcade.name, "Riff Royale");
  assert.equal(arcade.id, "riffroyale");
  assert.equal(arcade.players, 4);
  assert.equal(arcade.minPlayers, 1);
  assert.equal(arcade.port, 8810);
  assert.equal(arcade.version, "1.0.0");
  assert.deepEqual(arcade.input, ["keyboard", "gamepad"]);
  assert.equal(arcade.icon, "assets/icon.jpg");
  assert.equal(arcade.cover, "assets/cover.jpg");
  assert.deepEqual(arcade.launch, {
    mac: "./launch-mac.command",
    windows: "launch-windows.bat",
    linux: "./launch-linux.sh",
    web: "index.html",
  });
  for (const rel of [arcade.icon, arcade.cover, ...Object.values(arcade.launch)]) {
    const file = path.join(root, rel.replace(/^\.\//, ""));
    assert.equal(fs.existsSync(file), true, rel);
  }
});

test("launchers start server.py and explain a missing Python 3", () => {
  for (const file of ["launch-mac.command", "launch-linux.sh"]) {
    const text = read(file);
    assert.match(text, /python3/);
    assert.match(text, /server\.py/);
    assert.match(text, /Python 3 is required/);
  }
  const windows = read("launch-windows.bat");
  assert.match(windows, /server\.py/);
  assert.match(windows, /Python 3 is required/);
  const html = read("index.html");
  assert.match(html, /<canvas/);
  assert.match(html, /src\/main\.js/);
  assert.match(html, /Riff Royale/);
  assert.doesNotMatch(html, /https?:\/\//);
});

test("core modules stay free of the DOM, canvas, and network", () => {
  const dir = path.join(root, "src", "core");
  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".js"));
  assert.ok(files.length >= 6);
  for (const name of files) {
    const text = fs.readFileSync(path.join(dir, name), "utf8");
    assert.doesNotMatch(text, /document|localStorage|HTMLCanvas|AudioContext|fetch\(|XMLHttpRequest|https?:\/\//);
    assert.doesNotMatch(text, /\bwindow\b/);
  }
});
