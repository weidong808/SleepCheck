export type SynthType =
  | "rain"
  | "ocean"
  | "brown"
  | "pink"
  | "white"
  | "binaural"
  | "fire"
  | "wind"
  | "crickets"
  | "stream";

type ActiveNode = {
  out: GainNode;
  stops: Array<AudioScheduledSourceNode>;
  loopTimer?: number;
};

/** Crossfade duration between loop passes of sampled ambience (seconds). */
const LOOP_FADE = 1.0;
/** Trim decoded MP3 edges to skip encoder padding (seconds). */
const LOOP_TRIM = 0.06;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: Record<string, ActiveNode> = {};
  private buffers: Record<string, AudioBuffer> = {};
  private loading: Record<string, Promise<AudioBuffer | null>> = {};

  boot() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.82;

    const shelf = this.ctx.createBiquadFilter();
    shelf.type = "highshelf";
    shelf.frequency.value = 4200;
    shelf.gain.value = -6;

    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 14;
    comp.ratio.value = 2.6;
    comp.attack.value = 0.16;
    comp.release.value = 0.45;

    this.master.connect(shelf);
    shelf.connect(comp);
    comp.connect(this.ctx.destination);
  }

  /** Fetch + decode a sampled loop once; cached for the session. */
  private loadBuffer(src: string): Promise<AudioBuffer | null> {
    if (this.buffers[src]) return Promise.resolve(this.buffers[src]);
    if (!(src in this.loading)) {
      this.loading[src] = fetch(src)
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.arrayBuffer();
        })
        .then((ab) => this.ctx!.decodeAudioData(ab))
        .then((buf) => {
          this.buffers[src] = buf;
          return buf;
        })
        .catch(() => null);
    }
    return this.loading[src];
  }

  /** Warm the cache so play starts instantly later. */
  preload(srcs: string[]) {
    this.boot();
    for (const s of srcs) void this.loadBuffer(s);
  }

  /**
   * Gapless playback: schedule overlapping buffer passes with an
   * equal-power crossfade, immune to MP3 encoder padding.
   */
  private playSampleLoop(id: string, buffer: AudioBuffer, out: GainNode) {
    const ctx = this.ctx!;
    const dur = buffer.duration - 2 * LOOP_TRIM;
    const period = dur - LOOP_FADE;
    let nextStart = ctx.currentTime + 0.03;

    const scheduleOne = (when: number) => {
      const node = this.nodes[id];
      if (!node) return;
      const s = ctx.createBufferSource();
      s.buffer = buffer;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(1, when + LOOP_FADE);
      g.gain.setValueAtTime(1, when + dur - LOOP_FADE);
      g.gain.linearRampToValueAtTime(0, when + dur);
      s.connect(g);
      g.connect(out);
      s.start(when, LOOP_TRIM, dur);
      s.onended = () => {
        try {
          g.disconnect();
        } catch {
          /* noop */
        }
        const n = this.nodes[id];
        if (n) n.stops = n.stops.filter((x) => x !== s);
      };
      node.stops.push(s);
    };

    scheduleOne(nextStart);
    nextStart += period;
    scheduleOne(nextStart);

    const node = this.nodes[id];
    if (!node) return;
    node.loopTimer = window.setInterval(() => {
      if (!this.ctx || !this.nodes[id]) return;
      // Keep two passes scheduled ahead.
      while (nextStart - this.ctx.currentTime < period) {
        nextStart += period;
        scheduleOne(nextStart);
      }
    }, 1000);
  }

  private gain(v: number) {
    const g = this.ctx!.createGain();
    g.gain.value = v;
    return g;
  }

  private filter(type: BiquadFilterType, f: number, q = 1) {
    const n = this.ctx!.createBiquadFilter();
    n.type = type;
    n.frequency.value = f;
    n.Q.value = q;
    return n;
  }

  private noise(kind: "brown" | "pink" | "white") {
    const n = 8 * this.ctx!.sampleRate;
    const b = this.ctx!.createBuffer(1, n, this.ctx!.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    let mx = 0;

    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      let v: number;
      if (kind === "brown") {
        v = (last + 0.02 * w) / 1.02;
        last = v;
      } else if (kind === "pink") {
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        v = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        v = w;
      }
      d[i] = v;
      mx = Math.max(mx, Math.abs(v));
    }

    const s = 0.62 / (mx || 1);
    for (let i = 0; i < n; i++) d[i] *= s;
    return b;
  }

  private src(kind: "brown" | "pink" | "white") {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise(kind);
    s.loop = true;
    return s;
  }

  /**
   * Start a sound. If `sampleSrc` is given, plays the rendered loop
   * (falling back to live synthesis when it can't be fetched).
   */
  start(id: string, type: SynthType, vol: number, sampleSrc?: string) {
    this.boot();
    this.stop(id, true);
    const out = this.gain(0);
    out.connect(this.master!);
    this.nodes[id] = { out, stops: [] };

    if (sampleSrc) {
      void this.loadBuffer(sampleSrc).then((buf) => {
        const node = this.nodes[id];
        if (!node || node.out !== out) return; // stopped meanwhile
        if (buf) {
          this.playSampleLoop(id, buf, out);
          out.gain.linearRampToValueAtTime(vol, this.ctx!.currentTime + 1.2);
        } else {
          this.startSynth(id, type, out);
          out.gain.linearRampToValueAtTime(vol, this.ctx!.currentTime + 1.2);
        }
      });
      return;
    }

    this.startSynth(id, type, out);
    out.gain.linearRampToValueAtTime(vol, this.ctx!.currentTime + 1.4);
  }

  private startSynth(id: string, type: SynthType, out: GainNode) {
    const node = this.nodes[id];
    if (!node) return;
    const add = (s: AudioScheduledSourceNode) => {
      node.stops.push(s);
      s.start();
    };

    if (type === "rain") {
      const a = this.src("brown");
      const b = this.src("pink");
      const c = this.src("white");
      a.connect(this.filter("lowpass", 190)).connect(this.gain(0.3)).connect(out);
      b.connect(this.filter("bandpass", 1150, 0.36))
        .connect(this.gain(0.48))
        .connect(out);
      c.connect(this.filter("bandpass", 3600, 0.5))
        .connect(this.gain(0.08))
        .connect(out);
      [a, b, c].forEach(add);
    } else if (type === "ocean") {
      const a = this.src("brown");
      const b = this.src("brown");
      const l = this.ctx!.createOscillator();
      const lg = this.gain(0.28);
      const cg = this.gain(0.42);
      l.frequency.value = 0.08;
      l.connect(lg);
      lg.connect(cg.gain);
      a.connect(this.filter("lowpass", 130)).connect(this.gain(0.38)).connect(out);
      b.connect(this.filter("lowpass", 520)).connect(cg).connect(out);
      add(a);
      add(b);
      add(l);
    } else if (type === "fire") {
      const bed = this.src("brown");
      bed.connect(this.filter("lowpass", 320)).connect(this.gain(0.6)).connect(out);
      add(bed);
    } else if (type === "wind") {
      const a = this.src("pink");
      const bp = this.filter("bandpass", 380, 0.45);
      const wob = this.ctx!.createOscillator();
      const wobAmt = this.gain(160);
      wob.frequency.value = 0.07;
      wob.connect(wobAmt);
      wobAmt.connect(bp.frequency);
      a.connect(bp).connect(this.gain(0.62)).connect(out);
      add(a);
      add(wob);
    } else if (type === "crickets" || type === "stream") {
      const a = this.src(type === "stream" ? "white" : "pink");
      a.connect(
        this.filter("bandpass", type === "stream" ? 1500 : 4300, 0.6),
      )
        .connect(this.gain(0.4))
        .connect(out);
      add(a);
    } else if (type === "binaural") {
      const m = this.ctx!.createChannelMerger(2);
      const lo = this.ctx!.createOscillator();
      const ro = this.ctx!.createOscillator();
      lo.frequency.value = 180;
      ro.frequency.value = 186;
      lo.connect(this.gain(0.16)).connect(m, 0, 0);
      ro.connect(this.gain(0.16)).connect(m, 0, 1);
      m.connect(out);
      add(lo);
      add(ro);
    } else {
      const kind = type === "brown" ? "brown" : type === "pink" ? "pink" : "white";
      const s = this.src(kind);
      s.connect(this.filter("lowpass", type === "brown" ? 2100 : 7600)).connect(
        out,
      );
      add(s);
    }
  }

  setVol(id: string, vol: number) {
    if (!this.nodes[id] || !this.ctx) return;
    this.nodes[id].out.gain.linearRampToValueAtTime(
      vol,
      this.ctx.currentTime + 0.12,
    );
  }

  stop(id: string, hard = false) {
    if (!this.nodes[id] || !this.ctx) return;
    const n = this.nodes[id];
    delete this.nodes[id];
    if (n.loopTimer) window.clearInterval(n.loopTimer);
    const kill = () => {
      n.stops.forEach((s) => {
        try {
          s.stop();
        } catch {
          /* already stopped */
        }
      });
      try {
        n.out.disconnect();
      } catch {
        /* noop */
      }
    };
    if (hard) {
      kill();
      return;
    }
    n.out.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.2);
    window.setTimeout(kill, 1300);
  }

  stopAll() {
    Object.keys(this.nodes).forEach((id) => this.stop(id));
  }

  fadeTo(v: number, d: number) {
    if (!this.master || !this.ctx) return;
    this.master.gain.linearRampToValueAtTime(v, this.ctx.currentTime + d);
  }

  suspend() {
    void this.ctx?.suspend();
  }

  resume() {
    void this.ctx?.resume();
  }

  get running() {
    return this.ctx?.state === "running" && Object.keys(this.nodes).length > 0;
  }

  get anyActive() {
    return Object.keys(this.nodes).length > 0;
  }
}

export const audioEngine = new AudioEngine();
