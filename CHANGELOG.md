# Changelog

## 1.1.0 (2026-11-25)

New features for POTUS Kombat. Everything is optional: a game written for 1.0.0 keeps working unchanged.

- Up to three specials per fighter (`sp1`, `sp2`, `sp3`). Slot 3 is DOWN, BACK + PUNCH. The 1.0 fields `proj` and `sp2` still work.
- New special kinds: `swing` (weapon strike), `rise` (rising uppercut), `parry` (blocks a hit or knocks a projectile back), `cgrab` (command grab that drains, shakes, stuns or pulls from range). Any kind can be tuned with `mod`.
- Game-defined projectiles (`GAME.projectiles`): speed, arc, bounce, spreads, bursts, strikes from the sky, boomerangs, fire trails, ghost doubles, and the game's own drawing.
- New hit effect `slow`: the victim moves at half speed for a few seconds.
- Up to three fatalities per fighter (`fatals`). Slot 3 is BACK, BACK + PUNCH. The CPU picks among them.
- Throw styles per fighter (`throw`): `suplex` (default), `hip`, `shoulder`, `spin`.
- Seated fighters (`chair`): an armored wheelchair, seated poses for every move, a chair ram for kicks, and a roll-over stomp.
- Arcade ladder options (`GAME.ladder`): a mirror match and endurance rounds (two opponents back to back, the second runs in when the first goes down).
- Announcer calls (`GAME.calls`), announcer voice (`GAME.voice`, with an optional radio crackle), and game tunes played over the industrial kit (`GAME.tunes`, `GAME.menuTune`).
- Each game can keep its own mute setting (`GAME.muteKey`).
- Arenas get crowd hype: `live(g, id, t, info)` receives `info.hype` (0 to 1, rises on big hits and fatalities).
- The moves screen lists the fighter's own specials, fatalities and throw, and the current game's pit arenas.
- The select screen grows past 16 fighters.

## 1.0.0 (2026-11-25)

First release, extracted from Muncie Kombat with no change to how it plays.

- Engine files: `text.js`, `rig.js`, `fighterkit.js`, `fx.js`, `stagekit.js`, `audio.js`, `fatal.js`, `game.js`, `install.js`, `kombat.css`, fonts.
- Games provide `ROSTER` (via `KIT.roster()`), arenas (via `STAGES.define()`), fatalities (via `FATAL.add()`) and `window.GAME` (titles, mascot, victory poses).
- Behavior that used to be tied to specific Muncie Kombat fighters is now driven by fighter fields: `arena`, `death`, `ladderOnly`, `cpuLvl`, `aiStyle`, `sp2Mod`, `fireTrail`, `feathers`, `glass`, `vanish`, `portrait`.
