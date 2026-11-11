import React, { useEffect, useState, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";
import { APPS_CONFIG, APP_IDS } from "./config/apps";
import type { AppId, WindowState, SnapPreviewData } from "./types/desktop";
import { TopPanel } from "./components/desktop/TopPanel";
import { Dock } from "./components/desktop/Dock";
import { WindowFrame } from "./components/desktop/WindowFrame";
import { SnapPreviewOverlay } from "./components/desktop/SnapPreviewOverlay";
import { LiveWallpaper } from "./components/desktop/LiveWallpaper";
import { IntelliSettings } from "./components/apps/IntelliSettings";
import { IntelliTerminal } from "./components/apps/IntelliTerminal";
import { IntelliLab } from "./components/apps/IntelliLab";
import { IntelliMonitor } from "./components/apps/IntelliMonitor";
import { IntelliTask } from "./components/apps/IntelliTask";
import { IntelliFiles } from "./components/apps/IntelliFiles";
import { IntelliAI } from "./components/apps/IntelliAI";
import { ActivitiesOverview } from "./components/desktop/ActivitiesOverview";
import { AppLauncher } from "./components/desktop/AppLauncher";
import { WindowSwitcher } from "./components/desktop/WindowSwitcher";
import { ToastContainer } from "./components/desktop/ToastContainer";
import { ContextMenu } from "./components/desktop/ContextMenu";
import { useNotifications } from "./context/NotificationContext";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";

const API = "http://localhost:8000/api";
const COLORS = ["#fca5a5", "#fcd34d", "#86efac", "#93c5fd", "#d8b4fe"];

interface ProcessItem {
  pid: string;
  arrival: number;
  burst: number;
  priority: number;
}

interface ScheduleResult {
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
  cpu_utilization: number;
  context_switches: number;
}

function Lab() {
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [algo, setAlgo] = useState("rr");
  const [err, setErr] = useState("");
  const procs: ProcessItem[] = [
    { pid: "P1", arrival: 0, burst: 5, priority: 2 },
    { pid: "P2", arrival: 1, burst: 3, priority: 1 },
    { pid: "P3", arrival: 2, burst: 1, priority: 3 },
  ];

  const run = async () => {
    try {
      setErr("");
      const res = await fetch(`${API}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ algo, processes: procs, quantum: 2 }),
      });
      if (!res.ok) throw new Error("Schedule request failed");
      setResult(await res.json());
    } catch {
      setErr("Backend not running");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <select value={algo} onChange={(e) => setAlgo(e.target.value)}>
          {["fcfs", "sjf", "srtf", "priority", "priority_p", "rr"].map((a) => (
            <option key={a} value={a}>
              {a.toUpperCase()}
            </option>
          ))}
        </select>
        <button className="primary" onClick={run}>
          <Play size={14} /> Run
        </button>
        <span className="badge badge-simulated">simulated</span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Sample processes P1–P3
        </span>
      </div>

      {err && (
        <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 500 }}>
          {err}
        </div>
      )}

      {result && (
        <>
          <div className="g">
            {result.gantt.map((s, i) => (
              <div
                key={i}
                style={{
                  flex: s.end - s.start,
                  background: COLORS[i % COLORS.length],
                }}
              >
                {s.pid}
                <br />
                {s.start}–{s.end}
              </div>
            ))}
          </div>

          <pre>
            {result.processes
              .map(
                (p) =>
                  `${p.pid} CT=${p.completion} TAT=${p.turnaround} WT=${p.waiting} RT=${p.response}`
              )
              .join("\n")}
            {`\nAvgTAT=${result.avg_turnaround.toFixed(2)} AvgWT=${result.avg_waiting.toFixed(2)} CPU=${result.cpu_utilization.toFixed(0)}% CS=${result.context_switches}`}
          </pre>
        </>
      )}
    </div>
  );
}

function Term() {
  const [c, setC] = useState("uname -a");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${API}/ubuntu/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: c }),
      });
      const d = await r.json();
      setOut(d.detail ?? (d.stdout || "") + (d.stderr || ""));
    } catch {
      setOut("Backend not running or WSL Ubuntu disconnected");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="badge badge-real-ubuntu">Real Ubuntu via WSL2</span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Allowlist: uname, whoami, pwd, ls, ps, df, free, uptime...
        </span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={c}
          onChange={(e) => setC(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="e.g. uname -a"
          style={{ flex: 1 }}
        />
        <button className="primary" onClick={run} disabled={loading}>
          {loading ? "Running..." : "Run"}
        </button>
      </div>

      <pre style={{ minHeight: 140 }}>
        {out || "Enter an allowlisted command and press Run."}
      </pre>
    </div>
  );
}

interface WinMonitorData {
  source: string;
  cpu_percent: number;
  cores: number;
  ram_percent: number;
  disk_percent: number;
  processes: Array<{
    pid: number;
    name: string;
    memory_percent?: number;
  }>;
}

function Mon() {
  const [d, setD] = useState<WinMonitorData | null>(null);

  useEffect(() => {
    let mounted = true;
    const f = () =>
      fetch(`${API}/monitor/windows`)
        .then((r) => r.json())
        .then((data) => {
          if (mounted) setD(data);
        })
        .catch(() => {
          if (mounted) setD(null);
        });

    f();
    const t = setInterval(f, 2000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  if (!d) {
    return (
      <div style={{ padding: 12, color: "var(--text-secondary)" }}>
        <span className="badge badge-real-windows" style={{ marginBottom: 8 }}>
          Real Windows
        </span>
        <p>Windows monitor disconnected (backend not running at http://localhost:8000)</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <span className="badge badge-real-windows">Source: real Windows</span>
      </div>
      <pre>
        {`CPU ${d.cpu_percent}% (${d.cores} cores)\nRAM ${d.ram_percent}%\nDisk ${d.disk_percent}%\n\n` +
          d.processes
            .map(
              (p) =>
                `${p.pid}\t${p.name}\t${p.memory_percent?.toFixed(1) ?? 0}%`
            )
            .join("\n")}
      </pre>
    </div>
  );
}

const renderAppBody = (id: AppId) => {
  switch (id) {
    case "IntelliLab":
      return <IntelliLab />;
    case "IntelliTerminal":
      return <IntelliTerminal />;
    case "IntelliMonitor":
      return <IntelliMonitor />;
    case "IntelliTask":
      return <IntelliTask />;
    case "IntelliFiles":
      return <IntelliFiles />;
    case "IntelliAI":
      return <IntelliAI />;
    case "IntelliSettings":
      return <IntelliSettings />;
    default:
      return null;
  }
};

export default function App() {
  const [ws, setWs] = useState<WindowState[]>([]);
  const [top, setTop] = useState(10);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const [altTabOpen, setAltTabOpen] = useState(false);
  const [altTabIndex, setAltTabIndex] = useState(0);
  const [snapPreview, setSnapPreview] = useState<SnapPreviewData | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const activeSnapRef = useRef<SnapPreviewData | null>(null);
  const { addNotification } = useNotifications();

  // Initial welcome notification on desktop boot
  useEffect(() => {
    addNotification({
      title: "IntelliOS Desktop Ready",
      message: "Press Super (Windows Key) for Overview or Ctrl+Alt+T for Terminal.",
      type: "info",
      autoDismissMs: 5000,
    });
  }, [addNotification]);

  const focus = (id: AppId) => {
    const nextTop = top + 1;
    setTop(nextTop);
    setWs((w) =>
      w.map((x) => (x.id === id ? { ...x, z: nextTop, min: false } : x))
    );
  };

  const open = (id: AppId) => {
    setLauncherOpen(false);
    setActivitiesOpen(false);
    const existing = ws.find((w) => w.id === id);
    if (existing) {
      if (existing.min) {
        setWs((prev) =>
          prev.map((w) => (w.id === id ? { ...w, min: false, z: top + 1 } : w))
        );
      }
      return focus(id);
    }

    const nextTop = top + 1;
    setTop(nextTop);
    const offset = (ws.length % 6) * 32;
    setWs([
      ...ws,
      {
        id,
        x: 110 + offset,
        y: 60 + offset,
        width: 620,
        height: 410,
        z: nextTop,
        min: false,
        max: false,
        snapState: "none",
      },
    ]);
  };

  const closeWindow = (id: AppId) => {
    setWs((prev) => prev.filter((w) => w.id !== id));
  };

  const minimizeWindow = (id: AppId) => {
    setWs((prev) =>
      prev.map((w) => (w.id === id ? { ...w, min: true } : w))
    );
  };

  const toggleMaximizeWindow = (id: AppId) => {
    setWs((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (w.max || w.snapState !== "none") {
          // Restore down
          const prev = w.prevBounds || { x: 110, y: 60, width: 620, height: 410 };
          return {
            ...w,
            max: false,
            snapState: "none",
            x: prev.x,
            y: prev.y,
            width: prev.width,
            height: prev.height,
          };
        } else {
          // Maximize
          return {
            ...w,
            max: true,
            snapState: "none",
            prevBounds: { x: w.x, y: w.y, width: w.width, height: w.height },
          };
        }
      })
    );
  };

  const upd = (id: AppId, p: Partial<WindowState>) =>
    setWs((w) => w.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const activeWindow = ws.reduce(
    (a, b) => (b.z > a.z && !b.min ? b : a),
    { z: 0, id: "" as AppId } as WindowState
  ).id;

  // Global Keyboard Shortcuts Handlers
  const toggleOverview = () => {
    setLauncherOpen(false);
    setActivitiesOpen((prev) => !prev);
  };

  const closeOverlays = () => {
    setActivitiesOpen(false);
    setLauncherOpen(false);
    setAltTabOpen(false);
  };

  const openTerminal = () => {
    open("IntelliTerminal");
  };

  const closeActiveWindow = () => {
    if (activeWindow) {
      closeWindow(activeWindow);
    }
  };

  const snapActiveWindow = (direction: "left" | "right" | "max" | "restore") => {
    if (!activeWindow) return;
    if (direction === "left") {
      upd(activeWindow, { max: false, snapState: "left" });
    } else if (direction === "right") {
      upd(activeWindow, { max: false, snapState: "right" });
    } else if (direction === "max") {
      upd(activeWindow, { max: true, snapState: "none" });
    } else if (direction === "restore") {
      upd(activeWindow, { max: false, snapState: "none" });
    }
  };

  const handleAltTabPress = (reverse: boolean) => {
    if (ws.length === 0) return;
    if (!altTabOpen) {
      setAltTabOpen(true);
      setAltTabIndex(reverse ? ws.length - 1 : 1 % ws.length);
    } else {
      setAltTabIndex((prev) =>
        reverse ? (prev - 1 + ws.length) % ws.length : (prev + 1) % ws.length
      );
    }
  };

  const handleAltTabRelease = () => {
    if (altTabOpen && ws[altTabIndex]) {
      focus(ws[altTabIndex].id);
    }
    setAltTabOpen(false);
  };

  useGlobalShortcuts({
    toggleOverview,
    closeOverlays,
    openTerminal,
    closeActiveWindow,
    snapActiveWindow,
    onAltTabPress: handleAltTabPress,
    onAltTabRelease: handleAltTabRelease,
    isAltTabActive: altTabOpen,
  });

  // Dragging logic with Edge Snapping preview & smooth un-snap
  const drag = (e: React.MouseEvent, w: WindowState) => {
    focus(w.id);

    let startX = w.x;
    let startY = w.y;
    let startW = w.width;
    let startH = w.height;

    // If window is currently maximized or snapped, un-snap it to normal size on drag
    if (w.max || w.snapState !== "none") {
      const restoredW = w.prevBounds?.width || 620;
      const restoredH = w.prevBounds?.height || 410;
      const cursorRatio = (e.clientX - 68) / (window.innerWidth - 68);
      const newX = Math.max(68, e.clientX - restoredW * Math.min(Math.max(cursorRatio, 0.2), 0.8));
      const newY = Math.max(32, e.clientY - 16);

      startX = newX;
      startY = newY;
      startW = restoredW;
      startH = restoredH;

      upd(w.id, {
        max: false,
        snapState: "none",
        x: newX,
        y: newY,
        width: restoredW,
        height: restoredH,
        isDragging: true,
      });
    } else {
      upd(w.id, { isDragging: true });
    }

    const ox = e.clientX - startX;
    const oy = e.clientY - startY;

    const onMouseMove = (m: MouseEvent) => {
      const nextX = Math.max(68, m.clientX - ox);
      const nextY = Math.max(32, m.clientY - oy);
      upd(w.id, { x: nextX, y: nextY });

      // Edge snapping detection
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const availableW = winW - 68;
      const availableH = winH - 32;

      let preview: SnapPreviewData | null = null;

      if (m.clientY <= 38) {
        // Snap Full Screen
        preview = {
          type: "full",
          x: 68,
          y: 32,
          width: availableW,
          height: availableH,
        };
      } else if (m.clientX <= 80) {
        // Snap Left Half
        preview = {
          type: "left",
          x: 68,
          y: 32,
          width: availableW / 2,
          height: availableH,
        };
      } else if (m.clientX >= winW - 25) {
        // Snap Right Half
        preview = {
          type: "right",
          x: 68 + availableW / 2,
          y: 32,
          width: availableW / 2,
          height: availableH,
        };
      }

      setSnapPreview(preview);
      activeSnapRef.current = preview;
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      const snap = activeSnapRef.current;
      setSnapPreview(null);
      activeSnapRef.current = null;

      if (snap) {
        if (snap.type === "full") {
          upd(w.id, {
            max: true,
            snapState: "none",
            isDragging: false,
            prevBounds: { x: startX, y: startY, width: startW, height: startH },
          });
        } else if (snap.type === "left") {
          upd(w.id, {
            max: false,
            snapState: "left",
            isDragging: false,
            prevBounds: { x: startX, y: startY, width: startW, height: startH },
          });
        } else if (snap.type === "right") {
          upd(w.id, {
            max: false,
            snapState: "right",
            isDragging: false,
            prevBounds: { x: startX, y: startY, width: startW, height: startH },
          });
        }
      } else {
        upd(w.id, { isDragging: false });
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleDockAppClick = (id: AppId) => {
    const existing = ws.find((w) => w.id === id);
    if (!existing) {
      open(id);
    } else if (existing.min) {
      focus(id);
    } else if (activeWindow === id) {
      minimizeWindow(id);
    } else {
      focus(id);
    }
  };

  return (
    <div
      className="desk"
      onClick={() => {
        if (launcherOpen) setLauncherOpen(false);
        if (contextMenu) setContextMenu(null);
      }}
      onContextMenu={(e) => {
        const target = e.target as HTMLElement;
        if (
          target.classList.contains("desk") ||
          target.tagName === "CANVAS" ||
          target.closest(".live-wallpaper-canvas")
        ) {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }
      }}
    >
      {/* Live Animated Canvas Wallpaper */}
      <LiveWallpaper />

      {/* Top Right Toast Notification Stack */}
      <ToastContainer />

      {/* Ubuntu GNOME Top Panel */}
      <TopPanel
        activeAppId={activeWindow || null}
        onActivitiesClick={() => setActivitiesOpen(!activitiesOpen)}
        isActivitiesActive={activitiesOpen}
      />

      {/* Ubuntu Vertical Dock on the Left */}
      <Dock
        windows={ws}
        activeWindowId={activeWindow || null}
        onAppClick={handleDockAppClick}
        onLauncherClick={() => setLauncherOpen(!launcherOpen)}
        isLauncherOpen={launcherOpen}
      />

      {/* Edge Snapping Preview Overlay */}
      <SnapPreviewOverlay preview={snapPreview} />

      {/* 
        NOTE: Per user request, duplicate desktop shortcut icons have been removed from
        the desktop display to preserve a clean, authentic Ubuntu GNOME environment.
        All apps are launched cleanly from the left vertical dock and app launcher!
      */}

      {/* Windows Manager with Framer Motion animations */}
      <AnimatePresence>
        {ws.map((w) => {
          const dockIndex = APP_IDS.indexOf(w.id);
          return (
            <WindowFrame
              key={w.id}
              window={w}
              dockIndex={dockIndex >= 0 ? dockIndex : 0}
              isActive={activeWindow === w.id}
              onFocus={() => focus(w.id)}
              onClose={() => closeWindow(w.id)}
              onMinimize={() => minimizeWindow(w.id)}
              onToggleMaximize={() => toggleMaximizeWindow(w.id)}
              onDragStart={(e) => drag(e, w)}
            >
              {renderAppBody(w.id)}
            </WindowFrame>
          );
        })}
      </AnimatePresence>

      {/* Activities Overview (Super key / top-left Activities button) */}
      <ActivitiesOverview
        isOpen={activitiesOpen}
        windows={ws}
        activeWindowId={activeWindow || null}
        onSelectWindow={focus}
        onCloseWindow={closeWindow}
        onLaunchApp={open}
        onClose={() => setActivitiesOpen(false)}
      />

      {/* Full-screen App Launcher (9-dot grid button) */}
      <AppLauncher
        isOpen={launcherOpen}
        onLaunchApp={open}
        onClose={() => setLauncherOpen(false)}
      />

      {/* Alt + Tab Window Switcher HUD */}
      <WindowSwitcher
        isOpen={altTabOpen}
        windows={ws}
        selectedIndex={altTabIndex}
      />

      {/* Desktop Right-Click Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onLaunchApp={open}
        />
      )}
    </div>
  );
}
