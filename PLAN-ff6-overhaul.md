# Soul Stone: SNES FF6 Visual Overhaul — Implementation Plan

> Generated 2026-02-02 from RESEARCH-autobattler.md
> Builds on completed auto-battler implementation (PLAN-autobattler.md)
> References PLAN-autobattler.md best practices: parallel workstreams, decision matrix, phased execution, agent delegation prompts, integration tests, review checklist

---

## Current State

The auto-battler core from PLAN-autobattler.md is fully implemented:
- **Server**: SSE, boss state, character classes, damage tick, fantasy name generator
- **UI**: Battle scene layout (party left, boss right), CSS sprite animations, damage numbers, boss HP bar with ghost trail, Web Audio sound effects, mute toggle, theme CSS architecture
- **Assets**: Placeholder 16x16 character sprites (6 classes), 32x32 boss sprites (3), effect sprites
- **Hooks**: Claude Code hook scripts for session/subagent lifecycle

What's missing is the **SNES FF6 visual authenticity** described in the research doc. The current UI is functional but uses basic DOM rendering, simple oscillator sounds, and the Diablo 2 warm-panel aesthetic. The research doc provides a comprehensive blueprint for transforming it into something that looks, sounds, and feels like a SNES Final Fantasy battle.

---

## Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Rendering approach | Hybrid: Canvas for battle scene, DOM for UI panels | Research sec. 17 recommends this. Canvas gives pixel-perfect control for sprites/backgrounds; DOM is natural for text overlays and ATB gauges |
| Native resolution | 256x224 (SNES native), integer-scaled to display | Offscreen canvas pattern from research sec. 13. Guarantees uniform pixel sizes |
| Camera perspective | Keep current side-view (party left, boss right) | The reversed camera (behind boss) from research sec. 2 is novel but adds sprite complexity. Side-view is more recognizable as FF6. Revisit reversed camera in v3 |
| Font | Option C: AvQest for title, FF6 pixel font for battle UI | Research sec. 10. AvQest is the project's identity; pixel font for battle text gives authenticity where it matters |
| Sound library | Keep raw Web Audio API, enhance with layered oscillators + SNES echo | Research sec. 11. ZzFX is tempting but adding a dependency contradicts the no-deps philosophy. The research provides code snippets for enhanced sounds using raw Web Audio that match ZzFX quality |
| CRT filter | Yes, toggleable via existing mute-button pattern | Research sec. 12. Scanlines + phosphor glow via CSS pseudo-elements. Must be toggleable for performance/accessibility |
| Battle background | Procedural canvas starfield + nebulae | Research sec. 7 appendix A5. No external image assets needed. Parallax via canvas layers |
| ATB gauges | Yes, per-character | Research sec. 9. Maps naturally to attackSpeed. Gauge fills, character auto-attacks when full, gauge resets |
| Attack orchestration | Full sequence: step forward, flash, slash, damage, step back | Research appendix A7. Current implementation just swaps CSS class. Full sequence is the key visual upgrade |
| Sprite assets | Keep placeholders for now, but make canvas rendering ready for 0x72 sprites later | Current placeholders work. Canvas renderer should load from sprite sheets generically |

---

## Workstreams & Execution Order

```
Workstream 1 (Canvas Renderer)  ──┐
Workstream 2 (Sound Overhaul)   ──┼──> Workstream 5 (Integration & Polish)
Workstream 3 (UI Panels & ATB)  ──┤
Workstream 4 (FF6 Palette & CRT)──┘
```

Workstreams 1-4 are largely independent and can run in parallel.
Workstream 5 wires everything together and depends on 1-4.

---

## Workstream 1: Canvas Battle Renderer

**Goal:** Replace DOM-based sprite rendering with an offscreen canvas at SNES native resolution (256x224), scaled up with `image-rendering: pixelated`. Battle backgrounds, sprites, damage numbers, and effects all render on canvas. DOM continues to handle UI panels.

### Tasks

#### 1.1 Create offscreen canvas infrastructure

Add a `<canvas>` element inside `.boss-area` (or replace it). Set up the offscreen rendering pattern:

```
offscreen canvas (256x224) → drawImage → display canvas (scaled to container)
```

