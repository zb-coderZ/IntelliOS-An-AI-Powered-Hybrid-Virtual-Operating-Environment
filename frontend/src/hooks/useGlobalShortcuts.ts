import { useEffect, useRef } from "react";
import type { AppId, WindowState } from "../types/desktop";

interface ShortcutHandlers {
  toggleOverview: () => void;
  closeOverlays: () => void;
  openTerminal: () => void;
  closeActiveWindow: () => void;
  snapActiveWindow: (direction: "left" | "right" | "max" | "restore") => void;
  onAltTabPress: (reverse: boolean) => void;
  onAltTabRelease: () => void;
  isAltTabActive: boolean;
}

export function useGlobalShortcuts({
  toggleOverview,
  closeOverlays,
  openTerminal,
  closeActiveWindow,
  snapActiveWindow,
  onAltTabPress,
  onAltTabRelease,
  isAltTabActive,
}: ShortcutHandlers) {
  const altPressedRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts if typing inside an input/textarea (except special combos)
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // 1. Super / Windows / Meta key -> Toggle Activities Overview
      if (e.key === "Meta" || e.key === "OS") {
        e.preventDefault();
        toggleOverview();
        return;
      }

      // 2. Escape key -> Close any overlay / overview / launcher
      if (e.key === "Escape") {
        closeOverlays();
        return;
      }

      // 3. Ctrl + Alt + T -> Open Terminal (Ubuntu default)
      if (e.ctrlKey && e.altKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        openTerminal();
        return;
      }

      // 4. Alt + F4 -> Close current focused window
      if (e.altKey && e.key === "F4") {
        e.preventDefault();
        closeActiveWindow();
        return;
      }

      // 5. Alt + Tab -> Window Switcher HUD
      if (e.altKey && e.key === "Tab") {
        e.preventDefault();
        altPressedRef.current = true;
        onAltTabPress(e.shiftKey);
        return;
      }

      // 6. Super / Meta + Arrow Keys -> Window Snapping
      if (e.metaKey || (e.altKey && !isInput)) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          snapActiveWindow("left");
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          snapActiveWindow("right");
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          snapActiveWindow("max");
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          snapActiveWindow("restore");
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt" && altPressedRef.current) {
        altPressedRef.current = false;
        onAltTabRelease();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    toggleOverview,
    closeOverlays,
    openTerminal,
    closeActiveWindow,
    snapActiveWindow,
    onAltTabPress,
    onAltTabRelease,
  ]);
}

