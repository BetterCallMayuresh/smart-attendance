import { useState, useEffect, useMemo } from 'react';
import { adminAPI } from '../api/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminAPI.getUsers();
        setUsers(res.data.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchRole = role === 'ALL' || u.role === role;
      const hay = `${u.name} ${u.email} ${u.studentId}`.toLowerCase();
      return matchRole && hay.includes(q.toLowerCase());
    });
  }, [users, q, role]);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>User directory</h1>
        <p>Everyone registered on SmartAttend</p>
      </div>

      <div className="card">
        <form className="filter-form" onSubmit={(e) => e.preventDefault()}>
          <div className="form-row">
            <div className="form-group">
              <label>Search</label>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, PRN" />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="ALL">All</option>
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
        </form>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>PRN</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <span className="user-avatar-sm">{user.name?.charAt(0)}</span>
                      {user.name}
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span
                      className={`badge ${
                        user.role === 'ADMIN'
                          ? 'badge-danger'
                          : user.role === 'FACULTY'
                            ? 'badge-info'
                            : 'badge-success'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td><code>{user.studentId || '—'}</code></td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
