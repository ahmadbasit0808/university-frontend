import { useState, useEffect, useCallback } from "react";
import { getSemesters } from "../api/semesters";
import {
  getLatestTimetable,
  getSemesterTimetable,
  getDayTimetable,
} from "../api/timetable";
import DataTable from "../components/common/DataTable";
import { Download, RotateCcw } from "lucide-react";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DAY_LABELS = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

const processTimetableData = (rows) =>
  (rows || []).map((row) => ({
    ...row,
    day_order: DAYS.indexOf(row.day_of_week),
  }));

const formatTime = (val) => {
  if (!val) return val;

  const parts = val.split(":");
  if (parts.length < 2) return val;

  const h = parseInt(parts[0], 10);
  const m = parts[1];

  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;

  return `${h12}:${m} ${ampm}`;
};

const getCurrentDay = () => {
  const jsDay = new Date().getDay();

  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][jsDay];
};

export default function Timetable() {
  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [metadataId, setMetadataId] = useState(null);
  const [latestSemesterUrl, setLatestSemesterUrl] = useState("");

  const [isLatest, setIsLatest] = useState(true);

  // today | all | day
  const [viewMode, setViewMode] = useState("today");

  useEffect(() => {
    getSemesters()
      .then((res) => setSemesters(res.data))
      .catch(() => setError("Failed to load semesters"));
  }, []);

  const fetchLatest = useCallback(
    async (mode = "today") => {
      try {
        setLoading(true);
        setError("");
        const latest = await getLatestTimetable();
        const rows = processTimetableData(latest.data.timetable);
        const latestMetaId = latest.data.metadata_id;
        setMetadataId(latestMetaId);
        setSelectedSemesterId("");
        setIsLatest(true);
        setLatestSemesterUrl(
          semesters.find((s) => s.id === Number(latestMetaId))?.timetable_url ||
            "",
        );
        if (mode === "all") {
          setViewMode("all");
          setSelectedDay("");
          setTimetable(rows);
        } else {
          const today = getCurrentDay();
          setViewMode("today");
          setSelectedDay(today);
          setTimetable(rows.filter((r) => r.day_of_week === today));
        }
      } catch {
        setError("Failed to load latest timetable");
        setTimetable([]);
      } finally {
        setLoading(false);
      }
    },
    [semesters],
  );

  useEffect(() => {
    if (semesters.length > 0) fetchLatest("today");
  }, [semesters, fetchLatest]);

  const handleSemesterChange = async (semesterId) => {
    setSelectedSemesterId(semesterId);

    if (!semesterId) {
      fetchLatest("today");
      return;
    }

    setLatestSemesterUrl("");

    try {
      setLoading(true);
      setError("");

      const res = await getSemesterTimetable(semesterId);

      const rows = processTimetableData(res.data);

      setIsLatest(false);
      setViewMode("all");
      setSelectedDay("");
      setMetadataId(Number(semesterId));

      setTimetable(rows);
    } catch {
      setError("Failed to load semester timetable");
      setTimetable([]);
    } finally {
      setLoading(false);
    }
  };

  const showToday = async () => {
    if (selectedSemesterId) {
      try {
        setLoading(true);

        const res = await getSemesterTimetable(selectedSemesterId);

        const rows = processTimetableData(res.data);

        const today = getCurrentDay();

        setViewMode("today");
        setSelectedDay(today);

        setTimetable(rows.filter((r) => r.day_of_week === today));
      } finally {
        setLoading(false);
      }
    } else {
      fetchLatest("today");
    }
  };

  const showAll = async () => {
    if (selectedSemesterId) {
      try {
        setLoading(true);

        const res = await getSemesterTimetable(selectedSemesterId);

        setViewMode("all");
        setSelectedDay("");

        setTimetable(processTimetableData(res.data));
      } finally {
        setLoading(false);
      }
    } else {
      fetchLatest("all");
    }
  };

  const handleDayFilter = async (day) => {
    setSelectedDay(day);
    setViewMode("day");

    const semesterId = selectedSemesterId || metadataId;

    if (!semesterId) return;

    try {
      setLoading(true);
      setError("");

      const res = await getDayTimetable(semesterId, day);

      setTimetable(processTimetableData(res.data));
    } catch {
      setError("Failed to load day timetable");
      setTimetable([]);
    } finally {
      setLoading(false);
    }
  };

  const getHeaderTitle = () => {
    const sem = semesters.find(
      (s) => s.id === Number(selectedSemesterId || metadataId),
    );

    const suffix = sem ? ` — ${sem.semester} (${sem.session})` : "";

    if (viewMode === "today")
      return `Today's Timetable (${DAY_LABELS[selectedDay]})${suffix}`;

    if (viewMode === "all") return `Full Timetable${suffix}`;

    if (viewMode === "day")
      return `Timetable - ${DAY_LABELS[selectedDay]}${suffix}`;

    return "Timetable";
  };

  const columns = [
    {
      key: "course_code",
      label: "Code",
      render: (val) => <span className="cell-code">{val}</span>,
    },
    { key: "course_name", label: "Course Name", sortable: true },
    {
      key: "session_type",
      label: "Type",
      render: (val) => (
        <span
          className={`grade-badge ${
            val === "Lab" ? "grade-b-plus" : "grade-a-plus"
          }`}
        >
          {val || "Theory"}
        </span>
      ),
    },
    { key: "teacher_name", label: "Teacher", sortable: true },
    {
      key: "day_order",
      label: "Day",
      render: (_, row) => DAY_LABELS[row.day_of_week],
      sortable: true,
    },
    {
      key: "start_time",
      label: "Start",
      render: (val) => formatTime(val),
      sortable: true,
    },
    {
      key: "end_time",
      label: "End",
      render: (val) => formatTime(val),
      sortable: true,
    },
    { key: "room", label: "Room", sortable: true },
  ];

  const isCurrentLecture = (row) => {
    const today = getCurrentDay();

    if (row.day_of_week !== today) return false;

    const now = new Date();

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [sh, sm] = row.start_time.split(":").map(Number);
    const [eh, em] = row.end_time.split(":").map(Number);

    const start = sh * 60 + sm;
    const end = eh * 60 + em;

    return currentMinutes >= start && currentMinutes < end;
  };
  return (
    <div className="page">
      <div className="page-header">
        <h1>{getHeaderTitle()}</h1>

        <button
          className="btn btn-secondary"
          style={{ gap: "0px" }}
          onClick={() => fetchLatest("today")}
        >
          <RotateCcw height={16} /> Latest
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters">
        <div className="form-group">
          <label>Select Semester</label>

          <select
            value={selectedSemesterId}
            onChange={(e) => handleSemesterChange(e.target.value)}
          >
            <option value="">— Latest Active Semester —</option>

            {semesters.map((sem) => (
              <option key={sem.id} value={sem.id}>
                {sem.semester} ({sem.session}) — {sem.program}
              </option>
            ))}
          </select>
        </div>

        {(selectedSemesterId || latestSemesterUrl) &&
          (() => {
            let url = latestSemesterUrl;

            if (selectedSemesterId) {
              const sem = semesters.find(
                (s) => s.id === Number(selectedSemesterId),
              );
              url = sem?.timetable_url || "";
            }

            return url ? (
              <div className="form-group" style={{ alignSelf: "flex-end" }}>
                <button
                  className="btn btn-primary"
                  onClick={() =>
                    window.open(url, "_blank", "noopener,noreferrer")
                  }
                >
                  <Download height={18} /> Download Timetable
                </button>
              </div>
            ) : null;
          })()}
      </div>

      {/* View Mode */}
      <div className="section">
        <h3>View</h3>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          <button
            className={`btn ${
              viewMode === "today" ? "btn-primary" : "btn-secondary"
            }`}
            onClick={showToday}
          >
            Today
          </button>

          <button
            className={`btn ${
              viewMode === "all" ? "btn-primary" : "btn-secondary"
            }`}
            onClick={showAll}
          >
            Full Timetable
          </button>
        </div>
      </div>

      {/* Day Filter */}
      <div className="section">
        <h3>Filter by Day</h3>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {DAYS.map((day) => (
            <button
              key={day}
              className={`btn btn-sm ${
                selectedDay === day && ["today", "day"].includes(viewMode)
                  ? "btn-primary"
                  : "btn-secondary"
              }`}
              onClick={() => handleDayFilter(day)}
            >
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={timetable}
        loading={loading}
        defaultSortKey="day_order"
        defaultSortDir="asc"
        rowClassName={(row) => (isLatest && isCurrentLecture(row) ? "current-lecture" : "")}
        tableId="timetable"
        cardAccent="#d744e7"
      />
    </div>
  );
}
