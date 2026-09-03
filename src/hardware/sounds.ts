let ctx: AudioContext | null = null;

function tone(freq: number, ms: number, type: OscillatorType = 'square', gain = 0.04) {
  try {
    ctx ??= new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + ms / 1000);
  } catch {
    /* audio not available */
  }
}

export const sounds = {
  scan: () => tone(1800, 70),
  key: () => tone(900, 25, 'sine', 0.02),
  error: () => {
    tone(220, 160, 'sawtooth', 0.05);
    setTimeout(() => tone(180, 220, 'sawtooth', 0.05), 170);
  },
  success: () => {
    tone(1200, 80, 'sine');
    setTimeout(() => tone(1600, 120, 'sine'), 90);
  },
  drawer: () => tone(400, 120, 'triangle', 0.06),
};
