import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import CommandPalette from './components/CommandPalette';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import StudentDevicesPage from './pages/StudentDevicesPage';
import FacultyDashboard from './pages/FacultyDashboard';
import FacultySessionsPage from './pages/FacultySessionsPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminClassroomsPage from './pages/AdminClassroomsPage';
import Reports from './pages/Reports';
import './index.css';

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();

  const getHomeRoute = () => {
    if (!user) return '/';
    const routes = {
      STUDENT: '/student',
      FACULTY: '/faculty',
      ADMIN: '/admin',
    };
    return routes[user.role] || '/';
  };

  const publicFullBleed =
    !user && ['/', '/login', '/register'].includes(location.pathname);

  return (
    <>
      <Navbar />
      <CommandPalette />
      <main className={publicFullBleed ? 'public-shell' : 'main-content'}>
        <Routes>
          <Route path="/" element={user ? <Navigate to={getHomeRoute()} replace /> : <Landing />} />
          <Route path="/login" element={user ? <Navigate to={getHomeRoute()} replace /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to={getHomeRoute()} replace /> : <Register />} />

          <Route
            path="/student"
            element={
              <ProtectedRoute roles={['STUDENT']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/devices"
            element={
              <ProtectedRoute roles={['STUDENT']}>
                <StudentDevicesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/faculty"
            element={
              <ProtectedRoute roles={['FACULTY']}>
                <FacultyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/sessions"
            element={
              <ProtectedRoute roles={['FACULTY']}>
                <FacultySessionsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/classrooms"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminClassroomsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={['FACULTY', 'ADMIN']}>
                <Reports />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to={getHomeRoute()} replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
