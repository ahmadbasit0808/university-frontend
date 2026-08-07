import api from "./axios";

export const login = (username, password) =>
  api.post("/auth/login", { username, password });

export const logout = () => api.post("/auth/logout");

export const getMe = () => api.get("/auth/me");

export const seedAdmin = () => api.post("/auth/seed");
