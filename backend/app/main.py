import shlex, subprocess, psutil, re
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from .simulators.scheduling import schedule
from .simulators.memory import compare
from .simulators.deadlock import banker, detect
from .simulators.process_manager import virtual_pm
from .simulators.virtual_fs import virtual_fs

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

@app.get("/api/monitor/windows")
def win_monitor():
    vm, du = psutil.virtual_memory(), psutil.disk_usage("/")
    return {
        "source": "real-windows",
        "cpu_percent": psutil.cpu_percent(interval=0.2),
        "cores": psutil.cpu_count(),
        "ram_percent": vm.percent,
        "disk_percent": du.percent,
        "processes": [
            p.info
            for p in sorted(
                psutil.process_iter(["pid", "name", "memory_percent"]),
                key=lambda p: p.info["memory_percent"] or 0,
                reverse=True,
            )[:15]
        ],
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

        return {
            "source": "real-ubuntu",
            "connected": True,
            "ram_total_mb": ram_total,
            "ram_used_mb": ram_used,
            "ram_percent": ram_percent,
            "disk_percent": disk_percent,
            "uptime": uptime_str,
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
CRITICAL_PROCS = {
    "system", "system idle process", "csrss.exe", "lsass.exe", "smss.exe",
    "services.exe", "wininit.exe", "explorer.exe", "svchost.exe", "dwm.exe",
    "ntoskrnl.exe", "registry", "fontdrvhost.exe"
}

@app.get("/api/processes/real")
def get_real_processes():
    procs = []
    for p in psutil.process_iter(["pid", "name", "memory_percent", "cpu_percent", "status", "username"]):
        try:
            info = p.info
            procs.append({
                "pid": info["pid"],
                "name": info["name"] or "Unknown",
                "memory_percent": round(info["memory_percent"] or 0, 1),
                "cpu_percent": round(info["cpu_percent"] or 0, 1),
                "status": info["status"] or "running",
                "username": info.get("username") or "SYSTEM",
                "is_critical": (info["name"].lower() in CRITICAL_PROCS) if info["name"] else False,
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    # Return top 50 sorted by memory percent
    procs.sort(key=lambda x: x["memory_percent"], reverse=True)
    return {"source": "real-windows", "processes": procs[:50]}

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
# VIRTUAL & REAL FILESYSTEM ENDPOINTS
# ==============================================================================

@app.get("/api/fs/list")
def fs_list(parent_id: str = "home"):
    # If "home", check if node exists, else "root"
    node = virtual_fs.get_node(parent_id)
    if not node:
        parent_id = "root"
    items = virtual_fs.list_dir(parent_id)
    return {"source": "simulated", "parent_id": parent_id, "items": items}

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
        return {"source": "simulated", "node": node.to_dict()}
    except ValueError as e:
        raise HTTPException(400, str(e))

@app.post("/api/fs/rename")
def fs_rename(req: FSRenameReq):
    try:
        node = virtual_fs.rename(req.id, req.new_name)
        return {"source": "simulated", "node": node.to_dict()}
    except ValueError as e:
        raise HTTPException(400, str(e))

@app.post("/api/fs/delete")
def fs_delete(req: FSDeleteReq):
    try:
        virtual_fs.delete(req.id)
        return {"source": "simulated", "success": True}
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
        return {"source": "simulated", "node": node.to_dict()}
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
# AI ASSISTANT ENDPOINT (OFFLINE OS KNOWLEDGE ENGINE + VIVA TUTOR)
# ==============================================================================

def generate_ai_response(prompt: str, context: Optional[dict] = None) -> str:
    p_lower = prompt.lower()

    if context:
        # Context-aware explanation mode
        kind = context.get("kind")
        if kind == "scheduling":
            algo = context.get("algo", "Unknown")
            avg_wt = context.get("avg_waiting", 0)
            avg_tat = context.get("avg_turnaround", 0)
            cpu_util = context.get("cpu_utilization", 100)
            return (
                f"### Analysis of CPU Scheduling ({algo.upper()})\n\n"
                f"- **Average Waiting Time**: `{avg_wt:.2f} ms`\n"
                f"- **Average Turnaround Time**: `{avg_tat:.2f} ms`\n"
                f"- **CPU Utilization**: `{cpu_util:.1f}%`\n\n"
                f"**Key Takeaways for Your Viva:**\n"
                f"1. **Performance**: In {algo.upper()}, processes were dispatched sequentially according to arrival and burst characteristics.\n"
                f"2. **Trade-offs**: "
                f"{'FCFS is vulnerable to the Convoy Effect where long processes starve short ones.' if algo == 'fcfs' else ''}"
                f"{'SJF produces mathematically minimal average waiting times but requires prior knowledge of burst times.' if algo == 'sjf' else ''}"
                f"{'Round Robin provides fair responsiveness and prevents starvation, but its efficiency depends on time quantum selection.' if algo == 'rr' else ''}"
                f"{'SRTF is the preemptive variant of SJF, reducing response latency for newly arrived short bursts.' if algo == 'srtf' else ''}"
                f"{'Priority scheduling may cause starvation for low-priority tasks unless aging techniques are applied.' if 'priority' in algo else ''}"
            )
        elif kind == "deadlock":
            safe = context.get("safe", False)
            seq = context.get("safe_sequence", [])
            if safe:
                return (
                    f"### Deadlock Evaluation: System in Safe State\n\n"
                    f"- **Safe Sequence Found**: `{' -> '.join(seq)}`\n\n"
                    f"**Explanation:**\n"
                    f"The Banker's Algorithm verified that the available system resource vector satisfies the Need matrix for process `{seq[0]}`. "
                    f"Upon completion, its allocated resources were reclaimed by the OS, allowing all remaining processes to finish sequentially without circular wait."
                )
            else:
                return (
                    f"### Deadlock Evaluation: System Unsafe / Deadlocked!\n\n"
                    f"**Warning**: No safe execution sequence exists. The remaining available vector cannot fulfill the remaining maximum demands of any process. "
                    f"At least one of the 4 Coffman conditions is violated, resulting in potential deadlock."
                )
        elif kind == "memory":
            return (
                f"### Contiguous Memory Allocation Analysis\n\n"
                f"- **First Fit**: Scans linearly and allocates the first hole large enough. Fast ($O(N)$), but causes fragmentation near the start of memory.\n"
                f"- **Best Fit**: Allocates the smallest hole that fits the process. Minimizes wasted block space but creates tiny, unusable fragments.\n"
                f"- **Worst Fit**: Allocates the largest available hole. Leaves larger remaining fragments, but destroys large contiguous blocks quickly."
            )

    # General OS conceptual queries
    if any(k in p_lower for k in ("deadlock", "coffman")):
        return (
            "### Deadlock and the 4 Coffman Conditions\n\n"
            "A deadlock occurs when a set of concurrent processes are permanently blocked because each holds a resource and waits for another.\n\n"
            "**The 4 Necessary & Sufficient Conditions:**\n"
            "1. **Mutual Exclusion**: At least one resource is held in a non-shareable mode.\n"
            "2. **Hold and Wait**: A process holds at least one resource while requesting additional resources.\n"
            "3. **No Preemption**: Resources cannot be forcibly revoked from a process; they must be released voluntarily.\n"
            "4. **Circular Wait**: A closed chain of processes exists where $P_0$ waits for $P_1$, and $P_n$ waits for $P_0$.\n\n"
            "To prevent deadlock, the OS design must invalidate at least one of these conditions."
        )
    elif any(k in p_lower for k in ("round robin", "quantum")):
        return (
            "### Round Robin (RR) Scheduling & Time Quantum Selection\n\n"
            "- **Mechanism**: Each ready process is assigned a fixed time slice (quantum $q$). Preemption occurs via timer interrupt.\n"
            "- **Small Quantum ($q \\to 0$)**: High context-switch overhead degrades CPU throughput, behaving like processor sharing.\n"
            "- **Large Quantum ($q \\to \\infty$)**: Degenerates into standard First-Come, First-Served (FCFS).\n"
            "- **Rule of Thumb**: $80\\%$ of CPU bursts should be shorter than the chosen time quantum to maximize responsiveness."
        )
    elif any(k in p_lower for k in ("pcb", "process control block", "process state")):
        return (
            "### Process Control Block (PCB) & State Machine\n\n"
            "The PCB is the kernel data structure representing an active process:\n"
            "- **PID**: Unique process identifier.\n"
            "- **Program Counter (PC)**: Memory address of the next instruction to execute.\n"
            "- **CPU Registers**: Accumulator, stack pointer, index registers saved on context switch.\n"
            "- **Memory Management Information**: Base and limit registers, page tables or segment tables.\n"
            "- **I/O Status**: Open file descriptors and assigned devices.\n\n"
            "**5 Standard States**: `New` $\\to$ `Ready` $\\to$ `Running` $\\to$ `Waiting` $\\to$ `Terminated`."
        )
    elif any(k in p_lower for k in ("wsl", "hybrid", "architecture", "intellios")):
        return (
            "### IntelliOS Hybrid Architectural Model\n\n"
            "IntelliOS adopts an educational hybrid architecture:\n"
            "1. **Core OS Simulators**: Python-based deterministic algorithms implementing scheduling, contiguous memory partitioning, and Banker's deadlock safety.\n"
            "2. **Real Linux Execution**: Direct virtualization pass-through to native Ubuntu 24.04 running on WSL2, providing true POSIX system calls and file manipulation.\n"
            "3. **Host Telemetry**: Real-time Windows hardware monitoring via `psutil`, contrasting simulated abstract states with actual bare-metal thread performance."
        )
    elif any(k in p_lower for k in ("fragmentation", "paging", "virtual memory")):
        return (
            "### Memory Fragmentation: Internal vs External\n\n"
            "- **Internal Fragmentation**: Wasted space inside an allocated block (e.g., allocating a 100 KB block to a 80 KB process leaves 20 KB unused inside).\n"
            "- **External Fragmentation**: Total free memory across disjoint holes is sufficient to satisfy a request, but no single contiguous block is large enough.\n"
            "- **Solution**: Non-contiguous memory allocation techniques such as Paging (virtual address space divided into fixed pages) and Compaction."
        )
    else:
        return (
            f"### IntelliOS Academic Assistant\n\n"
            f"I am ready to help you analyze operating system concepts and lab data! You can ask me about:\n\n"
            f"- **CPU Scheduling**: FCFS, SJF, SRTF, Priority, Round Robin comparisons.\n"
            f"- **Memory Management**: First Fit vs Best Fit vs Worst Fit, fragmentation, paging.\n"
            f"- **Concurrency & Deadlock**: Banker's Algorithm, Coffman conditions, semaphores.\n"
            f"- **Virtual Filesystem**: Inode structures, directory trees, file permissions (`rwxr-xr-x`).\n"
            f"- **Live Telemetry**: Real Windows vs Real Ubuntu system performance."
        )

@app.post("/api/ai/chat")
def ai_chat(req: AIChatReq):
    reply = generate_ai_response(req.message, req.context)
    return {"source": "ai-tutor", "reply": reply}

@app.post("/api/ai/explain")
def ai_explain(req: AIChatReq):
    reply = generate_ai_response(req.message, req.context)
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
