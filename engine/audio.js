// Kombat Engine: synthesized sound effects and a deep announcer voice (no audio files)
'use strict';
const SFX = (() => {
  let ac = null, master = null, muted = false, voice = null, KEY = 'mk_muted';
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}
  // 1.1: each game can keep its own mute setting (GAME.muteKey)
  function setKey(k) { KEY = k; try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {} if (master) master.gain.value = muted ? 0 : 0.55; }
  function unlock() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ac.destination); }
      try { if (window.speechSynthesis) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch (e) {}
    }
    if (ac && ac.state === 'suspended') ac.resume();
    if (CLIPS && !CLIPS.loading) loadClips();
  }
  function setMuted(m) { muted = m; try { localStorage.setItem(KEY, m ? '1' : '0'); } catch (e) {} if (master) master.gain.value = m ? 0 : 0.55; if (m && window.speechSynthesis) speechSynthesis.cancel(); }
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
  // the announcer: GAME.voice = { pitch, rate, prefer: /voice name regex/, radio: true } (radio adds old-broadcast crackle and hum)
  const VO = { pitch: 0.2, rate: 0.82, prefer: /Daniel|Fred|Alex|Male|Google UK English Male/i, radio: false };
  function voiceCfg(o) { Object.assign(VO, o); voice = null; }
  function crackle(dur) {
    if (!ac || muted) return;
    noise(dur, 0.035, 2600, 0.6, 'bandpass', 0, 0.05);
    tone(60, dur, 'sine', 0.025); tone(120, dur, 'sine', 0.012);
    for (let i = 0; i < dur * 16; i++) noise(0.012, 0.18 + Math.random() * 0.2, 3000 + Math.random() * 3000, 1, 'highpass', Math.random() * dur);
  }
  // ---------- 1.2: recorded announcer clips ----------
  // GAME.voiceClips = 'voice/' : a folder holding manifest.json (a list of phrase slugs) and one .mp3 per slug.
  // Clips play through the game's own audio, so the announcer is heard wherever the music is.
  // Lines without a clip still go to the browser's text-to-speech.
  let CLIPS = null, curClip = null, vgain = null;
  const CB = {}, slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  function setClips(base) { CLIPS = { base, list: null, loading: false }; if (ac) loadClips(); }
  function loadClips() {
    if (!ac || !CLIPS || CLIPS.loading) return;
    CLIPS.loading = true;
    fetch(CLIPS.base + 'manifest.json').then(r => r.json()).then(list => {
      CLIPS.list = new Set(list);
      for (const k of list) fetch(CLIPS.base + k + '.mp3').then(r => r.arrayBuffer()).then(b => new Promise((res, rej) => ac.decodeAudioData(b, res, rej))).then(buf => { CB[k] = buf; }).catch(() => {});
    }).catch(() => { CLIPS.list = new Set(); });
  }
  function playClip(key) {
    const b = CB[key]; if (!b || muted || !ac) return;
    if (!vgain) { vgain = ac.createGain(); vgain.gain.value = 1.5; vgain.connect(master); }
    try { if (curClip) curClip.stop(); } catch (e) {}
    const src = ac.createBufferSource(); src.buffer = b; src.connect(vgain); src.start(); curClip = src;
    if (VO.radio) crackle(b.duration);
  }
  // done (1.3.2): called once the line has finished, so lines can be chained with sayAll
  // 1.8.1: lines wait their turn. A line asked for while another is still playing is queued instead of cutting it off;
  // a queued line that has waited more than 2.5 seconds is dropped as stale (unless something is waiting on it).
  const VQ = []; let vbusy = false;
  function vfree() {
    vbusy = false;
    while (VQ.length) {
      const it = VQ.shift();
      if (it.done || performance.now() - it.t < 2500) { say(it.text, it.pitch, it.rate, it.done); return; }
    }
  }
  function say(text, pitch = VO.pitch, rate = VO.rate, done) {
    if (vbusy) { VQ.push({ text, pitch, rate, done, t: performance.now() }); return; }
    vbusy = true;
    let freed = false;
    const free = () => { if (freed) return; freed = true; clearTimeout(guard); vfree(); if (done) done(); };
    const guard = setTimeout(free, 5000);
    sayNow(text, pitch, rate, free);
  }
  function sayNow(text, pitch, rate, done) {
    let called = false;
    const fin = ms => { if (done) setTimeout(() => { if (!called) { called = true; done(); } }, ms); };
    if (CLIPS) { const key = slug(text); if (CB[key]) { playClip(key); fin(CB[key].duration * 1000 + 80); return; } if (!CLIPS.list || CLIPS.list.has(key)) { fin(0); return; } }
    if (muted || !window.speechSynthesis) { fin(0); return; }
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      // move on when the voice finishes, or after a generous estimate if the browser never says it finished
      if (done) { u.onend = () => fin(60); fin((0.6 + text.length * 0.09 / rate) * 1000 + 700); }
      if (!voice) { const vs = speechSynthesis.getVoices(); voice = vs.find(v => /en-(US|GB)/.test(v.lang) && VO.prefer.test(v.name)) || vs.find(v => /^en/.test(v.lang)) || null; }
      if (voice) u.voice = voice;
      u.pitch = pitch; u.rate = rate; u.volume = 1;
      speechSynthesis.speak(u);
      if (VO.radio) crackle(0.35 + text.length * 0.07 / rate);
    } catch (e) { fin(0); }
  }
  // 1.3.2: several announcer lines in a row, each one waiting for the last to finish
  function sayAll(lines, gap = 150) {
    const next = i => { if (i < lines.length) say(lines[i], VO.pitch, VO.rate, () => setTimeout(() => next(i + 1), gap)); };
    next(0);
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
  // ---------- 1.1: game tunes played over the industrial kit ----------
  // tune: { name, bpm, notes: 'E4/2 D4/2 r/4 ...' (note or r, '/' length in 16th steps), chords: 'C G Am F' (one per chordSteps, default 16) }
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(n) { const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); if (!m) return null; return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); }
  function compile(t) {
    if (t.steps) return t;
    const steps = [];
    for (const tok of t.notes.trim().split(/\s+/)) { const [n, l] = tok.split('/'), len = +(l || 2), m = n === 'r' ? null : midi(n); steps.push(m == null ? null : [m, len]); for (let i = 1; i < len; i++) steps.push(null); }
    const chords = t.chords.trim().split(/\s+/).map(c => { const m = /^([A-G])([#b]?)(m?)/.exec(c); return { pc: (NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12, min: !!m[3] }; });
    return Object.assign(t, { steps, ch: chords, cs: t.chordSteps || 16 });
  }
  let TUNES = null, MENU = null;
  function setTunes(list, menu) { TUNES = list ? list.map(compile) : null; MENU = menu ? compile(menu) : null; }
  function tuneStep(T, i, t, sd, menu) {
    const s = i & 15, bar = i >> 4, sec = menu ? 'M' : FORM[(bar >> 1) % FORM.length], c = T.ch[Math.floor(i / T.cs) % T.ch.length], r = c.pc + MU.tr;
    if (!menu) {
      if (sec !== 'D' && KICK[s]) DR.kick(t);
      if (sec !== 'A' && SNARE[s]) DR.snare(t);
      if (s % 2 === 1 || sec === 'C') DR.hat(t);
      if (sec !== 'A' && CLANK[s]) DR.clank(t);
      if (s === 0 && bar % 8 === 0) DR.anvil(t);
      const bn = 36 + ((r % 12) + 12) % 12 + BASS[s];
      mt(t, hz(bn), sd * 0.9, 'sawtooth', 0.15, { lp: 1400, lp2: 220, q: 6 }); mt(t, hz(bn - 12), sd * 0.9, 'square', 0.05, { lp: 500 });
      if (s === 0 || s === 8) for (const n of c.min ? [0, 3, 7] : [0, 4, 7]) mt(t, hz(60 + ((r % 12) + 12) % 12 + n), sd * 6, 'sawtooth', 0.03, { lp: 2200, lp2: 600, det: (n % 2 ? 7 : -7) });
    } else {
      if (s === 0) { mt(t, hz(36 + ((r % 12) + 12) % 12), sd * 16, 'sawtooth', 0.1, { lp: 300, q: 8, att: 0.3 }); }
      if (s === 0 || s === 10) DR.kick(t);
      if (s === 4 || s === 12) DR.clank(t);
    }
    if (menu || sec !== 'A') {
      // 1.1.2: the melody keeps its own place, so it starts at the top after the drum intro and never skips a phrase
      const L = T.steps[(MU.mstep++) % T.steps.length];
      if (L) { const f = hz(L[0] + MU.tr), d = sd * L[1] * 0.92; mt(t, f, d, 'square', menu ? 0.035 : 0.05, { lp: 3200, echo: 1, att: 0.01 }); mt(t, f, d, 'sawtooth', menu ? 0.02 : 0.035, { det: 9, lp: 1800, echo: 1, att: 0.02 }); if (!menu) mt(t, f / 2, d, 'sawtooth', 0.03, { lp: 1200, att: 0.02 }); }
    }
  }
  function music(name, tr = 0, tune = null) {
    if (!ac) return;
    const T = name === 'fight' && TUNES && tune != null ? TUNES[((tune % TUNES.length) + TUNES.length) % TUNES.length] : name === 'menu' ? MENU : null;
    if (MU.track === name && MU.tr === tr && MU.tune === T) return;
    MU.track = name; MU.tr = tr; MU.tune = T; MU.step = 0; MU.mstep = 0; MU.next = ac.currentTime + 0.08;
    if (!MU.timer) MU.timer = setInterval(() => {
      if (!MU.track || !ac || muted) { if (ac) MU.next = ac.currentTime + 0.05; return; }
      const T2 = MU.tune, sd = 60 / (T2 && T2.bpm ? T2.bpm : MU.track === 'fight' ? 132 : 92) / 4;
      while (MU.next < ac.currentTime + 0.14) {
        if (T2) tuneStep(T2, MU.step, MU.next, sd, MU.track !== 'fight');
        else (MU.track === 'fight' ? fightStep : menuStep)(MU.step, MU.next, sd);
        MU.step++; MU.next += sd;
      }
    }, 30);
  }
  function stopMusic() { MU.track = null; }
  const S = {
    unlock, setMuted, isMuted: () => muted, say, sayAll, setClips, music, stopMusic, setKey, voice: voiceCfg, setTunes,
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
