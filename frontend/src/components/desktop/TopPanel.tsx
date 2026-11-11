import React, { useState, useEffect, useRef } from "react";
import {
  Wifi,
  Volume2,
  VolumeX,
  BatteryCharging,
  Power,
  ChevronDown,
  Sun,
  Moon,
  Sparkles,
  Sliders,
  Check,
  RotateCcw,
  LogOut,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { APPS_CONFIG } from "../../config/apps";
import type { AppId, ThemeId } from "../../types/desktop";

interface TopPanelProps {
  activeAppId?: AppId | null;
  onActivitiesClick: () => void;
  isActivitiesActive?: boolean;
}

export const TopPanel: React.FC<TopPanelProps> = ({
  activeAppId,
  onActivitiesClick,
  isActivitiesActive = false,
}) => {
  const { theme, setTheme, reduceMotion, setReduceMotion } = useTheme();
  const [clock, setClock] = useState(new Date());
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close quick menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setQuickMenuOpen(false);
      }
    };
    if (quickMenuOpen) {
      window.addEventListener("mousedown", handleClickOutside);
    }
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [quickMenuOpen]);

  const activeApp = activeAppId ? APPS_CONFIG[activeAppId] : null;

  const formattedDate = clock.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const formattedTime = clock.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <header className="top-panel" role="banner">
      {/* Left: Activities button & active app name */}
      <div className="top-panel-left">
        <button
          className={`panel-pill-btn activities-btn ${
            isActivitiesActive ? "active" : ""
          }`}
          onClick={onActivitiesClick}
          aria-label="Activities Overview"
          title="Super key opens Activities"
        >
          Activities
        </button>

        {activeApp && (
          <div className="active-app-indicator">
            <span
              className="active-app-dot"
              style={{ backgroundColor: activeApp.accent }}
            />
            <span className="active-app-name">{activeApp.name}</span>
          </div>
        )}
      </div>

      {/* Center: Real-time Clock and Date */}
      <div className="top-panel-center">
        <button
          className="panel-pill-btn clock-btn"
          aria-label="Date and Time"
          title="Today's Date and Time"
        >
          <span className="clock-date">{formattedDate}</span>
          <span className="clock-time">{formattedTime}</span>
        </button>
      </div>

      {/* Right: Quick Settings Pill Group */}
      <div className="top-panel-right" ref={menuRef}>
        <button
          className={`panel-pill-btn system-tray-btn ${
            quickMenuOpen ? "active" : ""
          }`}
          onClick={() => setQuickMenuOpen(!quickMenuOpen)}
          aria-label="System Quick Settings"
        >
          <div className="tray-icons">
            {wifiEnabled ? <Wifi size={14} /> : <span style={{ opacity: 0.5 }}><Wifi size={14} /></span>}
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <BatteryCharging size={14} />
            <Power size={13} style={{ marginLeft: 2 }} />
          </div>
          <ChevronDown
            size={12}
            className={`tray-chevron ${quickMenuOpen ? "rotated" : ""}`}
          />
        </button>

        {/* Quick Settings Dropdown */}
        {quickMenuOpen && (
          <div className="quick-settings-menu" role="menu">
            <div className="quick-menu-header">
              <span className="quick-menu-title">Control Center</span>
              <span className="quick-menu-tag">IntelliOS 24.04</span>
            </div>

            {/* Quick toggles row */}
            <div className="quick-toggles-grid">
              <button
                className={`quick-toggle-chip ${wifiEnabled ? "active" : ""}`}
                onClick={() => setWifiEnabled(!wifiEnabled)}
              >
                <Wifi size={16} />
                <span>{wifiEnabled ? "Connected" : "Wi-Fi Off"}</span>
              </button>

              <button
                className={`quick-toggle-chip ${!isMuted ? "active" : ""}`}
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                <span>{isMuted ? "Muted" : `${volume}%`}</span>
              </button>
            </div>

            {/* Sliders */}
            <div className="quick-sliders">
              <div className="slider-row">
                <button
                  className="slider-icon-btn"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  disabled={isMuted}
                  onChange={(e) => {
                    setVolume(Number(e.target.value));
                    if (isMuted) setIsMuted(false);
                  }}
                  className="quick-slider"
                  aria-label="Volume slider"
                />
              </div>
            </div>

            {/* Themes Section */}
            <div className="quick-menu-section">
              <span className="section-label">Desktop Theme</span>
              <div className="theme-options">
                <button
                  className={`theme-option-btn ${
                    theme === "ubuntu-dark" ? "selected" : ""
                  }`}
                  onClick={() => setTheme("ubuntu-dark")}
                >
                  <span
                    className="theme-color-swatch"
                    style={{ background: "#e95420" }}
                  />
                  <span>Ubuntu Dark</span>
                  {theme === "ubuntu-dark" && <Check size={14} className="check-icon" />}
                </button>

                <button
                  className={`theme-option-btn ${
                    theme === "kali-dark" ? "selected" : ""
                  }`}
                  onClick={() => setTheme("kali-dark")}
                >
                  <span
                    className="theme-color-swatch"
                    style={{ background: "#00f0ff" }}
                  />
                  <span>Kali Dark</span>
                  {theme === "kali-dark" && <Check size={14} className="check-icon" />}
                </button>

                <button
                  className={`theme-option-btn ${
                    theme === "ubuntu-light" ? "selected" : ""
                  }`}
                  onClick={() => setTheme("ubuntu-light")}
                >
                  <span
                    className="theme-color-swatch"
                    style={{ background: "#ebdcd5", border: "1px solid #ccc" }}
                  />
                  <span>Ubuntu Light</span>
                  {theme === "ubuntu-light" && <Check size={14} className="check-icon" />}
                </button>
              </div>
            </div>

            {/* Preferences */}
            <div className="quick-menu-section">
              <label className="toggle-switch-label">
                <span>Reduce animations</span>
                <input
                  type="checkbox"
                  checked={reduceMotion}
                  onChange={(e) => setReduceMotion(e.target.checked)}
                />
              </label>
            </div>

            {/* System Actions footer */}
            <div className="quick-menu-footer">
              <button
                className="action-btn"
                title="Restart Session"
                onClick={() => window.location.reload()}
              >
                <RotateCcw size={14} />
                <span>Restart</span>
              </button>
              <button
                className="action-btn danger"
                title="Log Out"
                onClick={() => setQuickMenuOpen(false)}
              >
                <LogOut size={14} />
                <span>Lock / Exit</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

