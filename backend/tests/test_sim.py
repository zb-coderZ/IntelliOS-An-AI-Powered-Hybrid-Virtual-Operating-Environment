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
    assert new_dir.is_folder is True
    file_node = virtual_fs.create("main.py", parent_id=new_dir.id, is_folder=False, content="print('hello')")
    assert file_node.size == len("print('hello')".encode("utf-8"))

    # Read file
    content_res = virtual_fs.read_file(file_node.id)
    assert content_res["content"] == "print('hello')"

    # Rename file
    renamed = virtual_fs.rename(file_node.id, "app.py")
    assert renamed.name == "app.py"

    # Delete folder
    deleted = virtual_fs.delete(new_dir.id)
    assert deleted is True
    assert virtual_fs.get_node(file_node.id) is None

