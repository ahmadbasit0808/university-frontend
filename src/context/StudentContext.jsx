import { createContext, useContext, useEffect, useState } from "react";

const StudentContext = createContext(null);

export function StudentProvider({ children }) {
  const [trackedRollNos, setTrackedRollNos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("trackedRollNos")) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (trackedRollNos.length > 0) {
      localStorage.setItem("trackedRollNos", JSON.stringify(trackedRollNos));
    } else {
      localStorage.removeItem("trackedRollNos");
    }
  }, [trackedRollNos]);

  const addTracked = (rollNo) => {
    if (!trackedRollNos.includes(rollNo))
      setTrackedRollNos((prev) => [...prev, rollNo]);
  };

  const removeTracked = (rollNo) =>
    setTrackedRollNos((prev) => prev.filter((r) => r !== rollNo));

  const clearTracked = () => setTrackedRollNos([]);

  return (
    <StudentContext.Provider
      value={{ trackedRollNos, addTracked, removeTracked, clearTracked }}
    >
      {children}
    </StudentContext.Provider>
  );
}

export function useStudentLookup() {
  const ctx = useContext(StudentContext);
  if (!ctx)
    throw new Error("useStudentLookup must be used within a StudentProvider");
  return ctx;
}
