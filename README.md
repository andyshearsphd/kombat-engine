# Kombat Engine

The shared fighting game engine behind Muncie Kombat and the games that follow it: an early-90s arcade fighter for phones in landscape, written in plain JavaScript and the HTML canvas with no build step and no libraries.

The engine handles everything that isn't specific to one game: the skeletal fighter rig and digitized look, controls (touch joystick, buttons, keyboard), moves, combos, throws, Matrix moves, up to three specials and three fatalities per fighter, projectiles, the CPU opponent, blood and gore, the camera, rounds and FINISH HIM, the fatality player, the arcade ladder (with optional mirror match and endurance rounds), single match, menus, the HUD, the synthesized music, sound effects and announcer, and the add-to-home-screen card.

A game supplies the content: its fighters, arenas, fatalities, victory poses, titles and icons.

## What's new in 1.8.2

The fighter and opponent screens always show a fighter's whole bio, and `SFX.howl` sounds like a wolf. 1.8.1: the announcer waits for a line to finish instead of cutting it off, and in single match it calls the opponent's name too.

1.8.0: one layout for both the fighter and opponent screens, and it is the only one: the portrait grid fills the left side, filled from the middle with rows as even as possible and at most six to a row (16 fighters make rows of 6, 5 and 5; 24 make four rows of 6). The spotlight is on the right with the fighter facing left, BACK is bottom left and the two action buttons are bottom right. In single match the fighter screen says NEXT, since the opponent screen comes next. `GAME.selectCols` and `GAME.selectLayout` are gone. A new optional `GAME.titleScene(g, W, H, t)` paints a picture behind the title screen.

1.5.0 added a silence status for command grabs (`silence: n` in a `cgrab` mod): no specials for n seconds. 1.4.0 added combo damage scaling and a cap per combo (`GAME.comboDamage`) and a ladder that draws a set number of opponents at random (`GAME.ladder.opponents`). See Settings below.

1.3.0 added three Matrix moves that every fighter gets automatically (the CPU uses them too): the Burly Brawl Flurry, the Phase Dash and the Kip-Up Spin Kick. See Controls below. Full history in `CHANGELOG.md`.

## What was new in 1.1.0

Everything is optional, so a game written for 1.0.0 keeps working unchanged. Full details are in `CHANGELOG.md`.

- Up to three specials and three fatalities per fighter. The CPU picks among a fighter's fatalities.
- New special moves: weapon swings, rising uppercuts, parries (block a hit or knock a projectile back), and command grabs that drain, shake, stun or pull from long range.
- Games can define their own projectiles: arcs, bounces, spreads, bursts, strikes from the sky, boomerangs, fire trails and ghost doubles. New hit effect: slow.
- Throw styles per fighter: suplex, hip toss, shoulder throw or spin throw.
- Seated fighters in an armored wheelchair, with seated poses, a chair ram and a roll-over stomp.
- Ladder options: a mirror match and endurance rounds.
- Announcer calls and voice can be changed per game, with an optional old-radio crackle. Games can add their own tunes over the industrial soundtrack.
- Each game can keep its own mute setting.
- Arenas can react to crowd hype.
- The moves screen lists each fighter's own specials, fatalities and throw, and the current game's pit arenas. The select screen holds more than 16 fighters.

## Games on this engine

