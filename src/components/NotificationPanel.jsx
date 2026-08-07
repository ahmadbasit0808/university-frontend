import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getNotifications,
  createNotification,
  updateNotification,
  deactivateNotification,
} from "../api/notifications";

const defaultForm = {
  title: "",
  message: "",
  department: "",
  program: "",
  roll_no: "",
};

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function NotificationPanel({ isOpen, onClose }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [deactivateConfirmId, setDeactivateConfirmId] = useState(null);
  const panelRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getNotifications();
      setNotifications(res.data);
    } catch {
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close panel on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Close panel on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        !e.target.closest(".notification-bell")
      ) {
        onClose();
      }
    }
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // add this effect near your other useEffects
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setShowForm(true);
  };

  const handleOpenEdit = (notification) => {
    setEditing(notification);
    setForm({
      title: notification.title,
      message: notification.message,
      department: notification.department || "",
      program: notification.program || "",
      roll_no: notification.roll_no || "",
    });
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(defaultForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      setError("Title and message are required");
      return;
    }
    if (form.title.length > 255) { setError("Title must be 255 characters or less"); return; }
    if (form.roll_no && form.roll_no.trim().length > 20) { setError("Roll No must be 20 characters or less"); return; }
    try {
      setSubmitting(true);
      setError("");

      // Build payload: convert empty strings to null for optional fields
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        department: form.department.trim() || null,
        program: form.program.trim() || null,
        roll_no: form.roll_no.trim() || null,
      };

      if (editing) {
        await updateNotification(editing.id, payload);
      } else {
        await createNotification(payload);
      }

      setShowForm(false);
      setEditing(null);
      setForm(defaultForm);
      fetchNotifications();
    } catch (err) {
      setError(err.response?.data?.error || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      setError("");
      await deactivateNotification(id);
      setDeactivateConfirmId(null);
      fetchNotifications();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to deactivate");
    }
  };

  return (
    <>
      {" "}
      <div
        className={`notification-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={`notification-panel ${isOpen ? "open" : ""}`}
        style={deactivateConfirmId !== null ? { overflow: "hidden" } : undefined}
      >
        {/* Header */}
        <div className="notification-panel-header">
          <h2>
            {showForm
              ? editing
                ? "Edit Notification"
                : "New Notification"
              : "Notifications"}
          </h2>

          <div className="notification-panel-header-actions">
            {isAuthenticated && !showForm && (
              <button
                className="btn btn-sm btn-primary"
                onClick={handleOpenCreate}
                title="Add new notification"
              >
                + New
              </button>
            )}

            {!showForm && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={fetchNotifications}
                disabled={loading}
                title="Refresh"
              >
                ↻
              </button>
            )}

            <button
              className="notification-close"
              onClick={() => {
                if (showForm) {
                  handleCancelForm();
                }
                onClose();
              }}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Create / Edit Form */}
        {showForm && (
          <div className="notification-form-wrapper">
            <form onSubmit={handleSubmit} className="notification-form">
              <div className="form-group">
                <label>Title *</label>
                <input
                  required
                  maxLength={255}
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target.value,
                    })
                  }
                  placeholder="Notification title"
                />
              </div>

              <div className="form-group">
                <label>Message *</label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      message: e.target.value,
                    })
                  }
                  placeholder="Notification message"
                />
              </div>

              <div className="form-group">
                <label>Department (optional)</label>
                <input
                  value={form.department}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      department: e.target.value,
                    })
                  }
                  placeholder="e.g. Computer Science"
                />
              </div>

              <div className="form-group">
                <label>Program (optional)</label>
                <input
                  value={form.program}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      program: e.target.value,
                    })
                  }
                  placeholder="e.g. BS"
                />
              </div>

              <div className="form-group">
                <label>Roll No (optional)</label>
                <input
                  maxLength={20}
                  value={form.roll_no}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      roll_no: e.target.value,
                    })
                  }
                  placeholder="e.g. BS-CS-24-M-01"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={handleCancelForm}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-sm btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : editing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Notification History */}
        {!showForm && (
          <div className="notification-list">
            {loading && notifications.length === 0 ? (
              <div className="loading-spinner">
                <div className="spinner" />
                <span>Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <span className="notification-empty-icon">🔔</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="notification-item">
                  <div className="notification-item-header">
                    <span className="notification-item-title">{n.title}</span>

                    <span className="notification-item-time">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>

                  <p className="notification-item-message">{n.message}</p>

                  {n.department && (
                    <span className="notification-item-tag">
                      {n.department}
                    </span>
                  )}

                  {n.program && (
                    <span className="notification-item-tag">{n.program}</span>
                  )}

                  {n.roll_no && (
                    <span className="notification-item-tag">{n.roll_no}</span>
                  )}

                  {isAuthenticated && (
                    <div className="notification-item-admin-actions">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleOpenEdit(n)}
                      >
                        ✏️ Edit
                      </button>

                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => setDeactivateConfirmId(n.id)}
                      >
                        🗑️ Deactivate
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {deactivateConfirmId !== null && (
        <div className="notification-confirm-overlay">
          <div className="notification-confirm-box">
            <p>Deactivate this notification?</p>
            <div className="form-actions">
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setDeactivateConfirmId(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleDeactivate(deactivateConfirmId)}
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
