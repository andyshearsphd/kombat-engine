# Changelog

## 1.2.1 (2026-11-25)

- Command grabs (`cgrab`) catch only once per use. A `stun` or `drain` hold left the foe stunned and rewound the move into its grab window, so it grabbed again and again until the foe ran out of health (LBJ's Johnson Treatment, Jackson's Spoils System).

## 1.2.0 (2026-11-25)

- Recorded announcer clips (`GAME.voiceClips`, a folder path such as `'voice/'`). The folder holds `manifest.json`, a list of phrase slugs, and one `.mp3` per slug. A slug is the spoken line in lowercase with every run of other characters turned into `-` (`'franklin d. roosevelt wins'` becomes `franklin-d-roosevelt-wins`). Clips play through the game's own audio, so the announcer is heard wherever the music is; phones that block the browser's text-to-speech (iPhone Safari in particular) now hear the announcer too. Lines without a clip still use text-to-speech. Clips load on the first tap. The radio crackle (`GAME.voice.radio`) plays under clips as well.

## 1.1.2 (2026-11-25)

Fixes for POTUS Kombat. Nothing changes for a game that doesn't use these features.

- Throws: a slow throw (the `spin` style) no longer gets cut off by the throw move's timer, and a fighter left held by someone who has stopped holding them drops to the floor instead of hanging in mid-air.
- Seated fighters lean at most part way forward, so standing throw poses no longer fold them over to the floor.
- Seated fighters (`chair`) can now do the BACK, BACK + KICK wall move: the chair rides up the wall on its wheels, throwing sparks, and launches into a flying chair ram. The moves screen lists it as WALL RIDE FLYING CHAIR RAM.
- Game tunes: the melody keeps its own place in the tune, so it starts from the first note after the drum intro instead of partway into the song, and comes back in where it left off after each drum break.

## 1.1.1 (2026-11-25)

Faster on phones (about 75% more frames per second with the CPU slowed 5x in testing). Looks and plays the same.

- The film grain is two pre-made noise layers drawn over the frame instead of reading back and rewriting every pixel, so the game canvas stays on the GPU.
- Each fighter's digitized sprite is cached and redrawn every other frame, the two fighters on alternating frames (every frame during fatalities). `RIG.digi` takes `cache`, `every` and `phase`.

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
