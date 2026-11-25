// Kombat Engine: blood, gore, gibs, organs, props and screen effects
'use strict';
const FX = (() => {
  const R = RIG, PI = Math.PI;
  let FLOOR = 222;
  const parts = [], gibs = [], decals = [], props = [], screenDrops = [];
  const rnd = (a, b) => a + Math.random() * (b - a);

  function reset() { parts.length = 0; gibs.length = 0; decals.length = 0; props.length = 0; screenDrops.length = 0; }
  function setFloor(y) { FLOOR = y; }

  // ---------- blood ----------
  function blood(x, y, n, dirx = 0, power = 1, spread = 1) {
    n = Math.round(n * 1.5);
    for (let i = 0; i < n; i++) {
      const sp = rnd(60, 260) * power;
      const a = -PI / 2 + rnd(-1.1, 1.1) * spread + dirx * 0.9;
      parts.push({ k: 'b', x: x + rnd(-2, 2), y: y + rnd(-2, 2), vx: Math.sin(a + PI / 2) * sp * 0.2 + dirx * sp * 0.9 + rnd(-30, 30), vy: -Math.cos(a + PI / 2) * sp * 0 - rnd(40, 220) * power, r: rnd(0.9, 3.0), life: 3, fz: FLOOR + rnd(-4, 10) });
    }
  }
  // a steady arterial stream (neck stumps and such)
  function spurt(x, y, dirx, power = 1) {
    for (let i = 0; i < 3; i++) parts.push({ k: 'b', x, y, vx: dirx * rnd(10, 60) + rnd(-25, 25), vy: -rnd(140, 300) * power, r: rnd(1, 2.2), life: 3, fz: FLOOR + rnd(-4, 10) });
  }
  function spark(x, y, c = '#fff4a0', n = 8) {
    for (let i = 0; i < n; i++) { const a = rnd(0, PI * 2), s = rnd(60, 200); parts.push({ k: 's', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rnd(0.8, 1.6), life: rnd(0.15, 0.3), c }); }
  }
  function dust(x, y, n = 8, c = 'rgba(180,160,140,0.6)') {
    for (let i = 0; i < n; i++) parts.push({ k: 'd', x: x + rnd(-10, 10), y, vx: rnd(-60, 60), vy: rnd(-40, -5), r: rnd(2, 4), life: rnd(0.3, 0.6), c });
  }
  function puff(x, y, c, n = 12, sz = 4) {
    for (let i = 0; i < n; i++) parts.push({ k: 'd', x: x + rnd(-8, 8), y: y + rnd(-8, 8), vx: rnd(-50, 50), vy: rnd(-80, 10), r: rnd(sz * 0.6, sz * 1.4), life: rnd(0.4, 0.8), c });
  }
  function fire(x, y, n = 3, sz = 1) {
    for (let i = 0; i < n; i++) parts.push({ k: 'f', x: x + rnd(-6, 6) * sz, y, vx: rnd(-20, 20), vy: -rnd(40, 120) * sz, r: rnd(2, 4.5) * sz, life: rnd(0.3, 0.6), max: 0.6 });
  }
  function drops(n) { for (let i = 0; i < n; i++) { const blobs = []; for (let j = 0; j < 5; j++) blobs.push([rnd(-8, 8), rnd(-6, 6), rnd(1.5, 4.5)]); screenDrops.push({ x: Math.random(), y: rnd(0, 0.75), blobs, drip: 0, dl: rnd(8, 30), life: rnd(2.2, 3.6), max: 3.6 }); } }

  // ---------- gibs ----------
  // kind: chunk, bone, brain, eye, heart, kidney, liver, lung, stomach, spleen, appendix, guts, tooth, shard, feather, skullfrag, brine
  function gib(kind, x, y, vx, vy, o = {}) {
    const g = Object.assign({ kind, x, y, vx, vy, rot: rnd(0, 6), vr: rnd(-12, 12), s: o.s || 1, rest: false, t: 0, trail: kind !== 'shard' && kind !== 'feather' && kind !== 'bone' && kind !== 'tooth' }, o);
    gibs.push(g);
    return g;
  }
  function burst(x, y, n, kinds, power = 1) {
    blood(x, y, n * 2, 0, power * 1.2, 1.2);
    for (let i = 0; i < Math.ceil(n / 2); i++) gib('chunk', x, y, rnd(-200, 200) * power, rnd(-340, -80) * power);
    for (let i = 0; i < n; i++) gib(kinds[i % kinds.length], x, y, rnd(-180, 180) * power, rnd(-320, -80) * power);
  }

  function update(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.k === 'b') {
        p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y >= p.fz && p.vy > 0) { addDecal(p.x, p.fz, p.r); parts.splice(i, 1); continue; }
      } else if (p.k === 'f') { p.x += p.vx * dt; p.y += p.vy * dt; p.r *= 1 - dt * 1.5; }
      else { p.vy += (p.k === 'd' ? -20 : 300) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      if (p.life <= 0) parts.splice(i, 1);
    }
    if (parts.length > 1500) parts.splice(0, parts.length - 1500);
    for (const g of gibs) {
      g.t += dt;
      if (g.stuck) continue;
      if (g.follow) { const p = g.follow(); g.x = p[0]; g.y = p[1]; if (p[2] != null) g.rot = p[2]; continue; }
      if (g.rest) continue;
      g.vy += (g.grav != null ? g.grav : 900) * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.rot += g.vr * dt;
      if (g.trail && Math.random() < 0.5) parts.push({ k: 'b', x: g.x, y: g.y, vx: rnd(-10, 10), vy: rnd(-10, 10), r: rnd(0.6, 1.4), life: 2, fz: g.fz || FLOOR + 2 });
      const fy = g.fz || (FLOOR + 2);
      if (g.y >= fy) {
        g.y = fy;
        if (Math.abs(g.vy) < 90) { g.rest = true; g.vx = 0; g.vy = 0; g.rot = Math.round(g.rot / PI) * PI + (g.kind === 'bone' ? rnd(-0.3, 0.3) : 0); if (g.trail) addDecal(g.x, fy, 3); if (g.onRest) g.onRest(g); }
        else { g.vy *= -0.35; g.vx *= 0.6; g.vr *= 0.6; if (g.trail) addDecal(g.x, fy, 2); }
      }
      if (g.onUpdate) g.onUpdate(g, dt);
    }
    for (let i = gibs.length - 1; i >= 0; i--) if (gibs[i].dead) gibs.splice(i, 1);
    if (gibs.length > 140) gibs.splice(0, gibs.length - 140);
    for (let i = props.length - 1; i >= 0; i--) { const p = props[i]; p.t = (p.t || 0) + dt; if (p.update) p.update(p, dt); if (p.dead) props.splice(i, 1); }
    for (let i = screenDrops.length - 1; i >= 0; i--) { const d = screenDrops[i]; d.life -= dt; if (d.life <= 0) screenDrops.splice(i, 1); }
  }
  function addDecal(x, y, r) {
    for (const d of decals) if (Math.abs(d.x - x) < d.rx * 0.6 && Math.abs(d.y - y) < 3 && d.rx < 30) { d.rx += r * 0.3; d.ry = Math.min(4.5, d.ry + r * 0.04); return; }
    decals.push({ x, y, rx: r * 1.6 + 1, ry: Math.max(1, r * 0.45), c: Math.random() < 0.5 ? '#6a0008' : '#8a000c' });
    if (decals.length > 400) decals.shift();
  }

  // ---------- drawing ----------
  function drawDecals(g) {
    for (const d of decals) { g.fillStyle = d.c; g.beginPath(); g.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, PI * 2); g.fill(); g.fillStyle = 'rgba(255,120,120,0.25)'; g.fillRect(d.x - d.rx * 0.4, d.y - d.ry * 0.5, d.rx * 0.5, 0.8); }
  }
  function drawParts(g) {
    for (const p of parts) {
      if (p.k === 'b') { g.fillStyle = p.r > 1.6 ? '#9a000e' : '#c8101c'; g.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r * 1.3); }
      else if (p.k === 's') { g.fillStyle = p.c; g.fillRect(p.x, p.y, p.r * 1.5, p.r); }
      else if (p.k === 'f') { const u = Math.max(0, p.life / p.max); g.fillStyle = u > 0.6 ? '#fff6a0' : u > 0.3 ? '#ff9a20' : '#c02a08'; g.globalAlpha = Math.min(1, u * 2); g.beginPath(); g.arc(p.x, p.y, Math.max(0.3, p.r), 0, PI * 2); g.fill(); g.globalAlpha = 1; }
      else { g.globalAlpha = Math.max(0, Math.min(1, p.life * 2)); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, PI * 2); g.fill(); g.globalAlpha = 1; }
    }
  }
  function drawGibs(g) { for (const o of gibs) if (!o.hidden) drawGib(g, o); }
  function drawGib(g, o) {
    g.save(); g.translate(o.x, o.y); g.rotate(o.rot); g.scale(o.s, o.s);
    if (o.draw) o.draw(g, o); else ORG[o.kind] ? ORG[o.kind](g) : ORG.chunk(g);
    g.restore();
  }
  const ORG = {
    chunk(g) { R.poly(g, [[-3, -2], [2, -3], [4, 1], [0, 3], [-4, 1]], '#8a0a14'); g.fillStyle = '#c84050'; g.fillRect(-1, -1, 2, 1); },
    bone(g) { R.bone(g, [-6, 0], [6, 0], 1.5); },
    tooth(g) { g.fillStyle = '#f4f0e0'; g.fillRect(-1, -1.5, 2, 3); },
    skullfrag(g) { R.poly(g, [[-4, -2], [3, -3], [4, 2], [-2, 3]], R.BONE); g.fillStyle = '#8a0a14'; g.fillRect(-2, 1, 4, 1.4); },
    brain(g) { R.oval(g, 0, 0, 6, 4.2, '#e0a0a8'); g.strokeStyle = '#a05868'; g.lineWidth = 0.7; for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(i * 3, 0, 2, PI, 0); g.stroke(); } },
    eye(g) { R.ball(g, 0, 0, 2.8, '#f4f0e6'); R.ball(g, 1.3, 0, 1.3, '#3a6a9a'); g.fillStyle = '#000'; g.fillRect(1.6, -0.4, 0.8, 0.8); R.line(g, -2.6, 0, -6, 1.5, '#b02030', 0.8); },
    heart(g) { g.fillStyle = '#a0101c'; g.beginPath(); g.moveTo(0, 5); g.bezierCurveTo(-8, -1, -4, -7, 0, -3); g.bezierCurveTo(4, -7, 8, -1, 0, 5); g.fill(); R.line(g, 1, -4, 3, -8, '#d0d0e0', 1.4); },
    kidney(g) { R.oval(g, 0, 0, 3.6, 5, '#7a1a24'); g.fillStyle = '#4a0810'; g.beginPath(); g.arc(3, 0, 1.6, 0, PI * 2); g.fill(); },
    liver(g) { R.poly(g, [[-7, -2], [5, -4], [7, 0], [-1, 4]], '#6a1818'); g.fillStyle = 'rgba(255,180,180,0.3)'; g.fillRect(-4, -2, 6, 1); },
    lung(g) { R.oval(g, -3, 0, 3.4, 6, '#d88a94'); R.oval(g, 3.2, 0, 3.4, 6, '#d88a94'); },
    stomach(g) { R.oval(g, 0, 0, 6, 4, '#d0707a'); R.line(g, -5, -2, -7, -6, '#c06070', 2); },
    spleen(g) { R.oval(g, 0, 0, 4.5, 2.6, '#6a1a40'); },
    appendix(g) { R.line(g, -4, 0, 3, 1, '#d08088', 2); R.ball(g, 3.5, 1, 1.4, '#c07080'); },
    guts(g) { for (let i = 0; i < 6; i++) R.ball(g, -8 + i * 3.2, Math.sin(i * 1.7) * 2, 2.3, i % 2 ? '#d88890' : '#c87880'); },
    shard(g) { R.poly(g, [[-3, -2], [4, 0], [-1, 3]], 'rgba(200,235,250,0.85)'); g.fillStyle = '#fff'; g.fillRect(-1, -1, 2, 0.8); },
    feather(g) { R.oval(g, 0, 0, 4, 1.4, '#8a7a68', 0, true); R.line(g, -4, 0, 4, 0, '#3a3028', 0.5); },
    poop(g) { R.ball(g, 0, 1.5, 3.6, '#5a3a1a'); R.ball(g, 0, -1.5, 2.6, '#6a4422'); R.ball(g, 0, -3.6, 1.6, '#7a5028'); },
    ribbon(g) { R.line(g, -6, 0, 6, 1, '#b02030', 2.2); },
  };

  // spine with skull attached (Top Ten List #1)
  function drawSpine(g, len, k = 1, type) {
    for (let i = 0; i < 11; i++) { R.ball(g, 0, i * len / 11, 2.2 * k, i % 2 ? '#d8ccb0' : R.BONE); }
    g.fillStyle = '#9a0010'; for (let i = 0; i < 5; i++) g.fillRect(-2 + (i % 2) * 2, len * 0.2 + i * 6, 2, 3);
    R.skull(g, 1, -7 * k, 7.5 * k, 0, type);
    g.fillStyle = '#9a0010'; g.fillRect(-3, len - 2, 6, 4);
  }

  function drawProps(g, layer) { for (const p of props) if ((p.layer || 'front') === layer && p.draw) p.draw(g, p); }
  function drawScreen(g, W, H) {
    for (const d of screenDrops) {
      g.globalAlpha = Math.min(0.8, d.life / 1.0);
      const x = d.x * W, y = d.y * H;
      d.drip = Math.min(d.dl, d.drip + 0.25);
      g.fillStyle = '#7a0008';
      for (const b of d.blobs) { g.beginPath(); g.arc(x + b[0], y + b[1], b[2], 0, PI * 2); g.fill(); }
      g.fillRect(x - 1, y, 2, d.drip); g.fillRect(x + d.blobs[1][0] - 0.7, y + d.blobs[1][1], 1.4, d.drip * 0.6);
      g.fillStyle = 'rgba(255,140,140,0.3)'; g.fillRect(x - 2, y - 3, 2, 1);
    }
    g.globalAlpha = 1;
  }


  return { reset, setFloor, blood, spurt, spark, dust, puff, fire, drops, gib, burst, update, drawDecals, drawParts, drawGibs, drawGib, drawProps, drawScreen, drawSpine, ORG, props, gibs, parts, decals, rnd };
})();
