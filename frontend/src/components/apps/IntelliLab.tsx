import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Plus,
  Trash2,
  Cpu,
  Layers,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  X,
} from "lucide-react";

const API = "http://localhost:8000/api";

const COLORS = [
  "#f87171",
  "#fbbf24",
  "#34d399",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#38bdf8",
  "#fb923c",
];

interface ProcessInput {
  pid: string;
  arrival: number;
  burst: number;
  priority: number;
}

interface ScheduleResult {
  source: string;
  gantt: Array<{ pid: string; start: number; end: number }>;
  processes: Array<{
    pid: string;
    completion: number;
    turnaround: number;
    waiting: number;
    response: number;
  }>;
  avg_turnaround: number;
  avg_waiting: number;
  avg_response: number;
  cpu_utilization: number;
  throughput: number;
  context_switches: number;
}

interface MemoryStrategyResult {
  strategy: string;
  allocations: Array<{
    process: number;
    block: number | null;
    size?: number;
    internal_fragmentation?: number;
  }>;
  internal_fragmentation: number;
  unused_blocks_total: number;
  unallocated: number[];
}

interface MemoryResponse {
  source: string;
  results: MemoryStrategyResult[];
}

interface BankerResult {
  safe: boolean;
  safe_sequence: string[];
  need: number[][];
  stuck: string[];
}

interface DeadlockResponse {
  source: string;
  banker?: BankerResult;
  detection?: {
    deadlock: boolean;
    deadlocked: string[];
  };
}

