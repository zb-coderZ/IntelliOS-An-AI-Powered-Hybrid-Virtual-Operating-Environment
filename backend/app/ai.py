import os
import re
from typing import Optional, Dict, Any

# Simple, reliable .env parser without external network dependencies
def load_dotenv(dotenv_path: Optional[str] = None):
    if not dotenv_path:
        # Check backend/.env then root .env
        candidates = [
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
        ]
        for c in candidates:
            if os.path.exists(c):
                dotenv_path = c
                break

    if dotenv_path and os.path.isfile(dotenv_path):
        try:
            with open(dotenv_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass

load_dotenv()

def generate_ai_response(prompt: str, context: Optional[Dict[str, Any]] = None) -> str:
    """
    IntelliOS AI Assistant & Viva Tutor.
    Provides context-aware analysis of simulation results,
    memory allocations, deadlock safety sequences, and OS theory.
    """
    p_lower = prompt.lower()

    if context:
        kind = context.get("kind")
        if kind == "scheduling":
            algo = str(context.get("algo", "Unknown")).upper()
            avg_wt = float(context.get("avg_waiting", 0.0))
            avg_tat = float(context.get("avg_turnaround", 0.0))
            cpu_util = float(context.get("cpu_utilization", 100.0))
            ctx_switches = int(context.get("context_switches", 0))
            quantum = context.get("quantum")

            quantum_note = f"\n- **Time Quantum**: `{quantum} ms`" if quantum else ""
            return (
                f"### Analysis of CPU Scheduling ({algo})\n\n"
                f"- **Average Waiting Time**: `{avg_wt:.2f} ms`\n"
                f"- **Average Turnaround Time**: `{avg_tat:.2f} ms`\n"
                f"- **CPU Utilization**: `{cpu_util:.1f}%`\n"
                f"- **Context Switches**: `{ctx_switches}`"
                f"{quantum_note}\n\n"
                f"**Key Takeaways for Your Viva:**\n"
                f"1. **Execution Flow**: In {algo}, processes were dispatched sequentially according to arrival, burst times, and priority weights.\n"
                f"2. **Algorithm Trade-off**:\n"
                f"   - **Turnaround Time ($TAT = CT - AT$)**: Represents the total latency spent from submission to completion.\n"
                f"   - **Waiting Time ($WT = TAT - BT$)**: Total time spent sitting in the Ready Queue.\n"
                f"   - **Responsiveness**: "
                f"{'FCFS suffers from the Convoy Effect where CPU-intensive bursts delay I/O-bound jobs.' if algo == 'FCFS' else ''}"
                f"{'SJF provides the provably optimal minimum average waiting time for batch systems.' if algo == 'SJF' else ''}"
                f"{'Round Robin offers guaranteed bounded waiting time for interactive systems.' if algo == 'RR' else ''}"
                f"{'SRTF introduces preemption, ensuring newly arriving short processes run immediately.' if algo == 'SRTF' else ''}"
                f"{'Priority scheduling gives preferential dispatching to high-priority threads.' if 'PRIORITY' in algo else ''}\n"
                f"3. **Instructor Tip**: Mention that context-switch overhead must be factored into real kernels to avoid thrashing."
            )

        elif kind == "memory":
            best_strat = context.get("best_strategy", "Best Fit")
            return (
                f"### Contiguous Memory Allocation Analysis\n\n"
                f"- **Evaluated Strategies**: First Fit, Best Fit, Worst Fit\n"
                f"- **Optimal Performer**: `{best_strat}` (minimized wasted internal partition bytes)\n\n"
                f"**Viva Defense Breakdown:**\n"
                f"1. **First Fit**: Scans partition table from index 0 and assigns the first hole of size $\\ge$ process demand. Fastest ($O(N)$ lookup), but clutters early memory.\n"
                f"2. **Best Fit**: Searches the entire table to allocate the smallest hole that satisfies the process. Minimizes immediate block wastage, but leaves tiny, unusable slivers.\n"
                f"3. **Worst Fit**: Allocates the largest available hole. Preserves medium-sized holes, but rapidly fractures large contiguous spaces.\n"
                f"4. **Fragmentation Note**: All fixed-partition techniques suffer from **Internal Fragmentation** (slack inside allocated blocks). Modern OSes resolve this via **Paging** and virtual memory address translation."
            )

        elif kind == "deadlock":
            safe = context.get("safe", False)
            seq = context.get("safe_sequence", [])
            if safe:
                seq_str = " -> ".join(seq)
                return (
                    f"### Deadlock Evaluation: System in Safe State ✅\n\n"
                    f"- **Safe Execution Sequence**: `{seq_str}`\n\n"
                    f"**Why the System is Safe:**\n"
                    f"1. The Banker's Algorithm verified that the available vector `Work` satisfies the `Need` vector for `{seq[0]}`.\n"
                    f"2. When `{seq[0]}` terminates, its allocated resources return to the free pool ($Work = Work + Allocation$).\n"
                    f"3. All remaining processes can complete successively without entering a circular wait deadlock condition."
                )
            else:
                return (
                    f"### Deadlock Evaluation: System Unsafe / Deadlocked! ⚠️\n\n"
                    f"**Warning**: No safe execution sequence exists. The remaining available resource vector cannot fulfill the remaining maximum demands of any process.\n\n"
                    f"**Viva Note**: An unsafe state is not automatically a deadlock, but it guarantees that deadlock cannot be prevented if processes demand their maximum resources simultaneously."
                )

    # General Conceptual OS Queries
    if any(k in p_lower for k in ("deadlock", "coffman")):
        return (
            "### Deadlock and the 4 Coffman Conditions\n\n"
            "A deadlock occurs when concurrent processes are permanently blocked because each holds a resource while waiting for another.\n\n"
            "**The 4 Necessary & Sufficient Conditions:**\n"
            "1. **Mutual Exclusion**: Resources cannot be shared simultaneously.\n"
            "2. **Hold and Wait**: A process holds $\\ge 1$ resource while requesting others.\n"
            "3. **No Preemption**: Resources cannot be forcibly seized; only released voluntarily.\n"
            "4. **Circular Wait**: A closed chain of processes exists: $P_0 \\to P_1 \\to ... \\to P_0$.\n\n"
            "Invalidating any single condition prevents deadlock entirely."
        )
    elif any(k in p_lower for k in ("round robin", "quantum")):
        return (
            "### Round Robin (RR) Scheduling & Time Quantum Selection\n\n"
            "- **Mechanism**: Each ready process is assigned a fixed time slice ($q$). Preemption occurs via timer interrupt.\n"
            "- **Small Quantum ($q \\to 0$)**: Excessive context-switch overhead degrades CPU throughput.\n"
            "- **Large Quantum ($q \\to \\infty$)**: Degenerates into First-Come, First-Served (FCFS).\n"
            "- **Rule of Thumb**: $80\\%$ of CPU bursts should be shorter than the chosen time quantum."
        )
    elif any(k in p_lower for k in ("pcb", "process control block", "process state")):
        return (
            "### Process Control Block (PCB) & State Machine\n\n"
            "The PCB is the kernel data structure representing an active process:\n"
            "- **PID**: Unique process identifier.\n"
            "- **Program Counter (PC)**: Memory address of the next instruction to execute.\n"
            "- **CPU Registers**: Accumulator, stack pointer, index registers saved on context switch.\n"
            "- **Memory Info**: Base/limit registers, page table pointers.\n\n"
            "**5 Standard States**: `New` $\\to$ `Ready` $\\to$ `Running` $\\to$ `Waiting` $\\to$ `Terminated`."
        )
    elif any(k in p_lower for k in ("fragmentation", "paging", "virtual memory")):
        return (
            "### Memory Fragmentation: Internal vs External\n\n"
            "- **Internal Fragmentation**: Wasted space inside an allocated block.\n"
            "- **External Fragmentation**: Total free memory across disjoint holes is sufficient, but no single contiguous block is large enough.\n"
            "- **Solution**: Paging and non-contiguous virtual address translation."
        )
    elif any(k in p_lower for k in ("wsl", "hybrid", "architecture", "intellios")):
        return (
            "### IntelliOS Hybrid Architectural Model\n\n"
            "1. **Core OS Simulators**: Python-based deterministic algorithms implementing scheduling, memory partitioning, and Banker's deadlock safety.\n"
            "2. **Native Linux Execution**: Direct virtualization pass-through to Ubuntu 24.04 on WSL2 for real POSIX system calls and file commands.\n"
            "3. **Bare-Metal Telemetry**: Real-time Windows hardware monitoring via `psutil`, contrasting simulated abstract states with actual bare-metal thread performance."
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
