import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllCgpa } from "../api/results";
import { getSemesters } from "../api/semesters";
import DataTable from "../components/common/DataTable";
import { useStudentLookup } from "../context/StudentContext";

export default function Results() {
  const [cgpaData, setCgpaData] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { trackedRollNos } = useStudentLookup();

  useEffect(() => {
    Promise.all([getAllCgpa(), getSemesters()])
      .then(([cgpaRes, semRes]) => {
        setCgpaData(cgpaRes.data);
        setSemesters(semRes.data);
      })
      .catch(() => setError("Failed to load results"))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: "roll_no", label: "Roll No" },
    { key: "name", label: "Name" },
    {
      key: "cgpa",
      label: "CGPA",
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
          onClick={() => navigate(`/results/${row.roll_no}`)}
        >
          Transcript
        </button>
      ),
    },
  ];

  return (
    <div className="page">
      <h1>Results Overview</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="section">
        <h2>All Students CGPA</h2>
        <DataTable
          columns={columns}
          data={cgpaData}
          loading={loading}
          emptyMessage="No results available."
          defaultSortKey="roll_no"
          defaultSortDir="asc"
          highlightKey="roll_no"
          highlightValue={trackedRollNos}
          tableId="results"
          cardAccent="#059669"
        />
      </div>

      <div className="section">
        <h2>Semester Results</h2>
        {semesters.length === 0 ? (
          <p className="text-muted">No semesters found.</p>
        ) : (
          <div className="semester-grid">
            {semesters.map((sem) => (
              <div
                key={sem.id}
                className="semester-card"
                onClick={() => navigate(`/results/semester/${sem.id}`)}
              >
                <div className="semester-card-title">{sem.semester}</div>
                <div className="semester-card-sub">{sem.session}</div>
                <div className="semester-card-prog">{sem.program}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
