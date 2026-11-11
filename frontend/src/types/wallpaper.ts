export type WallpaperId =
  | "aurora"
  | "particles"
  | "matrix"
  | "static-gradient"
  | "solid";

export interface WallpaperOption {
  id: WallpaperId;
  name: string;
  description: string;
  animated: boolean;
  previewGradient: string;
}

export const WALLPAPER_OPTIONS: WallpaperOption[] = [
  {
    id: "aurora",
    name: "Ubuntu Aurora",
    description: "Flowing organic gradient mesh with glowing floating orbs",
    animated: true,
    previewGradient: "radial-gradient(circle at 70% 30%, #e95420, #77216f 50%, #1e1028)",
  },
  {
    id: "particles",
    name: "Neural Particles",
    description: "Subtle constellation starfield with soft interactive links",
    animated: true,
    previewGradient: "radial-gradient(circle at 50% 50%, #3b82f6 0%, #1e1b4b 60%, #0a0a14 100%)",
  },
  {
    id: "matrix",
    name: "Cyber Matrix Rain",
    description: "Low-opacity authentic falling glyphs in cyber stream",
    animated: true,
    previewGradient: "linear-gradient(180deg, #022c22 0%, #051410 50%, #020705 100%)",
  },
  {
    id: "static-gradient",
    name: "Ubuntu Jammy Gradient",
    description: "Classic high-contrast static Linux desktop gradient",
    animated: false,
    previewGradient: "linear-gradient(135deg, #2c001e 0%, #77216f 40%, #e95420 100%)",
  },
  {
    id: "solid",
    name: "Minimal Solid",
    description: "Ultra-clean solid background with maximum contrast",
    animated: false,
    previewGradient: "linear-gradient(135deg, #180c22, #180c22)",
  },
];

