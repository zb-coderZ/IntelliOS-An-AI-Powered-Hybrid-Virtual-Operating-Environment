import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Activity,
  Cpu,
  HardDrive,
  Layers,
  Server,
  WifiOff,
  RefreshCw,
  Clock,
  Terminal,
} from "lucide-react";

const API = "http://localhost:8000/api";

interface ProcessInfo {
  pid: number;
  name: string;
  memory_percent?: number;
}

interface WindowsMonitorData {
  source: string;
  cpu_percent: number;
  cores: number;
  ram_percent: number;
  disk_percent: number;
  processes: ProcessInfo[];
}

interface UbuntuMonitorData {
  source: string;
  connected: boolean;
  ram_total_mb?: number;
  ram_used_mb?: number;
  ram_percent?: number;
  disk_percent?: number;
  uptime?: string;
  error?: string;
}

interface HistoryPoint {
  time: string;
  cpu: number;
  ram: number;
}

// Reusable Circular Progress Gauge
const CircularGauge: React.FC<{
  value: number;
  label: string;
  sublabel?: string;
  color: string;
  icon: React.ReactNode;
}> = ({ value, label, sublabel, color, icon }) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className="circular-gauge-card">
      <div className="gauge-svg-container">
        <svg className="gauge-svg" width="96" height="96" viewBox="0 0 96 96">
          <circle
            className="gauge-bg-circle"
            cx="48"
            cy="48"
            r={radius}
            strokeWidth="8"
          />
          <circle
            className="gauge-val-circle"
            cx="48"
            cy="48"
            r={radius}
            strokeWidth="8"
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="gauge-center-content">
          <span className="gauge-percent-text">{value.toFixed(0)}%</span>
        </div>
      </div>
      <div className="gauge-info">
        <div className="gauge-title-row">
          {icon}
          <span className="gauge-label">{label}</span>
        </div>
        {sublabel && <span className="gauge-sublabel">{sublabel}</span>}
      </div>
    </div>
  );
};

