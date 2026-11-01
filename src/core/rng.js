/**
 * Mulberry32. Same seed always yields the same stream, which is what
 * charts, bots, and replays rely on.
 */
export function createRng(seed) {
  let a = seed >>> 0;
  return {
    next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    nextInt(max) {
      return Math.floor(this.next() * max);
    },
    getState() {
      return a >>> 0;
    },
  };
}

/** Mix a match seed with a round or player salt. Stable across runs. */
export function mixSeed(seed, salt) {
  let x = (seed ^ Math.imul(salt >>> 0, 0x9e3779b1)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}
