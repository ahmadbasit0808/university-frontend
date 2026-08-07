import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTeacher } from "../api/teachers";
import { getSemesters, getSemesterCourses } from "../api/semesters";
import { getCourseResults } from "../api/courseResults";
import { getGradingScales } from "../api/gradingScale";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { BookUser, Mail, Phone, User } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

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

export default function TeacherProfile() {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const chartHeight = window.innerWidth <= 768 ? 260 : 360;
  const [teacher, setTeacher] = useState(null);
  const [coursesTaught, setCoursesTaught] = useState([]);
  const [gradeData, setGradeData] = useState([]);
  const [gradeRanges, setGradeRanges] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const teacherRes = await getTeacher(teacherId);
        setTeacher(teacherRes.data);

        // Fetch all semesters then their courses, filter by this teacher
        const semRes = await getSemesters();
        const allCourses = (
          await Promise.all(
            semRes.data.map((s) =>
              getSemesterCourses(s.id).then((r) =>
                r.data.map((c) => ({
                  ...c,
                  semester: s.semester,
                  session: s.session,
                  metadata_id: s.id,
                })),
              ),
            ),
          )
        ).flat();

        const taught = allCourses.filter(
          (c) => c.teacher_id === parseInt(teacherId),
        );
        setCoursesTaught(taught);

        // Fetch all grade results for each course
        const results = (
          await Promise.all(
            taught.map((c) =>
              getCourseResults(c.semester_course_id)
                .then((r) => r.data)
                .catch(() => []),
            ),
          )
        ).flat();
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
        setError("Teacher not found.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [teacherId]);

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
  if (!teacher) return null;

  const infoItems = [
    { icon: <User size={16} />, label: "Gender", value: teacher.gender || "—" },
    { icon: <Mail size={16} />, label: "Email", value: teacher.email || "—" },
    { icon: <Phone size={16} />, label: "Phone", value: teacher.phone || "—" },
    {
      icon: <BookUser size={16} />,
      label: "Designation",
      value: teacher.designation || "—",
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
          <h1>{teacher.name}</h1>
          <p className="text-muted">{teacher.designation || "Teacher"}</p>
        </div>
      </div>

      <div className="sp-grid">
        {/* Personal Info */}
        <div className="sp-card">
          <div className="sp-card-header">
            <span className="sp-card-icon blue">
              <BookUser size={20} />
            </span>
            <h3>Personal Information</h3>
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

        {/* Courses Taught */}
        <div className="sp-card">
          <div className="sp-card-header">
            <span className="sp-card-icon green">
              <BookUser size={20} />
            </span>
            <h3>Courses Taught</h3>
          </div>
          {coursesTaught.length === 0 ? (
            <p className="text-muted" style={{ padding: "1rem" }}>
              No courses assigned.
            </p>
          ) : (
            <div className="sp-semester-list">
              {coursesTaught.map((c) => (
                <div
                  className="sp-semester-row"
                  key={c.semester_course_id}
                  onClick={() =>
                    navigate(
                      `/course-results?semester=${c.metadata_id}&course=${c.semester_course_id}`,
                    )
                  }
                >
                  <span className="sp-semester-name">
                    {c.course_name}
                    <span className="text-muted"> ({c.course_code})</span>
                  </span>
                  <span className="grade-badge">
                    {c.semester} — {c.session}
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
                <BookUser size={20} />
              </span>
              <h3>Grade Distribution</h3>
            </div>
            <div className="grade-dist-layout">
              <div className="grade-dist-chart">
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <PieChart>
                    <Pie
                      data={gradeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="50%"
                      outerRadius="75%"
                      paddingAngle={3}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {gradeData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={GRADE_COLORS[entry.name] || "#94a3b8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [`${val} students`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grade-dist-legend">
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
      </div>
    </div>
  );
}
