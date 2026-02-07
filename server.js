const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Persistent stats
// ---------------------------------------------------------------------------

const STATS_FILE = path.join(__dirname, 'soul-stone-data.json');

const DEFAULT_STATS = {
  bossKillCount: 0,
  bossNameIndex: 0,
  totalDamage: 0,
  damageByClass: {},
  bossKills: [],
  fastestKill: null,
  sessions: [],
};

function loadStats() {
  try {
    const raw = fs.readFileSync(STATS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    // Merge with defaults so new fields are always present
    return { ...DEFAULT_STATS, ...parsed };
  } catch (e) {
    return { ...DEFAULT_STATS };
  }
}

function saveStats() {
  const tmp = STATS_FILE + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(stats, null, 2), 'utf-8');
    fs.renameSync(tmp, STATS_FILE);
  } catch (e) {
    console.error('Failed to save stats:', e.message);
  }
}

let stats = loadStats();

// ---------------------------------------------------------------------------

const app = express();
const PORT = 3333;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ---------------------------------------------------------------------------
// Data stores
// ---------------------------------------------------------------------------

const tasks = new Map();

// ---------------------------------------------------------------------------
// Character class system
// ---------------------------------------------------------------------------

const CHARACTER_CLASSES = [
  { className: 'warrior',   name: 'Warrior',   baseDPS: 12, attackSpeed: 2000, color: '#FF6644', sprite: 'warrior.png' },
  { className: 'mage',      name: 'Mage',      baseDPS: 18, attackSpeed: 3000, color: '#6688FF', sprite: 'mage.png' },
  { className: 'rogue',     name: 'Rogue',     baseDPS: 8,  attackSpeed: 1200, color: '#88FF66', sprite: 'rogue.png' },
  { className: 'cleric',    name: 'Cleric',    baseDPS: 6,  attackSpeed: 2500, color: '#FFDD44', sprite: 'cleric.png' },
  { className: 'ranger',    name: 'Ranger',    baseDPS: 10, attackSpeed: 1800, color: '#44DDFF', sprite: 'ranger.png' },
  { className: 'berserker', name: 'Berserker', baseDPS: 22, attackSpeed: 3500, color: '#FF4444', sprite: 'berserker.png' },
];

// ---------------------------------------------------------------------------
// Random fantasy name generator
// ---------------------------------------------------------------------------

const NAME_PREFIXES = [
  'Aldric', 'Kael', 'Theron', 'Varis', 'Orin',
  'Lysara', 'Morgath', 'Seraphel', 'Dravok', 'Elyndra',
  'Fenwick', 'Galen', 'Haldir', 'Isolde', 'Jareth',
  'Kaelith', 'Lorien', 'Maelis', 'Nyx', 'Pyra',
];

const NAME_SUFFIXES = [
  'the Bold', 'Shadowbane', 'Ironforge', 'Stormcaller', 'the Wise',
  'Dawnbringer', 'Nightwalker', 'Frostweaver', 'Emberheart', 'the Unyielding',
  'Thornshield', 'Starfall', 'Bonecrusher', 'the Silent', 'Flamecrest',
];

function generateFantasyName() {
  const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
  const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
  return `${prefix} ${suffix}`;
}

function randomCharacterClass() {
  return CHARACTER_CLASSES[Math.floor(Math.random() * CHARACTER_CLASSES.length)];
}

// ---------------------------------------------------------------------------
// Boss state management
// ---------------------------------------------------------------------------

const BOSS_NAMES = [
  'Thornmaw',
  'Gloomfang',
  'Ironshell',
  'Velmora',
  'Kaldrun, the Scorched Oath',
  'Sythael',
  'Ozrath, the Smoldering Throne',
  'Velunis, Warden of Still Waters',
  'Morvaine, the Ashen Shepherd',
  'Zorameth',
  'Eschavorn, Who Was Everything',
];

const BOSS_BASE_HP = 1500;
const BOSS_HP_SCALING = 0.15; // 15% per kill

