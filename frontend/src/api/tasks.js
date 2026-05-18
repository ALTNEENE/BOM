import api from './axios';

export const getTasks = (params) => api.get('/tasks', { params });
export const getMyTasks = (params) => api.get('/tasks/my-tasks', { params });
export const getTaskStatusSummary = () => api.get('/tasks/status-summary');
export const getTask = (id) => api.get(`/tasks/${id}`);
export const createTask = (data) => api.post('/tasks', data);
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data);
export const updateTaskStatus = (id, data) => api.put(`/tasks/${id}/status`, data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);
export const toggleWatcher = (id) => api.post(`/tasks/${id}/watch`);
export const updateChecklistItem = (id, itemId, data) => api.put(`/tasks/${id}/checklist/${itemId}`, data);
export const reorderTasks = (data) => api.put('/tasks/reorder', data);
