import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} from "../api/courses";
import DataTable from "../components/common/DataTable";
import Modal from "../components/common/Modal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Toast from "../components/common/Toast";

const defaultForm = {
  course_code: "",
  course_name: "",
  credit_hours: 3,
  department: "Information Technology",
  program: "Computer Science",
};

export default function Courses() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, course: null });
  const [toast, setToast] = useState("");

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await getCourses();
      setCourses(res.data);
    } catch {
      setError("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const openCreate = () => {
    setError("");
    setEditingCourse(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (course) => {
    setError("");
    setEditingCourse(course);
    setForm({
      course_code: course.course_code,
      course_name: course.course_name,
      credit_hours: course.credit_hours,
      department: course.department,
      program: course.program,
    });
    setModalOpen(true);
  };

  const validate = () => {
    if (form.course_code && form.course_code.length > 20) return "Course code must be 20 characters or less";
    if (!form.course_name?.trim()) return "Course name is required";
    if (form.course_name.length > 255) return "Course name must be 255 characters or less";
    if (form.department && form.department.length > 255) return "Department must be 255 characters or less";
    if (form.program && form.program.length > 100) return "Program must be 100 characters or less";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError("");
    try {
      if (editingCourse) {
        const { course_code: _code, ...data } = form;
        await updateCourse(editingCourse.course_code, data);
      } else {
        await createCourse(form);
      }
      setModalOpen(false);
      setToast(editingCourse ? "Course updated" : "Course created");
      fetchCourses();
    } catch (err) {
      setError(err.response?.data?.error || "Operation failed");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCourse(confirmDialog.course.course_code);
      setConfirmDialog({ open: false, course: null });
      setToast("Course deleted");
      fetchCourses();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete course");
    }
  };

  const columns = [
    { key: "metadata_id", label: "Semester" },
    { key: "course_code", label: "Code" },
    {
      key: "course_name",
      label: "Course Name",
      render: (val, row) => (
        <button
          className="btn-link"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/courses/${row.course_code}`);
          }}
        >
          {val}
        </button>
      ),
    },
    { key: "credit_hours", label: "Credit Hrs" },
    // { key: "department", label: "Department" },
    { key: "program", label: "Program" },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Courses</h1>
        {isAuthenticated && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Add Course
          </button>
        )}
      </div>
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
      {error && <div className="alert alert-error">{error}</div>}
      <DataTable
        columns={columns}
        data={courses}
        loading={loading}
        onEdit={openEdit}
        onDelete={(course) => setConfirmDialog({ open: true, course })}
        emptyMessage="No courses found."
        tableId="courses"
        cardAccent="#f59e0b"
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setError(""); }}
        title={editingCourse ? "Edit Course" : "Add Course"}
      >
        <form onSubmit={handleSubmit} className="form">
          {!editingCourse && (
            <div className="form-group">
              <label>Course Code *</label>
              <input
                required
                maxLength={20}
                value={form.course_code}
                onChange={(e) =>
                  setForm({ ...form, course_code: e.target.value })
                }
                placeholder="CS101"
              />
            </div>
          )}
          <div className="form-group">
            <label>Course Name *</label>
            <input
              required
              maxLength={255}
              value={form.course_name}
              onChange={(e) =>
                setForm({ ...form, course_name: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Credit Hours *</label>
            <input
              type="number"
              min={1}
              max={6}
              required
              value={form.credit_hours}
              onChange={(e) =>
                setForm({ ...form, credit_hours: parseInt(e.target.value) })
              }
            />
          </div>
          <div className="form-group">
            <label>Department</label>
            <input
              maxLength={255}
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Program</label>
            <input
              maxLength={100}
              value={form.program}
              onChange={(e) => setForm({ ...form, program: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setModalOpen(false); setError(""); }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingCourse ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, course: null })}
        onConfirm={handleDelete}
        title="Delete Course"
        message={`Are you sure you want to delete ${confirmDialog.course?.course_code} - ${confirmDialog.course?.course_name}?`}
      />
    </div>
  );
}
