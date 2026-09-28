import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../api/api';
import { useToast } from '../context/ToastContext';

export default function AdminDashboard() {
  const [pendingDevices, setPendingDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [devicesRes, usersRes] = await Promise.all([
        adminAPI.getPendingDevices(),
        adminAPI.getUsers(),
      ]);
      setPendingDevices(devicesRes.data.data || []);
      setUsers(usersRes.data.data || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await adminAPI.approveDevice(id);
      toast.success('Device approved');
      setPendingDevices((prev) => prev.filter((d) => d.id !== id));
      setSelected((prev) => prev.filter((x) => x !== id));
    } catch {
      toast.error('Failed to approve device');
    }
  };

  const handleReject = async (id) => {
    try {
      await adminAPI.rejectDevice(id);
      toast.success('Device rejected');
      setPendingDevices((prev) => prev.filter((d) => d.id !== id));
    } catch {
      toast.error('Failed to reject device');
    }
  };

  const handleBulk = async () => {
    if (!selected.length) return;
    try {
      await adminAPI.bulkApprove(selected);
      toast.success(`Approved ${selected.length} devices`);
      setPendingDevices((prev) => prev.filter((d) => !selected.includes(d.id)));
      setSelected([]);
    } catch {
      toast.error('Bulk approve failed');
    }
  };

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

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
        <h1>Device approval</h1>
        <p>OUI vendor hints and bulk actions for the pending MAC queue</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-warning">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <span className="stat-value">{pendingDevices.length}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <span className="stat-value">{users.length}</span>
            <span className="stat-label">Users</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎓</div>
          <div className="stat-content">
            <span className="stat-value">{users.filter((u) => u.role === 'STUDENT').length}</span>
            <span className="stat-label">Students</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Pending MACs</h2>
          <div className="action-buttons">
            <Link to="/admin/users" className="btn btn-secondary btn-sm">User directory</Link>
            <button className="btn btn-success btn-sm" disabled={!selected.length} onClick={handleBulk}>
              Approve selected ({selected.length})
            </button>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Student</th>
                <th>PRN</th>
                <th>MAC</th>
                <th>Vendor</th>
                <th>Device</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingDevices.length > 0 ? (
                pendingDevices.map((device) => (
                  <tr key={device.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(device.id)}
                        onChange={() => toggle(device.id)}
                      />
                    </td>
                    <td>
                      <div className="user-cell">
                        <span className="user-avatar-sm">{device.studentName?.charAt(0)}</span>
                        {device.studentName}
                      </div>
                    </td>
                    <td><code>{device.studentId || '—'}</code></td>
                    <td><code>{device.macAddress}</code></td>
                    <td>{device.vendor || 'Unknown'}</td>
                    <td>{device.deviceName || 'Unnamed'}</td>
                    <td>{new Date(device.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-sm btn-success" onClick={() => handleApprove(device.id)}>
                          Approve
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleReject(device.id)}>
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="empty-state">
                    Queue is clear
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
