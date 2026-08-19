import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSemesterResults, publishSemesterResults } from "../api/results";
import { getSemester } from "../api/semesters";
import DataTable from "../components/common/DataTable";
import { useStudentLookup } from "../context/StudentContext";
import { useAuth } from "../context/AuthContext";
import RankBadge, { computeRankMap } from "../components/common/RankBadge";

export default function SemesterResults() {
  const { isAuthenticated } = useAuth();
  const { semesterId } = useParams();
  const [results, setResults] = useState([]);
  const [semester, setSemester] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { trackedRollNos } = useStudentLookup();

  const fetch = async () => {
    try {
      setLoading(true);
      const [res, semRes] = await Promise.all([
        getSemesterResults(semesterId),
        getSemester(semesterId),
      ]);
      setResults(res.data);
      setSemester(semRes.data);
    } catch {
      setError("Failed to load semester results");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, [semesterId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePublish = async () => {
    if (
      !window.confirm(
        "Publish results for all students in this semester? This may override existing results.",
      )
    )
      return;
    setPublishing(true);
    setError("");
    setSuccess("");
    try {
      const res = await publishSemesterResults(semesterId);
      setSuccess(
        res.data.message ||
          `Published for ${res.data.students_processed} students`,
      );
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to publish results");
    } finally {
      setPublishing(false);
    }
  };

  const rankMap = useMemo(() => computeRankMap(results, "gpa"), [results]);

  const columns = [
    { key: "roll_no", label: "Roll No" },
    {
      key: "name",
      label: "Name",
      render: (val, row) => {
        const isTracked = trackedRollNos.includes(String(row.roll_no));
        const rank = isTracked ? rankMap.get(String(row.roll_no)) : null;
        return (
          <span className="student-rank-cell">
            <span className="student-name-text">{val || "—"}</span>
            <RankBadge rank={rank} titlePrefix="Semester Position" />
          </span>
        );
      },
    },
    {
      key: "gpa",
      label: "GPA",
      render: (val) => (
        <span
          style={{
            fontWeight: 600,
            color: val >= 3.0 ? "#059669" : val >= 2.0 ? "#d97706" : "#dc2626",
          }}
        >
          {val !== null && val !== undefined ? parseFloat(val).toFixed(2) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (_, row) => (
        <button
          className="btn btn-sm btn-secondary"
          onClick={() =>
            navigate(`/results/semester/${semesterId}/${row.roll_no}`)
          }
        >
          Detail
        </button>
      ),
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
          <h1>
            {semester
              ? `${semester.semester} (${semester.session})`
              : "Semester Results"}
          </h1>
        </div>
        {isAuthenticated && (
          <button
            className="btn btn-primary"
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing ? "Publishing..." : "Publish Results"}
          </button>
        )}
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <DataTable
        columns={columns}
        data={results}
        loading={loading}
        emptyMessage="No results for this semester."
        highlightKey="roll_no"
        highlightValue={trackedRollNos}
        tableId="semester-results"
        cardAccent="#edb130"
      />
    </div>
  );
}
