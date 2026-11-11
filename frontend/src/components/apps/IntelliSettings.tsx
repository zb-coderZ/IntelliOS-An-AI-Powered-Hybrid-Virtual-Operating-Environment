import React, { useState } from "react";
import {
  Palette,
  Sparkles,
  Sliders,
  User,
  Info,
  Check,
  Shield,
  Layers,
  Cpu,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useWallpaper } from "../../context/WallpaperContext";
import { useUser } from "../../context/UserContext";
import { useNotifications } from "../../context/NotificationContext";
import { WALLPAPER_OPTIONS } from "../../types/wallpaper";
import type { ThemeId } from "../../types/desktop";

export const IntelliSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"appearance" | "system" | "users">("appearance");
  const { theme, setTheme, reduceMotion, setReduceMotion } = useTheme();
  const { wallpaper, setWallpaper, enableParallax, setEnableParallax } = useWallpaper();
  const { activeUser, allUsers, switchUser, loading: userLoading } = useUser();
  const { addNotification } = useNotifications();

  const handleSwitchUser = async (username: string) => {
    const success = await switchUser(username);
    if (success) {
      addNotification({
        title: "User Switched",
        message: `Active session changed to ${username.toUpperCase()}.`,
        type: "success",
        autoDismissMs: 3500,
      });
    }
  };

  const themes: Array<{ id: ThemeId; name: string; color: string; desc: string }> = [
    {
      id: "ubuntu-dark",
      name: "Ubuntu Aubergine",
      color: "#e95420",
      desc: "Warm dark aubergine with classic Ubuntu orange accents",
    },
    {
      id: "kali-dark",
      name: "Kali Cyber Dark",
      color: "#00f0ff",
      desc: "Midnight cyber dark with electric cyan neon accents",
    },
    {
      id: "ubuntu-light",
      name: "Ubuntu Light",
      color: "#ebdcd5",
      desc: "Clean, high-contrast light theme with orange highlights",
    },
  ];

  return (
    <div className="settings-window-container">
      {/* Sidebar Navigation */}
      <aside className="settings-sidebar">
        <div className="settings-sidebar-header">
          <Sliders size={18} style={{ color: "var(--accent)" }} />
          <span>Settings</span>
        </div>

        <nav className="settings-nav">
          <button
            className={`settings-nav-item ${activeTab === "appearance" ? "active" : ""}`}
            onClick={() => setActiveTab("appearance")}
          >
            <Palette size={16} />
            <span>Appearance & Wallpapers</span>
          </button>

          <button
            className={`settings-nav-item ${activeTab === "system" ? "active" : ""}`}
            onClick={() => setActiveTab("system")}
          >
            <Info size={16} />
            <span>System & Provenance</span>
          </button>

          <button
            className={`settings-nav-item ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <User size={16} />
            <span>User Accounts</span>
          </button>
        </nav>
      </aside>

      {/* Main Settings Content */}
      <main className="settings-content">
        {activeTab === "appearance" && (
          <div className="settings-section">
            <h3 className="section-title">Desktop Themes</h3>
            <p className="section-subtitle">
              Choose the visual style and accent color palette for windows, panels, and borders.
            </p>

            <div className="theme-grid">
              {themes.map((t) => (
                <div
                  key={t.id}
                  className={`theme-card ${theme === t.id ? "selected" : ""}`}
                  onClick={() => setTheme(t.id)}
                >
                  <div
                    className="theme-card-preview"
                    style={{
                      background:
                        t.id === "kali-dark"
                          ? "#080c12"
                          : t.id === "ubuntu-light"
                          ? "#ebdcd5"
                          : "#180c22",
                      border: `2px solid ${t.color}`,
                    }}
                  >
                    <div
                      className="swatch-accent"
                      style={{ background: t.color }}
                    />
                  </div>
                  <div className="theme-card-info">
                    <span className="theme-card-name">{t.name}</span>
                    <span className="theme-card-desc">{t.desc}</span>
                  </div>
                  {theme === t.id && (
                    <div className="theme-badge-check">
                      <Check size={14} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="settings-divider" />

            <h3 className="section-title">Live Wallpapers</h3>
            <p className="section-subtitle">
              Interactive 60fps canvas backgrounds optimized for 8GB laptops. Automatically pauses when tab is inactive.
            </p>

            <div className="wallpaper-grid">
              {WALLPAPER_OPTIONS.map((w) => (
                <div
                  key={w.id}
                  className={`wallpaper-card ${wallpaper === w.id ? "selected" : ""}`}
                  onClick={() => setWallpaper(w.id)}
                >
                  <div
                    className="wallpaper-thumbnail"
                    style={{ background: w.previewGradient }}
                  >
                    {w.animated && (
                      <span className="wallpaper-animated-tag">
                        <Sparkles size={10} /> Animated
                      </span>
                    )}
                    {wallpaper === w.id && (
                      <div className="wallpaper-selected-check">
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                  <div className="wallpaper-card-info">
                    <span className="wallpaper-name">{w.name}</span>
                    <span className="wallpaper-desc">{w.description}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="settings-divider" />

            <h3 className="section-title">Motion & Performance</h3>
            <div className="settings-toggle-group">
              <label className="settings-toggle-row">
                <div>
                  <span className="toggle-title">Mouse Parallax Effect</span>
                  <span className="toggle-desc">
                    Gently shifts wallpaper layers according to mouse position
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={enableParallax}
                  onChange={(e) => setEnableParallax(e.target.checked)}
                  className="settings-checkbox"
                />
              </label>

              <label className="settings-toggle-row">
                <div>
                  <span className="toggle-title">Reduce animations</span>
                  <span className="toggle-desc">
                    Replaces spring animations with instant transitions for lower GPU load
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={reduceMotion}
                  onChange={(e) => setReduceMotion(e.target.checked)}
                  className="settings-checkbox"
                />
              </label>
            </div>
          </div>
        )}

        {activeTab === "system" && (
          <div className="settings-section">
            <h3 className="section-title">System Architecture & Provenance</h3>
            <p className="section-subtitle">
              IntelliOS is a hybrid educational operating environment combining virtual simulators, real WSL2 Linux, and real Windows telemetry.
            </p>

            <div className="provenance-cards-grid">
              <div className="provenance-card">
                <div className="provenance-header">
                  <Cpu size={18} style={{ color: "var(--accent)" }} />
                  <h4>Virtual OS Simulators</h4>
                  <span className="badge badge-simulated">Simulated</span>
                </div>
                <p>
                  Custom Python algorithms for CPU Scheduling (FCFS, SJF, SRTF, Priority, RR), Memory allocation (First/Best/Worst Fit), and Banker's Deadlock Detection. Fully unit tested with Pytest.
                </p>
              </div>

              <div className="provenance-card">
                <div className="provenance-header">
                  <Shield size={18} style={{ color: "#10b981" }} />
                  <h4>Real Ubuntu 24.04 (WSL2)</h4>
                  <span className="badge badge-real-ubuntu">Real Ubuntu</span>
                </div>
                <p>
                  Executes allowlisted Linux commands directly on the Ubuntu 24.04 WSL2 kernel instance without virtualization overhead.
                </p>
              </div>

              <div className="provenance-card">
                <div className="provenance-header">
                  <Layers size={18} style={{ color: "#06b6d4" }} />
                  <h4>Real Windows Telemetry</h4>
                  <span className="badge badge-real-windows">Real Windows</span>
                </div>
                <p>
                  Real-time hardware metrics queried live from the host operating system via Python psutil (CPU load, core counts, RAM%, disk usage, and active system processes).
                </p>
              </div>
            </div>

            <div className="viva-notes-box">
              <h4>🎓 Viva Defense Notes</h4>
              <ul>
                <li>The virtual OS simulators are completely original algorithms built from scratch.</li>
                <li>The Terminal and Hardware Monitors connect to real native environments (WSL and psutil).</li>
                <li>Data provenance is strictly preserved across all windows with clear badges.</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="settings-section">
            <h3 className="section-title">User Accounts & Permissions (RBAC)</h3>
            <p className="section-subtitle">
              Role-based access control for file operations, process termination, and lab execution.
            </p>

            <div className="user-profile-card">
              <div
                className="user-avatar"
                style={{
                  background:
                    activeUser.role === "admin"
                      ? "linear-gradient(135deg, #ef4444, #f97316)"
                      : activeUser.role === "restricted"
                      ? "linear-gradient(135deg, #64748b, #475569)"
                      : "linear-gradient(135deg, #e95420, #a855f7)",
                }}
              >
                <span>{activeUser.username.slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="user-details">
                <h4>{activeUser.display_name} ({activeUser.username})</h4>
                <span className={`user-role-badge role-${activeUser.role}`}>
                  {activeUser.role === "admin"
                    ? "Administrator (Root)"
                    : activeUser.role === "restricted"
                    ? "Restricted (Guest)"
                    : "Standard User (Student)"}
                </span>
                <p>
                  {activeUser.role === "admin"
                    ? "Unrestricted administrative access to all virtual inodes, system processes, and hardware telemetry."
                    : activeUser.role === "restricted"
                    ? "Read-only access. Writing files, creating folders, or deleting virtual nodes will be rejected (403 Forbidden)."
                    : "Standard student workspace permissions: create/edit notes, run CPU/memory simulations, allowlisted Ubuntu terminal."}
                </p>
              </div>
            </div>

            <div className="settings-divider" />

            <h4 style={{ fontSize: 13, marginBottom: 8, color: "var(--text-primary)" }}>
              Switch Active User Session
            </h4>

            <div className="roles-info-list">
              {allUsers.map((u) => {
                const isCurrent = activeUser.username === u.username;
                return (
                  <div
                    key={u.username}
                    className={`role-item ${isCurrent ? "active" : ""}`}
                    onClick={() => handleSwitchUser(u.username)}
                    style={{ cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                      <div>
                        <span className="role-name">
                          {u.username} ({u.display_name})
                        </span>
                        <span className="role-perms">
                          {u.role === "admin"
                            ? "Full read/write/execute permissions on all virtual files and system processes."
                            : u.role === "restricted"
                            ? "Read-only observer role (demonstrates 403 Forbidden in viva)."
                            : "Standard student workspace permissions with safe sandboxed execution."}
                        </span>
                      </div>
                      <button
                        className={`switch-user-btn ${isCurrent ? "current" : "primary"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSwitchUser(u.username);
                        }}
                        disabled={isCurrent || userLoading}
                      >
                        {isCurrent ? "Active" : "Switch User"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

