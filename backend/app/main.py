import shlex, subprocess, psutil, re, asyncio
from typing import List, Optional
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from .simulators.scheduling import schedule
from .simulators.memory import compare
from .simulators.deadlock import banker, detect
from .simulators.process_manager import virtual_pm
from .simulators.virtual_fs import virtual_fs
from .ai import generate_ai_response

# Prime psutil CPU counters once at startup so per-process CPU values are accurate after the first refresh
psutil.cpu_percent(interval=None)

app = FastAPI(title="IntelliOS")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Proc(BaseModel):
    pid: str
    arrival: int = Field(ge=0)
    burst: int = Field(gt=0)
    priority: int = 0

class SchedReq(BaseModel):
    algo: str
    processes: List[Proc]
    quantum: int = Field(2, gt=0)

class MemReq(BaseModel):
    blocks: List[int]
    processes: List[int]

class DLReq(BaseModel):
    available: List[int]
    allocation: List[List[int]]
    max: Optional[List[List[int]]] = None
    request: Optional[List[List[int]]] = None

class RealKillReq(BaseModel):
    pid: int

class VirtProcCreateReq(BaseModel):
    name: str
    priority: int = 1
    memory_kb: int = 4096

class VirtProcTransitionReq(BaseModel):
    pid: str
    action: str

class FSCreateReq(BaseModel):
    name: str
    parent_id: str
    is_folder: bool = False
    content: str = ""
    owner: str = "student"
    permissions: str = "rw-r--r--"

class FSRenameReq(BaseModel):
    id: str
    new_name: str

class FSDeleteReq(BaseModel):
    id: str

class FSWriteReq(BaseModel):
    id: str
    content: str

class UbuntuFilesReq(BaseModel):
    path: str = "/home"

class AIChatReq(BaseModel):
    message: str
    context: Optional[dict] = None

class SwitchUserReq(BaseModel):
    username: str

@app.post("/api/schedule")
def api_schedule(r: SchedReq):
    if r.algo not in ("fcfs", "sjf", "srtf", "priority", "priority_p", "rr"):
        raise HTTPException(422, "Unknown algorithm")
    if not r.processes:
        raise HTTPException(422, "Add at least one process")
    return {"source": "simulated", **schedule([p.model_dump() for p in r.processes], r.algo, r.quantum)}

@app.post("/api/memory")
def api_memory(r: MemReq):
    return {"source": "simulated", "results": compare(r.blocks, r.processes)}

@app.post("/api/deadlock")
def api_deadlock(r: DLReq):
    out = {"source": "simulated"}
    if r.max:
        out["banker"] = banker(r.available, r.allocation, r.max)
    if r.request:
        out["detection"] = detect(r.available, r.allocation, r.request)
    return out

# =========================================================================
# CRITICAL PROCESSES & TELEMETRY SNAPSHOT HELPERS
# =========================================================================
CRITICAL_PROCS = {
    "system", "system idle process", "csrss.exe", "lsass.exe", "smss.exe",
    "services.exe", "wininit.exe", "explorer.exe", "svchost.exe", "dwm.exe",
    "ntoskrnl.exe", "registry", "fontdrvhost.exe"
}

