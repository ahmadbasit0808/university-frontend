import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/common/LoadingSpinner";
import DataTable from "../components/common/DataTable";
import Modal from "../components/common/Modal";
import {
  AlertCircle,
  Bookmark,
  ClockFading,
  GraduationCap,
  Hourglass,
  LibraryBig,
  Mail,
  MailCheck,
  MessageSquare,
  Phone,
  Search,
  Send,
  Tags,
  User2,
} from "lucide-react";
import {
  submitContact,
  getContactQueries,
  respondToQuery,
  updateQueryStatus,
  trackContactQuery,
  updateContactQuery,
  deleteContactQuery,
} from "../api/contact";

const statusColors = {
  Pending: "grade-c-plus",
  "In Progress": "grade-b-plus",
  Resolved: "grade-a-plus",
  Closed: "grade-f",
};

const statusDotClass = {
  Pending: "pending",
  "In Progress": "in-progress",
  Resolved: "resolved",
  Closed: "closed",
};

export default function Contact() {
  const { isAuthenticated } = useAuth();

  // Contact form state
  const [form, setForm] = useState({
    roll_no: "",
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [trackingId, setTrackingId] = useState("");

  const [trackingHistory, setTrackingHistory] = useState(() =>
    JSON.parse(localStorage.getItem("contactTrackingHistory") || "[]"),
  );

  const [trackedQuery, setTrackedQuery] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [error, setError] = useState("");

  // Admin queries state
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [respondModal, setRespondModal] = useState(null);
  const [respondText, setRespondText] = useState("");
  const [statusModal, setStatusModal] = useState(null);
  const [newStatus, setNewStatus] = useState("");

  // Handle form input
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Submit contact form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!form.name?.trim() || !form.email?.trim() || !form.message?.trim()) {
      setFormError("Name, email, and message are required.");
      return;
    }
    if (form.name.length > 255) {
      setFormError("Name must be 255 characters or less.");
      return;
    }
    if (form.email.length > 255) {
      setFormError("Email must be 255 characters or less.");
      return;
    }
    if (form.phone && form.phone.length > 20) {
      setFormError("Phone must be 20 characters or less.");
      return;
    }
    if (form.subject && form.subject.length > 255) {
      setFormError("Subject must be 255 characters or less.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitContact(form);

      const { tracking_id, created_at } = res.data;

      const newEntry = { tracking_id, created_at };

      const updatedHistory = [newEntry, ...trackingHistory].slice(0, 10);

      localStorage.setItem(
        "contactTrackingHistory",
        JSON.stringify(updatedHistory),
      );

      setTrackingHistory(updatedHistory);

      setTrackingId(tracking_id);

      setFormSuccess(
        `Your query has been submitted successfully! Tracking ID: ${tracking_id}`,
      );
      setForm({
        roll_no: "",
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      setFormError(
        err.response?.data?.error ||
          "Failed to submit query. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch queries (admin only)
  const fetchQueries = async () => {
    setLoading(true);
    try {
      const res = await getContactQueries(statusFilter || undefined);
      setQueries(res.data);
      // sync open detail modal with fresh data
      setSelectedQuery((prev) =>
        prev ? (res.data.find((q) => q.id === prev.id) ?? prev) : null,
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load queries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchQueries();
    }
  }, [isAuthenticated, statusFilter]);

  // View query details
  const handleViewQuery = (query) => {
    setSelectedQuery(query);
  };

  // Optimistically update a query in local state
  const updateQueryLocally = (id, patch) => {
    const apply = (q) => (q.id === id ? { ...q, ...patch } : q);
    setQueries((prev) => prev.map(apply));
    setSelectedQuery((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
  };

  // Respond to query
  const handleRespond = async () => {
    if (!respondText.trim()) return;
    const { id } = respondModal;
    const response = respondText;
    try {
      await respondToQuery(id, response);
      updateQueryLocally(id, { admin_response: response });
      setRespondModal(null);
      setRespondText("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send response");
    }
  };

  // Change status
  const handleStatusChange = async () => {
    const { id } = statusModal;
    const status = newStatus;
    try {
      await updateQueryStatus(id, status);
      updateQueryLocally(id, { status });
      setStatusModal(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update status");
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "subject", label: "Subject" },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <span className={`grade-badge ${statusColors[val] || "grade-b"}`}>
          {val}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Date",
      render: (val) => new Date(val).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="action-buttons">
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => handleViewQuery(row)}
          >
            View
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              setRespondModal(row);
              setRespondText(row.admin_response || "");
            }}
          >
            Respond
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => {
              setStatusModal(row);
              setNewStatus(row.status);
            }}
          >
            Status
          </button>
        </div>
      ),
    },
  ];

  const canModify =
    trackedQuery &&
    trackedQuery.status !== "Resolved" &&
    trackedQuery.status !== "Closed";

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError("");
    setEditSubmitting(true);
    try {
      await updateContactQuery(trackedQuery.tracking_id, editForm);
      const res = await trackContactQuery(trackedQuery.tracking_id);
      setTrackedQuery(res.data);
      setEditModal(false);
    } catch (err) {
      setEditError(err.response?.data?.error || "Failed to update query.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteContactQuery(trackedQuery.tracking_id);
      const deletedId = trackedQuery.tracking_id;
      setTrackedQuery(null);
      setTrackingId("");
      setDeleteConfirm(false);
      const updated = trackingHistory.filter(
        (e) => e.tracking_id !== deletedId,
      );
      setTrackingHistory(updated);
      localStorage.setItem("contactTrackingHistory", JSON.stringify(updated));
    } catch (err) {
      setTrackingError(err.response?.data?.error || "Failed to delete query");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleTrackQuery = async () => {
    if (!trackingId.trim()) return;

    setTrackingLoading(true);
    setTrackingError("");

    try {
      const res = await trackContactQuery(trackingId);
      setTrackedQuery(res.data);
    } catch (err) {
      setTrackedQuery(null);

      setTrackingError(err.response?.data?.error || "Query not found");
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="page">
      {!isAuthenticated && (
        <div className="contact-hero">
          <span className="contact-hero-icon">
            <MessageSquare height={40} width={40} />
          </span>
          <h1>Contact / Support</h1>
          <p>
            Have a question or need help with something? Submit a query below or
            track the status of one you already sent — we&apos;re here to help.
          </p>
        </div>
      )}

      {isAuthenticated && <h1>Contact / Support</h1>}

      {!isAuthenticated && (
        <div className="contact-grid">
          {/* Left column: Track + History */}
          <div>
            {/* Track Your Query Section */}
            <div className="contact-card" style={{ marginBottom: 24 }}>
              <div className="contact-card-header">
                <div className="contact-card-icon blue">
                  <Search />
                </div>
                <div>
                  <h3>Track Your Query</h3>
                  <p>Check the status of a query you&apos;ve submitted</p>
                </div>
              </div>

              <div className="contact-track-input-group">
                <div className="contact-track-input-wrapper">
                  <span className="contact-input-icon">
                    <Tags />
                  </span>
                  <input
                    className="contact-track-input"
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    placeholder="CNT-XXXXXX"
                  />
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={handleTrackQuery}
                  disabled={trackingLoading}
                >
                  {trackingLoading ? "Checking..." : "Check Status"}
                </button>
              </div>

              {trackingError && (
                <div
                  className="contact-alert contact-alert-error"
                  style={{ marginTop: 16 }}
                >
                  <span className="alert-icon">
                    <AlertCircle />
                  </span>
                  <span>{trackingError}</span>
                </div>
              )}

              {trackedQuery && (
                <div className="contact-track-result">
                  <div className="contact-track-result-header">
                    <span
                      className={`status-dot ${
                        statusDotClass[trackedQuery.status] || "pending"
                      }`}
                    />
                    <strong>{trackedQuery.status}</strong>
                  </div>

                  <div className="contact-track-result-body">
                    <p>
                      <span className="label">Tracking ID</span>
                      {trackedQuery.tracking_id}
                    </p>

                    {trackedQuery.subject && (
                      <p>
                        <span className="label">Subject</span>
                        {trackedQuery.subject}
                      </p>
                    )}

                    <p>
                      <span className="label">Message</span>
                      {trackedQuery.message}
                    </p>

                    {trackedQuery.admin_response ? (
                      <div className="contact-response-box">
                        <span className="response-label">Admin Response</span>
                        <p>{trackedQuery.admin_response}</p>
                      </div>
                    ) : (
                      <div className="contact-no-response">
                        <span>
                          <Hourglass />
                        </span>
                        <span>No response yet. Please check again later.</span>
                      </div>
                    )}

                    {canModify && (
                      <div className="form-actions" style={{ marginTop: 16 }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setEditForm({
                              name: trackedQuery.name || "",
                              email: trackedQuery.email || "",
                              phone: trackedQuery.phone || "",
                              subject: trackedQuery.subject || "",
                              message: trackedQuery.message || "",
                            });
                            setEditError("");
                            setEditModal(true);
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => setDeleteConfirm(true)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Submitted Queries History */}
            {trackingHistory.length > 0 && (
              <div className="contact-card">
                <div className="contact-card-header">
                  <div className="contact-card-icon green">
                    <ClockFading />
                  </div>
                  <div>
                    <h3>Your Submitted Queries</h3>
                    <p>Quick access to your recent tracking IDs</p>
                  </div>
                </div>

                <div className="contact-history-list">
                  {trackingHistory.map((entry) => (
                    <button
                      key={entry.tracking_id}
                      className="contact-history-item"
                      onClick={() => {
                        setTrackingId(entry.tracking_id);
                        trackContactQuery(entry.tracking_id)
                          .then((res) => setTrackedQuery(res.data))
                          .catch((err) => {
                            setTrackedQuery(null);
                            setTrackingError(
                              err.response?.data?.error || "Query not found",
                            );
                          });
                      }}
                    >
                      <span className="history-icon">
                        <Bookmark />
                      </span>
                      <span className="history-info">
                        <span className="history-id">{entry.tracking_id}</span>
                        {entry.created_at && (
                          <span className="history-date">
                            Submitted:{" "}
                            {new Date(entry.created_at).toLocaleDateString(
                              "en-GB",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              },
                            )}
                          </span>
                        )}
                      </span>
                      <span className="history-arrow">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column: Contact Form */}
          <div className="contact-card">
            <div className="contact-card-header">
              <div className="contact-card-icon purple">
                <Mail />
              </div>
              <div>
                <h3>Submit a Query</h3>
                <p>We&apos;ll get back to you as soon as possible</p>
              </div>
            </div>

            {formError && (
              <div className="contact-alert contact-alert-error">
                <span className="alert-icon">
                  <AlertCircle />
                </span>
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="contact-alert contact-alert-success">
                <span className="alert-icon">
                  <MailCheck />
                </span>
                <span>{formSuccess}</span>
              </div>
            )}

            <form className="form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Roll No. (optional)</label>
                <div className="contact-input-group">
                  <span className="contact-input-icon">
                    <GraduationCap height={18} width={18} />
                  </span>
                  <input
                    type="text"
                    name="roll_no"
                    className="form-input"
                    value={form.roll_no}
                    onChange={handleChange}
                    placeholder="e.g. BCS-123"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Name *</label>
                <div className="contact-input-group">
                  <span className="contact-input-icon">
                    {" "}
                    <User2 height={18} width={18} />
                  </span>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email *</label>
                <div className="contact-input-group">
                  <span className="contact-input-icon">
                    {" "}
                    <Mail height={18} width={18} />
                  </span>
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phone (optional)</label>
                <div className="contact-input-group">
                  <span className="contact-input-icon">
                    {" "}
                    <Phone height={18} width={18} />
                  </span>
                  <input
                    type="text"
                    name="phone"
                    className="form-input"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Subject (optional)</label>
                <div className="contact-input-group">
                  <span className="contact-input-icon">
                    <LibraryBig height={18} width={18} />
                  </span>
                  <input
                    type="text"
                    name="subject"
                    className="form-input"
                    value={form.subject}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Message *</label>
                <div className="contact-input-group">
                  <span className="contact-input-icon">
                    {" "}
                    <Send height={18} width={18} />
                  </span>
                  <textarea
                    name="message"
                    className="form-input"
                    rows={5}
                    value={form.message}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary contact-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Query"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Query Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Your Query"
      >
        <form onSubmit={handleEditSubmit}>
          {editError && (
            <div
              className="contact-alert contact-alert-error"
              style={{ marginBottom: 12 }}
            >
              <span className="alert-icon">
                <AlertCircle />
              </span>
              <span>{editError}</span>
            </div>
          )}
          {["name", "email", "phone", "subject"].map((field) => (
            <div className="form-group" key={field}>
              <label style={{ textTransform: "capitalize" }}>{field}</label>
              <input
                type={field === "email" ? "email" : "text"}
                className="form-input"
                value={editForm[field] || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, [field]: e.target.value })
                }
                required={field === "name" || field === "email"}
              />
            </div>
          ))}
          <div className="form-group">
            <label>Message</label>
            <textarea
              className="form-input"
              rows={4}
              value={editForm.message || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, message: e.target.value })
              }
              required
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEditModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={editSubmitting}
            >
              {editSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Delete Query"
      >
        <p style={{ marginBottom: 20 }}>
          Are you sure you want to delete this query? This action cannot be
          undone.
        </p>
        <div className="form-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setDeleteConfirm(false)}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={deleteLoading}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>

      {/* Admin View */}
      {isAuthenticated && (
        <>
          <div
            className="filters contact-admin-filters"
            style={{ marginBottom: 16 }}
          >
            <div className="form-group">
              <label>Filter by Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input"
              >
                <option value="">All</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <div className="contact-admin-refresh">
              <button className="btn btn-secondary" onClick={fetchQueries}>
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : queries.length === 0 ? (
            <div className="contact-empty-state">
              <span className="empty-icon">📭</span>
              <p>No contact queries found.</p>
            </div>
          ) : (
            <DataTable columns={columns} data={queries} />
          )}

          {/* View Query Detail Modal */}
          <Modal
            isOpen={!!selectedQuery}
            onClose={() => setSelectedQuery(null)}
            title="Query Details"
          >
            {selectedQuery && (
              <div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label>Name</label>
                  <p>{selectedQuery.name}</p>
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label>Email</label>
                  <p>{selectedQuery.email}</p>
                </div>
                {selectedQuery.roll_no && (
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label>Roll No</label>
                    <p>{selectedQuery.roll_no}</p>
                  </div>
                )}
                {selectedQuery.phone && (
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label>Phone</label>
                    <p>{selectedQuery.phone}</p>
                  </div>
                )}
                {selectedQuery.subject && (
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label>Subject</label>
                    <p>{selectedQuery.subject}</p>
                  </div>
                )}
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label>Message</label>
                  <p style={{ whiteSpace: "pre-wrap" }}>
                    {selectedQuery.message}
                  </p>
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label>Status</label>
                  <p>
                    <span
                      className={`grade-badge ${
                        statusColors[selectedQuery.status] || "grade-b"
                      }`}
                    >
                      {selectedQuery.status}
                    </span>
                  </p>
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label>Submitted On</label>
                  <p>{new Date(selectedQuery.created_at).toLocaleString()}</p>
                </div>
                {selectedQuery.admin_response && (
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label>Admin Response</label>
                    <p
                      style={{
                        whiteSpace: "pre-wrap",
                        background: "#f8fafc",
                        padding: 12,
                        borderRadius: 8,
                      }}
                    >
                      {selectedQuery.admin_response}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Modal>

          {/* Respond Modal */}
          <Modal
            isOpen={!!respondModal}
            onClose={() => setRespondModal(null)}
            title="Respond to Query"
          >
            {respondModal && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <p>
                    <strong>From:</strong> {respondModal.name} (
                    {respondModal.email})
                  </p>
                  <p>
                    <strong>Message:</strong> {respondModal.message}
                  </p>
                </div>
                <div className="form-group">
                  <label>Your Response</label>
                  <textarea
                    className="form-input"
                    rows={5}
                    value={respondText}
                    onChange={(e) => setRespondText(e.target.value)}
                    placeholder="Type your response here..."
                  />
                </div>
                <div className="form-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setRespondModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleRespond}
                    disabled={!respondText.trim()}
                  >
                    Send Response
                  </button>
                </div>
              </div>
            )}
          </Modal>

          {/* Status Update Modal */}
          <Modal
            isOpen={!!statusModal}
            onClose={() => setStatusModal(null)}
            title="Update Status"
          >
            {statusModal && (
              <div>
                <p style={{ marginBottom: 16 }}>
                  Change status for query from{" "}
                  <strong>{statusModal.name}</strong>:
                </p>
                <div className="form-group">
                  <label>New Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="form-input"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setStatusModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleStatusChange}
                    disabled={newStatus === statusModal.status}
                  >
                    Update Status
                  </button>
                </div>
              </div>
            )}
          </Modal>
        </>
      )}
    </div>
  );
}
