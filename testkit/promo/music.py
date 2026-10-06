"""Music bed for the promo: warm pad + plucked arpeggio + soft pulse, following the scene timeline.
Problems are quieter (pad only), solutions bring the pulse, the finale swells and lands on a final chord."""
import numpy as np, json, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 44100
tl = json.load(open("timeline.json"))     # [{"kind","start","dur","pdur"}]
TOTAL = tl[-1]["start"] + tl[-1]["dur"]
N = int(SR * TOTAL)
BPM = 96
beat = 60 / BPM
t = np.arange(N) / SR

def note(m): return 440 * 2 ** ((m - 69) / 12)
# A minor → F → C → G (i–VI–III–VII), two bars each
PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
bar = beat * 4

def env_adsr(n, a, d, s, r):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, max(na, 1))
    e[na:na + nd] = np.linspace(1, s, max(len(e[na:na + nd]), 1))
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e

def lp(x, f, order=2):
    return sosfilt(butter(order, f / (SR / 2), output="sos"), x)

# energy curve: problems 0.35, solutions 1, hook 0.5, finale rises
energy = np.zeros(N)
for s in tl:
    a, b = int(s["start"] * SR), int((s["start"] + s["dur"]) * SR)
    if s["kind"] == "hook": energy[a:b] = np.linspace(.35, .55, b - a)
    elif s["kind"] == "problem":
        p = int((s["start"] + s["pdur"]) * SR)
        energy[a:p] = .3; energy[p:b] = 1
    else:
        energy[a:b] = 1.15
energy = lp(energy, 1.5, 1)  # smooth

pad = np.zeros(N); arp = np.zeros(N); bass = np.zeros(N); kick = np.zeros(N); hat = np.zeros(N)
nbars = int(TOTAL / bar) + 1
rng = np.random.default_rng(7)
for bi in range(nbars):
    chord = PROG[(bi // 2) % 4]
    st = bi * bar; a = int(st * SR); n = min(int(bar * SR), N - a)
    if n <= 0: break
    tt = np.arange(n) / SR
    e = env_adsr(n, .6, .4, .85, .5)
    for m in chord + [chord[0] + 12]:
        f = note(m)
        for det in (-0.12, 0.0, 0.11):
            ff = f * 2 ** (det / 12)
            ph = rng.uniform(0, 2 * np.pi)
            pad[a:a + n] += e * (2 * ((tt * ff + ph / (2 * np.pi)) % 1) - 1) * .05
    # bass on the root, eighths
    for k in range(8):
        s0 = a + int(k * beat / 2 * SR); ln = int(beat / 2 * SR * .9)
        if s0 + ln > N: break
        tt2 = np.arange(ln) / SR
        bass[s0:s0 + ln] += np.sin(2 * np.pi * note(chord[0] - 12) * tt2) * np.exp(-tt2 * 5) * .5
    # arpeggio sixteenths (plucked)
    pat = [0, 1, 2, 3, 2, 1, 0, 2] * 2
    for k, ix in enumerate(pat):
        s0 = a + int(k * beat / 4 * SR); ln = int(.35 * SR)
        if s0 + ln > N: break
        m = (chord + [chord[0] + 12])[ix] + 12
        tt2 = np.arange(ln) / SR
        tone = np.sin(2 * np.pi * note(m) * tt2) + .3 * np.sin(2 * np.pi * note(m) * 2 * tt2)
        arp[s0:s0 + ln] += tone * np.exp(-tt2 * 9) * .16
    # kick on beats, hat on offbeats
    for k in range(4):
        s0 = a + int(k * beat * SR); ln = int(.25 * SR)
        if s0 + ln > N: break
        tt2 = np.arange(ln) / SR
        fk = 50 + 90 * np.exp(-tt2 * 30)
        kick[s0:s0 + ln] += np.sin(2 * np.pi * np.cumsum(fk) / SR) * np.exp(-tt2 * 14) * .8
        s1 = s0 + int(beat / 2 * SR); ln2 = int(.05 * SR)
        if s1 + ln2 < N: hat[s1:s1 + ln2] += rng.normal(0, 1, ln2) * np.exp(-np.arange(ln2) / SR * 80) * .12

pad = lp(pad, 1600, 4) * 1.6
arp = lp(arp, 4500)
hat = sosfilt(butter(2, [6000 / (SR / 2), 11000 / (SR / 2)], btype="band", output="sos"), hat) * .45
pulse = np.clip((energy - .5) * 2, 0, 1)
mix = pad * (.55 + .45 * energy) + arp * np.clip(energy, .15, 1) + bass * pulse * .7 + kick * pulse * .55 + hat * pulse

mix = lp(mix, 12000, 4)
# riser into the finale + final chord hit
fin = next(s for s in tl if s["kind"] == "finale")
rs, re = fin["start"] - 1.6, fin["start"]
a, b = int(rs * SR), int(re * SR)
noise = rng.normal(0, 1, b - a)
noise = sosfilt(butter(2, [800 / (SR / 2), 6000 / (SR / 2)], btype="band", output="sos"), noise)
mix[a:b] += noise * np.linspace(0, .25, b - a) ** 2
hit = int((fin["start"] + 4.3) * SR); ln = min(int(5.5 * SR), N - hit)
tt = np.arange(ln) / SR
for m in [45, 57, 60, 64, 69]:
    mix[hit:hit + ln] += np.sin(2 * np.pi * note(m) * tt) * np.exp(-tt * .7) * .12
# fades
fade = int(1.5 * SR); mix[-fade:] *= np.linspace(1, 0, fade); mix[:int(.4 * SR)] *= np.linspace(0, 1, int(.4 * SR))
# stereo width: pad/arp slightly delayed on one side
L = mix; R = np.roll(mix, int(.012 * SR)) * .95 + mix * .05
st = np.stack([L, R], 1)
st /= np.max(np.abs(st)) / .89
wavfile.write("music.wav", SR, (st * 32767).astype(np.int16))
print("music", TOTAL, "s")
