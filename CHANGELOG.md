# Changelog

## 1.8.6 (2026-11-27)

- `GAME.titleSize`, optional: the title's type size on a title screen with `GAME.titleScene` (default 40; stacked lines are spaced to match).

## 1.8.5 (2026-11-27)

- `GAME.titleStack`, optional: on a title screen with `GAME.titleScene`, the title's words are stacked one per line ("MUNCIE" over "KOMBAT"). Without it the title screen is unchanged.

## 1.8.4 (2026-11-27)

- `GAME.kicker`, optional: a small line stacked above the title on the title screen (Muncie Kombat: "PURPLE HIPPO ARCADE'S"). Without it the title screen is unchanged.

## 1.8.3 (2026-11-27)

- Fighter and opponent screens: FIGHT and NEXT are bigger (96 by 33), and MOVES and RANDOM sit further left, clear of them. The bio's width keeps clear of both.

## 1.8.2 (2026-11-27)

- The fighter and opponent screens always show the whole bio. It gets the full width between BACK and the action buttons and as many lines as fit; the type steps down from 8 to as small as 5.5 only when a bio needs it.
- `SFX.howl` is a real wolf howl now: it scoops up, holds with a wobble and sags away, about 2.3 seconds.

## 1.8.1 (2026-11-27)

- The announcer no longer cuts itself off. A line asked for while another is still playing waits for it to finish; one that has waited more than 2.5 seconds is dropped as stale. Lines from `SFX.sayAll` and lines with a callback are never dropped.
- In single match the announcer says the opponent's name when you confirm them, the same as your own pick.

## 1.8.0 (2026-11-27)

- The fighter screen and the opponent screen share one layout, and it is the only one. The portrait grid fills the left side: as many rows as needed at up to six portraits each, the counts as even as possible (16 fighters: 6, 5, 5; 24: four rows of 6), each row centered. The spotlight on the right shows the fighter facing left. BACK is bottom left; bottom right is MOVES plus FIGHT on the fighter screen (NEXT in single match, since choosing the opponent comes next) and RANDOM plus NEXT on the opponent screen. Bosses keep their BOSS tag.
- Removed `GAME.selectCols` and `GAME.selectLayout` (the classic screen). Games that set them can leave them in; they are ignored.
- `GAME.titleScene(g, W, H, t)`, optional: paints a scene behind the title screen. The title moves to the top and the mascot emblem is skipped. Without it the title screen is unchanged.

## 1.7.0 (2026-11-26)

- New select screen, now the default for every game: a big portrait grid fills the left of the screen, the spotlight with the chosen fighter (facing left) is on the right, BACK is bottom left and MOVES and FIGHT are bottom right. Portraits are capped at 84 pixels wide. `GAME.selectLayout = 'classic'` brings back the old screen. This replaces 1.6.0's `selectLayout: 'wide'`, which is no longer needed.

## 1.6.0 (2026-11-26)

- `GAME.selectLayout = 'wide'`: the select grid fills the whole right side of the screen with bigger portraits (about 48 pixels wide instead of 35 for 24 fighters on a phone), the name and bio sit under the grid, and BACK, MOVES and FIGHT move into a row under the fighter preview. Without the setting the select screen is unchanged.

## 1.5.0 (2026-11-26)

- Silence: a command grab (`cgrab`, `hold: 'stun'`) with `silence: n` in its mod leaves the opponent unable to use specials for n seconds, with a strip of tape over the mouth. The CPU respects it too. Nothing changes unless a fighter's move sets it.
- Testing: `window.MK.startSpecial(fighter, special)` starts a special directly.

## 1.4.0 (2026-11-26)

Three optional settings. A game that doesn't set them plays exactly as before.

- `GAME.comboDamage = { from, scale, cap, healCap }`: in a combo (hits landing while the opponent is still reeling, airborne or held), each hit after the `from`th does `scale` times the one before, the whole combo takes at most `cap` health, and the health a combo gives back is at most `healCap`. Without it, the Matrix moves' long chains (hang time punches, the Burly Brawl Flurry) skip the usual limiter and a combo heals 2 per hit, so one chain could swing about half a health bar.
- `GAME.selectCols`: the number of columns on the select screen (POTUS Kombat: 6, for four rows of six).
- `GAME.ladder.opponents`: the ladder draws this many regular opponents at random from the roster instead of every fighter, so a long roster keeps the same ladder length. Endurance pairs still come from the whole roster.

## 1.3.2 (2026-11-26)

- After a fatality the announcer calls the winner (`<name> wins`), then FATALITY, then FLAWLESS VICTORY (or the game's `GAME.calls.flawless`) if the winner took no damage that round. Each line waits for the one before it to finish, with recorded clips or text-to-speech. The banners appear in the same order, and the fatality screen holds a little longer so the last line isn't cut off.
- `SFX.sayAll([lines])` plays announcer lines one after another; `SFX.say` takes an optional callback for when a line finishes.

## 1.3.1 (2026-11-26)

- The CPU kips up at most twice per match, instead of on roughly half its knockdowns.

## 1.3.0 (2026-11-26)

Three new Matrix moves for every fighter (except those with `noMatrix`). The CPU uses them too. Nothing changes in a game's content files.

- Burly Brawl Flurry (FORWARD, FORWARD + PUNCH): rush in, a slow-motion blur of fists, then a palm strike that sends the opponent across the arena.
- Phase Dash (hold BLOCK, then tap FORWARD): blur straight through the opponent and come out behind them, untouchable while dashing. Holding forward and then blocking still just blocks. Once every 0.7 seconds.
- Kip-Up Spin Kick (KICK while knocked down): spin up off the floor with a leg sweep that knocks the opponent down. Seated fighters spin the chair (KIP-UP CHAIR SPIN).
- The moves screen lists all three.

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
