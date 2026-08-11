import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getStudent } from "../api/students";
import { getTranscript } from "../api/results";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import {
  GraduationCap,
  Mail,
  Phone,
  User,
  Calendar,
  LibraryBig,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export default function StudentProfile() {
  const { rollNo } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [stuRes, transRes] = await Promise.allSettled([
          getStudent(rollNo),
          getTranscript(rollNo),
        ]);
        if (stuRes.status === "fulfilled") setStudent(stuRes.value.data);
        else setError("Student not found.");
        if (transRes.status === "fulfilled") setTranscript(transRes.value.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [rollNo]);

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
  if (!student) return null;

  const semesters = transcript?.semesters || [];
  const totalCredits = semesters.reduce(
    (s, sem) =>
      s +
      (sem.subjects?.reduce((a, sub) => a + (sub.credit_hours || 0), 0) || 0),
    0,
  );
  const totalObtainedGpts = semesters.reduce(
    (s, sem) => s + parseFloat(sem.obtained_gpts || 0),
    0,
  );
  const totalGpts = semesters.reduce(
    (s, sem) => s + parseFloat(sem.total_gpts || 0),
    0,
  );
  const cgpa =
    transcript?.cgpa != null
      ? parseFloat(transcript.cgpa)
      : totalGpts > 0
        ? (totalObtainedGpts / totalGpts) * 4.0
        : null;

  const infoItems = [
    { icon: <User size={16} />, label: "Gender", value: student.gender || "—" },
    // {
    //   icon: <Calendar size={16} />,
    //   label: "Session",
    //   value: semesters[0].session || "—",
    // },
    { icon: <Mail size={16} />, label: "Email", value: student.email || "—" },
    { icon: <Phone size={16} />, label: "Phone", value: student.phone || "—" },
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
          <h1>{student.name}</h1>
          <p className="text-muted">Roll No: {student.roll_no}</p>
        </div>
        <Link to={`/results/${rollNo}`} className="btn btn-primary">
          View Full Transcript
        </Link>
      </div>

      <div className="sp-grid">
        {/* Personal Info */}
        <div className="sp-card">
          <div className="sp-card-header">
            <span className="sp-card-icon blue">
              <GraduationCap size={20} />
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

        {/* Academic Summary */}
        <div className="sp-card">
          <div className="sp-card-header">
            <span className="sp-card-icon green">
              <GraduationCap size={20} />
            </span>
            <h3>Academic Summary</h3>
          </div>
          {semesters.length === 0 ? (
            <p className="text-muted" style={{ padding: "1rem" }}>
              No academic records yet.
            </p>
          ) : (
            <>
              <div className="sp-stats-row">
                <div className="sp-stat">
                  <span className="sp-stat-value">
                    {cgpa != null ? cgpa.toFixed(2) : "—"}
                  </span>
                  <span className="sp-stat-label">CGPA</span>
                </div>
                <div className="sp-stat">
                  <span className="sp-stat-value">{semesters.length}</span>
                  <span className="sp-stat-label">Semesters</span>
                </div>
                <div className="sp-stat">
                  <span className="sp-stat-value">{totalCredits}</span>
                  <span className="sp-stat-label">Credits</span>
                </div>
              </div>
              <div className="sp-semester-list">
                {semesters.map((sem) => {
                  const gpa = parseFloat(sem.gpa);
                  const gpaClass =
                    gpa >= 3.5
                      ? "gpa-excellent"
                      : gpa >= 3.0
                        ? "gpa-good"
                        : gpa >= 2.5
                          ? "gpa-average"
                          : gpa >= 2.0
                            ? "gpa-below"
                            : "gpa-poor";
                  return (
                    <div
                      className="sp-semester-row"
                      key={sem.id}
                      onClick={() =>
                        navigate(
                          `/results/semester/${sem.metadata_id}/${rollNo}`,
                        )
                      }
                    >
                      <span className="sp-semester-name">{sem.semester}</span>
                      <span className={`grade-badge ${gpaClass}`}>
                        GPA {gpa.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* GPA Chart */}
        {semesters.length > 1 && (
          <div className="sp-card sp-card-full sp-chart-card">
            <div className="sp-card-header">
              <span className="sp-card-icon blue">
                <GraduationCap size={20} />
              </span>
              <h3>GPA Trend</h3>
            </div>
            <div className="sp-chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={semesters.map((s) => ({
                    name: s.semester,
                    gpa: parseFloat(parseFloat(s.gpa).toFixed(2)),
                  }))}
                  margin={{ top: 8, right: 16, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis
                    domain={[2, 4]}
                    ticks={[
                      2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3, 3.1,
                      3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4,
                    ]}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip formatter={(val) => [`${val}`, "GPA"]} />
                  <ReferenceLine y={2} stroke="#fca5a5" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="gpa"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: "#4f46e5" }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
