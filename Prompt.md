# Soul Stone - Claude Code Build Prompt

## Task

Build “Soul Stone” - a local task tracker with a Diablo 2/StarCraft-inspired UI that receives webhooks from AI agents to show running tasks.

## Architecture

Simple local server + static UI:

```
soul-stone/
├── server.js          # Express server (~50 lines)
├── public/
│   └── index.html     # The fancy gaming UI
├── package.json
└── README.md
```

## Server Requirements

Express server with these endpoints:

- `POST /task/start` - body: `{ "id": "optional", "name": "Task name", "description": "optional" }`
- `POST /task/complete` - body: `{ "id": "task-id" }`
- `POST /task/progress` - body: `{ "id": "task-id", "progress": 0-100 }` (optional nice-to-have)
- `GET /tasks` - returns current task list as JSON
- Serves static files from /public

Tasks should auto-generate IDs if not provided. Store tasks in memory (no database needed).

## UI Requirements

Diablo 2 inspired aesthetic:

- Dark fantasy theme with gold accents
- Two orbs (red/blue) showing some aggregate stat (total tasks, or mock token usage)
- Main feature: a production queue showing active tasks with progress bars
- When a task completes, visual/audio feedback (optional: play a sound)

The UI should poll GET /tasks every 1-2 seconds to update state.

## Usage Example

An AI agent (Claude Code, n8n, etc.) reports status with:

```bash
# Starting a task
curl -X POST http://localhost:3000/task/start -H "Content-Type: application/json" -d '{"name": "Deep Research", "description": "Analyzing market trends"}'

# Completing a task  
curl -X POST http://localhost:3000/task/complete -H "Content-Type: application/json" -d '{"id": "task-id-here"}'
```

## README

Include:

- What this is (fun AI task tracker with gaming UI)
- How to run it (`npm install && npm start`)
- Example curl commands
- Screenshot placeholder
- How to integrate with Claude Code (add to CLAUDE.md)

## Think about

Keep it simple - this is a fun side project, not production software. Prioritize looking cool over being robust.