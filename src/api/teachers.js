import api from "./axios";

export const getTeachers = () => api.get("/teachers");
export const getTeacher = (teacherId) => api.get(`/teachers/${teacherId}`);
export const createTeacher = (data) => api.post("/teachers", data);
export const updateTeacher = (teacherId, data) =>
  api.put(`/teachers/${teacherId}`, data);
export const deactivateTeacher = (teacherId) =>
  api.patch(`/teachers/${teacherId}/deactivate`);
