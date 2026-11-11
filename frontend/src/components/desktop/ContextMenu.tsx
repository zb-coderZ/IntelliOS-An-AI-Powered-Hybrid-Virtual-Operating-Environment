import React, { useEffect, useRef } from "react";
import {
  Terminal,
  Folder,
  Image,
  Settings,
  Activity,
  Info,
  Maximize2,
  RefreshCw,
} from "lucide-react";
import type { AppId } from "../../types/desktop";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onLaunchApp: (id: AppId) => void;
  onReload?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onLaunchApp,
  onReload,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Adjust position so it doesn't overflow screen boundaries
  const menuWidth = 220;
  const menuHeight = 240;
  const safeX = Math.min(x, window.innerWidth - menuWidth - 10);
  const safeY = Math.min(y, window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      className="desktop-context-menu"
      style={{ left: safeX, top: safeY }}
    >
      <button
        className="context-menu-item"
        onClick={() => {
          onLaunchApp("IntelliTerminal");
          onClose();
        }}
      >
        <Terminal size={14} style={{ color: "#10b981" }} />
        <span>Open Terminal</span>
        <span className="shortcut-hint">Ctrl+Alt+T</span>
      </button>

      <button
        className="context-menu-item"
        onClick={() => {
          onLaunchApp("IntelliFiles");
          onClose();
        }}
      >
        <Folder size={14} style={{ color: "#f59e0b" }} />
        <span>Browse Files</span>
      </button>

      <button
        className="context-menu-item"
        onClick={() => {
          onLaunchApp("IntelliMonitor");
          onClose();
        }}
      >
        <Activity size={14} style={{ color: "#38bdf8" }} />
        <span>System Monitor</span>
      </button>

      <div className="context-menu-separator" />

      <button
        className="context-menu-item"
        onClick={() => {
          onLaunchApp("IntelliSettings");
          onClose();
        }}
      >
        <Image size={14} style={{ color: "#ec4899" }} />
        <span>Change Background...</span>
      </button>

      <button
        className="context-menu-item"
        onClick={() => {
          onLaunchApp("IntelliSettings");
          onClose();
        }}
      >
        <Settings size={14} style={{ color: "#a855f7" }} />
        <span>Display Settings</span>
      </button>

      <div className="context-menu-separator" />

      <button
        className="context-menu-item"
        onClick={() => {
          onLaunchApp("IntelliAI");
          onClose();
        }}
      >
        <Info size={14} style={{ color: "var(--accent)" }} />
        <span>Ask IntelliAI Tutor</span>
      </button>
    </div>
  );
};
