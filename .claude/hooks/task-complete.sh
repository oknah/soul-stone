#!/bin/bash
INPUT=$(cat)
TASK_ID=$(echo "$INPUT" | jq -r '.session_id')

curl -sS -X POST http://localhost:3333/task/complete \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"$TASK_ID\"}" > /dev/null 2>&1
exit 0