| Game | Repo | Engine version |
| --- | --- | --- |
| Muncie Kombat | [andyshearsphd/Muncie-Kombat](https://github.com/andyshearsphd/Muncie-Kombat) ([play](https://andyshearsphd.github.io/Muncie-Kombat/)) | 1.8.2 |
| POTUS Kombat | [andyshearsphd/POTUS-Kombat](https://github.com/andyshearsphd/POTUS-Kombat) | 1.8.1 |

## Controls

Every game on the engine plays the same way. On a phone: a joystick on the left, PUNCH, KICK and BLOCK buttons on the right. On a keyboard: arrows or WASD to move, J or Z to punch, K or X to kick, L, C or Shift to block, P or Escape to pause, Enter or Space on menus.

| Input | Move |
| --- | --- |
| PUNCH | Jab (tap again for a combo) |
| DOWN + PUNCH | Uppercut |
| TOWARD + PUNCH (close) | Throw (suplex, or the fighter's own throw) |
| BACK + PUNCH (close) | Wad toss across the arena |
| KICK | Kick |
| DOWN + KICK | Sweep |
| BACK + KICK | Spinning back kick |
| UP | Jump (punch or kick in the air) |
| BLOCK (hold) | Block (hold DOWN too to block low) |
| BLOCK + UP | Bullet dodge (counters if it dodges) |
| BACK, BACK + KICK | Wall run flying kick |
| In the air: DOWN + PUNCH | Hang time |
| FORWARD, FORWARD + PUNCH | Burly Brawl Flurry: rush in, a slow-motion blur of fists, then a palm strike across the arena |
| Hold BLOCK, then tap FORWARD | Phase Dash: blur through the opponent and come out behind them, untouchable while dashing |
| KICK while knocked down | Kip-Up Spin Kick: spin up off the floor with a leg sweep (seated fighters spin the chair) |
| BACK, FORWARD + PUNCH | Special 1 |
| DOWN, FORWARD + KICK | Special 2 |
| DOWN, BACK + PUNCH | Special 3 (fighters who have one) |
| At FINISH: DOWN, DOWN + PUNCH | Fatality 1 |
| At FINISH: FORWARD, FORWARD + KICK | Fatality 2 (fighters who have one) |
| At FINISH: BACK, BACK + PUNCH | Fatality 3 (fighters who have one) |
| At FINISH in an arena with a pit: DOWN + PUNCH | Stage fatality |

Jumping on a downed opponent stomps them. Matches are best of three rounds. The CPU always performs a fatality when it wins, picking among the fighter's fatalities.


## Versions

The current version is in `VERSION`, and `CHANGELOG.md` lists what changed in each release.

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

## Starting a new game

1. Make a new repo with GitHub Pages turned on.
2. Copy Muncie Kombat's `index.html`, `manifest.webmanifest` and `icons/` into it, and change the title, the rotate-your-phone text, the `data-name`/`data-key`/`data-accent` on the `install.js` tag, and the icons.
3. From this repo, run `tools/sync.sh ../New-Game` to copy the engine in.
4. Write the four content files in `js/`, described below. Muncie Kombat's versions are complete working examples.
5. Open it with `?auto&p=0&o=<opponent id>&s=<arena id>` to jump straight into a fight while building.

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
| `stats: { speed, power, weight, armor, frail }` | Walk and jump speed, damage dealt, how far hits knock them, and damage taken (`armor` and `frail` multiply it). Any `armor` value also lets them shrug off stun hits without flinching |
| `tune: n` | With `GAME.tunes`, which tune plays when this fighter is the opponent (by index) |

Specials and fatalities (1.1):

| Field | Effect |
| --- | --- |
| `sp1`, `sp2`, `sp3` | Specials: `{ kind, name, mod }`. Slot 1 is BACK, FORWARD + PUNCH, slot 2 DOWN, FORWARD + KICK, slot 3 DOWN, BACK + PUNCH. `kind: 'proj'` throws `proj: { kind }`; any other kind is a move. `mod` overrides the move's numbers (`dmg`, `t`, `box`, `fx`, `vx`, `vy`, `range`, `hold`, `word`, `fire`, `sfx`). `ai: [min, max]` sets the distance the CPU uses it at |
| `proj`, `sp2Mod` | The 1.0 way to write slot 1 and slot 2 tuning; still works |
| `fatals: [{ id, name }]` | Up to three fatalities (slots DOWN, DOWN + PUNCH; FORWARD, FORWARD + KICK; BACK, BACK + PUNCH). The 1.0 fields `fatal` and `alt` still work |
| `throw` | `suplex` (default), `hip`, `shoulder` or `spin` |
| `chair: true` or `{ metal, tire, plate, spikes }` | Fights seated in an armored wheelchair: seated poses, chair ram for kicks, roll-over stomp, no wall run |

Move kinds added in 1.1: `swing` (weapon strike; draw the weapon in `frontHand` when `st.move === 'swing'`), `rise` (rising uppercut, `mod.fire` for flames), `parry` (stops a hit or sends a projectile back; `mod.word` is the banner), `cgrab` (command grab; `mod.hold` is `drain`, `shake`, `stun` or `pull`, `mod.range` its reach). Hit effects: `stun`, `daze`, `blind`, `slow`, `knock`, `launch`, `trip`.

While a fighter is attacking, `st.move` is the move kind, `st.mname` its name and `st.mt` its time, so drawing hooks can show weapons and props. `st.wheel` is the chair wheel angle.

Projectile kinds (`proj.kind`): `poop`, `knife`, `hairball`, `card`, `bball`, `gust`, `can`, `wave`, `shards`, `feather`, `drumstick`, `spray`, `howl`, `book`, `notice`, `hellfire`, `oil`, `log`, `shimmer`, `teeth`.

Second special kinds (`sp2.kind`): `rush`, `roll`, `slide`, `leap`, `cloud`, `blow`, `flurry`, `sneak`, `burrow`, `playdead`, plus the 1.1 kinds above.

A game can define its own projectile kinds in `GAME.projectiles` (1.1):

```js
projectiles: {
  rail: { speed: 320, vy: -60, grav: 300, dmg: 10, fx: 'knock', launch: [220, -320], draw(g, p, s, t) { /* origin at the projectile, s = direction */ } },
  mortar: { sky: { count: 3, spread: 50, delay: 0.4, gap: 0.2, speed: 600 }, dmg: 8, fire: true, draw(g) { } },
  hat: { boomerang: true, turn: 0.45, dmg: 7, draw(g, p, s, t) { } },
}
```

Fields: `speed`, `vy`, `grav`, `bounce`, `dmg`, `w`, `h`, `y` (launch height), `low`, `trip`, `blind`, `slow`, `slowT`, `push`, `launch: [vx, vy]`, `fx`, `life`, `spread: [vy, ...]`, `burst: { n, gap, jitter }`, `sky: { count, spread, delay, gap, speed }`, `boomerang`, `turn`, `fire`, `ghost` (true or a color: a running double of the thrower), `cool`, `sfx`, `hitSfx`, `word`, `burstGibs`, `draw`.

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
    live(g, id, t, info) { },    // animated bits drawn every frame; info.hype is 0 to 1 (crowds)
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
  // 1.1, all optional:
  ladder: { mirror: true, endurance: 2 },  // a mirror match and two endurance rounds before the bosses
  calls: { fight: 'FIGHT!', round: 'ROUND', finish: 'FINISH %s!', fatality: 'FATALITY', flawless: 'FLAWLESS VICTORY', wins: 'WINS', next: 'NEXT FIGHTER', mirror: 'MIRROR MATCH', endurance: 'ENDURANCE' },
  voice: { pitch: 0.2, rate: 0.82, prefer: /Daniel|Fred/i, radio: false },  // radio adds old-broadcast crackle
  muteKey: 'mk_muted',                 // where the mute setting is saved
  tunes: [{ name, bpm: 132, notes: 'C5/2 C5/2 D5/2 E5/2 ...', chords: 'C G C F', chordSteps: 16 }],  // fight music; an opponent's tune: n picks one, otherwise it rotates
  menuTune: { name, bpm: 92, notes, chords },
  projectiles: { },                    // see Fighters
  // 1.4, all optional (leave them out to keep the earlier behavior):
  comboDamage: { from: 3, scale: 0.85, cap: 25, healCap: 6 },  // hits after the 3rd do 15% less each, one combo takes at most 25% of the bar, a combo heals at most 6
  // 1.8, optional:
  titleScene(g, W, H, t) { },          // paints the title screen background; the title moves to the top and the emblem is skipped
  // ladder: { mirror: true, endurance: 2, opponents: 15 },  // fight 15 opponents picked at random instead of the whole roster
};
```

Tune notes are note names with octave (`C5`, `F#4`, `Bb3`) or `r` for a rest, each with its length in sixteenth steps after a slash. Chords are one per `chordSteps` steps.

## Changing the engine

1. Make the change here in `engine/` and test it in one game (sync it in locally, don't commit there yet).
2. Bump `VERSION` (1.0.1 for a fix, 1.1.0 for something new, 2.0.0 if games must change their content files) and add a `CHANGELOG.md` entry.
3. Commit here, then sync, test and commit each game that should get the update, and update the table above.

Game-specific content never goes in the engine. If a game needs new behavior, add it as a fighter field, a `GAME` setting or a registered script so other games can use it too.

Standing policy: when one game needs the engine to behave differently (a bigger select grid, softer combos), the change is a setting whose default keeps the old behavior. Every game keeps working as it did until it opts in. The exception is the fighter and opponent screens, which have one layout for every game by Andy's choice (1.8.0).

### Known items for the next release

None right now. Fixed in 1.1.0: the moves screen lists the current game's pit arenas, the select screen grows past 16 fighters, and each game can keep its own mute setting with `GAME.muteKey` (games that don't set it still share `mk_muted`).

## Testing

Add `?auto&p=0&o=painter&s=bridge` to the URL to jump straight into a fight (fighter index, opponent id, arena id). `window.MK` exposes the game state for automated checks.

## Credits

Fonts in `engine/fonts/`, all under the SIL Open Font License: Metal Mania by Open Window, Nosifer by Vernon Adams (Typomondo), Anton by The Anton Project Authors.

The games built on this engine are parodies and homages. They are not affiliated with or endorsed by the makers of Mortal Kombat.
