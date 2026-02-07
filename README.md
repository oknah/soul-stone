# Soul Stone

A Diablo 2-inspired local task tracker that receives webhooks from AI agents to display running tasks in real-time with a dark fantasy gaming aesthetic.

## Features

- **Dark Fantasy UI**: Diablo 2-themed interface with gothic fonts and glowing effects
- **Real-time Updates**: Tasks update automatically every 1.5 seconds
- **Visual Feedback**: Red and blue orbs display active and completed task counts
- **Progress Tracking**: Animated progress bars with glowing effects
- **Webhook Integration**: Simple REST API for AI agents to send task updates

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

The server will start on `http://localhost:3333`

## API Endpoints

### Start a Task
```bash
curl -X POST http://localhost:3333/task/start \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Training Neural Network",
    "description": "Training model on dataset with 10k samples",
    "id": "optional-custom-id"
  }'
```

If no `id` is provided, a UUID will be automatically generated.

### Update Task Progress
```bash
curl -X POST http://localhost:3333/task/progress \
  -H "Content-Type: application/json" \
  -d '{
    "id": "task-id-here",
    "progress": 50
  }'
```

Progress must be a number between 0-100.

### Complete a Task
```bash
curl -X POST http://localhost:3333/task/complete \
  -H "Content-Type: application/json" \
  -d '{
    "id": "task-id-here"
  }'
```

### Get All Tasks
```bash
curl http://localhost:3333/tasks
```

Returns a JSON array of all tasks, sorted by start time (newest first).

## Task Data Structure

```javascript
{
  "id": "uuid-v4",
  "name": "Task Name",
  "description": "Optional description",
  "status": "active" | "completed",
  "progress": 0-100,
  "startTime": 1234567890,
  "completedTime": 1234567890 | null
}
```

## Integration with Claude Code

To integrate with Claude Code or other AI agents, configure your agent to send webhook requests to the Soul Stone endpoints:

1. **Starting a task**: Send a POST request to `/task/start` when beginning work
2. **Updating progress**: Send periodic updates to `/task/progress` as work progresses
3. **Completing tasks**: Send a POST to `/task/complete` when finished

Example workflow:
```bash
# Agent starts a task
TASK_ID=$(curl -s -X POST http://localhost:3333/task/start \
  -H "Content-Type: application/json" \
  -d '{"name": "Analyzing codebase"}' | jq -r '.task.id')

# Agent updates progress
curl -X POST http://localhost:3333/task/progress \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"$TASK_ID\", \"progress\": 50}"

# Agent completes the task
curl -X POST http://localhost:3333/task/complete \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"$TASK_ID\"}"
```

## UI Features

- **Gothic Aesthetic**: Dark brown-black background with gold text
- **Stat Orbs**: Red orb shows active tasks, blue orb shows completed tasks
- **Task Queue**: Displays all tasks with progress bars and timestamps
- **Smooth Animations**: Tasks fade in and pulse when completed
- **Auto-scroll**: Newest tasks appear at the top
- **Responsive**: Progress bars update smoothly with glowing effects

## Technical Details

- **Backend**: Express.js with CORS support
- **Frontend**: Single HTML file with inline CSS and JavaScript
- **Storage**: In-memory task storage (no database required)
- **Port**: 3333 (default)
- **Polling**: UI polls `/tasks` endpoint every 1.5 seconds

## Screenshot

_Open http://localhost:3333 in your browser to see the Soul Stone interface in action_

## License

ISC
