import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  if (!user) return null;

  const navLinks = {
    STUDENT: [
      { to: '/student', label: 'Dashboard', icon: '📊' },
      { to: '/student/devices', label: 'Devices', icon: '📱' },
    ],
    FACULTY: [
      { to: '/faculty', label: 'Radar', icon: '📡' },
      { to: '/faculty/sessions', label: 'Sessions', icon: '📋' },
      { to: '/reports', label: 'Reports', icon: '📈' },
    ],
    ADMIN: [
      { to: '/admin', label: 'Devices', icon: '⚙️' },
      { to: '/admin/classrooms', label: 'Rooms', icon: '📶' },
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

      <button
        type="button"
        className="nav-toggle"
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
      >
        ☰
      </button>

      <div className={`navbar-links ${open ? 'open' : ''}`}>
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`nav-link ${location.pathname === link.to ? 'active' : ''}`}
            onClick={() => setOpen(false)}
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
