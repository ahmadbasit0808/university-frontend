import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getSemesters, createSemester, deleteSemester } from "../api/semesters";
import DataTable from "../components/common/DataTable";
import Modal from "../components/common/Modal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Toast from "../components/common/Toast";

const defaultForm = {
  university: "University of the Punjab (Gujranwala Campus)",
  department: "Information Technology",
  program: "Computer Science",
  session: "2024-2028",
  semester: "1st",
  declaration_date: "",
};

export default function Semesters() {
  const { isAuthenticated } = useAuth();
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    semester: null,
  });
  const [toast, setToast] = useState("");
  const navigate = useNavigate();

  const fetchSemesters = async () => {
    try {
      setLoading(true);
      const res = await getSemesters();
      setSemesters(res.data);
    } catch {
      setError("Failed to load semesters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await createSemester(form);
      setModalOpen(false);
      setForm(defaultForm);
      setToast("Semester created");
      fetchSemesters();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create semester");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSemester(confirmDialog.semester.id);
      setConfirmDialog({ open: false, semester: null });
      setToast("Semester deleted");
      fetchSemesters();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete semester");
    }
  };

  const columns = [
    // { key: "university", label: "University" },
    // { key: "department", label: "Department" },
    { key: "program", label: "Program" },
    { key: "session", label: "Session" },
    { key: "semester", label: "Semester" },
    {
      key: "semester_start_date",
      label: "Start Date",
      render: (val) =>
        val
          ? new Date(val).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "-",
    },
    {
      key: "declaration_date",
      label: "Result Date",
      render: (val) =>
        val
          ? new Date(val).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "-",
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => navigate(`/semesters/${row.id}/courses`)}
          >
            View Courses
          </button>
          <button
            className="btn btn-sm btn-success"
            onClick={() => navigate(`/results/semester/${row.id}`)}
          >
            Result
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Semesters</h1>
        {isAuthenticated && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setError("");
              setForm(defaultForm);
              setModalOpen(true);
            }}
          >
            + Add Semester
          </button>
        )}
      </div>
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
      {error && <div className="alert alert-error">{error}</div>}
      <DataTable
        columns={columns}
        data={semesters}
        searchable={false}
        loading={loading}
        onDelete={(semester) => setConfirmDialog({ open: true, semester })}
        emptyMessage="No semesters found."
        defaultSortKey="semester"
        defaultSortDir="asc"
        tableId="semesters"
        cardAccent="#10b981"
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setError("");
        }}
        title="Add Semester"
      >
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>University *</label>
            <input
              required
              value={form.university}
              onChange={(e) => setForm({ ...form, university: e.target.value })}
              placeholder="University of Example"
            />
          </div>
          <div className="form-group">
            <label>Department *</label>
            <input
              required
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="Computer Science"
            />
          </div>
          <div className="form-group">
            <label>Program *</label>
            <input
              required
              value={form.program}
              onChange={(e) => setForm({ ...form, program: e.target.value })}
              placeholder="BS-CS"
            />
          </div>
          <div className="form-group">
            <label>Session *</label>
            <input
              required
              value={form.session}
              onChange={(e) => setForm({ ...form, session: e.target.value })}
              placeholder="2024-2028"
            />
          </div>
          <div className="form-group">
            <label>Semester *</label>
            <select
              value={form.semester}
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
            >
              {["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"].map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ),
              )}
            </select>
          </div>
          <div className="form-group">
            <label>Declaration Date</label>
            <input
              type="date"
              value={form.declaration_date}
              onChange={(e) =>
                setForm({ ...form, declaration_date: e.target.value })
              }
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setModalOpen(false);
                setError("");
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, semester: null })}
        onConfirm={handleDelete}
        title="Delete Semester"
        message={`Delete semester ${confirmDialog.semester?.semester} (${confirmDialog.semester?.session})?`}
      />
    </div>
  );
}
