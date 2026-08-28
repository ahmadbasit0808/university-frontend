import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { getStudents } from "../api/students";
import { getTranscript } from "../api/results";
import { getGradingScales } from "../api/gradingScale";
import { getSemesters, getSemesterCourses } from "../api/semesters";
import { getCourses } from "../api/courses";
import LoadingSpinner from "../components/common/LoadingSpinner";
import {
  Calculator,
  Search,
  RotateCcw,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Award,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Target,
  ArrowRight,
  RefreshCw,
  X,
  ChevronDown,
} from "lucide-react";

// Default fallback grading scale if API scale is empty or loading
const DEFAULT_GRADING_SCALE = [
  { min_marks: 85, max_marks: 100, grade_point: 4.0, letter_grade: "A" },
  { min_marks: 80, max_marks: 84.99, grade_point: 3.7, letter_grade: "A-" },
  { min_marks: 75, max_marks: 79.99, grade_point: 3.3, letter_grade: "B+" },
  { min_marks: 70, max_marks: 74.99, grade_point: 3.0, letter_grade: "B" },
  { min_marks: 65, max_marks: 69.99, grade_point: 2.7, letter_grade: "B-" },
  { min_marks: 61, max_marks: 64.99, grade_point: 2.3, letter_grade: "C+" },
  { min_marks: 58, max_marks: 60.99, grade_point: 2.0, letter_grade: "C" },
  { min_marks: 55, max_marks: 57.99, grade_point: 1.7, letter_grade: "C-" },
  { min_marks: 50, max_marks: 54.99, grade_point: 1.0, letter_grade: "D" },
  { min_marks: 0, max_marks: 49.99, grade_point: 0.0, letter_grade: "F" },
];

const SEMESTER_ORDER = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

function getSemesterRank(name) {
  if (!name) return 999;
  const lower = name.toLowerCase();
  for (let i = 0; i < SEMESTER_ORDER.length; i++) {
    if (lower.includes(SEMESTER_ORDER[i].toLowerCase()) || lower.startsWith(String(i + 1))) {
      return i + 1;
    }
  }
  const match = lower.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999;
}

