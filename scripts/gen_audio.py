#!/usr/bin/env python3
"""SleepCheck offline soundscape renderer.

Renders seamless stereo ambience loops using event-based + spectral DSP.
All filtering is done via FFT (circular convolution), and all envelopes/LFOs
use an integer number of cycles or circularly-filtered noise, so every loop
is mathematically seamless.

Usage: gen_audio.py <outdir> <sound> [<sound> ...]
Sounds: rain ocean fire wind stream crickets
"""
import sys
import wave
import numpy as np

SR = 44100
DUR = 32.0
N = int(SR * DUR)

rng = np.random.default_rng(7)


# ---------- helpers ----------

def rnoise(n=N):
    return rng.standard_normal(n)


def fftmask(x, mask_fn):
    """Circular (loop-safe) filtering via spectral mask."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    f = np.maximum(f, 1e-6)
    X *= mask_fn(f)
    return np.fft.irfft(X, n=len(x))


def lp(x, fc, order=4):
    return fftmask(x, lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * order)))


def hp(x, fc, order=4):
    return fftmask(x, lambda f: 1 / np.sqrt(1 + (fc / f) ** (2 * order)))


def bp(x, lo, hi, order=4):
    return hp(lp(x, hi, order), lo, order)


def peak_eq(x, fc, q, gain):
    """Add a resonant peak (parallel)."""
    bw = fc / q
    return x + gain * bp(x, fc - bw / 2, fc + bw / 2, 2)


def slow_env(fc, lo=0.0, hi=1.0, n=N):
    """Loop-seamless slow random envelope in [lo, hi]."""
    e = lp(rnoise(n), fc, 2)
    e -= e.min()
    if e.max() > 0:
        e /= e.max()
    return lo + (hi - lo) * e


def add_event(buf_l, buf_r, snippet, pos, pan):
    """Add snippet at pos with circular wrap. pan in [-1, 1]."""
    n = len(snippet)
    gl = np.sqrt(0.5 * (1 - pan))
    gr = np.sqrt(0.5 * (1 + pan))
    idx = (np.arange(pos, pos + n)) % N
    buf_l[idx] += snippet * gl
    buf_r[idx] += snippet * gr


def normalize(l, r, peak=0.71):
    m = max(np.abs(l).max(), np.abs(r).max(), 1e-9)
    return l * peak / m, r * peak / m


def write_wav(path, l, r):
    data = np.stack([l, r], axis=1)
    data = np.clip(data, -1, 1)
    pcm = (data * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def damped_sine(f0, decay_s, dur_s, sweep=1.0):
    t = np.arange(int(dur_s * SR)) / SR
    f_inst = f0 * (sweep + (1 - sweep) * np.exp(-t / (decay_s * 0.7)))
    phase = 2 * np.pi * np.cumsum(f_inst) / SR
    return np.sin(phase) * np.exp(-t / decay_s)


def noise_burst(dur_s, lo, hi, decay_s):
    n = int(dur_s * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n) * np.exp(-t / decay_s)
    # short bursts: cheap biquad-ish via fft on the snippet (fine, not loop-critical)
    X = np.fft.rfft(x)
    f = np.maximum(np.fft.rfftfreq(n, 1 / SR), 1e-6)
    X *= 1 / np.sqrt(1 + (f / hi) ** 8) * 1 / np.sqrt(1 + (lo / f) ** 8)
    return np.fft.irfft(X, n=n)


# ---------- soundscapes ----------

def gen_rain():
    L = np.zeros(N)
    R = np.zeros(N)

    # Distant wash bed — stereo-decorrelated, gently breathing
    for buf, seed_off in ((L, 0), (R, 1)):
        bed = bp(rnoise(), 350, 3200, 2)
        bed = lp(bed, 2600, 2)
        buf += 0.16 * bed * slow_env(0.11, 0.85, 1.0)

    # Patter layer: thousands of tiny droplets
    n_drops = int(DUR * 420)
    for _ in range(n_drops):
        dur = rng.uniform(0.002, 0.009)
        lo = rng.uniform(1800, 4000)
        hi = lo * rng.uniform(1.8, 2.6)
        s = noise_burst(dur, lo, min(hi, 11000), dur * 0.4)
        amp = rng.exponential(0.045)
        add_event(L, R, s * min(amp, 0.30), rng.integers(0, N), rng.uniform(-0.9, 0.9))

    # Bigger drops on leaves: damped-sine plip with pitch fall
    n_plips = int(DUR * 7)
    for _ in range(n_plips):
        f0 = rng.uniform(700, 2400)
        s = damped_sine(f0, rng.uniform(0.01, 0.035), 0.09, sweep=0.55)
        tick = noise_burst(0.012, f0 * 0.8, min(f0 * 3, 11000), 0.004)
        s[: len(tick)] += 0.5 * tick
        amp = rng.uniform(0.02, 0.10)
        add_event(L, R, s * amp, rng.integers(0, N), rng.uniform(-0.75, 0.75))

    # Gutter drips (sparser, lower)
    for _ in range(int(DUR * 1.2)):
        f0 = rng.uniform(300, 620)
        s = damped_sine(f0, 0.05, 0.22, sweep=0.5)
        add_event(L, R, s * rng.uniform(0.02, 0.05), rng.integers(0, N), rng.uniform(-0.5, 0.5))

    L, R = lp(L, 7500, 2), lp(R, 7500, 2)  # soften extreme highs for sleep
    return normalize(L, R)


def gen_ocean():
    L = np.zeros(N)
    R = np.zeros(N)

    # Deep constant rumble, decorrelated
    L += 0.30 * lp(rnoise(), 220, 3) * slow_env(0.06, 0.8, 1.0)
    R += 0.30 * lp(rnoise(), 220, 3) * slow_env(0.06, 0.8, 1.0)

    # Waves: integer count so spacing wraps naturally
    n_waves = 3
    base = N // n_waves
    for i in range(n_waves):
        pos = i * base + rng.integers(-SR, SR)
        approach = rng.uniform(2.2, 3.2)
        crash = rng.uniform(0.7, 1.1)
        wash = rng.uniform(4.5, 6.5)
        total = approach + crash + wash
        n = int(total * SR)
        t = np.arange(n) / SR

        env_ap = np.clip(t / approach, 0, 1) ** 2.6 * (t < approach)
        tc = t - approach
        env_cr = np.exp(-np.clip(tc, 0, None) / (crash * 0.55)) * (t >= approach)
        env_wa = np.exp(-np.clip(tc - crash * 0.4, 0, None) / (wash * 0.55)) * (
            t >= approach + crash * 0.4
        )

        x = rng.standard_normal(n)
        low = _snip_lp(x, 480)
        mid = _snip_bp(x, 380, 2400)
        hiss = _snip_bp(rng.standard_normal(n), 1800, 7600)

        wavesnd = 0.85 * low * env_ap + 1.0 * mid * env_cr + 0.55 * hiss * env_wa
        # receding wash gets progressively darker
        wavesnd += 0.35 * low * env_wa
        pan = rng.uniform(-0.35, 0.35) + (0.25 if i % 2 else -0.25)
        add_event(L, R, wavesnd * 0.34, pos % N, pan)

    L, R = lp(L, 6800, 2), lp(R, 6800, 2)
    return normalize(L, R)


def _snip_filter(x, mask_fn):
    n = len(x)
    X = np.fft.rfft(x)
    f = np.maximum(np.fft.rfftfreq(n, 1 / SR), 1e-6)
    return np.fft.irfft(X * mask_fn(f), n=n)


def _snip_lp(x, fc, order=3):
    return _snip_filter(x, lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * order)))


def _snip_bp(x, lo, hi, order=3):
    return _snip_filter(
        x,
        lambda f: 1
        / np.sqrt(1 + (f / hi) ** (2 * order))
        / np.sqrt(1 + (lo / f) ** (2 * order)),
    )


def gen_fire():
    L = np.zeros(N)
    R = np.zeros(N)

    # Ember bed with slow flame breathing
    breathe = slow_env(0.5, 0.55, 1.0)
    L += 0.34 * lp(rnoise(), 240, 3) * breathe
    R += 0.34 * lp(rnoise(), 240, 3) * breathe

    # Soft flame hiss
    hiss_env = slow_env(0.8, 0.3, 1.0)
    L += 0.045 * bp(rnoise(), 2500, 7000, 2) * hiss_env
    R += 0.045 * bp(rnoise(), 2500, 7000, 2) * hiss_env

    # Small crackles
    for _ in range(int(DUR * 11)):
        kind = rng.random()
        if kind < 0.7:  # tick
            s = noise_burst(rng.uniform(0.002, 0.006), 2200, 9000, 0.0018)
            amp = rng.uniform(0.05, 0.22)
        else:  # snap with body
            f0 = rng.uniform(900, 3200)
            s = damped_sine(f0, rng.uniform(0.004, 0.018), 0.05, sweep=0.8)
            s += noise_burst(0.004, 1500, 8000, 0.0015).sum() * 0  # keep len
            amp = rng.uniform(0.06, 0.26)
        add_event(L, R, s * amp, rng.integers(0, N), rng.uniform(-0.8, 0.8))

    # Occasional deep pops
    for _ in range(int(DUR * 0.6)):
        f0 = rng.uniform(140, 380)
        s = damped_sine(f0, 0.05, 0.28, sweep=0.6)
        add_event(L, R, s * rng.uniform(0.1, 0.2), rng.integers(0, N), rng.uniform(-0.4, 0.4))

    L, R = lp(L, 8200, 2), lp(R, 8200, 2)
    return normalize(L, R)


def gen_wind():
    L = np.zeros(N)
    R = np.zeros(N)

    gust = slow_env(0.09, 0.25, 1.0)  # shared gust contour
    for buf in (L, R):
        x = rnoise()
        body = bp(x, 90, 900, 2)
        # slowly wandering formant
        f_wander = slow_env(0.05, 0.0, 1.0)
        low_v = bp(x, 120, 420, 2)
        high_v = bp(x, 260, 980, 2)
        body = low_v * (1 - f_wander) + high_v * f_wander
        buf += 0.5 * body * gust

        # gust whistle only at peaks
        whistle = bp(x, 750, 1250, 3)
        buf += 0.10 * whistle * np.maximum(gust - 0.62, 0) ** 1.5 * 6

        # leaf rustle follows gusts
        rustle = bp(rnoise(), 2200, 7800, 2)
        buf += 0.09 * rustle * gust ** 2.2

    L, R = lp(L, 7000, 2), lp(R, 7000, 2)
    return normalize(L, R)


def gen_stream():
    L = np.zeros(N)
    R = np.zeros(N)

    # Several gurgle voices with fast independent AM
    for _ in range(5):
        lo = rng.uniform(350, 900)
        hi = lo * rng.uniform(2.2, 3.4)
        voice = bp(rnoise(), lo, hi, 2)
        am = slow_env(rng.uniform(2.5, 7.0), 0.25, 1.0)
        pan = rng.uniform(-0.7, 0.7)
        gl, gr = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
        L += 0.16 * voice * am * gl
        R += 0.16 * voice * am * gr

    # Bright ripple sheet
    for buf in (L, R):
        rip = bp(rnoise(), 2600, 8200, 2)
        buf += 0.07 * rip * slow_env(3.5, 0.5, 1.0)

    # Low water body
    L += 0.20 * lp(rnoise(), 300, 3)
    R += 0.20 * lp(rnoise(), 300, 3)

    # Bloops: little pitch-down plops
    for _ in range(int(DUR * 1.6)):
        f0 = rng.uniform(400, 950)
        s = damped_sine(f0, 0.03, 0.12, sweep=0.45)
        add_event(L, R, s * rng.uniform(0.02, 0.06), rng.integers(0, N), rng.uniform(-0.6, 0.6))

    L, R = lp(L, 8000, 2), lp(R, 8000, 2)
    return normalize(L, R)


def gen_crickets():
    L = np.zeros(N)
    R = np.zeros(N)

    # Night bed: very soft dark air
    L += 0.05 * lp(rnoise(), 500, 2)
    R += 0.05 * lp(rnoise(), 500, 2)
    L += 0.02 * bp(rnoise(), 1500, 5000, 2) * slow_env(0.2, 0.4, 1.0)
    R += 0.02 * bp(rnoise(), 1500, 5000, 2) * slow_env(0.2, 0.4, 1.0)

    # Individual crickets: pulse-train chirps, distance-filtered
    n_crickets = 5
    for c in range(n_crickets):
        carrier = rng.uniform(3900, 5100)
        pulse_rate = rng.uniform(38, 55)  # wing strokes/s
        n_pulses = rng.integers(3, 6)
        chirp_period = rng.uniform(0.42, 0.95)
        distance = rng.uniform(0.25, 1.0)  # 1 = far
        pan = rng.uniform(-0.85, 0.85)
        level = 0.055 * (1.1 - distance)

        # build one chirp
        pulse_len = int(SR * 0.55 / pulse_rate)
        t = np.arange(pulse_len) / SR
        pulse = np.sin(2 * np.pi * carrier * t) * np.sin(np.pi * t / t[-1]) ** 1.5
        gap = int(SR / pulse_rate) - pulse_len
        chirp = np.concatenate(
            [np.concatenate([pulse, np.zeros(max(gap, 0))]) for _ in range(n_pulses)]
        )
        # distance darkening
        chirp = _snip_lp(chirp, 6500 - 3200 * distance, 2)

        # integer chirp count so the pattern loops
        n_chirps = int(round(DUR / chirp_period))
        for k in range(n_chirps):
            if rng.random() < 0.12:  # occasional skipped chirp = natural
                continue
            pos = int(k * N / n_chirps + rng.integers(-800, 800)) % N
            add_event(L, R, chirp * level * rng.uniform(0.8, 1.1), pos, pan)

    L, R = lp(L, 6200, 2), lp(R, 6200, 2)  # keep highs gentle for sleep
    return normalize(L, R, peak=0.6)


GENS = {
    "rain": gen_rain,
    "ocean": gen_ocean,
    "fire": gen_fire,
    "wind": gen_wind,
    "stream": gen_stream,
    "crickets": gen_crickets,
}

if __name__ == "__main__":
    outdir = sys.argv[1]
    for name in sys.argv[2:]:
        print(f"rendering {name}...", flush=True)
        l, r = GENS[name]()
        write_wav(f"{outdir}/{name}.wav", l, r)
        print(f"done {name}", flush=True)
