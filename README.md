# Soul Stone

A **JRPG auto-battler** that visualizes AI agent activity in real-time. When AI tasks start, party members are summoned to fight bosses; when tasks end, they're unsummoned. Inspired by Final Fantasy VI and Golden Sun battle scenes.

The core insight: you can't show progress bars for AI tasks (you don't know when they'll finish), but you *can* show that work is happening. More concurrent tasks = bigger party = faster boss kills.

## Features

- **FF6-style battle scene**: 256x224 SNES-resolution canvas with pixel art sprites
- **Procedural sprites**: Characters and bosses generated in-browser — no external assets needed
- **ATB combat**: Active Time Battle system with per-character gauges, crits, and boss scaling
- **Real-time updates**: Server-Sent Events for instant party/boss state changes
- **Claude Code integration**: Hooks automatically summon/unsummon party members for agent sessions
- **Widget-friendly**: Compact layout designed for small ambient displays
- **Persistent stats**: Kill counts, damage by class, fastest kills tracked across sessions

## Installation

```bash
npm install
npm start
```

Server runs on http://localhost:3333

## API

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

## Claude Code Hooks

Soul Stone automatically reflects Claude Code agent activity. When a session or subagent starts, a party member is summoned; when it ends, they're unsummoned. Configuration is in `.claude/settings.json`.

## License

ISC
