import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
export const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
};

export const studentAPI = {
  getDashboard: () => api.get('/student/dashboard'),
  getAttendanceHistory: () => api.get('/student/attendance-history'),
  registerDevice: (data) => api.post('/student/device/register', data),
  getDevices: () => api.get('/student/devices'),
  removeDevice: (deviceId) => api.delete(`/student/devices/${deviceId}`),
};

export const facultyAPI = {
  startSession: (data) => api.post('/faculty/session/start', data),
  endSession: (id) => api.post(`/faculty/session/${id}/end`),
  getActiveSession: () => api.get('/faculty/session/active'),
  getSessionLive: (id) => api.get(`/faculty/session/${id}/live`),
  manualMark: (sessionId, studentId) =>
    api.post(`/faculty/session/${sessionId}/mark/${studentId}`),
  manualMarkByPRN: (sessionId, prn) =>
    api.post(`/faculty/session/${sessionId}/mark-by-prn`, { prn }),
  getSessions: () => api.get('/faculty/sessions'),
  getLivePresence: () => api.get('/faculty/presence/live'),
  getClassrooms: () => api.get('/faculty/classrooms'),
  simulateClassroom: (payload) =>
    api.post(
      '/faculty/presence/simulate',
      payload || { count: 10, intervalMs: 1400, outsideCount: 2 }
    ),
};

export const adminAPI = {
  getPendingDevices: () => api.get('/admin/devices/pending'),
  approveDevice: (id) => api.post(`/admin/devices/${id}/approve`),
  rejectDevice: (id) => api.post(`/admin/devices/${id}/reject`),
  bulkApprove: (ids) => api.post('/admin/devices/bulk-approve', { ids }),
  getUsers: () => api.get('/admin/users'),
  getClassrooms: () => api.get('/admin/classrooms'),
  createClassroom: (data) => api.post('/admin/classrooms', data),
  deleteClassroom: (id) => api.delete(`/admin/classrooms/${id}`),
};

export const reportAPI = {
  getAttendance: (params) => api.get('/reports/attendance', { params }),
  getAnalytics: () => api.get('/reports/analytics'),
};

export default api;