- Offscreen canvas: 256x224 pixels, all game rendering happens here
- Display canvas: fills `.boss-area`, CSS `image-rendering: pixelated`
- `ctx.imageSmoothingEnabled = false` on both contexts
- Re-set `imageSmoothingEnabled` on any canvas resize
- Integer scaling: calculate largest integer multiplier that fits the container

**Reference:** Research sec. 13, "The Offscreen Canvas Pattern"

#### 1.2 Implement game loop

Replace the current event-driven sprite rendering with a proper game loop:

- `requestAnimationFrame` loop at display refresh rate (60fps)
- Sprite frame updates at SNES-authentic rate (~12fps) using accumulator pattern
- Smooth position interpolation at full framerate for movement (step forward/back)
- Loop structure: `update(dt)` → `render()` → `requestAnimationFrame`

**Reference:** Research sec. 17, "Game Loop"

#### 1.3 Implement sprite renderer

Canvas-based sprite sheet renderer:

- `drawSprite(spriteSheet, frameX, frameY, destX, destY, scale)` utility
- Reads frame dimensions from a JS config object (derived from MANIFEST.md)
- Character sprites: 16x16 source, drawn at appropriate canvas scale
- Boss sprites: 32x32 source, drawn larger
- Horizontal flip support via `ctx.scale(-1, 1)` for mirrored poses

Sprite config object (replaces MANIFEST.md parsing):
```javascript
const SPRITE_CONFIG = {
  characters: { frameW: 16, frameH: 16, rows: { idle: 0, attack: 1, hit: 2, death: 3 }, frameCounts: { idle: 6, attack: 4, hit: 2, death: 4 } },
  bosses: { frameW: 32, frameH: 32, rows: { idle: 0 }, frameCounts: { idle: 4 } },
  effects: { frameW: 16, frameH: 16, rows: { slash: 0 }, frameCounts: { slash: 4 } },
};
```

#### 1.4 Implement battle background

Procedural parallax background rendered on canvas:

- 3 layers: far (stars/sky), mid (nebulae/clouds), near (ground details)
- Stars: array of point objects with position, size, speed, brightness
- Nebulae: radial gradients at random positions, slow drift
- Dark gradient base: deep purples/blues (research appendix A5)
- Layers scroll at different speeds for parallax effect
- All procedural — no image assets needed

#### 1.5 Implement canvas-based damage numbers

Move damage numbers from DOM elements to canvas rendering:

- Damage number objects: `{ value, x, y, vy, opacity, isCrit, age }`
- Float upward (decreasing y), fade out over ~0.8s
- White text with black outline (4-direction shadow) for normal hits
- Larger + red for crits
- Drawn at SNES resolution so they have that chunky pixel feel
- Pool/recycle objects to avoid GC pressure

#### 1.6 Implement attack orchestration on canvas

Full FF6 attack sequence (research appendix A7), but driven by the game loop:

1. Character position lerps forward toward boss (0.15s)
2. Screen flash: white overlay at 0.7 opacity, fade to 0 over 0.15s
3. Swap to attack sprite frame
4. Slash effect sprite overlaid on boss position (4 frames)
5. Screen shake: apply random offset to entire scene for 0.3s
6. Damage number spawns at boss position
7. Boss flash white briefly (hit reaction)
8. Character position lerps back to home position (0.3s)
9. Return to idle animation

State machine per character: `IDLE` → `STEPPING_FORWARD` → `ATTACKING` → `STEPPING_BACK` → `IDLE`

### File changes
- `public/index.html` — add canvas element, canvas rendering JS, game loop

---

## Workstream 2: Sound Overhaul

**Goal:** Replace basic single-oscillator `playTone()` with layered, SNES-authentic sound effects using raw Web Audio API. Add SNES echo effect on master output. Add victory fanfare.

### Tasks

#### 2.1 Add SNES echo effect on master output

Create a master audio chain with echo/reverb:

- `DelayNode` (100-150ms delay)
- `GainNode` for feedback (25-30%)
- `BiquadFilterNode` lowpass at 4000Hz (simulates SPC700 Gaussian interpolation rolloff)
- Wet/dry mix via separate gain nodes
- All sounds route through this chain instead of directly to `destination`

**Reference:** Research appendix A2

#### 2.2 Replace hit sounds with layered slash sound

Replace `playHitSound()` with the enhanced slash from research appendix A1:

- White noise buffer for "whoosh" (bandpass filtered, frequency sweep 3kHz → 800Hz)
- Sawtooth oscillator "shing" (600Hz → 200Hz frequency ramp)
- Both layers with fast exponential decay
- Total duration: ~150ms

