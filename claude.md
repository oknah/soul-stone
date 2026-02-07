# Soul Stone - Project Context

## Overview

Soul Stone is a **JRPG auto-battler** that visualizes AI agent activity in real-time. When AI tasks start, party members are summoned to fight bosses; when tasks end, they're unsummoned. It's inspired by Final Fantasy VI and Golden Sun battle scenes.

The core insight: you can't show progress bars for AI tasks (you don't know when they'll finish), but you *can* show that work is happening. More concurrent tasks = bigger party = faster boss kills.

## Architecture

```
soul-stone/
├── server.js                    # Express server with ATB battle system, SSE, persistence
├── public/
│   ├── index.html               # Single-file frontend (canvas renderer, sprites, UI)
│   ├── AvQest.ttf               # Celtic/medieval title font
│   ├── PressStart2P.ttf         # SNES-style battle UI font
│   ├── backgrounds/             # 9 CC0 battle background PNGs
│   └── sprites/
│       ├── warrior.png          # Legacy placeholder (unused — characters are procedural)
│       ├── mage.png             #   "
│       ├── rogue.png            #   "
│       ├── cleric.png           #   "
│       ├── ranger.png           #   "
│       ├── berserker.png        #   "
│       ├── boss-1.png           # Legacy placeholder (unused — bosses are procedural)
│       ├── boss-2.png           #   "
│       ├── boss-3.png           #   "
│       ├── effects/
│       │   └── slash.png        # Slash effect sprite sheet (4 frames, 16x16)
│       └── MANIFEST.md          # Sprite documentation
├── .claude/
│   ├── settings.json            # Hook configuration
│   └── hooks/                   # Shell scripts for Claude Code integration
│       ├── task-start.sh        # SessionStart → POST /task/start
│       ├── task-complete.sh     # SessionEnd → POST /task/complete
│       ├── subagent-start.sh    # SubagentStart → POST /task/start
│       └── subagent-complete.sh # SubagentStop → POST /task/complete
├── soul-stone-data.json         # Persistent stats (gitignored)
├── package.json
├── PLAN.md                      # Evolution plan (completed)
├── Prompt.md                    # Original build requirements
└── CLAUDE.md                    # This file
```

## API Endpoints

- `POST /task/start` — Summon a party member
  - Body: `{ "id": "optional", "name": "Task name", "description": "optional" }`
  - Returns: task with randomly assigned character (class, name, DPS, attack speed)
- `POST /task/complete` — Unsummon a party member
  - Body: `{ "id": "task-id" }`
- `POST /task/progress` — Deprecated, kept as no-op for backwards compatibility
- `GET /tasks` — Current party state + boss HP
- `GET /stats` — Persistent stats (kill count, damage by class, fastest kill, etc.)
- `GET /events` — SSE stream for real-time updates

## Core Systems

### Server (server.js)

**ATB (Active Time Battle) System:**
- Ticks every 100ms, fills per-character ATB gauges based on attack speed
- When gauge reaches 100, character attacks with damage = baseDPS × (attackSpeed/1000) ± 20% variance
- 10% crit chance at 2× multiplier
- Boss HP scales 15% per kill

**Character Classes:**
| Class | Base DPS | Attack Speed | Color |
|-------|----------|-------------|-------|
| Warrior | 12 | 2000ms | #FF6644 |
| Mage | 18 | 3000ms | #6688FF |
| Rogue | 8 | 1200ms | #88FF66 |
| Cleric | 6 | 2500ms | #FFDD44 |
| Ranger | 10 | 1800ms | #44DDFF |
| Berserker | 22 | 3500ms | #FF4444 |

**Boss Names** (JRPG-style, cycle through 11):
Thornmaw, Gloomfang, Ironshell, Velmora, Kaldrun, Sythael, Ozrath, Velunis, Morvaine, Zorameth, Eschavorn

**Persistence:**
- Stats saved to `soul-stone-data.json` via atomic write-then-rename
- Saves on boss kills, session completions, and graceful shutdown (SIGINT/SIGTERM)
- Tracks: bossKillCount, bossNameIndex, totalDamage, damageByClass, bossKills[], fastestKill, sessions[]
- Arrays capped at 1000 entries (trimmed to 500)

### Frontend (public/index.html)

Single-file frontend with everything in one HTML file. No build process.

**Canvas Renderer:**
- SNES resolution: 256×224 pixels, rendered to offscreen buffer, scaled to display
- Sprite FPS: 12
- `drawSprite()` renders frames from sprite sheets with flip support
- `image-rendering: pixelated` for crisp pixel art scaling

**Character Sprite System (Procedural):**
- `CLASS_SPRITES`: Full 16×16 string-art templates per class with per-pixel zone codes (H=hair, S=skin, A=armor1, B=armor2, W=weapon, X=accent, T=boots, O=outline)
- `CLASS_PALETTES`: 21-color palettes per class with 3-tone directional shading (highlight/base/shadow)
- `generateCharacterSprite(className)`: Creates 96×64 canvas sprite sheets (6 cols × 4 rows of 16×16 frames)
- Animation rows: idle (6 frames), attack (4 frames), hit (2 frames), death (4 frames)
- Per-class weapon animations (sword slash, energy orb, dual daggers, holy ring, bow/arrow, axe slam)
- Each character instance gets a unique sprite at construction time
- Rendered at 3× scale (48×48 display)

