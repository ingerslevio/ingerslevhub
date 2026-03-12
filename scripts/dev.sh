#!/usr/bin/env bash
# Start both API and web dev servers concurrently

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Family Hub development servers...${NC}"

# Copy .env.example if .env doesn't exist
if [ ! -f "src/api/.env" ] && [ -f "config/.env.example" ]; then
  echo -e "${GREEN}Creating src/api/.env from config/.env.example${NC}"
  cp config/.env.example src/api/.env
fi

# Start API server
echo -e "${GREEN}Starting API server on port 3001...${NC}"
cd src/api && npm run dev &
API_PID=$!

# Start web server
echo -e "${GREEN}Starting web server on port 5173...${NC}"
cd ../../src/web && npm run dev &
WEB_PID=$!

# Trap Ctrl+C to kill both processes
trap "kill $API_PID $WEB_PID 2>/dev/null; exit 0" INT TERM

echo -e "${BLUE}Both servers running. Press Ctrl+C to stop.${NC}"
echo -e "  API:  http://localhost:3001"
echo -e "  Web:  http://localhost:5173"
echo -e "  Docs: http://localhost:3001/api/docs"

wait
