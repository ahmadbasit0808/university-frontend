import api from "./axios";

export const getAllCgpa = () => api.get("/results");
export const getDashboardTopStudents = () =>
  api.get("/results/dashboard/top-students");
export const getSemesterTopStudents = (semesterId) =>
  api.get(`/results/dashboard/top-students/${semesterId}`);
export const getTranscript = (rollNo) => api.get(`/results/${rollNo}`);
export const getSemesterResults = (semesterId) =>
  api.get(`/results/semester/${semesterId}`);
export const getStudentSemesterResult = (semesterId, rollNo) =>
  api.get(`/results/semester/${semesterId}/${rollNo}`);
export const publishSemesterResults = (semesterId) =>
  api.post(`/results/semester/${semesterId}/publish`);

// Admin: manually set CR/GR for a semester (role: "cr" | "gr")
// Uses PATCH /api/semesters/:semesterId/representatives
export const setTopStudent = (metadataId, rollNo, role) =>
  api.patch(`/semesters/${metadataId}/representatives`, { role, rollNo });

// Admin: clear a manual CR/GR override, reverting to computed GPA leader
// Uses DELETE /api/semesters/:semesterId/representatives
export const clearTopStudent = (metadataId, role) =>
  api.delete(`/semesters/${metadataId}/representatives`, { data: { role } });

