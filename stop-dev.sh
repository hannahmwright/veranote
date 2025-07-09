#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

OLLAMA_PORT=11434
WHISPER_PORT=8178
BACKEND_PORT=5167

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

stop_service_by_port() {
    local port=$1
    local service=$2
    
    if lsof -i :$port >/dev/null 2>&1; then
        log_info "Stopping $service on port $port..."
        local pids=$(lsof -t -i :$port)
        if [ -n "$pids" ]; then
            for pid in $pids; do
                kill -TERM $pid 2>/dev/null || kill -KILL $pid 2>/dev/null || true
            done
            sleep 1
            if ! lsof -i :$port >/dev/null 2>&1; then
                log_success "$service stopped"
            else
                log_warning "$service may still be running"
            fi
        fi
    else
        log_info "$service not running on port $port"
    fi
}

stop_service_by_name() {
    local process_name=$1
    local service=$2
    
    if pgrep -f "$process_name" >/dev/null 2>&1; then
        log_info "Stopping $service processes..."
        pkill -TERM -f "$process_name" 2>/dev/null || true
        sleep 2
        pkill -KILL -f "$process_name" 2>/dev/null || true
        log_success "$service processes stopped"
    else
        log_info "No $service processes found"
    fi
}

log_section "Stopping Veranote Development Environment"

stop_service_by_name "tauri dev" "Frontend"
stop_service_by_port $BACKEND_PORT "Python Backend"
stop_service_by_name "whisper-server" "Whisper Server"
stop_service_by_name "ollama serve" "Ollama"

stop_service_by_port $WHISPER_PORT "Whisper Server"
stop_service_by_port $OLLAMA_PORT "Ollama"

log_success "🎉 All services stopped successfully!" 