import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { getTranscript } from "../api/results";
import LoadingSpinner from "../components/common/LoadingSpinner";
import universityLogo from "../assets/logo.png";
import html2pdf from "html2pdf.js";
import {
  Download,
  GraduationCap,
  LibraryIcon,
  LibrarySquare,
  Scale,
  ShieldUser,
  User,
} from "lucide-react";

export default function Transcript() {
  const { rollNo } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const transcriptRef = useRef(null);

  useEffect(() => {
    getTranscript(rollNo)
      .then((res) => {
        setData(res.data);
      })
      .catch(() => setError("Failed to load transcript"))
      .finally(() => setLoading(false));
  }, [rollNo]);

  const downloadPDF = async () => {
    if (!transcriptRef.current) return;
    setPdfLoading(true);
    // Add pdf-print-mode class to force desktop layout for PDF capture
    const el = transcriptRef.current;
    el.classList.add("pdf-print-mode");
    try {
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Transcript_${data?.student?.roll_no || rollNo}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"],
        },
      };
      await html2pdf().set(opt).from(el).save();
    } catch (err) {
      console.error("PDF generation failed:", err);
      setError("Failed to generate PDF");
    } finally {
      el.classList.remove("pdf-print-mode");
      setPdfLoading(false);
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
  if (!data) return null;

  // Compute CGPA from semester data as fallback
  const totalObtainedGpts = data.semesters?.reduce(
    (s, sem) => s + parseFloat(sem.obtained_gpts || 0),
    0,
  );
  const totalGpts = data.semesters?.reduce(
    (s, sem) => s + parseFloat(sem.total_gpts || 0),
    0,
  );
  const computedCgpa =
    totalGpts > 0 ? (totalObtainedGpts / totalGpts) * 4.0 : 0;

  // Use API cgpa if available, otherwise use computed
  const cgpa =
    data.cgpa !== null && data.cgpa !== undefined
      ? parseFloat(data.cgpa)
      : data.student?.cgpa !== null && data.student?.cgpa !== undefined
        ? parseFloat(data.student.cgpa)
        : computedCgpa;

  const totalCredits = data.semesters?.reduce((s, sem) => {
    return (
      s +
      (sem.subjects?.reduce((acc, sub) => acc + (sub.credit_hours || 0), 0) ||
        0)
    );
  }, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/results" className="back-link">
            &larr; Back to Results
          </Link>
          <h1>Transcript — {data.student?.name}</h1>
          <p className="text-muted">Roll No: {data.student?.roll_no}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={downloadPDF}
          disabled={pdfLoading}
        >
          {pdfLoading ? (
            "Generating PDF..."
          ) : (
            <>
              <Download height={18} width={18} />
              <span>Download Pdf</span>
            </>
          )}
        </button>
      </div>

      <div ref={transcriptRef}>
        <div className="transcript-student-info section">
          <div className="transcript-header-decor">
            <div className="transcript-seal">
              <img
                src={universityLogo}
                style={{ objectFit: "contain" }}
                alt="PUGC Logo"
                width="48"
                height="48"
              />
            </div>
            <div className="transcript-seal-text">
              <h2>Academic Transcript</h2>
              <p>University of the Punjab, Gujranwala Campus</p>
            </div>
          </div>
          <div className="student-details-grid">
            <div className="student-detail-item">
              <span className="detail-label">
                <ShieldUser height={16} width={16} />
                Student Name
              </span>
              <span className="detail-value">{data.student?.name}</span>
            </div>
            <div className="student-detail-item">
              <span className="detail-label">
                <Scale height={16} width={16} />
                Roll No
              </span>
              <span className="detail-value">{data.student?.roll_no}</span>
            </div>
            <div className="student-detail-item">
              <span className="detail-label">
                <GraduationCap height={16} width={16} />
                Department
              </span>
              <span className="detail-value">
                {data.student?.department || "Information Technology"}
              </span>
            </div>
            <div className="student-detail-item">
              <span className="detail-label">
                <LibrarySquare height={16} width={16} />
                Program
              </span>
              <span className="detail-value">
                {data.student?.program || "Computer Science"}
              </span>
            </div>
          </div>
        </div>
        {/* CGPA Summary Section */}
        {data.semesters?.length > 0 && (
          <div className="cgpa-summary section">
            <div className="cgpa-card">
              <div className="cgpa-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  width="32"
                  height="32"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div className="cgpa-label">Cumulative GPA (CGPA)</div>
              <div className="cgpa-value">{cgpa.toFixed(2)}</div>
              <div className="cgpa-details">
                <span>
                  Total GPTs: <strong>{totalObtainedGpts.toFixed(1)}</strong> /{" "}
                  <strong>{totalGpts.toFixed(1)}</strong>
                </span>
                <span className="cgpa-divider">|</span>
                <span>
                  Total Credits: <strong>{totalCredits}</strong>
                </span>
                <span className="cgpa-divider">|</span>
                <span>
                  Semesters: <strong>{data.semesters?.length || 0}</strong>
                </span>
              </div>
            </div>
          </div>
        )}
        {data.semesters?.map((sem, semIdx) => {
          const semGpa = parseFloat(sem.gpa);
          const gpaColorClass =
            semGpa >= 3.5
              ? "gpa-excellent"
              : semGpa >= 3.0
                ? "gpa-good"
                : semGpa >= 2.5
                  ? "gpa-average"
                  : semGpa >= 2.0
                    ? "gpa-below"
                    : "gpa-poor";
          return (
            <div key={sem.id} className="semester-card-wrapper section">
              <div className={`semester-card-header ${gpaColorClass}`}>
                <div className="semester-card-header-left">
                  <div className="semester-card-icon">
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      width="18"
                      height="18"
                    >
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                    </svg>
                  </div>
                  <div className="semester-card-header-text">
                    <h3>
                      {sem.semester}{" "}
                      <span className="semester-session">({sem.session})</span>
                    </h3>
                    <span className="semester-subtitle">
                      Semester {semIdx + 1} of{" "}
                      {data.semesters?.length || semIdx + 1}
                    </span>
                  </div>
                </div>
                <div className={`semester-gpa-badge ${gpaColorClass}`}>
                  <span className="sgpa-label">GPA</span>
                  <span className="sgpa-value">{semGpa.toFixed(2)}</span>
                  <span className="sgpa-detail">
                    {parseFloat(sem.obtained_gpts).toFixed(1)} /{" "}
                    {parseFloat(sem.total_gpts).toFixed(1)} GPTs
                  </span>
                </div>
              </div>
              <div className="semester-card-body">
                <div className="table-wrapper semester-table">
                  <table className="data-table compact-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Course</th>
                        <th>Credit Hrs</th>
                        <th>Marks</th>
                        <th>Grade</th>
                        <th>GP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sem.subjects?.map((sub, i) => {
                        const grade = sub.letter_grade || "";
                        const gradeVal = grade.replace("+", "-plus");
                        return (
                          <tr key={i}>
                            <td className="cell-code">{sub.course_code}</td>
                            <td className="cell-course">{sub.course_name}</td>
                            <td className="cell-credits">{sub.credit_hours}</td>
                            <td className="cell-marks">{sub.marks_obtained}</td>
                            <td>
                              <span
                                className={`grade-badge grade-${gradeVal.toLowerCase()}`}
                              >
                                {grade}
                              </span>
                            </td>
                            <td className="cell-gp">{sub.grade_point}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