export const IntelliMonitor: React.FC = () => {
  const [tab, setTab] = useState<"windows" | "ubuntu">("windows");
  const [winData, setWinData] = useState<WindowsMonitorData | null>(null);
  const [ubuntuData, setUbuntuData] = useState<UbuntuMonitorData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [winConnected, setWinConnected] = useState(true);

  // Poll Windows telemetry every 2 seconds
  useEffect(() => {
    let mounted = true;
    const fetchWin = async () => {
      try {
        const res = await fetch(`${API}/monitor/windows`);
        if (!res.ok) throw new Error("Fetch failed");
        const data: WindowsMonitorData = await res.json();
        if (mounted) {
          setWinData(data);
          setWinConnected(true);

          const timeLabel = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          setHistory((prev) => {
            const next = [
              ...prev,
              { time: timeLabel, cpu: data.cpu_percent, ram: data.ram_percent },
            ];
            // Keep last 25 points (approx 50 seconds history)
            return next.slice(-25);
          });
        }
      } catch {
        if (mounted) {
          setWinData(null);
          setWinConnected(false);
        }
      }
    };

    fetchWin();
    const interval = setInterval(fetchWin, 2000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Poll Ubuntu telemetry when Ubuntu tab is active
  useEffect(() => {
    let mounted = true;
    const fetchUbuntu = async () => {
      try {
        const res = await fetch(`${API}/monitor/ubuntu`);
        if (!res.ok) throw new Error("Fetch failed");
        const data: UbuntuMonitorData = await res.json();
        if (mounted) setUbuntuData(data);
      } catch {
        if (mounted) {
          setUbuntuData({
            source: "real-ubuntu",
            connected: false,
            error: "WSL2 Ubuntu disconnected or unreachable.",
          });
        }
      }
    };

    if (tab === "ubuntu") {
      fetchUbuntu();
      const interval = setInterval(fetchUbuntu, 3000);
      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }
  }, [tab]);

  return (
    <div className="intellimonitor-container">
      {/* Top Header Bar */}
      <div className="monitor-tabs-bar">
        <button
          className={`monitor-tab-btn ${tab === "windows" ? "active" : ""}`}
          onClick={() => setTab("windows")}
        >
          <Server size={14} />
          <span>Real Windows Host</span>
        </button>

        <button
          className={`monitor-tab-btn ${tab === "ubuntu" ? "active" : ""}`}
          onClick={() => setTab("ubuntu")}
        >
          <Terminal size={14} />
          <span>Real Ubuntu 24.04 (WSL2)</span>
        </button>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`badge ${tab === "windows" ? "badge-real-windows" : "badge-real-ubuntu"}`}>
            {tab === "windows" ? "Source: Real Windows (psutil)" : "Source: Real Ubuntu (WSL2)"}
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: REAL WINDOWS TELEMETRY                             */}
      {/* ========================================================= */}
      {tab === "windows" && (
        <div className="monitor-content-scroll">
          {!winConnected || !winData ? (
            <div className="monitor-disconnected-state">
              <WifiOff size={42} style={{ color: "#ef4444" }} />
              <h4>Windows Telemetry Disconnected</h4>
              <p>
                Could not connect to the backend daemon at <code>http://localhost:8000/api/monitor/windows</code>.
              </p>
              <span className="disconnected-note">
                Notice: IntelliOS never fakes data. When the host service stops, telemetry shows disconnected.
              </span>
            </div>
          ) : (
            <>
              {/* Circular Gauges Row */}
              <div className="gauges-row">
                <CircularGauge
                  value={winData.cpu_percent}
                  label="CPU Utilization"
                  sublabel={`${winData.cores} Logical Cores`}
                  color="var(--accent)"
                  icon={<Cpu size={15} style={{ color: "var(--accent)" }} />}
                />

                <CircularGauge
                  value={winData.ram_percent}
                  label="System Memory"
                  sublabel="Physical RAM"
                  color="#38bdf8"
                  icon={<Layers size={15} style={{ color: "#38bdf8" }} />}
                />

                <CircularGauge
                  value={winData.disk_percent}
                  label="Primary Storage"
                  sublabel="Local Disk (/)"
                  color="#a855f7"
                  icon={<HardDrive size={15} style={{ color: "#a855f7" }} />}
                />
              </div>

              {/* Real-time Recharts Area Chart */}
              <div className="monitor-chart-card">
                <div className="chart-header">
                  <div className="chart-title">
                    <Activity size={16} style={{ color: "var(--accent)" }} />
                    <span>Real-Time CPU & RAM History (Last 50 Seconds)</span>
                  </div>
                  <div className="chart-legend">
                    <span className="legend-item cpu">
                      <span className="legend-dot" style={{ background: "var(--accent)" }} />
                      CPU %
                    </span>
                    <span className="legend-item ram">
                      <span className="legend-dot" style={{ background: "#38bdf8" }} />
                      RAM %
                    </span>
                  </div>
                </div>

                <div className="recharts-wrapper-container">
                  <ResponsiveContainer width="100%" height={190}>
                    <AreaChart
                      data={history}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="time"
                        stroke="var(--text-muted)"
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="var(--text-muted)"
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--bg-window)",
                          borderColor: "var(--border-subtle)",
                          borderRadius: "8px",
                          fontSize: "12px",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cpu"
                        name="CPU Load"
                        stroke="var(--accent)"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#cpuGradient)"
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="ram"
                        name="RAM Load"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#ramGradient)"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Active Windows Process Table */}
              <div className="monitor-process-card">
                <div className="chart-header">
                  <div className="chart-title">
                    <Layers size={16} style={{ color: "#38bdf8" }} />
                    <span>Top Real Windows Processes by Memory Load</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Polled live via psutil
                  </span>
                </div>

                <div className="table-wrapper">
                  <table className="monitor-proc-table">
                    <thead>
                      <tr>
                        <th style={{ width: 80 }}>PID</th>
                        <th>Process Name</th>
                        <th style={{ width: 140 }}>RAM Utilization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {winData.processes.map((p) => {
                        const mem = p.memory_percent || 0;
                        return (
                          <tr key={p.pid}>
                            <td className="proc-pid">{p.pid}</td>
                            <td className="proc-name">{p.name}</td>
                            <td>
                              <div className="proc-mem-bar-wrapper">
                                <div className="proc-mem-bar">
                                  <div
                                    className="proc-mem-fill"
                                    style={{
                                      width: `${Math.min(100, mem * 4)}%`,
                                      background:
                                        mem > 5
                                          ? "#ef4444"
                                          : mem > 2
                                          ? "#f59e0b"
                                          : "#10b981",
                                    }}
                                  />
                                </div>
                                <span className="proc-mem-val">{mem.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: REAL UBUNTU (WSL2) TELEMETRY                       */}
      {/* ========================================================= */}
      {tab === "ubuntu" && (
        <div className="monitor-content-scroll">
          {!ubuntuData?.connected ? (
            <div className="monitor-disconnected-state">
              <WifiOff size={42} style={{ color: "#ef4444" }} />
              <h4>Real Ubuntu 24.04 (WSL2) Disconnected</h4>
              <p>
                {ubuntuData?.error || "Could not query free, df, or uptime from WSL2 Ubuntu."}
              </p>
              <span className="disconnected-note">
                Ensure WSL2 is running: open PowerShell and test <code>wsl -l -v</code>.
              </span>
            </div>
          ) : (
            <>
              {/* Gauges Row */}
              <div className="gauges-row">
                <CircularGauge
                  value={ubuntuData.ram_percent || 0}
                  label="WSL Linux Memory"
                  sublabel={`${ubuntuData.ram_used_mb} MB / ${ubuntuData.ram_total_mb} MB`}
                  color="#10b981"
                  icon={<Layers size={15} style={{ color: "#10b981" }} />}
                />

                <CircularGauge
                  value={ubuntuData.disk_percent || 0}
                  label="Virtual Root Disk"
                  sublabel="Mounted at /"
                  color="#f59e0b"
                  icon={<HardDrive size={15} style={{ color: "#f59e0b" }} />}
                />

                <div className="circular-gauge-card uptime-card">
                  <div className="uptime-icon-box">
                    <Clock size={28} style={{ color: "#38bdf8" }} />
                  </div>
                  <div className="gauge-info">
                    <span className="gauge-label">Ubuntu Uptime</span>
                    <span className="uptime-text">{ubuntuData.uptime || "Running"}</span>
                  </div>
                </div>
              </div>

              {/* Linux Terminal Diagnostic Summary */}
              <div className="monitor-chart-card">
                <div className="chart-header">
                  <div className="chart-title">
                    <Terminal size={16} style={{ color: "#10b981" }} />
                    <span>Native WSL2 Ubuntu Kernel Status</span>
                  </div>
                </div>
                <div className="linux-stats-box">
                  <div className="stat-row">
                    <span className="stat-key">Linux Distribution:</span>
                    <span className="stat-val">Ubuntu 24.04 LTS (Noble Numbat)</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-key">Virtualization Backend:</span>
                    <span className="stat-val">Windows Subsystem for Linux (WSL2 Hyper-V MicroVM)</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-key">Total Linux RAM:</span>
                    <span className="stat-val">{ubuntuData.ram_total_mb} MB</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-key">Active Linux RAM:</span>
                    <span className="stat-val">{ubuntuData.ram_used_mb} MB</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-key">Root Storage Usage:</span>
                    <span className="stat-val">{ubuntuData.disk_percent}%</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

