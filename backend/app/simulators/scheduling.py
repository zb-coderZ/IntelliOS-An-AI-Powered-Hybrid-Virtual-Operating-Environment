def schedule(procs, algo, quantum=2):
    """procs: list of dicts pid, arrival, burst, priority. algo: fcfs|sjf|srtf|priority|priority_p|rr"""
    rem = {p["pid"]: p["burst"] for p in procs}
    first, comp, gantt = {}, {}, []
    t, cur, qleft, queue, seen = 0, None, 0, [], set()
    by = {p["pid"]: p for p in procs}
    keys = {"fcfs": lambda p: (p["arrival"], p["pid"]), "sjf": lambda p: (p["burst"], p["arrival"], p["pid"]),
            "srtf": lambda p: (rem[p["pid"]], p["arrival"], p["pid"]),
            "priority": lambda p: (p["priority"], p["arrival"], p["pid"]),
            "priority_p": lambda p: (p["priority"], p["arrival"], p["pid"])}
    preemptive = algo in ("srtf", "priority_p")
    while len(comp) < len(procs):
        if algo == "rr":
            for p in sorted(procs, key=lambda p: (p["arrival"], p["pid"])):
                if p["arrival"] <= t and p["pid"] not in seen:
                    queue.append(p["pid"]); seen.add(p["pid"])
            if cur is not None and qleft == 0:
                queue.append(cur); cur = None
            if cur is None and queue:
                cur = queue.pop(0); qleft = quantum
        else:
            ready = [p for p in procs if p["arrival"] <= t and p["pid"] not in comp]
            if ready and (cur is None or preemptive):
                cur = min(ready, key=keys[algo])["pid"]
        if cur is None:
            gantt.append("IDLE"); t += 1; continue
        first.setdefault(cur, t)
        gantt.append(cur); rem[cur] -= 1; qleft -= 1; t += 1
        if rem[cur] == 0:
            comp[cur] = t; cur = None
    segs = []
    for i, g in enumerate(gantt):
        if segs and segs[-1]["pid"] == g: segs[-1]["end"] = i + 1
        else: segs.append({"pid": g, "start": i, "end": i + 1})
    rows = []
    for p in procs:
        ct = comp[p["pid"]]; tat = ct - p["arrival"]
        rows.append({"pid": p["pid"], "completion": ct, "turnaround": tat, "waiting": tat - p["burst"],
                     "response": first[p["pid"]] - p["arrival"]})
    n = len(procs); total = len(gantt); busy = sum(1 for g in gantt if g != "IDLE")
    run = [s["pid"] for s in segs if s["pid"] != "IDLE"]
    avg = lambda k: sum(r[k] for r in rows) / n
    return {"gantt": segs, "processes": rows, "avg_turnaround": avg("turnaround"), "avg_waiting": avg("waiting"),
            "avg_response": avg("response"), "cpu_utilization": 100 * busy / total, "throughput": n / total,
            "context_switches": sum(1 for a, b in zip(run, run[1:]) if a != b)}
