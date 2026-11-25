# Kombat Engine

The shared fighting game engine behind Muncie Kombat and the games that follow it: an early-90s arcade fighter for phones in landscape, written in plain JavaScript and the HTML canvas with no build step and no libraries.

The engine handles everything that isn't specific to one game: the skeletal fighter rig and digitized look, controls (touch joystick, buttons, keyboard), moves, combos, throws, Matrix moves, projectiles, the CPU opponent, blood and gore, the camera, rounds and FINISH HIM, the fatality player, the arcade ladder, single match, menus, the HUD, the synthesized music, sound effects and announcer, and the add-to-home-screen card.

A game supplies the content: its fighters, arenas, fatalities, victory poses, titles and icons.

## Versions

The current version is in `VERSION`, and every release is a git tag (`v1.0.0`, ...). See `CHANGELOG.md`.

Each game keeps its own copy of the engine in an `engine/` folder, pinned to one release. A game only moves to a newer engine when someone copies that release in and tests it, so a change made for one game can never break another one by surprise.

To update a game to the engine in this checkout:

```
tools/sync.sh ../Muncie-Kombat
```

That copies `engine/` into the game's `engine/` folder and writes the version number there. Then test the game and commit it.

## Files

Everything in `engine/` is loaded by a game's `index.html` with plain script tags, in this order:

| Order | File | From | What it is |
| --- | --- | --- | --- |
| | `engine/kombat.css` | engine | Page, canvas, touch controls, rotate-your-phone card, fonts |
| 1 | `engine/text.js` | engine | Arcade lettering (`TXT`) |
| 2 | `engine/rig.js` | engine | Skeletal rig, shaded body drawing, skeletons and skulls (`RIG`) |
| 3 | `engine/fighterkit.js` | engine | Body proportions, head and face helpers, `KIT.roster()` (`KIT`) |
| 4 | `js/fighters.js` | game | The roster: defines `ROSTER` |
| 5 | `engine/fx.js` | engine | Blood, gore, gibs and screen effects (`FX`) |
| 6 | `engine/stagekit.js` | engine | Arena painting helpers and registry (`STAGES`) |
| 7 | `js/stages.js` | game | The arenas: calls `STAGES.define()` |
| 8 | `engine/audio.js` | engine | Synthesized sound, music and announcer (`SFX`) |
| 9 | `engine/fatal.js` | engine | The fatality player (`FATAL`) |
| 10 | `js/fatalities.js` | game | Fatalities and boss deaths: calls `FATAL.add()` |
| 11 | `js/config.js` | game | Titles and victory poses: sets `window.GAME` |
| 12 | `engine/game.js` | engine | The game itself |
| 13 | `engine/install.js` | engine | Add-to-home-screen card (`data-name`, `data-key`, `data-accent`, `data-icon`) |

The page also needs the elements `engine/game.js` drives: `#game` (canvas), `#controls` with `#stickBase`/`#stickKnob`, `#bBlock`, `#bKick`, `#bPunch`, plus `#pauseBtn` and `#rotate`. Copy them from Muncie Kombat's `index.html`.

## What a game provides

### Fighters: `js/fighters.js`

```js
const ROSTER = (() => {
  const { R, PI, sh, dims, lit, fillLit, eye, brow, humanHead, humanFront, eyesF, vNeck, belt, bellyPatch, frontTail } = KIT;
  const lincoln = { id: 'lincoln', name: 'ABE LINCOLN', short: 'LINCOLN', k: 1.1, d: dims({ ... }), proj: { kind: 'card', name: '...' }, sp2: { kind: 'rush', name: '...' }, fatal: { id: 'lincoln', name: '...' }, ... };
  const FRONT = { lincoln: { detail(g, d, G) { ... }, head(g, st) { ... } } };   // front view for victory poses
  return KIT.roster([lincoln /* playable */], [/* bosses, last = final boss */], { front: FRONT, portrait: { lincoln: [0.4, 0.9, 1] } });
})();
```

Muncie Kombat's `js/fighters.js` is the full example of a fighter definition.

Optional fields the engine reads from a fighter:

