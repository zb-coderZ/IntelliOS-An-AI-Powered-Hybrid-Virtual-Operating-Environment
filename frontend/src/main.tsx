import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import { WallpaperProvider } from "./context/WallpaperContext";
import { NotificationProvider } from "./context/NotificationContext";
import { UserProvider } from "./context/UserContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <WallpaperProvider>
      <NotificationProvider>
        <UserProvider>
          <App />
        </UserProvider>
      </NotificationProvider>
    </WallpaperProvider>
  </ThemeProvider>
);
