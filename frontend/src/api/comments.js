import api from './axios';

export const getComments = (taskId, params) => api.get('/comments', { params: { taskId, ...params } });
export const createComment = (data) => api.post('/comments', data);
export const updateComment = (id, data) => api.put(`/comments/${id}`, data);
export const deleteComment = (id) => api.delete(`/comments/${id}`);
export const addReaction = (id, data) => api.post(`/comments/${id}/reactions`, data);
export const removeReaction = (id, emoji) => api.delete(`/comments/${id}/reactions/${emoji}`);
