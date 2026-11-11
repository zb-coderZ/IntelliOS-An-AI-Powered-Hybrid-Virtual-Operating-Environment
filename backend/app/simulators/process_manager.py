import time
from typing import List, Dict, Optional

class Process:
    def __init__(self, pid: str, name: str, priority: int = 1, memory_kb: int = 4096, state: str = "Ready"):
        self.pid = pid
        self.name = name
        self.priority = priority
        self.memory_kb = memory_kb
        self.state = state  # New, Ready, Running, Waiting, Terminated
        self.cpu_time = 0
        self.created_at = time.strftime("%H:%M:%S")

    def to_dict(self) -> dict:
        return {
            "pid": self.pid,
            "name": self.name,
            "priority": self.priority,
            "memory_kb": self.memory_kb,
            "state": self.state,
            "cpu_time": self.cpu_time,
            "created_at": self.created_at,
        }

class VirtualProcessManager:
    def __init__(self):
        self.processes: Dict[str, Process] = {}
        self.counter = 1
        self.init_defaults()

    def init_defaults(self):
        self.processes.clear()
        self.counter = 1
        defaults = [
            ("init_system", 0, 16384, "Running"),
            ("gui_compositor", 1, 32768, "Ready"),
            ("virtual_disk_driver", 2, 8192, "Waiting"),
            ("network_daemon", 2, 12288, "Ready"),
            ("student_shell", 3, 4096, "Ready"),
        ]
        for name, prio, mem, state in defaults:
            pid = f"vPID_{self.counter:03d}"
            self.processes[pid] = Process(pid, name, prio, mem, state)
            self.counter += 1

    def create(self, name: str, priority: int = 1, memory_kb: int = 4096) -> dict:
        pid = f"vPID_{self.counter:03d}"
        self.counter += 1
        proc = Process(pid, name, priority, memory_kb, "Ready")
        self.processes[pid] = proc
        return proc.to_dict()

    def transition(self, pid: str, action: str) -> dict:
        if pid not in self.processes:
            raise ValueError(f"Process {pid} not found.")

        proc = self.processes[pid]

        if action == "dispatch":
            # Any currently running process moves back to Ready
            for p in self.processes.values():
                if p.state == "Running" and p.pid != pid:
                    p.state = "Ready"
            proc.state = "Running"
            proc.cpu_time += 1
        elif action == "block":
            proc.state = "Waiting"
        elif action == "wake":
            proc.state = "Ready"
        elif action == "terminate":
            proc.state = "Terminated"
        else:
            raise ValueError(f"Invalid transition action: {action}")

        return proc.to_dict()

    def list_all(self) -> List[dict]:
        return [p.to_dict() for p in self.processes.values()]

    def reset(self):
        self.init_defaults()
        return self.list_all()

# Singleton instance
virtual_pm = VirtualProcessManager()
