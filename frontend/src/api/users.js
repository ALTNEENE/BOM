import api from './axios';

export const getUsers = (params) => api.get('/users', { params });
export const getUser = (id) => api.get(`/users/${id}`);
export const searchUsers = (query) => api.get('/users/search', { params: { q: query } });
export const getUserStats = () => api.get('/users/stats');
export const getUserKPIs = () => api.get('/users/kpi');
export const updateProfile = (data) => api.put('/users/profile', data);
export const updatePreferences = (data) => api.put('/users/preferences', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deactivateUser = (id) => api.put(`/users/${id}/deactivate`);
export const activateUser = (id) => api.put(`/users/${id}/activate`);
export const deleteUser = (id) => api.delete(`/users/${id}`);
