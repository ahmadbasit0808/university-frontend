import { useEffect, useState, useRef } from "react";
import { useStudentLookup } from "../context/StudentContext";
import { getStudents } from "../api/students";

export default function Track() {
  const { trackedRollNos, addTracked, removeTracked, clearTracked } = useStudentLookup();
  const [inputValue, setInputValue] = useState("");
  const [students, setStudents] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);

  useEffect(() => {
    getStudents().then((res) => setStudents(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
    const q = inputValue.trim().toUpperCase();
    if (!q) { setSuggestions([]); return; }
    setSuggestions(
      students
        .filter(
          (s) =>
            !trackedRollNos.includes(s.roll_no) &&
            (s.roll_no.toUpperCase().includes(q) || s.name.toUpperCase().includes(q))
        )
        .slice(0, 8)
    );
  }, [inputValue, students, trackedRollNos]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (student) => {
    addTracked(student.roll_no);
    setInputValue("");
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  return (
    <div className="page">
      <h1>Track Students</h1>

      <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
        Add students to track — their rows will be highlighted and their class
        position/rank badge will be displayed next to their name across result pages.
      </p>

      <div className="track-page-card">
        <form onSubmit={(e) => e.preventDefault()} className="track-page-form">
          <div className="track-input-wrapper" ref={wrapperRef} style={{ position: "relative" }}>
            <span className="lookup-icon">🔍</span>

            <input
              type="text"
              autoFocus
              autoCapitalize="off"
              placeholder="Search by name or roll number"
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value.toUpperCase()); setShowSuggestions(true); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIndex((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter" && activeIndex >= 0) {
                  e.preventDefault();
                  handleSelect(suggestions[activeIndex]);
                } else if (e.key === "Escape") {
                  setInputValue("");
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => setShowSuggestions(true)}
              className="track-page-input"
            />

            {showSuggestions && suggestions.length > 0 && (
              <ul className="track-suggestions">
                {suggestions.map((s, i) => (
                  <li key={s.roll_no} onMouseDown={() => handleSelect(s)} className={i === activeIndex ? "active" : ""}>
                    <span className="suggestion-roll">{s.roll_no}</span>
                    <span className="suggestion-name">{s.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {trackedRollNos.length > 0 && (
            <button type="button" className="btn btn-secondary" onClick={clearTracked}>
              ✕ Clear All
            </button>
          )}
        </form>

        {trackedRollNos.length > 0 ? (
          <div style={{ marginTop: "1.5rem" }}>
            <strong style={{ fontSize: "14px", color: "var(--text-muted)" }}>
              Tracking {trackedRollNos.length} student{trackedRollNos.length > 1 ? "s" : ""}
            </strong>
            <ul className="tracked-list">
              {trackedRollNos.map((rollNo) => {
                const student = students.find((s) => s.roll_no === rollNo);
                return (
                  <li key={rollNo} className="tracked-list-item">
                    <div>
                      <span className="suggestion-roll">{rollNo}</span>
                      {student && <span className="suggestion-name">{student.name}</span>}
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => removeTracked(rollNo)}
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="track-page-status inactive" style={{ marginTop: "1.5rem" }}>
            <span className="track-status-icon">ℹ</span>
            <div>
              <strong>No students being tracked.</strong>
              <br />
              <span className="text-muted">Search and add students above to begin.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
