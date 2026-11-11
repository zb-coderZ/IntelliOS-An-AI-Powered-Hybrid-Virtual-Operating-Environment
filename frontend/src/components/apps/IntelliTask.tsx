import React, { useState, useEffect } from "react";
import {
  Cpu,
  Layers,
  Search,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Shield,
  Trash2,
  CheckCircle2,
  X,
  Server,
} from "lucide-react";

const API = "http://localhost:8000/api";

interface RealProcess {
  pid: number;
  name: string;
  memory_percent: number;
  cpu_percent: number;
  status: string;
  username: string;
  is_critical: boolean;
}

interface VirtualProcess {
  pid: string;
  name: string;
  priority: number;
  memory_kb: number;
  state: "New" | "Ready" | "Running" | "Waiting" | "Terminated";
  cpu_time: number;
  created_at: string;
}

export const IntelliTask: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"real" | "virtual">("real");

  // Real Processes State
  const [realProcs, setRealProcs] = useState<RealProcess[]>([]);
  const [realLoading, setRealLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [killModalTarget, setKillModalTarget] = useState<RealProcess | null>(null);
  const [actionMsg, setActionMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Virtual Processes State
  const [virtProcs, setVirtProcs] = useState<VirtualProcess[]>([]);
  const [virtLoading, setVirtLoading] = useState(false);
  const [newProcName, setNewProcName] = useState("");
  const [newProcPrio, setNewProcPrio] = useState(1);
  const [newProcMem, setNewProcMem] = useState(4096);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Fetch Real Processes
  const fetchRealProcesses = async () => {
    setRealLoading(true);
    try {
      const res = await fetch(`${API}/processes/real`);
      if (res.ok) {
        const data = await res.json();
        setRealProcs(data.processes || []);
      }
    } catch {
      // Backend not running
    } finally {
      setRealLoading(false);
    }
  };

  // Fetch Virtual Processes
  const fetchVirtualProcesses = async () => {
    setVirtLoading(true);
    try {
      const res = await fetch(`${API}/processes/virtual`);
      if (res.ok) {
        const data = await res.json();
        setVirtProcs(data.processes || []);
      }
    } catch {
      // Backend not running
    } finally {
      setVirtLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "real") {
      fetchRealProcesses();
      const interval = setInterval(fetchRealProcesses, 3000);
      return () => clearInterval(interval);
    } else {
      fetchVirtualProcesses();
    }
  }, [activeTab]);

  // Kill Real Process Handler
  const handleConfirmKill = async () => {
    if (!killModalTarget) return;
    const target = killModalTarget;
    setKillModalTarget(null);

    try {
      const res = await fetch(`${API}/processes/real/kill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid: target.pid }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionMsg({ text: data.detail || "Failed to terminate process.", error: true });
      } else {
        setActionMsg({ text: data.message || `Terminated PID ${target.pid}.` });
        fetchRealProcesses();
      }
    } catch {
      setActionMsg({ text: "Connection error: Unable to reach backend daemon.", error: true });
    }

    setTimeout(() => setActionMsg(null), 4000);
  };

  // Virtual Process Transitions
  const handleVirtTransition = async (pid: string, action: string) => {
    try {
      const res = await fetch(`${API}/processes/virtual/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid, action }),
      });

      if (res.ok) {
        fetchVirtualProcesses();
      }
    } catch {
      // Handle error
    }
  };

  // Create Virtual Process
  const handleCreateVirtual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProcName.trim()) return;

    try {
      const res = await fetch(`${API}/processes/virtual/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProcName.trim(),
          priority: Number(newProcPrio),
          memory_kb: Number(newProcMem),
        }),
      });

      if (res.ok) {
        setNewProcName("");
        setCreateModalOpen(false);
        fetchVirtualProcesses();
      }
    } catch {
      // Handle error
    }
  };

  // Reset Virtual Processes
  const handleResetVirtual = async () => {
    try {
      const res = await fetch(`${API}/processes/virtual/reset`, { method: "POST" });
      if (res.ok) fetchVirtualProcesses();
    } catch {
      // Handle error
    }
  };

  const filteredRealProcs = realProcs.filter((p) => {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || String(p.pid).includes(q);
  });

  return (
    <div className="intellitask-container">
      {/* Top Navigation Tabs */}
      <div className="task-tabs-bar">
        <button
          className={`task-tab-btn ${activeTab === "real" ? "active" : ""}`}
          onClick={() => setActiveTab("real")}
        >
          <Server size={14} />
          <span>Real Windows Processes ({realProcs.length})</span>
        </button>

        <button
          className={`task-tab-btn ${activeTab === "virtual" ? "active" : ""}`}
          onClick={() => setActiveTab("virtual")}
        >
          <Cpu size={14} />
          <span>Virtual OS PCB Simulator ({virtProcs.length})</span>
        </button>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <span className={`badge ${activeTab === "real" ? "badge-real-windows" : "badge-simulated"}`}>
            {activeTab === "real" ? "Source: Real Windows (psutil)" : "Source: Simulated PCB"}
          </span>
        </div>
      </div>

      {actionMsg && (
        <div className={`task-action-alert ${actionMsg.error ? "error" : "success"}`}>
          {actionMsg.error ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: REAL WINDOWS PROCESSES                             */}
      {/* ========================================================= */}
      {activeTab === "real" && (
        <div className="task-content-wrapper">
          <div className="task-filter-bar">
            <div className="task-search-box">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by process name or PID..."
                className="task-search-input"
              />
              {searchQuery && (
                <button className="clear-btn" onClick={() => setSearchQuery("")}>
                  <X size={13} />
                </button>
              )}
            </div>

            <button className="refresh-btn" onClick={fetchRealProcesses} disabled={realLoading}>
              <RotateCcw size={13} className={realLoading ? "spin" : ""} /> Refresh
            </button>
          </div>

          <div className="task-table-container">
            <table className="task-data-table">
              <thead>
                <tr>
                  <th style={{ width: 85 }}>PID</th>
                  <th>Process Name</th>
                  <th style={{ width: 140 }}>RAM Utilization</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 110, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRealProcs.map((p) => {
                  const mem = p.memory_percent;
                  return (
                    <tr key={p.pid} className="proc-row">
                      <td className="mono-cell">{p.pid}</td>
                      <td>
                        <div className="proc-name-cell">
                          <span className="p-name">{p.name}</span>
                          {p.is_critical && (
                            <span className="critical-badge" title="Critical System Process Protected">
                              <Shield size={10} /> Protected
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="mem-bar-cell">
                          <div className="table-bar">
                            <div
                              className="table-bar-fill"
                              style={{
                                width: `${Math.min(100, mem * 4)}%`,
                                background:
                                  mem > 5 ? "#ef4444" : mem > 2 ? "#f59e0b" : "#10b981",
                              }}
                            />
                          </div>
                          <span className="mono-text">{mem.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>
                        <span className="status-pill">{p.status}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {p.is_critical ? (
                          <span className="locked-action">Locked</span>
                        ) : (
                          <button
                            className="end-task-btn"
                            title="Terminate Process"
                            onClick={() => setKillModalTarget(p)}
                          >
                            End Task
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: VIRTUAL OS PROCESS MANAGER (PCB STATE MACHINE)     */}
      {/* ========================================================= */}
      {activeTab === "virtual" && (
        <div className="task-content-wrapper">
          <div className="task-filter-bar">
            <div className="pcb-legend">
              <span className="legend-title">PCB State Transitions:</span>
              <span className="legend-chip running">Running</span>
              <span className="legend-chip ready">Ready</span>
              <span className="legend-chip waiting">Waiting (I/O)</span>
              <span className="legend-chip terminated">Terminated</span>
            </div>

            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button className="primary" onClick={() => setCreateModalOpen(true)}>
                <Plus size={13} /> Spawn Process
              </button>
              <button onClick={handleResetVirtual}>
                <RotateCcw size={13} /> Reset
              </button>
            </div>
          </div>

          <div className="task-table-container">
            <table className="task-data-table">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Virtual PID</th>
                  <th>Process Name</th>
                  <th style={{ width: 80 }}>Priority</th>
                  <th style={{ width: 110 }}>Memory (KB)</th>
                  <th style={{ width: 90 }}>CPU Time</th>
                  <th style={{ width: 110 }}>Current State</th>
                  <th style={{ width: 230, textAlign: "right" }}>State Controls</th>
                </tr>
              </thead>
              <tbody>
                {virtProcs.map((p) => {
                  return (
                    <tr key={p.pid} className="proc-row">
                      <td className="mono-cell" style={{ color: "var(--accent)" }}>
                        {p.pid}
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td className="mono-cell">{p.priority}</td>
                      <td className="mono-cell">{p.memory_kb.toLocaleString()} KB</td>
                      <td className="mono-cell">{p.cpu_time} ms</td>
                      <td>
                        <span className={`pcb-state-badge ${p.state.toLowerCase()}`}>
                          {p.state}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="pcb-actions-row">
                          {p.state !== "Running" && p.state !== "Terminated" && (
                            <button
                              className="pcb-action-btn dispatch"
                              title="Dispatch to Running"
                              onClick={() => handleVirtTransition(p.pid, "dispatch")}
                            >
                              Dispatch
                            </button>
                          )}
                          {p.state === "Running" && (
                            <button
                              className="pcb-action-btn block"
                              title="Block on I/O"
                              onClick={() => handleVirtTransition(p.pid, "block")}
                            >
                              Block (I/O)
                            </button>
                          )}
                          {p.state === "Waiting" && (
                            <button
                              className="pcb-action-btn wake"
                              title="Wake to Ready Queue"
                              onClick={() => handleVirtTransition(p.pid, "wake")}
                            >
                              Wake
                            </button>
                          )}
                          {p.state !== "Terminated" && (
                            <button
                              className="pcb-action-btn terminate"
                              title="Terminate Process"
                              onClick={() => handleVirtTransition(p.pid, "terminate")}
                            >
                              Terminate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* KILL PROCESS CONFIRMATION MODAL                           */}
      {/* ========================================================= */}
      {killModalTarget && (
        <div className="task-modal-backdrop" onClick={() => setKillModalTarget(null)}>
          <div className="task-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <AlertTriangle size={20} style={{ color: "#ef4444" }} />
                <span className="modal-title">Terminate Real Process?</span>
              </div>
              <button className="modal-close-btn" onClick={() => setKillModalTarget(null)}>
                <X size={15} />
              </button>
            </div>

            <div className="modal-body">
              <p>
                Are you sure you want to end task for <b>{killModalTarget.name}</b> (PID:{" "}
                <code>{killModalTarget.pid}</code>)?
              </p>
              <div className="modal-warning-strip">
                Terminating an active program might result in unsaved data loss or unexpected application behavior.
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setKillModalTarget(null)}>Cancel</button>
              <button className="danger-btn" onClick={handleConfirmKill}>
                Terminate Process
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SPAWN VIRTUAL PROCESS MODAL                               */}
      {/* ========================================================= */}
      {createModalOpen && (
        <div className="task-modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <form
            className="task-modal-box"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreateVirtual}
          >
            <div className="modal-header">
              <span className="modal-title">Spawn New Virtual Process (PCB)</span>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setCreateModalOpen(false)}
              >
                <X size={15} />
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="config-item">
                <label>Process Name</label>
                <input
                  type="text"
                  required
                  value={newProcName}
                  onChange={(e) => setNewProcName(e.target.value)}
                  placeholder="e.g. background_worker, audio_sync"
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div className="config-item" style={{ flex: 1 }}>
                  <label>Priority (0 = Highest)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={newProcPrio}
                    onChange={(e) => setNewProcPrio(Number(e.target.value))}
                  />
                </div>
                <div className="config-item" style={{ flex: 1 }}>
                  <label>Allocated Memory (KB)</label>
                  <input
                    type="number"
                    min="512"
                    step="512"
                    value={newProcMem}
                    onChange={(e) => setNewProcMem(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary">
                Create Process
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