def process_snapshot(limit: int = 20) -> List[dict]:
    """
    Returns top processes sorted descending by memory_percent.
    Guarantees every row contains: pid, name, status, cpu_percent, memory_percent, source.
    Handles NoSuchProcess and AccessDenied gracefully with protected fallback.
    """
    results = []
    for p in psutil.process_iter(["pid", "name", "status", "cpu_percent", "memory_percent", "username"]):
        try:
            info = p.info
            raw_name = info.get("name")
            name = str(raw_name).strip() if (raw_name and str(raw_name).strip()) else "System process (access denied)"
            pid = info.get("pid", 0)
            status = info.get("status") or "running"
            cpu_val = round(float(info.get("cpu_percent") or 0.0), 1)
            mem_val = round(float(info.get("memory_percent") or 0.0), 1)
            is_crit = (name.lower() in CRITICAL_PROCS) if name else False
            results.append({
                "pid": pid,
                "name": name,
                "status": status,
                "cpu_percent": cpu_val,
                "memory_percent": mem_val,
                "source": "real-windows",
                "username": info.get("username") or "SYSTEM",
                "is_critical": is_crit,
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            try:
                pid = getattr(p, "pid", 0)
                results.append({
                    "pid": pid,
                    "name": "System process (access denied)",
                    "status": "running",
                    "cpu_percent": 0.0,
                    "memory_percent": 0.0,
                    "source": "real-windows",
                    "username": "SYSTEM",
                    "is_critical": True,
                })
            except Exception:
                continue
        except Exception:
            continue

    results.sort(key=lambda x: x["memory_percent"], reverse=True)
    return results[:limit]

def ubuntu_process_snapshot(limit: int = 20) -> dict:
    """
    Parses running Ubuntu processes using ps -eo pid,comm,%cpu,%mem --sort=-%mem via WSL2.
    Returns standard format with source = 'real-ubuntu'. If disconnected, reports disconnected.
    """
    try:
        p = subprocess.run(
            ["wsl", "-d", "Ubuntu-24.04", "--", "ps", "-eo", "pid,comm,%cpu,%mem", "--sort=-%mem"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if p.returncode != 0:
            return {"source": "real-ubuntu", "status": "disconnected", "processes": []}

        lines = [line.strip() for line in p.stdout.strip().split("\n") if line.strip()]
        procs = []
        for line in lines[1:]:
            parts = line.split(None, 3)
            if len(parts) >= 4:
                try:
                    pid = int(parts[0])
                    comm = parts[1].strip() or "System process (access denied)"
                    cpu = round(float(parts[2]), 1)
                    mem = round(float(parts[3]), 1)
                    procs.append({
                        "pid": pid,
                        "name": comm,
                        "status": "running",
                        "cpu_percent": cpu,
                        "memory_percent": mem,
                        "source": "real-ubuntu",
                    })
                except (ValueError, IndexError):
                    continue
        return {
            "source": "real-ubuntu",
            "status": "connected",
            "processes": procs[:limit],
        }
    except Exception:
        return {"source": "real-ubuntu", "status": "disconnected", "processes": []}

def build_ai_context(message: str, client_context: Optional[dict] = None) -> dict:
    """
    Enriches AI context with live process telemetry whenever system state is queried.
    Reports real-windows and real-ubuntu separately without mixing real and simulated data.
    """
    ctx = dict(client_context) if client_context else {}
    msg_lower = (message or "").lower()

    process_keywords = (
        "process", "running", "task", "pid", "cpu", "memory", "monitor",
        "system", "psutil", "top", "kill", "daemon", "service", "ram", "hardware"
    )
    needs_system_state = (
        any(k in msg_lower for k in process_keywords)
        or ctx.get("kind") in ("processes", "monitor", "system", "task")
        or "processes" in ctx
    )

    if needs_system_state:
        ctx["windows_processes"] = process_snapshot(limit=20)
        ctx["windows_system"] = {
            "source": "real-windows",
            "cpu_percent": psutil.cpu_percent(interval=None),
            "ram_percent": psutil.virtual_memory().percent,
            "cores": psutil.cpu_count(),
        }

        ub_res = ubuntu_process_snapshot(limit=20)
        if ub_res.get("status") == "connected" and ub_res.get("processes"):
            ctx["ubuntu_processes"] = ub_res["processes"]
        else:
            ctx["ubuntu"] = "disconnected"

    return ctx

@app.get("/api/monitor/windows")
def win_monitor():
    vm, du = psutil.virtual_memory(), psutil.disk_usage("/")
    return {
        "source": "real-windows",
        "cpu_percent": psutil.cpu_percent(interval=None),
        "cores": psutil.cpu_count(),
        "ram_percent": vm.percent,
        "disk_percent": du.percent,
        "processes": process_snapshot(limit=15),
    }

@app.get("/api/monitor/ubuntu")
def ubuntu_monitor():
    try:
        p_free = subprocess.run(["wsl", "-d", "Ubuntu-24.04", "--", "free", "-m"], capture_output=True, text=True, timeout=5)
        p_df = subprocess.run(["wsl", "-d", "Ubuntu-24.04", "--", "df", "-h", "/"], capture_output=True, text=True, timeout=5)
        p_up = subprocess.run(["wsl", "-d", "Ubuntu-24.04", "--", "uptime"], capture_output=True, text=True, timeout=5)

        mem_lines = p_free.stdout.strip().split("\n")
        ram_total = 0
        ram_used = 0
        ram_percent = 0.0
        if len(mem_lines) >= 2:
            parts = mem_lines[1].split()
            if len(parts) >= 3:
                ram_total = int(parts[1])
                ram_used = int(parts[2])
                ram_percent = round((ram_used / ram_total) * 100, 1) if ram_total > 0 else 0.0

        df_lines = p_df.stdout.strip().split("\n")
        disk_percent = 0.0
        if len(df_lines) >= 2:
            parts = df_lines[1].split()
            if len(parts) >= 5:
                disk_percent = float(parts[4].replace("%", ""))

        uptime_str = p_up.stdout.strip()
        ub_procs = ubuntu_process_snapshot(limit=15)

        return {
            "source": "real-ubuntu",
            "connected": True,
            "ram_total_mb": ram_total,
            "ram_used_mb": ram_used,
            "ram_percent": ram_percent,
            "disk_percent": disk_percent,
            "uptime": uptime_str,
            "processes": ub_procs.get("processes", []),
        }
    except Exception:
        return {
            "source": "real-ubuntu",
            "connected": False,
            "error": "WSL2 Ubuntu 24.04 disconnected or not running.",
        }

# =========================================================================
# PROCESS MANAGEMENT ENDPOINTS (REAL WINDOWS & VIRTUAL OS)
# =========================================================================

@app.get("/api/processes/real")
def get_real_processes():
    return {"source": "real-windows", "processes": process_snapshot(limit=50)}

@app.post("/api/processes/real/kill")
def kill_real_process(req: RealKillReq):
    pid = req.pid
    if pid <= 4:
        raise HTTPException(403, "Refused: Cannot terminate critical Windows Kernel / System process (PID <= 4).")

    try:
        proc = psutil.Process(pid)
        name = (proc.name() or "").lower()
        if name in CRITICAL_PROCS:
            raise HTTPException(403, f"Refused: '{name}' is a critical Windows system component and cannot be killed.")

        proc.terminate()
        return {"source": "real-windows", "success": True, "message": f"Process {name} (PID: {pid}) terminated successfully."}
    except psutil.NoSuchProcess:
        raise HTTPException(404, f"Process with PID {pid} no longer exists.")
    except psutil.AccessDenied:
        raise HTTPException(403, f"Access denied: Insufficient privileges to terminate PID {pid}.")

@app.get("/api/processes/virtual")
def get_virtual_processes():
    return {"source": "simulated", "processes": virtual_pm.list_all()}

@app.post("/api/processes/virtual/create")
def create_virtual_process(req: VirtProcCreateReq):
    p = virtual_pm.create(req.name, req.priority, req.memory_kb)
    return {"source": "simulated", "process": p}

@app.post("/api/processes/virtual/transition")
def transition_virtual_process(req: VirtProcTransitionReq):
    try:
        p = virtual_pm.transition(req.pid, req.action)
        return {"source": "simulated", "process": p}
    except ValueError as e:
        raise HTTPException(400, str(e))

@app.post("/api/processes/virtual/reset")
def reset_virtual_processes():
    procs = virtual_pm.reset()
    return {"source": "simulated", "processes": procs}

# ==============================================================================
# USER MANAGEMENT & RBAC ENDPOINTS
# ==============================================================================

@app.get("/api/users")
def get_users():
    return {
        "users": virtual_fs.list_users(),
        "active_user": virtual_fs.get_active_user(),
    }

@app.post("/api/users/switch")
def switch_user(req: SwitchUserReq):
    try:
        active = virtual_fs.set_active_user(req.username)
        return {"success": True, "active_user": active}
    except ValueError as e:
        raise HTTPException(400, str(e))

# ==============================================================================
# VIRTUAL & REAL FILESYSTEM ENDPOINTS
# ==============================================================================

@app.get("/api/fs/list")
def fs_list(parent_id: str = "home"):
    # If "home", check if node exists, else "root"
    node = virtual_fs.get_node(parent_id)
    if not node:
        parent_id = "root"
    items = virtual_fs.list_dir(parent_id)
    active_user = virtual_fs.get_active_user()
    return {"source": "simulated", "parent_id": parent_id, "items": items, "active_user": active_user}

@app.post("/api/fs/create")
def fs_create(req: FSCreateReq):
    try:
        node = virtual_fs.create(
            name=req.name,
            parent_id=req.parent_id,
            is_folder=req.is_folder,
            content=req.content,
            owner=req.owner,
            permissions=req.permissions,
        )
        return {"source": "simulated", "node": node}
    except PermissionError as e:
        raise HTTPException(403, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))

@app.post("/api/fs/rename")
def fs_rename(req: FSRenameReq):
    try:
        node = virtual_fs.rename(req.id, req.new_name)
        return {"source": "simulated", "node": node}
    except PermissionError as e:
        raise HTTPException(403, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))

@app.post("/api/fs/delete")
def fs_delete(req: FSDeleteReq):
    try:
        virtual_fs.delete(req.id)
        return {"source": "simulated", "success": True}
    except PermissionError as e:
        raise HTTPException(403, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))

@app.get("/api/fs/read")
def fs_read(id: str):
    try:
        data = virtual_fs.read_file(id)
        return {"source": "simulated", **data}
    except ValueError as e:
        raise HTTPException(404, str(e))

@app.post("/api/fs/write")
def fs_write(req: FSWriteReq):
    try:
        node = virtual_fs.write_file(req.id, req.content)
        return {"source": "simulated", "node": node}
    except PermissionError as e:
        raise HTTPException(403, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))

