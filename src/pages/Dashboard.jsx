import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getStudents } from "../api/students";
import { getTeachers } from "../api/teachers";
import { getCourses } from "../api/courses";
import { getSemesters } from "../api/semesters";
import {
  getDashboardTopStudents,
  getSemesterResults,
  setTopStudent,
  clearTopStudent,
} from "../api/results";
import { Trophy, Pencil, X, RotateCcw } from "lucide-react";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useAuth } from "../context/AuthContext"; // adjust to your actual auth source

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [latestSemester, setLatestSemester] = useState(null);
  const [topStudents, setTopStudents] = useState({
    metadataId: null,
    cr: null,
    gr: null,
  });
  const [error, setError] = useState("");
  const [editingRole, setEditingRole] = useState(null); // "cr" | "gr" | null
  const [candidates, setCandidates] = useState([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);

  const { isAuthenticated } = useAuth();

  const loadTopStudents = () => {
    getDashboardTopStudents()
      .then((res) => setTopStudents(res.data))
      .catch(() => { });
  };

  useEffect(() => {
    Promise.all([getStudents(), getTeachers(), getCourses(), getSemesters()])
      .then(([students, teachers, courses, semesters]) => {
        setStats({
          students: students.data.length,
          teachers: teachers.data.length,
          courses: courses.data.length,
          semesters: semesters.data.length,
        });
        const sem = semesters.data;
        if (sem.length > 0) {
          const latest = sem.reduce((a, b) => {
            const n = (s) => parseInt(s.semester) || 0;
            return n(b) > n(a) ? b : a;
          });
          setLatestSemester(latest);
        }
      })
      .catch(() => setError("Failed to load dashboard data"));

    loadTopStudents();
  }, []);

  const openEditor = async (role) => {
    if (!topStudents.metadataId) return;
    setEditingRole(role);
    try {
      const res = await getSemesterResults(topStudents.metadataId);
      let list = res.data;
      // Filter candidates by gender for CR (males) and GR (females)
      if (role === "cr" || role === "gr") {
        try {
          const studentsRes = await getStudents();
          const genderByRoll = new Map(
            studentsRes.data.map((s) => [s.roll_no, s.gender]),
          );
          const expectedGender = role === "cr" ? "Male" : "Female";
          list = list.filter(
            (s) => genderByRoll.get(s.roll_no) === expectedGender,
          );
        } catch {
          // fall back to full list if gender info is unavailable
        }
      }
      // Sort candidates by CGPA (highest first)
      list = [...list].sort(
        (a, b) => ((b.cgpa ?? b.gpa) ?? 0) - ((a.cgpa ?? a.gpa) ?? 0),
      );
      setCandidates(list);
    } catch {
      setCandidates([]);
    }
  };

  const closeEditor = () => {
    setEditingRole(null);
    setCandidates([]);
  };

  const handlePick = async (rollNo) => {
    if (!editingRole || !topStudents.metadataId) return;
    setSavingOverride(true);
    try {
      await setTopStudent(topStudents.metadataId, rollNo, editingRole);
      loadTopStudents();
      closeEditor();
    } catch {
      setError(`Failed to set ${editingRole.toUpperCase()}`);
    } finally {
      setSavingOverride(false);
    }
  };

  const handleReset = async (role) => {
    if (!topStudents.metadataId) return;
    setSavingOverride(true);
    try {
      await clearTopStudent(topStudents.metadataId, role);
      loadTopStudents();
    } catch {
      setError(`Failed to reset ${role.toUpperCase()}`);
    } finally {
      setSavingOverride(false);
    }
  };

  const cards = [
    {
      label: "Students",
      count: stats?.students,
      path: "/students",
      color: "#4f46e5",
    },
    {
      label: "Teachers",
      count: stats?.teachers,
      path: "/teachers",
      color: "#0891b2",
    },
    {
      label: "Courses",
      count: stats?.courses,
      path: "/courses",
      color: "#059669",
    },
    {
      label: "Semesters",
      count: stats?.semesters,
      path: "/semesters",
      color: "#d97706",
    },
  ];

  const renderCard = (role, data, badgeLabel, cardClass) => (
    <div
      className={`top-student-card ${cardClass} ${!data ? "empty" : ""}`}
      style={{ position: "relative" }}
    >
      {isAuthenticated && topStudents.metadataId && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            gap: 6,
          }}
        >
          {data?.isOverride && (
            <button
              type="button"
              title={`Reset ${badgeLabel} to computed GPA leader`}
              onClick={(e) => {
                e.preventDefault();
                handleReset(role);
              }}
              disabled={savingOverride}
              className="icon-btn"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            type="button"
            title={`Manually set ${badgeLabel}`}
            onClick={(e) => {
              e.preventDefault();
              openEditor(role);
            }}
            className="icon-btn"
          >
            <Pencil size={14} />
          </button>
        </div>
      )}

      <div className="top-student-badge">{badgeLabel}</div>

      {data ? (
        <Link
          to={`/students/${data.roll_no}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="top-student-name">{data.name}</div>
          <div className="top-student-roll">{data.roll_no}</div>
          <div className="top-student-gpa">
            GPA: <strong>{data.gpa}</strong>
          </div>
        </Link>
      ) : (
        <div className="top-student-name">No data available</div>
      )}
    </div>
  );

  return (
    <div className="page">
      <h1>Dashboard</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="stats-grid">
        {cards.map((card) => (
          <Link
            to={card.path}
            key={card.label}
            className="stat-card"
            style={{ borderLeftColor: card.color }}
          >
            {stats === null ? (
              <div className="stat-skeleton" />
            ) : (
              <div className="stat-count">{card.count}</div>
            )}
            <div className="stat-label">{card.label}</div>
          </Link>
        ))}
      </div>

      {latestSemester && (
        <div className="latest-semester-section">
          <h2>Current Semester</h2>
          <Link
            to={`/semesters/${latestSemester.id}/courses`}
            className="latest-semester-card"
          >
            <div className="ls-item">
              <span className="ls-label">Semester</span>
              <span className="ls-value">{latestSemester.semester}</span>
            </div>
            <div className="ls-item">
              <span className="ls-label">Session</span>
              <span className="ls-value">{latestSemester.session}</span>
            </div>
            <div className="ls-item">
              <span className="ls-label">Program</span>
              <span className="ls-value">{latestSemester.program}</span>
            </div>
          </Link>
        </div>
      )}

      <div className="top-students-section">
        <div className="icon-text">
          <Trophy height={20} color="#ffbf00" />
          <h2> Top Students (Latest Semester)</h2>
        </div>
        <div className="top-students-grid">
          {renderCard(
            "cr",
            topStudents.cr,
            "CR (Class Representative)",
            "cr-card",
          )}
          {renderCard(
            "gr",
            topStudents.gr,
            "GR (Girls Representative)",
            "gr-card",
          )}
        </div>
      </div>

      {/* Simple override picker */}
      {editingRole && (
        <div className="modal-overlay" onClick={closeEditor}>
          <div
            className="modal-content override-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Set {editingRole.toUpperCase()}</h3>
              <button type="button" onClick={closeEditor} className="icon-btn">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              {candidates.length === 0 ? (
                <LoadingSpinner />
              ) : (
                <>
                  <div className="candidate-search-bar">
                    <span className="candidate-search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder={`Search students to set as ${editingRole.toUpperCase()}...`}
                      value={candidateSearch}
                      onChange={(e) => setCandidateSearch(e.target.value)}
                      className="candidate-search-input"
                      autoFocus
                    />
                    {candidateSearch && (
                      <button
                        type="button"
                        className="candidate-search-clear"
                        onClick={() => setCandidateSearch("")}
                        title="Clear search"
                      >
                        &times;
                      </button>
                    )}
                  </div>

                  {(() => {
                    const q = candidateSearch.trim().toLowerCase();
                    const filtered = candidates.filter((s) => {
                      if (!q) return true;
                      return (
                        (s.name || "").toLowerCase().includes(q) ||
                        (s.roll_no || "").toLowerCase().includes(q)
                      );
                    });
                    return filtered.length === 0 ? (
                      <div className="candidate-empty">
                        No students match your search
                      </div>
                    ) : (
                      <ul className="candidate-list">
                        <li className="candidate-list-header">
                          <span>Student</span>
                          <span>Roll No.</span>
                          <span>GPA</span>
                        </li>
                        {filtered.map((s) => (
                          <li key={s.roll_no}>
                            <button
                              type="button"
                              disabled={savingOverride}
                              onClick={() => handlePick(s.roll_no)}
                              className="candidate-row"
                            >
                              <span className="candidate-name">
                                {s.name}
                                {topStudents[editingRole]?.roll_no ===
                                  s.roll_no && (
                                    <span className="candidate-current-tag">
                                      current
                                    </span>
                                  )}
                              </span>
                              <span className="candidate-roll">
                                {s.roll_no}
                              </span>
                              <span className="candidate-gpa">{s.gpa}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