export default function EstimateCGPA() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRollNo =
    searchParams.get("rollNo") ||
    localStorage.getItem("cgpa_estimator_last_roll") ||
    "";

  // System reference data
  const [students, setStudents] = useState([]);
  const [gradingScales, setGradingScales] = useState(DEFAULT_GRADING_SCALE);
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [allCourses, setAllCourses] = useState([]);

  // Student Selection
  const [selectedRollNo, setSelectedRollNo] = useState(initialRollNo);
  const [studentSearch, setStudentSearch] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [transcriptData, setTranscriptData] = useState(null);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState("");

  // Active Selected Semester for Estimation (e.g. 5th Semester)
  const [activeSemesterId, setActiveSemesterId] = useState("");
  const [activeSemesterMeta, setActiveSemesterMeta] = useState(null);

  // Active Semester Courses state
  const [latestSemesterCourses, setLatestSemesterCourses] = useState([]);

  // Repeat Courses state
  const [repeatSelectedCourses, setRepeatSelectedCourses] = useState([]);
  const [repeatSearchQuery, setRepeatSearchQuery] = useState("");
  const [showRepeatDropdown, setShowRepeatDropdown] = useState(false);

  // Target CGPA calculator
  const [targetCgpa, setTargetCgpa] = useState("");

  const searchWrapperRef = useRef(null);
  const repeatWrapperRef = useRef(null);

  // Fetch initial system data
  useEffect(() => {
    async function loadData() {
      try {
        const [stuRes, scalesRes, semRes, courseRes] = await Promise.allSettled([
          getStudents(),
          getGradingScales(),
          getSemesters(),
          getCourses(),
        ]);

        if (stuRes.status === "fulfilled" && Array.isArray(stuRes.value.data)) {
          setStudents(stuRes.value.data);
        }
        if (scalesRes.status === "fulfilled" && Array.isArray(scalesRes.value.data) && scalesRes.value.data.length > 0) {
          const parsed = scalesRes.value.data
            .map((s) => ({
              ...s,
              min_marks: parseFloat(s.min_marks),
              max_marks: parseFloat(s.max_marks),
              grade_point: parseFloat(s.grade_point),
              letter_grade: s.letter_grade?.trim() || "",
            }))
            .filter((s) => !isNaN(s.min_marks) && !isNaN(s.max_marks))
            .sort((a, b) => b.min_marks - a.min_marks);

          if (parsed.length > 0) {
            setGradingScales(parsed);
          }
        }
        if (semRes.status === "fulfilled" && Array.isArray(semRes.value.data)) {
          // Sort semesters in ascending order (1st, 2nd, 3rd, 4th, 5th...)
          const sortedSemesters = [...semRes.value.data].sort(
            (a, b) => getSemesterRank(a.semester) - getSemesterRank(b.semester)
          );
          setAvailableSemesters(sortedSemesters);
        }
        if (courseRes.status === "fulfilled" && Array.isArray(courseRes.value.data)) {
          setAllCourses(courseRes.value.data);
        }
      } catch (err) {
        console.error("Failed to load setup data:", err);
      }
    }
    loadData();
  }, []);

  const [lastSaved, setLastSaved] = useState(false);

  // Load courses for a selected semester
  const loadSemesterCoursesForEstimation = useCallback(
    async (semesterObj, studentTranscript, forceReset = false) => {
      if (!semesterObj) return;
      setLoadingCourses(true);
      try {
        setActiveSemesterMeta(semesterObj);
        setActiveSemesterId(semesterObj.id);

        const currentRoll =
          studentTranscript?.student?.roll_no ||
          studentTranscript?.roll_no ||
          selectedRollNo;
        const storageKey = currentRoll
          ? `cgpa_estimator_data_${currentRoll.toUpperCase().trim()}`
          : null;

        let savedState = null;
        if (!forceReset && storageKey) {
          try {
            const raw = localStorage.getItem(storageKey);
            if (raw) savedState = JSON.parse(raw);
          } catch (e) {
            console.error("Failed to read saved localStorage state:", e);
          }
        }

        // Fetch course catalog to ensure exact credit hours & full names
        let catalog = allCourses;
        if (!catalog || catalog.length === 0) {
          try {
            const cRes = await getCourses();
            if (Array.isArray(cRes.data)) {
              catalog = cRes.data;
              setAllCourses(cRes.data);
            }
          } catch (e) {
            console.error("Failed to load catalog:", e);
          }
        }

        // Check if this semester already exists in the student's completed transcript
        const existingInTranscript = studentTranscript?.semesters?.find(
          (s) =>
            s.id === semesterObj.id ||
            s.semester?.toLowerCase().trim() === semesterObj.semester?.toLowerCase().trim()
        );

        if (existingInTranscript && existingInTranscript.subjects?.length > 0) {
          // It's a semester that was already recorded in transcript
          const courses = existingInTranscript.subjects.map((sub, idx) => {
            const matchedCatalog = catalog?.find(
              (ac) =>
                ac.course_code?.trim().toUpperCase() === sub.course_code?.trim().toUpperCase()
            );
            const cr =
              sub.credit_hours !== null && sub.credit_hours !== undefined
                ? parseFloat(sub.credit_hours)
                : matchedCatalog?.credit_hours !== null && matchedCatalog?.credit_hours !== undefined
                ? parseFloat(matchedCatalog.credit_hours)
                : 3;

            const savedCourse = savedState?.latestSemesterCourses?.find(
              (sc) =>
                sc.course_code?.trim().toUpperCase() === sub.course_code?.trim().toUpperCase() ||
                sc.id === `course-${sub.course_code || idx}-${idx}`
            );

            const defaultMarks =
              sub.marks_obtained !== null && sub.marks_obtained !== undefined
                ? parseFloat(sub.marks_obtained)
                : 75;

            return {
              id: `course-${sub.course_code || idx}-${idx}`,
              course_code: sub.course_code || "",
              course_name: sub.course_name || matchedCatalog?.course_name || "Course",
              credit_hours: cr,
              estimatedMarks:
                savedCourse?.estimatedMarks !== undefined && savedCourse?.estimatedMarks !== null
                  ? parseFloat(savedCourse.estimatedMarks)
                  : defaultMarks,
              originalMarks:
                sub.marks_obtained !== null && sub.marks_obtained !== undefined
                  ? parseFloat(sub.marks_obtained)
                  : null,
            };
          });
          setLatestSemesterCourses(courses);
        } else {
          // It's an upcoming semester (e.g. 5th Semester) - fetch from API
          const res = await getSemesterCourses(semesterObj.id);
          const rawCourses = Array.isArray(res.data) ? res.data : [];

          if (rawCourses.length > 0) {
            const courses = rawCourses.map((c, idx) => {
              const matchedCatalog = catalog?.find(
                (ac) =>
                  ac.course_code?.trim().toUpperCase() === c.course_code?.trim().toUpperCase()
              );

              let actualCr = 3;
              if (c.credit_hours !== null && c.credit_hours !== undefined && !isNaN(c.credit_hours)) {
                actualCr = parseFloat(c.credit_hours);
              } else if (
                matchedCatalog &&
                matchedCatalog.credit_hours !== null &&
                matchedCatalog.credit_hours !== undefined
              ) {
                actualCr = parseFloat(matchedCatalog.credit_hours);
              }

              const courseName =
                c.course_name ||
                c.name ||
                matchedCatalog?.course_name ||
                matchedCatalog?.name ||
                "Course";

              const savedCourse = savedState?.latestSemesterCourses?.find(
                (sc) =>
                  sc.course_code?.trim().toUpperCase() === c.course_code?.trim().toUpperCase() ||
                  sc.id === `semcourse-${c.course_code || idx}-${idx}`
              );

              return {
                id: `semcourse-${c.course_code || idx}-${idx}`,
                course_code: c.course_code || "",
                course_name: courseName,
                credit_hours: actualCr,
                estimatedMarks:
                  savedCourse?.estimatedMarks !== undefined && savedCourse?.estimatedMarks !== null
                    ? parseFloat(savedCourse.estimatedMarks)
                    : 75,
                originalMarks: null,
              };
            });
            setLatestSemesterCourses(courses);
          } else {
            setLatestSemesterCourses([]);
          }
        }

        // Restore saved repeat courses and target CGPA if available
        if (!forceReset && savedState) {
          if (Array.isArray(savedState.repeatSelectedCourses)) {
            const validSavedRepeats = savedState.repeatSelectedCourses.filter(
              (r) => parseFloat(r.originalMarks || 0) < 85 && parseFloat(r.creditHours || 0) >= 1
            );
            setRepeatSelectedCourses(validSavedRepeats);
          }
          if (savedState.targetCgpa) {
            setTargetCgpa(savedState.targetCgpa);
          }
          setLastSaved(true);
        }
      } catch (err) {
        console.error("Failed to load semester courses:", err);
      } finally {
        setLoadingCourses(false);
      }
    },
    [allCourses, selectedRollNo]
  );

  // Fetch transcript when selectedRollNo changes
  useEffect(() => {
    if (!selectedRollNo) {
      setTranscriptData(null);
      setLatestSemesterCourses([]);
      setRepeatSelectedCourses([]);
      setActiveSemesterMeta(null);
      setActiveSemesterId("");
      return;
    }

    let isMounted = true;
    setLoadingStudent(true);
    setError("");

    async function fetchStudentAndSemester() {
      try {
        // Ensure semesters are loaded before determining target semester
        let sems = availableSemesters;
        if (!sems || sems.length === 0) {
          try {
            const semRes = await getSemesters();
            if (Array.isArray(semRes.data)) {
              sems = [...semRes.data].sort(
                (a, b) => getSemesterRank(a.semester) - getSemesterRank(b.semester)
              );
              setAvailableSemesters(sems);
            }
          } catch (e) {
            console.error("Failed to fetch semesters:", e);
          }
        }

        const res = await getTranscript(selectedRollNo);
        if (!isMounted) return;

        const data = res.data;
        setTranscriptData(data);
        setRepeatSelectedCourses([]);

        // Determine what is the latest / upcoming semester for this student:
        const completedSemesters = data.semesters || [];
        const completedCount = completedSemesters.length; // e.g. 4 completed semesters
        const targetSemesterRank = completedCount + 1; // e.g. 5 for 5th semester

        // Find matching semester in availableSemesters (e.g. 5th Semester)
        let targetSemester = sems?.find(
          (s) => getSemesterRank(s.semester) === targetSemesterRank
        );

        // Fallback: If not found by rank + 1, pick the highest semester in system
        if (!targetSemester && sems && sems.length > 0) {
          targetSemester = sems[sems.length - 1];
        }

        if (!targetSemester && completedSemesters.length > 0) {
          targetSemester = completedSemesters[completedSemesters.length - 1];
        }

        if (targetSemester) {
          await loadSemesterCoursesForEstimation(targetSemester, data);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to fetch student transcript:", err);
        setError("Could not find academic transcript for this student.");
        setTranscriptData(null);
        setLatestSemesterCourses([]);
        setRepeatSelectedCourses([]);
      } finally {
        if (isMounted) {
          setLoadingStudent(false);
        }
      }
    }

    fetchStudentAndSemester();

    return () => {
      isMounted = false;
    };
  }, [selectedRollNo, loadSemesterCoursesForEstimation]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
      if (repeatWrapperRef.current && !repeatWrapperRef.current.contains(e.target)) {
        setShowRepeatDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Grade conversion helper
  const getGradeInfo = (marks) => {
    if (marks === "" || marks === null || marks === undefined) {
      return { letterGrade: "-", gradePoint: 0 };
    }
    const num = parseFloat(marks);
    if (isNaN(num)) return { letterGrade: "-", gradePoint: 0 };

    // Match against loaded grading scale
    if (Array.isArray(gradingScales) && gradingScales.length > 0) {
      const matched = gradingScales.find((scale) => {
        const min = parseFloat(scale.min_marks);
        const max = parseFloat(scale.max_marks);
        return num >= min && num <= max + 0.001;
      });
      if (matched) {
        return {
          letterGrade: matched.letter_grade,
          gradePoint: parseFloat(matched.grade_point),
        };
      }
    }

    // Comprehensive Fallback Scale
    if (num >= 85) return { letterGrade: "A", gradePoint: 4.0 };
    if (num >= 80) return { letterGrade: "A-", gradePoint: 3.7 };
    if (num >= 75) return { letterGrade: "B+", gradePoint: 3.3 };
    if (num >= 70) return { letterGrade: "B", gradePoint: 3.0 };
    if (num >= 65) return { letterGrade: "B-", gradePoint: 2.7 };
    if (num >= 61) return { letterGrade: "C+", gradePoint: 2.3 };
    if (num >= 58) return { letterGrade: "C", gradePoint: 2.0 };
    if (num >= 55) return { letterGrade: "C-", gradePoint: 1.7 };
    if (num >= 50) return { letterGrade: "D", gradePoint: 1.0 };
    return { letterGrade: "F", gradePoint: 0.0 };
  };

  // Base Statistics: Prior completed semesters
  const baseAcademicStats = useMemo(() => {
    if (!transcriptData?.semesters) {
      return {
        totalObtainedGpts: 0,
        totalGpts: 0,
        totalCredits: 0,
        recordedCgpa: 0,
      };
    }

    const completedSems = transcriptData.semesters;
    const activeRank = activeSemesterMeta ? getSemesterRank(activeSemesterMeta.semester) : 999;

    // Filter out the active semester if it is one of the completed semesters
    const priorSemesters = completedSems.filter(
      (s) => getSemesterRank(s.semester) < activeRank
    );

    const totalObtainedGpts = priorSemesters.reduce(
      (s, sem) => s + parseFloat(sem.obtained_gpts || 0),
      0
    );
    const totalGpts = priorSemesters.reduce(
      (s, sem) => s + parseFloat(sem.total_gpts || 0),
      0
    );
    const totalCredits = priorSemesters.reduce((s, sem) => {
      return (
        s +
        (sem.subjects?.reduce((acc, sub) => acc + (parseFloat(sub.credit_hours) || 0), 0) || 0)
      );
    }, 0);

    const fullCompletedObtained = completedSems.reduce(
      (s, sem) => s + parseFloat(sem.obtained_gpts || 0),
      0
    );
    const fullCompletedTotal = completedSems.reduce(
      (s, sem) => s + parseFloat(sem.total_gpts || 0),
      0
    );
    const recordedCgpa =
      fullCompletedTotal > 0 ? (fullCompletedObtained / fullCompletedTotal) * 4.0 : 0;

    return {
      totalObtainedGpts,
      totalGpts,
      totalCredits,
      recordedCgpa:
        transcriptData.cgpa !== null && transcriptData.cgpa !== undefined
          ? parseFloat(transcriptData.cgpa)
          : recordedCgpa,
      completedCount: completedSems.length,
    };
  }, [transcriptData, activeSemesterMeta]);

  // List of all completed subjects available for repeating (marks < 85 and credit hours >= 1)
  const availableRepeatSubjects = useMemo(() => {
    if (!transcriptData?.semesters) return [];
    const list = [];
    transcriptData.semesters.forEach((sem, sIdx) => {
      if (Array.isArray(sem.subjects)) {
        sem.subjects.forEach((sub, idx) => {
          const marks = parseFloat(sub.marks_obtained || 0);
          const credits = parseFloat(sub.credit_hours || 0);
          if (marks < 85 && credits >= 1) {
            const uniqueKey = `${sem.id || sem.semester}-${sub.course_code}-${idx}`;
            list.push({
              uniqueKey,
              semesterIndex: sIdx + 1,
              semesterName: sem.semester,
              semesterSession: sem.session,
              courseCode: sub.course_code,
              courseName: sub.course_name,
              creditHours: credits,
              originalMarks: marks,
              originalGrade: sub.letter_grade,
              originalGp: parseFloat(sub.grade_point || 0),
            });
          }
        });
      }
    });
    return list;
  }, [transcriptData]);

  // Filtered repeat courses for the search list
  const filteredRepeatCourses = useMemo(() => {
    const q = repeatSearchQuery.trim().toUpperCase();
    const selectedKeys = new Set(repeatSelectedCourses.map((r) => r.uniqueKey));

    const candidates = availableRepeatSubjects.filter((s) => !selectedKeys.has(s.uniqueKey));
    if (!q) return candidates;
    return candidates.filter(
      (c) =>
        c.courseCode.toUpperCase().includes(q) ||
        c.courseName.toUpperCase().includes(q) ||
        c.semesterName.toUpperCase().includes(q)
    );
  }, [repeatSearchQuery, availableRepeatSubjects, repeatSelectedCourses]);

  // Suggested repeat candidates (courses with lower grades e.g. < 3.0 GP)
  const suggestedRepeatCandidates = useMemo(() => {
    const selectedKeys = new Set(repeatSelectedCourses.map((r) => r.uniqueKey));
    return availableRepeatSubjects
      .filter(
        (s) =>
          !selectedKeys.has(s.uniqueKey) &&
          (s.originalGp < 3.0 || s.originalMarks < 70)
      )
      .sort((a, b) => a.originalGp - b.originalGp);
  }, [availableRepeatSubjects, repeatSelectedCourses]);

  // Simulation Calculations
  const simulationResults = useMemo(() => {
    // 1. Calculate Active Semester estimated totals
    let activeSemObtainedGpts = 0;
    let activeSemTotalGpts = 0;
    let activeSemCredits = 0;

    latestSemesterCourses.forEach((c) => {
      const ch = parseFloat(c.credit_hours || 0);
      const { gradePoint } = getGradeInfo(c.estimatedMarks);
      activeSemObtainedGpts += gradePoint * ch;
      activeSemTotalGpts += 4.0 * ch;
      activeSemCredits += ch;
    });

    const activeSemEstimatedGpa =
      activeSemTotalGpts > 0 ? (activeSemObtainedGpts / activeSemTotalGpts) * 4.0 : 0;

    // 2. Calculate Repeat adjustments
    let repeatGptDelta = 0;
    repeatSelectedCourses.forEach((r) => {
      const ch = parseFloat(r.creditHours || 0);
      const oldGp = parseFloat(r.originalGp || 0);
      const { gradePoint: newGp } = getGradeInfo(r.estimatedMarks);
      repeatGptDelta += (newGp - oldGp) * ch;
    });

    // 3. Overall Projected CGPA
    const projectedObtainedGpts =
      baseAcademicStats.totalObtainedGpts + activeSemObtainedGpts + repeatGptDelta;
    const projectedTotalGpts = baseAcademicStats.totalGpts + activeSemTotalGpts;
    const projectedCredits = baseAcademicStats.totalCredits + activeSemCredits;

    const estimatedCgpa =
      projectedTotalGpts > 0 ? (projectedObtainedGpts / projectedTotalGpts) * 4.0 : 0;
    const cgpaDelta = estimatedCgpa - baseAcademicStats.recordedCgpa;

    return {
      currentCgpa: baseAcademicStats.recordedCgpa,
      estimatedCgpa,
      cgpaDelta,
      activeSemEstimatedGpa,
      activeSemCredits,
      repeatGptDelta,
      projectedCredits,
      projectedObtainedGpts,
      projectedTotalGpts,
    };
  }, [
    latestSemesterCourses,
    repeatSelectedCourses,
    baseAcademicStats,
    gradingScales,
  ]);

  // Filter students for top search
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toUpperCase();
    if (!q) return students.slice(0, 10);
    return students
      .filter(
        (s) =>
          (s.roll_no && s.roll_no.toUpperCase().includes(q)) ||
          (s.name && s.name.toUpperCase().includes(q))
      )
      .slice(0, 10);
  }, [studentSearch, students]);

  // Handle switching active semester from dropdown
  const handleSemesterChange = (semesterId) => {
    const sem = availableSemesters.find((s) => s.id === parseInt(semesterId, 10) || s.id === semesterId);
    if (sem) {
      loadSemesterCoursesForEstimation(sem, transcriptData);
    }
  };

  // Update a course field
  const handleUpdateCourse = (id, field, value) => {
    setLatestSemesterCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // Add custom course
  const handleAddCustomCourse = () => {
    setLatestSemesterCourses((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        course_code: "",
        course_name: `Course ${prev.length + 1}`,
        credit_hours: 3,
        estimatedMarks: 75,
        originalMarks: null,
      },
    ]);
  };

  // Remove a course
  const handleRemoveCourse = (id) => {
    setLatestSemesterCourses((prev) => prev.filter((c) => c.id !== id));
  };

  // Quick preset for marks
  const setAllMarksPreset = (marks) => {
    setLatestSemesterCourses((prev) =>
      prev.map((c) => ({
        ...c,
        estimatedMarks: marks,
      }))
    );
  };

  // Repeat courses handlers
  const handleAddRepeatCourse = (sub) => {
    setRepeatSelectedCourses((prev) => [
      ...prev,
      {
        ...sub,
        estimatedMarks: sub.originalMarks,
      },
    ]);
    setRepeatSearchQuery("");
    setShowRepeatDropdown(false);
  };

  const handleUpdateRepeatMarks = (uniqueKey, marks) => {
    setRepeatSelectedCourses((prev) =>
      prev.map((r) =>
        r.uniqueKey === uniqueKey
          ? {
              ...r,
              estimatedMarks:
                marks === "" ? "" : Math.min(100, Math.max(0, parseFloat(marks) || 0)),
            }
          : r
      )
    );
  };

  const handleRemoveRepeatCourse = (uniqueKey) => {
    setRepeatSelectedCourses((prev) => prev.filter((r) => r.uniqueKey !== uniqueKey));
  };

  // Auto-save simulation state to localStorage whenever courses, repeats, or target change
  useEffect(() => {
    if (!selectedRollNo || latestSemesterCourses.length === 0) return;
    try {
      const storageKey = `cgpa_estimator_data_${selectedRollNo.toUpperCase().trim()}`;
      const payload = {
        rollNo: selectedRollNo,
        semesterId: activeSemesterId,
        latestSemesterCourses: latestSemesterCourses.map((c) => ({
          id: c.id,
          course_code: c.course_code,
          course_name: c.course_name,
          credit_hours: c.credit_hours,
          estimatedMarks: c.estimatedMarks,
        })),
        repeatSelectedCourses,
        targetCgpa,
        updatedAt: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
      localStorage.setItem("cgpa_estimator_last_roll", selectedRollNo);
      setLastSaved(true);
    } catch (e) {
      console.error("Failed to auto-save to localStorage:", e);
    }
  }, [
    selectedRollNo,
    activeSemesterId,
    latestSemesterCourses,
    repeatSelectedCourses,
    targetCgpa,
  ]);

  // Reset simulation
  const handleResetSimulation = () => {
    if (selectedRollNo) {
      const storageKey = `cgpa_estimator_data_${selectedRollNo.toUpperCase().trim()}`;
      localStorage.removeItem(storageKey);
    }
    setLastSaved(false);
    if (activeSemesterMeta) {
      loadSemesterCoursesForEstimation(activeSemesterMeta, transcriptData, true);
    }
    setRepeatSelectedCourses([]);
    setTargetCgpa("");
  };

  // Target CGPA analysis
  const targetAnalysis = useMemo(() => {
    if (!targetCgpa || isNaN(targetCgpa)) return null;
    const target = parseFloat(targetCgpa);
    if (target <= 0 || target > 4.0) return null;

    const { projectedTotalGpts, activeSemCredits } = simulationResults;
    if (activeSemCredits === 0) return null;

    const maxReachableObtainedGpts =
      baseAcademicStats.totalObtainedGpts +
      simulationResults.repeatGptDelta +
      activeSemCredits * 4.0;
    const maxReachableCgpa = (maxReachableObtainedGpts / projectedTotalGpts) * 4.0;

    const requiredTotalObtainedGpts = (target / 4.0) * projectedTotalGpts;
    const requiredActiveSemObtainedGpts =
      requiredTotalObtainedGpts -
      (baseAcademicStats.totalObtainedGpts + simulationResults.repeatGptDelta);

    const requiredAverageGp = requiredActiveSemObtainedGpts / activeSemCredits;

    // Tolerance for 2 decimal places comparison
    const isAlreadyAchieved =
      requiredActiveSemObtainedGpts <= 0 ||
      target <= parseFloat(baseAcademicStats.recordedCgpa.toFixed(2));
    const isPossible =
      requiredAverageGp <= 4.005 ||
      target <= parseFloat(maxReachableCgpa.toFixed(2)) + 0.005;

    return {
      target,
      status: isAlreadyAchieved ? "already_met" : isPossible ? "achievable" : "impossible",
      requiredAverageGp: Math.min(4.0, Math.max(0, requiredAverageGp)),
      maxReachableCgpa,
      activeSemCredits,
    };
  }, [targetCgpa, simulationResults, baseAcademicStats]);

  return (
    <div className="page estimate-cgpa-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="estimator-title-row">
            <span className="estimator-badge-icon">
              <Calculator size={24} />
            </span>
            <div>
              <h1>CGPA Estimator & Simulator</h1>
              <p className="text-muted">
                Estimate marks for your latest semester courses and calculate improvements from repeated subjects.
              </p>
            </div>
          </div>
        </div>

        {transcriptData && (
          <div className="estimator-header-actions">
            {lastSaved && (
              <span className="auto-save-pill" title="Estimations saved automatically in browser storage">
                <CheckCircle2 size={13} />
                <span>Auto-Saved</span>
              </span>
            )}
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleResetSimulation}
              title="Reset simulation back to default and clear browser storage"
            >
              <RotateCcw size={16} />
              <span>Reset Marks</span>
            </button>
            <Link to={`/results/${selectedRollNo}`} className="btn btn-outline btn-sm">
              View Transcript
            </Link>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Student Selection Bar */}
      <div className="estimator-student-selector-card">
        <div className="selector-label-group">
          <label htmlFor="student-search-input" className="selector-label">
            <Search size={16} />
            Select Student:
          </label>
          <span className="text-muted" style={{ fontSize: "13px" }}>
            Search by roll number or name to load the student record and latest semester courses
          </span>
        </div>

        <div className="student-search-box-container" ref={searchWrapperRef}>
          <div className="student-search-input-wrapper">
            <input
              id="student-search-input"
              type="text"
              className="student-search-input"
              placeholder={
                selectedRollNo
                  ? `Selected: ${selectedRollNo} (${transcriptData?.student?.name || "Loading..."})`
                  : "Search student roll number or name..."
              }
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              autoComplete="off"
            />
            {studentSearch && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setStudentSearch("")}
              >
                ✕
              </button>
            )}
          </div>

          {showSearchDropdown && (
            <ul className="student-search-dropdown-menu">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => (
                  <li
                    key={s.roll_no}
                    className={`dropdown-item ${s.roll_no === selectedRollNo ? "active" : ""}`}
                    onMouseDown={() => {
                      setSelectedRollNo(s.roll_no);
                      setStudentSearch("");
                      setShowSearchDropdown(false);
                    }}
                  >
                    <span className="dropdown-roll">{s.roll_no}</span>
                    <span className="dropdown-name">{s.name}</span>
                    {s.cgpa != null && (
                      <span className="dropdown-cgpa">CGPA: {parseFloat(s.cgpa).toFixed(2)}</span>
                    )}
                  </li>
                ))
              ) : (
                <li className="dropdown-item-empty">No matching students found</li>
              )}
            </ul>
          )}
        </div>
      </div>

      {loadingStudent && (
        <div style={{ padding: "3rem", textAlign: "center" }}>
          <LoadingSpinner />
          <p className="text-muted" style={{ marginTop: "1rem" }}>
            Fetching academic transcript & latest semester courses...
          </p>
        </div>
      )}

      {/* Main Content when Student is Loaded */}
      {!loadingStudent && transcriptData && (
        <>
          {/* Hero Row: Student Meta + Live CGPA Comparison */}
          <div className="estimator-hero-grid">
            {/* Student Info */}
            <div className="hero-card student-profile-summary">
              <div className="hero-card-header">
                <span className="badge-chip">Active Record</span>
                <span className="student-department-tag">
                  {transcriptData.student?.department || "Information Technology"}
                </span>
              </div>
              <h2 className="student-name-heading">{transcriptData.student?.name}</h2>
              <div className="student-meta-details">
                <span>Roll No: <strong>{transcriptData.student?.roll_no}</strong></span>
                <span className="dot-sep">•</span>
                <span>Program: <strong>{transcriptData.student?.program || "BSCS"}</strong></span>
                <span className="dot-sep">•</span>
                <span>Completed Semesters: <strong>{baseAcademicStats.completedCount}</strong></span>
              </div>

              <div className="current-stats-chips">
                <div className="stat-chip">
                  <span className="stat-chip-label">Recorded CGPA</span>
                  <span className="stat-chip-val">{baseAcademicStats.recordedCgpa.toFixed(2)}</span>
                </div>
                <div className="stat-chip">
                  <span className="stat-chip-label">Completed Credits</span>
                  <span className="stat-chip-val">{baseAcademicStats.totalCredits} Cr</span>
                </div>
                {activeSemesterMeta && (
                  <div className="stat-chip">
                    <span className="stat-chip-label">Estimating Semester</span>
                    <span className="stat-chip-val" style={{ color: "var(--primary)" }}>
                      {activeSemesterMeta.semester}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Live CGPA Comparison Card */}
            <div className="hero-card cgpa-live-comparison-card">
              <div className="cgpa-comparison-wrapper">
                <div className="cgpa-side current-cgpa-side">
                  <span className="cgpa-side-label">Current CGPA</span>
                  <div className="cgpa-number current">
                    {baseAcademicStats.recordedCgpa.toFixed(2)}
                  </div>
                  <span className="cgpa-sub-label">Recorded</span>
                </div>

                <div className="cgpa-arrow-indicator">
                  <ArrowRight size={24} className="arrow-icon" />
                  <div
                    className={`delta-badge ${
                      simulationResults.cgpaDelta > 0.001
                        ? "delta-positive"
                        : simulationResults.cgpaDelta < -0.001
                        ? "delta-negative"
                        : "delta-neutral"
                    }`}
                  >
                    {simulationResults.cgpaDelta > 0.001 ? (
                      <>
                        <TrendingUp size={14} />
                        +{simulationResults.cgpaDelta.toFixed(2)}
                      </>
                    ) : simulationResults.cgpaDelta < -0.001 ? (
                      <>
                        <TrendingDown size={14} />
                        {simulationResults.cgpaDelta.toFixed(2)}
                      </>
                    ) : (
                      "0.00"
                    )}
                  </div>
                </div>

                <div className="cgpa-side estimated-cgpa-side">
                  <span className="cgpa-side-label">Projected CGPA</span>
                  <div
                    className={`cgpa-number estimated ${
                      simulationResults.estimatedCgpa >= 3.5
                        ? "gpa-glow-excellent"
                        : simulationResults.estimatedCgpa >= 3.0
                        ? "gpa-glow-good"
                        : "gpa-glow-regular"
                    }`}
                  >
                    {simulationResults.estimatedCgpa.toFixed(2)}
                  </div>
                  <span className="cgpa-sub-label">Estimated</span>
                </div>
              </div>

              {/* Bottom Quick Metrics */}
              <div className="comparison-footer-metrics">
                <div className="metric-item">
                  <span className="metric-title">Estimated Sem GPA:</span>
                  <span className="metric-val">
                    {simulationResults.activeSemEstimatedGpa.toFixed(2)}
                  </span>
                </div>
                {repeatSelectedCourses.length > 0 && (
                  <div className="metric-item">
                    <span className="metric-title">Repeat GPT Gain:</span>
                    <span
                      className={`metric-val ${
                        simulationResults.repeatGptDelta >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {simulationResults.repeatGptDelta >= 0 ? "+" : ""}
                      {simulationResults.repeatGptDelta.toFixed(1)}
                    </span>
                  </div>
                )}
                <div className="metric-item">
                  <span className="metric-title">Total Credits:</span>
                  <span className="metric-val">{simulationResults.projectedCredits}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 1: LATEST SEMESTER COURSES */}
          <div className="estimator-section-card">
            <div className="section-card-header">
              <div className="section-title-group">
                <span className="section-icon-badge new-course-badge">
                  <BookOpen size={18} />
                </span>
                <div>
                  <h3>
                    Latest Semester Courses ({activeSemesterMeta?.semester || "5th Semester"})
                  </h3>
                  <p className="text-muted">
                    Enter your estimated marks for {activeSemesterMeta?.semester || "latest"} semester courses to calculate your projected GPA and CGPA.
                  </p>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="quick-presets-group">
                <span className="preset-label">Quick Fill:</span>
                <button
                  type="button"
                  className="btn btn-xs btn-preset"
                  onClick={() => setAllMarksPreset(85)}
                  title="Set all courses to 85 (A)"
                >
                  85 (A)
                </button>
                <button
                  type="button"
                  className="btn btn-xs btn-preset"
                  onClick={() => setAllMarksPreset(80)}
                  title="Set all courses to 80 (A-)"
                >
                  80 (A-)
                </button>
                <button
                  type="button"
                  className="btn btn-xs btn-preset"
                  onClick={() => setAllMarksPreset(75)}
                  title="Set all courses to 75 (B+)"
                >
                  75 (B+)
                </button>
              </div>
            </div>

            {loadingCourses ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <LoadingSpinner />
                <p className="text-muted" style={{ marginTop: "0.5rem" }}>
                  Loading semester courses...
                </p>
              </div>
            ) : latestSemesterCourses.length === 0 ? (
              <div className="empty-new-courses-state">
                <Sparkles size={32} className="text-muted" />
                <p>No courses assigned to {activeSemesterMeta?.semester || "this semester"} yet.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="table-responsive estimator-desktop-only">
                  <table className="data-table estimator-table">
                    <thead>
                      <tr>
                        <th style={{ width: "120px" }}>Course Code</th>
                        <th>Course Title</th>
                        <th style={{ width: "110px", textAlign: "center" }}>Credit Hrs</th>
                        <th style={{ width: "140px" }}>Estimated Marks</th>
                        <th style={{ width: "90px" }}>Grade</th>
                        <th style={{ width: "90px" }}>GP</th>
                        <th style={{ width: "110px" }}>Obtained GPTs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestSemesterCourses.map((course) => {
                        const { letterGrade, gradePoint } = getGradeInfo(course.estimatedMarks);
                        const ch = parseFloat(course.credit_hours || 0);
                        const courseGpts = gradePoint * ch;

                        return (
                          <tr key={course.id}>
                            <td>
                              <span className="course-code-badge">{course.course_code}</span>
                            </td>
                            <td>
                              <strong className="course-title-text">{course.course_name}</strong>
                            </td>
                            <td className="text-center">
                              <span className="credit-hours-pill">{course.credit_hours} Cr</span>
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                className="marks-input-sm marks-input-highlight"
                                placeholder="Marks (0-100)"
                                value={course.estimatedMarks}
                                onChange={(e) =>
                                  handleUpdateCourse(
                                    course.id,
                                    "estimatedMarks",
                                    e.target.value === ""
                                      ? ""
                                      : Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                                  )
                                }
                              />
                            </td>
                            <td>
                              <span
                                className={`grade-badge ${
                                  letterGrade !== "-"
                                    ? `grade-${letterGrade.toLowerCase().replace("+", "-plus")}`
                                    : "grade-projected"
                                }`}
                              >
                                {letterGrade}
                              </span>
                            </td>
                            <td>
                              <strong>{gradePoint.toFixed(2)}</strong>
                            </td>
                            <td>
                              <span className="gpt-val">{courseGpts.toFixed(1)}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="2">
                          <strong>
                            {activeSemesterMeta?.semester || "Semester"} Total (
                            {latestSemesterCourses.length} Courses)
                          </strong>
                        </td>
                        <td className="text-center">
                          <strong>{simulationResults.activeSemCredits} Cr</strong>
                        </td>
                        <td></td>
                        <td></td>
                        <td>
                          <strong>Sem GPA:</strong>
                        </td>
                        <td>
                          <strong className="text-primary" style={{ fontSize: "15px" }}>
                            {simulationResults.activeSemEstimatedGpa.toFixed(2)}
                          </strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="estimator-mobile-cards estimator-mobile-only">
                  {latestSemesterCourses.map((course) => {
                    const { letterGrade, gradePoint } = getGradeInfo(course.estimatedMarks);
                    const ch = parseFloat(course.credit_hours || 0);
                    const courseGpts = gradePoint * ch;

                    return (
                      <div key={course.id} className="mobile-course-card">
                        <div className="mobile-card-header">
                          <div className="mobile-card-badges">
                            <span className="course-code-badge">{course.course_code}</span>
                            <span className="credit-hours-pill">{course.credit_hours} Cr</span>
                          </div>
                          <span
                            className={`grade-badge ${
                              letterGrade !== "-"
                                ? `grade-${letterGrade.toLowerCase().replace("+", "-plus")}`
                                : "grade-projected"
                            }`}
                          >
                            {letterGrade} &bull; {gradePoint.toFixed(2)} GP
                          </span>
                        </div>

                        <div className="mobile-card-title">
                          <strong>{course.course_name}</strong>
                        </div>

                        <div className="mobile-card-footer-grid">
                          <div className="mobile-input-block">
                            <span className="mobile-label">Estimated Marks</span>
                            <div className="mobile-input-inner">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                className="marks-input-sm marks-input-highlight mobile-marks-input"
                                placeholder="0-100"
                                value={course.estimatedMarks}
                                onChange={(e) =>
                                  handleUpdateCourse(
                                    course.id,
                                    "estimatedMarks",
                                    e.target.value === ""
                                      ? ""
                                      : Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                                  )
                                }
                              />
                              <span className="mobile-out-of">/ 100</span>
                            </div>
                          </div>

                          <div className="mobile-gpts-block">
                            <span className="mobile-label">Obtained GPTs</span>
                            <div className="mobile-gpts-value-badge">
                              <strong>{courseGpts.toFixed(1)}</strong>
                              <span className="text-muted" style={{ fontSize: "11.5px" }}>
                                / {(ch * 4).toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Mobile Semester Summary Box */}
                  <div className="mobile-semester-summary-card">
                    <div className="mobile-summary-row">
                      <span>Total Credits:</span>
                      <strong>{simulationResults.activeSemCredits} Cr</strong>
                    </div>
                    <div className="mobile-summary-row">
                      <span>Estimated Sem GPA:</span>
                      <strong className="text-primary" style={{ fontSize: "17px" }}>
                        {simulationResults.activeSemEstimatedGpa.toFixed(2)}
                      </strong>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* SECTION 2: REPEAT COURSES (Search List Picker) */}
          <div className="estimator-section-card">
            <div className="section-card-header">
              <div className="section-title-group">
                <span className="section-icon-badge repeat-badge">
                  <RefreshCw size={18} />
                </span>
                <div>
                  <h3>Repeat / Improvement Courses</h3>
                  <p className="text-muted">
                    Search and pick any previously taken courses you want to retake. Enter your new estimated marks to see the CGPA boost.
                  </p>
                </div>
              </div>

              {repeatSelectedCourses.length > 0 && (
                <div className="active-repeats-pill">
                  {repeatSelectedCourses.length} Repeat Course
                  {repeatSelectedCourses.length > 1 ? "s" : ""} Selected
                </div>
              )}
            </div>

            {/* Repeat Course Search Input */}
            <div className="repeat-search-container" ref={repeatWrapperRef}>
              <div className="repeat-search-input-wrapper">
                <Search size={16} className="repeat-search-icon" />
                <input
                  type="text"
                  className="repeat-search-input"
                  placeholder="🔍 Search previously taken courses to repeat (e.g. CS-101, Programming, Calculus)..."
                  value={repeatSearchQuery}
                  onChange={(e) => {
                    setRepeatSearchQuery(e.target.value);
                    setShowRepeatDropdown(true);
                  }}
                  onFocus={() => setShowRepeatDropdown(true)}
                />
                {repeatSearchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setRepeatSearchQuery("")}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown for Repeat Courses */}
              {showRepeatDropdown && (
                <ul className="repeat-dropdown-list">
                  {filteredRepeatCourses.length > 0 ? (
                    filteredRepeatCourses.map((c) => (
                      <li
                        key={c.uniqueKey}
                        className="repeat-dropdown-item"
                        onMouseDown={() => handleAddRepeatCourse(c)}
                      >
                        <div className="repeat-item-left">
                          <span className="course-code-badge repeat-code">{c.courseCode}</span>
                          <span className="repeat-course-name">{c.courseName}</span>
                          <span className="repeat-course-sem">({c.semesterName})</span>
                        </div>
                        <div className="repeat-item-right">
                          <span className="credit-hours-pill">{c.creditHours} Cr</span>
                          <span className="repeat-orig-grade">
                            Orig: <strong>{c.originalMarks} Mks</strong> ({c.originalGrade})
                          </span>
                          <button type="button" className="btn btn-xs btn-outline">
                            + Select Course
                          </button>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="repeat-dropdown-empty">
                      {availableRepeatSubjects.length === 0
                        ? "No past completed courses available to repeat."
                        : "No matching courses found."}
                    </li>
                  )}
                </ul>
              )}

              {/* Suggested Improvement Opportunities */}
              {suggestedRepeatCandidates.length > 0 && (
                <div className="repeat-suggestions-bar">
                  <span className="suggestions-label">
                    <Sparkles size={14} className="text-warning" /> Suggested to Repeat:
                  </span>
                  <div className="suggestions-chips-wrap">
                    {suggestedRepeatCandidates.slice(0, 4).map((c) => (
                      <button
                        key={c.uniqueKey}
                        type="button"
                        className="suggestion-chip-btn"
                        onClick={() => handleAddRepeatCourse(c)}
                        title={`Click to add ${c.courseCode} to repeat simulation`}
                      >
                        <span className="chip-code">{c.courseCode}</span>
                        <span className="chip-grade grade-badge grade-warning">
                          {c.originalGrade} ({c.originalGp.toFixed(2)})
                        </span>
                        <Plus size={13} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Repeat Courses Table / Mobile Cards */}
            {repeatSelectedCourses.length > 0 ? (
              <>
                {/* Desktop Repeat Table */}
                <div className="table-responsive estimator-desktop-only" style={{ marginTop: "16px" }}>
                  <table className="data-table estimator-table repeat-styled-table">
                    <thead>
                      <tr>
                        <th style={{ width: "26%" }}>Course & Semester</th>
                        <th style={{ width: "8%", textAlign: "center" }}>Credits</th>
                        <th style={{ width: "20%" }}>Original Record</th>
                        <th style={{ width: "16%" }}>New Estimated Marks</th>
                        <th style={{ width: "10%", textAlign: "center" }}>New Grade</th>
                        <th style={{ width: "8%", textAlign: "center" }}>New GP</th>
                        <th style={{ width: "10%", textAlign: "center" }}>GPT Gain</th>
                        <th style={{ width: "4%", textAlign: "center" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {repeatSelectedCourses.map((r) => {
                        const { letterGrade: newGrade, gradePoint: newGp } = getGradeInfo(
                          r.estimatedMarks
                        );
                        const oldGpts = r.originalGp * r.creditHours;
                        const newGpts = newGp * r.creditHours;
                        const gptGain = newGpts - oldGpts;

                        return (
                          <tr key={r.uniqueKey} className="row-repeating-active">
                            <td>
                              <div className="repeat-table-course-col">
                                <div className="repeat-table-badges">
                                  <span className="course-code-badge repeat-code">{r.courseCode}</span>
                                  <span className="semester-pill-tag">{r.semesterName}</span>
                                </div>
                                <strong className="course-title-text" style={{ marginTop: "4px" }}>
                                  {r.courseName}
                                </strong>
                              </div>
                            </td>
                            <td className="text-center">
                              <span className="credit-hours-pill">{r.creditHours} Cr</span>
                            </td>
                            <td>
                              <div className="repeat-orig-record-cell">
                                <span className="orig-marks-tag">{Number(r.originalMarks || 0).toFixed(0)} Mks</span>
                                <span className="grade-badge">{r.originalGrade}</span>
                                <span className="orig-gp-text">({r.originalGp.toFixed(2)} GP)</span>
                              </div>
                            </td>

                            {/* Editable Estimated Marks */}
                            <td>
                              <div className="marks-input-wrapper-desktop">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  className="marks-input-sm marks-input-highlight"
                                  style={{ width: "80px" }}
                                  placeholder="0-100"
                                  value={r.estimatedMarks}
                                  onChange={(e) =>
                                    handleUpdateRepeatMarks(r.uniqueKey, e.target.value)
                                  }
                                />
                                <span className="mobile-out-of">/ 100</span>
                              </div>
                            </td>

                            <td className="text-center">
                              <span
                                className={`grade-badge ${
                                  newGrade !== "-"
                                    ? `grade-${newGrade.toLowerCase().replace("+", "-plus")}`
                                    : "grade-projected"
                                }`}
                              >
                                {newGrade}
                              </span>
                            </td>

                            <td className="text-center">
                              <strong>{newGp.toFixed(2)}</strong>
                            </td>

                            <td className="text-center">
                              <span
                                className={`gpt-gain-tag ${
                                  gptGain > 0
                                    ? "gain-positive"
                                    : gptGain < 0
                                    ? "gain-negative"
                                    : "gain-zero"
                                }`}
                              >
                                {gptGain > 0 ? `+${gptGain.toFixed(1)}` : gptGain.toFixed(1)} GPTs
                              </span>
                            </td>

                            <td className="text-center">
                              <button
                                type="button"
                                className="btn-icon-delete"
                                onClick={() => handleRemoveRepeatCourse(r.uniqueKey)}
                                title="Remove Repeat Course"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="6">
                          <div className="repeat-table-footer-title">
                            <Sparkles size={16} className="text-success" />
                            <strong>
                              Total Degree GPT Boost ({repeatSelectedCourses.length}{" "}
                              {repeatSelectedCourses.length > 1 ? "Courses" : "Course"})
                            </strong>
                          </div>
                        </td>
                        <td className="text-center">
                          <span
                            className={`gpt-gain-tag ${
                              simulationResults.repeatGptDelta >= 0 ? "gain-positive" : "gain-negative"
                            }`}
                            style={{ fontSize: "14px", padding: "6px 12px" }}
                          >
                            {simulationResults.repeatGptDelta >= 0 ? "+" : ""}
                            {simulationResults.repeatGptDelta.toFixed(1)} GPTs
                          </span>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile Repeat Cards */}
                <div className="estimator-mobile-cards estimator-mobile-only" style={{ marginTop: "12px" }}>
                  {repeatSelectedCourses.map((r) => {
                    const { letterGrade: newGrade, gradePoint: newGp } = getGradeInfo(
                      r.estimatedMarks
                    );
                    const oldGpts = r.originalGp * r.creditHours;
                    const newGpts = newGp * r.creditHours;
                    const gptGain = newGpts - oldGpts;

                    return (
                      <div key={r.uniqueKey} className="mobile-course-card mobile-repeat-card">
                        <div className="mobile-card-header">
                          <div className="mobile-card-badges">
                            <span className="course-code-badge repeat-code">{r.courseCode}</span>
                            <span className="credit-hours-pill">{r.creditHours} Cr</span>
                            <span className="text-muted" style={{ fontSize: "12px" }}>({r.semesterName})</span>
                          </div>
                          <button
                            type="button"
                            className="btn-icon-delete"
                            onClick={() => handleRemoveRepeatCourse(r.uniqueKey)}
                            title="Remove Repeat Course"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        <div className="mobile-card-title">
                          <strong>{r.courseName}</strong>
                          <div className="mobile-repeat-orig-sub">
                            Original: <strong>{r.originalMarks} Mks</strong> ({r.originalGrade}, {r.originalGp.toFixed(2)} GP)
                          </div>
                        </div>

                        <div className="mobile-card-footer-grid">
                          <div className="mobile-input-block">
                            <span className="mobile-label">New Marks</span>
                            <div className="mobile-input-inner">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                className="marks-input-sm marks-input-highlight mobile-marks-input"
                                placeholder="0-100"
                                value={r.estimatedMarks}
                                onChange={(e) => handleUpdateRepeatMarks(r.uniqueKey, e.target.value)}
                              />
                              <span className="mobile-out-of">/ 100</span>
                            </div>
                          </div>

                          <div className="mobile-repeat-stats-block">
                            <span
                              className={`grade-badge ${
                                newGrade !== "-"
                                  ? `grade-${newGrade.toLowerCase().replace("+", "-plus")}`
                                  : "grade-projected"
                              }`}
                            >
                              {newGrade} &bull; {newGp.toFixed(2)} GP
                            </span>
                            <span
                              className={`gpt-gain-tag ${
                                gptGain > 0 ? "gain-positive" : gptGain < 0 ? "gain-negative" : "gain-zero"
                              }`}
                            >
                              {gptGain > 0 ? `+${gptGain.toFixed(1)}` : gptGain.toFixed(1)} GPTs
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Mobile Repeat Gain Summary Box */}
                  <div className="mobile-semester-summary-card">
                    <div className="mobile-summary-row">
                      <span>Total GPT Gain from Repeats:</span>
                      <strong
                        className={
                          simulationResults.repeatGptDelta >= 0 ? "text-success" : "text-danger"
                        }
                        style={{ fontSize: "16px" }}
                      >
                        {simulationResults.repeatGptDelta >= 0 ? "+" : ""}
                        {simulationResults.repeatGptDelta.toFixed(1)} GPTs
                      </strong>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-repeats-guide">
                <div className="empty-repeats-icon">
                  <RefreshCw size={22} />
                </div>
                <div className="empty-repeats-content">
                  <strong>Looking to improve your CGPA?</strong>
                  <p>
                    Search any past completed course above (especially courses with lower grades) to see how retaking them with higher marks will boost your overall degree CGPA.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: TARGET CGPA GOAL CALCULATOR */}
          <div className="estimator-section-card target-simulator-card">
            <div className="section-card-header">
              <div className="section-title-group">
                <span className="section-icon-badge target-badge">
                  <Target size={18} />
                </span>
                <div>
                  <h3>Target CGPA Goal Calculator</h3>
                  <p className="text-muted">
                    Set your desired target CGPA to determine the average Grade Point (GP) needed in your{" "}
                    {activeSemesterMeta?.semester?.toLowerCase().includes("semester")
                      ? activeSemesterMeta.semester
                      : `${activeSemesterMeta?.semester || "latest"} Semester`}.
                  </p>
                </div>
              </div>
            </div>

            <div className="target-input-row">
              <div className="target-field-wrapper">
                <label>Desired Target CGPA:</label>
                <input
                  type="number"
                  min="2.0"
                  max="4.0"
                  step="0.01"
                  placeholder="e.g. 3.50"
                  value={targetCgpa}
                  onChange={(e) => setTargetCgpa(e.target.value)}
                  className="target-cgpa-input"
                />
              </div>

              {targetAnalysis && (
                <div className={`target-analysis-result status-${targetAnalysis.status}`}>
                  {targetAnalysis.status === "already_met" && (
                    <div className="target-msg success">
                      <CheckCircle2 size={20} />
                      <span>
                        Target of <strong>{targetAnalysis.target.toFixed(2)}</strong> is already met by your current CGPA!
                      </span>
                    </div>
                  )}

                  {targetAnalysis.status === "achievable" && (
                    <div className="target-msg achievable">
                      <Award size={20} />
                      <div>
                        <strong>Achievable Goal!</strong>
                        <p>
                          You need an average Grade Point of{" "}
                          <span className="highlight-gp">
                            {targetAnalysis.requiredAverageGp.toFixed(2)} GP
                          </span>{" "}
                          across your {targetAnalysis.activeSemCredits} semester credits to reach a CGPA of{" "}
                          <strong>{targetAnalysis.target.toFixed(2)}</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {targetAnalysis.status === "impossible" && (
                    <div className="target-msg impossible">
                      <TrendingDown size={20} />
                      <div>
                        <strong>Target Exceeds Maximum Possible for this Semester</strong>
                        <p>
                          Even with a perfect 4.00 GP across your semester credits, the maximum reachable CGPA would be{" "}
                          <strong>
                            {(
                              (baseAcademicStats.totalObtainedGpts +
                                simulationResults.repeatGptDelta +
                                targetAnalysis.activeSemCredits * 4.0) /
                              simulationResults.projectedTotalGpts *
                              4.0
                            ).toFixed(2)}
                          </strong>
                          . Consider repeating more past courses to raise your baseline.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Initial Landing state */}
      {!loadingStudent && !transcriptData && (
        <div className="estimator-initial-banner">
          <div className="banner-icon-circle">
            <Calculator size={48} />
          </div>
          <h2>Select a student to estimate CGPA</h2>
          <p className="text-muted">
            Search and select any student above to view their latest semester courses, enter estimated marks, and search past courses to repeat.
          </p>
        </div>
      )}
    </div>
  );
}
