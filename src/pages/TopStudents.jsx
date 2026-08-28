import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSemesters } from "../api/semesters";
import { getStudents } from "../api/students";
import {
  getSemesterTopStudents,
  getSemesterResults,
  setTopStudent,
} from "../api/results";
import {
  Trophy,
  Pencil,
  X,
  ArrowLeft,
  ExternalLink,
  Users,
} from "lucide-react";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useAuth } from "../context/AuthContext";

export default function TopStudents() {
  const [semesters, setSemesters] = useState([]);
  const [semesterTopData, setSemesterTopData] = useState({}); // { [semesterId]: { cr, gr, metadataId } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingRole, setEditingRole] = useState(null); // { semesterId, role: "cr" | "gr" }
  const [candidates, setCandidates] = useState([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const fetchAllTopStudents = async () => {
    try {
      setLoading(true);
      const { data: semList } = await getSemesters();

      // Sort semesters by semester number
      const sortedSemesters = [...semList].sort((a, b) => {
        const nA = parseInt(a.semester) || 0;
        const nB = parseInt(b.semester) || 0;
        return nA - nB;
      });
      setSemesters(sortedSemesters);

      // Fetch top students for all semesters in parallel
      const topResults = await Promise.allSettled(
        sortedSemesters.map(async (sem) => {
          try {
            const res = await getSemesterTopStudents(sem.id);
            return {
              semesterId: sem.id,
              data: res.data || { cr: null, gr: null, metadataId: sem.id },
            };
          } catch {
            return {
              semesterId: sem.id,
              data: { cr: null, gr: null, metadataId: sem.id },
            };
          }
        }),
      );

      const map = {};
      topResults.forEach((res) => {
        if (res.status === "fulfilled") {
          map[res.value.semesterId] = res.value.data;
        }
      });
      setSemesterTopData(map);
    } catch {
      setError("Failed to load semester top students data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTopStudents();
  }, []);

  const refreshSemester = async (semId) => {
    try {
      const res = await getSemesterTopStudents(semId);
      setSemesterTopData((prev) => ({
        ...prev,
        [semId]: res.data || { cr: null, gr: null, metadataId: semId },
      }));
    } catch {
      // ignore
    }
  };

  const openEditor = async (semesterId, role) => {
    setEditingRole({ semesterId, role });
    try {
      const res = await getSemesterResults(semesterId);
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
          // fallback if student lookup fails
        }
      }
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
    setCandidateSearch("");
  };

  const handlePick = async (rollNo) => {
    if (!editingRole) return;
    const { semesterId, role } = editingRole;
    setSavingOverride(true);
    try {
      await setTopStudent(semesterId, rollNo, role);
      await refreshSemester(semesterId);
      closeEditor();
    } catch {
      setError(`Failed to set ${role.toUpperCase()}`);
    } finally {
      setSavingOverride(false);
    }
  };

  const renderStudentCard = (semesterId, role, data, badgeLabel, cardClass) => (
    <div
      className={`top-student-card ${cardClass} ${!data ? "empty" : ""}`}
      style={{ position: "relative" }}
    >
      {isAuthenticated && (
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
              openEditor(semesterId, role);
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
        <div className="top-student-name" style={{ fontSize: 16 }}>
          No data available
        </div>
      )}
    </div>
  );

  const visibleSemesters = semesters.filter((sem) => {
    const data = semesterTopData[sem.id];
    return Boolean(data && (data.cr || data.gr));
  });

  return (
    <div className="page">
      {/* Minimalist Hero Header */}
      <div className="course-hero-card">
        <div
          style={{
            position: "absolute",
            top: "-30px",
            right: "-30px",
            width: "160px",
            height: "160px",
            background:
              "radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0) 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "14px",
          }}
        >
          <button
            onClick={() => navigate("/")}
            style={{
              background: "#ffffff",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "5px 12px",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--border)")
            }
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <div className="course-hero-content">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                  color: "#b45309",
                  padding: "12px",
                  borderRadius: "14px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 4px rgba(217, 119, 6, 0.15)",
                }}
              >
                <Trophy size={26} color="#d97706" />
              </div>
              <div>
                <h1 className="course-hero-title">Class Representatives (CR & GR)</h1>
                <p
                  className="text-muted"
                  style={{ margin: "4px 0 0", fontSize: "14px" }}
                >
                  Class Representatives (CR) and Girls Representatives (GR) across all semesters
                </p>
              </div>
            </div>
          </div>

          {/* Minimalist Session & Program Badge */}
          {visibleSemesters.length > 0 && (
            <span
              style={{
                background: "var(--card-bg, #ffffff)",
                border: "1px solid var(--border)",
                borderRadius: "20px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {visibleSemesters[0]?.program || "BSCS"} • {visibleSemesters[0]?.session || "2024-2028"}
            </span>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <LoadingSpinner />
        </div>
      ) : visibleSemesters.length === 0 ? (
        <div className="text-muted">No top student data available for any semester.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {visibleSemesters.map((sem) => {
            const semData = semesterTopData[sem.id] || { cr: null, gr: null };
            return (
              <div key={sem.id} id={`sem-${sem.id}`} className="semester-top-section card">
                <div className="semester-top-header">
                  <div className="semester-top-title-group">
                    <span className="semester-top-tag">
                      {/semester/i.test(sem.semester || "")
                        ? sem.semester.replace(/semester/i, "Semester")
                        : `${sem.semester} Semester`}
                    </span>
                  </div>
                  <Link
                    to={`/results/semester/${sem.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <span>Full Semester Results</span>
                    <ExternalLink size={14} />
                  </Link>
                </div>

                <div className="top-students-grid" style={{ marginTop: 16 }}>
                  {renderStudentCard(
                    sem.id,
                    "cr",
                    semData.cr,
                    "CR (Class Representative)",
                    "cr-card",
                  )}
                  {renderStudentCard(
                    sem.id,
                    "gr",
                    semData.gr,
                    "GR (Girls Representative)",
                    "gr-card",
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Override Modal */}
      {editingRole && (
        <div className="modal-overlay" onClick={closeEditor}>
          <div
            className="modal-content override-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Set {editingRole.role.toUpperCase()}</h3>
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
                      placeholder={`Search students to set as ${editingRole.role.toUpperCase()}...`}
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
                    const currentRoll =
                      semesterTopData[editingRole.semesterId]?.[
                        editingRole.role
                      ]?.roll_no;

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
                                {currentRoll === s.roll_no && (
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