@app.post("/api/fs/reset")
def fs_reset():
    items = virtual_fs.reset()
    return {"source": "simulated", "items": items}

@app.post("/api/ubuntu/files")
def ubuntu_files(req: UbuntuFilesReq):
    req_path = req.path.strip() or "/home"
    if ".." in req_path:
        raise HTTPException(400, "Path traversal forbidden.")
    permitted = ("/home", "/tmp", "/var/log", "/etc")
    if not any(req_path.startswith(p) for p in permitted):
        raise HTTPException(403, "Access restricted to safe directories (/home, /tmp, /var/log, /etc).")

    try:
        cmd = f"ls -la --time-style=+\"%Y-%m-%d %H:%M\" {shlex.quote(req_path)}"
        p = subprocess.run(
            ["wsl", "-d", "Ubuntu-24.04", "--", "bash", "-c", cmd],
            capture_output=True,
            text=True,
            timeout=8,
        )
        if p.returncode != 0:
            return {"source": "real-ubuntu", "path": req_path, "items": [], "error": p.stderr.strip() or "Directory unreadable"}

        items = []
        for line in p.stdout.splitlines():
            line = line.strip()
            if not line or line.startswith("total"):
                continue
            parts = line.split(maxsplit=6)
            if len(parts) >= 7:
                perms, links, owner, group, size, dt, name = parts
                if name in (".", ".."):
                    continue
                is_dir = perms.startswith("d")
                items.append({
                    "id": f"wsl_{name}",
                    "name": name,
                    "is_folder": is_dir,
                    "size": int(size) if size.isdigit() else 4096,
                    "permissions": perms,
                    "owner": owner,
                    "modified_at": dt,
                })
        items.sort(key=lambda x: (not x["is_folder"], x["name"].lower()))
        return {"source": "real-ubuntu", "path": req_path, "items": items}
    except FileNotFoundError:
        return {"source": "real-ubuntu", "path": req_path, "items": [], "error": "Ubuntu WSL is disconnected."}
    except Exception as e:
        return {"source": "real-ubuntu", "path": req_path, "items": [], "error": str(e)}

