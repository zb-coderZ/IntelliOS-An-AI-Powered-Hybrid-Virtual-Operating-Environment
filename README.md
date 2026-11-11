# IntelliOS: AI-Powered Hybrid Virtual Operating Environment

A desktop-style web app (React + FastAPI) that combines our own virtual OS simulators, real Ubuntu (WSL2), real Windows metrics, and (later) an AI assistant.
It is NOT a bootable OS and does NOT replace the Windows or Linux kernel.

---
## 1. Folder structure

    IntelliOS/
      backend/
        requirements.txt
        app/
          main.py                  # FastAPI app and all API routes
          simulators/
            scheduling.py          # FCFS, SJF, SRTF, Priority, RR
            memory.py              # First, Best, Worst Fit
            deadlock.py            # Banker's Algorithm, deadlock detection
        tests/test_sim.py          # 8 pytest tests
      frontend/
        package.json, vite.config.ts, tsconfig.json, index.html
        src/main.tsx, App.tsx, index.css   # desktop, windows, taskbar, apps

## 2. Requirements
| Tool | Check with | Notes |
|---|---|---|
| Python 3.10+ (3.14 should work, see Troubleshooting) | `python --version` | |
| Node.js 18+ and npm | `node -v` and `npm -v` | Download from nodejs.org |
| WSL2 + Ubuntu 24.04 | `wsl -l -v` | Only needed for the Terminal app |

## 3. Setup, step by step (Windows)

### Step 1: Unzip
Unzip `IntelliOS.zip` to a folder, e.g. `D:\IntelliOS`. Open that folder in VS Code.

### Step 2: Start the backend (Terminal 1)
    cd backend
    python -m venv .venv
    .venv\Scripts\activate
    pip install -r requirements.txt
    python -m pytest -q
   uvicorn app.main:app --reload --port 8000 

Expected: pytest shows `8 passed`. Uvicorn shows `Uvicorn running on http://127.0.0.1:8000`.
Open http://localhost:8000/docs to see and try every API.

If PowerShell blocks activation, run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### Step 3: Start the frontend (Terminal 2)
    cd frontend
    npm install
    npm run dev

Open http://localhost:5173.

### Step 4: Test the desktop
1. Double-click an icon (or use the start menu at the bottom left). A window opens.
2. Open several windows. Click one to bring it to the front.
3. Drag by the title bar. Resize from the bottom-right corner.
4. Use the buttons: `–` minimize, `□` maximize or restore, `✕` close. Click the taskbar button to restore or minimize.
5. IntelliLab: pick an algorithm, press Run. You should see a Gantt chart and a results table.
6. IntelliTerminal: run `uname -a`. You should see real Ubuntu output. Commands outside the allowlist are refused.
7. IntelliMonitor: shows live Windows CPU, RAM, disk and processes. If the backend is stopped it says "disconnected" instead of showing fake data.

## 4. API reference
| Method and path | Purpose | Source label |
|---|---|---|
| POST /api/schedule | `{algo, processes[{pid,arrival,burst,priority}], quantum}`. algo is fcfs, sjf, srtf, priority, priority_p or rr | simulated |
| POST /api/memory | `{blocks[], processes[]}`, compares first, best and worst fit | simulated |
| POST /api/deadlock | `{available, allocation, max?, request?}` gives Banker's result and/or detection | simulated |
| GET /api/monitor/windows | CPU, cores, RAM, disk, top processes | real-windows |
| POST /api/ubuntu/run | `{command}`, allowlisted commands only | real-ubuntu |

Allowed Ubuntu commands: pwd, ls, whoami, uname, free, df, ps, uptime, date, hostname.

---
## 5. What is DONE (and tested)
| Feature | Status |
|---|---|
| Scheduling algorithms and metrics (CT, TAT, WT, RT, averages, CPU%, throughput, context switches) | Done, unit tested |
| Memory allocation (first, best, worst fit, internal fragmentation, comparison) | Done, unit tested (backend only, no UI) |
| Banker's Algorithm, safe sequence, deadlock detection | Done, unit tested (backend only, no UI) |
| Desktop: wallpaper, icons, start menu, taskbar, clock | Done, not yet run by me, test it |
| Window manager: drag, resize, min, max, restore, close, focus | Done, not yet run by me, test it |
| Lab UI: Gantt chart for sample processes | Done (fixed sample data) |
| Terminal: real Ubuntu via WSL2 with allowlist | Done, needs WSL on your PC to test |
| Monitor: real Windows metrics (refresh every 2 s) | Done, needs testing on your PC |

## 6. What is MISSING and how to add it
Do these in order. Finish and test each step before the next. Ask me for each step and I will write the code with you.

