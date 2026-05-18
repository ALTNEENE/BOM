import api from './axios';

export const getNotifications = (params) => api.get('/notifications', { params });
export const getUnreadCount = () => api.get('/notifications/unread-count');
export const markAsRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllAsRead = () => api.put('/notifications/read-all');
export const markManyAsRead = (ids) => api.put('/notifications/read-many', { ids });
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);
export const clearReadNotifications = () => api.delete('/notifications/clear-read');
export const clearAllNotifications = () => api.delete('/notifications/clear-all');
export const getNotificationPreferences = () => api.get('/notifications/preferences');
export const updateNotificationPreferences = (data) => api.put('/notifications/preferences', data);
