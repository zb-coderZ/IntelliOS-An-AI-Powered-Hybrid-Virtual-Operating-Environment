import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid } from "lucide-react";
import { APPS_CONFIG, APP_IDS } from "../../config/apps";
import type { AppId, WindowState } from "../../types/desktop";

interface DockProps {
  windows: WindowState[];
  activeWindowId?: AppId | null;
  onAppClick: (id: AppId) => void;
  onLauncherClick: () => void;
  isLauncherOpen?: boolean;
}

export const Dock: React.FC<DockProps> = ({
  windows,
  activeWindowId,
  onAppClick,
  onLauncherClick,
  isLauncherOpen = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [bouncingAppId, setBouncingAppId] = useState<AppId | null>(null);
  const [mouseY, setMouseY] = useState<number | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dockRef.current) {
      const rect = dockRef.current.getBoundingClientRect();
      setMouseY(e.clientY - rect.top);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setMouseY(null);
  };

  const handleItemClick = (id: AppId) => {
    // Trigger bounce animation
    setBouncingAppId(id);
    setTimeout(() => setBouncingAppId(null), 600);
    onAppClick(id);
  };

  return (
    <nav
      className="ubuntu-dock"
      ref={dockRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-label="Applications Dock"
    >
      <div className="dock-apps-container">
        {APP_IDS.map((id, index) => {
          const app = APPS_CONFIG[id];
          const IconComponent = app.icon;
          const openWindow = windows.find((w) => w.id === id);
          const isOpen = Boolean(openWindow);
          const isFocused = activeWindowId === id && isOpen && !openWindow?.min;
          const isBouncing = bouncingAppId === id;

          // Calculate distance-based magnification for macOS/Ubuntu style scaling
          let scale = 1;
          if (hoveredIndex !== null) {
            const distance = Math.abs(index - hoveredIndex);
            if (distance === 0) {
              scale = 1.25;
            } else if (distance === 1) {
              scale = 1.1;
            }
          }

          return (
            <div
              key={id}
              className="dock-item-wrapper"
              onMouseEnter={() => setHoveredIndex(index)}
            >
              {/* Running indicator pip on the left */}
              <div className="dock-indicator-container">
                {isOpen && (
                  <span
                    className={`dock-indicator-pip ${isFocused ? "focused" : "running"}`}
                    style={{
                      backgroundColor: isFocused ? "var(--accent)" : "var(--text-secondary)",
                    }}
                  />
                )}
              </div>

              {/* Animated Icon Button */}
              <motion.button
                className={`dock-app-button ${isOpen ? "is-open" : ""} ${
                  isFocused ? "is-focused" : ""
                }`}
                onClick={() => handleItemClick(id)}
                animate={{
                  scale: isBouncing ? [1, 1.25, 0.9, 1.1, 1] : scale,
                  y: isBouncing ? [0, -10, 2, -4, 0] : 0,
                }}
                transition={{
                  duration: isBouncing ? 0.5 : 0.15,
                  ease: "easeOut",
                }}
                aria-label={app.name}
              >
                <div
                  className="dock-icon-inner"
                  style={{
                    background: `linear-gradient(135deg, ${app.accent}25, ${app.accent}45)`,
                    border: `1px solid ${app.accent}60`,
                    boxShadow: isFocused ? `0 0 12px ${app.accent}55` : undefined,
                  }}
                >
                  <IconComponent size={24} style={{ color: app.accent }} />
                </div>
              </motion.button>

              {/* Tooltip on the right */}
              <AnimatePresence>
                {hoveredIndex === index && (
                  <motion.div
                    className="dock-tooltip"
                    initial={{ opacity: 0, x: -8, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -6, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                  >
                    <span className="tooltip-title">{app.name}</span>
                    <span className="tooltip-category">{app.category}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Bottom Separator & 9-Dot App Launcher Button */}
      <div className="dock-bottom-section">
        <div className="dock-separator" />
        <div className="dock-item-wrapper">
          <motion.button
            className={`dock-launcher-btn ${isLauncherOpen ? "active" : ""}`}
            onClick={onLauncherClick}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Show Applications"
            title="Show Applications (Start Launcher)"
          >
            <LayoutGrid size={22} />
          </motion.button>
        </div>
      </div>
    </nav>
  );
};

