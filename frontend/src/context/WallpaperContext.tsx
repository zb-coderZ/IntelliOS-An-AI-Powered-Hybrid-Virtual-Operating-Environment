import React, { createContext, useContext, useEffect, useState } from "react";
import type { WallpaperId } from "../types/wallpaper";

interface WallpaperContextType {
  wallpaper: WallpaperId;
  setWallpaper: (id: WallpaperId) => void;
  enableParallax: boolean;
  setEnableParallax: (enable: boolean) => void;
}

const WallpaperContext = createContext<WallpaperContextType | undefined>(undefined);

const WALLPAPER_KEY = "intellios_wallpaper";
const PARALLAX_KEY = "intellios_parallax";

export const WallpaperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallpaper, setWallpaperState] = useState<WallpaperId>(() => {
    const saved = localStorage.getItem(WALLPAPER_KEY) as WallpaperId | null;
    return saved || "aurora";
  });

  const [enableParallax, setEnableParallaxState] = useState<boolean>(() => {
    const saved = localStorage.getItem(PARALLAX_KEY);
    return saved !== null ? saved === "true" : true;
  });

  const setWallpaper = (id: WallpaperId) => {
    setWallpaperState(id);
    localStorage.setItem(WALLPAPER_KEY, id);
  };

  const setEnableParallax = (enable: boolean) => {
    setEnableParallaxState(enable);
    localStorage.setItem(PARALLAX_KEY, String(enable));
  };

  return (
    <WallpaperContext.Provider
      value={{
        wallpaper,
        setWallpaper,
        enableParallax,
        setEnableParallax,
      }}
    >
      {children}
    </WallpaperContext.Provider>
  );
};

export const useWallpaper = () => {
  const context = useContext(WallpaperContext);
  if (!context) {
    throw new Error("useWallpaper must be used within a WallpaperProvider");
  }
  return context;
};

