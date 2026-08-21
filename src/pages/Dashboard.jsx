import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getStudents } from "../api/students";
import { getTeachers } from "../api/teachers";
import { getCourses } from "../api/courses";
import { getSemesters } from "../api/semesters";
import {
  getDashboardTopStudents,
  getSemesterTopStudents,
  getSemesterResults,
  setTopStudent,
} from "../api/results";
import {
  Trophy,
  Pencil,
  X,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [semestersList, setSemestersList] = useState([]);
  const [latestSemester, setLatestSemester] = useState(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState("latest");
  const [topStudentsLoading, setTopStudentsLoading] = useState(true);
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

  const loadTopStudents = async (semId = selectedSemesterId) => {
    setTopStudentsLoading(true);
    try {
      if (!semId || semId === "latest") {
        const res = await getDashboardTopStudents();
        setTopStudents(res.data || { metadataId: null, cr: null, gr: null });
      } else {
        const res = await getSemesterTopStudents(semId);
        setTopStudents({
          metadataId: res.data?.metadataId || semId,
          cr: res.data?.cr || null,
          gr: res.data?.gr || null,
        });
      }
    } catch {
      setTopStudents({
        metadataId: semId !== "latest" ? semId : null,
        cr: null,
        gr: null,
      });
    } finally {
      setTopStudentsLoading(false);
    }
  };

  const handleSelectSemester = (semId) => {
    setSelectedSemesterId(semId);
    loadTopStudents(semId);
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
        const sem = semesters.data || [];
        const sorted = [...sem].sort((a, b) => {
          const nA = parseInt(a.semester) || 0;
          const nB = parseInt(b.semester) || 0;
          return nA - nB;
        });
        setSemestersList(sorted);
        if (sem.length > 0) {
          const latest = sem.reduce((a, b) => {
            const n = (s) => parseInt(s.semester) || 0;
            return n(b) > n(a) ? b : a;
          });
          setLatestSemester(latest);
        }
      })
      .catch(() => setError("Failed to load dashboard data"));

    loadTopStudents("latest");
  }, []);

  const openEditor = async (role) => {
    const metaId =
      topStudents.metadataId ||
      (selectedSemesterId !== "latest" ? selectedSemesterId : latestSemester?.id);
    if (!metaId) return;
    setEditingRole(role);
    try {
      const res = await getSemesterResults(metaId);
      let list = res.data || [];
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
    const metaId =
      topStudents.metadataId ||
      (selectedSemesterId !== "latest" ? selectedSemesterId : latestSemester?.id);
    if (!editingRole || !metaId) return;
    setSavingOverride(true);
    try {
      await setTopStudent(metaId, rollNo, editingRole);
      loadTopStudents(selectedSemesterId);
      closeEditor();
    } catch {
      setError(`Failed to set ${editingRole.toUpperCase()}`);
    } finally {
      setSavingOverride(false);
    }
  };

  const selectedSemObj = semestersList.find(
    (s) => String(s.id) === String(selectedSemesterId),
  );
  const activeSemesterId =
    selectedSemesterId !== "latest"
      ? selectedSemesterId
      : latestSemester?.id || topStudents.metadataId;

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

  const renderCard = (role, data, badgeLabel, cardClass) => {
    const hasEditPermission =
      isAuthenticated && (topStudents.metadataId || activeSemesterId);

    return (
      <div
        className={`top-student-card ${cardClass} ${!data ? "empty" : ""}`}
        style={{ position: "relative" }}
      >
        {hasEditPermission && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              display: "flex",
              gap: 6,
            }}
          >
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
              CGPA: <strong>{data.cgpa ?? data.gpa}</strong>
            </div>
          </Link>
        ) : (
          <div className="top-student-name">No data available</div>
        )}
      </div>
    );
  };

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

      {(stats === null || latestSemester) && (
        <div className="latest-semester-section">
          <h2>Current Semester</h2>
          {stats === null ? (
            <div className="latest-semester-card" style={{ cursor: "default" }}>
              <div className="ls-item">
                <span className="ls-label">Semester</span>
                <div className="stat-skeleton" style={{ width: 80, height: 20, marginBottom: 0 }} />
              </div>
              <div className="ls-item">
                <span className="ls-label">Session</span>
                <div className="stat-skeleton" style={{ width: 100, height: 20, marginBottom: 0 }} />
              </div>
              <div className="ls-item">
                <span className="ls-label">Program</span>
                <div className="stat-skeleton" style={{ width: 90, height: 20, marginBottom: 0 }} />
              </div>
            </div>
          ) : (
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
          )}
        </div>
      )}

      <div className="top-students-section">
        <div className="top-students-header">
          <div className="top-students-title-wrap">
            <div className="icon-text top-students-title">
              <Trophy height={22} color="#ffbf00" />
              <h2>Top Students</h2>
            </div>
            {stats === null ? (
              <div
                className="stat-skeleton"
                style={{ width: 90, height: 22, borderRadius: 12, marginBottom: 0 }}
              />
            ) : (
              latestSemester && (
                <span className="top-students-section-badge">
                  {/semester/i.test(latestSemester.semester || "")
                    ? latestSemester.semester.replace(/semester/i, "Semester")
                    : `${latestSemester.semester} Semester`}
                </span>
              )
            )}
          </div>

          <div className="top-students-controls">
            <Link
              to="/top-students"
              className="btn btn-secondary btn-sm"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              <span>Show Previous</span>
              <ChevronRight size={15} />
            </Link>
          </div>
        </div>

        <div className="top-students-grid-wrapper">
          {topStudentsLoading ? (
            <div className="top-students-grid">
              <div className="top-student-card cr-card" style={{ minHeight: 140 }}>
                <div
                  className="stat-skeleton"
                  style={{ width: 150, height: 18, marginBottom: 16 }}
                />
                <div
                  className="stat-skeleton"
                  style={{ width: "70%", height: 22, marginBottom: 8 }}
                />
                <div
                  className="stat-skeleton"
                  style={{ width: "45%", height: 16, marginBottom: 8 }}
                />
                <div
                  className="stat-skeleton"
                  style={{ width: "55%", height: 16, marginBottom: 0 }}
                />
              </div>
              <div className="top-student-card gr-card" style={{ minHeight: 140 }}>
                <div
                  className="stat-skeleton"
                  style={{ width: 150, height: 18, marginBottom: 16 }}
                />
                <div
                  className="stat-skeleton"
                  style={{ width: "70%", height: 22, marginBottom: 8 }}
                />
                <div
                  className="stat-skeleton"
                  style={{ width: "45%", height: 16, marginBottom: 8 }}
                />
                <div
                  className="stat-skeleton"
                  style={{ width: "55%", height: 16, marginBottom: 0 }}
                />
              </div>
            </div>
          ) : (
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
