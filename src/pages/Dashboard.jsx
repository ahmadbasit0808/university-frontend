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
  getAllCgpa,
  setTopStudent,
  clearTopStudent,
} from "../api/results";
import {
  Trophy,
  Pencil,
  X,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  UserCheck,
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
  const [success, setSuccess] = useState("");
  const [editingRole, setEditingRole] = useState(null); // "cr" | "gr" | null
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);
  const [refreshingRole, setRefreshingRole] = useState(null);

  const { isAuthenticated } = useAuth();

  const handleRefreshCardRole = async (role) => {
    const metaId =
      topStudents.metadataId ||
      (selectedSemesterId !== "latest" ? selectedSemesterId : latestSemester?.id);
    if (!metaId) return;
    setRefreshingRole(role);
    try {
      await clearTopStudent(metaId, role).catch(() => {});
      await loadTopStudents(selectedSemesterId);
      setSuccess(`${role.toUpperCase()} refreshed to auto`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err?.response?.data?.error || `Failed to refresh ${role.toUpperCase()}`);
      setTimeout(() => setError(""), 3000);
    } finally {
      setRefreshingRole(null);
    }
  };

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
    setError("");
    setSuccess("");
    setCandidateSearch("");
    setLoadingCandidates(true);
    try {
      const [studentsRes, cgpaRes, semResultsRes] = await Promise.allSettled([
        getStudents(),
        getAllCgpa(),
        getSemesterResults(metaId),
      ]);

      const extractArray = (res) => {
        if (!res) return [];
        const val = res.status === "fulfilled" ? res.value : res;
        const data = val?.data !== undefined ? val.data : val;
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.rows)) return data.rows;
        if (Array.isArray(data.students)) return data.students;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data.results)) return data.results;
        if (typeof data === "object") {
          for (const k of Object.keys(data)) {
            if (Array.isArray(data[k])) return data[k];
          }
        }
        return [];
      };

      const allStudents = extractArray(studentsRes);
      const cgpaList = extractArray(cgpaRes);
      const semResultsList = extractArray(semResultsRes);

      const getRollNo = (s) =>
        s?.roll_no || s?.rollNo || s?.student_id || s?.id;
      const getName = (s) =>
        s?.name ||
        s?.student_name ||
        s?.full_name ||
        (getRollNo(s) ? `Student ${getRollNo(s)}` : "");
      const getGender = (s) => s?.gender || s?.sex || null;
      const getGpa = (s) => s?.gpa ?? s?.obtained_gpa ?? null;
      const getCgpa = (s) => s?.cgpa ?? null;

      // Merge into a comprehensive student map
      const studentMap = new Map();

      const addStudentToMap = (s, defaultGpa = null, defaultCgpa = null) => {
        if (!s) return;
        const roll = getRollNo(s);
        if (!roll) return;
        const key = String(roll).trim();
        const existing = studentMap.get(key) || {
          roll_no: key,
          name: getName(s),
          gender: getGender(s),
          gpa: defaultGpa,
          cgpa: defaultCgpa,
        };
        const name = getName(s);
        if (name && (!existing.name || existing.name.startsWith("Student "))) {
          existing.name = name;
        }
        const gender = getGender(s);
        if (gender && !existing.gender) existing.gender = gender;
        const gpa = getGpa(s) ?? defaultGpa;
        if (gpa !== null && gpa !== undefined) existing.gpa = gpa;
        const cgpa = getCgpa(s) ?? defaultCgpa;
        if (cgpa !== null && cgpa !== undefined) existing.cgpa = cgpa;
        studentMap.set(key, existing);
      };

      allStudents.forEach((s) => addStudentToMap(s));
      cgpaList.forEach((s) => addStudentToMap(s, null, s?.cgpa));
      semResultsList.forEach((s) => addStudentToMap(s, s?.gpa, s?.cgpa));

      const isMale = (g) => {
        if (!g) return true;
        const s = String(g).trim().toLowerCase();
        return s.startsWith("m") || s === "male";
      };
      const isFemale = (g) => {
        if (!g) return true;
        const s = String(g).trim().toLowerCase();
        return s.startsWith("f") || s === "female";
      };

      const filterFn = role === "cr" ? isMale : isFemale;
      let list = Array.from(studentMap.values()).filter((s) =>
        filterFn(s.gender),
      );

      if (list.length === 0 && studentMap.size > 0) {
        list = Array.from(studentMap.values());
      }

      list.sort((a, b) => {
        const scoreA = Number(a.gpa ?? a.cgpa ?? -1);
        const scoreB = Number(b.gpa ?? b.cgpa ?? -1);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return String(a.roll_no || "").localeCompare(String(b.roll_no || ""));
      });

      setCandidates(list);
    } catch (err) {
      console.error("Failed to load candidates:", err);
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const closeEditor = () => {
    setEditingRole(null);
    setCandidates([]);
    setCandidateSearch("");
  };

  const handlePick = async (rollNo) => {
    const metaId =
      topStudents.metadataId ||
      (selectedSemesterId !== "latest" ? selectedSemesterId : latestSemester?.id);
    if (!editingRole || !metaId) return;
    setSavingOverride(true);
    setError("");
    try {
      await setTopStudent(metaId, rollNo, editingRole);
      await loadTopStudents(selectedSemesterId);
      setSuccess(`${editingRole.toUpperCase()} updated successfully`);
      closeEditor();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to set ${editingRole.toUpperCase()}`);
    } finally {
      setSavingOverride(false);
    }
  };

  const handleClear = async (role) => {
    const metaId =
      topStudents.metadataId ||
      (selectedSemesterId !== "latest" ? selectedSemesterId : latestSemester?.id);
    if (!metaId) return;
    setSavingOverride(true);
    setError("");
    try {
      await clearTopStudent(metaId, role);
      await loadTopStudents(selectedSemesterId);
      setSuccess(`${role.toUpperCase()} reset to auto`);
      closeEditor();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to reset ${role.toUpperCase()}`);
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

const getOrdinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

  const renderCard = (role, data, badgeLabel, cardClass) => {
    const hasEditPermission =
      isAuthenticated && (topStudents.metadataId || activeSemesterId);
    const semNum =
      parseInt(selectedSemObj?.semester || latestSemester?.semester || "1", 10) || 1;
    const prevSemNum = semNum > 1 ? semNum - 1 : 1;
    const gpaLabel =
      semNum > 1
        ? `${getOrdinal(prevSemNum)} Semester GPA`
        : "Aggregate";

    const isCr = role === "cr";
    const roleTitle = isCr ? "Class Representative" : "Girls Representative";
    const roleBadgeClass = isCr ? "cr" : "gr";

    const maxSemNum = Math.max(
      ...semestersList.map(
        (s) =>
          parseInt(s.semester, 10) ||
          parseInt(String(s.semester || "").match(/\d+/)?.[0], 10) ||
          1,
      ),
      1,
    );
    const isLatest = semNum === maxSemNum;
    const hasResult = Boolean(data && (data.gpa || data.cgpa || data.roll_no));
    // 1st semester cannot be refreshed; latest semester if it has no result cannot be refreshed
    const canRefresh = semNum > 1 && (!isLatest || hasResult);
    const isRefreshing = refreshingRole === role;

    return (
      <div
        className={`top-student-card ${cardClass} ${!data ? "empty" : ""}`}
      >
        {hasEditPermission && (
          <div
            className="top-student-actions"
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              display: "flex",
              gap: 6,
              zIndex: 2,
            }}
          >
            {canRefresh && (
              <button
                type="button"
                title={`Refresh ${role.toUpperCase()} (Revert to auto/re-calculate)`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRefreshCardRole(role);
                }}
                disabled={isRefreshing}
                className="icon-btn"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <RotateCcw size={13} className={isRefreshing ? "spin" : ""} />
              </button>
            )}
            <button
              type="button"
              title={`Edit ${role.toUpperCase()}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openEditor(role);
              }}
              className="icon-btn"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Pencil size={13} />
            </button>
          </div>
        )}

        <div className={`top-student-badge-pill ${roleBadgeClass}`}>
          <span>{isCr ? "CR" : "GR"}</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>{roleTitle}</span>
        </div>

        {data ? (
          <Link
            to={`/students/${data.roll_no}`}
            className="top-student-link-wrap"
            style={{
              textDecoration: "none",
              color: "inherit",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              flex: 1,
            }}
          >
            <div className="top-student-name" title={data.name}>
              {data.name}
            </div>
            <div className="top-student-roll">{data.roll_no}</div>

            <div className="top-student-score-box">
              {semNum === 1 ? (
                <>
                  <div className="top-student-score-label">
                    {data.aggregate || data.gpa || data.cgpa ? "Aggregate" : "Selection Basis"}
                  </div>
                  <div className="top-student-score-val">
                    {data.aggregate || data.gpa || data.cgpa ? (
                      <span className="score-num">{data.aggregate || data.gpa || data.cgpa}</span>
                    ) : (
                      <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text)" }}>
                        Based on Aggregate
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="top-student-score-label">
                    {gpaLabel}
                  </div>
                  <div className="top-student-score-val">
                    {data.gpa || data.cgpa ? (
                      <>
                        <span className="score-num">{data.gpa || data.cgpa}</span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>
                          GPA
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>
                        Assigned
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </Link>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px 0",
              width: "100%",
              flex: 1,
              gap: 8,
            }}
          >
            <div style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>
              No {role.toUpperCase()} Assigned
            </div>
            {hasEditPermission && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => openEditor(role)}
                style={{ fontSize: 12, padding: "4px 10px" }}
              >
                Assign {role.toUpperCase()}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page">
      <h1>Dashboard</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
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
              <h2>Class Representatives</h2>
            </div>
            {stats === null ? (
              <div
                className="stat-skeleton"
                style={{ width: 90, height: 22, borderRadius: 12, marginBottom: 0 }}
              />
            ) : (
              latestSemester && (
                <span className="top-students-section-badge">
                  Current
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
              {(() => {
                const semNum = parseInt(
                  selectedSemObj?.semester || latestSemester?.semester || "1",
                  10,
                );
                const isAssigned = !!topStudents[editingRole];
                if (!isAssigned) return null;
                return (
                  <div
                    style={{
                      marginBottom: 12,
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={savingOverride}
                      onClick={() => handleClear(editingRole)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                      }}
                    >
                      <RotateCcw size={13} />
                      {semNum > 1
                        ? `Revert to Auto (Sem ${semNum - 1} GPA)`
                        : "Clear Assignment"}
                    </button>
                  </div>
                );
              })()}

              {loadingCandidates ? (
                <div style={{ padding: "40px 0", textAlign: "center" }}>
                  <LoadingSpinner />
                </div>
              ) : (
                <>
                  <div className="candidate-search-bar">
                    <span className="candidate-search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder={`Search students to set as ${editingRole?.toUpperCase()}...`}
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

                    const currentRoll = topStudents[editingRole]?.roll_no;

                    return filtered.length === 0 ? (
                      <div className="candidate-empty">
                        {candidates.length === 0
                          ? "No students found."
                          : "No students match your search"}
                      </div>
                    ) : (
                      <ul className="candidate-list">
                        <li className="candidate-list-header">
                          <span>Student</span>
                          <span>Roll No.</span>
                          <span style={{ textAlign: "right" }}>
                            {semNum > 1 ? `Sem ${semNum - 1} GPA` : "GPA / CGPA"}
                          </span>
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
                                {s.name || "Student"}
                                {currentRoll === s.roll_no && (
                                  <span className="candidate-current-tag">
                                    current
                                  </span>
                                )}
                              </span>
                              <span className="candidate-roll">
                                {s.roll_no}
                              </span>
                              <span className="candidate-gpa">
                                {s.cgpa ? `${s.cgpa}` : s.gpa ? `${s.gpa}` : "—"}
                              </span>
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
