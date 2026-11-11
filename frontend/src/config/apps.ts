import {
  FolderKanban,
  Terminal,
  Cpu,
  FlaskConical,
  Gauge,
  Sparkles,
  Settings,
} from "lucide-react";
import type { AppId, AppMeta } from "../types/desktop";

export const APPS_CONFIG: Record<AppId, AppMeta> = {
  IntelliFiles: {
    id: "IntelliFiles",
    name: "Files",
    icon: FolderKanban,
    accent: "#f59e0b", // Warm Amber
    category: "System",
    description: "GNOME-style virtual and system filesystem browser",
    sourceLabel: "real-ubuntu",
  },
  IntelliTerminal: {
    id: "IntelliTerminal",
    name: "Terminal",
    icon: Terminal,
    accent: "#10b981", // Ubuntu Green / Emerald
    category: "Development",
    description: "WSL2 Ubuntu 24.04 Linux terminal shell",
    sourceLabel: "real-ubuntu",
  },
  IntelliTask: {
    id: "IntelliTask",
    name: "Task Manager",
    icon: Cpu,
    accent: "#ec4899", // Magenta / Fuchsia
    category: "System",
    description: "Process inspection, states, and process controls",
    sourceLabel: "real-windows",
  },
  IntelliLab: {
    id: "IntelliLab",
    name: "OS Lab",
    icon: FlaskConical,
    accent: "#f97316", // Ubuntu Orange
    category: "Development",
    description: "CPU scheduling, memory paging, and deadlock simulations",
    sourceLabel: "simulated",
  },
  IntelliMonitor: {
    id: "IntelliMonitor",
    name: "System Monitor",
    icon: Gauge,
    accent: "#06b6d4", // Electric Cyan
    category: "System",
    description: "Hardware telemetry for CPU, RAM, and storage",
    sourceLabel: "real-windows",
  },
  IntelliAI: {
    id: "IntelliAI",
    name: "AI Assistant",
    icon: Sparkles,
    accent: "#8b5cf6", // Purple / Violet
    category: "Tools",
    description: "Intelligent OS diagnostics and simulation tutor",
    sourceLabel: "simulated",
  },
  IntelliSettings: {
    id: "IntelliSettings",
    name: "Settings",
    icon: Settings,
    accent: "#64748b", // Slate Grey
    category: "Utilities",
    description: "Appearance, desktop themes, wallpapers, and profiles",
  },
};

export const APP_IDS: AppId[] = Object.keys(APPS_CONFIG) as AppId[];