# ==============================================================================
# WEBSOCKET REAL-TIME HOST MONITORING STREAM
# ==============================================================================

@app.websocket("/ws/monitor")
async def ws_monitor(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            cpu_pct = psutil.cpu_percent(interval=None)
            ram = psutil.virtual_memory()
            disk = psutil.disk_usage("/")
            payload = {
                "source": "real-windows",
                "cpu_percent": cpu_pct,
                "cores": psutil.cpu_count(logical=True),
                "ram_percent": ram.percent,
                "ram_used_gb": round(ram.used / (1024**3), 2),
                "ram_total_gb": round(ram.total / (1024**3), 2),
                "disk_percent": disk.percent,
                "disk_free_gb": round(disk.free / (1024**3), 2),
                "processes": process_snapshot(limit=15),
            }
            await websocket.send_json(payload)
            await asyncio.sleep(1.0)
    except (WebSocketDisconnect, Exception):
        pass

# ==============================================================================
# AI ASSISTANT ENDPOINTS (VIA APP.AI)
# ==============================================================================

@app.post("/api/ai/chat")
def ai_chat(req: AIChatReq):
    enriched_ctx = build_ai_context(req.message, req.context)
    reply = generate_ai_response(req.message, enriched_ctx)
    return {"source": "ai-tutor", "reply": reply}

@app.post("/api/ai/explain")
def ai_explain(req: AIChatReq):
    enriched_ctx = build_ai_context(req.message, req.context)
    reply = generate_ai_response(req.message, enriched_ctx)
    return {"source": "ai-tutor", "explanation": reply}


# All everyday commands for OS course labs & Linux terminal usage
ALLOWED = {
    # Navigation & Directory inspection
    "pwd", "cd", "ls", "dir",
    # File viewing & text processing
    "cat", "head", "tail", "more", "less", "grep", "egrep", "fgrep",
    "wc", "diff", "cmp", "sort", "uniq", "cut", "paste", "awk", "sed",
    "tr", "tee", "file", "stat", "strings",
    # File & Directory manipulation
    "touch", "mkdir", "rmdir", "cp", "mv", "rm", "find", "tree",
    "chmod", "chown", "chgrp", "ln", "readlink", "basename", "dirname",
    # Process management & Inspection
    "ps", "top", "htop", "pstree", "pgrep", "pkill", "kill", "nice",
    "renice", "jobs", "nohup", "time", "sleep", "wait", "lsof",
    # System, Hardware & Memory telemetry
    "uname", "uptime", "whoami", "who", "w", "id", "hostname",
    "date", "cal", "df", "du", "free", "vmstat", "iostat", "mpstat",
    "lscpu", "lsmem", "lsblk", "arch", "env", "printenv",
    # Shell & utility commands
    "echo", "printf", "clear", "history", "which", "whereis", "type",
    "man", "help", "alias", "tar", "gzip", "gunzip", "zip", "unzip",
    "bzip2", "bunzip2", "xz", "unxz",
    # Basic Networking & inspection
    "ping", "ip", "ifconfig", "netstat", "ss", "curl", "wget", "host",
    "nslookup", "traceroute",
    # Compilers / interpreters commonly used in OS labs
    "gcc", "g++", "make", "python3", "python", "sh", "bash",
}

DANGEROUS_PATTERNS = [
    r"rm\s+(-rf|-fr|--recursive)\s+/\s*$",
    r"rm\s+(-rf|-fr|--recursive)\s+/\*$",
    r"mkfs",
    r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:",
    r"dd\s+if=.*of=/dev/sd",
    r"shutdown",
    r"reboot",
    r"poweroff",
    r"init\s+0",
]

@app.post("/api/ubuntu/run")
def ubuntu_run(body: dict):
    cmd_str = str(body.get("command", "")).strip()
    cwd = str(body.get("cwd", "~")).strip() or "~"

    if not cmd_str:
        return {"source": "real-ubuntu", "stdout": "", "stderr": "", "code": 0, "cwd": cwd}

    # Security check: Block destructive host-wide commands
    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, cmd_str):
            raise HTTPException(403, "Command refused for system security.")

    # Validate that every command in the pipeline/chain is in ALLOWED
    pipeline_segments = re.split(r"[|;&]+", cmd_str)
    for seg in pipeline_segments:
        s = seg.strip()
        if not s:
            continue
        try:
            tokens = shlex.split(s)
            if tokens and tokens[0] not in ALLOWED:
                raise HTTPException(
                    403,
                    f"Command '{tokens[0]}' not allowed. Allowed daily OS commands include: {', '.join(sorted(list(ALLOWED))[:24])}...",
                )
        except ValueError:
            # Malformed quotation
            raise HTTPException(422, "Malformed command quotation.")

    try:
        # Special handling for 'cd': update current working directory and report it back
        primary_tokens = shlex.split(cmd_str)
        if primary_tokens and primary_tokens[0] == "cd" and len(pipeline_segments) == 1:
            target = primary_tokens[1] if len(primary_tokens) > 1 else "~"
            # Resolve directory in WSL bash
            cd_script = f"cd {cwd} 2>/dev/null && cd {target} 2>/dev/null && pwd"
            p = subprocess.run(
                ["wsl", "-d", "Ubuntu-24.04", "--", "bash", "-c", cd_script],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if p.returncode == 0 and p.stdout.strip():
                new_cwd = p.stdout.strip()
                return {"source": "real-ubuntu", "stdout": "", "stderr": "", "code": 0, "cwd": new_cwd}
            else:
                return {
                    "source": "real-ubuntu",
                    "stdout": "",
                    "stderr": f"bash: cd: {target}: No such file or directory\n",
                    "code": 1,
                    "cwd": cwd,
                }

        # For all other commands, execute inside active cwd via bash
        exec_script = f"cd {cwd} 2>/dev/null; {cmd_str}"
        p = subprocess.run(
            ["wsl", "-d", "Ubuntu-24.04", "--", "bash", "-c", exec_script],
            capture_output=True,
            text=True,
            timeout=15,
        )
        return {
            "source": "real-ubuntu",
            "stdout": p.stdout,
            "stderr": p.stderr,
            "code": p.returncode,
            "cwd": cwd,
        }
    except FileNotFoundError:
        raise HTTPException(503, "WSL not found. Ubuntu is disconnected.")
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "Command timed out")
