import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { APPS_CONFIG, APP_IDS } from "../../config/apps";
import type { AppId } from "../../types/desktop";
import { useTheme } from "../../context/ThemeContext";

interface AppLauncherProps {
  isOpen: boolean;
  onLaunchApp: (id: AppId) => void;
  onClose: () => void;
}

export const AppLauncher: React.FC<AppLauncherProps> = ({
  isOpen,
  onLaunchApp,
  onClose,
}) => {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { reduceMotion } = useTheme();

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = APP_IDS.filter((id) => {
    const app = APPS_CONFIG[id];
    const q = search.toLowerCase();
    return (
      app.name.toLowerCase().includes(q) ||
      app.description.toLowerCase().includes(q) ||
      app.category.toLowerCase().includes(q)
    );
  });

  return (
    <AnimatePresence>
      <motion.div
        className="app-launcher-fullscreen-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.2 }}
        onClick={onClose}
      >
        <div
          className="app-launcher-inner"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Search Bar */}
          <div className="launcher-search-container">
            <div className="launcher-search-box">
              <Search size={20} className="search-icon" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search applications..."
                className="launcher-search-input"
              />
              {search && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearch("")}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Staggered Grid of Apps */}
          <motion.div
            className="launcher-apps-grid"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: reduceMotion ? 0 : 0.04,
                },
              },
            }}
          >
            {filtered.map((id) => {
              const app = APPS_CONFIG[id];
              const Icon = app.icon;

              return (
                <motion.div
                  key={id}
                  className="launcher-app-card"
                  variants={{
                    hidden: { opacity: 0, y: 16, scale: 0.94 },
                    show: { opacity: 1, y: 0, scale: 1 },
                  }}
                  whileHover={{ scale: 1.08, y: -4 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    onLaunchApp(id);
                    onClose();
                  }}
                >
                  <div
                    className="launcher-icon-box"
                    style={{
                      background: `linear-gradient(135deg, ${app.accent}30, ${app.accent}60)`,
                      border: `1px solid ${app.accent}80`,
                      boxShadow: `0 8px 24px ${app.accent}35`,
                    }}
                  >
                    <Icon size={34} style={{ color: app.accent }} />
                  </div>
                  <span className="launcher-app-name">{app.name}</span>
                  <span className="launcher-app-category">{app.category}</span>
                </motion.div>
              );
            })}
          </motion.div>

          {filtered.length === 0 && (
            <div className="launcher-no-results">
              No applications found matching "{search}"
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

