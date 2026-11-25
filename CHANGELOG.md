# Changelog

## 1.0.0 (2026-11-25)

First release, extracted from Muncie Kombat with no change to how it plays.

- Engine files: `text.js`, `rig.js`, `fighterkit.js`, `fx.js`, `stagekit.js`, `audio.js`, `fatal.js`, `game.js`, `install.js`, `kombat.css`, fonts.
- Games provide `ROSTER` (via `KIT.roster()`), arenas (via `STAGES.define()`), fatalities (via `FATAL.add()`) and `window.GAME` (titles, mascot, victory poses).
- Behavior that used to be tied to specific Muncie Kombat fighters is now driven by fighter fields: `arena`, `death`, `ladderOnly`, `cpuLvl`, `aiStyle`, `sp2Mod`, `fireTrail`, `feathers`, `glass`, `vanish`, `portrait`.
