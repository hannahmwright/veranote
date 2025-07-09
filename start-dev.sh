#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

OLLAMA_PORT=11434
WHISPER_PORT=8178
BACKEND_PORT=5167
MODEL_NAME="ggml-small.bin"

OLLAMA_PID=""
WHISPER_PID=""
BACKEND_PID=""
FRONTEND_PID=""

log_info() {
    echo -e "${BLUE}ℹ️  [INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅ [SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️  [WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}❌ [ERROR]${NC} $1"
}

log_section() {
    echo -e "\n${PURPLE}🔄 === $1 ===${NC}\n"
}

check_port() {
    local port=$1
    local service=$2
    if lsof -i :$port >/dev/null 2>&1; then
        log_error "$service is already running on port $port"
        log_info "Use './stop-dev.sh' to stop existing services first"
        return 1
    fi
    return 0
}

wait_for_service() {
    local port=$1
    local service=$2
    local health_endpoint=${3:-""}
    local max_attempts=30
    local attempt=1
    
    log_info "Waiting for $service on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if [ -n "$health_endpoint" ] && command -v curl >/dev/null 2>&1; then
            if curl -s "$health_endpoint" >/dev/null 2>&1; then
                log_success "$service is ready on port $port"
                return 0
            fi
        elif lsof -i :$port >/dev/null 2>&1; then
            log_success "$service is ready on port $port"
            return 0
        fi
        
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    log_error "$service failed to start on port $port after $max_attempts seconds"
    return 1
}

check_environment() {
    log_section "Environment Check"
    
    if ! command -v ollama >/dev/null 2>&1; then
        log_error "Ollama not found. Please install Ollama first."
        return 1
    fi
    
    if [ ! -d "backend/whisper-server-package" ]; then
        log_error "Whisper server not found. Please run backend/build_whisper.sh first."
        return 1
    fi
    
    if [ ! -f "backend/whisper-server-package/models/$MODEL_NAME" ]; then
        log_error "Whisper model not found. Please run backend/build_whisper.sh first."
        return 1
    fi
    
    if [ ! -d "backend/venv" ]; then
        log_error "Python virtual environment not found. Please run backend/build_whisper.sh first."
        return 1
    fi
    
    if [ ! -d "frontend/node_modules" ]; then
        log_error "Frontend dependencies not found. Please run 'npm install' in frontend directory."
        return 1
    fi
    
    log_success "Environment checks passed"
    return 0
}

cleanup() {
    log_section "Shutting down services"
    
    if [ -n "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        log_info "Stopping frontend..."
        kill -TERM $FRONTEND_PID 2>/dev/null || true
        wait $FRONTEND_PID 2>/dev/null || true
        log_success "Frontend stopped"
    fi
    
    if [ -n "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        log_info "Stopping Python backend..."
        kill -TERM $BACKEND_PID 2>/dev/null || true
        wait $BACKEND_PID 2>/dev/null || true
        log_success "Python backend stopped"
    fi
    
    if [ -n "$WHISPER_PID" ] && kill -0 $WHISPER_PID 2>/dev/null; then
        log_info "Stopping Whisper server..."
        kill -TERM $WHISPER_PID 2>/dev/null || true
        wait $WHISPER_PID 2>/dev/null || true
        log_success "Whisper server stopped"
    fi
    
    if [ -n "$OLLAMA_PID" ] && kill -0 $OLLAMA_PID 2>/dev/null; then
        log_info "Stopping Ollama..."
        kill -TERM $OLLAMA_PID 2>/dev/null || true
        wait $OLLAMA_PID 2>/dev/null || true
        log_success "Ollama stopped"
    fi
    
    pkill -f "whisper-server" 2>/dev/null || true
    pkill -f "ollama serve" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

log_section "Veranote Development Environment"

check_environment || exit 1

log_section "Port Conflict Check"
check_port $OLLAMA_PORT "Ollama" || exit 1
check_port $WHISPER_PORT "Whisper Server" || exit 1
check_port $BACKEND_PORT "Python Backend" || exit 1
log_success "All ports are available"

log_section "Starting Services"

log_info "🤖 Starting Ollama..."
ollama serve >/dev/null 2>&1 &
OLLAMA_PID=$!
wait_for_service $OLLAMA_PORT "Ollama" "http://localhost:$OLLAMA_PORT/api/tags" || exit 1

log_info "🎙️ Starting Whisper Server..."
cd backend/whisper-server-package
./run-server.sh --model "models/$MODEL_NAME" >/dev/null 2>&1 &
WHISPER_PID=$!
cd ../..
wait_for_service $WHISPER_PORT "Whisper Server" || exit 1

log_info "🐍 Starting Python Backend..."
cd backend
if [ -z "$VIRTUAL_ENV" ]; then
    source venv/bin/activate
fi
python app/main.py >/dev/null 2>&1 &
BACKEND_PID=$!
cd ..
wait_for_service $BACKEND_PORT "Python Backend" || exit 1

log_info "🖥️ Starting Frontend..."
cd frontend
npm run tauri dev &
FRONTEND_PID=$!
cd ..

log_success "🎉 All services started successfully!"
echo -e "${GREEN}🤖 Ollama (PID: $OLLAMA_PID) - http://localhost:$OLLAMA_PORT${NC}"
echo -e "${GREEN}🎙️ Whisper Server (PID: $WHISPER_PID) - http://localhost:$WHISPER_PORT${NC}"
echo -e "${GREEN}🐍 Python Backend (PID: $BACKEND_PID) - http://localhost:$BACKEND_PORT${NC}"
echo -e "${GREEN}🖥️ Frontend (PID: $FRONTEND_PID)${NC}"
echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"

wait $FRONTEND_PID || true 