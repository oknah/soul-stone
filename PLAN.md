# Soul Stone — JRPG Auto-Battler Evolution Plan

**Status: All tasks completed (2026-02-07)**

## Vision

Transform Soul Stone from a Diablo 2-themed task tracker into a **JRPG auto-battler** inspired by Final Fantasy VI and Golden Sun battle scenes. The core mechanic stays the same: AI agent tasks summon party members who auto-attack bosses. The skin shifts from dark fantasy / Diablo to classic JRPG.

## What We're Keeping

- **Core battle loop**: task start = summon, task active = auto-attack via ATB, task end = unsummon
- **Server architecture**: ATB tick system, SSE events, boss scaling, character classes, fantasy name generator
- **FF6 blue gradient status panel** with ATB gauges and PressStart2P font
- **Canvas renderer**: 256x224 SNES resolution, offscreen buffer, pixel-perfect scaling
- **Character animation state machine**: IDLE → STEP FORWARD → ATTACK → STEP BACK
- **Synthesized audio**: slash, crit, summon/unsummon, victory fanfare, boss death, SNES echo chain
- **AvQest font** for title/branding, **PressStart2P** for battle UI
- **CRT filter toggle**
- **Widget-optimized layout** for small displays

---

## What Changes

### P1 — Battle Backgrounds (High impact, Low effort)

Replace the procedural starfield/nebula background with static or semi-static JRPG battle backdrops. This is the single highest-impact change for setting the mood.

- Rotate backgrounds per boss or randomly per encounter
- Replace `renderBackground()` with image draws (the infrastructure already exists)
- Keep it simple — even one good background transforms the feel

#### Research Findings

No perfect free pack at exactly 256x224, but strong options exist:

**Recommended: Ansimuz Legacy Collection** (Best overall)
- URL: https://ansimuz.itch.io/gothicvania-patreon-collection
- License: CC0 (no attribution required)
- Resolution: 368x208 — crop to 256 wide (trim 56px per side), pad/stretch 208→224 height
- Includes battle backgrounds across Pack 6 and Pack 7: Ruins, Rocky Pass, Shining Fields, Space, and more
- Also includes characters, monsters, tilesets — potentially useful beyond backgrounds

**Runner-up: Nidhoggn "Backgrounds"** on OpenGameArt
- URL: https://opengameart.org/content/backgrounds-3
- License: CC0
- 10 battle backgrounds (battleback1-10.png), explicitly labeled "RPG battle"
- Resolution unknown — needs download to verify

**Honorable mention: stealthix Pixel-Art Backgrounds**
- URL: https://opengameart.org/content/pixel-art-backgrounds-0
- License: CC0
- 9 hand-drawn backgrounds, Endesga 32 palette, tiny file size suggests authentic low-res

**Gap:** Fire/volcanic and ice/snow biomes aren't covered in confirmed free assets. Options: procedural generation, AI-generated static PNGs, or Ansimuz paid packs ($5-10 each).

#### Adaptation Strategy
```
Ansimuz 368x208 → 256x224:
  Width:  center-crop 368→256 (trim 56px each side)
  Height: scale 208→224 (1.077x, imperceptible) or pad 8px top/bottom
  Canvas: ctx.imageSmoothingEnabled = false for pixel crispness
```

#### Action Items
1. Download Ansimuz Legacy Collection and extract battle background PNGs
2. Download Nidhoggn pack and inspect resolution/quality
3. Test cropping Ansimuz backgrounds to 256x224
4. For missing biomes, generate AI static PNGs or enhance procedural fallback

---

### P2 — Character Sprites (High impact, Medium effort)

Replace the procedural character sprite generator with actual pixel art. The current generator creates recognizable but crude humanoids from body masks and color palettes.

