import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getSemesters } from "../api/semesters";
import {
  getExamSchedule,
  getExamScheduleByType,
  createExamSchedule,
  updateExamSchedule,
  deleteExamSchedule,
} from "../api/examSchedule";
import DataTable from "../components/common/DataTable";
import Modal from "../components/common/Modal";
import ConfirmDialog from "../components/common/ConfirmDialog";

const EXAM_TYPES = ["Quiz", "Midterm", "Final", "Makeup"];
const SHIFTS = ["1st Shift", "2nd Shift", "3rd Shift", "4th Shift"];

const defaultForm = {
  semester_course_id: "",
  exam_date: "",
  start_time: "",
  end_time: "",
  exam_type: "Final",
  shift: "1st Shift",
  reporting_time: "",
  total_marks: 100,
};

const formatDate = (val) => (val ? val.slice(0, 10) : "—");

const formatTime = (val) => {
  if (!val) return "—";
  const [h, m] = val.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
};

export default function ExamSchedule() {
  const { isAuthenticated } = useAuth();
  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    item: null,
  });

  useEffect(() => {
    getSemesters()
      .then((res) => {
        setSemesters(res.data);
        if (res.data.length > 0) setSelectedSemesterId(String(res.data[0].id));
      })
      .catch(() => setError("Failed to load semesters"));
  }, []);

  useEffect(() => {
    if (!selectedSemesterId) return;
    fetchSchedule(selectedSemesterId, selectedType, true);
  }, [selectedSemesterId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedSemesterId || !selectedType) return;
    fetchSchedule(selectedSemesterId, selectedType);
  }, [selectedType]); // eslint-disable-line react-hooks/exhaustive-deps

  const nearestType = (data) => {
    const today = Date.now();
    const avg = (type) => {
      const dates = data
        .filter((r) => r.exam_type === type && r.exam_date)
        .map((r) => new Date(r.exam_date.slice(0, 10)).getTime());
      if (!dates.length) return null;
      return dates.reduce((a, b) => a + b, 0) / dates.length;
    };
    const midAvg = avg("Midterm");
    const finAvg = avg("Final");
    if (!midAvg && !finAvg) return "";
    if (!midAvg) return "Final";
    if (!finAvg) return "Midterm";
    const midFuture = midAvg >= today;
    const finFuture = finAvg >= today;
    if (midFuture && !finFuture) return "Midterm";
    if (finFuture && !midFuture) return "Final";
    return Math.abs(today - midAvg) <= Math.abs(today - finAvg)
      ? "Midterm"
      : "Final";
  };

  const fetchSchedule = async (semId, type, autoDetect = false) => {
    try {
      setLoading(true);
      setError("");
      const res = await getExamSchedule(semId);
      const data = res.data;
      setSchedule(data);
      if (autoDetect) {
        const detected = nearestType(data);
        setSelectedType(detected);
      }
    } catch {
      setError("Failed to load exam schedule");
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      semester_course_id: item.semester_course_id,
      exam_date: item.exam_date?.slice(0, 10) ?? "",
      start_time: item.start_time?.slice(0, 5) ?? "",
      end_time: item.end_time?.slice(0, 5) ?? "",
      exam_type: item.exam_type,
      shift: item.shift,
      reporting_time: item.reporting_time?.slice(0, 5) ?? "",
      total_marks: item.total_marks ?? 100,
    });
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = {
      semester_course_id: Number(form.semester_course_id),
      exam_date: form.exam_date,
      start_time: form.start_time,
      end_time: form.end_time,
      exam_type: form.exam_type,
      shift: form.shift,
      total_marks: Number(form.total_marks),
    };
    if (form.reporting_time) payload.reporting_time = form.reporting_time;
    try {
      if (editing) {
        await updateExamSchedule(editing.id, payload);
      } else {
        await createExamSchedule(payload);
      }
      setModalOpen(false);
      fetchSchedule(selectedSemesterId, selectedType);
    } catch (err) {
      setError(err.response?.data?.error || "Operation failed");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteExamSchedule(confirmDialog.item.id);
      setConfirmDialog({ open: false, item: null });
      fetchSchedule(selectedSemesterId, selectedType);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete");
    }
  };

  const guessExamType = (dateStr) => {
    if (!dateStr) return null;
    const picked = new Date(dateStr).getTime();
    const avg = (type) => {
      const dates = schedule
        .filter((r) => r.exam_type === type && r.exam_date)
        .map((r) => new Date(r.exam_date.slice(0, 10)).getTime());
      if (!dates.length) return null;
      return dates.reduce((a, b) => a + b, 0) / dates.length;
    };
    const midAvg = avg("Midterm");
    const finAvg = avg("Final");
    if (!midAvg && !finAvg) return null;
    if (!midAvg) return "Final";
    if (!finAvg) return "Midterm";
    const midFuture = midAvg >= picked;
    const finFuture = finAvg >= picked;
    if (midFuture && !finFuture) return "Midterm";
    if (finFuture && !midFuture) return "Final";
    return Math.abs(picked - midAvg) <= Math.abs(picked - finAvg)
      ? "Midterm"
      : "Final";
  };

  const set = (field) => (e) => {
    const value = e.target.value;
    if (field === "exam_date") {
      const guessed = guessExamType(value);
      setForm((f) => ({
        ...f,
        exam_date: value,
        ...(guessed ? { exam_type: guessed } : {}),
      }));
    } else {
      setForm((f) => ({ ...f, [field]: value }));
    }
  };

  const examTypeBadgeClass = (type) => {
    const map = {
      Quiz: "grade-b-plus",
      Midterm: "grade-a",
      Final: "grade-a-plus",
      Makeup: "grade-c",
    };
    return map[type] || "";
  };

  const columns = [
    {
      key: "course_code",
      label: "Code",
      render: (val) => <span className="cell-code">{val}</span>,
    },
    { key: "course_name", label: "Course", sortable: true },
    { key: "teacher_name", label: "Teacher", sortable: true },
    {
      key: "exam_type",
      label: "Type",
      sortable: true,
      render: (val) => (
        <span className={`grade-badge ${examTypeBadgeClass(val)}`}>{val}</span>
      ),
    },
    { key: "shift", label: "Shift", sortable: true },
    {
      key: "exam_date",
      label: "Date",
      sortable: true,
      render: (val) => formatDate(val),
    },
    {
      key: "reporting_time",
      label: "Reporting",
      render: (val) => formatTime(val),
    },
    {
      key: "start_time",
      label: "Start",
      render: (val) => formatTime(val),
      sortable: true,
    },
    { key: "end_time", label: "End", render: (val) => formatTime(val) },
    { key: "total_marks", label: "Marks", sortable: true },
  ];

  const today = new Date().toISOString().slice(0, 10);
  const displayedSchedule = selectedType
    ? schedule.filter((r) => r.exam_type === selectedType)
    : schedule;
  const nextExamDate =
    displayedSchedule
      .map((r) => r.exam_date?.slice(0, 10))
      .filter((d) => d && d > today)
      .sort()[0] ?? null;

  const examRowClass = (row) => {
    const d = row.exam_date?.slice(0, 10);
    if (d === today) return "today-exam";
    if (nextExamDate && d === nextExamDate) return "tomorrow-exam";
    return "";
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Exam Schedule</h1>
        {isAuthenticated && selectedSemesterId && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Add Exam
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters">
        <div className="form-group">
          <label>Semester</label>
          <select
            value={selectedSemesterId}
            onChange={(e) => {
              setSelectedSemesterId(e.target.value);
              setSelectedType("");
            }}
          >
            <option value="">— Select Semester —</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.semester} ({s.session}) — {s.program}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Exam Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">All Types</option>
            {EXAM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "12px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            color: "var(--text-muted)",
          }}
        >
          <span
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "2px",
              background: "#dc2626",
              flexShrink: 0,
            }}
          />
          Today
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            color: "var(--text-muted)",
          }}
        >
          <span
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "2px",
              background: "#ca8a04",
              flexShrink: 0,
            }}
          />
          Next Exam{nextExamDate ? ` (${nextExamDate})` : ""}
        </span>
      </div>

      <DataTable
        columns={columns}
        data={displayedSchedule}
        loading={loading}
        defaultSortKey="exam_date"
        defaultSortDir="asc"
        rowClassName={examRowClass}
        onEdit={openEdit}
        onDelete={(item) => setConfirmDialog({ open: true, item })}
        emptyMessage="No exam schedule found."
        tableId="exam-schedule"
        cardAccent="#e07b39"
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Exam" : "Add Exam"}
      >
        <form onSubmit={handleSubmit} className="form">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Semester Course ID *</label>
            <input
              type="number"
              required
              value={form.semester_course_id}
              onChange={set("semester_course_id")}
              placeholder="e.g. 5"
            />
          </div>
          <div className="form-group">
            <label>Exam Type</label>
            <select value={form.exam_type} onChange={set("exam_type")}>
              {EXAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Shift</label>
            <select value={form.shift} onChange={set("shift")}>
              {SHIFTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Exam Date *</label>
            <input
              type="date"
              required
              value={form.exam_date}
              onChange={set("exam_date")}
            />
          </div>
          <div className="form-group">
            <label>Reporting Time</label>
            <input
              type="time"
              value={form.reporting_time}
              onChange={set("reporting_time")}
            />
          </div>
          <div className="form-group">
            <label>Start Time *</label>
            <input
              type="time"
              required
              value={form.start_time}
              onChange={set("start_time")}
            />
          </div>
          <div className="form-group">
            <label>End Time *</label>
            <input
              type="time"
              required
              value={form.end_time}
              onChange={set("end_time")}
            />
          </div>
          <div className="form-group">
            <label>Total Marks</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.total_marks}
              onChange={set("total_marks")}
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
        title="Delete Exam"
        message={`Delete ${confirmDialog.item?.exam_type} exam for ${confirmDialog.item?.course_code}?`}
      />
    </div>
  );
}
