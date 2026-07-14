type SoundType =
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
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: Record<string, ActiveNode> = {};

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
    this.master.gain.value = 0.78;

    const shelf = this.ctx.createBiquadFilter();
    shelf.type = "highshelf";
    shelf.frequency.value = 4200;
    shelf.gain.value = -8;

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

  /** Sparse exponentially-decaying noise bursts — fire crackle bed. */
  private crackleBuffer() {
    const sr = this.ctx!.sampleRate;
    const n = 10 * sr;
    const b = this.ctx!.createBuffer(1, n, sr);
    const d = b.getChannelData(0);
    const pops = 46;
    for (let p = 0; p < pops; p++) {
      const at = Math.floor(Math.random() * (n - sr * 0.06));
      const len = Math.floor(sr * (0.006 + Math.random() * 0.045));
      const amp = 0.12 + Math.random() * 0.5;
      for (let i = 0; i < len; i++) {
        const env = Math.exp((-5 * i) / len);
        d[at + i] += (Math.random() * 2 - 1) * amp * env;
      }
    }
    return b;
  }

  /** Amplitude-pulsed high sine chirps — distant summer crickets. */
  private cricketBuffer() {
    const sr = this.ctx!.sampleRate;
    const n = 12 * sr;
    const b = this.ctx!.createBuffer(1, n, sr);
    const d = b.getChannelData(0);
    let t = 0.4 * sr;
    while (t < n - sr) {
      const chirps = 3 + Math.floor(Math.random() * 3);
      const freq = 4100 + Math.random() * 500;
      for (let c = 0; c < chirps; c++) {
        const len = Math.floor(sr * 0.055);
        for (let i = 0; i < len && t + i < n; i++) {
          const env = Math.sin((Math.PI * i) / len);
          d[Math.floor(t) + i] +=
            Math.sin((2 * Math.PI * freq * i) / sr) * env * 0.32;
        }
        t += sr * 0.085;
      }
      t += sr * (0.5 + Math.random() * 1.4);
    }
    return b;
  }

  private customSrc(make: () => AudioBuffer) {
    const s = this.ctx!.createBufferSource();
    s.buffer = make();
    s.loop = true;
    return s;
  }

  start(id: string, type: SoundType, vol: number) {
    this.boot();
    this.stop(id, true);
    const out = this.gain(0);
    out.connect(this.master!);
    const stops: Array<AudioScheduledSourceNode> = [];
    const add = (s: AudioScheduledSourceNode) => {
      stops.push(s);
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
      const crackle = this.customSrc(() => this.crackleBuffer());
      bed.connect(this.filter("lowpass", 320)).connect(this.gain(0.5)).connect(out);
      crackle
        .connect(this.filter("bandpass", 2400, 0.7))
        .connect(this.gain(0.5))
        .connect(out);
      add(bed);
      add(crackle);
    } else if (type === "wind") {
      const a = this.src("pink");
      const bp = this.filter("bandpass", 380, 0.45);
      const wob = this.ctx!.createOscillator();
      const wobAmt = this.gain(160);
      wob.frequency.value = 0.07;
      wob.connect(wobAmt);
      wobAmt.connect(bp.frequency);
      const swellGain = this.gain(0.62);
      const swell = this.ctx!.createOscillator();
      const swellAmt = this.gain(0.2);
      swell.frequency.value = 0.05;
      swell.connect(swellAmt);
      swellAmt.connect(swellGain.gain);
      a.connect(bp).connect(swellGain).connect(out);
      add(a);
      add(wob);
      add(swell);
    } else if (type === "crickets") {
      const chirps = this.customSrc(() => this.cricketBuffer());
      const bed = this.src("pink");
      chirps
        .connect(this.filter("highpass", 2800, 0.6))
        .connect(this.gain(0.7))
        .connect(out);
      bed.connect(this.filter("lowpass", 480)).connect(this.gain(0.14)).connect(out);
      add(chirps);
      add(bed);
    } else if (type === "stream") {
      const a = this.src("white");
      const b = this.src("brown");
      const ripple = this.filter("bandpass", 1500, 0.55);
      const lfo = this.ctx!.createOscillator();
      const lfoAmt = this.gain(240);
      lfo.frequency.value = 0.21;
      lfo.connect(lfoAmt);
      lfoAmt.connect(ripple.frequency);
      a.connect(ripple).connect(this.gain(0.3)).connect(out);
      b.connect(this.filter("lowpass", 420)).connect(this.gain(0.34)).connect(out);
      add(a);
      add(b);
      add(lfo);
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

    this.nodes[id] = { out, stops };
    out.gain.linearRampToValueAtTime(vol, this.ctx!.currentTime + 1.4);
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
    if (hard) {
      n.stops.forEach((s) => {
        try {
          s.stop();
        } catch {
          /* already stopped */
        }
      });
      return;
    }
    n.out.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.2);
    window.setTimeout(() => {
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
    }, 1300);
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
}

export const audioEngine = new AudioEngine();
