def banker(available, alloc, maxd):
    n, m = len(alloc), len(available)
    need = [[maxd[i][j] - alloc[i][j] for j in range(m)] for i in range(n)]
    work, done, seq = list(available), [False] * n, []
    progress = True
    while progress:
        progress = False
        for i in range(n):
            if not done[i] and all(need[i][j] <= work[j] for j in range(m)):
                work = [work[j] + alloc[i][j] for j in range(m)]
                done[i] = True; seq.append(f"P{i}"); progress = True
    return {"safe": all(done), "safe_sequence": seq if all(done) else [], "need": need,
            "stuck": [f"P{i}" for i in range(n) if not done[i]]}

def detect(available, alloc, request):
    """Deadlock detection with a request matrix. Deadlocked = processes that can never finish."""
    n, m = len(alloc), len(available)
    work, done = list(available), [all(x == 0 for x in alloc[i]) for i in range(n)]
    progress = True
    while progress:
        progress = False
        for i in range(n):
            if not done[i] and all(request[i][j] <= work[j] for j in range(m)):
                work = [work[j] + alloc[i][j] for j in range(m)]; done[i] = True; progress = True
    d = [f"P{i}" for i in range(n) if not done[i]]
    return {"deadlock": bool(d), "deadlocked": d}
