import api from './axios';

export const getTeams = (params) => api.get('/teams', { params });
export const getTeam = (id) => api.get(`/teams/${id}`);
export const createTeam = (data) => api.post('/teams', data);
export const updateTeam = (id, data) => api.put(`/teams/${id}`, data);
export const deleteTeam = (id) => api.delete(`/teams/${id}`);
export const joinTeamWithCode = (code) => api.post(`/teams/join/${code}`);
export const generateInviteCode = (id, data) => api.post(`/teams/${id}/invite-code`, data);
export const addTeamMember = (id, data) => api.post(`/teams/${id}/members`, data);
export const removeTeamMember = (id, userId) => api.delete(`/teams/${id}/members/${userId}`);
export const updateTeamMemberRole = (id, userId, data) => api.put(`/teams/${id}/members/${userId}`, data);
