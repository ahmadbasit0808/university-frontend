import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStudentSemesterResult, getTranscript } from "../api/results";
import { getSemester } from "../api/semesters";
import { getStudent } from "../api/students";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function StudentSemesterResult() {
  const { semesterId, rollNo } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        let validSemId = semesterId;

        // If semesterId in URL is undefined, try resolving from student's transcript
        if (!validSemId || validSemId === "undefined" || isNaN(Number(validSemId))) {
          try {
            const transRes = await getTranscript(rollNo);
            const sems = transRes.data?.semesters || [];
            if (sems.length > 0) {
              const latest = sems[sems.length - 1];
              validSemId = latest.id || latest.semester_id || latest.metadata_id;
              navigate(`/results/semester/${validSemId}/${rollNo}`, { replace: true });
            }
          } catch (e) {
            console.warn("Could not resolve transcript for fallback semesterId", e);
          }
        }

        if (!validSemId || validSemId === "undefined") {
          if (isMounted) {
            setError("Semester ID not specified.");
            setLoading(false);
          }
          return;
        }

        const [resultRes, studentRes, semesterRes] = await Promise.allSettled([
          getStudentSemesterResult(validSemId, rollNo),
          getStudent(rollNo),
          getSemester(validSemId),
        ]);

        if (!isMounted) return;

        let subjects = [];
        if (resultRes.status === "fulfilled" && resultRes.value?.data) {
          const resData = resultRes.value.data;
          subjects = Array.isArray(resData) ? resData : resData.subjects || [];
        }

        // Normalize subjects array keys for consistency
        const normalizedSubjects = subjects.map((sub) => ({
          ...sub,
          credit_hours: Number(sub.credit_hours) || 0,
          marks_obtained: sub.marks !== undefined && sub.marks !== null ? sub.marks : sub.marks_obtained,
          letter_grade: sub.grade || sub.letter_grade || "—",
          grade_point: Number(sub.grade_point) || 0,
        }));

        // Compute student stats for header
        let totalCredits = 0;
        let obtainedGpts = 0;
        let totalGpts = 0;

        normalizedSubjects.forEach((sub) => {
          const cr = sub.credit_hours;
          const gp = sub.grade_point;
          totalCredits += cr;
          obtainedGpts += gp * cr;
          totalGpts += 4.0 * cr;
        });

        const gpa = totalCredits > 0 ? (obtainedGpts / totalCredits).toFixed(2) : "0.00";

        const studentInfo = studentRes.status === "fulfilled" ? studentRes.value?.data : null;
        const semesterInfo = semesterRes.status === "fulfilled" ? semesterRes.value?.data : null;

        const studentObj = {
          roll_no: rollNo,
          name: studentInfo?.name || `Student ${rollNo}`,
          semester: semesterInfo?.semester || "Semester",
          session: semesterInfo?.session || "",
          gpa: gpa,
          obtained_gpts: obtainedGpts.toFixed(1),
          total_gpts: totalGpts.toFixed(1),
        };

        setData({
          student: studentObj,
          subjects: normalizedSubjects,
        });
      } catch (err) {
        console.error("Failed to load result:", err);
        if (isMounted) setError("Failed to load result");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [semesterId, rollNo, navigate]);

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

  const { student, subjects } = data;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="btn-link back-link">
            &larr; Back
          </button>
          <h1>Result — {student?.name}</h1>
          <p className="text-muted">
            Roll No: {student?.roll_no} | {student?.semester} Semester (
            {student?.session})
          </p>
        </div>
        <div className="gpa-badge-large">
          GPA: <strong>{parseFloat(student?.gpa || 0).toFixed(2)}</strong>
          <span className="gpts-detail">
            ({parseFloat(student?.obtained_gpts || 0).toFixed(1)} /{" "}
            {parseFloat(student?.total_gpts || 0).toFixed(1)} GPTs)
          </span>
        </div>
      </div>

      <div className="table-wrapper">
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
            {subjects?.map((sub, i) => (
              <tr key={i}>
                <td>{sub.course_code}</td>
                <td>{sub.course_name}</td>
                <td>{sub.credit_hours}</td>
                <td>{sub.marks_obtained !== undefined && sub.marks_obtained !== null ? Number(sub.marks_obtained).toFixed(0) : "—"}</td>
                <td>
                  <span className="grade-badge">{sub.letter_grade}</span>
                </td>
                <td>{sub.grade_point}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="2">
                <strong>Total</strong>
              </td>
              <td>
                <strong>
                  {subjects?.reduce((s, sub) => s + (sub.credit_hours || 0), 0)}
                </strong>
              </td>
              <td colSpan="3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
