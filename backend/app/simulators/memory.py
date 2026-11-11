def allocate(blocks, procs, strategy):
    """blocks: list of sizes; procs: list of sizes. One process per block."""
    free = list(blocks); used = [False] * len(blocks); result = []
    for i, need in enumerate(procs):
        cands = [j for j in range(len(blocks)) if not used[j] and blocks[j] >= need]
        if not cands: result.append({"process": i, "block": None}); continue
        j = {"first": cands[0], "best": min(cands, key=lambda j: blocks[j]),
             "worst": max(cands, key=lambda j: blocks[j])}[strategy]
        used[j] = True; free[j] = blocks[j] - need
        result.append({"process": i, "block": j, "size": need, "internal_fragmentation": free[j]})
    unused = sum(blocks[j] for j in range(len(blocks)) if not used[j])
    return {"strategy": strategy, "allocations": result,
            "internal_fragmentation": sum(r.get("internal_fragmentation", 0) for r in result),
            "unused_blocks_total": unused,
            "unallocated": [r["process"] for r in result if r["block"] is None]}

def compare(blocks, procs):
    return [allocate(blocks, procs, s) for s in ("first", "best", "worst")]
