import api from './axios';

export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const logout = () => api.post('/auth/logout');
export const logoutAll = () => api.post('/auth/logout-all');
export const getMe = () => api.get('/auth/me');
export const forgotPassword = (data) => api.post('/auth/forgot-password', data);
export const resetPassword = (token, data) => api.put(`/auth/reset-password/${token}`, data);
export const verifyEmail = (token) => api.get(`/auth/verify-email/${token}`);
export const resendVerification = () => api.post('/auth/resend-verification');
export const changePassword = (data) => api.put('/auth/change-password', data);
