import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Square, Copy, X } from "lucide-react";
import { APPS_CONFIG } from "../../config/apps";
import type { WindowState } from "../../types/desktop";
import { useTheme } from "../../context/ThemeContext";

interface WindowFrameProps {
  window: WindowState;
  isActive: boolean;
  dockIndex?: number;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({
  window: w,
  isActive,
  dockIndex = 0,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onDragStart,
  children,
}) => {
  const { reduceMotion } = useTheme();
  const app = APPS_CONFIG[w.id];
  const IconComponent = app?.icon;

  // Approximate target location in left dock for genie minimize animation
  const dockTargetY = 32 + 14 + dockIndex * 58 + 24;
  const dockTargetX = 34;

  // Compute layout coordinates depending on max or snapState
  const getWindowTarget = () => {
    if (w.min) {
      return {
        x: dockTargetX,
        y: dockTargetY,
        width: 120,
        height: 60,
        scale: 0.15,
        opacity: 0,
        borderRadius: 16,
      };
    }

    if (w.max) {
      return {
        x: 68,
        y: 32,
        width: typeof window !== "undefined" ? window.innerWidth - 68 : 1000,
        height: typeof window !== "undefined" ? window.innerHeight - 32 : 700,
        scale: 1,
        opacity: 1,
        borderRadius: 0,
      };
    }

    if (w.snapState === "left") {
      const halfW = typeof window !== "undefined" ? (window.innerWidth - 68) / 2 : 500;
      return {
        x: 68,
        y: 32,
        width: halfW,
        height: typeof window !== "undefined" ? window.innerHeight - 32 : 700,
        scale: 1,
        opacity: 1,
        borderRadius: 10,
      };
    }

    if (w.snapState === "right") {
      const halfW = typeof window !== "undefined" ? (window.innerWidth - 68) / 2 : 500;
      return {
        x: 68 + halfW,
        y: 32,
        width: halfW,
        height: typeof window !== "undefined" ? window.innerHeight - 32 : 700,
        scale: 1,
        opacity: 1,
        borderRadius: 10,
      };
    }

    return {
      x: w.x,
      y: w.y,
      width: w.width || 620,
      height: w.height || 410,
      scale: 1,
      opacity: 1,
      borderRadius: 12,
    };
  };

  const target = getWindowTarget();

  const transitionSettings = reduceMotion
    ? { duration: 0.01 }
    : {
        type: "spring" as const,
        stiffness: 340,
        damping: 28,
        mass: 0.85,
      };

  return (
    <motion.div
      className={`win ${isActive ? "active-window" : "inactive-window"}${
        w.max ? " max" : ""
      }${w.isDragging ? " is-dragging" : ""}`}
      style={{
        zIndex: w.z,
        pointerEvents: w.min ? "none" : "auto",
        position: "fixed",
      }}
      initial={{
        x: w.x,
        y: w.y + 15,
        scale: 0.9,
        opacity: 0,
      }}
      animate={{
        x: target.x,
        y: target.y,
        width: target.width,
        height: target.height,
        scale: target.scale,
        opacity: target.opacity,
        borderRadius: target.borderRadius,
      }}
      exit={{
        scale: 0.88,
        opacity: 0,
        transition: { duration: reduceMotion ? 0.01 : 0.16 },
      }}
      transition={transitionSettings}
      onMouseDown={onFocus}
    >
      {/* Window Titlebar */}
      <div
        className="title"
        onMouseDown={onDragStart}
        onDoubleClick={onToggleMaximize}
      >
        <div className="title-info">
          {IconComponent && (
            <IconComponent size={16} style={{ color: app?.accent || "var(--accent)" }} />
          )}
          <span className="window-title-text">{app?.name || w.id}</span>
          {app?.sourceLabel && (
            <span
              className={`badge badge-${app.sourceLabel}`}
              style={{ fontSize: 10, padding: "1px 7px" }}
            >
              {app.sourceLabel}
            </span>
          )}
        </div>

        {/* High Contrast Prominent Window Controls */}
        <div className="title-actions">
          <button
            type="button"
            className="win-ctrl-btn minimize"
            title="Minimize"
            aria-label="Minimize Window"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
          >
            <Minus size={13} strokeWidth={2.8} />
          </button>

          <button
            type="button"
            className="win-ctrl-btn maximize"
            title={w.max || w.snapState ? "Restore" : "Maximize"}
            aria-label={w.max || w.snapState ? "Restore Down" : "Maximize Window"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleMaximize();
            }}
          >
            {w.max || w.snapState ? (
              <Copy size={12} strokeWidth={2.6} />
            ) : (
              <Square size={12} strokeWidth={2.6} />
            )}
          </button>

          <button
            type="button"
            className="win-ctrl-btn close"
            title="Close"
            aria-label="Close Window"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <X size={13} strokeWidth={2.8} />
          </button>
        </div>
      </div>

      {/* Window Body */}
      <div className="body">{children}</div>
    </motion.div>
  );
};