| Field | Effect |
| --- | --- |
| `boss: true` | Shown with a BOSS tag; bosses come after the regular fighters on the ladder |
| `arena: 'id'` | The arena a boss is fought in on the ladder |
| `death: 'id'` | Boss death script (from `FATAL.add`) |
| `ladderOnly: true` | Left out of single match (the final boss) |
| `plainFinish: true` | A boss who gets a normal FINISH HIM instead of a death script |
| `cpuLvl: n` | Fixed CPU skill, 0 to 1 |
| `aiStyle: { noBlock, quips: [...], taunt: chance }` | CPU quirks |
| `sp2Mod: { ... }` | Extra fields merged into the second special (`dmg`, `quake`, `fire`) |
| `fireTrail: true` | Flames while leaping |
| `feathers: '#color'` | Feathers fly off when hit |
| `glass: true` | Bleeds glass and green brine instead of blood, no wounds |
| `vanish: true` | Disappears once a script marks it gone |
| `skull: 'type'`, `skullK` | Skull shape in skeleton fatalities: human (default), `devil`, `hippo`, `cat`, `raccoon`, `muskrat`, `goose`, `cardinal`, `turkey` |
| `portrait: [x, y, scale]` | Head placement in select-screen portraits |

Projectile kinds (`proj.kind`): `poop`, `knife`, `hairball`, `card`, `bball`, `gust`, `can`, `wave`, `shards`, `feather`, `drumstick`, `spray`, `howl`, `book`, `notice`, `hellfire`, `oil`, `log`, `shimmer`, `teeth`.

Second special kinds (`sp2.kind`): `rush`, `roll`, `slide`, `leap`, `cloud`, `blow`, `flurry`, `sneak`, `burrow`, `playdead`.

### Arenas: `js/stages.js`

```js
(() => {
  const { R, PI, H, AWX, BW, CX, FY, rand, rr, shade, setSeed, vg, glow, bricks, pfloor, vignette /* ... */ } = STAGES.kit;
  function oval(B, F) { setSeed(5); /* paint the back layer B (BW wide) and the floor layer F (AWX wide) */ }
  STAGES.define({
    defs: { oval: { name: 'THE OVAL OFFICE', draw: oval }, /* pit: 'id' enables a stage fatality */ },
    fallback: 'oval',
    rotation: ['oval'],          // arenas dealt to regular ladder opponents
    single: ['oval'],            // arenas offered in single match
    live(g, id, t) { },          // animated bits drawn every frame
    drawBelow(g, W, t, kind) { }, // view from below for stage fatalities
  });
})();
```

### Fatalities: `js/fatalities.js`

```js
FATAL.add(K => {
  const { R, P, PI, rnd, lerp, pick, ease, walkTo, J, prop, center, headGib, skullGib } = K;
  const S = {};
  S.lincoln = (s, A, V, api) => { s.at(1.0, () => { /* ... */ }); s.at(3.5, () => { s.done = true; }); };
  return S;
}, { noCenter: [/* scripts that should not recenter the fighters, like boss deaths and stage fatalities */] });
```

### Settings: `js/config.js`

```js
window.GAME = {
  title: 'MUNCIE KOMBAT',
  subtitle: 'A PURPLE HIPPO ARCADE GAME',
  ladderGoal: 'CITY HALL',             // "19 FIGHTS TO CITY HALL"
  endingLine: '...',                   // under the champion on the ending screen
  mascot: 'hippo',                     // fighter whose head is on the title emblem
  toasty: { fighter: 'hippo', text: 'SQUARE SLICED!' },  // optional pop-in after uppercuts
  winPoses(K) { return { hippo: { fp(t) { }, fx(f, t) { }, draw(g, f, t) { } } }; },
};
```

## Testing

Add `?auto&p=0&o=painter&s=bridge` to the URL to jump straight into a fight (fighter index, opponent id, arena id). `window.MK` exposes the game state for automated checks.

## Credits

Fonts in `engine/fonts/`, all under the SIL Open Font License: Metal Mania by Open Window, Nosifer by Vernon Adams (Typomondo), Anton by The Anton Project Authors.

The games built on this engine are parodies and homages. They are not affiliated with or endorsed by the makers of Mortal Kombat.
