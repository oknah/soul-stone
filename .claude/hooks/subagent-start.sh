#!/bin/bash
INPUT=$(cat)
AGENT_ID=$(echo "$INPUT" | jq -r '.agent_id')
AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type')

curl -sS -X POST http://localhost:3333/task/start \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"subagent-$AGENT_ID\",\"name\":\"Subagent: $AGENT_TYPE\"}" > /dev/null 2>&1
exit 0
