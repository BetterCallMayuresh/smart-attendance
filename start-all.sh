#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  SmartAttend — Start All Services (macOS / Linux)
#  Starts: Presence Service (Node.js) → Backend (Spring Boot) → Frontend (React)
# ═══════════════════════════════════════════════════════════════════════════════

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Color helpers
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          SmartAttend — Service Launcher              ║${NC}"
echo -e "${CYAN}║   Network-Based Attendance System (macOS/Unix)       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Ensure Homebrew, NVM, and standard PATHs are active
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:$PATH"
if [ -d "$HOME/.nvm" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi
if [ -d "/opt/homebrew/opt/openjdk@17/bin" ]; then
    export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
    export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
elif [ -d "/opt/homebrew/opt/openjdk/bin" ]; then
    export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
    export JAVA_HOME="/opt/homebrew/opt/openjdk"
fi

# Setup logs directory
mkdir -p logs
PID_FILE="$DIR/.pids"
> "$PID_FILE"

# Load backend environment variables if .env exists
if [ -f "backend/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "backend/.env"
    set +a
fi

# ─── Check prerequisites ──────────────────────────────────────────────────────
echo -e "${BLUE}[1/6] Checking prerequisites...${NC}"

if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}[ERROR] Node.js not found in PATH.${NC}"
    echo -e "Install via Homebrew: ${YELLOW}brew install node${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓ Node.js found (${NC}$(node -v)${GREEN})${NC}"

if ! command -v java >/dev/null 2>&1; then
    echo -e "${RED}[ERROR] Java not found in PATH.${NC}"
    echo -e "Install via Homebrew: ${YELLOW}brew install openjdk@17${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓ Java found${NC}"

# ─── Check dependencies ───────────────────────────────────────────────────────
echo -e "${BLUE}[2/6] Checking dependencies...${NC}"

if [ ! -d "presence-service/node_modules" ]; then
    echo "  Installing presence-service dependencies..."
    (cd presence-service && npm install)
fi
echo -e "  ${GREEN}✓ Presence service deps OK${NC}"

if [ ! -d "frontend/node_modules" ]; then
    echo "  Installing frontend dependencies..."
    (cd frontend && npm install)
fi
echo -e "  ${GREEN}✓ Frontend deps OK${NC}"

# ─── Start Presence Service ───────────────────────────────────────────────────
echo -e "${BLUE}[3/6] Starting Presence Service (ports 3001 / 3002)...${NC}"
(cd presence-service && node src/index.js) > logs/presence.log 2>&1 &
PRESENCE_PID=$!
echo "$PRESENCE_PID" >> "$PID_FILE"
echo -e "  ${GREEN}✓ Presence Service started (PID: $PRESENCE_PID)${NC}"

sleep 2

# ─── Check Database & Start Backend ───────────────────────────────────────────
echo -e "${BLUE}[4/6] Starting Spring Boot Backend (port 8080)...${NC}"

# Check if MySQL is reachable on 3306
PROFILE_ARG=""
if nc -z 127.0.0.1 3306 2>/dev/null; then
    echo -e "  ${GREEN}✓ MySQL detected on port 3306 (using default MySQL profile)${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: MySQL not detected on port 3306${NC}"
    echo -e "${YELLOW}⚠️  Starting with H2 IN-MEMORY database instead${NC}"
    echo -e "${YELLOW}⚠️  All data will be lost when the backend restarts${NC}"
    echo -e "${YELLOW}⚠️  To use MySQL: start it first, then re-run this script${NC}"
    PROFILE_ARG="-Dspring-boot.run.profiles=h2"
fi

# Use Maven wrapper
if [ -x "backend/mvnw" ]; then
    MVN_CMD="./mvnw"
else
    MVN_CMD="mvn"
fi

(cd backend && $MVN_CMD spring-boot:run $PROFILE_ARG) > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" >> "$PID_FILE"
echo -e "  ${GREEN}✓ Backend starting (PID: $BACKEND_PID)...${NC}"

# ─── Start Frontend ───────────────────────────────────────────────────────────
echo -e "${BLUE}[5/6] Starting React Frontend (port 5173)...${NC}"
(cd frontend && npx vite --host) > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" >> "$PID_FILE"
echo -e "  ${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

sleep 2

# ─── Summary ──────────────────────────────────────────────────────────────────
echo -e "${BLUE}[6/6] Launch Summary${NC}"
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  All services successfully launched!                 ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  Presence REST:     http://localhost:3001            ║${NC}"
echo -e "${GREEN}║  Presence WS:       ws://localhost:3002              ║${NC}"
echo -e "${GREEN}║  Backend API:       http://localhost:8080            ║${NC}"
echo -e "${GREEN}║  Frontend UI:       http://localhost:5173            ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  Logs:              ./logs/                          ║${NC}"
echo -e "${GREEN}║  Stop all services: ./stop-all.sh                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
