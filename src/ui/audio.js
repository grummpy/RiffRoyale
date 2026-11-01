/** Everything you hear is an oscillator, a noise burst, or an envelope. */

const SCALE = [0, 3, 7, 10, 12, 10, 7, 3];

function freq(semi) {
  return 110 * 2 ** (semi / 12);
}

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicBus = null;
  let sfxBus = null;
  let volume = 0.8;
  let muted = false;
  let menuTicks = 0;
  let menuStep = 0;
  let lastBeat = -1;

  function ensure() {
    if (ctx) return true;
    const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioCtx) return false;
    try {
      ctx = new AudioCtx();
    } catch {
      return false;
    }
    master = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus.gain.value = 0.32;
    sfxBus.gain.value = 0.85;
    musicBus.connect(master);
    sfxBus.connect(master);
    master.connect(ctx.destination);
    applyVolume();
    return true;
  }

  function applyVolume() {
    if (master) master.gain.value = muted ? 0 : volume;
  }

  function envelope(at, duration, peak) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    return gain;
  }

  function tone(frequency, duration, type, peak, when, bus) {
    if (!ensure()) return;
    const at = when ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = envelope(at, duration, peak);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, at);
    osc.connect(gain);
    gain.connect(bus || sfxBus);
    osc.start(at);
    osc.stop(at + duration + 0.03);
  }

  function noise(duration, peak) {
    if (!ensure()) return;
    const at = ctx.currentTime;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let state = 0x12345678;
    for (let i = 0; i < length; i++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      data[i] = (state / 4294967296) * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 800;
    const gain = envelope(at, duration, peak);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(sfxBus);
    source.start(at);
  }

  return {
    unlock() {
      if (!ensure()) return;
      if (ctx.state === "suspended") ctx.resume();
    },
    setVolume(value) {
      volume = Math.max(0, Math.min(1, value));
      applyVolume();
    },
    setMuted(value) {
      muted = !!value;
      applyVolume();
      return muted;
    },
    toggleMute() {
      muted = !muted;
      applyVolume();
      return muted;
    },
    /** Short looping chiptune for the title and join screens. */
    menu(active) {
      if (!active) {
        menuTicks = 0;
        menuStep = 0;
        return;
      }
      menuTicks += 1;
      if (menuTicks % 15 !== 0) return;
      const semi = SCALE[menuStep % SCALE.length];
      menuStep += 1;
      tone(freq(semi + 12), 0.16, "square", 0.07, undefined, musicBus);
      if (menuStep % 2 === 0) tone(freq(semi - 12), 0.18, "triangle", 0.06, undefined, musicBus);
    },
    /** Beat-synced with the chart clock so the highway and the song agree. */
    syncSong(songMs, bpm, active) {
      if (!active) return;
      if (!ensure()) return;
      const beat = Math.floor(songMs / (60000 / bpm));
      if (beat < 0 || beat === lastBeat) return;
      const from = lastBeat < 0 ? beat : lastBeat + 1;
      lastBeat = beat;
      for (let index = from; index <= beat; index++) {
        const semi = SCALE[((index % SCALE.length) + SCALE.length) % SCALE.length];
        tone(freq(semi - 12), 0.18, "triangle", 0.08, undefined, musicBus);
        if (index % 2 === 0) tone(freq(semi + 12), 0.1, "square", 0.045, undefined, musicBus);
      }
    },
    perfect() {
      tone(880, 0.07, "square", 0.11);
      tone(1320, 0.09, "square", 0.05);
    },
    good() {
      tone(640, 0.07, "square", 0.09);
    },
    miss() {
      noise(0.09, 0.15);
      tone(96, 0.12, "sawtooth", 0.05);
    },
    lightning() {
      tone(160, 0.18, "sawtooth", 0.12);
      tone(640, 0.1, "square", 0.05);
      noise(0.1, 0.08);
    },
    zap() {
      noise(0.07, 0.12);
      tone(130, 0.14, "sawtooth", 0.07);
    },
    pickup() {
      tone(988, 0.06, "square", 0.07);
      tone(1480, 0.08, "square", 0.04);
    },
    ko() {
      tone(196, 0.2, "sawtooth", 0.11);
      tone(98, 0.28, "triangle", 0.08);
    },
    countdown(value) {
      tone(value === 0 ? 880 : 494, 0.11, "square", 0.1);
    },
    round() {
      tone(523, 0.1, "square", 0.09);
      tone(659, 0.12, "square", 0.07);
      tone(784, 0.18, "square", 0.07);
    },
    match() {
      if (!ensure()) return;
      [0, 4, 7, 12].forEach((semi, index) => {
        tone(freq(semi + 12), 0.18, "square", 0.08, ctx.currentTime + index * 0.09);
      });
    },
    ui() {
      tone(540, 0.04, "square", 0.045);
    },
  };
}
