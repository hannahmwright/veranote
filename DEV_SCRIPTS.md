# Veranote Development Scripts

Simple scripts to manage the Veranote development environment.

## Quick Start

```bash
./start-dev.sh    # Start all services
./stop-dev.sh     # Stop all services
```

## Scripts

### `start-dev.sh`
Starts all Veranote services in the correct order:
1. **Environment Check** - Verifies all dependencies are installed
2. **Port Conflict Check** - Ensures no services are already running
3. **Ollama** (port 11434) - AI language model service
4. **Whisper Server** (port 8178) - Audio transcription service  
5. **Python Backend** (port 5167) - FastAPI server
6. **Frontend** - Tauri desktop application

**Features:**
- ✅ Port conflict detection
- ✅ Health checks with timeouts
- ✅ Graceful shutdown on Ctrl+C
- ✅ Clear status logging
- ✅ Proper service ordering

### `stop-dev.sh`
Stops all Veranote services gracefully:
- Kills processes by port and name
- Handles stuck processes
- Clean termination

## Requirements

Before running, ensure you have:
- **Ollama** installed and accessible
- **Whisper server** built (`backend/build_whisper.sh`)
- **Python virtual environment** set up (`backend/venv/`)
- **Frontend dependencies** installed (`pnpm install` in frontend/)
- **Whisper model** downloaded (`ggml-small.bin`)

## Usage

**Start development environment:**
```bash
./start-dev.sh
```

**Stop development environment:**
```bash
./stop-dev.sh
```

**Emergency stop:**
Press `Ctrl+C` while `start-dev.sh` is running.

## Ports Used

- **11434** - Ollama
- **8178** - Whisper Server  
- **5167** - Python Backend
- **Frontend** - Tauri (no fixed port)

## Troubleshooting

**Port conflicts:**
```bash
./stop-dev.sh  # Kill existing services
./start-dev.sh # Restart clean
```

**Missing dependencies:**
The startup script will tell you what's missing and how to fix it.

**Services not starting:**
Check the error messages - they include specific instructions for resolution. 