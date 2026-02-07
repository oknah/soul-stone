#!/bin/bash
INPUT=$(cat)
AGENT_ID=$(echo "$INPUT" | jq -r '.agent_id')

curl -sS -X POST http://localhost:3333/task/complete \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"subagent-$AGENT_ID\"}" > /dev/null 2>&1
exit 0