### Step A. Lab inputs (frontend, about 1 hour)
Goal: the user enters their own processes instead of the fixed P1 to P3.
1. In `App.tsx`, change `procs` into `useState` and add a small table with inputs for arrival, burst, priority.
2. Add "Add process" and "Remove" buttons, and a quantum input for Round Robin.
3. Test: enter the textbook example and compare with your class notes.

### Step B. Memory and deadlock screens (frontend)
1. Create `frontend/src/MemoryLab.tsx`. Inputs: block sizes and process sizes as comma-separated text. Call POST /api/memory and draw one coloured bar per block.
2. Create `DeadlockLab.tsx`. Inputs: available, allocation and max matrices. Call POST /api/deadlock and show safe or unsafe plus the sequence.
3. Add them as tabs inside the IntelliLab window.

### Step C. Gantt animation: step, pause, reset (frontend)
1. Keep a `step` number in state. A `setInterval` increases it while "playing".
2. Draw only Gantt segments up to `step`. Add Step, Pause, Reset buttons.

### Step D. Virtual filesystem and SQLite (backend, then IntelliFiles UI)
1. `pip install sqlalchemy` and add it to requirements.txt.
2. Create `app/database.py` (engine, session) and `app/models.py` with a `Node` table: id, name, parent_id, is_folder, content, size, owner, permissions, modified.
3. Create `app/simulators/virtual_fs.py` with create, rename, delete, list, search functions.
4. Add routes /api/fs/... in `main.py`. Write pytest tests for each operation.
5. Build the IntelliFiles window: folder list, breadcrumb, new, rename, delete, search.

### Step E. Virtual users and permissions (backend)
1. Add a `User` table with role: admin, standard, restricted.
2. In the filesystem functions, check role and file permissions before each action and return 403 if denied.
3. Add a user switcher in IntelliSettings to demonstrate the difference in your viva.

### Step F. Virtual process manager (backend, then IntelliTask UI)
1. Create `process_manager.py` with a Process class and states New, Ready, Running, Waiting, Terminated, plus functions create, dispatch, block, wake, terminate.
2. Store processes in SQLite. Add /api/processes routes and tests.
3. IntelliTask: two tabs, "Virtual (simulated)" and "Real (Windows)". Real list comes from psutil. Add a confirmation dialog before any kill, and refuse critical system processes.

### Step G. Ubuntu metrics and files
1. Add a route that runs `free -m`, `df -h`, `ps aux` through WSL and parses the output (reuse `ubuntu_run`).
2. Add an Ubuntu tab to IntelliMonitor. If WSL fails, show "Ubuntu disconnected".
3. For file browsing, add a read-only `ls` of an allowed folder such as `/home`. Reject any path containing `..`.

### Step H. Live charts and WebSockets
1. `npm install recharts`.
2. Replace the 2 second polling in `Mon()` with a FastAPI WebSocket route and draw line charts of CPU and RAM history.

### Step I. IntelliSettings
Wallpaper choice, theme, user switcher. Store values in SQLite and in React state.

### Step J. AI assistant (last)
1. Add `app/ai.py`. Read the API key from a `.env` file (never in frontend code). `pip install python-dotenv`.
2. Route POST /api/ai/explain receives the simulation result or metrics JSON from our backend and sends it to the LLM with the instruction "explain only this data, do not invent numbers".
3. IntelliAI window: chat box, plus an "Explain this result" button inside the Lab.
4. The app must keep working when the AI is offline.

### Step K. Polish and presentation
Loading and error states, frontend tests (Vitest), Tailwind if you want it, screenshots, and a demo script. Add a recorded demo as a fallback in case WSL fails in the lab.

---
## 7. Troubleshooting
| Problem | Fix |
|---|---|
| `pip install` fails on Python 3.14 | Use Python 3.12 or 3.13 for the venv: `py -3.12 -m venv .venv`. Tell me the error text. |
| Frontend shows "Backend not running" | Start uvicorn on port 8000. Check http://localhost:8000/docs |
| CORS error in browser console | The frontend must run on http://localhost:5173 (set in `main.py`) |
| Terminal says "WSL not found" or error 503 | Run `wsl -l -v`. If the distro name is not `Ubuntu-24.04`, change it in `ubuntu_run` in `main.py` |
| `npm run dev` fails | Delete `node_modules`, run `npm install` again, check Node 18+ |

## 8. Notes for your viva
- The virtual OS core (scheduling, memory, deadlock, filesystem, processes) is OUR OWN work.
- The Terminal, task list and monitors are wrappers around real WSL and psutil. Say this honestly.
- Simulated and real data are always labelled with a `source` field in the API.
- Confirm with your instructor that a web UI in Python and React is acceptable.