#### 2.3 Replace crit sound

Enhanced version of slash with:
- Higher initial volume
- Additional sine sub-bass impact layer
- Longer noise tail
- Screen flash will be handled by canvas (Workstream 1)

#### 2.4 Replace boss death sound

Research appendix A1 `playBossDeathSound()`:
- Sawtooth oscillator rumble (80Hz → 30Hz over 0.8s)
- White noise burst with quadratic decay
- Sine sub-bass (60Hz → 20Hz over 0.5s)
- Total duration: ~0.8s

#### 2.5 Enhance summon/unsummon sounds

Current ascending/descending sine tones are decent but thin. Enhance:
- Summon: layer a noise "sparkle" burst on top of the ascending tones. Add slight detuning between two oscillators for chorus effect
- Unsummon: add reverb tail by routing through the echo chain with slightly higher wet mix

#### 2.6 Add victory fanfare

Research appendix A1 `playVictoryFanfare()`:
- First phrase of the FF victory fanfare in Eb Mixolydian
- Square wave oscillators (authentic SNES timbre)
- ~11 notes scheduled with `osc.start(time)` / `osc.stop(time)`
- Plays on boss death, after the death sound effect
- Duration: ~3.2s

#### 2.7 Add boss spawn sound

Low, ominous tone with rising tension:
- Triangle bass drone (40Hz → 80Hz over 0.5s)
- Layered square wave stab at the end
- Signals danger/new encounter

### File changes
- `public/index.html` — replace audio section in `<script>`

---

## Workstream 3: FF6 UI Panels & ATB Gauges

**Goal:** Replace the Diablo 2 warm-panel aesthetic for the status area with FF6 blue gradient boxes. Add per-character ATB gauges that control attack timing.

### Tasks

#### 3.1 Add FF6 blue gradient status panel

Replace the current `.party-area` background with the FF6 blue gradient window:

