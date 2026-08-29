import { getStudents } from "../api/students";
import { getSemesterResults, getAllCgpa } from "../api/results";

export const extractArray = (res) => {
  if (!res) return [];
  const val = res.status === "fulfilled" ? res.value : res;
  const data = val?.data !== undefined ? val.data : val;
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.students)) return data.students;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.results)) return data.results;
  if (typeof data === "object") {
    for (const k of Object.keys(data)) {
      if (Array.isArray(data[k])) return data[k];
    }
  }
  return [];
};

export const isMale = (g) => {
  if (!g) return true;
  const s = String(g).trim().toLowerCase();
  return s.startsWith("m") || s === "male";
};

export const isFemale = (g) => {
  if (!g) return true;
  const s = String(g).trim().toLowerCase();
  return s.startsWith("f") || s === "female";
};

/**
 * Computes the top male (CR) or top female (GR) candidate for a semester
 * based on previous semester GPA (or CGPA for 1st semester).
 */
export async function computeAutoRepresentative(semester, allSemesters, role) {
  const semNum =
    parseInt(semester?.semester, 10) ||
    parseInt(String(semester?.semester || "").match(/\d+/)?.[0], 10) ||
    1;
  const isCr = role === "cr";
  const filterFn = isCr ? isMale : isFemale;

  // 1. If semester > 1, search for the preceding semester
  if (semNum > 1 && Array.isArray(allSemesters) && allSemesters.length > 0) {
    const prevSem = allSemesters.find((s) => {
      const n =
        parseInt(s.semester, 10) ||
        parseInt(String(s.semester || "").match(/\d+/)?.[0], 10) ||
        0;
      return n === semNum - 1;
    });

    if (prevSem && prevSem.id) {
      try {
        const [studentsRes, resultsRes] = await Promise.allSettled([
          getStudents(),
          getSemesterResults(prevSem.id),
        ]);
        const studentsList = extractArray(studentsRes);
        const resultsList = extractArray(resultsRes);

        const studentGenderMap = new Map();
        const studentNameMap = new Map();
        studentsList.forEach((s) => {
          const roll = String(s.roll_no || s.id || "").trim();
          if (roll) {
            studentGenderMap.set(roll, s.gender || s.sex || null);
            studentNameMap.set(
              roll,
              s.name || s.student_name || `Student ${roll}`,
            );
          }
        });

        // Filter and sort candidates by GPA descending
        const candidates = resultsList
          .map((r) => {
            const roll = String(
              r.roll_no || r.student_id || r.id || "",
            ).trim();
            const gender =
              r.gender || r.sex || studentGenderMap.get(roll) || null;
            const name =
              r.name ||
              r.student_name ||
              studentNameMap.get(roll) ||
              `Student ${roll}`;
            const gpa = parseFloat(r.gpa ?? r.obtained_gpa ?? -1);
            return {
              roll_no: roll,
              name,
              gender,
              gpa: gpa >= 0 ? gpa : null,
              cgpa: r.cgpa ? parseFloat(r.cgpa) : null,
            };
          })
          .filter((c) => filterFn(c.gender) && c.gpa !== null && c.gpa > 0)
          .sort((a, b) => (b.gpa || 0) - (a.gpa || 0));

        if (candidates.length > 0) {
          return candidates[0];
        }
      } catch (err) {
        console.warn("Failed to compute auto representative from prev semester:", err);
      }
    }
  }

  // 2. Fallback using overall CGPA / Aggregate
  try {
    const [studentsRes, cgpaRes] = await Promise.allSettled([
      getStudents(),
      getAllCgpa(),
    ]);
    const studentsList = extractArray(studentsRes);
    const cgpaList = extractArray(cgpaRes);

    const cgpaMap = new Map();
    cgpaList.forEach((c) => {
      const roll = String(c.roll_no || c.id || "").trim();
      if (roll) {
        const score = parseFloat(c.cgpa ?? c.gpa ?? -1);
        if (score >= 0) cgpaMap.set(roll, score);
      }
    });

    const candidates = studentsList
      .map((s) => {
        const roll = String(s.roll_no || s.id || "").trim();
        const gender = s.gender || s.sex || null;
        const name = s.name || s.student_name || `Student ${roll}`;
        const score = cgpaMap.get(roll) ?? null;
        return {
          roll_no: roll,
          name,
          gender,
          gpa: score,
          cgpa: score,
        };
      })
      .filter((c) => filterFn(c.gender) && c.cgpa !== null && c.cgpa > 0)
      .sort((a, b) => (b.cgpa || 0) - (a.cgpa || 0));

    if (candidates.length > 0) {
      return candidates[0];
    }
  } catch (err) {
    console.warn("Failed to compute fallback representative:", err);
  }

  return null;
}
