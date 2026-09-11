import { useState, useEffect } from 'react';
import { studentAPI } from '../api/api';

export default function StudentDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [deviceForm, setDeviceForm] = useState({ macAddress: '', deviceName: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await studentAPI.getDashboard();
      setDashboard(res.data.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await studentAPI.registerDevice(deviceForm);
      setMessage('Device registered! Awaiting admin approval.');
      setDeviceForm({ macAddress: '', deviceName: '' });
      setShowDeviceForm(false);
      loadDashboard();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to register device');
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
        <h1>Student Dashboard</h1>
        <p>Track your attendance and manage your devices</p>
      </div>

      {message && (
        <div className={`alert ${message.includes('Failed') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <span className="stat-value">{dashboard?.totalClasses || 0}</span>
            <span className="stat-label">Total Classes Attended</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📱</div>
          <div className="stat-content">
            <span className="stat-value">{dashboard?.devices?.length || 0}</span>
            <span className="stat-label">Registered Devices</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-value">
              {dashboard?.devices?.filter((d) => d.approved).length || 0}
            </span>
            <span className="stat-label">Approved Devices</span>
          </div>
        </div>
      </div>

      {/* Devices Section */}
      <div className="card">
        <div className="card-header">
          <h2>My Devices</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowDeviceForm(!showDeviceForm)}
          >
            {showDeviceForm ? 'Cancel' : '+ Register Device'}
          </button>
        </div>

        {showDeviceForm && (
          <form className="inline-form" onSubmit={handleRegisterDevice}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="macAddress">MAC Address</label>
                <input
                  id="macAddress"
                  type="text"
                  placeholder="AA:BB:CC:DD:EE:FF"
                  value={deviceForm.macAddress}
                  onChange={(e) =>
                    setDeviceForm({ ...deviceForm, macAddress: e.target.value })
                  }
                  required
                  pattern="^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$"
                />
              </div>
              <div className="form-group">
                <label htmlFor="deviceName">Device Name (optional)</label>
                <input
                  id="deviceName"
                  type="text"
                  placeholder="e.g. My Phone"
                  value={deviceForm.deviceName}
                  onChange={(e) =>
                    setDeviceForm({ ...deviceForm, deviceName: e.target.value })
                  }
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Submit
              </button>
            </div>
          </form>
        )}

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Device</th>
                <th>MAC Address</th>
                <th>Status</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {dashboard?.devices?.length > 0 ? (
                dashboard.devices.map((device) => (
                  <tr key={device.id}>
                    <td>{device.deviceName || 'Unnamed Device'}</td>
                    <td>
                      <code>{device.macAddress}</code>
                    </td>
                    <td>
                      <span
                        className={`badge ${device.approved ? 'badge-success' : 'badge-warning'}`}
                      >
                        {device.approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td>{new Date(device.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="empty-state">
                    No devices registered yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance History */}
      <div className="card">
        <div className="card-header">
          <h2>Attendance History</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Code</th>
                <th>Status</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {dashboard?.attendanceHistory?.length > 0 ? (
                dashboard.attendanceHistory.map((record) => (
                  <tr key={record.id}>
                    <td>{record.courseName}</td>
                    <td><code>{record.courseCode}</code></td>
                    <td>
                      <span
                        className={`badge ${
                          record.status === 'AUTO'
                            ? 'badge-success'
                            : record.status === 'MANUAL'
                            ? 'badge-info'
                            : 'badge-warning'
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td>{new Date(record.markedAt).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="empty-state">
                    No attendance records yet
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
