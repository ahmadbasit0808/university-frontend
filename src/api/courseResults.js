import api from "./axios";

export const getCourseResults = (semesterCourseId) =>
  api.get(`/course-results/semester-course/${semesterCourseId}`);
export const createCourseResult = (data) => api.post("/course-results", data);
export const updateCourseResult = (id, data) =>
  api.put(`/course-results/${id}`, data);
export const deleteCourseResult = (id) => api.delete(`/course-results/${id}`);
export const addComponent = (courseResultId, data) =>
  api.post(`/course-results/${courseResultId}/components`, data);
export const getComponents = (courseResultId) =>
  api.get(`/course-results/${courseResultId}/components`);