- 22-stop linear gradient from research appendix A6 (#7b7bd6 → #000029)
- `border: 6px ridge #ffffff` (FF6's characteristic thick white border)
- `border-radius: 12px`
- Inner shadow for depth
- This replaces the warm brown `--party-area-bg`

Place the status panel at the bottom of the battle scene (below the canvas), matching FF6 layout where the bottom ~40% is UI.

**Reference:** Research sec. 3, appendix A6

#### 3.2 Redesign party member display for status panel

Move party member info from the left-side panel into the bottom status panel. Each party member row shows:

```
[Name]  [ATB ████████░░]  Class: Warrior  Task: "Deep Research"
```

- Character name in gold/yellow (#C8B458)
- ATB gauge (thin horizontal bar, yellow fill)
- Class label in white
- Task name in dim text
- Layout: horizontal rows, up to 8 party members

Remove the sprite display from the panel — sprites will be rendered on canvas (Workstream 1). The status panel is text-only, like FF6.

#### 3.3 Implement ATB gauge system

Per-character ATB (Active Time Battle) gauge:

**Server-side:**
- Each character has `attackSpeed` (already in CHARACTER_CLASSES)
- Damage tick currently fires every 500ms for everyone. Change: each character tracks their own ATB value (0-100)
- ATB fills based on `attackSpeed`: `atb += (TICK_INTERVAL / attackSpeed) * 100`
- When ATB reaches 100: character attacks, ATB resets to 0
- Broadcast `atb_update` events: `{ type: 'atb_update', taskId, atb }`
- Or batch ATB updates into existing `boss_damage` events to reduce broadcast volume

**Client-side:**
- ATB gauge per character in the status panel
- CSS transition for smooth fill animation
- When full: brief flash animation (research sec. 9, `atb-flash` keyframes)
- Yellow/amber fill (#D4A820 → #F8D830 gradient)
- Dark background (#181818)

**Reference:** Research sec. 9

#### 3.4 Update boss HP display

Move boss HP bar and name into the blue gradient panel area (or keep it as a separate panel above the status panel). Add:
- Boss name in gold text
- HP numbers in white (FF6 style: `HP 1234 / 5678`)
- Kill count display

#### 3.5 Add empty state for status panel

When no party members are active, show an atmospheric message in the blue panel:
- "The battlefield lies silent..." or similar
- Dim white text, centered

### File changes
- `public/index.html` — restructure HTML layout, new CSS for blue panels, ATB gauges
- `server.js` — add ATB tracking to damage tick, broadcast ATB updates

---

## Workstream 4: FF6 Palette, Pixel Font & CRT Filter

**Goal:** Shift the color palette from Diablo 2 warm golds to FF6 blues/whites/yellows. Add a pixel font for battle UI. Add toggleable CRT scanline filter.

### Tasks

#### 4.1 Add FF6 pixel font

Download and add a pixel font for battle UI text:

- **Option 1:** "Press Start 2P" from Google Fonts (free, widely used for retro)
- **Option 2:** "Final Fantasy VI SNESb" truetype (closest to authentic)
- Use `@font-face` with local file (same pattern as AvQest.ttf)
- Apply to `.battle-text` class: `font-smooth: never; -webkit-font-smoothing: none`
- Keep AvQest for `.title` and non-battle UI elements

**Reference:** Research sec. 10

#### 4.2 Add SNES-authentic color palette as CSS variables

Add FF6-specific colors under `[data-theme="jrpg"]`:

```css
/* FF6 UI colors from research sec. 4 */
--ff6-name-gold: #C8B458;
--ff6-text-white: #F8F8F8;    /* SNES true white, not #FFF */
--ff6-hp-critical: #F8D830;
--ff6-atb-fill: #D4A820;
--ff6-atb-bright: #F8D830;
--ff6-atb-empty: #181818;
--ff6-window-border: #E7DFE7;
--ff6-damage-white: #F8F8F8;
--ff6-heal-green: #00E800;
```

Update existing CSS variables to reference these where appropriate.

**Reference:** Research sec. 4

#### 4.3 Implement CRT scanline filter

CSS-based CRT overlay, toggleable:

- Scanlines: `repeating-linear-gradient` with 2px period, 25% opacity black lines
- Phosphor glow: subtle blue-tinted inner box-shadow
- Screen curvature: `border-radius: 20px` on the battle container with inner shadow
- Toggle via CSS class `.crt-enabled` on the container
- Add CRT toggle button next to the mute button
- Default: OFF (opt-in for performance reasons)

**Reference:** Research sec. 12

#### 4.4 Update theme system

Extend the `[data-theme="jrpg"]` variables with the FF6 palette. Ensure all new components (blue panels, ATB gauges, canvas backgrounds) read from CSS variables via `getComputedStyle()` where canvas needs theme colors.

For canvas rendering, read theme colors once at init and on theme change:
```javascript
function getThemeColors() {
  const style = getComputedStyle(document.body);
  return {
    damageFill: style.getPropertyValue('--ff6-damage-white').trim(),
    critFill: style.getPropertyValue('--crit-color').trim(),
    // ...
  };
}
```

### File changes
- `public/index.html` — new CSS variables, CRT overlay CSS, font-face addition, CRT toggle button
- `public/` — add pixel font .ttf file

---

## Workstream 5: Integration & Polish

**Goal:** Wire all workstreams together. Ensure canvas renderer receives SSE events, ATB gauges sync with server state, sounds trigger at correct moments in attack orchestration, and CRT filter applies over canvas.

### Tasks

#### 5.1 Wire SSE events to canvas renderer

Update `handleEvent()` to drive the canvas game loop state:

- `task_start` → add character to canvas party array, trigger summon animation (brightness flash + scale up)
- `task_complete` → trigger unsummon animation on canvas, then remove
- `boss_damage` → queue attack orchestration for the attacking character, update boss HP state
- `boss_death` → trigger boss death animation on canvas (flash, shake, dissolve), play fanfare
- `boss_spawn` → load new boss sprite, reset HP display
- `atb_update` → update ATB gauge fill in DOM status panel

#### 5.2 Synchronize sound with canvas attack sequence

Sound effects must fire at specific points in the attack orchestration:
- Slash sound: when attack sprite frame appears (step 3 of sequence)
- Boss hit reaction: simultaneous with slash
- Damage number: 50ms after slash
- Screen shake: simultaneous with damage number

Use the game loop timer, not `setTimeout`, for frame-accurate sync.

#### 5.3 Layer CRT filter over canvas

The CRT CSS overlay (`::before` pseudo-element with scanlines) should sit on top of the display canvas via z-index. Ensure `pointer-events: none` so clicks pass through.

#### 5.4 Handle canvas resize

On window resize:
- Recalculate integer scale factor
- Resize display canvas
- Reset `imageSmoothingEnabled` (canvas resize clears this)
- Update damage number positions

#### 5.5 Fallback for no-canvas browsers

Keep the current DOM-based rendering as a fallback. If `canvas.getContext('2d')` fails, skip canvas init and leave the existing DOM rendering intact. Feature detection at init time.

#### 5.6 Performance audit

- Ensure game loop doesn't run when tab is hidden (`document.hidden` check)
- Damage number pool: reuse objects, cap at 20 simultaneous
- Canvas `drawImage` calls: batch where possible
- Verify CRT filter doesn't cause excessive repaints (it shouldn't — it's a static pseudo-element)

### File changes
- `public/index.html` — integration code in `<script>`
- `server.js` — ATB tracking additions (if not done in Workstream 3)

---

## Detailed Task List (Execution Order)

### Phase 1: Parallel (Workstreams 1-4)

| # | WS | Task | Key Detail |
|---|-----|------|------------|
| 1 | Canvas | Offscreen canvas infrastructure | 256x224 → display, integer scaling, imageSmoothingEnabled=false |
| 2 | Canvas | Game loop | rAF at 60fps, sprite frames at 12fps via accumulator |
| 3 | Canvas | Sprite renderer | drawSprite() utility, frame config from MANIFEST, flip support |
| 4 | Canvas | Battle background | 3-layer parallax, procedural stars + nebulae, canvas-rendered |
| 5 | Canvas | Canvas damage numbers | Float-up objects with 4-dir shadow, pool/recycle |
| 6 | Canvas | Attack orchestration | 9-step state machine: step forward → flash → slash → shake → step back |
| 7 | Sound | SNES echo on master output | DelayNode + lowpass + feedback loop |
| 8 | Sound | Layered slash sound | Noise burst + sawtooth sweep, replace playHitSound |
| 9 | Sound | Enhanced crit sound | Slash + sub-bass impact layer |
| 10 | Sound | Boss death sound | 3-layer: sawtooth rumble + noise + sine sub-bass |
| 11 | Sound | Enhanced summon/unsummon | Noise sparkle + detuned chorus for summon |
| 12 | Sound | Victory fanfare | Square wave melody, Eb Mixolydian, ~3.2s |
| 13 | Sound | Boss spawn sound | Triangle drone + square stab |
| 14 | Panels | FF6 blue gradient status panel | 22-stop gradient, 6px ridge border, bottom of scene |
| 15 | Panels | Party member status rows | Name + ATB + class + task, horizontal layout |
| 16 | Panels | ATB gauge system (server) | Per-character ATB 0-100, attack on full, broadcast updates |
| 17 | Panels | ATB gauge system (client) | CSS gauges, yellow fill, flash on full |
| 18 | Panels | Boss HP in panel | Gold name, white HP numbers, kill count |
| 19 | Palette | Add pixel font | Local .ttf, @font-face, .battle-text class |
| 20 | Palette | FF6 color variables | SNES-accurate gold, white, blue palette |
| 21 | Palette | CRT scanline filter | Repeating-linear-gradient, toggleable, phosphor glow |
| 22 | Palette | Theme system update | Canvas reads theme colors via getComputedStyle |

### Phase 2: Integration (Workstream 5, depends on Phase 1)

| # | Task | Key Detail |
|---|------|------------|
| 23 | Wire SSE → canvas renderer | handleEvent drives game loop state |
| 24 | Sync sound with attack sequence | Frame-accurate trigger points, not setTimeout |
| 25 | CRT over canvas | z-index layering, pointer-events: none |
| 26 | Canvas resize handling | Integer scale recalc, imageSmoothingEnabled reset |
| 27 | DOM fallback | Feature detect canvas, keep DOM rendering as backup |
| 28 | Performance audit | Hidden tab check, damage pool cap, batch drawImage |

### Phase 3: Testing & Review

| # | Task | Key Detail |
|---|------|------------|
| 29 | End-to-end testing | All test scenarios below |
| 30 | Staff engineer review | Two-Claude pattern: review agent audits all changes |

---

## Integration Testing

### Test Scenarios

1. **Canvas rendering** — verify battle scene renders at 256x224, scales to container with uniform pixels, no anti-aliasing bleed
2. **Sprite animation** — verify idle bounce at ~12fps, attack sequence plays all 4 frames, boss idle loops correctly
3. **Attack orchestration** — start 1 task, watch full attack sequence: step forward, flash, slash effect, screen shake, damage number, step back. Verify timing feels right (~1.5s total)
4. **Multi-party attacks** — start 4 tasks, verify staggered attacks don't overlap visually (queue system)
5. **ATB gauges** — verify gauges fill at different rates per class (rogue fast, berserker slow), attack fires when full
6. **Boss death** — kill boss, verify: death animation on canvas, victory text overlay, fanfare plays, new boss spawns after ~2s with higher HP
7. **Sound chain** — verify SNES echo is audible on all SFX (subtle reverb tail), mute toggle silences everything including fanfare
8. **CRT filter** — toggle on/off, verify scanlines appear over canvas, no performance degradation, toggle persists across page load (localStorage)
9. **Blue panel** — verify FF6 gradient renders correctly, border is white ridge, party info displays in rows
10. **Empty state** — no tasks running, verify: empty blue panel message, boss idles on canvas, no errors in console
11. **SSE reconnect** — refresh browser, verify canvas rebuilds from sync event, ATB gauges restore correctly
12. **Resize** — resize browser window, verify canvas rescales with integer scaling, no blurring

### Review Checklist

- [ ] Canvas renders at 256x224 native, integer-scaled
- [ ] `imageSmoothingEnabled = false` set on both contexts, reset on resize
- [ ] Sprite frame counts in JS config match MANIFEST.md exactly
- [ ] Game loop pauses when tab is hidden
- [ ] Attack state machine handles rapid events without getting stuck
- [ ] SNES echo chain doesn't accumulate/clip on rapid hits
- [ ] ATB math: `atb += (TICK_INTERVAL / attackSpeed) * 100` reaches 100 at correct intervals
- [ ] FF6 blue gradient uses the 22-stop version, not the 5-stop approximation
- [ ] CRT filter uses `pointer-events: none`
- [ ] Pixel font has `-webkit-font-smoothing: none` applied
- [ ] No new npm dependencies
- [ ] All Web Audio created after user interaction (autoplay policy)
- [ ] Canvas fallback gracefully degrades to existing DOM rendering
- [ ] Victory fanfare timing doesn't overlap boss spawn sound

---

## Out of Scope (v3)

- Reversed camera perspective (behind the boss) — requires new back-view sprites
- Real 0x72 DungeonTileset II sprites (replacing placeholders) — asset extraction task
- WebGL rendering (Pixi.js / LittleJS) — current canvas 2D is sufficient for <20 sprites
- ZzFX library integration — raw Web Audio achieves same quality without dependency
- Canvas particle effects (spell cast particles, death dissolve particles)
- Music loop / ambient BGM between fights
- Mobile touch controls / gesture support
- RGB subpixel CRT effect (too subtle, performance concern)
- Barrel distortion / screen curvature via WebGL
- Additional themes beyond JRPG (structure is ready from v1)
- Boss attack animations / party damage

---

## Agent Delegation Prompts

### For Workstream 1 (Canvas Renderer) agent:
> Modify public/index.html to add a canvas-based battle renderer. Create an offscreen canvas at 256x224 (SNES native resolution) and a display canvas that fills the .boss-area container. Scale with integer multiplier and image-rendering: pixelated. Implement a game loop with requestAnimationFrame at 60fps, sprite frame updates at 12fps via accumulator. Build a drawSprite() utility that renders from sprite sheets using frame config: characters are 16x16 with rows idle(6), attack(4), hit(2), death(4); bosses are 32x32 with idle(4). Add procedural battle background with 3 parallax layers (stars, nebulae, gradient sky) — all canvas-rendered, no image assets. Implement canvas-based damage numbers that float up and fade. Implement full attack orchestration as a 9-step state machine: step forward → pause → attack frame → slash effect → screen flash → screen shake → damage number → step back → idle. Read RESEARCH-autobattler.md sections 7, 13, 17 and appendices A5, A7 for code samples.

### For Workstream 2 (Sound Overhaul) agent:
> Replace the audio system in public/index.html. Keep raw Web Audio API (no library dependencies). Add SNES echo effect on master output: DelayNode at 100-150ms, GainNode feedback at 25-30%, BiquadFilter lowpass at 4000Hz, wet/dry mix. Route all sounds through this chain. Replace playHitSound with layered slash: white noise buffer (bandpass 3kHz→800Hz sweep) + sawtooth oscillator (600Hz→200Hz). Replace playCritSound with enhanced slash + sine sub-bass impact. Replace playBossDeathSound with 3-layer: sawtooth rumble (80→30Hz), white noise burst (quadratic decay), sine sub-bass (60→20Hz). Enhance summon with noise sparkle + detuned oscillator chorus. Add victory fanfare: 11 square-wave notes in Eb Mixolydian, ~3.2s, scheduled with osc.start/stop. Add boss spawn sound: triangle drone + square stab. All audio must init on user interaction. Mute toggle must silence everything. Read RESEARCH-autobattler.md section 11 and appendices A1, A2 for code samples.

### For Workstream 3 (UI Panels & ATB) agent:
> Restructure the battle UI in public/index.html. Replace the party-area background with an FF6 blue gradient status panel at the bottom of the battle scene. Use the 22-stop HDMA-accurate gradient from RESEARCH-autobattler.md appendix A6 (#7b7bd6 → #000029), border: 6px ridge #ffffff, border-radius: 12px. Move party member info into horizontal rows in this panel: name (gold), ATB gauge (yellow fill bar), class, task name. Add ATB gauge system: 60px wide, 4px tall bars that fill left-to-right with #D4A820→#F8D830 gradient, flash when full. Server-side (server.js): modify the damage tick to track per-character ATB (0-100), fire attack when ATB reaches 100, broadcast atb_update events. Client-side: update ATB gauges from SSE events. Move boss name/HP display into or near the blue panel. Read RESEARCH-autobattler.md sections 3, 9 and appendix A6.

### For Workstream 4 (Palette & CRT) agent:
> Update the visual theme in public/index.html. Add a pixel font file to public/ and @font-face it. Apply with -webkit-font-smoothing: none to .battle-text class. Keep AvQest for .title. Add FF6 SNES-accurate color variables under [data-theme="jrpg"]: --ff6-name-gold: #C8B458, --ff6-text-white: #F8F8F8, --ff6-atb-fill: #D4A820, --ff6-window-border: #E7DFE7, etc (from RESEARCH-autobattler.md section 4). Add CRT scanline filter as a toggleable CSS overlay: repeating-linear-gradient (2px period, 25% opacity), phosphor glow (blue-tinted inset box-shadow), border-radius: 20px. Add CRT toggle button next to mute button. Default OFF. Store preference in localStorage. Add getThemeColors() JS function that reads CSS variables via getComputedStyle for canvas rendering to use. Read RESEARCH-autobattler.md sections 4, 10, 12.

### For Workstream 5 (Integration) agent:
> Wire all systems together in public/index.html. Update handleEvent() so SSE events drive the canvas game loop: task_start adds character to canvas party array with summon animation, task_complete triggers unsummon, boss_damage queues attack orchestration for the attacking character, boss_death triggers canvas death animation + victory fanfare (sound workstream), boss_spawn loads new boss sprite, atb_update updates ATB gauge DOM elements. Sync sound with canvas: slash sound fires at attack frame (step 3), not via setTimeout. Layer CRT filter CSS over canvas with z-index and pointer-events:none. Handle canvas resize with integer scale recalc and imageSmoothingEnabled reset. Add document.hidden check to pause game loop when tab is backgrounded. Add DOM rendering fallback if canvas.getContext fails. Cap damage number pool at 20. Test all 12 integration scenarios from the plan.

### For Review agent:
> You are a staff engineer reviewing the Soul Stone FF6 visual overhaul. Read PLAN-ff6-overhaul.md and RESEARCH-autobattler.md for the spec. Review all changed files (server.js, public/index.html, any new font/asset files). Check: canvas renders at 256x224 native with imageSmoothingEnabled=false on both contexts, sprite frame counts in JS match MANIFEST.md, game loop pauses when document.hidden, attack state machine handles rapid events, SNES echo chain doesn't clip, ATB math is correct (atb += (TICK/attackSpeed)*100), FF6 gradient uses 22 stops, CRT filter has pointer-events:none, pixel font has font-smoothing disabled, no new npm deps, Web Audio inits after user interaction, canvas fallback works, fanfare doesn't overlap spawn sound. Report issues as a numbered list with file:line references.
