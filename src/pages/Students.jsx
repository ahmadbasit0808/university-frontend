import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getStudents,
  createStudent,
  updateStudent,
  deactivateStudent,
} from "../api/students";
import DataTable from "../components/common/DataTable";
import Modal from "../components/common/Modal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Toast from "../components/common/Toast";
import { useStudentLookup } from "../context/StudentContext";

const defaultForm = {
  roll_no: "",
  name: "",
  email: null,
  phone: null,
  gender: "Male",
};

export default function Students() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    student: null,
  });
  const [toast, setToast] = useState("");
  const { trackedRollNos } = useStudentLookup();

  const handleRowClick = useCallback(
    (student) => navigate(`/students/${student.roll_no}`),
    [navigate],
  );

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await getStudents();
      const formattedStudents = res.data.map((student) => {
        return { ...student };
      });
      setStudents(formattedStudents);
    } catch {
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const openCreate = () => {
    setError("");
    setEditingStudent(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (student) => {
    setError("");
    setEditingStudent(student);
    setForm({
      roll_no: student.roll_no,
      name: student.name,
      email: student.email,
      phone: student.phone,
      gender: student.gender,
    });
    setModalOpen(true);
  };

  const validate = () => {
    if (!editingStudent && !form.roll_no?.trim()) return "Roll No is required";
    if (form.roll_no && form.roll_no.length > 20)
      return "Roll No must be 20 characters or less";
    if (!form.name?.trim()) return "Name is required";
    if (form.name.length > 255) return "Name must be 255 characters or less";
    if (form.email && form.email.length > 255)
      return "Email must be 255 characters or less";
    if (form.phone && form.phone.length > 20)
      return "Phone must be 20 characters or less";
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
      const payload = {
        ...form,
        email: form.email || null,
        phone: form.phone || null,
      };

      if (editingStudent) {
        const { roll_no: _rollNo, ...data } = payload;
        await updateStudent(editingStudent.roll_no, data);
      } else {
        await createStudent(payload);
      }

      setModalOpen(false);
      setToast(editingStudent ? "Student updated" : "Student created");
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.error || "Operation failed");
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateStudent(confirmDialog.student.roll_no);
      setConfirmDialog({ open: false, student: null });
      setToast("Student deactivated");
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to deactivate");
    }
  };

  const columns = [
    { key: "roll_no", label: "Roll No" },
    {
      key: "name",
      label: "Name",
      render: (val, row) => (
        <button
          className="btn-link"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/students/${row.roll_no}`);
          }}
        >
          {val}
        </button>
      ),
    },
    { key: "gender", label: "Gender" },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Students</h1>
        {isAuthenticated && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Add Student
          </button>
        )}
      </div>
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
      {error && <div className="alert alert-error">{error}</div>}
      <DataTable
        columns={columns}
        data={students}
        loading={loading}
        onEdit={openEdit}
        onDelete={(student) => setConfirmDialog({ open: true, student })}
        deleteLabel="Deactivate"
        emptyMessage="No students found. Add your first student!"
        highlightKey="roll_no"
        highlightValue={trackedRollNos}
        tableId="students"
        cardAccent="#0ea5e9"
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setError("");
        }}
        title={editingStudent ? "Edit Student" : "Add Student"}
      >
        <form onSubmit={handleSubmit} className="form">
          {!editingStudent && (
            <div className="form-group">
              <label>Roll No *</label>
              <input
                required
                maxLength={20}
                value={form.roll_no}
                onChange={(e) => setForm({ ...form, roll_no: e.target.value })}
                placeholder="2023-CS-010"
              />
            </div>
          )}
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
              {editingStudent ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, student: null })}
        onConfirm={handleDeactivate}
        title="Deactivate Student"
        message={`Are you sure you want to deactivate ${confirmDialog.student?.name}?`}
      />
    </div>
  );
}
