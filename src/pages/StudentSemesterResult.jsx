import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStudentSemesterResult } from "../api/results";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function StudentSemesterResult() {
  const { semesterId, rollNo } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getStudentSemesterResult(semesterId, rollNo)
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load result"))
      .finally(() => setLoading(false));
  }, [semesterId, rollNo]);

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
          GPA: <strong>{parseFloat(student?.gpa).toFixed(2)}</strong>
          <span className="gpts-detail">
            ({parseFloat(student?.obtained_gpts).toFixed(1)} /{" "}
            {parseFloat(student?.total_gpts).toFixed(1)} GPTs)
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
                <td>{Number(sub.marks_obtained || 0).toFixed(0)}</td>
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
              {/* <td>
                {subjects?.reduce(
                  (s, sub) => s + (Number(sub.marks_obtained) || 0),
                  0,
                )}
                / {subjects?.length * 100}
              </td>
              <td>
                <span className="grade-badge">
                  {(
                    (subjects?.reduce(
                      (s, sub) => s + (Number(sub.marks_obtained) || 0),
                      0,
                    ) /
                      (subjects?.length * 100)) *
                    100
                  ).toFixed(2)}
                  %
                </span>
              </td> */}
              <td colSpan="3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
