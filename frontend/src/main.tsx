import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import { WallpaperProvider } from "./context/WallpaperContext";
import { NotificationProvider } from "./context/NotificationContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <WallpaperProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </WallpaperProvider>
  </ThemeProvider>
);
