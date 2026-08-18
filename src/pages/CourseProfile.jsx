import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCourse } from "../api/courses";
import { getSemesters, getSemesterCourses } from "../api/semesters";
import { getCourseResults } from "../api/courseResults";
import { getGradingScales } from "../api/gradingScale";
import LoadingSpinner from "../components/common/LoadingSpinner";
import {
  BookOpen,
  Award,
  Building2,
  GraduationCap,
  Clock,
  Calendar,
  Hash,
  User,
  Trophy,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const GRADE_COLORS = {
  A: "#059669",
  "A-": "#10b981",
  "B+": "#2563eb",
  B: "#3b82f6",
  "B-": "#60a5fa",
  "C+": "#d97706",
  C: "#fbbf24",
  "C-": "#fcd34d",
  D: "#ea580c",
  F: "#dc2626",
};
const GRADE_ORDER = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"];

export default function CourseProfile() {
  const { courseCode } = useParams();
  const navigate = useNavigate();
  const chartHeight = window.innerWidth <= 768 ? 260 : 300;
  const [course, setCourse] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [gradeData, setGradeData] = useState([]);
  const [gradeRanges, setGradeRanges] = useState({});
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const courseRes = await getCourse(courseCode);
        setCourse(courseRes.data);

        // Fetch all semesters then their courses, filter by this course_code
        const semRes = await getSemesters();
        const allCourses = (
          await Promise.all(
            semRes.data.map((s) =>
              getSemesterCourses(s.id)
                .then((r) =>
                  r.data.map((c) => ({
                    ...c,
                    semester: s.semester,
                    session: s.session,
                    metadata_id: s.id,
                  })),
                )
                .catch(() => []),
            ),
          )
        ).flat();

        const courseOfferings = allCourses.filter(
          (c) => c.course_code === courseCode,
        );
        setOfferings(courseOfferings);

        // Fetch all grade results for each offering of this course
        const results = (
          await Promise.all(
            courseOfferings.map((c) =>
              getCourseResults(c.semester_course_id)
                .then((r) =>
                  r.data.map((item) => ({
                    ...item,
                    semester: c.semester,
                    session: c.session,
                  })),
                )
                .catch(() => []),
            ),
          )
        ).flat();

        setTotalStudents(results.length);

        // Top 3 performers (highest marks obtained)
        const sortedResults = [...results]
          .filter(
            (r) =>
              r.marks_obtained != null && !isNaN(parseFloat(r.marks_obtained)),
          )
          .sort(
            (a, b) =>
              parseFloat(b.marks_obtained) - parseFloat(a.marks_obtained),
          );

        const uniqueTop = [];
        const seen = new Set();
        for (const item of sortedResults) {
          if (!seen.has(item.roll_no)) {
            seen.add(item.roll_no);
            uniqueTop.push(item);
          }
          if (uniqueTop.length === 3) break;
        }
        setTopPerformers(uniqueTop);

        const gradeCounts = {};
        results.forEach(({ letter_grade }) => {
          if (letter_grade)
            gradeCounts[letter_grade] = (gradeCounts[letter_grade] || 0) + 1;
        });
        setGradeData(
          GRADE_ORDER.filter((g) => gradeCounts[g]).map((g) => ({
            name: g,
            value: gradeCounts[g],
          })),
        );

        const scaleRes = await getGradingScales();
        const ranges = {};
        scaleRes.data.forEach(({ letter_grade, min_marks, max_marks }) => {
          ranges[letter_grade] =
            `${parseFloat(min_marks).toFixed(0)}-${parseFloat(max_marks).toFixed(0)}`;
        });
        setGradeRanges(ranges);
      } catch {
        setError("Course not found.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseCode]);

  if (loading)
    return (
      <div className="page">
        <LoadingSpinner />
      </div>
    );
  if (error)
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  if (!course) return null;

  const infoItems = [
    {
      icon: <Hash size={16} />,
      label: "Course Code",
      value: course.course_code,
    },
    {
      icon: <Clock size={16} />,
      label: "Credit Hours",
      value: `${course.credit_hours} Cr.`,
    },
    {
      icon: <Building2 size={16} />,
      label: "Department",
      value: course.department || "—",
    },
    {
      icon: <GraduationCap size={16} />,
      label: "Program",
      value: course.program || "—",
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
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
          <h1>{course.course_name}</h1>
          <p className="text-muted">Course Code: {course.course_code}</p>
        </div>
      </div>

      <div className="sp-grid">
        {/* Course Details */}
        <div className="sp-card">
          <div className="sp-card-header">
            <span className="sp-card-icon blue">
              <BookOpen size={20} />
            </span>
            <h3>Course Details</h3>
          </div>
          <div className="sp-info-list">
            {infoItems.map(({ icon, label, value }) => (
              <div className="sp-info-item" key={label}>
                <span className="sp-info-label">
                  {icon}
                  {label}
                </span>
                <span className="sp-info-value">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Semester Offerings */}
        <div className="sp-card">
          <div className="sp-card-header">
            <span className="sp-card-icon green">
              <Calendar size={20} />
            </span>
            <h3>Semester Offerings</h3>
          </div>
          {offerings.length === 0 ? (
            <p className="text-muted" style={{ padding: "1rem" }}>
              No semester offerings recorded.
            </p>
          ) : (
            <>
              <div className="sp-stats-row">
                <div className="sp-stat">
                  <span className="sp-stat-value">{offerings.length}</span>
                  <span className="sp-stat-label">Offerings</span>
                </div>
                <div className="sp-stat">
                  <span className="sp-stat-value">{course.credit_hours}</span>
                  <span className="sp-stat-label">Credit Hrs</span>
                </div>
                <div className="sp-stat">
                  <span className="sp-stat-value">{totalStudents}</span>
                  <span className="sp-stat-label">Students Graded</span>
                </div>
              </div>
              <div className="sp-semester-list">
                {offerings.map((c) => (
                  <div
                    className="sp-semester-row"
                    key={c.semester_course_id}
                    onClick={() =>
                      navigate(
                        `/course-results?semester=${c.metadata_id}&course=${c.semester_course_id}`,
                      )
                    }
                  >
                    <div>
                      <span className="sp-semester-name">
                        {c.semester} — {c.session}
                      </span>
                      {c.teacher_name && (
                        <div
                          className="text-muted"
                          style={{
                            fontSize: "12px",
                            marginTop: "2px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <User size={12} /> {c.teacher_name}
                        </div>
                      )}
                    </div>
                    <span className="grade-badge">View Results</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Grade Distribution */}
        {gradeData.length > 0 && (
          <div className="sp-card sp-card-full">
            <div className="sp-card-header">
              <span className="sp-card-icon blue">
                <Award size={20} />
              </span>
              <h3>Grade Distribution</h3>
            </div>
            <div
              className="grade-dist-layout"
              style={{ alignItems: "center" }}
            >
              <div
                className="grade-dist-chart"
                style={{
                  height: `${chartHeight}px`,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart
                    data={gradeData}
                    margin={{ top: 12, right: 16, left: -15, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 13, fontWeight: 600 }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12 }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val) => [`${val} students`, "Count"]}
                      contentStyle={{
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Bar
                      dataKey="value"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    >
                      {gradeData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={GRADE_COLORS[entry.name] || "#3b82f6"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grade-dist-legend" style={{ alignSelf: "center" }}>
                {gradeData.map((entry) => (
                  <div key={entry.name} className="grade-dist-legend-item">
                    <span
                      className="grade-dist-dot"
                      style={{
                        background: GRADE_COLORS[entry.name] || "#94a3b8",
                      }}
                    />
                    <span className="grade-dist-name">{entry.name}</span>
                    <span className="grade-dist-range">
                      {gradeRanges[entry.name]
                        ? `${gradeRanges[entry.name]}`
                        : ""}
                    </span>
                    <span className="grade-dist-count">
                      {entry.value}{" "}
                      <span className="grade-dist-count-label">students</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top 3 Performers */}
        {topPerformers.length > 0 && (
          <div className="sp-card sp-card-full">
            <div className="sp-card-header">
              <span
                className="sp-card-icon"
                style={{
                  background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                  color: "#d97706",
                }}
              >
                <Trophy size={20} />
              </span>
              <h3>Top 3 Performers</h3>
            </div>
            <div className="sp-semester-list">
              {topPerformers.map((student, idx) => {
                const rankBadges = [
                  {
                    label: "1st",
                    color: "#b45309",
                    bg: "#fef3c7",
                    border: "#fcd34d",
                  },
                  {
                    label: "2nd",
                    color: "#475569",
                    bg: "#f1f5f9",
                    border: "#cbd5e1",
                  },
                  {
                    label: "3rd",
                    color: "#9a3412",
                    bg: "#ffedd5",
                    border: "#fdba74",
                  },
                ];
                const badge = rankBadges[idx] || {
                  label: `#${idx + 1}`,
                  color: "#64748b",
                  bg: "#f8fafc",
                  border: "#e2e8f0",
                };

                return (
                  <div
                    className="sp-semester-row"
                    key={`${student.roll_no}-${student.semester_course_id || idx}`}
                    onClick={() => navigate(`/students/${student.roll_no}`)}
                    style={{ alignItems: "center" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "12px",
                          flexShrink: 0,
                        }}
                      >
                        {badge.label}
                      </span>
                      <div>
                        <span className="sp-semester-name">
                          {student.student_name ||
                            student.name ||
                            student.roll_no}
                        </span>
                        <div
                          className="text-muted"
                          style={{ fontSize: "12px", marginTop: "2px" }}
                        >
                          {student.roll_no}
                          {student.semester && ` • ${student.semester}`}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "14px",
                          color: "var(--text)",
                        }}
                      >
                        {student.marks_obtained}
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            fontWeight: 500,
                          }}
                        >
                          {" "}
                          / 100
                        </span>
                      </div>
                      {student.letter_grade && (
                        <span
                          className={`grade-badge grade-${student.letter_grade.toLowerCase().replace("+", "-plus")}`}
                          style={{ marginTop: "3px", display: "inline-block" }}
                        >
                          {student.letter_grade}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
