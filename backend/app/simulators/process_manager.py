import time
from typing import List, Dict, Optional
from ..database import get_db_connection, seed_default_processes

class VirtualProcessManager:
    """
    SQLite-backed Virtual Process Control Block (PCB) Simulator
    managing the 5-state process lifecycle:
    New -> Ready -> Running -> Waiting -> Terminated
    """

    def list_all(self) -> List[dict]:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT * FROM virtual_processes ORDER BY pid ASC")
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

    def create(self, name: str, priority: int = 1, memory_kb: int = 4096) -> dict:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT COUNT(*) as cnt FROM virtual_processes")
            next_num = cursor.fetchone()["cnt"] + 1
            pid = f"vPID_{next_num:03d}"
            created_at = time.strftime("%H:%M:%S")

            cursor.execute("""
            INSERT INTO virtual_processes (pid, name, priority, memory_kb, state, cpu_time, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (pid, name.strip(), priority, memory_kb, "Ready", 0, created_at))
            conn.commit()

            cursor.execute("SELECT * FROM virtual_processes WHERE pid = ?", (pid,))
            return dict(cursor.fetchone())
        finally:
            conn.close()

    def transition(self, pid: str, action: str) -> dict:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT * FROM virtual_processes WHERE pid = ?", (pid,))
            row = cursor.fetchone()
            if not row:
                raise ValueError(f"Process {pid} not found.")

            current_state = row["state"]

            if action == "dispatch":
                # Preempt any currently running process to Ready
                cursor.execute("UPDATE virtual_processes SET state = 'Ready' WHERE state = 'Running'")
                cursor.execute("UPDATE virtual_processes SET state = 'Running', cpu_time = cpu_time + 10 WHERE pid = ?", (pid,))
            elif action == "block":
                if current_state != "Running":
                    raise ValueError(f"Only Running processes can block on I/O. Process {pid} is currently {current_state}.")
                cursor.execute("UPDATE virtual_processes SET state = 'Waiting' WHERE pid = ?", (pid,))
            elif action == "wake":
                if current_state != "Waiting":
                    raise ValueError(f"Only Waiting processes can be woken. Process {pid} is currently {current_state}.")
                cursor.execute("UPDATE virtual_processes SET state = 'Ready' WHERE pid = ?", (pid,))
            elif action == "terminate":
                cursor.execute("UPDATE virtual_processes SET state = 'Terminated' WHERE pid = ?", (pid,))
            else:
                raise ValueError(f"Unknown state transition action: '{action}'. Allowed: dispatch, block, wake, terminate.")

            conn.commit()

            cursor.execute("SELECT * FROM virtual_processes WHERE pid = ?", (pid,))
            return dict(cursor.fetchone())
        finally:
            conn.close()

    def reset(self) -> List[dict]:
        conn = get_db_connection()
        try:
            seed_default_processes(conn)
            return self.list_all()
        finally:
            conn.close()

# Global singleton
virtual_pm = VirtualProcessManager()
