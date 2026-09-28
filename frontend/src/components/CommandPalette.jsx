import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const items = useMemo(() => {
    const all = [
      { label: 'Home', to: '/', roles: ['STUDENT', 'FACULTY', 'ADMIN'] },
      { label: 'Student dashboard', to: '/student', roles: ['STUDENT'] },
      { label: 'My devices', to: '/student/devices', roles: ['STUDENT'] },
      { label: 'Faculty command center', to: '/faculty', roles: ['FACULTY'] },
      { label: 'Sessions', to: '/faculty/sessions', roles: ['FACULTY'] },
      { label: 'Admin devices', to: '/admin', roles: ['ADMIN'] },
      { label: 'Classrooms and access points', to: '/admin/classrooms', roles: ['ADMIN'] },
      { label: 'Users', to: '/admin/users', roles: ['ADMIN'] },
      { label: 'Reports', to: '/reports', roles: ['FACULTY', 'ADMIN'] },
    ];
    const role = user?.role;
    return all
      .filter((i) => !role || i.roles.includes(role))
      .filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));
  }, [q, user]);

  if (!open || !user) return null;

  return (
    <div className="palette-backdrop" onClick={() => setOpen(false)}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          placeholder="Jump to…  ⌘K"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul>
          {items.map((i) => (
            <li key={i.to}>
              <button
                type="button"
                onClick={() => {
                  navigate(i.to);
                  setOpen(false);
                  setQ('');
                }}
              >
                {i.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
