import api from "./axios";

export const getExamSchedule = (semesterId) =>
  api.get(`/exam-schedule/semester/${semesterId}`);
export const getExamScheduleByType = (semesterId, examType) =>
  api.get(`/exam-schedule/semester/${semesterId}/type/${examType}`);
export const createExamSchedule = (data) => api.post("/exam-schedule", data);
export const updateExamSchedule = (id, data) =>
  api.put(`/exam-schedule/${id}`, data);
export const deleteExamSchedule = (id) => api.delete(`/exam-schedule/${id}`);
