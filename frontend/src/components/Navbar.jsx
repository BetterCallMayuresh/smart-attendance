import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const navLinks = {
    STUDENT: [
      { to: '/student', label: 'Dashboard', icon: '📊' },
      { to: '/student/devices', label: 'Devices', icon: '📱' },
    ],
    FACULTY: [
      { to: '/faculty', label: 'Dashboard', icon: '📊' },
      { to: '/faculty/sessions', label: 'Sessions', icon: '📋' },
      { to: '/reports', label: 'Reports', icon: '📈' },
    ],
    ADMIN: [
      { to: '/admin', label: 'Dashboard', icon: '⚙️' },
      { to: '/admin/users', label: 'Users', icon: '👥' },
      { to: '/reports', label: 'Reports', icon: '📈' },
    ],
  };

  const links = navLinks[user.role] || [];

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">📡</span>
        <span className="navbar-title">SmartAttend</span>
      </div>

      <div className="navbar-links">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`nav-link ${location.pathname === link.to ? 'active' : ''}`}
          >
            <span className="nav-icon">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </div>

      <div className="navbar-user">
        <div className="user-info">
          <span className="user-avatar">
            {user.name?.charAt(0).toUpperCase()}
          </span>
          <div className="user-details">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{user.role}</span>
          </div>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
