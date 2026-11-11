from app.simulators.scheduling import schedule
from app.simulators.memory import allocate
from app.simulators.deadlock import banker, detect
from app.simulators.process_manager import virtual_pm
from app.simulators.virtual_fs import virtual_fs

P = [{"pid": "P1", "arrival": 0, "burst": 5, "priority": 2}, {"pid": "P2", "arrival": 1, "burst": 3, "priority": 1},
     {"pid": "P3", "arrival": 2, "burst": 1, "priority": 3}]
def ct(r): return {x["pid"]: x["completion"] for x in r["processes"]}
def test_fcfs(): assert ct(schedule(P, "fcfs")) == {"P1": 5, "P2": 8, "P3": 9}
def test_sjf(): assert ct(schedule(P, "sjf")) == {"P1": 5, "P3": 6, "P2": 9}
def test_rr():
    r = schedule(P, "rr", 2); assert ct(r) == {"P1": 9, "P2": 8, "P3": 5}
def test_srtf_real():
    r = schedule(P, "srtf"); assert ct(r) == {"P1": 9, "P2": 5, "P3": 3}
def test_best_fit():
    r = allocate([100, 500, 200, 300, 600], [212, 417, 112, 426], "best")
    assert [a["block"] for a in r["allocations"]] == [3, 1, 2, 4]
def test_worst_fit():
    r = allocate([100, 500, 200, 300, 600], [212, 417, 112, 426], "worst")
    assert r["unallocated"] == [3]
def test_banker_textbook():
    a = [[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]]; m = [[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]]
    r = banker([3,3,2], a, m); assert r["safe"] and r["safe_sequence"] == ["P1","P3","P4","P0","P2"]
def test_deadlock():
    assert detect([0], [[1],[1]], [[1],[1]])["deadlocked"] == ["P0", "P1"]

def test_process_manager_transitions():
    virtual_pm.reset()
    procs = virtual_pm.list_all()
    assert len(procs) == 5
    # Create new process
    p = virtual_pm.create("user_app", 1, 8192)
    pid = p["pid"]
    assert p["state"] == "Ready"
    # Dispatch
    p = virtual_pm.transition(pid, "dispatch")
    assert p["state"] == "Running"
    # Block on I/O
    p = virtual_pm.transition(pid, "block")
    assert p["state"] == "Waiting"
    # Wake
    p = virtual_pm.transition(pid, "wake")
    assert p["state"] == "Ready"
    # Terminate
    p = virtual_pm.transition(pid, "terminate")
    assert p["state"] == "Terminated"

def test_virtual_fs_operations():
    virtual_fs.reset()
    root_items = virtual_fs.list_dir("root")
    names = [x["name"] for x in root_items]
    assert "home" in names
    assert "Trash" in names

    # Create folder and file
    new_dir = virtual_fs.create("Projects", parent_id="home", is_folder=True)
    assert new_dir["is_folder"] is True
    file_node = virtual_fs.create("main.py", parent_id=new_dir["id"], is_folder=False, content="print('hello')")
    assert file_node["size"] == len("print('hello')".encode("utf-8"))

    # Read file
    content_res = virtual_fs.read_file(file_node["id"])
    assert content_res["content"] == "print('hello')"

    # Rename file
    renamed = virtual_fs.rename(file_node["id"], "app.py")
    assert renamed["name"] == "app.py"

    # Delete folder
    deleted = virtual_fs.delete(new_dir["id"])
    assert deleted is True
    assert virtual_fs.get_node(file_node["id"]) is None

def test_virtual_fs_rbac_permissions():
    import pytest
    virtual_fs.reset()
    # Student creates a file
    node = virtual_fs.create("student_note.txt", parent_id="home", is_folder=False, content="my note", active_role="standard")
    assert node["name"] == "student_note.txt"

    # Guest attempt to write or create should fail with PermissionError (403)
    with pytest.raises(PermissionError):
        virtual_fs.create("guest_hack.sh", parent_id="home", is_folder=False, active_role="restricted")

    with pytest.raises(PermissionError):
        virtual_fs.delete(node["id"], active_role="restricted")

def test_process_snapshot_returns_names():
    from app.main import process_snapshot
    procs = process_snapshot(limit=20)
    assert isinstance(procs, list)
    assert len(procs) > 0
    for p in procs:
        assert p["name"] is not None
        assert isinstance(p["name"], str)
        assert len(p["name"].strip()) > 0
        assert isinstance(p["pid"], int)
        assert isinstance(p["cpu_percent"], (int, float))
        assert isinstance(p["memory_percent"], (int, float))
        assert isinstance(p["status"], str)
        assert p["source"] == "real-windows"

def test_process_snapshot_sorted_and_limited():
    from app.main import process_snapshot
    limit = 3
    procs = process_snapshot(limit=limit)
    assert len(procs) <= limit
    mems = [p["memory_percent"] for p in procs]
    assert mems == sorted(mems, reverse=True)

def test_process_snapshot_access_denied_handled(monkeypatch):
    import psutil
    from app.main import process_snapshot

    class MockProcessDenied:
        pid = 8888
        @property
        def info(self):
            raise psutil.AccessDenied()

    class MockProcessNoneName:
        pid = 9999
        @property
        def info(self):
            return {
                "pid": 9999,
                "name": None,
                "status": "running",
                "cpu_percent": 0.5,
                "memory_percent": 3.2,
                "username": None
            }

    class MockProcessNormal:
        pid = 7777
        @property
        def info(self):
            return {
                "pid": 7777,
                "name": "explorer.exe",
                "status": "running",
                "cpu_percent": 1.2,
                "memory_percent": 5.0,
                "username": "User"
            }

    def mock_process_iter(attrs=None):
        return [MockProcessDenied(), MockProcessNoneName(), MockProcessNormal()]

    monkeypatch.setattr(psutil, "process_iter", mock_process_iter)
    result = process_snapshot(limit=10)

    assert len(result) == 3
    for p in result:
        assert p["name"] is not None
        assert p["name"] != ""
    
    names = [p["name"] for p in result]
    assert "System process (access denied)" in names
    assert "explorer.exe" in names
    # Verify sorting
    assert result[0]["memory_percent"] >= result[1]["memory_percent"] >= result[2]["memory_percent"]

def test_ai_context_contains_processes():
    from app.main import build_ai_context
    from app.ai import generate_ai_response

    ctx = build_ai_context("what processes are currently running?")
    assert "windows_processes" in ctx
    assert len(ctx["windows_processes"]) > 0

    first_proc_name = ctx["windows_processes"][0]["name"]
    assert first_proc_name is not None and len(first_proc_name) > 0

    # Ensure AI formats response using this context
    ai_reply = generate_ai_response("what processes are currently running?", ctx)
    assert "Active Running Processes" in ai_reply
    assert "real-windows" in ai_reply
    assert str(ctx["windows_processes"][0]["pid"]) in ai_reply



