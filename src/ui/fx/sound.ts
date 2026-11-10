/** How loud an impact sounds for a speed in m/s: quiet taps stay audible, and hard hits level off. */
export const impactGain = (speed: number) => Math.min(1, Math.pow(Math.max(speed, 0) / 5, 0.7));

/** Sounds closer together than this, in seconds, merge into one: a pack breaking up would otherwise clip. */
const MIN_GAP = 0.008;

/** Table sounds synthesised on the fly, so the app ships no audio files. Silent where Web Audio is missing. */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private enabled = true;
  private volume = 0.7;
  private last = 0;

  configure(enabled: boolean, volume: number) {
    this.enabled = enabled;
    this.volume = volume;
    if (this.master) this.master.gain.value = volume;
  }

  private ready(): AudioContext | null {
    if (!this.enabled || typeof AudioContext === "undefined") return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.25, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buffer;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone(ctx: AudioContext, freq: number, decay: number, gain: number, delay = 0, type: OscillatorType = "sine") {
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(env).connect(this.master!);
    osc.start(t);
    osc.stop(t + decay + 0.01);
  }

  private burst(ctx: AudioContext, cutoff: number, decay: number, gain: number, delay = 0) {
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    src.buffer = this.noise;
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(filter).connect(env).connect(this.master!);
    src.start(t);
    src.stop(t + decay + 0.01);
  }

  /** A sound slot, unless one has only just been used. */
  private slot(): AudioContext | null {
    const ctx = this.ready();
    if (!ctx || ctx.currentTime - this.last < MIN_GAP) return null;
    this.last = ctx.currentTime;
    return ctx;
  }

  /** The tip striking the ball, or a finger flicking a disc. */
  strike(speed: number) {
    const ctx = this.slot();
    if (ctx) this.burst(ctx, 2600, 0.05, 0.35 * impactGain(speed));
  }

  /** Two balls or discs meeting: bright and short for ivory, lower and woodier for discs. */
  click(speed: number, disc: boolean) {
    const ctx = this.slot();
    if (!ctx) return;
    const g = impactGain(speed);
    this.tone(ctx, disc ? 900 : 2400, disc ? 0.05 : 0.035, 0.55 * g, 0, "triangle");
    this.burst(ctx, disc ? 2200 : 6000, 0.02, 0.3 * g);
  }

  thud(speed: number) {
    const ctx = this.slot();
    if (!ctx) return;
    const g = impactGain(speed);
    this.tone(ctx, 130, 0.09, 0.5 * g);
    this.burst(ctx, 420, 0.06, 0.3 * g);
  }

  drop() {
    const ctx = this.slot();
    if (!ctx) return;
    this.tone(ctx, 95, 0.16, 0.55);
    this.burst(ctx, 700, 0.1, 0.3);
    this.tone(ctx, 240, 0.05, 0.14, 0.09, "triangle");
    this.tone(ctx, 200, 0.05, 0.1, 0.16, "triangle");
  }

  /** A short rising figure; a higher `level` adds notes. */
  chime(level: 1 | 2 | 3) {
    const ctx = this.ready();
    if (!ctx) return;
    [523, 659, 784, 1047].slice(0, level + 1).forEach((f, i) => this.tone(ctx, f, 0.5, 0.16, i * 0.11, "triangle"));
  }
}

export const sound = new SoundEngine();
