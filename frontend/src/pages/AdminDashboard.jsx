import { useState, useEffect } from 'react';
import { adminAPI } from '../api/api';

export default function AdminDashboard() {
  const [pendingDevices, setPendingDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('devices');

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
      setMessage('Device approved!');
      setPendingDevices((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setMessage('Failed to approve device');
    }
  };

  const handleReject = async (id) => {
    try {
      await adminAPI.rejectDevice(id);
      setMessage('Device rejected');
      setPendingDevices((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setMessage('Failed to reject device');
    }
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
        <h1>Admin Dashboard</h1>
        <p>Manage device approvals and users</p>
      </div>

      {message && (
        <div className="alert alert-success auto-dismiss">{message}</div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card stat-warning">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <span className="stat-value">{pendingDevices.length}</span>
            <span className="stat-label">Pending Approvals</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <span className="stat-value">{users.length}</span>
            <span className="stat-label">Total Users</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎓</div>
          <div className="stat-content">
            <span className="stat-value">
              {users.filter((u) => u.role === 'STUDENT').length}
            </span>
            <span className="stat-label">Students</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-content">
            <span className="stat-value">
              {users.filter((u) => u.role === 'FACULTY').length}
            </span>
            <span className="stat-label">Faculty</span>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar">
        <button
          className={`tab ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          📱 Pending Devices
          {pendingDevices.length > 0 && (
            <span className="tab-badge">{pendingDevices.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 All Users
        </button>
      </div>

      {/* Pending Devices Tab */}
      {activeTab === 'devices' && (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll No</th>
                  <th>MAC Address</th>
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
                        <div className="user-cell">
                          <span className="user-avatar-sm">
                            {device.studentName?.charAt(0)}
                          </span>
                          {device.studentName}
                        </div>
                      </td>
                      <td><code>{device.studentId || '—'}</code></td>
                      <td><code>{device.macAddress}</code></td>
                      <td>{device.deviceName || 'Unnamed'}</td>
                      <td>
                        {new Date(device.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleApprove(device.id)}
                          >
                            ✓ Approve
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleReject(device.id)}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      No pending device registrations 🎉
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Student ID</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <span className="user-avatar-sm">
                          {user.name?.charAt(0)}
                        </span>
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
      )}
    </div>
  );
}
