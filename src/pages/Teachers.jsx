import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  getTeachers,
  createTeacher,
  updateTeacher,
  deactivateTeacher,
} from "../api/teachers";
import DataTable from "../components/common/DataTable";
import Modal from "../components/common/Modal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Toast from "../components/common/Toast";

const defaultForm = {
  name: "",
  email: null,
  phone: null,
  gender: "Male",
  designation: null,
};

export default function Teachers() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    teacher: null,
  });
  const [toast, setToast] = useState("");

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await getTeachers();
      setTeachers(res.data);
    } catch {
      setError("Failed to load teachers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const openCreate = () => {
    setError("");
    setEditingTeacher(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (teacher) => {
    setError("");
    setEditingTeacher(teacher);
    setForm({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      gender: teacher.gender,
      designation: teacher.designation,
    });
    setModalOpen(true);
  };

  const validate = () => {
    if (!form.name?.trim()) return "Name is required";
    if (form.name.length > 255) return "Name must be 255 characters or less";
    if (form.email && form.email.length > 255)
      return "Email must be 255 characters or less";
    if (form.phone && form.phone.length > 20)
      return "Phone must be 20 characters or less";
    if (form.designation && form.designation.length > 100)
      return "Designation must be 100 characters or less";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    try {
      if (editingTeacher) {
        await updateTeacher(editingTeacher.teacher_id, form);
      } else {
        await createTeacher(form);
      }
      setModalOpen(false);
      setToast(editingTeacher ? "Teacher updated" : "Teacher created");
      fetchTeachers();
    } catch (err) {
      setError(err.response?.data?.error || "Operation failed");
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateTeacher(confirmDialog.teacher.teacher_id);
      setConfirmDialog({ open: false, teacher: null });
      setToast("Teacher deactivated");
      fetchTeachers();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to deactivate");
    }
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (val, row) => (
        <span
          onClick={() => navigate(`/teachers/${row.teacher_id}`)}
          style={{
            color: "var(--primary)",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {val}
        </span>
      ),
    },
    { key: "phone", label: "Phone" },
    { key: "designation", label: "Designation" },
    { key: "gender", label: "Gender" },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Teachers</h1>
        {isAuthenticated && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Add Teacher
          </button>
        )}
      </div>
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
      {error && <div className="alert alert-error">{error}</div>}
      <DataTable
        columns={columns}
        data={teachers}
        loading={loading}
        onEdit={openEdit}
        onDelete={(teacher) => setConfirmDialog({ open: true, teacher })}
        deleteLabel="Deactivate"
        emptyMessage="No teachers found."
        tableId="teachers"
        cardAccent="#8b5cf6"
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setError("");
        }}
        title={editingTeacher ? "Edit Teacher" : "Add Teacher"}
      >
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Name *</label>
            <input
              required
              maxLength={255}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              maxLength={255}
              value={form.email ?? ""}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value || null })
              }
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              maxLength={20}
              value={form.phone ?? ""}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value || null })
              }
            />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Designation</label>
            <input
              maxLength={100}
              value={form.designation ?? ""}
              onChange={(e) =>
                setForm({ ...form, designation: e.target.value || null })
              }
              placeholder="Professor"
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
              {editingTeacher ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, teacher: null })}
        onConfirm={handleDeactivate}
        title="Deactivate Teacher"
        message={`Are you sure you want to deactivate ${confirmDialog.teacher?.name}?`}
      />
    </div>
  );
}
