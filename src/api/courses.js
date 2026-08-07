import api from "./axios";

export const getCourses = () => api.get("/courses");
export const getCourse = (courseCode) => api.get(`/courses/${courseCode}`);
export const createCourse = (data) => api.post("/courses", data);
export const updateCourse = (courseCode, data) =>
  api.put(`/courses/${courseCode}`, data);
export const deleteCourse = (courseCode) =>
  api.delete(`/courses/${courseCode}`);
