# Soul Stone SNES Final Fantasy Visual Overhaul — Research

Research compiled 2026-02-02. Covers visual style, battle layout, sprite systems, sound design, and browser implementation techniques for converting Soul Stone's auto-battler to an authentic SNES-era Final Fantasy aesthetic.

---

## Table of Contents

1. [SNES FF Battle Visual DNA](#1-snes-ff-battle-visual-dna)
2. [The Reversed Camera — Behind the Boss](#2-the-reversed-camera--behind-the-boss)
3. [The FF6 Blue Gradient Menu Box](#3-the-ff6-blue-gradient-menu-box)
4. [Color Palette & SNES Constraints](#4-color-palette--snes-constraints)
5. [Character Sprites — Structure & Animation](#5-character-sprites--structure--animation)
6. [Boss Sprites](#6-boss-sprites)
7. [Battle Backgrounds & Parallax](#7-battle-backgrounds--parallax)
8. [Damage Numbers & Screen Effects](#8-damage-numbers--screen-effects)
9. [ATB Gauges](#9-atb-gauges)
10. [Typography & Fonts](#10-typography--fonts)
11. [Sound Design — SNES Audio Recreation](#11-sound-design--snes-audio-recreation)
12. [CRT / Scanline Filter](#12-crt--scanline-filter)
13. [Pixel Art Rendering in Browsers](#13-pixel-art-rendering-in-browsers)
14. [Sprite Generation — No External Assets](#14-sprite-generation--no-external-assets)
15. [Free Asset Resources](#15-free-asset-resources)
16. [Libraries & Frameworks](#16-libraries--frameworks)
17. [Implementation Architecture](#17-implementation-architecture)

---

## 1. SNES FF Battle Visual DNA

### What Makes It Distinctive

The SNES Final Fantasy battle screens (FF4/5/6) have a signature look defined by:

- **256x224 native resolution** (FF6 uses ~208 visible scanlines). Aspect ratio is 8:7 pixel grid, stretched to 4:3 on CRT
- **15-bit color** (5 bits per channel, BGR format). True SNES white is `#F8F8F8`, not `#FFFFFF`. All valid SNES colors have RGB components that are multiples of 8
- **16 colors per sprite palette** (4bpp). Each character limited to 15 visible colors + transparency
- **Blue gradient UI panels** along the bottom ~40% of screen, generated via HDMA (per-scanline color math)
- **Gold/yellow text** for labels, white text for values
- **Enemies left, party right**, staggered diagonally
- **Warm, painted battle backgrounds** with 2-3 parallax layers
- **Sprite-based damage numbers** that float upward
- **ATB gauges** — thin horizontal bars per character (visible in FF5/6)

### FF4 → FF5 → FF6 Evolution

| Feature | FF4 (1991) | FF5 (1992) | FF6 (1994) |
|---------|-----------|-----------|-----------|
| ATB gauge | Hidden | Visible (chunky blocks) | Visible, smooth fill |
| Party size | Up to 5 | 4 | Up to 4 |
| Sprite detail | Simpler | Job-specific | Most detailed, unique per character |
| Font | Fixed width | Fixed width | **Variable width** (unusual for SNES) |
| ATB behavior | Actions pause gauges | Faster casting | Actions do NOT pause gauges |

---

## 2. The Reversed Camera — Behind the Boss

### Concept

Standard FF6: enemies left, party right, camera "from the side." Our concept: camera behind the boss, looking out at the party. The boss's back is toward us; party members face us.

### Layout Implementation

```
┌─────────────────────────────────────────────┐
│              BATTLE BACKGROUND               │
│                                              │
│                    [party1]  [party2]         │
│    ████████                                  │
│    ██BOSS██          [party3]                │
│    ██BACK██                    [party4]      │
│    ████████                                  │
│                                              │
├─────────────────────────────────────────────┤
│  FF6-STYLE BLUE GRADIENT STATUS PANEL        │
│  [Name] [ATB====] HP 1234/5678  MP 123/456   │
│  [Name] [ATB==  ] HP  891/2345  MP  67/234   │
└─────────────────────────────────────────────┘
```

### CSS Approach

```css
.battle-scene {
  position: relative;
  perspective: 800px;
  transform-style: preserve-3d;
}

/* Boss: foreground, large, we see their back */
.boss {
  position: absolute;
  left: 10%;
  top: 25%;
  transform: scale(4);  /* large foreground presence */
  z-index: 10;
  image-rendering: pixelated;
}

/* Party: background, smaller (depth), facing viewer */
.party-area {
  position: absolute;
  right: 5%;
  top: 10%;
  bottom: 20%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Stagger party diagonally for depth */
.party-member:nth-child(1) { margin-right: 40px; }
.party-member:nth-child(2) { margin-right: 20px; }
.party-member:nth-child(3) { margin-right: 30px; }
.party-member:nth-child(4) { margin-right: 10px; }

/* Depth cues */
.party-member {
  transform: scale(2.5);  /* smaller than boss = further away */
  filter: brightness(0.9);  /* atmospheric perspective */
}
```

### Boss "Back" Sprite Options

Since we see the boss from behind:
1. **Simple silhouette** — dark, imposing shape with subtle detail. Cheapest to implement
2. **Dedicated back-facing sprite** — drawn specifically for this view
3. **Darkened/desaturated front sprite** — take the normal sprite, darken it, add a subtle rim-light edge to suggest backlighting
4. **CSS filter approach**: `filter: brightness(0.3) contrast(1.2)` on the normal sprite + a bright outline via `drop-shadow`

---

## 3. The FF6 Blue Gradient Menu Box

### How the Original Works

The SNES generates this at runtime using **HDMA** (Horizontal Direct Memory Access) — writing to the COLDATA register on every scanline to change the blue channel per line. It's not a bitmap; it's a per-scanline color blend.

### Approximate Color Values

| Position | SNES Blue (0-31) | 24-bit Hex |
|----------|-------------------|------------|
| Top (brightest) | ~22 | `#0000B0` |
| Upper-mid | ~16 | `#000080` |
| Center | ~10 | `#000050` |
| Lower-mid | ~6 | `#000030` |
| Bottom (darkest) | ~3-4 | `#000018` |

### Border

- 1-2px bright white (`#E7DFE7` to `#FFFFFF`)
- Slight bevel: lighter top-left, darker bottom-right
- Subtle rounded corners (~2-3px radius at SNES res, ~7px at scaled res)

### CSS Recreation

```css
.ff6-window {
  background: linear-gradient(180deg,
    #0000B0 0%,
    #000080 25%,
    #000050 50%,
    #000030 75%,
    #000018 100%
  );
  border: 2px solid #e7dfe7;
  border-radius: 7px;
  box-shadow:
    1px 1px 0 #e7dfe7,
    -1px -1px 0 #e7dfe7,
    1px -1px 0 #e7dfe7,
    -1px 1px 0 #e7dfe7,
    inset 1px 1px 0 rgba(255,255,255,0.15),
    inset -1px -1px 0 rgba(0,0,0,0.3);
  padding: 12px 16px;
  color: #ffffff;
}
```

Alternative values from a Japanese developer's recreation:
```css
.ff6-window-alt {
  background: linear-gradient(180deg, #7b7bd6 0%, #000039 100%);
  border-style: ridge;
  border-width: 6px;
  border-radius: 12px;
  border-color: #fff;
}
```

### Existing CSS Resources

- [cafeTechne/Final-Fantasy-CSS](https://github.com/cafeTechne/Final-Fantasy-CSS) — CSS components for FF menus
- [FF7 UI CodePen by Kaizzo](https://codepen.io/Kaizzo/pen/aGWwMM) — blue gradient window technique
- [yo1000.com FF Window Card](https://www.yo1000.com/ff-window-like-card/) — Japanese dev recreation

---

## 4. Color Palette & SNES Constraints

### UI Element Colors

| Element | Hex | Usage |
|---------|-----|-------|
| Character names | `#C8B458` - `#D4B84A` | Gold/yellow |
| HP/MP labels | `#C8B458` | Yellow |
| HP/MP numbers (normal) | `#FFFFFF` | White |
| HP numbers (critical) | `#F8D830` | Yellow/orange warning |
| ATB gauge fill | `#D4A820` - `#F8D830` | Yellow/amber |
| ATB gauge empty | `#181818` - `#282828` | Dark |
| Damage numbers | `#FFFFFF` | White with black outline |
| Healing numbers | `#00E800` | Green |
| Window border | `#E7DFE7` | Near-white |
| Menu cursor | `#FFFFFF` | White pointer |

### SNES Technical Constraints (for authenticity)

- 256 total palette entries in CGRAM
- 8 battle palettes at ROM `$ED6300`, 32 overworld palettes at `$E68000`
- Characters: 4bpp = 16 colors per palette (1 transparent + 15 visible)
- Font: 2bpp = 4 colors max
- Total addressable: 32,768 colors (15-bit RGB)

---

## 5. Character Sprites — Structure & Animation

### Dimensions

- **Map/overworld**: 16x24 pixels
- **Battle (assembled)**: ~32x48 pixels (6 tiles of 16x24), loaded into 64x64 OAM register
- Each pose = 6 tiles arranged in a 2x3 grid

### Animation System

Each character has **17 animations** and **13 static poses** = 46 total poses (92 with horizontal flips), built from up to **181 unique 8x8 tiles**.

Two animation cycle types:
1. **Three-pose (1-2-1-3 pattern)**: The classic **idle bounce**. 5 types exist
2. **Two-pose (1-2 pattern)**: 12 types exist

### Key Battle Poses

| Pose ID | Description |
|---------|-------------|
| `$0B` | Ready stance (idle) |
| `$07` | Attacking (back hand) |
| `$08` | Attacking (front hand) |
| `$09` | Casting magic |
| `$0A` | Critical / low HP (hunched) |
| `$0C` | Hit reaction |
| `$01` | Dead (horizontal) |
| `$06` | Facing forward |
| `$15` | Arms raised + jumping (victory) |

Poses `$40`-`$7F` = horizontally flipped versions of `$00`-`$3F`.

### Animation Timing

- Sprites animate at **~10-15 fps** (not 60fps)
- Idle bounce: 2-frame loop at slow speed, using Y-offset adjustments
- Attack: character steps forward → attack pose → slash effect → damage → step back
- Battle animation script byte commands:
  - `$81`: Change pose
  - `$83`: Handle movement (forward/back)
  - `$89`/`$8A`: Loop/delay (`89 xx 1F 8A` = wait xx frames)
  - `$98`: Frame increment control

### CSS Sprite Sheet Animation

```css
/* Idle: 3 frames, 1-2-1-3 pattern mapped to 4 steps */
.character.idle {
  width: 32px;
  height: 48px;
  background: url('spritesheet.png') no-repeat;
  background-size: 192px 48px;  /* 6 frames x 32px */
  image-rendering: pixelated;
  animation: idle-bounce 0.8s steps(4) infinite;
}

@keyframes idle-bounce {
  0%   { background-position-x: 0; }      /* pose 1 */
  25%  { background-position-x: -32px; }   /* pose 2 */
  50%  { background-position-x: 0; }        /* pose 1 */
  75%  { background-position-x: -64px; }   /* pose 3 */
  100% { background-position-x: 0; }        /* pose 1 */
}

/* Attack sequence */
@keyframes attack-forward {
  0%   { transform: translateX(0); }
  30%  { transform: translateX(-60px); }     /* step forward */
  40%  { transform: translateX(-60px); }     /* pause at target */
  50%  { transform: translateX(-60px); }     /* slash effect */
  100% { transform: translateX(0); }          /* return */
}
```

---

## 6. Boss Sprites

### In FF6

- Boss sprites are larger than character sprites — varying sizes up to 128x128 or larger
- 2-4 frame idle animations at slow speed
- Death animation: slow dissolve/fade, sprite becomes gradually transparent
- Regular enemies fade out; bosses get extended death sequences

### For the Reversed View

Since the boss faces away from camera, options:

1. **Dedicated "back" sprite sheet** — most authentic, most work
2. **Silhouette approach** — render a dark shape with glowing rim-light edges. Very atmospheric
3. **Darkened front sprite** — apply CSS filters to existing sprite

```css
/* Silhouette boss with rim lighting */
.boss-back {
  filter: brightness(0.15) contrast(1.5);
  /* Add rim light via drop-shadow */
  -webkit-filter: drop-shadow(0 0 2px rgba(200,180,100,0.4));
}

/* Boss idle: subtle breathing */
@keyframes boss-idle {
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-2px) scale(1.01); }
}

/* Boss death */
@keyframes boss-death {
  0%   { filter: brightness(1); opacity: 1; }
  20%  { filter: brightness(3); }
  40%  { filter: brightness(1); transform: translateX(-5px); }
  60%  { filter: brightness(2); transform: translateX(5px); }
  80%  { opacity: 0.5; filter: brightness(1.5); }
  100% { opacity: 0; transform: scale(0.8) translateY(20px); }
}
```

---

## 7. Battle Backgrounds & Parallax

### How FF6 Does It

- 2-3 BG layers (BG1, BG2, BG3) scrolling at different speeds via SNES PPU registers
- HDMA controls per-scanline scroll positions for smooth parallax splits
- Backgrounds ripped at ~256x147 pixels, stored as 8bpp indexed 256-color images
- Higher strips scroll slower (distance), lower strips scroll faster (foreground)
- Depth cues: distant layers = muted/darker colors, near layers = brighter/more saturated

### Common Background Themes

Grasslands, forests, caves, mountains, castles, airship decks, floating continent, Kefka's Tower, opera house, colosseum, etc.

### CSS Parallax Implementation

```css
.battle-background {
  position: relative;
  overflow: hidden;
}

/* Far layer: sky/stars — slowest scroll */
.bg-layer-far {
  position: absolute;
  width: 200%;
  height: 100%;
  animation: scroll-far 30s linear infinite;
  opacity: 0.7;
}

/* Mid layer: clouds/mountains */
.bg-layer-mid {
  position: absolute;
  width: 150%;
  height: 100%;
  animation: scroll-mid 20s linear infinite;
}

/* Near layer: ground */
.bg-layer-near {
  position: absolute;
  width: 120%;
  height: 100%;
  animation: scroll-near 15s linear infinite;
}

@keyframes scroll-far {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@keyframes scroll-mid {
  from { transform: translateX(0); }
  to   { transform: translateX(-33%); }
}
@keyframes scroll-near {
  from { transform: translateX(0); }
  to   { transform: translateX(-17%); }
}
```

### Canvas Parallax (More Authentic)

```javascript
class ParallaxLayer {
  constructor(image, speed) {
    this.image = image;
    this.speed = speed;
    this.x = 0;
  }
  update(dt) {
    this.x -= this.speed * dt;
    if (this.x <= -this.image.width) this.x += this.image.width;
  }
  draw(ctx, w, h) {
    ctx.drawImage(this.image, this.x, 0, w, h);
    ctx.drawImage(this.image, this.x + this.image.width, 0, w, h);
  }
}

// Draw image twice side by side for seamless wrap
const layers = [
  new ParallaxLayer(skyImg,    0.02),
  new ParallaxLayer(hillsImg,  0.05),
  new ParallaxLayer(groundImg, 0.10),
];
```

### Ripped Battle Backgrounds (Reference Only)

- [The Spriters Resource — FF6 Battle Backgrounds](https://www.spriters-resource.com/snes/ff6/asset/54685/)
- [Background HQ — FF6](https://bghq.com/bgs.php?c=1n)

---

## 8. Damage Numbers & Screen Effects

### FF6 Damage Numbers

- Rendered as **OAM sprites** (hardware sprites), not background text
- **White** for damage, **green** for healing
- Float upward briefly, then disappear
- Right-aligned digit rendering, up to 9999
- Multiple can appear simultaneously (multi-target)
- Black outline/shadow for readability

### CSS Damage Numbers

```css
.damage-number {
  position: absolute;
  font-family: 'FF6Font', monospace;
  color: #F8F8F8;
  text-shadow:
    1px 1px 0 #000,
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000;
  animation: damage-float 0.8s ease-out forwards;
  pointer-events: none;
  z-index: 100;
  image-rendering: pixelated;
}

.damage-number.crit {
  color: #FF4444;
  font-size: 1.5em;
  text-shadow:
    1px 1px 0 #000, -1px -1px 0 #000,
    1px -1px 0 #000, -1px 1px 0 #000,
    0 0 8px rgba(255,68,68,0.6);
}

.damage-number.heal {
  color: #00E800;
}

@keyframes damage-float {
  0%   { opacity: 1; transform: translateY(0) scale(1.2); }
  20%  { transform: translateY(-15px) scale(1); }
  70%  { opacity: 1; }
  100% { opacity: 0; transform: translateY(-40px) scale(0.8); }
}
```

### Screen Flash (Critical Hit / Powerful Spells)

```css
.screen-flash {
  position: fixed;
  inset: 0;
  background: white;
  pointer-events: none;
  z-index: 200;
  animation: flash 0.25s ease-out forwards;
}

@keyframes flash {
  0%   { opacity: 0.8; }
  100% { opacity: 0; }
}
```

### Screen Shake

```css
@keyframes screen-shake {
  0%, 100% { transform: translate(0); }
  10% { transform: translate(-3px, 2px); }
  20% { transform: translate(3px, -2px); }
  30% { transform: translate(-2px, 3px); }
  40% { transform: translate(2px, -1px); }
  50% { transform: translate(-1px, 2px); }
}

.shaking {
  animation: screen-shake 0.3s ease-out;
}
```

### Hit Reaction (Target Sprite)

```css
@keyframes hit-reaction {
  0%   { transform: translateX(0); filter: brightness(3); }
  10%  { transform: translateX(5px); filter: brightness(3); }
  20%  { transform: translateX(-3px); filter: brightness(1); }
  40%  { transform: translateX(0); }
  100% { transform: translateX(0); }
}
```

### Attack Animation Full Sequence

In FF6, a physical attack follows this script:
1. Character switches to "ready to attack" pose
2. Character steps forward toward target (`$83` command)
3. Brief pause at target
4. Weapon slash effect plays (sprite overlay)
5. Character changes to attack pose (`$07` or `$08`)
6. Damage numbers appear, floating upward
7. Target plays hit reaction (`$0C`)
8. Character steps back to original position
9. Character returns to idle stance

---

## 9. ATB Gauges

### How FF6 Displays ATB

- Internal value: 0 (empty) to 255 (full)
- Thin horizontal bar next to each character's name
- Fills left-to-right with **yellow/amber** color
- When full: character name highlights yellow = ready to act
- Haste = 1.5x fill speed, Slow = 0.5x

### CSS ATB Gauge

```css
.atb-gauge {
  width: 60px;
  height: 4px;
  background: #181818;
  border: 1px solid #404040;
  border-radius: 1px;
  overflow: hidden;
  image-rendering: pixelated;
}

.atb-fill {
  height: 100%;
  background: linear-gradient(90deg, #D4A820, #F8D830);
  transition: width 0.1s linear;
}

.atb-fill.full {
  animation: atb-flash 0.3s ease infinite alternate;
}

@keyframes atb-flash {
  from { background: #F8D830; }
  to   { background: #FFF8A0; }
}
```

### Mapping to Auto-Battler

Each party member's ATB gauge represents their attack cooldown timer. When it fills, they auto-attack the boss, gauge empties, and refilling begins. Visual feedback without requiring progress percentage data.

---

## 10. Typography & Fonts

### FF6's Font

- **Variable-width font** (VWF) — unusual for SNES
- Base tile size: 8x8 pixels, 2bpp (4 colors max)
- Most characters 8px wide, narrow chars ("I","i","l") = 4px, wide ("w") = 12px
- White for most text, palette swaps for gold/yellow labels

### Available Recreations

- **"Final Fantasy VI SNESb"** — TrueType recreation at [wfonts.com](https://www.wfonts.com/font/final-fantasy-vi-snesb)
- [Spriters Resource Icons/Font/Menu rip](https://www.spriters-resource.com/snes/ff6/asset/54693/)

### For Soul Stone

The current AvQest font has a Celtic/medieval feel. For FF authenticity:

**Option A**: Use the FF6 SNESb font (closest to authentic)
**Option B**: Use a pixel font like **Press Start 2P** (Google Fonts) — not FF-specific but reads as "retro game"
**Option C**: Keep AvQest for headers, use a pixel font for the battle UI numbers/text

CSS for pixel-perfect font rendering:
```css
.battle-text {
  font-family: 'FF6Font', monospace;
  font-smooth: never;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: unset;
  text-rendering: optimizeSpeed;
}
```

---

## 11. Sound Design — SNES Audio Recreation

### The SPC700 Sound Chip

The SNES audio is fundamentally **sample-based** (not synthesis like NES/Genesis):
- Sony SPC700 processor + S-DSP
- **8 channels** of ADPCM audio at 32KHz, 16-bit output
- **BRR compression** (Bit Rate Reduction) — creates subtle artifacts
- **Gaussian interpolation filter** — smooths/dulls high frequencies, giving SNES its "warm/muffled" quality
- **Built-in echo/delay** — up to 224ms, 8-coefficient FIR filter. Cornerstone of the SNES sound
- **64KB total audio RAM** — everything must fit (engine, sequences, samples, echo buffer)

### Recreating SNES Sound in Browser

To approximate the SPC700 sound in Web Audio API:
1. Use **short audio samples** (not pure synthesis) for instruments
2. Apply a **low-pass filter** (BiquadFilterNode) to simulate Gaussian interpolation
3. Add **echo/delay** (100-200ms, 20-30% feedback) for the signature reverb
4. Keep samples lo-fi — the 64KB constraint forced creative compression

### Recommended Libraries

#### ZzFX (Best for SFX — Zero Dependencies, <1KB)

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/ZzFX/2.21/ZzFX.min.js"></script>
```

```javascript
// 20 controllable parameters per sound
zzfx(...[,,925,.04,.3,.6,1,.3,,6.27,-184,.09,.17]);   // Game Over
zzfx(...[,,537,.02,.02,.22,1,1.59,-6.98,4.97]);       // Pickup
zzfx(...[1.5,.8,270,,.1,,1,1.5,,,,,,,,.1,.01]);       // Piano hit

zzfxV = 0.3;  // Volume control
```

- [ZzFX GitHub](https://github.com/KilledByAPixel/ZzFX)
- [ZzFX Sound Designer](https://killedbyapixel.github.io/ZzFX/) — visual tool, export as parameter arrays
- **ZzFXM** adds music generation on top — tiny music renderer with online tracker/sequencer
- CDN: `cdnjs.com/libraries/ZzFX`
- npm: `npm install zzfx`

#### jsfxr (Great Sound Designer + Library)

```javascript
// Design sounds at sfxr.me, serialize, play back
jsfxr.play(jsfxr.generate('hitHurt'));  // Presets available

// Presets: pickupCoin, laserShoot, explosion, powerUp,
//          hitHurt, jump, blipSelect, synth, tone, click
```

- [sfxr.me](https://sfxr.me/) — online designer
- [Pro version](https://pro.sfxr.me/)
- [jsfxr GitHub](https://github.com/chr15m/jsfxr)

#### Tone.js (For Music/Fanfare)

```javascript
const synth = new Tone.Synth({
  oscillator: { type: 'square' },
  envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.05 }
}).toDestination();

synth.triggerAttackRelease('C4', '8n');
```

Classic SNES waveforms: `square` (quintessential), `pulse` (NES flavor), `triangle` (bass), `sawtooth` (harsh lead), `noise` (percussion).

- [tonejs.github.io](https://tonejs.github.io/)

### Specific Sound Effects Needed

| Sound | Character | Implementation Notes |
|-------|-----------|---------------------|
| Cursor/menu beep | Short, high-pitched click ~1-3kHz | Quick attack, fast decay. The SNES version is "snappy, percussive" |
| Sword slash | Sharp metallic swoosh | ZzFX noise + frequency sweep |
| Critical hit | Louder slash variant | Higher volume + layered impact |
| Magic cast | Shimmering (white magic) or aggressive burst (black magic) | Different per spell type |
| Boss damage | Low thud/impact | Low frequency hit |
| Boss death | Explosion + dissolve | Layered: low rumble + high crackle |
| Summon in | Ascending tones (current ascending sine is good) | Brighten with overtones |
| Unsummon | Descending tones (current works) | Add slight reverb tail |
| Victory fanfare | The iconic melody | See below |

### Victory Fanfare

- **Key**: G Major
- **Tempo**: ~134 BPM
- Brass-led motif, universally recognized
- Opening rhythmic figure: da-da-da-daaaa da-da-da-da-daaa

Web Audio API approach for a melody:
```javascript
function playNote(ctx, freq, startTime, duration, type = 'square', vol = 0.12) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(vol, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// Schedule notes with ctx.currentTime + offsets
// Eb4 = 311.13 Hz, Bb4 = 466.16 Hz, etc.
```

### SNES Echo/Reverb Effect in Web Audio

```javascript
function createSNESEcho(ctx) {
  const delay = ctx.createDelay();
  delay.delayTime.value = 0.15;  // 150ms (SNES range: up to 224ms)

  const feedback = ctx.createGain();
  feedback.gain.value = 0.25;  // 25% feedback

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 4000;  // Gaussian interpolation rolloff

  delay.connect(feedback);
  feedback.connect(filter);
  filter.connect(delay);

  return { input: delay, output: filter };
}
```

### Free Audio Resources

| Resource | Description |
|----------|-------------|
| [The Sounds Resource — FF6](https://www.sounds-resource.com/snes/finalfantasy6/sound/6135/) | Ripped SFX |
| [Archive.org — FF6 Sounds](https://archive.org/details/ff6_sounds) | Downloadable SFX collection |
| [300+ Free 16-Bit Retro SFX](https://free-sample-packs.com/300-free-16-bit-retro-arcade-sfx/) | Impacts, combat, magic |
| [Bfxr](https://www.bfxr.net/) | Browser-based retro SFX generator |
| [MOMIZizm MUSiC](https://music.storyinvention.com/en/category/free-bgm-en/16bit-en/) | Copyright-free 16-bit BGM tracks |
| [NinSheetMusic — Victory Fanfare](https://www.ninsheetmusic.org/download/pdf/3956) | Sheet music reference |
| [MuseScore — FF Victory](https://musescore.com) | Community arrangements |

### Recommendation for Soul Stone

1. **ZzFX** for all battle SFX — design at the online tool, export as parameter arrays, play with `zzfx(...)`. Zero audio files needed
2. **Raw Web Audio API** for the victory fanfare melody (schedule oscillators with note frequencies)
3. **Low-pass filter + delay node** on master output for SNES-like warmth
4. Current `playTone()` approach in `index.html` is a solid foundation — enhance it with richer timbres (layered oscillators, noise bursts, envelope shaping)

---

## 12. CRT / Scanline Filter

### Scanlines via CSS

```css
.crt-overlay::before {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 1px,
    rgba(0, 0, 0, 0.25) 1px,
    rgba(0, 0, 0, 0.25) 2px
  );
  pointer-events: none;
  z-index: 10;
}
```

### Phosphor Glow

```css
.crt {
  box-shadow: inset 0 0 100px rgba(100, 140, 255, 0.03);
}

.crt * {
  text-shadow: 0 0 3px rgba(200, 200, 255, 0.15);
}
```

### RGB Subpixel (Screen-Door Effect)

```css
.crt::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to right,
    rgba(255, 0, 0, 0.06),
    rgba(0, 255, 0, 0.02),
    rgba(0, 0, 255, 0.06)
  );
  background-size: 3px 1px;
  pointer-events: none;
  z-index: 11;
}
```

### Screen Curvature

```css
.crt {
  border-radius: 20px;
  box-shadow:
    inset 0 0 60px rgba(0, 0, 0, 0.6),
    inset 0 0 10px rgba(0, 0, 0, 0.4);
}
```

### WebGL Option

[CRTFilter](https://www.cssscript.com/retro-crt-filter-webgl/) — JS + WebGL library with controls for scanline intensity, glow/bloom, chromatic aberration, barrel distortion.

### Important: Should Be Toggleable

CRT effects impact performance and can trigger photosensitive reactions. Provide a toggle (the current mute button pattern works well).

---

## 13. Pixel Art Rendering in Browsers

### The Critical CSS Property

```css
.pixel-art {
  image-rendering: pixelated;     /* Chrome, Safari, Edge */
  image-rendering: crisp-edges;   /* Firefox */
}
```

Browser support ~95%. Without this, browsers apply bilinear filtering that blurs pixel art.

### Canvas Rendering

```javascript
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// IMPORTANT: Resizing canvas resets this — re-set after any resize
```

### The Offscreen Canvas Pattern (Recommended)

Render at native SNES resolution, then scale up:

```javascript
const GAME_W = 256, GAME_H = 224;

const offscreen = document.createElement('canvas');
offscreen.width = GAME_W;
offscreen.height = GAME_H;
const gameCtx = offscreen.getContext('2d');

function render() {
  // Draw at native res on offscreen...
  // Scale up to display
  displayCtx.imageSmoothingEnabled = false;
  displayCtx.drawImage(offscreen, 0, 0, displayCanvas.width, displayCanvas.height);
  requestAnimationFrame(render);
}
```

**Integer scaling** (2x, 3x, 4x) produces the most uniform pixel sizes.

### Canvas vs DOM for Sprites

| Factor | Canvas | DOM/CSS |
|--------|--------|---------|
| Many sprites (100+) | Faster | Slower (DOM overhead) |
| Few sprites (<20) | Comparable | Often faster (HW-accelerated) |
| CSS animations | Not available | Native, off-main-thread |
| Pixel control | Full | Limited |
| UI overlays | Harder | Natural fit |

**Best practice**: Canvas/WebGL for gameplay rendering, DOM for UI overlays. CSS sprite animations run off the main thread and won't stutter during heavy JS.

### CSS `steps()` for Sprite Sheets

```css
.character {
  width: 48px;
  height: 48px;
  background: url('spritesheet.png') 0 0 no-repeat;
  image-rendering: pixelated;
  animation: walk 0.6s steps(6) infinite;
}

@keyframes walk {
  to { background-position: -288px 0; }  /* 6 frames x 48px */
}
```

---

## 14. Sprite Generation — No External Assets

### Option A: Canvas `fillRect` Characters

Draw pixel art characters to canvas, export as data URLs:

```javascript
function generateCharacterSprite(palette) {
  const canvas = document.createElement('canvas');
  canvas.width = 16; canvas.height = 24;
  const ctx = canvas.getContext('2d');

  // Define pixel grid (16 wide x 24 tall)
  // 0 = transparent, 1-N = palette index
  const grid = [
    [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
    [0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,0],
    // ... 22 more rows ...
  ];

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] > 0) {
        ctx.fillStyle = palette[grid[y][x]];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  return canvas.toDataURL();
}

// Palette swap for different classes
const warriorPalette = { 1: '#2a1a0a', 2: '#e8c84a', 3: '#d0a060', 4: '#cc3333' };
const magePalette    = { 1: '#2a1a0a', 2: '#6688ff', 3: '#d0a060', 4: '#4444aa' };
```

### Option B: CSS `box-shadow` Pixel Art

Each shadow = one pixel. Single HTML element:

```css
.pixel-warrior {
  width: 1px;
  height: 1px;
  transform: scale(4);
  box-shadow:
    /* head row */
    3px 0 #e8c84a, 4px 0 #e8c84a, 5px 0 #e8c84a,
    /* face row */
    2px 1px #d0a060, 3px 1px #d0a060, 4px 1px #2a1a0a, 5px 1px #d0a060,
    /* ... hundreds more for full sprite ... */;
}
```

Best for: small icons/decorations. Not practical for animated multi-frame characters.

Tools: [Pixelator](https://elrumordelaluz.github.io/Pixelator/), [miniShadowArt](https://xem.github.io/miniShadowArt/)

### Option C: Procedural Generation

[pixel-sprite-generator](https://github.com/zfedoran/pixel-sprite-generator) — uses 2D masks with randomization + mirroring:

```javascript
// Mask values: 0=empty, 1=random body, 2=always filled, -1=random
const humanoidMask = new psg.Mask([
  0, 0, 0, 0,
  0, 1, 1, 1,
  0, 1, 2, 2,
  0, 0, 1, 2,
  0, 0, 0, 2,
  1, 1, 1, 2,
  0, 1, 1, 2,
  0, 0, 0, 2,
  0, 0, 0, 2,
  0, 1, 2, 2,
  1, 1, 0, 0,
], 4, 11, true, false);  // mirrorX = true

// Each call produces a unique variation
```

Also: [pixel-art-gen](https://github.com/abagames/pixel-art-gen), [Lospec Procedural Generator](https://lospec.com/procedural-pixel-art-generator/)

### Recommendation

For Soul Stone, the current PNG sprite sheet approach (`public/sprites/warrior.png`, etc.) is the right call for production. The canvas `fillRect` approach is excellent for procedurally generating unique party member appearances at summon time — define base templates per class, apply random palette swaps, export as data URLs. This gives infinite variety with zero external asset management.

---

## 15. Free Asset Resources

### Sprite Sources

| Resource | License | Notes |
|----------|---------|-------|
| [OpenGameArt — Pixel Art JRPG](https://opengameart.org/content/pixel-art-jrpg) | CC0 | RPG enemies, bosses, civilians |
| [OpenGameArt — 700 Fantasy Sprites](https://opengameart.org/content/700-sprites) | CC-BY 3.0 | 32x32, front/back/left/right |
| [itch.io — Free JRPG Assets](https://itch.io/game-assets/free/tag-jrpg) | Varies | Icons, characters, effects |
| [CraftPix — Freebies](https://craftpix.net/freebies/) | Free commercial | Fantasy character sprites |
| [Universal LPC Generator](https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/) | CC-BY-SA 3.0 | Browser-based character builder |
| [pixeldudesmaker](https://0x72.itch.io/pixeldudesmaker) | MIT-like | Random pixel character generator |
| [Spriters Resource — FF6](https://www.spriters-resource.com/snes/ff6/) | Reference only | Copyrighted Square Enix — study only |

### CSS Frameworks (Reference)

| Framework | Style | Notes |
|-----------|-------|-------|
| [snes.css](https://snes-css.sadlative.com/) | SNES-themed | Pixel art components, dialog boxes |
| [NES.css](https://nostalgic-css.github.io/NES.css/) | 8-bit NES | More 8-bit than 16-bit, but useful components |
| [Final-Fantasy-CSS](https://github.com/cafeTechne/Final-Fantasy-CSS) | FF menus | Standalone stylesheet, no build required |

---

## 16. Libraries & Frameworks

### LittleJS (Recommended Engine)

By Frank Force (same creator as ZzFX). Highly relevant:
- **<7KB** zipped
- Built-in **WebGL sprite rendering** (100K+ sprites at 60fps)
- Native **pixelated mode**
- **ZzFX integration** for sound
- Particle system, physics, input
- Zero dependencies

[GitHub](https://github.com/KilledByAPixel/LittleJS) | [Site](https://killedbyapixel.github.io/LittleJS/)

### Other Options

| Library | Size | Best For |
|---------|------|----------|
| ZzFX | <1KB | Procedural SFX |
| ZzFXM | +1KB | Music generation |
| Tone.js | ~150KB | Rich audio synthesis |
| TinyMusic | ~3KB | Simple note sequencing |
| Pixi.js | ~150KB | WebGL 2D rendering |
| Phaser | ~1MB | Full game framework |

### Verdict for Soul Stone

Given the "no build process, vanilla JS" philosophy:
- **ZzFX** for sound (drop-in `<script>` tag)
- **Canvas API** for battle scene rendering (already browser-native)
- **CSS** for UI elements (FF6 blue gradient panels, ATB gauges)
- Skip heavy frameworks — the current architecture is correct

---

## 17. Implementation Architecture

### Recommended Hybrid Approach

```
┌──────────────────────────────────────────────────┐
│                  DISPLAY LAYER                    │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │          <canvas> (256x224 native)          │  │
│  │  - Battle background (parallax layers)      │  │
│  │  - Boss sprite + animations                 │  │
│  │  - Party member sprites + animations        │  │
│  │  - Spell effects (particles)                │  │
│  │  - Damage numbers                           │  │
│  │  Scaled up with CSS image-rendering:pixelated │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │       HTML/CSS Overlay (DOM elements)       │  │
│  │  - FF6 blue gradient status panel           │  │
│  │  - Party member names + ATB gauges          │  │
│  │  - Boss HP bar                              │  │
│  │  - Victory text overlay                     │  │
│  │  - CRT scanline filter (toggle)             │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### Game Loop

```javascript
// Render battle at ~10-15 fps for SNES-authentic sprite framerate
// But run the loop at 60fps for smooth movement/tweening

const SPRITE_FPS = 12;
const SPRITE_INTERVAL = 1000 / SPRITE_FPS;
let spriteTimer = 0;

function gameLoop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;
  spriteTimer += dt;

  // Update sprite frames at SNES rate
  if (spriteTimer >= SPRITE_INTERVAL) {
    updateSpriteFrames();
    spriteTimer -= SPRITE_INTERVAL;
  }

  // Render at full display rate for smooth position interpolation
  renderBattleScene();
  requestAnimationFrame(gameLoop);
}
```

### Key Architectural Decisions

| Decision | Current (Diablo 2) | FF6 Overhaul |
|----------|-------------------|--------------|
| Rendering | CSS sprites + DOM | Canvas for battle + DOM for UI |
| Sprite animation | CSS `steps()` | Canvas `drawImage` clipping |
| Backgrounds | None (flat panels) | Parallax canvas layers |
| UI panels | Gold-bordered warm panels | FF6 blue gradient boxes |
| Font | AvQest (Celtic) | FF6 pixel font or Press Start 2P |
| Sound | Basic `OscillatorNode` tones | ZzFX procedural SFX |
| Color palette | Warm golds/browns (D2) | Blues/whites/yellows (FF6) |
| Battle layout | Party list left, boss right | Boss back center-left, party right |

### Migration Path

1. **Phase 1 — Color/UI**: Swap CSS variables to FF6 palette. Replace panel backgrounds with blue gradient. Add FF6 font
2. **Phase 2 — Battle Layout**: Restructure HTML for reversed camera. Boss left/center (back view), party right (facing viewer). Add FF6 status panel at bottom
3. **Phase 3 — Canvas Battle Scene**: Add `<canvas>` element for battle background, sprites, effects. Keep DOM for UI overlays
4. **Phase 4 — Sound Overhaul**: Replace basic oscillator tones with ZzFX. Add SNES-style echo. Implement victory fanfare
5. **Phase 5 — Polish**: CRT filter toggle, ATB gauge animations, screen effects (flash, shake), parallax backgrounds

---

## Key Technical References

### ROM Hacking & Disassembly
- [everything8215/ff6 (GitHub)](https://github.com/everything8215/ff6) — Full FF6 disassembly
- [FF6 Hacking Wiki](https://www.ff6hacking.com/wiki/) — Comprehensive ROM documentation
- [FF6 Battle Animation Script](http://www.ff6hacking.com/wiki/doku.php?id=ff3:ff3us:doc:asm:codes:battle_animation_script)
- [FF6 Battle RAM](https://www.ff6hacking.com/wiki/doku.php?id=ff3:ff3us:doc:asm:ram:battle_ram)
- [FF6 Sprite Tutorial](https://www.ff6hacking.com/wiki/doku.php?id=ff3:ff3us:tutorial:sprites)

### Sprite Assets (Reference)
- [The Spriters Resource — FF6](https://www.spriters-resource.com/snes/ff6/)
- [FF6 Spell Effects](https://www.spriters-resource.com/snes/ff6/asset/6705/)
- [FF6 Battle Backgrounds](https://www.spriters-resource.com/snes/ff6/asset/54685/)
- [Background HQ — FF6](https://bghq.com/bgs.php?c=1n)

### Browser Rendering
- [MDN — image-rendering](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/image-rendering)
- [MDN — Crisp Pixel Art Look](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)
- [MDN — imageSmoothingEnabled](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled)
- [Retro Crisp Pixel Art in HTML5 Games](https://www.belenalbeza.com/articles/retro-crisp-pixel-art-in-html-5-games/)

### Audio
- [ZzFX GitHub](https://github.com/KilledByAPixel/ZzFX)
- [jsfxr](https://sfxr.me/)
- [Tone.js](https://tonejs.github.io/)
- [TinyMusic](https://github.com/kevincennis/TinyMusic)
- [MDN — Web Audio API Advanced Techniques](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques)
- [SNES Chiptune Guide](https://samplemance.rs/snesguide/)

### UI Design
- [Game UI Database — FF6](https://www.gameuidatabase.com/gameData.php?id=1901)
- [FF6 Battle System — Final Fantasy Wiki](https://finalfantasy.fandom.com/wiki/Final_Fantasy_VI_battle_system)
- [IXD@Pratt — FF6 Design Critique](https://ixd.prattsi.org/2018/01/design-critique-final-fantasy-vi-ios-app/)

---

## Appendix A: Ready-to-Use Implementation Code

Concrete code snippets compiled from deep-dive research. These are designed to drop into the existing Soul Stone codebase.

### A1. Enhanced Sound Effects (Replace Current `playTone` System)

The current `playTone()` in `index.html:718` uses simple single oscillators. These enhanced versions use white noise buffers, layered oscillators, and frequency sweeps for authentic SNES character.

```javascript
// --- Sword slash (noise burst + tonal sweep) ---
function playSlashSound() {
  if (!audioCtx || muted) return;
  const now = audioCtx.currentTime;

  // White noise for the "whoosh"
  const bufSize = audioCtx.sampleRate * 0.15;
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);

  const noise = audioCtx.createBufferSource();
  noise.buffer = buf;
  const bpf = audioCtx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.setValueAtTime(3000, now);
  bpf.frequency.exponentialRampToValueAtTime(800, now + 0.1);
  bpf.Q.value = 2;
  const nGain = audioCtx.createGain();
  nGain.gain.setValueAtTime(0.2, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  noise.connect(bpf); bpf.connect(nGain); nGain.connect(audioCtx.destination);

  // Tonal "shing"
  const osc = audioCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
  const oGain = audioCtx.createGain();
  oGain.gain.setValueAtTime(0.06, now);
  oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(oGain); oGain.connect(audioCtx.destination);

  noise.start(now); noise.stop(now + 0.15);
  osc.start(now); osc.stop(now + 0.1);
}

// --- Boss death (low rumble + noise + sub-bass) ---
function playBossDeathSound() {
  if (!audioCtx || muted) return;
  const now = audioCtx.currentTime;

  const osc1 = audioCtx.createOscillator();
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(80, now);
  osc1.frequency.exponentialRampToValueAtTime(30, now + 0.8);
  const g1 = audioCtx.createGain();
  g1.gain.setValueAtTime(0.12, now);
  g1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  osc1.connect(g1); g1.connect(audioCtx.destination);

  const bufSize = audioCtx.sampleRate * 0.6;
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2);
  const noise = audioCtx.createBufferSource();
  noise.buffer = buf;
  const nGain = audioCtx.createGain();
  nGain.gain.setValueAtTime(0.15, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  noise.connect(nGain); nGain.connect(audioCtx.destination);

  const sub = audioCtx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(60, now);
  sub.frequency.exponentialRampToValueAtTime(20, now + 0.5);
  const sGain = audioCtx.createGain();
  sGain.gain.setValueAtTime(0.2, now);
  sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  sub.connect(sGain); sGain.connect(audioCtx.destination);

  osc1.start(now); osc1.stop(now + 0.8);
  noise.start(now); noise.stop(now + 0.6);
  sub.start(now); sub.stop(now + 0.5);
}

// --- Victory fanfare (first phrase, Eb Mixolydian) ---
function playVictoryFanfare() {
  if (!audioCtx || muted) return;
  const now = audioCtx.currentTime;
  const Bb4=466.16, Ab4=415.30, C5=523.25, Eb5=622.25;
  const melody = [
    {n:Bb4,t:0,   d:0.12}, {n:Bb4,t:0.15,d:0.12}, {n:Bb4,t:0.30,d:0.12},
    {n:Bb4,t:0.45,d:0.30}, {n:Ab4,t:0.80,d:0.15}, {n:Bb4,t:1.00,d:0.15},
    {n:Bb4,t:1.20,d:0.15}, {n:C5, t:1.40,d:0.50}, {n:Bb4,t:2.00,d:0.15},
    {n:C5, t:2.20,d:0.15}, {n:Eb5,t:2.40,d:0.80},
  ];
  melody.forEach(({n,t,d}) => {
    const osc = audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = n;
    const gain = audioCtx.createGain();
    const st = now + t;
    gain.gain.setValueAtTime(0, st);
    gain.gain.linearRampToValueAtTime(0.08, st + 0.01);
    gain.gain.setValueAtTime(0.08, st + d - 0.02);
    gain.gain.linearRampToValueAtTime(0.001, st + d);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(st); osc.stop(st + d + 0.01);
  });
}
```

### A2. SNES Echo Effect (Apply to Master Output)

```javascript
function createSNESEcho(input) {
  const delay = audioCtx.createDelay(1.0);
  delay.delayTime.value = 0.1;       // 100ms (SNES range: up to 224ms)
  const fb = audioCtx.createGain();
  fb.gain.value = 0.3;               // 30% feedback
  const lpf = audioCtx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 4000;        // Gaussian interpolation rolloff
  const wet = audioCtx.createGain();
  wet.gain.value = 0.25;

  input.connect(delay);
  delay.connect(lpf);
  lpf.connect(fb);
  fb.connect(delay);                  // feedback loop
  lpf.connect(wet);
  wet.connect(audioCtx.destination);
}
```

### A3. Procedural Sprite Generator (Canvas → Data URL)

Generates unique party member sprites at summon time with palette swaps per class. Integrates with existing CSS sprite animation system.

```javascript
const CLASS_PALETTES = {
  warrior:   { skin:'#e8b878', hair:'#8b4513', armor1:'#cc2222', armor2:'#8b0000', boots:'#444', belt:'#c4a35a' },
  mage:      { skin:'#e8b878', hair:'#4a0080', armor1:'#4466cc', armor2:'#223388', boots:'#335', belt:'#88aadd' },
  rogue:     { skin:'#d4a060', hair:'#222',    armor1:'#336633', armor2:'#224422', boots:'#333', belt:'#888' },
  cleric:    { skin:'#f0c8a0', hair:'#ddcc88', armor1:'#ddddaa', armor2:'#aaaa77', boots:'#876', belt:'#ddb44' },
  ranger:    { skin:'#d4a060', hair:'#556b2f', armor1:'#44aa88', armor2:'#227755', boots:'#543', belt:'#986' },
  berserker: { skin:'#c89060', hair:'#cc4400', armor1:'#884422', armor2:'#662211', boots:'#432', belt:'#a63' },
};

// Half-mask (mirrored). 0=empty, 1=maybe, 2=always
const MASK = [
  [0,0,0,0,0,1,2,2],[0,0,0,0,2,2,2,2],[0,0,0,0,2,2,2,2],[0,0,0,0,1,2,2,2],
  [0,0,0,0,0,1,2,2],[0,0,1,2,2,2,2,2],[0,0,2,2,2,2,2,2],[0,0,1,2,2,2,2,2],
  [0,0,0,1,2,2,2,2],[0,0,0,1,2,2,2,2],[0,0,0,1,2,2,2,1],[0,0,0,1,2,2,1,0],
  [0,0,0,1,2,2,1,0],[0,0,0,1,2,2,1,0],[0,0,0,2,2,2,0,0],[0,0,1,2,2,2,1,0],
];

function zoneColor(row, palette) {
  if (row<=1) return palette.hair;
  if (row<=4) return palette.skin;
  if (row<=7) return palette.armor1;
  if (row===8) return palette.belt;
  if (row<=13) return palette.armor2;
  return palette.boots;
}

function generateSpriteSheet(className) {
  const pal = CLASS_PALETTES[className] || CLASS_PALETTES.warrior;
  const W=16, H=16, FRAMES=6, SCALE=4;
  const canvas = document.createElement('canvas');
  canvas.width = W * FRAMES * SCALE;
  canvas.height = H * 4 * SCALE; // 4 rows: idle, attack, hit, death
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Build base pixels
  const px = Array.from({length:H}, ()=>Array(W).fill(null));
  for (let y=0; y<MASK.length && y<H; y++) {
    for (let x=0; x<8; x++) {
      const v = MASK[y][x];
      if (v===2 || (v===1 && Math.random()>0.3)) {
        const c = zoneColor(y, pal);
        px[y][x] = c;
        px[y][W-1-x] = c;
      }
    }
  }

  function drawFrame(col, row, yShift=0) {
    const ox=col*W*SCALE, oy=row*H*SCALE;
    for (let y=0; y<H; y++) for (let x=0; x<W; x++) {
      if (px[y][x]) {
        const dy = y+yShift;
        if (dy>=0 && dy<H) {
          ctx.fillStyle = px[y][x];
          ctx.fillRect(ox+x*SCALE, oy+dy*SCALE, SCALE, SCALE);
        }
      }
    }
  }

  // Row 0: idle (bounce pattern)
  for (let f=0; f<FRAMES; f++) drawFrame(f, 0, [0,-1,0,0,1,0][f]);
  // Row 1: attack
  for (let f=0; f<4; f++) drawFrame(f, 1, [0,-2,-1,0][f]);
  // Row 2: hit
  for (let f=0; f<2; f++) drawFrame(f, 2, f===1?2:0);
  // Row 3: death
  for (let f=0; f<4; f++) drawFrame(f, 3, 0);

  return canvas.toDataURL('image/png');
}
```

### A4. Canvas Boss Back-Sprite from Front Sprite

```javascript
async function createBossBackSprite(frontUrl) {
  const img = await loadImage(frontUrl);
  const c = document.createElement('canvas');
  c.width = img.width + 8; c.height = img.height + 8;
  const ctx = c.getContext('2d');

  // Draw darkened version (back = unlit side)
  const tmp = document.createElement('canvas');
  tmp.width = img.width; tmp.height = img.height;
  const tCtx = tmp.getContext('2d');
  tCtx.drawImage(img, 0, 0);
  const id = tCtx.getImageData(0, 0, tmp.width, tmp.height);
  for (let i=0; i<id.data.length; i+=4) {
    if (id.data[i+3]>0) {
      id.data[i]=Math.floor(id.data[i]*0.15);
      id.data[i+1]=Math.floor(id.data[i+1]*0.12);
      id.data[i+2]=Math.floor(id.data[i+2]*0.2);
    }
  }
  tCtx.putImageData(id, 0, 0);

  // Rim-light glow behind
  ctx.filter = 'blur(3px) brightness(2)';
  ctx.globalAlpha = 0.3;
  ctx.drawImage(tmp, 4, 4);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.drawImage(tmp, 4, 4);

  return c.toDataURL('image/png');
}

function loadImage(url) {
  return new Promise(r => { const i=new Image(); i.onload=()=>r(i); i.src=url; });
}
```

### A5. Procedural Battle Background (Canvas Starfield + Nebulae)

```javascript
function initBattleBackground(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const stars = Array.from({length:120}, ()=>({
    x: Math.random()*W, y: Math.random()*H,
    size: Math.random()*2+0.5, speed: Math.random()*0.5+0.1,
    brightness: Math.random()*155+100,
  }));

  const nebulae = Array.from({length:5}, ()=>({
    x: Math.random()*W, y: Math.random()*H,
    radius: Math.random()*100+50,
    r: Math.floor(Math.random()*60+20),
    g: Math.floor(Math.random()*30),
    b: Math.floor(Math.random()*80+40),
    speed: Math.random()*0.2+0.05,
  }));

  function render(time) {
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0, '#0a0020');
    grad.addColorStop(0.5, '#150040');
    grad.addColorStop(1, '#0d0030');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,H);

    for (const n of nebulae) {
      const ny = (n.y + time*n.speed*0.01) % (H+n.radius*2) - n.radius;
      const g = ctx.createRadialGradient(n.x,ny,0,n.x,ny,n.radius);
      g.addColorStop(0, `rgba(${n.r},${n.g},${n.b},0.15)`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(n.x-n.radius,ny-n.radius,n.radius*2,n.radius*2);
    }

    for (const s of stars) {
      const sy = (s.y + time*s.speed*0.02) % H;
      const twinkle = Math.sin(time*0.003+s.x)*30;
      const b = Math.floor(Math.min(255, s.brightness+twinkle));
      ctx.fillStyle = `rgb(${b},${b},${Math.min(255,b+30)})`;
      ctx.fillRect(Math.floor(s.x), Math.floor(sy), Math.ceil(s.size), Math.ceil(s.size));
    }
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}
```

### A6. FF6 Stepped Blue Gradient (22-Stop HDMA-Accurate)

More precise than the 5-stop version in section 3 — replicates the discrete color banding from SNES HDMA:

```css
.ff6-window-accurate {
  background: linear-gradient(to bottom,
    #7b7bd6 0%, #7373ce 5%, #6b6bc6 10%, #6363bd 15%,
    #5a5ab5 20%, #5252ad 25%, #4a4aa5 30%, #42429c 35%,
    #393994 40%, #31318c 45%, #292984 50%, #21217b 55%,
    #181873 60%, #10106b 65%, #080862 68%, #00005a 72%,
    #000052 76%, #00004a 80%, #000042 85%, #000039 90%,
    #000031 95%, #000029 100%
  );
  border: 6px ridge #ffffff;
  border-radius: 12px;
  color: #ffffff;
  text-shadow: #000 1px 1px;
  padding: 16px 20px;
  box-shadow: 0 0 0 1px #000, inset 0 0 10px rgba(0,0,0,0.3);
}
```

### A7. Full Attack Orchestration (JS)

Ties together the step-forward animation, screen flash, slash effect, damage number, and step-back into one sequenced function:

```javascript
async function performAttack(taskId) {
  const entry = party.get(taskId);
  if (!entry) return;
  const slotEl = entry.element;
  const spriteEl = entry.spriteEl;

  // 1. Step forward
  slotEl.style.transition = 'transform 0.15s ease-out';
  slotEl.style.transform = 'translateX(30px)';
  await wait(200);

  // 2. Screen flash
  const flash = document.createElement('div');
  flash.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0.7;z-index:200;pointer-events:none';
  document.body.appendChild(flash);
  flash.animate([{opacity:0.7},{opacity:0}], {duration:150}).onfinish = () => flash.remove();

  // 3. Switch to attack sprite
  spriteEl.classList.remove('idle');
  spriteEl.classList.add('attacking');
  playSlashSound();
  await wait(150);

  // 4. Screen shake
  const container = document.querySelector('.container');
  container.style.animation = 'screen-shake 0.3s ease-out';
  container.addEventListener('animationend', () => container.style.animation='', {once:true});

  // 5. Damage number shown by processDamageQueue
  await wait(300);

  // 6. Step back
  slotEl.style.transform = 'translateX(0)';
  await wait(300);

  spriteEl.classList.remove('attacking');
  spriteEl.classList.add('idle');
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
```