**Boss Sprite System (Procedural):**
- `BOSS_ARCHETYPES`: 8 distinct types (Dragon, Demon, Golem, Undead Knight, Kraken, Lich, Giant Spider, Elemental)
- Each has unique palette, 32×32 mirrored pixel mask, and 4 idle frames with vertical bob
- `generateBossSprite(bossIndex)`: Creates 128×32 canvas sprite sheets
- `getBossSpriteKey(killCount)`: Cycles through 8 types based on kill count
- Programmatic idle animation layered in `renderBoss()`:
  - Sinusoidal vertical bob (1.5px amplitude, 2s period)
  - ScaleY breathing (1.0→1.02, 3s period)
  - Dynamic shadow synced to bob
  - Eye/rune glow pulse (2.5s period)
- Rendered at 4× scale (128×128 display)

**Character Animation State Machine:**
IDLE → STEPPING_FORWARD (150ms lerp to boss) → ATTACKING (400ms, triggers effects) → STEPPING_BACK (300ms lerp home)

**Battle Backgrounds:**
- 6 background images loaded from `public/backgrounds/`
- Rotates on boss spawn
- Parallax ping-pong scrolling with vignette overlay
- Procedural starfield/nebula fallback if images fail to load

**Status Panel (FF6-style):**
- Blue gradient panel (`#7b7bd6` → `#000029`) with silver borders
- PressStart2P font for all battle text
- Per-character ATB gauge bars
- Boss HP bar with ghost damage indicator

**JRPG Counter Panels** (replaced Diablo orbs):
- Party count (sword icon) and Kill count (skull icon)
- FF6 blue gradient with silver borders, PressStart2P font

## UI Design — JRPG Aesthetic

### CSS Custom Properties
```css
:root {
  --gold-light: #d4af37;    /* Title text, treasure gold */
  --gold-mid: #C8B458;      /* FF6-accurate name gold */
  --gold-dark: #8a7a3a;
  --gold-dim: #4a4428;

  --bg-darkest: #08081a;    /* Near-black with blue undertone */
  --bg-dark: #0e0e28;       /* Dark indigo */
  --bg-panel: #141438;      /* Deep blue panel — the FF6 look */

  --health-bright: #cc2222;
  --health-mid: #881111;
  --health-dark: #440808;

  --mana-bright: #2060c0;
  --mana-mid: #103080;
  --mana-dark: #081840;

  --text-primary: #e8e0f0;  /* Near-white, faint lavender cast */
  --text-dim: #7878a0;      /* Muted blue-gray */
}
```

### Typography
- **AvQest** (`AvQest.ttf`): Celtic/medieval style for title/branding
- **PressStart2P** (`PressStart2P.ttf`): SNES-style for battle UI text
- Both locally hosted in `public/`

### Widget Mode
Optimized for small windows / ambient widget use (5-inch secondary display):
- Compact default sizing (2em title, 70px counters, 300px max canvas)
- `@media (max-height: 600px)` breakpoint for extreme compression
- No scrolling needed on small displays

## Claude Code Hooks Integration

Soul Stone automatically reflects Claude Code agent activity via hooks:

| Hook Event | Shell Script | Soul Stone Action |
|------------|-------------|-------------------|
| `SessionStart` | `task-start.sh` | Summon party member for main session |
| `SessionEnd` | `task-complete.sh` | Unsummon session's party member |
| `SubagentStart` | `subagent-start.sh` | Summon party member for subagent |
| `SubagentStop` | `subagent-complete.sh` | Unsummon subagent's party member |

Each hook runs a `curl` command to the Soul Stone API. Configuration is in `.claude/settings.json`.

## Running the Server

```bash
npm install
npm start
```

Server runs on http://localhost:3333

## Usage Example

```bash
# Summon a party member
curl -X POST http://localhost:3333/task/start \
  -H "Content-Type: application/json" \
  -d '{"name": "Deep Research", "description": "Analyzing ancient tomes"}'

# Unsummon a party member
curl -X POST http://localhost:3333/task/complete \
  -H "Content-Type: application/json" \
  -d '{"id": "task-id"}'

# Check stats
curl http://localhost:3333/stats
```

## Design Principles

1. **JRPG Aesthetic**: Deep indigo backgrounds, FF6 blue panels, gold accents, lavender-white text
2. **Procedural Everything**: Characters and bosses generated in-browser — no external sprite dependencies
3. **Simplicity**: No build tools, no frameworks, single HTML file frontend
4. **Fun Over Robust**: This is a side project, prioritize looking cool
5. **Widget-Friendly**: Must work on small ambient displays

## Notes for Future Sessions

1. **Font Files**: Both `AvQest.ttf` and `PressStart2P.ttf` must be in `public/`
2. **CSS Variables**: All colors managed through `:root` custom properties
3. **No Build Process**: Direct file editing, refresh browser to see changes
4. **Server Port**: 3333 (not 3000)
5. **Sprites are Procedural**: Character and boss sprites are generated in-browser canvas, not loaded from PNG files (legacy PNGs exist but are unused)
6. **SSE Not Polling**: Frontend uses Server-Sent Events (`/events`) for real-time updates
7. **Stats File**: `soul-stone-data.json` is gitignored — contains persistent game state
8. **Boss Scaling**: HP increases 15% per kill, base 1500 HP
9. **Widget Mode**: All sizes are compact by default. `@media (max-height: 600px)` breakpoint for extreme compression.
