import api from "./axios";

export const getGradingScales = () => api.get("/grading-scale");
export const createGradingScale = (data) => api.post("/grading-scale", data);
export const updateGradingScale = (id, data) =>
  api.put(`/grading-scale/${id}`, data);
export const deleteGradingScale = (id) => api.delete(`/grading-scale/${id}`);
