import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
};

// ─── Student ────────────────────────────────────────────────────────────────────
export const studentAPI = {
  getDashboard: () => api.get('/student/dashboard'),
  getAttendanceHistory: () => api.get('/student/attendance-history'),
  registerDevice: (data) => api.post('/student/device/register', data),
  getDevices: () => api.get('/student/devices'),
};

// ─── Faculty ────────────────────────────────────────────────────────────────────
export const facultyAPI = {
  startSession: (data) => api.post('/faculty/session/start', data),
  endSession: (id) => api.post(`/faculty/session/${id}/end`),
  getActiveSession: () => api.get('/faculty/session/active'),
  getSessionLive: (id) => api.get(`/faculty/session/${id}/live`),
  manualMark: (sessionId, studentId) =>
    api.post(`/faculty/session/${sessionId}/mark/${studentId}`),
  getSessions: () => api.get('/faculty/sessions'),
};

// ─── Admin ──────────────────────────────────────────────────────────────────────
export const adminAPI = {
  getPendingDevices: () => api.get('/admin/devices/pending'),
  approveDevice: (id) => api.post(`/admin/devices/${id}/approve`),
  rejectDevice: (id) => api.post(`/admin/devices/${id}/reject`),
  getUsers: () => api.get('/admin/users'),
};

// ─── Reports ────────────────────────────────────────────────────────────────────
export const reportAPI = {
  getAttendance: (params) => api.get('/reports/attendance', { params }),
};

export default api;
