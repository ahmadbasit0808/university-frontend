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
