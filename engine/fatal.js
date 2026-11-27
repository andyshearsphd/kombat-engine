// Kombat Engine: the fatality player. Scripted timelines for fatalities, stage fatalities and boss deaths.
// A game adds its scripts with FATAL.add(kit => ({ id: (s, A, V, api) => { ... } }), { noCenter: [ids] }).
'use strict';
const FATAL = (() => {
  const R = RIG, P = RIG.P, PI = Math.PI;
  const { rnd, lerp, pick, ease } = RIG.M;

  function walkTo(f, x, dt, api, sp = 95) {
    const dx = x - f.x;
    if (Math.abs(dx) < 1.5) { f.scriptPose = api.PS.stance(f.t); return true; }
    const s = Math.sign(dx);
    f.x += s * Math.min(Math.abs(dx), sp * dt);
    f.wph = (f.wph || 0) + dt * 9 * s * f.face;
    f.scriptPose = api.PS.walk(f.wph);
    return false;
  }
  const J = (f, name) => R.jointWorld(f, f.pose, name);
  function prop(o) { FX.props.push(o); return o; }
  function center(A, V, api) {
    const mid = (A.x + V.x) / 2, sh = api.AW / 2 - mid;
    A.x += sh; V.x += sh;
    api.setCam(api.AW / 2 - api.W / 2);
    api.flash();
  }
  function headGib(V, x, y, o = {}) {
    return FX.gib('head', x, y, o.vx || 0, o.vy || 0, Object.assign({ trail: true, draw: (g) => R.drawHeadAt(g, { def: V.def, d: V.d }, 0, 8 * V.d.k, 0, 1, { dead: true, t: 0 }) }, o));
  }

  function skullGib(V, x, y, vx, vy) {
    return FX.gib('skull', x, y, vx, vy, { s: 1, vr: 8, trail: true, draw: (g) => R.skull(g, 0, 0, 7.5 * V.d.k * (V.def.skullK || 1), 0, V.def.skull) });
  }
  const S = {}, NOCENTER = new Set();
  function start(id, A, V, api) {
    const s = { t: 0, done: false, ev: [], tick: null };
    s.at = (time, fn) => s.ev.push({ time, fn });
    s.update = dt => {
      s.t += dt; A.t += dt; V.t += dt;
      for (const e of s.ev) if (!e.f && s.t >= e.time) { e.f = 1; e.fn(); }
      if (s.tick) s.tick(s.t, dt);
    };
    if (!NOCENTER.has(id)) center(A, V, api);
    if (Math.abs(V.x - A.x) > 1) A.face = Math.sign(V.x - A.x);
    V.face = -A.face;
    A.scriptPose = api.PS.stance(A.t); V.scriptPose = api.PS.dizzy(V.t);
    A.ro = {}; V.ro = {};
    (S[id] || S.generic)(s, A, V, api);
    return s;
  }

  S.generic = (s, A, V, api) => { s.at(0.1, () => { V.scriptPose = api.PS.down(V); }); s.at(1.5, () => { s.done = true; }); };

  const kit = { R, P, PI, rnd, lerp, pick, ease, walkTo, J, prop, center, headGib, skullGib };
  function add(make, o = {}) { Object.assign(S, make(kit)); for (const id of o.noCenter || []) NOCENTER.add(id); }
  const has = id => !!S[id];
  return { start, add, has, kit };
})();
