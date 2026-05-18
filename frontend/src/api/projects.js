import api from './axios';

export const getProjects = (params) => api.get('/projects', { params });
export const getProjectStatusSummary = () => api.get('/projects/status-summary');
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post('/projects', data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);
export const archiveProject = (id) => api.put(`/projects/${id}/archive`);
export const getProjectActivity = (id, params) => api.get(`/projects/${id}/activity`, { params });
export const getProjectStats = (id) => api.get(`/projects/${id}/stats`);
export const addProjectMember = (id, data) => api.post(`/projects/${id}/members`, data);
export const removeProjectMember = (id, userId) => api.delete(`/projects/${id}/members/${userId}`);
export const updateProjectMemberRole = (id, userId, data) => api.put(`/projects/${id}/members/${userId}`, data);
export const assignTeamToProject = (id, teamId) => api.post(`/projects/${id}/assign-team`, { teamId });
