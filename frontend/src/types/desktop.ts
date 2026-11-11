import type { LucideIcon } from "lucide-react";

export type AppId =
  | "IntelliFiles"
  | "IntelliTerminal"
  | "IntelliTask"
  | "IntelliLab"
  | "IntelliMonitor"
  | "IntelliAI"
  | "IntelliSettings";

export type ThemeId = "ubuntu-dark" | "ubuntu-light" | "kali-dark";

export type SnapType = "none" | "left" | "right" | "full";

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppMeta {
  id: AppId;
  name: string;
  icon: LucideIcon;
  accent: string;
  category: "System" | "Development" | "Tools" | "Utilities";
  description: string;
  sourceLabel?: "simulated" | "real-windows" | "real-ubuntu";
}

export interface WindowState {
  id: AppId;
  title?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  min: boolean;
  max: boolean;
  snapState?: SnapType;
  prevBounds?: WindowBounds;
  isDragging?: boolean;
}

export interface SnapPreviewData {
  type: SnapType;
  x: number;
  y: number;
  width: number;
  height: number;
}
