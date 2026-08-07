import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Bell } from "lucide-react";
import Sidebar from "./Sidebar";
import NotificationPanel from "./NotificationPanel";
import { getNotifications } from "../api/notifications";

const LAST_SEEN_KEY = "notifications_last_seen";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
    getNotifications()
      .then((res) => {
        const count = lastSeen
          ? res.data.filter((n) => new Date(n.created_at) > new Date(lastSeen)).length
          : res.data.length;
        setUnreadCount(count);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        window.innerWidth <= 768 &&
        sidebarOpen &&
        !e.target.closest(".sidebar") &&
        !e.target.closest(".sidebar-toggle")
      ) {
        setSidebarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sidebarOpen]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 769) {
        setSidebarOpen(true);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <div
        className={`app-layout ${
          sidebarOpen ? "sidebar-open" : "sidebar-closed"
        }`}
      >
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      <button
        className="notification-bell"
        onClick={() => {
          setNotificationOpen((o) => !o);
          setUnreadCount(0);
          localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
        }}
        title="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="bell-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <NotificationPanel
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      />
    </>
  );
}