export const IntelliLab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"cpu" | "memory" | "deadlock">("cpu");

  // -------------------------------------------------------------
  // TAB 1: CPU SCHEDULING STATE
  // -------------------------------------------------------------
  const [algo, setAlgo] = useState("rr");
  const [quantum, setQuantum] = useState(2);
  const [processes, setProcesses] = useState<ProcessInput[]>([
    { pid: "P1", arrival: 0, burst: 5, priority: 2 },
    { pid: "P2", arrival: 1, burst: 3, priority: 1 },
    { pid: "P3", arrival: 2, burst: 8, priority: 3 },
    { pid: "P4", arrival: 3, burst: 2, priority: 4 },
  ]);
  const [schedResult, setSchedResult] = useState<ScheduleResult | null>(null);
  const [schedLoading, setSchedLoading] = useState(false);
  const [schedError, setSchedError] = useState("");

  // Gantt Chart step-by-step player state
  const [playhead, setPlayhead] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playTimerRef = useRef<number | null>(null);

  // -------------------------------------------------------------
  // TAB 2: MEMORY ALLOCATION STATE
  // -------------------------------------------------------------
  const [blocksInput, setBlocksInput] = useState("100, 500, 200, 300, 600");
  const [procsInput, setProcsInput] = useState("212, 417, 112, 426");
  const [memResult, setMemResult] = useState<MemoryResponse | null>(null);
  const [memLoading, setMemLoading] = useState(false);
  const [memError, setMemError] = useState("");

  // -------------------------------------------------------------
  // TAB 3: DEADLOCK (BANKER'S ALGORITHM) STATE
  // -------------------------------------------------------------
  const [availInput, setAvailInput] = useState("3, 3, 2");
  const [allocInput, setAllocInput] = useState("0,1,0\n2,0,0\n3,0,2\n2,1,1\n0,0,2");
  const [maxInput, setMaxInput] = useState("7,5,3\n3,2,2\n9,0,2\n2,2,2\n4,3,3");
  const [dlResult, setDlResult] = useState<DeadlockResponse | null>(null);
  const [dlLoading, setDlLoading] = useState(false);
  const [dlError, setDlError] = useState("");

  // AI Explanation State
  const [aiModalContent, setAiModalContent] = useState<string | null>(null);
  const [aiModalLoading, setAiModalLoading] = useState(false);
  const [aiModalTitle, setAiModalTitle] = useState("");
  const [aiCopied, setAiCopied] = useState(false);

  const handleExplainScheduling = async () => {
    if (!schedResult) return;
    setAiModalTitle(`AI Breakdown: ${algo.toUpperCase()} CPU Scheduling`);
    setAiModalLoading(true);
    setAiModalContent(null);
    try {
      const res = await fetch(`${API}/ai/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Explain ${algo.toUpperCase()} scheduling results with avg waiting time ${schedResult.avg_waiting.toFixed(2)} ms`,
          context: {
            kind: "scheduling",
            algo,
            avg_waiting: schedResult.avg_waiting,
            avg_turnaround: schedResult.avg_turnaround,
            cpu_utilization: schedResult.cpu_utilization,
            context_switches: schedResult.context_switches,
            quantum: algo === "rr" ? quantum : undefined,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiModalContent(data.explanation || data.reply);
      }
    } catch {
      setAiModalContent("Could not connect to AI backend.");
    } finally {
      setAiModalLoading(false);
    }
  };

  const handleExplainMemory = async () => {
    if (!memResult) return;
    setAiModalTitle("AI Breakdown: Contiguous Memory Allocation");
    setAiModalLoading(true);
    setAiModalContent(null);
    try {
      const res = await fetch(`${API}/ai/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Explain First Fit vs Best Fit vs Worst Fit memory allocation",
          context: {
            kind: "memory",
            results: memResult.results,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiModalContent(data.explanation || data.reply);
      }
    } catch {
      setAiModalContent("Could not connect to AI backend.");
    } finally {
      setAiModalLoading(false);
    }
  };

  const handleExplainDeadlock = async () => {
    if (!dlResult || !dlResult.banker) return;
    setAiModalTitle("AI Breakdown: Deadlock & Banker's Algorithm");
    setAiModalLoading(true);
    setAiModalContent(null);
    try {
      const res = await fetch(`${API}/ai/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Explain Banker's Algorithm safety evaluation",
          context: {
            kind: "deadlock",
            safe: dlResult.banker.safe,
            safe_sequence: dlResult.banker.safe_sequence || [],
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiModalContent(data.explanation || data.reply);
      }
    } catch {
      setAiModalContent("Could not connect to AI backend.");
    } finally {
      setAiModalLoading(false);
    }
  };

  // =============================================================
  // CPU SCHEDULING LOGIC
  // =============================================================
  const handleAddProcess = () => {
    const nextPid = `P${processes.length + 1}`;
    setProcesses([
      ...processes,
      { pid: nextPid, arrival: processes.length, burst: 4, priority: 1 },
    ]);
  };

  const handleRemoveProcess = (idx: number) => {
    if (processes.length <= 1) return;
    setProcesses(processes.filter((_, i) => i !== idx));
  };

  const handleProcessChange = (
    idx: number,
    field: keyof ProcessInput,
    val: string | number
  ) => {
    const next = [...processes];
    next[idx] = { ...next[idx], [field]: val };
    setProcesses(next);
  };

  const loadCpuPreset = (type: "standard" | "priority" | "short") => {
    if (type === "standard") {
      setProcesses([
        { pid: "P1", arrival: 0, burst: 5, priority: 2 },
        { pid: "P2", arrival: 1, burst: 3, priority: 1 },
        { pid: "P3", arrival: 2, burst: 8, priority: 3 },
        { pid: "P4", arrival: 3, burst: 2, priority: 4 },
      ]);
    } else if (type === "priority") {
      setProcesses([
        { pid: "P1", arrival: 0, burst: 4, priority: 3 },
        { pid: "P2", arrival: 1, burst: 5, priority: 1 },
        { pid: "P3", arrival: 2, burst: 2, priority: 2 },
      ]);
    } else {
      setProcesses([
        { pid: "P1", arrival: 0, burst: 2, priority: 1 },
        { pid: "P2", arrival: 1, burst: 1, priority: 1 },
        { pid: "P3", arrival: 2, burst: 3, priority: 1 },
      ]);
    }
  };

  const runSchedule = async () => {
    setSchedLoading(true);
    setSchedError("");
    setIsPlaying(false);
    try {
      const res = await fetch(`${API}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          algo,
          processes: processes.map((p) => ({
            pid: p.pid,
            arrival: Number(p.arrival),
            burst: Number(p.burst),
            priority: Number(p.priority),
          })),
          quantum: Number(quantum),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Simulation failed");
      }

      const data: ScheduleResult = await res.json();
      setSchedResult(data);
      const totalTime = data.gantt.length > 0 ? data.gantt[data.gantt.length - 1].end : 0;
      setPlayhead(totalTime); // default to full view
    } catch (err: any) {
      setSchedError(err.message || "Backend unreachable. Ensure Uvicorn is running.");
    } finally {
      setSchedLoading(false);
    }
  };

  // Gantt Playhead Animation loop
  useEffect(() => {
    if (isPlaying && schedResult) {
      const totalTime = schedResult.gantt[schedResult.gantt.length - 1]?.end || 0;
      playTimerRef.current = window.setInterval(() => {
        setPlayhead((prev) => {
          if (prev >= totalTime) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 700);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, schedResult]);

  // Determine which processes are currently in Ready, Running, and Terminated at current playhead time
  const getQueueStatesAtTime = (time: number) => {
    if (!schedResult) return { running: null, ready: [], terminated: [] };

    // Find who is executing at time
    let currentPid: string | null = null;
    for (const seg of schedResult.gantt) {
      if (time > seg.start && time <= seg.end) {
        currentPid = seg.pid;
        break;
      }
    }

    const terminated: string[] = [];
    const ready: string[] = [];

    schedResult.processes.forEach((p) => {
      if (p.completion <= time) {
        terminated.push(p.pid);
      } else {
        const procInput = processes.find((item) => item.pid === p.pid);
        const arrival = procInput ? procInput.arrival : 0;
        if (arrival <= time && p.pid !== currentPid) {
          ready.push(p.pid);
        }
      }
    });

    return { running: currentPid, ready, terminated };
  };

  const queueState = getQueueStatesAtTime(playhead);

  // =============================================================
  // MEMORY ALLOCATION LOGIC
  // =============================================================
  const runMemory = async () => {
    setMemLoading(true);
    setMemError("");
    try {
      const blocks = blocksInput
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));
      const procs = procsInput
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

      if (blocks.length === 0 || procs.length === 0) {
        throw new Error("Please enter valid comma-separated numbers for blocks and processes.");
      }

      const res = await fetch(`${API}/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks, processes: procs }),
      });

      if (!res.ok) throw new Error("Memory allocation simulation failed.");
      const data: MemoryResponse = await res.json();
      setMemResult(data);
    } catch (err: any) {
      setMemError(err.message || "Failed to run memory simulation.");
    } finally {
      setMemLoading(false);
    }
  };

  // =============================================================
  // DEADLOCK / BANKER'S ALGORITHM LOGIC
  // =============================================================
  const runDeadlock = async () => {
    setDlLoading(true);
    setDlError("");
    try {
      const available = availInput
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

      const allocation = allocInput
        .trim()
        .split("\n")
        .map((row) =>
          row
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !isNaN(n))
        );

      const max = maxInput
        .trim()
        .split("\n")
        .map((row) =>
          row
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !isNaN(n))
        );

      const res = await fetch(`${API}/deadlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available, allocation, max }),
      });

      if (!res.ok) throw new Error("Banker's Algorithm computation failed.");
      const data: DeadlockResponse = await res.json();
      setDlResult(data);
    } catch (err: any) {
      setDlError(err.message || "Failed to calculate deadlock state.");
    } finally {
      setDlLoading(false);
    }
  };

  return (
    <div className="intellilab-container">
      {/* Top Tab Bar */}
      <div className="lab-tabs-bar">
        <button
          className={`lab-tab-btn ${activeTab === "cpu" ? "active" : ""}`}
          onClick={() => setActiveTab("cpu")}
        >
          <Cpu size={15} />
          <span>CPU Scheduling</span>
        </button>

        <button
          className={`lab-tab-btn ${activeTab === "memory" ? "active" : ""}`}
          onClick={() => setActiveTab("memory")}
        >
          <Layers size={15} />
          <span>Memory Allocation</span>
        </button>

        <button
          className={`lab-tab-btn ${activeTab === "deadlock" ? "active" : ""}`}
          onClick={() => setActiveTab("deadlock")}
        >
          <ShieldAlert size={15} />
          <span>Deadlock & Banker's</span>
        </button>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <span className="badge badge-simulated">Virtual OS Simulator</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CPU SCHEDULING VIEW                                */}
      {/* ========================================================= */}
      {activeTab === "cpu" && (
        <div className="lab-content-scroll">
          {/* Algorithm Controls & Presets */}
          <div className="lab-panel">
            <div className="lab-panel-header">
              <span className="panel-title">Scheduling Configuration</span>
              <div className="preset-buttons">
                <span className="preset-label">Presets:</span>
                <button onClick={() => loadCpuPreset("standard")}>Textbook Standard</button>
                <button onClick={() => loadCpuPreset("priority")}>Priority Heavy</button>
                <button onClick={() => loadCpuPreset("short")}>Short Bursts</button>
              </div>
            </div>

            <div className="lab-config-row">
              <div className="config-item">
                <label>Algorithm</label>
                <select value={algo} onChange={(e) => setAlgo(e.target.value)}>
                  <option value="fcfs">FCFS (First Come First Serve)</option>
                  <option value="sjf">SJF (Shortest Job First - Non Preemptive)</option>
                  <option value="srtf">SRTF (Shortest Remaining Time First)</option>
                  <option value="priority">Priority (Non-Preemptive)</option>
                  <option value="priority_p">Priority (Preemptive)</option>
                  <option value="rr">Round Robin (RR)</option>
                </select>
              </div>

              {algo === "rr" && (
                <div className="config-item">
                  <label>Time Quantum (q = {quantum})</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={quantum}
                      onChange={(e) => setQuantum(Number(e.target.value))}
                      style={{ width: 100 }}
                    />
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={quantum}
                      onChange={(e) => setQuantum(Number(e.target.value))}
                      style={{ width: 50, textAlign: "center" }}
                    />
                  </div>
                </div>
              )}

              <button className="primary lab-run-btn" onClick={runSchedule} disabled={schedLoading}>
                <Play size={14} /> {schedLoading ? "Computing..." : "Run Simulation"}
              </button>
            </div>
          </div>

          {/* Process Table Input */}
          <div className="lab-panel">
            <div className="lab-panel-header">
              <span className="panel-title">Process Workload Table</span>
              <button className="add-proc-btn" onClick={handleAddProcess}>
                <Plus size={13} /> Add Process
              </button>
            </div>

            <div className="proc-table-wrapper">
              <table className="proc-input-table">
                <thead>
                  <tr>
                    <th>Process</th>
                    <th>Arrival Time (AT)</th>
                    <th>Burst Time (BT)</th>
                    <th>Priority (Lower = Higher)</th>
                    <th style={{ width: 40 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map((p, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          type="text"
                          value={p.pid}
                          onChange={(e) => handleProcessChange(idx, "pid", e.target.value)}
                          style={{ width: 70, textAlign: "center", fontWeight: 600 }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={p.arrival}
                          onChange={(e) => handleProcessChange(idx, "arrival", Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={p.burst}
                          onChange={(e) => handleProcessChange(idx, "burst", Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={p.priority}
                          onChange={(e) => handleProcessChange(idx, "priority", Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <button
                          className="proc-del-btn"
                          title="Delete Process"
                          onClick={() => handleRemoveProcess(idx)}
                          disabled={processes.length <= 1}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {schedError && <div className="lab-error-banner">{schedError}</div>}

          {/* Simulation Results & Animated Gantt */}
          {schedResult && (
            <div className="lab-panel results-panel">
              <div className="lab-panel-header">
                <span className="panel-title">Animated Execution Timeline (Gantt Chart)</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button className="explain-ai-btn" onClick={handleExplainScheduling} title="Get comprehensive AI explanation of these scheduling metrics">
                    <Sparkles size={13} /> Explain with AI
                  </button>
                  {/* Gantt Playback Controls */}
                  <div className="gantt-playback-controls">
                  <button
                    className="playback-btn"
                    title={isPlaying ? "Pause" : "Play step-by-step"}
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                  </button>
                  <button
                    className="playback-btn"
                    title="Step Forward (+1 Time)"
                    onClick={() => {
                      setIsPlaying(false);
                      const maxT = schedResult.gantt[schedResult.gantt.length - 1]?.end || 0;
                      setPlayhead((prev) => Math.min(maxT, prev + 1));
                    }}
                  >
                    <SkipForward size={13} />
                  </button>
                  <button
                    className="playback-btn"
                    title="Reset to 0"
                    onClick={() => {
                      setIsPlaying(false);
                      setPlayhead(0);
                    }}
                  >
                    <RotateCcw size={13} />
                  </button>
                  <span className="time-indicator">
                    CPU Time: <b>{playhead}</b>
                  </span>
                </div>
              </div>
              </div>

              {/* Ready Queue live visualization */}
              <div className="queue-status-strip">
                <div className="queue-group">
                  <span className="queue-label">RUNNING:</span>
                  {queueState.running ? (
                    <span className="proc-chip running">{queueState.running}</span>
                  ) : (
                    <span className="proc-chip idle">IDLE</span>
                  )}
                </div>

                <div className="queue-group">
                  <span className="queue-label">READY QUEUE:</span>
                  {queueState.ready.length > 0 ? (
                    queueState.ready.map((p) => (
                      <span key={p} className="proc-chip ready">
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="queue-empty">Empty</span>
                  )}
                </div>

                <div className="queue-group">
                  <span className="queue-label">TERMINATED:</span>
                  {queueState.terminated.length > 0 ? (
                    queueState.terminated.map((p) => (
                      <span key={p} className="proc-chip terminated">
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="queue-empty">None</span>
                  )}
                </div>
              </div>

              {/* Animated Gantt Bar */}
              <div className="gantt-container">
                <div className="gantt-bar">
                  {schedResult.gantt.map((seg, i) => {
                    const visible = seg.start < playhead;
                    const visibleEnd = Math.min(seg.end, playhead);
                    const visibleSpan = Math.max(0, visibleEnd - seg.start);
                    const colorIdx =
                      seg.pid === "IDLE"
                        ? -1
                        : parseInt(seg.pid.replace(/\D/g, ""), 10) || i;

                    return (
                      <div
                        key={i}
                        className={`gantt-segment ${seg.pid === "IDLE" ? "idle" : ""}`}
                        style={{
                          flex: visible ? visibleSpan : seg.end - seg.start,
                          background:
                            seg.pid === "IDLE"
                              ? "rgba(100, 116, 139, 0.2)"
                              : COLORS[colorIdx % COLORS.length],
                          opacity: visible ? 1 : 0.25,
                        }}
                      >
                        <span className="seg-pid">{seg.pid}</span>
                        <span className="seg-times">
                          {seg.start}–{seg.end}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Metrics Summary Cards */}
              <div className="metrics-grid">
                <div className="metric-box">
                  <span className="metric-title">Avg Turnaround Time</span>
                  <span className="metric-val">{schedResult.avg_turnaround.toFixed(2)} ms</span>
                </div>
                <div className="metric-box">
                  <span className="metric-title">Avg Waiting Time</span>
                  <span className="metric-val">{schedResult.avg_waiting.toFixed(2)} ms</span>
                </div>
                <div className="metric-box">
                  <span className="metric-title">CPU Utilization</span>
                  <span className="metric-val">{schedResult.cpu_utilization.toFixed(1)}%</span>
                </div>
                <div className="metric-box">
                  <span className="metric-title">Context Switches</span>
                  <span className="metric-val">{schedResult.context_switches}</span>
                </div>
              </div>

              {/* Process Performance Metrics Table */}
              <table className="results-table">
                <thead>
                  <tr>
                    <th>PID</th>
                    <th>Completion (CT)</th>
                    <th>Turnaround (TAT)</th>
                    <th>Waiting (WT)</th>
                    <th>Response (RT)</th>
                  </tr>
                </thead>
                <tbody>
                  {schedResult.processes.map((p) => (
                    <tr key={p.pid}>
                      <td>
                        <b>{p.pid}</b>
                      </td>
                      <td>{p.completion} ms</td>
                      <td>{p.turnaround} ms</td>
                      <td>{p.waiting} ms</td>
                      <td>{p.response} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MEMORY ALLOCATION (FIRST / BEST / WORST FIT)        */}
      {/* ========================================================= */}
      {activeTab === "memory" && (
        <div className="lab-content-scroll">
          <div className="lab-panel">
            <div className="lab-panel-header">
              <span className="panel-title">Contiguous Memory Allocation Inputs</span>
            </div>
            <div className="lab-config-row" style={{ flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 16, width: "100%", flexWrap: "wrap" }}>
                <div className="config-item" style={{ flex: 1, minWidth: 240 }}>
                  <label>Memory Block Sizes (KB, comma-separated)</label>
                  <input
                    type="text"
                    value={blocksInput}
                    onChange={(e) => setBlocksInput(e.target.value)}
                    placeholder="100, 500, 200, 300, 600"
                    style={{ width: "100%" }}
                  />
                </div>
                <div className="config-item" style={{ flex: 1, minWidth: 240 }}>
                  <label>Process Request Sizes (KB, comma-separated)</label>
                  <input
                    type="text"
                    value={procsInput}
                    onChange={(e) => setProcsInput(e.target.value)}
                    placeholder="212, 417, 112, 426"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <button className="primary lab-run-btn" onClick={runMemory} disabled={memLoading}>
                <Layers size={14} /> {memLoading ? "Allocating..." : "Compare Strategies"}
              </button>
            </div>
          </div>

          {memError && <div className="lab-error-banner">{memError}</div>}

          {/* Strategy Comparison Results */}
          {memResult && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <button className="explain-ai-btn" onClick={handleExplainMemory} title="Get AI breakdown of First Fit vs Best Fit vs Worst Fit">
                  <Sparkles size={13} /> Explain Memory Allocation with AI
                </button>
              </div>
              <div className="memory-comparison-grid">
              {memResult.results.map((res) => {
                const isBest =
                  res.unallocated.length === 0 &&
                  res.internal_fragmentation ===
                    Math.min(...memResult.results.map((r) => r.internal_fragmentation));

                return (
                  <div
                    key={res.strategy}
                    className={`lab-panel memory-strategy-card ${isBest ? "best-strategy" : ""}`}
                  >
                    <div className="lab-panel-header">
                      <span className="panel-title" style={{ textTransform: "capitalize" }}>
                        {res.strategy} Fit Strategy
                      </span>
                      {isBest && <span className="best-tag">Optimal</span>}
                    </div>

                    <div className="memory-metrics-strip">
                      <div>
                        <span>Internal Frag:</span> <b>{res.internal_fragmentation} KB</b>
                      </div>
                      <div>
                        <span>Unallocated:</span>{" "}
                        <b style={{ color: res.unallocated.length > 0 ? "#ef4444" : "#10b981" }}>
                          {res.unallocated.length > 0
                            ? res.unallocated.map((p) => `P${p}`).join(", ")
                            : "None (All Fitted)"}
                        </b>
                      </div>
                    </div>

                    {/* Visual Memory Blocks */}
                    <div className="memory-blocks-viz">
                      {res.allocations.map((a, idx) => {
                        const isAllocated = a.block !== null;
                        return (
                          <div
                            key={idx}
                            className={`mem-block-item ${isAllocated ? "allocated" : "unallocated"}`}
                          >
                            <div className="mem-block-header">
                              <span>Process P{a.process}</span>
                              <span>{a.size ? `${a.size} KB` : "Waiting"}</span>
                            </div>
                            <div className="mem-block-bar">
                              {isAllocated ? (
                                <>
                                  <div
                                    className="mem-fill"
                                    style={{
                                      background: COLORS[a.process % COLORS.length],
                                      flex: a.size,
                                    }}
                                  >
                                    Allocated in Block {a.block}
                                  </div>
                                  {a.internal_fragmentation && a.internal_fragmentation > 0 ? (
                                    <div
                                      className="mem-frag"
                                      style={{ flex: a.internal_fragmentation }}
                                    >
                                      Frag: {a.internal_fragmentation} KB
                                    </div>
                                  ) : null}
                                </>
                              ) : (
                                <div className="mem-unfit">Unallocated (No block large enough)</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: DEADLOCK & BANKER'S ALGORITHM                      */}
      {/* ========================================================= */}
      {activeTab === "deadlock" && (
        <div className="lab-content-scroll">
          <div className="lab-panel">
            <div className="lab-panel-header">
              <span className="panel-title">Dijkstra's Banker's Algorithm Inputs</span>
            </div>
            <div className="lab-config-row" style={{ flexDirection: "column", gap: 14 }}>
              <div className="config-item" style={{ width: "100%" }}>
                <label>Available Resource Vector (e.g. R1, R2, R3)</label>
                <input
                  type="text"
                  value={availInput}
                  onChange={(e) => setAvailInput(e.target.value)}
                  placeholder="3, 3, 2"
                />
              </div>

              <div style={{ display: "flex", gap: 16, width: "100%", flexWrap: "wrap" }}>
                <div className="config-item" style={{ flex: 1, minWidth: 220 }}>
                  <label>Allocation Matrix (One process per line)</label>
                  <textarea
                    rows={5}
                    value={allocInput}
                    onChange={(e) => setAllocInput(e.target.value)}
                    className="matrix-textarea"
                  />
                </div>
                <div className="config-item" style={{ flex: 1, minWidth: 220 }}>
                  <label>Max Demand Matrix (One process per line)</label>
                  <textarea
                    rows={5}
                    value={maxInput}
                    onChange={(e) => setMaxInput(e.target.value)}
                    className="matrix-textarea"
                  />
                </div>
              </div>

              <button className="primary lab-run-btn" onClick={runDeadlock} disabled={dlLoading}>
                <ShieldAlert size={14} /> {dlLoading ? "Verifying Safety..." : "Run Banker's Safety Algorithm"}
              </button>
            </div>
          </div>

          {dlError && <div className="lab-error-banner">{dlError}</div>}

          {/* Banker's Safety Results */}
          {dlResult?.banker && (
            <div className="lab-panel results-panel">
              <div className="lab-panel-header">
                <span className="panel-title">System State & Safety Evaluation</span>
                <button
                  className="explain-ai-btn"
                  onClick={handleExplainDeadlock}
                  title="Get AI evaluation of safe state & Coffman conditions"
                >
                  <Sparkles size={13} /> Explain Safety State with AI
                </button>
              </div>

              {dlResult.banker.safe ? (
                <div className="safe-state-box">
                  <CheckCircle2 size={24} style={{ color: "#10b981" }} />
                  <div>
                    <h4>SAFE STATE: No Deadlock Possible</h4>
                    <p>
                      The system can safely allocate resources to all processes without entering a deadlocked state.
                    </p>
                    <div className="safe-sequence-flow">
                      <span className="seq-label">Safe Execution Sequence:</span>
                      {dlResult.banker.safe_sequence.map((pid, idx) => (
                        <React.Fragment key={pid}>
                          <span className="seq-node">{pid}</span>
                          {idx < dlResult.banker!.safe_sequence.length - 1 && (
                            <span className="seq-arrow">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="unsafe-state-box">
                  <AlertTriangle size={24} style={{ color: "#ef4444" }} />
                  <div>
                    <h4>DEADLOCK / UNSAFE STATE</h4>
                    <p>
                      The system cannot satisfy the remaining resource requests. Deadlocked or stalled processes:
                    </p>
                    <div className="stuck-nodes">
                      {dlResult.banker.stuck.map((pid) => (
                        <span key={pid} className="stuck-chip">
                          {pid}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Need Matrix Table */}
              <div style={{ marginTop: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Computed Need Matrix (Max − Allocation)</span>
                <table className="results-table" style={{ marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th>Process</th>
                      {dlResult.banker.need[0]?.map((_, j) => (
                        <th key={j}>Resource R{j + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dlResult.banker.need.map((row, i) => (
                      <tr key={i}>
                        <td>
                          <b>P{i}</b>
                        </td>
                        {row.map((val, j) => (
                          <td key={j}>{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Explanation Modal */}
      {aiModalTitle && (
        <div className="task-modal-backdrop" onClick={() => setAiModalTitle("")}>
          <div
            className="task-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520 }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={16} style={{ color: "var(--accent)" }} />
                <span className="modal-title">{aiModalTitle}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setAiModalTitle("")}>
                <X size={15} />
              </button>
            </div>

            <div
              className="modal-body"
              style={{
                maxHeight: 380,
                overflowY: "auto",
                fontSize: 12.5,
                lineHeight: 1.6,
              }}
            >
              {aiModalLoading ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "24px 0",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                  }}
                >
                  <RotateCcw size={16} className="spin" />
                  <span>Analyzing simulation data with IntelliAI Tutor...</span>
                </div>
              ) : (
                <div>
                  {aiModalContent?.split("\n\n").map((para, pIdx) => (
                    <p key={pIdx} style={{ margin: "6px 0" }}>
                      {para.split("\n").map((line, lIdx) => (
                        <React.Fragment key={lIdx}>
                          {line.startsWith("### ") ? (
                            <span className="ai-heading">{line.replace("### ", "")}</span>
                          ) : line.startsWith("- ") ? (
                            <span className="ai-bullet">• {line.replace("- ", "")}</span>
                          ) : (
                            line
                          )}
                          {lIdx < para.split("\n").length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions">
              {aiModalContent && !aiModalLoading && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(aiModalContent);
                    setAiCopied(true);
                    setTimeout(() => setAiCopied(false), 2000);
                  }}
                >
                  {aiCopied ? "Copied to Clipboard!" : "Copy Explanation"}
                </button>
              )}
              <button className="primary" onClick={() => setAiModalTitle("")}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

