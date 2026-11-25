// Kombat Engine: stage kit. Painting helpers, the digitized-backdrop pass, the stage cache and the
// arena registry. A game paints its own arenas with these helpers and registers them with STAGES.define().
'use strict';
const STAGES = (() => {
  const R = RIG, PI = Math.PI;
  const H = 240, FLOOR = 222, AWX = 1100, BW = 1280, CX = 640, FY = 186, VY = 118;
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const rr = (a, b) => a + rand() * (b - a);
  const mk = w => { const c = document.createElement('canvas'); c.width = w; c.height = H; return c; };
  const shade = R.shade;

  // ---------- painting helpers ----------
  function vg(g, x, y, w, h, stops) { const gr = g.createLinearGradient(0, y, 0, y + h); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); g.fillStyle = gr; g.fillRect(x, y, w, h); }
  function hgf(g, x, y, w, h, stops) { const gr = g.createLinearGradient(x, 0, x + w, 0); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); g.fillStyle = gr; g.fillRect(x, y, w, h); }
  function glow(g, x, y, r, c, a = 1) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
  }
  function shadowRect(g, x, y, w, h, a = 0.5) { const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, y, w, h); }
  function speckle(g, x, y, w, h, n, dark = 0.35, light = 0.12) {
    for (let i = 0; i < n; i++) { g.fillStyle = rand() < 0.6 ? `rgba(0,0,0,${dark * rand()})` : `rgba(255,240,220,${light * rand()})`; g.fillRect(x + rand() * w, y + rand() * h, 1 + (rand() < 0.2), 1); }
  }
  function grime(g, x, y, w, h, n = 12, a = 0.25) {
    for (let i = 0; i < n; i++) { const xx = x + rand() * w, ww = 1 + rand() * 4, hh = h * (0.2 + rand() * 0.8); const gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, `rgba(0,0,0,${a * rand()})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(xx, y, ww, hh); }
  }
  // lit wall: vertical light falloff from a light at the bottom (street lamps) or top (moon)
  function wall(g, x, y, w, h, c, o = {}) {
    const gr = g.createLinearGradient(0, y, 0, y + h);
    const up = o.uplit;
    gr.addColorStop(0, shade(c, up ? -0.45 : 0.08)); gr.addColorStop(0.55, c); gr.addColorStop(1, shade(c, up ? 0.12 : -0.4));
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    if (o.side) shadowRect(g, x + w - o.side, y, o.side, h, 0.0), (() => { const s = g.createLinearGradient(x + w - o.side, 0, x + w, 0); s.addColorStop(0, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,0.45)'); g.fillStyle = s; g.fillRect(x + w - o.side, y, o.side, h); })();
  }
  function bricks(g, x, y, w, h, c, mortar, bw = 7, bh = 3.2) {
    g.fillStyle = mortar; g.fillRect(x, y, w, h);
    for (let yy = y, r = 0; yy < y + h; yy += bh, r++) {
      const off = r % 2 ? bw / 2 : 0;
      for (let xx = x - off; xx < x + w; xx += bw) {
        g.fillStyle = shade(c, rr(-0.18, 0.1)); g.fillRect(Math.max(x, xx + 0.6), yy + 0.6, Math.min(bw - 0.9, x + w - xx - 0.6), bh - 0.9);
      }
    }
  }
  // cheap fake-adobe plaster: flat color, mottled patches, water stains and hairline cracks
  function stucco(g, x, y, w, h, c) {
    g.fillStyle = c; g.fillRect(x, y, w, h);
    for (let i = 0; i < w * h / 90; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(255,250,235,0.07)' : 'rgba(60,40,20,0.08)'; g.beginPath(); g.ellipse(x + rand() * w, y + rand() * h, rr(3, 10), rr(2, 6), 0, 0, PI * 2); g.fill(); }
    for (let i = 0; i < w / 14; i++) { const sx = x + rand() * w, sy = y + rand() * h * 0.3, sl = rr(10, h * 0.7); const gr = g.createLinearGradient(0, sy, 0, sy + sl); gr.addColorStop(0, 'rgba(70,55,35,0.35)'); gr.addColorStop(1, 'rgba(70,55,35,0)'); g.fillStyle = gr; g.fillRect(sx, sy, rr(2, 6), sl); }
    g.strokeStyle = 'rgba(40,30,20,0.4)'; g.lineWidth = 0.6;
    for (let i = 0; i < w / 30; i++) { let px = x + rand() * w, py = y + rand() * h; g.beginPath(); g.moveTo(px, py); for (let j = 0; j < 4; j++) { px += rr(-6, 6); py += rr(3, 9); g.lineTo(px, py); } g.stroke(); }
    speckle(g, x, y, w, h, w * h / 6, 0.12, 0.08);
  }
  function stones(g, x, y, w, h, c, sw = 16, sh = 8) {
    g.fillStyle = shade(c, -0.45); g.fillRect(x, y, w, h);
    for (let yy = y, r = 0; yy < y + h; yy += sh, r++) {
      const off = r % 2 ? sw * 0.5 : 0;
      for (let xx = x - off; xx < x + w; xx += sw) {
        const cx = Math.max(x, xx + 0.7), cw = Math.min(sw - 1.2, x + w - cx);
        if (cw <= 0) continue;
        const gr = g.createLinearGradient(0, yy, 0, yy + sh); const t = rr(-0.12, 0.06);
        gr.addColorStop(0, shade(c, t + 0.1)); gr.addColorStop(1, shade(c, t - 0.15));
        g.fillStyle = gr; g.fillRect(cx, yy + 0.7, cw, sh - 1.2);
      }
    }
  }
  // a window: dark glass catching a little sky, or lit from inside with a warm bloom
  function win(g, x, y, w, h, lit, warm = '#ffcc70', frame = '#1a1612') {
    g.fillStyle = frame; g.fillRect(x - 1, y - 1, w + 2, h + 2);
    if (lit) { vg(g, x, y, w, h, [shade(warm, 0.25), warm, shade(warm, -0.35)]); glow(g, x + w / 2, y + h / 2, Math.max(w, h) * 1.6, warm, 0.22); }
    else { vg(g, x, y, w, h, ['#3a4458', '#1a2030', '#0c1018']); g.fillStyle = 'rgba(180,200,230,0.12)'; g.fillRect(x, y, w * 0.35, h); }
  }
  function moon(g, x, y, r, c = '#efe8cf') {
    glow(g, x, y, r * 6, 'rgba(200,210,255,0.35)');
    glow(g, x, y, r * 2.4, 'rgba(230,230,255,0.45)');
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); gr.addColorStop(0, '#fffdf0'); gr.addColorStop(0.7, c); gr.addColorStop(1, shade(c, -0.25));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill();
    g.fillStyle = 'rgba(120,110,90,0.25)'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(x + rr(-r, r) * 0.6, y + rr(-r, r) * 0.6, rr(1, r * 0.25), 0, PI * 2); g.fill(); }
  }
  function stars(g, n, h, w = BW) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + rand() * 0.6})`; g.fillRect(rand() * w, rand() * h, 1, 1); } }
  // soft painted clouds, lit on one side by the moon or the city glow
  function clouds(g, y0, y1, n, dark, light, lx = 0) {
    for (let i = 0; i < n; i++) {
      const x = rand() * BW, y = rr(y0, y1), w = rr(40, 140), h = w * rr(0.18, 0.35);
      g.globalAlpha = 0.55;
      for (let j = 0; j < 12; j++) {
        const cx = x + rr(-w, w) * 0.55, cy = y + rr(-h, h) * 0.35, r = rr(h * 0.9, h * 1.8);
        const gr = g.createRadialGradient(cx + lx * r * 0.25, cy - r * 0.3, 0, cx, cy, r);
        gr.addColorStop(0, light); gr.addColorStop(0.35, dark); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      g.globalAlpha = 1;
    }
  }
  function fog(g, y, h, c, w = BW) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, y, w, h); }
  function treeline(g, y, n, c, h0, h1, w = BW, lit) {
    for (let i = 0; i < n; i++) {
      const x = rand() * w, h = rr(h0, h1);
      for (let j = 0; j < 6; j++) { const cx = x + rr(-h, h) * 0.3, cy = y - h * rr(0.45, 0.9), r = h * rr(0.22, 0.38); g.fillStyle = shade(c, rr(-0.15, 0.05)); g.beginPath(); g.arc(cx, cy, r, 0, PI * 2); g.fill(); if (lit) { g.fillStyle = lit; g.beginPath(); g.arc(cx - r * 0.3, cy - r * 0.35, r * 0.45, 0, PI * 2); g.fill(); } }
      g.fillStyle = shade(c, -0.3); g.fillRect(x - 1.5, y - h * 0.4, 3, h * 0.4);
    }
  }
  function tree(g, x, y, h, c, lit) {
    g.fillStyle = '#140e0a'; g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x - 1.5, y - h * 0.5); g.lineTo(x + 1.5, y - h * 0.5); g.lineTo(x + 3, y); g.fill();
    for (let j = 0; j < 14; j++) { const cx = x + rr(-h, h) * 0.32, cy = y - h * rr(0.45, 0.95), r = h * rr(0.14, 0.26); g.fillStyle = shade(c, rr(-0.25, 0.05)); g.beginPath(); g.arc(cx, cy, r, 0, PI * 2); g.fill(); if (lit && rand() < 0.6) { g.fillStyle = lit; g.beginPath(); g.arc(cx + r * 0.25, cy + r * 0.3, r * 0.5, 0, PI * 2); g.fill(); } }
  }
  function lamp(g, x, y, h, c = 'rgba(255,220,150,0.9)') {
    g.fillStyle = '#0c0c0e'; g.fillRect(x - 1.2, y - h, 2.4, h); g.fillRect(x - 3, y - 4, 6, 4);
    g.fillStyle = '#0c0c0e'; g.beginPath(); g.moveTo(x - 4, y - h); g.lineTo(x + 4, y - h); g.lineTo(x + 2.5, y - h - 7); g.lineTo(x - 2.5, y - h - 7); g.fill();
    g.fillStyle = '#ffe6b0'; g.fillRect(x - 2, y - h - 6, 4, 5);
    glow(g, x, y - h - 3, 34, c, 0.55); glow(g, x, y - h - 3, 10, 'rgba(255,250,220,1)', 0.7);
    // light pool on the ground
    g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y, 0, x, y, 40); gr.addColorStop(0, 'rgba(255,200,130,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 40, 8, 0, 0, PI * 2); g.fill(); g.restore();
  }
  function flag(g, x, top, c) { g.fillStyle = '#6a6a72'; g.fillRect(x - 0.8, top, 1.6, FY - top); g.fillStyle = '#c8b060'; g.fillRect(x - 1.5, top - 2, 3, 2); g.fillStyle = c; g.beginPath(); g.moveTo(x + 1, top + 1); g.quadraticCurveTo(x + 9, top - 1, x + 17, top + 3); g.lineTo(x + 17, top + 12); g.quadraticCurveTo(x + 9, top + 8, x + 1, top + 10); g.fill(); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 9, top + 1, 8, 10); }
  function vignette(g, w) { const gr = g.createRadialGradient(w / 2, H * 0.55, H * 0.4, w / 2, H * 0.55, w * 0.62); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = gr; g.fillRect(0, 0, w, H); }
  // MK-style perspective floor, lines converge to a vanishing point above the middle of the arena
  function pfloor(g, kind, c1, c2, o = {}) {
    const w = AWX, vx = w / 2, y0 = FY, y1 = H;
    vg(g, 0, y0, w, y1 - y0, [c1, c2]);
    const rows = o.rows || 9, span = o.span || 34;
    const ry = t => y0 + (y1 - y0) * Math.pow(t, 1.7);
    // tiles
    for (let r = 0; r < rows; r++) {
      const ya = ry(r / rows), yb = ry((r + 1) / rows), sa = (ya - VY) / (y1 - VY), sb = (yb - VY) / (y1 - VY);
      for (let i = -40; i <= 40; i++) {
        const off = kind === 'brick' && r % 2 ? 0.5 : 0;
        const xa0 = vx + (i + off) * span * sa, xa1 = vx + (i + 1 + off) * span * sa, xb0 = vx + (i + off) * span * sb, xb1 = vx + (i + 1 + off) * span * sb;
        if (Math.max(xa1, xb1) < 0 || Math.min(xa0, xb0) > w) continue;
        const t = rr(-0.12, 0.08);
        g.fillStyle = shade(r % 2 ^ (i & 1) && kind === 'check' ? c2 : c1, t - (1 - r / rows) * 0.25);
        g.beginPath(); g.moveTo(xa0 + 0.6, ya + 0.6); g.lineTo(xa1 - 0.6, ya + 0.6); g.lineTo(xb1 - 0.6, yb - 0.6); g.lineTo(xb0 + 0.6, yb - 0.6); g.closePath(); g.fill();
        if (rand() < 0.15) { g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(rr(xa0, xa1), ya + 1); g.lineTo(rr(xb0, xb1), yb - 1); g.stroke(); }
      }
    }
    speckle(g, 0, y0, w, y1 - y0, 2200, 0.4, 0.1);
    // depth darkening toward the back
    const dg = g.createLinearGradient(0, y0, 0, y0 + 26); dg.addColorStop(0, 'rgba(0,0,0,0.6)'); dg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = dg; g.fillRect(0, y0, w, 26);
    if (o.wet) { for (let i = 0; i < 16; i++) { const x = rand() * w, y = rr(y0 + 10, y1 - 4); g.fillStyle = 'rgba(160,180,220,0.12)'; g.beginPath(); g.ellipse(x, y, rr(10, 40), rr(1, 3), 0, 0, PI * 2); g.fill(); } }
    if (o.edge) { g.fillStyle = o.edge; g.fillRect(0, y0 - 2, w, 3); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, y0 - 2, w, 1); }
  }
  // dithered color reduction so backdrops match the digitized fighters
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function digitize(c, step = 14, sat = 0.82, gain = 1) {
    const g = c.getContext('2d'), img = g.getImageData(0, 0, c.width, c.height), d = img.data, w = c.width;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      if (d[i + 3] < 8) continue;
      const x = p % w, y = (p / w) | 0, n = (BAY[(y & 3) * 4 + (x & 3)] - 7.5) * step / 16 + (rand() - 0.5) * 10;
      let r = d[i] * gain, gg = d[i + 1] * gain, b = d[i + 2] * gain;
      const l = 0.3 * r + 0.59 * gg + 0.11 * b;
      r = l + (r - l) * sat + n; gg = l + (gg - l) * sat + n; b = l + (b - l) * sat + n;
      d[i] = Math.round(r / step) * step; d[i + 1] = Math.round(gg / step) * step; d[i + 2] = Math.round(b / step) * step;
    }
    g.putImageData(img, 0, 0);
  }

  // ---------- registry: filled in by the game with STAGES.define() ----------
  let DEFS = {}, FALLBACK = null, liveFn = null, belowFn = null;
  const cache = {};
  function get(id) {
    if (!DEFS[id]) id = FALLBACK;
    if (cache[id]) return cache[id];
    seed = 11 + id.length * 97;
    const back = mk(BW), front = mk(AWX);
    DEFS[id].draw(back.getContext('2d'), front.getContext('2d'));
    digitize(back, 14, 0.85); digitize(front, 14, 0.85);
    return (cache[id] = { id, name: DEFS[id].name, pit: DEFS[id].pit || false, back, front, bxOff: -206 });
  }
  function name(id) { return (DEFS[id] || DEFS[FALLBACK]).name; }
  // arenas with a stage fatality (uppercut the loser off the edge), for the moves screen
  function pits() { return Object.keys(DEFS).filter(id => DEFS[id].pit && !DEFS[id].bossOnly); }
  // animated bits drawn each frame on top of the far layer (back-layer coords)
  function live(g, id, t, info) { if (liveFn) liveFn(g, id, t, info || {}); }
  // the view from below for a stage fatality
  function drawBelow(g, W, t, kind) { if (belowFn) belowFn(g, W, t, kind); }

  const api = {
    AW: AWX, H, FLOOR, get, name, live, drawBelow, pits,
    ROTATION: [],   // arenas the ladder deals out to regular opponents
    SINGLE: [],     // arenas offered in single match
    kit: { R, PI, H, FLOOR, AWX, BW, CX, FY, VY, rand, rr, mk, shade, setSeed: v => { seed = v; }, vg, hgf, glow, shadowRect, speckle, grime, wall, bricks, stucco, stones, win, moon, stars, clouds, fog, treeline, tree, lamp, flag, vignette, pfloor, digitize },
    // o: { defs: { id: { name, draw(B, F), pit } }, fallback, rotation: [ids], single: [ids], live(g, id, t, info: { hype }), drawBelow(g, W, t, kind), extra: {} }
    define(o) {
      DEFS = o.defs; FALLBACK = o.fallback || Object.keys(DEFS)[0];
      liveFn = o.live || null; belowFn = o.drawBelow || null;
      api.ROTATION = o.rotation || Object.keys(DEFS); api.SINGLE = o.single || api.ROTATION;
      if (o.extra) Object.assign(api, o.extra);
      for (const k in cache) delete cache[k];
    },
  };
  return api;
})();
