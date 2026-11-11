import os
import sqlite3
import datetime
from typing import Dict, List, Optional, Any

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "intellios.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Nodes Table (Virtual File System)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        is_folder INTEGER NOT NULL,
        content TEXT DEFAULT '',
        size INTEGER DEFAULT 0,
        owner TEXT DEFAULT 'student',
        permissions TEXT DEFAULT 'rw-r--r--',
        modified_at TEXT NOT NULL
    );
    """)

    # 2. Virtual Processes Table (PCB State Machine)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS virtual_processes (
        pid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        priority INTEGER DEFAULT 1,
        memory_kb INTEGER DEFAULT 4096,
        state TEXT NOT NULL,
        cpu_time INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    );
    """)

    # 3. Users Table (Role-Based Permissions)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        display_name TEXT NOT NULL,
        is_active INTEGER DEFAULT 0
    );
    """)

    conn.commit()

    # Seed Users if empty
    cursor.execute("SELECT COUNT(*) as cnt FROM users")
    if cursor.fetchone()["cnt"] == 0:
        cursor.executemany("""
        INSERT INTO users (username, role, display_name, is_active)
        VALUES (?, ?, ?, ?);
        """, [
            ("root", "admin", "Administrator", 0),
            ("student", "standard", "Student User", 1),
            ("guest", "restricted", "Guest Observer", 0),
        ])
        conn.commit()

    # Seed Nodes if empty
    cursor.execute("SELECT COUNT(*) as cnt FROM nodes")
    if cursor.fetchone()["cnt"] == 0:
        seed_default_fs(conn)

    # Seed Virtual Processes if empty
    cursor.execute("SELECT COUNT(*) as cnt FROM virtual_processes")
    if cursor.fetchone()["cnt"] == 0:
        seed_default_processes(conn)

    conn.close()

def seed_default_fs(conn):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM nodes")

    nodes = [
        ("root", "/", None, 1, "", 4096, "root", "rwxr-xr-x", now),
        ("home", "home", "root", 1, "", 4096, "root", "rwxr-xr-x", now),
        ("n_docs", "Documents", "home", 1, "", 4096, "student", "rwxr-xr-x", now),
        ("n_down", "Downloads", "home", 1, "", 4096, "student", "rwxr-xr-x", now),
        ("Trash", "Trash", "root", 1, "", 4096, "root", "rwxr-xr-x", now),
        (
            "n_syl",
            "os_syllabus.txt",
            "n_docs",
            0,
            "Operating Systems Course Topics:\n1. Process Management & PCB\n2. CPU Scheduling (FCFS, SJF, RR)\n3. Deadlocks & Banker's Algorithm\n4. Memory Allocation (First Fit, Best Fit)\n5. Virtual File Systems & Inodes",
            214,
            "student",
            "rw-r--r--",
            now,
        ),
        (
            "n_bank",
            "bankers_notes.md",
            "n_docs",
            0,
            "# Banker's Algorithm Summary\n- Avoids deadlock by safe state checking\n- Need Matrix = Max - Allocation\n- Work = Available resources",
            135,
            "student",
            "rw-r--r--",
            now,
        ),
        (
            "n_kern",
            "kernel_patch.c",
            "n_down",
            0,
            '#include <linux/kernel.h>\n#include <linux/init.h>\n\nstatic int __init hello_init(void) {\n    printk(KERN_INFO "IntelliOS Kernel Module Loaded\\n");\n    return 0;\n}\n',
            145,
            "student",
            "rw-r--r--",
            now,
        ),
    ]

    cursor.executemany("""
    INSERT INTO nodes (id, name, parent_id, is_folder, content, size, owner, permissions, modified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, nodes)
    conn.commit()

def seed_default_processes(conn):
    now = datetime.datetime.now().strftime("%H:%M:%S")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM virtual_processes")

    procs = [
        ("vPID_001", "init_system", 0, 16384, "Running", 0, now),
        ("vPID_002", "gui_compositor", 1, 32768, "Ready", 0, now),
        ("vPID_003", "virtual_disk_driver", 2, 8192, "Waiting", 0, now),
        ("vPID_004", "network_daemon", 2, 12288, "Ready", 0, now),
        ("vPID_005", "student_shell", 3, 4096, "Ready", 0, now),
    ]

    cursor.executemany("""
    INSERT INTO virtual_processes (pid, name, priority, memory_kb, state, cpu_time, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?);
    """, procs)
    conn.commit()

# Initialize tables immediately upon import
init_db()

