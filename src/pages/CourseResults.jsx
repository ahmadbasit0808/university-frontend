import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getSemesters, getSemesterCourses } from "../api/semesters";
import {
  getCourseResults,
  createCourseResult,
  updateCourseResult,
  deleteCourseResult,
} from "../api/courseResults";
import DataTable from "../components/common/DataTable";
import Modal from "../components/common/Modal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Toast from "../components/common/Toast";
import { useStudentLookup } from "../context/StudentContext";

const TOTAL_MARKS = 100;

export default function CourseResultsPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { trackedRollNos } = useStudentLookup();

  const initSemId = searchParams.get("semester") || "";
  const initScId = searchParams.get("course") || "";

  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState(initSemId);
  const [semesterCourses, setSemesterCourses] = useState([]);
  const [selectedSCId, setSelectedSCId] = useState(initScId);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingResult, setEditingResult] = useState(null);
  const [form, setForm] = useState({ roll_no: "", marks_obtained: 0 });
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await getSemesters();
        setSemesters(data);
        if (initSemId) {
          const { data: courses } = await getSemesterCourses(initSemId);
          setSemesterCourses(courses);
          if (initScId) fetchResults(initScId);
        }
      } catch {
        setError("Failed to load semesters");
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchResults = async (scId) => {
    try {
      setLoading(true);
      const { data } = await getCourseResults(scId);
      setResults(data);
    } catch {
      setError("Failed to load course results");
    } finally {
      setLoading(false);
    }
  };

  const handleSemesterChange = async (semesterId) => {
    setSelectedSemesterId(semesterId);
    setSelectedSCId("");
    setResults([]);
    setSemesterCourses([]);
    setSearchParams(semesterId ? { semester: semesterId } : {});
    if (!semesterId) return;
    try {
      setCoursesLoading(true);
      const { data } = await getSemesterCourses(semesterId);
      setSemesterCourses(data);
    } catch {
      setError("Failed to load semester courses");
    } finally {
      setCoursesLoading(false);
    }
  };

  const handleCourseChange = (scId) => {
    setSelectedSCId(scId);
    setSearchParams(
      selectedSemesterId
        ? { semester: selectedSemesterId, course: scId }
        : scId
          ? { course: scId }
          : {},
    );
    if (scId) fetchResults(scId);
    else setResults([]);
  };

  const openModal = (item = null) => {
    setError("");
    setEditingResult(item);
    setForm(
      item
        ? { roll_no: item.roll_no, marks_obtained: item.marks_obtained }
        : { roll_no: "", marks_obtained: 0 },
    );
    setModalOpen(true);
  };

  const validate = () => {
    if (!editingResult && !form.roll_no?.trim()) return "Roll No is required";
    if (!editingResult && form.roll_no.length > 20)
      return "Roll No must be 20 characters or less";
    const marks = parseFloat(form.marks_obtained);
    if (isNaN(marks) || marks < 0 || marks > TOTAL_MARKS)
      return `Marks must be between 0 and ${TOTAL_MARKS}`;
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
      if (editingResult) {
        await updateCourseResult(editingResult.id, {
          marks_obtained: parseFloat(form.marks_obtained),
          total_marks: TOTAL_MARKS,
        });
      } else {
        await createCourseResult({
          ...form,
          semester_course_id: parseInt(selectedSCId),
          marks_obtained: parseFloat(form.marks_obtained),
          total_marks: TOTAL_MARKS,
        });
      }
      setModalOpen(false);
      setToast(editingResult ? "Marks updated" : "Marks saved");
      fetchResults(selectedSCId);
    } catch (err) {
      setError(err.response?.data?.error || "Operation failed");
    }
  };

  const handleDeleteRow = useCallback((row) => setConfirmId(row.id), []);

  const handleDelete = async () => {
    try {
      await deleteCourseResult(confirmId);
      setConfirmId(null);
      setToast("Result deleted");
      fetchResults(selectedSCId);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete");
    }
  };

  const columns = [
    { key: "roll_no", label: "Roll No" },
    { key: "student_name", label: "Student" },
    {
      key: "marks_obtained",
      label: "Marks",
      render: (val) => `${val} / ${TOTAL_MARKS}`,
    },
    { key: "grade_point", label: "GP", render: (val) => val || "—" },
    {
      key: "letter_grade",
      label: "Grade",
      render: (val) =>
        val ? (
          <span
            className={`grade-badge grade-${val.toLowerCase().replace("+", "-plus")}`}
          >
            {val}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "actions2",
      label: "Components",
      sortable: false,
      render: (_, row) => (
        <button
          className="btn btn-sm btn-primary"
          onClick={() => navigate(`/course-results/${row.id}/components`)}
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          {(initSemId || initScId) && (
            <button
              onClick={() => navigate(-1)}
              className="back-link"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              &larr; Back
            </button>
          )}
          <h1>Course Marks</h1>
        </div>
        {isAuthenticated && selectedSCId && (
          <button className="btn btn-primary" onClick={() => openModal()}>
            + Enter Marks
          </button>
        )}
      </div>
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="cr-filter-bar">
        <div className="cr-filter-item">
          <label htmlFor="cr-semester" className="cr-filter-label">
            Semester
          </label>
          <select
            id="cr-semester"
            className="cr-filter-select"
            value={selectedSemesterId}
            onChange={(e) => handleSemesterChange(e.target.value)}
          >
            <option value="">— Select Semester —</option>
            {semesters.map((sem) => (
              <option key={sem.id} value={sem.id}>
                {sem.semester} ({sem.session})
              </option>
            ))}
          </select>
        </div>
        <div className="cr-filter-arrow">›</div>
        <div
          className={`cr-filter-item${!selectedSemesterId ? " cr-filter-item--disabled" : ""}`}
        >
          <label htmlFor="cr-course" className="cr-filter-label">
            Course
          </label>
          <select
            id="cr-course"
            className="cr-filter-select"
            value={selectedSCId}
            onChange={(e) => handleCourseChange(e.target.value)}
            disabled={!selectedSemesterId || coursesLoading}
          >
            <option value="">
              {coursesLoading
                ? "Loading…"
                : !selectedSemesterId
                  ? "Select a semester first"
                  : "— Select Course —"}
            </option>
            {semesterCourses.map((sc) => (
              <option key={sc.semester_course_id} value={sc.semester_course_id}>
                {sc.course_code} — {sc.course_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedSemesterId && (
        <div className="cr-prompt">
          <span className="cr-prompt-icon">🎓</span>
          <p>Select a semester to get started</p>
        </div>
      )}

      {selectedSCId &&
        (() => {
          const activeCourse = semesterCourses.find(
            (sc) => String(sc.semester_course_id) === String(selectedSCId),
          );
          return (
            <>
              {activeCourse && (
                <div className="cr-course-info">
                  <span className="cr-course-code">
                    {activeCourse.course_code}
                  </span>
                  <span className="cr-course-name">
                    {activeCourse.course_name}
                  </span>
                  {activeCourse.teacher_name && (
                    <span className="cr-course-teacher">
                      👤 {activeCourse.teacher_name}
                    </span>
                  )}
                </div>
              )}
              <div className="page-header" style={{ marginTop: "1rem" }}>
                <h2>
                  Student Marks
                  {results.length > 0 && (
                    <span className="cr-count-badge">{results.length}</span>
                  )}
                </h2>
              </div>
              <DataTable
                columns={columns}
                data={results}
                loading={loading}
                onEdit={openModal}
                onDelete={handleDeleteRow}
                emptyMessage="No marks entered for this course."
                highlightKey="roll_no"
                highlightValue={trackedRollNos}
                tableId="course-results"
              />
            </>
          );
        })()}

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setError("");
        }}
        title={editingResult ? "Update Marks" : "Enter Marks"}
      >
        <form onSubmit={handleSubmit} className="form">
          {!editingResult && (
            <div className="form-group">
              <label htmlFor="cr-roll">Roll No *</label>
              <input
                id="cr-roll"
                required
                maxLength={20}
                value={form.roll_no}
                onChange={(e) => setForm({ ...form, roll_no: e.target.value })}
                placeholder="2023-CS-001"
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="cr-marks">Marks Obtained *</label>
            <input
              id="cr-marks"
              type="number"
              step="0.01"
              min="0"
              max={TOTAL_MARKS}
              required
              value={form.marks_obtained}
              onChange={(e) =>
                setForm({ ...form, marks_obtained: e.target.value })
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
              {editingResult ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmId !== null}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDelete}
        title="Delete Result"
        message="Delete this course result entry?"
      />
    </div>
  );
}
