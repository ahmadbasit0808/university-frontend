import api from "./axios";

export const getNotifications = (params = {}) =>
  api.get("/notifications", { params });

export const getNotification = (id) => api.get(`/notifications/${id}`);

export const createNotification = (data) => api.post("/notifications", data);

export const updateNotification = (id, data) =>
  api.put(`/notifications/${id}`, data);

export const deactivateNotification = (id) =>
  api.patch(`/notifications/${id}/deactivate`);