- Need 6 class sprites: warrior, mage, rogue, cleric, ranger, berserker
- Each needs: idle (4-6 frames), attack (3-4 frames), hit (2 frames), death (3-4 frames)
- The sprite system is already abstracted (`SPRITE_CONFIG`, `drawSprite()`, animation state machine) — swapping in real assets is straightforward

#### Research Findings

No single free source perfectly covers all requirements. Three viable paths:

**Recommended: Calciumtrice on OpenGameArt** (Best overall coverage)
- License: CC-BY 3.0
- Sprite size: 32x32, display at 2x = 64x64
- Covers all 6 classes from one artist with consistent style
- Full animation sets: idle, attack, gesture, walk, death
- Individual asset URLs:
  - Warrior: https://opengameart.org/content/animated-warrior
  - Mage: https://opengameart.org/content/mage
  - Rogue: https://opengameart.org/content/animated-rogue
  - Cleric: https://opengameart.org/content/animated-cleric
  - Ranger: https://opengameart.org/content/animated-ranger
  - Berserker: https://opengameart.org/content/adamant-knight (Adamant Knight)
- **Caveat:** 3/4 top-down perspective, not true side-view. Acceptable for a small ambient widget — use right-facing frames.

**Alternative: Holders Animated Battlers Free Heroes** (Best side-view)
- URL: https://holder-anibat.itch.io/holders-animated-battlers-free-heroes
- 15 job classes, 14 poses × 4 frames each, proper side-view
- Frame size 160x160 — designed for RPG Maker. Character within frame may be smaller (~48-64px). Download and check.

**Fallback: 0x72 DungeonTileset II** (Best CC0 base)
- URL: https://0x72.itch.io/dungeontileset-ii
- License: CC0, 16x16, true side-view
- Only 3 characters (knight, wizard, elf), no attack/death animations
- Use as reference for improving procedural generator style

#### Recommended Display Sizes (256x224 canvas)
- 16x16 at 3x = 48x48 (fits ~5 in a row — ideal for party)
- 32x32 at 2x = 64x64 (fits ~4 — good)
- 32x32 at 3x = 96x96 (fits ~2-3 — tight)

#### Action Items
1. Download all 6 Calciumtrice sprite sheets
2. Test at 2x scale (64x64) on the 256x224 canvas
3. If perspective mismatch is too jarring, download Holders pack and check actual character size within 160x160 frames
4. Map animation states to existing state machine (idle→idle, attack→attack, gesture→hit, death→death)

---

### P3 — Boss Sprites (High impact, Medium effort)

Replace placeholder boss sprites with better pixel art. Currently 3 bosses at 32x32 (dragon, demon, golem).

#### Research Findings

No single free source provides enough boss variety alone. A mix of 2-3 sources yields 5-10 distinct bosses.

**Recommended: The Art Of Nemo — Dragon Sprites Pack #1**
- URL: https://theartofnemo.itch.io/free-dragon-pack-1
- License: Free, credit required (theartofnemo.com), no redistribution
- 7 dragon designs: Crimson, Luminous, Blood, Emberheart, Thunderwing, Glacial, Moonshadow
- RPG Maker-sized, side-view compatible, static sprites

**Animated option: Kronovi- Boss Sprites**
- Mecha-Stone Golem: https://darkpixel-kronovi.itch.io/mecha-golem-free
- Frost Guardian: same creator
- Fully animated (up to 9 animation states), dark fantasy aesthetic
- License: free to use, cannot redistribute raw assets

**FF6-style: OpenGameArt "Sideview Pixel Art RPG Enemy Sprites"**
- URL: https://opengameart.org/content/sideview-pixel-art-rpg-enemy-sprites
- License: CC-BY
- Purpose-built FF6-style sideview enemies, community-curated
- Supplement with "RPG Enemies: 11 Dragons" (CC-BY 3.0)

**Wild card: Willibab's Free Mythic Monsters**
- URL: https://willibab.itch.io/free-mythic-monsters
- 31 sideview monsters — if license permits, this alone solves variety
- License needs verification by downloading

