// Kombat Engine: synthesized sound effects and a deep announcer voice (no audio files)
'use strict';
const SFX = (() => {
  let ac = null, master = null, muted = false, voice = null;
  try { muted = localStorage.getItem('mk_muted') === '1'; } catch (e) {}
  function unlock() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ac.destination); }
      try { if (window.speechSynthesis) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch (e) {}
    }
    if (ac && ac.state === 'suspended') ac.resume();
  }
  function setMuted(m) { muted = m; try { localStorage.setItem('mk_muted', m ? '1' : '0'); } catch (e) {} if (master) master.gain.value = m ? 0 : 0.55; if (m && window.speechSynthesis) speechSynthesis.cancel(); }
  const now = () => ac.currentTime;
  function tone(freq, dur, type = 'square', vol = 0.3, slide = 0, delay = 0) {
    if (!ac || muted) return;
    const o = ac.createOscillator(), g = ac.createGain(), t = now() + delay;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  let noiseBuf = null;
  function noise(dur, vol = 0.3, f0 = 1000, q = 1, type = 'bandpass', delay = 0, attack = 0.004, f1 = 0) {
    if (!ac || muted) return;
    if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = now() + delay;
    s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  function say(text, pitch = 0.2, rate = 0.82) {
    if (muted || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (!voice) { const vs = speechSynthesis.getVoices(); voice = vs.find(v => /en-(US|GB)/.test(v.lang) && /Daniel|Fred|Alex|Male|Google UK English Male/i.test(v.name)) || vs.find(v => /^en/.test(v.lang)) || null; }
      if (voice) u.voice = voice;
      u.pitch = pitch; u.rate = rate; u.volume = 1;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  // ---------- music: early-90s industrial fight loop, synthesized live ----------
  const MU = { track: null, step: 0, next: 0, timer: null, tr: 0, g: null, dl: null };
  function mOut() {
    if (!MU.g) {
      MU.g = ac.createGain(); MU.g.gain.value = 0.5; MU.g.connect(master);
      MU.dl = ac.createDelay(1); MU.dl.delayTime.value = 0.34; const fb = ac.createGain(); fb.gain.value = 0.3; const wet = ac.createGain(); wet.gain.value = 0.35;
      MU.dl.connect(fb); fb.connect(MU.dl); MU.dl.connect(wet); wet.connect(MU.g);
    }
    return MU.g;
  }
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  function mt(t, freq, dur, type, vol, o = {}) {
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    if (o.det) osc.detune.value = o.det;
    let node = osc;
    if (o.lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t); if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, t + dur * 0.8); f.Q.value = o.q || 4; osc.connect(f); node = f; }
    node.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (o.att || 0.004)); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    g.connect(mOut()); if (o.echo) g.connect(MU.dl);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function mn(t, dur, vol, f0, type = 'bandpass', q = 1) {
    if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = f0; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(mOut()); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  const DR = {
    kick: t => { mt(t, 150, 0.22, 'sine', 0.55, { slide: 42 }); mn(t, 0.02, 0.25, 3000, 'highpass'); },
    snare: t => { mn(t, 0.2, 0.32, 1700, 'bandpass', 0.7); mt(t, 200, 0.09, 'triangle', 0.18, { slide: 140 }); },
    hat: t => mn(t, 0.035, 0.07, 7500, 'highpass'),
    clank: t => { mt(t, 1240, 0.09, 'triangle', 0.07); mt(t, 1867, 0.07, 'square', 0.03); mn(t, 0.06, 0.1, 3800, 'bandpass', 6); },
    anvil: t => { mt(t, 620, 0.5, 'triangle', 0.08); mt(t, 931, 0.45, 'triangle', 0.05); mn(t, 0.1, 0.2, 2400, 'bandpass', 3); },
  };
  // progression in D minor: Dm, Bb, Gm, A
  const ROOT = [0, -4, -7, -5], CH = [[0, 3, 7], [0, 4, 7], [0, 3, 7], [0, 4, 7]];
  const BASS = [0, 0, 12, 0, 0, 0, 12, 0, 0, 12, 0, 0, 12, 0, 7, 0];
  const KICK = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0], SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], CLANK = [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0];
  const LEAD = [[12, 4], null, null, null, [15, 2], null, [13, 2], null, [12, 2], null, [10, 4], null, null, null, [8, 2], null,
    [7, 4], null, null, null, [8, 2], null, [10, 2], null, [12, 6], null, null, null, null, null, [13, 2], null];
  const FORM = ['A', 'A', 'B', 'B', 'C', 'C', 'B', 'D', 'C', 'C'];
  function fightStep(i, t, sd) {
    const bar = (i >> 4), s = i & 15, sec = FORM[(bar >> 1) % FORM.length], ci = bar % 4, r = ROOT[ci] + MU.tr;
    if (sec !== 'D' && KICK[s]) DR.kick(t);
    if (sec !== 'A' && SNARE[s]) DR.snare(t);
    if (s % 2 === 1 || sec === 'C') DR.hat(t);
    if (sec !== 'A' && CLANK[s]) DR.clank(t);
    if (s === 0 && bar % 8 === 0) DR.anvil(t);
    const bn = 38 + r + BASS[s];
    mt(t, hz(bn), sd * 0.9, 'sawtooth', 0.16, { lp: 1400, lp2: 220, q: 6 }); mt(t, hz(bn - 12), sd * 0.9, 'square', 0.06, { lp: 500 });
    if ((sec === 'B' || sec === 'C') && (s === 0 || s === 6 || s === 10)) for (const n of CH[ci]) mt(t, hz(62 + r + n), sd * 2.4, 'sawtooth', 0.04, { lp: 2400, lp2: 700, det: (n % 2 ? 7 : -7) });
    if (sec === 'C' || sec === 'D') { const L = LEAD[i % 32]; if (L) { mt(t, hz(62 + MU.tr + L[0]), sd * L[1] * 0.95, 'square', 0.05, { lp: 3000, echo: 1, att: 0.01 }); mt(t, hz(62 + MU.tr + L[0]), sd * L[1] * 0.95, 'square', 0.03, { det: 12, lp: 2500, echo: 1, att: 0.01 }); } }
  }
  function menuStep(i, t, sd) {
    const s = i & 15, bar = i >> 4, r = ROOT[bar % 4];
    if (s === 0) { mt(t, hz(26 + r), sd * 16, 'sawtooth', 0.12, { lp: 300, q: 8, att: 0.3 }); mt(t, hz(38 + r), sd * 16, 'sawtooth', 0.05, { lp: 500, att: 0.3 }); }
    if (s === 0 || s === 10) DR.kick(t);
    if (s === 4 || s === 12) DR.clank(t);
    if (s === 8 && bar % 2) DR.anvil(t);
    if (s % 4 === 2) mt(t, hz(62 + r + CH[bar % 4][(s >> 2) % 3]), sd * 3, 'triangle', 0.04, { echo: 1 });
  }
  function music(name, tr = 0) {
    if (!ac) return;
    if (MU.track === name && MU.tr === tr) return;
    MU.track = name; MU.tr = tr; MU.step = 0; MU.next = ac.currentTime + 0.08;
    if (!MU.timer) MU.timer = setInterval(() => {
      if (!MU.track || !ac || muted) { if (ac) MU.next = ac.currentTime + 0.05; return; }
      const sd = 60 / (MU.track === 'fight' ? 132 : 92) / 4;
      while (MU.next < ac.currentTime + 0.14) {
        (MU.track === 'fight' ? fightStep : menuStep)(MU.step, MU.next, sd);
        MU.step++; MU.next += sd;
      }
    }, 30);
  }
  function stopMusic() { MU.track = null; }
  const S = {
    unlock, setMuted, isMuted: () => muted, say, music, stopMusic,
    whoosh: () => noise(0.12, 0.12, 900, 0.7, 'bandpass', 0, 0.02, 2400),
    punch: () => { noise(0.1, 0.45, 500, 0.8, 'lowpass'); tone(120, 0.1, 'sine', 0.4, -60); },
    kick: () => { noise(0.14, 0.5, 380, 0.8, 'lowpass'); tone(90, 0.14, 'sine', 0.45, -40); },
    big: () => { noise(0.3, 0.6, 300, 0.6, 'lowpass'); tone(70, 0.3, 'sine', 0.6, -35); noise(0.25, 0.25, 1800, 1, 'bandpass', 0.02); },
    block: () => { tone(900, 0.05, 'square', 0.12); noise(0.06, 0.2, 2500, 2); },
    splat: () => { noise(0.22, 0.35, 700, 1.2, 'bandpass', 0, 0.01, 200); tone(60, 0.15, 'sine', 0.3, -20); },
    crunch: () => { for (let i = 0; i < 4; i++) noise(0.05, 0.35, 1500 + Math.random() * 1500, 3, 'bandpass', i * 0.03); tone(80, 0.2, 'square', 0.15, -30); },
    gulp: () => { tone(180, 0.25, 'sine', 0.4, -140); tone(120, 0.2, 'sine', 0.3, -60, 0.18); },
    fart: () => { tone(70, 0.6, 'sawtooth', 0.35, -25); tone(84, 0.6, 'square', 0.12, -30); noise(0.5, 0.3, 200, 2, 'bandpass'); },
    howl: () => { tone(300, 0.4, 'sawtooth', 0.1, 300); tone(300, 0.4, 'sine', 0.2, 300); tone(600, 1.1, 'sine', 0.22, -260, 0.38); tone(604, 1.1, 'sawtooth', 0.07, -270, 0.38); noise(1.4, 0.06, 900, 3, 'bandpass', 0.05); },
    hiss: () => { noise(0.55, 0.32, 4200, 0.7, 'highpass', 0, 0.03); noise(0.4, 0.2, 2600, 2, 'bandpass', 0.05); },
    creak: () => { tone(140, 0.7, 'sawtooth', 0.12, -60); tone(95, 0.9, 'sawtooth', 0.1, -40, 0.25); },
    sniff: () => { noise(0.12, 0.35, 3000, 1.5, 'bandpass'); noise(0.12, 0.35, 3200, 1.5, 'bandpass', 0.16); noise(0.35, 0.4, 2600, 1.2, 'bandpass', 0.32, 0.02, 4200); },
    ding: () => { tone(2100, 0.5, 'sine', 0.25); tone(4200, 0.25, 'sine', 0.08); },
    squish: () => { noise(0.3, 0.4, 400, 3, 'bandpass', 0, 0.01, 150); tone(90, 0.3, 'sine', 0.25, -40); },
    shot: () => { noise(0.18, 0.55, 1800, 0.6, 'bandpass'); noise(0.06, 0.5, 5000, 0.6, 'highpass'); tone(110, 0.12, 'square', 0.25, -60); },
    yelp: () => { for (let i = 0; i < 4; i++) { tone(980, 0.09, 'triangle', 0.22, -380, i * 0.16); tone(1960, 0.06, 'sine', 0.05, -700, i * 0.16); } },
    gobble: () => { for (let i = 0; i < 6; i++) tone(520 + (i % 2) * 140, 0.05, 'sawtooth', 0.18, -120, i * 0.055); },
    chirp: () => { tone(2600, 0.06, 'sine', 0.2, 1400); tone(3200, 0.08, 'sine', 0.16, -1200, 0.07); },
    slurp: () => { noise(0.5, 0.25, 600, 3, 'bandpass', 0, 0.02, 1800); tone(180, 0.5, 'sine', 0.12, 160); },
    honk: () => { tone(330, 0.22, 'sawtooth', 0.3, -40); tone(336, 0.22, 'square', 0.15, -40); },
    shatter: () => { for (let i = 0; i < 8; i++) tone(2000 + Math.random() * 3000, 0.15, 'triangle', 0.08, -500, i * 0.025); noise(0.5, 0.35, 5000, 0.6, 'highpass'); },
    clang: () => { tone(420, 0.6, 'triangle', 0.25, -40); tone(637, 0.5, 'triangle', 0.15, -30); noise(0.1, 0.3, 3000, 1); },
    thud: () => { tone(55, 0.35, 'sine', 0.6, -25); noise(0.2, 0.4, 250, 0.7, 'lowpass'); },
    horn: () => { tone(277, 1.1, 'sawtooth', 0.18); tone(349, 1.1, 'sawtooth', 0.14); tone(415, 1.1, 'sawtooth', 0.12); },
    train: () => { for (let i = 0; i < 10; i++) noise(0.12, 0.35, 300, 1, 'lowpass', i * 0.13); noise(1.4, 0.25, 800, 0.5, 'bandpass'); },
    fire: () => { noise(0.5, 0.3, 900, 0.5, 'bandpass', 0, 0.05, 300); tone(150, 0.4, 'sawtooth', 0.1, 100); },
    proj: () => { tone(300, 0.2, 'sawtooth', 0.15, 400); noise(0.15, 0.15, 1500, 1); },
    gong: () => { tone(98, 2.2, 'sine', 0.5); tone(147, 1.8, 'sine', 0.2); tone(207, 1.4, 'triangle', 0.12); },
    scream: () => { tone(700, 0.7, 'sawtooth', 0.12, -450); tone(720, 0.7, 'square', 0.06, -470); },
    squeak: () => { tone(1400, 0.08, 'square', 0.12, 300); tone(1800, 0.12, 'square', 0.1, -400, 0.08); },
    slash: () => noise(0.09, 0.3, 3500, 1, 'bandpass', 0, 0.005, 1200),
    chomp: () => { noise(0.08, 0.35, 900, 2); tone(140, 0.07, 'square', 0.15, -60); },
    gnaw: () => { for (let i = 0; i < 3; i++) noise(0.03, 0.3, 2500, 4, 'bandpass', i * 0.04); },
    select: () => { tone(330, 0.08, 'square', 0.15); tone(495, 0.12, 'square', 0.12, 0, 0.07); },
    blip: () => tone(660, 0.05, 'square', 0.1),
    land: () => { tone(70, 0.12, 'sine', 0.4, -20); noise(0.1, 0.2, 400, 0.8, 'lowpass'); },
  };
  return S;
})();
