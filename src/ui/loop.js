/** Fixed 60 Hz update, render once per frame. */
export function createLoop(update, draw) {
  const stepMs = 1000 / 60;
  let acc = 0;
  let last = 0;
  let frame = 0;
  let running = false;

  function tick(now) {
    if (!running) return;
    if (!last) last = now;
    acc += Math.min(250, now - last);
    last = now;
    while (acc >= stepMs) {
      update(stepMs);
      acc -= stepMs;
    }
    draw();
    frame = requestAnimationFrame(tick);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = 0;
      acc = 0;
      frame = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
    },
  };
}
