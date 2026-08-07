import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getGradingScales,
  createGradingScale,
  updateGradingScale,
  deleteGradingScale,
} from "../api/gradingScale";
import DataTable from "../components/common/DataTable";
import Modal from "../components/common/Modal";
import ConfirmDialog from "../components/common/ConfirmDialog";

const defaultForm = {
  min_marks: 0,
  max_marks: 100,
  grade_point: 4.0,
  letter_grade: "A",
};

export default function GradingScale() {
  const { isAuthenticated } = useAuth();
  const [gradingScales, setGradingScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    item: null,
  });

  const fetchGradingScales = async () => {
    try {
      setLoading(true);
      const res = await getGradingScales();
      setGradingScales(res.data);
    } catch {
      setError("Failed to load grading scale");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGradingScales();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      min_marks: item.min_marks,
      max_marks: item.max_marks,
      grade_point: item.grade_point,
      letter_grade: item.letter_grade,
    });
    setModalOpen(true);
  };

  const validate = () => {
    if (form.min_marks < 0 || form.min_marks > 999.99)
      return "Min marks must be between 0 and 999.99";
    if (form.max_marks < 0 || form.max_marks > 999.99)
      return "Max marks must be between 0 and 999.99";
    if (form.min_marks >= form.max_marks)
      return "Min marks must be less than max marks";
    if (form.grade_point < 0 || form.grade_point > 4.0)
      return "Grade point must be between 0 and 4.00";
    if (!form.letter_grade?.trim()) return "Letter grade is required";
    if (form.letter_grade.length > 5)
      return "Letter grade must be 5 characters or less";
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
      if (editing) {
        await updateGradingScale(editing.id, form);
      } else {
        await createGradingScale(form);
      }
      setModalOpen(false);
      fetchGradingScales();
    } catch (err) {
      setError(err.response?.data?.error || "Operation failed");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteGradingScale(confirmDialog.item.id);
      setConfirmDialog({ open: false, item: null });
      fetchGradingScales();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete");
    }
  };

  const columns = [
    { key: "letter_grade", label: "Grade" },
    { key: "min_marks", label: "Min Marks" },
    { key: "max_marks", label: "Max Marks" },
    { key: "grade_point", label: "Grade Point" },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Grading Scale</h1>
        {isAuthenticated && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Add Grade
          </button>
        )}
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <DataTable
        columns={columns}
        searchable={false}
        data={gradingScales}
        loading={loading}
        cardAccent="#269bb0"
        onEdit={openEdit}
        onDelete={(item) => setConfirmDialog({ open: true, item })}
        emptyMessage="No grading scale entries."
        tableId="grading-scale"
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Grade" : "Add Grade"}
      >
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Letter Grade *</label>
            <input
              required
              maxLength={5}
              value={form.letter_grade}
              onChange={(e) =>
                setForm({ ...form, letter_grade: e.target.value })
              }
              placeholder="A+"
            />
          </div>
          <div className="form-group">
            <label>Min Marks *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="999.99"
              required
              value={form.min_marks}
              onChange={(e) =>
                setForm({ ...form, min_marks: parseFloat(e.target.value) })
              }
            />
          </div>
          <div className="form-group">
            <label>Max Marks *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="999.99"
              required
              value={form.max_marks}
              onChange={(e) =>
                setForm({ ...form, max_marks: parseFloat(e.target.value) })
              }
            />
          </div>
          <div className="form-group">
            <label>Grade Point *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="4.00"
              required
              value={form.grade_point}
              onChange={(e) =>
                setForm({ ...form, grade_point: parseFloat(e.target.value) })
              }
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, item: null })}
        onConfirm={handleDelete}
        title="Delete Grade"
        message={`Delete grade ${confirmDialog.item?.letter_grade}?`}
      />
    </div>
  );
}
