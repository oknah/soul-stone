# Soul Stone: JRPG Auto-Battler Implementation Plan

> Generated 2026-02-02 from RESEARCH-autobattler.md
> Decisions incorporated from open questions in the research doc

---

## Decisions (from research Q&A)

| Question | Decision |
|----------|----------|
| Sprite style | 16x16 retro (0x72 / CC0) to start |
| Boss behavior | HP sponge only, no attack animations |
| Sound effects | Yes -- Web Audio API generated tones, no audio files |
| Character names | Random fantasy name generator |
| Persistence | Defer to v2 (keep in-memory for now to reduce scope) |
| Theming system | Build CSS class system for themes from day one |

---

## Workstreams & Execution Order

```
Workstream 1 (Assets)  ──┐
Workstream 2 (Server)  ──┼──> Workstream 3 (Battle UI) ──> Integration Test
Workstream 4 (Hooks)   ──┘
```

Workstreams 1, 2, and 4 are independent and can run in parallel.
Workstream 3 depends on 1 and 2 completing first.
Integration testing is the final step.

---

## Workstream 1: Asset Preparation

**Goal:** Download and organize 16x16 sprites into `public/sprites/`.

### Tasks

#### 1.1 Download 0x72 DungeonTileset II
- Source: https://0x72.itch.io/dungeontileset-ii
- License: CC0 (public domain)
- Contains: multiple animated characters + enemies at 16x16
- This is the primary asset pack -- CC0 means zero attribution overhead

#### 1.2 Extract and organize character sprites
- Extract 4-6 character classes from the tileset
- Target classes: warrior, mage, rogue, cleric, ranger, berserker
- Each character needs these animation rows in their spritesheet:
  - Row 0: Idle (4-6 frames)
  - Row 1: Attack (3-4 frames)
  - Row 2: Hit/damage (2 frames)
  - Row 3: Death/unsummon (3-4 frames)
- If the tileset doesn't have all classes, use the included PixelDudesMaker or recolor variants

#### 1.3 Extract boss sprites
- Pull 2-3 larger enemy/boss sprites from the tileset (or supplement with CraftPix Free Bosses)
- Boss sprites should be visually larger than party members (scale up 2-3x given 16x16 base)
- Need: idle animation only (boss is an HP sponge, no attack animation)

#### 1.4 Extract or create attack effect sprites
- Slash/hit effect sprites for melee attacks
- Magic/spell effect sprites for mage attacks
- Can use CraftPix Free Slash Effects if 0x72 pack doesn't include VFX

#### 1.5 Create sprite manifest
- Write `public/sprites/MANIFEST.md` documenting for each spritesheet:
  - Filename
  - Frame size (width x height in px)
  - Number of frames per row
  - Row-to-animation mapping
  - Scale factor if applicable

### File outputs
```
public/sprites/
├── warrior.png
├── mage.png
├── rogue.png
├── cleric.png
├── ranger.png
├── berserker.png
├── boss-1.png
├── boss-2.png
├── boss-3.png
├── effects/
│   ├── slash.png
│   └── magic.png
└── MANIFEST.md
```

---

## Workstream 2: Server-Side Changes

**Goal:** Modify `server.js` to support auto-battler mechanics -- SSE, boss state, character assignment. No new dependencies.

### Tasks

#### 2.1 Add SSE `/events` endpoint
- New `GET /events` endpoint
- Maintain a `Set` of connected SSE clients
- On connect: send `sync` event with current task list + boss state
- On client disconnect: remove from set
- Add `broadcast(event)` helper function used by all mutation endpoints

```
Events to broadcast:
- { type: 'sync', tasks: [...], boss: {...} }
- { type: 'task_start', task: {...} }
- { type: 'task_complete', task: {...} }
- { type: 'boss_damage', amount, isCrit, bossHP, bossMaxHP }
- { type: 'boss_death', killCount }
- { type: 'boss_spawn', boss: {...} }
```

#### 2.2 Add boss state management
- Server-side boss object: `{ name, maxHP, currentHP, killCount, sprite }`
- Boss name pool (8-12 names, cycle through)
- `spawnBoss()` function with 15% HP scaling per kill
- Base HP: 1500
- Boss death detection when `currentHP <= 0`
- Auto-respawn after death with broadcast

#### 2.3 Add character class system
- `CHARACTER_CLASSES` constant with 6 classes (warrior, mage, rogue, cleric, ranger, berserker)
- Each class: `{ name, baseDPS, attackSpeed, color, sprite }`
- Random assignment on `/task/start`
- Random fantasy name generator (arrays of prefixes/suffixes, combine randomly)