let bossNameIndex = stats.bossNameIndex;

let boss = null;

function spawnBoss() {
  const name = BOSS_NAMES[bossNameIndex % BOSS_NAMES.length];
  bossNameIndex++;
  const killCount = stats.bossKillCount;
  const maxHP = Math.round(BOSS_BASE_HP * (1 + BOSS_HP_SCALING * killCount));
  boss = {
    name,
    maxHP,
    currentHP: maxHP,
    killCount,
    spawnTime: Date.now(),
    sprite: 'boss.png',
  };
  return boss;
}

// Spawn the initial boss
spawnBoss();

function getBossState() {
  return { ...boss };
}

// ---------------------------------------------------------------------------
// SSE (Server-Sent Events) system
// ---------------------------------------------------------------------------

const sseClients = new Set();

function broadcast(event) {
  const data = JSON.stringify(event);
  for (const client of sseClients) {
    client.write(`data: ${data}\n\n`);
  }
}

app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Send initial sync event with ATB state
  const taskList = Array.from(tasks.values()).sort((a, b) => b.startTime - a.startTime);
  const gauges = {};
  for (const [id, state] of atbState) {
    gauges[id] = Math.round(state.atb);
  }
  const syncEvent = JSON.stringify({ type: 'sync', tasks: taskList, boss: getBossState(), gauges });
  res.write(`data: ${syncEvent}\n\n`);

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.post('/task/start', (req, res) => {
  const { name, description, id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Task name is required' });
  }

  const charClass = randomCharacterClass();
  const characterName = generateFantasyName();

  const taskId = id || crypto.randomUUID();
  const task = {
    id: taskId,
    name,
    description: description || '',
    status: 'active',
    progress: 0,
    startTime: Date.now(),
    completedTime: null,
    character: {
      class: charClass.className,
      name: characterName,
      attackSpeed: charClass.attackSpeed,
      baseDPS: charClass.baseDPS,
      sprite: charClass.sprite,
      color: charClass.color,
    },
  };

  tasks.set(taskId, task);

  broadcast({ type: 'task_start', task });

  res.json({ success: true, task });
});

app.post('/task/complete', (req, res) => {
  const { id } = req.body;

  if (!id || !tasks.has(id)) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const task = tasks.get(id);
  task.status = 'completed';
  task.progress = 100;
  task.completedTime = Date.now();

  broadcast({ type: 'task_complete', task });

  // Clean up ATB state
  atbState.delete(id);

  // Record session in persistent stats
  stats.sessions.push({
    taskName: task.name,
    characterClass: task.character.class,
    characterName: task.character.name,
    startTime: task.startTime,
    endTime: task.completedTime,
    duration: task.completedTime - task.startTime,
  });
  if (stats.sessions.length > 1000) stats.sessions = stats.sessions.slice(-500);
  saveStats();

  res.json({ success: true, task });
});

// Deprecated -- kept as a no-op for backwards compatibility
app.post('/task/progress', (req, res) => {
  res.json({ success: true });
});

app.get('/tasks', (req, res) => {
  const taskList = Array.from(tasks.values()).sort((a, b) => b.startTime - a.startTime);
  res.json({ tasks: taskList, boss: getBossState() });
});

app.get('/stats', (req, res) => {
  res.json(stats);
});

// ---------------------------------------------------------------------------
// ATB (Active Time Battle) system — per-character gauge tracking
// ---------------------------------------------------------------------------

const ATB_TICK_INTERVAL = 100; // ms — tick frequently for smooth ATB fill
const ATB_MAX = 100;
const CRIT_CHANCE = 0.10;
const CRIT_MULTIPLIER = 2;
const VARIANCE = 0.20; // +/- 20%

// Per-task ATB state: taskId -> { atb: 0-100 }
const atbState = new Map();

