import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCourse, getCourses } from "../api/courses";
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
  GitFork,
  BookMarked,
  Library,
  Layers,
  Search,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Bookmark,
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

const parseJsonData = (val) => {
  if (!val) return null;
  if (Array.isArray(val) || (typeof val === "object" && val !== null)) return val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed === "null" || trimmed === "[]" || trimmed === "{}")
      return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return null;
};

export default function CourseProfile() {
  const { courseCode } = useParams();
  const navigate = useNavigate();
  const chartHeight = window.innerWidth <= 768 ? 260 : 300;

  const [course, setCourse] = useState(null);
  const [allCoursesList, setAllCoursesList] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [gradeData, setGradeData] = useState([]);
  const [gradeRanges, setGradeRanges] = useState({});
  const [totalStudents, setTotalStudents] = useState(0);
  const [avgMarks, setAvgMarks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [copiedCode, setCopiedCode] = useState(false);
  const [topicSearch, setTopicSearch] = useState("");
  const [collapsedSections, setCollapsedSections] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [courseRes, coursesListRes, semRes] = await Promise.all([
          getCourse(courseCode),
          getCourses().catch(() => ({ data: [] })),
          getSemesters(),
        ]);
        setCourse(courseRes.data);
        setAllCoursesList(coursesListRes.data || []);

        // Fetch all semesters then their courses, filter by this course_code
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

        // Calculate average marks
        const validMarks = results
          .map((r) => parseFloat(r.marks_obtained))
          .filter((m) => !isNaN(m));
        if (validMarks.length > 0) {
          const sum = validMarks.reduce((a, b) => a + b, 0);
          setAvgMarks((sum / validMarks.length).toFixed(1));
        }

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

  const handleCopyCode = (e) => {
    e.stopPropagation();
    if (course?.course_code) {
      navigator.clipboard.writeText(course.course_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const prerequisite =
    course?.prerequisite ||
    course?.prerequisites ||
    course?.prerequisite_course ||
    course?.prereq;

  const hasPrerequisite =
    prerequisite != null &&
    (typeof prerequisite === "string"
      ? prerequisite.trim() !== "" &&
        !["none", "null", "n/a", "nil", "—", "-", "no"].includes(
          prerequisite.trim().toLowerCase(),
        )
      : Boolean(prerequisite));

  const prerequisiteStr = hasPrerequisite ? String(prerequisite).trim() : "";

  const matchedCourse = allCoursesList.find(
    (c) =>
      c.course_code?.trim().toLowerCase() === prerequisiteStr.toLowerCase() ||
      c.course_name?.trim().toLowerCase() === prerequisiteStr.toLowerCase(),
  );

  const prerequisiteCourseName =
    matchedCourse?.course_name ||
    course?.prerequisite_name ||
    prerequisiteStr;

  const prerequisiteCourseCode =
    matchedCourse?.course_code ||
    prerequisiteStr;

  const courseDescription = parseJsonData(
    course?.description ||
      course?.course_description ||
      course?.syllabus ||
      course?.outline,
  );

  const textbooks = parseJsonData(
    course?.textbooks || course?.text_books || course?.textbook,
  );

  const referenceMaterials = parseJsonData(
    course?.reference_materials ||
      course?.reference_material ||
      course?.references ||
      course?.reference_books,
  );

  const hasTextbooks =
    textbooks != null &&
    (Array.isArray(textbooks)
      ? textbooks.length > 0
      : typeof textbooks === "string"
        ? textbooks.trim() !== ""
        : Boolean(textbooks));

  const hasReferenceMaterials =
    referenceMaterials != null &&
    (Array.isArray(referenceMaterials)
      ? referenceMaterials.length > 0
      : typeof referenceMaterials === "string"
        ? referenceMaterials.trim() !== ""
        : Boolean(referenceMaterials));

  const hasCourseDescription =
    courseDescription != null &&
    (Array.isArray(courseDescription)
      ? courseDescription.length > 0
      : typeof courseDescription === "string"
        ? courseDescription.trim() !== ""
        : Boolean(courseDescription));

  const [expandedSections, setExpandedSections] = useState({});

  // Filter topics based on search query
  const filteredOutline = useMemo(() => {
    if (!Array.isArray(courseDescription)) return courseDescription;
    if (!topicSearch.trim()) return courseDescription;
    const q = topicSearch.toLowerCase().trim();
    return courseDescription.filter((section) => {
      const headingMatch = (section.heading || section.title || "")
        .toLowerCase()
        .includes(q);
      const topics = Array.isArray(section.topics) ? section.topics : [];
      const topicMatch = topics.some((t) =>
        String(t).toLowerCase().includes(q),
      );
      return headingMatch || topicMatch;
    });
  }, [courseDescription, topicSearch]);

  const toggleSection = (idx) => {
    setExpandedSections((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const isAllExpanded =
    Array.isArray(courseDescription) &&
    courseDescription.length > 0 &&
    courseDescription.every((_, i) => expandedSections[i]);

  const toggleAllSections = () => {
    if (!Array.isArray(courseDescription)) return;
    if (isAllExpanded) {
      setExpandedSections({});
    } else {
      const allExp = {};
      courseDescription.forEach((_, i) => {
        allExp[i] = true;
      });
      setExpandedSections(allExp);
    }
  };

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
      value: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <code>{course.course_code}</code>
          <button
            type="button"
            onClick={handleCopyCode}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px",
              color: copiedCode ? "#059669" : "var(--text-muted)",
              display: "inline-flex",
              alignItems: "center",
            }}
            title="Copy course code"
          >
            {copiedCode ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </span>
      ),
    },
    {
      icon: <Clock size={16} />,
      label: "Credit Hours",
      value: `${course.credit_hours} Credit Hours`,
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
    ...(hasPrerequisite
      ? [
          {
            icon: <GitFork size={16} />,
            label: "Prerequisite",
            value: (
              <button
                type="button"
                className="btn-link"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontWeight: 600,
                  fontSize: "12px",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "#fef3c7",
                  border: "1px solid #fde68a",
                  color: "#92400e",
                  cursor: "pointer",
                  textAlign: "right",
                  maxWidth: "100%",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                }}
                onClick={() =>
                  navigate(
                    `/courses/${encodeURIComponent(prerequisiteCourseCode)}`,
                  )
                }
                title={`View course ${prerequisiteCourseName}`}
              >
                <span style={{ wordBreak: "break-word", textAlign: "right" }}>
                  {prerequisiteCourseName}
                </span>
                <ArrowRight size={12} style={{ flexShrink: 0 }} />
              </button>
            ),
          },
        ]
      : []),
  ];

  const renderBookCards = (books, accentColor = "#3b82f6", bgLight = "#eff6ff") => {
    if (!books) return null;
    if (typeof books === "string") {
      return (
        <p
          style={{
            margin: 0,
            color: "var(--text)",
            lineHeight: 1.6,
            whiteSpace: "pre-line",
            fontSize: "14px",
          }}
        >
          {books}
        </p>
      );
    }
    const bookList = Array.isArray(books) ? books : [books];
    if (bookList.length === 0) return null;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {bookList.map((book, idx) => {
          if (typeof book === "string") {
            return (
              <div
                key={idx}
                style={{
                  padding: "12px 14px",
                  background: "#f8fafc",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  fontSize: "13px",
                  color: "var(--text)",
                }}
              >
                {book}
              </div>
            );
          }
          return (
            <div
              key={idx}
              style={{
                padding: "14px 16px",
                background: "var(--card-bg, #ffffff)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: bgLight,
                    color: accentColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <BookOpen size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "14px",
                      color: "var(--text, #0f172a)",
                      lineHeight: 1.35,
                    }}
                  >
                    {book.title || "Untitled Book"}
                  </div>
                  {book.author && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-muted, #64748b)",
                        marginTop: "3px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <User size={12} />
                      <span>{book.author}</span>
                    </div>
                  )}
                </div>
              </div>

              {(book.edition || book.publisher || book.year) && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    paddingLeft: "48px",
                    marginTop: "2px",
                  }}
                >
                  {book.edition && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        background: "#f1f5f9",
                        color: "#475569",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      {book.edition}
                    </span>
                  )}
                  {book.publisher && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        background: "#eff6ff",
                        color: "#2563eb",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      {book.publisher}
                    </span>
                  )}
                  {book.year && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        background: "#fef3c7",
                        color: "#b45309",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      {book.year}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page">
      {/* Hero Header */}
      <div className="course-hero-card">
        <div
          style={{
            position: "absolute",
            top: "-30px",
            right: "-30px",
            width: "160px",
            height: "160px",
            background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0) 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "#ffffff",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            &larr; Back to Courses
          </button>
        </div>

        <div className="course-hero-content">
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 className="course-hero-title">
              {course.course_name}
            </h1>
          </div>

          {/* Quick Stats Grid */}
          <div
            className="course-hero-stats"
            style={{
              gridTemplateColumns: avgMarks != null ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
            }}
          >
            <div className="course-hero-stat-box">
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "var(--text)",
                  lineHeight: 1.1,
                }}
              >
                {offerings.length}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginTop: "3px",
                  whiteSpace: "nowrap",
                }}
              >
                Offerings
              </div>
            </div>

            <div className="course-hero-stat-box">
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "var(--text)",
                  lineHeight: 1.1,
                }}
              >
                {totalStudents}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginTop: "3px",
                  whiteSpace: "nowrap",
                }}
              >
                Students
              </div>
            </div>

            {avgMarks != null && (
              <div className="course-hero-stat-box">
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#059669",
                    lineHeight: 1.1,
                  }}
                >
                  {avgMarks}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginTop: "3px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Avg Score
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sp-grid">
        {/* Course Details Card */}
        <div className="sp-card">
          <div className="sp-card-header">
            <span className="sp-card-icon blue">
              <BookOpen size={20} />
            </span>
            <h3>Course Overview</h3>
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

        {/* Semester Offerings Card */}
        <div className="sp-card">
          <div className="sp-card-header">
            <span className="sp-card-icon green">
              <Calendar size={20} />
            </span>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flex: 1,
              }}
            >
              <h3 style={{ margin: 0 }}>Semester Offerings</h3>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#059669",
                  background: "#d1fae5",
                  padding: "2px 8px",
                  borderRadius: "10px",
                }}
              >
                {offerings.length} Total
              </span>
            </div>
          </div>
          {offerings.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <Calendar
                size={32}
                style={{ opacity: 0.3, marginBottom: "8px", margin: "0 auto" }}
              />
              <p style={{ margin: 0, fontSize: "14px" }}>
                No semester offerings recorded yet.
              </p>
            </div>
          ) : (
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
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    transition: "background 0.15s ease, transform 0.15s ease",
                  }}
                >
                  <div>
                    <span className="sp-semester-name" style={{ fontWeight: 600 }}>
                      {c.semester} — {c.session}
                    </span>
                    {c.teacher_name && (
                      <div
                        className="text-muted"
                        style={{
                          fontSize: "12px",
                          marginTop: "3px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <User size={12} />
                        <span>{c.teacher_name}</span>
                      </div>
                    )}
                  </div>
                  <span
                    className="grade-badge"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    View Results <ArrowRight size={12} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grade Distribution */}
        {gradeData.length > 0 && (
          <div className="sp-card sp-card-full">
            <div className="sp-card-header">
              <span className="sp-card-icon blue">
                <Award size={20} />
              </span>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flex: 1,
                }}
              >
                <h3 style={{ margin: 0 }}>Grade Distribution</h3>
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  {totalStudents} Graded Submissions
                </span>
              </div>
            </div>
            <div className="grade-dist-layout" style={{ alignItems: "center" }}>
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
                      tick={{ fontSize: 13, fontWeight: 700 }}
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
                      formatter={(val) => [
                        `${val} students (${((val / (totalStudents || 1)) * 100).toFixed(1)}%)`,
                        "Count",
                      ]}
                      contentStyle={{
                        borderRadius: "10px",
                        boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
                        border: "1px solid #e2e8f0",
                        fontSize: "13px",
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
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
              <div
                className="grade-dist-legend"
                style={{ alignSelf: "center" }}
              >
                {gradeData.map((entry) => (
                  <div key={entry.name} className="grade-dist-legend-item">
                    <span
                      className="grade-dist-dot"
                      style={{
                        background: GRADE_COLORS[entry.name] || "#94a3b8",
                      }}
                    />
                    <span className="grade-dist-name" style={{ fontWeight: 700 }}>
                      {entry.name}
                    </span>
                    <span className="grade-dist-range">
                      {gradeRanges[entry.name]
                        ? `${gradeRanges[entry.name]} marks`
                        : ""}
                    </span>
                    <span className="grade-dist-count">
                      {entry.value}{" "}
                      <span className="grade-dist-count-label">
                        ({((entry.value / (totalStudents || 1)) * 100).toFixed(0)}%)
                      </span>
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flex: 1,
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <h3 style={{ margin: 0 }}>Top Performers</h3>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#d97706",
                  }}
                >
                  Highest Academic Scores
                </span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
                    key={`${student.roll_no}-${student.semester_course_id || idx}`}
                    onClick={() => navigate(`/students/${student.roll_no}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "12px 16px",
                      background: "#f8fafc",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      cursor: "pointer",
                      flexWrap: "nowrap",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--primary)";
                      e.currentTarget.style.background = "#ffffff";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background = "#f8fafc";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Left: Rank Badge & Student Details */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        minWidth: 0,
                        flex: "1 1 auto",
                      }}
                    >
                      <span
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "12px",
                          flexShrink: 0,
                        }}
                      >
                        {badge.label}
                      </span>
                      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "14px",
                            color: "var(--text)",
                            lineHeight: 1.25,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {student.student_name ||
                            student.name ||
                            student.roll_no}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                            lineHeight: 1.25,
                          }}
                        >
                          <code>{student.roll_no}</code>
                        </div>
                      </div>
                    </div>

                    {/* Right: Marks & Grade Badge */}
                    <div className="top-scorer-score">
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: "15px",
                          color: "var(--text)",
                          lineHeight: 1.1,
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
                          style={{
                            fontWeight: 700,
                            fontSize: "12px",
                            padding: "2px 8px",
                            borderRadius: "6px",
                          }}
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

        {/* Textbooks */}
        {hasTextbooks && (
          <div className={`sp-card ${!hasReferenceMaterials ? "sp-card-full" : ""}`}>
            <div className="sp-card-header">
              <span className="sp-card-icon blue">
                <BookMarked size={20} />
              </span>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flex: 1,
                }}
              >
                <h3 style={{ margin: 0 }}>Required Textbooks</h3>
                {Array.isArray(textbooks) && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#2563eb",
                      background: "#eff6ff",
                      padding: "2px 8px",
                      borderRadius: "10px",
                    }}
                  >
                    {textbooks.length} {textbooks.length === 1 ? "Book" : "Books"}
                  </span>
                )}
              </div>
            </div>
            {renderBookCards(textbooks, "#2563eb", "#eff6ff")}
          </div>
        )}

        {/* Reference Materials */}
        {hasReferenceMaterials && (
          <div className={`sp-card ${!hasTextbooks ? "sp-card-full" : ""}`}>
            <div className="sp-card-header">
              <span className="sp-card-icon green">
                <Library size={20} />
              </span>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flex: 1,
                }}
              >
                <h3 style={{ margin: 0 }}>Reference Materials</h3>
                {Array.isArray(referenceMaterials) && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#059669",
                      background: "#d1fae5",
                      padding: "2px 8px",
                      borderRadius: "10px",
                    }}
                  >
                    {referenceMaterials.length}{" "}
                    {referenceMaterials.length === 1 ? "Book" : "Books"}
                  </span>
                )}
              </div>
            </div>
            {renderBookCards(referenceMaterials, "#059669", "#ecfdf5")}
          </div>
        )}

        {/* Course Outline / Syllabus / Description */}
        {hasCourseDescription && (
          <div className="sp-card sp-card-full">
            <div className="sp-card-header">
              <span
                className="sp-card-icon"
                style={{
                  background: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
                  color: "#6d28d9",
                }}
              >
                <Layers size={20} />
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flex: 1,
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <h3 style={{ margin: 0 }}>Course Outline & Syllabus</h3>
                  <p
                    style={{
                      margin: "2px 0 0 0",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                    }}
                  >
                    Detailed topic breakdown and module units
                  </p>
                </div>

                {Array.isArray(courseDescription) && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        background: "#ede9fe",
                        color: "#6d28d9",
                        fontSize: "12px",
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: "12px",
                      }}
                    >
                      {courseDescription.length} Sections
                    </span>
                    <button
                      type="button"
                      onClick={toggleAllSections}
                      style={{
                        background: "none",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        padding: "3px 8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      {isAllExpanded ? "Collapse All" : "Expand All"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Search Filter for Outline */}
            {Array.isArray(courseDescription) && courseDescription.length > 3 && (
              <div
                style={{
                  position: "relative",
                  marginBottom: "16px",
                }}
              >
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search topics or modules (e.g. pointers, functions, arrays)..."
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  style={{
                    paddingLeft: "36px",
                    paddingRight: "30px",
                    fontSize: "13px",
                    background: "#f8fafc",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    width: "100%",
                  }}
                />
                {topicSearch && (
                  <button
                    type="button"
                    onClick={() => setTopicSearch("")}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      fontSize: "14px",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: "2px",
                    }}
                  >
                    &times;
                  </button>
                )}
              </div>
            )}

            {Array.isArray(filteredOutline) ? (
              filteredOutline.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "1rem" }}>
                  No modules or topics matching "{topicSearch}".
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {filteredOutline.map((section, sIdx) => {
                    const heading =
                      section.heading ||
                      section.title ||
                      section.name ||
                      `Section ${sIdx + 1}`;
                    const topics = Array.isArray(section.topics)
                      ? section.topics
                      : section.topics
                        ? [section.topics]
                        : [];
                    const isExpanded =
                      topicSearch.trim() !== "" || Boolean(expandedSections[sIdx]);

                    return (
                      <div
                        key={sIdx}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                          overflow: "hidden",
                          transition: "border-color 0.15s ease",
                        }}
                      >
                        <div
                          onClick={() => toggleSection(sIdx)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "14px 18px",
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              flex: 1,
                            }}
                          >
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 800,
                                color: "#4338ca",
                                background: "#e0e7ff",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                flexShrink: 0,
                              }}
                            >
                              #{sIdx + 1}
                            </span>
                            <h4
                              style={{
                                margin: 0,
                                fontSize: "14px",
                                fontWeight: 700,
                                color: "var(--text, #1e293b)",
                                lineHeight: 1.4,
                              }}
                            >
                              {heading}
                            </h4>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {topics.length > 0 && (
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "var(--text-muted)",
                                  fontWeight: 600,
                                }}
                              >
                                {topics.length} {topics.length === 1 ? "topic" : "topics"}
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronUp size={16} style={{ color: "var(--text-muted)" }} />
                            ) : (
                              <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />
                            )}
                          </div>
                        </div>

                        {isExpanded && topics.length > 0 && (
                          <div
                            style={{
                              padding: "0 18px 16px 18px",
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "6px",
                            }}
                          >
                            {topics.map((topic, tIdx) => (
                              <span
                                key={tIdx}
                                style={{
                                  fontSize: "12px",
                                  background: "#ffffff",
                                  border: "1px solid #e2e8f0",
                                  color: "var(--text, #334155)",
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  lineHeight: 1.35,
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                                }}
                              >
                                <span
                                  style={{
                                    width: "5px",
                                    height: "5px",
                                    borderRadius: "50%",
                                    background: "#6366f1",
                                    flexShrink: 0,
                                  }}
                                />
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div
                style={{
                  color: "var(--text)",
                  lineHeight: 1.7,
                  whiteSpace: "pre-line",
                  fontSize: "14px",
                }}
              >
                {typeof courseDescription === "string"
                  ? courseDescription
                  : JSON.stringify(courseDescription, null, 2)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