#### 2.4 Modify `/task/start`
- Randomly assign character class from `CHARACTER_CLASSES`
- Generate random fantasy name
- Add `character` field to task object: `{ class, name, attackSpeed, baseDPS, sprite }`
- Broadcast `task_start` event via SSE
- Return character info in response

#### 2.5 Modify `/task/complete`
- Broadcast `task_complete` event via SSE
- Remove task from active map after a short delay (let client animate unsummon)

#### 2.6 Add server-side damage tick
- `setInterval` that runs every 500ms
- For each active task, calculate damage based on character class
- Apply damage to boss, broadcast `boss_damage` events
- This keeps damage authoritative on the server rather than client-side
- On boss death: broadcast `boss_death`, then `boss_spawn`

#### 2.7 Extend `/tasks` response
- Include boss state in response: `{ tasks: [...], boss: {...} }`
- Keep backward-compatible (tasks still an array at top level, or wrap in object)

#### 2.8 Deprecate `/task/progress`
- Keep endpoint but make it a no-op that returns 200
- Progress concept doesn't apply to auto-battler model

### File changes
- `server.js` -- all changes in this single file

---

## Workstream 3: Battle Scene UI

**Goal:** Replace the task list UI in `index.html` with the JRPG auto-battle scene. Preserve header, orbs, and D2 aesthetic. Build with theme system from day one.

### Tasks

#### 3.1 Add theme CSS architecture
- Define theme as a set of CSS custom properties on a data attribute: `[data-theme="jrpg"]`
- Base/shared variables stay in `:root`
- Theme-specific variables (battle scene colors, UI chrome) in theme selectors
- Start with `jrpg` theme, but structure allows adding `scifi`, `mech`, `tavern` later
- Theme selector UI in footer or header corner (simple dropdown)

```css
[data-theme="jrpg"] {
  --battle-bg: ...;
  --party-area-bg: ...;
  --boss-area-bg: ...;
  --hp-bar-color: ...;
  --hp-ghost-color: ...;
}
```

#### 3.2 Create battle scene layout
- Replace `.tasks-container` content with battle scene
- Layout: FF4/FF6 side-view style
  - Left side: party members (stacked vertically, up to 8 slots)
  - Right side: boss (large, centered vertically)
  - Bottom: boss HP bar (full width under boss)
- Keep `.tasks-container` wrapper with its border/shadow/noise texture
- Responsive: stack vertically on narrow screens

```
+---------------------------------------------------+
|  [Char 1] (idle)              [  BOSS  ]          |
|  [Char 2] (attacking)         HP: ████████░░      |
|  [Char 3] (idle)              "Ancient Dragon"    |
|  [Char 4] (summoning...)       Kill Count: 3      |
|                                                    |
+---------------------------------------------------+
```

#### 3.3 Implement CSS sprite animation system
- `.character` base class with `image-rendering: pixelated`
- CSS `steps()` animation for idle loop
- Attack animation triggered by adding `.attacking` class
- Summon animation: fade in + scale up + brightness flash
- Unsummon animation: fade out + scale down + brightness flash
- Frame counts and sizes read from MANIFEST.md, hardcoded in CSS
- Scale 16x16 sprites up to ~64px display size with `image-rendering: pixelated`

#### 3.4 Implement damage numbers
- DOM-based floating damage numbers
- Gold text for normal hits, red for crits
- `@keyframes floatUp` animation (rise + fade)
- Use AvQest font, text-shadow for readability
- `pointer-events: none` so they don't interfere with UI
- Create and destroy DOM elements (or pool them)

#### 3.5 Implement boss HP bar with ghost trail
- Two overlapping bars:
  - Red bar: instant drop on damage (`transition: width 0.1s`)
  - Ghost bar (lighter): slow trail (`transition: width 0.6s ease-out`)
- Boss name displayed above HP bar
- Kill count / boss level indicator
- Boss death animation: flash white, shake, fade out
- "VICTORY" text overlay (2-3s), then new boss spawns

#### 3.6 Implement Web Audio API sound effects
- No audio files -- all generated tones
- Hit sound: short noise burst or sine chirp (50-100ms)
- Crit sound: slightly different tone/pitch
- Boss death: low rumble + descending tone
- Character summon: ascending sparkle tone
- Character unsummon: descending tone
- Master volume control (mute button in UI)
- Sound context created on first user interaction (browser autoplay policy)

#### 3.7 Wire up SSE EventSource
- Replace `setInterval(fetchTasks, 1500)` with `EventSource('/events')`
- Handle events:
  - `sync` → initialize full scene (party + boss)
  - `task_start` → summon character animation
  - `task_complete` → unsummon character animation
  - `boss_damage` → update HP bar, show damage number, play hit sound
  - `boss_death` → play death animation, show victory text
  - `boss_spawn` → spawn new boss
