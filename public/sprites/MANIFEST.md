# Sprite Manifest

## Character Sprites — Procedurally Generated

Characters are generated in-browser via `generateCharacterSprite(className)` in `index.html`. No PNG files are loaded for characters.

### System
- **Frame size:** 16x16 pixels
- **Sheet size:** 96x64 (6 cols x 4 rows)
- **Zone-based pixel art:** Each pixel has a zone code (H=hair, S=skin, A=armor1, B=armor2, W=weapon, X=accent, T=boots, O=outline)
- **21-color palettes** per class with 3-tone directional shading (highlight, base, shadow)
- **Rendered at 3x scale** (48x48 display) on the 256x224 canvas

### Animation Rows

| Row | Animation | Frame Count | Notes |
|-----|-----------|-------------|-------|
| 0 | Idle | 6 | Breathing bob (1px vertical shift cycle) |
| 1 | Attack | 4 | Ready, windup, strike (with weapon overlay), recover |
| 2 | Hit | 2 | Recoil with white flash on first frame |
| 3 | Death | 4 | Slump, lean, fall, ground (rotated + darkened) |

### Classes

| Class | Silhouette | Weapon Animation |
|-------|-----------|-----------------|
| Warrior | Broad armor, shield | Sword raised overhead, diagonal slash |
| Mage | Pointed hat, flowing robes | Staff raised, energy orb burst |
| Rogue | Hood, slim build | Dual daggers thrust forward |
| Cleric | Circlet/halo, vestments | Staff raised, holy ring of light |
| Ranger | Cape, medium build | Bow drawn, arrow released |
| Berserker | Massive bare-chested, wild hair | Huge axe raised, slammed down |

### Legacy PNG Files

The following PNGs exist on disk but are **not loaded by the application**. They are original placeholders from before the procedural system was built:

- warrior.png, mage.png, rogue.png, cleric.png, ranger.png, berserker.png

## Boss Sprites — Procedurally Generated

Bosses are generated in-browser via `generateBossSprite(bossIndex)`. No PNG files are loaded for bosses.

### System
- **Frame size:** 32x32 pixels
- **Sheet size:** 128x32 (4 cols x 1 row)
- **Full 32×32 asymmetric pixel masks** with zone-based coloring
- **4 idle frames** with built-in vertical bob shifts [0, -1, 0, 1]
- **Rendered at 4x scale** (128x128 display)
- **Programmatic idle animation** layered in `renderBoss()`: sinusoidal bob, scaleY breathing, dynamic shadow, glow pulse

### 8 Boss Archetypes

| Index | Type | Primary Colors | Description |
|-------|------|---------------|-------------|
| 0 | Dragon | Dark red, yellow eyes | Winged serpentine body |
| 1 | Demon | Purple, red eyes | Horns, broad shoulders, wings |
| 2 | Golem | Slate gray, green runes | Blocky massive build |
| 3 | Undead Knight | Gray-blue, cyan eyes | Armored skeleton, tattered cape |
| 4 | Kraken | Teal, yellow eye | Tentacles spreading downward |
| 5 | Lich | Deep purple, magenta eyes | Floating ethereal robes |
| 6 | Giant Spider | Dark brown, red multi-eyes | Sprawling legs |
| 7 | Elemental | Orange/amber, bright core | Amorphous diamond shape |

Bosses cycle through types based on `killCount % 8`.

### Legacy PNG Files

The following PNGs exist on disk but are **not loaded by the application**:

- boss-1.png, boss-2.png, boss-3.png

## Effect Spritesheets — File-Based

Effects are still loaded from PNG files.

| File | Frame Size | Cols x Rows | Total Size | Animation |
|------|-----------|-------------|------------|-----------|
| effects/slash.png | 16x16 | 4x1 | 64x16 | Slash arc (4 frames) |

## Display Scaling

All sprites rendered with:
```css
image-rendering: pixelated;
image-rendering: crisp-edges; /* Firefox */
```

Display sizes on 256x224 canvas:
- Characters: 48x48 (3x scale from 16x16)
- Bosses: 128x128 (4x scale from 32x32)
- Effects: 64x64 (4x scale from 16x16)
