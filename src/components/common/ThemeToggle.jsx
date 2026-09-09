import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function ThemeToggle({ variant = "floating", className = "" }) {
  const { theme, resolvedTheme, isDark, setTheme, toggleTheme } = useTheme();

  if (variant === "segmented") {
    return (
      <div className={`theme-segmented-control ${className}`} role="radiogroup" aria-label="Theme switcher">
        <button
          type="button"
          className={`theme-segment-btn ${theme === "light" ? "active" : ""}`}
          onClick={() => setTheme("light")}
          title="Light mode"
          aria-label="Light mode"
          aria-checked={theme === "light"}
          role="radio"
        >
          <Sun size={14} className="theme-icon" />
          <span>Light</span>
        </button>
        <button
          type="button"
          className={`theme-segment-btn ${theme === "system" ? "active" : ""}`}
          onClick={() => setTheme("system")}
          title="System default"
          aria-label="System default"
          aria-checked={theme === "system"}
          role="radio"
        >
          <Monitor size={14} className="theme-icon" />
          <span>Auto</span>
        </button>
        <button
          type="button"
          className={`theme-segment-btn ${theme === "dark" ? "active" : ""}`}
          onClick={() => setTheme("dark")}
          title="Dark mode"
          aria-label="Dark mode"
          aria-checked={theme === "dark"}
          role="radio"
        >
          <Moon size={14} className="theme-icon" />
          <span>Dark</span>
        </button>
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className={`sidebar-theme-toggle ${className}`}>
        <button
          type="button"
          className="sidebar-theme-btn"
          onClick={toggleTheme}
          title={`Switch to ${isDark ? "light" : "dark"} mode`}
          aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        >
          <span className="sidebar-theme-icon-wrap">
            {isDark ? <Sun size={17} className="theme-icon-sun" /> : <Moon size={17} className="theme-icon-moon" />}
          </span>
          <span className="sidebar-theme-text">
            {isDark ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
        <button
          type="button"
          className={`sidebar-theme-auto-btn ${theme === "system" ? "active" : ""}`}
          onClick={() => setTheme(theme === "system" ? (isDark ? "dark" : "light") : "system")}
          title={theme === "system" ? "Using system preference" : "Set to system preference"}
          aria-label="Toggle system theme"
        >
          <Monitor size={14} />
          <span>Auto</span>
        </button>
      </div>
    );
  }

  // Default: Floating / Icon Button
  return (
    <button
      type="button"
      className={`theme-toggle-btn ${isDark ? "is-dark" : "is-light"} ${className}`}
      onClick={toggleTheme}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span className="theme-toggle-icon-container">
        <Sun size={20} className="theme-icon-sun" />
        <Moon size={20} className="theme-icon-moon" />
      </span>
    </button>
  );
}
