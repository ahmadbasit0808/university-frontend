import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { StudentProvider } from "./context/StudentContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import StudentProfile from "./pages/StudentProfile";
import Teachers from "./pages/Teachers";
import Courses from "./pages/Courses";
import GradingScale from "./pages/GradingScale";
import Semesters from "./pages/Semesters";
import SemesterCourses from "./pages/SemesterCourses";
import Results from "./pages/Results";
import Transcript from "./pages/Transcript";
import SemesterResults from "./pages/SemesterResults";
import StudentSemesterResult from "./pages/StudentSemesterResult";
import CourseResultsPage from "./pages/CourseResults";
import ComponentBreakdown from "./pages/ComponentBreakdown";
import Timetable from "./pages/Timetable";
import ExamSchedule from "./pages/ExamSchedule";
import Track from "./pages/Track";
import TeacherProfile from "./pages/TeacherProfile";
import CourseProfile from "./pages/CourseProfile";
import Contact from "./pages/Contact";
import "./App.css";
import { TableSortProvider } from "./context/TableSortContext";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StudentProvider>
          <TableSortProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/students" element={<Students />} />
                <Route path="/students/:rollNo" element={<StudentProfile />} />
                <Route path="/teachers" element={<Teachers />} />
                <Route path="/teachers/:teacherId" element={<TeacherProfile />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/courses/:courseCode" element={<CourseProfile />} />
                <Route path="/grading-scale" element={<GradingScale />} />
                <Route path="/semesters" element={<Semesters />} />
                <Route
                  path="/semesters/:id/courses"
                  element={<SemesterCourses />}
                />
                <Route path="/results" element={<Results />} />
                <Route path="/results/:rollNo" element={<Transcript />} />
                <Route
                  path="/results/semester/:semesterId"
                  element={<SemesterResults />}
                />
                <Route
                  path="/results/semester/:semesterId/:rollNo"
                  element={<StudentSemesterResult />}
                />
                <Route path="/course-results" element={<CourseResultsPage />} />
                <Route
                  path="/course-results/:courseResultId/components"
                  element={<ComponentBreakdown />}
                />
                <Route path="/timetable" element={<Timetable />} />
                <Route path="/exam-schedule" element={<ExamSchedule />} />
                <Route path="/track" element={<Track />} />
                <Route path="/contact" element={<Contact />} />
              </Route>
            </Routes>
          </TableSortProvider>
        </StudentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
