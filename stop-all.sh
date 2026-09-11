#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  SmartAttend — Stop All Services (macOS / Linux)
# ═══════════════════════════════════════════════════════════════════════════════

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Stopping SmartAttend services...${NC}"

# Kill tracked PIDs if .pids exists
PID_FILE="$DIR/.pids"
if [ -f "$PID_FILE" ]; then
    while IFS= read -r pid || [ -n "$pid" ]; do
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            echo "  Killing PID $pid..."
            kill "$pid" 2>/dev/null || true
        fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
fi

# Kill any process still holding ports 3001, 3002, 8080, 5173
PORTS=(3001 3002 8080 5173)
for port in "${PORTS[@]}"; do
    PIDS=$(lsof -ti :"$port" 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
        echo "  Freeing port $port (PID: $PIDS)..."
        kill -9 $PIDS 2>/dev/null || true
    fi
done

echo -e "${GREEN}✓ All SmartAttend services stopped successfully.${NC}"
