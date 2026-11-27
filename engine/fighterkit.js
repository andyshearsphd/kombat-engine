// Kombat Engine: fighter kit. Body proportions, head and face painting helpers (profile and front view),
// and KIT.roster(), which finishes a game's roster (scaled dimensions, front views, lookup by id).
'use strict';
const KIT = (() => {
  const R = RIG, PI = Math.PI, sh = R.shade;
  const HUMAN = { thigh: 27, shin: 26, torso: 35, neck: 5, upper: 20, fore: 19, hipW: 11, shW: 15, chest: 15, belly: 11.5, back: 11, thighR: 7.2, kneeR: 4.8, ankleR: 3.4, shR: 5.6, elbowR: 3.9, wristR: 3.1, fist: 3.9, footL: 12, footH: 3.8, shOff: 3 };
  const dims = o => Object.assign({}, HUMAN, o);

  // ---------- head helpers (local: origin at the top of the neck, +x forward, -y up) ----------
  function lit(g, cx, cy, r, c, hi = 0.3, lo = -0.62) {
    const gr = g.createRadialGradient(cx + r * 0.35, cy - r * 0.45, r * 0.05, cx, cy, r * 1.25);
    gr.addColorStop(0, sh(c, hi)); gr.addColorStop(0.4, c); gr.addColorStop(0.8, sh(c, (lo + 0) * 0.6)); gr.addColorStop(1, sh(c, lo));
    return gr;
  }
  function fillLit(g, c, cx, cy, r, hi, lo) { g.fillStyle = lit(g, cx, cy, r, c, hi, lo); g.fill(); }
  function strokes(g, cx, cy, rx, ry, n, seed, ang, len, dark = 0.3, light = 0.14) {
    R.srand(seed);
    for (let i = 0; i < n; i++) {
      const a = R.rr() * PI * 2, d = Math.sqrt(R.rr()), x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d, l = len * (0.6 + R.rr() * 0.8);
      g.strokeStyle = R.rr() < 0.55 ? `rgba(0,0,0,${dark})` : `rgba(255,245,230,${light})`; g.lineWidth = 0.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l); g.stroke();
    }
  }
  function fringe(g, cx, cy, rx, ry, a0, a1, n, c, len, seed) {
    R.srand(seed); g.fillStyle = c;
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * (i + 0.5) / n, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry, l = len * (0.6 + R.rr() * 0.8);
      g.beginPath(); g.moveTo(x - Math.sin(a) * 1.4, y + Math.cos(a) * 1.4); g.lineTo(x + Math.cos(a + 0.3) * l, y + Math.sin(a + 0.3) * l); g.lineTo(x + Math.sin(a) * 1.4, y - Math.cos(a) * 1.4); g.fill();
    }
  }
  function curls(g, cx, cy, rx, ry, n, seed, dark = '#1c1008', mid = '#3a2414') {
    R.srand(seed);
    for (let i = 0; i < n; i++) {
      const a = R.rr() * PI * 2, d = Math.sqrt(R.rr()), x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d, r = 0.9 + R.rr() * 0.8;
      g.fillStyle = R.rr() < 0.5 ? dark : mid; g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill();
      if (R.rr() < 0.35) { g.fillStyle = 'rgba(160,110,70,0.45)'; g.fillRect(x - r * 0.4, y - r * 0.6, 0.7, 0.7); }
    }
  }
  // realistic eye: socket shadow, small eyeball, dark iris, catchlight
  function eye(g, x, y, r, st, o = {}) {
    g.fillStyle = o.socket || 'rgba(40,10,5,0.35)'; g.beginPath(); g.ellipse(x - r * 0.1, y - r * 0.1, r * 1.5, r * 1.05, 0, 0, PI * 2); g.fill();
    if (st.dead) {
      g.fillStyle = o.white || '#e8dcc8'; g.beginPath(); g.ellipse(x, y, r, r * 0.45, 0, 0, PI * 2); g.fill();
      g.fillStyle = '#7a0010'; g.fillRect(x - r, y + r * 0.6, r * 0.6, r * 2.2);
      return;
    }
    if (st.hurt) { R.line(g, x - r, y, x + r, y - r * 0.2, '#1a0a06', r * 0.55); return; }
    if (o.animal) {
      g.fillStyle = o.iris || '#120a06'; g.beginPath(); g.ellipse(x, y, r * 0.9, r * 0.85, 0, 0, PI * 2); g.fill();
      if (o.slit) { g.fillStyle = '#050302'; g.beginPath(); g.ellipse(x + r * 0.1, y, r * 0.2, r * 0.75, 0, 0, PI * 2); g.fill(); }
    } else {
      g.fillStyle = o.white || '#e6dccc'; g.beginPath(); g.ellipse(x, y, r, r * 0.55, 0, 0, PI * 2); g.fill();
      g.fillStyle = o.iris || '#2a1a10'; g.beginPath(); g.arc(x + r * 0.35, y, r * 0.5, 0, PI * 2); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x - r, y - r * 0.6, r * 2, r * 0.35);
    }
    if (o.glow) { g.fillStyle = 'rgba(255,40,20,0.3)'; g.beginPath(); g.arc(x, y, r * 2.2, 0, PI * 2); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(x + r * 0.3, y - r * 0.35, Math.max(0.6, r * 0.3), Math.max(0.6, r * 0.3));
  }
  function brow(g, x, y, w, ang, c = 'rgba(30,15,5,0.85)', t = 1.2) { R.line(g, x - w / 2, y - Math.sin(ang) * w / 2, x + w / 2, y + Math.sin(ang) * w / 2, c, t); }

  // a 3/4 profile human head; o: { skin, chin, nose, back(g), front(g), beard(g), mouth(g), glasses, eyeC }
  function humanHead(g, st, o) {
    const S = o.skin, ch = o.chin || 0, nz = o.nose || 0;
    g.save(); g.scale(0.9, 0.9);
    if (o.back) o.back(g);
    // ear
    g.beginPath(); g.ellipse(-1.5, -11, 2.4, 3.6, 0.15, 0, PI * 2); fillLit(g, sh(S, -0.08), -1.5, -11, 3.6);
    g.fillStyle = 'rgba(60,20,10,0.4)'; g.beginPath(); g.ellipse(-1.2, -11, 1.1, 2, 0.15, 0, PI * 2); g.fill();
    // skull, face profile, jaw
    g.beginPath();
    g.moveTo(-5, -1.5);
    g.bezierCurveTo(-8.5, -8, -8.5, -20, -2, -24.5);
    g.bezierCurveTo(4, -27.5, 10, -24, 10.8, -17.5);
    g.quadraticCurveTo(11.4, -14.5, 10.8, -13.2);
    g.quadraticCurveTo(11.6 + nz * 0.4, -11.5, 13.4 + nz, -8.6);
    g.quadraticCurveTo(12.8 + nz * 0.5, -7.3, 11.1, -7.5);
    g.quadraticCurveTo(11.8, -6.2, 11.3, -5);
    g.quadraticCurveTo(11.7, -3.6, 10.8, -2.4);
    g.quadraticCurveTo(11.6 + ch * 0.4, 0.5 + ch, 8.5, 1.5 + ch);
    g.quadraticCurveTo(2.5, 1 + ch * 0.6, -1, -2);
    g.closePath();
    fillLit(g, S, 5, -13, 14, 0.25, -0.6);
    g.save(); g.clip();
    // cheekbone + jaw shadow + temple shading
    if (!o.cleanJaw) { g.fillStyle = 'rgba(60,20,10,0.28)'; g.beginPath(); g.ellipse(4, -4, 6, 3.5, -0.3, 0, PI * 2); g.fill(); }
    else { g.fillStyle = 'rgba(255,225,200,0.16)'; g.beginPath(); g.ellipse(8, -2, 3.5, 2.2, 0, 0, PI * 2); g.fill(); g.fillStyle = 'rgba(90,40,25,0.16)'; g.beginPath(); g.ellipse(2, -4, 3, 3, 0, 0, PI * 2); g.fill(); }
    g.fillStyle = 'rgba(60,20,10,0.25)'; g.beginPath(); g.ellipse(-3, -12, 4, 10, 0, 0, PI * 2); g.fill();
    g.fillStyle = 'rgba(255,230,210,0.15)'; g.beginPath(); g.ellipse(8.5, -9.5, 2.2, 1.6, 0, 0, PI * 2); g.fill();
    g.restore();
    // eyes (far eye partly hidden by the nose bridge)
    eye(g, 4.6, -12.3, 1.1, st, { iris: o.eyeC });
    eye(g, 9, -12.2, 1.35, st, { iris: o.eyeC });
    brow(g, 9, -14.3, 3.6, 0.15, o.browC); brow(g, 4.6, -14.4, 3, -0.1, o.browC);
    // nose shadow + nostril
    g.fillStyle = 'rgba(60,20,10,0.35)'; g.beginPath(); g.moveTo(10.6, -12.5); g.quadraticCurveTo(11.5, -9.5, 10.4, -8); g.lineTo(11.4, -7.8); g.quadraticCurveTo(12.4, -10, 10.8, -12.8); g.fill();
    g.fillStyle = 'rgba(30,8,4,0.6)'; g.fillRect(11.3 + nz * 0.5, -8.1, 0.9, 0.7);
    if (o.mouth) o.mouth(g);
    else if (st.dead) { g.fillStyle = '#2a0404'; g.beginPath(); g.ellipse(10.5, -4.6, 1.4, 1.2, 0, 0, PI * 2); g.fill(); g.fillStyle = '#8a0010'; g.fillRect(10, -3.8, 1.2, 5); }
    else { R.line(g, 9, -5.2, 11.2, -5, 'rgba(70,20,15,0.8)', 0.8); }
    if (o.beard) o.beard(g);
    if (o.front) o.front(g);
    g.restore();
  }

  // ---------- front views for the victory pose: faces and outfits seen head on ----------
  function faceShape(g, w, top, chin) { g.beginPath(); g.moveTo(0, top); g.bezierCurveTo(w * 0.95, top, w * 1.05, -14, w * 0.95, -9);
    g.quadraticCurveTo(w * 0.85, chin - 3, 0, chin); g.quadraticCurveTo(-w * 0.85, chin - 3, -w * 0.95, -9); g.bezierCurveTo(-w * 1.05, -14, -w * 0.95, top, 0, top);
    g.closePath(); }
  function eyesF(g, st, x, y, r, o = {}) {
    for (const sd of [-1, 1]) {
      const ex = sd * x;
      if (st.dead) { R.line(g, ex - r, y - r * 0.7, ex + r, y + r * 0.7, '#2a0a0a', 0.7); R.line(g, ex - r, y + r * 0.7, ex + r, y - r * 0.7, '#2a0a0a', 0.7); continue; }
      if (o.animal) { g.fillStyle = o.iris || '#120a06'; g.beginPath(); g.ellipse(ex, y, r * 0.9, r * 0.95, 0, 0, PI * 2); g.fill(); if (o.slit) { g.fillStyle = '#050302'; g.fillRect(ex - r * 0.15, y - r * 0.8, r * 0.3, r * 1.6); } }
      else { g.fillStyle = o.white || '#ece2d2'; g.beginPath(); g.ellipse(ex, y, r * 1.25, r * 0.7, 0, 0, PI * 2); g.fill(); g.fillStyle = o.iris || '#2a1a10';
        g.beginPath(); g.arc(ex, y, r * 0.55, 0, PI * 2); g.fill(); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(ex - r * 1.25, y - r * 0.7, r * 2.5, r * 0.3); }
      if (o.glow) { g.fillStyle = 'rgba(255,40,20,0.3)'; g.beginPath(); g.arc(ex, y, r * 2, 0, PI * 2); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(ex + r * 0.15, y - r * 0.4, Math.max(0.6, r * 0.3), Math.max(0.6, r * 0.3));
    }
  }
  // a human face seen head on; o: { skin, w, chin, eyeC, browC, back, front, mouth, nose }
  function humanFront(g, st, o) {
    const S = o.skin, w = o.w || 8.4, chin = o.chin || 1;
    if (o.back) o.back(g);
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * w * 1.02, -11.5, 1.7, 3.2, 0, 0, PI * 2); fillLit(g, sh(S, -0.1), sd * w, -11.5, 3.2); }
    faceShape(g, w, -26, chin); g.fillStyle = (() => { const gr = g.createLinearGradient(-w, 0, w, 0); gr.addColorStop(0, sh(S, -0.35)); gr.addColorStop(0.55, S); gr.addColorStop(0.8, sh(S, 0.1)); gr.addColorStop(1, sh(S, -0.2)); return gr; })(); g.fill();
    g.save(); g.clip(); g.fillStyle = 'rgba(60,20,10,0.18)'; g.beginPath(); g.ellipse(0, -2, w * 0.7, 3, 0, 0, PI * 2); g.fill(); g.restore();
    eyesF(g, st, 3.4, -12.6, 1.25, { iris: o.eyeC });
    if (!st.dead) { R.line(g, -5.2, -15, -1.6, -14.6 - (o.angry ? -0.8 : 0), o.browC || 'rgba(30,15,5,0.9)', 1.1); R.line(g, 1.6, -14.6 - (o.angry ? -0.8 : 0), 5.2, -15, o.browC || 'rgba(30,15,5,0.9)', 1.1); }
    g.fillStyle = 'rgba(60,20,10,0.3)'; g.beginPath(); g.moveTo(-0.6, -12); g.lineTo(-1.6, -7.4); g.lineTo(1.6, -7.4); g.lineTo(0.6, -12); g.fill();
    g.fillStyle = 'rgba(30,8,4,0.6)'; g.fillRect(-1.4, -7.2, 0.9, 0.6); g.fillRect(0.5, -7.2, 0.9, 0.6);
    g.fillStyle = 'rgba(255,235,215,0.25)'; g.fillRect(-0.3, -11.5, 0.6, 3.5);
    const jaw = st.jaw || 0;
    if (o.mouth) o.mouth(g, jaw);
    else if (st.dead) { g.fillStyle = '#2a0404'; g.beginPath(); g.ellipse(0, -3.4, 1.8, 1.4, 0, 0, PI * 2); g.fill(); g.fillStyle = '#8a0010'; g.fillRect(-0.5, -2.4, 1, 5); }
    else if (jaw > 0.25) { g.fillStyle = '#2a0606'; g.beginPath(); g.ellipse(0, -3.4 + jaw, 2.6, 1 + jaw * 1.8, 0, 0, PI * 2); g.fill(); g.fillStyle = '#efe6d4'; g.fillRect(-2, -4.2, 4, 0.9); }
    else { g.fillStyle = '#5a1a1a'; g.beginPath(); g.moveTo(-2.8, -4); g.quadraticCurveTo(0, -2.2, 2.8, -4); g.quadraticCurveTo(0, -3.2, -2.8, -4); g.fill(); }
    if (o.front) o.front(g, jaw);
  }
  // torso helpers in front view: G = { hipY, sY, shx, hx }
  const vNeck = (g, G, c, depth = 0.3) => R.poly(g, [[-G.shx * 0.45, G.sY - 1], [G.shx * 0.45, G.sY - 1], [0, G.sY + (G.hipY - G.sY) * depth]], c);
  const belt = (g, G, c, buckle) => { g.fillStyle = c; g.fillRect(-G.shx * 2, G.hipY - 2, G.shx * 4, 3); if (buckle) { g.fillStyle = buckle; g.fillRect(-1.8, G.hipY - 2.4, 3.6, 3.6); } };
  const bellyPatch = (g, G, c, wk = 0.6) => { g.fillStyle = c; g.beginPath(); g.ellipse(0, (G.sY + G.hipY) / 2 + 3, G.shx * wk, (G.hipY - G.sY) * 0.42, 0, 0, PI * 2); g.fill(); };

  // a tail curling out from behind the hip, seen from the front
  function frontTail(g, d, G, st, cols, n, len, r0, bushy) {
    const k = d.k, w = Math.sin((st.t || 0) * 3) * 0.15;
    let p = [G.hx * 0.6, G.hipY - 3 * k];
    for (let i = 0; i < n; i++) { const a = 1.2 - i * (1.9 / n) + w * i * 0.3, q = [p[0] + Math.cos(-a + 0.4) * len * k, p[1] - Math.sin(a) * len * k * 0.9];
      const t0 = i / n, t1 = (i + 1) / n, ra = (bushy ? r0 * (0.7 + Math.sin(t0 * PI) * 0.6) : r0 * (1 - t0 * 0.6)) * k, rb = (bushy ? r0 * (0.7 + Math.sin(t1 * PI) * 0.6) : r0 * (1 - t1 * 0.6)) * k;
      R.seg(g, p, q, ra, rb, cols[i % cols.length], 'fur', { seed: 900 + i }); p = q; }
  }

  // fighters: playable, in select-screen order; bosses: ladder order (the last is the final boss)
  // o.front: { id: front-view victory pose parts }, o.portrait: { id: [x, y, scale] } head placement in portraits
  // special move slots: 1 = BACK, FORWARD + PUNCH, 2 = DOWN, FORWARD + KICK, 3 = DOWN, BACK + PUNCH
  const SLOTS = [{ motion: ['B', 'F'], btn: 'P', label: 'BACK, FORWARD + PUNCH' }, { motion: ['D', 'F'], btn: 'K', label: 'DOWN, FORWARD + KICK' }, { motion: ['D', 'B'], btn: 'P', label: 'DOWN, BACK + PUNCH' }];
  // fatality slots: 1 = DOWN, DOWN + PUNCH, 2 = FORWARD, FORWARD + KICK, 3 = BACK, BACK + PUNCH
  const FSLOTS = [{ motion: ['D', 'D'], btn: 'P', label: 'DOWN, DOWN + PUNCH' }, { motion: ['F', 'F'], btn: 'K', win: 0.6, label: 'FORWARD, FORWARD + KICK' }, { motion: ['B', 'B'], btn: 'P', label: 'BACK, BACK + PUNCH' }];
  // a fighter's specials: sp1/sp2/sp3 ({ kind, name, ... }); the older fields proj and sp2 still work
  function specials(f) {
    const s1 = f.sp1 || (f.proj ? { kind: 'proj', name: f.proj.name, proj: f.proj } : null);
    const s2 = f.sp2 ? Object.assign({}, f.sp2, f.sp2Mod ? { mod: Object.assign({}, f.sp2.mod, f.sp2Mod) } : null) : null;
    return [s1, s2, f.sp3 || null].map((s, i) => s && Object.assign({ slot: i + 1 }, SLOTS[i], s)).filter(Boolean);
  }
  // a fighter's fatalities: fatals: [{ id, name }] or the older fields fatal and alt
  function fatalities(f) {
    const list = f.fatals || [f.fatal, f.alt].filter(Boolean);
    return list.slice(0, 3).map((x, i) => Object.assign({ slot: i + 1 }, FSLOTS[i], x));
  }
  function roster(FIGHTERS, BOSSES, o = {}) {
    const ALL = {}, FRONT = o.front || {}, PORT = o.portrait || {};
    for (const f of FIGHTERS.concat(BOSSES)) {
      ALL[f.id] = f; f.front = FRONT[f.id] || null;
      if (!f.portrait && PORT[f.id]) f.portrait = PORT[f.id];
      const k = f.k * 1.14, d = {};
      for (const key in f.d) d[key] = f.d[key] * k;
      d.k = k;
      f.dk = d;
      f.specials = specials(f);
      f.fatalList = fatalities(f);
      if (!f.fatal && f.fatalList[0]) f.fatal = f.fatalList[0];
      if (!f.proj && f.sp1 && f.sp1.kind === 'proj') f.proj = f.sp1.proj;
    }
    return { FIGHTERS, BOSSES, ALL, eye };
  }
  return { R, PI, sh, roster, HUMAN, dims, lit, fillLit, strokes, fringe, curls, eye, brow, humanHead, faceShape, eyesF, humanFront, vNeck, belt, bellyPatch, frontTail };
})();
