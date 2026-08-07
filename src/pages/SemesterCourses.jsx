import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useParams, useNavigate } from "react-router-dom";
import {
  getSemester,
  getSemesterCourses,
  assignCourseToSemester,
  removeCourseFromSemester,
} from "../api/semesters";
import { getCourses } from "../api/courses";
import { getTeachers } from "../api/teachers";
import DataTable from "../components/common/DataTable";
import Modal from "../components/common/Modal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Toast from "../components/common/Toast";

export default function SemesterCourses() {
  const { isAuthenticated } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [semester, setSemester] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ course_code: "", teacher_id: "" });
  const [courseOptions, setCourseOptions] = useState([]);
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    scId: null,
  });
  const [toast, setToast] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [semRes, coursesRes] = await Promise.all([
        getSemester(id),
        getSemesterCourses(id),
      ]);
      setSemester(semRes.data);
      setCourses(coursesRes.data);
    } catch {
      setError("Failed to load semester courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAssign = async () => {
    setError("");
    try {
      const [cRes, tRes] = await Promise.all([getCourses(), getTeachers()]);
      setCourseOptions(cRes.data);
      setTeacherOptions(tRes.data);
      setForm({ course_code: "", teacher_id: "" });
      setModalOpen(true);
    } catch {
      setError("Failed to load form data");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = { course_code: form.course_code };
      if (form.teacher_id) data.teacher_id = parseInt(form.teacher_id);
      await assignCourseToSemester(id, data);
      setModalOpen(false);
      setToast("Course assigned successfully");
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to assign course");
    }
  };

  const handleRemove = async () => {
    try {
      await removeCourseFromSemester(id, confirmDialog.scId);
      setConfirmDialog({ open: false, scId: null });
      setToast("Course removed");
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to remove course");
    }
  };

  const columns = [
    { key: "course_code", label: "Code" },
    { key: "course_name", label: "Course Name" },
    { key: "credit_hours", label: "Credit Hrs" },
    { key: "teacher_name", label: "Teacher", render: (val) => val || "—" },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="back-link" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            &larr; Back
          </button>
          <h1>
            {semester
              ? `${semester.semester} Semester (${semester.session})`
              : "Semester Courses"}
          </h1>
        </div>
        {isAuthenticated && (
          <button className="btn btn-primary" onClick={openAssign}>
            + Assign Course
          </button>
        )}
      </div>
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
      {error && <div className="alert alert-error">{error}</div>}
      <DataTable
        columns={columns}
        data={courses}
        searchable={false}
        loading={loading}
        cardAccent="#f0579c"
        onDelete={(row) =>
          setConfirmDialog({ open: true, scId: row.semester_course_id })
        }
        emptyMessage="No courses assigned to this semester."
        tableId="semester-courses"
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setError("");
        }}
        title="Assign Course"
      >
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="sc-course">Course *</label>
            <select
              id="sc-course"
              required
              value={form.course_code}
              onChange={(e) =>
                setForm({ ...form, course_code: e.target.value })
              }
            >
              <option value="">Select a course</option>
              {courseOptions.map((c) => (
                <option key={c.course_code} value={c.course_code}>
                  {c.course_code} - {c.course_name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="sc-teacher">Teacher (optional)</label>
            <select
              id="sc-teacher"
              value={form.teacher_id}
              onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
            >
              <option value="">Select a teacher</option>
              {teacherOptions.map((t) => (
                <option key={t.teacher_id} value={t.teacher_id}>
                  {t.name} ({t.designation})
                </option>
              ))}
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
              Assign
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, scId: null })}
        onConfirm={handleRemove}
        title="Remove Course"
        message="Remove this course from the semester?"
      />
    </div>
  );
}
