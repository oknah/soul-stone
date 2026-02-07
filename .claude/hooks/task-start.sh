#!/bin/bash
INPUT=$(cat)
TASK_ID=$(echo "$INPUT" | jq -r '.session_id')
AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // "main-session"')
TASK_NAME="Claude: $AGENT_TYPE"

curl -sS -X POST http://localhost:3333/task/start \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"$TASK_ID\",\"name\":\"$TASK_NAME\"}" > /dev/null 2>&1
exit 0