#### Programmatic Idle Animation (for static sprites)
Most free boss sprites are static. Add life with canvas effects:
1. Sinusoidal vertical bob (1-2px amplitude, ~2s period)
2. Subtle scaleY breathing (1.0→1.02, ~3s period)
3. Shadow opacity oscillation beneath sprite
4. Color flash on hit events

These are standard SNES JRPG techniques (Dragon Quest, early FF used static battle sprites).

#### Action Items
1. Download Willibab's Free Mythic Monsters and verify license
2. Download Art Of Nemo dragon pack for variety
3. Download Kronovi- packs for animated showcase bosses
4. Implement programmatic idle animation for static sprites (one-time code investment)
5. Ensure all sprites face left (flip horizontally in canvas if needed)

---

### P4 — Boss Names (Medium impact, Trivial effort)

Replace Diablo boss names (Andariel, Duriel, Mephisto, Diablo, Baal) with original JRPG-style boss names.

#### Research Findings

Analysis of naming patterns from FF4-6, Chrono Trigger, Dragon Quest, Golden Sun, Breath of Fire, and Secret of Mana revealed 6 key patterns:

1. **Invented polysyllabic names** — dark vowels (a, o, u), hard consonants. The Dragon Quest school: Baramos, Zoma, Estark. Sound like proper nouns from a dead language.
2. **Title + Name** — poetic epithets, not functional titles. "Autarch of Flame" > "Fire Lord."
3. **Elemental guardians** — sets tied to elements, but names rarely reference their element directly (Rubicante doesn't scream "fire").
4. **Corrupted/tragic names** — imply something fell. Best contain their own contradiction ("Darkshine Knight").
5. **Compound descriptive** — two-word monster names for early/mid bosses. "Wall Face" > "Stone Monster."
6. **Mythological borrowing** — JRPGs pull eclectically from Hindu, Norse, Arabic, Greek. Syncretic, not coherent.

**Key insight:** JRPG boss names often sound *sad*. Western RPG names sound *threatening*.

#### Recommended `BOSS_NAMES` Array

```javascript
const BOSS_NAMES = [
  'Thornmaw',                           // vine-beast, forest threshold
  'Gloomfang',                          // wolf-shade, haunts the old road
  'Ironshell',                          // war construct, forgotten army
  'Velmora',                            // sorceress entombed in crystal
  'Kaldrun, the Scorched Oath',         // cursed knight-commander
  'Sythael',                            // wind-serpent, dead languages
  'Ozrath, the Smoldering Throne',      // volcanic entity
  'Velunis, Warden of Still Waters',    // drowned guardian
  'Morvaine, the Ashen Shepherd',       // figure of soot and embers
  'Zorameth',                           // dreaming void, older than gods
  'Eschavorn, Who Was Everything',      // collapsed god of creation
];
```

The mix of titled and untitled names communicates progression — early bosses don't have titles because they haven't earned the world's attention.

#### Action Item
- Swap `BOSS_NAMES` array in server.js (lines 62-73). Trivial change.

---

### P5 — Color Palette Shift (Medium impact, Low effort)

Shift the overall color scheme from Diablo warm brown/gold to JRPG tones. The FF6 status panel already looks right — bring the rest of the UI in line.

#### Research Findings

Every SNES JRPG studied (FF4, FF5, FF6, Chrono Trigger, Golden Sun) uses the same UI pattern: **dark blue gradient backgrounds, white/near-white body text, gold for names only, white/silver beveled borders**. The warm brown undertones are the single biggest thing separating the app from looking like a JRPG.

#### Three Biggest Changes

1. **Backgrounds: warm brown → deep indigo** — the most impactful single change
2. **Body text: gold → lavender-white** — JRPG body text is always white/near-white
3. **Eliminate all brown tones** — replace with cool equivalents

#### Proposed CSS Custom Properties

```css
:root {
  /* Gold accents — kept for AvQest title and highlights */
  --gold-light: #d4af37;          /* KEPT — title text, treasure gold */
  --gold-mid: #C8B458;            /* FF6-accurate name gold */
  --gold-dark: #8a7a3a;           /* Darker gold, no brown */
  --gold-dim: #4a4428;            /* Very muted gold, no brown */

  /* Backgrounds — deep indigo/blue, the JRPG signature */
  --bg-darkest: #08081a;          /* Near-black with blue undertone */
  --bg-dark: #0e0e28;             /* Dark indigo */
  --bg-panel: #141438;            /* Deep blue panel — the FF6 look */

  /* HP (red) — brighter, cleaner than D2 blood-dark */
  --health-bright: #cc2222;
  --health-mid: #881111;
  --health-dark: #440808;

  /* MP (blue) — richer, distinguishable from bg */
  --mana-bright: #2060c0;
  --mana-mid: #103080;
  --mana-dark: #081840;

  /* Text — white-primary, not gold-primary */
  --text-primary: #e8e0f0;        /* Near-white, faint lavender cast */
  --text-dim: #7878a0;            /* Muted blue-gray */

  /* Element/class accents (Golden Sun inspired) */
  --element-earth: #C8A030;       /* Venus — gold/amber */
  --element-fire: #E04020;        /* Mars — red-orange */
  --element-wind: #8040C0;        /* Jupiter — purple */
  --element-water: #2080E0;       /* Mercury — blue-cyan */
}
```

#### Before/After

| Variable | Diablo (current) | JRPG (proposed) | Change |
|----------|------------------|-----------------|--------|
| `--bg-darkest` | `#0d0d0d` | `#08081a` | black → blue-black |
| `--bg-dark` | `#1a1410` | `#0e0e28` | brown → indigo |
| `--bg-panel` | `#1f1a14` | `#141438` | brown → deep blue |
| `--text-primary` | `#c4a35a` | `#e8e0f0` | gold → lavender-white |
| `--text-dim` | `#7a6a4a` | `#7878a0` | brown → blue-gray |
| `--health-bright` | `#8b0000` | `#cc2222` | darker → brighter |
| `--mana-bright` | `#00008b` | `#2060c0` | pure → cyan-blue |

#### What Stays
- `--gold-light: #d4af37` for AvQest title — gold on dark blue is canonical JRPG
- All `--ff6-*` variables — already correct, they become the anchor
- Status panel gradient (`#7b7bd6` → `#000029`) — already perfect FF6
- PressStart2P font for battle text

#### Contrast Verification (small display safe)
| Pair | Ratio | WCAG AA |
|------|-------|---------|
| `#e8e0f0` on `#141438` | ~11:1 | PASS |
| `#d4af37` on `#141438` | ~6.5:1 | PASS |
| `#7878a0` on `#141438` | ~3.2:1 | Decorative OK |

#### Action Item
- Update `:root` CSS variables in index.html. Update any hardcoded `rgba()` warm-brown values to blue equivalents.

---

### P6 — Orbs: Replace with JRPG Counters (Low impact, Low effort)

**Decision: Option B — Replace with JRPG-style counters.**

The health/mana orbs are pure Diablo II. Replace with clean JRPG-style numeric displays — crystal/gem motif or FF6-style number panels showing party count and kill count. Style them to match the new indigo/gold palette.

#### Action Item
- Design and implement JRPG-style counter elements to replace the orb HTML/CSS

---

### P7 — Persistence & Meta Progression (High impact, Medium effort)

Currently everything is in-memory. Boss kill count resets on server restart.

#### Research Findings

**Winner: Plain JSON file** — zero new dependencies, ~40 lines of code.

Five options evaluated:

| Option | Verdict |
|--------|---------|
| **Plain JSON file** | Winner. Zero deps, `fs.readFileSync`/`writeFileSync`, atomic via write-then-rename |
| lowdb v7 | Blocked — ESM-only, server is CommonJS |
| better-sqlite3 | Overkill — native C++ addon, 10+ deps, SQL for a stats counter |
| Keyv + keyv-file | Poor fit — key-value only, no query capability |
| nedb-promises | Too heavy — 25+ deps, async-only, no aggregation pipeline |

#### Data Model

```javascript
const DEFAULT_STATS = {
  bossKillCount: 0,
  bossNameIndex: 0,
  totalDamage: 0,
  damageByClass: {},     // { warrior: 12345, mage: 6789, ... }
  bossKills: [],         // [{ bossName, maxHP, partySize, timestamp }]
  fastestKill: null,     // { bossName, duration, timestamp }
  sessions: [],          // [{ taskName, characterClass, characterName, startTime, endTime, duration }]
};
```

#### Implementation Approach
1. Add `loadStats()` / `saveStats()` functions using `fs` (built-in, no install)
2. Save file: `soul-stone-data.json` in project root
3. Use write-then-rename for atomic writes: `writeFileSync` to `.tmp`, then `renameSync`
4. Save on **boss kills and session completions only** (not every damage tick — ATB ticks every 100ms)
5. Accumulate damage-by-class in memory, flush on save events
6. Add `GET /stats` endpoint for frontend
7. Add graceful shutdown handler (`SIGINT`/`SIGTERM`) to flush unsaved stats
8. Add `soul-stone-data.json` to `.gitignore`

#### Gotchas
- Don't persist ephemeral state (`tasks` Map, `atbState` Map) — those reset on restart
- Cap arrays to prevent unbounded growth: `if (bossKills.length > 1000) bossKills = bossKills.slice(-500)`
- `JSON.stringify` will throw on circular references — keep stats object flat

#### Action Items
1. Add persistence layer to top of server.js (~20 lines)
2. Restore `bossNameIndex` and `bossKillCount` from persisted data on startup
3. Record boss kills and session completions with `saveStats()` calls
4. Add `GET /stats` endpoint
5. Add SIGINT/SIGTERM handlers
6. Add `soul-stone-data.json` to .gitignore

---

### P9 — Claude Code Hooks Integration (Medium impact, Low effort)

Wire up Claude Code hooks so that Soul Stone automatically reflects agent activity with zero manual intervention.

**Note:** This may already be partially working — testing revealed subagent events were appearing in Soul Stone during this planning session. Investigate existing hook infrastructure before building from scratch.

- Create or update hooks config mapping lifecycle events to `curl` calls:

| Hook Event | Soul Stone Call |
|------------|-----------------|
| `SubagentStart` | `POST /task/start` with agent info |
| `SubagentStop` | `POST /task/complete` with agent ID |
| `SessionStart` | `POST /task/start` for the main session |
| `SessionEnd` / `Stop` | `POST /task/complete` for the main session |

- Each hook is a simple shell command (`curl -X POST ...`) — no dependencies
- The task name can be derived from the hook event metadata (agent type, description, etc.)
- This closes the loop: every Claude Code session and subagent automatically summons/unsummons a party member
- Test with a multi-agent session to verify party members appear and disappear in real-time

#### Action Items
1. Investigate how subagent events are currently reaching Soul Stone (discovered during planning)
2. Formalize hooks config if not already in place
3. Enrich task names with agent descriptions (currently showing "Subagent: general-purpose")
4. Test full lifecycle: session start → subagent spawn → subagent complete → session end

---

### P8 — Skin System Abstraction (Future, Medium effort)

The architecture partially supports this (`data-theme`, CSS variables, theme selector). For real skin swaps:

- Create a config object per skin bundling: backgrounds, sprite sets, boss names, color palette, sound palette
- Abstract sprite loading to pull from skin-specific directories
- Abstract boss name lists per skin
- Potential skins: JRPG (default), sci-fi, mech squad, fantasy tavern
- Not MVP — but design decisions in P1-P5 should not make this harder

---

## Implementation Order & Status

All tasks completed 2026-02-07:

| Order | Task | Status | Implementation Notes |
|-------|------|--------|---------------------|
| 1 | **P4 — Boss Names** | Done | Swapped BOSS_NAMES array in server.js |
| 2 | **P5 — Color Palette** | Done | Updated :root CSS vars from warm brown to deep indigo |
| 3 | **P6 — Replace Orbs** | Done | Replaced with FF6-style counter panels (PressStart2P font) |
| 4 | **P1 — Battle Backgrounds** | Done | 9 CC0 PNGs downloaded, parallax scrolling, procedural fallback |
| 5 | **P7 — Persistence** | Done | JSON file with atomic write, SIGINT/SIGTERM handlers, GET /stats |
| 6 | **P9 — Hooks Integration** | Done | Already fully configured — 4 shell scripts in .claude/hooks/ |
| 7 | **P2 — Character Sprites** | Done | Enhanced procedural generator: 16×16 string-art with 21-color palettes, per-class weapons |
| 8 | **P3 — Boss Sprites** | Done | 8 procedural archetypes, programmatic idle animation (bob, breathing, shadow, glow) |

**Note:** P2 and P3 went with enhanced procedural generation rather than downloaded assets, which turned out better — no external dependencies, consistent style, and infinite variety.

---

## Constraints

- **No paid assets** — free/CC0/CC-BY sources, or procedurally generated
- **No build process** — stays as vanilla HTML/CSS/JS
- **Fun over robust** — this is a side project, prioritize looking cool
- **Widget-friendly** — must still work on small displays (5-inch secondary screen)

## Asset Sources (Verified)

| Source | License | Use For | URL |
|--------|---------|---------|-----|
| Ansimuz Legacy Collection | CC0 | Battle backgrounds | https://ansimuz.itch.io/gothicvania-patreon-collection |
| Nidhoggn Backgrounds | CC0 | Battle backgrounds | https://opengameart.org/content/backgrounds-3 |
| stealthix Pixel-Art Backgrounds | CC0 | Battle backgrounds | https://opengameart.org/content/pixel-art-backgrounds-0 |
| Calciumtrice Characters | CC-BY 3.0 | Party member sprites | https://opengameart.org/users/calciumtrice |
| Holders Animated Battlers | Free | Party member sprites (side-view) | https://holder-anibat.itch.io/holders-animated-battlers-free-heroes |
| 0x72 DungeonTileset II | CC0 | Reference / fallback sprites | https://0x72.itch.io/dungeontileset-ii |
| Art Of Nemo Dragon Pack | Credit required | Boss sprites (7 dragons) | https://theartofnemo.itch.io/free-dragon-pack-1 |
| Kronovi- Boss Sprites | Free, no redistribution | Animated boss sprites | https://darkpixel-kronovi.itch.io/mecha-golem-free |
| OGA Sideview RPG Enemies | CC-BY | FF6-style boss enemies | https://opengameart.org/content/sideview-pixel-art-rpg-enemy-sprites |
| OGA 11 Dragons | CC-BY 3.0 | Dragon boss variety | https://opengameart.org/content/rpg-enemies-11-dragons |
| Willibab Mythic Monsters | Unverified | 31 sideview monsters | https://willibab.itch.io/free-mythic-monsters |

## Research Reports

Full detailed research is preserved in the scratchpad at:
- `research-p1-backgrounds.md` — Battle background asset analysis
- `research-p2-characters.md` — Character sprite asset analysis
- `research-p3-bosses.md` — Boss sprite asset analysis
- `research-p4-bossnames.md` — JRPG naming conventions + 20 original names
- `research-p5-palette.md` — Color palette analysis with hex values from FF4-6, Chrono Trigger, Golden Sun
- `research-p7-persistence.md` — Persistence option comparison with code examples