setInterval(() => {
  // Gather active tasks
  const activeTasks = [];
  for (const task of tasks.values()) {
    if (task.status === 'active') {
      activeTasks.push(task);
    }
  }

  // Nothing to do if no active tasks or boss is already dead (awaiting respawn)
  if (activeTasks.length === 0 || boss.currentHP <= 0) {
    return;
  }

  const atbUpdates = [];

  for (const task of activeTasks) {
    const char = task.character;

    // Initialize ATB state if needed
    if (!atbState.has(task.id)) {
      atbState.set(task.id, { atb: 0 });
    }
    const state = atbState.get(task.id);

    // Fill ATB based on attackSpeed: atb += (TICK_INTERVAL / attackSpeed) * 100
    state.atb += (ATB_TICK_INTERVAL / char.attackSpeed) * ATB_MAX;

    // Check if ATB is full — character attacks
    if (state.atb >= ATB_MAX) {
      state.atb = 0; // Reset gauge

      // Calculate damage (baseDPS scaled to one "attack" worth)
      // Each attack deals baseDPS * (attackSpeed / 1000) damage (damage per attack cycle)
      const baseDamage = char.baseDPS * (char.attackSpeed / 1000);
      const varianceFactor = 1 + (Math.random() * 2 - 1) * VARIANCE;
      let damage = Math.round(baseDamage * varianceFactor);

      const isCrit = Math.random() < CRIT_CHANCE;
      if (isCrit) {
        damage *= CRIT_MULTIPLIER;
      }

      boss.currentHP = Math.max(0, boss.currentHP - damage);

      // Accumulate damage stats in memory (saved on boss death / shutdown)
      stats.totalDamage += damage;
      stats.damageByClass[char.class] = (stats.damageByClass[char.class] || 0) + damage;

      broadcast({
        type: 'boss_damage',
        taskId: task.id,
        characterName: char.name,
        characterClass: char.class,
        amount: damage,
        isCrit,
        bossHP: boss.currentHP,
        bossMaxHP: boss.maxHP,
      });

      // Check for boss death
      if (boss.currentHP <= 0) {
        boss.killCount++;
        broadcast({ type: 'boss_death', killCount: boss.killCount });

        // Record boss kill in persistent stats
        stats.bossKillCount++;
        stats.bossNameIndex = bossNameIndex;
        const killDuration = Date.now() - boss.spawnTime;
        stats.bossKills.push({
          bossName: boss.name,
          maxHP: boss.maxHP,
          partySize: activeTasks.length,
          timestamp: Date.now(),
        });
        if (!stats.fastestKill || killDuration < stats.fastestKill.duration) {
          stats.fastestKill = {
            bossName: boss.name,
            duration: killDuration,
            timestamp: Date.now(),
          };
        }
        if (stats.bossKills.length > 1000) stats.bossKills = stats.bossKills.slice(-500);
        saveStats();

        setTimeout(() => {
          spawnBoss();
          broadcast({ type: 'boss_spawn', boss: getBossState() });
        }, 2000);

        // Broadcast final ATB states (all reset) and stop processing
        for (const t of activeTasks) {
          if (atbState.has(t.id)) {
            atbState.get(t.id).atb = 0;
          }
        }
        broadcast({ type: 'atb_update', gauges: Object.fromEntries(
          activeTasks.map(t => [t.id, 0])
        )});
        return;
      }
    }

    atbUpdates.push({ taskId: task.id, atb: Math.min(ATB_MAX, state.atb) });
  }

  // Batch broadcast ATB updates every tick
  if (atbUpdates.length > 0) {
    broadcast({
      type: 'atb_update',
      gauges: Object.fromEntries(atbUpdates.map(u => [u.taskId, Math.round(u.atb)])),
    });
  }
}, ATB_TICK_INTERVAL);

// ---------------------------------------------------------------------------
// Graceful shutdown — persist stats before exit
// ---------------------------------------------------------------------------

function shutdown() {
  saveStats();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Soul Stone server running on http://localhost:${PORT}`);
});
