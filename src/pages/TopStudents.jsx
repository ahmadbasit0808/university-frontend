import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSemesters } from "../api/semesters";
import { getStudents } from "../api/students";
import {
  getSemesterTopStudents,
  getAllCgpa,
  getSemesterResults,
  setTopStudent,
  clearTopStudent,
} from "../api/results";
import {
  Trophy,
  Pencil,
  X,
  ArrowLeft,
  ExternalLink,
  RotateCcw,
  Sparkles,
  UserCheck,
} from "lucide-react";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useAuth } from "../context/AuthContext";

import {
  computeAutoRepresentative,
  extractArray,
  isMale,
  isFemale,
} from "../utils/topStudentsHelper";

export default function TopStudents() {
  const [semesters, setSemesters] = useState([]);
  const [semesterTopData, setSemesterTopData] = useState({}); // { [semesterId]: { cr, gr, metadataId } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingRole, setEditingRole] = useState(null); // { semesterId, role: "cr" | "gr" }
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);
  const [refreshingRoleKey, setRefreshingRoleKey] = useState(null);

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleRefreshRole = async (semesterId, role) => {
    const key = `${semesterId}-${role}`;
    setRefreshingRoleKey(key);
    setError("");
    setSuccess("");
    try {
      await clearTopStudent(semesterId, role).catch(() => {});
      const semObj = semesters.find((s) => String(s.id) === String(semesterId));
      let topRes = await getSemesterTopStudents(semesterId).catch(() => null);
      let roleData = topRes?.data?.[role];

      // If backend returned null/empty for this role, auto-calculate from previous semester GPA
      if (!roleData || !roleData.roll_no) {
        const autoStudent = await computeAutoRepresentative(semObj, semesters, role);
        if (autoStudent) {
          await setTopStudent(semesterId, autoStudent.roll_no, role).catch(() => {});
          roleData = autoStudent;
        }
      }

      setSemesterTopData((prev) => ({
        ...prev,
        [semesterId]: {
          ...(prev[semesterId] || {}),
          [role]: roleData || null,
        },
      }));

      if (roleData) {
        setSuccess(
          `${role.toUpperCase()} refreshed to ${roleData.name || roleData.roll_no}${
            roleData.gpa ? ` (GPA: ${roleData.gpa})` : ""
          }`,
        );
      } else {
        setError(
          `No published results or GPA found for Semester ${
            (parseInt(semObj?.semester, 10) || 1) - 1
          } to auto-assign ${role.toUpperCase()}. You can assign manually.`,
        );
      }
      setTimeout(() => {
        setSuccess("");
        setError("");
      }, 3500);
    } catch (err) {
      setError(err?.response?.data?.error || `Failed to refresh ${role.toUpperCase()}`);
      setTimeout(() => setError(""), 3000);
    } finally {
      setRefreshingRoleKey(null);
    }
  };

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

      // Auto-resolve any missing CR/GR from previous semester results
      await Promise.all(
        sortedSemesters.map(async (sem) => {
          const semData = map[sem.id] || { cr: null, gr: null, metadataId: sem.id };
          if (!semData.cr) {
            const autoCr = await computeAutoRepresentative(sem, sortedSemesters, "cr");
            if (autoCr) semData.cr = autoCr;
          }
          if (!semData.gr) {
            const autoGr = await computeAutoRepresentative(sem, sortedSemesters, "gr");
            if (autoGr) semData.gr = autoGr;
          }
          map[sem.id] = semData;
        }),
      );

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
      const semObj = semesters.find((s) => String(s.id) === String(semId));
      const semData = res.data || { cr: null, gr: null, metadataId: semId };
      if (!semData.cr) {
        const autoCr = await computeAutoRepresentative(semObj, semesters, "cr");
        if (autoCr) semData.cr = autoCr;
      }
      if (!semData.gr) {
        const autoGr = await computeAutoRepresentative(semObj, semesters, "gr");
        if (autoGr) semData.gr = autoGr;
      }
      setSemesterTopData((prev) => ({
        ...prev,
        [semId]: semData,
      }));
    } catch {
      // ignore
    }
  };

  const openEditor = async (semesterId, role) => {
    setEditingRole({ semesterId, role });
    setError("");
    setSuccess("");
    setCandidateSearch("");
    setLoadingCandidates(true);
    try {
      const currentSem = semesters.find(
        (s) => String(s.id) === String(semesterId),
      );
      const semNum =
        parseInt(currentSem?.semester, 10) ||
        parseInt(String(currentSem?.semester || "").match(/\d+/)?.[0], 10) ||
        1;
      const prevSem =
        semNum > 1
          ? semesters.find((s) => {
              const n =
                parseInt(s.semester, 10) ||
                parseInt(String(s.semester || "").match(/\d+/)?.[0], 10) ||
                0;
              return n === semNum - 1;
            })
          : null;

      const targetSemId = prevSem ? prevSem.id : semesterId;

      const [studentsRes, cgpaRes, semResultsRes] = await Promise.allSettled([
        getStudents(),
        getAllCgpa(),
        getSemesterResults(targetSemId),
      ]);

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

      const filterFn = role === "cr" ? isMale : isFemale;
      let list = Array.from(studentMap.values()).filter((s) =>
        filterFn(s.gender),
      );

      if (list.length === 0 && studentMap.size > 0) {
        list = Array.from(studentMap.values());
      }

      list.sort((a, b) => {
        const scoreA = a.gpa !== null && a.gpa !== undefined ? Number(a.gpa) : -1;
        const scoreB = b.gpa !== null && b.gpa !== undefined ? Number(b.gpa) : -1;
        if (scoreB !== scoreA) return scoreB - scoreA;
        const cgpaA = Number(a.cgpa ?? -1);
        const cgpaB = Number(b.cgpa ?? -1);
        if (cgpaB !== cgpaA) return cgpaB - cgpaA;
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
    if (!editingRole) return;
    const { semesterId, role } = editingRole;
    setSavingOverride(true);
    setError("");
    try {
      await setTopStudent(semesterId, rollNo, role);
      await refreshSemester(semesterId);
      setSuccess(`${role.toUpperCase()} updated successfully`);
      closeEditor();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to set ${role.toUpperCase()}`);
    } finally {
      setSavingOverride(false);
    }
  };

  const handleClear = async (semesterId, role) => {
    setSavingOverride(true);
    setError("");
    try {
      await clearTopStudent(semesterId, role);
      await refreshSemester(semesterId);
      setSuccess(`${role.toUpperCase()} reset to auto`);
      closeEditor();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to reset ${role.toUpperCase()}`);
    } finally {
      setSavingOverride(false);
    }
  };

  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const visibleSemesters = isAuthenticated
    ? semesters
    : semesters.filter((sem) => {
        const data = semesterTopData[sem.id];
        return Boolean(data && (data.cr || data.gr));
      });

  const maxSemNum =
    semesters.length > 0
      ? Math.max(
          ...semesters.map(
            (s) =>
              parseInt(s.semester, 10) ||
              parseInt(String(s.semester || "").match(/\d+/)?.[0], 10) ||
              1,
          ),
        )
      : 1;

  const renderStudentCard = (semester, role, data, badgeLabel, cardClass) => {
    const semNum =
      parseInt(semester?.semester, 10) ||
      parseInt(String(semester?.semester || "").match(/\d+/)?.[0], 10) ||
      1;
    const prevSemNum = semNum > 1 ? semNum - 1 : 1;
    const gpaLabel =
      semNum > 1
        ? `${getOrdinal(prevSemNum)} Semester GPA`
        : "Aggregate";

    const isCr = role === "cr";
    const roleTitle = isCr ? "Class Representative" : "Girls Representative";
    const roleBadgeClass = isCr ? "cr" : "gr";
    const isLatest = semNum === maxSemNum;
    const hasResult = Boolean(data && (data.gpa || data.cgpa || data.roll_no));
    // 1st semester cannot be refreshed; latest semester if it has no result cannot be refreshed
    const canRefresh = semNum > 1 && (!isLatest || hasResult);
    const isRefreshing = refreshingRoleKey === `${semester?.id}-${role}`;

    return (
      <div
        className={`top-student-card ${cardClass} ${!data ? "empty" : ""}`}
      >
        {isAuthenticated && (
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
                  handleRefreshRole(semester?.id, role);
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
                openEditor(semester?.id, role);
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
            {isAuthenticated && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => openEditor(semester?.id, role)}
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
      {success && <div className="alert alert-success">{success}</div>}

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
            const semNum =
              parseInt(sem.semester, 10) ||
              parseInt(String(sem.semester || "").match(/\d+/)?.[0], 10) ||
              1;
            const isLatest = semNum === maxSemNum;
            const hasResult = Boolean(semData && (semData.cr || semData.gr));
            // 1st semester cannot be refreshed; latest semester if it has no result cannot be refreshed
            const canRefresh = semNum > 1 && (!isLatest || hasResult);

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
                    sem,
                    "cr",
                    semData.cr,
                    "CR (Class Representative)",
                    "cr-card",
                  )}
                  {renderStudentCard(
                    sem,
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
      {editingRole && (() => {
        const currentSem = semesters.find(
          (s) => String(s.id) === String(editingRole.semesterId),
        );
        const semNum = parseInt(currentSem?.semester || "1", 10);
        const isAssigned =
          !!semesterTopData[editingRole.semesterId]?.[editingRole.role];
        const currentRoll =
          semesterTopData[editingRole.semesterId]?.[
            editingRole.role
          ]?.roll_no;
        const q = candidateSearch.trim().toLowerCase();
        const filtered = candidates.filter((s) => {
          if (!q) return true;
          return (
            (s.name || "").toLowerCase().includes(q) ||
            (s.roll_no || "").toLowerCase().includes(q)
          );
        });

        return (
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
                {isAssigned && (
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
                      onClick={() =>
                        handleClear(editingRole.semesterId, editingRole.role)
                      }
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
                )}

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

                    {filtered.length === 0 ? (
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
                                {s.gpa !== null && s.gpa !== undefined
                                  ? `${parseFloat(s.gpa).toFixed(2)}`
                                  : s.cgpa !== null && s.cgpa !== undefined
                                    ? `${parseFloat(s.cgpa).toFixed(2)}`
                                    : "—"}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
