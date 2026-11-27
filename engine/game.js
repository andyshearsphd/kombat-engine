// Kombat Engine: combat, AI, screens, HUD and touch controls.
// The game supplies ROSTER (fighterkit.js), STAGES.define() (stagekit.js), FATAL.add() (fatal.js) and a GAME config object.
'use strict';
(() => {
  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d');
  const H = 240;
  let W = 480;
  const AW = STAGES.AW, FLOOR = STAGES.FLOOR, GRAV = 2300;
  const R = RIG, P = RIG.P, PI = Math.PI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
  const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  FX.setFloor(FLOOR);
  const AUTO = /auto/.test(location.search);
  const G = Object.assign({ voiceClips: null, title: 'KOMBAT', subtitle: '', ladderGoal: '', endingLine: '', mascot: null, toasty: null, winPoses: null, projectiles: {}, ladder: {}, tunes: null, menuTune: null }, window.GAME || {});
  // announcer calls (1.1): any of these can be replaced by the game
  const CALL = Object.assign({ fight: 'FIGHT!', round: 'ROUND', finish: null, fatality: 'FATALITY', flawless: 'FLAWLESS VICTORY', wins: 'WINS', next: 'NEXT FIGHTER', mirror: 'MIRROR MATCH', endurance: 'ENDURANCE' }, G.calls || {});
  const spoken = s => s.replace(/[!.]/g, '').toLowerCase();
  if (G.voice) SFX.voice(G.voice);
  if (G.voiceClips) SFX.setClips(G.voiceClips);
  if (G.muteKey) SFX.setKey(G.muteKey);
  if (G.tunes || G.menuTune) SFX.setTunes(G.tunes, G.menuTune);
  const mascotDef = () => G.mascot && ROSTER.ALL[G.mascot];

  // ---------- poses ----------
  const STANCE = P({ hy: 8, lean: 0.12, head: 0.05, aF: [1.0, 1.55], aB: [0.25, 2.45], fF: [17, 0], fB: [-17, 0] });
  const PS = {
    stance: t => P({ hy: 8 + Math.sin(t * 4.5) * 1.6, lean: 0.12 + Math.sin(t * 4.5) * 0.02, head: 0.05, aF: [1.0 + Math.sin(t * 4.5) * 0.05, 1.55], aB: [0.25, 2.45], fF: [17, 0], fB: [-17, 0] }),
    walk: ph => P({ hy: 8 - Math.abs(Math.sin(ph)) * 1.5, lean: 0.14, head: 0.05, aF: [1.0, 1.55], aB: [0.25, 2.45],
      fF: [13 + Math.sin(ph) * 7, -Math.max(0, Math.cos(ph)) * 5], fB: [-13 - Math.sin(ph) * 7, -Math.max(0, -Math.cos(ph)) * 5] }),
    run: ph => P({ hy: 1 - Math.abs(Math.sin(ph)) * 3, lean: 0.35, aF: [0.9 - Math.sin(ph) * 0.8, 1.6], aB: [0.9 + Math.sin(ph) * 0.8, 1.6],
      fF: [8 + Math.sin(ph) * 16, -Math.max(0, Math.cos(ph)) * 10], fB: [8 - Math.sin(ph) * 16, -Math.max(0, -Math.cos(ph)) * 10] }),
    crouch: P({ hyL: 0.4, lean: 0.3, aF: [1.0, 1.7], aB: [0.7, 1.9], fF: [15, 0], fB: [-13, 0] }),
    block: P({ hy: 4, lean: 0.0, head: -0.2, aF: [1.25, 2.3], aB: [1.15, 2.45], fF: [12, 0], fB: [-14, 0] }),
    cblock: P({ hyL: 0.4, lean: 0.2, aF: [1.35, 2.3], aB: [1.25, 2.4], fF: [15, 0], fB: [-13, 0] }),
    jump: P({ hy: -2, lean: 0.1, aF: [1.2, 1.6], aB: [0.9, 1.8], lF: [1.5, 2.4], lB: [0.9, 2.3] }),
    jab: P({ hy: 7, lean: 0.35, head: 0.1, aF: [1.6, 0.0], aB: [-0.35, 2.45], fF: [21, 0], fB: [-14, 0] }),
    jab2: P({ hy: 9, lean: 0.5, head: 0.1, aF: [-0.35, 2.4], aB: [1.6, 0.0], fF: [24, 0], fB: [-17, 0] }),
    up0: P({ hyL: 0.44, lean: 0.5, aF: [0.15, 0.5], aB: [0.9, 1.9], fF: [16, 0], fB: [-12, 0] }),
    up1: P({ hy: -7, lean: -0.15, head: -0.2, aF: [2.7, 0.02], aB: [0.4, 1.7], fF: [10, -5], fB: [-13, 0] }),
    up2: P({ hy: -5, lean: -0.25, head: -0.3, aF: [3.1, 0.02], aB: [0.4, 1.7], fF: [9, -3], fB: [-13, 0] }),
    kick0: P({ hy: 2, lean: -0.45, aF: [0.9, 1.9], aB: [0.3, 2.4], lF: [1.95, 2.8], fB: [-5, 0] }),
    kick1: P({ hy: 2, lean: -1.0, head: 0.6, aF: [1.0, 1.7], aB: [-0.6, 1.1], lF: [2.05, 0.0], fB: [-4, 0] }),
    sw0: P({ hyL: 0.5, lean: 0.55, aF: [0.1, 0.1], aB: [-0.1, 0.2], fF: [10, 0], fB: [-12, 0] }),
    sw1: P({ hyL: 0.55, lean: 0.6, aF: [0.1, 0.05], aB: [-0.05, 0.15], lF: [1.5, 0.0], fB: [-10, 0] }),
    round: P({ hy: 0, lean: -1.05, head: 0.6, aF: [1.0, 1.6], aB: [-0.5, 1.2], lF: [2.3, 0.0], fB: [-3, 0] }),
    jkick: P({ hy: -2, lean: -0.8, head: 0.5, aF: [1.0, 1.8], aB: [-0.4, 1.3], lF: [2.0, 0.0], lB: [0.9, 2.6] }),
    jpunch: P({ hy: -2, lean: 0.35, aF: [1.25, 0.0], aB: [0.8, 1.9], lF: [1.3, 2.3], lB: [0.7, 2.2] }),
    grab: P({ hy: 10, lean: 0.6, aF: [1.25, 1.1], aB: [1.15, 1.2], fF: [18, 0], fB: [-14, 0] }),
    lift: P({ hy: 6, lean: -0.3, aF: [1.9, 0.9], aB: [1.8, 1.0], fF: [14, 0], fB: [-12, 0] }),
    toss: P({ hy: 24, lean: -1.45, head: -0.7, aF: [3.1, 0.2], aB: [3.0, 0.3], fF: [16, 0], fB: [-4, 0] }),
    proj0: P({ hy: 4, lean: -0.1, aF: [0.4, 1.2], aB: [0.3, 1.3], fF: [12, 0], fB: [-14, 0] }),
    proj1: P({ hy: 4, lean: 0.35, aF: [1.62, 0.05], aB: [1.5, 0.1], fF: [18, 0], fB: [-14, 0] }),
    hitHigh: P({ hy: 5, lean: -0.5, head: -0.8, aF: [0.9, 1.4], aB: [0.5, 1.6], fF: [11, 0], fB: [-17, 0] }),
    hitLow: P({ hy: 10, lean: 0.75, head: 0.5, aF: [0.6, 1.5], aB: [0.4, 1.7], fF: [12, 0], fB: [-12, 0] }),
    rush: ph => P({ hy: 6, lean: 0.75, head: 0.6, aF: [0.5, 0.4], aB: [0.3, 0.5], fF: [10 + Math.sin(ph) * 14, -Math.max(0, Math.cos(ph)) * 8], fB: [10 - Math.sin(ph) * 14, -Math.max(0, -Math.cos(ph)) * 8] }),
    slide: P({ hyL: 0.72, lean: -0.95, aF: [0.9, 0.3], aB: [0.6, 0.3], lF: [1.55, 0.05], lB: [1.1, 1.4] }),
    dive: P({ lean: 0.6, aF: [1.2, 2.5], aB: [1.6, 0.2], lF: [1.0, 1.6], lB: [0.6, 1.8] }),
    tuck: P({ lean: 0.9, aF: [1.5, 2.4], aB: [1.3, 2.4], lF: [1.7, 2.6], lB: [1.5, 2.6] }),
    win: t => P({ hy: 2 + Math.sin(t * 6) * 1.5, lean: -0.1, aF: [3.0 + Math.sin(t * 6) * 0.1, 0.1], aB: [0.6, 1.9], fF: [11, 0], fB: [-11, 0] }),
    dizzy: t => P({ hy: 6, lean: -0.05 + Math.sin(t * 2.2) * 0.12, head: Math.sin(t * 2.7) * 0.45, aF: [0.25, 0.5], aB: [0.15, 0.6], fF: [9 + Math.sin(t * 2.2) * 3, 0], fB: [-9, 0] }),
    air: (rot, t = 0) => P({ lean: -0.15, head: -0.35, aF: [2.1 + Math.sin(t * 9) * 0.12, 0.5], aB: [1.8, 0.7], lF: [0.8, 0.7], lB: [0.25, 0.5], rot, piv: 2 }),
  };
  Object.assign(PS, {
    wadLift: P({ hy: 10, lean: 0.2, aF: [2.2, 0.8], aB: [2.1, 0.9], fF: [15, 0], fB: [-14, 0] }),
    wadUp: P({ hy: 2, lean: -0.2, head: -0.3, aF: [3.05, 0.25], aB: [2.95, 0.3], fF: [13, 0], fB: [-13, 0] }),
    wadThrow: P({ hy: 6, lean: 0.65, head: 0.3, aF: [1.75, 0.05], aB: [1.6, 0.1], fF: [21, 0], fB: [-15, 0] }),
    wad: P({ lean: 1.0, head: 0.8, aF: [1.6, 2.6], aB: [1.4, 2.6], lF: [2.0, 2.8], lB: [1.8, 2.8], hyA: 18, piv: 2 }),
    limbo: P({ hyL: 0.55, lean: -1.25, head: -0.5, aF: [-0.7, 0.4], aB: [-0.9, 0.3], fF: [20, 0], fB: [-6, 0] }),
    hangA: P({ hy: -2, lean: 0.35, aF: [1.3, 0.02], aB: [0.6, 2.2], lF: [1.3, 2.3], lB: [0.7, 2.2] }),
    hangB: P({ hy: -2, lean: 0.4, aF: [0.6, 2.2], aB: [1.3, 0.02], lF: [1.0, 2.2], lB: [0.9, 2.3] }),
    hammer: P({ hy: -2, lean: 0.75, head: 0.4, aF: [1.1, 0.1], aB: [1.0, 0.2], lF: [1.3, 2.3], lB: [0.7, 2.2] }),
    flykick: P({ hy: -2, lean: -0.7, head: 0.5, aF: [1.1, 1.7], aB: [-0.5, 1.2], lF: [1.95, 0.0], lB: [0.6, 2.5] }),
    blow: P({ hy: 5, lean: 0.35, head: 0.35, jaw: 0.3, aF: [1.35, 0.25], aB: [0.3, 1.9], fF: [17, 0], fB: [-14, 0] }),
    chopUp: P({ hy: 6, lean: 0.15, head: 0.1, aF: [2.7, 1.2], aB: [1.1, 1.9], fF: [17, 0], fB: [-14, 0] }),
    chopDn: P({ hy: 8, lean: 0.4, head: 0.15, aF: [1.45, 0.05], aB: [1.3, 2.2], fF: [19, 0], fB: [-14, 0] }),
    chopUp2: P({ hy: 6, lean: 0.15, head: 0.1, aF: [1.1, 1.9], aB: [2.7, 1.2], fF: [17, 0], fB: [-14, 0] }),
    chopDn2: P({ hy: 8, lean: 0.4, head: 0.15, aF: [1.3, 2.2], aB: [1.45, 0.05], fF: [19, 0], fB: [-14, 0] }),
    sneak: P({ hyL: 0.3, lean: 0.55, head: 0.3, aF: [0.9, 1.9], aB: [1.6, 2.2], fF: [14, 0], fB: [-15, 0] }),
    blind: t => P({ hy: 7, lean: 0.35 + Math.sin(t * 5) * 0.1, head: 0.45, aF: [2.35 + Math.sin(t * 17) * 0.1, 2.65], aB: [2.2, 2.7], fF: [9 + Math.sin(t * 3) * 4, 0], fB: [-12, 0] }),
    mirror: t => P({ hy: 4, lean: -0.1, head: -0.15, aF: [2.85 + Math.sin(t * 7) * 0.15, 2.5], aB: [1.7, 2.45], fF: [12, 0], fB: [-12, 0] }),
    // 1.1: weapon swing wind-up and strike, rising uppercut, parry, command grab holds
    windup: P({ hy: 6, lean: -0.25, head: -0.1, aF: [3.4, 0.9], aB: [2.9, 1.2], fF: [15, 0], fB: [-16, 0] }),
    strike: P({ hy: 10, lean: 0.55, head: 0.25, aF: [1.25, 0.1], aB: [1.05, 0.5], fF: [22, 0], fB: [-15, 0] }),
    riseUp: P({ hy: -6, lean: -0.2, head: -0.35, aF: [3.05, 0.05], aB: [0.5, 1.8], lF: [1.3, 2.2], lB: [0.3, 0.5] }),
    parry: P({ hy: 6, lean: 0.25, head: 0.0, aF: [1.6, 0.35], aB: [1.4, 0.6], fF: [16, 0], fB: [-15, 0] }),
    loom: P({ hy: 2, lean: 0.95, head: 0.5, aF: [1.45, 0.6], aB: [1.35, 0.7], fF: [20, 0], fB: [-16, 0] }),
    liftUp: P({ hy: 4, lean: -0.15, head: -0.25, aF: [2.6, 0.6], aB: [2.5, 0.7], fF: [13, 0], fB: [-13, 0] }),
    heldUp: t => P({ hy: 2, lean: -0.2 + Math.sin(t * 30) * 0.12, head: -0.5 + Math.sin(t * 34) * 0.3, aF: [0.5, 0.6], aB: [0.3, 0.7], fF: [6, -6], fB: [-6, -8] }),
  });
  PS.down = f => { const L = f.d.thigh + f.d.shin; return P({ rot: -PI / 2, hyA: L * 0.96 - f.d.back * 0.75, aF: [0.9, 0.4], aB: [0.6, 0.3], lF: [0.15, 0.1], lB: [-0.05, 0.15], head: 0.2 }); };
  PS.downFace = f => { const L = f.d.thigh + f.d.shin; return P({ rot: PI / 2, hyA: L * 0.96 - f.d.belly * 0.75, aF: [2.6, 0.2], aB: [2.4, 0.3], lF: [0.1, 0.4], lB: [-0.1, 0.5], head: -0.3 }); };
  const K = (...a) => a;

  // ---------- moves ----------
  // t: [startup, active, recovery]; box: [x0, x1, y0, y1] px ahead of / above the root (scaled by size)
  const MV = {
    jab: { t: [0.045, 0.06, 0.1], dmg: 5, limb: 'handFx', rad: 5, lunge: 110, fx: 'stun', stun: 0.19, push: 170, snd: 'punch', keys: K([0, STANCE], [0.045, PS.jab], [0.105, PS.jab], [0.2, STANCE]) },
    jab2: { t: [0.045, 0.06, 0.1], dmg: 5, limb: 'handBx', rad: 5, lunge: 110, fx: 'stun', stun: 0.19, push: 170, snd: 'punch', keys: K([0, STANCE], [0.045, PS.jab2], [0.105, PS.jab2], [0.2, STANCE]) },
    upper: { t: [0.08, 0.1, 0.3], dmg: 14, limb: 'handFx', rad: 10, lunge: 150, fx: 'launch', vy: -800, vx: 190, spin: 1, snd: 'big', upper: 1, keys: K([0, PS.crouch], [0.06, PS.up0], [0.12, PS.up1], [0.2, PS.up2], [0.48, STANCE]) },
    kick: { t: [0.08, 0.07, 0.16], dmg: 8, limb: 'toeF', rad: 6, lunge: 90, fx: 'stun', stun: 0.3, push: 230, snd: 'kick', keys: K([0, STANCE], [0.05, PS.kick0], [0.09, PS.kick1], [0.16, PS.kick1], [0.31, STANCE]) },
    sweep: { t: [0.09, 0.09, 0.24], dmg: 7, limb: 'toeF', rad: 7, lunge: 60, fx: 'trip', low: 1, snd: 'kick', crouchEnd: 1, keys: K([0, PS.crouch], [0.06, PS.sw0], [0.11, PS.sw1], [0.19, PS.sw1], [0.42, PS.crouch]) },
    round: { t: [0.13, 0.09, 0.26], dmg: 11, limb: 'toeF', rad: 7, lunge: 70, fx: 'knock', vy: -480, vx: 280, spin: 0, snd: 'kick', keys: K([0, STANCE], [0.08, PS.kick0], [0.15, PS.round], [0.23, PS.round], [0.48, STANCE]) },
    jkick: { air: 1, t: [0.04, 0.6, 0], dmg: 10, limb: 'toeF', rad: 7, fx: 'knock', vy: -380, vx: 260, spin: 0, snd: 'kick', pose: PS.jkick },
    jpunch: { air: 1, t: [0.04, 0.4, 0], dmg: 8, limb: 'handFx', rad: 6, fx: 'stun', stun: 0.3, push: 140, snd: 'punch', pose: PS.jpunch },
    grab: { t: [0.07, 0.04, 0.55], grab: 1, keys: K([0, STANCE], [0.08, PS.grab], [0.2, PS.grab], [0.32, PS.lift], [0.5, PS.toss], [0.62, PS.toss], [0.8, STANCE]) },
    wad: { t: [0.07, 0.04, 0.62], grab: 1, wad: 1, keys: K([0, STANCE], [0.08, PS.grab], [0.2, PS.wadLift], [0.36, PS.wadUp], [0.46, PS.wadUp], [0.52, PS.wadThrow], [0.68, PS.wadThrow], [0.85, STANCE]) },
    bdodge: { t: [0.02, 0.62, 0.14], kind: 'bdodge' },
    wallrun: { t: [0.0, 0.5, 0.0], kind: 'wallrun' },
    // 1.3: Matrix moves every fighter has (unless def.noMatrix)
    brawl: { t: [0.14, 0.78, 0.26], kind: 'brawl', dmg: 2.2, box: [0, 46, 36, 112], fx: 'stun', stun: 0.26, push: 24, nocap: 1, snd: 'punch' },
    phase: { t: [0.03, 0.26, 0.18], kind: 'phase' },
    kipup: { t: [0.14, 0.2, 0.24], kind: 'kipup', dmg: 7, box: [-34, 52, 0, 30], fx: 'trip', low: 1, snd: 'kick' },
    taunt: { t: [0, 1.1, 0], kind: 'taunt' },
    hang: { air: 1, hang: 1, t: [0.02, 0.85, 0], dmg: 1.6, limb: 'handFx', rad: 8, fx: 'stun', stun: 0.32, push: 20, snd: 'punch', nocap: 1, pose: PS.hangA },
    hammer: { air: 1, t: [0.02, 0.35, 0], dmg: 9, limb: 'handFx', rad: 9, fx: 'knock', vy: -260, vx: 240, spin: 0, snd: 'big', nocap: 1, pose: PS.hammer },
    mkick: { air: 1, t: [0.0, 0.9, 0], dmg: 13, limb: 'toeF', rad: 9, fx: 'launch', vy: -620, vx: 230, spin: 1, snd: 'big', pose: PS.flykick },
    proj: { t: [0.2, 0.02, 0.24], spawn: 1, keys: K([0, STANCE], [0.13, PS.proj0], [0.2, PS.proj1], [0.36, PS.proj1], [0.46, STANCE]) },
  };
  const SP2 = {
    rush: { t: [0.1, 0.43, 0.2], dmg: 12, box: [0, 38, 20, 96], fx: 'knock', vy: -460, vx: 320, spin: 0, speed: 330, snd: 'big' },
    roll: { t: [0.1, 0.45, 0.2], dmg: 11, box: [-10, 30, 0, 44], fx: 'knock', vy: -500, vx: 260, spin: 0, speed: 340, snd: 'big' },
    slide: { t: [0.1, 0.4, 0.25], dmg: 9, box: [0, 54, 0, 24], fx: 'trip', low: 1, speed: 360, snd: 'kick' },
    leap: { t: [0.08, 0.9, 0.16], dmg: 13, box: [-6, 40, 0, 70], fx: 'knock', vy: -420, vx: 280, spin: 0, snd: 'big' },
    cloud: { t: [0.2, 0.3, 0.3], dmg: 5, box: [14, 74, 36, 104], fx: 'daze', snd: 'splat' },
    blow: { t: [0.18, 0.22, 0.34], dmg: 4, box: [8, 66, 58, 125], fx: 'blind', snd: 'whoosh' },
    flurry: { t: [0.08, 0.72, 0.26], dmg: 2.4, box: [0, 46, 36, 112], fx: 'stun', stun: 0.24, push: 40, nocap: 1, snd: 'punch' },
    sneak: { t: [0.5, 0.16, 0.32], dmg: 11, box: [-4, 46, 20, 110], fx: 'knock', vy: -380, vx: 260, spin: 0, steal: 1, snd: 'big' },
    burrow: { t: [0.6, 0.2, 0.3], dmg: 12, box: [-16, 32, 0, 120], fx: 'launch', vy: -850, vx: 140, spin: 1, snd: 'big' },
    playdead: { t: [0.8, 0.18, 0.3], dmg: 12, box: [0, 50, 20, 100], fx: 'knock', vy: -420, vx: 260, spin: 0, snd: 'big' },
    // 1.1
    swing: { t: [0.17, 0.1, 0.3], dmg: 13, box: [0, 64, 30, 120], fx: 'knock', vy: -420, vx: 300, spin: 0, snd: 'big', weapon: 1 },
    rise: { t: [0.05, 0.3, 0.32], dmg: 13, box: [-6, 42, 40, 150], fx: 'launch', vy: -820, vx: 170, spin: 1, snd: 'big' },
    parry: { t: [0.03, 0.55, 0.22], parry: 1 },
    cgrab: { t: [0.1, 0.07, 0.42], cgrab: 1, range: 46, hold: 'drain', dmg: 12 },
  };
  // where the CPU likes to use each kind of special: [min, max] distance
  const AI_RANGE = { proj: [110, 999], rush: [60, 320], roll: [60, 300], slide: [60, 300], leap: [80, 320], cloud: [0, 110], blow: [0, 120], flurry: [0, 80], sneak: [0, 999], burrow: [0, 999], playdead: [40, 200], swing: [0, 95], rise: [0, 70], parry: [0, 0], cgrab: [0, 60] };
  // a hit that lands while the defender's parry is up: the attacker eats it instead
  const PARRY_HIT = { dmg: 9, fx: 'knock', vy: -360, vx: 280, spin: 0, snd: 'clang' };

  // ---------- state ----------
  let screen = 'title', paused = false, mode = 'ladder';
  const game = { phase: 'intro', pt: 0, round: 1, timer: 99, time: 0, freeze: 0, shake: 0, flash: 0, banners: [], bubbles: [], toasty: 0, scene: null, script: null };
  const ladder = { pick: 0, opps: [], rung: 0, stages: [] };
  let p1 = null, p2 = null, projs = [], stage = null, cam = 0, zoom = 1, camDY = 0;
  const sel = { i: 0, o: 0, s: 0 };
  let ui = [];

  // chair fighters (1.1) sit: their hip rides at seat height, so they stand shorter and wider
  const seatH = d => d.shin + d.footH * 0.9 + 2 * d.k;
  function hurtH(f) { return (f.def.chair ? seatH(f.d) : (f.d.thigh + f.d.shin) * 0.96) + f.d.torso + f.d.neck + 16 * f.d.k; }
  function halfW(f) { return Math.max(f.d.belly, f.d.back, f.d.hipW, f.def.chair ? f.d.thigh * 0.7 : 0) * 0.85; }
  // a seated version of any pose: the legs stay bent at the seat, the upper body still moves
  function chairPose(f, p) {
    const d = f.d, L = d.thigh + d.shin;
    const q = Object.assign({}, p, { lF: [1.5, 1.5], lB: [1.42, 1.42] });
    if (!p.rot) { q.hy = 0; q.hyL = 0; q.hyA = L * 0.96 - seatH(d) + (p.hy || 0) * 0.25 * d.k; }
    // 1.1.2: a seated body can't fold all the way over (standing throw and toss poses lean far forward)
    if (!p.rot && p.lean != null) q.lean = Math.max(-0.5, Math.min(0.42, p.lean));
    return q;
  }
  function newFighter(def, side) {
    return { def, d: def.dk, side, x: 0, y: FLOOR, vx: 0, vy: 0, face: 1, hp: 100, state: 'idle', st: 0, t: 0, wins: 0, move: null, mt: 0, hitDone: false,
      pose: R.resolve(def.dk, STANCE), target: STANCE, ro: {}, st2: {}, juggle: 0, airAtk: null, spin: 0, wph: 0, hist: [], tok: 'N', bufP: -9, bufK: -9,
      cpu: side ? { t: 0.5, walk: 0, lvl: 0.3, blockT: 0, fatalT: 0 } : null, dmgTaken: 0, dead: false, finishing: false, sink: 0, hidden: false, jabAlt: 0, projOut: 0 };
  }

  // ---------- combat helpers ----------
  const grounded = f => f.y >= FLOOR - 0.5 && !['jump', 'air'].includes(f.state) && !(f.state === 'attack' && f.move && f.move.airborne);
  const actionable = f => ['idle', 'walk', 'crouch', 'block', 'cblock'].includes(f.state);
  const dodging = f => f.state === 'attack' && f.move && (f.move.kind === 'bdodge' && f.mt < 0.64 || f.move.kind === 'wallrun' || f.move.kind === 'phase' && f.mt < 0.3 || f.move.kind === 'kipup' && f.mt < 0.14 || f.move.kind === 'sneak' && f.mt < 0.46);
  const invuln = f => (f.finishing && game.phase === 'finishwait') || dodging(f) || ['down', 'getup'].includes(f.state) || f.hidden || f.state === 'held' || (f.state === 'attack' && f.move && f.move.kind === 'burrow' && f.mt < 0.6) || (f.state === 'attack' && f.move && f.move.kind === 'playdead' && f.mt < 0.8) || (f.state === 'attack' && f.move && f.move.kind === 'rise' && f.mt < f.move.t[0] + 0.08);
  const parrying = f => f.state === 'attack' && f.move && f.move.parry && f.mt >= f.move.t[0] && f.mt < f.move.t[0] + f.move.t[1];
  function hurtbox(f) {
    const hh = hurtH(f), hw = halfW(f);
    let top = hh;
    if (f.state === 'crouch' || f.state === 'cblock' || (f.state === 'attack' && f.move && (f.move === MV.sweep || f.move.kind === 'roll' || f.move.kind === 'slide'))) top = hh * 0.62;
    if (f.state === 'air') return { x0: f.x - hw * 1.3, x1: f.x + hw * 1.3, y0: f.y - hh * 0.75, y1: f.y + 4 };
    return { x0: f.x - hw, x1: f.x + hw, y0: f.y - top, y1: f.y };
  }
  function atkbox(f, b) {
    const k = f.d.k;
    const xa = f.x + b[0] * k * f.face, xb = f.x + b[1] * k * f.face;
    return { x0: Math.min(xa, xb), x1: Math.max(xa, xb), y0: f.y - b[3] * k, y1: f.y - b[2] * k };
  }
  const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  function bleed(v, x, y, n, dir, power) {
    if (v.def.glass) { for (let i = 0; i < n / 2; i++) FX.gib('shard', x, y, rnd(-120, 120) + dir * 80, rnd(-260, -60)); FX.puff(x, y, 'rgba(120,170,60,0.7)', n / 2, 2); return; }
    FX.blood(x, y, n, dir, power);
    if (v.def.feathers) { const fc = v.def.feathers; for (let i = 0; i < 3; i++) FX.gib('feather', x, y, rnd(-60, 60), rnd(-160, -40), { grav: 120, vr: rnd(-4, 4), draw: (g) => { R.oval(g, 0, 0, 4, 1.4, fc, 0, true); R.line(g, -4, 0, 4, 0, '#2a1a14', 0.5); } }); }
  }

  // extra gore on every connecting hit: wounds that stay on the body, teeth, chunks
  function gore(v, x, y, dir, dmg, mv) {
    if (v.def.glass) return;
    const hh = hurtH(v), rel = (v.y - y) / hh;
    const j = rel > 0.8 ? 'head' : rel > 0.55 ? 'chest' : rel > 0.35 ? 'belly' : 'leg';
    const w = v.st2.wounds || (v.st2.wounds = []);
    if (w.length < 18) w.push({ j: j === 'leg' ? 'knee' : j, dx: rnd(-4, 8), dy: rnd(-5, 5), r: rnd(1.4, 2.6) + dmg * 0.08, a: rnd(0, 3), drip: rnd(2, 7) });
    if (j === 'head' && Math.random() < 0.5) for (let i = 0; i < 1 + (dmg > 9 ? 2 : 0); i++) FX.gib('tooth', x, y, dir * rnd(60, 200), rnd(-260, -120));
    if (dmg >= 9) { for (let i = 0; i < (mv.upper ? 4 : 2); i++) FX.gib('chunk', x, y, dir * rnd(40, 220), rnd(-360, -120)); }
    if (mv.upper || dmg >= 12) FX.blood(x, y, 30, dir, 2.2, 0.6);
    if (Math.random() < 0.08 * dmg / 5) FX.drops(1 + (mv.upper ? 2 : 0));
  }
  function comboCheck(f) {
    const v = f.comboOn;
    if (!v || f.comboN < 2) return;
    if (['hit', 'air', 'held'].includes(v.state)) return;
    const n = f.comboN; f.comboN = 0; f.comboOn = null;
    if (n < 3) return;
    const CD = G.comboDamage, heal = Math.min(100 - f.hp, n * 2, CD && CD.healCap != null ? CD.healCap : 1e9);
    if (f.hp > 0 && game.phase === 'fight') f.hp += heal;
    banner(n + ' HIT COMBO', { size: 17, fill: 'gold', life: 1.4, y: 52, x: f === p1 ? W * 0.27 : W * 0.73 });
    if (heal > 0.5) banner('+' + Math.round(heal) + ' HEALTH', { size: 10, fill: 'green', life: 1.4, y: 70, x: f === p1 ? W * 0.27 : W * 0.73 });
    SFX.select();
  }
  function startMove(f, mv) {
    f.state = 'attack'; f.move = mv; f.mt = 0; f.hitDone = false; f.claws = 0; f.snapPose = true;
    if (!mv.spawn && !mv.grab) SFX.whoosh();
  }
  // any special slot (1.1): 'proj' throws the slot's projectile, every other kind is a move from SP2
  function startSpecial(f, sp) {
    f.curSp = sp;
    if (sp.kind === 'proj') { startMove(f, MV.proj); return; }
    const kind = sp.kind, mv = Object.assign({ kind, name: sp.name }, SP2[kind] || SP2.rush, sp.mod || {});
    startMove(f, mv);
    if (kind === 'cloud') SFX.splat();
    if (kind === 'playdead') SFX.thud();
    if (mv.sfx && SFX[mv.sfx]) SFX[mv.sfx]();
  }
  const projSlot = f => f.def.specials.find(s => s.kind === 'proj');
  function startWallrun(f) {
    startMove(f, MV.wallrun);
    const [lo, hi] = limits(), behind = f.face > 0 ? f.x - lo : hi - f.x;
    f.wallX = f.x - f.face * clamp(behind, 10, 80); f.wallFace = f.face; f.face = -f.face; f.matrix = 1.2; f.wx0 = f.x;
  }
  function doJump(f, dirx) {
    f.hangUsed = false; f.jumpAt = game.time;
    f.state = 'jump'; f.vy = -660; f.vx = dirx * 165 * f.def.stats.speed; f.airAtk = null; f.at = 0; SFX.whoosh();
  }

  function applyHit(a, v, mv, blocked, cx, cy, proj) {
    const dir = proj ? Math.sign(proj.vx) : a.face;
    const power = a.def.stats.power * (v.def.stats.armor || 1) * (v.def.stats.frail || 1);
    if (blocked) {
      const chip = (mv.chip ? mv.dmg * 0.2 : 0) * power;
      damage(v, chip, a);
      v.bvx = dir * 140; v.bst = 0.14; SFX.block(); FX.spark(cx, cy);
      return;
    }
    let dmg = mv.dmg * power;
    if (game.time - (v.lastHitT || 0) > 0.9) v.pressN = 0;
    v.pressN = (v.pressN || 0) + 1; v.lastHitT = game.time;
    if (v.pressN > 6 && !mv.nocap) dmg *= 0.15;
    const chain = ['hit', 'air', 'held'].includes(v.state);
    a.comboN = chain ? (a.comboN || 1) + 1 : 1; a.comboOn = v;
    if (v.state === 'air') dmg *= Math.pow(0.75, v.juggle);
    // 1.4: GAME.comboDamage = { from, scale, cap } shrinks each hit after the first few of a combo and caps a combo's total
    const CD = G.comboDamage;
    if (CD && game.phase === 'fight') {
      if (!chain) { v.comboDmg = 0; v.comboHits = 0; }
      v.comboHits = (v.comboHits || 0) + 1;
      if (v.comboHits > (CD.from || 3)) dmg *= Math.pow(CD.scale || 0.85, v.comboHits - (CD.from || 3));
      if (CD.cap != null) dmg = Math.max(0, Math.min(dmg, CD.cap - (v.comboDmg || 0)));
      v.comboDmg = (v.comboDmg || 0) + dmg;
    }
    if (v.state === 'dizzy' && game.phase === 'finish') { finishBlow(a, v, mv); return; }
    damage(v, dmg, a);
    game.hype = Math.min(1, (game.hype || 0) + dmg * 0.025 + (mv.upper ? 0.3 : 0));
    if (mv.steal && a.hp > 0) { const gain = Math.min(100 - a.hp, dmg * 0.7); a.hp += gain; if (gain > 0.5) banner('SECURITY DEPOSIT +' + Math.round(gain), { size: 11, fill: 'gold', life: 1.4, y: 70, x: a === p1 ? W * 0.27 : W * 0.73 }); }
    if (mv.paper) { for (let i = 0; i < 2; i++) FX.spark(cx + rnd(-6, 6), cy + rnd(-6, 6), '#f4f0e0', 3); }
    SFX[mv.snd || 'punch']();
    bleed(v, cx, cy, Math.round(dmg * 5), dir, mv.upper ? 1.9 : 1.2);
    gore(v, cx, cy, dir, dmg, mv);
    game.freeze = mv.upper ? 0.11 : dmg >= 10 ? 0.08 : 0.055;
    if (mv.upper) { game.shake = 5; if (G.toasty && Math.random() < 0.14 && !game.toasty) { game.toasty = 1.4; SFX.squeak(); } }
    const heavy = v.def.stats.armor && (mv.fx === 'stun') && v.hp > 0;
    let fx = mv.fx;
    if (heavy) { v.flashT = 0.1; return; }
    if (v.state === 'air' || v.state === 'jump' || (v.state === 'attack' && v.move && v.move.airborne)) fx = fx === 'trip' ? 'trip' : fx === 'daze' ? 'knock' : (fx === 'stun' ? 'knock' : fx);
    const wt = v.def.stats.weight;
    if (fx === 'stun') { v.combo = v.state === 'hit' ? (v.combo || 1) + 1 : 1; }
    if (fx === 'blind') { v.state = 'hit'; v.st = 0; v.vx = dir * 30; v.daze = false; v.blind = 1.6; v.stunT = 1.6; v.move = null; v.snapPose = true; for (let i = 0; i < 16; i++) FX.puff(cx, cy, 'rgba(250,250,250,0.9)', 1, 3); return; }
    if (fx === 'slow') { v.state = 'hit'; v.st = 0; v.vx = dir * 40; v.daze = false; v.stunT = 0.3; v.move = null; v.snapPose = true; v.slowT = mv.slowT || 2.6; for (let i = 0; i < 14; i++) FX.puff(cx, cy, 'rgba(200,230,255,0.85)', 1, 3); return; }
    if (fx === 'stun' && v.combo >= 4 && !mv.nocap) { v.combo = 0; launch(v, dir * 220 / wt, -330, 0); }
    else if (fx === 'stun') { v.state = 'hit'; v.snapPose = true; v.st = 0; v.stunT = mv.stun; v.vx = dir * mv.push / wt; v.low = !!mv.low; v.move = null; }
    else if (fx === 'daze') { v.state = 'hit'; v.st = 0; v.vx = 0; v.daze = true; v.move = null; }
    else if (fx === 'launch' || fx === 'knock') { launch(v, dir * (mv.vx != null ? mv.vx : 160) / wt, (mv.vy != null ? mv.vy : -380) / Math.sqrt(wt) * Math.pow(0.82, v.juggle), mv.spin || 0); }
    else if (fx === 'trip') { launch(v, dir * 70, -330, 0); }
    if (v.hp <= 0 && !v.finishing && game.phase !== 'fight' && game.phase !== 'finishwait') v.dead = true;
  }
  // flips: whole backflips before landing on the back
  function launch(v, vx, vy, flips = 0) {
    v.wad = false; v.blind = 0;
    const air = Math.max(0.25, 2 * Math.abs(vy) / GRAV);
    const target = flips * 2 * PI + PI * 0.45 + (v.state === 'air' ? 0 : 0);
    if (v.state !== 'air') v.spin = 0;
    v.state = 'air'; v.st = 0; v.vx = vx; v.vy = vy; v.juggle++; v.move = null; v.spinRate = Math.max(0, target - (v.spin % (2 * PI)) * 0) / air; v.hidden = false; v.sink = 0; v.bounced = false; v.stomped = false;
    if (v.y >= FLOOR - 0.5) v.y = FLOOR - 1;
  }
  function damage(v, amt, a) {
    if (amt <= 0) return;
    v.hp = Math.max(0, v.hp - amt); v.dmgTaken += amt;
    if (v.hp <= 0 && game.phase === 'fight') ko(v, a);
  }

  // ---------- round flow ----------
  function banner(str, o = {}) { game.banners.push(Object.assign({ str, t: 0, life: 1.6, size: 34, fill: 'gold', y: 78 }, o)); }
  function say(str) { SFX.say(str); }
  function ko(v, a) {
    // endurance (1.1): the first of two opponents goes down and the second runs in, the round goes on
    if (v === p2 && game.tagNext) { v.dead = true; if (v.state !== 'air') launch(v, a.face * 160, -280); game.phase = 'tag'; game.pt = 0; return; }
    a.wins++;
    game.loser = v; game.winner = a;
    const decided = a.wins >= 2;
    if (decided && (!v.def.boss || v.def.plainFinish)) { game.phase = 'finishwait'; game.pt = 0; v.finishing = true; return; }
    if (decided && v.def.boss && !v.def.plainFinish) { game.phase = 'finishwait'; game.pt = 0; v.finishing = true; v.bossDie = true; return; }
    v.dead = true;
    if (v.state === 'hit' || actionable(v) || v.state === 'attack') launch(v, a.face * 140, -260);
    game.phase = 'roundend'; game.pt = 0;
    winText(a);
  }
  function winText(a) {
    const flawless = a.dmgTaken <= 0;
    setTimeout(() => { banner(a.def.name + ' ' + CALL.wins, { size: 24, fill: 'gold', life: 3.0, y: 40, hold: 0.8, dock: { y: 34, size: 15 } }); say(a.def.name.replace("'", 'g').toLowerCase() + ' ' + spoken(CALL.wins)); }, 700);
    if (flawless) setTimeout(() => { banner(CALL.flawless, { size: 12, fill: 'fire', y: 52, life: 2.2 }); say(spoken(CALL.flawless)); }, 2000);
  }
  function finishBlow(a, v, mv) {
    // stage fatality: uppercut off the trestle
    if (stage.pit && mv.upper) { startFatality(a, v, stage.pit === true ? 'bridge' : stage.pit); return; }
    v.dead = true; v.finishing = false;
    SFX[mv.snd || 'punch'](); bleed(v, v.x, v.y - hurtH(v) * 0.7, 30, a.face, 1.4);
    launch(v, a.face * 200, -320);
    game.phase = 'matchend'; game.pt = 0;
    winText(a);
  }
  function startFatality(a, v, id) {
    game.phase = 'fatality'; game.pt = 0;
    a.state = 'script'; v.state = 'script'; a.move = null; v.move = null; v.finishing = false;
    projs = [];
    game.banners = [];
    game.script = FATAL.start(id || (a.def.fatal ? a.def.fatal.id : 'generic'), a, v, fatalAPI);
  }
  const fatalAPI = {
    FLOOR, AW, PS, R,
    get cam() { return cam; }, get W() { return W; },
    sfx: n => SFX[n] && SFX[n](), say,
    shake: m => { game.shake = Math.max(game.shake, m); },
    flash: () => { game.flash = 0.12; },
    bubble: (str, x, y, o = {}) => game.bubbles.push(Object.assign({ str, x, y, t: 0, life: 1.4, size: 12 }, o)),
    scene: fn => { game.scene = fn; },
    setCam: v => { cam = v; zoom = 1; },
    hurtH,
  };
  function bossDeath(v) {
    game.phase = 'fatality'; game.pt = 0;
    v.state = 'script'; setWin(game.winner);
    game.script = FATAL.start(v.def.death || 'generic', game.winner, v, fatalAPI);
  }
  function startRound() {
    if (game.pairDef) { if (p2.def !== game.firstDef) { const nf = newFighter(game.firstDef, 1); nf.wins = p2.wins; nf.cpu.lvl = p2.cpu.lvl; p2 = nf; } game.tagNext = game.pairDef; } else game.tagNext = null;
    FX.reset(); projs = []; game.banners = []; game.bubbles = []; game.scene = null; game.script = null;
    for (const f of [p1, p2]) {
      Object.assign(f, { silenceT: 0, blind: 0, wad: false, alpha: 1, trail: null, matrix: 0, hangUsed: false, hp: 100, state: 'idle', st: 0, vx: 0, vy: 0, y: FLOOR, move: null, dead: false, finishing: false, juggle: 0, dmgTaken: 0, ro: {}, hidden: false, sink: 0, daze: false, projOut: 0, bossDie: false, scale: 1, airAtk: null });
      f.st2 = {};
    }
    p1.x = AW / 2 - 80; p2.x = AW / 2 + 80; p1.face = 1; p2.face = -1; p1.px = p1.x; p2.px = p2.x;
    zoom = 1; cam = AW / 2 - W / 2;
    game.phase = 'intro'; game.pt = 0; game.timer = 99;
    banner(CALL.round + ' ' + game.round, { size: 34, life: 1.3, fill: 'gold' });
    say(spoken(CALL.round) + ' ' + ['one', 'two', 'three', 'four', 'five'][Math.min(4, game.round - 1)]);
  }
  // endurance: the second opponent runs in from the far side with a full bar
  function tagIn() {
    const nf = newFighter(game.tagNext, 1); nf.wins = p2.wins; nf.cpu.lvl = p2.cpu.lvl;
    nf.x = clamp(p1.x + 200, 40, AW - 40); nf.face = Math.sign(p1.x - nf.x) || -1; nf.px = nf.x;
    p2 = nf; game.tagNext = null; game.phase = 'fight'; game.pt = 0;
    banner(CALL.next, { size: 22, fill: 'blood', life: 1.4 }); say(nf.def.name.replace("'", 'g').toLowerCase()); SFX.gong();
  }
  function startMatch() {
    const oppDef = ladder.opps[ladder.rung], meta = (ladder.meta && ladder.meta[ladder.rung]) || {};
    game.kipN = [0, 0];
    p1 = newFighter(ROSTER.FIGHTERS[ladder.pick], 0);
    p2 = newFighter(oppDef, 1); p2.mirror = !!meta.mirror;
    game.pairDef = meta.pair || null; game.firstDef = oppDef;
    const lv = ladder.rung / Math.max(1, ladder.opps.length - 1);
    p2.cpu.lvl = oppDef.cpuLvl != null ? oppDef.cpuLvl : mode === 'single' ? (oppDef.boss ? 0.6 : 0.38) : oppDef.boss ? 0.55 + lv * 0.2 : 0.12 + lv * 0.5;
    stage = STAGES.get(ladder.stages[ladder.rung]);
    game.round = 1;
    screen = 'play'; paused = false;
    SFX.music('fight', G.tunes ? 0 : [0, 2, 3, -2, 5, -4, 1, -3, 0][ladder.rung % 9], G.tunes ? (oppDef.tune != null ? oppDef.tune : ladder.rung + (mode === 'single' ? sel.o : 0)) : null);
    startRound();
    if (meta.mirror || meta.pair) { const w = meta.mirror ? CALL.mirror : CALL.endurance; banner(w, { size: 16, fill: 'blood', life: 1.3, y: 112 }); }
  }
  function newLadder() {
    const pool = ROSTER.FIGHTERS.filter((f, i) => i !== ladder.pick);
    for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
    // 1.1: GAME.ladder = { mirror: true, endurance: n } adds a mirror match and endurance rounds before the bosses
    // 1.4: GAME.ladder.opponents = n fights n opponents drawn at random from the roster instead of all of them
    const LO = G.ladder || {}, others = LO.opponents ? pool.slice(0, LO.opponents) : pool, mid = [], meta = others.map(() => ({}));
    if (LO.mirror) { mid.push(ROSTER.FIGHTERS[ladder.pick]); meta.push({ mirror: true }); }
    for (let i = 0; i < (LO.endurance || 0) && pool.length > 1; i++) { const a = pool[(Math.random() * pool.length) | 0]; let b = a; while (b === a) b = pool[(Math.random() * pool.length) | 0]; mid.push(a); meta.push({ pair: b }); }
    for (const b of ROSTER.BOSSES) meta.push({});
    ladder.opps = others.concat(mid, ROSTER.BOSSES); ladder.meta = meta;
    const rot = STAGES.ROTATION.slice();
    for (let i = rot.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [rot[i], rot[j]] = [rot[j], rot[i]]; }
    const reg = others.concat(mid);
    ladder.stages = reg.map((f, i) => rot[i % rot.length]).concat(ROSTER.BOSSES.map((b, i) => b.arena || rot[(reg.length + i) % rot.length]));
    ladder.rung = 0; ladder.scanned = false;
  }

  // ---------- input ----------
  const keys = new Set();
  const btn = { P: false, K: false, B: false };
  const press = { P: false, K: false };
  window.addEventListener('keydown', e => {
    if (!keys.has(e.code)) { if (e.code === 'KeyJ' || e.code === 'KeyZ') press.P = true; if (e.code === 'KeyK' || e.code === 'KeyX') press.K = true; }
    keys.add(e.code);
    if ((e.code === 'KeyP' || e.code === 'Escape') && screen === 'play') { paused = !paused; menu = null; }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if ((e.code === 'Enter' || e.code === 'Space') && screen !== 'play') uiKey();
    SFX.unlock();
  });
  window.addEventListener('keyup', e => keys.delete(e.code));

  const elControls = document.getElementById('controls');
  const elBase = document.getElementById('stickBase'), elKnob = document.getElementById('stickKnob');
  const elBtn = { P: document.getElementById('bPunch'), K: document.getElementById('bKick'), B: document.getElementById('bBlock') };
  const elPause = document.getElementById('pauseBtn');
  const touches = new Map();
  let stickId = null, stickOrigin = [0, 0], stickVec = [0, 0], stickPeak = 0;
  const defaultStickPos = () => [Math.max(100, window.innerWidth * 0.13), window.innerHeight - 105];
  const placeStick = (x, y) => { elBase.style.left = x + 'px'; elBase.style.top = y + 'px'; };
  const setKnob = (dx, dy) => { elKnob.style.transform = `translate(${dx}px, ${dy}px)`; };
  function btnZone(x, y) {
    if (x < window.innerWidth * 0.5) return [];
    const list = [];
    for (const k in elBtn) { const r = elBtn[k].getBoundingClientRect(); list.push({ k, d: Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) / (r.width / 2) }); }
    list.sort((a, b) => a.d - b.d);
    if (list[0].d > 2.2) return [];
    return [list[0].k];
  }
  function moveStick(x, y) {
    let dx = x - stickOrigin[0], dy = y - stickOrigin[1];
    const L = Math.hypot(dx, dy), max = 40;
    if (L > max) { stickOrigin[0] += dx * (1 - max / L); stickOrigin[1] += dy * (1 - max / L); placeStick(stickOrigin[0], stickOrigin[1]); dx = x - stickOrigin[0]; dy = y - stickOrigin[1]; }
    let L2 = Math.hypot(dx, dy);
    if (L2 > stickPeak) stickPeak = L2;
    else if (stickPeak > 24 && L2 < stickPeak - 13) { stickOrigin = [x, y]; placeStick(x, y); dx = dy = 0; L2 = 0; stickPeak = 0; }
    setKnob(dx, dy);
    stickVec = L2 < 9 ? [0, 0] : [dx / Math.max(L2, 26), dy / Math.max(L2, 26)];
  }
  function pressStart(id, x, y) {
    SFX.unlock();
    if (screen === 'play' && !paused && game.phase !== 'fatality') {
      if (x < window.innerWidth * 0.5) { if (stickId === null) { stickId = id; stickOrigin = [x, y]; stickPeak = 0; placeStick(x, y); setKnob(0, 0); stickVec = [0, 0]; } return; }
      const hits = btnZone(x, y);
      touches.set(id, { hits });
      for (const h of hits) { if (h === 'P') press.P = true; if (h === 'K') press.K = true; }
      if (hits.length) { elBtn[hits[0]].classList.add('down'); return; }
    }
    uiTap(x, y);
  }
  function pressMove(id, x, y) {
    if (id === stickId) { moveStick(x, y); return; }
    const t = touches.get(id);
    if (t) {
      const hits = btnZone(x, y);
      for (const h of hits) if (!t.hits.includes(h)) { if (h === 'P') press.P = true; if (h === 'K') press.K = true; }
      t.hits = hits;
    }
  }
  function pressEnd(id) {
    if (id === stickId) { stickId = null; stickVec = [0, 0]; setKnob(0, 0); placeStick(...defaultStickPos()); }
    touches.delete(id);
  }
  const onTouch = fn => e => { if (e.target === elPause) return; e.preventDefault(); for (const t of e.changedTouches) fn(t.identifier, t.clientX, t.clientY); };
  document.addEventListener('touchstart', onTouch(pressStart), { passive: false });
  document.addEventListener('touchmove', onTouch(pressMove), { passive: false });
  document.addEventListener('touchend', onTouch(pressEnd), { passive: false });
  document.addEventListener('touchcancel', onTouch(pressEnd), { passive: false });
  for (const ev of ['gesturestart', 'gesturechange', 'dblclick', 'contextmenu']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
  window.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.target !== elPause) pressStart('m', e.clientX, e.clientY); });
  window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && e.buttons) pressMove('m', e.clientX, e.clientY); });
  window.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') pressEnd('m'); });
  const togglePause = e => { e.preventDefault(); e.stopPropagation(); if (screen === 'play') { paused = !paused; menu = null; SFX.blip(); } };
  elPause.addEventListener('touchstart', togglePause, { passive: false });
  elPause.addEventListener('mousedown', togglePause);

  function readInput() {
    btn.P = btn.K = btn.B = false;
    for (const t of touches.values()) for (const h of t.hits) btn[h] = true;
    for (const k in elBtn) elBtn[k].classList.toggle('down', btn[k]);
    let mx = stickVec[0], my = stickVec[1];
    const k = c => keys.has(c);
    if (k('ArrowLeft') || k('KeyA')) mx = -1;
    if (k('ArrowRight') || k('KeyD')) mx = 1;
    if (k('ArrowUp') || k('KeyW')) my = -1;
    if (k('ArrowDown') || k('KeyS')) my = 1;
    if (k('KeyJ') || k('KeyZ')) btn.P = true;
    if (k('KeyK') || k('KeyX')) btn.K = true;
    if (k('KeyL') || k('KeyC') || k('ShiftLeft')) btn.B = true;
    return { mx, my };
  }
  function tokenFor(f, mx, my) {
    const x = mx > 0.42 ? 1 : mx < -0.42 ? -1 : 0;
    const y = my < -0.55 ? 'U' : my > 0.5 ? 'D' : '';
    const fw = x * f.face;
    return (y + (fw > 0 ? 'F' : fw < 0 ? 'B' : '')) || 'N';
  }
  function pushTok(f, tok) {
    if (tok.includes('D')) f.lastD = game.time;
    if (tok !== f.tok) { f.tok = tok; f.hist.push({ k: tok, t: game.time }); if (f.hist.length > 12) f.hist.shift(); }
  }
  function motion(f, seq, win = 0.75) {
    let idx = 0, need = false;
    for (const e of f.hist) {
      if (game.time - e.t > win) continue;
      const L = seq[idx];
      if (need) { if (!e.k.includes(L)) need = false; continue; }
      if (e.k.includes(L)) { idx++; if (idx === seq.length) return true; if (seq[idx] === L) need = true; }
    }
    return false;
  }

  // a fighter tries to act this frame (shared by human and CPU)
  function act(f, o, c) {
    // c: { tok, P, K, B }
    const tok = c.tok, D = tok.includes('D'), U = tok.includes('U'), F = tok.includes('F'), B = tok.includes('B');
    if (f.state === 'jump') {
      if (c.B && !f.def.noMatrix && !f.airAtk && game.time - (f.jumpAt || -9) < 0.17) { f.state = 'idle'; f.y = FLOOR; f.vy = 0; f.vx = 0; startMove(f, MV.bdodge); f.dodged = false; f.matrix = 0.9; game.slow = Math.max(game.slow || 0, 0.55); return; }
      if (!f.airAtk && c.P && (D || game.time - (f.lastD || -9) < 0.25) && !f.hangUsed && !f.def.noMatrix && f.y < FLOOR - 24 && Math.abs(o.x - f.x) < 225) { f.hangUsed = true; f.hangSide = Math.sign(o.x - f.x) || f.face; f.airAtk = MV.hang; f.at = 0; f.airHit = false; f.hangN = 0; f.matrix = 1.2; game.slow = Math.max(game.slow || 0, 0.5); SFX.whoosh(); SFX.gong(); return; }
      if (!f.airAtk && (c.P || c.K)) { f.airAtk = c.K ? MV.jkick : MV.jpunch; f.at = 0; f.airHit = false; SFX.whoosh(); }
      return;
    }
    // 1.3: phase dash input is forward tapped while block is already held (holding forward and then blocking still just blocks)
    const bHeld = f.bHeld, fHeld = f.fHeld; f.bHeld = !!c.B; f.fHeld = F;
    // 1.3 kip-up: KICK while knocked down springs up with a spinning leg sweep
    if ((f.state === 'down' || f.state === 'getup') && c.K && !f.def.noMatrix && !f.dead && !f.finishing && !f.stomped && game.phase === 'fight' && (f.state === 'getup' || f.st > 0.12)) {
      f.y = FLOOR; f.vx = 0; startMove(f, MV.kipup); f.spinN = 0; f.matrix = 0.5; SFX.whoosh(); return;
    }
    if (!actionable(f)) return;
    if (!f.def.noMatrix && game.phase === 'fight' && (c.dash || (c.B && F && bHeld && !fHeld)) && game.time - (f.dashAt || -9) > 0.7) {
      f.dashAt = game.time; startMove(f, MV.phase); f.px0 = f.x; f.pside = Math.sign(o.x - f.x) || f.face;
      const [lo, hi] = limits(); f.px1 = clamp(o.x + f.pside * (halfW(o) + halfW(f) + 26 * f.d.k), lo, hi);
      f.matrix = 0.8; game.slow = Math.max(game.slow || 0, 0.25); SFX.whoosh(); return;
    }
    if ((c.P || c.K) && game.phase === 'finish' && game.winner === f) {
      for (const fs of f.def.fatalList) if (c[fs.btn] && motion(f, fs.motion, fs.win || 0.75)) { f.hist = []; startFatality(f, o, fs.id); return; }
    }
    for (const sp of f.def.specials) {
      if (f.silenceT > 0) break;   // 1.5: silenced fighters can't use specials
      if (c[sp.btn] && (sp.kind !== 'proj' || f.projOut <= 0) && motion(f, sp.motion, sp.win || 0.75)) { f.hist = []; startSpecial(f, sp); return; }
    }
    if (c.P) {
      if (!f.def.noMatrix && motion(f, ['F', 'F'], 0.6)) { f.hist = []; startMove(f, MV.brawl); f.flN = -1; f.matrix = 1.3; game.slow = Math.max(game.slow || 0, 0.45); SFX.gong(); return; }
      if (D) { startMove(f, MV.upper); return; }
      if ((F || B) && Math.abs(o.x - f.x) < 44 * f.d.k && grounded(o) && !invuln(o) && o.state !== 'dizzy') { startMove(f, F ? MV.grab : MV.wad); return; }
      f.jabAlt = game.time - (f.lastJab || 0) < 0.5 ? 1 - f.jabAlt : 0; f.lastJab = game.time;
      startMove(f, f.jabAlt ? MV.jab2 : MV.jab); return;
    }
    if (c.K) {
      if (!f.def.noMatrix && motion(f, ['B', 'B'], 0.9)) { f.hist = []; startWallrun(f); return; }
      if (D) { startMove(f, MV.sweep); return; }
      if (B) { startMove(f, MV.round); return; }
      startMove(f, MV.kick); return;
    }
    if (c.B && U && !f.def.noMatrix) { startMove(f, MV.bdodge); f.dodged = false; f.matrix = 0.9; game.slow = Math.max(game.slow || 0, 0.55); SFX.whoosh(); return; }
    if (c.B) { f.state = D ? 'cblock' : 'block'; return; }
    if (U) { doJump(f, F ? f.face : B ? -f.face : 0); return; }
    if (D) { f.state = 'crouch'; return; }
    if (F || B) { f.state = 'walk'; f.wdir = F ? 1 : -1; return; }
    f.state = 'idle';
  }

  // ---------- AI ----------
  // the CPU picks a special that suits the distance and loads its motion into the input history
  function aiSpecial(f, dist, out, onlyProj) {
    if (f.silenceT > 0) return false;
    const ok = f.def.specials.filter(s => (s.kind !== 'proj' || f.projOut <= 0) && (!onlyProj || s.kind === 'proj') && s.kind !== 'parry').filter(s => {
      const r = s.ai || (s.kind === 'cgrab' ? (s.mod && s.mod.hold === 'pull' ? [60, (s.mod.range || 46) + 30] : [0, ((s.mod && s.mod.range) || 46) + 22]) : AI_RANGE[s.kind] || [0, 999]);
      return dist >= r[0] && dist <= r[1];
    });
    if (!ok.length) return false;
    let tot = 0; for (const s of ok) tot += s.kind === 'proj' ? 2.5 : 1;
    let x = Math.random() * tot, s = ok[0];
    for (const c of ok) { x -= c.kind === 'proj' ? 2.5 : 1; if (x <= 0) { s = c; break; } }
    f.hist = s.motion.map(k => ({ k, t: game.time })); out[s.btn] = true; return true;
  }
  function ai(f, o, dt) {
    const c = f.cpu, lv = c.lvl;
    const out = { tok: 'N', P: false, K: false, B: false };
    const dx = o.x - f.x, dist = Math.abs(dx);
    const fwd = Math.sign(dx) * f.face >= 0 ? 'F' : 'B';
    if (game.phase === 'finish' && game.winner === f) {
      c.fatalT += dt;
      if (c.fatalT > 0.9) {
        if (c.fatalT < 1.15) c.doFatal = f.def.fatalList.length > 0;
        if (c.doFatal) { const L = f.def.fatalList, fs = L.length > 1 && Math.random() < (L.length > 2 ? 0.55 : 0.25) ? L[1 + ((Math.random() * (L.length - 1)) | 0)] : L[0]; startFatality(f, o, fs.id); return out; }
        if (dist > 50) out.tok = 'F'; else out.P = true;
      }
      return out;
    }
    if (game.phase !== 'fight' && game.phase !== 'finishwait') return out;
    // 1.3: decide once per knockdown whether to kip-up
    if ((f.state === 'down' || f.state === 'getup') && !f.dead && !f.def.noMatrix) {
      // 1.3.1: at most two kip-ups per CPU per match, spread out over the knockdowns
      const kn = game.kipN || (game.kipN = [0, 0]);
      if (!c.kipRoll) { c.kipRoll = 1; c.kipGo = kn[f.side] < 2 && Math.random() < 0.18 + lv * 0.12; c.kipAt = rnd(0.15, 0.45); if (c.kipGo) kn[f.side]++; }
      if (c.kipGo && (f.state === 'getup' || f.st > c.kipAt)) out.K = true;
      return out;
    }
    c.kipRoll = 0;
    if (f.state === 'jump') {
      if (!f.airAtk && !f.hangUsed && dist < 70 && f.y < FLOOR - 40 && Math.random() < 0.06 + lv * 0.08) { out.tok = 'D'; out.P = true; return out; }
      if (!f.airAtk && dist < 80 && f.vy > -150) out.K = Math.random() < 0.7, out.P = !out.K; return out;
    }
    if (c.blockT > 0) { c.blockT -= dt; out.B = true; out.tok = c.blockLow ? 'D' : 'N'; return out; }
    if (!actionable(f)) return out;
    // reactive defense
    const threat = (o.state === 'attack' && o.move && dist < 110 && o.mt < (o.move.t[0] + o.move.t[1])) || projs.some(p => p.o === o && Math.abs(p.x - f.x) < 120);
    if (threat && !c.reacted) {
      c.reacted = true;
      if (Math.random() < 0.12 + lv * 0.6) {
        const par = f.def.specials.find(s => s.kind === 'parry');
        if (par && Math.random() < 0.3 + lv * 0.3) { f.hist = par.motion.map(k => ({ k, t: game.time })); out[par.btn] = true; return out; }
        if (projs.some(p => p.o === o && p.kind !== 'wave') && Math.random() < 0.3 + lv * 0.2) { out.tok = 'U'; out.B = true; return out; }
        if (projs.some(p => p.o === o && p.kind !== 'wave') && Math.random() < 0.25 + lv * 0.3) { out.tok = 'U' + fwd; return out; }
        if (o.move && !o.move.low && Math.random() < 0.08 + lv * 0.1) { out.tok = 'U'; out.B = true; return out; }
        if (!f.def.noMatrix && o.move && dist < 100 && Math.random() < 0.05 + lv * 0.12) { out.dash = true; return out; }
        c.blockT = 0.28 + lv * 0.25; c.blockLow = o.move && o.move.low; out.B = true; return out;
      }
    }
    if (!threat) c.reacted = false;
    if (o.state === 'jump' && dist < 75 && Math.random() < (0.1 + lv * 0.5) * dt * 20) { out.tok = 'D'; out.P = true; return out; }
    // cornered: jump over, counter or turtle up instead of eating a beatdown
    const [wlo, whi] = limits(), cornered = (f.x - wlo < 34 && dx > 0) || (whi - f.x < 34 && dx < 0);
    if (cornered && dist < 110 && Math.random() < (0.35 + lv * 0.5) * dt * 12) {
      const r = Math.random();
      if (r < 0.18) { f.hist = [{ k: 'B', t: game.time }, { k: 'N', t: game.time }, { k: 'B', t: game.time }]; out.tok = 'B'; out.K = true; return out; }
      if (r < 0.45) { out.tok = 'U' + fwd; return out; }
      if (r < 0.65 && dist < 60) { out.tok = 'D'; out.P = true; return out; }
      if (r < 0.8 && dist < 50) { out.tok = 'F'; out.P = true; return out; }
      c.blockT = 0.35; out.B = true; return out;
    }
    const AS = f.def.aiStyle || {};
    if (AS.noBlock || AS.quips) { if (AS.noBlock) c.blockT = 0; if (AS.quips && Math.random() < 0.003) game.bubbles.push({ str: pick(AS.quips), x: f.x, y: f.y - hurtH(f) - 12, t: 0, life: 1.1, size: 10, fill: 'white' }); }
    c.t -= dt;
    if (c.walk) out.tok = c.walk > 0 ? 'F' : 'B';
    if (c.t > 0) return out;
    c.t = (0.5 - lv * 0.32) * rnd(0.6, 1.4);
    c.walk = 0;
    const r = Math.random();
    const hw = 40 * f.d.k + halfW(o);
    if (AS.taunt && dist > 130 && Math.random() < AS.taunt) { startMove(f, MV.taunt); return out; }
    if (o.state === 'down' && !o.stomped && dist < 130 && Math.random() < 0.15 + lv * 0.4) { out.tok = 'U' + (dist > 25 ? fwd : ''); return out; }
    if (['down', 'getup', 'air'].includes(o.state)) { if (r < 0.4) c.walk = -1; else if (r < 0.55 && dist > 120) aiSpecial(f, dist, out, true); return out; }
    if (dist > 170) {
      if (r < 0.38) { if (!aiSpecial(f, dist, out)) c.walk = 1; }
      else if (r < 0.48) out.tok = 'UF';
      else c.walk = 1;
    } else if (dist > hw + 18) {
      if (r < 0.4) c.walk = 1;
      else if (r < 0.55) { if (!aiSpecial(f, dist, out)) c.walk = 1; }
      else if (r < 0.7) out.tok = 'UF';
      else if (r < 0.74 && !f.def.noMatrix && dist < 150) { f.hist = [{ k: 'F', t: game.time }, { k: 'N', t: game.time }, { k: 'F', t: game.time }]; out.P = true; }
      else if (r < 0.8) { if (!aiSpecial(f, dist, out)) c.walk = 1; }
      else c.walk = Math.random() < 0.5 ? 1 : 0;
    } else {
      const crouching = o.state === 'crouch' || o.state === 'cblock';
      if (Math.random() < 0.09 && aiSpecial(f, dist, out)) return out;
      if (!f.def.noMatrix && Math.random() < 0.03 + lv * 0.06) { f.hist = [{ k: 'F', t: game.time }, { k: 'N', t: game.time }, { k: 'F', t: game.time }]; out.P = true; return out; }
      if (r < 0.26) out.P = true;
      else if (r < 0.44) out.K = true;
      else if (r < 0.54) { out.tok = 'D'; out.K = true; }
      else if (r < 0.64 + (crouching ? 0.15 : 0)) { out.tok = 'D'; out.P = true; }
      else if (r < 0.72) { out.tok = 'B'; out.K = true; }
      else if (r < 0.8 && dist < 44 * f.d.k) { out.tok = Math.random() < 0.5 ? 'F' : 'B'; out.P = true; }
      else if (r < 0.88) c.walk = -1;
      else { c.blockT = 0.4; out.B = true; }
    }
    return out;
  }

  // ---------- update ----------
  function updateFighter(f, o, dt) {
    if (!isFinite(f.x) || !isFinite(f.y)) { f.x = isFinite(f.x) ? f.x : AW / 2; f.y = FLOOR; f.vx = f.vy = 0; f.state = 'idle'; }
    if (!isFinite(f.vx)) f.vx = 0; if (!isFinite(f.vy)) f.vy = 0;
    f.t += dt; f.st += dt;
    if (f.flashT) f.flashT -= dt;
    if (f.matrix > 0) { f.matrix -= dt; const tr = f.trail || (f.trail = []); if (!tr.lastT || f.t - tr.lastT > 0.05) { tr.lastT = f.t; tr.push({ x: f.x, y: f.y, face: f.face, pose: f.pose, a: 1 }); if (tr.length > 5) tr.shift(); } }
    else if (f.trail && f.trail.length) { f.trail.shift(); }
    if (f.blind > 0) { f.blind -= dt; if (Math.random() < 0.3) { const h = R.jointWorld(f, f.pose, 'head'); FX.puff(h[0] + f.face * 6, h[1], 'rgba(250,250,250,0.8)', 1, 1); } }
    if (f.projOut > 0) f.projOut -= dt;
    const sp = f.def.stats.speed;
    if (grounded(f) && (actionable(f) || f.state === 'dizzy') && Math.abs(o.x - f.x) > 2 && o.state !== 'held') f.face = Math.sign(o.x - f.x);
    switch (f.state) {
      case 'idle': case 'crouch': case 'block': case 'cblock': f.vx = 0; break;
      case 'walk': f.vx = f.wdir * f.face * (f.wdir > 0 ? 140 : 118) * sp; f.wph += dt * 13 * sp * f.wdir; break;
      case 'jump': case 'air': {
        f.vy += GRAV * dt; f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.state === 'air') f.spin += dt * (f.spinRate || 0);
        if (f.state === 'jump' && f.airAtk === MV.hang) {
          // hang time: gravity switches off and the fists blur
          f.y -= f.vy * dt; f.x -= f.vx * dt; f.vy = 0; f.vx = 0;
          const sd = f.hangSide || f.face, fist = R.jointWorld(f, PS.hangA, 'handFx'), oc = R.jointWorld(o, o.pose, 'chest');
          const tx = oc[0] - sd * Math.max(halfW(o) + 4, (fist[0] - f.x) * f.face - 6), ty = Math.min(FLOOR + 30, oc[1] - (fist[1] - f.y) + 4);
          f.x += (tx - f.x) * Math.min(1, dt * 9); f.y += (ty - f.y) * Math.min(1, dt * 9); f.face = sd;
          const n = Math.floor(f.at / 0.1);
          if (n !== f.hangN) { f.hangN = n; f.airHit = false; SFX.whoosh(); }
          const hEnd = MV.hang.t[0] + MV.hang.t[1];
          if (f.at < hEnd) { if (!f.airHit && f.at > MV.hang.t[0]) tryHit(f, o, MV.hang); }
          else if (f.at < hEnd + 0.22) { if (!f.hammered) { f.hammered = true; f.airHit = false; SFX.whoosh(); } if (!f.airHit) tryHit(f, o, MV.hammer); }
          else { f.hammered = false; f.airAtk = MV.hammer; f.at = 9; f.y = Math.min(f.y, FLOOR - 1); f.vy = 0; f.vx = 0; }
          if (f.airAtk === MV.hang) f.at += dt;
        }
        else if (f.state === 'jump' && f.airAtk) { f.at += dt; const m = f.airAtk; if (!f.airHit && f.at > m.t[0] && f.at < m.t[0] + m.t[1]) tryHit(f, o, m); }
        if (f.y >= FLOOR && f.vy > 0) {
          f.y = FLOOR;
          if (f.state === 'air' && f.wad) {
            // a balled-up wad of person: bounce, bounce, skid
            SFX.thud(); FX.dust(f.x, FLOOR, 12); FX.blood(f.x, FLOOR - 6, 10, Math.sign(f.vx), 0.8); game.shake = Math.max(game.shake, 4);
            f.wadB = (f.wadB || 0) + 1;
            if (f.wadB === 1) damage(f, 5, o);
            if (f.wadB < 3 && f.vy > 160) { f.vy = -f.vy * 0.42; f.vx *= 0.78; f.y = FLOOR - 1; }
            else { f.state = 'down'; f.st = 0; f.vx *= 0.9; f.juggle = 0; f.wad = false; f.skid = 0.4; }
          }
          else if (f.state === 'air') {
            SFX.thud(); FX.dust(f.x, FLOOR, 14); FX.blood(f.x, FLOOR - 6, 18, Math.sign(f.vx), 0.9); game.shake = Math.max(game.shake, 4);
            if (!f.bounced && f.vy > 420) { f.bounced = true; f.vy = -f.vy * 0.25; f.vx *= 0.6; f.spinRate = 0; f.y = FLOOR - 1; }
            else { f.state = 'down'; f.st = 0; f.vx *= 0.6; f.juggle = 0; }
          }
          else {
            f.state = 'idle'; f.airAtk = null; SFX.land();
            if (o.state === 'down' && !o.stomped && !o.dead && game.phase !== 'intro') {
              const c0 = o.x, c1 = o.x - o.face * hurtH(o) * 0.95;
              if (f.x > Math.min(c0, c1) - 8 && f.x < Math.max(c0, c1) + 8) {
                o.stomped = true; o.st = 0;
                SFX.crunch(); SFX.splat(); game.shake = 6; game.freeze = 0.08;
                bleed(o, f.x, FLOOR - 8, 40, 0, 1.4); FX.gib('chunk', f.x, FLOOR - 8, rnd(-120, 120), -260); FX.gib('tooth', f.x, FLOOR - 8, rnd(-120, 120), -300);
                damage(o, 9 * f.def.stats.power, f);
                if (o.finishing) o.st = 0;
                if (f.def.chair) { startMove(f, { kind: 'rollover', t: [0, 0.62, 0.12] }); f.rx0 = f.x; f.rv = o; }
                else { f.state = 'jump'; f.vy = -380; f.vx = -f.face * 60; f.airAtk = null; }
              }
            }
          }
        }
        break;
      }
      case 'hit': f.vx *= 1 - dt * 8; if (f.blind > 0) f.vx += Math.sin(f.t * 3) * 6; if (f.st >= (f.daze ? 1.1 : f.stunT || 0.26)) { f.state = 'idle'; f.daze = false; f.blind = 0; } break;
      case 'down': f.vx *= 1 - dt * (f.skid > 0 ? 2.5 : 6); if (f.skid > 0) { f.skid -= dt; if (Math.random() < 0.6) FX.dust(f.x, FLOOR, 1); if (Math.random() < 0.3) FX.blood(f.x, FLOOR - 3, 1, 0, 0.3); } if (f.dead && !f.finishing) break; if (f.st > (f.finishing ? 0.9 : 0.7)) { f.state = 'getup'; f.st = 0; } break;
      case 'getup': if (f.st > 0.35) { f.state = 'idle'; f.stomped = false; } break;
      case 'attack': updateAttack(f, o, dt); break;
      case 'held': {
        // 1.1.2 safety net: if whoever was holding us stopped (interrupted, timed out), drop to the floor instead of hanging in the air
        const h = f.heldBy;
        if (!h || !h.grabbed || (h.state !== 'attack' && h.state !== 'script')) { f.heldUp = false; f.wadHeld = false; f.spin = 0; launch(f, 0, -60); }
        break;
      }
      case 'dizzy': f.vx = 0; break;
      case 'win': f.vx = 0; winFx(f, dt); break;
    }
    if (f.state === 'hit' && f.stunT == null) f.stunT = 0.26;
    if (f.bst > 0) { f.bst -= dt; f.x += f.bvx * dt; f.bvx *= 1 - dt * 10; }
    if (!['jump', 'air', 'attack'].includes(f.state) || (f.state === 'attack' && f.move && f.move.lunge)) f.x += f.vx * dt;
    if (f.finishing && ['idle', 'walk', 'crouch', 'block', 'cblock'].includes(f.state)) {
      if (f.bossDie) bossDeath(f);
      else { f.state = 'dizzy'; f.st = 0; game.phase = 'finish'; game.pt = 0; const fc = CALL.finish ? CALL.finish.replace('%s', f.def.him) : f.def.him === 'IT' ? 'FINISH IT!' : 'FINISH ' + f.def.him + '!'; banner(fc, { size: 34, fill: 'blood', life: 2.2 }); say(spoken(fc)); }
    }
  }
  function updateAttack(f, o, dt) {
    const m = f.move, k = m.kind;
    f.mt += dt;
    const [su, ac, rc] = m.t;
    if (m.grab) {
      if (!f.grabbed && f.mt >= su && f.mt < su + ac + 0.02) {
        if (Math.abs(o.x - f.x) < 50 * f.d.k && grounded(o) && !invuln(o) && (actionable(o) || o.state === 'hit')) {
          f.grabbed = true; o.state = 'held'; o.heldBy = f; o.ht = 0; SFX.punch();
        }
      }
      if (f.grabbed && o.state === 'held' && m.wad) {
        o.ht += dt; o.wadHeld = true;
        const u = ease((o.ht - 0.06) / 0.28), top = f.y - hurtH(f) * 0.98;
        o.x = f.x + f.face * lerp(26 * f.d.k, 3, u); o.y = lerp(FLOOR - 18, top, u); o.spin = 0;
        if (o.ht >= 0.44) {
          f.grabbed = false; o.wadHeld = false;
          damage(o, 7 * f.def.stats.power, f); SFX.big(); game.shake = 4;
          launch(o, f.face * 470 / Math.sqrt(o.def.stats.weight), -360, 0); o.wad = true; o.wadB = 0; o.spin = 0; o.spinRate = 0; o.juggle = 3;
          if (o.hp <= 0 && !o.finishing && game.phase !== 'fight') o.dead = true;
        }
      }
      else if (f.grabbed && o.state === 'held' && f.def.throw && f.def.throw !== 'suplex') {
        // 1.1 throw styles: 'hip' and 'shoulder' throw the foe forward over the hip or shoulder, 'spin' whirls them and lets go
        o.ht += dt;
        const sty = f.def.throw, u = ease((o.ht - 0.1) / (sty === 'spin' ? 0.5 : 0.32)), R0 = 34 * f.d.k;
        if (sty === 'spin') { const a = u * PI * 3; o.x = f.x + f.face * Math.cos(a) * R0 * 1.25; o.y = FLOOR - 30 * f.d.k - Math.abs(Math.sin(a)) * 16 * f.d.k; o.spin = -PI / 2; if (Math.floor(u * 6) !== f.spinN) { f.spinN = Math.floor(u * 6); SFX.whoosh(); } }
        else { const hi = sty === 'shoulder' ? 112 : 70; o.x = f.x + f.face * lerp(R0, R0 * 1.15, u) * (1 - Math.sin(u * PI) * 0.75); o.y = FLOOR - Math.sin(u * PI) * hi * f.d.k; o.spin = u * PI * 1.1; }
        if (o.ht >= (sty === 'spin' ? 0.64 : 0.46)) {
          f.grabbed = false; o.y = FLOOR - 1;
          damage(o, 13 * f.def.stats.power, f); SFX.big(); SFX.crunch(); bleed(o, o.x, FLOOR - 10, 30, f.face, 1.3);
          if (sty === 'spin') launch(o, f.face * 520 / Math.sqrt(o.def.stats.weight), -300, 0); else launch(o, f.face * 110, -150);
          game.shake = 8; game.freeze = 0.08; FX.dust(o.x, FLOOR, 16);
          if (o.state === 'air' && o.hp <= 0 && !o.finishing && game.phase !== 'fight') o.dead = true;
        }
      }
      else if (f.grabbed && o.state === 'held') {
        o.ht += dt;
        const u = Math.max(0, Math.min(1, (o.ht - 0.12) / 0.3)), a = u * u * (3 - 2 * u) * PI;
        const R0 = 34 * f.d.k, cy = FLOOR - 62 * f.d.k;
        void cy; o.x = f.x + f.face * Math.cos(a) * R0; o.y = FLOOR - Math.sin(a) * 92 * f.d.k;
        o.spin = -a * 1.05;
        if (o.ht >= 0.44) {
          f.grabbed = false; o.y = FLOOR - 1;
          damage(o, 13 * f.def.stats.power, f); SFX.big(); SFX.crunch(); bleed(o, o.x, FLOOR - 10, 30, -f.face, 1.3);
          launch(o, -f.face * 90, -170); game.shake = 8; game.freeze = 0.08; FX.dust(o.x, FLOOR, 16);
          if (o.state === 'air' && o.hp <= 0 && !o.finishing && game.phase !== 'fight') o.dead = true;
        }
      }
      // 1.1.2: a slow throw (spin) can outlast the move's timer; wait for it instead of dropping the foe mid-air
      if (f.mt >= su + ac + rc && !(f.grabbed && o.state === 'held' && f.mt < su + ac + rc + 1.2)) { f.state = 'idle'; f.grabbed = false; }
      return;
    }
    if (m.cgrab) { updateCgrab(f, o, m, dt); return; }
    if (m.parry) {
      if (f.parried && f.mt < su + ac) f.mt = su + ac;
      if (f.mt >= su + ac + rc) { f.state = 'idle'; f.move = null; f.parried = false; }
      return;
    }
    if (k === 'rollover') {
      const v = f.rv; f.x = f.rx0 + Math.sin(f.mt * 15) * 15 * f.d.k;
      if (v && v.state === 'down') { v.st = Math.min(v.st, 0.2); const n = Math.floor(f.mt / 0.2); if (n !== f.rollN) { f.rollN = n; SFX.crunch(); bleed(v, f.x, FLOOR - 6, 14, 0, 1); if (n > 0) damage(v, 1.5, f); } }
      if (f.mt >= su + ac + rc) { f.state = 'idle'; f.move = null; f.rv = null; }
      return;
    }
    if (k === 'rise') {
      if (!f.leapt && f.mt >= su) { f.leapt = true; m.airborne = true; f.vy = -(m.rv || 640); f.vx = f.face * (m.rx || 70); SFX.whoosh(); }
      if (f.leapt) {
        f.vy += GRAV * dt; f.x += f.vx * dt; f.y += f.vy * dt;
        if (m.fire) { const h = R.jointWorld(f, f.pose, 'handFx'); FX.fire(h[0], h[1], 2, 0.8); }
        if (f.y >= FLOOR && f.vy > 0) { f.y = FLOOR; m.airborne = false; f.leapt = false; f.vx = 0; SFX.land(); f.mt = Math.max(f.mt, su + ac); }
      }
      if (m.box && !f.hitDone && f.mt >= su && f.mt <= su + ac) tryHit(f, o, m);
      if (f.mt >= su + ac + rc && !f.leapt) { f.state = 'idle'; f.move = null; f.vx = 0; m.airborne = false; }
      return;
    }
    if (k === 'bdodge') {
      if (f.mt > su + ac + rc - 0.02) {
        f.state = 'idle'; f.move = null;
        if (f.dodged && Math.abs(o.x - f.x) < 95 * f.d.k && !invuln(o)) { f.face = Math.sign(o.x - f.x) || f.face; startMove(f, MV.upper); f.matrix = 0.4; }
      }
      return;
    }
    if (k === 'taunt') {
      if (!f.taunted) { f.taunted = true; game.bubbles.push({ str: pick(['GORGEOUS.', 'WHAT A FACE.', "I'D RENT ME.", 'STILL GOT IT.', 'LOOKING GOOD.']), x: f.x, y: f.y - hurtH(f) - 14, t: 0, life: 1.3, size: 11, fill: 'gold' }); }
      if (f.mt >= su + ac) { f.state = 'idle'; f.move = null; f.taunted = false; }
      return;
    }
    if (k === 'wallrun') {
      const run = 0.16, up = 0.42;
      if (f.mt < run) { f.x = lerp(f.wx0, f.wallX, f.mt / run); f.wph = (f.wph || 0) + dt * 22; }
      else if (f.mt < up) { const u = (f.mt - run) / (up - run); f.x = f.wallX; f.y = FLOOR - u * 62 * f.d.k; f.wph = (f.wph || 0) + dt * 26; if (Math.random() < 0.4) FX.dust(f.wallX - f.wallFace * 6, f.y, 1);
        // 1.1.2: a chair rides up the wall on its wheels, throwing sparks and leaving tread marks
        if (f.def.chair && Math.random() < 0.5) FX.spark(f.wallX - f.wallFace * 4, f.y - rnd(0, 20), '#ffd080', 2); }
      else {
        f.face = f.wallFace; f.move = null; f.state = 'jump'; f.vy = -300; f.vx = clamp((o.x - f.x) / 0.5, -460, 460);
        f.airAtk = MV.mkick; f.at = 0; f.airHit = false; f.hangUsed = true; game.slow = Math.max(game.slow || 0, 0.35); SFX.whoosh(); SFX.kick();
      }
      return;
    }
    if (k === 'sneak') {
      if (f.mt < 0.18) f.alpha = 1 - f.mt / 0.18 * 0.9;
      else if (f.mt < 0.46) { f.hidden = true; f.alpha = 0.1; const tx = o.x - o.face * 34 * f.d.k; f.x += clamp(tx - f.x, -700 * dt, 700 * dt); }
      else { if (f.hidden) { f.hidden = false; f.face = Math.sign(o.x - f.x) || f.face; SFX.whoosh(); } f.alpha = Math.min(1, (f.alpha || 0.1) + dt * 6); }
    }
    if (k === 'blow' && f.mt > su && f.mt < su + ac) {
      const h = R.jointWorld(f, f.pose, 'head');
      for (let i = 0; i < 3; i++) FX.puff(h[0] + f.face * rnd(10, 40) * f.d.k, h[1] + rnd(-6, 6), 'rgba(250,250,250,0.85)', 1, 2);
    }
    if (k === 'brawl') {
      // 1.3 Burly Brawl: close the gap fast, a slow-motion blur of fists, then a palm strike that sends them across the arena
      const reach = halfW(o) + halfW(f) + 18 * f.d.k, gap = Math.abs(o.x - f.x);
      if (f.mt < su + 0.3 && gap > reach) { f.face = Math.sign(o.x - f.x) || f.face; f.vx = f.face * 560 * f.def.stats.speed; f.x += f.vx * dt; }
      else f.vx = 0;
      if (f.mt > su && f.mt < su + ac && gap <= reach + 22 * f.d.k) {
        const n = Math.floor((f.mt - su) / 0.075);
        if (n !== f.flN) { f.flN = n; f.hitDone = false; if (n % 2) SFX.whoosh(); }
        const fin = f.mt > su + ac - 0.12;
        if (!f.hitDone) tryHit(f, o, fin ? BRAWL_FIN : m);
        if (o.state === 'hit' || o.state === 'block') f.matrix = Math.max(f.matrix || 0, 0.2);
      }
    }
    if (k === 'phase') {
      // 1.3 Phase Dash: a blur straight through the opponent, out the other side
      const u = clamp(f.mt / 0.22, 0, 1), e = u * u * (3 - 2 * u);
      f.x = lerp(f.px0, f.px1, e); f.vx = 0;
      if (u >= 1 && !f.phased) { f.phased = true; f.face = Math.sign(o.x - f.x) || -f.pside; FX.dust(f.x, FLOOR, 8); }
      if (u < 1) { f.phased = false; if (Math.random() < 0.5) FX.dust(f.x, FLOOR, 1); }
    }
    if (k === 'kipup') {
      // 1.3 Kip-Up Spin Kick: spin on the back and sweep up onto the feet
      const n = Math.floor(f.mt / 0.07);
      if (f.mt > su - 0.02 && f.mt < su + ac && n !== f.spinN) { f.spinN = n; f.face = -f.face; if (n % 2) SFX.whoosh(); }
      if (f.mt >= su + ac && !f.kipFaced) { f.kipFaced = true; f.face = Math.sign(o.x - f.x) || f.face; }
      if (f.mt < su) f.kipFaced = false;
      if (f.mt >= su && f.mt <= su + ac && !f.hitDone) { const fc = f.face; f.face = Math.sign(o.x - f.x) || f.face; tryHit(f, o, m); f.face = fc; }
    }
    if (k === 'flurry') {
      if (f.mt > su && f.mt < su + ac) {
        f.vx = f.face * 70; f.x += f.vx * dt;
        const n = Math.floor((f.mt - su) / 0.09);
        if (n !== f.flN) { f.flN = n; f.hitDone = false; SFX.whoosh(); }
        const fin = f.mt > su + ac - 0.1;
        if (!f.hitDone) tryHit(f, o, fin ? FLURRY_FIN : m);
      } else f.vx = 0;
    }
    if (m.lunge) f.vx = f.mt < su + ac ? f.face * m.lunge * (1 - f.mt / (su + ac)) : f.vx * (1 - dt * 12);
    if (m.limb && !f.hitDone && f.mt >= su && f.mt <= su + ac) tryHit(f, o, m);
    if (m.spawn && !f.spawned && f.mt >= su) { f.spawned = true; spawnProj(f); }
    if (!m.spawn) f.spawned = false;
    if (k === 'rush' || k === 'roll' || k === 'slide') {
      if (f.mt > su && f.mt < su + ac && !f.hitDone) f.vx = f.face * m.speed * f.def.stats.speed; else f.vx *= 1 - dt * 10;
      f.x += f.vx * dt;
    }
    if (k === 'leap') {
      if (!m.airborne && f.mt >= su && !f.leapt) { f.leapt = true; m.airborne = true; f.vy = -480; f.vx = clamp((o.x - f.x) / 0.62, -280, 280); }
      if (f.leapt && f.y < FLOOR + 1) {
        f.vy += GRAV * dt; f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.def.fireTrail) FX.fire(f.x, f.y - 40, 1, 0.6);
        if (f.y >= FLOOR && f.vy > 0) {
          f.y = FLOOR; m.airborne = false; f.leapt = false; f.vx = 0; SFX.land(); FX.dust(f.x, FLOOR, 12);
          if (m.quake) { game.shake = 7; SFX.thud(); if (!f.hitDone && grounded(o) && Math.abs(o.x - f.x) < 110 && !invuln(o) && o.state !== 'block') { f.hitDone = true; applyHit(f, o, { dmg: 8, fx: 'trip', snd: 'thud' }, false, o.x, FLOOR - 10); } }
          f.mt = su + ac; // go to recovery
        }
      }
    }
    if (k === 'burrow') {
      if (f.mt < 0.3) { f.sink = f.mt / 0.3; if (Math.random() < 0.6) m.fire ? FX.fire(f.x, FLOOR, 2) : FX.dust(f.x, FLOOR, 2, 'rgba(90,70,40,0.8)'); }
      else if (f.mt < 0.6) { f.hidden = true; f.x += clamp(o.x - f.x, -500 * dt, 500 * dt); }
      else if (f.mt < 0.8) { f.hidden = false; f.sink = Math.max(0, 1 - (f.mt - 0.6) / 0.12); if (Math.random() < 0.6) m.fire ? FX.fire(f.x, FLOOR, 3) : FX.dust(f.x, FLOOR, 3, 'rgba(90,70,40,0.8)'); }
      else f.sink = 0;
    }
    if (k === 'playdead' && f.mt >= su && !m.sprung) { m.sprung = 1; SFX.hiss(); f.vx = f.face * 120; }
    if (k === 'playdead' && f.mt >= su && f.mt < su + ac) f.x += f.face * 260 * dt;
    if (k === 'cloud' && f.mt > su && f.mt < su + ac) {
      for (let i = 0; i < 3; i++) FX.puff(f.x + f.face * rnd(20, 70) * f.d.k, f.y - rnd(40, 95) * f.d.k, pick(['rgba(200,220,240,0.6)', 'rgba(120,180,230,0.5)', 'rgba(230,200,90,0.5)']), 1, 5);
    }
    if (m.box && k !== 'flurry' && k !== 'brawl' && k !== 'kipup' && !f.hitDone && f.mt >= su && f.mt <= su + ac && (k !== 'leap' || f.vy > -60)) tryHit(f, o, m);
    if (f.mt >= su + ac + rc) {
      f.state = m.crouchEnd ? 'crouch' : 'idle'; f.move = null; f.vx = 0; f.sink = 0; f.hidden = false; f.alpha = 1;
      if (m.airborne) { m.airborne = false; f.state = 'jump'; f.airAtk = MV.jkick; f.at = 9; }
    }
  }
  // 1.1 command grabs: hold modes 'drain' (steal health), 'shake' (lift, shake, toss), 'stun' (loom over them until they wilt), 'pull' (reel in from range and slam)
  function updateCgrab(f, o, m, dt) {
    const [su, ac, rc] = m.t, R0 = (m.range || 46) * f.d.k;
    // 1.2.1: one catch per use. Releasing rewinds the clock into the grab window and the foe is left stunned (still grabbable), so without this a stun or drain hold re-grabbed forever.
    if (!f.grabbed && !m.caught && f.mt >= su && f.mt < su + ac + 0.02) {
      const dist = (o.x - f.x) * f.face;
      if (dist > -6 && dist < R0 + halfW(o) && grounded(o) && !invuln(o) && (actionable(o) || o.state === 'hit')) {
        m.caught = true; f.grabbed = true; o.state = 'held'; o.heldBy = f; o.ht = 0; o.heldUp = m.hold !== 'pull'; o.hx0 = o.x; f.holdT = 0; o.move = null; SFX.punch();
        if (m.hold === 'pull') { SFX.whoosh(); for (let i = 0; i < 6; i++) FX.puff(lerp(f.x, o.x, i / 6), FLOOR - 60 * f.d.k, 'rgba(230,220,190,0.6)', 1, 2); }
      }
    }
    if (f.grabbed && o.state === 'held') {
      f.mt = Math.min(f.mt, su + ac); f.holdT += dt;
      const t = f.holdT, near = f.x + f.face * (halfW(f) + halfW(o)) * 0.85, pw = f.def.stats.power, dmg = (m.dmg || 12) * pw;
      const end = (fn) => { f.grabbed = false; o.heldUp = false; o.ro.scale = null; f.mt = su + ac; fn(); if (o.hp <= 0 && !o.finishing && game.phase !== 'fight') o.dead = true; };
      if (m.hold === 'pull') {
        const u = ease(t / 0.32); o.x = lerp(o.hx0, near, u); o.y = FLOOR - Math.sin(u * PI) * 36; o.spin = 0;
        if (t >= 0.38) end(() => { damage(o, dmg, f); SFX.big(); game.shake = 6; bleed(o, o.x, FLOOR - 30, 26, f.face, 1.2); launch(o, f.face * 160, -300, 0); });
      } else if (m.hold === 'shake') {
        o.x = f.x + f.face * (halfW(f) * 0.9 + halfW(o) * 0.4); o.y = FLOOR - 26 * f.d.k + Math.sin(t * 42) * 5; o.spin = 0;
        if (Math.floor(t / 0.12) !== f.shN) { f.shN = Math.floor(t / 0.12); SFX.punch(); bleed(o, o.x, o.y - hurtH(o) * 0.8, 4, f.face, 0.6); }
        if (t >= 0.75) end(() => { damage(o, dmg, f); SFX.big(); launch(o, f.face * 380 / Math.sqrt(o.def.stats.weight), -320, 0); });
      } else if (m.hold === 'stun') {
        o.x = near; o.y = FLOOR; o.ro.scale = lerp(1, 0.84, ease(t / 0.6));
        if (Math.random() < 0.3) FX.puff(lerp(f.x, o.x, 0.5), FLOOR - hurtH(f) * 0.85, 'rgba(255,255,255,0.4)', 1, 1);
        if (t >= 0.85) end(() => { damage(o, dmg * 0.6, f); if (m.silence) o.silenceT = m.silence; o.state = 'hit'; o.st = 0; o.daze = true; o.vx = f.face * 40; o.snapPose = true; SFX.squeak(); banner(m.word || 'STUNNED', { size: 12, fill: 'gold', life: 1.1, y: 96, x: o === p1 ? W * 0.27 : W * 0.73 }); });
      } else {
        o.x = near; o.y = FLOOR;
        const per = dmg / 0.9 * dt; damage(o, per, f); if (f.hp > 0) f.hp = Math.min(100, f.hp + per * 0.8);
        if (Math.random() < 0.5) { const a = R.jointWorld(o, o.pose, 'chest'); FX.spark(a[0], a[1], '#ffd860', 2); }
        if (t >= 0.9) end(() => { SFX.big(); o.state = 'hit'; o.st = 0; o.stunT = 0.4; o.vx = f.face * 160; o.snapPose = true; banner(m.word || 'DRAINED', { size: 12, fill: 'gold', life: 1.1, y: 96, x: f === p1 ? W * 0.27 : W * 0.73 }); });
      }
      return;
    }
    if (f.mt >= su + ac + rc) { f.state = 'idle'; f.move = null; f.grabbed = false; }
  }
  const BRAWL_FIN = { dmg: 10, box: [0, 52, 30, 116], fx: 'knock', vy: -340, vx: 560, spin: 0, snd: 'big', nocap: 1 };
  const FLURRY_FIN = { dmg: 6, box: [0, 50, 30, 112], fx: 'knock', vy: -300, vx: 250, spin: 0, snd: 'big', paper: 1, nocap: 1 };
  // body targets for contact checks, built from the defender's current pose
  const TGT = [['head', 10], ['chest', 12], ['belly', 12], ['hip', 11], ['kneeF', 7], ['kneeB', 7], ['footF', 6], ['footB', 6]];
  function contact(f, o, m) {
    const pose = m.keys ? R.track(f.d, m.keys, f.mt) : m.pose || f.pose;
    const sp = R.jointWorld(f, pose, m.limb), k = f.d.k, ok = o.d.k;
    const base = R.jointWorld(f, pose, m.limb === 'toeF' ? 'kneeF' : m.limb === 'handBx' ? 'elbowB' : 'elbowF');
    let best = null, bd = 1e9;
    const vx = sp[0] - base[0], vy = sp[1] - base[1], vl = vx * vx + vy * vy || 1;
    for (const [j, r] of TGT) {
      const p = R.jointWorld(o, o.pose, j);
      const u = Math.max(0, Math.min(1, ((p[0] - base[0]) * vx + (p[1] - base[1]) * vy) / vl)), q = [base[0] + vx * u, base[1] + vy * u];
      const d = Math.hypot(p[0] - q[0], p[1] - q[1]) - (r * ok + m.rad * k * (0.6 + 0.4 * u));
      if (d < bd) { bd = d; best = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; }
    }
    if (bd < 0) return best;
    // point blank: when the bodies are jammed together the fist is already past the target
    const ahead = (o.x - f.x) * f.face, reach = (sp[0] - f.x) * f.face + halfW(o);
    if (ahead > -4 && ahead < reach && sp[1] > o.y - hurtH(o) - 6 && sp[1] < o.y + 4) return [(f.x + o.x) / 2 + f.face * 4, sp[1]];
    return null;
  }
  function tryHit(f, o, m) {
    if (dodging(o) && o.move.kind === 'bdodge') { o.dodged = true; return; }
    if (parrying(o) && Math.sign(f.x - o.x) === o.face && !o.parried) {
      // the parry eats the hit and knocks the attacker back
      if (m.air) f.airHit = true; else f.hitDone = true;
      o.parried = true; SFX.clang(); game.freeze = 0.1; FX.spark((f.x + o.x) / 2, o.y - hurtH(o) * 0.6, '#ffe8a0', 16);
      banner(o.move.word || 'COUNTERED', { size: 13, fill: 'gold', life: 1.1, y: 96, x: o === p1 ? W * 0.27 : W * 0.73 });
      if (f.state === 'attack') { f.state = 'idle'; f.move = null; }
      applyHit(o, f, PARRY_HIT, false, f.x, f.y - hurtH(f) * 0.6);
      return;
    }
    if (invuln(o) || o.state === 'script' || o.state === 'held') return;
    let cx, cy;
    if (m.limb) { const c = contact(f, o, m); if (!c) return; cx = c[0]; cy = c[1]; }
    else { const a = atkbox(f, m.box), b = hurtbox(o); if (!overlap(a, b)) return; cx = (Math.max(a.x0, b.x0) + Math.min(a.x1, b.x1)) / 2; cy = (Math.max(a.y0, b.y0) + Math.min(a.y1, b.y1)) / 2; }
    if (m.air) f.airHit = true; else f.hitDone = true;
    f.vx = 0;
    // a defender pinned at the edge cannot slide away, so the attacker gets pushed back instead
    const [lo, hi] = limits(); if (!m.air && (o.x < lo + 10 || o.x > hi - 10)) { f.bvx = -f.face * 220; f.bst = 0.16; }
    const facing = Math.sign(f.x - o.x) === o.face || Math.abs(f.x - o.x) < 3;
    const blocked = (o.state === 'block' || o.state === 'cblock') && facing && !(m.low && o.state === 'block' && false);
    applyHit(f, o, m, blocked, cx, cy);
    if (!blocked && (m.kind === 'flurry' || m.paper)) { const w = o.st2.wounds || (o.st2.wounds = []); if (w.length < 24) w.push({ j: pick(['head', 'chest', 'chest', 'belly', 'armF']), dx: rnd(-4, 8), dy: rnd(-6, 6), r: 0.9, a: rnd(0, 3), drip: rnd(3, 8) }); FX.spark(cx, cy, '#fffbe8', 4); }
    if (m.kind === 'rush' || m.kind === 'roll' || m.kind === 'slide') { f.mt = m.t[0] + m.t[1]; f.vx = -f.face * 60; }
  }

  // ---------- projectiles ----------
  function spawnProj(f) {
    const sp = (f.curSp && f.curSp.kind === 'proj' && f.curSp.proj) || f.def.proj, kind = sp.kind, k = f.d.k;
    const base = { o: f, kind, x: f.x + f.face * 32 * k, y: FLOOR - 78 * k, vx: f.face * 270, vy: 0, t: 0, w: 12, h: 10, dmg: 9, grav: 0 };
    const C = G.projectiles[kind];
    if (C) { spawnCustom(f, sp, C, base); return; }
    SFX.proj();
    const list = [];
    if (kind === 'wave') list.push(Object.assign(base, { y: FLOOR - 8, h: 8, w: 12, vx: f.face * 230, low: 1 }));
    else if (kind === 'can') list.push(Object.assign(base, { vy: -170, grav: 420, w: 10, h: 10, dmg: 11 }));
    else if (kind === 'gust') list.push(Object.assign(base, { w: 14, h: 18, vx: f.face * 240, dmg: 6, push: 260 }));
    else if (kind === 'shards') { for (const v of [-70, 0, 70]) list.push(Object.assign({}, base, { vy: v, dmg: 6, w: 6, h: 5 })); }
    else if (kind === 'feather') { for (const v of [-40, 0, 40]) list.push(Object.assign({}, base, { vy: v, vx: f.face * 300, dmg: 5, w: 8, h: 5 })); }
    else if (kind === 'drumstick') list.push(Object.assign(base, { vy: -150, grav: 380, vx: f.face * 240, w: 12, h: 10, dmg: 11 }));
    else if (kind === 'spray') list.push(Object.assign(base, { vx: f.face * 160, w: 10, h: 10, dmg: 3, life: 0.5 }));
    else if (kind === 'howl') list.push(Object.assign(base, { y: FLOOR - 92 * k, w: 14, h: 20, vx: f.face * 250, dmg: 6, push: 280 }));
    else if (kind === 'book') list.push(Object.assign(base, { vy: -200, grav: 520, vx: f.face * 260, w: 10, h: 10, dmg: 11 }));
    else if (kind === 'notice') list.push(Object.assign(base, { vx: f.face * 210, w: 10, h: 9, dmg: 10 }));
    else if (kind === 'hellfire') list.push(Object.assign(base, { vx: f.face * 320, w: 12, h: 10, dmg: 11 }));
    else if (kind === 'oil') list.push(Object.assign(base, { y: FLOOR - 8, h: 7, w: 14, vx: f.face * 220, low: 1, dmg: 7, trip: 1 }));
    else if (kind === 'log') list.push(Object.assign(base, { y: FLOOR - 70 * k, vy: -60, grav: 300, vx: f.face * 280, w: 13, h: 10, dmg: 10 }));
    else if (kind === 'shimmer') list.push(Object.assign(base, { vx: f.face * 300, w: 10, h: 10, dmg: 5, blind: 1 }));
    else if (kind === 'teeth') { for (const v of [-55, 0, 55]) list.push(Object.assign({}, base, { vy: v, vx: f.face * 320, dmg: 4, w: 6, h: 5 })); }
    else if (kind === 'poop') list.push(Object.assign(base, { y: FLOOR - 52, vy: -120, grav: 300, vx: f.face * 250 }));
    else list.push(base);
    for (const p of list) projs.push(p);
    f.projOut = 1.4;
  }
  // 1.1 game-defined projectiles: GAME.projectiles[kind] = { speed, vy, grav, dmg, w, h, y, low, trip, blind, slow, push, launch: [vx, vy], fx,
  //   life, bounce, spread: [vy...], burst: { n, gap }, sky: { count, spread, delay, gap, speed }, boomerang, fire, ghost, cool, sfx, hitSfx, word, draw(g, p, s, t) }
  function spawnCustom(f, sp, C, base) {
    const o = f === p1 ? p2 : p1, k = f.d.k, list = [];
    const one = x => Object.assign({}, base, { C, vx: f.face * (C.speed != null ? C.speed : 270), vy: C.vy || 0, grav: C.grav || 0, dmg: C.dmg != null ? C.dmg : 9, w: C.w || 10, h: C.h || 8,
      y: C.y != null ? FLOOR - C.y * k : base.y, low: C.low ? 1 : 0, trip: C.trip, blind: C.blind, slow: C.slow, push: C.push, life: C.life, delay: 0 }, x);
    if (C.sky) { const n = C.sky.count || 1; for (let i = 0; i < n; i++) list.push(one({ x: o.x + (i - (n - 1) / 2) * (C.sky.spread || 44) + rnd(-10, 10), y: -30, vx: 0, vy: C.sky.speed || 560, grav: 0, delay: (C.sky.delay != null ? C.sky.delay : 0.35) + i * (C.sky.gap || 0.16), sky: 1 })); }
    else if (C.spread) for (const v of C.spread) list.push(one({ vy: v }));
    else if (C.burst) for (let i = 0; i < C.burst.n; i++) list.push(one({ delay: i * C.burst.gap, vy: C.burst.jitter ? rnd(-C.burst.jitter, C.burst.jitter) : (C.vy || 0) }));
    else list.push(one({}));
    for (const p of list) projs.push(p);
    if (C.sfx && SFX[C.sfx]) SFX[C.sfx](); else SFX.proj();
    f.projOut = C.cool || 1.4;
  }
  function updateProjs(dt) {
    for (const p of projs) {
      if (p.delay > 0) { p.delay -= dt; if (!p.sky) { p.x = p.o.x + p.o.face * 32 * p.o.d.k; p.vx = Math.abs(p.vx) * p.o.face; } if (p.delay > 0) continue; if (p.sky && p.C.sfx2 && SFX[p.C.sfx2]) SFX[p.C.sfx2](); }
      p.t += dt; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y > FLOOR - 4 && p.grav) { p.y = FLOOR - 4; p.vy = -Math.abs(p.vy) * (p.C && p.C.bounce != null ? p.C.bounce : 0.4); }
      if (p.C) {
        if (p.C.fire && Math.random() < 0.8) FX.fire(p.x - Math.sign(p.vx || 1) * 4, p.y, 1, 0.6);
        if (p.sky && p.y >= FLOOR - 4) { p.dead = true; SFX.thud(); FX.dust(p.x, FLOOR, 14); if (p.C.fire) FX.fire(p.x, FLOOR - 4, 6, 1); game.shake = Math.max(game.shake, 4); }
        if (p.C.boomerang && !p.back && p.t > (p.C.turn || 0.5)) { p.back = true; p.vx = -p.vx; }
        if (p.back && Math.abs(p.x - p.o.x) < 18) { p.dead = true; continue; }
      }
      if (p.kind === 'hellfire' || p.kind === 'bball') FX.fire(p.x - Math.sign(p.vx) * 4, p.y, 1, 0.7);
      if (p.kind === 'wave' && Math.random() < 0.7) FX.puff(p.x, FLOOR - 4, 'rgba(120,170,210,0.6)', 1, 2);
      const v = p.o === p1 ? p2 : p1;
      const box = { x0: p.x - p.w, x1: p.x + p.w, y0: p.y - p.h, y1: p.y + p.h };
      if (dodging(v) && v.move.kind === 'bdodge' && overlap(box, hurtbox(v))) v.dodged = true;
      if (parrying(v) && !p.sky && overlap(box, hurtbox(v)) && Math.sign(p.x - v.x) === v.face) {
        // knocked straight back the way it came
        p.o = v; p.vx = -p.vx * 1.15; p.back = false; p.hitV = false; if (p.C) p.C = Object.assign({}, p.C, { boomerang: false });
        v.parried = true; SFX.clang(); FX.spark(p.x, p.y, '#ffe8a0', 12); continue;
      }
      if (!invuln(v) && v.state !== 'script' && !p.hitV && overlap(box, hurtbox(v))) {
        if (p.C && p.C.boomerang && !p.back) { p.back = true; p.vx = -p.vx; p.hitV = true; } else p.dead = true;
        const blocked = (v.state === 'block' || v.state === 'cblock') && Math.sign(p.x - v.x) === v.face;
        const mv = { dmg: p.dmg, fx: p.push ? 'knock' : 'stun', vx: p.push || 0, vy: -200, stun: 0.42, push: 110, snd: 'big', chip: 1 };
        if (p.kind === 'gust' || p.kind === 'howl') { mv.fx = 'stun'; mv.push = p.push; mv.stun = 0.3; }
        if (p.trip) mv.fx = 'trip';
        if (p.blind) mv.fx = 'blind';
        if (p.slow) { mv.fx = 'slow'; mv.slowT = p.C && p.C.slowT; }
        if (p.C) { if (p.C.fx) mv.fx = p.C.fx; if (p.C.launch) { mv.vx = p.C.launch[0]; mv.vy = p.C.launch[1]; } if (p.C.hitSfx && SFX[p.C.hitSfx]) SFX[p.C.hitSfx](); if (p.C.word) banner(p.C.word, { size: 14, fill: p.C.wordFill || 'gold', life: 1.1, y: 96, x: v === p1 ? W * 0.27 : W * 0.73 }); if (p.C.burstGibs) FX.burst(p.x, p.y, 3, p.C.burstGibs); }
        if (p.kind === 'log') { mv.fx = 'knock'; mv.vx = 220; mv.vy = -320; SFX.thud(); }
        if (p.kind === 'shimmer') { game.flash = 0.08; SFX.ding(); }
        if (p.kind === 'book') { SFX.thud(); FX.burst(p.x, p.y, 2, ['tooth']); }
        if (p.kind === 'notice') banner('EVICTED', { size: 16, fill: 'blood', life: 1.1, y: 96, x: v === p1 ? W * 0.27 : W * 0.73 });
        applyHit(p.o, v, mv, blocked, p.x, p.y, p);
        if (p.kind === 'can') { FX.burst(p.x, p.y, 4, ['chunk', 'bone', 'poop']); SFX.clang(); }
        if (p.kind === 'drumstick') FX.burst(p.x, p.y, 3, ['chunk', 'bone']);
        if (p.kind === 'poop') FX.puff(p.x, p.y, 'rgba(90,60,26,0.9)', 10, 3);
      }
      for (const q of projs) if (q !== p && q.o !== p.o && !q.dead && !(q.delay > 0) && !q.sky && !p.sky && Math.abs(q.x - p.x) < p.w + q.w && Math.abs(q.y - p.y) < p.h + q.h) { p.dead = q.dead = true; FX.spark(p.x, p.y, '#fff', 14); SFX.block(); }
      if (p.x < cam - 60 || p.x > cam + VW() + 60 || p.t > (p.life || 4)) p.dead = true;
    }
    for (const p of projs) if (p.dead) p.o.projOut = Math.min(p.o.projOut, 0.25);
    projs = projs.filter(p => !p.dead);
  }
  function drawProj(g, p) {
    const s = Math.sign(p.vx) || 1, t = p.t;
    if (p.delay > 0) { if (p.sky && p.C.warn !== false) { g.fillStyle = `rgba(255,40,20,${0.3 + Math.sin(game.time * 30) * 0.2})`; g.beginPath(); g.ellipse(p.x, FLOOR, 12, 3, 0, 0, PI * 2); g.fill(); } return; }
    if (p.C) {
      if (p.C.ghost) { drawSil(g, p.o, p.x, FLOOR, s, PS.rush(t * 22), p.C.ghost === true ? '#30ff80' : p.C.ghost, 0.55); return; }
      g.save(); g.translate(p.x, p.y); if (p.C.draw) p.C.draw(g, p, s, t, R); g.restore(); return;
    }
    g.save(); g.translate(p.x, p.y); g.scale(1.4, 1.4);
    switch (p.kind) {
      case 'poop': R.ball(g, 0, 3, 5, '#5a3a1a'); R.ball(g, 0, -1, 4, '#6a4422'); R.ball(g, 0.5, -4.5, 2.5, '#7a5028'); g.fillStyle = 'rgba(120,140,40,0.6)'; for (let i = 0; i < 3; i++) g.fillRect(-s * (6 + i * 4), -6 + Math.sin(t * 20 + i) * 3, 2, 2); break;
      case 'knife': g.rotate(t * 22 * s); R.poly(g, [[-8, -1.5], [8, 0], [-8, 1.5]], '#d8dce4'); g.fillStyle = '#6a4a2a'; g.fillRect(-11, -1.6, 4, 3.2); break;
      case 'hairball': g.rotate(t * 8); R.ball(g, 0, 0, 6, '#7a7a52'); for (let i = 0; i < 10; i++) R.line(g, 0, 0, Math.cos(i) * 8, Math.sin(i * 1.3) * 8, '#5a5a3a', 0.8); g.fillStyle = 'rgba(150,200,60,0.7)'; g.fillRect(-2, 3, 3, 4); break;
      case 'card': g.rotate(t * 16 * s); g.fillStyle = '#f4f2e8'; g.fillRect(-7, -4.5, 14, 9); g.fillStyle = '#2a3a8a'; for (let i = 0; i < 3; i++) g.fillRect(-5, -2.5 + i * 2.5, 10, 0.8); break;
      case 'bball': g.rotate(t * 12 * s); R.ball(g, 0, 0, 10, '#e0701a'); R.line(g, -10, 0, 10, 0, '#2a1004', 1.1); R.line(g, 0, -10, 0, 10, '#2a1004', 1.1); g.strokeStyle = '#2a1004'; g.lineWidth = 0.9; g.beginPath(); g.arc(-13, 0, 10, -0.8, 0.8); g.stroke(); g.beginPath(); g.arc(13, 0, 10, PI - 0.8, PI + 0.8); g.stroke(); break;
      case 'gust': for (let i = 0; i < 3; i++) { g.strokeStyle = `rgba(220,240,255,${0.7 - i * 0.2})`; g.lineWidth = 2; g.beginPath(); g.arc(-s * i * 6, 0, 8 + i * 3 + Math.sin(t * 20) * 2, s > 0 ? -1 : PI - 1, s > 0 ? 1 : PI + 1); g.stroke(); } break;
      case 'can': g.rotate(t * 10 * s); g.fillStyle = '#8a8a90'; g.fillRect(-7, -8, 14, 16); g.fillStyle = '#b0b0b8'; g.fillRect(-7, -8, 14, 2); for (let i = -5; i < 7; i += 3) g.fillRect(i, -6, 0.8, 13); g.fillStyle = '#5a4a2a'; g.fillRect(-4, -11, 7, 3); break;
      case 'wave': g.fillStyle = 'rgba(100,160,210,0.85)'; g.beginPath(); g.moveTo(-14 * s, 8); g.quadraticCurveTo(0, -12 - Math.sin(t * 18) * 3, 14 * s, 8); g.fill(); g.fillStyle = 'rgba(230,245,255,0.8)'; g.fillRect(-3, -4, 6, 2); break;
      case 'shards': g.rotate(t * 18); R.poly(g, [[-6, -2], [7, 0], [-4, 3]], 'rgba(190,230,250,0.9)'); break;
      case 'feather': g.scale(s, 1); g.rotate(Math.atan2(p.vy, Math.abs(p.vx))); g.fillStyle = '#b0141c'; g.beginPath(); g.moveTo(9, 0); g.quadraticCurveTo(0, -4, -9, -2); g.lineTo(-7, 0); g.lineTo(-9, 2); g.quadraticCurveTo(0, 4, 9, 0); g.fill(); R.line(g, -10, 0, 10, 0, '#4a0408', 0.7); g.fillStyle = '#e8e0d0'; g.fillRect(8, -0.6, 3, 1.2); break;
      case 'drumstick': g.rotate(t * 11 * s); R.ball(g, -2, 0, 6, '#8a4a1a'); R.ball(g, -3, -2, 3, '#b8702a'); g.fillStyle = '#7a3a12'; g.beginPath(); g.moveTo(2, -3); g.lineTo(9, -1.4); g.lineTo(9, 1.4); g.lineTo(2, 3); g.fill(); R.ball(g, 10, -1.6, 1.8, '#f0e8d4'); R.ball(g, 10, 1.6, 1.8, '#f0e8d4'); break;
      case 'spray': for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(255,140,60,${0.5 - i * 0.07})`; g.beginPath(); g.arc(-s * i * 3, Math.sin(t * 30 + i) * 2, 3 + i * 1.2, 0, PI * 2); g.fill(); } break;
      case 'howl': for (let i = 0; i < 4; i++) { g.strokeStyle = `rgba(230,220,255,${0.75 - i * 0.16})`; g.lineWidth = 1.6; g.beginPath(); g.arc(-s * i * 5, 0, 5 + i * 3.5 + Math.sin(t * 24 + i) * 1.5, s > 0 ? -1.1 : PI - 1.1, s > 0 ? 1.1 : PI + 1.1); g.stroke(); } break;
      case 'book': g.rotate(t * 9 * s); g.fillStyle = '#6a1420'; g.fillRect(-7, -5, 14, 10); g.fillStyle = '#f0e8d0'; g.fillRect(-6, -4, 12, 8); g.fillStyle = '#6a1420'; g.fillRect(-7, -5, 14, 2.4); g.fillStyle = '#d8b040'; g.fillRect(-4, -4.6, 8, 0.8); break;
      case 'notice': g.rotate(Math.sin(t * 14) * 0.35); g.fillStyle = '#f2eedc'; g.fillRect(-6, -8, 12, 16); g.fillStyle = '#b01018'; g.font = '5px Anton, Impact, sans-serif'; g.fillText('EVICT', -5.5, -2); g.fillStyle = 'rgba(40,40,40,0.6)'; for (let i = 0; i < 4; i++) g.fillRect(-5, 1 + i * 1.8, 10, 0.7); g.strokeStyle = '#b01018'; g.lineWidth = 0.8; g.strokeRect(-4, -7, 8, 6); break;
      case 'hellfire': R.ball(g, 0, 0, 7, '#ff6a10'); R.ball(g, 1, -1, 4, '#ffe060'); break;
      case 'oil': g.scale(s, 1); g.fillStyle = 'rgba(10,10,14,0.92)'; g.beginPath(); g.moveTo(10, 0); g.quadraticCurveTo(0, -5 - Math.sin(t * 20) * 1.5, -14, -1); g.quadraticCurveTo(-4, 4, 10, 0); g.fill(); g.fillStyle = 'rgba(140,150,200,0.5)'; g.fillRect(-4, -2.5, 8, 0.9); R.ball(g, -16, 2 + Math.sin(t * 25) * 2, 1.6, '#0a0a0e'); break;
      case 'log': g.rotate(t * 9 * s); g.fillStyle = '#5a3a1e'; g.fillRect(-11, -4.5, 22, 9); g.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = -8; i < 10; i += 4) g.fillRect(i, -4.5, 1, 9); g.fillStyle = '#c8a070'; g.beginPath(); g.ellipse(11, 0, 2.4, 4.5, 0, 0, PI * 2); g.fill(); g.strokeStyle = '#8a6030'; g.lineWidth = 0.6; g.beginPath(); g.ellipse(11, 0, 1.2, 2.4, 0, 0, PI * 2); g.stroke(); break;
      case 'shimmer': { g.rotate(t * 10); for (let i = 0; i < 8; i++) { g.rotate(PI / 4); g.fillStyle = `rgba(240,244,255,${i % 2 ? 0.5 : 0.9})`; g.beginPath(); g.moveTo(0, 0); g.lineTo(-1.2, -(i % 2 ? 6 : 11)); g.lineTo(1.2, -(i % 2 ? 6 : 11)); g.fill(); } R.ball(g, 0, 0, 3.4, '#d8dce6'); R.ball(g, 0, 0, 1.4, '#7a808a'); g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(0, 0, 9 + Math.sin(t * 30) * 2, 0, PI * 2); g.fill(); break; }
      case 'teeth': g.rotate(t * 20 * s); g.fillStyle = '#f4f0e4'; g.beginPath(); g.moveTo(-2.5, -3); g.lineTo(2.5, -3); g.lineTo(1.6, 2); g.lineTo(0, 4); g.lineTo(-1.6, 2); g.fill(); g.fillStyle = '#c86a6a'; g.fillRect(-2.5, -3.6, 5, 1); break;
    }
    g.restore();
  }

  // ---------- victory poses: each winner celebrates in character ----------
  function setWin(f) { if (f.state === 'win') return; f.state = 'win'; f.winAt = f.t; f.wf = {}; f.snapPose = false; }
  const once = (f, key, t, at) => { if (t >= at && !f.wf[key]) { f.wf[key] = 1; return true; } return false; };
  // victory poses come from the game: GAME.winPoses(kit) returns { id: { fp(t), fx(f, t), draw(g, f, t) } }
  const WIN = G.winPoses ? G.winPoses({ R, P, PI, FX, SFX, FLOOR, game, once, once2, fj, hurtH, rnd, pick, clamp, lerp, ease }) : {};
  function once2(t) { return Math.sin(t * 5) > 0.8 ? 0.6 : 0; }
  // victory poses turn to face the camera: a quick squash out of profile, then the front view
  const TURN = 0.12;
  function fj(f, name) { if (f.fj && f.fj[name]) return f.fj[name]; return R.jointWorld(f, f.pose, { handR: 'handFx', handL: 'handBx' }[name] || name); }
  function winT(f) { return f.t - (f.winAt ?? f.t); }
  function winPose(f) { return PS.win(f.t); }
  function frontPose(f, t) { const w = WIN[f.def.id]; return w && w.fp ? w.fp(t) : { aL: [2.7, 0.3], aR: [2.7, 0.3] }; }
  function winFx(f) { if (!f.wf) f.wf = {}; const w = WIN[f.def.id], t = winT(f) - 0.3; if (w && w.fx && t >= 0 && f.fj) w.fx(f, t); }

  // ---------- pose + camera ----------
  function targetPose(f) {
    const t = f.t;
    switch (f.state) {
      case 'idle': return PS.stance(t);
      case 'walk': return PS.walk(f.wph);
      case 'crouch': return PS.crouch;
      case 'block': return PS.block;
      case 'cblock': return PS.cblock;
      case 'jump':
        if (f.airAtk === MV.hang) return f.at > MV.hang.t[0] + MV.hang.t[1] ? PS.hammer : f.hangN % 2 ? PS.hangB : PS.hangA;
        return f.airAtk && f.at < f.airAtk.t[0] + f.airAtk.t[1] + 0.1 ? f.airAtk.pose : PS.jump;
      case 'hit': return f.blind > 0 ? PS.blind(t) : f.daze ? PS.dizzy(t * 2) : f.low ? PS.hitLow : PS.hitHigh;
      case 'air': return f.wad ? PS.wad : PS.air(-f.spin, f.t);
      case 'held': return f.wadHeld ? PS.wad : f.heldUp ? PS.heldUp(f.t) : Object.assign(PS.air(f.spin, f.t), { aF: [2.6, 0.4], aB: [2.4, 0.5] });
      case 'down': return PS.down(f);
      case 'getup': return PS.crouch;
      case 'dizzy': return PS.dizzy(t);
      case 'win': return winPose(f);
      case 'script': return f.scriptPose || PS.stance(t);
      case 'attack': {
        const m = f.move, k = m.kind;
        if (m.keys) return R.track(f.d, m.keys, f.mt);
        if (k === 'rush') return PS.rush(f.mt * 22);
        if (k === 'roll') return Object.assign({}, PS.tuck, { rot: f.mt * 20, hyA: (f.d.thigh + f.d.shin) * 0.55 });
        if (k === 'slide') return PS.slide;
        if (k === 'leap') return f.vy < 0 && f.leapt ? PS.jump : f.leapt ? PS.dive : PS.crouch;
        if (k === 'cloud') return f.mt < m.t[0] ? PS.proj0 : PS.proj1;
        if (k === 'burrow') return f.mt < 0.6 ? PS.crouch : PS.up1;
        if (k === 'playdead') return f.mt < m.t[0] ? PS.down(f) : PS.up1;
        if (k === 'bdodge') return f.mt < 0.04 ? PS.crouch : f.mt < 0.66 ? PS.limbo : PS.crouch;
        if (k === 'wallrun') { const r = PS.run(f.wph || 0); return f.mt < 0.16 ? r : Object.assign({}, r, { rot: -PI / 2, piv: 2, lean: 0.2 }); }
        if (k === 'taunt') return PS.mirror(f.mt);
        if (k === 'blow') return f.mt < m.t[0] ? PS.proj0 : PS.blow;
        if (k === 'brawl') { const n = Math.floor(f.mt / 0.0375); return f.mt < m.t[0] ? PS.crouch : f.mt > m.t[0] + m.t[1] - 0.12 && f.mt < m.t[0] + m.t[1] + 0.12 ? PS.jab : f.mt >= m.t[0] + m.t[1] ? STANCE : [PS.jab, PS.jab2, PS.chopUp, PS.jab2][n % 4]; }
        if (k === 'phase') return f.mt < 0.24 ? Object.assign({}, PS.sneak, { lean: 0.75 }) : STANCE;
        if (k === 'kipup') return f.mt < m.t[0] ? PS.down(f) : f.mt < m.t[0] + m.t[1] ? PS.sw1 : PS.crouch;
        if (k === 'flurry') { const n = Math.floor(f.mt / 0.045); return f.mt < m.t[0] ? STANCE : [PS.chopUp, PS.chopDn, PS.chopUp2, PS.chopDn2][n % 4]; }
        if (k === 'sneak') return f.mt < 0.46 ? PS.sneak : f.mt < 0.66 ? PS.jab2 : STANCE;
        if (k === 'swing') return f.mt < m.t[0] ? PS.windup : f.mt < m.t[0] + m.t[1] + 0.1 ? PS.strike : STANCE;
        if (k === 'rise') return f.mt < m.t[0] ? PS.crouch : f.leapt && f.vy < 120 ? PS.riseUp : PS.up2;
        if (k === 'parry') return f.mt < m.t[0] + m.t[1] ? PS.parry : STANCE;
        if (k === 'cgrab') return f.grabbed ? (m.hold === 'stun' ? PS.loom : m.hold === 'shake' ? PS.liftUp : m.hold === 'pull' ? PS.lift : PS.grab) : f.mt < m.t[0] + m.t[1] ? PS.grab : STANCE;
        if (k === 'rollover') return PS.stance(f.t);
        return STANCE;
      }
    }
    return STANCE;
  }
  function updatePose(f, dt) {
    let tgt = targetPose(f);
    if (f.def.chair) tgt = chairPose(f, tgt);
    const fast = f.state === 'air' || f.state === 'held' || f.state === 'script' || f.state === 'jump' || f.state === 'hit';
    const snap = f.snapPose || (f.state === 'attack' && f.move && (f.move.keys || f.move.kind === 'flurry' || f.move.kind === 'wallrun')) || f.state === 'air' || (f.state === 'jump' && f.airAtk === MV.hang);
    const rate = snap ? 1 : Math.min(1, dt * (fast ? 40 : 24));
    f.snapPose = false;
    const tr = R.resolve(f.d, tgt);
    // spin angles take the short way round
    while (tr.rot - f.pose.rot > PI) f.pose.rot += 2 * PI;
    while (tr.rot - f.pose.rot < -PI) f.pose.rot -= 2 * PI;
    f.pose = R.lerp(f.d, f.pose, tr, rate);
    f.st2 = Object.assign(f.st2 || {}, { move: f.state === 'attack' && f.move ? (f.move.kind || null) : null, mname: f.state === 'attack' && f.move ? f.move.name : null, mt: f.mt, wheel: f.x / (f.d.shin * 0.55), slow: f.slowT > 0, wounds: f.st2.wounds || [], t: f.t, dead: f.dead && f.state !== 'script' ? true : f.st2.dead, hurt: ['hit', 'air', 'down'].includes(f.state) && !f.dead, claws: f.state === 'attack', axe: f.state === 'script' ? f.st2.axe : false, pd: f.state === 'script' ? f.st2.pd : !!(f.state === 'attack' && f.move && f.move.kind === 'playdead' && f.mt < f.move.t[0]) });
  }
  function separate() {
    if (!p1 || !p2) return;
    const a = p1, b = p2;
    const both = ['script', 'held'];
    if (both.includes(a.state) || both.includes(b.state) || a.hidden || b.hidden || [a, b].some(f => f.state === 'attack' && f.move && (f.move.kind === 'wallrun' || f.move.kind === 'phase'))) return;
    const ha = a.y < FLOOR - 40 || b.y < FLOOR - 40;
    const minD = (halfW(a) + halfW(b)) * 0.78;
    const dx = b.x - a.x;
    if (!ha && Math.abs(dx) < minD) {
      const push = (minD - Math.abs(dx)) / 2, s = dx >= 0 ? 1 : -1;
      a.x -= push * s; b.x += push * s;
    }
  }
  const ZMIN = 0.74;
  const VW = () => W / zoom;
  function limits() { return [Math.max(20, cam + VW() * 0.25), Math.min(AW - 20, cam + VW() * 0.75)]; }
  function updateCam(dt) {
    if (game.phase === 'fatality') { zoom = 1; camDY = 0; return; }
    const w = game.winner;
    if (w && w.state === 'win' && ['roundend', 'matchend', 'fatalend'].includes(game.phase)) {
      const topW = w.y - hurtH(w) * 1.32, zt = clamp((FLOOR + 14 - 72) / Math.max(1, FLOOR - topW), 0.8, 1.18);
      zoom += (zt - zoom) * Math.min(1, dt * 2.5); camDY += (14 - camDY) * Math.min(1, dt * 2.5);
      const tc = clamp(w.x - VW() / 2, 0, AW - VW());
      cam += (tc - cam) * Math.min(1, dt * 3);
      p1.px = p1.x; p2.px = p2.x;
      return;
    }
    camDY += (0 - camDY) * Math.min(1, dt * 4);
    const ext = f => (f.state === 'down' || f.state === 'air') ? -f.face * hurtH(f) * 0.45 : 0;
    // stop whoever is walking or flying away once they reach the widest shot
    const maxSep = W / ZMIN * 0.48;
    const c1 = p1.x + ext(p1), c2 = p2.x + ext(p2), sep = Math.abs(c1 - c2);
    if (sep > maxSep && p1.state !== 'script' && p2.state !== 'script') {
      const over = sep - maxSep, s = Math.sign(c2 - c1) || 1;
      const a1 = Math.max(0, -(p1.x - (p1.px ?? p1.x)) * s), a2 = Math.max(0, (p2.x - (p2.px ?? p2.x)) * s), tot = a1 + a2;
      const w1 = tot > 0 ? a1 / tot : 0.5;
      p1.x += s * over * w1; p2.x -= s * over * (1 - w1);
    }
    // zoom out a little as the fighters spread apart
    const want = clamp(W * 0.52 / Math.max(1, sep), ZMIN, 1);
    zoom += (want - zoom) * Math.min(1, dt * 3);
    // the shot only moves when someone gets near the edge of the middle area, so nobody is dragged
    const vw = VW(), m = vw * 0.33, mn = Math.min(c1, c2), mx = Math.max(c1, c2);
    let lo2 = mx - vw + m, hi2 = mn - m, tcam;
    if (lo2 <= hi2) tcam = clamp(cam, lo2, hi2); else tcam = (mn + mx) / 2 - vw / 2;
    tcam = clamp(tcam, 0, AW - vw);
    cam += (tcam - cam) * Math.min(1, dt * 9);
    const [lo, hi] = limits();
    for (const f of [p1, p2]) {
      if (f.state === 'script' || f.state === 'held') continue;
      const e = ext(f);
      f.x = clamp(f.x + e, lo, hi) - e;
    }
    p1.px = p1.x; p2.px = p2.x;
  }

  function step(dt) {
    if (screen !== 'play' || paused) { press.P = press.K = false; return; }
    if (game.slow > 0) { game.slow -= dt; dt *= 0.38; }
    game.time += dt; game.pt += dt;
    if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 18);
    if (game.flash > 0) game.flash -= dt;
    if (game.toasty > 0) game.toasty -= dt;
    for (const b of game.banners) b.t += dt;
    game.banners = game.banners.filter(b => b.t < b.life);
    for (const b of game.bubbles) b.t += dt;
    game.bubbles = game.bubbles.filter(b => b.t < b.life);
    if (game.freeze > 0) { game.freeze -= dt; return; }
    const inp = readInput();
    const tok = tokenFor(p1, inp.mx, inp.my);
    pushTok(p1, tok);
    if (press.P) p1.bufP = game.time;
    if (press.K) p1.bufK = game.time;
    press.P = press.K = false;
    const ph = game.phase;
    if (ph === 'intro') {
      if (game.pt > 1.3 && !game.fought) { game.fought = true; banner(CALL.fight, { size: 44, fill: 'fire', life: 0.9 }); say(spoken(CALL.fight)); SFX.gong(); }
      if (game.pt > 2.0) { game.phase = 'fight'; game.pt = 0; game.fought = false; }
    }
    if (ph === 'fight') {
      game.timer -= dt;
      if (game.timer <= 0) { game.timer = 0; timeUp(); }
    }
    if (ph === 'finish' && game.pt > 6) {
      const v = game.loser; v.finishing = false; v.dead = true; launch(v, -v.face * 60, -120); game.phase = 'matchend'; game.pt = 0; winText(game.winner);
    }
    if (ph === 'fatality') {
      if (game.script) { game.script.update(dt); if (game.script.done) { game.script = null; afterFatality(); } }
    }
    if (ph === 'tag' && game.pt > 1.5) tagIn();
    if (ph === 'roundend' && game.pt > 3.6) { game.round++; startRound(); return; }
    if (ph === 'matchend' && game.pt > 4.2) { endMatch(); return; }
    if (ph === 'fatalend' && game.pt > 5.2) { endMatch(); return; }
    if (['fight', 'finish', 'finishwait'].includes(game.phase)) {
      const can = game.phase !== 'finishwait' || true;
      let c1 = { tok, P: game.time - p1.bufP < 0.14, K: game.time - p1.bufK < 0.14, B: btn.B };
      if (window.MK_P1AI) { if (!p1.cpu) p1.cpu = { t: 0.5, walk: 0, lvl: 0.6, blockT: 0, fatalT: 0 }; c1 = ai(p1, p2, dt); }
      if (can && !p1.finishing && !(game.phase === 'finish' && game.loser === p1)) {
        const before = p1.state;
        act(p1, p2, c1);
        if (p1.state !== before && (c1.P || c1.K)) { p1.bufP = p1.bufK = -9; }
        if (p1.state === 'attack' || (p1.state === 'jump' && p1.airAtk)) p1.bufP = p1.bufK = -9;
      }
      if (!p2.finishing && !(game.phase === 'finish' && game.loser === p2)) { const c2 = window.MK_NOAI ? { tok: 'N' } : ai(p2, p1, dt); if (game.phase !== 'fatality') act(p2, p1, c2); }
    }
    if (game.phase === 'roundend' || game.phase === 'matchend' || game.phase === 'fatalend') {
      const w = game.winner;
      if (w && actionable(w) && game.pt > 1.0) setWin(w);
    }
    for (const f of [p1, p2]) if (f.state !== 'script') { if (f.slowT > 0) f.slowT -= dt; if (f.silenceT > 0) f.silenceT -= dt; updateFighter(f, f === p1 ? p2 : p1, f.slowT > 0 ? dt * 0.55 : dt); }
    game.hype = Math.max(0, (game.hype || 0) - dt * 0.35);
    comboCheck(p1); comboCheck(p2);
    separate();
    updateProjs(dt);
    updateCam(dt);
    for (const f of [p1, p2]) updatePose(f, dt);
    FX.update(dt);
  }
  function timeUp() {
    if (Math.abs(p1.hp - p2.hp) < 0.5) { game.phase = 'roundend'; game.pt = 0; banner('DRAW', { size: 34 }); return; }
    const v = p1.hp < p2.hp ? p1 : p2, a = v === p1 ? p2 : p1;
    v.hp = 0; ko(v, a);
    if (v.finishing) { v.state = 'idle'; }
  }
  function afterFatality() {
    const w = game.winner;
    game.phase = 'fatalend'; game.pt = 0;
    if (game.loser.bossDie) { winText(w); setWin(w); return; }
    setWin(w); w.scriptPose = null;
    // 1.3.2: the announcer calls the winner, then FATALITY, then FLAWLESS VICTORY if the winner took no damage
    const flawless = w.dmgTaken <= 0;
    banner(w.def.name + ' ' + CALL.wins, { size: 24, fill: 'gold', life: 4.8, y: 40, hold: 0.8, dock: { y: 30, size: 15 } });
    setTimeout(() => banner(CALL.fatality, { size: 32, fill: 'blood', life: 3.6, y: 56, drip: 1, blood: 1, hold: 1.1, dock: { y: 50, size: 19 } }), 1300);
    if (flawless) setTimeout(() => banner(CALL.flawless, { size: 12, fill: 'fire', y: 74, life: 2.4 }), 2700);
    const lines = [w.def.name.replace("'", 'g').toLowerCase() + ' ' + spoken(CALL.wins), spoken(CALL.fatality)];
    if (flawless) lines.push(spoken(CALL.flawless));
    SFX.sayAll(lines);
  }
  function endMatch() {
    const won = game.winner === p1;
    if (mode === 'single') { screen = 'result'; game.pt = 0; SFX.music('menu'); return; }
    if (won) {
      ladder.rung++;
      if (ladder.rung >= ladder.opps.length) { screen = 'ending'; game.pt = 0; SFX.music('menu'); return; }
      screen = 'ladder'; game.pt = 0; ladder.t0 = null; SFX.music('menu');
    } else { screen = 'continue'; game.pt = 0; SFX.music('menu'); }
  }

  // ---------- rendering ----------
  // matrix afterimages: green silhouettes of the last few frames
  let gcv = null, gg2 = null;
  function drawGhosts(g, f) {
    if (!f.trail || !f.trail.length) return;
    if (!gcv) { gcv = document.createElement('canvas'); gcv.width = 360; gcv.height = 320; gg2 = gcv.getContext('2d'); }
    f.trail.forEach((e, i) => {
      gg2.setTransform(1, 0, 0, 1, 0, 0); gg2.globalCompositeOperation = 'source-over'; gg2.clearRect(0, 0, 360, 320);
      gg2.setTransform(1, 0, 0, 1, 180 - e.x, 250 - e.y);
      R.draw(gg2, { def: f.def, d: f.d, x: e.x, y: e.y, face: e.face, t: f.t, st: f.st2 }, e.pose, { noWounds: true });
      gg2.setTransform(1, 0, 0, 1, 0, 0); gg2.globalCompositeOperation = 'source-in'; gg2.fillStyle = '#30ff80'; gg2.fillRect(0, 0, 360, 320);
      g.globalAlpha = 0.12 + 0.07 * i; g.drawImage(gcv, e.x - 180, e.y - 250); g.globalAlpha = 1;
    });
  }
  // a fighter's silhouette in one flat color (doubles and afterimages)
  function drawSil(g, f, x, y, face, pose, col, alpha) {
    if (!gcv) { gcv = document.createElement('canvas'); gcv.width = 360; gcv.height = 320; gg2 = gcv.getContext('2d'); }
    gg2.setTransform(1, 0, 0, 1, 0, 0); gg2.globalCompositeOperation = 'source-over'; gg2.clearRect(0, 0, 360, 320);
    gg2.setTransform(1, 0, 0, 1, 180 - x, 250 - y);
    R.draw(gg2, { def: f.def, d: f.d, x, y, face, t: f.t, st: f.st2 }, f.def.chair ? chairPose(f, pose) : pose, { noWounds: true });
    gg2.setTransform(1, 0, 0, 1, 0, 0); gg2.globalCompositeOperation = 'source-in'; gg2.fillStyle = col; gg2.fillRect(0, 0, 360, 320);
    g.globalAlpha = alpha; g.drawImage(gcv, x - 180, y - 250); g.globalAlpha = 1;
  }
  function drawFighter(g, f) {
    drawGhosts(g, f);
    if (f.hidden) return;
    if (f.def.vanish && f.state === 'script' && f.ro.gone) return;
    g.save();
    if (f.sink > 0) { g.beginPath(); g.rect(f.x - 80, 0, 160, FLOOR + 1); g.clip(); g.translate(0, f.sink * hurtH(f) * 1.05); }
    if (f.flashT > 0) g.globalAlpha = 0.7;
    if (f.alpha != null && f.alpha < 1) g.globalAlpha = Math.max(0.05, f.alpha);
    // shadow
    if (!f.ro.noShadow) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(f.x, FLOOR + 1, halfW(f) * 1.4 * (1 - Math.min(0.6, (FLOOR - f.y) / 200)), 3.5, 0, 0, PI * 2); g.fill(); }
    const ro = Object.assign({}, f.ro);
    if (f.ro.scale) ro.scale = f.ro.scale;
    const fx = f.x + (f.ro.dx || 0), fy = f.y + (f.ro.dy || 0);
    const spun = f.state === 'attack' && f.move === MV.round && f.mt > 0.05 && f.mt < 0.13;
    const wt = f.state === 'win' && f.def.front ? winT(f) : -1;
    // the turn: a little hop, a snap to face the camera, and a motion smear over the switch
    const hop = wt >= 0 && wt < 0.34 ? -Math.sin(wt / 0.34 * PI) * 9 * f.d.k : 0;
    if (wt >= TURN) {
      const fp = frontPose(f, Math.max(0, wt - 0.3)), drawF = (gg, ox) => R.drawFront(gg, { def: f.def, d: f.d, x: fx + ox, y: fy + hop, t: f.t, st: f.st2 }, fp, ro);
      const sm = wt < 0.3 ? 1 - (wt - TURN) / (0.3 - TURN) : 0;
      if (sm > 0) { const sd = -f.face; for (const [ox, a] of [[14, 0.18], [7, 0.3]]) { g.globalAlpha = a * sm; R.digi(g, fx + sd * ox, fy + hop, gg => drawF(gg, sd * ox), { box: [20, 0, 340, 330] }); } g.globalAlpha = 1; }
      R.digi(g, fx, fy + hop, gg => { f.fj = drawF(gg, 0); }, { box: [20, 0, 340, 330] });
    } else {
      f.fj = null;
      if (!f.dcache) f.dcache = {};
      const every = game.phase === 'fatality' || f.state === 'script' ? 1 : 2, ph = f === p2 ? 1 : 0;
      R.digi(g, fx, fy + hop, gg => R.draw(gg, { def: f.def, d: f.d, x: fx, y: fy + hop, face: spun ? -f.face : f.face, t: f.t, st: f.st2 }, f.pose, ro), { cache: f.dcache, every, phase: ph, box: [50, 20, 280, 310], tint: f.ro.ash ? [0.3, 0.3, 0.32] : f.ro.char ? [0.45, 0.35, 0.3] : f.slowT > 0 ? [0.78, 0.92, 1.25] : f.mirror ? [0.62, 0.66, 0.85] : null });
    }
    // the wounded keep bleeding
    if (!f.hidden && f.hp < 70 && Math.random() < (1 - f.hp / 70) * 0.25 && f.state !== 'script') { const hp = R.jointWorld(f, f.pose, Math.random() < 0.5 ? 'head' : 'chest'); FX.blood(hp[0], hp[1], 1, 0, 0.15); }
    if (f.blind > 0 && f.state === 'hit') {
      const hp = R.jointWorld(f, f.pose, 'head');
      g.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 10; i++) g.fillRect(hp[0] + f.face * (2 + (i * 3.7) % 10) * f.d.k, hp[1] - 12 + (i * 5.3) % 9, 1.4, 1.4);
      g.fillStyle = 'rgba(200,0,20,0.8)'; g.fillRect(hp[0] + f.face * 8 * f.d.k, hp[1] - 9, 1.2, 4 + Math.sin(f.t * 6) * 2);
    }
    // 1.5: a silenced fighter wears a strip of tape over the mouth
    if (f.silenceT > 0 && !f.dead && f.state !== 'script') {
      const hp = R.jointWorld(f, f.pose, 'head'), k = f.d.k;
      g.save(); g.translate(hp[0] + f.face * 5 * k, hp[1] + 5 * k); g.rotate(f.face * 0.25);
      g.fillStyle = '#d8d0b8'; g.fillRect(-6 * k, -2 * k, 12 * k, 4 * k); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-6 * k, 1.2 * k, 12 * k, 0.8 * k);
      g.strokeStyle = '#8a1a1a'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-3 * k, -1.4 * k); g.lineTo(3 * k, 1.4 * k); g.moveTo(3 * k, -1.4 * k); g.lineTo(-3 * k, 1.4 * k); g.stroke();
      g.restore();
    }
    if (f.state === 'win' && f.fj && WIN[f.def.id] && WIN[f.def.id].draw) WIN[f.def.id].draw(g, f, winT(f) - 0.3);
    if (f.state === 'dizzy' || (f.state === 'hit' && f.daze)) {
      const hp = R.jointWorld(f, f.pose, 'head');
      for (let i = 0; i < 3; i++) { const a = f.t * 4 + i * 2.1; g.fillStyle = '#ffe040'; g.font = '9px Anton, Impact, sans-serif'; g.fillText('*', hp[0] + Math.cos(a) * 12 - 2, hp[1] - 12 + Math.sin(a) * 3); }
    }
    g.restore();
  }
  // gritty faux-digitized look: grain + reduced color depth
  // 1.1.1: the film grain is two pre-made noise layers laid over the frame (no pixel readback, so the canvas stays on the GPU)
  const GRAIN = [0, 1].map(() => {
    const c = document.createElement('canvas'); c.width = 560; c.height = 240;
    const gx = c.getContext('2d'), img = gx.createImageData(560, 240), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() + Math.random() + Math.random() - 1.5) * 9; const v = n > 0 ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = Math.min(255, Math.abs(n) * 2.4); }
    gx.putImageData(img, 0, 0); return c;
  });
  function grit() { ctx.drawImage(GRAIN[((game.time * 12) | 0) % 2], 0, 0); }
  function drawWorld() {
    const g = ctx;
    g.save();
    const sx = game.shake ? rnd(-game.shake, game.shake) : 0, sy = game.shake ? rnd(-game.shake, game.shake) * 0.6 : 0;
    g.translate(Math.round(sx), Math.round(sy));
    if (game.scene) { game.scene(g, W, H); g.restore(); return; }
    g.imageSmoothingEnabled = false;
    g.translate(0, FLOOR * (1 - zoom) + camDY); g.scale(zoom, zoom); g.translate(-cam, 0);
    const bx = Math.round(cam * 0.4) + (stage.bxOff || -40), bw = stage.back.width;
    g.drawImage(stage.back, 0, 0, bw, 2, bx, -160, bw, 162);
    g.drawImage(stage.back, bx, 0);
    g.save(); g.translate(bx, 0); STAGES.live(g, stage.id, game.time, { hype: game.phase === 'fatality' || game.phase === 'fatalend' ? 1 : game.hype || 0, phase: game.phase }); g.restore();
    g.drawImage(stage.front, 0, 0);
    g.drawImage(stage.front, 0, H - 2, AW, 2, 0, H - 1, AW, 80);
    if (game.phase === 'fatality') { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(cam - 10, -200, VW() + 20, H + 300); }
    FX.drawDecals(g);
    FX.drawProps(g, 'back');
    const rk = f => (f.ro.top ? 2 : 0) + (f.state === 'attack' ? 1 : 0), order = [p1, p2].sort((a, b) => rk(a) - rk(b));
    for (const f of order) drawFighter(g, f);
    FX.drawGibs(g);
    for (const p of projs) drawProj(g, p);
    FX.drawProps(g, 'front');
    FX.drawParts(g);
    for (const b of game.bubbles) { const a = Math.min(1, (b.life - b.t) * 3); g.globalAlpha = a; TXT.draw(g, b.str, b.x, b.y - b.t * 8, { size: b.size, align: 'center', fill: b.fill || 'white' }); g.globalAlpha = 1; }
    g.restore();
  }
  function bar(x, y, w, f, right) {
    const g = ctx, h = 11;
    g.fillStyle = '#000'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = '#a00a0a'; g.fillRect(x, y, w, h);
    const fw = w * clamp(f.hp / 100, 0, 1);
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#9aff6a'); gr.addColorStop(0.5, '#1ec41e'); gr.addColorStop(1, '#0a6a0a');
    g.fillStyle = gr; g.fillRect(right ? x + w - fw : x, y, fw, h);
    TXT.draw(g, f.def.name, right ? x + w - 3 : x + 3, y + 0.5, { size: 9, align: right ? 'right' : 'left', fill: '#ffe860', strokeW: 1.6, shadow: false });
    for (let i = 0; i < f.wins; i++) { const cx = right ? x + w - 8 - i * 13 : x + 8 + i * 13; R.ball(g, cx, y + h + 8, 5, '#9b59d0'); g.fillStyle = '#ffe860'; g.fillRect(cx - 1, y + h + 5, 2, 6); }
  }
  function drawHUD() {
    const bw = Math.min(190, W / 2 - 34);
    bar(10, 8, bw, p1, false); bar(W - 10 - bw, 8, bw, p2, true);
    TXT.draw(ctx, String(Math.ceil(game.timer)).padStart(2, '0'), W / 2, 3, { size: 20, align: 'center', fill: 'gold' });
    for (const b of game.banners) {
      const a = b.t < 0.12 ? b.t / 0.12 : Math.min(1, (b.life - b.t) * 3);
      const sc = b.t < 0.15 ? 1.5 - b.t / 0.3 : 1;
      // big hit first, then it slides up into a band under the health bars so the winner stays in view
      const du = b.dock ? ease((b.t - (b.hold || 0.9)) / 0.35) : 0, by = b.dock ? lerp(b.y, b.dock.y, du) : b.y, bs = b.dock ? lerp(b.size, b.dock.size, du) : b.size;
      ctx.globalAlpha = clamp(a, 0, 1);
      if (b.dock && du > 0) { ctx.fillStyle = `rgba(0,0,0,${0.35 * du})`; ctx.fillRect(0, by - bs * 0.62, W, bs * 1.24); }
      TXT.draw(ctx, b.str, b.x != null ? b.x : W / 2, by - (bs * sc) / 2, { size: Math.round(bs * sc), align: 'center', fill: b.fill, blood: b.blood });
      if (b.drip) { ctx.fillStyle = '#9a000c'; const w = TXT.width(ctx, b.str, bs, b.blood ? TXT.BLOOD : null); for (let i = 0; i < 9; i++) { const x = W / 2 - w / 2 + (i + 0.5) * w / 9; ctx.fillRect(x, by + bs * 0.45, 2, Math.min(bs * 0.5, b.t * 14 * (1 + (i * 7) % 5 / 3))); } }
      ctx.globalAlpha = 1;
    }
    if (game.toasty > 0) {
      const u = game.toasty > 1.1 ? (1.4 - game.toasty) / 0.3 : game.toasty < 0.3 ? game.toasty / 0.3 : 1;
      const x = W - 46 * u + 8, y = 26;
      const td = ROSTER.ALL[G.toasty.fighter]; if (td) R.drawHeadAt(ctx, { def: td, d: td.dk }, x, y + 34, -0.2, 1.4, { t: game.time });
      TXT.draw(ctx, G.toasty.text, x - 30, y + 10, { size: 12, align: 'right', fill: 'purple' });
    }
    if (game.phase === 'finish') { const left = Math.max(0, 6 - game.pt); if (left < 3) TXT.draw(ctx, String(Math.ceil(left)), W / 2, 100, { size: 18, align: 'center', fill: 'red' }); }
  }
  let menu = null;
  function renderPlay() {
    elControls.classList.toggle('on', !paused && game.phase !== 'fatality');
    elPause.classList.add('on');
    const pl = paused ? 'RESUME' : 'II PAUSE'; if (elPause.textContent !== pl) elPause.textContent = pl;
    drawWorld();
    grit();
    FX.drawScreen(ctx, W, H);
    if (game.slow > 0) { ctx.fillStyle = 'rgba(30,255,110,0.08)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = 'rgba(0,40,10,0.12)'; for (let y = (game.time * 60 | 0) % 3; y < H; y += 3) ctx.fillRect(0, y, W, 1); }
    if (game.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${game.flash * 2})`; ctx.fillRect(0, 0, W, H); }
    drawHUD();
    if (paused) renderPause();
  }

  // ---------- screens ----------
  // menu buttons: curved slabs of cracked stone with the lettering cut into them
  let uiPress = null;
  function uiButton(label, x, y, w, h, fn, fill = 'gold', size = 16) {
    // arcade plate: flat black, clipped corners, a thin gold bevel, a red glow when pressed
    const g = ctx, c = Math.min(6, h * 0.24);
    const hot = uiPress && Math.abs(uiPress.x - x) < 1 && Math.abs(uiPress.y - y) < 1;
    const plate = (ox, oy, ins) => { const a = x + ox + ins, b = y + oy + ins, ww = w - ins * 2, hh = h - ins * 2, cc = Math.max(1, c - ins * 0.6); g.beginPath(); g.moveTo(a + cc, b); g.lineTo(a + ww - cc, b); g.lineTo(a + ww, b + cc); g.lineTo(a + ww, b + hh - cc); g.lineTo(a + ww - cc, b + hh); g.lineTo(a + cc, b + hh); g.lineTo(a, b + hh - cc); g.lineTo(a, b + cc); g.closePath(); };
    g.save();
    plate(1.5, 2.5, 0); g.fillStyle = 'rgba(0,0,0,0.7)'; g.fill();
    plate(0, 0, 0); const gb = g.createLinearGradient(0, y, 0, y + h); gb.addColorStop(0, '#f8de8a'); gb.addColorStop(0.5, '#b07a1c'); gb.addColorStop(1, '#5a3608'); g.fillStyle = gb; g.fill();
    plate(0, 0, 1.6); const bg = g.createLinearGradient(0, y, 0, y + h); bg.addColorStop(0, hot ? '#5a0a08' : '#1c1a1a'); bg.addColorStop(0.5, hot ? '#3a0404' : '#0c0b0b'); bg.addColorStop(1, hot ? '#200202' : '#050505'); g.fillStyle = bg; g.fill();
    if (hot) { g.save(); g.clip(); const rg = g.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, w * 0.6); rg.addColorStop(0, 'rgba(255,60,30,0.55)'); rg.addColorStop(1, 'rgba(255,0,0,0)'); g.fillStyle = rg; g.fillRect(x, y, w, h); g.restore(); }
    plate(0, 0, 2.6); g.strokeStyle = hot ? 'rgba(255,120,80,0.5)' : 'rgba(216,160,48,0.28)'; g.lineWidth = 0.6; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + c, y + 2.2, w - c * 2, h * 0.32);
    g.restore();
    if (hot) { g.save(); g.shadowColor = 'rgba(255,40,20,0.9)'; g.shadowBlur = 10; plate(0, 0, 0); g.strokeStyle = 'rgba(255,80,40,0.8)'; g.lineWidth = 1; g.stroke(); g.restore(); }
    TXT.draw(g, label, x + w / 2, y + h / 2 - size * 0.62, { size, align: 'center', fill: hot ? 'fire' : fill });
    if (window.MK_BOXES) { const m = g.getTransform(); window.MK_BOXES.push({ k: 'btn', s: label, x0: m.a * x + m.e, y0: m.d * y + m.f, x1: m.a * (x + w) + m.e, y1: m.d * (y + h) + m.f }); }
    ui.push({ x, y, w, h, fn, btn: 1 });
  }
  function bgDark(t) {
    const g = ctx, gr = g.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H * 0.45, W * 0.7);
    gr.addColorStop(0, '#3a0808'); gr.addColorStop(0.6, '#140204'); gr.addColorStop(1, '#000');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  function emblem(g, x, y, r, t) {
    g.save(); g.translate(x, y);
    R.ball(g, 0, 0, r, '#2a0a3a');
    g.strokeStyle = '#d8a030'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, r - 2, 0, PI * 2); g.stroke();
    g.lineWidth = 1; g.beginPath(); g.arc(0, 0, r - 6, 0, PI * 2); g.stroke();
    const md = mascotDef(); if (md) R.drawHeadAt(g, { def: md, d: md.dk }, -r * 0.18, r * 0.5, 0, r / 26, { t, jaw: 0.6 + Math.sin(t * 2) * 0.3 });
    g.fillStyle = '#9a000c'; for (let i = 0; i < 4; i++) g.fillRect(-6 + i * 5, r * 0.55, 2, 4 + ((t * 6 + i * 3) % 8));
    g.restore();
  }
  function renderTitle() {
    elControls.classList.remove('on'); elPause.classList.remove('on');
    bgDark(); ui = [];
    const t = game.time;
    // 1.8: GAME.titleScene(g, W, H, t) paints a picture behind the title; the title then sits at the top instead of under an emblem
    if (G.titleScene) {
      G.titleScene(ctx, W, H, t);
      // 1.8.4: GAME.kicker, optional: a small line stacked above the title ("PURPLE HIPPO ARCADE'S")
      const ky = G.kicker ? 16 : 0;
      if (G.kicker) TXT.draw(ctx, G.kicker, W / 2, 3, { size: 13, align: 'center', fill: 'gold' });
      TXT.draw(ctx, G.title, W / 2, 4 + ky, { size: 40, align: 'center', fill: 'fire' });
      if (G.subtitle) TXT.draw(ctx, G.subtitle, W / 2, 48 + ky, { size: 10, align: 'center', fill: 'gold' });
    } else {
      emblem(ctx, W / 2, 84, 42, t);
      if (G.kicker) TXT.draw(ctx, G.kicker, W / 2, 112, { size: 13, align: 'center', fill: 'gold' });
      TXT.draw(ctx, G.title, W / 2, 128, { size: 44, align: 'center', fill: 'fire' });
      if (G.subtitle) TXT.draw(ctx, G.subtitle, W / 2, 180, { size: 10, align: 'center', fill: 'purple' });
    }
    const go = m => () => { mode = m; SFX.gong(); SFX.music('menu'); screen = 'select'; say(spoken(CALL.choose || 'choose your fighter')); };
    uiButton('SINGLE MATCH', W / 2 - 152, 196, 144, 28, go('single'), 'gold', 15);
    uiButton('ARCADE LADDER', W / 2 + 8, 196, 144, 28, go('ladder'), 'fire', 15);
    grit();
  }
  function portrait(g, def, x, y, w, h, on, t) {
    if (window.MK_BOXES) { const m = g.getTransform(); window.MK_BOXES.push({ k: 'pic', s: def.id, x0: m.a * x + m.e, y0: m.d * y + m.f, x1: m.a * (x + w) + m.e, y1: m.d * (y + h) + m.f }); }
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, on ? '#7a1a1a' : '#2a0a10'); gr.addColorStop(1, on ? '#3a0606' : '#100206');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const sc = w / 36, adj = def.portrait || [0.4, 0.88, 1];
    R.drawHeadAt(g, { def, d: def.dk }, x + w * adj[0], y + h * adj[1], 0, sc / def.k * adj[2], { t, hurt: false });
    g.restore();
    g.strokeStyle = on ? '#ffe060' : '#6a4a20'; g.lineWidth = on ? 2 : 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
  // ---------- choosing a fighter or an opponent (1.8: one layout for both, the only one) ----------
  // The grid fills the left of the screen: rows as even as possible, at most six to a row, each row centred.
  // The chosen fighter stands in the spotlight on the right, facing left. BACK is bottom left; the two action
  // buttons are bottom right.
  function gridLayout(n) {
    const rows = Math.max(1, Math.ceil(n / 6)), base = Math.floor(n / rows), extra = n % rows, per = [];
    for (let r = 0; r < rows; r++) per.push(base + (r < extra ? 1 : 0));
    const NC = Math.max(...per), GP = 3, x0 = 6, x1 = W - 158, y0 = 24, y1 = H - 46;
    const cw = Math.floor(Math.min(84, (x1 - x0 - GP * (NC - 1)) / NC, (y1 - y0 - GP * (rows - 1)) / rows / 0.85)), chh = Math.floor(cw * 0.85);
    const gw = NC * (cw + GP) - GP, gx = Math.round(x0 + (x1 - x0 - gw) / 2), cells = [];
    per.forEach((m, r) => { const rx = gx + (gw - (m * (cw + GP) - GP)) / 2; for (let c = 0; c < m; c++) cells.push([Math.round(rx + c * (cw + GP)), y0 + r * (chh + GP)]); });
    return { cells, cw, chh, gw, cx: gx + gw / 2, bottom: y0 + rows * (chh + GP) };
  }
  function pickScreen(title, list, cur, onCell, act2, act1, onBack) {
    const t = game.time, g = ctx, L = gridLayout(list.length);
    TXT.draw(g, title, L.cx, 2, { size: 18, align: 'center', fill: 'gold' });
    list.forEach((def, i) => {
      const [x, y] = L.cells[i];
      portrait(g, def, x, y, L.cw, L.chh, i === cur, t);
      if (def.boss) TXT.draw(g, 'BOSS', x + L.cw / 2, y + L.chh - 9, { size: 7, align: 'center', fill: 'blood', italic: false, shadow: false });
      ui.push({ x, y, w: L.cw, h: L.chh, fn: () => onCell(i) });
    });
    const def = list[cur], PX = W - 76;
    // the spotlight on the right, the fighter facing the grid
    const f = { def, d: def.dk, x: PX, y: 200, face: -1, t };
    const sp = g.createRadialGradient(PX, 120, 6, PX, 130, 100); sp.addColorStop(0, '#e8dcc0'); sp.addColorStop(0.45, '#9a8a70'); sp.addColorStop(1, 'rgba(40,10,10,0)');
    g.fillStyle = sp; g.fillRect(PX - 70, 10, 150, 210);
    g.fillStyle = 'rgba(255,240,200,0.18)'; g.beginPath(); g.moveTo(PX - 30, 0); g.lineTo(PX + 30, 0); g.lineTo(PX + 60, 210); g.lineTo(PX - 60, 210); g.closePath(); g.fill();
    g.fillStyle = '#3a3028'; g.beginPath(); g.ellipse(PX, 201, 52, 9, 0, 0, PI * 2); g.fill();
    g.fillStyle = '#5a4a3a'; g.beginPath(); g.ellipse(PX, 199, 50, 7, 0, 0, PI * 2); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.ellipse(PX, 200, 28, 4, 0, 0, PI * 2); g.fill();
    R.digi(g, f.x, f.y, gg => R.draw(gg, f, def.chair ? chairPose(f, PS.stance(t)) : PS.stance(t), {}));
    TXT.draw(g, def.name, L.cx, L.bottom + 1, { size: 13, align: 'center', fill: 'fire' });
    // 1.8.2: the whole bio always shows. It gets the full width between BACK and the action buttons and
    // as many lines as fit above the bottom edge; the type shrinks a step at a time until all of it fits.
    const bw = Math.max(120, Math.min(2 * (L.cx - 50), 2 * (W - 176 - L.cx)));
    bioFit(g, def.bio || '', L.cx, L.bottom + 16, bw, H - 2 - (L.bottom + 16));
    uiButton('BACK', 4, H - 24, 42, 20, onBack, 'gold', 10);
    // 1.8.3: the main button (FIGHT / NEXT) is bigger, and MOVES / RANDOM sit further left, clear of it
    uiButton(act2[0], W - 172, H - 26, 60, 22, act2[1], 'gold', 11);
    uiButton(act1[0], W - 100, H - 36, 96, 33, act1[1], 'fire', 21);
  }
  function renderSelect() {
    elControls.classList.remove('on'); elPause.classList.remove('on');
    bgDark(); ui = [];
    // single match goes on to choosing the opponent, so its button says NEXT
    pickScreen('CHOOSE YOUR FIGHTER', ROSTER.FIGHTERS, sel.i, i => { if (sel.i === i) confirmPick(); else { sel.i = i; SFX.select(); } },
      ['MOVES', () => { screen = 'moves'; movesBack = 'select'; SFX.blip(); }], [mode === 'single' ? 'NEXT' : 'FIGHT', confirmPick], () => { screen = 'title'; SFX.blip(); });
    grit();
  }
  function wrapLines(g, str, size, maxW) {
    const out = []; let line = '';
    for (const wd of str.split(' ')) { const tr = line ? line + ' ' + wd : wd; if (line && TXT.width(g, tr, size) > maxW) { out.push(line); line = wd; } else line = tr; }
    if (line) out.push(line);
    return out;
  }
  function bioFit(g, str, cx, top, maxW, maxH) {
    let size = 8, lines, lh;
    for (; size >= 5.5; size -= 0.5) { lh = size * 1.32; lines = wrapLines(g, str, size, maxW); if (lines.length * lh <= maxH + 1) break; }
    size = Math.max(size, 5.5);
    lines.forEach((ln, i) => TXT.draw(g, ln, cx, top + i * lh, { size, align: 'center', fill: 'white', italic: false }));
  }
  function bio(g, str, cx, ly, maxW, maxLines = 9) {
    const words = str.split(' '); let line = '', n = 0;
    for (const wd of words) { const tr = line ? line + ' ' + wd : wd; if (TXT.width(g, tr, 8) > maxW) { if (n < maxLines) TXT.draw(g, line, cx, ly, { size: 8, align: "center", fill: "white", italic: false }); n++; line = wd; ly += 11; } else line = tr; }
    if (n < maxLines) TXT.draw(g, line, cx, ly, { size: 8, align: 'center', fill: 'white', italic: false });
  }
  function confirmPick() {
    SFX.gong(); ladder.pick = sel.i; say(ROSTER.FIGHTERS[sel.i].name.replace("'", 'g').toLowerCase());
    if (mode === 'single') { screen = 'opp'; return; }
    newLadder(); screen = 'ladder'; game.pt = 0; ladder.t0 = null;
  }
  // ---------- single match: pick the opponent, then the arena ----------
  const OPPS = () => ROSTER.FIGHTERS.concat(ROSTER.BOSSES.filter(b => !b.ladderOnly));
  const ARENAS = () => STAGES.SINGLE;
  function renderOpp() {
    elControls.classList.remove('on'); elPause.classList.remove('on');
    bgDark(); ui = [];
    const list = OPPS(), next = () => { screen = 'arena'; SFX.gong(); say(list[sel.o].name.replace("'", 'g').toLowerCase()); };  // 1.8.1: the opponent is announced too
    pickScreen('CHOOSE YOUR OPPONENT', list, sel.o, i => { if (sel.o === i) next(); else { sel.o = i; SFX.select(); } },
      ['RANDOM', () => { sel.o = (Math.random() * list.length) | 0; SFX.select(); }], ['NEXT', next], () => { screen = 'select'; SFX.blip(); });
    grit();
  }
  function renderArena() {
    elControls.classList.remove('on'); elPause.classList.remove('on');
    bgDark(); ui = [];
    const g = ctx, list = ARENAS(), id = list[sel.s], st = STAGES.get(id);
    TXT.draw(g, 'CHOOSE THE ARENA', W / 2, 6, { size: 20, align: 'center', fill: 'gold' });
    const bh = 136, bw = Math.min(W - 120, bh / 0.42), bx = (W - bw) / 2, by = 34;
    g.save(); g.beginPath(); g.rect(bx, by, bw, bh); g.clip();
    const sx = (st.back.width - 420) / 2;
    g.drawImage(st.back, sx, 30, 420, 160, bx, by, bw, bh * 0.85);
    g.drawImage(st.front, 340, 186, 420, 54, bx, by + bh * 0.8, bw, bh * 0.2);
    g.restore();
    g.strokeStyle = '#c8a030'; g.lineWidth = 2; g.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);
    TXT.draw(g, STAGES.name(id), W / 2, by + bh + 8, { size: 16, align: 'center', fill: 'fire' });
    const nav = d => () => { sel.s = (sel.s + d + list.length) % list.length; SFX.select(); };
    uiButton('<', bx - 48, by + bh / 2 - 16, 40, 32, nav(-1), 'gold', 20);
    uiButton('>', bx + bw + 8, by + bh / 2 - 16, 40, 32, nav(1), 'gold', 20);
    uiButton('FIGHT', W / 2 - 50, H - 36, 100, 28, startSingle, 'fire', 18);
    uiButton('RANDOM', W / 2 - 160, H - 34, 90, 24, () => { sel.s = (Math.random() * list.length) | 0; SFX.select(); }, 'gold', 13);
    uiButton('BACK', 6, H - 26, 56, 20, () => { screen = 'opp'; SFX.blip(); }, 'gold', 11);
    grit();
  }
  function startSingle() {
    SFX.gong(); ladder.pick = sel.i; ladder.opps = [OPPS()[sel.o]]; ladder.stages = [ARENAS()[sel.s]]; ladder.rung = 0; startMatch();
  }
  function renderResult() {
    elControls.classList.remove('on'); elPause.classList.remove('on');
    bgDark(); ui = [];
    const g = ctx, t = game.time, w = game.winner, def = w.def, won = w === p1;
    R.digi(g, W / 2, 200, gg => R.drawFront(gg, { def, d: def.dk, x: W / 2, y: 200, t }, frontPose({ def }, t % 3)), { box: [20, 0, 340, 330] });
    TXT.draw(g, won ? 'YOU WIN' : 'YOU LOSE', W / 2, 8, { size: 30, align: 'center', fill: won ? 'gold' : 'blood' });
    TXT.draw(g, def.name + ' WINS', W / 2, 44, { size: 13, align: 'center', fill: 'white' });
    uiButton('REMATCH', 10, H - 100, 110, 26, () => { SFX.gong(); startMatch(); }, 'fire', 14);
    uiButton('NEW MATCH', 10, H - 68, 110, 26, () => { SFX.blip(); screen = 'select'; }, 'gold', 14);
    uiButton('TITLE', 10, H - 36, 110, 26, () => { SFX.blip(); screen = 'title'; FX.reset(); }, 'gold', 14);
    grit();
  }
  let movesBack = 'select';
  function renderMoves() {
    elControls.classList.remove('on');
    bgDark(); ui = [];
    const g = ctx, def = screen === 'moves' && movesBack === 'play' ? p1.def : ROSTER.FIGHTERS[sel.i];
    TXT.draw(g, def.name + ' MOVES', W / 2, 4, { size: 18, align: 'center', fill: 'gold' });
    const TH = { suplex: 'Suplex', hip: 'Hip throw', shoulder: 'Shoulder throw', spin: 'Spin and fling' };
    const pits = STAGES.pits().map(id => STAGES.name(id).replace(/^THE /, ''));
    const rows = [
      ['PUNCH', 'Jab (tap again for a combo)', 0], ['DOWN + PUNCH', 'Uppercut', 0], ['TOWARD + PUNCH (close)', TH[def.throw] || 'Suplex', 0], ['BACK + PUNCH (close)', 'Wad Toss', 0],
      ['KICK', def.chair ? 'Chair ram' : 'Kick', 0], ['DOWN + KICK', 'Sweep', 0], ['BACK + KICK', 'Spinning back kick', 0], ['UP', 'Jump (punch or kick in the air)', 0], ['BLOCK (hold)', 'Block (hold DOWN too to block low)', 0],
      ['BLOCK + UP', 'BULLET DODGE (counters if it dodges)', 2], ['BACK, BACK + KICK', def.chair ? 'WALL RIDE FLYING CHAIR RAM' : 'WALL RUN FLYING KICK', 2], ['IN THE AIR: DOWN + PUNCH', 'HANG TIME', 2], ['FORWARD, FORWARD + PUNCH', 'BURLY BRAWL FLURRY', 2], ['BLOCK, then FORWARD', 'PHASE DASH (straight through them)', 2], ['KICK while knocked down', def.chair ? 'KIP-UP CHAIR SPIN' : 'KIP-UP SPIN KICK', 2],
      ...def.specials.map(sp => [sp.label, sp.name, 1]),
      ...def.fatalList.map(fs => ['FINISH: ' + fs.label, 'FATALITY: ' + fs.name, 1]),
      pits.length ? ['FINISH: DOWN + PUNCH', 'STAGE FATALITY at ' + (pits.length > 1 ? pits.slice(0, -1).join(', ') + ' or ' + pits[pits.length - 1] : pits[0]), 1] : null,
    ].filter(Boolean);
    const rh = Math.min(12.5, 188 / rows.length);
    rows.forEach((r, i) => {
      const y = 30 + i * rh, hl = r[2];
      // shrink a line until it fits its half of the screen
      const fit = str => { let z = 9; while (z > 6 && TXT.width(g, str, z) > W / 2 - 12) z -= 0.5; return z; };
      TXT.draw(g, r[0], W / 2 - 6, y, { size: fit(r[0]), align: 'right', fill: hl === 1 ? 'fire' : hl === 2 ? 'green' : 'white', italic: false });
      TXT.draw(g, r[1], W / 2 + 6, y, { size: fit(r[1]), align: 'left', fill: hl === 1 ? 'gold' : hl === 2 ? 'green' : '#c8c8d0', italic: false });
    });
    uiButton('BACK', W - 70, H - 26, 62, 22, () => { screen = movesBack; if (movesBack === 'play') paused = true; SFX.blip(); }, 'gold', 13);
  }
  function renderLadder() {
    elControls.classList.remove('on'); elPause.classList.remove('on');
    bgDark(); ui = [];
    if (ladder.t0 == null) ladder.t0 = performance.now();
    const g = ctx, t = game.time, pt = (performance.now() - ladder.t0) / 1000, n = ladder.opps.length, r = ladder.rung;
    // the tower: one big step per opponent, the final boss on top. The first time it is shown the
    // camera scans it top to bottom; after each win your marker climbs one step.
    const SH = 54, TW = 118, tx = W - TW - 8, top = 8, bot = H - 8;
    const SCAN = 3.6, scanning = !ladder.scanned && r === 0;
    const topCam = n - (bot - top) / SH + 0.2, rest = Math.min(r - 0.4, topCam);
    let camI = rest, mk = r;
    if (scanning) {
      const u = clamp((pt - 0.5) / (SCAN - 0.9), 0, 1);
      camI = lerp(topCam, rest, u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
      if (pt > SCAN) ladder.scanned = true;
    } else if (r > 0) {
      const u = ease(clamp((pt - 0.3) / 0.9, 0, 1));
      camI = lerp(Math.min(r - 1.4, topCam), rest, u); mk = lerp(r - 1, r, u);
    }
    const sy = i => bot - SH - (i - camI) * SH;
    g.save(); g.beginPath(); g.rect(tx - 22, top, TW + 30, bot - top); g.clip();
    g.fillStyle = '#0a0406'; g.fillRect(tx - 4, top, TW + 8, bot - top);
    for (let i = -1; i < n; i++) {
      const y = sy(i); if (y > bot || y + SH < top) continue;
      if (i < 0) { g.fillStyle = '#1a1214'; g.fillRect(tx, y + 6, TW, SH - 6); TXT.draw(g, 'START', tx + TW / 2, y + 22, { size: 12, align: 'center', fill: '#665' }); continue; }
      const def = ladder.opps[i], done = i < r, cur = i === r && (!scanning || pt > SCAN - 0.4);
      g.fillStyle = cur ? (Math.sin(t * 8) > 0 ? '#ffe070' : '#d02818') : done ? '#3a2a1a' : '#8a6420'; g.fillRect(tx, y + 3, TW, SH - 3);
      g.fillStyle = cur ? '#3a0606' : done ? '#121010' : '#160c0c'; g.fillRect(tx + 1.4, y + 4.4, TW - 2.8, SH - 5.8);
      const mt = (ladder.meta && ladder.meta[i]) || {};
      if (mt.pair) { portrait(g, def, tx + 3, y + 6, 24, SH - 9, cur, t + i); portrait(g, mt.pair, tx + 29, y + 6, 24, SH - 9, cur, t + i + 0.5); }
      else portrait(g, def, tx + 3, y + 6, 50, SH - 9, cur, t + i);
      if (mt.mirror) { g.fillStyle = 'rgba(40,50,120,0.45)'; g.fillRect(tx + 3, y + 6, 50, SH - 9); }
      if (done) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(tx + 3, y + 6, 50, SH - 9); }
      const nm = mt.pair ? def.short + ' +' : def.short;
      TXT.draw(g, nm, tx + 57, y + 14, { size: nm.length > 7 ? 9 : 11, fill: done ? '#555' : cur ? 'gold' : 'white', italic: false });
      if (mt.pair) TXT.draw(g, mt.pair.short, tx + 57, y + 25, { size: mt.pair.short.length > 7 ? 8 : 9, fill: done ? '#555' : cur ? 'gold' : 'white', italic: false });
      if (def.boss || mt.mirror || mt.pair) TXT.draw(g, def.boss ? 'BOSS' : mt.mirror ? 'MIRROR' : 'ENDURANCE', tx + 57, y + (mt.pair ? 38 : 30), { size: 8, fill: 'blood', italic: false, shadow: false });
      if (done) { R.line(g, tx + 6, y + 8, tx + TW - 6, y + SH - 4, '#b0101a', 3); R.line(g, tx + TW - 6, y + 8, tx + 6, y + SH - 4, '#b0101a', 3); }
    }
    // your marker on the left edge of the tower
    if (!scanning || pt > SCAN - 0.4) {
      const me = ROSTER.FIGHTERS[ladder.pick], my = sy(mk) + SH / 2 + 2;
      g.fillStyle = '#ffd040'; g.fillRect(tx - 22, my - 17, 34, 34); portrait(g, me, tx - 20, my - 15, 30, 30, true, t);
      R.poly(g, [[tx + 13, my - 5], [tx + 19, my], [tx + 13, my + 5]], '#ffd040');
    }
    const fade = g.createLinearGradient(0, top, 0, top + 18); fade.addColorStop(0, 'rgba(0,0,0,0.9)'); fade.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = fade; g.fillRect(tx - 22, top, TW + 30, 18);
    g.restore();
    const cx = Math.round((tx - 20) / 2);
    if (scanning && pt < SCAN - 0.4) {
      TXT.draw(g, 'YOUR DESTINY', cx, 70, { size: 28, align: 'center', fill: 'gold' });
      TXT.draw(g, n + ' FIGHTS' + (G.ladderGoal ? ' TO ' + G.ladderGoal : ''), cx, 112, { size: 12, align: 'center', fill: 'white', italic: false });
      ui.push({ x: 0, y: 0, w: W, h: H, fn: () => { ladder.scanned = true; ladder.t0 = performance.now() - SCAN * 1000; } });
      ladderBack(); grit(); return;
    }
    const me = ROSTER.FIGHTERS[ladder.pick], op = ladder.opps[r], mt = (ladder.meta && ladder.meta[r]) || {};
    const sp = (def, t2) => def.chair ? chairPose({ d: def.dk }, PS.stance(t2)) : PS.stance(t2);
    const f1 = { def: me, d: me.dk, x: cx - 68, y: 196, face: 1, t }, f2 = { def: op, d: op.dk, x: cx + (mt.pair ? 52 : 68), y: 196, face: -1, t: t + 1 };
    if (mt.pair) { const f3 = { def: mt.pair, d: mt.pair.dk, x: cx + 96, y: 192, face: -1, t: t + 2 }; R.digi(g, f3.x, f3.y, gg => R.draw(gg, f3, sp(mt.pair, t + 2)), { tint: [0.7, 0.7, 0.7] }); }
    R.digi(g, f1.x, f1.y, gg => R.draw(gg, f1, sp(me, t))); R.digi(g, f2.x, f2.y, gg => R.draw(gg, f2, sp(op, t + 1)), mt.mirror ? { tint: [0.62, 0.66, 0.85] } : {});
    if (mt.mirror || mt.pair) TXT.draw(g, mt.mirror ? CALL.mirror : CALL.endurance, cx, 64, { size: 12, align: 'center', fill: 'blood' });
    TXT.draw(g, 'VS', cx, 110, { size: 30, align: 'center', fill: 'fire' });
    TXT.draw(g, 'BATTLE ' + (r + 1) + ' OF ' + n, cx, 30, { size: 14, align: 'center', fill: 'white' });
    TXT.draw(g, STAGES.name(ladder.stages[r]), cx, 48, { size: 11, align: 'center', fill: 'purple' });
    if (op.boss) bio(g, op.bio, cx, 199, tx - 30, 2);
    if (Math.sin(t * 5) > -0.3) TXT.draw(g, 'TAP TO FIGHT', cx, op.boss ? 222 : 218, { size: 13, align: 'center', fill: 'white' });
    ui.push({ x: 0, y: 0, w: W, h: H, fn: () => { SFX.gong(); startMatch(); } });
    ladderBack(); grit();
  }
  // before the first fight BACK returns to fighter select; partway up the tower it quits to the title
  function ladderBack() { uiButton('BACK', 6, H - 26, 56, 20, () => { SFX.blip(); SFX.music('menu'); screen = ladder.rung === 0 ? 'select' : 'title'; }, 'gold', 11); }
  function renderContinue() {
    elControls.classList.remove('on'); elPause.classList.remove('on');
    drawWorld(); grit(); ui = [];
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    const left = Math.max(0, 9 - Math.floor(game.pt));
    TXT.draw(ctx, 'CONTINUE?', W / 2, 60, { size: 34, align: 'center', fill: 'blood' });
    TXT.draw(ctx, String(left), W / 2, 104, { size: 48, align: 'center', fill: 'gold' });
    TXT.draw(ctx, 'TAP TO KEEP FIGHTING', W / 2, 170, { size: 14, align: 'center', fill: 'white' });
    if (game.pt > 10) { screen = 'title'; return; }
    ui.push({ x: 0, y: 0, w: W, h: H, fn: () => { SFX.gong(); startMatch(); } });
  }
  function renderEnding() {
    elControls.classList.remove('on'); elPause.classList.remove('on');
    bgDark(); ui = [];
    const g = ctx, t = game.time, def = ROSTER.FIGHTERS[ladder.pick];
    if (Math.random() < 0.6) FX.blood(rnd(0, W), -4, 1, 0, 0.2);
    FX.setFloor(H + 20); FX.update(1 / 60); FX.drawParts(g); FX.setFloor(FLOOR);
    R.digi(g, W / 2, 206, gg => R.drawFront(gg, { def, d: def.dk, x: W / 2, y: 206, t }, frontPose({ def }, t % 3)), { box: [20, 0, 340, 330] });
    TXT.draw(g, def.name, W / 2, 10, { size: 30, align: 'center', fill: 'fire' });
    TXT.draw(g, 'IS THE CHAMPION OF', W / 2, 46, { size: 14, align: 'center', fill: 'white' });
    TXT.draw(g, G.title, W / 2, 62, { size: 24, align: 'center', fill: 'blood' });
    if (G.endingLine) TXT.draw(g, G.endingLine, W / 2, 214, { size: 9, align: 'center', fill: 'gold', italic: false });
    if (game.pt > 2.5) ui.push({ x: 0, y: 0, w: W, h: H, fn: () => { FX.reset(); screen = 'title'; } });
    game.pt += 1 / 60;
    grit();
  }
  function renderPause() {
    ui = [];
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
    TXT.draw(ctx, 'PAUSED', W / 2, 30, { size: 30, align: 'center', fill: 'gold' });
    const bx = W / 2 - 60;
    uiButton('RESUME', bx, 76, 120, 26, () => { paused = false; SFX.blip(); });
    uiButton('MOVES', bx, 108, 120, 26, () => { screen = 'moves'; movesBack = 'play'; SFX.blip(); });
    uiButton(SFX.isMuted() ? 'SOUND: OFF' : 'SOUND: ON', bx, 140, 120, 26, () => { SFX.setMuted(!SFX.isMuted()); SFX.blip(); });
    uiButton('QUIT', bx, 172, 120, 26, () => { paused = false; screen = 'title'; FX.reset(); SFX.blip(); SFX.music('menu'); });
  }
  function uiTap(x, y) {
    const r = cv.getBoundingClientRect(), cx = (x - r.left) / r.width * W, cy = (y - r.top) / r.height * H;
    if (uiPress) return;
    for (let i = ui.length - 1; i >= 0; i--) { const b = ui[i]; if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
      if (b.btn) { uiPress = b; SFX.blip(); setTimeout(() => { const p = uiPress; uiPress = null; if (p) { ui = []; p.fn(); } }, 130); return; }
      ui = []; b.fn(); return; } }
  }
  function uiKey() { if (ui.length) { const b = ui[ui.length - 1]; ui = []; b.fn(); } }

  function render() {
    R.digi.frame++;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (screen === 'title') return renderTitle();
    if (screen === 'select') { game.time += 0; return renderSelect(); }
    if (screen === 'moves') return renderMoves();
    if (screen === 'ladder') return renderLadder();
    if (screen === 'opp') return renderOpp();
    if (screen === 'arena') return renderArena();
    if (screen === 'result') return renderResult();
    if (screen === 'continue') { game.pt += 1 / 60; return renderContinue(); }
    if (screen === 'ending') return renderEnding();
    renderPlay();
  }

  // ---------- sizing ----------
  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    W = Math.round(clamp(H * vw / vh, 400, 540));
    cv.width = W; cv.height = H;
    let cw = vw, ch = vw * H / W;
    if (ch > vh) { ch = vh; cw = vh * W / H; }
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    cv.style.left = (vw - cw) / 2 + 'px'; cv.style.top = (vh - ch) / 2 + 'px';
    placeStick(...defaultStickPos());
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  resize();
  elBtn.P.style.cssText = 'right: calc(16px + env(safe-area-inset-right)); bottom: calc(20px + env(safe-area-inset-bottom));';
  elBtn.K.style.cssText = 'right: calc(122px + env(safe-area-inset-right)); bottom: calc(12px + env(safe-area-inset-bottom));';
  elBtn.B.style.cssText = 'right: calc(56px + env(safe-area-inset-right)); bottom: calc(124px + env(safe-area-inset-bottom));';

  // ---------- main loop ----------
  let last = performance.now(), acc = 0;
  const STEP = 1 / 60;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    acc += dt * (window.MK_SPEED || 1);
    let n = 0;
    while (acc >= STEP && n < 40) { if (screen !== 'play') game.time += STEP; step(STEP); acc -= STEP; n++; }
    if (n >= 40) acc = 0;
    render();
    requestAnimationFrame(frame);
  }
  TXT.ready.then(() => { last = performance.now(); requestAnimationFrame(frame); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && screen === 'play') paused = true; });

  window.MK = { game, ladder, sel, get p1() { return p1; }, get p2() { return p2; }, get screen() { return screen; }, set screen(v) { screen = v; }, startMatch, newLadder, startFatality, startSpecial, PS, MV,
    set paused(v) { paused = v; }, get cam() { return cam; }, set cam(v) { cam = v; }, act, applyHit, contact, tryHit, projs: () => projs };
  if (AUTO) setTimeout(() => { const q = new URLSearchParams(location.search); ladder.pick = +(q.get('p') || 0); newLadder(); if (q.get('o')) { const o = ROSTER.ALL[q.get('o')]; ladder.opps[0] = o; } if (q.get('s')) ladder.stages[0] = q.get('s'); startMatch(); }, 600);
})();
