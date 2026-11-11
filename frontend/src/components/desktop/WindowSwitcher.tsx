import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { APPS_CONFIG } from "../../config/apps";
import type { WindowState, AppId } from "../../types/desktop";
import { useTheme } from "../../context/ThemeContext";

interface WindowSwitcherProps {
  isOpen: boolean;
  windows: WindowState[];
  selectedIndex: number;
}

export const WindowSwitcher: React.FC<WindowSwitcherProps> = ({
  isOpen,
  windows,
  selectedIndex,
}) => {
  const { reduceMotion } = useTheme();

  if (!isOpen || windows.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="window-switcher-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.12 }}
      >
        <motion.div
          className="window-switcher-hud"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            duration: reduceMotion ? 0.01 : undefined,
          }}
        >
          <div className="window-switcher-list">
            {windows.map((w, index) => {
              const app = APPS_CONFIG[w.id];
              const Icon = app?.icon;
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={w.id}
                  className={`window-switcher-item ${
                    isSelected ? "selected" : ""
                  }`}
                >
                  <div
                    className="switcher-icon-wrapper"
                    style={{
                      background: `linear-gradient(135deg, ${app?.accent}35, ${app?.accent}60)`,
                      border: `1px solid ${app?.accent}88`,
                      boxShadow: isSelected
                        ? `0 0 20px ${app?.accent}88`
                        : undefined,
                    }}
                  >
                    {Icon && (
                      <Icon
                        size={36}
                        style={{ color: app?.accent || "#ffffff" }}
                      />
                    )}
                  </div>
                  <span className="switcher-item-name">{app?.name || w.id}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

