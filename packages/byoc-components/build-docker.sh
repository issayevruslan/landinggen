#!/usr/bin/env sh
set -e
# Build the BYOC package using Node 20 in Docker, outputting dist/ locally
docker run --rm -v "$(pwd)":/pkg -w /pkg node:20-alpine sh -lc "npm install --silent && npx tsc -p tsconfig.json"
echo "Built dist/"