- Auto-reconnect is built into EventSource
- Keep `/tasks` fetch as fallback for initial load

#### 3.8 Update orbs
- Red orb: show active party member count (same as before, just active tasks)
- Blue orb: show boss kill count (replaces "completed" count)
- Or keep completed count -- both are valid. Boss kill count is more thematic.

#### 3.9 Update header
- Change subtitle from "Task Tracker of the Ancients" to something battle-themed
- Keep "SOUL STONE" title
- Add attribution line in footer for CC0/CC-BY assets

### File changes
- `public/index.html` -- all changes in this single file

---

## Workstream 4: Claude Code Hooks

**Goal:** Set up `.claude/` hook configuration so Claude Code sessions automatically summon/unsummon party members.

### Tasks

#### 4.1 Create `.claude/settings.json`
- Hook configuration for 4 events: SessionStart, SessionEnd, SubagentStart, SubagentStop
- All hooks run async (don't block Claude)
- Use `$CLAUDE_PROJECT_DIR` for portable paths

#### 4.2 Create hook scripts
- `.claude/hooks/task-start.sh` -- reads session_id + agent_type from stdin JSON, POSTs to `/task/start`
- `.claude/hooks/task-complete.sh` -- reads session_id, POSTs to `/task/complete`
- `.claude/hooks/subagent-start.sh` -- reads agent_id + agent_type, POSTs to `/task/start` with `subagent-` prefix
- `.claude/hooks/subagent-complete.sh` -- reads agent_id, POSTs to `/task/complete` with `subagent-` prefix
- All scripts: require `jq`, use `curl -sS`, `exit 0` always (never block Claude on failure)

#### 4.3 Make scripts executable
- `chmod +x .claude/hooks/*.sh`

#### 4.4 Test hooks manually
- Simulate hook payloads with curl to verify scripts work
- Test with missing fields (graceful degradation)
- Verify Soul Stone UI responds to simulated hook events

### File outputs
```
.claude/
├── settings.json
└── hooks/
    ├── task-start.sh
    ├── task-complete.sh
    ├── subagent-start.sh
    └── subagent-complete.sh
```

### Prerequisite
- `jq` must be installed (`brew install jq`)

---

## Integration Testing

After all workstreams complete:

### Test scenarios

1. **Manual curl test** -- start 3 tasks via curl, verify 3 party members appear and attack boss
2. **Complete task** -- complete 1 task, verify character unsummons with animation
3. **Boss death** -- start enough tasks to kill boss, verify death animation + respawn with higher HP
4. **SSE reconnect** -- refresh browser, verify scene rebuilds from sync event
5. **Empty state** -- no tasks running, verify clean empty battle scene (maybe idle boss)
6. **Hook simulation** -- run hook scripts with sample JSON to verify end-to-end flow
7. **Sound** -- verify sounds play on first interaction, mute toggle works
8. **Theme** -- verify theme selector switches CSS variables without breaking layout

### Review checklist

- [ ] CSS `steps()` frame counts match actual spritesheet frame counts
- [ ] SSE connection handles reconnection and cleanup
- [ ] Boss HP math is correct (scaling, death at 0, respawn)
- [ ] Hook scripts parse JSON correctly and handle missing fields
- [ ] Visual consistency with Diablo 2 aesthetic (warm tones, gold, AvQest font)
- [ ] No new npm dependencies added
- [ ] Sound effects respect browser autoplay policy
- [ ] Theme system CSS variables properly cascade

---

## Detailed Task List (Execution Order)

### Phase 1: Parallel (Workstreams 1, 2, 4)

| # | Workstream | Task | Description |
|---|------------|------|-------------|
| 1 | Assets | Download 0x72 DungeonTileset II | Get CC0 16x16 sprite pack |
| 2 | Assets | Extract character sprites | 6 classes, 4 animation rows each |
| 3 | Assets | Extract boss sprites | 2-3 bosses, idle animation only |
| 4 | Assets | Extract effect sprites | Slash + magic hit effects |
| 5 | Assets | Write MANIFEST.md | Document all frame sizes/counts |
| 6 | Server | Add SSE endpoint + broadcast | `GET /events`, client tracking, broadcast helper |
| 7 | Server | Add boss state management | HP pool, scaling, death/respawn |
| 8 | Server | Add character class system | 6 classes + random name generator |
| 9 | Server | Modify task start/complete | Character assignment, SSE broadcasts |
| 10 | Server | Add damage tick system | Server-side interval, damage calc |
| 11 | Server | Extend /tasks, deprecate /progress | Boss state in response, no-op progress |
| 12 | Hooks | Create .claude/settings.json | Hook event configuration |
| 13 | Hooks | Create 4 hook scripts | start/complete for session + subagent |
| 14 | Hooks | chmod + manual test | Verify scripts work |

### Phase 2: Sequential (Workstream 3, depends on Phase 1)

| # | Workstream | Task | Description |
|---|------------|------|-------------|
| 15 | UI | Add theme CSS architecture | data-theme selectors, variable structure |
| 16 | UI | Create battle scene layout | Party left, boss right, HP bar bottom |
| 17 | UI | CSS sprite animation system | idle, attack, summon, unsummon keyframes |
| 18 | UI | Damage numbers | Floating gold/red text with float-up anim |
| 19 | UI | Boss HP bar with ghost trail | Dual-bar with instant + trailing transitions |
| 20 | UI | Web Audio sound effects | Generated tones for hits, deaths, summons |
| 21 | UI | Wire SSE EventSource | Replace polling, handle all event types |
| 22 | UI | Update orbs + header | Boss kill count, battle-themed subtitle |
| 23 | UI | Theme selector | Dropdown to switch themes |

### Phase 3: Integration

| # | Task | Description |
|---|------|-------------|
| 24 | End-to-end testing | All 8 test scenarios above |
| 25 | Staff engineer review | Two-Claude pattern: review agent audits all changes |

---

## Out of Scope (v2)

- Persistence (JSON file for boss kill count / history)
- Additional themes beyond JRPG (sci-fi, mech, tavern) -- CSS structure will be ready, just no sprites/variables yet
- Canvas particle effects overlay
- Boss attack animations
- Character leveling / progression
- Mobile-specific layout optimizations

---

## Agent Delegation Prompts

### For Workstream 1 (Assets) agent:
> Download the 0x72 DungeonTileset II from https://0x72.itch.io/dungeontileset-ii (CC0 license). Extract individual character spritesheets for: warrior, mage, rogue, cleric, ranger, berserker. Each needs rows for idle, attack, hit, death animations. Extract 2-3 boss sprites (idle only) and attack effect sprites (slash, magic). Place all PNGs in public/sprites/ with effects in public/sprites/effects/. Scale if needed. Write public/sprites/MANIFEST.md documenting frame counts, pixel dimensions, and row mappings for each sheet. Sprites are 16x16 base size.

### For Workstream 2 (Server) agent:
> Modify server.js per the architecture described in PLAN-autobattler.md Workstream 2. Add SSE /events endpoint with broadcast. Add boss state (1500 base HP, 15% scaling, name rotation, death/respawn). Add CHARACTER_CLASSES constant (6 classes). Modify /task/start to assign random class + fantasy name. Add 500ms damage tick interval. Extend /tasks response with boss state. Deprecate /task/progress to no-op. No new dependencies. Read RESEARCH-autobattler.md for code samples.

### For Workstream 3 (UI) agent:
> Replace the task list in public/index.html with a JRPG auto-battle scene per PLAN-autobattler.md Workstream 3. Build a theme system using [data-theme] CSS selectors from day one. Layout: FF4/FF6 side-view (party left, boss right). Use CSS steps() for 16x16 sprite animation scaled to 64px with image-rendering: pixelated. Add floating damage numbers, boss HP bar with ghost trail effect, summon/unsummon animations. Replace polling with SSE EventSource. Add Web Audio API sound effects (generated tones, no files). Add mute toggle. Keep header/orbs/AvQest font/D2 aesthetic. Read public/sprites/MANIFEST.md for frame counts. Read RESEARCH-autobattler.md for code samples.

### For Workstream 4 (Hooks) agent:
> Create Claude Code hooks in .claude/ per PLAN-autobattler.md Workstream 4. Create .claude/settings.json with SessionStart, SessionEnd, SubagentStart, SubagentStop hooks. Create 4 shell scripts in .claude/hooks/ that read JSON from stdin via jq and curl the Soul Stone server. All hooks async. All scripts chmod +x. Scripts must exit 0 always. Read RESEARCH-autobattler.md for exact hook config and script contents.

### For Review agent:
> You are a staff engineer reviewing the Soul Stone auto-battler implementation. Read PLAN-autobattler.md and RESEARCH-autobattler.md for the spec. Review all changed files (server.js, public/index.html, .claude/settings.json, .claude/hooks/*.sh, public/sprites/). Check: CSS steps() frame counts match MANIFEST.md, SSE connection handling (reconnect, cleanup), boss HP math (scaling, death detection), hook scripts (JSON parsing, error handling, exit codes), visual consistency with D2 aesthetic, no new npm dependencies, Web Audio autoplay policy compliance, theme system CSS variable cascading. Report issues as a numbered list with file:line references.
