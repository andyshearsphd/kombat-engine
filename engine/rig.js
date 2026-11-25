// Kombat Engine: skeletal fighter rig, shaded body drawing, skeleton mode
// Local frame: origin between the feet on the floor, +x is the way the fighter faces, y grows downward.
// Angles: 0 points straight down, positive swings forward (+x), PI points straight up.
'use strict';
const RIG = (() => {
  const PI = Math.PI;
  const dir = (a, L) => [Math.sin(a) * L, Math.cos(a) * L];
  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const lerp2 = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];

  function shade(hex, f) {
    if (hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }

  // ---------- shaded primitives ----------
  function sphFill(g, x, y, r, c) {
    const gr = g.createRadialGradient(x + r * 0.3, y - r * 0.4, r * 0.1, x, y, r * 1.15);
    gr.addColorStop(0, shade(c, 0.35)); gr.addColorStop(0.45, c); gr.addColorStop(1, shade(c, -0.55));
    return gr;
  }
  function ball(g, x, y, r, c) { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, PI * 2); g.fillStyle = sphFill(g, x, y, r, c); g.fill(); }
  function oval(g, x, y, rx, ry, c, rot = 0, flat = false) {
    g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, PI * 2);
    g.fillStyle = flat ? c : sphFill(g, x, y, Math.max(rx, ry), c); g.fill();
  }
  function poly(g, pts, c) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fillStyle = c; g.fill(); }
  function line(g, x1, y1, x2, y2, c, w) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.stroke(); }
  function capPath(g, A, B, ra, rb) {
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1e-3, ang = Math.atan2(dy, dx);
    g.beginPath();
    g.arc(A[0], A[1], ra, ang + PI / 2, ang - PI / 2);
    g.arc(B[0], B[1], rb, ang - PI / 2, ang + PI / 2);
    g.closePath();
    return L;
  }
  // limb capsule, lit from the upper front
  function cap(g, A, B, ra, rb, c, alpha) {
    capPath(g, A, B, ra, rb);
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1e-3;
    let nx = -dy / L, ny = dx / L;
    if (nx * 0.55 - ny * 0.85 < 0) { nx = -nx; ny = -ny; }
    const m = lerp2(A, B, 0.45), r = Math.max(ra, rb) * 1.05;
    const gr = g.createLinearGradient(m[0] + nx * r, m[1] + ny * r, m[0] - nx * r, m[1] - ny * r);
    gr.addColorStop(0, shade(c, 0.32)); gr.addColorStop(0.35, c); gr.addColorStop(0.85, shade(c, -0.45)); gr.addColorStop(1, shade(c, -0.7));
    if (alpha != null) g.globalAlpha = alpha;
    g.fillStyle = gr; g.fill();
    g.globalAlpha = 1;
  }

  // ---------- poses ----------
  const BASE = { hx: 0, hy: 0, hyL: 0, hyA: 0, lean: 0, rot: 0, head: 0, aF: [0.3, 0.3], aB: [0.2, 0.3], fF: [9, 0], fB: [-9, 0], lF: null, lB: null, jaw: 0, piv: 0 };
  function P(o) { const p = Object.assign({}, BASE, o); return p; }
  function legIK(d, hip, foot) {
    const T = d.thigh, S = d.shin;
    let dx = foot[0] - hip[0], dy = foot[1] - hip[1];
    let dist = Math.hypot(dx, dy);
    dist = Math.max(Math.abs(T - S) + 0.5, Math.min((T + S) * 0.999, dist));
    const base = Math.atan2(dx, dy);
    const al = Math.acos(Math.max(-1, Math.min(1, (T * T + dist * dist - S * S) / (2 * T * dist))));
    const th = base + al;
    const knee = add(hip, dir(th, T));
    const shA = Math.atan2(hip[0] + Math.sin(base) * dist - knee[0], hip[1] + Math.cos(base) * dist - knee[1]);
    return [th, th - shA];
  }
  function hipOf(d, p) { const L = d.thigh + d.shin; return [p.hx * d.k, -L * 0.96 + p.hy * d.k + (p.hyL || 0) * L + (p.hyA || 0)]; }
  // converts foot targets into leg angles so poses can be blended
  function resolve(d, p) {
    const q = Object.assign({}, p);
    const hip = hipOf(d, p);
    if (!q.lF) q.lF = legIK(d, hip, [p.fF[0] * d.k, p.fF[1]]);
    if (!q.lB) q.lB = legIK(d, hip, [p.fB[0] * d.k, p.fB[1]]);
    return q;
  }
  function lerp(d, a, b, t) {
    a = resolve(d, a); b = resolve(d, b);
    const o = {};
    for (const k in a) {
      const va = a[k], vb = b[k] != null ? b[k] : va;
      if (Array.isArray(va)) o[k] = va.map((v, i) => v + (vb[i] - v) * t);
      else if (typeof va === 'number') o[k] = va + (vb - va) * t;
      else o[k] = t < 0.5 ? va : vb;
    }
    for (const k in b) if (o[k] == null) o[k] = b[k];
    return o;
  }
  // keyframe track: [[time, pose], ...] with smoothstep easing
  function track(d, keys, t) {
    if (t <= keys[0][0]) return resolve(d, keys[0][1]);
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const u = (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]);
        return lerp(d, keys[i - 1][1], keys[i][1], u * u * (3 - 2 * u));
      }
    }
    return resolve(d, keys[keys.length - 1][1]);
  }

  function solve(d, p) {
    p = resolve(d, p);
    const hip = hipOf(d, p);
    const up = PI - p.lean;
    const sh = add(hip, dir(up, d.torso));
    const nk = add(sh, dir(up - p.head * 0.4, d.neck));
    if (d.hox) nk[0] += d.hox * Math.cos(p.lean * 0.5);
    const legs = L => {
      const h = hip;
      const knee = add(h, dir(L[0], d.thigh));
      const sa = L[0] - L[1];
      const ank = add(knee, dir(sa, d.shin));
      return { h, knee, ank, sa };
    };
    const arms = (A, off) => {
      const s0 = add(sh, dir(up + PI / 2, off));
      const a1 = A[0] + p.lean, a2 = A[0] + A[1] + p.lean;
      const el = add(s0, dir(a1, d.upper));
      const wr = add(el, dir(a2, d.fore));
      return { s0, el, wr, a2 };
    };
    return { p, hip, sh, nk, up, LF: legs(p.lF), LB: legs(p.lB), AF: arms(p.aF, d.shOff), AB: arms(p.aB, -d.shOff) };
  }

  // ---------- realistic segment drawing ----------
  // Fixed key light from the upper front of the fighter (fighter-local coords).
  const LX = 0.5, LY = -0.86;
  let SEED = 1;
  const srand = s => { SEED = s * 9301 + 49297; };
  const rr = () => { SEED = (SEED * 9301 + 49297) % 233280; return SEED / 233280; };
  // body segment with a muscle profile: bf bulges the +n side, bb the -n side (fractions of radius)
  function segPath(g, A, B, ra, rb, bf, bb, bpos = 0.45) {
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1e-3, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const N = 8, P1 = [], P2 = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, r = ra + (rb - ra) * t;
      const bump = Math.pow(Math.max(0, Math.sin(PI * Math.min(1, t / (2 * bpos > 1 ? 1 : 2 * bpos) * (t < bpos ? 1 : 1)))), 1.2);
      const bm = t < bpos ? Math.sin(PI / 2 * t / bpos) : Math.cos(PI / 2 * (t - bpos) / (1 - bpos));
      const b2 = Math.max(0, bm) ** 1.4; void bump;
      P1.push([A[0] + ux * L * t + nx * r * (1 + bf * b2), A[1] + uy * L * t + ny * r * (1 + bf * b2)]);
      P2.push([A[0] + ux * L * t - nx * r * (1 + bb * b2), A[1] + uy * L * t - ny * r * (1 + bb * b2)]);
    }
    const an = Math.atan2(ny, nx);
    g.beginPath();
    g.moveTo(P1[0][0], P1[0][1]);
    for (let i = 1; i <= N; i++) { const m = [(P1[i - 1][0] + P1[i][0]) / 2, (P1[i - 1][1] + P1[i][1]) / 2]; g.quadraticCurveTo(P1[i - 1][0], P1[i - 1][1], m[0], m[1]); }
    g.lineTo(P1[N][0], P1[N][1]);
    g.arc(B[0], B[1], rb, an, an - PI, true);
    for (let i = N - 1; i >= 0; i--) { const m = [(P2[i + 1][0] + P2[i][0]) / 2, (P2[i + 1][1] + P2[i][1]) / 2]; g.quadraticCurveTo(P2[i + 1][0], P2[i + 1][1], m[0], m[1]); }
    g.lineTo(P2[0][0], P2[0][1]);
    g.arc(A[0], A[1], ra, an + PI, an, true);
    g.closePath();
    return { L, ux, uy, nx, ny, P1, P2 };
  }
  function litFill(g, m, nx, ny, w, c, dark) {
    let sx = nx, sy = ny;
    if (sx * LX + sy * LY < 0) { sx = -sx; sy = -sy; }
    const gr = g.createLinearGradient(m[0] + sx * w, m[1] + sy * w, m[0] - sx * w, m[1] - sy * w);
    const k = dark ? -0.3 : 0;
    gr.addColorStop(0, shade(c, 0.22 + k)); gr.addColorStop(0.22, shade(c, 0.04 + k)); gr.addColorStop(0.55, shade(c, -0.22 + k)); gr.addColorStop(0.85, shade(c, -0.55 + k)); gr.addColorStop(1, shade(c, -0.78));
    return gr;
  }
  // materials: skin, cloth, denim, suit, fur, glass, feather, metal
  function seg(g, A, B, ra, rb, c, mat, o = {}) {
    const bf = o.bf || 0, bb = o.bb || 0, seed = o.seed || 1, dark = !!o.dark;
    const fr = segPath(g, A, B, ra, rb, bf, bb, o.bpos || 0.42);
    const m = lerp2(A, B, 0.45), w = Math.max(ra, rb) * 1.3;
    g.save();
    if (mat === 'glass') g.globalAlpha = 0.82;
    g.fillStyle = litFill(g, m, fr.nx, fr.ny, w, c, dark); g.fill();
    g.globalAlpha = 1;
    g.clip();
    // ambient occlusion where the segment joins its parent
    const ao = g.createLinearGradient(A[0], A[1], A[0] + fr.ux * fr.L * 0.35, A[1] + fr.uy * fr.L * 0.35);
    ao.addColorStop(0, 'rgba(0,0,0,0.38)'); ao.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = ao; g.fillRect(m[0] - 60, m[1] - 60, 120, 120);
    srand(seed);
    const P = (t, s) => [A[0] + fr.ux * fr.L * t + fr.nx * s, A[1] + fr.uy * fr.L * t + fr.ny * s];
    if (mat === 'fur' || mat === 'feather') {
      const n = Math.round(fr.L * (mat === 'fur' ? 1.6 : 0.8));
      for (let i = 0; i < n; i++) {
        const t = rr(), s = (rr() - 0.5) * 2 * (ra + (rb - ra) * t), p = P(t, s), l = 2 + rr() * 2.5;
        g.strokeStyle = rr() < 0.5 ? 'rgba(0,0,0,0.28)' : 'rgba(255,240,220,0.16)'; g.lineWidth = 0.7;
        g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] + fr.ux * l, p[1] + fr.uy * l); g.stroke();
      }
    } else if (mat === 'cloth' || mat === 'denim' || mat === 'suit') {
      g.lineWidth = 0.9;
      for (let i = 0; i < 3; i++) {
        const t = 0.72 + i * 0.09 + rr() * 0.05, s0 = -(ra + rb) * 0.6, s1 = (ra + rb) * 0.6;
        const a = P(t, s0), b = P(t - 0.12 - rr() * 0.1, s1 * 0.2), c2 = P(t + 0.02, s1);
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(b[0], b[1], c2[0], c2[1]); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.moveTo(a[0] + 0.8, a[1] - 0.8); g.quadraticCurveTo(b[0] + 0.8, b[1] - 0.8, c2[0] + 0.8, c2[1] - 0.8); g.stroke();
      }
      const a = P(0.15, (ra + rb) * 0.1), b = P(0.55, -(ra + rb) * 0.15);
      g.strokeStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      if (mat === 'denim') { g.fillStyle = 'rgba(220,230,255,0.13)'; for (let i = 0; i < fr.L * 2; i++) { const p = P(rr(), (rr() - 0.5) * 2 * ra); g.fillRect(p[0], p[1], 1, 0.6); } }
    } else if (mat === 'skin') {
      const t = o.bpos || 0.42, side = bf >= bb ? 1 : -1, r = ra + (rb - ra) * t;
      const h = P(t, side * r * 0.45);
      g.fillStyle = 'rgba(255,235,210,0.09)'; g.beginPath(); g.ellipse(h[0], h[1], r * 0.4, fr.L * 0.3, Math.atan2(fr.uy, fr.ux), 0, PI * 2); g.fill();
      const a = P(t - 0.15, -side * r * 0.2), b = P(t + 0.25, -side * r * 0.35);
      g.strokeStyle = 'rgba(60,20,10,0.22)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    } else if (mat === 'metal') {
      // duct pipe: a hard specular line, a dark reflection and crimped seams
      const r = (ra + rb) * 0.5, hs = side => [P(0.04, side * r), P(0.96, side * r)];
      let [a, b] = hs(0.3); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = Math.max(1, r * 0.3); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      [a, b] = hs(-0.45); g.strokeStyle = 'rgba(20,24,30,0.3)'; g.lineWidth = Math.max(1, r * 0.35); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      const n = Math.max(2, Math.round(fr.L / 6.5));
      for (let i = 1; i < n; i++) { const t = i / n, p0 = P(t, -r * 1.3), p1 = P(t, r * 1.3); g.strokeStyle = 'rgba(40,44,54,0.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(p0[0] + fr.ux, p0[1] + fr.uy); g.lineTo(p1[0] + fr.ux, p1[1] + fr.uy); g.stroke(); }
    } else if (mat === 'glass') {
      const a = P(0.1, (ra + rb) * 0.25), b = P(0.85, (ra + rb) * 0.25);
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    if (dark) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(m[0] - 60, m[1] - 60, 120, 120); }
    g.restore();
    // fur fringe breaks up the silhouette
    if (mat === 'fur' || mat === 'feather') {
      srand(seed + 7);
      const fc = shade(c, dark ? -0.45 : -0.2);
      g.fillStyle = fc;
      for (const side of [fr.P1, fr.P2]) for (let i = 1; i < side.length; i++) {
        const p = side[i], q = side[i - 1], ex = p[0] - (side === fr.P1 ? -fr.nx : fr.nx) * 0, nn = side === fr.P1 ? 1 : -1;
        const l = 1.2 + rr() * 2;
        g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo((p[0] + q[0]) / 2 + fr.nx * nn * l - fr.ux * 1.5, (p[1] + q[1]) / 2 + fr.ny * nn * l - fr.uy * 1.5); g.lineTo(ex, p[1]); g.fill();
      }
    }
    return fr;
  }

  // fists and paws
  function hand(g, d, def, A, dark, st) {
    const c = shade(def.col.hand, dark ? -0.3 : 0);
    const a = A.a2, r = d.fist;
    g.save(); g.translate(A.wr[0], A.wr[1]); g.rotate(-a + PI / 2);
    // local: +x = along the forearm, +y = palm side
    const gr = g.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, shade(c, 0.2)); gr.addColorStop(0.5, c); gr.addColorStop(1, shade(c, -0.55));
    g.fillStyle = gr;
    if (def.paws) {
      g.beginPath(); g.ellipse(r * 0.75, 0, r * 1.05, r * 0.85, 0, 0, PI * 2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.7;
      for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(r * 1.4, i * r * 0.42); g.lineTo(r * 1.75, i * r * 0.5); g.stroke(); }
      if (def.claws) { g.strokeStyle = st.claws ? '#f4efe0' : '#cfc6b0'; g.lineWidth = st.claws ? 1.1 : 0.7; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(r * 1.7, i * r * 0.45); g.lineTo(r * (st.claws ? 2.7 : 2.1), i * r * 0.55 + r * 0.25); g.stroke(); } }
    } else {
      g.beginPath(); g.moveTo(-r * 0.3, -r * 0.8); g.lineTo(r * 1.25, -r * 0.85); g.quadraticCurveTo(r * 1.85, -r * 0.8, r * 1.85, 0); g.quadraticCurveTo(r * 1.85, r * 0.9, r * 1.1, r * 0.9); g.lineTo(-r * 0.3, r * 0.75); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(40,10,0,0.45)'; g.lineWidth = 0.6;
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(r * 1.15, -r * 0.6 + i * r * 0.55); g.lineTo(r * 1.8, -r * 0.55 + i * r * 0.55); g.stroke(); }
      g.fillStyle = shade(c, -0.15); g.beginPath(); g.ellipse(r * 0.6, r * 0.75, r * 0.65, r * 0.32, 0.2, 0, PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(r * 1.1, -r * 0.8, r * 0.6, r * 0.3);
    }
    g.restore();
  }
  function foot(g, d, def, L, dark) {
    const c = shade(def.col.foot, dark ? -0.3 : 0), fa = L.sa + PI / 2, h = d.footH, l = d.footL;
    g.save(); g.translate(L.ank[0], L.ank[1]); g.rotate(-fa + PI / 2);
    const gr = g.createLinearGradient(0, -h, 0, h * 1.4); gr.addColorStop(0, shade(c, 0.25)); gr.addColorStop(0.5, c); gr.addColorStop(1, shade(c, -0.6));
    g.fillStyle = gr;
    if (def.webbed) { g.beginPath(); g.moveTo(-h * 0.3, -h * 0.3); g.lineTo(l * 0.95, h * 0.9); g.lineTo(l * 0.6, h * 1.2); g.lineTo(l * 0.75, h * 1.5); g.lineTo(-h * 0.5, h * 0.8); g.closePath(); g.fill(); }
    else if (def.talons) {
      g.strokeStyle = c; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) { g.lineWidth = h * 0.62; g.beginPath(); g.moveTo(0, h * 0.4); g.lineTo(l * (0.75 + i * 0.12), h * (0.5 + i * 0.32)); g.stroke(); }
      g.beginPath(); g.moveTo(0, h * 0.4); g.lineTo(-l * 0.35, h * 1.0); g.stroke();
      g.strokeStyle = '#141010'; g.lineWidth = 0.9; for (let i = 0; i < 3; i++) { const tx = l * (0.75 + i * 0.12), ty = h * (0.5 + i * 0.32); g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + 2.2, ty + 1.6); g.stroke(); }
      g.beginPath(); g.moveTo(-l * 0.35, h * 1.0); g.lineTo(-l * 0.35 - 2, h * 1.0 + 1.4); g.stroke(); g.lineCap = 'butt';
    }
    else if (def.paws) { g.beginPath(); g.ellipse(l * 0.35, h * 0.55, l * 0.58, h * 0.85, 0.08, 0, PI * 2); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.6; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(l * 0.7 + i * 1.3, h * 0.1); g.lineTo(l * 0.75 + i * 1.3, h * 1.2); g.stroke(); } }
    else {
      g.beginPath(); g.moveTo(-h * 0.9, -h * 0.6); g.quadraticCurveTo(l * 0.2, -h * 1.0, l * 0.55, -h * 0.2); g.quadraticCurveTo(l * 0.95, h * 0.2, l * 0.95, h * 0.9); g.lineTo(-h * 0.9, h * 1.0); g.closePath(); g.fill();
      g.fillStyle = shade(c, -0.6); g.fillRect(-h * 0.9, h * 0.75, l * 0.95 + h * 0.9, h * 0.35);
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(l * 0.25, -h * 0.4, l * 0.3, 0.7);
    }
    g.restore();
  }
  function drawLeg(g, d, def, L, dark, o) {
    const c = def.col, ms = def.mat || {}, sd = dark ? 20 : 10;
    if (!o.cutAnkles) foot(g, d, def, L, dark);
    const end = o.cutAnkles ? lerp2(L.knee, L.ank, 0.88) : L.ank;
    seg(g, L.knee, end, d.kneeR, d.ankleR, c.legL || c.legU, ms.legL || ms.legU || 'skin', { bb: (def.calf != null ? def.calf : 0.35), bf: 0.05, bpos: 0.3, seed: sd + 1, dark });
    if (def.sock && !o.cutAnkles) seg(g, lerp2(L.knee, L.ank, def.sockLow ? 0.84 : 0.5), L.ank, d.ankleR * 1.1, d.ankleR * 1.05, def.sock, 'cloth', { seed: sd + 2, dark });
    if (o.cutAnkles) { ball(g, end[0], end[1], d.ankleR * 0.9, '#8a0010'); ball(g, end[0], end[1], d.ankleR * 0.35, '#e8e0d0'); }
    seg(g, L.h, L.knee, d.thighR, d.kneeR, c.legU, ms.legU || 'skin', { bf: 0.22, bb: 0.12, bpos: 0.4, seed: sd + 3, dark });
    if (def.stripe) { const a = lerp2(L.h, L.knee, 0.05), b = lerp2(L.h, L.knee, 0.92); line(g, a[0], a[1], b[0], b[1], shade(def.stripe, dark ? -0.3 : 0), 1.4); }
  }
  function drawArm(g, d, def, A, dark, st) {
    const c = def.col, ms = def.mat || {}, sd = dark ? 40 : 30;
    if (def.wings) { def.wing(g, A, dark, d, st); return; }
    seg(g, A.el, A.wr, d.elbowR, d.wristR, c.armL || c.armU, ms.armL || ms.armU || 'skin', { bf: 0.25, bb: 0.1, bpos: 0.3, seed: sd + 1, dark });
    if (c.cuff) seg(g, lerp2(A.el, A.wr, 0.8), A.wr, d.wristR * 1.2, d.wristR * 1.2, c.cuff, 'cloth', { seed: sd + 5, dark });
    // a compression sleeve on the fighter's real left arm: the far arm when facing right, the near arm when facing left
    if (def.sleeve && (dark ? st.face > 0 : st.face < 0)) seg(g, lerp2(A.el, A.wr, -0.04), lerp2(A.el, A.wr, 0.93), d.elbowR * 1.1, d.wristR * 1.12, def.sleeve, 'cloth', { seed: sd + 6, dark });
    seg(g, A.s0, A.el, d.shR, d.elbowR, c.armU, ms.armU || 'skin', { bf: def.bicep != null ? def.bicep : 0.25, bb: 0.18, bpos: 0.45, seed: sd + 2, dark });
    hand(g, d, def, A, dark, st);
  }
  function torsoPath(g, d, hip, sh, bellyK) {
    const ux = sh[0] - hip[0], uy = sh[1] - hip[1], L = Math.hypot(ux, uy) || 1, u = [ux / L, uy / L], n = [-u[1], u[0]];
    const at = (t, s) => [hip[0] + ux * t + n[0] * s, hip[1] + uy * t + n[1] * s];
    const bel = d.belly * (bellyK || 1), chest = d.chest || d.shW;
    g.beginPath();
    g.moveTo(...at(-0.1, 0));
    g.quadraticCurveTo(...at(-0.1, d.hipW * 1.05), ...at(0.05, d.hipW));
    g.bezierCurveTo(...at(0.3, bel * 0.95), ...at(0.55, bel), ...at(0.72, chest * 1.02));
    g.quadraticCurveTo(...at(0.95, chest * 1.05), ...at(1.06, d.shW * 0.6));
    g.quadraticCurveTo(...at(1.12, 0), ...at(1.06, -d.shW * 0.7));
    g.quadraticCurveTo(...at(0.98, -d.shW * 1.08), ...at(0.8, -d.back * 1.02));
    g.bezierCurveTo(...at(0.55, -d.back * 0.85), ...at(0.3, -d.back * 0.9), ...at(0.05, -d.hipW * 1.05));
    g.quadraticCurveTo(...at(-0.1, -d.hipW * 1.1), ...at(-0.1, 0));
    g.closePath();
    return { u, n, L, at };
  }
  function drawTorso(g, d, def, J, st) {
    const fr = torsoPath(g, d, J.hip, J.sh, st.belly);
    const m = lerp2(J.hip, J.sh, 0.5), w = Math.max(d.belly, d.shW) * 1.25, mat = (def.mat && def.mat.torso) || 'skin';
    g.save();
    if (mat === 'glass') g.globalAlpha = 0.82;
    g.fillStyle = litFill(g, m, fr.n[0], fr.n[1], w, def.col.torso, false); g.fill();
    g.globalAlpha = 1;
    g.clip();
    srand(77);
    if (mat === 'fur') {
      for (let i = 0; i < 70; i++) { const p = fr.at(rr(), (rr() - 0.5) * 2 * d.belly); g.strokeStyle = rr() < 0.5 ? 'rgba(0,0,0,0.25)' : 'rgba(255,240,220,0.14)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] - fr.u[0] * 3, p[1] - fr.u[1] * 3); g.stroke(); }
    } else if (mat === 'skin') {
      const pec = fr.at(0.8, d.shW * 0.35);
      g.fillStyle = 'rgba(255,230,200,0.16)'; g.beginPath(); g.ellipse(pec[0], pec[1], d.shW * 0.55, d.torso * 0.12, 0, 0, PI * 2); g.fill();
      g.strokeStyle = 'rgba(50,10,0,0.25)'; g.lineWidth = 0.8;
      const a = fr.at(0.7, d.shW * 0.05), b = fr.at(0.7, d.shW * 0.8); g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(...fr.at(0.62, d.shW * 0.4), b[0], b[1]); g.stroke();
    } else if (mat === 'cloth' || mat === 'suit') {
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.9;
      for (let i = 0; i < 4; i++) { const a = fr.at(0.2 + i * 0.15, -d.back * 0.6), b = fr.at(0.25 + i * 0.15 + rr() * 0.1, d.belly * 0.6); g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(...fr.at(0.3 + i * 0.15, 0), b[0], b[1]); g.stroke(); }
    }
    // shadow side of the body and under the chest
    const sg = g.createLinearGradient(...fr.at(0.5, -d.back), ...fr.at(0.5, d.belly * 0.2));
    sg.addColorStop(0, 'rgba(0,0,0,0.35)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sg; g.fillRect(m[0] - 80, m[1] - 80, 160, 160);
    if (def.torsoDetail) {
      g.save(); g.translate(J.hip[0], J.hip[1]); g.rotate(Math.atan2(fr.u[0], -fr.u[1]));
      def.torsoDetail(g, d, st, fr.L);
      g.restore();
    }
    g.restore();
    if (mat === 'fur') {
      srand(91); g.fillStyle = shade(def.col.torso, -0.25);
      for (let i = 0; i < 26; i++) { const t = i / 26, side = i % 2 ? 1 : -1, p = fr.at(t, side * (side > 0 ? d.belly : d.back) * (0.85 + 0.15 * Math.sin(t * PI))); g.beginPath(); g.moveTo(p[0], p[1] - 1.5); g.lineTo(p[0] + fr.n[0] * side * (1.5 + rr() * 1.5), p[1] + fr.n[1] * side * (1.5 + rr() * 1.5) + 1); g.lineTo(p[0], p[1] + 1.5); g.fill(); }
    }
  }
  function drawWounds(g, d, J, wounds) {
    for (const w of wounds) {
      const base = w.j === 'head' ? add(J.nk, dir(PI - J.p.lean, 10 * d.k)) : w.j === 'chest' ? lerp2(J.hip, J.sh, 0.75) : w.j === 'belly' ? lerp2(J.hip, J.sh, 0.35) : w.j === 'armF' ? J.AF.el : J.LF.knee;
      const x = base[0] + w.dx * d.k, y = base[1] + w.dy * d.k;
      g.fillStyle = 'rgba(110,0,8,0.85)'; g.beginPath(); g.ellipse(x, y, w.r, w.r * 0.7, w.a, 0, PI * 2); g.fill();
      g.fillStyle = 'rgba(170,10,20,0.9)'; g.beginPath(); g.ellipse(x - 0.4, y - 0.4, w.r * 0.55, w.r * 0.35, w.a, 0, PI * 2); g.fill();
      g.fillStyle = 'rgba(120,0,8,0.85)'; g.fillRect(x - 0.5, y, 1.1, w.drip);
    }
  }

  // f: { def, x, y, face, d (scaled dims) }  o: render options
  function draw(g, f, p, o = {}) {
    const def = f.def, d = f.d;
    const J = solve(d, p);
    const st = Object.assign({ t: f.t || 0, face: f.face }, f.st || {}, o);
    g.save();
    g.translate(f.x, f.y);
    if (o.flat) g.scale(1, o.flat);
    if (o.scale) g.scale(o.scale, o.scale);
    g.scale(f.face, 1);
    if (J.p.rot) {
      const pv = J.p.piv === 1 ? [0, 0] : J.p.piv === 2 ? lerp2(J.hip, J.sh, 0.4) : J.hip;
      g.translate(pv[0], pv[1]); g.rotate(J.p.rot); g.translate(-pv[0], -pv[1]);
    }
    if (o.skeleton) { drawSkeleton(g, d, J, def, o); g.restore(); return J; }
    if (def.behind) def.behind(g, d, J, st);
    if (def.chair) chair(g, d, J, st, def.chair, 'back');
    drawArm(g, d, def, J.AB, true, st);
    if (def.backHand) def.backHand(g, d, J, st);
    drawLeg(g, d, def, J.LB, true, o);
    if (def.tail) def.tail(g, d, J, st);
    if (def.bodyDraw) { const up = J.p.lF[0] - J.p.lean > 0.9; if (!up) drawLeg(g, d, def, J.LF, false, o); def.bodyDraw(g, d, J, st); if (up) drawLeg(g, d, def, J.LF, false, o); }
    else { drawTorso(g, d, def, J, st); drawLeg(g, d, def, J.LF, false, o); if (def.skirt) def.skirt(g, d, J, st); }
    if (def.chair) chair(g, d, J, st, def.chair, 'front');
    if (def.neckDraw) def.neckDraw(g, d, J, st);
    else if (!o.noHead && !def.bodyDraw) seg(g, lerp2(J.sh, J.nk, -0.3), J.nk, d.shW * 0.36, d.shW * 0.32, def.col.neck || def.col.hand, (def.mat && def.mat.neck) || 'skin', { seed: 5 });
    if (!o.noHead && !o.noHeadDraw) drawHeadAt(g, f, J.nk[0], J.nk[1], J.p.lean + J.p.head * 0.5, o.headScale || 1, Object.assign({}, st, { jaw: J.p.jaw }));
    if (o.noHead) { ball(g, J.nk[0], J.nk[1], d.shW * 0.42, '#7a0010'); ball(g, J.nk[0] + 1, J.nk[1] - 1, d.shW * 0.18, '#e8e0d0'); }
    if (st.wounds && st.wounds.length && !o.noWounds) drawWounds(g, d, J, st.wounds.filter(w => !(o.noHead && w.j === 'head')));
    drawArm(g, d, def, J.AF, false, st);
    if (def.frontHand) def.frontHand(g, d, J, st);
    g.restore();
    return J;
  }
  // ---------- 1.1: an armored wheelchair for seated fighters (def.chair: true or { metal, tire, plate, spikes }) ----------
  function wheel(g, cx, cy, r, ang, o, far) {
    const k = far ? -0.25 : 0;
    ball(g, cx, cy, r, shade(o.tire, k));
    g.fillStyle = shade(o.tire, -0.4 + k); g.beginPath(); g.arc(cx, cy, r * 0.84, 0, PI * 2); g.fill();
    g.strokeStyle = shade(o.metal, 0.2 + k); g.lineWidth = r * 0.09; g.beginPath(); g.arc(cx, cy, r * 0.8, 0, PI * 2); g.stroke();
    for (let i = 0; i < 8; i++) { const a = ang + i * PI / 4; line(g, cx, cy, cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78, shade(o.metal, -0.1 + k), r * 0.05); }
    ball(g, cx, cy, r * 0.16, shade(o.metal, 0.1 + k));
    g.strokeStyle = shade(o.metal, -0.3 + k); g.lineWidth = r * 0.05; g.beginPath(); g.arc(cx, cy, r * 0.62, 0, PI * 2); g.stroke();
  }
  function chair(g, d, J, st, spec, layer) {
    const o = Object.assign({ metal: '#7a7e88', tire: '#1c1c1e', plate: '#4e535c', spikes: true }, spec === true ? {} : spec), k = d.k;
    const h = J.hip, kn = J.LF.knee, an = J.LF.ank, r = d.shin * 0.55, wc = [h[0] - d.thigh * 0.12, -r], ang = -(st.wheel || 0);
    if (layer === 'back') {
      wheel(g, wc[0] - 3 * k, wc[1] - 2 * k, r * 0.98, ang, o, true);
      // backrest and push handles
      const b0 = [h[0] - d.back * 1.05, h[1] + 2 * k], b1 = [h[0] - d.back * 1.35, h[1] - d.torso * 0.72];
      line(g, b0[0], b0[1], b1[0], b1[1], shade(o.metal, -0.2), 2.6 * k);
      line(g, b1[0], b1[1], b1[0] - 6 * k, b1[1] - 1 * k, shade(o.metal, -0.1), 2.2 * k);
      poly(g, [[b0[0] + 1.5 * k, b0[1] - 4 * k], [b1[0] + 2 * k, b1[1] + 4 * k], [b1[0] + 7 * k, b1[1] + 5 * k], [b0[0] + 7 * k, b0[1] - 5 * k]], shade(o.plate, -0.25));
      // seat
      poly(g, [[h[0] - d.back * 1.1, h[1] + 3 * k], [kn[0] + 2 * k, kn[1] + 3 * k], [kn[0] + 2 * k, kn[1] + 6 * k], [h[0] - d.back * 1.1, h[1] + 7 * k]], shade(o.plate, -0.15));
      return;
    }
    // frame tubes down to the caster and footplate
    line(g, h[0] - d.back * 0.9, h[1] + 7 * k, wc[0], wc[1], o.metal, 2.4 * k);
    line(g, kn[0], kn[1] + 5 * k, an[0] + 2 * k, -3.5 * k, o.metal, 2.4 * k);
    line(g, h[0] - d.back * 0.9, h[1] + 7 * k, kn[0] + 1 * k, kn[1] + 6 * k, shade(o.metal, 0.15), 2.6 * k);
    // footplate, with a ram spike out front
    poly(g, [[an[0] - 4 * k, -3 * k], [an[0] + 9 * k, -3 * k], [an[0] + 9 * k, -0.6 * k], [an[0] - 4 * k, -0.6 * k]], shade(o.plate, 0.1));
    if (o.spikes) for (let i = 0; i < 2; i++) poly(g, [[an[0] + 9 * k, (-2.8 + i * 1.3) * k], [an[0] + 15 * k, (-2.2 + i * 1.3) * k], [an[0] + 9 * k, (-1.6 + i * 1.3) * k]], '#c8ccd4');
    wheel(g, an[0] - 1 * k, -3.6 * k, 3.6 * k, ang * 4, o, false);
    // the near wheel, then an armored fender over its top with rivets
    wheel(g, wc[0], wc[1], r, ang, o, false);
    g.beginPath(); g.arc(wc[0], wc[1], r * 1.12, PI * 1.08, PI * 1.92); g.arc(wc[0], wc[1], r * 0.86, PI * 1.92, PI * 1.08, true); g.closePath();
    const gr = g.createLinearGradient(0, wc[1] - r * 1.1, 0, wc[1] - r * 0.6); gr.addColorStop(0, shade(o.plate, 0.35)); gr.addColorStop(1, shade(o.plate, -0.3)); g.fillStyle = gr; g.fill();
    g.fillStyle = shade(o.metal, 0.45); for (let i = 0; i < 5; i++) { const a = PI * (1.14 + i * 0.18); g.fillRect(wc[0] + Math.cos(a) * r * 0.99 - 0.6, wc[1] + Math.sin(a) * r * 0.99 - 0.6, 1.2, 1.2); }
    // armrest
    line(g, h[0] - d.back * 0.6, h[1] - d.torso * 0.28, h[0] + d.thigh * 0.55, h[1] - d.torso * 0.28, shade(o.metal, 0.05), 2.2 * k);
    line(g, h[0] + d.thigh * 0.5, h[1] - d.torso * 0.28, h[0] + d.thigh * 0.5, h[1] + 4 * k, o.metal, 1.8 * k);
  }
  // ---------- front view: the fighter turns to face the camera for the victory pose ----------
  // fp: { hy, squat, spread, sway, head (tilt), jaw, aL/aR: [upper angle from straight down, outward +; elbow bend, + outward/up] }
  // L is screen left. Returns joints in world coordinates.
  function drawFront(g, f, fp, o = {}) {
    const def = f.def, d = f.d, Fd = def.front || {}, c = def.col, ms = def.mat || {}, k = d.k;
    const st = Object.assign({ t: f.t || 0, face: 1 }, f.st || {}, o);
    const sx = o.sx == null ? 1 : o.sx;
    g.save(); g.translate(f.x, f.y); g.scale(sx, 1); if (fp.sway) g.rotate(fp.sway);
    const Lg = (d.thigh + d.shin) * 0.96, sq = (fp.squat || 0) * k, hx = d.hipW * 0.55;
    const hipY = def.chair ? -(d.shin + d.footH * 0.9 + 2 * k) + (fp.hy || 0) * k * 0.3 : -Lg + sq + (fp.hy || 0) * k;
    const sY = hipY - d.torso, nY = sY - (Fd.neck != null ? Fd.neck * k : d.neck * 0.2 - 1.5 * k), shx = Math.max(d.shW, d.chest * 0.8);
    const legs = def.chair ? [-1, 1].map(sd => ({ sd, hip: [sd * hx, hipY], knee: [sd * hx * 1.05, hipY + 2 * k], foot: [sd * hx * 1.15, -d.footH * 0.6] }))
      : [-1, 1].map(sd => { const hip = [sd * hx, hipY], foot = [sd * (hx + (fp.spread ?? 4) * k), -d.footH * 0.4 - (sd < 0 ? fp.liftL || 0 : fp.liftR || 0) * k]; return { sd, hip, foot, knee: [(hip[0] + foot[0]) / 2 + sd * sq * 0.6, (hip[1] + foot[1]) / 2] }; });
    const armPts = (sd, a) => { const s0 = [sd * shx * 0.95, sY + d.shR * 0.6], el = [s0[0] + sd * Math.sin(a[0]) * d.upper, s0[1] + Math.cos(a[0]) * d.upper], b = a[0] + a[1], wr = [el[0] + sd * Math.sin(b) * d.fore, el[1] + Math.cos(b) * d.fore]; return { sd, s0, el, wr }; };
    const arms = { L: armPts(-1, fp.aL || [0.25, 0.1]), R: armPts(1, fp.aR || [0.25, 0.1]) };
    const G = { hipY, sY, nY, shx, hx, legs, arms, k };
    if (Fd.behind) Fd.behind(g, d, G, st);
    if (def.chair) {
      // the chair head on: big wheels edge on at the sides, seat, backrest, footplate
      const o = Object.assign({ metal: '#7a7e88', tire: '#1c1c1e', plate: '#4e535c' }, def.chair === true ? {} : def.chair), r = d.shin * 0.55, wx = Math.max(shx, d.hipW * 1.2) + 4 * k;
      poly(g, [[-wx + 2 * k, hipY - d.torso * 0.75], [wx - 2 * k, hipY - d.torso * 0.75], [wx - 3 * k, hipY + 2 * k], [-wx + 3 * k, hipY + 2 * k]], shade(o.plate, -0.35));
      for (const sd of [-1, 1]) { g.fillStyle = o.tire; g.beginPath(); g.ellipse(sd * wx, -r, r * 0.22, r, 0, 0, PI * 2); g.fill(); g.strokeStyle = o.metal; g.lineWidth = 1.2 * k; g.beginPath(); g.ellipse(sd * wx, -r, r * 0.14, r * 0.8, 0, 0, PI * 2); g.stroke(); line(g, sd * wx, -r * 2.05, sd * wx, -r * 1.2, shade(o.plate, 0.3), 3 * k); }
      poly(g, [[-wx, hipY + 3 * k], [wx, hipY + 3 * k], [wx, hipY + 7 * k], [-wx, hipY + 7 * k]], o.plate);
      poly(g, [[-hx * 2, -3 * k], [hx * 2, -3 * k], [hx * 2, 0], [-hx * 2, 0]], shade(o.plate, 0.1));
    }
    if (Fd.body) Fd.body(g, d, G, st);
    else {
      for (const L of legs) {
        seg(g, L.knee, L.foot, d.kneeR, d.ankleR, c.legL || c.legU, ms.legL || ms.legU || 'skin', { seed: 60 + L.sd, bb: 0.2 });
        if (def.sock) seg(g, lerp2(L.knee, L.foot, def.sockLow ? 0.84 : 0.5), L.foot, d.ankleR * 1.1, d.ankleR * 1.05, def.sock, 'cloth', { seed: 62 });
        seg(g, L.hip, L.knee, d.thighR, d.kneeR, c.legU, ms.legU || 'skin', { seed: 64 + L.sd, bf: 0.1 });
        if (def.stripe) { const a = lerp2(L.hip, L.knee, 0.05), b = lerp2(L.hip, L.knee, 0.9); line(g, a[0] - L.sd * d.thighR * 0.8, a[1], b[0] - L.sd * d.kneeR * 0.8, b[1], def.stripe, 1.2); }
        // feet point at the camera
        if (def.talons) { for (let i = -1; i <= 1; i++) line(g, L.foot[0], L.foot[1], L.foot[0] + i * 4 * k, L.foot[1] + 3 * k, c.foot, 1.6 * k); }
        else { g.fillStyle = litFill(g, L.foot, 0, -1, d.footH * 2, c.foot, false); g.beginPath(); g.ellipse(L.foot[0] + L.sd * 1.5, L.foot[1] + d.footH * 0.2, d.ankleR * 1.5, d.footH * 0.75, 0, 0, PI * 2); g.fill(); }
      }
      // torso, front on
      const wy = hipY - d.torso * 0.4, ww = Math.max(d.hipW * 0.95, d.belly * 0.72);
      g.beginPath();
      g.moveTo(-shx, sY + 1);
      g.quadraticCurveTo(0, sY - 3 * k, shx, sY + 1);
      g.quadraticCurveTo(shx * 1.05, sY + d.torso * 0.3, ww, wy);
      g.quadraticCurveTo(ww * 1.02, hipY - 2, d.hipW * 1.05, hipY + 3 * k);
      g.lineTo(-d.hipW * 1.05, hipY + 3 * k);
      g.quadraticCurveTo(-ww * 1.02, hipY - 2, -ww, wy);
      g.quadraticCurveTo(-shx * 1.05, sY + d.torso * 0.3, -shx, sY + 1);
      g.closePath();
      const tg = g.createLinearGradient(-shx, 0, shx, 0); tg.addColorStop(0, shade(c.torso, -0.4)); tg.addColorStop(0.55, c.torso); tg.addColorStop(0.85, shade(c.torso, 0.12)); tg.addColorStop(1, shade(c.torso, -0.15));
      g.save(); if ((ms.torso) === 'glass') g.globalAlpha = 0.82; g.fillStyle = tg; g.fill(); g.globalAlpha = 1; g.clip();
      if (ms.torso === 'fur' || ms.torso === 'feather') { srand(33); for (let i = 0; i < 60; i++) { const x = (rr() - 0.5) * shx * 2, y = sY + rr() * (hipY - sY); g.strokeStyle = rr() < 0.5 ? 'rgba(0,0,0,0.25)' : 'rgba(255,240,220,0.15)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rr() - 0.5) * 2, y + 3); g.stroke(); } }
      if (Fd.detail) Fd.detail(g, d, G, st);
      const ao = g.createLinearGradient(0, hipY - 6, 0, hipY + 3); ao.addColorStop(0, 'rgba(0,0,0,0)'); ao.addColorStop(1, 'rgba(0,0,0,0.3)'); g.fillStyle = ao; g.fillRect(-shx * 2, hipY - 6, shx * 4, 9);
      g.restore();
      if (Fd.skirt) Fd.skirt(g, d, G, st);
      seg(g, [0, sY + 2], [0, nY], d.shW * 0.36, d.shW * 0.32, c.neck || c.hand, ms.neck || 'skin', { seed: 5 });
      if (Fd.collar) Fd.collar(g, d, G, st);
    }
    // arms
    for (const A of [arms.L, arms.R]) {
      if (Fd.wing) { Fd.wing(g, d, A, st); continue; }
      seg(g, A.el, A.wr, d.elbowR, d.wristR, c.armL || c.armU, ms.armL || ms.armU || 'skin', { seed: 70 + A.sd, bf: 0.2 });
      if (c.cuff) seg(g, lerp2(A.el, A.wr, 0.82), A.wr, d.wristR * 1.2, d.wristR * 1.2, c.cuff, 'cloth', { seed: 72 });
      if (def.sleeve && A.sd > 0) seg(g, lerp2(A.el, A.wr, -0.04), lerp2(A.el, A.wr, 0.93), d.elbowR * 1.1, d.wristR * 1.12, def.sleeve, 'cloth', { seed: 73 });
      seg(g, A.s0, A.el, d.shR, d.elbowR, c.armU, ms.armU || 'skin', { seed: 74 + A.sd, bf: def.bicep != null ? def.bicep : 0.25 });
      const hr = (def.paws ? d.fist * 1.15 : d.fist * 1.05);
      g.fillStyle = litFill(g, A.wr, 0, -1, hr * 2, c.hand, false); g.beginPath(); g.arc(A.wr[0], A.wr[1] + hr * 0.4, hr, 0, PI * 2); g.fill();
      if (def.claws || def.paws) { for (let i = -1; i <= 1; i++) line(g, A.wr[0] + i * hr * 0.5, A.wr[1] + hr * 1.1, A.wr[0] + i * hr * 0.55, A.wr[1] + hr * 1.6, '#e8e0d0', 0.8); }
    }
    if (Fd.front) Fd.front(g, d, G, st);
    // head
    g.save(); g.translate(0, nY); g.rotate(fp.head || 0); g.scale(k * (Fd.headScale || 1), k * (Fd.headScale || 1));
    const hs = Object.assign({}, st, { jaw: fp.jaw || 0 });
    if (Fd.head) Fd.head(g, hs); else { g.scale(1, 1); def.head(g, hs, def); }
    g.restore();
    if (Fd.overHead) Fd.overHead(g, d, G, st);
    g.restore();
    const w = p => [f.x + p[0] * sx, f.y + p[1]];
    return { handL: w(arms.L.wr), handR: w(arms.R.wr), head: w([0, nY - 12 * k]), chest: w([0, sY + d.torso * 0.25]), neck: w([0, nY]), hip: w([0, hipY]) };
  }

  function drawHeadAt(g, f, x, y, rot, sc, st) {
    g.save();
    g.translate(x, y); g.rotate(rot); g.scale(sc * f.d.k, sc * f.d.k);
    f.def.head(g, st || {}, f.def);
    g.restore();
  }

  // ---------- digitizer: turns a vector-drawn fighter into a gritty, dithered "digitized" sprite ----------
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const DW = 380, DH = 340, DAX = 190, DAY = 268;
  let dcv = null, dg = null, DNOISE = null;
  function digi(g, x, y, fn, opt = {}) {
    if (!dcv) {
      dcv = document.createElement('canvas'); dcv.width = DW; dcv.height = DH; dg = dcv.getContext('2d', { willReadFrequently: true });
      DNOISE = new Int8Array(DW * DH); let s = 3; for (let i = 0; i < DNOISE.length; i++) { s = (s * 16807) % 2147483647; DNOISE[i] = ((s / 2147483647) - 0.5) * 30; }
    }
    dg.setTransform(1, 0, 0, 1, 0, 0); dg.clearRect(0, 0, DW, DH);
    dg.setTransform(1, 0, 0, 1, DAX - Math.round(x), DAY - Math.round(y));
    fn(dg);
    dg.setTransform(1, 0, 0, 1, 0, 0);
    const bx0 = opt.box ? Math.max(0, opt.box[0]) : 0, by0 = opt.box ? Math.max(0, opt.box[1]) : 0;
    const bw = opt.box ? Math.min(DW - bx0, opt.box[2]) : DW, bh = opt.box ? Math.min(DH - by0, opt.box[3]) : DH;
    if (bw <= 0 || bh <= 0) return;
    const img = dg.getImageData(bx0, by0, bw, bh), dd = img.data;
    const step = 20, sat = opt.sat != null ? opt.sat : 0.8, con = 1.18, tint = opt.tint;
    for (let yy = 0; yy < bh; yy++) {
      let i = yy * bw * 4;
      const ny = (yy + by0) * DW + bx0;
      for (let xx = 0; xx < bw; xx++, i += 4) {
        const a = dd[i + 3];
        if (a < 110) { dd[i + 3] = 0; continue; }
        dd[i + 3] = 255;
        let r = dd[i], gg = dd[i + 1], b = dd[i + 2];
        const l = 0.3 * r + 0.59 * gg + 0.11 * b;
        r = l + (r - l) * sat; gg = l + (gg - l) * sat; b = l + (b - l) * sat;
        const n = DNOISE[ny + xx] + (BAYER[((yy + by0) & 3) * 4 + ((xx + bx0) & 3)] - 7.5) * (step / 16);
        r = (r - 120) * con + 116 + n; gg = (gg - 120) * con + 114 + n; b = (b - 120) * con + 112 + n;
        dd[i] = Math.round(r / step) * step; dd[i + 1] = Math.round(gg / step) * step; dd[i + 2] = Math.round(b / step) * step;
      }
    }
    for (let yy = 1; yy < bh - 1; yy++) for (let xx = 1; xx < bw - 1; xx++) {
      const i = (yy * bw + xx) * 4;
      if (!dd[i + 3]) continue;
      // a cool rim light on the outline keeps dark fighters readable against dark arenas
      const up = !dd[i + 3 - bw * 4] || (yy > 1 && !dd[i + 3 - bw * 8]), side = !dd[i + 3 - 4] || !dd[i + 3 + 4], down = !dd[i + 3 + bw * 4];
      if (up || side) { const k = up ? 0.55 : 0.4; dd[i] += (190 - dd[i]) * k; dd[i + 1] += (198 - dd[i + 1]) * k; dd[i + 2] += (220 - dd[i + 2]) * k; }
      else if (down) { dd[i] *= 0.5; dd[i + 1] *= 0.5; dd[i + 2] *= 0.5; }
    }
    if (tint) for (let i = 0; i < dd.length; i += 4) if (dd[i + 3]) { dd[i] *= tint[0]; dd[i + 1] *= tint[1]; dd[i + 2] *= tint[2]; }
    dg.putImageData(img, bx0, by0);
    g.drawImage(dcv, Math.round(x) - DAX, Math.round(y) - DAY);
  }
  digi.AX = DAX; digi.AY = DAY; digi.W = DW; digi.H = DH;

  // world position of a joint (for attaching effects)
  function jointWorld(f, p, name) {
    const J = solve(f.d, p);
    let pt = name === 'head' ? add(J.nk, dir(PI - J.p.lean, 9 * f.d.k)) : name === 'handF' ? J.AF.wr : name === 'handB' ? J.AB.wr :
      name === 'neck' ? J.nk : name === 'hip' ? J.hip : name === 'chest' ? lerp2(J.hip, J.sh, 0.7) : name === 'belly' ? lerp2(J.hip, J.sh, 0.35) : name === 'kneeF' ? J.LF.knee : name === 'elbowF' ? J.AF.el : name === 'elbowB' ? J.AB.el : name === 'kneeB' ? J.LB.knee : name === 'handFx' ? add(J.AF.wr, dir(J.AF.a2, f.d.fist * 1.2)) : name === 'handBx' ? add(J.AB.wr, dir(J.AB.a2, f.d.fist * 1.2)) : name === 'toeF' ? add(J.LF.ank, dir(J.LF.sa + PI / 2, f.d.footL * 0.5)) : name === 'footF' ? J.LF.ank : name === 'footB' ? J.LB.ank : J.hip;
    if (J.p.rot) {
      const pv = J.p.piv === 1 ? [0, 0] : J.p.piv === 2 ? lerp2(J.hip, J.sh, 0.4) : J.hip, c = Math.cos(J.p.rot), s = Math.sin(J.p.rot);
      const dx = pt[0] - pv[0], dy = pt[1] - pv[1];
      pt = [pv[0] + dx * c - dy * s, pv[1] + dx * s + dy * c];
    }
    return [f.x + pt[0] * f.face, f.y + pt[1]];
  }

  // ---------- skeleton ----------
  const BONE = '#ece4cc', BONED = '#a89c80';
  function bone(g, A, B, w) {
    line(g, A[0], A[1], B[0], B[1], BONED, w + 1.4);
    line(g, A[0], A[1], B[0], B[1], BONE, w);
    ball(g, A[0], A[1], w * 0.95, BONE); ball(g, B[0], B[1], w * 0.95, BONE);
  }
  function skull(g, x, y, r, rot, type) {
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    const D = '#1a1010', socket = (sx, sy, rx, ry) => { g.fillStyle = D; g.beginPath(); g.ellipse(sx, sy, rx, ry, 0, 0, PI * 2); g.fill(); };
    if (type === 'cardinal' || type === 'turkey') {
      ball(g, 0, -r * 0.15, r * 0.85, BONE);
      const bl = type === 'cardinal' ? 1.35 : 1.2;
      poly(g, [[r * 0.5, -r * 0.55], [r * (0.6 + bl), -r * 0.05], [r * 0.55, r * 0.35]], BONE);
      poly(g, [[r * 0.5, r * 0.35], [r * (0.4 + bl * 0.8), r * 0.05], [r * 0.4, r * 0.6]], '#d8ceb4');
      if (type === 'turkey') poly(g, [[r * (0.5 + bl), -r * 0.1], [r * (0.65 + bl), r * 0.15], [r * (0.45 + bl), r * 0.1]], BONE);
      socket(r * 0.1, -r * 0.2, r * 0.42, r * 0.4);
    } else if (type === 'goose') {
      ball(g, 0, -r * 0.1, r * 0.75, BONE);
      poly(g, [[r * 0.4, -r * 0.45], [r * 2.6, -r * 0.05], [r * 2.7, r * 0.12], [r * 0.5, r * 0.25]], BONE);
      poly(g, [[r * 0.5, r * 0.3], [r * 2.4, r * 0.2], [r * 0.4, r * 0.55]], '#d8ceb4');
      socket(r * 0.15, -r * 0.2, r * 0.38, r * 0.34); socket(r * 1.4, -r * 0.05, r * 0.35, r * 0.07);
    } else if (type === 'hippo') {
      ball(g, -r * 0.3, -r * 0.35, r * 0.85, BONE);
      poly(g, [[-r * 0.4, -r * 0.7], [r * 1.6, -r * 0.75], [r * 2.4, -r * 0.4], [r * 2.4, r * 0.3], [-r * 0.2, r * 0.3]], BONE);
      poly(g, [[-r * 0.3, r * 0.35], [r * 2.3, r * 0.35], [r * 2.4, r * 0.9], [r * 1.2, r * 1.2], [-r * 0.2, r * 0.9]], '#d8ceb4');
      socket(r * 0.2, -r * 0.75, r * 0.35, r * 0.28); socket(r * 2.05, -r * 0.55, r * 0.2, r * 0.12);
      poly(g, [[r * 1.9, r * 0.4], [r * 2.15, r * 0.4], [r * 2.3, -r * 0.6]], '#f4ecd4'); poly(g, [[r * 2.2, r * 0.3], [r * 2.6, r * 0.2], [r * 2.35, r * 0.5]], '#f4ecd4');
      for (let i = 0; i < 5; i++) g.fillRect(r * 0.4 + i * r * 0.3, r * 0.26, r * 0.12, r * 0.18);
    } else if (type === 'cat' || type === 'raccoon') {
      const sn = type === 'cat' ? 0.55 : 1.0;
      ball(g, 0, -r * 0.15, r * 0.95, BONE);
      poly(g, [[r * 0.4, -r * 0.45], [r * (0.9 + sn), -r * 0.2], [r * (1.0 + sn), r * 0.25], [r * 0.4, r * 0.5]], BONE);
      poly(g, [[r * 0.2, r * 0.5], [r * (0.9 + sn), r * 0.35], [r * (0.8 + sn), r * 0.65], [r * 0.1, r * 0.75]], '#d8ceb4');
      socket(r * 0.55, -r * 0.25, r * 0.36, r * 0.38); socket(r * (0.85 + sn), -r * 0.05, r * 0.14, r * 0.12);
      poly(g, [[r * (0.7 + sn * 0.6), r * 0.3], [r * (0.82 + sn * 0.6), r * 0.3], [r * (0.76 + sn * 0.6), r * 0.85]], '#f4ecd4');
    } else if (type === 'muskrat') {
      ball(g, 0, -r * 0.1, r * 0.85, BONE);
      poly(g, [[r * 0.3, -r * 0.5], [r * 1.6, -r * 0.15], [r * 1.7, r * 0.2], [r * 0.3, r * 0.45]], BONE);
      poly(g, [[r * 0.2, r * 0.5], [r * 1.4, r * 0.3], [r * 0.1, r * 0.75]], '#d8ceb4');
      socket(r * 0.45, -r * 0.2, r * 0.28, r * 0.26);
      g.fillStyle = '#d88a18'; g.fillRect(r * 1.5, r * 0.15, r * 0.22, r * 0.6); g.fillRect(r * 1.3, r * 0.35, r * 0.2, r * 0.45);
    } else {
      ball(g, 0, -r * 0.2, r, BONE);
      oval(g, r * 0.35, r * 0.45, r * 0.55, r * 0.4, BONE, 0, false);
      g.fillStyle = D;
      g.beginPath(); g.ellipse(r * 0.42, -r * 0.2, r * 0.26, r * 0.3, 0, 0, PI * 2); g.fill();
      g.beginPath(); g.moveTo(r * 0.75, r * 0.1); g.lineTo(r * 0.9, r * 0.32); g.lineTo(r * 0.66, r * 0.3); g.fill();
      for (let i = 0; i < 4; i++) g.fillRect(r * 0.05 + i * r * 0.2, r * 0.62, r * 0.08, r * 0.22);
      if (type === 'devil') { poly(g, [[-r * 0.2, -r * 0.9], [-r * 0.6, -r * 1.9], [r * 0.2, -r * 1.0]], '#d8ceb4'); poly(g, [[r * 0.35, -r * 1.0], [r * 0.5, -r * 2.0], [r * 0.75, -r * 0.9]], '#d8ceb4'); }
    }
    g.restore();
  }
  function drawSkeleton(g, d, J, def, o) {
    const w = Math.max(1.6, d.k * 2.2);
    const limb = (A, B, C) => { bone(g, A, B, w); bone(g, B, C, w * 0.85); };
    limb(J.AB.s0, J.AB.el, J.AB.wr); limb(J.LB.h, J.LB.knee, J.LB.ank);
    // spine + ribs
    for (let i = 0; i <= 8; i++) { const p = lerp2(J.hip, J.nk, i / 8); ball(g, p[0], p[1], w * 1.05, i % 2 ? BONED : BONE); }
    for (let i = 0; i < 5; i++) {
      const p = lerp2(J.hip, J.sh, 0.45 + i * 0.12), r = d.shW * (0.75 + Math.sin(i * 0.7) * 0.2);
      g.beginPath(); g.ellipse(p[0] + r * 0.35, p[1], r * 0.8, 2.2, 0, 0, PI * 2); g.strokeStyle = BONE; g.lineWidth = w * 0.7; g.stroke();
    }
    oval(g, J.hip[0], J.hip[1] + 2, d.hipW * 0.9, 5 * d.k, BONE);
    limb(J.LF.h, J.LF.knee, J.LF.ank); limb(J.AF.s0, J.AF.el, J.AF.wr);
    if (def.bodyDraw) { for (let i = 0; i <= 8; i++) { const p = lerp2(J.sh, J.nk, i / 8); ball(g, p[0], p[1], w * 0.9, i % 2 ? BONED : BONE); } }
    if (!o.noHead) skull(g, J.nk[0] + 2 * d.k, J.nk[1] - 8 * d.k * (def.skull === 'goose' ? 0.6 : 1), 8.5 * d.k * (def.skullK || 1), J.p.lean, def.skull);
    if (o.gore) {
      for (let i = 0; i < 7; i++) { const p = lerp2(J.hip, J.sh, (i * 0.37) % 1); g.fillStyle = i % 2 ? '#8a0010' : '#b0101a'; g.fillRect(p[0] - 3 + (i * 5) % 7, p[1], 3, 2 + i % 3); }
    }
  }

  return { P, track, lerp, resolve, solve, draw, drawFront, drawHeadAt, jointWorld, digi, seg, segPath, litFill, srand, rr, shade, ball, oval, poly, line, cap, capPath, sphFill, bone, skull, BONE, PI, dir, add, lerp2 };
})();
