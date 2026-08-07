import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

import { registerSW } from "virtual:pwa-register";

// ---------- Offline / Online UI Indicator ----------

function createBanner(id, text, bgColor) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.id = id;
  banner.textContent = text;
  Object.assign(banner.style, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    zIndex: "99999",
    padding: "10px 16px",
    textAlign: "center",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "system-ui, sans-serif",
    color: "#fff",
    backgroundColor: bgColor,
    transition: "transform 0.3s ease",
    transform: "translateY(0)",
  });
  document.body.prepend(banner);

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    banner.style.transform = "translateY(-100%)";
    setTimeout(() => banner.remove(), 300);
  }, 4000);
}

window.addEventListener("offline", () => {
  createBanner(
    "offline-banner",
    "⚠️ You are offline — showing saved university data",
    "#dc2626",
  );
});

window.addEventListener("online", () => {
  createBanner("online-banner", "✓ Back online — updating data...", "#16a34a");
});

// ---------- Register Service Worker ----------

registerSW({
  onNeedRefresh() {
    console.log("New app update available — refresh to get latest version.");
  },

  onOfflineReady() {
    createBanner(
      "offline-ready-banner",
      "✅ App is ready for offline use — cached university data available",
      "#2563eb",
    );
  },
});

// ---------- Render App ----------

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
