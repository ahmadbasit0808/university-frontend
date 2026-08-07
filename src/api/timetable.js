import api from "./axios";

export const getLatestTimetable = () => api.get("/timetable/latest");
export const getSemesterTimetable = (semesterId) =>
  api.get(`/timetable/semester/${semesterId}`);
export const getDayTimetable = (semesterId, day) =>
  api.get(`/timetable/semester/${semesterId}/day/${day}`);
export const getStudentTimetable = (rollNo, semesterId) =>
  api.get(`/timetable/student/${rollNo}/${semesterId}`);
export const getTeacherTimetable = (teacherId) =>
  api.get(`/timetable/teacher/${teacherId}`);
export const getRoomTimetable = (room) => api.get(`/timetable/room/${room}`);
