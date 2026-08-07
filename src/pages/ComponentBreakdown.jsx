import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getComponents, addComponent } from "../api/courseResults";
import DataTable from "../components/common/DataTable";
import Modal from "../components/common/Modal";

export default function ComponentBreakdown() {
  const { courseResultId } = useParams();
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    component_name: "",
    marks_obtained: 0,
    total_marks: 0,
  });

  const fetchComponents = async () => {
    try {
      setLoading(true);
      const res = await getComponents(courseResultId);
      setComponents(res.data);
    } catch {
      setError("Failed to load components");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseResultId) fetchComponents();
  }, [courseResultId]);

  const validate = () => {
    if (!form.component_name?.trim()) return "Component name is required";
    if (form.component_name.length > 50) return "Component name must be 50 characters or less";
    const obtained = parseFloat(form.marks_obtained);
    const total = parseFloat(form.total_marks);
    if (isNaN(obtained) || obtained < 0) return "Marks obtained must be 0 or greater";
    if (isNaN(total) || total <= 0) return "Total marks must be greater than 0";
    if (obtained > total) return "Marks obtained cannot exceed total marks";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError("");
    try {
      await addComponent(courseResultId, {
        ...form,
        marks_obtained: parseFloat(form.marks_obtained),
        total_marks: parseFloat(form.total_marks),
      });
      setModalOpen(false);
      setForm({ component_name: "", marks_obtained: 0, total_marks: 0 });
      fetchComponents();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add component");
    }
  };

  const totalObtained = components.reduce((sum, c) => sum + parseFloat(c.marks_obtained), 0);
  const totalMax = components.reduce((sum, c) => sum + parseFloat(c.total_marks), 0);

  const columns = [
    { key: "component_name", label: "Component" },
    { key: "marks_obtained", label: "Marks Obtained" },
    { key: "total_marks", label: "Total Marks" },
    {
      key: "percentage",
      label: "%",
      render: (_, row) =>
        row.total_marks > 0
          ? `${((row.marks_obtained / row.total_marks) * 100).toFixed(1)}%`
          : "—",
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/course-results" className="back-link">
            &larr; Back to Marks Entry
          </Link>
          <h1>Component Breakdown</h1>
          <p className="text-muted">Course Result ID: {courseResultId}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          + Add Component
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      {components.length > 0 && (
        <div className="total-section">
          <strong>Total:</strong> {totalObtained.toFixed(2)} / {totalMax.toFixed(2)}{" "}
          ({totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0}%)
        </div>
      )}

      <DataTable
        columns={columns}
        data={components}
        loading={loading}
        emptyMessage="No components added yet."
        tableId="component-breakdown"
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Component"
      >
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Component Name *</label>
            <input
              required
              maxLength={50}
              value={form.component_name}
              onChange={(e) =>
                setForm({ ...form, component_name: e.target.value })
              }
              placeholder="Midterm"
            />
          </div>
          <div className="form-group">
            <label>Marks Obtained *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={form.marks_obtained}
              onChange={(e) =>
                setForm({ ...form, marks_obtained: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Total Marks *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={form.total_marks}
              onChange={(e) =>
                setForm({ ...form, total_marks: e.target.value })
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
              Add
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
