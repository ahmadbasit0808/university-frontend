import api from "./axios";

export const getStudents = () => api.get("/students");
export const getStudent = (rollNo) => api.get(`/students/${rollNo}`);
export const createStudent = (data) => api.post("/students", data);
export const updateStudent = (rollNo, data) =>
  api.put(`/students/${rollNo}`, data);
export const deactivateStudent = (rollNo) =>
  api.patch(`/students/${rollNo}/deactivate`);
