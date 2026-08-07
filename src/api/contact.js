import api from "./axios";

export const submitContact = (data) => api.post("/contact", data);

export const getContactQueries = (status) =>
  api.get("/contact", { params: { status } });

export const getContactQuery = (id) => api.get(`/contact/${id}`);

export const respondToQuery = (id, adminResponse) =>
  api.patch(`/contact/${id}/respond`, { admin_response: adminResponse });

export const updateQueryStatus = (id, status) =>
  api.patch(`/contact/${id}/status`, { status });

export const trackContactQuery = (trackingId) =>
  api.get(`/contact/track/${trackingId}`);

export const updateContactQuery = (trackingId, data) =>
  api.patch(`/contact/track/${trackingId}`, data);

export const deleteContactQuery = (trackingId) =>
  api.delete(`/contact/track/${trackingId}`);
