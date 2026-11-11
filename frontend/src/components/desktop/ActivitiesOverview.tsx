import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, AppWindow, Play } from "lucide-react";
import { APPS_CONFIG, APP_IDS } from "../../config/apps";
import type { AppId, WindowState } from "../../types/desktop";
import { useTheme } from "../../context/ThemeContext";

interface ActivitiesOverviewProps {
  isOpen: boolean;
  windows: WindowState[];
  activeWindowId?: AppId | null;
  onSelectWindow: (id: AppId) => void;
  onCloseWindow: (id: AppId) => void;
  onLaunchApp: (id: AppId) => void;
  onClose: () => void;
}

export const ActivitiesOverview: React.FC<ActivitiesOverviewProps> = ({
  isOpen,
  windows,
  activeWindowId,
  onSelectWindow,
  onCloseWindow,
  onLaunchApp,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { reduceMotion } = useTheme();

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setTimeout(() => searchInputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter apps by search query
  const filteredApps = searchQuery.trim()
    ? APP_IDS.filter((id) => {
        const app = APPS_CONFIG[id];
        const q = searchQuery.toLowerCase();
        return (
          app.name.toLowerCase().includes(q) ||
          app.description.toLowerCase().includes(q) ||
          app.category.toLowerCase().includes(q)
        );
      })
    : [];

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (filteredApps.length > 0) {
        onLaunchApp(filteredApps[0]);
        onClose();
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="activities-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.2 }}
        onClick={onClose}
      >
        <div
          className="activities-container"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Search Bar */}
          <div className="activities-search-wrapper">
            <div className="activities-search-box">
              <Search size={18} className="search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Type to search apps, settings, or windows..."
                className="activities-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery("")}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Search Results (When typing) */}
          {searchQuery.trim() ? (
            <div className="activities-search-results">
              <span className="results-label">Applications</span>
              {filteredApps.length > 0 ? (
                <div className="search-results-grid">
                  {filteredApps.map((id) => {
                    const app = APPS_CONFIG[id];
                    const Icon = app.icon;
                    return (
                      <motion.div
                        key={id}
                        className="search-result-card"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => {
                          onLaunchApp(id);
                          onClose();
                        }}
                      >
                        <div
                          className="search-result-icon"
                          style={{
                            background: `linear-gradient(135deg, ${app.accent}33, ${app.accent}55)`,
                            border: `1px solid ${app.accent}77`,
                          }}
                        >
                          <Icon size={28} style={{ color: app.accent }} />
                        </div>
                        <span className="search-result-name">{app.name}</span>
                        <span className="search-result-cat">{app.category}</span>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-results-msg">
                  No applications found matching "{searchQuery}"
                </div>
              )}
            </div>
          ) : (
            /* Open Windows Tiled Spread (GNOME Activities standard) */
            <div className="activities-windows-view">
              {windows.length > 0 ? (
                <div className="windows-tile-grid">
                  {windows.map((w) => {
                    const app = APPS_CONFIG[w.id];
                    const Icon = app?.icon || AppWindow;
                    const isActive = activeWindowId === w.id;

                    return (
                      <motion.div
                        key={w.id}
                        className={`window-tile-card ${isActive ? "active" : ""}`}
                        whileHover={{ scale: 1.03, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          onSelectWindow(w.id);
                          onClose();
                        }}
                      >
                        {/* Header with Close Button */}
                        <div className="window-tile-header">
                          <div className="window-tile-title">
                            <Icon size={16} style={{ color: app?.accent }} />
                            <span>{app?.name || w.id}</span>
                          </div>
                          <button
                            type="button"
                            className="window-tile-close"
                            title="Close Window"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCloseWindow(w.id);
                            }}
                          >
                            <X size={13} />
                          </button>
                        </div>

                        {/* Thumbnail Preview Surface */}
                        <div className="window-tile-preview">
                          <div
                            className="preview-icon-backdrop"
                            style={{
                              background: `radial-gradient(circle, ${app?.accent}33 0%, transparent 70%)`,
                            }}
                          >
                            <Icon size={48} style={{ color: app?.accent }} />
                          </div>
                          {app?.sourceLabel && (
                            <span
                              className={`badge badge-${app.sourceLabel}`}
                              style={{ position: "absolute", bottom: 10, right: 10 }}
                            >
                              {app.sourceLabel}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="activities-empty-state">
                  <AppWindow size={48} style={{ opacity: 0.4, color: "var(--text-muted)" }} />
                  <h4>No Active Windows</h4>
                  <p>Choose an application below or search above to get started.</p>
                </div>
              )}

              {/* Bottom Quick Apps Dock Row */}
              <div className="activities-quick-dock">
                {APP_IDS.map((id) => {
                  const app = APPS_CONFIG[id];
                  const Icon = app.icon;
                  const isRunning = windows.some((w) => w.id === id);

                  return (
                    <motion.button
                      key={id}
                      className="quick-dock-btn"
                      title={app.name}
                      whileHover={{ scale: 1.15, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        onLaunchApp(id);
                        onClose();
                      }}
                    >
                      <div
                        className="quick-dock-icon-inner"
                        style={{
                          background: `linear-gradient(135deg, ${app.accent}30, ${app.accent}55)`,
                          border: `1px solid ${app.accent}77`,
                        }}
                      >
                        <Icon size={22} style={{ color: app.accent }} />
                      </div>
                      {isRunning && <span className="quick-dock-dot" />}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

