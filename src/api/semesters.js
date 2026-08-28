import api from "./axios";

export const getSemesters = () => api.get("/semesters");
export const getSemester = (id) => api.get(`/semesters/${id}`);
export const createSemester = (data) => api.post("/semesters", data);
export const deleteSemester = (id) => api.delete(`/semesters/${id}`);
export const getSemesterCourses = (id) => api.get(`/semesters/${id}/courses`);
export const assignCourseToSemester = (semesterId, data) =>
  api.post(`/semesters/${semesterId}/courses`, data);
export const removeCourseFromSemester = (semesterId, scId) =>
  api.delete(`/semesters/${semesterId}/courses/${scId}`);

// Admin: set CR or GR for a semester (PATCH /api/semesters/:id/representatives)
// body: { role: "cr" | "gr", rollNo: string }
export const setSemesterRepresentative = (semesterId, role, rollNo) =>
  api.patch(`/semesters/${semesterId}/representatives`, { role, rollNo });

// Admin: clear manual CR or GR override (DELETE /api/semesters/:id/representatives)
// body: { role: "cr" | "gr" }
export const clearSemesterRepresentative = (semesterId, role) =>
  api.delete(`/semesters/${semesterId}/representatives`, { data: { role } });

